// api/chat.js — Vercel Edge Function: Gemini AI proxy per RunCoach.
// Endpoint: POST /api/chat
//
// Body (formato preferito):
//   { messages: [{role, content}], context: {athlete, form, recentActivities, raceGoal} }
//
// Body (formato legacy, retrocompatibile):
//   { messages: [{role, content}], system: "..." }
//
// Risposta: { reply: string, model: string }
//
// Setup: Vercel → Settings → Environment Variables → GEMINI_API_KEY = AIza...
// Free tier: gemini-2.5-flash → ampiamente sufficiente per uso personale.

export const config = { runtime: 'edge' };

const MODEL = 'gemini-2.5-flash';
const MAX_TOKENS = 1024;
const MAX_HISTORY = 20;
const TIMEOUT_MS = 25000;

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return jsonError(500, 'GEMINI_API_KEY non configurata');

  let body;
  try { body = await req.json(); }
  catch { return jsonError(400, 'Body JSON non valido'); }

  const { messages = [], context, system: providedSystem } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError(400, 'Campo "messages" mancante o vuoto');
  }

  // System prompt: lo costruiamo dal context (nuovo) oppure usiamo quello fornito (legacy)
  const systemPrompt = context
    ? buildSystemPrompt(context)
    : (providedSystem || 'Sei un coach di running esperto. Parli italiano.');

  // Mappa i messaggi nel formato Gemini (usa role "model" per le risposte AI)
  const contents = messages
    .slice(-MAX_HISTORY)
    .filter(m => m && (typeof m.content === 'string' || typeof m.text === 'string'))
    .map(m => ({
      role: (m.role === 'assistant' || m.role === 'coach' || m.role === 'model') ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : (m.text || '') }],
    }))
    .filter(m => m.parts[0].text.trim().length > 0);

  if (contents.length === 0 || contents[0].role !== 'user') {
    return jsonError(400, 'Il primo messaggio deve essere "user"');
  }

  // Chiamata a Gemini con timeout
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: MAX_TOKENS,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',  threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    clearTimeout(t);

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      // Non rivelare la API key in caso di errore
      const safe = errText.replace(apiKey, '[REDACTED]').slice(0, 300);
      return jsonError(r.status, `Gemini ${r.status}: ${safe}`);
    }

    const data = await r.json();
    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text)
      .filter(Boolean)
      .join('');

    if (!reply) {
      const finishReason = data?.candidates?.[0]?.finishReason || 'unknown';
      return jsonError(502, `Risposta vuota da Gemini (finishReason: ${finishReason})`);
    }

    return new Response(JSON.stringify({ reply, model: MODEL }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  } catch (e) {
    clearTimeout(t);
    if (e.name === 'AbortError') return jsonError(504, 'Timeout chiamata Gemini');
    return jsonError(500, 'Errore di rete: ' + (e.message || 'sconosciuto'));
  }
}

// ─── System prompt: persona coach + iniezione dati reali dell'atleta ────────
function buildSystemPrompt(ctx) {
  const { athlete = {}, form = {}, recentActivities = [], raceGoal = null } = ctx || {};
  const lines = [];

  lines.push(
`Sei un coach di running esperto. Parli italiano, stile diretto e scientifico ma comprensibile.
Motivante senza essere melenso. Citi SEMPRE i numeri reali dell'atleta nella risposta.`
  );

  // Atleta
  const A = [];
  if (athlete.name)   A.push(`Nome: ${athlete.name}`);
  if (athlete.age)    A.push(`Età: ${athlete.age}`);
  if (athlete.maxHR)  A.push(`HR max stimata: ${athlete.maxHR} bpm`);
  if (athlete.restHR) A.push(`HR riposo: ${athlete.restHR} bpm`);
  if (A.length) lines.push('\n[ATLETA]\n' + A.map(x => `- ${x}`).join('\n'));

  // Forma attuale (training load)
  const F = [];
  if (form.ctl != null) F.push(`CTL (fitness, 42gg): ${form.ctl}`);
  if (form.atl != null) F.push(`ATL (fatica, 7gg): ${form.atl}`);
  if (form.tsb != null) F.push(`TSB (forma oggi): ${form.tsb}${form.label ? ` → ${form.label}` : ''}`);
  if (form.vdot)        F.push(`VDOT: ${form.vdot}`);
  if (form.weeklyKm)    F.push(`Media settimanale ultime 4 sett: ${form.weeklyKm} km`);
  if (form.overtrainingRisk) F.push(`Rischio overtraining: ${form.overtrainingRisk}`);
  if (F.length) lines.push('\n[FORMA ATTUALE]\n' + F.map(x => `- ${x}`).join('\n'));

  // Obiettivo gara
  if (raceGoal && (raceGoal.distance || raceGoal.date)) {
    const G = [];
    if (raceGoal.distance)           G.push(`Distanza: ${raceGoal.distance}`);
    if (raceGoal.date)               G.push(`Data: ${raceGoal.date}`);
    if (raceGoal.daysToRace != null) G.push(`Mancano: ${raceGoal.daysToRace} giorni`);
    if (raceGoal.targetTime)         G.push(`Target: ${raceGoal.targetTime}`);
    if (raceGoal.predicted)          G.push(`Tempo predetto: ${raceGoal.predicted}`);
    lines.push('\n[OBIETTIVO]\n' + G.map(x => `- ${x}`).join('\n'));
  }

  // Ultime 5 attività
  const acts = (recentActivities || []).slice(0, 5);
  if (acts.length) {
    const rows = acts.map(a => {
      const date = a.date ? new Date(a.date).toLocaleDateString('it-IT', { day:'2-digit', month:'short' }) : '?';
      const dist = a.distance_km ? `${a.distance_km}km` : '';
      const dur  = a.duration_min ? `${a.duration_min}min` : '';
      const pace = a.avg_pace_sec_km ? `${Math.floor(a.avg_pace_sec_km/60)}:${String(a.avg_pace_sec_km%60).padStart(2,'0')}/km` : '';
      const hr   = a.avg_hr ? `HR ${Math.round(a.avg_hr)}` : '';
      const tss  = a.tss != null ? `TSS ${a.tss}` : '';
      return `- ${date} · ${a.name || 'Run'} · ${[dist, dur, pace, hr, tss].filter(Boolean).join(' · ')}`;
    });
    lines.push('\n[ULTIME ATTIVITÀ]\n' + rows.join('\n'));
  }

  lines.push(`
[REGOLE RISPOSTA]
- Cita i numeri reali (es. "il tuo TSB è ${form.tsb ?? '—'}, quindi...").
- Sii specifica con passi (min/km), distanze (km), HR (bpm), durate.
- Se TSB < -20 → priorità al recupero, non agli stimoli.
- Se mancano ≤7 giorni alla gara → priorità freschezza, niente lavori duri nuovi.
- Risposta concisa: 3-6 frasi. Liste solo se servono davvero.
- Non inventare dati che non hai. Se ti serve un'info mancante, chiedila.`);

  return lines.join('\n');
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonError(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
