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

async function pushToGarminConnect(workout) {
  const body = workoutToGarminJSON(workout);
  const res = await fetch('https://connect.garmin.com/workout-service/workout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'NK': 'NT' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  const [mode, setMode]           = useState('presets'); // presets | build
  const [workout, setWorkout]     = useState(null);
  const [pushing, setPushing]     = useState(false);
  const [pushResult, setPushResult] = useState(null); // null | 'ok' | 'error' | 'downloaded'
  const [showSuccess, setShowSuccess] = useState(false);

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
      await pushToGarminConnect(workout);
      setPushResult('ok');
    } catch(e) {
      // fallback to download
      setPushResult('error');
    }
    setPushing(false);
  };

  const handleDownload = () => {
    downloadTCX(workout);
    setPushResult('downloaded');
  };

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

      {/* Garmin chip */}
      <div style={{ padding:'0 16px 16px' }}>
        <div style={{ background: C.blueDim, border:`1px solid ${C.blue}33`, borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={C.blue} strokeWidth="1.8" strokeLinejoin="round"/></svg>
          <div>
            <div style={{ color:C.blue, fontSize:13, fontWeight:600 }}>Garmin Connect · {USER.garminDevice}</div>
            <div style={{ color:C.sub, fontSize:11, marginTop:2 }}>Esporta allenamenti strutturati (.tcx) o invia direttamente</div>
          </div>
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

      {/* Result feedback */}
      {pushResult === 'ok' && (
        <div style={{ margin:'8px 16px', background:C.tealDim, border:`1px solid ${C.teal}44`, borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:C.teal, fontSize:14, fontWeight:700, marginBottom:4 }}>✓ Inviato a Garmin Connect!</div>
          <div style={{ color:C.sub, fontSize:12 }}>Trovi l'allenamento in "Allenamenti" su Garmin Connect e sulla tua {USER.garminDevice}.</div>
        </div>
      )}
      {pushResult === 'error' && (
        <div style={{ margin:'8px 16px', background:'rgba(255,200,0,0.08)', border:'1px solid rgba(255,200,0,0.25)', borderRadius:14, padding:'14px 16px' }}>
          <div style={{ color:C.yellow, fontSize:13, fontWeight:600, marginBottom:6 }}>⚠ Push diretto non disponibile</div>
          <div style={{ color:C.sub, fontSize:12, lineHeight:1.55, marginBottom:10 }}>Devi essere loggato su Garmin Connect nello stesso browser. Usa il download TCX — si importa in 2 click.</div>
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

      {/* Action buttons */}
      <div style={{ padding:'12px 16px 28px', display:'flex', gap:10 }}>
        <button onClick={handleDownload} style={{ flex:1, height:54, background:C.blueDim, border:`1px solid ${C.blue}44`, borderRadius:16, color:C.blue, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v13M7 11l5 5 5-5M3 19h18" stroke={C.blue} strokeWidth="2" strokeLinecap="round"/></svg>
          Scarica .tcx
        </button>
        <button onClick={handlePush} disabled={pushing} style={{ flex:1.4, height:54, background: pushing ? 'rgba(255,255,255,0.08)' : accent, border:'none', borderRadius:16, color:'white', fontSize:13, fontWeight:700, cursor: pushing ? 'default' : 'pointer', boxShadow: pushing ? 'none' : `0 4px 20px ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          {pushing ? (
            <><div style={{ width:16, height:16, borderRadius:8, border:'2px solid white', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/> Invio…</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/></svg> Invia a Garmin</>
          )}
        </button>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

Object.assign(window, { GarminBuilderScreen, PRESET_WORKOUTS, generateTCX, downloadTCX, pushToGarminConnect });
