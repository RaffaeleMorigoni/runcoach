// js/chart-components.jsx — Componenti chart aggiuntivi (RacePredictionCard)
const { useMemo: useMemoCC } = React;

// ─── helper format secondi → "h:mm:ss" o "m:ss" ───
function _fmtSec(sec) {
  if (!isFinite(sec) || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function _fmtPace(secPerKm) {
  if (!isFinite(secPerKm) || secPerKm <= 0) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ─── RacePredictionCard: predizione tempo gara con confronto target ──────────
// prediction = { predicted, optimistic, conservative, vdot, sources, tsbFactor }
function RacePredictionCard({ prediction, target, raceName, distanceKm = 21.097 }) {
  if (!prediction || !isFinite(prediction.predicted)) {
    return (
      <GlowCard glow={NEON.purple} intensity={0.1}>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <div style={{ fontSize: 22, opacity: 0.6 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: NEON.text, fontSize: 13, fontWeight: 700 }}>Predizione non disponibile</div>
            <div style={{ color: NEON.textDim, fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
              Servono almeno una corsa su 5K, 10K o 21K per stimare il tempo gara.
            </div>
          </div>
        </div>
      </GlowCard>
    );
  }

  const targetSec = useMemoCC(() => {
    if (!target) return null;
    const parts = target.split(':').map(Number);
    if (parts.length === 3) return parts[0]*3600 + parts[1]*60 + parts[2];
    if (parts.length === 2) return parts[0]*60 + parts[1];
    return null;
  }, [target]);

  const predicted = prediction.predicted;
  const predictedTime = _fmtSec(predicted);
  const predictedPace = _fmtPace(predicted / distanceKm);

  const diff = isFinite(targetSec) ? predicted - targetSec : 0;
  const ahead = diff < 0;
  const diffMin = Math.abs(Math.floor(Math.abs(diff) / 60));
  const diffSec = Math.abs(Math.round(Math.abs(diff) % 60));
  const diffColor = ahead ? NEON.teal : NEON.orange;

  const sourceLabel = prediction.sources?.length
    ? prediction.sources.map(s => s === '21k' ? '21K' : s === '10k' ? '10K' : '5K').join(' + ')
    : '—';

  return (
    <GlowCard glow={NEON.purple} intensity={0.18}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em' }}>STIMA TEMPO</div>
          <div style={{ color: NEON.text, fontSize: 13, fontWeight: 600, marginTop: 2 }}>{raceName || 'Mezza maratona'}</div>
        </div>
        {prediction.vdot && (
          <div style={{
            background: 'rgba(167,139,250,0.15)',
            border: '1px solid rgba(167,139,250,0.35)',
            color: NEON.purple,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            padding: '4px 8px', borderRadius: 6,
          }}>VDOT {prediction.vdot}</div>
        )}
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
        }}>{predictedTime}</div>
        <div style={{ color: NEON.textDim, fontSize: 11, marginTop: 6 }}>
          predizione · passo {predictedPace}/km
        </div>
        {(prediction.optimistic && prediction.conservative) && (
          <div style={{ color: NEON.textFaint, fontSize: 10, marginTop: 4 }}>
            range: {_fmtSec(prediction.optimistic)} – {_fmtSec(prediction.conservative)}
          </div>
        )}
      </div>

      {/* Target comparison */}
      {isFinite(targetSec) && targetSec > 0 && (
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
              {ahead ? 'In anticipo di' : 'In ritardo di'} {diffMin}:{String(diffSec).padStart(2,'0')}
            </div>
          </div>
          <div style={{ fontSize: 24 }}>{ahead ? '🎯' : '💪'}</div>
        </div>
      )}

      <div style={{ color: NEON.textFaint, fontSize: 10, marginTop: 10, textAlign:'center' }}>
        Calcolato da PB su {sourceLabel} · {prediction.confidence ? `confidenza ${prediction.confidence}` : ''} · correzione forma TSB
      </div>
    </GlowCard>
  );
}

Object.assign(window, { RacePredictionCard });
