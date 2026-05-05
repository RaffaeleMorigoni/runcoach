
// js/shared.jsx — shared data, constants, and base components
const { useState, useEffect, useRef } = React;

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#06060E',
  card:      '#0D0D1C',
  card2:     '#111126',
  border:    'rgba(255,255,255,0.07)',
  border2:   'rgba(255,255,255,0.12)',
  orange:    '#FF4422',
  orangeDim: 'rgba(255,68,34,0.15)',
  orangeMid: 'rgba(255,68,34,0.25)',
  teal:      '#00CFA8',
  tealDim:   'rgba(0,207,168,0.14)',
  blue:      '#4D9EFF',
  blueDim:   'rgba(77,158,255,0.14)',
  purple:    '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.14)',
  yellow:    '#F6C94E',
  text:      '#EEEEF8',
  sub:       'rgba(238,238,248,0.55)',
  faint:     'rgba(238,238,248,0.25)',
  ghost:     'rgba(238,238,248,0.1)',
};

// ─── Mock data ────────────────────────────────────────────────────────────────
// ─── Date dinamiche ───────────────────────────────────────────────────────────
const RACE_DATE_ISO = '2026-05-03'; // Mezza Maratona di Lucca
const TRAINING_START_ISO = '2026-02-09'; // 12 settimane prima = inizio piano

function _today() {
  // Permette override per debug via ?fakeDate=YYYY-MM-DD
  try {
    const q = new URLSearchParams(location.search).get('fakeDate');
    if (q) return new Date(q + 'T12:00:00');
  } catch (e) {}
  const d = new Date();
  d.setHours(12, 0, 0, 0); // normalizza mezzogiorno per evitare DST
  return d;
}
function _daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86400000);
}
function _formatItDate(d) {
  const months = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function _formatItDateShort(d) {
  const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
function _weekdayIt(d) {
  return ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][d.getDay()];
}
function _weekdayItShort(d) {
  return ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d.getDay()];
}

const TODAY = _today();
const RACE_DATE = new Date(RACE_DATE_ISO + 'T12:00:00');
const TRAINING_START = new Date(TRAINING_START_ISO + 'T12:00:00');
const DAYS_TO_RACE = Math.max(0, _daysBetween(TODAY, RACE_DATE));
const DAYS_FROM_START = Math.max(0, _daysBetween(TRAINING_START, TODAY));
const CURRENT_WEEK = Math.min(12, Math.max(1, Math.floor(DAYS_FROM_START / 7) + 1));

// Determina fase del piano in base a settimana corrente
function _currentPhase(week) {
  if (week <= 3) return 'Costruzione Base';
  if (week <= 6) return 'Sviluppo Aerobico';
  if (week <= 9) return 'Lavoro a Soglia';
  if (week <= 11) return 'Prep. Gara';
  return 'Scarico (Taper)';
}
const CURRENT_PHASE = _currentPhase(CURRENT_WEEK);
// Quando siamo negli ultimi 14 giorni, forziamo taper
const IS_TAPER = DAYS_TO_RACE <= 14;
const PHASE_LABEL = IS_TAPER ? 'Scarico (Taper)' : CURRENT_PHASE;

const USER = {
  name: 'Sarah',
  age: 42,
  level: 'Intermedio',
  goal: 'Sotto 1:58 a Lucca',
  raceDate: _formatItDate(RACE_DATE),
  raceDateISO: RACE_DATE_ISO,
  raceName: 'Mezza Maratona di Lucca',
  raceDistance: 21.097, // km
  raceTargetTime: '1:58:00',
  raceTargetPace: '5:35/km',
  weeksTotal: 12,
  currentWeek: CURRENT_WEEK,
  daysToRace: DAYS_TO_RACE,
  todayLabel: _weekdayIt(TODAY),
  todayDate: _formatItDateShort(TODAY),
  currentPhase: PHASE_LABEL,
  isTaper: IS_TAPER,
  shoes: 'New Balance FuelCell Rebel v5',
  weeklyKm: 25,
  longestRun: 18,
  currentEasyPace: '6:30/km',
  garminConnected: true,
  garminDevice: 'Forerunner 55',
  garminSyncAgo: '2h fa',
};

// ─── Profilo completo (integrato da piano ChatGPT) ────────────────────────────
const RACE_STRATEGY = {
  target: '1:58-2:00',
  strategy: 'Negative split',
  phases: [
    { km:'0-5',   pace:'5:45-5:50', note:'Partenza controllata — NON farti trascinare' },
    { km:'6-15',  pace:'5:38-5:42', note:'Ritmo gara stabile, respirazione regolare' },
    { km:'16-18', pace:'5:35',      note:'Inizia fatica, mantieni controllo' },
    { km:'19-21', pace:'5:25-5:30', note:'Chiusura forte — tutto quello che hai' },
  ],
  shoes: 'New Balance FuelCell Rebel v5',
};

const GEL_PLAN = [
  { when:'Pre-gara (45min)',  type:'NamedSport Amino Gel', note:'Lento — amminoacidi' },
  { when:'Km 6',              type:'Enervit Liquid Gel',   note:'Rapido — con acqua' },
  { when:'Km 12',              type:'Enervit Liquid Gel',   note:'Rapido — con acqua' },
  { when:'Km 17 (opzionale)',  type:'½ Enervit',            note:'Solo se serve spinta' },
];

