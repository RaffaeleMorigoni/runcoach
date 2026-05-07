// js/garmin-auth.jsx — Hook OAuth2 + storage token Garmin
// Pattern speculare a strava.jsx: storage in localStorage, refresh automatico.
//
// Flusso:
//   1. login() → genera state + PKCE, redirect a Garmin authorize
//   2. Garmin redirect → /garmin-callback?code=...&state=...
//   3. processCallback() → POST /api/garmin/token → salva token
//   4. getValidAuth() → ritorna token, refresh se scaduto

const GARMIN_AUTH_URL    = 'https://connect.garmin.com/oauth2Confirm';
const GARMIN_REDIRECT    = (typeof window !== 'undefined')
  ? `${window.location.origin}/garmin-callback`
  : '';
const GARMIN_SCOPES = [
  'activity:read',
  'healthsnapshot:read',
  'sleep:read',
  'heartrate:read',
  'profile:read',
  'weight:read',
  'stress:read',
  'steps:read',
].join(' ');

const GARMIN_KEY  = 'rc_garmin_auth';
const GARMIN_PKCE = 'rc_garmin_pkce';

// ─── PKCE helpers ─────────────────────────────────────────────────────────────
function randomString(len = 64) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, len);
}

async function sha256base64url(text) {
  const enc = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  const bytes = new Uint8Array(hash);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

// ─── Storage ──────────────────────────────────────────────────────────────────
const GarminAuth = {
  load() {
    try { return JSON.parse(localStorage.getItem(GARMIN_KEY) || 'null'); }
    catch { return null; }
  },
  save(auth) { localStorage.setItem(GARMIN_KEY, JSON.stringify(auth)); },
  clear()    { localStorage.removeItem(GARMIN_KEY); localStorage.removeItem(GARMIN_PKCE); },
};

// ─── Login redirect ───────────────────────────────────────────────────────────
async function garminLogin() {
  const state         = randomString(32);
  const codeVerifier  = randomString(64);
  const codeChallenge = await sha256base64url(codeVerifier);

  // Salva PKCE + state per validare al callback
  sessionStorage.setItem(GARMIN_PKCE, JSON.stringify({ state, codeVerifier }));

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             window.GARMIN_CLIENT_ID || '', // iniettato lato pagina o usa default
    redirect_uri:          GARMIN_REDIRECT,
    scope:                 GARMIN_SCOPES,
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${GARMIN_AUTH_URL}?${params.toString()}`;
}

// ─── Callback handler ─────────────────────────────────────────────────────────
async function processGarminCallback() {
  const url    = new URL(window.location.href);
  const code   = url.searchParams.get('code');
  const state  = url.searchParams.get('state');
  const error  = url.searchParams.get('error');

  if (error) throw new Error(`Garmin auth error: ${error}`);
  if (!code) throw new Error('Manca authorization code');

  const pkce = JSON.parse(sessionStorage.getItem(GARMIN_PKCE) || 'null');
  if (!pkce) throw new Error('Sessione PKCE persa — riprova login');
  if (pkce.state !== state) throw new Error('State mismatch — possibile CSRF');

  const r = await fetch('/api/garmin/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: pkce.codeVerifier,
      redirect_uri:  GARMIN_REDIRECT,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'token_exchange_failed');

  GarminAuth.save(data);
  sessionStorage.removeItem(GARMIN_PKCE);

  // Pulisci URL
  window.history.replaceState({}, '', '/');
  return data;
}

// ─── Token valido (refresh se necessario) ─────────────────────────────────────
async function getValidGarminAuth() {
  let auth = GarminAuth.load();
  if (!auth) return null;

  const fiveMinFromNow = Date.now() + 5 * 60 * 1000;
  if (auth.expires_at && auth.expires_at > fiveMinFromNow) return auth;

  // Refresh
  try {
    const r = await fetch('/api/garmin/refresh', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: auth.refresh_token }),
    });
    if (!r.ok) {
      GarminAuth.clear();
      return null;
    }
    const fresh = await r.json();
    GarminAuth.save(fresh);
    return fresh;
  } catch {
    return null;
  }
}

function garminLogout() { GarminAuth.clear(); }
function isGarminConnected() { return !!GarminAuth.load(); }

// ─── React hook ───────────────────────────────────────────────────────────────
function useGarminAuth() {
  const [auth, setAuth]       = React.useState(GarminAuth.load());
  const [loading, setLoading] = React.useState(false);
  const [error, setError]     = React.useState(null);

  React.useEffect(() => {
    // Auto-process se siamo sul callback
    if (window.location.pathname.startsWith('/garmin-callback') ||
        new URLSearchParams(window.location.search).get('garmin_callback') === '1') {
      setLoading(true);
      processGarminCallback()
        .then(a => setAuth(a))
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, []);

  return {
    auth,
    isConnected: !!auth,
    loading,
    error,
    login:   garminLogin,
    logout:  () => { garminLogout(); setAuth(null); },
    refresh: async () => {
      const a = await getValidGarminAuth();
      setAuth(a);
      return a;
    },
  };
}

Object.assign(window, {
  GarminAuth,
  garminLogin, garminLogout,
  processGarminCallback,
  getValidGarminAuth,
  isGarminConnected,
  useGarminAuth,
});
