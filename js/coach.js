// api/coach.js — Endpoint Vercel: chiama Gemini con il contesto dell'atleta.
// Riceve POST { messages: [{role, content}], context: {athlete, form, recentActivities, raceGoal} }
// Restituisce { text, model } oppure { error }.

const MODEL = 'gemini-2.5-flash'; // free tier generoso, ottima qualità per coaching
const MAX_HISTORY = 20;            // tieni la conversazione gestibile
const TIMEOUT_MS = 25000;          // Vercel Hobby: max 30s per function

export default async function handler(req, res) {
  // ── CORS / preflight (se chiami da dominio diverso, altrimenti opzionale) ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata in Vercel.' });
  }

  // ── Parse body (Vercel auto-parsa JSON se Content-Type è application/json) ──
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Body JSON non valido.' }); }
  }
  const { messages = [], context = {} } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Campo "messages" mancante o vuoto.' });
  }

  // ── Costruisci system prompt con i numeri reali dell'atleta ──
  const systemPrompt = buildSystemPrompt(context);

  // ── Mappa messaggi nel formato Gemini ──
  const history = messages
    .slice(-MAX_HISTORY)
    .filter(m => m && typeof m.content === 'string' && m.content.trim())
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  if (history.length === 0 || history[0].role !== 'user') {
    return res.status(400).json({ error: 'Il primo messaggio deve essere "user".' });
  }

  // ── Chiamata a Gemini con timeout ──
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
        contents: history,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 800,
        },
        safetySettings: [
          // Allenta solo categorie non rilevanti per il dominio sport
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    clearTimeout(t);

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      // Non rivelare la API key in eventuali messaggi di errore
      const safe = detail.replace(apiKey, '[REDACTED]').slice(0, 500);
      return res.status(r.status).json({ error: 'Gemini API error', detail: safe });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    const finishReason = data?.candidates?.[0]?.finishReason;

    if (!text) {
      return res.status(502).json({
        error: 'Gemini ha restituito una risposta vuota.',
        finishReason,
      });
    }

    return res.status(200).json({ text, model: MODEL, finishReason });
  } catch (e) {
    clearTimeout(t);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Timeout chiamata Gemini.' });
    return res.status(500).json({ error: e.message || 'Errore sconosciuto.' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt: persona coach + iniezione dati reali dell'atleta
// ─────────────────────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx) {
  const {
    athlete = {},
    form = {},
    recentActivities = [],
    raceGoal = null,
  } = ctx || {};

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

  // Forma
  const F = [];
  if (form.ctl != null) F.push(`CTL (fitness, 42gg): ${form.ctl}`);
  if (form.atl != null) F.push(`ATL (fatica, 7gg): ${form.atl}`);
  if (form.tsb != null) F.push(`TSB (forma oggi): ${form.tsb}${form.label ? ` → ${form.label}` : ''}`);
  if (form.vdot)        F.push(`VDOT: ${form.vdot}`);
  if (form.weeklyKm)    F.push(`Media settimanale ultime 4 sett: ${form.weeklyKm} km`);
  if (form.overtrainingRisk) F.push(`Rischio overtraining: ${form.overtrainingRisk}`);
  if (F.length) lines.push('\n[FORMA ATTUALE]\n' + F.map(x => `- ${x}`).join('\n'));

  // Gara
  if (raceGoal && (raceGoal.distance || raceGoal.date)) {
    const G = [];
    if (raceGoal.distance)    G.push(`Distanza: ${raceGoal.distance}`);
    if (raceGoal.date)        G.push(`Data: ${raceGoal.date}`);
    if (raceGoal.daysToRace != null) G.push(`Mancano: ${raceGoal.daysToRace} giorni`);
    if (raceGoal.targetTime)  G.push(`Target: ${raceGoal.targetTime}`);
    if (raceGoal.predicted)   G.push(`Tempo predetto: ${raceGoal.predicted}`);
    lines.push('\n[OBIETTIVO]\n' + G.map(x => `- ${x}`).join('\n'));
  }

  // Attività recenti (max 5)
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