const LONG_RUN_LAST = {
  distance: 17.88, time: '1:56:44', pace: '6:32/km', avgHR: 140,
  finalKm: ['5:34','5:19','5:26'], // progressione finale
  note: 'Chiusura forte in progressione — segnale ottimo per Lucca',
};
// seconds = totale in secondi; ricorda: 23:50 = 23*60+50 = 1430
const PB = {
  '5k':  { distance: 5,      time: '23:50',    seconds: 1430, pace: '4:46/km', date: '15 Mar 2026' },
  '10k': { distance: 10,     time: '51:03',    seconds: 3063, pace: '5:06/km', date: '22 Feb 2026' },
  '21k': { distance: 21.097, time: '2:03:00',  seconds: 7380, pace: '5:50/km', date: '10 Nov 2025' },
};

// ─── Formula di Riegel: T2 = T1 * (D2/D1)^1.06 ────────────────────────────────
// Stima tempo su distanza D2 dato un PB T1 su D1
function riegelPredict(pbSeconds, pbDistKm, targetDistKm, exp = 1.06) {
  return Math.round(pbSeconds * Math.pow(targetDistKm / pbDistKm, exp));
}
function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function fmtPace(sec, distKm) {
  const pacePerKm = Math.round(sec / distKm);
  const m = Math.floor(pacePerKm / 60);
  const s = pacePerKm % 60;
  return `${m}:${String(s).padStart(2,'0')}/km`;
}

// Stime per la mezza usando i PB più recenti (prende il migliore tra 5k e 10k)
const RACE_ESTIMATES = (() => {
  // Usa 10k come predittore più affidabile per la mezza
  const from10k = riegelPredict(PB['10k'].seconds, 10, 21.097);
  const from5k  = riegelPredict(PB['5k'].seconds,  5,  21.097);
  const currentPB = PB['21k'].seconds;
  // Best estimate = media pesata 10k (peso 2) + PB attuale (peso 1)
  const best = Math.round((from10k * 2 + currentPB) / 3);
  return {
    target:     { time: '1:58:00', seconds: 7080, pace: '5:35/km' },
    conservative: { time: fmtTime(currentPB), seconds: currentPB, pace: fmtPace(currentPB, 21.097), source: 'PB attuale' },
    realistic:  { time: fmtTime(best), seconds: best, pace: fmtPace(best, 21.097), source: 'stima Riegel (10k)' },
    optimistic: { time: fmtTime(from5k), seconds: from5k, pace: fmtPace(from5k, 21.097), source: 'stima dal 5k' },
  };
})();

const RECOVERY_DATA = {
  score: 78,
  sleep: 7.2,
  sleepQuality: 'Buono',
  hrv: 52,
  restingHR: 58,
  fatigue: 'Moderata',
  soreness: 'Bassa',
  recommendation: 'go_as_planned',
  trainingLoad: 'Moderato',
  loadTrend: 'stabile',
};

// ─── Data/ora dinamiche ─────────────────────────────────────────────────────
const DAYS_IT = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const DAYS_IT_SHORT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function getToday() {
  const d = new Date();
  return {
    date: d,
    dayIdx: d.getDay(),                      // 0=Dom ... 6=Sab
    dayName: DAYS_IT[d.getDay()],            // "Giovedì"
    dayShort: DAYS_IT_SHORT[d.getDay()],     // "Gio"
    dateLabel: `${DAYS_IT[d.getDay()]}, ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`,
    dateShort: `${d.getDate()} ${MONTHS_IT[d.getMonth()]}`,
  };
}

function daysUntil(targetDateStr) {
  // targetDateStr = 'YYYY-MM-DD' o Date
  const target = typeof targetDateStr === 'string' ? new Date(targetDateStr) : targetDateStr;
  const now = new Date();
  target.setHours(0,0,0,0);
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.max(0, Math.round((target - t) / (1000*60*60*24)));
}

