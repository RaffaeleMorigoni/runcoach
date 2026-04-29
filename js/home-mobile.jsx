// js/home-mobile.jsx — Dashboard ricca + Workout Detail
const { useState, useEffect } = React;

function HomeScreenM({ onNav, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const rec = { ...RECOVERY_DATA, score: tweaks.recoveryScore ?? RECOVERY_DATA.score };
  const recColor = rec.score >= 80 ? C.teal : rec.score >= 60 ? accent : '#FF4466';
  const recLabel = rec.score >= 80 ? 'Eccellente' : rec.score >= 60 ? 'Buono' : 'Basso';

  // Progress %
  const weekProgress = 0; // lunedì riposo = 0km fatti, 23km totali
  const planProgress = Math.round(((USER.currentWeek-1) / USER.weeksTotal) * 100);

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      {/* Greeting */}
      <div style={{ padding:'10px 20px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ color: C.sub, fontSize:12, marginBottom:2 }}>Martedì, 22 Aprile</div>
          <div style={{ color: C.text, fontSize:24, fontWeight:700, letterSpacing:'-0.5px', lineHeight:1.15 }}>
            Ciao, {tweaks.userName || USER.name} 👋
          </div>
        </div>
        <div style={{ width:46, height:46, borderRadius:23, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ color:'white', fontSize:18, fontWeight:700 }}>{(tweaks.userName || 'S')[0]}</span>
        </div>
      </div>

      {/* HERO — Race countdown */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{
          position:'relative', overflow:'hidden',
          background:`linear-gradient(135deg, ${accent}22 0%, ${C.purple}18 60%, #0D0D1E 100%)`,
          border:`1px solid ${accent}44`, borderRadius:20, padding:'18px 18px 16px',
        }}>
          {/* Decorative running figure */}
          <svg style={{ position:'absolute', right:-10, bottom:-14, opacity:0.14 }} width="130" height="130" viewBox="0 0 24 24" fill="none">
            <path d="M13 4C13 5.1 13.9 6 15 6C16.1 6 17 5.1 17 4C17 2.9 16.1 2 15 2C13.9 2 13 2.9 13 4Z" fill={accent}/>
            <path d="M5.5 18.5L8 13L11 16L13 10L16.5 18.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>

          <div style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <div style={{ width:6, height:6, borderRadius:3, background:accent, boxShadow:`0 0 8px ${accent}` }}/>
              <span style={{ color:accent, fontSize:10, fontWeight:700, letterSpacing:'0.1em' }}>PROSSIMA GARA</span>
            </div>
            <div style={{ color:C.text, fontSize:20, fontWeight:800, letterSpacing:'-0.4px', lineHeight:1.1 }}>{USER.raceName}</div>
            <div style={{ color:C.sub, fontSize:12, marginTop:3 }}>{USER.raceDate} · 42.195 km</div>

            {/* Countdown */}
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:14 }}>
              <span style={{ color:accent, fontSize:52, fontWeight:800, letterSpacing:'-0.03em', lineHeight:0.9, fontVariantNumeric:'tabular-nums' }}>{USER.daysToRace}</span>
              <span style={{ color:C.sub, fontSize:14, fontWeight:500 }}>giorni</span>
            </div>

            {/* Plan progress bar */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:6 }}>
                <span style={{ color:C.sub }}>Piano Settimana {USER.currentWeek}/{USER.weeksTotal}</span>
                <span style={{ color:C.text, fontWeight:600 }}>{planProgress}%</span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${planProgress}%`, background:`linear-gradient(90deg, ${accent}, ${C.purple})`, borderRadius:3 }}/>
              </div>
              <div style={{ display:'flex', gap:5, marginTop:8 }}>
                <span style={{ background:`${accent}22`, color:accent, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:'0.04em' }}>FASE TAPER</span>
                <span style={{ background:'rgba(0,207,168,0.15)', color:C.teal, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:'0.04em' }}>PRONTEZZA 84%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats grid — 4 tiles */}
      <div style={{ padding:'0 14px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {/* Recovery */}
        <Card onClick={()=>onNav('recovery')} style={{ cursor:'pointer' }}>
          <div style={{ padding:'14px 14px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ position:'relative', width:42, height:42 }}>
                <RecoveryRing score={rec.score} size={42} stroke={4.5} />
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ color:recColor, fontSize:12, fontWeight:800 }}>{rec.score}</span>
                </div>
              </div>
              <div>
                <div style={{ color:C.faint, fontSize:10, fontWeight:600, letterSpacing:'0.05em' }}>RECUPERO</div>
                <div style={{ color:recColor, fontSize:13, fontWeight:700 }}>{recLabel}</div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <div><span style={{ color:C.faint }}>💤 </span><span style={{ color:C.text, fontWeight:600 }}>{rec.sleep}h</span></div>
              <div><span style={{ color:C.faint }}>♡ </span><span style={{ color:C.text, fontWeight:600 }}>{rec.hrv}</span></div>
            </div>
          </div>
        </Card>

        {/* Weekly load */}
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 14px 12px' }}>
            <div style={{ color:C.faint, fontSize:10, fontWeight:600, letterSpacing:'0.05em', marginBottom:4 }}>QUESTA SETTIMANA</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
              <span style={{ color:C.text, fontSize:22, fontWeight:800, letterSpacing:'-0.02em' }}>0</span>
              <span style={{ color:C.sub, fontSize:11 }}>/ 23 km</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:2, marginBottom:8 }}>
              <div style={{ height:'100%', width:'0%', background:accent, borderRadius:2 }}/>
            </div>
            {/* mini bars */}
            <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:18 }}>
              {[0,6,0,5,0,14,4].map((km,i)=>{
                const isToday = i===1;
                return (
                  <div key={i} style={{ flex:1, height:`${(km/14)*100||6}%`, minHeight:3,
                    background: km===0 ? 'rgba(255,255,255,0.08)' : isToday ? accent : `${accent}55`,
                    borderRadius:1.5,
                  }}/>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Strava integration */}
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 14px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#FC4C02"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
              <span style={{ color:'#FC4C02', fontSize:10, fontWeight:700, letterSpacing:'0.05em' }}>STRAVA</span>
            </div>
            <div style={{ color:C.text, fontSize:20, fontWeight:800, letterSpacing:'-0.02em' }}>487 km</div>
            <div style={{ color:C.sub, fontSize:10, marginTop:2 }}>Quest'anno · 43 corse</div>
            <div style={{ display:'flex', gap:4, marginTop:8 }}>
              <div style={{ flex:1, height:3, background:`${accent}99`, borderRadius:2 }}/>
              <div style={{ flex:1, height:3, background:`${accent}66`, borderRadius:2 }}/>
              <div style={{ flex:1, height:3, background:`${accent}33`, borderRadius:2 }}/>
              <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.1)', borderRadius:2 }}/>
            </div>
          </div>
        </Card>

        {/* Pace trend */}
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 14px 12px' }}>
            <div style={{ color:C.faint, fontSize:10, fontWeight:600, letterSpacing:'0.05em', marginBottom:4 }}>RITMO MEDIO</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <span style={{ color:C.text, fontSize:22, fontWeight:800, letterSpacing:'-0.02em' }}>5:42</span>
              <span style={{ color:C.sub, fontSize:11 }}>/km</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M7 17l5-5 5 5M7 7l5-5 5 5" stroke={C.teal} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ color:C.teal, fontSize:10, fontWeight:600 }}>−12 sec vs 3 mesi fa</span>
            </div>
            <div style={{ marginTop:8 }}>
              <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none">
                <polyline points="0,14 17,12 34,10 50,11 67,8 83,6 100,7" stroke={C.teal} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* PB + Stime Riegel */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ color:C.text, fontSize:15, fontWeight:700 }}>I Tuoi Record & Stime</span>
          <span style={{ color:C.faint, fontSize:10 }}>Formula Riegel</span>
        </div>

        {/* PB tiles */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
          {['5k','10k','21k'].map(d => {
            const p = PB[d];
            return (
              <div key={d} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
                <div style={{ color:C.faint, fontSize:9, fontWeight:700, letterSpacing:'0.08em', marginBottom:2 }}>PB {d.toUpperCase()}</div>
                <div style={{ color:C.text, fontSize:15, fontWeight:800, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums' }}>{p.time}</div>
                <div style={{ color:C.sub, fontSize:9, marginTop:1 }}>{p.pace}</div>
              </div>
            );
          })}
        </div>

        {/* Stime gara card */}
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:14 }}>🎯</span>
                <span style={{ color:C.text, fontSize:13, fontWeight:700 }}>Stima Tempo Lucca 21k</span>
              </div>
              <span style={{ background:`${accent}22`, color:accent, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>
                TARGET {USER.raceTargetTime}
              </span>
            </div>

            {/* 3 stime in riga */}
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {[
                { key:'conservative', label:'Conservativa', color:C.sub, est:RACE_ESTIMATES.conservative },
                { key:'realistic',    label:'Realistica',   color:accent, est:RACE_ESTIMATES.realistic, highlight:true },
                { key:'optimistic',   label:'Ottimistica',  color:C.teal, est:RACE_ESTIMATES.optimistic },
              ].map(s => (
                <div key={s.key} style={{
                  flex:1, background: s.highlight ? `${accent}14` : 'rgba(255,255,255,0.03)',
                  border: s.highlight ? `1.5px solid ${accent}55` : `1px solid ${C.border}`,
                  borderRadius:10, padding:'10px 6px', textAlign:'center',
                }}>
                  <div style={{ color:s.color, fontSize:9, fontWeight:700, letterSpacing:'0.04em', marginBottom:3, textTransform:'uppercase' }}>{s.label}</div>
                  <div style={{ color:C.text, fontSize:14, fontWeight:800, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums' }}>{s.est.time}</div>
                  <div style={{ color:C.faint, fontSize:9, marginTop:1 }}>{s.est.pace}</div>
                </div>
              ))}
            </div>

            {/* Gap con target */}
            {(() => {
              const targetSec = 7080; // 1:58:00
              const realSec = RACE_ESTIMATES.realistic.seconds;
              const gap = realSec - targetSec;
              const mins = Math.floor(Math.abs(gap)/60);
              const secs = Math.abs(gap)%60;
              const isAhead = gap < 0;
              return (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'rgba(255,255,255,0.03)', borderRadius:10, fontSize:12 }}>
                  <div style={{ width:6, height:6, borderRadius:3, background: isAhead?C.teal:accent }}/>
                  <span style={{ color:C.sub }}>Stima vs target:</span>
                  <span style={{ color: isAhead?C.teal:accent, fontWeight:700 }}>
                    {isAhead ? '−' : '+'}{mins}:{String(secs).padStart(2,'0')}
                  </span>
                  <span style={{ color:C.faint, fontSize:11, marginLeft:'auto' }}>
                    {isAhead ? 'sei sotto target' : 'serve spingere'}
                  </span>
                </div>
              );
            })()}
          </div>
        </Card>
      </div>

      {/* Strategia Gara + Piano Gel */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:700, marginBottom:10 }}>Strategia Gara Lucca</div>

        <Card style={{ cursor:'default', marginBottom:8 }}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <span style={{ fontSize:14 }}>🎯</span>
              <span style={{ color:C.text, fontSize:13, fontWeight:700 }}>Negative Split · Target {RACE_STRATEGY.target}</span>
            </div>
            {/* Timeline fasi */}
            <div style={{ position:'relative', paddingLeft:14 }}>
              <div style={{ position:'absolute', left:4, top:6, bottom:6, width:2, background:'rgba(255,255,255,0.08)', borderRadius:1 }}/>
              {RACE_STRATEGY.phases.map((p,i) => {
                const colors = [C.teal, accent, accent, C.purple];
                return (
                  <div key={i} style={{ position:'relative', marginBottom:i<3?12:0 }}>
                    <div style={{ position:'absolute', left:-14, top:4, width:10, height:10, borderRadius:5, background:colors[i], boxShadow:`0 0 0 3px #06060E` }}/>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ color:C.text, fontSize:12, fontWeight:700 }}>km {p.km}</span>
                      <span style={{ color:colors[i], fontSize:12, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{p.pace}/km</span>
                    </div>
                    <div style={{ color:C.sub, fontSize:11, lineHeight:1.4 }}>{p.note}</div>
                  </div>
                );
              })}
            </div>
            {/* Scarpa */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, padding:'8px 10px', background:'rgba(255,255,255,0.03)', borderRadius:8 }}>
              <span style={{ fontSize:14 }}>👟</span>
              <span style={{ color:C.sub, fontSize:11 }}>Scarpe</span>
              <span style={{ color:C.text, fontSize:11, fontWeight:600, marginLeft:'auto' }}>{RACE_STRATEGY.shoes}</span>
            </div>
          </div>
        </Card>

        {/* Piano gel */}
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
              <span style={{ fontSize:14 }}>⚡</span>
              <span style={{ color:C.text, fontSize:13, fontWeight:700 }}>Piano Nutrizione Gel</span>
            </div>
            {GEL_PLAN.map((g,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<GEL_PLAN.length-1?`1px solid ${C.border}`:'none' }}>
                <div style={{ width:28, textAlign:'center', color:accent, fontSize:11, fontWeight:800 }}>
                  {i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{g.when}</div>
                  <div style={{ color:C.sub, fontSize:10, marginTop:1 }}>{g.type} · {g.note}</div>
                </div>
              </div>
            ))}
            <div style={{ color:C.faint, fontSize:10, marginTop:8, fontStyle:'italic' }}>💧 Sempre acqua con ogni gel</div>
          </div>
        </Card>
      </div>

      {/* Today's workout HERO */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ color:C.text, fontSize:15, fontWeight:700 }}>Allenamento di Oggi</span>
          <span style={{ background:`${accent}22`, color:accent, fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:4, letterSpacing:'0.06em' }}>MARTEDÌ</span>
        </div>
        <Card onClick={() => onNav('workout', TODAY_WORKOUT)} style={{
          background:'linear-gradient(135deg, #14142A 0%, #0E0E1E 100%)',
          border:`1px solid ${accent}33`, position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${accent}, transparent)` }} />
          <div style={{ padding:'16px 16px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ flex:1 }}>
                <TypeBadge type={TODAY_WORKOUT.type} />
                <div style={{ color: C.text, fontSize:17, fontWeight:700, letterSpacing:'-0.3px', lineHeight:1.2, marginTop:6 }}>{TODAY_WORKOUT.title}</div>
                <div style={{ color: C.sub, fontSize:12, marginTop:3, lineHeight:1.4 }}>{TODAY_WORKOUT.subtitle}</div>
              </div>
              <div style={{ width:42, height:42, borderRadius:21, background:`${accent}22`, border:`1px solid ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              {[{val:`${TODAY_WORKOUT.distance} km`,lbl:'Distanza'},{val:`${TODAY_WORKOUT.duration} min`,lbl:'Durata'},{val:TODAY_WORKOUT.targetPace.split(' ')[0],lbl:'Ritmo'}].map(m => (
                <div key={m.lbl} style={{ flex:1, background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'8px 10px' }}>
                  <div style={{ color:C.text, fontSize:12, fontWeight:700 }}>{m.val}</div>
                  <div style={{ color:C.faint, fontSize:10, marginTop:1 }}>{m.lbl}</div>
                </div>
              ))}
            </div>
            <button style={{ width:'100%', height:46, background:accent, border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 16px ${accent}44` }}>
              Inizia Allenamento →
            </button>
          </div>
        </Card>
      </div>

      {/* Coach briefing */}
      <div style={{ padding:'0 14px 14px' }}>
        <Card style={{ cursor:'pointer' }} onClick={() => onNav('coach')}>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:34, height:34, borderRadius:17, background:`linear-gradient(135deg, ${accent}44, ${C.purple}44)`, border:`1px solid ${accent}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z" stroke={accent} strokeWidth="1.5" fill={`${accent}22`}/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:C.text, fontSize:14, fontWeight:600 }}>Briefing del Coach</div>
                <div style={{ color:C.sub, fontSize:11 }}>AI · Aggiornato stamattina</div>
              </div>
              <span style={{ color:accent, fontSize:11, fontWeight:600 }}>Chiedi →</span>
            </div>
            <p style={{ color:C.text, fontSize:13, lineHeight:1.6, margin:0 }}>
              Siamo a <b style={{ color:accent }}>{USER.daysToRace} giorni</b> da Lucca. Oggi solo 6km facili — il lavoro è fatto. Recupero <b style={{ color:recColor }}>{rec.score}</b>, gambe cariche: <b>resta nella zona 2</b> e non farti tentare dal ritmo.
            </p>
          </div>
        </Card>
      </div>

      {/* Week strip */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ color:C.text, fontSize:15, fontWeight:700 }}>La Tua Settimana</span>
          <span onClick={()=>onNav('plan')} style={{ color:accent, fontSize:12, fontWeight:600, cursor:'pointer' }}>Vedi tutto →</span>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          {WEEK_SCHEDULE.map((d, i) => {
            const isDone = d.status==='done', isToday = d.status==='today';
            const isRest = d.type==='rest';
            const m = TYPE_META[d.type];
            const dayShort = ['L','M','M','G','V','S','D'][i];
            return (
              <div key={i} onClick={() => onNav('plan')} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}>
                <div style={{ color:isToday?m.color:isDone?C.teal:C.faint, fontSize:10, fontWeight:isToday?700:500 }}>{dayShort}</div>
                <div style={{
                  width:'100%', aspectRatio:'1/1', borderRadius:10,
                  background: isToday?m.bg : isDone?'rgba(0,207,168,0.1)' : 'rgba(255,255,255,0.04)',
                  border: isToday?`2px solid ${m.color}` : isDone?`1px solid ${C.teal}44` : `1px solid ${C.border}`,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
                }}>
                  {isDone ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={C.teal} strokeWidth="3" strokeLinecap="round"/></svg>
                   : isRest ? <div style={{ fontSize:12 }}>💤</div>
                   : <>
                       <div style={{ width:5, height:5, borderRadius:3, background:m.color }}/>
                       <div style={{ color:isToday?m.color:C.text, fontSize:10, fontWeight:700 }}>{d.dist}k</div>
                     </>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ padding:'0 14px 24px' }}>
        <div style={{ display:'flex', gap:8 }}>
          <Card onClick={()=>onNav('garmin')} style={{ flex:1 }}>
            <div style={{ padding:'14px 12px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:C.blueDim, border:`1px solid ${C.blue}44`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={C.blue} strokeWidth="1.8" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>Invia a Garmin</div>
                <div style={{ color:C.faint, fontSize:10 }}>Forerunner 55</div>
              </div>
            </div>
          </Card>
          <Card onClick={()=>onNav('coach')} style={{ flex:1 }}>
            <div style={{ padding:'14px 12px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${accent}22`, border:`1px solid ${accent}44`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4" stroke={accent} strokeWidth="1.5"/></svg>
              </div>
              <div>
                <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>Chiedi al Coach</div>
                <div style={{ color:C.faint, fontSize:10 }}>AI personalizzato</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Workout Detail ───────────────────────────────────────────────────────────
function WorkoutScreenM({ workout, onBack, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const [showAlt, setShowAlt] = useState(false);
  const [sentToGarmin, setSentToGarmin] = useState(false);
  const [marked, setMarked] = useState(false);
  const w = workout || TODAY_WORKOUT;

  const phases = [
    { ...w.warmup,   bg:C.tealDim,    border:C.teal,  icon:'🌡' },
    { ...w.mainSet,  bg:`${accent}18`, border:accent,  icon:'⚡' },
    { ...w.cooldown, bg:C.tealDim,    border:C.teal,  icon:'🌊' },
  ];

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px 14px' }}>
        <button onClick={onBack} style={{ width:44, height:44, borderRadius:22, background:'rgba(255,255,255,0.07)', border:`1px solid ${C.border}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={C.text} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <div>
          <TypeBadge type={w.type} />
          <div style={{ color:C.text, fontSize:20, fontWeight:700, letterSpacing:'-0.3px', marginTop:4 }}>{w.title}</div>
        </div>
      </div>

      <div style={{ padding:'0 14px 14px', display:'flex', gap:8 }}>
        {[{val:`${w.distance} km`,lbl:'Distanza'},{val:`${w.duration} min`,lbl:'Durata'},{val:w.rpe,lbl:'RPE'},{val:w.hrZone,lbl:'Zona FC'}].map(m=>(
          <div key={m.lbl} style={{ flex:1, background:C.card2, border:`1px solid ${C.border}`, borderRadius:14, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ color:C.text, fontSize:13, fontWeight:700 }}>{m.val}</div>
            <div style={{ color:C.faint, fontSize:10, marginTop:2 }}>{m.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>Struttura della Sessione</div>
        <div style={{ display:'flex', gap:2, height:6, borderRadius:3, overflow:'hidden', marginBottom:14 }}>
          <div style={{ flex:10, background:C.teal, borderRadius:3 }}/>
          <div style={{ flex:25, background:accent, borderRadius:3 }}/>
          <div style={{ flex:10, background:C.teal, borderRadius:3 }}/>
        </div>
        {phases.map((p,i)=>(
          <div key={i} style={{ background:p.bg, border:`1px solid ${p.border}33`, borderRadius:16, padding:'16px', marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{p.icon}</span>
                <span style={{ color:C.text, fontSize:15, fontWeight:600 }}>{p.label}</span>
              </div>
              <span style={{ color:p.border, fontSize:14, fontWeight:600 }}>{p.duration}</span>
            </div>
            <div style={{ color:C.sub, fontSize:13, lineHeight:1.55, marginBottom:8 }}>{p.desc}</div>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'5px 10px' }}>
                <span style={{ color:C.faint, fontSize:11 }}>Ritmo </span>
                <span style={{ color:C.text, fontSize:11, fontWeight:600 }}>{p.pace}</span>
              </div>
              <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'5px 10px' }}>
                <span style={{ color:C.faint, fontSize:11 }}>Zona </span>
                <span style={{ color:C.text, fontSize:11, fontWeight:600 }}>{p.zone}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'0 14px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ color:accent, fontSize:12, fontWeight:600, marginBottom:6, letterSpacing:'0.04em' }}>NOTA DEL COACH</div>
            <p style={{ color:C.text, fontSize:14, lineHeight:1.65, margin:0 }}>{w.coachNote}</p>
          </div>
        </Card>
      </div>

      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>Errori da Evitare</div>
        {w.avoid.map((a,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <div style={{ width:22, height:22, borderRadius:11, background:'rgba(255,100,80,0.15)', border:'1px solid rgba(255,100,80,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#FF6450" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ color:C.sub, fontSize:14 }}>{a}</span>
          </div>
        ))}
      </div>

      <div style={{ padding:'0 14px 14px' }}>
        <button onClick={()=>setShowAlt(!showAlt)} style={{ width:'100%', background:C.card2, border:`1px solid ${C.border}`, borderRadius:14, padding:'14px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ color:C.sub, fontSize:14, fontWeight:500 }}>⬇ Versione Più Facile</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform:showAlt?'rotate(180deg)':'none', transition:'transform 0.2s' }}><path d="M6 9l6 6 6-6" stroke={C.sub} strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        {showAlt && (
          <div style={{ background:C.tealDim, border:`1px solid ${C.teal}33`, borderRadius:'0 0 14px 14px', padding:'14px 16px', marginTop:-4 }}>
            <div style={{ color:C.teal, fontSize:13, fontWeight:600, marginBottom:4 }}>{w.altEasy.title}</div>
            <div style={{ color:C.sub, fontSize:13, lineHeight:1.5 }}>{w.altEasy.desc}</div>
            <div style={{ color:C.faint, fontSize:12, marginTop:4 }}>Totale: {w.altEasy.total}</div>
          </div>
        )}
      </div>

      <div style={{ padding:'0 14px 24px', display:'flex', gap:10 }}>
        <button onClick={()=>setSentToGarmin(true)} style={{ flex:1, height:56, background:sentToGarmin?C.blueDim:'rgba(255,255,255,0.06)', border:`1px solid ${sentToGarmin?`${C.blue}66`:C.border}`, borderRadius:16, color:sentToGarmin?C.blue:C.sub, fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={sentToGarmin?C.blue:C.sub} strokeWidth="1.8" strokeLinejoin="round"/></svg>
          {sentToGarmin ? 'Inviato ✓' : 'Invia a Garmin'}
        </button>
        <button onClick={()=>setMarked(true)} style={{ flex:1, height:56, background:marked?C.tealDim:accent, border:`1px solid ${marked?`${C.teal}66`:'transparent'}`, borderRadius:16, color:marked?C.teal:'white', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:marked?'none':`0 4px 20px ${accent}44` }}>
          {marked ? '✓ Completato' : 'Segna Completato'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreenM, WorkoutScreenM });
