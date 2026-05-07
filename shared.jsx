
// js/screens.jsx — PlanScreen, CoachScreen, ProgressiScreen, RecoveryScreen
const { useState, useEffect, useRef } = React;

// ─── Piano di Allenamento Screen ─────────────────────────────────────────────────────
function PlanScreen({ onNav, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const [selectedDay, setSelectedDay] = useState(1); // Tuesday = index 1
  const phases = ['Costruzione Base','Sviluppo Aerobico','Lavoro a Soglia','Prep. Gara','Scarico'];
  const currentPhase = 'Sviluppo Aerobico';

  const FULL_WEEK = [
    { ...WEEK_SCHEDULE[0], workout: null },
    { ...WEEK_SCHEDULE[1], workout: TODAY_WORKOUT },
    { ...WEEK_SCHEDULE[2], workout: { type:'easy', title:'Corsa Aerobica Facile', distance:8, duration:55, targetPace:'6:20–6:50 /km', hrZone:'Zone 2', subtitle:'Ritmo conversazionale, costruzione base aerobica' } },
    { ...WEEK_SCHEDULE[3], workout: { type:'strength', title:'Forza per Runner', distance:0, duration:45, subtitle:'Glutei, fianchi, core — prevenzione infortuni' } },
    { ...WEEK_SCHEDULE[4], workout: { type:'intervals', title:'5×1km Ripetute', distance:9, duration:55, targetPace:'4:45–4:55 /km', hrZone:'Zone 4–5', subtitle:'Velocità e smaltimento lattato' } },
    { ...WEEK_SCHEDULE[5], workout: { type:'long', title:'Lungo 18km', distance:18, duration:115, targetPace:'6:10–6:40 /km', hrZone:'Zone 2', subtitle:'Resistenza aerobica — tempo sui piedi' } },
    { ...WEEK_SCHEDULE[6], workout: { type:'recovery', title:'Recupero 5km', distance:5, duration:35, targetPace:'6:50–7:30 /km', hrZone:'Zone 1', subtitle:'Recupero attivo, scarica le gambe' } },
  ];

  const sel = FULL_WEEK[selectedDay];
  const w = sel.workout;

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <DynamicIsland />
      <StatusBar />

      {/* Header */}
      <div style={{ padding:'8px 22px 14px' }}>
        <div style={{ color: C.sub, fontSize:13, marginBottom:2 }}>Piano di Allenamento</div>
        <div style={{ color: C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Settimana {USER.currentWeek} di {USER.weeksTotal}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
          {phases.map((p,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:3 }}>
              <div style={{ width: p === currentPhase ? 20 : 6, height:6, borderRadius:3, background: p === currentPhase ? accent : 'rgba(255,255,255,0.15)', transition:'width 0.3s' }} />
            </div>
          ))}
          <span style={{ color: accent, fontSize:11, fontWeight:600, marginLeft:4 }}>{currentPhase}</span>
        </div>
      </div>

      {/* Week selector */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ display:'flex', gap:4 }}>
          {FULL_WEEK.map((d, i) => {
            const active = i === selectedDay;
            const m = TYPE_META[d.type];
            const isDone = d.status === 'done';
            const isToday = d.status === 'today';
            return (
              <div key={i} onClick={() => setSelectedDay(i)} style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer',
              }}>
                <div style={{ color: active ? C.text : C.faint, fontSize:10, fontWeight: active ? 700 : 400 }}>{d.day[0]}</div>
                <div style={{
                  width:'100%', paddingTop:'100%', borderRadius:10, position:'relative',
                  background: active ? m.bg : isDone ? 'rgba(0,207,168,0.12)' : 'rgba(255,255,255,0.05)',
                  border: active ? `2px solid ${m.color}` : isToday ? `1px solid ${m.color}66` : isDone ? `1px solid ${C.teal}44` : `1px solid ${C.border}`,
                  transition:'all 0.15s',
                }}>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {isDone ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round"/></svg>
                    ) : (
                      <div style={{ width:6, height:6, borderRadius:3, background: active ? m.color : C.faint }} />
                    )}
                  </div>
                </div>
                {d.dist > 0 && <div style={{ color: active ? m.color : C.faint, fontSize:9, fontWeight: active ? 600 : 400 }}>{d.dist}k</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div style={{ padding:'0 16px 14px' }}>
        {w ? (
          <Card onClick={() => onNav('workout', w)} style={{ border:`1px solid ${TYPE_META[w.type].color}33` }}>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <TypeBadge type={w.type} />
                  <div style={{ color: C.text, fontSize:18, fontWeight:700, letterSpacing:'-0.3px', marginTop:6 }}>{w.title}</div>
                  <div style={{ color: C.sub, fontSize:12, marginTop:3 }}>{w.subtitle}</div>
                </div>
                <div style={{ width:40, height:40, borderRadius:10, background: TYPE_META[w.type].bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill={TYPE_META[w.type].color}/></svg>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {w.distance > 0 && <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'6px 10px' }}><span style={{ color: C.text, fontSize:12, fontWeight:600 }}>{w.distance} km</span></div>}
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'6px 10px' }}><span style={{ color: C.text, fontSize:12, fontWeight:600 }}>{w.duration} min</span></div>
                {w.targetPace && <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'6px 10px' }}><span style={{ color: C.text, fontSize:12, fontWeight:600 }}>{w.targetPace}</span></div>}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
                <span style={{ color: accent, fontSize:12, fontWeight:600 }}>Vedi Dettagli →</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ cursor:'default' }}>
            <div style={{ padding:'24px', textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🛌</div>
              <div style={{ color: C.text, fontSize:16, fontWeight:600 }}>Rest Day</div>
              <div style={{ color: C.sub, fontSize:13, marginTop:4, lineHeight:1.5 }}>Recovery is training. Sleep, eat well, and let adaptations happen.</div>
            </div>
          </Card>
        )}
      </div>

      {/* Weekly load summary */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>Carico Settimanale</div>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', gap:0, marginBottom:12 }}>
              {[
                { label:'Volume', val:'47 km', sub:'↑ 18%' },
                { label:'Corse', val:'5', sub:'+ 1 forza' },
                { label:'Lungo', val:'18 km', sub:'Record settimana' },
              ].map((s,i) => (
                <div key={i} style={{ flex:1, borderRight: i<2 ? `1px solid ${C.border}` : 'none', paddingRight:12, paddingLeft: i>0 ? 12 : 0 }}>
                  <div style={{ color: C.faint, fontSize:10, marginBottom:3 }}>{s.label}</div>
                  <div style={{ color: C.text, fontSize:16, fontWeight:700 }}>{s.val}</div>
                  <div style={{ color: accent, fontSize:10, marginTop:2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            {/* Load balance bar */}
            <div style={{ color: C.faint, fontSize:10, marginBottom:6 }}>Bilanciamento Carico</div>
            <div style={{ display:'flex', gap:3, height:8 }}>
              {[{w:45,c:C.teal,l:'Easy'},{w:30,c:accent,l:'Tempo'},{w:15,c:C.purple,l:'Hard'},{w:10,c:'rgba(255,255,255,0.2)',l:'Rest'}].map(b => (
                <div key={b.l} style={{ flex:b.w, height:'100%', background:b.c, borderRadius:2, opacity:0.8 }} title={b.l} />
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              {[{c:C.teal,l:'Facile 45%'},{c:accent,l:'Tempo 30%'},{c:C.purple,l:'Duro 15%'}].map(b => (
                <div key={b.l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:3, background:b.c }} />
                  <span style={{ color: C.faint, fontSize:10 }}>{b.l}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Race countdown */}
      <div style={{ padding:'0 16px 24px' }}>
        <div style={{ background:`linear-gradient(135deg, ${accent}18, ${C.purple}12)`, border:`1px solid ${accent}33`, borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:28 }}>🏁</div>
          <div>
            <div style={{ color: C.text, fontSize:14, fontWeight:600 }}>{USER.raceName}</div>
            <div style={{ color: accent, fontSize:22, fontWeight:800, letterSpacing:'-0.5px' }}>{USER.daysToRace} days</div>
            <div style={{ color: C.sub, fontSize:11 }}>Obiettivo: {USER.goal} · PB attuale: {USER.pb}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Coach Chat Screen ────────────────────────────────────────────────────────
function CoachScreen({ tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const [messages, setMessages] = useState(CHAT_HISTORY);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [selectedSug, setSelectedSug] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      const el = bottomRef.current.parentElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const msg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role:'user', text: msg }]);
    setTyping(true);
    setTimeout(() => {
      const reply = COACH_RESPONSES[msg] || "That's a great question. Based on your current training data and recovery trends, I'd recommend staying consistent with your planned sessions this week. If you're feeling any unusual fatigue, err on the side of caution and reduce intensity rather than skipping sessions altogether.";
      setTyping(false);
      setMessages(prev => [...prev, { role:'coach', text: reply }]);
    }, 1600);
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <DynamicIsland />
      <StatusBar />

      {/* Header */}
      <div style={{ padding:'8px 22px 14px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:22, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z" fill="white" opacity="0.9"/></svg>
            <div style={{ position:'absolute', bottom:1, right:1, width:12, height:12, borderRadius:6, background: C.teal, border:'2px solid #06060E' }} />
          </div>
          <div>
            <div style={{ color: C.text, fontSize:17, fontWeight:700 }}>Coach AI</div>
            <div style={{ color: C.teal, fontSize:11, fontWeight:500 }}>● Online · Basato sui tuoi dati Garmin</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding:'0 16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom:12 }}>
            {m.role === 'coach' && (
              <div style={{ width:28, height:28, borderRadius:14, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8, marginTop:2 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z"/></svg>
              </div>
            )}
            <div style={{
              maxWidth:'75%',
              background: m.role === 'user' ? accent : C.card2,
              border: m.role === 'user' ? 'none' : `1px solid ${C.border2}`,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              padding:'10px 14px',
            }}>
              <p style={{ color: C.text, fontSize:13, lineHeight:1.6, margin:0 }}>{m.text}</p>
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:14, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z"/></svg>
            </div>
            <div style={{ background: C.card2, border:`1px solid ${C.border2}`, borderRadius:'4px 16px 16px 16px', padding:'10px 16px', display:'flex', gap:5, alignItems:'center' }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width:6, height:6, borderRadius:3, background: C.sub, animation:`bounce 1s ${j*0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ padding:'8px 16px 6px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
          {SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{
              flexShrink:0, background: C.card2, border:`1px solid ${C.border2}`,
              borderRadius:20, padding:'6px 12px', color: C.sub, fontSize:11, fontWeight:500,
              cursor:'pointer', whiteSpace:'nowrap',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'6px 16px 28px', flexShrink:0, display:'flex', gap:8 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Chiedi qualcosa al tuo coach..."
          style={{
            flex:1, height:46, background: C.card2, border:`1px solid ${C.border2}`,
            borderRadius:23, padding:'0 18px', color: C.text, fontSize:13,
            outline:'none', fontFamily:'DM Sans, sans-serif',
          }} />
        <button onClick={() => sendMessage(input)} style={{
          width:46, height:46, borderRadius:23, background: accent, border:'none',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 14px ${accent}44`, flexShrink:0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>

      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

// ─── Progressi Screen ──────────────────────────────────────────────────────────
function ProgressiScreen({ tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const p = PROGRESS_DATA;

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <DynamicIsland />
      <StatusBar />
      <div style={{ padding:'8px 22px 16px' }}>
        <div style={{ color: C.sub, fontSize:13, marginBottom:2 }}>Progressi</div>
        <div style={{ color: C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Il Tuo Percorso</div>
      </div>

      {/* Race readiness hero */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ background:`linear-gradient(135deg, ${accent}20 0%, ${C.purple}14 100%)`, border:`1px solid ${accent}33`, borderRadius:18, padding:'18px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ color: C.sub, fontSize:11, fontWeight:500, letterSpacing:'0.06em', marginBottom:6 }}>PRONTEZZA GARA</div>
              <div style={{ color: C.text, fontSize:42, fontWeight:800, letterSpacing:'-1px', lineHeight:1 }}>{p.readinessScore}<span style={{ fontSize:18, color: C.sub, fontWeight:500 }}>%</span></div>
              <div style={{ color: C.sub, fontSize:12, marginTop:6 }}>Arrivo previsto <span style={{ color: accent, fontWeight:600 }}>{p.projectedFinish}</span></div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color: accent, fontSize:28, fontWeight:800 }}>{p.raceCountdown}</div>
              <div style={{ color: C.sub, fontSize:11 }}>giorni alla gara</div>
            </div>
          </div>
          {/* Readiness bar */}
          <div style={{ marginTop:16, height:6, background:'rgba(255,255,255,0.1)', borderRadius:3 }}>
            <div style={{ height:'100%', width:`${p.readinessScore}%`, background:`linear-gradient(90deg, ${accent}, ${C.yellow})`, borderRadius:3 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={{ color: C.faint, fontSize:10 }}>Non pronta</span>
            <span style={{ color: C.faint, fontSize:10 }}>Pronta</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ padding:'0 16px 14px', display:'flex', gap:8 }}>
        {[
          { label:'Costanza', val:`${p.consistency}%`, sub:'Ultime 4 settimane', color: C.teal },
          { label:'Aderenza', val:`${p.adherence}%`, sub:'Sessioni eseguite', color: accent },
          { label:'Corse Totali', val:`${p.totalRuns}`, sub:'Questo ciclo', color: C.blue },
        ].map(s => (
          <Card key={s.label} style={{ flex:1, cursor:'default' }}>
            <div style={{ padding:'12px 12px', textAlign:'center' }}>
              <div style={{ color: s.color, fontSize:20, fontWeight:800 }}>{s.val}</div>
              <div style={{ color: C.text, fontSize:11, fontWeight:600, marginTop:2 }}>{s.label}</div>
              <div style={{ color: C.faint, fontSize:10, marginTop:1 }}>{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly mileage chart */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ color: C.text, fontSize:14, fontWeight:600 }}>Chilometraggio Settimanale</div>
              <div style={{ color: C.sub, fontSize:12 }}>Questa settimana <span style={{ color: accent, fontWeight:700 }}>{p.weeklyMiles[p.weeklyMiles.length-1]} km</span></div>
            </div>
            <BarChart data={p.weeklyMiles} labels={p.weekLabels} color={accent} height={64} />
          </div>
        </Card>
      </div>

      {/* Pace trend */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ color: C.text, fontSize:14, fontWeight:600 }}>Tendenza Ritmo Medio</div>
              <div style={{ color: C.teal, fontSize:11, fontWeight:600 }}>↓ In miglioramento</div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div>
                <div style={{ color: C.faint, fontSize:11, marginBottom:4 }}>7 settimane fa</div>
                <div style={{ color: C.sub, fontSize:16, fontWeight:700 }}>6:06/km</div>
              </div>
              <SparkLine data={p.paceHistory.map(v => -v)} color={C.teal} width={160} height={40} />
              <div style={{ textAlign:'right' }}>
                <div style={{ color: C.faint, fontSize:11, marginBottom:4 }}>Questa settimana</div>
                <div style={{ color: C.teal, fontSize:16, fontWeight:700 }}>5:43/km</div>
              </div>
            </div>
            <div style={{ color: C.faint, fontSize:11, marginTop:8 }}>−23 sec/km di miglioramento in 7 settimane</div>
          </div>
        </Card>
      </div>

      {/* Long run progression */}
      <div style={{ padding:'0 16px 24px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:12 }}>Long Run Progressiion</div>
            <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:60 }}>
              {[10, 12, 14, 12, 16, 14, 18].map((km, i) => (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ width:'100%', height: (km/18)*52, background: i === 6 ? C.blue : 'rgba(77,158,255,0.25)', borderRadius:'4px 4px 0 0', minHeight:4 }} />
                  <div style={{ color: C.faint, fontSize:9 }}>{km}</div>
                </div>
              ))}
            </div>
            <div style={{ color: C.faint, fontSize:11, marginTop:4 }}>km per lungo · Obiettivo: 21.1km gara</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Recovery Screen ──────────────────────────────────────────────────────────
function RecoveryScreen({ tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const rec = { ...RECOVERY_DATA, score: tweaks.recoveryScore || RECOVERY_DATA.score };
  const recColor = rec.score >= 80 ? C.teal : rec.score >= 60 ? accent : '#FF4466';
  const recLabel = rec.score >= 80 ? 'Eccellente' : rec.score >= 60 ? 'Buono' : 'Basso';

  const RECOMMENDATIONS = [
    { id:'go_as_planned', icon:'✅', label:'Vai come Previsto', desc:'Il recupero è sufficiente. Esegui l\'allenamento pianificato.' },
    { id:'reduce',        icon:'⬇',  label:'Riduci Intensità', desc:'Sostituisci la sessione di oggi con la versione più facile.' },
    { id:'easy_only',     icon:'🚶', label:'Solo Corsa Facile', desc:'Solo Zona 1–2, massimo 20–30 min.' },
    { id:'rest',          icon:'🛌', label:'Riposo / Mobilità', desc:'Riposo completo o solo lavoro di mobilità leggera.' },
  ];

  const recId = rec.score >= 80 ? 'go_as_planned' : rec.score >= 60 ? 'go_as_planned' : rec.score >= 45 ? 'reduce' : 'rest';
  const activeRec = RECOMMENDATIONS.find(r => r.id === recId);

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <DynamicIsland />
      <StatusBar />
      <div style={{ padding:'8px 22px 16px' }}>
        <div style={{ color: C.sub, fontSize:13, marginBottom:2 }}>Recupero e Prontezza</div>
        <div style={{ color: C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Stato Odierno</div>
      </div>

      {/* Big recovery score */}
      <div style={{ padding:'0 16px 14px' }}>
        <Card style={{ cursor:'default', background:`linear-gradient(135deg, ${recColor}12, #0D0D1C)` }}>
          <div style={{ padding:'24px 20px', display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative', width:96, height:96, flexShrink:0 }}>
              <RecoveryRing score={rec.score} size={96} stroke={8} />
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ color: recColor, fontSize:26, fontWeight:800, lineHeight:1 }}>{rec.score}</div>
                <div style={{ color: C.faint, fontSize:9, marginTop:1 }}>/ 100</div>
              </div>
            </div>
            <div>
              <div style={{ color: recColor, fontSize:20, fontWeight:700, marginBottom:4 }}>{recLabel}</div>
              <div style={{ color: C.sub, fontSize:13, lineHeight:1.5 }}>Basato su sonno, HRV, frequenza cardiaca a riposo e carico di allenamento.</div>
              <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8, background: C.blueDim, border:`1px solid ${C.blue}33`, borderRadius:8, padding:'5px 10px', display:'inline-flex' }}>
                <div style={{ width:6, height:6, borderRadius:3, background: C.blue }} />
                <span style={{ color: C.blue, fontSize:11, fontWeight:500 }}>Dati Garmin · Sincronizzati {USER.garminSyncAgo}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Garmin metrics */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>Metriche Garmin</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'HRV', val:`${rec.hrv} ms`, trend:'↑ +4', good:true, icon:'💓' },
            { label:'FC a Riposo', val:`${rec.restingHR} bpm`, trend:'→ stable', good:null, icon:'❤' },
            { label:'Sonno', val:`${rec.sleep}h`, trend:`${rec.sleepQuality}`, good:true, icon:'🌙' },
            { label:'Carico Allena.', val: rec.trainingLoad, trend:'Gestibile', good:true, icon:'⚡' },
          ].map(m => (
            <Card key={m.label} style={{ cursor:'default' }}>
              <div style={{ padding:'14px 14px' }}>
                <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
                <div style={{ color: C.text, fontSize:16, fontWeight:700 }}>{m.val}</div>
                <div style={{ color: C.faint, fontSize:11, marginTop:1 }}>{m.label}</div>
                <div style={{ color: m.good === true ? C.teal : m.good === false ? '#FF6450' : C.sub, fontSize:11, fontWeight:500, marginTop:4 }}>{m.trend}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ padding:'0 16px 14px' }}>
        <div style={{ color: C.text, fontSize:14, fontWeight:600, marginBottom:10 }}>Raccomandazione Odierna</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {RECOMMENDATIONS.map(r => {
            const isActive = r.id === recId;
            return (
              <div key={r.id} style={{
                display:'flex', alignItems:'center', gap:12,
                background: isActive ? recColor+'18' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? recColor+'44' : C.border}`,
                borderRadius:14, padding:'12px 14px',
                transition:'all 0.15s',
              }}>
                <div style={{ width:36, height:36, borderRadius:18, background: isActive ? recColor+'22' : 'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  {r.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color: isActive ? recColor : C.sub, fontSize:13, fontWeight: isActive ? 700 : 500 }}>{r.label}</div>
                  <div style={{ color: C.faint, fontSize:11, marginTop:2, lineHeight:1.4 }}>{r.desc}</div>
                </div>
                {isActive && <div style={{ width:8, height:8, borderRadius:4, background: recColor, flexShrink:0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Overload risk */}
      <div style={{ padding:'0 16px 24px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ color: C.text, fontSize:13, fontWeight:600, marginBottom:10 }}>Carico Settimanale Trend</div>
            <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:40, marginBottom:6 }}>
              {[55,60,58,65,62,70,68].map((v,i) => (
                <div key={i} style={{ flex:1, height:`${(v/70)*100}%`, background: i === 6 ? recColor : 'rgba(255,255,255,0.12)', borderRadius:'3px 3px 0 0', opacity: i === 6 ? 1 : 0.6 }} />
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color: C.faint, fontSize:10 }}>7 days ago</span>
              <span style={{ color: recColor, fontSize:10, fontWeight:600 }}>Today</span>
            </div>
            <div style={{ marginTop:10, color: C.sub, fontSize:12, lineHeight:1.5 }}>
              Il carico è <span style={{ color: recColor, fontWeight:600 }}>moderato</span> e la tendenza è stabile. Nessun rischio di sovraccarico. Le ripetute di venerdì e il lungo di sabato sono confermati.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { PlanScreen, CoachScreen, ProgressiScreen, RecoveryScreen });