// Workout per ogni giorno della settimana (0=Dom, 1=Lun, ..., 6=Sab)
// Piano taper 11 giorni: riposo/facile/lungo corto
const WORKOUTS_BY_DAY = {
  0: { // Domenica - lungo (se non fatto sabato)
    id: 'w_sun', type: 'long', title: 'Lungo Lento di Taper',
    subtitle: 'Ultimo lungo di preparazione — goditi il ritmo',
    distance: 14, duration: 85, targetPace: '6:00–6:30 /km',
    hrZone: 'Zona 2', rpe: '5/10',
    warmup:  { label: 'Riscaldamento', duration: '10 min', desc: 'Cammino veloce + jogging', pace: '6:45 /km', zone: 'Zona 1' },
    mainSet: { label: 'Lungo aerobico', duration: '65 min', desc: 'Ritmo costante, respirazione regolare', pace: '6:00–6:30 /km', zone: 'Zona 2' },
    cooldown:{ label: 'Defaticamento', duration: '10 min', desc: 'Jogging lento + cammino + stretching', pace: '6:45+ /km', zone: 'Zona 1' },
    coachNote: "Ultimo lungo prima della gara. Non fare eroismi — il lavoro è fatto. Gambe sciolte, respiro controllato.",
    avoid: ['Spingere il ritmo', 'Saltare la colazione', 'Correre a stomaco vuoto'],
    altEasy: { title: 'Versione Ridotta', desc: '10 km facili se stanco', total: '60 min' },
  },
  1: { // Lunedì - riposo
    id: 'w_mon', type: 'rest', title: 'Giorno di Riposo',
    subtitle: 'Il recupero è allenamento',
    distance: 0, duration: 0, targetPace: '—', hrZone: '—', rpe: '0/10',
    coachNote: "Oggi riposo totale. Dormi, mangia bene, idratati. Il corpo assorbe gli adattamenti nel riposo.",
    avoid: ['Correre', 'Allenamenti intensi', 'Sedentarietà totale — cammina pure'],
  },
  2: { // Martedì - easy
    id: 'w_tue', type: 'easy', title: 'Corsa Facile di Scarico',
    subtitle: 'Mantieni le gambe sveglie senza affaticarle',
    distance: 6.0, duration: 38, targetPace: '6:00–6:30 /km',
    hrZone: 'Zona 1–2', rpe: '4/10',
    warmup:  { label: 'Inizio', duration: '5 min', desc: 'Cammino veloce poi jogging leggero', pace: '7:00+ /km', zone: 'Zona 1' },
    mainSet: { label: 'Corsa facile', duration: '28 min', desc: 'Ritmo completamente conversazionale', pace: '6:00–6:30 /km', zone: 'Zona 2' },
    cooldown:{ label: 'Defaticamento', duration: '5 min', desc: 'Cammino finale + stretching leggero', pace: 'passo', zone: 'Zona 1' },
    coachNote: "Settimana di scarico: corsa solo per tenere le gambe attive. NON per condizione. Vai lento.",
    avoid: ['Andare troppo forte', 'Aggiungere km extra', 'Stretching intenso'],
    altEasy: { title: 'Versione Ridotta', desc: '20 min di jogging leggero', total: '20 min' },
  },
  3: { // Mercoledì - riposo o forza
    id: 'w_wed', type: 'rest', title: 'Riposo Attivo',
    subtitle: 'Cammino leggero o mobilità',
    distance: 0, duration: 20, targetPace: '—', hrZone: 'Zona 1', rpe: '2/10',
    coachNote: "Riposo attivo: 20 min di cammino, mobilità anche/caviglie. No corsa.",
    avoid: ['Correre anche se ti senti bene', 'Carichi pesanti'],
  },
  4: { // Giovedì - tempo corto di taper
    id: 'w_thu', type: 'tempo', title: 'Richiamo Ritmo Gara',
    subtitle: 'Breve richiamo per risvegliare le gambe',
    distance: 6.5, duration: 42, targetPace: '5:35 /km',
    hrZone: 'Zona 3–4', rpe: '7/10',
    warmup:  { label: 'Riscaldamento', duration: '12 min', desc: 'Jogging + 4 allunghi 80m', pace: '6:20 /km', zone: 'Zona 1–2' },
    mainSet: { label: '3 km a ritmo gara', duration: '17 min', desc: '3 km continui @ ritmo mezza (5:35)', pace: '5:35 /km', zone: 'Zona 3–4' },
    cooldown:{ label: 'Defaticamento', duration: '13 min', desc: 'Jogging lento + stretching', pace: '6:45 /km', zone: 'Zona 1' },
    coachNote: "Unico richiamo di ritmo prima della gara. Breve e specifico: solo 3 km al ritmo target. Non di più, non di meno.",
    avoid: ['Fare più di 3 km a ritmo', 'Spingere oltre', 'Saltare il defaticamento'],
    altEasy: { title: 'Se stanco', desc: '5 km facili + 4 allunghi', total: '35 min' },
  },
  5: { // Venerdì - riposo
    id: 'w_fri', type: 'rest', title: 'Giorno di Riposo',
    subtitle: 'Ricarica muscolare',
    distance: 0, duration: 0, targetPace: '—', hrZone: '—', rpe: '0/10',
    coachNote: "Riposo totale. Idratati bene e dormi 8h.",
    avoid: ['Attività intense', 'Alcool'],
  },
  6: { // Sabato - attivazione pre-gara o lungo
    id: 'w_sat', type: 'easy', title: 'Attivazione Pre-Gara',
    subtitle: 'Gambe sveglie, ritmo leggero — nessuno sforzo',
    distance: 5, duration: 30, targetPace: '6:10–6:40 /km',
    hrZone: 'Zona 1–2', rpe: '3/10',
    warmup:  { label: 'Inizio', duration: '5 min', desc: 'Cammino + jogging molto lento', pace: '7:00 /km', zone: 'Zona 1' },
    mainSet: { label: 'Facile', duration: '20 min', desc: 'Ritmo super conversazionale + 3-4 allunghi finali', pace: '6:10–6:40 /km', zone: 'Zona 2' },
    cooldown:{ label: 'Defaticamento', duration: '5 min', desc: 'Cammino + mobilità leggera', pace: 'passo', zone: 'Zona 1' },
    coachNote: "Sveglia le gambe, non stancarle. Se hai il lungo al sabato, fallo di sabato mattina e sposta l'attivazione.",
    avoid: ['Andare forte', 'Saltare gli allunghi — servono'],
    altEasy: { title: 'Solo allunghi', desc: '15 min jog + 4 allunghi', total: '20 min' },
  },
};

