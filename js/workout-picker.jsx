// ─── WorkoutPicker — "Choose a workout" stile Runna ─────────────────────────
// Carosello orizzontale di tile colorate per tipo. Selezione → preview → start.

const { useState: useStateWP, useMemo: useMemoWP, useEffect: useEffectWP } = React;

// 4 categorie principali, colori coerenti col design system esistente
const WORKOUT_CATEGORIES = [
  {
    id: 'easy',
    label: 'Easy Run',
    tagline: 'Volume in zona aerobica',
    color: '#00CFA8',  // teal
    bg: 'linear-gradient(135deg, #003d33 0%, #00231e 100%)',
    accent: '#00CFA8',
    icon: '🟢',
    intensity: 'Z1–Z2',
    purpose: 'Costruisci base aerobica, recupero attivo, aumenta capillarizzazione',
    durationRange: '30–60 min',
  },
  {
    id: 'tempo',
    label: 'Tempo / Soglia',
    tagline: 'Ritmo gara mezza',
    color: '#F6C94E',  // yellow
    bg: 'linear-gradient(135deg, #4d3a00 0%, #2b2000 100%)',
    accent: '#F6C94E',
    intensity: 'Z3–Z4',
    purpose: 'Alza la soglia anaerobica, abitua a tenere il ritmo gara',
    durationRange: '40–60 min',
  },
  {
    id: 'intervals',
    label: 'Intervalli / VO2',
    tagline: 'Velocità + potenza',
    color: '#FF4422',  // orange
    bg: 'linear-gradient(135deg, #4d0f00 0%, #2b0900 100%)',
    accent: '#FF4422',
    intensity: 'Z4–Z5',
    purpose: 'Migliora VO2max, economia di corsa, velocità di punta',
    durationRange: '35–55 min',
  },
  {
    id: 'long',
    label: 'Lungo',
    tagline: 'Resistenza specifica',
    color: '#4D9EFF',  // blue
    bg: 'linear-gradient(135deg, #002a4d 0%, #00182b 100%)',
    accent: '#4D9EFF',
    intensity: 'Z2',
    purpose: 'Costruisci endurance, abitua mente e gambe alla durata',
    durationRange: '70–120 min',
  },
];

