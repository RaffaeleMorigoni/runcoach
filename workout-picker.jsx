// js/strava.jsx — Strava OAuth + API module

const STRAVA_CLIENT_ID = '228883';
const STRAVA_AUTH_URL  = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API       = 'https://www.strava.com/api/v3';
const STORAGE_KEY      = 'rca_strava';

// ─── Token storage ─────────────────────────────────────────────────────────
const StravaAuth = {
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch { return null; }
  },
  clear() { localStorage.removeItem(STORAGE_KEY); },
  isExpired(auth) {
    if (!auth?.expires_at) return true;
    return Date.now() / 1000 > auth.expires_at - 300; // 5 min buffer
  },
};

// ─── OAuth helpers ──────────────────────────────────────────────────────────
function getRedirectUri() {
  return window.location.origin + window.location.pathname;
}

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id:     STRAVA_CLIENT_ID,
    redirect_uri:  getRedirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  return `${STRAVA_AUTH_URL}?${params}`;
}

async function exchangeCode(code, clientSecret) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     STRAVA_CLIENT_ID,
      client_secret: clientSecret,
      code,
      grant_type:    'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshToken(auth) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     STRAVA_CLIENT_ID,
      client_secret: auth.client_secret,
      refresh_token: auth.refresh_token,
      grant_type:    'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  const updated = { ...auth, ...data };
  StravaAuth.save(updated);
  return updated;
}

async function getValidAuth() {
  let auth = StravaAuth.load();
  if (!auth) return null;
  if (StravaAuth.isExpired(auth)) {
    try { auth = await refreshToken(auth); }
    catch { StravaAuth.clear(); return null; }
  }
  return auth;
}

// ─── API calls ──────────────────────────────────────────────────────────────
async function stravaGet(path, auth) {
  const res = await fetch(`${STRAVA_API}${path}`, {
    headers: { 'Authorization': `Bearer ${auth.access_token}` },
  });
  if (res.status === 401) { StravaAuth.clear(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchAthlete(auth) {
  return stravaGet('/athlete', auth);
}

async function fetchActivities(auth, perPage = 10) {
  return stravaGet(`/athlete/activities?per_page=${perPage}&type=Run`, auth);
}

async function fetchStats(auth, athleteId) {
  return stravaGet(`/athletes/${athleteId}/stats`, auth);
}

// ─── Data formatters ────────────────────────────────────────────────────────
function formatPace(metersPerSec) {
  if (!metersPerSec) return '—';
  const secPerKm = 1000 / metersPerSec;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2,'0')} /km`;
}

function formatDistance(meters) {
  return (meters / 1000).toFixed(1) + ' km';
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function activityToWorkout(act) {
  return {
    id: act.id,
    title: act.name,
    type: act.type === 'Run' ? guessRunType(act) : 'easy',
    distance: parseFloat((act.distance / 1000).toFixed(2)),
    duration: Math.round(act.moving_time / 60),
    targetPace: formatPace(act.average_speed),
    hrZone: act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm medio` : '—',
    rpe: '—',
    date: formatDate(act.start_date_local),
    elevation: act.total_elevation_gain,
    kudos: act.kudos_count,
    strava_url: `https://www.strava.com/activities/${act.id}`,
  };
}

function guessRunType(act) {
  const km = act.distance / 1000;
  const pace = 1000 / act.average_speed;
  if (km >= 16) return 'long';
  if (km >= 8 && pace < 330) return 'tempo';
  if (km <= 6 && pace < 300) return 'intervals';
  if (act.name?.toLowerCase().includes('recup')) return 'recovery';
  return 'easy';
}

// Export
Object.assign(window, {
  StravaAuth, buildAuthUrl, exchangeCode, refreshToken,
  getValidAuth, fetchAthlete, fetchActivities, fetchStats,
  formatPace, formatDistance, formatDuration, formatDate, activityToWorkout,
  STRAVA_CLIENT_ID,
});