function getTodayWorkout() {
  const t = getToday();
  return { ...WORKOUTS_BY_DAY[t.dayIdx], day: t.dayName, dayShort: t.dayShort };
}

// ─── Piano taper dinamico, ancorato alla DATA della gara ────────────────────
// Mappa giorni-prima-della-gara → workout
// 0 = giorno gara, 1 = giorno prima, ecc.
const TAPER_BY_DAYS_TO_RACE = {
  0:  { type:'long',   title:'🏁 Gara — Lucca 21k',     dist:21.097, key:true,  duration:118 },
  1:  { type:'rest',   title:'Riposo — pasta party',     dist:0,      key:false, duration:0  },
  2:  { type:'easy',   title:'Jogging 3km + 4 allunghi', dist:3,      key:false, duration:22 },
  3:  { type:'rest',   title:'Riposo',                   dist:0,      key:false, duration:0  },
  4:  { type:'tempo',  title:'Attivazione 4km + 4×100m', dist:4,      key:true,  duration:28 },
  5:  { type:'rest',   title:'Riposo',                   dist:0,      key:false, duration:0  },
  6:  { type:'easy',   title:'Sblocca-gambe 3km',        dist:3,      key:false, duration:22 },
  7:  { type:'easy',   title:'Corsa facile 5km',         dist:5,      key:false, duration:32 },
  8:  { type:'rest',   title:'Riposo',                   dist:0,      key:false, duration:0  },
  9:  { type:'tempo',  title:'Attivazione 5km + 3×1′',   dist:5,      key:true,  duration:35 },
  10: { type:'rest',   title:'Riposo',                   dist:0,      key:false, duration:0  },
  11: { type:'easy',   title:'Corsa Facile 6km',         dist:6,      key:false, duration:38 },
  12: { type:'rest',   title:'Riposo',                   dist:0,      key:false, duration:0  },
  13: { type:'long',   title:'Lungo leggero 10km',       dist:10,     key:true,  duration:66 },
  14: { type:'rest',   title:'Riposo',                   dist:0,      key:false, duration:0  },
};

// Per giorni > 14, fallback su pattern settimanale base
const PRE_TAPER_WEEK = {
  1: { type:'rest',  title:'Riposo',                 dist:0, key:false, duration:0  },
  2: { type:'easy',  title:'Corsa Facile 7km',       dist:7, key:false, duration:42 },
  3: { type:'rest',  title:'Riposo',                 dist:0, key:false, duration:0  },
  4: { type:'tempo', title:'Tempo 6km @ ritmo gara', dist:6, key:true,  duration:38 },
  5: { type:'rest',  title:'Riposo',                 dist:0, key:false, duration:0  },
  6: { type:'easy',  title:'Corsa Facile 5km',       dist:5, key:false, duration:32 },
  0: { type:'long',  title:'Lungo 14km',             dist:14, key:true, duration:88 },
};

function _workoutForDate(date) {
  const days = _daysBetween(date, RACE_DATE);
  if (days < 0) return null; // dopo la gara
  if (days <= 14) return TAPER_BY_DAYS_TO_RACE[days];
  return PRE_TAPER_WEEK[date.getDay()];
}

function _buildWeekSchedule() {
  // Costruisci la settimana corrente (Lun → Dom)
  const today = new Date(TODAY);
  const dow = today.getDay(); // 0=Dom
  const daysFromMonday = (dow + 6) % 7; // Lun=0
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);

  const labels = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const w = _workoutForDate(d) || { type:'rest', title:'—', dist:0, key:false, duration:0 };
    const diff = _daysBetween(today, d);
    let status = 'upcoming';
    if (diff < 0) status = 'done';
    else if (diff === 0) status = 'today';
    out.push({
      day: labels[i],
      date: d.getDate(),
      type: w.type,
      title: w.title,
      status,
      dist: w.dist,
      key: w.key,
      duration: w.duration,
      dow: d.getDay(),
    });
  }
  return out;
}

const WEEK_SCHEDULE = _buildWeekSchedule();

