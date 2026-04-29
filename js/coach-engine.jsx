// js/coach-engine.jsx — Il cervello del coach AI
// Calcola: TSS, CTL, ATL, TSB, VDOT, decoupling HR/pace, predizione gara,
// rilevamento overtraining, generazione workout Garmin specifici.
//
// Modello scientifico:
//   TSS  = Training Stress Score (Coggan-style adattato per running via HR/pace)
//   CTL  = Chronic Training Load — fitness (media esponenziale 42gg)
//   ATL  = Acute Training Load — fatica (media esponenziale 7gg)
//   TSB  = Training Stress Balance = CTL - ATL — forma del giorno
//   VDOT = stima VO2max da PB recente (Daniels)

// ─── HR Zones (calcolate da HR max stimata) ───────────────────────────────────
function estimateMaxHR(age) {
  // Tanaka: 208 - 0.7*age (più accurato di 220-age)
  return Math.round(208 - 0.7 * age);
}

function getHRZones(maxHR, restHR = 60) {
  // Karvonen: HRR = HRmax - HRrest, zone in % di HRR
  const hrr = maxHR - restHR;
  return {
    z1: { min: Math.round(restHR + hrr * 0.50), max: Math.round(restHR + hrr * 0.60), label: 'Recupero', color: '#4D9EFF' },
    z2: { min: Math.round(restHR + hrr * 0.60), max: Math.round(restHR + hrr * 0.70), label: 'Aerobico Facile', color: '#00CFA8' },
    z3: { min: Math.round(restHR + hrr * 0.70), max: Math.round(restHR + hrr * 0.80), label: 'Tempo', color: '#F6C94E' },
    z4: { min: Math.round(restHR + hrr * 0.80), max: Math.round(restHR + hrr * 0.90), label: 'Soglia', color: '#FF8844' },
    z5: { min: Math.round(restHR + hrr * 0.90), max: maxHR,                            label: 'VO2max',    color: '#FF4422' },
  };
}

// ─── TSS: Training Stress Score per running ───────────────────────────────────
// Approccio: usa Intensity Factor basato su pace o HR
// IF = pace_medio / pace_soglia (threshold pace)
// TSS = (durata_min / 60) * IF^2 * 100
function calculateTSS(activity, thresholdPaceSecKm = 300, maxHR = 180) {
  if (!activity || !activity.duration_min) return 0;

  const durHours = activity.duration_min / 60;
  let intensityFactor;

  // Preferenza HR-based se disponibile (più affidabile)
  if (activity.avg_hr && activity.avg_hr > 0) {
    // hrTSS: IF = avg_hr / threshold_hr (threshold ≈ 88% HRmax)
    const thresholdHR = maxHR * 0.88;
    intensityFactor = activity.avg_hr / thresholdHR;
  } else if (activity.avg_pace_sec_km) {
    // pace-based: pace migliore = IF più alto (pace bassi = più intensi)
    intensityFactor = thresholdPaceSecKm / activity.avg_pace_sec_km;
  } else {
    // fallback: stima da tipo
    intensityFactor = ({ easy:0.65, recovery:0.55, long:0.7, tempo:0.85, intervals:0.95, race:1.05 })[activity.type] || 0.7;
  }

  // Cap a 1.15 per non sovrastimare
  intensityFactor = Math.min(intensityFactor, 1.15);
  return Math.round(durHours * Math.pow(intensityFactor, 2) * 100);
}

// ─── CTL/ATL/TSB con decay esponenziale ───────────────────────────────────────
// Formula: load_oggi = load_ieri + (TSS_oggi - load_ieri) / time_constant
// CTL: time_constant = 42 (forma cronica, 6 settimane)
// ATL: time_constant = 7  (fatica acuta, 1 settimana)
function calculateTrainingLoad(activities, days = 90) {
  // activities = [{ date, tss }, ...] in ordine cronologico
  // Restituisce array di { date, ctl, atl, tsb, tss }
  if (!activities.length) return [];

  // Ordina per data ascendente
  const sorted = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));
  const startDate = new Date(sorted[0].date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  // Mappa data → TSS totale
  const tssByDate = {};
  for (const a of sorted) {
    const key = new Date(a.date).toISOString().slice(0, 10);
    tssByDate[key] = (tssByDate[key] || 0) + (a.tss || 0);
  }

  const result = [];
  let ctl = 0, atl = 0;
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10);
    const tss = tssByDate[key] || 0;
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    result.push({
      date: key,
      tss,
      ctl: +ctl.toFixed(1),
      atl: +atl.toFixed(1),
      tsb: +(ctl - atl).toFixed(1),
    });
    cur.setDate(cur.getDate() + 1);
  }

  // Mantieni solo gli ultimi N giorni
  return result.slice(-days);
}

