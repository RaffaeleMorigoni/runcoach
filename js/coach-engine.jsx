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

  // Flag 2: ATL/CTL > 1.5 (rampa troppo veloce) — guard contro CTL=0
  if (last.ctl > 5 && last.atl / last.ctl > 1.5) {
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
  if (tsb === null || tsb === undefined || !isFinite(tsb)) return { label: 'Sconosciuta', color: '#888', desc: 'Dati insufficienti', advice: 'Carica più attività su Strava per vedere la forma.' };
  if (tsb >= 25)  return { label: 'Troppo riposata', color: '#A78BFA', desc: 'Rischio detraining se prolungato', advice: 'Aggiungi qualche stimolo qualità per non perdere fitness.' };
  if (tsb >= 5)   return { label: 'Forma ottimale',  color: '#00E5C0', desc: 'Pronta per performance', advice: 'Finestra ideale per gare o test. Mantieni intensità.' };
  if (tsb >= -10) return { label: 'Costruzione',     color: '#4D9EFF', desc: 'Carico produttivo, recupero ok', advice: 'Volume sano. Continua così, sei nel ritmo giusto.' };
  if (tsb >= -20) return { label: 'Affaticata',      color: '#FFD24E', desc: 'Carico elevato, attenzione recupero', advice: 'Inserisci 1-2 giorni di recupero attivo nei prossimi 3 giorni.' };
  return            { label: 'Sovraccarico',         color: '#FF4422', desc: 'Riduci carico immediatamente',     advice: 'Riduci volume del 30% per 4-7 giorni. Niente qualità.' };
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

// ─── Genera piano settimanale: 7 giorni a partire da oggi ────────────────────
// Ogni giorno: { date, dow, label, workout, isToday, isPast }
function generateWeekPlan(loadHistory, raceDateStr) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateIso = d.toISOString().slice(0, 10);
    // Genera workout a quella data: simulo daysToRace per quella data
    const race = new Date(raceDateStr);
    const daysFromThatDay = Math.ceil((race - d) / 86400000);
    const fakeRaceDate = new Date(today.getTime() + daysFromThatDay * 86400000).toISOString();
    const w = generateTodayWorkout(loadHistory, fakeRaceDate);
    days.push({
      date: dateIso,
      dow: d.getDay(),
      dayLabel: d.toLocaleDateString('it-IT', { weekday: 'short' }),
      dateLabel: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
      workout: w,
      isToday: i === 0,
      daysFromRace: daysFromThatDay,
    });
  }
  return days;
}

// ─── Detector missed sessions: confronta piano vs realtà ─────────────────────
// Prende activities Strava degli ultimi 7gg + il piano settimanale precedente
// Restituisce array di { date, planned, actual, status: 'done'|'missed'|'partial'|'overdone' }
function compareActualVsPlanned(activities, plannedWeekIso) {
  if (!activities || !plannedWeekIso) return [];
  const result = [];
  for (const day of plannedWeekIso) {
    const dayActivities = activities.filter(a => {
      const aDate = new Date(a.start_date_local || a.start_date).toISOString().slice(0, 10);
      return aDate === day.date;
    });
    const totalKm = dayActivities.reduce((s, a) => s + (a.distance || 0) / 1000, 0);
    const planned = day.workout;
    const plannedKm = planned?.distance || 0;

    let status = 'pending';
    if (plannedKm === 0 && totalKm === 0) status = 'rest_ok';
    else if (plannedKm === 0 && totalKm > 0) status = 'overdone';
    else if (plannedKm > 0 && totalKm === 0) status = 'missed';
    else if (totalKm >= plannedKm * 0.8) status = 'done';
    else if (totalKm > 0) status = 'partial';

    result.push({
      date: day.date,
      planned: planned,
      actualKm: totalKm,
      activities: dayActivities,
      status,
    });
  }
  return result;
}

