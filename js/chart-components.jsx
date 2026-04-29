// js/chart-components.jsx — Componenti chart aggiuntivi (RacePredictionCard)
const { useMemo: useMemoCC } = React;

// ─── RacePredictionCard: predizione tempo gara con confronto target ──────────
function RacePredictionCard({ prediction, target, raceName }) {
  if (!prediction) return null;

  // prediction = { time: "1:55:32", seconds: ..., vdot: ..., basedOn: '21k' }
  // target = "1:58:00"
  const targetSec = useMemoCC(() => {
    if (!target) return null;
    const parts = target.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return null;
  }, [target]);

  const diff = targetSec ? prediction.seconds - targetSec : 0;
  const ahead = diff < 0; // predetto più veloce di target
  const diffMin = Math.abs(Math.floor(diff / 60));
  const diffSec = Math.abs(Math.round(diff % 60));
  const diffLabel = `${ahead ? '−' : '+'}${diffMin}:${String(diffSec).padStart(2,'0')}`;
  const diffColor = ahead ? NEON.teal : NEON.orange;

  return (
    <GlowCard glow={NEON.purple} intensity={0.18}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>STIMA TEMPO</div>
          <div style={{ color: NEON.text, fontSize: 13, fontWeight: 600, marginTop: 2 }}>{raceName || 'Mezza maratona'}</div>
        </div>
        <div style={{
          background: 'rgba(167,139,250,0.15)',
          border: '1px solid rgba(167,139,250,0.35)',
          color: NEON.purple,
          fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
          padding: '4px 8px', borderRadius: 6,
        }}>VDOT {prediction.vdot}</div>
      </div>

      {/* Big predicted time */}
      <div style={{ textAlign:'center', padding: '8px 0 12px' }}>
        <div style={{
          color: NEON.purple,
          fontSize: 56,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          textShadow: `0 0 20px ${NEON.purple}66`,
        }}>{prediction.time}</div>
        <div style={{ color: NEON.textDim, fontSize: 11, marginTop: 6 }}>
          predizione attuale · passo {prediction.pace}/km
        </div>
      </div>

      {/* Target comparison */}
      {targetSec && (
        <div style={{
          marginTop: 4,
          padding: '12px 14px',
          background: `${diffColor}10`,
          borderLeft: `3px solid ${diffColor}`,
          borderRadius: 8,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ color: NEON.textDim, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em' }}>vs TARGET {target}</div>
            <div style={{ color: diffColor, fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 2 }}>
              {ahead ? 'In anticipo di' : 'In ritardo di'} {diffLabel.replace(/^[−+]/, '')}
            </div>
          </div>
          <div style={{ fontSize: 24 }}>{ahead ? '🎯' : '💪'}</div>
        </div>
      )}

      {prediction.basedOn && (
        <div style={{ color: NEON.textFaint, fontSize: 10, marginTop: 10, textAlign:'center' }}>
          Calcolato dal tuo PB su {prediction.basedOn === '21k' ? '21K' : prediction.basedOn === '10k' ? '10K' : '5K'} con correzione forma TSB
        </div>
      )}
    </GlowCard>
  );
}

Object.assign(window, { RacePredictionCard });
