// Vercel Edge Function — Gemini AI proxy
// Endpoint: POST /api/chat
// Body: { messages: [{role, content}], system: string }
// Risposta: { reply: string }
//
// Setup richiesto su Vercel:
//   Settings → Environment Variables → GEMINI_API_KEY = AIza...
// (alias accettato anche: GOOGLE_API_KEY)

export const config = { runtime: 'edge' };

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY non configurata su Vercel' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON non valido' }, 400);
  }

  const { messages = [], system = '' } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages mancanti' }, 400);
  }

  // Conversione formato Anthropic → Gemini
  // - role: 'user' | 'assistant'/'coach'  →  'user' | 'model'
  // - system instruction è separato
  const contents = messages.map(m => {
    const role = (m.role === 'assistant' || m.role === 'coach' || m.role === 'model') ? 'model' : 'user';
    const text = typeof m.content === 'string' ? m.content : (m.text || '');
    return { role, parts: [{ text }] };
  }).filter(c => c.parts[0].text);

  if (contents.length === 0) {
    return json({ error: 'Nessun messaggio con contenuto valido' }, 400);
  }

  // Gemini richiede che il primo messaggio sia 'user'
  if (contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Inizio sessione.' }] });
  }

  try {
    const url = `${ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          temperature: 0.6,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return json({ error: `Gemini ${r.status}: ${errText.substring(0, 280)}` }, 502);
    }

    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
    if (!reply) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      return json({ error: `Risposta vuota da Gemini${finishReason ? ' (' + finishReason + ')' : ''}` }, 502);
    }
    return json({ reply });
  } catch (e) {
    return json({ error: 'Errore di rete: ' + e.message }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