// ─── Ricalibrazione completa: produce changes con ragioni ────────────────────
// Restituisce { changes: [{day, from, to, reason}], summary, severity }
function recalibratePlan({ activities, loadHistory, raceDateStr, lastPlan }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(raceDateStr);
  const daysToRace = Math.ceil((race - today) / 86400000);
  const last = loadHistory[loadHistory.length - 1] || { tsb: 0, ctl: 30, atl: 30 };

  const changes = [];
  let severity = 'info'; // info | warn | critical

  // 1. Confronta ultimi 7gg con piano precedente
  let missedCount = 0;
  let partialCount = 0;
  if (lastPlan) {
    const comparison = compareActualVsPlanned(activities, lastPlan);
    for (const c of comparison) {
      if (c.status === 'missed' && c.planned?.distance > 0) missedCount++;
      if (c.status === 'partial') partialCount++;
    }
  }

  // 2. Genera nuovo piano
  const newPlan = generateWeekPlan(loadHistory, raceDateStr);

  // 3. Decisioni di ricalibrazione
  if (last.tsb < -20) {
    severity = 'critical';
    changes.push({
      day: 'oggi',
      type: 'reduce_load',
      reason: `TSB ${Math.round(last.tsb)} — sei in deficit profondo. Sostituisco workout intenso con easy.`,
    });
    // Trasforma il primo workout intenso della settimana in easy
    for (const day of newPlan) {
      if (['TEMPO', 'VO2', 'LUNGO'].includes(day.workout?.intensity)) {
        day.workout = {
          title: 'Recupero attivo',
          detail: 'Cambio piano: serve recupero. Easy ' + (day.workout.distance ? Math.round(day.workout.distance * 0.6) + 'km' : '4km'),
          distance: day.workout.distance ? day.workout.distance * 0.6 : 4,
          duration: Math.round((day.workout.duration || 30) * 0.6),
          pace: '6:10',
          intensity: 'EASY',
          modified: true,
        };
        break;
      }
    }
  } else if (missedCount >= 2) {
    severity = 'warn';
    changes.push({
      day: 'settimana',
      type: 'volume_drop',
      reason: `Hai saltato ${missedCount} sessioni la settimana scorsa. Riduco il volume di questa settimana del 20%.`,
    });
    for (const day of newPlan) {
      if (day.workout?.distance > 0) {
        day.workout = { ...day.workout, distance: day.workout.distance * 0.8, modified: true };
      }
    }
  } else if (last.tsb > 15 && daysToRace > 14) {
    severity = 'info';
    changes.push({
      day: 'settimana',
      type: 'add_quality',
      reason: `Forma fresca (TSB +${Math.round(last.tsb)}) e ${daysToRace}gg alla gara — è il momento di stimolare. Confermo qualità del piano.`,
    });
  }

  // 4. Vicino alla gara: priorità freschezza
  if (daysToRace <= 10 && daysToRace > 0 && last.atl > last.ctl * 1.1) {
    if (severity !== 'critical') severity = 'warn';
    changes.push({
      day: 'taper',
      type: 'taper_emphasis',
      reason: `${daysToRace}gg alla gara con fatica acuta alta — il taper deve essere rigoroso. Niente esperimenti.`,
    });
  }

  let summary = '';
  if (changes.length === 0) summary = 'Piano confermato — nessun aggiustamento necessario.';
  else if (severity === 'critical') summary = 'Piano ricalibrato per recupero urgente.';
  else if (severity === 'warn') summary = 'Piano aggiustato in base ai tuoi ultimi giorni.';
  else summary = 'Piccoli aggiustamenti al piano della settimana.';

  return {
    plan: newPlan,
    changes,
    summary,
    severity,
    metrics: { missedCount, partialCount, tsb: last.tsb, daysToRace },
    timestamp: new Date().toISOString(),
  };
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
function generateTodayWorkout(loadHistory, raceDateStr, opts = {}) {
  const last = loadHistory[loadHistory.length - 1] || { tsb: 0, ctl: 30, atl: 30 };
  const today = new Date();
  const race = raceDateStr ? new Date(raceDateStr) : null;
  const daysToRace = race && !isNaN(race) ? Math.ceil((race - today) / 86400000) : null;
  const dow = today.getDay();

  // ─── Passi derivati dai PB reali (VDOT-based) ─────────────────────────────
  // opts.pbs = { '5k': {seconds, distanceMeters}, ... } passati da home-v2
  const pbs = opts.pbs || {};
  let racePaceSec = 335;     // fallback 5:35/km
  let easyPaceSec = 390;
  let tempoPaceSec = 320;
  let vo2PaceSec = 280;

  // Se abbiamo VDOT, deriviamo i passi
  let vdot = null;
  for (const k of ['10k','21k','5k']) {
    const pb = pbs[k];
    if (pb && pb.seconds && pb.distanceMeters) {
      const v = calculateVDOT(pb.distanceMeters, pb.seconds);
      if (v && (!vdot || v > vdot)) vdot = v;
    }
  }
  if (vdot) {
    // Stime passi da VDOT (formula Daniels semplificata)
    racePaceSec  = Math.round(predictTimeFromVDOT(vdot, 21097) / 21.097);
    tempoPaceSec = Math.round(racePaceSec - 15);  // tempo ~ 5-15s/km più veloce di gara mezza
    vo2PaceSec   = Math.round(racePaceSec - 60);
    easyPaceSec  = Math.round(racePaceSec + 50);
  }
  const fmt = (s) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;

  // ─── Volume settimanale già fatto (per sapere se "ho già macinato") ───────
  const weekKm = (opts.trainingData || []).filter(a => {
    const d = new Date(a.date);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0,0,0,0);
    return d >= monday;
  }).reduce((s, a) => s + (a.distance_km || 0), 0);

  const ctl = last.ctl || 30;
  const targetWeeklyKm = Math.max(20, Math.round(ctl * 1.3));
  const remainingKm = Math.max(0, targetWeeklyKm - weekKm);

  // ─── 1. Settimana di gara (taper) ────────────────────────────────────────
  if (daysToRace !== null && daysToRace <= 7 && daysToRace >= 0) {
    if (daysToRace === 0)  return { title:'🏁 GARA', detail:`21.097 km · target ${fmt(racePaceSec)}/km · ${vdot?'VDOT '+vdot:''}. Buona gara!`, distance:21.1, duration:Math.round(21.1*racePaceSec/60), pace:fmt(racePaceSec), intensity:'GARA', why:'Giorno gara' };
    if (daysToRace === 1)  return { title:'Riposo + attivazione', detail:`10\' camminata + 4× allunghi 80m a ${fmt(vo2PaceSec)}/km. Idratazione, sonno.`, distance:1.5, duration:20, pace:'CAM', intensity:'PRE-GARA', why:'Vigilia: solo attivazione neuromuscolare' };
    if (daysToRace === 2)  return { title:'Shake-out 4km', detail:`4 km easy a ${fmt(easyPaceSec)}/km + 3× 100m allunghi. Carbo-load 7 g/kg.`, distance:4, duration:Math.round(4*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:'-2 gg: gambe pronte, carbo' };
    if (daysToRace === 3)  return { title:'Riposo totale', detail:'Giorno OFF. Mobilità leggera, sonno, idratazione.', distance:0, duration:0, pace:'—', intensity:'OFF', why:'-3 gg: recupero finale' };
    if (daysToRace === 4)  return { title:'Stimolo gara', detail:`2km wu + 4 km a ${fmt(racePaceSec)}/km (passo gara) + 1km cd`, distance:7, duration:Math.round(7*racePaceSec/60+10), pace:fmt(racePaceSec), intensity:'TEMPO', why:'-4 gg: ultima rifinitura ritmo gara' };
    if (daysToRace === 5)  return { title:'Easy 5km', detail:`Corsa molto facile a ${fmt(easyPaceSec)}/km. Gambe sciolte.`, distance:5, duration:Math.round(5*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:'-5 gg: scarico volume' };
    if (daysToRace === 6)  return { title:'Easy 6km', detail:`Ritmo conversazionale ${fmt(easyPaceSec)}/km, niente sforzo.`, distance:6, duration:Math.round(6*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:'-6 gg: mantieni mobilità aerobica' };
    if (daysToRace === 7)  return { title:'Ultimo lungo light 10km', detail:`Lungo ridotto a ${fmt(easyPaceSec)}/km. Niente progressioni.`, distance:10, duration:Math.round(10*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'LUNGO', why:'-7 gg: ultimo lungo del taper, volume ridotto' };
  }

  // ─── 2. Forma critica: stop o recupero ───────────────────────────────────
  if (last.tsb < -30) return { title:'STOP carico', detail:'Forma in deficit estremo. Riposo totale + sonno + idratazione. Niente corsa oggi.', distance:0, duration:0, pace:'—', intensity:'OFF', why:`TSB ${Math.round(last.tsb)}: rischio sovraccarico` };
  if (last.tsb < -20) return { title:'Recupero attivo', detail:'30\' camminata o jog molto lento. Mobilità, foam roller.', distance:3, duration:30, pace:fmt(easyPaceSec+30), intensity:'RECUP', why:`TSB ${Math.round(last.tsb)}: serve scarico` };

  // ─── 3. Quota settimanale già raggiunta ──────────────────────────────────
  if (weekKm >= targetWeeklyKm * 1.1) {
    return { title:'Easy 5km opzionale', detail:`Hai già fatto ${weekKm.toFixed(1)} km questa settimana (target ${targetWeeklyKm}). Riposo o jog leggero.`, distance:5, duration:Math.round(5*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:`Volume settimanale superato (${weekKm.toFixed(0)}/${targetWeeklyKm} km)` };
  }

  // ─── 4. Pattern settimanale modulato per forma e quota residua ──────────
  // Decisione qualità: solo se TSB ≥ -10 e abbiamo fatto meno del 60% del target
  const canQuality = last.tsb >= -10 && weekKm < targetWeeklyKm * 0.7;

  if (dow === 0) {
    const longKm = Math.min(Math.max(8, Math.round(remainingKm * 0.55)), 22);
    return { title:`Lungo ${longKm}km`, detail:`A ${fmt(easyPaceSec)}/km. Ultimi 3km in progressione.`, distance:longKm, duration:Math.round(longKm*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'LUNGO', why:`Lungo settimanale, ${longKm}km calcolato su CTL ${Math.round(ctl)}` };
  }
  if (dow === 1) return { title:'Riposo', detail:'Giorno OFF dopo il lungo. Mobilità, stretching.', distance:0, duration:0, pace:'—', intensity:'OFF', why:'Recupero post-lungo' };

  if (dow === 2 && canQuality) {
    return { title:'Tempo run', detail:`2km wu + 5km a ${fmt(tempoPaceSec)}/km + 1km cd`, distance:8, duration:Math.round(8*tempoPaceSec/60+5), pace:fmt(tempoPaceSec), intensity:'TEMPO', why:`Qualità: TSB ${Math.round(last.tsb)} ok, settimana al ${Math.round(weekKm/targetWeeklyKm*100)}%` };
  }
  if (dow === 3) return { title:'Easy + allunghi', detail:`6km a ${fmt(easyPaceSec)}/km + 6× 100m allunghi`, distance:6, duration:Math.round(6*easyPaceSec/60+5), pace:fmt(easyPaceSec), intensity:'EASY', why:'Aerobic + skill velocità' };

  if (dow === 4 && canQuality) {
    return { title:'Intervalli VO2', detail:`2km wu + 6× 800m a ${fmt(vo2PaceSec)}/km r=2\' + 1km cd`, distance:9, duration:50, pace:fmt(vo2PaceSec), intensity:'VO2', why:`Qualità: TSB ${Math.round(last.tsb)}, VDOT ${vdot||'—'}` };
  }
  if (dow === 5) return { title:'Easy o riposo', detail:`5 km a ${fmt(easyPaceSec)}/km, oppure OFF se stanco.`, distance:5, duration:Math.round(5*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:'Recupero attivo' };
  if (dow === 6) return { title:'Pre-lungo', detail:`4 km a ${fmt(easyPaceSec)}/km + 3 allunghi. Domani lungo.`, distance:4, duration:Math.round(4*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:'Attivazione pre-lungo' };

  // Fallback: easy
  const easyKm = Math.min(8, Math.max(4, Math.round(remainingKm / 3)));
  return { title:`Easy ${easyKm}km`, detail:`Corsa facile a ${fmt(easyPaceSec)}/km.`, distance:easyKm, duration:Math.round(easyKm*easyPaceSec/60), pace:fmt(easyPaceSec), intensity:'EASY', why:`Recupero qualità non indicata: TSB ${Math.round(last.tsb)}, settimana ${weekKm.toFixed(0)}/${targetWeeklyKm}km` };
}

// ─── computePBsFromActivities: estrae i best effort 5K/10K/21K dalle attività ─
// Restituisce { '5k': {time, seconds, pace, date}, '10k': ..., '21k': ... }
// fallback = i PB hardcoded da usare se non si trovano
function computePBsFromActivities(activities, fallback) {
  if (!Array.isArray(activities) || activities.length === 0) return fallback;

  // Cerchiamo l'attività con miglior best_efforts oppure best pace su distanze vicine
  const targets = [
    { key: '5k',  distMin: 4900, distMax: 5300, distKm: 5,      label: '5K' },
    { key: '10k', distMin: 9700, distMax: 10500, distKm: 10,    label: '10K' },
    { key: '21k', distMin: 20800, distMax: 21500, distKm: 21.097, label: '21K' },
  ];

  const out = {};
  for (const t of targets) {
    // Strava: best_efforts contiene segmenti specifici (Strava Premium/automatic)
    let bestSec = Infinity;
    let bestActDate = null;

    for (const act of activities) {
      // 1) Cerca dentro best_efforts se presente
      if (Array.isArray(act.best_efforts)) {
        const eff = act.best_efforts.find(e => Math.abs(e.distance - t.distKm * 1000) < 50);
        if (eff && eff.elapsed_time && eff.elapsed_time < bestSec) {
          bestSec = eff.elapsed_time;
          bestActDate = act.start_date;
        }
      }
      // 2) Match su attività intera con distanza in range
      const dist = act.distance || 0;
      if (dist >= t.distMin && dist <= t.distMax) {
        const time = act.moving_time || act.elapsed_time;
        if (time && time < bestSec) {
          bestSec = time;
          bestActDate = act.start_date;
        }
      }
    }

    if (bestSec === Infinity || !isFinite(bestSec)) {
      out[t.key] = fallback?.[t.key] || null;
    } else {
      const m = Math.floor(bestSec / 60);
      const s = Math.round(bestSec % 60);
      const h = Math.floor(bestSec / 3600);
      const time = h > 0
        ? `${h}:${String(m % 60).padStart(2,'0')}:${String(s).padStart(2,'0')}`
        : `${m}:${String(s).padStart(2,'0')}`;
      const paceSec = Math.round(bestSec / t.distKm);
      const pm = Math.floor(paceSec / 60);
      const ps = paceSec % 60;
      const date = bestActDate ? new Date(bestActDate).toLocaleDateString('it-IT', { day:'numeric', month:'short', year:'numeric' }) : '—';
      const daysAgo = bestActDate
        ? Math.max(1, Math.round((Date.now() - new Date(bestActDate).getTime()) / 86400000))
        : 30;
      out[t.key] = {
        distance: t.distKm,
        time,
        seconds: bestSec,
        pace: `${pm}:${String(ps).padStart(2,'0')}/km`,
        date,
        daysAgo,
        fromStrava: true,
      };
    }
  }
  return out;
}

// ─── computeWeeklyAverage: km medi/sett. ultime N settimane (escludendo l'attuale) ─
function computeWeeklyAverage(trainingData, weeks = 4) {
  if (!Array.isArray(trainingData) || trainingData.length === 0) {
    return { avgKm: 0, avgRuns: 0, weeks: 0 };
  }
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0,0,0,0);

  const buckets = []; // [{ km, runs }, ...] ultime N settimane (esclusa quella corrente)
  for (let w = 1; w <= weeks; w++) {
    const start = new Date(monday); start.setDate(monday.getDate() - w * 7);
    const end = new Date(monday); end.setDate(monday.getDate() - (w - 1) * 7);
    const inWeek = trainingData.filter(a => {
      const d = new Date(a.date);
      return d >= start && d < end;
    });
    if (inWeek.length > 0) {
      buckets.push({
        km: inWeek.reduce((s, a) => s + (a.distance_km || 0), 0),
        runs: inWeek.length,
      });
    }
  }
  if (buckets.length === 0) return { avgKm: 0, avgRuns: 0, weeks: 0 };
  const avgKm = buckets.reduce((s, b) => s + b.km, 0) / buckets.length;
  const avgRuns = buckets.reduce((s, b) => s + b.runs, 0) / buckets.length;
  return { avgKm, avgRuns, weeks: buckets.length };
}

// ─── Run Diary: analisi post-corsa ────────────────────────────────────────────
// Prende un'attività Strava + (opzionale) laps/streams e restituisce un dict
// completo con metriche, insights e classificazione del workout.
function analyzeRun(activity, opts = {}) {
  if (!activity) return null;
  const distM = activity.distance || 0;
  const distKm = distM / 1000;
  const movTime = activity.moving_time || activity.elapsed_time || 0;
  const elapsed = activity.elapsed_time || movTime;
  const avgHr = activity.average_heartrate || null;
  const maxHr = activity.max_heartrate || null;
  const elev = activity.total_elevation_gain || 0;
  const avgPaceSec = movTime && distKm ? movTime / distKm : null;
  const avgPaceStr = avgPaceSec ? formatPace(avgPaceSec) : '—';
  const userMaxHr = opts.maxHr || estimateMaxHR(opts.age || 42);
  const intensity = avgHr ? avgHr / userMaxHr : null;
  const elevPerKm = distKm > 0 ? elev / distKm : 0;
  const stoppedTime = elapsed - movTime;

  // Tipo di workout dedotto
  let inferredType = 'easy';
  let intensityLabel = 'Facile';
  if (intensity) {
    if (intensity >= 0.92) { inferredType = 'vo2'; intensityLabel = 'Soglia/VO2'; }
    else if (intensity >= 0.85) { inferredType = 'tempo'; intensityLabel = 'Tempo'; }
    else if (intensity >= 0.78) { inferredType = 'progressivo'; intensityLabel = 'Medio'; }
    else if (distKm >= 14) { inferredType = 'long'; intensityLabel = 'Lungo lento'; }
    else { inferredType = 'easy'; intensityLabel = 'Facile'; }
  } else if (distKm >= 14) { inferredType = 'long'; intensityLabel = 'Lungo'; }

  // Decoupling stimato dai laps (Pa:HR drift sec/half)
  let decoupling = null;
  if (opts.laps && opts.laps.length >= 4) {
    const half = Math.floor(opts.laps.length / 2);
    const firstHalf = opts.laps.slice(0, half);
    const secondHalf = opts.laps.slice(half, half * 2);
    const ef = (laps) => {
      const totalSec = laps.reduce((s, l) => s + (l.moving_time || 0), 0);
      const totalDist = laps.reduce((s, l) => s + (l.distance || 0), 0);
      const avgHrs = laps.filter(l => l.average_heartrate).map(l => l.average_heartrate);
      const avgHrLap = avgHrs.length ? avgHrs.reduce((a,b)=>a+b,0) / avgHrs.length : null;
      if (!totalDist || !avgHrLap) return null;
      const paceSec = totalSec / (totalDist/1000);
      return { paceSec, hr: avgHrLap, ef: (1000 / paceSec) / avgHrLap };
    };
    const a = ef(firstHalf), b = ef(secondHalf);
    if (a && b) {
      decoupling = { firstHalfEf: a.ef, secondHalfEf: b.ef, drift: ((a.ef - b.ef) / a.ef) * 100 };
    }
  }

  // Lap analysis: detect intervals
  let lapPattern = null;
  if (opts.laps && opts.laps.length >= 3) {
    const paces = opts.laps.map(l => (l.moving_time && l.distance) ? l.moving_time / (l.distance/1000) : null).filter(Boolean);
    if (paces.length >= 3) {
      const sorted = [...paces].sort((a,b)=>a-b);
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      const spread = p75 - p25;
      if (spread > 30) lapPattern = 'intervalli';
      else if (paces[paces.length-1] < paces[0] - 10) lapPattern = 'progressivo';
      else lapPattern = 'costante';
    }
  }

  // Insights generati
  const insights = [];
  if (decoupling) {
    if (decoupling.drift > 8) insights.push({ tag: 'fatica', text: `Decoupling alto (+${decoupling.drift.toFixed(1)}%) — la FC è salita rispetto al passo nella seconda metà. Segnale di stanchezza aerobica.` });
    else if (decoupling.drift < 3) insights.push({ tag: 'forma', text: `Decoupling basso (${decoupling.drift.toFixed(1)}%) — sei rimasto efficiente fino in fondo, buon segnale.` });
  }
  if (lapPattern === 'progressivo' && inferredType !== 'easy') insights.push({ tag: 'pacing', text: 'Hai chiuso più forte di come hai aperto — pacing intelligente.' });
  if (lapPattern === 'intervalli') insights.push({ tag: 'workout', text: `Sessione strutturata con intervalli rilevati (${opts.laps.length} lap).` });
  if (elevPerKm > 30) insights.push({ tag: 'terreno', text: `Salita corposa: ${Math.round(elevPerKm)}m/km. La FC va letta tenendo conto del dislivello.` });
  if (avgHr && intensity && intensity > 0.88 && distKm > 14) insights.push({ tag: 'attenzione', text: 'Lungo a intensità alta — assicurati di recuperare 36–48h prima del prossimo lavoro intenso.' });
  if (stoppedTime > 60 && distKm < 8) insights.push({ tag: 'note', text: `${Math.round(stoppedTime/60)} min di pause — semafori, fermate o ricarica?` });
  if (insights.length === 0) insights.push({ tag: 'ok', text: 'Corsa pulita, niente di anomalo nei numeri.' });

  // Verdetto qualità (0-100)
  let quality = 70;
  if (decoupling) quality += decoupling.drift < 5 ? 10 : decoupling.drift > 10 ? -15 : 0;
  if (lapPattern === 'progressivo') quality += 8;
  if (inferredType === 'easy' && intensity > 0.82) quality -= 10; // troppo veloce per essere easy
  quality = Math.max(0, Math.min(100, quality));

  return {
    id: activity.id,
    date: activity.start_date_local || activity.start_date,
    name: activity.name,
    distKm: parseFloat(distKm.toFixed(2)),
    movTime, elapsed, stoppedTime,
    avgPaceSec, avgPaceStr,
    avgHr, maxHr,
    elev, elevPerKm: Math.round(elevPerKm),
    intensity: intensity ? parseFloat(intensity.toFixed(3)) : null,
    intensityLabel,
    inferredType,
    decoupling,
    lapPattern,
    insights,
    quality,
  };
}

function formatPace(sec) {
  if (!sec || !isFinite(sec)) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2,'0')}/km`;
}

// Export
Object.assign(window, {
  estimateMaxHR, getHRZones,
  calculateTSS, calculateTrainingLoad,
  calculateVDOT, predictTimeFromVDOT, predictRaceTime,
  calculateDecoupling, detectOvertraining,
  getFormLabel, generateWorkout, generateTodayWorkout, suggestPlanAdjustment,
  generateWeekPlan, compareActualVsPlanned, recalibratePlan,
  paceStringToSec, activitiesToTrainingData,
  computePBsFromActivities, computeWeeklyAverage,
  analyzeRun, formatPace,
});