// ─── Generatore workout dinamico in base ai dati Strava live ─────────────────
function generateWorkoutForCategory(category, stravaInsights, raceDays) {
  const ctl = stravaInsights?.ctl || 30;
  const tsb = stravaInsights?.tsb ?? 0;
  const avgPace = stravaInsights?.avgPaceSec || 360; // default 6:00/km
  const avgKm = stravaInsights?.avgWeeklyKm || 25;

  const fmtPace = (s) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}/km`;

  // Ritmi target derivati dal pace medio reale
  const easyPace = avgPace + 30;       // più lento dell'avg
  const tempoPace = Math.max(avgPace - 25, 270);  // più veloce
  const intervalPace = Math.max(avgPace - 50, 240);
  const longPace = avgPace + 15;

  // Adatta volume a TSB (se affaticato → riduci 20%)
  const fatigueScale = tsb < -15 ? 0.75 : (tsb < -5 ? 0.9 : 1.0);

  switch (category.id) {
    case 'easy':
      return {
        title: 'Easy Run',
        subtitle: 'Corsa rigenerante in Z2',
        category: 'easy',
        distance_km: +(Math.min(8, Math.max(5, avgKm / 4)) * fatigueScale).toFixed(1),
        duration_min: Math.round(40 * fatigueScale),
        target_pace: fmtPace(easyPace),
        target_pace_sec: easyPace,
        rpe: '4/10',
        hr_zone: 'Z1–Z2',
        steps: [
          { phase: 'warmup',  label: 'Riscaldamento', duration: '5 min',  pace: fmtPace(easyPace + 30), desc: 'Cammino + jogging molto lento' },
          { phase: 'main',    label: 'Easy continuo', duration: `${Math.round(30 * fatigueScale)} min`, pace: fmtPace(easyPace), desc: 'Ritmo conversazionale, FC sotto 75% max' },
          { phase: 'cooldown',label: 'Defaticamento', duration: '5 min',  pace: fmtPace(easyPace + 60), desc: 'Cammino + stretching dinamico' },
        ],
        why: 'Costruisce base aerobica senza affaticare. ' + (tsb < -10 ? 'TSB negativo: privilegia recupero.' : 'Stato di forma compatibile.'),
      };

    case 'tempo':
      return {
        title: 'Tempo Run',
        subtitle: 'Blocchi a ritmo soglia',
        category: 'tempo',
        distance_km: +(Math.min(10, Math.max(6, avgKm / 3.5)) * fatigueScale).toFixed(1),
        duration_min: Math.round(50 * fatigueScale),
        target_pace: fmtPace(tempoPace),
        target_pace_sec: tempoPace,
        rpe: '7/10',
        hr_zone: 'Z3–Z4',
        steps: [
          { phase: 'warmup',  label: 'Riscaldamento', duration: '12 min', pace: fmtPace(easyPace), desc: 'Jogging + 4 allunghi 80m' },
          { phase: 'main',    label: 'Blocchi tempo', duration: `2× ${Math.round(10*fatigueScale)} min`, pace: fmtPace(tempoPace), desc: `2 blocchi al ritmo gara mezza, recupero 3' easy tra i blocchi` },
          { phase: 'cooldown',label: 'Defaticamento', duration: '8 min',  pace: fmtPace(easyPace + 30), desc: 'Jogging lento + stretching' },
        ],
        why: 'Migliora capacità di sostenere ritmi sub-soglia. ' + (tsb > 0 ? 'TSB positivo: ottima finestra per qualità.' : 'Considera versione più breve se affaticato.'),
      };

    case 'intervals':
      const reps = tsb > 0 ? 6 : 5;
      return {
        title: 'Intervalli VO2max',
        subtitle: `${reps}×800m a ritmo veloce`,
        category: 'intervals',
        distance_km: +(reps * 0.8 + 4).toFixed(1),
        duration_min: Math.round(50 * fatigueScale),
        target_pace: fmtPace(intervalPace),
        target_pace_sec: intervalPace,
        rpe: '8/10',
        hr_zone: 'Z4–Z5',
        steps: [
          { phase: 'warmup',  label: 'Riscaldamento', duration: '15 min', pace: fmtPace(easyPace), desc: 'Jogging + 4 allunghi 100m + skip' },
          { phase: 'main',    label: `${reps}×800m`, duration: `~${Math.round(reps * 4 + (reps-1)*2.5)} min`, pace: fmtPace(intervalPace), desc: `${reps} ripetute da 800m, recupero 2'30" jogging` },
          { phase: 'cooldown',label: 'Defaticamento', duration: '10 min', pace: fmtPace(easyPace + 30), desc: 'Cammino + jogging molto lento + stretching' },
        ],
        why: 'Stimola VO2max e potenza aerobica. ' + (tsb < -10 ? '⚠ TSB basso: rinvia di 1-2 giorni o scegli easy oggi.' : 'Sessione chiave settimanale.'),
      };

    case 'long':
      const longKm = Math.min(22, Math.max(12, avgKm / 1.8)) * fatigueScale;
      return {
        title: 'Long Run',
        subtitle: `${Math.round(longKm)}km in Z2`,
        category: 'long',
        distance_km: +longKm.toFixed(1),
        duration_min: Math.round(longKm * 6.2),
        target_pace: fmtPace(longPace),
        target_pace_sec: longPace,
        rpe: '6/10',
        hr_zone: 'Z2',
        steps: [
          { phase: 'warmup',  label: 'Avvio progressivo', duration: '15 min', pace: fmtPace(longPace + 20), desc: 'Inizia molto lento, lascia che il corpo si adatti' },
          { phase: 'main',    label: `Lungo continuo`, duration: `${Math.round(longKm * 6.2 - 25)} min`, pace: fmtPace(longPace), desc: 'Ritmo Z2 stabile. Bevi, mangia se > 90 min.' },
          { phase: 'cooldown',label: 'Chiusura', duration: '10 min', pace: fmtPace(easyPace + 60), desc: 'Cammino + stretching prolungato' },
        ],
        why: 'Costruisce resistenza specifica. ' + (raceDays && raceDays < 21 ? 'Vicino alla gara: non superare i 18-20km.' : 'Spazio per costruire volume.'),
      };

    default:
      return null;
  }
}

