// api/garmin/refresh.js — refresh access token Garmin
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refresh_token } = req.body || {};
  if (!refresh_token) {
    return res.status(400).json({ error: 'missing refresh_token' });
  }

  const clientId     = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Garmin credentials not configured on server' });
  }

  try {
    const params = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     clientId,
      client_secret: clientSecret,
    });

    const r = await fetch('https://connectapi.garmin.com/oauth-service/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: 'garmin_refresh_error', detail: data });
    }

    return res.status(200).json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token || refresh_token,
      expires_in:    data.expires_in,
      expires_at:    Date.now() + (data.expires_in || 3600) * 1000,
      scope:         data.scope,
      token_type:    data.token_type || 'Bearer',
    });
  } catch (err) {
    return res.status(500).json({ error: 'fetch_failed', detail: String(err) });
  }
}