// ─── Workout di oggi, ancorato alla data della gara ────────────────────────
function _buildTodayWorkout() {
  const w = _workoutForDate(TODAY) || { type:'rest', title:'Riposo', dist:0, duration:0, key:false };
  const dayLabel = _weekdayIt(TODAY);
  const isRaceDay = DAYS_TO_RACE === 0;

  const presets = {
    rest: {
      id: 'w_rest', type:'rest', title: w.title,
      subtitle: 'Recupero attivo — lascia che il corpo si ricarichi',
      distance: 0, duration: 0, targetPace: '—', hrZone: 'Riposo', rpe: '0/10',
      warmup: null, mainSet: null, cooldown: null,
      coachNote: `Oggi è ${dayLabel} — giornata di riposo. Siamo a ${DAYS_TO_RACE} giorni da Lucca: il riposo è parte del piano, non una pausa. Cammina, idratati, dormi bene. Niente sport alternativi intensi.`,
      avoid: ['Corse "di compensazione"', 'Allenamenti intensi alternativi', 'Stare in piedi per ore'],
      altEasy: null,
    },
    easy: {
      id: 'w_easy', type:'easy', title: w.title,
      subtitle: 'Mantieni le gambe sveglie senza affaticarle',
      distance: w.dist, duration: w.duration, targetPace: '6:00–6:30 /km', hrZone: 'Zona 1–2', rpe: '4/10',
      warmup:  { label: 'Inizio', duration: '5 min', desc: 'Cammino veloce poi jogging leggero', pace: '7:00+ /km', zone: 'Zona 1' },
      mainSet: { label: 'Corsa facile', duration: `${Math.max(10, w.duration - 10)} min`, desc: 'Ritmo completamente conversazionale — devi poter cantare', pace: '6:00–6:30 /km', zone: 'Zona 2' },
      cooldown:{ label: 'Defaticamento', duration: '5 min', desc: 'Cammino finale + stretching leggero', pace: 'passo', zone: 'Zona 1' },
      coachNote: `${dayLabel} — a ${DAYS_TO_RACE} giorni dalla Mezza di Lucca. Questa corsa NON fa condizione, la conserva. Vai lento (6:30/km va benissimo), goditi il movimento. Se senti le gambe pesanti è normalissimo durante il taper.`,
      avoid: ['Andare troppo forte perché ti senti bene', 'Aggiungere km extra', 'Fare stretching intenso — solo leggero'],
      altEasy: { title: 'Versione Ridotta', desc: 'Solo 20 min di jogging leggero se ti senti stanca', total: '20 min' },
    },
    tempo: {
      id: 'w_tempo', type:'tempo', title: w.title,
      subtitle: 'Attivazione neuromuscolare — breve ma specifica',
      distance: w.dist, duration: w.duration, targetPace: '5:35 /km (blocchi)', hrZone: 'Zona 3', rpe: '6/10',
      warmup:  { label: 'Riscaldamento', duration: '10 min', desc: 'Jogging leggero + 4 allunghi di 50m', pace: '6:30 /km', zone: 'Zona 1–2' },
      mainSet: { label: 'Blocchi a ritmo gara', duration: `${Math.max(10, w.duration - 18)} min`, desc: 'Al passo gara (5:35/km), recupero 2 min camminando tra ogni prova', pace: '5:30–5:40 /km', zone: 'Zona 3' },
      cooldown:{ label: 'Defaticamento', duration: '8 min', desc: 'Jogging leggero + stretching', pace: '7:00 /km', zone: 'Zona 1' },
      coachNote: `${dayLabel} — attivazione nel taper di Lucca (gara fra ${DAYS_TO_RACE} giorni). Obiettivo: svegliare i muscoli e ricordare il ritmo gara. NON fare di più, anche se ti senti bene. Poche, brevi, precise.`,
      avoid: ['Spingere più forte del passo gara', 'Aumentare numero di ripetute', 'Ridurre i recuperi'],
      altEasy: { title: 'Se ti senti stanca', desc: 'Sostituisci con corsa facile 4km + 4 allunghi', total: '30 min' },
    },
    long: {
      id: 'w_long', type:'long', title: w.title,
      subtitle: isRaceDay ? 'Giorno gara! Fidati del piano' : 'Lungo del blocco',
      distance: w.dist, duration: w.duration,
      targetPace: isRaceDay ? '5:35 /km (gara)' : '6:10–6:30 /km',
      hrZone: isRaceDay ? 'Zona 3–4' : 'Zona 2–3',
      rpe: isRaceDay ? '9/10' : '5/10',
      warmup:  { label: 'Riscaldamento', duration: '10 min', desc: isRaceDay ? 'Routine pre-gara: mobilità + allunghi + attivazione' : 'Jogging progressivo', pace: '7:00 /km', zone: 'Zona 1' },
      mainSet: { label: isRaceDay ? 'GARA 21.097 km' : 'Lungo leggero', duration: `${w.duration} min`, desc: isRaceDay ? 'Parti controllata 5:45/km, stabile a 5:38/km da km 6, dai tutto da km 16' : 'Ritmo conversazionale costante', pace: isRaceDay ? '5:35 /km' : '6:20 /km', zone: isRaceDay ? 'Zona 3–4' : 'Zona 2' },
      cooldown:{ label: 'Defaticamento', duration: '10 min', desc: 'Cammino + stretching completo', pace: 'passo', zone: 'Zona 1' },
      coachNote: isRaceDay
        ? "🏁 È il giorno! Fidati di tutto il lavoro fatto nelle 12 settimane. Parti CONTROLLATA (NON farti trascinare nei primi km), idratati al km 6, gel liquido al 6 e 12. Negative split = gara riuscita."
        : `${dayLabel} — lungo nel taper. Nessun lavoro di qualità, solo volume gentile. A ${DAYS_TO_RACE} giorni dalla gara serve movimento, non fatica.`,
      avoid: isRaceDay
        ? ['Partire troppo forte', 'Saltare i rifornimenti', 'Provare cose nuove (scarpe, gel, strategia)']
        : ['Aumentare il passo', 'Allungare la distanza', 'Aggiungere ripetute'],
      altEasy: null,
    },
  };

  const base = presets[w.type] || presets.easy;
  return {
    ...base,
    day: dayLabel,
    garminSent: false,
  };
}

const TODAY_WORKOUT = _buildTodayWorkout();