// ─── Tile carosello ──────────────────────────────────────────────────────────
function WorkoutTile({ category, recommended, onClick, stats }) {
  const recommendedBadge = recommended && (
    <div style={{
      position: 'absolute', top: 14, right: 14,
      background: category.accent, color: '#000',
      fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
      padding: '3px 8px', borderRadius: 6,
    }}>
      OGGI
    </div>
  );

  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        width: 240, height: 280,
        background: category.bg,
        border: `1px solid ${category.accent}33`,
        borderRadius: 20,
        padding: 18,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        cursor: 'pointer',
        position: 'relative',
        textAlign: 'left',
        boxShadow: recommended ? `0 0 24px ${category.accent}33` : 'none',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {recommendedBadge}

      {/* Header */}
      <div>
        <div style={{
          fontSize: 11, color: category.accent, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8,
        }}>
          {category.intensity}
        </div>
        <div style={{
          fontSize: 24, color: '#fff', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05,
        }}>
          {category.label}
        </div>
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 6,
        }}>
          {category.tagline}
        </div>
      </div>

      {/* Footer stats */}
      <div>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6,
        }}>
          {category.durationRange}
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 22, color: '#fff', fontWeight: 800, letterSpacing: '-0.02em' }}>
                {stats.km}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>km</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: category.accent, fontWeight: 600 }}>
              {stats.pace}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Main picker screen ──────────────────────────────────────────────────────
