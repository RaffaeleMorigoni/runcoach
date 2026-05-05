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
          // Carica fino a 200 attività (massimo Strava per page) per avere lo storico completo.
          const [acts, ath] = await Promise.all([
            fetchActivities(auth, 200),
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
  // Safe: garantisce che ctl/atl/tsb siano numeri finiti (evita NaN in UI)
  const safeNum = (v, d = 0) => Number.isFinite(+v) ? +v : d;
  const ctlVal  = safeNum(last.ctl);
  const atlVal  = safeNum(last.atl);
  const tsbVal  = safeNum(last.tsb);
  const overTr       = useMemoH2(() => detectOvertraining(loadHistory, trainingData.slice(-7)), [loadHistory, trainingData]);
  const form         = getFormLabel(tsbVal);

  // PB calcolati dalle attività Strava (fallback ai PB hardcoded)
  const pbs = useMemoH2(() => computePBsFromActivities(activities, PB), [activities]);

  // Volume settimanale medio dalle attività (fallback al tweak/USER)
  const avgWeekly = useMemoH2(() => computeWeeklyAverage(trainingData, 4), [trainingData]);

  // Workout di oggi (relativo alla gara)
  const todayWorkout = useMemoH2(() => generateTodayWorkout(loadHistory, USER.raceDateISO || USER.raceDate), [loadHistory]);

  // ─── Ricalibrazione piano automatica ───────────────────────────────────────
  // Carica il piano precedente da localStorage, ricalibra, salva il nuovo
  const recal = useMemoH2(() => {
    if (loading || activities.length === 0) return null;
    let lastPlan = null;
    try {
      const raw = localStorage.getItem('rc_lastPlan');
      if (raw) lastPlan = JSON.parse(raw);
    } catch(e) {}
    return recalibratePlan({
      activities,
      loadHistory,
      raceDateStr: USER.raceDateISO || USER.raceDate,
      lastPlan,
    });
  }, [loadHistory, activities, loading]);

  // Banner dismiss state — persiste su localStorage per timestamp del recalc
  const recalKey = recal?.timestamp?.slice(0, 10) || '';
  const [bannerDismissed, setBannerDismissed] = useStateH2(false);
  useEffectH2(() => {
    if (!recalKey) return;
    const dismissed = localStorage.getItem('rc_recalDismissed_' + recalKey);
    setBannerDismissed(!!dismissed);
  }, [recalKey]);

  // Salva il piano corrente per confronto al prossimo refresh
  useEffectH2(() => {
    if (recal?.plan) {
      try {
        localStorage.setItem('rc_lastPlan', JSON.stringify(recal.plan.map(d => ({
          date: d.date, workout: d.workout
        }))));
      } catch(e) {}
    }
  }, [recal?.timestamp]);

  const showBanner = recal && recal.changes.length > 0 && !bannerDismissed;
  const dismissBanner = () => {
    if (recalKey) localStorage.setItem('rc_recalDismissed_' + recalKey, '1');
    setBannerDismissed(true);
  };

  // Race countdown — usa raceDateISO (parsabile), fallback su USER.daysToRace
  const daysToRace = useMemoH2(() => {
    const iso = USER.raceDateISO || (typeof USER.raceDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(USER.raceDate) ? USER.raceDate : null);
    if (iso) {
      const race = new Date(iso + 'T12:00:00');
      const now = new Date();
      const d = Math.ceil((race - now) / 86400000);
      if (Number.isFinite(d)) return Math.max(0, d);
    }
    return Number.isFinite(USER.daysToRace) ? USER.daysToRace : 0;
  }, []);

  // Settimana km progress (target = media reale ultime 4 sett, fallback a tweak)
  const weekStats = useMemoH2(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0,0,0,0);
    const weekActs = trainingData.filter(a => {
      const d = new Date(a.date);
      return Number.isFinite(d.getTime()) && d >= monday;
    });
    const kmDoneRaw = weekActs.reduce((s, a) => s + (Number.isFinite(+a.distance_km) ? +a.distance_km : 0), 0);
    const kmDone = Number.isFinite(kmDoneRaw) ? kmDoneRaw : 0;
    const avg = Number.isFinite(+avgWeekly?.avgKm) ? +avgWeekly.avgKm : 0;
    const target = avg > 0 ? Math.round(avg) : (Number.isFinite(+tweaks?.weeklyKm) ? +tweaks.weeklyKm : 25);
    return {
      kmDone,
      kmTarget: target,
      runs: weekActs.length,
      isAvg: avg > 0,
    };
  }, [trainingData, avgWeekly, tweaks.weeklyKm]);

  // Nome: Strava firstname > tweak > USER fallback
  const userName = athlete?.firstname || tweaks.userName || USER.name;
  const today = new Date();
  const dayLabel = today.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const noData = !loading && activities.length === 0;

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

      {/* Tre anelli forma — solo se ci sono dati */}
      {noData ? (
        <div style={{ padding: '0 14px 14px' }}>
          <GlowCard glow={NEON.yellow} intensity={0.1}>
            <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
              <div style={{ fontSize: 28 }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: NEON.text, fontSize: 13, fontWeight: 700 }}>Nessuna corsa trovata</div>
                <div style={{ color: NEON.textDim, fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
                  CTL/ATL/TSB e PB si calcolano dalle tue attività. Carica almeno una corsa su Strava per vedere i grafici.
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
      ) : (
        <div style={{ padding: '0 14px 14px' }}>
          <SectionHeader kicker="STATO ATTUALE" title="La tua forma" color={form.color}/>
        <GlowCard glow={form.color} intensity={0.15}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8, alignItems:'center' }}>
            {/* Fitness ring */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
              <AnimatedRing
                size={86}
                stroke={7}
                value={Math.min(70, ctlVal)}
                max={70}
                color={NEON.teal}
              >
                <div style={{ textAlign:'center' }}>
                  <div style={{ color: NEON.teal, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textShadow: `0 0 8px ${NEON.teal}66` }}>{Math.round(ctlVal)}</div>
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
                value={Math.min(80, atlVal)}
                max={80}
                color={NEON.orange}
              >
                <div style={{ textAlign:'center' }}>
                  <div style={{ color: NEON.orange, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textShadow: `0 0 8px ${NEON.orange}66` }}>{Math.round(atlVal)}</div>
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
                value={Math.max(0, Math.min(60, tsbVal + 30))}
                max={60}
                color={form.color}
              >
                <div style={{ textAlign:'center' }}>
                  <div style={{ color: form.color, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', textShadow: `0 0 8px ${form.color}66` }}>
                    {tsbVal >= 0 ? '+' : ''}{Math.round(tsbVal)}
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
      )}

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
        <SectionHeader kicker="PERSONAL BEST" title={pbs?.['5k']?.fromStrava ? 'Da Strava' : 'I tuoi record'} color={NEON.purple}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
          {[
            { k: '5k',  label: '5K',  color: NEON.teal,   pb: pbs?.['5k'] },
            { k: '10k', label: '10K', color: NEON.blue,   pb: pbs?.['10k'] },
            { k: '21k', label: '21K', color: NEON.purple, pb: pbs?.['21k'] },
          ].map(({ k, label, color, pb }) => (
            <div key={k} style={{
              background: NEON.bg2,
              border: `1px solid ${color}22`,
              borderRadius: 14, padding: '12px 10px',
              textAlign:'center',
              boxShadow: `0 0 14px ${color}11`,
            }}>
              <div style={{ color: color, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em' }}>{label}</div>
              <div style={{ color: NEON.text, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4, textShadow: `0 0 8px ${color}44` }}>{pb?.time || '—'}</div>
              <div style={{ color: NEON.textDim, fontSize: 10, marginTop: 2 }}>{pb?.pace || ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ultime corse da Strava */}
      {activities && activities.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <SectionHeader kicker="STRAVA" title="Ultime corse" color={NEON.orange}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.slice(0, 5).map((a, i) => {
              const km = a.distance ? (a.distance / 1000) : 0;
              const mins = a.moving_time ? Math.round(a.moving_time / 60) : 0;
              const paceSec = a.average_speed ? 1000 / a.average_speed : null;
              const paceStr = paceSec
                ? `${Math.floor(paceSec/60)}:${String(Math.round(paceSec%60)).padStart(2,'0')}/km`
                : '—';
              const hr = a.average_heartrate ? Math.round(a.average_heartrate) : null;
              const date = a.start_date_local || a.start_date;
              const d = date ? new Date(date) : null;
              const dateStr = d && Number.isFinite(d.getTime())
                ? d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', weekday: 'short' })
                : '';
              const isRace = (a.workout_type === 1) || /gara|race/i.test(a.name || '');
              const accentColor = isRace ? NEON.orange : (km >= 14 ? NEON.blue : (paceSec && paceSec < 320 ? NEON.yellow : NEON.teal));

              return (
                <div key={a.id || i} style={{
                  background: NEON.bg2,
                  border: `1px solid ${accentColor}22`,
                  borderRadius: 14,
                  padding: 12,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 22,
                    background: `${accentColor}22`,
                    border: `1px solid ${accentColor}66`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 20,
                  }}>
                    {isRace ? '🏁' : (km >= 14 ? '🏔' : (paceSec && paceSec < 320 ? '⚡' : '🏃'))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{
                        color: NEON.text, fontSize: 13, fontWeight: 700,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '70%',
                      }}>
                        {a.name || 'Run'}
                      </div>
                      <div style={{ color: NEON.textDim, fontSize: 10, flexShrink: 0 }}>{dateStr}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'baseline' }}>
                      <div style={{ color: accentColor, fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
                        {km.toFixed(2)}<span style={{ fontSize: 10, color: NEON.textDim, fontWeight: 600 }}>km</span>
                      </div>
                      <div style={{ color: NEON.textDim, fontSize: 12 }}>{paceStr}</div>
                      <div style={{ color: NEON.textDim, fontSize: 12 }}>{mins}min</div>
                      {hr && <div style={{ color: NEON.textDim, fontSize: 12 }}>{hr}♥</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settimana progress */}
      <div style={{ padding: '0 14px 14px' }}>
        <GlowCard glow={NEON.teal} intensity={0.1}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 10 }}>
            <div>
              <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>QUESTA SETTIMANA</div>
              <div style={{ color: NEON.text, fontSize: 14, fontWeight: 700, marginTop: 2 }}>
                Volume {weekStats.isAvg ? `· media ult. 4 sett` : ''}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ color: NEON.teal, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {(Number.isFinite(weekStats.kmDone) ? weekStats.kmDone : 0).toFixed(1)}
                <span style={{ color: NEON.textDim, fontSize: 12, fontWeight: 600 }}> / {weekStats.kmTarget} km</span>
              </div>
              <div style={{ color: NEON.textDim, fontSize: 10 }}>{weekStats.runs} uscite</div>
            </div>
          </div>
          {/* Bar — guard contro divisione per 0 */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow:'hidden' }}>
            <div style={{
              height: '100%',
              width: weekStats.kmTarget > 0 ? `${Math.min(100, (weekStats.kmDone / weekStats.kmTarget) * 100)}%` : '0%',
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
