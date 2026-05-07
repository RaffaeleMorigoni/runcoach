// js/garmin-service.jsx — wrapper API Garmin Health + Activity
// Endpoint base: https://apis.garmin.com/wellness-api/rest/...
// Tutti gli endpoint richiedono Bearer token (access_token OAuth2).

const GARMIN_API_BASE = 'https://apis.garmin.com';

async function garminFetch(path, params = {}) {
  const auth = await getValidGarminAuth();
  if (!auth) throw new Error('Garmin non connesso');

  const url = new URL(`${GARMIN_API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.append(k, v);
  });

  const r = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${auth.access_token}` },
  });

  if (r.status === 401) {
    GarminAuth.clear();
    throw new Error('Token scaduto — rilogin necessario');
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`Garmin API ${r.status}: ${t}`);
  }
  return r.json();
}

// ─── Profile ──────────────────────────────────────────────────────────────────
async function fetchGarminProfile() {
  return garminFetch('/wellness-api/rest/user/id');
}

// ─── Activities (allenamenti) ─────────────────────────────────────────────────
// Range Unix epoch seconds.
async function fetchGarminActivities(uploadStartTime, uploadEndTime) {
  return garminFetch('/wellness-api/rest/activities', {
    uploadStartTimeInSeconds: uploadStartTime,
    uploadEndTimeInSeconds:   uploadEndTime,
  });
}

// Helper: ultime N ore di attività
async function fetchRecentActivities(hours = 24 * 7) {
  const now   = Math.floor(Date.now() / 1000);
  const start = now - hours * 3600;
  return fetchGarminActivities(start, now);
}

// ─── Health Snapshot (battito + HRV + stress + spo2) ─────────────────────────
async function fetchGarminHealthSnapshot(startSec, endSec) {
  return garminFetch('/wellness-api/rest/healthSnapshot', {
    uploadStartTimeInSeconds: startSec,
    uploadEndTimeInSeconds:   endSec,
  });
}

// ─── Sleep ────────────────────────────────────────────────────────────────────
async function fetchGarminSleep(calStartSec, calEndSec) {
  return garminFetch('/wellness-api/rest/sleeps', {
    calendarDateStartInSeconds: calStartSec,
    calendarDateEndInSeconds:   calEndSec,
  });
}

async function fetchLastNightSleep() {
  const now = Math.floor(Date.now() / 1000);
  return fetchGarminSleep(now - 36 * 3600, now);
}

// ─── Daily HR ─────────────────────────────────────────────────────────────────
async function fetchGarminDailyHR(uploadStart, uploadEnd) {
  return garminFetch('/wellness-api/rest/dailies', {
    uploadStartTimeInSeconds: uploadStart,
    uploadEndTimeInSeconds:   uploadEnd,
  });
}

// ─── Weight ───────────────────────────────────────────────────────────────────
async function fetchGarminWeight(uploadStart, uploadEnd) {
  return garminFetch('/wellness-api/rest/bodyComps', {
    uploadStartTimeInSeconds: uploadStart,
    uploadEndTimeInSeconds:   uploadEnd,
  });
}

// ─── Stress ───────────────────────────────────────────────────────────────────
async function fetchGarminStress(uploadStart, uploadEnd) {
  return garminFetch('/wellness-api/rest/stressDetails', {
    uploadStartTimeInSeconds: uploadStart,
    uploadEndTimeInSeconds:   uploadEnd,
  });
}

// ─── Steps (epoch summary) ────────────────────────────────────────────────────
async function fetchGarminSteps(uploadStart, uploadEnd) {
  return garminFetch('/wellness-api/rest/epochs', {
    uploadStartTimeInSeconds: uploadStart,
    uploadEndTimeInSeconds:   uploadEnd,
  });
}

// ─── Snapshot completo: ultime 24h ────────────────────────────────────────────
async function fetchGarmin24hSnapshot() {
  const now   = Math.floor(Date.now() / 1000);
  const start = now - 24 * 3600;
  const out = { fetchedAt: now };
  await Promise.allSettled([
    fetchGarminActivities(start, now).then(d => out.activities = d),
    fetchGarminSleep(now - 36 * 3600, now).then(d => out.sleep = d),
    fetchGarminDailyHR(start, now).then(d => out.dailyHR = d),
    fetchGarminStress(start, now).then(d => out.stress = d),
    fetchGarminSteps(start, now).then(d => out.steps = d),
    fetchGarminHealthSnapshot(start, now).then(d => out.health = d),
  ]);
  return out;
}

// ─── Adattatore: Garmin activity → formato coach engine ──────────────────────
// Speculare a activitiesToTrainingData(stravaActs) ma per Garmin
function garminActivitiesToTraining(garminActs) {
  if (!Array.isArray(garminActs)) return [];
  return garminActs
    .filter(a => /running|run/i.test(a.activityType || ''))
    .map(a => ({
      date:         new Date(a.startTimeInSeconds * 1000).toISOString().slice(0, 10),
      distance_km:  (a.distanceInMeters || 0) / 1000,
      duration_min: (a.durationInSeconds || 0) / 60,
      avg_pace:     a.averagePaceInMinutesPerKilometer,
      avg_hr:       a.averageHeartRateInBeatsPerMinute,
      max_hr:       a.maxHeartRateInBeatsPerMinute,
      elevation_m:  a.totalElevationGainInMeters || 0,
      type:         classifyByPaceHR(a),
      source:       'garmin',
    }));
}

function classifyByPaceHR(a) {
  const hr = a.averageHeartRateInBeatsPerMinute;
  if (!hr) return 'easy';
  if (hr > 170) return 'tempo';
  if (hr > 155) return 'threshold';
  return 'easy';
}

Object.assign(window, {
  garminFetch,
  fetchGarminProfile,
  fetchGarminActivities, fetchRecentActivities,
  fetchGarminHealthSnapshot,
  fetchGarminSleep, fetchLastNightSleep,
  fetchGarminDailyHR,
  fetchGarminWeight,
  fetchGarminStress,
  fetchGarminSteps,
  fetchGarmin24hSnapshot,
  garminActivitiesToTraining,
});
