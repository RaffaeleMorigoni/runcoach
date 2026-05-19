// js/garmin-workout.jsx — Garmin Workout Builder + TCX Export + API Push
const { useState, useRef } = React;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function paceToMs(paceStr) {
  // "6:00" → m/s
  const [m, s] = paceStr.split(':').map(Number);
  const secPerKm = m * 60 + (s || 0);
  return secPerKm > 0 ? 1000 / secPerKm : 2.5;
}

function parsePaceRange(rangeStr) {
  // "5:15–5:25 /km" → { low, high } m/s
  const clean = rangeStr.replace(/\s/g,'').replace('/km','');
  const parts = clean.split(/[–-]/);
  if (parts.length === 2) {
    const hi = paceToMs(parts[0]); // slower pace = lower speed
    const lo = paceToMs(parts[1]); // faster pace = higher speed
    return { low: Math.min(lo, hi), high: Math.max(lo, hi) };
  }
  const v = paceToMs(parts[0]);
  return { low: v * 0.95, high: v * 1.05 };
}

// ─── TCX Generator ────────────────────────────────────────────────────────────
function generateTCX(workout) {
  const steps = workout.steps.map((step, i) => {
    const durType = step.durationType === 'time' ? 'Time_t' : 'Distance_t';
    const durTag  = step.durationType === 'time'
      ? `<Seconds>${step.durationValue}</Seconds>`
      : `<Meters>${step.durationValue}</Meters>`;
    const intensity = step.type === 'warmup'   ? 'Warmup'
                    : step.type === 'cooldown' ? 'Cooldown'
                    : step.type === 'rest'     ? 'Rest'
                    : 'Active';

    let targetXml = '        <Target xsi:type="None_t"/>';
    if (step.targetType === 'pace' && step.paceRange) {
      const { low, high } = parsePaceRange(step.paceRange);
      targetXml = `        <Target xsi:type="Speed_t">
          <SpeedZone xsi:type="CustomSpeedZone_t">
            <LowInMetersPerSecond>${low.toFixed(4)}</LowInMetersPerSecond>
            <HighInMetersPerSecond>${high.toFixed(4)}</HighInMetersPerSecond>
          </SpeedZone>
        </Target>`;
    } else if (step.targetType === 'hr' && step.hrRange) {
      targetXml = `        <Target xsi:type="HeartRate_t">
          <HeartRateZone xsi:type="CustomHeartRateZone_t">
            <Low xsi:type="HeartRateInBeatsPerMinute_t"><Value>${step.hrRange[0]}</Value></Low>
            <High xsi:type="HeartRateInBeatsPerMinute_t"><Value>${step.hrRange[1]}</Value></High>
          </HeartRateZone>
        </Target>`;
    }

    return `      <Step xsi:type="Step_t">
        <StepId>${i + 1}</StepId>
        <Name>${step.name}</Name>
        <Duration xsi:type="${durType}">
          ${durTag}
        </Duration>
        <Intensity>${intensity}</Intensity>
${targetXml}
      </Step>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Workouts>
    <Workout Sport="Running">
      <Name>${workout.name}</Name>
${steps}
    </Workout>
  </Workouts>
</TrainingCenterDatabase>`;
}

// ─── Garmin Connect API (unofficial, requires login) ─────────────────────────
function workoutToGarminJSON(workout) {
  const STEP_TYPES = {
    warmup:   { stepTypeId: 1, stepTypeKey: 'warmup' },
    interval: { stepTypeId: 3, stepTypeKey: 'interval' },
    recovery: { stepTypeId: 4, stepTypeKey: 'recovery' },
    cooldown: { stepTypeId: 2, stepTypeKey: 'cooldown' },
    rest:     { stepTypeId: 5, stepTypeKey: 'rest' },
  };

  const steps = workout.steps.map((step, i) => {
    const endCond = step.durationType === 'time'
      ? { conditionTypeId: 2, conditionTypeKey: 'time', conditionValue: step.durationValue, displayOrder: 1 }
      : { conditionTypeId: 3, conditionTypeKey: 'distance', conditionValue: step.durationValue, displayOrder: 1 };

    let target = { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' };
    let targetValueOne = null, targetValueTwo = null;
    if (step.targetType === 'pace' && step.paceRange) {
      const { low, high } = parsePaceRange(step.paceRange);
      target = { workoutTargetTypeId: 6, workoutTargetTypeKey: 'pace.zone' };
      targetValueOne  = low;
      targetValueTwo  = high;
    } else if (step.targetType === 'hr' && step.hrRange) {
      target = { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' };
      targetValueOne  = step.hrRange[0];
      targetValueTwo  = step.hrRange[1];
    }

    return {
      stepId: null, stepOrder: i + 1,
      stepType: STEP_TYPES[step.type] || STEP_TYPES.interval,
      endCondition: endCond,
      endConditionValue: step.durationValue,
      targetType: target, targetValueOne, targetValueTwo,
      description: step.name,
    };
  });

  return {
    workoutName: workout.name,
    description: workout.notes || 'Creato con RunCoach AI',
    sportType: { sportTypeId: 1, sportTypeKey: 'running' },
    workoutSegments: [{
      segmentOrder: 1,
      sportType: { sportTypeId: 1, sportTypeKey: 'running' },
      workoutSteps: steps,
    }],
  };
}

// ─── Backend RunCoach Garmin (FastAPI + python-garminconnect) ────────────────
function getGarminBackend() {
  return {
    url:   localStorage.getItem('garmin_backend_url')   || '',
    email: localStorage.getItem('garmin_backend_email') || '',
  };
}

function normalizeBackendUrl(url) {
  let u = (url || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function saveGarminBackend(url, email) {
  localStorage.setItem('garmin_backend_url',   normalizeBackendUrl(url));
  localStorage.setItem('garmin_backend_email', email||'');
}

function clearGarminBackend() {
  localStorage.removeItem('garmin_backend_url');
  localStorage.removeItem('garmin_backend_email');
}

function workoutToBackendJSON(workout, scheduleDate) {
  // Formato accettato dal backend FastAPI: { name, description, sport_type, steps[], schedule_date }
  // step: { type, duration:'TIME:sec'|'DISTANCE:m'|'OPEN', target_type:'pace'|'hr'|'open', target_low, target_high, note }
  const stepTypeMap = { warmup:'warmup', cooldown:'cooldown', interval:'interval', recovery:'recovery', rest:'rest', easy:'run', long:'run', tempo:'run', run:'run' };
  const PACE_MIN = 1.5, PACE_MAX = 12;  // limiti m/s ragionevoli per un runner (3:30/km → 7:30/km)

  const steps = (workout.steps || []).map(s => {
    // duration: durata in secondi → 'TIME:sec' ; distanza in m → 'DISTANCE:m'
    let duration = 'OPEN';
    if (s.durationType === 'time' || s.durationType === 'TIME') {
      const sec = Number(s.durationValue) || 0;
      duration = sec > 0 ? `TIME:${sec}` : 'OPEN';
    } else if (s.durationType === 'distance' || s.durationType === 'DISTANCE') {
      const m = Number(s.durationValue) || 0;
      duration = m > 0 ? `DISTANCE:${m}` : 'OPEN';
    } else if (s.durationType === 'lap' || s.durationType === 'LAP_BUTTON') {
      duration = 'LAP_BUTTON';
    }

    let target_type = 'open', target_low = null, target_high = null;
    if (s.targetType === 'pace' && s.paceRange) {
      // "5:30–6:00 /km" → m/s. Garmin vuole low ≤ high in m/s; il min/km basso (veloce) = m/s alto.
      const m = s.paceRange.match(/(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)/);
      if (m) {
        const fastPace = +m[1] + (+m[2])/60;  // min/km veloce
        const slowPace = +m[3] + (+m[4])/60;  // min/km lento
        const fastMs   = 1000 / (fastPace * 60); // m/s alto
        const slowMs   = 1000 / (slowPace * 60); // m/s basso
        target_type = 'pace';
        target_low  = +Math.max(PACE_MIN, Math.min(slowMs, fastMs)).toFixed(3);
        target_high = +Math.min(PACE_MAX, Math.max(slowMs, fastMs)).toFixed(3);
      }
    } else if (s.targetType === 'hr' && Array.isArray(s.hrRange)) {
      target_type = 'hr';
      target_low  = Number(s.hrRange[0]) || null;
      target_high = Number(s.hrRange[1]) || null;
    }

    return {
      type: stepTypeMap[s.type] || 'run',
      duration,
      target_type,
      target_low,
      target_high,
      note: s.name || '',
    };
  });

  return {
    name:          workout.name || 'Workout',
    description:   workout.notes || '',
    sport_type:    'running',
    schedule_date: scheduleDate || null,
    steps,
  };
}

async function pushToGarminConnect(workout, scheduleDate) {
  const cfg = getGarminBackend();
  if (!cfg.url || !cfg.email) {
    const err = new Error('backend_not_configured');
    err.code = 'NO_BACKEND';
    throw err;
  }
  // Server aspetta JSON strutturato (steps[]); il TCX legacy non funziona con upload_workout
  const body = workoutToBackendJSON(workout, scheduleDate);
  const res = await fetch(`${cfg.url}/upload-workout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data.detail;
    const msg = typeof d === 'string' ? d
              : (d && d.message) ? d.message
              : Array.isArray(d) ? d.map(x => x.msg || JSON.stringify(x)).join('; ')
              : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = res.status === 401 ? 'AUTH' : 'FETCH';
    err.detail = msg;
    throw err;
  }
  return data;
}

async function loginGarminBackend(url, email, password, mfaCode) {
  const u = normalizeBackendUrl(url);
  const res = await fetch(`${u}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, mfa: mfaCode || null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // detail può essere stringa o oggetto {code, message}
    const d = data.detail;
    const msg = typeof d === 'string' ? d
              : (d && d.message) ? d.message
              : `HTTP ${res.status}`;
    const code = (d && d.code) || (msg.toLowerCase().includes('mfa') ? 'MFA' : 'AUTH');
    const err = new Error(msg);
    err.code = code;
    throw err;
  }
  // 202 needs MFA
  if (res.status === 202 || data.needs_mfa) {
    const err = new Error('MFA richiesta');
    err.code = 'MFA';
    throw err;
  }
  saveGarminBackend(u, email);
  return data;
}

function downloadTCX(workout) {
  const xml = generateTCX(workout);
  const blob = new Blob([xml], { type: 'application/vnd.garmin.tcx+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${workout.name.replace(/\s+/g,'-')}.tcx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── ICS Calendar Generator (per Apple/Google Calendar) ───────────────────────
function fmtICSDate(d) {
  // YYYYMMDDTHHMMSS (local) — usiamo orario locale senza timezone
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function workoutTotalSeconds(workout) {
  return workout.steps.reduce((sum, s) => {
    if (s.durationType === 'time') return sum + (s.durationValue || 0);
    // se distanza, stima 6 min/km (fallback)
    if (s.durationType === 'distance') return sum + Math.round((s.durationValue || 0) / 1000 * 360);
    return sum;
  }, 0);
}

function generateICS(workout, opts = {}) {
  const start = opts.startDate ? new Date(opts.startDate) : (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0, 0, 0);
    return d;
  })();
  const totalSec = workoutTotalSeconds(workout) || 3600;
  const end = new Date(start.getTime() + totalSec * 1000);

  const stepLines = workout.steps.map((s, i) => {
    const dur = s.durationType === 'time'
      ? `${Math.round((s.durationValue||0)/60)}min`
      : `${((s.durationValue||0)/1000).toFixed(2)}km`;
    const tgt = s.targetType === 'pace' && s.paceRange ? ` @ ${s.paceRange}`
              : s.targetType === 'hr' && s.hrRange ? ` @ HR ${s.hrRange[0]}-${s.hrRange[1]}`
              : '';
    return `${i+1}. ${s.name} — ${dur}${tgt}`;
  }).join('\\n');

  const description = [
    workout.notes || '',
    '',
    'Step:',
    stepLines,
    '',
    'Generato da RunCoach AI'
  ].join('\\n');

  const uid = `runcoach-${Date.now()}@runcoach.app`;
  const now = fmtICSDate(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RunCoach AI//Workout//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${fmtICSDate(start)}`,
    `DTEND:${fmtICSDate(end)}`,
    `SUMMARY:🏃 ${workout.name}`,
    `DESCRIPTION:${description}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Allenamento tra 30 min — ${workout.name}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function downloadICS(workout, opts = {}) {
  const ics  = generateICS(workout, opts);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${workout.name.replace(/\s+/g,'-')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Preset workouts from plan ────────────────────────────────────────────────
const PRESET_WORKOUTS = [
  {
    id: 'easy_taper',
    name: 'Corsa Facile 6km — Scarico',
    notes: 'Settimana taper pre-Maratona di Lucca. Ritmo conversazionale.',
    steps: [
      { name: 'Riscaldamento',   type: 'warmup',   durationType: 'time', durationValue: 300,  targetType: 'pace', paceRange: '6:45–7:15 /km' },
      { name: 'Corsa facile',    type: 'interval', durationType: 'time', durationValue: 1800, targetType: 'pace', paceRange: '6:00–6:30 /km' },
      { name: 'Defaticamento',   type: 'cooldown', durationType: 'time', durationValue: 300,  targetType: 'none' },
    ],
  },
  {
    id: 'activation',
    name: 'Attivazione pre-gara 5km',
    notes: 'Uscita leggera 2 giorni prima della Maratona di Lucca.',
    steps: [
      { name: 'Jogging leggero', type: 'warmup',   durationType: 'time', durationValue: 600,  targetType: 'pace', paceRange: '6:45–7:15 /km' },
      { name: 'Ritmo facile',    type: 'interval', durationType: 'time', durationValue: 1200, targetType: 'pace', paceRange: '6:10–6:40 /km' },
      { name: 'Defaticamento',   type: 'cooldown', durationType: 'time', durationValue: 300,  targetType: 'none' },
    ],
  },
  {
    id: 'long_taper',
    name: 'Ultimo Lungo 14km',
    notes: 'Ultimo lungo di taper. No eroismo — ritmo facile tutto il tempo.',
    steps: [
      { name: 'Riscaldamento',   type: 'warmup',   durationType: 'distance', durationValue: 1000, targetType: 'pace', paceRange: '6:45–7:15 /km' },
      { name: 'Lungo facile',    type: 'interval', durationType: 'distance', durationValue: 11500,targetType: 'pace', paceRange: '6:00–6:30 /km' },
      { name: 'Defaticamento',   type: 'cooldown', durationType: 'distance', durationValue: 1500, targetType: 'pace', paceRange: '6:30–7:00 /km' },
    ],
  },
  {
    id: 'race_warmup',
    name: 'Riscaldamento Gara — Lucca 3 Maggio',
    notes: 'Routine pre-gara da fare 45-60 min prima della partenza.',
    steps: [
      { name: 'Cammino veloce',  type: 'warmup',   durationType: 'time', durationValue: 300,  targetType: 'none' },
      { name: 'Jogging leggero', type: 'interval', durationType: 'time', durationValue: 600,  targetType: 'pace', paceRange: '6:45–7:15 /km' },
      { name: '4 allunghi 80m',  type: 'interval', durationType: 'time', durationValue: 480,  targetType: 'none' },
      { name: 'Recupero',        type: 'cooldown', durationType: 'time', durationValue: 300,  targetType: 'none' },
    ],
  },
];

// ─── Step Editor ──────────────────────────────────────────────────────────────
function StepRow({ step, index, onUpdate, onRemove, accent }) {
  const types = [
    { key:'warmup',   label:'Riscaldamento', col: C.teal },
    { key:'interval', label:'Principale',    col: accent },
    { key:'cooldown', label:'Defaticamento', col: C.teal },
    { key:'recovery', label:'Recupero',      col: C.blue },
  ];
  const t = types.find(t => t.key === step.type) || types[1];

  return (
    <div style={{ background: C.card2, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 14px', marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', gap:6 }}>
          {types.map(tp => (
            <button key={tp.key} onClick={() => onUpdate({ ...step, type: tp.key })} style={{
              padding:'3px 10px', borderRadius:6, border:'none', cursor:'pointer', fontSize:10, fontWeight:600,
              background: step.type === tp.key ? `${tp.col}33` : 'rgba(255,255,255,0.06)',
              color: step.type === tp.key ? tp.col : C.faint,
            }}>{tp.label}</button>
          ))}
        </div>
        <button onClick={onRemove} style={{ background:'none', border:'none', color:C.faint, fontSize:18, cursor:'pointer', padding:'0 4px' }}>×</button>
      </div>

      {/* Name */}
      <input value={step.name} onChange={e => onUpdate({ ...step, name: e.target.value })}
        placeholder="Nome del passo"
        style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', color:C.text, fontSize:13, outline:'none', marginBottom:8, fontFamily:'DM Sans,sans-serif' }}/>

      {/* Duration */}
      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
        <select value={step.durationType} onChange={e => onUpdate({ ...step, durationType: e.target.value })}
          style={{ flex:1, background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 8px', color:C.text, fontSize:12, outline:'none' }}>
          <option value="time">Tempo (sec)</option>
          <option value="distance">Distanza (m)</option>
        </select>
        <input type="number" value={step.durationValue}
          onChange={e => onUpdate({ ...step, durationValue: +e.target.value })}
          style={{ flex:1, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', color:C.text, fontSize:13, outline:'none', textAlign:'center', fontFamily:'DM Sans,sans-serif' }}/>
        <div style={{ display:'flex', alignItems:'center', color:C.faint, fontSize:11, minWidth:30 }}>
          {step.durationType === 'time' ? 'sec' : 'm'}
        </div>
      </div>

      {/* Target */}
      <div style={{ display:'flex', gap:6 }}>
        <select value={step.targetType} onChange={e => onUpdate({ ...step, targetType: e.target.value })}
          style={{ flex:1, background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 8px', color:C.text, fontSize:12, outline:'none' }}>
          <option value="none">Nessun target</option>
          <option value="pace">Ritmo /km</option>
          <option value="hr">Frequenza cardiaca</option>
        </select>
        {step.targetType === 'pace' && (
          <input value={step.paceRange || ''} onChange={e => onUpdate({ ...step, paceRange: e.target.value })}
            placeholder="es. 6:00–6:30 /km"
            style={{ flex:2, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', color:C.text, fontSize:12, outline:'none', fontFamily:'DM Sans,sans-serif' }}/>
        )}
        {step.targetType === 'hr' && (
          <input value={(step.hrRange||[140,155]).join('–')} onChange={e => {
            const parts = e.target.value.split('–').map(Number);
            onUpdate({ ...step, hrRange: parts.length===2 ? parts : [140,155] });
          }} placeholder="140–155 bpm"
            style={{ flex:2, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:8, padding:'6px 10px', color:C.text, fontSize:12, outline:'none', fontFamily:'DM Sans,sans-serif' }}/>
        )}
      </div>
    </div>
  );
}

// ─── Main Builder Screen ──────────────────────────────────────────────────────
function GarminBuilderScreen({ onBack, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const [mode, setMode]           = useState('presets'); // presets | build | setup
  const [workout, setWorkout]     = useState(null);
  const [pushing, setPushing]     = useState(false);
  const [pushResult, setPushResult] = useState(null); // null | 'ok' | 'error' | 'downloaded' | 'ics' | 'no_backend' | 'auth'
  const [showSuccess, setShowSuccess] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate()+1);
    return d.toISOString().slice(0,10);
  });
  const [backendCfg, setBackendCfg] = useState(getGarminBackend());
  // setup form
  const [setupUrl, setSetupUrl]         = useState(backendCfg.url || '');
  const [setupEmail, setSetupEmail]     = useState(backendCfg.email || '');
  const [setupPwd, setSetupPwd]         = useState('');
  const [setupMfa, setSetupMfa]         = useState('');
  const [setupNeedMfa, setSetupNeedMfa] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError]     = useState(null);
  const [setupOk, setSetupOk]           = useState(false);

  const selectPreset = (p) => {
    setWorkout(JSON.parse(JSON.stringify(p))); // deep copy
    setMode('build');
    setPushResult(null);
  };

  const newBlank = () => {
    setWorkout({
      name: 'Il mio allenamento',
      notes: '',
      steps: [
        { name: 'Riscaldamento', type: 'warmup',   durationType:'time', durationValue:600,  targetType:'pace', paceRange:'6:45–7:15 /km' },
        { name: 'Corsa',         type: 'interval', durationType:'time', durationValue:1800, targetType:'pace', paceRange:'6:00–6:30 /km' },
        { name: 'Defaticamento', type: 'cooldown', durationType:'time', durationValue:300,  targetType:'none' },
      ],
    });
    setMode('build');
    setPushResult(null);
  };

  const updateStep = (i, step) => {
    const steps = [...workout.steps];
    steps[i] = step;
    setWorkout({ ...workout, steps });
  };

  const removeStep = (i) => {
    const steps = workout.steps.filter((_,idx) => idx !== i);
    setWorkout({ ...workout, steps });
  };

  const addStep = () => {
    setWorkout({ ...workout, steps: [...workout.steps, {
      name: 'Nuovo passo', type: 'interval', durationType:'time', durationValue:600, targetType:'none',
    }]});
  };

  const totalDuration = (w) => {
    const secs = w.steps.filter(s => s.durationType === 'time').reduce((a,b) => a + (b.durationValue||0), 0);
    const m = Math.floor(secs/60); return m > 0 ? `~${m} min` : '';
  };

  const handlePush = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const r = await pushToGarminConnect(workout, scheduleDate);
      setPushResult({ kind:'ok', message: r.message, scheduled: r.scheduled, date: r.schedule_date });
    } catch(e) {
      if (e.code === 'NO_BACKEND')   setPushResult({ kind:'no_backend' });
      else if (e.code === 'AUTH')    setPushResult({ kind:'auth', detail: e.detail });
      else                            setPushResult({ kind:'error', detail: e.message });
    }
    setPushing(false);
  };

  const handleSetupLogin = async () => {
    setSetupError(null);
    setSetupLoading(true);
    try {
      await loginGarminBackend(setupUrl, setupEmail, setupPwd, setupNeedMfa ? setupMfa : null);
      setBackendCfg(getGarminBackend());
      setSetupOk(true);
      setSetupPwd(''); setSetupMfa('');
      setTimeout(() => { setMode('build'); setSetupOk(false); }, 1200);
    } catch(e) {
      if (e.code === 'MFA') {
        setSetupNeedMfa(true);
        setSetupError('Inserisci il codice MFA dal tuo Garmin Authenticator');
      } else {
        setSetupError(e.message || 'Login fallito');
      }
    }
    setSetupLoading(false);
  };

  const handleSetupLogout = () => {
    clearGarminBackend();
    setBackendCfg({ url:'', email:'' });
    setSetupUrl(''); setSetupEmail(''); setSetupPwd(''); setSetupMfa('');
    setSetupNeedMfa(false); setSetupOk(false);
  };

  const handleDownload = () => {
    downloadTCX(workout);
    setPushResult('downloaded');
  };

  const handleICS = () => {
    downloadICS(workout);
    setPushResult('ics');
  };

  // ── Setup view ──
  if (mode === 'setup') return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 14px' }}>
        <button onClick={() => setMode('presets')} style={{ width:44, height:44, borderRadius:22, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div>
          <div style={{ color:C.text, fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Push diretto a Garmin</div>
          <div style={{ color:C.sub, fontSize:12, marginTop:2 }}>Setup credenziali (una volta sola)</div>
        </div>
      </div>

      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ background:'rgba(255,196,0,0.08)', border:'1px solid rgba(255,196,0,0.25)', borderRadius:14, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ color:'#ffc400', fontSize:12, fontWeight:600, marginBottom:6 }}>⚠️ Come funziona</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.5 }}>
            Garmin non ha un'API pubblica per push. Serve un piccolo server (Python) che fa login al tuo account Garmin e invia gli allenamenti. Devi deployarlo tu (es. su Railway, gratis). Le credenziali vengono salvate criptate sul TUO server, non sui nostri. Vedi README per setup.
          </div>
        </div>

        <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:8 }}>URL del tuo server backend</div>
        <input value={setupUrl} onChange={e => setSetupUrl(e.target.value)} placeholder="https://tuo-server.up.railway.app"
          style={{ width:'100%', height:44, padding:'0 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:'none', marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>

        <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:8 }}>Email Garmin Connect</div>
        <input value={setupEmail} onChange={e => setSetupEmail(e.target.value)} placeholder="email@example.com" type="email"
          style={{ width:'100%', height:44, padding:'0 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:'none', marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>

        <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:8 }}>Password Garmin</div>
        <input value={setupPwd} onChange={e => setSetupPwd(e.target.value)} placeholder="••••••••" type="password"
          style={{ width:'100%', height:44, padding:'0 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:'none', marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>

        {setupNeedMfa && (
          <>
            <div style={{ color:C.text, fontSize:13, fontWeight:600, marginBottom:8 }}>Codice MFA (6 cifre)</div>
            <input value={setupMfa} onChange={e => setSetupMfa(e.target.value)} placeholder="123456" inputMode="numeric" maxLength={6}
              style={{ width:'100%', height:44, padding:'0 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:'none', marginBottom:14, fontFamily:'inherit', boxSizing:'border-box' }}/>
          </>
        )}

        {setupError && (
          <div style={{ background:'rgba(255,75,75,0.1)', border:'1px solid rgba(255,75,75,0.3)', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>
            <div style={{ color:'#ff6b6b', fontSize:12 }}>{setupError}</div>
          </div>
        )}

        {setupOk && (
          <div style={{ background:'rgba(80,220,160,0.1)', border:'1px solid rgba(80,220,160,0.35)', borderRadius:10, padding:'10px 12px', marginBottom:14 }}>
            <div style={{ color:'#5fdca0', fontSize:12, fontWeight:600 }}>✓ Connesso! Token salvato.</div>
          </div>
        )}

        <button onClick={handleSetupLogin} disabled={setupLoading || !setupUrl || !setupEmail || !setupPwd}
          style={{ width:'100%', height:50, background: setupLoading ? C.border2 : accent, border:'none', borderRadius:14, color:'#fff', fontSize:14, fontWeight:700, cursor: setupLoading ? 'wait' : 'pointer', marginBottom:10, opacity: (!setupUrl || !setupEmail || !setupPwd) ? 0.4 : 1 }}>
          {setupLoading ? 'Connessione…' : (setupNeedMfa ? 'Verifica MFA' : 'Connetti')}
        </button>

        {backendCfg.url && (
          <button onClick={handleSetupLogout}
            style={{ width:'100%', height:44, background:'transparent', border:`1px solid ${C.border}`, borderRadius:14, color:C.sub, fontSize:13, cursor:'pointer' }}>
            Disconnetti
          </button>
        )}
      </div>
    </div>
  );

  // ── Presets view ──
  if (mode === 'presets') return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 14px' }}>
        <button onClick={onBack} style={{ width:44, height:44, borderRadius:22, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div>
          <div style={{ color:C.text, fontSize:20, fontWeight:700, letterSpacing:'-0.3px' }}>Allenamenti Garmin</div>
          <div style={{ color:C.sub, fontSize:12, marginTop:2 }}>Crea e invia al tuo dispositivo</div>
        </div>
      </div>

      {/* Garmin chip / setup status */}
      <div style={{ padding:'0 16px 16px' }}>
        <div onClick={() => setMode('setup')} style={{ cursor:'pointer', background: backendCfg.url ? C.blueDim : 'rgba(255,255,255,0.04)', border:`1px solid ${backendCfg.url ? C.blue+'33' : C.border}`, borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={backendCfg.url ? C.blue : C.sub} strokeWidth="1.8" strokeLinejoin="round"/></svg>
          <div style={{ flex:1 }}>
            <div style={{ color: backendCfg.url ? C.blue : C.text, fontSize:13, fontWeight:600 }}>
              {backendCfg.url ? `Garmin Connect · ${backendCfg.email || 'connesso'}` : 'Configura push diretto a Garmin'}
            </div>
            <div style={{ color:C.sub, fontSize:11, marginTop:2 }}>
              {backendCfg.url ? 'Push diretto attivo · tocca per cambiare' : 'Senza setup: download .tcx + import manuale'}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={C.sub} strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>

      {/* Presets */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:12 }}>Allenamenti del Piano</div>
        {PRESET_WORKOUTS.map(p => (
          <Card key={p.id} onClick={() => selectPreset(p)} style={{ marginBottom:10 }}>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ color:C.text, fontSize:14, fontWeight:600, flex:1 }}>{p.name}</div>
                <div style={{ background:`${accent}22`, borderRadius:8, padding:'3px 8px', marginLeft:8, flexShrink:0 }}>
                  <span style={{ color:accent, fontSize:10, fontWeight:700 }}>{p.steps.length} passi</span>
                </div>
              </div>
              <div style={{ color:C.sub, fontSize:12, marginBottom:10, lineHeight:1.45 }}>{p.notes}</div>
              {/* Steps preview */}
              <div style={{ display:'flex', gap:4 }}>
                {p.steps.map((s,i) => {
                  const col = s.type==='warmup'||s.type==='cooldown' ? C.teal : s.type==='recovery' ? C.blue : accent;
                  return (
                    <div key={i} style={{ flex:1, height:4, borderRadius:2, background:`${col}66` }}/>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Custom */}
      <div style={{ padding:'0 16px 28px' }}>
        <button onClick={newBlank} style={{ width:'100%', height:50, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border2}`, borderRadius:14, color:C.sub, fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span style={{ fontSize:18 }}>＋</span> Crea allenamento personalizzato
        </button>
      </div>
    </div>
  );

  // ── Builder view ──
  if (!workout) { setMode('presets'); return null; }
  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 14px' }}>
        <button onClick={() => { setMode('presets'); setPushResult(null); }} style={{ width:44, height:44, borderRadius:22, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div style={{ flex:1 }}>
          <input value={workout.name} onChange={e => setWorkout({ ...workout, name: e.target.value })}
            style={{ background:'none', border:'none', color:C.text, fontSize:18, fontWeight:700, letterSpacing:'-0.3px', outline:'none', width:'100%', fontFamily:'DM Sans,sans-serif' }}/>
          <div style={{ color:C.sub, fontSize:11, marginTop:2 }}>{totalDuration(workout)}</div>
        </div>
      </div>

      {/* Notes */}
      <div style={{ padding:'0 16px 14px' }}>
        <input value={workout.notes} onChange={e => setWorkout({ ...workout, notes: e.target.value })}
          placeholder="Note (opzionale)"
          style={{ width:'100%', background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 14px', color:C.sub, fontSize:13, outline:'none', fontFamily:'DM Sans,sans-serif' }}/>
      </div>

      {/* Steps */}
      <div style={{ padding:'0 16px 8px' }}>
        <div style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>Passi dell'allenamento</div>
        {workout.steps.map((step, i) => (
          <StepRow key={i} step={step} index={i} accent={accent}
            onUpdate={(s) => updateStep(i, s)}
            onRemove={() => removeStep(i)} />
        ))}
        <button onClick={addStep} style={{ width:'100%', height:44, background:'rgba(255,255,255,0.04)', border:`1px dashed ${C.border2}`, borderRadius:12, color:C.sub, fontSize:13, cursor:'pointer', marginTop:4 }}>
          + Aggiungi passo
        </button>
      </div>

      {/* Schedule date picker */}
      <div style={{ padding:'4px 16px 8px' }}>
        <div style={{ color:C.sub, fontSize:11, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.5px' }}>Data allenamento</div>
        <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
          style={{ width:'100%', height:44, padding:'0 14px', background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', colorScheme:'dark' }}/>
      </div>

      {/* Result feedback */}
      {pushResult?.kind === 'ok' && (
        <div style={{ margin:'8px 16px', background:C.tealDim, border:`1px solid ${C.teal}44`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:C.teal, fontSize:14, fontWeight:700, marginBottom:4 }}>
            ✓ {pushResult.scheduled ? `Schedulato per ${new Date(pushResult.date).toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}!` : 'Inviato a Garmin Connect!'}
          </div>
          <div style={{ color:C.sub, fontSize:12 }}>{pushResult.message || `Trovi l'allenamento in "Allenamenti" su Garmin Connect e sulla tua ${USER.garminDevice}.`}</div>
        </div>
      )}
      {pushResult?.kind === 'no_backend' && (
        <div style={{ margin:'8px 16px', background:'rgba(255,200,0,0.08)', border:'1px solid rgba(255,200,0,0.25)', borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:C.yellow, fontSize:13, fontWeight:600, marginBottom:6 }}>⚠ Backend non configurato</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.55, marginBottom:10 }}>Per push diretto serve un server. Configuralo una volta sola, oppure scarica il file .tcx e importalo manualmente.</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setMode('setup')} style={{ flex:1, height:42, background:accent, border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              ⚙ Configura
            </button>
            <button onClick={handleDownload} style={{ flex:1, height:42, background:C.blue, border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              ⬇ Scarica .tcx
            </button>
          </div>
        </div>
      )}
      {pushResult?.kind === 'auth' && (
        <div style={{ margin:'8px 16px', background:'rgba(255,75,75,0.1)', border:'1px solid rgba(255,75,75,0.3)', borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:'#ff6b6b', fontSize:13, fontWeight:600, marginBottom:6 }}>🔒 Sessione Garmin scaduta</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.55, marginBottom:10 }}>{pushResult.detail || 'Devi rifare login al backend.'}</div>
          <button onClick={() => setMode('setup')} style={{ width:'100%', height:42, background:accent, border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            ⚙ Riconnetti Garmin
          </button>
        </div>
      )}
      {pushResult?.kind === 'error' && (
        <div style={{ margin:'8px 16px', background:'rgba(255,200,0,0.08)', border:'1px solid rgba(255,200,0,0.25)', borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:C.yellow, fontSize:13, fontWeight:600, marginBottom:6 }}>⚠ Push fallito</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.55, marginBottom:10 }}>{pushResult.detail || 'Errore di rete'}. Usa il download .tcx come backup.</div>
          <button onClick={handleDownload} style={{ width:'100%', height:42, background:C.blue, border:'none', borderRadius:10, color:'white', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            ⬇ Scarica file .tcx
          </button>
        </div>
      )}
      {pushResult === 'downloaded' && (
        <div style={{ margin:'8px 16px', background:C.blueDim, border:`1px solid ${C.blue}44`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:C.blue, fontSize:14, fontWeight:700, marginBottom:6 }}>✓ File .tcx scaricato!</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.55 }}>
            1. Apri <span style={{ color:C.blue }}>connect.garmin.com</span> sul browser<br/>
            2. Vai su <b style={{ color:C.text }}>Allenamenti → Importa</b><br/>
            3. Carica il file <b style={{ color:C.text }}>.tcx</b> scaricato<br/>
            4. Sincronizza il dispositivo — l'allenamento apparirà sul tuo {USER.garminDevice} ✓
          </div>
        </div>
      )}

      {pushResult === 'ics' && (
        <div style={{ margin:'8px 16px', background:`${accent}1a`, border:`1px solid ${accent}44`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:accent, fontSize:14, fontWeight:700, marginBottom:6 }}>✓ Evento calendario scaricato!</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.55 }}>
            1. Apri il file <b style={{ color:C.text }}>.ics</b> dalle Notifiche del telefono<br/>
            2. Conferma "Aggiungi al calendario"<br/>
            3. Riceverai un promemoria 30 min prima ⏰
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding:'12px 16px 12px', display:'flex', gap:10 }}>
        <button onClick={handleICS} style={{ flex:1, height:54, background:`${accent}1a`, border:`1px solid ${accent}44`, borderRadius:16, color:accent, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Calendario
        </button>
        <button onClick={handleDownload} style={{ flex:1, height:54, background:C.blueDim, border:`1px solid ${C.blue}44`, borderRadius:16, color:C.blue, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v13M7 11l5 5 5-5M3 19h18" stroke={C.blue} strokeWidth="2" strokeLinecap="round"/></svg>
          .tcx
        </button>
      </div>
      <div style={{ padding:'0 16px 28px' }}>
        <button onClick={handlePush} disabled={pushing} style={{ width:'100%', height:54, background: pushing ? 'rgba(255,255,255,0.08)' : accent, border:'none', borderRadius:16, color:'white', fontSize:14, fontWeight:700, cursor: pushing ? 'default' : 'pointer', boxShadow: pushing ? 'none' : `0 4px 20px ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          {pushing ? (
            <><div style={{ width:16, height:16, borderRadius:8, border:'2px solid white', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/> Invio…</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/></svg> Invia a Garmin Connect</>
          )}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

Object.assign(window, { GarminBuilderScreen, PRESET_WORKOUTS, generateTCX, downloadTCX, generateICS, downloadICS, pushToGarminConnect });
