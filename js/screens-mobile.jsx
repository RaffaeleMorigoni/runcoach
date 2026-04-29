// js/screens-mobile.jsx — PlanScreen, CoachScreen, ProgressScreen, RecoveryScreen (mobile)
const { useState, useEffect, useRef } = React;

// ─── Plan ─────────────────────────────────────────────────────────────────────
function PlanScreenM({ onNav, tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const [selectedDay, setSelectedDay] = useState(1);
  const currentPhase = 'Scarico (Taper)';
  const phases = ['Costruzione Base','Sviluppo Aerobico','Lavoro a Soglia','Prep. Gara','Scarico (Taper)'];

  const FULL_WEEK = [
    { ...WEEK_SCHEDULE[0], workout: null },
    { ...WEEK_SCHEDULE[1], workout: TODAY_WORKOUT },
    { ...WEEK_SCHEDULE[2], workout: null },
    { ...WEEK_SCHEDULE[3], workout: { type:'easy', title:'Attivazione pre-gara', distance:5, duration:30, targetPace:'6:10–6:40 /km', hrZone:'Zona 1–2', subtitle:'Gambe sveglie, ritmo leggero — nessuno sforzo' } },
    { ...WEEK_SCHEDULE[4], workout: null },
    { ...WEEK_SCHEDULE[5], workout: { type:'long', title:'Ultimo Lungo 14km', distance:14, duration:85, targetPace:'6:00–6:30 /km', hrZone:'Zona 2', subtitle:'Ultimo lungo di taper — goditi il ritmo, niente eroismo' } },
    { ...WEEK_SCHEDULE[6], workout: { type:'recovery', title:'Recupero 4km', distance:4, duration:26, targetPace:'7:00+ /km', hrZone:'Zona 1', subtitle:'Scarico totale dopo il lungo' } },
  ];

  const sel = FULL_WEEK[selectedDay];
  const w = sel.workout;

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ padding:'8px 20px 12px' }}>
        <div style={{ color:C.sub, fontSize:13, marginBottom:2 }}>Piano di Allenamento</div>
        <div style={{ color:C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Settimana {USER.currentWeek} di {USER.weeksTotal}</div>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8 }}>
          {phases.map((p,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap:3 }}>
              <div style={{ width:p===currentPhase?22:6, height:6, borderRadius:3, background:p===currentPhase?accent:'rgba(255,255,255,0.15)', transition:'width 0.3s' }}/>
            </div>
          ))}
          <span style={{ color:accent, fontSize:11, fontWeight:600, marginLeft:4 }}>{currentPhase}</span>
        </div>
      </div>

      {/* Day pills — riga compatta e leggibile */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ display:'flex', gap:6 }}>
          {FULL_WEEK.map((d,i)=>{
            const active   = i===selectedDay;
            const m        = TYPE_META[d.type];
            const isDone   = d.status==='done';
            const isToday  = d.status==='today';
            const isRest   = d.type==='rest';
            const dayShort = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'][i];

            // Colore dot: tipo-specifico, oppure grigio per riposo
            const dotColor = isRest ? 'rgba(255,255,255,0.25)' : m.color;
            const bg       = active  ? m.bg
                           : isToday ? `${m.color}18`
                           : isDone  ? 'rgba(0,207,168,0.08)'
                                     : 'rgba(255,255,255,0.035)';
            const border   = active  ? `2px solid ${m.color}`
                           : isToday ? `1.5px solid ${m.color}66`
                           : isDone  ? `1px solid ${C.teal}33`
                                     : `1px solid ${C.border}`;

            return (
              <div key={i} onClick={()=>setSelectedDay(i)}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}>
                {/* Etichetta giorno — sempre visibile, più leggibile */}
                <div style={{
                  color: active ? C.text : isToday ? m.color : C.sub,
                  fontSize:10.5, fontWeight:active||isToday?700:500,
                  letterSpacing:'0.02em', textTransform:'uppercase',
                }}>{dayShort}</div>

                {/* Tile */}
                <div style={{
                  width:'100%', aspectRatio:'1/1.05',
                  borderRadius:11, background:bg, border,
                  transition:'all 0.15s', position:'relative',
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
                }}>
                  {/* Badge OGGI in alto */}
                  {isToday && (
                    <div style={{
                      position:'absolute', top:-7, left:'50%', transform:'translateX(-50%)',
                      background:m.color, color:'white', fontSize:8, fontWeight:800,
                      letterSpacing:'0.08em', padding:'2px 6px', borderRadius:4,
                    }}>OGGI</div>
                  )}

                  {/* Contenuto centrale */}
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={C.teal} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : isRest ? (
                    <>
                      <div style={{ fontSize:16, lineHeight:1 }}>💤</div>
                      <div style={{ color:C.faint, fontSize:8.5, fontWeight:600, letterSpacing:'0.02em' }}>RIPOSO</div>
                    </>
                  ) : (
                    <>
                      <div style={{ width:7, height:7, borderRadius:4, background:dotColor }}/>
                      <div style={{ color:active?m.color:C.text, fontSize:12, fontWeight:700, lineHeight:1 }}>
                        {d.dist}<span style={{ fontSize:9, fontWeight:500, opacity:0.7 }}>km</span>
                      </div>
                      <div style={{ color:active?m.color:C.faint, fontSize:8, fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', opacity:0.85 }}>
                        {m.label || d.type}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda rapida */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, marginTop:10, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke={C.teal} strokeWidth="3" strokeLinecap="round"/></svg>
            <span style={{ color:C.faint, fontSize:10 }}>Fatto</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:4, background:accent }}/>
            <span style={{ color:C.faint, fontSize:10 }}>Da fare</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:11 }}>💤</span>
            <span style={{ color:C.faint, fontSize:10 }}>Riposo</span>
          </div>
        </div>
      </div>

      {/* Day detail */}
      <div style={{ padding:'0 14px 14px' }}>
        {w ? (
          <Card onClick={()=>onNav('workout',w)} style={{ border:`1px solid ${TYPE_META[w.type].color}33` }}>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <TypeBadge type={w.type} />
                  <div style={{ color:C.text, fontSize:18, fontWeight:700, letterSpacing:'-0.3px', marginTop:6 }}>{w.title}</div>
                  <div style={{ color:C.sub, fontSize:13, marginTop:3 }}>{w.subtitle}</div>
                </div>
                <div style={{ width:44, height:44, borderRadius:12, background:TYPE_META[w.type].bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill={TYPE_META[w.type].color}/></svg>
                </div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {w.distance>0 && <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'6px 10px' }}><span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{w.distance} km</span></div>}
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'6px 10px' }}><span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{w.duration} min</span></div>
                {w.targetPace && <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, padding:'6px 10px' }}><span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{w.targetPace}</span></div>}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
                <span style={{ color:accent, fontSize:13, fontWeight:600 }}>Vedi Dettagli →</span>
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ cursor:'default' }}>
            <div style={{ padding:'28px', textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🛌</div>
              <div style={{ color:C.text, fontSize:17, fontWeight:600 }}>Giorno di Riposo</div>
              <div style={{ color:C.sub, fontSize:14, marginTop:6, lineHeight:1.55 }}>Il recupero è allenamento. Dormi, mangia bene e lascia che le adattamenti avvengano.</div>
            </div>
          </Card>
        )}
      </div>

      {/* Load summary */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>Carico Settimanale</div>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', gap:0, marginBottom:14 }}>
              {[{label:'Volume',val:'23 km',sub:'↓ Taper'},{label:'Corse',val:'5',sub:'+ 1 forza'},{label:'Lungo',val:'14 km',sub:'Ultimo taper'}].map((s,i)=>(
                <div key={i} style={{ flex:1, borderRight:i<2?`1px solid ${C.border}`:'none', paddingRight:12, paddingLeft:i>0?12:0 }}>
                  <div style={{ color:C.faint, fontSize:11, marginBottom:3 }}>{s.label}</div>
                  <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>{s.val}</div>
                  <div style={{ color:accent, fontSize:11, marginTop:2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ color:C.faint, fontSize:11, marginBottom:6 }}>Bilanciamento Carico</div>
            <div style={{ display:'flex', gap:3, height:8 }}>
              {[{w:45,c:C.teal},{w:30,c:accent},{w:15,c:C.purple},{w:10,c:'rgba(255,255,255,0.2)'}].map((b,i)=>(
                <div key={i} style={{ flex:b.w, height:'100%', background:b.c, borderRadius:2, opacity:0.8 }}/>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              {[{c:C.teal,l:'Facile 45%'},{c:accent,l:'Tempo 30%'},{c:C.purple,l:'Duro 15%'}].map(b=>(
                <div key={b.l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:3, background:b.c }}/>
                  <span style={{ color:C.faint, fontSize:11 }}>{b.l}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Race countdown */}
      <div style={{ padding:'0 14px 24px' }}>
        <div style={{ background:`linear-gradient(135deg, ${accent}18, ${C.purple}12)`, border:`1px solid ${accent}33`, borderRadius:18, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:32 }}>🏁</div>
          <div>
            <div style={{ color:C.text, fontSize:15, fontWeight:600 }}>{USER.raceName}</div>
            <div style={{ color:accent, fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>{USER.daysToRace} giorni</div>
            <div style={{ color:C.sub, fontSize:12 }}>Obiettivo: {USER.goal} · PB: {USER.pb}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Coach Chat ───────────────────────────────────────────────────────────────
function CoachScreenM({ tweaks, onNav }) {
  const accent = tweaks.accentColor || C.orange;
  const [messages, setMessages] = useState(CHAT_HISTORY);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [claudeReady, setClaudeReady] = useState(!!(window.claude && window.claude.complete));
  const bottomRef = useRef(null);

  useEffect(() => {
    if (claudeReady) return;
    let tries = 0;
    const id = setInterval(() => {
      if (window.claude && window.claude.complete) {
        setClaudeReady(true);
        clearInterval(id);
      } else if (++tries > 20) {
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [claudeReady]);

  useEffect(() => {
    if (bottomRef.current) {
      const el = bottomRef.current.closest('[data-scroll]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, typing]);

  const useRealAI = tweaks.claudeAI !== false; // default ON

  // Override USER con tweaks (gara parametrizzabile)
  const race = {
    name: tweaks.raceName || USER.raceName,
    date: tweaks.raceDate || USER.raceDate,
    distance: tweaks.raceDistance || USER.raceDistance,
    target: tweaks.raceTargetTime || USER.raceTargetTime,
    pace: tweaks.raceTargetPace || USER.raceTargetPace,
    days: tweaks.daysToRace ?? USER.daysToRace,
  };
  const weeklyKm = tweaks.weeklyKm ?? USER.weeklyKm;
  const longestRun = tweaks.longestRun ?? USER.longestRun;

  // Parser blocco workout JSON dalla risposta del coach
  const parseWorkoutBlock = (text) => {
    const match = text.match(/```workout\s*([\s\S]*?)```/);
    if (!match) return { cleanText: text, workout: null };
    try {
      const workout = JSON.parse(match[1].trim());
      const cleanText = text.replace(/```workout[\s\S]*?```/, '').trim();
      return { cleanText, workout };
    } catch (e) {
      return { cleanText: text, workout: null };
    }
  };

  // Contesto completo passato a Claude
  const buildSystemContext = () => `Agisci come un Running Coach professionista specializzato nella preparazione della mezza maratona, con approccio scientifico, prudente, motivante e altamente personalizzato.

RUOLO
Sei il coach di corsa personale di ${tweaks.userName || USER.name}. Devi:
- spiegare ogni allenamento in modo chiaro e pratico
- adattare il programma in base ai feedback reali
- monitorare carico, recupero e segnali di affaticamento
- privilegiare SEMPRE salute, continuità e prevenzione infortuni rispetto alla performance a tutti i costi

STILE
- Tono professionale, concreto, incoraggiante
- Linguaggio chiaro ma competente, da vero coach
- Istruzioni precise, niente frasi vaghe
- Motivante senza essere aggressivo o estremo
- Diretto e corretto quando serve
- Risposte CONCISE: max 4-6 frasi salvo richiesta esplicita di approfondimento

PRINCIPI
1. Sicurezza prima di tutto — se emergono segnali di dolore/stanchezza anomala/problemi, riduci carico e consiglia prudenza. In presenza di sintomi importanti, suggerisci di consultare medico/fisioterapista.
2. Personalizzazione continua — usa sempre i dati personali qui sotto.
3. Non inventare dati fisiologici precisi se non li hai.
4. Non suggerire di aumentare volume/intensità durante il taper (siamo in taper!).
5. Non trattare ogni seduta dura come obbligatoria.

FORMATO RISPOSTE
Quando opportuno, usa sezioni brevi come:
- "Analisi" / "Allenamento di oggi" / "Adattamento consigliato" / "Attenzione" / "Prossimo passo"
Se l'utente manda dati di una corsa, analizza numeri + sensazioni, dì cosa è andato bene, evidenzia criticità, adatta il prossimo allenamento.

─── PROFILO ATLETA ─────────────────────────────
Nome: ${tweaks.userName || USER.name}
Età: ${USER.age}
Livello: ${USER.level}
Allenamenti/settimana: 3
Volume tipico: ${weeklyKm} km/sett
Corsa più lunga fatta: ${longestRun} km
Ritmo facile attuale: ${USER.currentEasyPace}

─── GARA OBIETTIVO ──────────────────────────────
${race.name} — ${race.date} (mancano ${race.days} giorni)
Distanza: ${race.distance} km
Target: ${race.target} (${race.pace})
Scarpe gara: ${RACE_STRATEGY.shoes}

─── PERSONAL BEST ───────────────────────────────
5k: ${PB['5k'].time} (${PB['5k'].pace}) — ${PB['5k'].date}
10k: ${PB['10k'].time} (${PB['10k'].pace}) — ${PB['10k'].date}
21k: ${PB['21k'].time} (${PB['21k'].pace}) — ${PB['21k'].date}

─── STIME GARA (Riegel) ─────────────────────────
Conservativa: ${RACE_ESTIMATES.conservative.time} (${RACE_ESTIMATES.conservative.pace})
Realistica:   ${RACE_ESTIMATES.realistic.time} (${RACE_ESTIMATES.realistic.pace})
Ottimistica:  ${RACE_ESTIMATES.optimistic.time} (${RACE_ESTIMATES.optimistic.pace})

─── STRATEGIA GARA CONCORDATA ───────────────────
Strategia: Negative Split, target ${RACE_STRATEGY.target}
${RACE_STRATEGY.phases.map(p => `- km ${p.km}: ${p.pace}/km — ${p.note}`).join('\n')}

─── PIANO NUTRIZIONE ────────────────────────────
${GEL_PLAN.map((g,i) => `${i+1}. ${g.when}: ${g.type} (${g.note})`).join('\n')}
Idratazione: sempre acqua con ogni gel.

─── ULTIMO LUNGO SIGNIFICATIVO ──────────────────
${LONG_RUN_LAST.distance}km in ${LONG_RUN_LAST.time} (${LONG_RUN_LAST.pace}), FC media ${LONG_RUN_LAST.avgHR}.
Ultimi 3 km in progressione: ${LONG_RUN_LAST.finalKm.join(', ')} — chiusura forte.

─── STATO ATTUALE ───────────────────────────────
Settimana ${USER.currentWeek} di ${USER.weeksTotal} — FASE TAPER/scarico
Recupero oggi: ${RECOVERY_DATA.score}/100
Sonno: ${RECOVERY_DATA.sleep}h, HRV ${RECOVERY_DATA.hrv}ms, FC riposo ${RECOVERY_DATA.restingHR}bpm
Allenamento di oggi: ${TODAY_WORKOUT.title} — ${TODAY_WORKOUT.distance}km @ ${TODAY_WORKOUT.targetPace}
Dispositivo: Garmin ${USER.garminDevice}

Rispondi SEMPRE in italiano. Sii coach vero, concreto, sicuro.

─── GENERAZIONE ALLENAMENTI ─────────────────────
Se l'utente ti chiede un allenamento, o se dai feedback sulle sue sensazioni/dati ti spinge a proporne uno nuovo, DEVI includere nella risposta un blocco JSON tra i marker \`\`\`workout e \`\`\` con questa struttura ESATTA:

\`\`\`workout
{
  "title": "Nome breve dell'allenamento",
  "type": "easy|tempo|intervals|long|recovery",
  "distance_km": 6.5,
  "duration_min": 42,
  "target_pace": "5:40/km",
  "rpe": "6/10",
  "hr_zone": "Zona 2-3",
  "warmup":   { "duration": "10 min", "desc": "Jogging lento + 4 allunghi", "pace": "6:30/km" },
  "main_set": { "duration": "22 min", "desc": "3×1km @ 5:30 con 1' rec.", "pace": "5:30/km" },
  "cooldown": { "duration": "10 min", "desc": "Defaticamento cammino+jogging", "pace": "6:45/km" },
  "note": "Perché questo allenamento ORA (1-2 frasi, contestualizzato)",
  "alt_easier": "Versione ridotta se stanco"
}
\`\`\`

Regole per generare allenamenti:
- Coerenti con fase (ora TAPER → niente carichi pesanti)
- Personalizzati sui dati forniti (sensazioni, stanchezza, recupero)
- Ritmi compatibili col livello (ritmo facile 6:20-6:45, medio 5:35-5:45, soglia 5:25-5:30)
- Prima del JSON, scrivi SEMPRE una breve spiegazione (2-4 frasi) del RAZIONALE: perché questo allenamento ora, cosa allena, come dovrebbe sentirsi.
- Dopo il JSON, nessun altro testo.
- Se invece l'utente NON ti chiede un allenamento e non ha senso proporne uno, NON includere il blocco workout.

Ora la persona ti scrive: ascolta e rispondi.`;

  const send = async (text) => {
    if (!text.trim()) return;
    setInput('');
    setMessages(p => [...p, { role:'user', text:text.trim() }]);
    setTyping(true);

    if (useRealAI && (claudeReady || (window.claude && window.claude.complete))) {
      try {
        const systemPrompt = buildSystemContext();
        // Costruisci la conversazione: contesto come primo user message + finta risposta assistant che "prende il ruolo",
        // poi storico reale alternato, poi ultimo messaggio utente.
        const history = messages
          .filter(m => m.text && m.text.trim())
          .slice(-10)
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          }));
        const reply = await window.claude.complete({
          messages: [
            { role: 'user', content: systemPrompt },
            { role: 'assistant', content: 'Perfetto, sono il tuo coach. Dimmi pure come ti senti o cosa vuoi sapere.' },
            ...history,
            { role: 'user', content: text.trim() },
          ],
        });
        setTyping(false);
        const parsed = parseWorkoutBlock(String(reply).trim());
        setMessages(p => [...p, { role:'coach', text: parsed.cleanText || 'Ecco il tuo allenamento:', workout: parsed.workout }]);
        return;
      } catch (err) {
        console.error('Claude AI error', err);
        setTyping(false);
        setMessages(p => [...p, { role:'coach', text:'Problema nella connessione con l\'AI. Riprova tra un attimo.' }]);
        return;
      }
    }

    // Fallback risposte preimpostate
    setTimeout(() => {
      const reply = COACH_RESPONSES[text.trim()] || "Basandomi sui tuoi dati: sei in taper con recupero buono. Mantieni consistenza, non aggiungere volume, idratati e dormi bene. Lucca è vicina.";
      setTyping(false);
      setMessages(p => [...p, { role:'coach', text:reply }]);
    }, 1400);
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'8px 20px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:48, height:48, borderRadius:24, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z" fill="white" opacity="0.9"/></svg>
            <div style={{ position:'absolute', bottom:2, right:2, width:12, height:12, borderRadius:6, background:C.teal, border:'2px solid #06060E' }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ color:C.text, fontSize:18, fontWeight:700 }}>Coach AI</div>
            <div style={{ color:C.teal, fontSize:12, fontWeight:500 }}>
              ● Online · {useRealAI && (claudeReady || (window.claude && window.claude.complete)) ? 'Claude AI' : 'Risposte preimpostate'}
            </div>
          </div>
          {onNav && (
            <button onClick={() => onNav('race-settings')} title="Impostazioni gara" style={{ width:38, height:38, borderRadius:19, background:C.card2, border:`1px solid ${C.border2}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          )}
          {useRealAI && (claudeReady || (window.claude && window.claude.complete)) && (
            <div style={{ background:`${accent}22`, border:`1px solid ${accent}44`, color:accent, fontSize:10, fontWeight:700, padding:'4px 8px', borderRadius:6, letterSpacing:'0.05em' }}>LIVE</div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div data-scroll="1" style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding:'0 16px' }}>
        {messages.map((m,i)=>(
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:14 }}>
            {m.role==='coach' && (
              <div style={{ width:32, height:32, borderRadius:16, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8, marginTop:2 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z"/></svg>
              </div>
            )}
            <div style={{ maxWidth:'78%', background:m.role==='user'?accent:C.card2, border:m.role==='user'?'none':`1px solid ${C.border2}`, borderRadius:m.role==='user'?'18px 18px 4px 18px':'4px 18px 18px 18px', padding:'12px 16px' }}>
              <p style={{ color:C.text, fontSize:14, lineHeight:1.6, margin:0, whiteSpace:'pre-wrap' }}>{m.text}</p>
              {m.workout && (
                <div style={{ marginTop:12, background:'rgba(0,0,0,0.25)', border:`1px solid ${accent}55`, borderRadius:14, padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:14 }}>🏃</span>
                    <span style={{ color:accent, fontSize:10, fontWeight:800, letterSpacing:'0.08em' }}>ALLENAMENTO GENERATO</span>
                  </div>
                  <div style={{ color:C.text, fontSize:15, fontWeight:700, marginBottom:2 }}>{m.workout.title}</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8, marginBottom:10 }}>
                    {m.workout.distance_km && <span style={{ background:'rgba(255,255,255,0.08)', color:C.text, fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6 }}>{m.workout.distance_km} km</span>}
                    {m.workout.duration_min && <span style={{ background:'rgba(255,255,255,0.08)', color:C.text, fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:6 }}>{m.workout.duration_min} min</span>}
                    {m.workout.target_pace && <span style={{ background:`${accent}22`, color:accent, fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6 }}>{m.workout.target_pace}</span>}
                    {m.workout.rpe && <span style={{ background:'rgba(255,255,255,0.08)', color:C.sub, fontSize:11, padding:'3px 8px', borderRadius:6 }}>RPE {m.workout.rpe}</span>}
                  </div>
                  {['warmup','main_set','cooldown'].map(k => m.workout[k] && (
                    <div key={k} style={{ borderLeft:`2px solid ${k==='main_set'?accent:C.teal}`, paddingLeft:10, marginBottom:8 }}>
                      <div style={{ color:C.text, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                        {k==='warmup'?'Riscaldamento':k==='main_set'?'Parte centrale':'Defaticamento'} · {m.workout[k].duration}
                      </div>
                      <div style={{ color:C.sub, fontSize:11, lineHeight:1.45, marginTop:2 }}>{m.workout[k].desc}</div>
                    </div>
                  ))}
                  {m.workout.note && <div style={{ color:C.faint, fontSize:11, fontStyle:'italic', marginTop:6, lineHeight:1.45 }}>💡 {m.workout.note}</div>}
                  <div style={{ display:'flex', gap:6, marginTop:10 }}>
                    <button onClick={() => alert('Workout salvato nel piano ✓')} style={{ flex:1, background:accent, border:'none', borderRadius:8, color:'white', fontSize:11, fontWeight:700, padding:'8px', cursor:'pointer' }}>+ Piano</button>
                    <button onClick={() => alert('Inviato a Garmin ✓')} style={{ flex:1, background:'rgba(255,255,255,0.08)', border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:11, fontWeight:600, padding:'8px', cursor:'pointer' }}>↗ Garmin</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:14 }}>
            <div style={{ width:32, height:32, borderRadius:16, background:`linear-gradient(135deg, ${accent}, ${C.purple})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginRight:8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 5.92 2 10.8c0 2.96 1.56 5.6 4 7.28V22l3.6-2.4c.76.24 1.56.4 2.4.4 5.52 0 10-3.92 10-9.2S17.52 2 12 2z"/></svg>
            </div>
            <div style={{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:'4px 18px 18px 18px', padding:'12px 18px', display:'flex', gap:6, alignItems:'center' }}>
              {[0,1,2].map(j=><div key={j} style={{ width:7, height:7, borderRadius:4, background:C.sub, animation:`bounce 1s ${j*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestions */}
      <div style={{ padding:'8px 16px 6px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
          {SUGGESTIONS.map((s,i)=>(
            <button key={i} onClick={()=>send(s)} style={{ flexShrink:0, background:C.card2, border:`1px solid ${C.border2}`, borderRadius:22, padding:'8px 14px', color:C.sub, fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap' }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding:'6px 14px 10px', flexShrink:0, display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&send(input)}
          placeholder="Chiedi qualcosa al tuo coach..."
          style={{ flex:1, height:50, background:C.card2, border:`1px solid ${C.border2}`, borderRadius:25, padding:'0 20px', color:C.text, fontSize:14, outline:'none', fontFamily:'DM Sans,sans-serif' }}/>
        <button onClick={()=>send(input)} style={{ width:50, height:50, borderRadius:25, background:accent, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 14px ${accent}44`, flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
    </div>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────
function ProgressScreenM({ tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const p = PROGRESS_DATA;
  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ padding:'8px 20px 14px' }}>
        <div style={{ color:C.sub, fontSize:13, marginBottom:2 }}>Progressi</div>
        <div style={{ color:C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Il Tuo Percorso</div>
      </div>

      {/* Readiness hero */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ background:`linear-gradient(135deg, ${accent}20, ${C.purple}14)`, border:`1px solid ${accent}33`, borderRadius:20, padding:'20px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ color:C.sub, fontSize:11, fontWeight:500, letterSpacing:'0.06em', marginBottom:8 }}>PRONTEZZA GARA</div>
              <div style={{ color:C.text, fontSize:48, fontWeight:800, letterSpacing:'-1px', lineHeight:1 }}>{p.readinessScore}<span style={{ fontSize:20, color:C.sub, fontWeight:500 }}>%</span></div>
              <div style={{ color:C.sub, fontSize:13, marginTop:8 }}>Arrivo previsto <span style={{ color:accent, fontWeight:600 }}>{p.projectedFinish}</span></div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:accent, fontSize:32, fontWeight:800 }}>{p.raceCountdown}</div>
              <div style={{ color:C.sub, fontSize:12 }}>giorni a Lucca</div>
            </div>
          </div>
          <div style={{ marginTop:18, height:6, background:'rgba(255,255,255,0.1)', borderRadius:3 }}>
            <div style={{ height:'100%', width:`${p.readinessScore}%`, background:`linear-gradient(90deg, ${accent}, ${C.yellow})`, borderRadius:3 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
            <span style={{ color:C.faint, fontSize:11 }}>Non pronta</span>
            <span style={{ color:C.faint, fontSize:11 }}>Pronta</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding:'0 14px 14px', display:'flex', gap:8 }}>
        {[{label:'Costanza',val:`${p.consistency}%`,sub:'Ultime 4 settimane',color:C.teal},{label:'Aderenza',val:`${p.adherence}%`,sub:'Sessioni eseguite',color:accent},{label:'Corse Totali',val:`${p.totalRuns}`,sub:'Questo ciclo',color:C.blue}].map(s=>(
          <Card key={s.label} style={{ flex:1, cursor:'default' }}>
            <div style={{ padding:'14px 12px', textAlign:'center' }}>
              <div style={{ color:s.color, fontSize:22, fontWeight:800 }}>{s.val}</div>
              <div style={{ color:C.text, fontSize:12, fontWeight:600, marginTop:3 }}>{s.label}</div>
              <div style={{ color:C.faint, fontSize:10, marginTop:2 }}>{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly mileage */}
      <div style={{ padding:'0 14px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ color:C.text, fontSize:15, fontWeight:600 }}>Chilometraggio Settimanale</div>
              <div style={{ color:C.sub, fontSize:13 }}>Questa sett. <span style={{ color:accent, fontWeight:700 }}>{p.weeklyMiles[p.weeklyMiles.length-1]} km</span></div>
            </div>
            <BarChart data={p.weeklyMiles} labels={p.weekLabels} color={accent} height={64}/>
          </div>
        </Card>
      </div>

      {/* Pace trend */}
      <div style={{ padding:'0 14px 14px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ color:C.text, fontSize:15, fontWeight:600 }}>Tendenza Ritmo</div>
              <div style={{ color:C.teal, fontSize:12, fontWeight:600 }}>↓ In miglioramento</div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div>
                <div style={{ color:C.faint, fontSize:11, marginBottom:4 }}>7 sett. fa</div>
                <div style={{ color:C.sub, fontSize:17, fontWeight:700 }}>6:06/km</div>
              </div>
              <SparkLine data={p.paceHistory.map(v=>-v)} color={C.teal} width={140} height={40}/>
              <div style={{ textAlign:'right' }}>
                <div style={{ color:C.faint, fontSize:11, marginBottom:4 }}>Questa sett.</div>
                <div style={{ color:C.teal, fontSize:17, fontWeight:700 }}>5:43/km</div>
              </div>
            </div>
            <div style={{ color:C.faint, fontSize:12, marginTop:8 }}>−23 sec/km in 7 settimane</div>
          </div>
        </Card>
      </div>

      {/* Long run progress */}
      <div style={{ padding:'0 14px 24px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:14 }}>Progressione del Lungo</div>
            <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:64 }}>
              {[22,26,28,30,32,28,14].map((km,i)=>(
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <div style={{ width:'100%', height:(km/32)*56, background:i===6?C.blue:'rgba(77,158,255,0.25)', borderRadius:'4px 4px 0 0', minHeight:4 }}/>
                  <div style={{ color:C.faint, fontSize:10 }}>{km}</div>
                </div>
              ))}
            </div>
            <div style={{ color:C.faint, fontSize:12, marginTop:4 }}>km per lungo · Gara: 42.195km il 3 maggio</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Recovery ─────────────────────────────────────────────────────────────────
function RecoveryScreenM({ tweaks }) {
  const accent = tweaks.accentColor || C.orange;
  const rec = { ...RECOVERY_DATA, score: tweaks.recoveryScore ?? RECOVERY_DATA.score };
  const recColor = rec.score >= 80 ? C.teal : rec.score >= 60 ? accent : '#FF4466';
  const recLabel = rec.score >= 80 ? 'Eccellente' : rec.score >= 60 ? 'Buono' : 'Basso';
  const recId = rec.score >= 80 ? 'go_as_planned' : rec.score >= 60 ? 'go_as_planned' : rec.score >= 45 ? 'reduce' : 'rest';

  const RECS = [
    { id:'go_as_planned', icon:'✅', label:'Vai come Previsto',   desc:'Il recupero è sufficiente. Esegui l\'allenamento pianificato.' },
    { id:'reduce',        icon:'⬇',  label:'Riduci Intensità',    desc:'Sostituisci la sessione di oggi con la versione più facile.' },
    { id:'easy_only',     icon:'🚶', label:'Solo Corsa Facile',   desc:'Solo Zona 1–2, massimo 20–30 min.' },
    { id:'rest',          icon:'🛌', label:'Riposo / Mobilità',   desc:'Riposo completo o solo lavoro di mobilità leggera.' },
  ];

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ padding:'8px 20px 14px' }}>
        <div style={{ color:C.sub, fontSize:13, marginBottom:2 }}>Recupero e Prontezza</div>
        <div style={{ color:C.text, fontSize:22, fontWeight:700, letterSpacing:'-0.4px' }}>Stato Odierno</div>
      </div>

      {/* Big score */}
      <div style={{ padding:'0 14px 14px' }}>
        <Card style={{ cursor:'default', background:`linear-gradient(135deg, ${recColor}12, #0D0D1C)` }}>
          <div style={{ padding:'24px 20px', display:'flex', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative', width:100, height:100, flexShrink:0 }}>
              <RecoveryRing score={rec.score} size={100} stroke={8}/>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <div style={{ color:recColor, fontSize:28, fontWeight:800, lineHeight:1 }}>{rec.score}</div>
                <div style={{ color:C.faint, fontSize:10, marginTop:1 }}>/ 100</div>
              </div>
            </div>
            <div>
              <div style={{ color:recColor, fontSize:22, fontWeight:700, marginBottom:6 }}>{recLabel}</div>
              <div style={{ color:C.sub, fontSize:13, lineHeight:1.55, marginBottom:10 }}>Basato su sonno, HRV, frequenza cardiaca a riposo e carico.</div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:C.blueDim, border:`1px solid ${C.blue}33`, borderRadius:8, padding:'5px 10px' }}>
                <div style={{ width:6, height:6, borderRadius:3, background:C.blue }}/>
                <span style={{ color:C.blue, fontSize:11, fontWeight:500 }}>Garmin · {USER.garminSyncAgo}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Garmin metrics */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>Metriche Garmin</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'HRV', val:`${rec.hrv} ms`, trend:'↑ +4', good:true, icon:'💓' },
            { label:'FC a Riposo', val:`${rec.restingHR} bpm`, trend:'→ stabile', good:null, icon:'❤' },
            { label:'Sonno', val:`${rec.sleep}h`, trend:rec.sleepQuality, good:true, icon:'🌙' },
            { label:'Carico Allena.', val:rec.trainingLoad, trend:'Gestibile', good:true, icon:'⚡' },
          ].map(m=>(
            <Card key={m.label} style={{ cursor:'default' }}>
              <div style={{ padding:'16px' }}>
                <div style={{ fontSize:20, marginBottom:8 }}>{m.icon}</div>
                <div style={{ color:C.text, fontSize:17, fontWeight:700 }}>{m.val}</div>
                <div style={{ color:C.faint, fontSize:12, marginTop:2 }}>{m.label}</div>
                <div style={{ color:m.good===true?C.teal:m.good===false?'#FF6450':C.sub, fontSize:12, fontWeight:500, marginTop:4 }}>{m.trend}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div style={{ padding:'0 14px 14px' }}>
        <div style={{ color:C.text, fontSize:15, fontWeight:600, marginBottom:10 }}>Raccomandazione Odierna</div>
        {RECS.map(r=>{
          const isActive = r.id===recId;
          return (
            <div key={r.id} style={{ display:'flex', alignItems:'center', gap:14, background:isActive?`${recColor}18`:'rgba(255,255,255,0.04)', border:`1px solid ${isActive?`${recColor}44`:C.border}`, borderRadius:16, padding:'14px 16px', marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:20, background:isActive?`${recColor}22`:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{r.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ color:isActive?recColor:C.sub, fontSize:14, fontWeight:isActive?700:500 }}>{r.label}</div>
                <div style={{ color:C.faint, fontSize:12, marginTop:3, lineHeight:1.45 }}>{r.desc}</div>
              </div>
              {isActive && <div style={{ width:8, height:8, borderRadius:4, background:recColor, flexShrink:0 }}/>}
            </div>
          );
        })}
      </div>

      {/* Load trend */}
      <div style={{ padding:'0 14px 24px' }}>
        <Card style={{ cursor:'default' }}>
          <div style={{ padding:'16px' }}>
            <div style={{ color:C.text, fontSize:14, fontWeight:600, marginBottom:12 }}>Tendenza Carico Settimanale</div>
            <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:44, marginBottom:8 }}>
              {[55,60,58,65,62,70,68].map((v,i)=>(
                <div key={i} style={{ flex:1, height:`${(v/70)*100}%`, background:i===6?recColor:'rgba(255,255,255,0.12)', borderRadius:'3px 3px 0 0', opacity:i===6?1:0.6 }}/>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
              <span style={{ color:C.faint, fontSize:11 }}>7 giorni fa</span>
              <span style={{ color:recColor, fontSize:11, fontWeight:600 }}>Oggi</span>
            </div>
            <div style={{ color:C.sub, fontSize:13, lineHeight:1.55 }}>
              Il carico è <span style={{ color:recColor, fontWeight:600 }}>moderato</span> e la tendenza è stabile. Nessun rischio di sovraccarico. Le ripetute di venerdì e il lungo di sabato sono confermati.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Race Settings ────────────────────────────────────────────────────────────
function RaceSettingsScreenM({ tweaks, onChange, onBack }) {
  const accent = tweaks.accentColor || C.orange;

  const fields = [
    { group: 'Gara',        key: 'raceName',       label: 'Nome gara',              placeholder: USER.raceName,         type: 'text' },
    { group: 'Gara',        key: 'raceDate',       label: 'Data gara',              placeholder: USER.raceDate,         type: 'date' },
    { group: 'Gara',        key: 'raceDistance',   label: 'Distanza (km)',          placeholder: String(USER.raceDistance),    type: 'number', step: '0.01' },
    { group: 'Gara',        key: 'daysToRace',     label: 'Giorni al via',          placeholder: String(USER.daysToRace),      type: 'number' },
    { group: 'Obiettivo',   key: 'raceTargetTime', label: 'Tempo target',           placeholder: USER.raceTargetTime,   type: 'text' },
    { group: 'Obiettivo',   key: 'raceTargetPace', label: 'Ritmo target',           placeholder: USER.raceTargetPace,   type: 'text' },
    { group: 'Atleta',      key: 'userName',       label: 'Nome',                   placeholder: USER.name,             type: 'text' },
    { group: 'Atleta',      key: 'weeklyKm',       label: 'Volume sett. (km)',      placeholder: String(USER.weeklyKm),        type: 'number' },
    { group: 'Atleta',      key: 'longestRun',     label: 'Corsa più lunga (km)',   placeholder: String(USER.longestRun),      type: 'number' },
  ];

  const groups = [...new Set(fields.map(f => f.group))];

  const setVal = (key, type, v) => {
    if (v === '' || v === null || v === undefined) {
      onChange(key, undefined);
      return;
    }
    if (type === 'number') {
      const n = parseFloat(v);
      onChange(key, isNaN(n) ? v : n);
    } else {
      onChange(key, v);
    }
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'8px 16px 12px', flexShrink:0, display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={onBack} style={{ width:38, height:38, borderRadius:19, background:C.card2, border:`1px solid ${C.border2}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ color:C.text, fontSize:18, fontWeight:700 }}>Impostazioni Gara</div>
          <div style={{ color:C.sub, fontSize:12 }}>Questi dati alimentano il Coach AI</div>
        </div>
      </div>

      {/* Scroll */}
      <div data-scroll="1" style={{ flex:1, overflowY:'auto', scrollbarWidth:'none', padding:'0 16px 24px' }}>
        {groups.map(g => (
          <div key={g} style={{ marginBottom:20 }}>
            <div style={{ color:C.faint, fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8, padding:'0 4px' }}>{g}</div>
            <div style={{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:14, overflow:'hidden' }}>
              {fields.filter(f => f.group === g).map((f,i,arr) => (
                <div key={f.key} style={{ padding:'12px 14px', borderBottom: i === arr.length-1 ? 'none' : `1px solid ${C.border2}` }}>
                  <label style={{ color:C.sub, fontSize:11, fontWeight:600, display:'block', marginBottom:4 }}>{f.label}</label>
                  <input
                    type={f.type}
                    step={f.step}
                    value={tweaks[f.key] ?? ''}
                    onChange={e => setVal(f.key, f.type, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:C.text, fontSize:15, fontWeight:500, fontFamily:'DM Sans,sans-serif', padding:0 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* AI toggle */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:C.faint, fontSize:10, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:8, padding:'0 4px' }}>Coach AI</div>
          <div style={{ background:C.card2, border:`1px solid ${C.border2}`, borderRadius:14, padding:'14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:C.text, fontSize:14, fontWeight:600 }}>Claude AI reale</div>
              <div style={{ color:C.sub, fontSize:12, marginTop:2 }}>Risposte generate in tempo reale con i tuoi dati</div>
            </div>
            <button
              onClick={() => onChange('claudeAI', tweaks.claudeAI === false)}
              style={{ width:48, height:28, borderRadius:14, background: tweaks.claudeAI === false ? C.border2 : accent, border:'none', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}
            >
              <div style={{ position:'absolute', top:2, left: tweaks.claudeAI === false ? 2 : 22, width:24, height:24, borderRadius:12, background:'white', transition:'left 0.2s', boxShadow:'0 2px 6px rgba(0,0,0,0.3)' }}/>
            </button>
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            if (confirm('Ripristinare tutti i valori default?')) {
              ['raceName','raceDate','raceDistance','daysToRace','raceTargetTime','raceTargetPace','userName','weeklyKm','longestRun'].forEach(k => onChange(k, undefined));
            }
          }}
          style={{ width:'100%', background:'transparent', border:`1px solid ${C.border2}`, borderRadius:12, padding:'12px', color:C.sub, fontSize:13, fontWeight:600, cursor:'pointer' }}
        >
          Ripristina default
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { PlanScreenM, CoachScreenM, ProgressScreenM, RecoveryScreenM, RaceSettingsScreenM });