const TYPE_META = {
  tempo:     { color: C.orange,  label: 'TEMPO',     bg: C.orangeDim  },
  easy:      { color: C.teal,    label: 'FACILE',    bg: C.tealDim    },
  intervals: { color: C.purple,  label: 'RIPETUTE',  bg: C.purpleDim  },
  long:      { color: C.blue,    label: 'LUNGO',     bg: C.blueDim    },
  recovery:  { color: C.teal,    label: 'RECUPERO',  bg: C.tealDim    },
  strength:  { color: C.yellow,  label: 'FORZA',     bg: 'rgba(246,201,78,0.14)' },
  rest:      { color: C.faint,   label: 'RIPOSO',    bg: 'rgba(255,255,255,0.05)' },
};

const PROGRESS_DATA = {
  weeklyMiles:    [38, 42, 45, 48, 44, 50, 22],
  weekLabels:     ['S9','S10','S11','S12','S13','S14','S15'],
  paceHistory:    [6.2, 6.05, 5.95, 5.88, 5.82, 5.78, 5.80],
  consistency:    91,
  adherence:      88,
  longestRun:     32,
  totalRuns:      43,
  projectedFinish:'In taper',
  readinessScore: 84,
  raceCountdown:  DAYS_TO_RACE,
};

const CHAT_HISTORY = [
  { role: 'coach', text: `Buongiorno Sarah! Oggi è ${USER.todayLabel} ${USER.todayDate} — siamo a ${DAYS_TO_RACE} giorni dalla Mezza Maratona di Lucca 🏁 Siamo in pieno taper: tre uscite leggere questa settimana, zero lavori di qualità oltre l'attivazione. Il lavoro è già fatto, ora si conserva.` },
  { role: 'user',  text: `Ho le gambe pesanti, è normale a ${DAYS_TO_RACE} giorni dalla gara?` },
  { role: 'coach', text: "Assolutamente sì — è normalissimo durante lo scarico. Le gambe si 'rigenerano' e spesso si sentono pesanti prima di tornare fresche. Non cambiare niente al piano. Idratati bene, dormi 8h, e fidati del processo: arriverai a Lucca con le gambe cariche." },
];

const SUGGESTIONS = [
  "Pianifica i miei allenamenti della prossima settimana",
  "Analizza le mie ultime corse Strava",
  "Dammi un allenamento per oggi",
  "Come sono le mie metriche (CTL/ATL/TSB)?",
  "Sono stanco, propongo qualcosa di più leggero",
  "Che obiettivo posso pormi adesso?",
];

const COACH_RESPONSES = {
  "Che tempo posso fare a Lucca?": `Guardando i tuoi PB: 10k in 51:03 e 21k in 2:03:00. La formula di Riegel dal 10k ti dà una stima di circa ${RACE_ESTIMATES.realistic.time} (${RACE_ESTIMATES.realistic.pace}). Il target 1:58 è realistico ma ambizioso: gestendo bene i primi 10k (5:40-5:45/km) e tenendo duro nella seconda metà, è alla portata.`,
  "Come gestisco il ritmo in gara?": "Dividi i 21km in 3 blocchi: km 1-7 conservativa (5:40-5:45/km, controllata), km 7-15 al ritmo gara (5:35/km), km 15-21 dai tutto se hai energie. Parti SEMPRE più lenta di quanto vorresti: chi parte forte a Lucca muore nel finale. Usa il GPS ma ascolta il respiro.",
  "Cosa mangio nei giorni pre-gara?": "Nei 3 giorni prima: carboidrati ad ogni pasto (pasta, riso, pane), riduci fibre e grassi, niente cibi nuovi. Sera del 2 maggio: pasta semplice col pomodoro, porzione normale. Mattina gara 3h prima: porridge con banana o toast con marmellata + 400ml acqua. Niente esperimenti!",
  "Come arrivo riposata il 3 maggio?": "Sei già in taper, fallo bene: dormi 8h minime, idratati (2-3L/giorno), evita stress fisici (niente sport diversi), riduci caffè la settimana. Le 3 corse leggere di questa settimana bastano a tenere le gambe attive. Venerdì riposo totale, sabato solo sblocca-gambe 4km lento.",
  "Devo fare un ultimo lungo?": "No. A 11 giorni dalla gara non serve un lungo: la condizione è costruita, ora la conservi. Il lungo massimo fatto (18km) è sufficiente per i 21.1km di Lucca. Fare di più ora rischia solo di affaticare le gambe. Fidati del taper.",
};

const COACH_RESPONSES_OLD_UNUSED = {

  "Cosa mangio nei giorni pre-gara?": "Nei 3 giorni prima di Lucca: aumenta i carboidrati (pasta, riso, pane) ad ogni pasto, riduci fibre e grassi, niente cibi nuovi. La sera del 2 maggio: pasta semplice con pomodoro. Mattina gara: colazione 3h prima — porridge con banana o toast con marmellata, 400-500ml acqua. Niente di sperimentale!",
  "Devo fare carbo-loading?": "Sì, per una maratona il carbo-loading ha senso. Inizia 3 giorni prima (dal 30 aprile): punta a 8-10g di carboidrati per kg corporeo al giorno. In pratica: aggiungi una porzione extra di pasta/riso a pranzo e cena, riduci le verdure crude, mantieni le proteine moderate. Non esagerare la sera prima — stomaco pesante = gara pesante.",
  "Posso aggiungere un allenamento?": "No — è esattamente la cosa sbagliata da fare ora. A 11 giorni dalla gara aggiungere km non ti migliorerà, ma rischi di arrivare stanca a Lucca. La forma che hai è quella che hai: il taper fa emergere tutta la condizione costruita nelle settimane precedenti. Fidati del piano e riposa.",
  "Come arrivo riposata il 3 maggio?": "Piano settimana pre-gara: Lun 27 riposo, Mar 28 jogging 4km, Mer 29 riposo, Gio 30 jogging 3km + 4×100m allunghi, Ven 1 maggio riposo, Sab 2 maggio jogging 15 min leggero. Dormi 8h per notte, idratati bene dal 30 aprile, evita alcol e cibi pesanti. Il giorno prima: gambe su, niente gite lunghe a piedi!",
};

