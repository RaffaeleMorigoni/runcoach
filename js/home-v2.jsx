// js/home-v2.jsx — Home neon: countdown cinematografico + anelli forma + big PB
const { useState: useStateH2, useEffect: useEffectH2, useMemo: useMemoH2 } = React;

function HomeV2({ auth, onNav, tweaks, onLogout }) {
  const [activities, setActivities] = useStateH2([]);
  const [athlete, setAthlete] = useStateH2(null);
  const [loading, setLoading] = useStateH2(true);

  useEffectH2(() => {
    (async () => {
      try {
        if (auth) {
          const [acts, ath] = await Promise.all([
            fetchActivities(auth, 30),
            fetchAthlete(auth).catch(() => null),
          ]);
          setActivities(acts);
          setAthlete(ath);
        }
      } catch (e) {}
      finally { setLoading(false); }
    })();
  }, [auth]);

  const trainingData = useMemoH2(() => activitiesToTrainingData(activities), [activities]);
  const loadHistory  = useMemoH2(() => calculateTrainingLoad(trainingData, 30), [trainingData]);
  const last         = loadHistory[loadHistory.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
  const overTr       = useMemoH2(() => detectOvertraining(loadHistory, trainingData.slice(-7)), [loadHistory, trainingData]);
  const form         = getFormLabel(last.tsb);

  // Workout di oggi (relativo alla gara)
  const todayWorkout = useMemoH2(() => generateTodayWorkout(loadHistory, USER.raceDate), [loadHistory]);

  // Race countdown
  const daysToRace = useMemoH2(() => {
    const race = new Date(USER.raceDate);
    const now = new Date();
    return Math.max(0, Math.ceil((race - now) / 86400000));
  }, []);

  // Settimana km progress
  const weekStats = useMemoH2(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0,0,0,0);
    const weekActs = trainingData.filter(a => new Date(a.date) >= monday);
    return {
      kmDone: weekActs.reduce((s, a) => s + a.distance_km, 0),
      kmTarget: tweaks.weeklyKm || 28,
      runs: weekActs.length,
    };
  }, [trainingData, tweaks.weeklyKm]);

  const userName = tweaks.userName || athlete?.firstname || USER.name;
  const today = new Date();
  const dayLabel = today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, border: `3px solid ${NEON.orange}`, borderTopColor: 'transparent', animation: 'spinH2 0.8s linear infinite' }}/>
        <div style={{ color: NEON.textDim, fontSize: 12 }}>Caricamento dati Strava…</div>
        <style>{`@keyframes spinH2{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      {/* Greeting */}
      <div style={{ padding: '14px 18px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color: NEON.textDim, fontSize: 11, textTransform: 'capitalize' }}>{dayLabel}</div>
          <div style={{ color: NEON.text, fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1, marginTop: 2 }}>
            Ciao, {userName}<span style={{ color: NEON.orange }}>.</span>
          </div>
        </div>
        <div onClick={onLogout} style={{
          width: 38, height: 38, borderRadius: 19,
          background: athlete?.profile ? `url(${athlete.profile}) center/cover` : `linear-gradient(135deg, ${NEON.orange}, ${NEON.purple})`,
          border: `1.5px solid ${NEON.orange}40`,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor: 'pointer',
        }}>
          {!athlete?.profile && <span style={{ color:'white', fontSize:14, fontWeight:800 }}>{userName[0]}</span>}
        </div>
      </div>

      {/* HERO Countdown — cinematografico */}
      <div style={{ padding: '0 14px 14px' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          borderRadius: 22,
          padding: '20px 18px 18px',
          background: `linear-gradient(135deg, ${NEON.orange}28 0%, ${NEON.purple}18 50%, #0A0A18 100%)`,
          border: `1px solid ${NEON.orange}44`,
          boxShadow: `0 0 30px ${NEON.orange}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}>
          {/* Glow orbs */}
          <div style={{ position:'absolute', top:-30, right:-20, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${NEON.orange}55, transparent 70%)`, filter: 'blur(20px)' }}/>
          <div style={{ position:'absolute', bottom:-40, left:-20, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${NEON.purple}40, transparent 70%)`, filter: 'blur(24px)' }}/>

          {/* Running figure */}
          <svg style={{ position:'absolute', right: 8, bottom: 10, opacity: 0.10 }} width="120" height="120" viewBox="0 0 24 24" fill="none">
            <path d="M13 4C13 5.1 13.9 6 15 6C16.1 6 17 5.1 17 4C17 2.9 16.1 2 15 2C13.9 2 13 2.9 13 4Z" fill={NEON.orange}/>
            <path d="M5.5 18.5L8 13L11 16L13 10L16.5 18.5" stroke={NEON.orange} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>

          <div style={{ position: 'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: NEON.orange, boxShadow: `0 0 8px ${NEON.orange}` }}/>
              <span style={{ color: NEON.orange, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>PROSSIMA GARA</span>
            </div>
            <div style={{ color: NEON.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{USER.raceName}</div>
            <div style={{ color: NEON.textDim, fontSize: 11.5, marginTop: 2 }}>{USER.raceDate} · 21.097 km</div>

            {/* Big countdown */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <BigNumber
                value={daysToRace}
                size={72}
                weight={900}
                color={NEON.orange}
                animate={false}
              />
              <div>
                <div style={{ color: NEON.text, fontSize: 14, fontWeight: 700, lineHeight: 1 }}>giorni</div>
                <div style={{ color: NEON.textDim, fontSize: 11, marginTop: 2 }}>al via</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: NEON.textFaint, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>TARGET</div>
                <div style={{ color: NEON.text, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{USER.raceTargetTime}</div>
                <div style={{ color: NEON.textDim, fontSize: 10 }}>{USER.raceTargetPace}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tre anelli forma */}
      <div style={{ padding: '0 14px 14px' }}>
        <SectionHeader kicker="STATO ATTUALE" title="La tua forma" color={form.color}/>
        <GlowCard glow={form.color} intensity={0.15}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, alignItems:'center' }}>
            {/* Fitness ring */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
              <AnimatedRing
                size={86}
                stroke={7}
                value={Math.min(70, last.ctl)}
                max={70}
                color={NEON.teal}
              >
                <div style={{ textAlign:'center' }}>
                  <div style={{ color: NEON.teal, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textShadow: `0 0 8px ${NEON.teal}66` }}>{Math.round(last.ctl)}</div>
                  <div style={{ color: NEON.textFaint, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>CTL</div>
                </div>
              </AnimatedRing>
              <div style={{ color: NEON.text, fontSize: 11, fontWeight: 600 }}>Fitness</div>
            </div>

            {/* Fatica ring */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
              <AnimatedRing
                size={86}
                stroke={7}
                value={Math.min(80, last.atl)}
                max={80}
                color={NEON.orange}
              >
                <div style={{ textAlign:'center' }}>
                  <div style={{ color: NEON.orange, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textShadow: `0 0 8px ${NEON.orange}66` }}>{Math.round(last.atl)}</div>
                  <div style={{ color: NEON.textFaint, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>ATL</div>
                </div>
              </AnimatedRing>
              <div style={{ color: NEON.text, fontSize: 11, fontWeight: 600 }}>Fatica</div>
            </div>

            {/* TSB ring */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
              <AnimatedRing
                size={86}
                stroke={7}
                value={Math.max(0, Math.min(60, last.tsb + 30))}
                max={60}
                color={form.color}
              >
                <div style={{ textAlign:'center' }}>
                  <div style={{ color: form.color, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textShadow: `0 0 8px ${form.color}66` }}>
                    {last.tsb >= 0 ? '+' : ''}{Math.round(last.tsb)}
                  </div>
                  <div style={{ color: NEON.textFaint, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>TSB</div>
                </div>
              </AnimatedRing>
              <div style={{ color: form.color, fontSize: 11, fontWeight: 700 }}>{form.label}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: '10px 12px', background: `${form.color}10`, borderRadius: 10, borderLeft: `3px solid ${form.color}` }}>
            <div style={{ color: form.color, fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{form.desc}</div>
            <div style={{ color: NEON.textDim, fontSize: 11, lineHeight: 1.4 }}>{form.advice}</div>
          </div>
        </GlowCard>
      </div>

      {/* Avviso overtraining */}
      {overTr.flags?.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{
            background: `${NEON.orange}10`,
            border: `1px solid ${NEON.orange}33`,
            borderRadius: 14, padding: '12px 14px',
            display:'flex', gap: 10, alignItems:'flex-start',
          }}>
            <div style={{ width: 4, height: 30, background: NEON.orange, borderRadius: 2, flexShrink: 0, boxShadow: `0 0 6px ${NEON.orange}` }}/>
            <div style={{ flex: 1 }}>
              <div style={{ color: NEON.orange, fontSize: 12, fontWeight: 800 }}>{overTr.flags[0].title}</div>
              <div style={{ color: NEON.textDim, fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{overTr.flags[0].detail}</div>
            </div>
          </div>
        </div>
      )}

      {/* Workout di oggi */}
      <div style={{ padding: '0 14px 14px' }}>
        <SectionHeader kicker="OGGI" title="Allenamento" color={NEON.orange}/>
        <div onClick={() => onNav('workout', todayWorkout)} style={{
          background: `linear-gradient(135deg, ${NEON.orange}18 0%, ${NEON.bg2} 70%)`,
          border: `1px solid ${NEON.orange}33`,
          borderRadius: 18, padding: 16,
          cursor: 'pointer',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: NEON.text, fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>{todayWorkout.title}</div>
              <div style={{ color: NEON.textDim, fontSize: 11.5, marginTop: 3, lineHeight: 1.4 }}>{todayWorkout.detail}</div>
            </div>
            <div style={{
              background: NEON.orange, color: '#0A0A18',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
              padding: '4px 8px', borderRadius: 6,
              boxShadow: `0 0 10px ${NEON.orange}66`,
            }}>{todayWorkout.intensity}</div>
          </div>

          <div style={{ display:'flex', gap: 18, flexWrap:'wrap' }}>
            <div>
              <div style={{ color: NEON.textFaint, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>DISTANZA</div>
              <div style={{ color: NEON.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{todayWorkout.distance}<span style={{ fontSize: 11, color: NEON.textDim, marginLeft: 2 }}>km</span></div>
            </div>
            <div>
              <div style={{ color: NEON.textFaint, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>DURATA</div>
              <div style={{ color: NEON.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>~{todayWorkout.duration}<span style={{ fontSize: 11, color: NEON.textDim, marginLeft: 2 }}>min</span></div>
            </div>
            <div>
              <div style={{ color: NEON.textFaint, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>PASSO</div>
              <div style={{ color: NEON.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{todayWorkout.pace}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display:'flex', alignItems:'center', gap: 6, color: NEON.orange, fontSize: 11, fontWeight: 700 }}>
            Apri allenamento
            <span style={{ fontSize: 14 }}>→</span>
          </div>
        </div>
      </div>

      {/* PB Big numbers */}
      <div style={{ padding: '0 14px 14px' }}>
        <SectionHeader kicker="PERSONAL BEST" title="I tuoi record" color={NEON.purple}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
          {[
            { k: '5k',  label: '5K',  color: NEON.teal,   pb: PB['5k'] },
            { k: '10k', label: '10K', color: NEON.blue,   pb: PB['10k'] },
            { k: '21k', label: '21K', color: NEON.purple, pb: PB['21k'] },
          ].map(({ k, label, color, pb }) => (
            <div key={k} style={{
              background: NEON.bg2,
              border: `1px solid ${color}22`,
              borderRadius: 14, padding: '12px 10px',
              textAlign:'center',
              boxShadow: `0 0 14px ${color}11`,
            }}>
              <div style={{ color: color, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}>{label}</div>
              <div style={{ color: NEON.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, textShadow: `0 0 8px ${color}44` }}>{pb.time}</div>
              <div style={{ color: NEON.textDim, fontSize: 10, marginTop: 2 }}>{pb.pace}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Settimana progress */}
      <div style={{ padding: '0 14px 14px' }}>
        <GlowCard glow={NEON.teal} intensity={0.1}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>QUESTA SETTIMANA</div>
              <div style={{ color: NEON.text, fontSize: 14, fontWeight: 700, marginTop: 2 }}>Volume settimanale</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color: NEON.teal, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {weekStats.kmDone.toFixed(1)}
                <span style={{ color: NEON.textDim, fontSize: 12, fontWeight: 600 }}> / {weekStats.kmTarget} km</span>
              </div>
              <div style={{ color: NEON.textDim, fontSize: 10 }}>{weekStats.runs} uscite</div>
            </div>
          </div>
          {/* Bar */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow:'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (weekStats.kmDone / weekStats.kmTarget) * 100)}%`,
              background: `linear-gradient(90deg, ${NEON.teal}, ${NEON.blue})`,
              borderRadius: 3,
              boxShadow: `0 0 8px ${NEON.teal}66`,
              transition: 'width 0.6s ease',
            }}/>
          </div>
        </GlowCard>
      </div>

      <div style={{ height: 24 }}/>
    </div>
  );
}

Object.assign(window, { HomeV2 });
