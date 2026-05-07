
// js/home.jsx — HomeScreen + WorkoutScreen
const { useState } = React;

function HomeScreen({ onNav, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const rec = { ...RECOVERY_DATA, score: tweaks.recoveryScore || RECOVERY_DATA.score };
  const recColor = rec.score >= 80 ? C.teal : rec.score >= 60 ? accent : '#FF4466';
  const recLabel = rec.score >= 80 ? 'Eccellente' : rec.score >= 60 ? 'Buono' : 'Basso';
  const recAdvice = rec.score >= 80 ? 'Vai come previsto' : rec.score >= 60 ? 'Vai come previsto' : 'Riduci intensità';

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <DynamicIsland />
      <StatusBar />

      {/* Header */}
      <div style={{ padding:'8px 22px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color: C.sub, fontSize:13, fontWeight:400, marginBottom:2 }}>
            {USER.todayLabel}, {USER.todayDate}
          </div>
          <div style={{ color: C.text, fontSize:24, fontWeight:700, letterSpacing:'-0.5px', lineHeight:1.15 }}>
            Buongiorno, {tweaks.userName || USER.name} 👋
          </div>
          <div style={{ color: C.sub, fontSize:12, marginTop:4 }}>
            Settimana {USER.currentWeek} di {USER.weeksTotal} · <span style={{ color: accent }}>{USER.daysToRace} giorni</span> alla gara
          </div>
        </div>
        {/* Avatar */}
        <div style={{ width:42, height:42, borderRadius:21, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ color:'white', fontSize:16, fontWeight:700 }}>{(tweaks.userName || 'S')[0]}</span>
        </div>
      </div>

      {/* Garmin chip */}
      <div style={{ padding:'0 22px 14px' }}>
        <GarminChip connected={tweaks.garminConnected !== false} syncAgo={USER.garminSyncAgo} />
      </div>

      {/* TODAY'S WORKOUT — hero card */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card onClick={() => onNav('workout', TODAY_WORKOUT)} style={{
          background: `linear-gradient(135deg, #12122A 0%, #0F0F1E 100%)`,
          border: `1px solid ${accent}33`,
          position:'relative', overflow:'hidden',
        }}>
          {/* accent stripe */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accent}, transparent)` }} />
          <div style={{ padding:'18px 18px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <TypeBadge type={TODAY_WORKOUT.type} />
                  <span style={{ color: C.sub, fontSize:11 }}>{USER.todayLabel.toUpperCase()} · OGGI</span>
                </div>
                <div style={{ color: C.text, fontSize:20, fontWeight:700, letterSpacing:'-0.4px', lineHeight:1.2 }}>
                  {TODAY_WORKOUT.title}
                </div>
                <div style={{ color: C.sub, fontSize:13, marginTop:3 }}>{TODAY_WORKOUT.subtitle}</div>
              </div>
              {/* Run icon */}
              <div style={{ width:44, height:44, borderRadius:22, background: accent+'22', border:`1px solid ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M13 4C13 5.1 13.9 6 15 6C16.1 6 17 5.1 17 4C17 2.9 16.1 2 15 2C13.9 2 13 2.9 13 4Z" fill={accent}/>
                  <path d="M5.5 18.5L8 13L11 16L13 10L16.5 18.5" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </div>

            {/* Metrics row */}
            <div style={{ display:'flex', gap:6, marginBottom:16 }}>
              {[
                { val: `${TODAY_WORKOUT.distance} km`, lbl:'Distanza' },
                { val: `${TODAY_WORKOUT.duration} min`, lbl:'Durata' },
                { val: TODAY_WORKOUT.targetPace, lbl:'Ritmo Target' },
              ].map(m => (
                <div key={m.lbl} style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'8px 10px' }}>
                  <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>{m.val}</div>
                  <div style={{ color: C.faint, fontSize:10, marginTop:1 }}>{m.lbl}</div>
                </div>
              ))}
            </div>

            {/* Phase pills */}
            <div style={{ display:'flex', gap:6, marginBottom:16 }}>
              {[
                { label:'Riscaldamento', dur:'10 min', col: C.teal },
                { label:'Tempo', dur:'25 min', col: accent },
                { label:'Defaticamento', dur:'10 min', col: C.teal },
              ].map(p => (
                <div key={p.label} style={{ flex:1, height:4, borderRadius:2, background: p.col+'44', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, background: p.col, opacity:0.6 }} />
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={e => { e.stopPropagation(); onNav('workout', TODAY_WORKOUT); }} style={{
              width:'100%', height:48, background: accent, border:'none', borderRadius:12,
              color:'white', fontSize:15, fontWeight:700, letterSpacing:'0.01em', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:`0 4px 20px ${accent}44`,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              Vedi Dettagli Allenamento
            </button>
          </div>
        </Card>
      </div>

      {/* Recupero strip */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card style={{ cursor:'default' }} onClick={() => onNav('recovery')}>
          <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:16 }}>
            {/* Ring */}
            <div style={{ position:'relative', width:56, height:56, flexShrink:0 }}>
              <RecoveryRing score={rec.score} size={56} stroke={5} />
              <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ color: recColor, fontSize:14, fontWeight:700 }}>{rec.score}</span>
              </div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ color: C.text, fontSize:14, fontWeight:600 }}>Recupero</div>
                <span style={{ background: recColor+'22', color: recColor, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4 }}>{recAdvice}</span>
              </div>
              <div style={{ display:'flex', gap:14, marginTop:6 }}>
                <div><span style={{ color: C.faint, fontSize:11 }}>Sonno </span><span style={{ color: C.text, fontSize:11, fontWeight:600 }}>{rec.sleep}h</span></div>
                <div><span style={{ color: C.faint, fontSize:11 }}>HRV </span><span style={{ color: C.text, fontSize:11, fontWeight:600 }}>{rec.hrv} ms</span></div>
                <div><span style={{ color: C.faint, fontSize:11 }}>FC Rip. </span><span style={{ color: C.text, fontSize:11, fontWeight:600 }}>{rec.restingHR} bpm</span></div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={C.faint} strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
        </Card>
      </div>

      {/* Coach briefing */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:32, height:32, borderRadius:16, background:`linear-gradient(135deg, ${accent}44, ${C.purple}44)`, border:`1px solid ${accent}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z" stroke={accent} strokeWidth="1.5" fill={accent+'22'}/></svg>
              </div>
              <div>
                <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>Briefing del Coach</div>
                <div style={{ color: C.sub, fontSize:11 }}>AI · Aggiornato stamattina</div>
              </div>
            </div>
            <p style={{ color: C.text, fontSize:13, lineHeight:1.6, margin:0 }}>
              Il sonno è ottimo e il recupero è buono: <span style={{ color: recColor, fontWeight:600 }}>{rec.score}</span>. La corsa a tempo di oggi è la tua sessione aerobica chiave — punta a <span style={{ color: accent, fontWeight:600 }}>5:15–5:25/km</span> nella serie principale. Non superare Zona 4; le ripetute di venerdì sono la sessione chiave di questa settimana.
            </p>
          </div>
        </Card>
      </div>

      {/* Week progress */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ color: C.text, fontSize:14, fontWeight:600 }}>Questa Settimana</span>
          <span style={{ color: C.sub, fontSize:12 }}>7 km <span style={{ color: C.faint }}>/ 47 km obiettivo</span></span>
        </div>
        {/* Progress bar */}
        <div style={{ height:3, background:'rgba(255,255,255,0.08)', borderRadius:2, marginBottom:12 }}>
          <div style={{ height:'100%', width:'15%', background: accent, borderRadius:2 }} />
        </div>
        {/* Day dots */}
        <div style={{ display:'flex', gap:4 }}>
          {WEEK_SCHEDULE.map((d, i) => {
            const isDone = d.status === 'done';
            const isToday = d.status === 'today';
            const isRest = d.type === 'rest';
            const m = TYPE_META[d.type];
            return (
              <div key={i} onClick={() => onNav('plan')} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}>
                <div style={{ color: isToday ? C.text : C.faint, fontSize:10, fontWeight: isToday ? 700 : 400 }}>{d.day}</div>
                <div style={{
                  width:32, height:32, borderRadius:16,
                  background: isDone ? C.teal+'22' : isToday ? m.bg : 'rgba(255,255,255,0.05)',
                  border: isToday ? `2px solid ${m.color}` : isDone ? `1px solid ${C.teal}44` : `1px solid ${C.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round"/></svg>
                  ) : isToday ? (
                    <div style={{ width:8, height:8, borderRadius:4, background: m.color }} />
                  ) : isRest ? (
                    <div style={{ width:12, height:2, borderRadius:1, background: C.faint }} />
                  ) : (
                    <div style={{ width:6, height:6, borderRadius:3, background: C.faint }} />
                  )}
                </div>
                {d.dist > 0 && <div style={{ color: C.faint, fontSize:9 }}>{d.dist}k</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key sessions ahead */}
      <div style={{ padding:'0 16px 24px' }}>
        <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>Sessioni Chiave in Arrivo</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {WEEK_SCHEDULE.filter(d => d.key && d.status === 'upcoming').map((d,i) => (
            <Card key={i} onClick={() => onNav('plan')} style={{ cursor:'pointer' }}>
              <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:10, background: TYPE_META[d.type].bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <TypeBadge type={d.type} small />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color: C.text, fontSize:13, fontWeight:600 }}>{d.title}</div>
                  <div style={{ color: C.sub, fontSize:11, marginTop:2 }}>{d.day} · {d.dist > 0 ? `${d.dist} km` : 'Strength'}</div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={C.faint} strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div style={{ height: 12 }} />
    </div>
  );
}

// ─── Workout Detail Screen ────────────────────────────────────────────────────
function WorkoutScreen({ workout, onBack, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const [showAlt, setShowAlt] = useState(false);
  const [sentToGarmin, setSentToGarmin] = useState(false);
  const [marked, setMarked] = useState(false);
  const w = workout || TODAY_WORKOUT;

  const phases = [
    { ...w.warmup,  bg: C.tealDim,  border: C.teal,   icon:'🌡' },
    { ...w.mainSet, bg: accent+'18', border: accent,   icon:'⚡' },
    { ...w.cooldown,bg: C.tealDim,  border: C.teal,   icon:'🌊' },
  ];

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <DynamicIsland />
      <StatusBar />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 14px' }}>
        <button onClick={onBack} style={{ width:36, height:36, borderRadius:18, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div>
          <TypeBadge type={w.type} />
          <div style={{ color: C.text, fontSize:18, fontWeight:700, letterSpacing:'-0.3px', marginTop:3 }}>{w.title}</div>
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ padding:'0 16px 14px', display:'flex', gap:8 }}>
        {[
          { val:`${w.distance} km`, lbl:'Distanza' },
          { val:`${w.duration} min`, lbl:'Durata' },
          { val: w.rpe, lbl:'RPE' },
          { val: w.hrZone, lbl:'Zona FC' },
        ].map(m => (
          <div key={m.lbl} style={{ flex:1, background: C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
            <div style={{ color: C.text, fontSize:13, fontWeight:700 }}>{m.val}</div>
            <div style={{ color: C.faint, fontSize:10, marginTop:2 }}>{m.lbl}</div>
          </div>
        ))}
      </div>

      {/* Phase breakdown */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>Struttura della Sessione</div>
        {/* Timeline bar */}
        <div style={{ display:'flex', gap:2, height:6, borderRadius:3, overflow:'hidden', marginBottom:14 }}>
          <div style={{ flex:10, background: C.teal, borderRadius:3 }} />
          <div style={{ flex:25, background: accent, borderRadius:3 }} />
          <div style={{ flex:10, background: C.teal, borderRadius:3 }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {phases.map((p, i) => (
            <div key={i} style={{ background: p.bg, border:`1px solid ${p.border}33`, borderRadius:14, padding:'14px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span style={{ color: C.text, fontSize:14, fontWeight:600 }}>{p.label}</span>
                </div>
                <span style={{ color: p.border, fontSize:13, fontWeight:600 }}>{p.duration}</span>
              </div>
              <div style={{ color: C.sub, fontSize:12, lineHeight:1.5, marginBottom:6 }}>{p.desc}</div>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'4px 8px' }}>
                  <span style={{ color: C.faint, fontSize:10 }}>Pace </span>
                  <span style={{ color: C.text, fontSize:10, fontWeight:600 }}>{p.pace}</span>
                </div>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'4px 8px' }}>
                  <span style={{ color: C.faint, fontSize:10 }}>Zone </span>
                  <span style={{ color: C.text, fontSize:10, fontWeight:600 }}>{p.zone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coach note */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px' }}>
            <div style={{ color: accent, fontSize:12, fontWeight:600, marginBottom:6, letterSpacing:'0.04em' }}>NOTA DEL COACH</div>
            <p style={{ color: C.text, fontSize:13, lineHeight:1.65, margin:0 }}>{w.coachNote}</p>
          </div>
        </Card>
      </div>

      {/* Mistakes to avoid */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:8 }}>Errori da Evitare</div>
        {w.avoid.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:18, height:18, borderRadius:9, background:'rgba(255,100,80,0.15)', border:'1px solid rgba(255,100,80,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#FF6450" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ color: C.sub, fontSize:13 }}>{a}</span>
          </div>
        ))}
      </div>

      {/* Alt easier version */}
      <div style={{ padding:'0 16px 14px' }}>
        <button onClick={() => setShowAlt(!showAlt)} style={{ width:'100%', background: C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color: C.sub, fontSize:13, fontWeight:500 }}>⬇ Versione Più Facile</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: showAlt ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}><path d="M6 9l6 6 6-6" stroke={C.sub} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        {showAlt && (
          <div style={{ background: C.tealDim, border:`1px solid ${C.teal}33`, borderRadius:'0 0 12px 12px', padding:'12px 14px', marginTop:-4 }}>
            <div style={{ color: C.teal, fontSize:12, fontWeight:600, marginBottom:4 }}>{w.altEasy.title}</div>
            <div style={{ color: C.sub, fontSize:12, lineHeight:1.5 }}>{w.altEasy.desc}</div>
            <div style={{ color: C.faint, fontSize:11, marginTop:4 }}>Total: {w.altEasy.total}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding:'0 16px 24px', display:'flex', gap:10 }}>
        <button onClick={() => setSentToGarmin(true)} style={{
          flex:1, height:50, background: sentToGarmin ? C.blueDim : 'rgba(255,255,255,0.06)',
          border:`1px solid ${sentToGarmin ? C.blue+'66' : C.border}`, borderRadius:12,
          color: sentToGarmin ? C.blue : C.sub, fontSize:13, fontWeight:600, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:6,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={sentToGarmin ? C.blue : C.sub} strokeWidth="1.8" strokeLinejoin="round"/></svg>
          {sentToGarmin ? 'Inviato a Garmin ✓' : 'Invia a Garmin'}
        </button>
        <button onClick={() => setMarked(true)} style={{
          flex:1, height:50, background: marked ? C.tealDim : accent,
          border:`1px solid ${marked ? C.teal+'66' : 'transparent'}`, borderRadius:12,
          color: marked ? C.teal : 'white', fontSize:13, fontWeight:700, cursor:'pointer',
          boxShadow: marked ? 'none' : `0 4px 20px ${accent}44`,
        }}>
          {marked ? '✓ Completato' : 'Segna Completato'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, WorkoutScreen });
