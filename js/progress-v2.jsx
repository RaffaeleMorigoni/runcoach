// js/progress-v2.jsx — Progressi con CTL/ATL/TSB + predizione + confronto piano
const { useState: useStateP2, useEffect: useEffectP2, useMemo: useMemoP2 } = React;

function ProgressV2({ tweaks }) {
  const [activities, setActivities] = useStateP2([]);
  const [loading, setLoading] = useStateP2(true);

  useEffectP2(() => {
    (async () => {
      try {
        const auth = await getValidAuth();
        if (!auth) { setLoading(false); return; }
        const acts = await fetchActivities(auth, 50);
        setActivities(acts);
      } catch (e) {}
      finally { setLoading(false); }
    })();
  }, []);

  const trainingData = useMemoP2(() => activitiesToTrainingData(activities), [activities]);
  const loadHistory  = useMemoP2(() => calculateTrainingLoad(trainingData, 60), [trainingData]);
  const last         = loadHistory[loadHistory.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
  const overTr       = useMemoP2(() => detectOvertraining(loadHistory, trainingData.slice(-10)), [loadHistory, trainingData]);

  // PB → predizione gara
  const pbs = useMemoP2(() => ({
    '5k':  { distanceMeters: 5000,  timeSec: PB['5k'].seconds,  daysAgo: 30 },
    '10k': { distanceMeters: 10000, timeSec: PB['10k'].seconds, daysAgo: 30 },
    '21k': { distanceMeters: 21097, timeSec: PB['21k'].seconds, daysAgo: 90 },
  }), []);
  const prediction = useMemoP2(() => predictRaceTime(pbs, last.tsb, 21.097), [pbs, last.tsb]);

  // Statistiche aggregate
  const stats = useMemoP2(() => {
    const last30 = trainingData.filter(a => {
      const d = new Date(a.date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      return d >= cutoff;
    });
    const last7 = trainingData.filter(a => {
      const d = new Date(a.date);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      return d >= cutoff;
    });
    return {
      runs30: last30.length,
      km30: last30.reduce((s, a) => s + a.distance_km, 0),
      runs7: last7.length,
      km7: last7.reduce((s, a) => s + a.distance_km, 0),
      longest30: Math.max(0, ...last30.map(a => a.distance_km)),
      tssTotal30: last30.reduce((s, a) => s + a.tss, 0),
    };
  }, [trainingData]);

  const form = getFormLabel(last.tsb);

  // Pace trend (ultime 8 corse)
  const paceTrend = useMemoP2(() => {
    return trainingData
      .filter(a => a.avg_pace_sec_km)
      .slice(-8)
      .map((a, i) => ({ x: i, y: a.avg_pace_sec_km }));
  }, [trainingData]);

  if (loading) {
    return (
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, border: `3px solid ${NEON.orange}`, borderTopColor: 'transparent', animation: 'spinP2 0.8s linear infinite' }}/>
        <div style={{ color: NEON.textDim, fontSize: 12 }}>Calcolo metriche…</div>
        <style>{`@keyframes spinP2{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
      <div style={{ padding: '14px 16px 12px' }}>
        <div style={{ color: NEON.textDim, fontSize: 12, marginBottom: 2 }}>Analisi forma</div>
        <div style={{ color: NEON.text, fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
          Progressi<span style={{ color: NEON.orange }}>.</span>
        </div>
      </div>

      {/* TSB Big number hero */}
      <div style={{ padding: '0 14px 14px' }}>
        <GlowCard glow={form.color} intensity={0.2}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 6 }}>TRAINING STRESS BALANCE</div>
              <div style={{ display:'flex', alignItems:'baseline', gap: 6 }}>
                <BigNumber
                  value={last.tsb}
                  size={64}
                  weight={900}
                  color={form.color}
                  decimals={0}
                  animate={true}
                />
              </div>
              <div style={{ color: form.color, fontSize: 14, fontWeight: 700, marginTop: 2 }}>{form.label}</div>
              <div style={{ color: NEON.textDim, fontSize: 11.5, marginTop: 3 }}>{form.desc}</div>
            </div>
          </div>

          {/* Form curve grafico */}
          <FormCurve history={loadHistory} height={140}/>

          {/* Legenda */}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 12, gap: 12 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
              <div style={{ width: 10, height: 2, background: NEON.teal, borderRadius: 1, boxShadow: `0 0 4px ${NEON.teal}` }}/>
              <span style={{ color: NEON.textDim, fontSize: 10, fontWeight: 600 }}>Fitness {Math.round(last.ctl)}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
              <div style={{ width: 10, height: 2, background: NEON.orange, borderRadius: 1, boxShadow: `0 0 4px ${NEON.orange}` }}/>
              <span style={{ color: NEON.textDim, fontSize: 10, fontWeight: 600 }}>Fatica {Math.round(last.atl)}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
              <div style={{ width: 10, height: 2, background: NEON.purple, borderRadius: 1, boxShadow: `0 0 4px ${NEON.purple}` }}/>
              <span style={{ color: NEON.textDim, fontSize: 10, fontWeight: 600 }}>Forma {last.tsb >= 0 ? '+' : ''}{Math.round(last.tsb)}</span>
            </div>
          </div>
        </GlowCard>
      </div>

      {/* Predizione gara */}
      {prediction && (
        <div style={{ padding: '0 14px 14px' }}>
          <SectionHeader kicker="VDOT" title="Stima tempo gara" color={NEON.purple}/>
          <RacePredictionCard prediction={prediction} target={USER.raceTargetTime} raceName={USER.raceName}/>
        </div>
      )}

      {/* Stats 30gg — big numbers */}
      <div style={{ padding: '0 14px 14px' }}>
        <SectionHeader kicker="ULTIMI 30 GIORNI" title="Volume e carico" color={NEON.teal}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
          <GlowCard glow={NEON.teal} intensity={0.1} padding={14}>
            <BigNumber
              value={stats.km30}
              suffix="km"
              size={32}
              weight={800}
              color={NEON.teal}
              decimals={1}
              label="DISTANZA"
              sublabel={`${stats.runs30} uscite`}
            />
          </GlowCard>
          <GlowCard glow={NEON.blue} intensity={0.1} padding={14}>
            <BigNumber
              value={stats.tssTotal30}
              size={32}
              weight={800}
              color={NEON.blue}
              decimals={0}
              label="TSS TOTALE"
              sublabel="Stress allenamento"
            />
          </GlowCard>
          <GlowCard glow={NEON.purple} intensity={0.1} padding={14}>
            <BigNumber
              value={stats.longest30}
              suffix="km"
              size={32}
              weight={800}
              color={NEON.purple}
              decimals={1}
              label="LUNGO MAX"
              sublabel="Distanza singola"
            />
          </GlowCard>
          <GlowCard glow={NEON.yellow} intensity={0.1} padding={14}>
            <BigNumber
              value={stats.km7}
              suffix="km"
              size={32}
              weight={800}
              color={NEON.yellow}
              decimals={1}
              label="QUESTA SETT."
              sublabel={`${stats.runs7} uscite`}
            />
          </GlowCard>
        </div>
      </div>

      {/* Pace trend */}
      {paceTrend.length >= 3 && (
        <div style={{ padding: '0 14px 14px' }}>
          <GlowCard glow={NEON.orange} intensity={0.1}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>ANDAMENTO PASSO</div>
                <div style={{ color: NEON.text, fontSize: 14, fontWeight: 600, marginTop: 2 }}>Ultime {paceTrend.length} corse</div>
              </div>
              {paceTrend.length >= 4 && (() => {
                const first = paceTrend[0].y;
                const last = paceTrend[paceTrend.length - 1].y;
                const diff = first - last;
                const better = diff > 0;
                return (
                  <div style={{
                    background: better ? 'rgba(0,229,192,0.15)' : 'rgba(255,68,34,0.15)',
                    color: better ? NEON.teal : NEON.orange,
                    fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                  }}>
                    {better ? '↓' : '↑'} {Math.abs(Math.round(diff))}″ /km
                  </div>
                );
              })()}
            </div>
            {/* Inverti i valori per la visualizzazione (più basso = migliore = visualmente più alto) */}
            <MiniChart
              data={paceTrend.map(p => ({ x: p.x, y: -p.y }))}
              color={NEON.orange}
              height={70}
              fillArea={true}
            />
          </GlowCard>
        </div>
      )}

      {/* Overtraining flags dettagliati */}
      {overTr.flags?.length > 0 && (
        <div style={{ padding: '0 14px 14px' }}>
          <SectionHeader kicker="ATTENZIONE" title="Segnali del corpo" color={NEON.orange}/>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {overTr.flags.map((flag, i) => {
              const sevColor = flag.severity === 'high' ? NEON.orange : flag.severity === 'medium' ? NEON.yellow : NEON.blue;
              return (
                <div key={i} style={{
                  background: `${sevColor}10`,
                  border: `1px solid ${sevColor}33`,
                  borderRadius: 12, padding: '12px 14px',
                  display:'flex', gap: 10, alignItems:'flex-start',
                }}>
                  <div style={{ width: 4, height: 30, background: sevColor, borderRadius: 2, flexShrink: 0, boxShadow: `0 0 6px ${sevColor}` }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: sevColor, fontSize: 12, fontWeight: 800 }}>{flag.title}</div>
                    <div style={{ color: NEON.textDim, fontSize: 11.5, marginTop: 4, lineHeight: 1.4 }}>{flag.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ height: 24 }}/>
    </div>
  );
}

Object.assign(window, { ProgressV2 });