function WorkoutPickerScreen({ tweaks, auth, onBack, onSelectWorkout }) {
  const [stravaActs, setStravaActs] = useStateWP(null);

  useEffectWP(() => {
    let cancelled = false;
    (async () => {
      if (!auth) { setStravaActs([]); return; }
      try {
        const acts = await fetchActivities(auth, 200);
        if (!cancelled) setStravaActs(acts || []);
      } catch (e) {
        if (!cancelled) setStravaActs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [auth]);

  const insights = useMemoWP(() => {
    if (!stravaActs || stravaActs.length === 0) return null;
    try {
      const td = activitiesToTrainingData(stravaActs);
      const lh = calculateTrainingLoad(td, 60);
      const last = lh[lh.length - 1] || { ctl: 0, atl: 0, tsb: 0 };
      const safe = (v) => Number.isFinite(+v) ? +v : 0;
      const now = Date.now();
      const last28 = td.filter(a => (now - new Date(a.date).getTime()) <= 28 * 86400000);
      const km28 = last28.reduce((s, a) => s + (Number.isFinite(+a.distance_km) ? +a.distance_km : 0), 0);
      const paces = last28.map(a => +a.avg_pace_sec_km).filter(Number.isFinite);
      const avgPaceSec = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : 360;
      return {
        ctl: safe(last.ctl),
        atl: safe(last.atl),
        tsb: safe(last.tsb),
        avgPaceSec,
        avgWeeklyKm: +(km28 / 4).toFixed(1),
      };
    } catch (e) { return null; }
  }, [stravaActs]);

  // Race date dinamico (post-Lucca → la prossima gara da tweaks o niente)
  const raceDays = (() => {
    const iso = tweaks.raceDateISO || (typeof tweaks.raceDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tweaks.raceDate) ? tweaks.raceDate : null);
    if (!iso) return null;
    const d = new Date(iso + 'T12:00:00');
    return Math.max(0, Math.ceil((d - new Date()) / 86400000));
  })();

  // Raccomandazione del giorno: scegli la categoria suggerita dal TSB + giorno della settimana
  const recommendedId = useMemoWP(() => {
    if (!insights) return 'easy';
    const tsb = insights.tsb;
    const dow = new Date().getDay(); // 0 = domenica
    if (tsb < -15) return 'easy';
    if (dow === 0) return 'long';      // domenica → lungo
    if (dow === 2 || dow === 4) return tsb > 0 ? 'intervals' : 'tempo';
    if (dow === 6) return 'long';      // sabato anche
    return 'easy';
  }, [insights]);

  const accent = tweaks.accentColor || C.orange;

  // Stats per ogni tile (km e pace target stimati)
  const tileStats = useMemoWP(() => {
    const out = {};
    WORKOUT_CATEGORIES.forEach(cat => {
      const w = generateWorkoutForCategory(cat, insights || {}, raceDays);
      if (w) {
        out[cat.id] = {
          km: w.distance_km,
          pace: w.target_pace,
        };
      }
    });
    return out;
  }, [insights, raceDays]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 19, background: C.card2, border: `1px solid ${C.border2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div>
          <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Allenamento di oggi
          </div>
          <div style={{ color: C.text, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Scegli il workout
          </div>
        </div>
      </div>

      {/* Insights bar */}
      {insights && (
        <div style={{
          margin: '8px 20px 0',
          padding: '10px 14px',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.teal, fontSize: 16, fontWeight: 800 }}>{Math.round(insights.ctl)}</div>
            <div style={{ color: C.faint, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>FITNESS</div>
          </div>
          <div style={{ width: 1, height: 28, background: C.border }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: insights.tsb >= 0 ? C.teal : C.orange,
              fontSize: 16, fontWeight: 800,
            }}>
              {insights.tsb >= 0 ? '+' : ''}{Math.round(insights.tsb)}
            </div>
            <div style={{ color: C.faint, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>FORMA</div>
          </div>
          <div style={{ width: 1, height: 28, background: C.border }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 800 }}>{insights.avgWeeklyKm}<span style={{ fontSize: 10, color: C.sub }}> km</span></div>
            <div style={{ color: C.faint, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>SETT MEDIA</div>
          </div>
        </div>
      )}

      {!auth && (
        <div style={{
          margin: '8px 20px 0',
          padding: '12px 14px',
          background: C.orangeDim,
          border: `1px solid ${C.orangeMid}`,
          borderRadius: 12,
          color: C.text,
          fontSize: 13,
        }}>
          ⚠ Collega Strava per workout calibrati sui tuoi ritmi reali.
        </div>
      )}

      {/* Carosello tile */}
      <div style={{ marginTop: 18, paddingLeft: 20 }}>
        <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 10, textTransform: 'uppercase' }}>
          Categorie · scorri →
        </div>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingRight: 20, paddingBottom: 10,
          scrollbarWidth: 'none',
        }}>
          {WORKOUT_CATEGORIES.map(cat => (
            <WorkoutTile
              key={cat.id}
              category={cat}
              recommended={cat.id === recommendedId}
              stats={tileStats[cat.id]}
              onClick={() => {
                const workout = generateWorkoutForCategory(cat, insights || {}, raceDays);
                if (workout && onSelectWorkout) onSelectWorkout(workout);
              }}
            />
          ))}
        </div>
      </div>

      {/* Sezione "perché" della raccomandazione */}
      {insights && (() => {
        const recCat = WORKOUT_CATEGORIES.find(c => c.id === recommendedId);
        const recWorkout = generateWorkoutForCategory(recCat, insights, raceDays);
        return (
          <div style={{
            margin: '20px 20px 0',
            padding: 16,
            background: `linear-gradient(135deg, ${recCat.accent}11 0%, transparent 100%)`,
            border: `1px solid ${recCat.accent}33`,
            borderRadius: 16,
          }}>
            <div style={{ color: recCat.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
              CONSIGLIATO OGGI · {recCat.label.toUpperCase()}
            </div>
            <div style={{ color: C.text, fontSize: 14, lineHeight: 1.5 }}>
              {recWorkout.why}
            </div>
          </div>
        );
      })()}

      <div style={{ height: 24 }} />
    </div>
  );
}

// ─── Workout detail (warmup → main → cooldown) ───────────────────────────────
function WorkoutDetailScreen({ workout, tweaks, onBack, onStart }) {
  if (!workout) return null;
  const cat = WORKOUT_CATEGORIES.find(c => c.id === workout.category) || WORKOUT_CATEGORIES[0];
  const accent = cat.accent;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header colorato */}
      <div style={{
        padding: '16px 20px 22px',
        background: cat.bg,
        position: 'relative',
      }}>
        <button onClick={onBack} style={{
          width: 38, height: 38, borderRadius: 19, background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.15)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div style={{ marginTop: 14 }}>
          <div style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
            {cat.intensity} · RPE {workout.rpe}
          </div>
          <div style={{ color: '#fff', fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 4 }}>
            {workout.title}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
            {workout.subtitle}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 18, marginTop: 18 }}>
            <div>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{workout.distance_km}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>km</span></div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>DISTANZA</div>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{workout.duration_min}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>min</span></div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>DURATA</div>
            </div>
            <div>
              <div style={{ color: accent, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{workout.target_pace}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>RITMO</div>
            </div>
          </div>
        </div>
      </div>

      {/* Why */}
      {workout.why && (
        <div style={{
          margin: '16px 20px 0',
          padding: 14,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          color: C.text,
          fontSize: 13,
          lineHeight: 1.5,
        }}>
          <div style={{ color: accent, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 4 }}>
            PERCHÉ QUESTO WORKOUT
          </div>
          {workout.why}
        </div>
      )}

      {/* Steps */}
      <div style={{ padding: '20px' }}>
        <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12, textTransform: 'uppercase' }}>
          Struttura
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workout.steps.map((step, i) => {
            const phaseColors = { warmup: '#A78BFA', main: accent, cooldown: '#4D9EFF' };
            const phaseColor = phaseColors[step.phase] || accent;
            return (
              <div key={i} style={{
                background: C.card,
                border: `1px solid ${C.border2}`,
                borderRadius: 14,
                padding: 14,
                display: 'flex',
                gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18,
                  background: `${phaseColor}22`,
                  border: `1px solid ${phaseColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: phaseColor, fontWeight: 800, fontSize: 14,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 700 }}>{step.label}</div>
                    <div style={{ color: phaseColor, fontSize: 12, fontWeight: 700 }}>{step.duration}</div>
                  </div>
                  <div style={{ color: C.sub, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                    {step.desc}
                  </div>
                  <div style={{ color: C.faint, fontSize: 11, marginTop: 4 }}>
                    Ritmo target: <span style={{ color: phaseColor, fontWeight: 600 }}>{step.pace}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={() => onStart && onStart(workout)}
            style={{
              flex: 1,
              padding: '16px',
              background: accent,
              border: 'none',
              borderRadius: 14,
              color: '#000',
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.02em',
              cursor: 'pointer',
            }}
          >
            INVIA A GARMIN
          </button>
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}

// ─── Plan Selector — scegli un piano post-Lucca ──────────────────────────────
const PLAN_OPTIONS = [
  {
    id: 'recovery',
    name: 'Recupero attivo',
    weeks: 2,
    duration: '2 settimane',
    desc: 'Recupero post-mezza maratona, easy run brevi',
    bg: 'linear-gradient(135deg, #003d33 0%, #001a16 100%)',
    accent: C.teal,
    icon: '🌿',
    weeklyKm: 18,
    sessionsPerWeek: 3,
  },
  {
    id: 'maintain',
    name: 'Mantenimento',
    weeks: 4,
    duration: '4 settimane · open-end',
    desc: 'Mantieni la forma con volume moderato e qualche qualità',
    bg: 'linear-gradient(135deg, #002a4d 0%, #00162b 100%)',
    accent: C.blue,
    icon: '⚖️',
    weeklyKm: 30,
    sessionsPerWeek: 4,
  },
  {
    id: '10k',
    name: '10k Plan',
    weeks: 8,
    duration: '8 settimane',
    desc: 'Migliora il PB sui 10km con ripetute e tempo run',
    bg: 'linear-gradient(135deg, #4d3a00 0%, #2b2000 100%)',
    accent: C.yellow,
    icon: '⚡',
    weeklyKm: 35,
    sessionsPerWeek: 4,
  },
  {
    id: 'marathon',
    name: 'Marathon Build',
    weeks: 16,
    duration: '16 settimane',
    desc: 'Costruzione completa per la maratona, lunghi progressivi',
    bg: 'linear-gradient(135deg, #4d0f00 0%, #2b0900 100%)',
    accent: C.orange,
    icon: '🏔',
    weeklyKm: 55,
    sessionsPerWeek: 5,
  },
];

function PlanSelectorScreen({ tweaks, onBack, onSelectPlan }) {
  const accent = tweaks.accentColor || C.orange;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{
            width: 38, height: 38, borderRadius: 19, background: C.card2, border: `1px solid ${C.border2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: C.sub, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Dopo Lucca
          </div>
          <div style={{ color: C.text, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Prossimo piano
          </div>
          <div style={{ color: C.sub, fontSize: 13, marginTop: 4 }}>
            Hai chiuso la mezza. Cosa vuoi fare adesso?
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PLAN_OPTIONS.map(plan => (
          <button
            key={plan.id}
            onClick={() => onSelectPlan && onSelectPlan(plan)}
            style={{
              background: plan.bg,
              border: `1px solid ${plan.accent}33`,
              borderRadius: 18,
              padding: 18,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 12,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: plan.accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>
                  {plan.duration.toUpperCase()}
                </div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 3, lineHeight: 1.15 }}>
                  {plan.name}
                </div>
              </div>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{plan.icon}</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.45 }}>
              {plan.desc}
            </div>
            <div style={{ display: 'flex', gap: 22, marginTop: 4, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>{plan.weeklyKm}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>km</span></div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>SETTIMANALI</div>
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>{plan.sessionsPerWeek}<span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>×</span></div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>USCITE</div>
              </div>
              <div>
                <div style={{ color: plan.accent, fontSize: 16, fontWeight: 800 }}>{plan.weeks}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>SETTIMANE</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Esporta globalmente per altri script (Babel non condivide scope)
Object.assign(window, {
  WorkoutPickerScreen,
  WorkoutDetailScreen,
  PlanSelectorScreen,
  generateWorkoutForCategory,
  WORKOUT_CATEGORIES,
  PLAN_OPTIONS,
});