// ─── VDOT: stima VO2max da una performance ────────────────────────────────────
// Daniels VDOT formula
function calculateVDOT(distanceMeters, timeSeconds) {
  if (!distanceMeters || !timeSeconds) return null;
  const velocity = distanceMeters / (timeSeconds / 60); // m/min
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * (timeSeconds / 60))
                      + 0.2989558 * Math.exp(-0.1932605 * (timeSeconds / 60));
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity;
  return +(vo2 / percentMax).toFixed(1);
}

// VDOT → predizione tempo su altra distanza
// Tabelle Daniels approssimate via Riegel + correzione VDOT
function predictTimeFromVDOT(vdot, targetDistMeters) {
  // Approccio iterativo: trova T tale che calculateVDOT(targetDist, T) ≈ vdot
  let lo = 60, hi = 36000; // 1min - 10h
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const v = calculateVDOT(targetDistMeters, mid);
    if (v > vdot) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

// ─── Decoupling HR/Pace: indicatore di affaticamento aerobico ─────────────────
// Confronta efficienza prima metà vs seconda metà di una corsa lunga
// Decoupling > 5% = segnale di stanchezza/disidratazione/perdita forma
function calculateDecoupling(splits) {
  // splits = [{ km, pace_sec, hr }, ...]
  if (!splits || splits.length < 4) return null;
  const half = Math.floor(splits.length / 2);
  const first = splits.slice(0, half);
  const second = splits.slice(half, half * 2);

  const efficiency = (group) => {
    const validHR = group.filter(s => s.hr > 0);
    if (!validHR.length) return null;
    const avgPace = group.reduce((s, x) => s + x.pace_sec, 0) / group.length;
    const avgHR = validHR.reduce((s, x) => s + x.hr, 0) / validHR.length;
    return avgPace > 0 ? (1000 / avgPace) / avgHR : null; // velocity per heartbeat
  };

  const ef1 = efficiency(first);
  const ef2 = efficiency(second);
  if (!ef1 || !ef2) return null;
  return +(((ef1 - ef2) / ef1) * 100).toFixed(1); // % di decoupling
}

// ─── Rilevamento overtraining ─────────────────────────────────────────────────
function detectOvertraining(loadHistory, recentActivities) {
  // loadHistory = ultimi 28gg di { ctl, atl, tsb }
  // recentActivities = ultime corse con HR/pace
  const flags = [];
  if (!loadHistory.length) return { risk: 'unknown', flags };

  const last = loadHistory[loadHistory.length - 1];

  // Flag 1: TSB molto negativo (< -30) per più di 5 giorni
  const negDays = loadHistory.slice(-7).filter(d => d.tsb < -30).length;
  if (negDays >= 5) {
    flags.push({
      severity: 'high',
      title: 'Carico acuto eccessivo',
      detail: `TSB sotto -30 per ${negDays} giorni — fatica accumulata. Riduci volume del 30%.`,
    });
  }

  // Flag 2: ATL/CTL > 1.5 (rampa troppo veloce)
  if (last.ctl > 0 && last.atl / last.ctl > 1.5) {
    flags.push({
      severity: 'medium',
      title: 'Rampa di carico ripida',
      detail: `Stai aumentando il volume troppo in fretta (ratio ${(last.atl / last.ctl).toFixed(2)}). Stabilizza.`,
    });
  }

  // Flag 3: HR alta a ritmo basso (decoupling > 8%)
  const lastLong = recentActivities.find(a => a.distance_km >= 12 && a.splits?.length);
  if (lastLong) {
    const dec = calculateDecoupling(lastLong.splits);
    if (dec !== null && dec > 8) {
      flags.push({
        severity: 'high',
        title: 'Decoupling HR/pace elevato',
        detail: `Nell'ultimo lungo HR è salita del ${dec}% a parità di passo — possibile disidratazione, caldo o affaticamento aerobico.`,
      });
    }
  }

  // Flag 4: HR a riposo elevata (se tracciata)
  const recentHRs = recentActivities.slice(-7).map(a => a.resting_hr).filter(Boolean);
  if (recentHRs.length >= 3) {
    const avgRecent = recentHRs.reduce((s, x) => s + x, 0) / recentHRs.length;
    const baseline = recentActivities.slice(-30, -7).map(a => a.resting_hr).filter(Boolean);
    if (baseline.length >= 5) {
      const avgBase = baseline.reduce((s, x) => s + x, 0) / baseline.length;
      if (avgRecent > avgBase + 5) {
        flags.push({
          severity: 'medium',
          title: 'HR a riposo elevata',
          detail: `+${(avgRecent - avgBase).toFixed(0)} bpm rispetto baseline — possibile stress/sotto-recupero.`,
        });
      }
    }
  }

  let risk = 'low';
  if (flags.some(f => f.severity === 'high')) risk = 'high';
  else if (flags.length >= 2) risk = 'medium';

  return { risk, flags, ctl: last.ctl, atl: last.atl, tsb: last.tsb };
}

// ─── Predizione tempo gara ────────────────────────────────────────────────────
// Combina VDOT da PB recenti + correzione TSB (forma)
function predictRaceTime(pbs, tsb, targetDistKm = 21.097) {
  // pbs = { '5k': { distanceMeters, timeSec, daysAgo }, '10k': ..., '21k': ... }
  const targetMeters = targetDistKm * 1000;
  const candidates = [];

  for (const [k, pb] of Object.entries(pbs)) {
    if (!pb || !pb.distanceMeters || !pb.timeSec) continue;
    const vdot = calculateVDOT(pb.distanceMeters, pb.timeSec);
    if (!vdot) continue;
    const predicted = predictTimeFromVDOT(vdot, targetMeters);
    // Peso: PB più recenti e più simili come distanza pesano di più
    const distSimilarity = 1 - Math.abs(Math.log(pb.distanceMeters / targetMeters)) / 3;
    const recency = Math.exp(-(pb.daysAgo || 30) / 60);
    const weight = Math.max(0.1, distSimilarity * recency);
    candidates.push({ source: k, vdot, predicted, weight });
  }

  if (!candidates.length) return null;

  // Media pesata
  const totW = candidates.reduce((s, c) => s + c.weight, 0);
  const baseTime = candidates.reduce((s, c) => s + c.predicted * c.weight, 0) / totW;
  const avgVDOT = candidates.reduce((s, c) => s + c.vdot * c.weight, 0) / totW;

  // Correzione TSB: forma ottimale tra +5 e +25 → -2% tempo
  // TSB molto negativo (< -20) → +3% tempo
  let tsbFactor = 1.0;
  if (tsb !== null && tsb !== undefined) {
    if (tsb >= 5 && tsb <= 25) tsbFactor = 0.98;       // forma ottimale
    else if (tsb > 25)        tsbFactor = 1.005;       // troppo riposata, spunto in meno
    else if (tsb < -20)       tsbFactor = 1.03;        // affaticata
    else if (tsb < -10)       tsbFactor = 1.015;
  }

  const adjusted = Math.round(baseTime * tsbFactor);

  // Range realistico ±3%
  return {
    predicted: adjusted,
    optimistic: Math.round(adjusted * 0.97),
    conservative: Math.round(adjusted * 1.03),
    vdot: +avgVDOT.toFixed(1),
    confidence: candidates.length >= 2 ? 'alta' : 'media',
    sources: candidates.map(c => c.source),
    tsbFactor,
  };
}

// ─── Forma fisica readable label ──────────────────────────────────────────────
function getFormLabel(tsb) {
  if (tsb === null || tsb === undefined) return { label: 'Sconosciuta', color: '#888', desc: 'Dati insufficienti' };
  if (tsb >= 25)  return { label: 'Troppo riposata', color: '#A78BFA', desc: 'Rischio detraining se prolungato' };
  if (tsb >= 5)   return { label: 'Forma ottimale',  color: '#00CFA8', desc: 'Pronta per performance' };
  if (tsb >= -10) return { label: 'Costruzione',     color: '#4D9EFF', desc: 'Carico produttivo, recupero ok' };
  if (tsb >= -20) return { label: 'Affaticata',      color: '#F6C94E', desc: 'Carico elevato, attenzione recupero' };
  return            { label: 'Sovraccarico',         color: '#FF4422', desc: 'Riduci carico immediatamente' };
}

// ─── Generator workout per Garmin ─────────────────────────────────────────────
// Crea step di workout in formato compatibile con il builder TCX
function generateWorkout(type, params = {}) {
  const {
    targetPaceSecKm = 335,    // 5:35/km (mezza)
    easyPaceSecKm = 390,      // 6:30/km
    thresholdPaceSecKm = 315, // 5:15/km
    vo2PaceSecKm = 270,       // 4:30/km
    longDistanceKm = 12,
  } = params;

  const fmtPace = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}/km`;
  const paceRange = (sec, tol = 10) => `${fmtPace(sec - tol)} – ${fmtPace(sec + tol)}`;

  const generators = {
    easy: () => ({
      name: 'Corsa Facile Z2',
      type: 'easy',
      summary: `${params.distanceKm || 6} km @ ${paceRange(easyPaceSecKm, 20)}`,
      total_min: Math.round((params.distanceKm || 6) * easyPaceSecKm / 60),
      steps: [
        { kind: 'warmup',  duration_min: 5,  target_pace: paceRange(easyPaceSecKm + 30, 20), zone: 'Z1', desc: 'Cammino veloce + jogging molto leggero' },
        { kind: 'run',     duration_km: (params.distanceKm || 6) - 1, target_pace: paceRange(easyPaceSecKm, 20), zone: 'Z2', desc: 'Ritmo conversazionale — devi poter parlare' },
        { kind: 'cooldown', duration_min: 5, target_pace: 'libero', zone: 'Z1', desc: 'Cammino + stretching' },
      ],
      coach_note: 'Corsa di costruzione aerobica. Resta in Z2: se HR sale in Z3, rallenta. Più piano è, meglio è.',
    }),

    recovery: () => ({
      name: 'Recupero Attivo',
      type: 'recovery',
      summary: `${params.distanceKm || 4} km molto lenti`,
      total_min: Math.round((params.distanceKm || 4) * (easyPaceSecKm + 30) / 60),
      steps: [
        { kind: 'run', duration_km: params.distanceKm || 4, target_pace: paceRange(easyPaceSecKm + 30, 30), zone: 'Z1', desc: 'Solo movimento, zero sforzo' },
      ],
      coach_note: 'Obiettivo: ricircolo sanguigno, recupero dei muscoli. Se hai dubbi, vai più piano.',
    }),

    tempo: () => {
      const tempoKm = params.tempoKm || 5;
      return {
        name: `Tempo Run ${tempoKm}km`,
        type: 'tempo',
        summary: `${tempoKm} km @ ${fmtPace(thresholdPaceSecKm)}`,
        total_min: Math.round((tempoKm * thresholdPaceSecKm + 20 * 60) / 60),
        steps: [
          { kind: 'warmup',   duration_min: 12, target_pace: paceRange(easyPaceSecKm, 20), zone: 'Z2', desc: 'Jogging + 4 allunghi 80m' },
          { kind: 'tempo',    duration_km: tempoKm, target_pace: paceRange(thresholdPaceSecKm, 8), zone: 'Z3-Z4', desc: 'Ritmo "comodamente duro", respirazione pesante ma controllata' },
          { kind: 'cooldown', duration_min: 8,  target_pace: 'libero', zone: 'Z1', desc: 'Defaticamento' },
        ],
        coach_note: `Allenamento di soglia: alza la lattate threshold. Trova il ritmo "scomodo ma sostenibile". Non più veloce.`,
      };
    },

    intervals: () => {
      const reps = params.reps || 5;
      const repDistM = params.repDistM || 1000;
      const recoverSec = params.recoverSec || 90;
      return {
        name: `${reps}×${repDistM}m VO2max`,
        type: 'intervals',
        summary: `${reps}×${repDistM}m @ ${fmtPace(vo2PaceSecKm)} R: ${recoverSec}″`,
        total_min: Math.round((reps * (repDistM / 1000 * vo2PaceSecKm + recoverSec) + 20 * 60) / 60),
        steps: [
          { kind: 'warmup', duration_min: 15, target_pace: paceRange(easyPaceSecKm, 30), zone: 'Z2', desc: 'Jogging progressivo + 5 allunghi' },
          ...Array.from({ length: reps }).flatMap((_, i) => [
            { kind: 'interval', duration_m: repDistM, target_pace: paceRange(vo2PaceSecKm, 5), zone: 'Z5', desc: `Ripetuta ${i + 1}/${reps} — forte ma controllata` },
            ...(i < reps - 1 ? [{ kind: 'recover', duration_sec: recoverSec, target_pace: 'libero', zone: 'Z1', desc: 'Recupero attivo (jogging lento o cammino)' }] : []),
          ]),
          { kind: 'cooldown', duration_min: 10, target_pace: 'libero', zone: 'Z1', desc: 'Defaticamento + stretching' },
        ],
        coach_note: 'Lavoro VO2max: stimola la potenza aerobica. Punta a chiudere tutte le ripetute allo STESSO ritmo (non partire troppo forte).',
      };
    },

    progressive: () => {
      const totalKm = params.distanceKm || 8;
      const seg = Math.floor(totalKm / 3);
      return {
        name: `Progressivo ${totalKm}km`,
        type: 'progressive',
        summary: `${seg} km easy → ${seg} km moderato → ${seg} km a ritmo gara`,
        total_min: Math.round(totalKm * 380 / 60),
        steps: [
          { kind: 'run', duration_km: seg, target_pace: paceRange(easyPaceSecKm, 15), zone: 'Z2', desc: 'Inizio facile' },
          { kind: 'run', duration_km: seg, target_pace: paceRange((easyPaceSecKm + targetPaceSecKm) / 2, 10), zone: 'Z3', desc: 'Aumenta ritmo gradualmente' },
          { kind: 'run', duration_km: totalKm - 2 * seg, target_pace: paceRange(targetPaceSecKm, 8), zone: 'Z3-Z4', desc: 'Chiudi a ritmo gara' },
        ],
        coach_note: 'Progressione di ritmo: simula la chiusura forte di una gara. Il finale deve essere il pezzo più veloce.',
      };
    },

    fartlek: () => {
      const totalMin = params.totalMin || 40;
      return {
        name: `Fartlek ${totalMin}min`,
        type: 'fartlek',
        summary: `${totalMin} min a ritmo libero con cambi di passo`,
        total_min: totalMin,
        steps: [
          { kind: 'warmup', duration_min: 10, target_pace: paceRange(easyPaceSecKm, 20), zone: 'Z2', desc: 'Jogging' },
          { kind: 'fartlek', duration_min: totalMin - 18, target_pace: 'variabile', zone: 'Z2-Z4', desc: '6×(2 min veloce + 2 min facile) — gioca col ritmo' },
          { kind: 'cooldown', duration_min: 8, target_pace: 'libero', zone: 'Z1', desc: 'Defaticamento' },
        ],
        coach_note: 'Allenamento divertente e versatile: insegna al corpo a cambiare ritmo. Non è interval secco — usa il terreno.',
      };
    },

    long: () => {
      const km = params.distanceKm || longDistanceKm;
      return {
        name: `Lungo ${km}km`,
        type: 'long',
        summary: `${km} km @ ${paceRange(easyPaceSecKm + 20, 30)}`,
        total_min: Math.round(km * (easyPaceSecKm + 20) / 60),
        steps: [
          { kind: 'warmup',  duration_min: 10, target_pace: paceRange(easyPaceSecKm + 30, 20), zone: 'Z1', desc: 'Inizio molto lento' },
          { kind: 'run',     duration_km: km - 1.5, target_pace: paceRange(easyPaceSecKm + 20, 25), zone: 'Z2', desc: 'Ritmo conversazionale costante' },
          { kind: 'cooldown', duration_min: 5, target_pace: 'libero', zone: 'Z1', desc: 'Defaticamento' },
        ],
        coach_note: 'Costruzione resistenza aerobica. Idratati ogni 30 min. Se HR drift > 5%, rallenta.',
      };
    },

    long_with_finish: () => {
      const km = params.distanceKm || 14;
      const finishKm = 3;
      return {
        name: `Lungo ${km}km con finale veloce`,
        type: 'long',
        summary: `${km - finishKm} km easy + ${finishKm} km @ ritmo gara`,
        total_min: Math.round((km - finishKm) * (easyPaceSecKm + 20) / 60 + finishKm * targetPaceSecKm / 60 + 5),
        steps: [
          { kind: 'warmup',  duration_min: 8, target_pace: paceRange(easyPaceSecKm + 30, 20), zone: 'Z1', desc: 'Riscaldamento' },
          { kind: 'run',     duration_km: km - finishKm - 0.5, target_pace: paceRange(easyPaceSecKm + 20, 25), zone: 'Z2', desc: 'Lungo aerobico' },
          { kind: 'run',     duration_km: finishKm, target_pace: paceRange(targetPaceSecKm, 8), zone: 'Z3-Z4', desc: 'CHIUDI FORTE — al ritmo gara' },
          { kind: 'cooldown', duration_min: 5, target_pace: 'libero', zone: 'Z1', desc: 'Defaticamento' },
        ],
        coach_note: 'Lungo specifico-gara: insegna a finire forte quando già stanca. Simula gli ultimi km della mezza.',
      };
    },
  };

  const fn = generators[type];
  if (!fn) return null;
  return { ...fn(), generated_at: new Date().toISOString() };
}

// ─── Decisioni piano: ricalibra in base a forma ───────────────────────────────
function suggestPlanAdjustment(loadAnalysis, plannedWorkout, daysToRace) {
  const { risk, tsb, flags } = loadAnalysis;
  const suggestions = [];

  // Vicino alla gara: priorità a freschezza
  if (daysToRace <= 14) {
    if (tsb < -10) {
      suggestions.push({
        action: 'reduce_intensity',
        reason: `TSB ${tsb} a ${daysToRace}gg dalla gara — devi recuperare fatica. Riduci intensità.`,
        change: plannedWorkout?.type === 'intervals' || plannedWorkout?.type === 'tempo' ? 'easy' : null,
      });
    }
  }

  // Rischio overtraining alto
  if (risk === 'high') {
    suggestions.push({
      action: 'rest_or_easy',
      reason: 'Segnali multipli di affaticamento — sostituisci con easy o riposo.',
      change: 'recovery',
    });
  }

  // TSB troppo positivo lontano dalla gara: aggiungi stimolo
  if (tsb > 20 && daysToRace > 21) {
    suggestions.push({
      action: 'add_quality',
      reason: 'Forma molto fresca ma lontano dalla gara — è il momento di stimolare.',
      change: null,
    });
  }

  return { suggestions, shouldRecalibrate: suggestions.length > 0 };
}

// ─── Helper: parse pace string "5:35/km" → secondi ────────────────────────────
function paceStringToSec(str) {
  if (!str) return null;
  const m = str.match(/(\d+):(\d+)/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

// ─── Estrai metriche da activities Strava ────────────────────────────────────
function activitiesToTrainingData(activities) {
  return activities.map(act => {
    const distKm = (act.distance || 0) / 1000;
    const durMin = (act.moving_time || 0) / 60;
    const avgPaceSec = act.average_speed > 0 ? Math.round(1000 / act.average_speed) : null;
    const tss = calculateTSS({
      duration_min: durMin,
      avg_hr: act.average_heartrate,
      avg_pace_sec_km: avgPaceSec,
      type: 'easy',
    });
    return {
      id: act.id,
      date: act.start_date_local || act.start_date,
      name: act.name,
      distance_km: +distKm.toFixed(2),
      duration_min: Math.round(durMin),
      avg_pace_sec_km: avgPaceSec,
      avg_hr: act.average_heartrate,
      max_hr: act.max_heartrate,
      elevation_m: act.total_elevation_gain,
      tss,
    };
  });
}

// ─── generateTodayWorkout: workout di oggi in base a giorni-a-gara e forma ───
// Restituisce { title, detail, distance, duration, pace, intensity }
function generateTodayWorkout(loadHistory, raceDateStr) {
  const last = loadHistory[loadHistory.length - 1] || { tsb: 0, ctl: 30 };
  const today = new Date();
  const race = new Date(raceDateStr);
  const daysToRace = Math.ceil((race - today) / 86400000);
  const dow = today.getDay(); // 0=domenica … 6=sabato

  // Dentro la settimana di taper (≤ 7 gg)
  if (daysToRace <= 7 && daysToRace >= 0) {
    if (daysToRace === 0)  return { title:'GARA · Mezza Maratona', detail:'21.097 km · target 1:58 · passo 5:35/km. Buona gara!', distance:21.1, duration:118, pace:'5:35', intensity:'GARA' };
    if (daysToRace === 1)  return { title:'Riposo + attivazione',  detail:'10\' camminata + 4× allunghi 80m. Riposare presto.', distance:1.5, duration:20, pace:'CAM', intensity:'PRE-GARA' };
    if (daysToRace === 2)  return { title:'Attivazione breve',     detail:'4 km easy + 3× 100m allunghi. Caricare carbo.', distance:4, duration:25, pace:'6:10', intensity:'EASY' };
    if (daysToRace === 3)  return { title:'Riposo totale',         detail:'Giorno OFF. Mobilità, sonno, idratazione.', distance:0, duration:0, pace:'—', intensity:'OFF' };
    if (daysToRace === 4)  return { title:'Stimolo gara',          detail:'2km wu + 4 km a passo gara (5:35/km) + 1km cd', distance:7, duration:42, pace:'5:35', intensity:'TEMPO' };
    if (daysToRace === 5)  return { title:'Easy 5km',              detail:'Corsa molto facile, gambe sciolte.', distance:5, duration:32, pace:'6:00', intensity:'EASY' };
    if (daysToRace === 6)  return { title:'Easy 6km',              detail:'Ritmo conversazionale, niente sforzo.', distance:6, duration:38, pace:'6:00', intensity:'EASY' };
    if (daysToRace === 7)  return { title:'Lungo leggero 12km',    detail:'Ultimo lungo prima della gara, ritmo facile.', distance:12, duration:78, pace:'6:10', intensity:'LUNGO' };
  }

  // Forma molto bassa → recupero
  if (last.tsb < -25) return { title:'Recupero attivo', detail:'Sei in deficit. 30\' camminata o yoga. Riposo.', distance:0, duration:30, pace:'—', intensity:'RECUP' };

  // Pattern settimanale standard (build phase)
  if (dow === 0)  return { title:'Lungo',           detail:'Lungo settimanale a passo conversazionale.', distance:18, duration:115, pace:'6:00', intensity:'LUNGO' };
  if (dow === 1)  return { title:'Riposo',          detail:'Giorno OFF. Mobilità o stretching.', distance:0, duration:0, pace:'—', intensity:'OFF' };
  if (dow === 2)  return { title:'Tempo run',       detail:'2km wu + 5km @ passo gara + 1km cd', distance:8, duration:45, pace:'5:35', intensity:'TEMPO' };
  if (dow === 3)  return { title:'Easy + allunghi', detail:'6km easy + 6× 100m allunghi finali', distance:6, duration:40, pace:'6:00', intensity:'EASY' };
  if (dow === 4)  return { title:'Intervalli',      detail:'2km wu + 6× 800m @ 4:50/km r=2\' + 1km cd', distance:9, duration:50, pace:'4:50', intensity:'VO2' };
  if (dow === 5)  return { title:'Easy o riposo',   detail:'Corsa rigenerativa 5 km, oppure OFF.', distance:5, duration:32, pace:'6:10', intensity:'EASY' };
  if (dow === 6)  return { title:'Pre-lungo',       detail:'4 km easy + 3 allunghi. Domani lungo.', distance:4, duration:26, pace:'6:00', intensity:'EASY' };

  return { title:'Corsa easy', detail:'5 km a passo conversazionale.', distance:5, duration:32, pace:'6:00', intensity:'EASY' };
}

// Export
Object.assign(window, {
  estimateMaxHR, getHRZones,
  calculateTSS, calculateTrainingLoad,
  calculateVDOT, predictTimeFromVDOT, predictRaceTime,
  calculateDecoupling, detectOvertraining,
  getFormLabel, generateWorkout, generateTodayWorkout, suggestPlanAdjustment,
  paceStringToSec, activitiesToTrainingData,
});
