// api/garmin/token.js — Vercel serverless function
// Scambia il code OAuth2 ricevuto dal redirect Garmin per un access_token + refresh_token.
//
// ⚠️ NOTA: Garmin Health/Activity API ufficiale usa OAuth 1.0a (non OAuth 2.0).
// Questo endpoint è scritto in stile OAuth 2.0 (PKCE) — funziona con i wrapper
// "garmin-oauth2" non ufficiali e con il portale Garmin Connect IQ Connect.
// Se ti danno credenziali OAuth 1.0a serve riscrivere con firma HMAC-SHA1.
//
// ENV richieste su Vercel:
//   GARMIN_CLIENT_ID
//   GARMIN_CLIENT_SECRET
//   GARMIN_REDIRECT_URI   (es. https://runcoach-nu.vercel.app/garmin-callback)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, code_verifier, redirect_uri } = req.body || {};
  if (!code) {
    return res.status(400).json({ error: 'missing code' });
  }

  const clientId     = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  const redirectUri  = redirect_uri || process.env.GARMIN_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Garmin credentials not configured on server' });
  }

  try {
    const params = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    });
    if (code_verifier) params.append('code_verifier', code_verifier);

    const r = await fetch('https://connectapi.garmin.com/oauth-service/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: 'garmin_token_error', detail: data });
    }

    // data: { access_token, refresh_token, expires_in, token_type, scope, ... }
    return res.status(200).json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
      expires_at:    Date.now() + (data.expires_in || 3600) * 1000,
      scope:         data.scope,
      token_type:    data.token_type || 'Bearer',
    });
  } catch (err) {
    return res.status(500).json({ error: 'fetch_failed', detail: String(err) });
  }
}