// ─── Shared components ────────────────────────────────────────────────────────

function PhoneFrame({ children, accentColor }) {
  return (
    <div style={{
      position: 'relative',
      width: 393,
      height: 852,
      background: '#000',
      borderRadius: 52,
      overflow: 'hidden',
      boxShadow: '0 40px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.05)',
      flexShrink: 0,
    }}>
      {/* Bezel gradient */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)', pointerEvents:'none', zIndex:100, borderRadius:52 }} />
      <div style={{ position:'absolute', inset:0, background: C.bg, display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  );
}

function DynamicIsland() {
  return (
    <div style={{ display:'flex', justifyContent:'center', paddingTop: 14, paddingBottom: 4, flexShrink: 0 }}>
      <div style={{ width: 120, height: 34, background: '#000', borderRadius: 20 }} />
    </div>
  );
}

function StatusBar({ time = '9:41' }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 28px 6px', flexShrink:0 }}>
      <span style={{ color: C.text, fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px' }}>{time}</span>
      <div style={{ display:'flex', gap: 6, alignItems:'center' }}>
        {/* Signal */}
        <svg width="17" height="12" viewBox="0 0 17 12"><rect x="0" y="6" width="3" height="6" rx="0.5" fill={C.text}/><rect x="4.5" y="4" width="3" height="8" rx="0.5" fill={C.text}/><rect x="9" y="2" width="3" height="10" rx="0.5" fill={C.text}/><rect x="13.5" y="0" width="3" height="12" rx="0.5" fill={C.text}/></svg>
        {/* WiFi */}
        <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill={C.text}/><path d="M2.5 6.5a7.5 7.5 0 0111 0" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M5 3.5a5 5 0 016 0" stroke={C.text} strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
        {/* Battery */}
        <div style={{ display:'flex', alignItems:'center', gap:1 }}>
          <div style={{ width:24, height:12, border:`1.5px solid ${C.text}`, borderRadius:3, padding:1.5, display:'flex', alignItems:'center' }}>
            <div style={{ width:'80%', height:'100%', background: C.text, borderRadius:1.5 }} />
          </div>
          <div style={{ width:2, height:5, background: C.text, borderRadius:'0 1px 1px 0', marginLeft:-1 }} />
        </div>
      </div>
    </div>
  );
}

function BottomNav({ current, onChange }) {
  const tabs = [
    { id:'home',     icon: HomeIcon,     label:'Today'    },
    { id:'plan',     icon: PlanIcon,     label:'Plan'     },
    { id:'coach',    icon: CoachIcon,    label:'Coach'    },
    { id:'progress', icon: ProgressIcon, label:'Progress' },
    { id:'recovery', icon: RecoveryIcon, label:'Recovery' },
  ];
  return (
    <div style={{
      display:'flex', justifyContent:'space-around', alignItems:'center',
      padding:'10px 4px 24px', background: C.card,
      borderTop:`1px solid ${C.border}`, flexShrink:0,
    }}>
      {tabs.map(t => {
        const active = current === t.id;
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            background:'none', border:'none', cursor:'pointer', padding:'4px 12px',
            transition:'opacity 0.15s',
          }}>
            <Icon active={active} />
            <span style={{ fontSize:10, fontWeight: active ? 600 : 400, color: active ? C.orange : C.faint, letterSpacing:'0.02em' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Nav icons
function HomeIcon({ active }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 3L21 12V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V12Z" stroke={active ? C.orange : C.faint} strokeWidth="1.75" strokeLinejoin="round" fill={active ? C.orangeDim : 'none'}/>
  </svg>;
}
function PlanIcon({ active }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="17" rx="3" stroke={active ? C.orange : C.faint} strokeWidth="1.75" fill={active ? C.orangeDim : 'none'}/>
    <path d="M3 9H21" stroke={active ? C.orange : C.faint} strokeWidth="1.75"/>
    <path d="M8 2V6M16 2V6" stroke={active ? C.orange : C.faint} strokeWidth="1.75" strokeLinecap="round"/>
    <path d="M7 14H9M11 14H13M15 14H17M7 17H9M11 17H13" stroke={active ? C.orange : C.faint} strokeWidth="1.75" strokeLinecap="round"/>
  </svg>;
}
function CoachIcon({ active }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 5.92 2 10.8C2 13.76 3.56 16.4 6 18.08V22L9.6 19.6C10.36 19.84 11.16 20 12 20C17.52 20 22 16.08 22 10.8S17.52 2 12 2Z" stroke={active ? C.orange : C.faint} strokeWidth="1.75" fill={active ? C.orangeDim : 'none'}/>
    <circle cx="8" cy="11" r="1.2" fill={active ? C.orange : C.faint}/>
    <circle cx="12" cy="11" r="1.2" fill={active ? C.orange : C.faint}/>
    <circle cx="16" cy="11" r="1.2" fill={active ? C.orange : C.faint}/>
  </svg>;
}
function ProgressIcon({ active }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3 17L8 11L13 14L19 6" stroke={active ? C.orange : C.faint} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 6H15M20 6V11" stroke={active ? C.orange : C.faint} strokeWidth="1.75" strokeLinecap="round"/>
    <path d="M3 21H21" stroke={active ? C.faint : C.faint} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>;
}
function RecoveryIcon({ active }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke={active ? C.orange : C.faint} strokeWidth="1.75" fill={active ? C.orangeDim : 'none'}/>
    <path d="M8 12L10.5 14.5L16 9" stroke={active ? C.orange : C.faint} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

// Reusable card
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, overflow:'hidden',
      transition: onClick ? 'transform 0.1s, background 0.15s' : undefined,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }} onMouseDown={onClick ? e => e.currentTarget.style.transform='scale(0.98)' : undefined}
       onMouseUp={onClick ? e => e.currentTarget.style.transform='scale(1)' : undefined}
       onMouseLeave={onClick ? e => e.currentTarget.style.transform='scale(1)' : undefined}>
      {children}
    </div>
  );
}

// Recovery ring
function RecoveryRing({ score, size = 80, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const color = score >= 80 ? C.teal : score >= 60 ? C.orange : '#FF4466';
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" style={{ transition:'stroke-dashoffset 1s ease' }}/>
    </svg>
  );
}

// Workout type badge
function TypeBadge({ type, small }) {
  const m = TYPE_META[type] || TYPE_META.rest;
  return (
    <span style={{
      background: m.bg, color: m.color, fontSize: small ? 9 : 10,
      fontWeight: 700, letterSpacing:'0.08em', padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 4, textTransform:'uppercase',
    }}>{m.label}</span>
  );
}

// Garmin chip
function GarminChip({ connected, syncAgo }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, background: connected ? C.blueDim : 'rgba(255,255,255,0.06)', border:`1px solid ${connected ? 'rgba(77,158,255,0.3)' : C.border}`, borderRadius:20, padding:'5px 10px' }}>
      <div style={{ width:6, height:6, borderRadius:3, background: connected ? C.blue : C.faint }} />
      <span style={{ color: connected ? C.blue : C.sub, fontSize:11, fontWeight:500 }}>
        {connected ? `Garmin · ${syncAgo}` : 'Garmin · Non connesso'}
      </span>
    </div>
  );
}

// Simple bar chart
function BarChart({ data, labels, color = C.orange, height = 60 }) {
  const max = Math.max(...data);
  const w = 280; const barW = 28; const gap = (w - data.length * barW) / (data.length - 1);
  return (
    <svg width={w} height={height + 20} style={{ overflow:'visible' }}>
      {data.map((v, i) => {
        const bh = (v / max) * height;
        const x = i * (barW + gap);
        const isLast = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={height - bh} width={barW} height={bh} rx={5}
              fill={isLast ? color : 'rgba(255,255,255,0.1)'}/>
            {isLast && <rect x={x} y={height - bh} width={barW} height={bh} rx={5}
              fill={`url(#bg${i})`} opacity={0.6}/>}
            <text x={x + barW/2} y={height + 16} textAnchor="middle" fill={C.faint} fontSize={10}>{labels[i]}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="bg6" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// Sparkline
function SparkLine({ data, color = C.teal, width = 100, height = 36 }) {
  const min = Math.min(...data); const max = Math.max(...data);
  const pts = data.map((v,i) => {
    const x = (i / (data.length-1)) * width;
    const y = height - ((v - min) / (max - min + 0.001)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ overflow:'visible' }}>
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* last dot */}
      <circle cx={width} cy={height - ((data[data.length-1]-min)/(max-min+0.001))*height} r="3" fill={color}/>
    </svg>
  );
}

// Scroll container
function ScrollArea({ children, style }) {
  return (
    <div style={{ flex:1, overflowY:'auto', ...style,
      scrollbarWidth:'none', msOverflowStyle:'none',
    }}>
      <style>{`.scroll-hide::-webkit-scrollbar{display:none}`}</style>
      <div className="scroll-hide" style={{ height:'100%', overflowY:'auto', scrollbarWidth:'none' }}>
        {children}
      </div>
    </div>
  );
}

// Export everything
Object.assign(window, {
  C, USER, PB, RACE_ESTIMATES, RACE_STRATEGY, GEL_PLAN, LONG_RUN_LAST,
  riegelPredict, fmtTime, fmtPace,
  RECOVERY_DATA, TODAY_WORKOUT, WEEK_SCHEDULE, TYPE_META,
  PROGRESS_DATA, CHAT_HISTORY, SUGGESTIONS, COACH_RESPONSES,
  PhoneFrame, DynamicIsland, StatusBar, BottomNav, Card,
  RecoveryRing, TypeBadge, GarminChip, BarChart, SparkLine, ScrollArea,
});
