// Vercel Edge Function — Claude AI proxy
// Endpoint: POST /api/chat
// Body: { messages: [{role, content}], system: string }
// Risposta: { reply: string }
//
// Setup richiesto su Vercel:
//   Settings → Environment Variables → ANTHROPIC_API_KEY = sk-ant-...

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key non configurata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Body JSON non valido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages = [], system = '' } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages mancanti' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system,
        messages: messages.map(m => ({
          role: m.role === 'coach' ? 'assistant' : 'user',
          content: typeof m.content === 'string' ? m.content : (m.text || ''),
        })),
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: `Anthropic ${r.status}: ${errText.substring(0, 200)}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await r.json();
    const reply = data?.content?.[0]?.text || '';
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Errore di rete: ' + e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
