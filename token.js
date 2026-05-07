// js/design-system.jsx — Componenti core "sport-tech audace"
// Tutti i componenti hanno glow neon, animazioni sottili, fondi scuri.
const { useEffect: useEffectDS, useRef: useRefDS, useState: useStateDS } = React;

// ─── Tokens estesi ────────────────────────────────────────────────────────────
const NEON = {
  orange:    '#FF4422',
  orangeBri: '#FF6644',
  orangeDim: 'rgba(255,68,34,0.15)',
  orangeGlow:'rgba(255,68,34,0.45)',
  teal:      '#00E5C0',
  tealDim:   'rgba(0,229,192,0.15)',
  tealGlow:  'rgba(0,229,192,0.4)',
  blue:      '#4D9EFF',
  blueDim:   'rgba(77,158,255,0.15)',
  blueGlow:  'rgba(77,158,255,0.4)',
  purple:    '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.15)',
  purpleGlow:'rgba(167,139,250,0.4)',
  yellow:    '#FFD24E',
  yellowDim: 'rgba(255,210,78,0.15)',
  red:       '#FF3355',
  bg:        '#06060E',
  bgCard:    '#0E0E1F',
  bgCardHi:  '#15152C',
  border:    'rgba(255,255,255,0.08)',
  borderHi:  'rgba(255,255,255,0.16)',
  text:      '#EEEEF8',
  textDim:   'rgba(238,238,248,0.6)',
  textFaint: 'rgba(238,238,248,0.35)',
};

// ─── BigNumber: tipografia gigante con animazione count-up ─────────────────────
function BigNumber({ value, suffix, color, size = 72, weight = 800, animate = true, duration = 800, decimals = 0, label, sublabel }) {
  const [display, setDisplay] = useStateDS(animate ? 0 : value);
  const startedRef = useRefDS(false);

  useEffectDS(() => {
    if (!animate) { setDisplay(value); return; }
    if (startedRef.current) { setDisplay(value); return; }
    startedRef.current = true;

    const start = performance.now();
    const from = 0;
    const to = +value || 0;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      {label && (
        <div style={{ color: NEON.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      )}
      <div style={{ display:'flex', alignItems:'baseline', gap: 4, lineHeight: 0.9 }}>
        <span style={{
          color: color || NEON.text,
          fontSize: size,
          fontWeight: weight,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          textShadow: color ? `0 0 30px ${color}66` : 'none',
        }}>{formatted}</span>
        {suffix && (
          <span style={{ color: NEON.textDim, fontSize: size * 0.32, fontWeight: 500, letterSpacing: '-0.02em' }}>{suffix}</span>
        )}
      </div>
      {sublabel && (
        <div style={{ color: NEON.textDim, fontSize: 12, marginTop: 6 }}>{sublabel}</div>
      )}
    </div>
  );
}

// ─── AnimatedRing: anello con animazione progressiva ─────────────────────────
function AnimatedRing({ value, max = 100, size = 120, stroke = 10, color, label, sublabel, glow = true, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [progress, setProgress] = useStateDS(0);

  useEffectDS(() => {
    const start = performance.now();
    const dur = 1000;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, max]);

  const pct = Math.max(0, Math.min(1, value / max));
  const dashOffset = circ * (1 - pct * progress);
  const ringColor = color || NEON.orange;

  return (
    <div style={{ position:'relative', width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`ringGrad-${ringColor.replace('#','')}-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ringColor} stopOpacity="1"/>
            <stop offset="100%" stopColor={ringColor} stopOpacity="0.7"/>
          </linearGradient>
          {glow && (
            <filter id={`ringGlow-${ringColor.replace('#','')}-${size}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          )}
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={`url(#ringGrad-${ringColor.replace('#','')}-${size})`}
          strokeWidth={stroke} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          filter={glow ? `url(#ringGlow-${ringColor.replace('#','')}-${size})` : undefined}
          style={{ transition: 'stroke-dashoffset 0.06s linear' }}
        />
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        {children || (
          <>
            <div style={{ color: ringColor, fontSize: size * 0.28, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(value * progress)}
            </div>
            {label && <div style={{ color: NEON.textFaint, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', marginTop: 4, textTransform: 'uppercase' }}>{label}</div>}
            {sublabel && <div style={{ color: NEON.textDim, fontSize: 10, marginTop: 2 }}>{sublabel}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── GlowCard: card con halo neon configurabile ──────────────────────────────
function GlowCard({ children, glow, intensity = 0.18, padding = 16, radius = 18, onClick, style }) {
  const glowColor = glow || NEON.orange;
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        background: NEON.bgCard,
        borderRadius: radius,
        padding,
        border: `1px solid ${NEON.border}`,
        boxShadow: `0 0 0 1px ${glowColor}10, 0 12px 30px rgba(0,0,0,0.45), 0 0 60px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2,'0')}`,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
        ...style,
      }}
      onMouseDown={onClick ? (e) => { e.currentTarget.style.transform = 'scale(0.985)'; } : undefined}
      onMouseUp={onClick ? (e) => { e.currentTarget.style.transform = 'scale(1)'; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.transform = 'scale(1)'; } : undefined}
    >
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(80% 60% at 0% 0%, ${glowColor}14 0%, transparent 60%)`,
      }}/>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ─── MiniChart: grafico a linee con area gradiente, per CTL/ATL/TSB ──────────
function MiniChart({ data, color, height = 80, showAxis = false, fillArea = true, animated = true, accentLast = true }) {
  // data = [{ x, y }] o [number, number, ...]
  const norm = Array.isArray(data) && typeof data[0] === 'number'
    ? data.map((y, i) => ({ x: i, y }))
    : (data || []);
  if (!norm.length) return <div style={{ height }}/>;

  const w = 100;
  const h = height;
  const xs = norm.map(p => p.x);
  const ys = norm.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(0, Math.min(...ys));
  const yMax = Math.max(...ys, 1);
  const yRange = yMax - yMin || 1;

  const sx = (x) => ((x - xMin) / (xMax - xMin || 1)) * w;
  const sy = (y) => h - ((y - yMin) / yRange) * h;

  const pts = norm.map(p => `${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  const c = color || NEON.orange;
  const last = norm[norm.length - 1];
  const gradId = `mc-${c.replace('#','')}-${Math.random().toString(36).slice(2,7)}`;

  const [drawn, setDrawn] = useStateDS(animated ? 0 : 1);
  useEffectDS(() => {
    if (!animated) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 800);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawn(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pathLength = w * 2; // approx, will be overridden by real length

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {fillArea && (
        <polygon points={area} fill={`url(#${gradId})`} opacity={drawn}/>
      )}
      <polyline
        points={pts}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength * (1 - drawn)}
        style={{ filter: `drop-shadow(0 0 2px ${c}aa)` }}
        vectorEffect="non-scaling-stroke"
      />
      {accentLast && last && drawn > 0.95 && (
        <circle cx={sx(last.x)} cy={sy(last.y)} r="2" fill={c} style={{ filter: `drop-shadow(0 0 4px ${c})` }}/>
      )}
    </svg>
  );
}

// ─── FormCurve: visualizzatore CTL+ATL+TSB sovrapposti ───────────────────────
function FormCurve({ history, height = 160 }) {
  // history = [{ date, ctl, atl, tsb }, ...]
  if (!history?.length) return <div style={{ height, color: NEON.textFaint, fontSize: 12, display:'flex', alignItems:'center', justifyContent:'center' }}>Nessun dato</div>;

  const w = 320;
  const h = height;
  const padTop = 12;
  const padBot = 22;
  const inner = h - padTop - padBot;

  const ctlVals = history.map(d => d.ctl);
  const atlVals = history.map(d => d.atl);
  const tsbVals = history.map(d => d.tsb);

  const yMax = Math.max(...ctlVals, ...atlVals, 50);
  const yMin = Math.min(...tsbVals, -10);
  const yRange = yMax - yMin || 1;

  const sx = (i) => (i / (history.length - 1 || 1)) * w;
  const sy = (v) => padTop + inner - ((v - yMin) / yRange) * inner;

  const toPath = (vals) => vals.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const ctlPath = toPath(ctlVals);
  const atlPath = toPath(atlVals);
  const tsbPath = toPath(tsbVals);

  // Zero line per TSB
  const zeroY = sy(0);

  const [drawn, setDrawn] = useStateDS(0);
  useEffectDS(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1200);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawn(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [history.length]);

  const pathLen = w * 1.5;
  const lastIdx = history.length - 1;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ overflow:'visible' }}>
      <defs>
        <linearGradient id="ctlFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEON.teal} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={NEON.teal} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="atlFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEON.orange} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={NEON.orange} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Zero baseline */}
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/>

      {/* CTL area */}
      <polygon
        points={`0,${padTop + inner} ${ctlPath} ${w},${padTop + inner}`}
        fill="url(#ctlFill)"
        opacity={drawn}
      />

      {/* ATL area */}
      <polygon
        points={`0,${padTop + inner} ${atlPath} ${w},${padTop + inner}`}
        fill="url(#atlFill)"
        opacity={drawn * 0.8}
      />

      {/* TSB line */}
      <polyline
        points={tsbPath}
        fill="none"
        stroke={NEON.purple}
        strokeWidth="1.5"
        strokeDasharray={pathLen}
        strokeDashoffset={pathLen * (1 - drawn)}
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 3px ${NEON.purple}aa)` }}
      />

      {/* CTL line */}
      <polyline
        points={ctlPath}
        fill="none"
        stroke={NEON.teal}
        strokeWidth="2"
        strokeDasharray={pathLen}
        strokeDashoffset={pathLen * (1 - drawn)}
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 4px ${NEON.teal})` }}
      />

      {/* ATL line */}
      <polyline
        points={atlPath}
        fill="none"
        stroke={NEON.orange}
        strokeWidth="1.5"
        strokeDasharray={pathLen}
        strokeDashoffset={pathLen * (1 - drawn)}
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 3px ${NEON.orange}aa)` }}
      />

      {/* Last point markers */}
      {drawn > 0.95 && (
        <g>
          <circle cx={sx(lastIdx)} cy={sy(ctlVals[lastIdx])} r="3" fill={NEON.teal} style={{ filter: `drop-shadow(0 0 6px ${NEON.teal})` }}/>
          <circle cx={sx(lastIdx)} cy={sy(atlVals[lastIdx])} r="2.5" fill={NEON.orange} style={{ filter: `drop-shadow(0 0 5px ${NEON.orange})` }}/>
          <circle cx={sx(lastIdx)} cy={sy(tsbVals[lastIdx])} r="2.5" fill={NEON.purple} style={{ filter: `drop-shadow(0 0 5px ${NEON.purple})` }}/>
        </g>
      )}
    </svg>
  );
}

// ─── PolylineMap: mappa minimalista di una corsa con animazione di tracciamento ─
function PolylineMap({ encoded, points, color, height = 140, animated = true }) {
  // Accetta polyline encoded Strava O array di [lat, lng]
  const decodedPoints = useRefDS(null);
  const [drawn, setDrawn] = useStateDS(0);

  if (!decodedPoints.current) {
    decodedPoints.current = points || (encoded ? decodePolyline(encoded) : null);
  }
  const pts = decodedPoints.current;

  useEffectDS(() => {
    if (!animated || !pts) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawn(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pts]);

  if (!pts || pts.length < 2) {
    return (
      <div style={{
        height, borderRadius: 12, background: 'rgba(255,255,255,0.03)',
        border: `1px dashed ${NEON.border}`, display:'flex', alignItems:'center', justifyContent:'center',
        color: NEON.textFaint, fontSize: 11,
      }}>Nessun tracciato</div>
    );
  }

  const lats = pts.map(p => p[0]);
  const lngs = pts.map(p => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const w = 320;
  const padding = 12;
  const aspectRatio = (maxLng - minLng) / (maxLat - minLat || 0.0001);
  const drawW = w - padding * 2;
  const drawH = (height - padding * 2);
  // Adatta mantenendo proporzioni
  let scaleX = drawW / (maxLng - minLng || 0.0001);
  let scaleY = drawH / (maxLat - minLat || 0.0001);
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (drawW - (maxLng - minLng) * scale) / 2;
  const offsetY = (drawH - (maxLat - minLat) * scale) / 2;

  const polyPts = pts.map(([lat, lng]) => {
    const x = padding + offsetX + (lng - minLng) * scale;
    const y = padding + offsetY + (maxLat - lat) * scale; // invert Y
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const c = color || NEON.orange;
  const pathLen = pts.length * 4;

  return (
    <div style={{ position:'relative', height, borderRadius: 14, overflow:'hidden', background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0))', border: `1px solid ${NEON.border}` }}>
      {/* grid backdrop */}
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ position:'absolute', inset:0 }}>
        <defs>
          <pattern id="gridPolyline" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5"/>
          </pattern>
          <filter id="polyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width={w} height={height} fill="url(#gridPolyline)"/>
        <polyline
          points={polyPts}
          fill="none"
          stroke={c}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLen}
          strokeDashoffset={pathLen * (1 - drawn)}
          filter="url(#polyGlow)"
          vectorEffect="non-scaling-stroke"
        />
        {drawn > 0.98 && pts.length > 0 && (
          <>
            <circle
              cx={polyPts.split(' ')[0].split(',')[0]}
              cy={polyPts.split(' ')[0].split(',')[1]}
              r="3" fill={NEON.teal}
            />
            <circle
              cx={polyPts.split(' ')[polyPts.split(' ').length - 1].split(',')[0]}
              cy={polyPts.split(' ')[polyPts.split(' ').length - 1].split(',')[1]}
              r="3.5" fill={c}
              style={{ filter: `drop-shadow(0 0 6px ${c})` }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Decoder per Google Encoded Polyline (formato Strava) ────────────────────
function decodePolyline(encoded) {
  if (!encoded) return [];
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// ─── PulseDot: punto pulsante (live indicator) ────────────────────────────────
function PulseDot({ color, size = 8 }) {
  const c = color || NEON.orange;
  return (
    <div style={{ position:'relative', width:size, height:size, display:'inline-block' }}>
      <span style={{
        position:'absolute', inset:0, borderRadius:'50%',
        background:c, boxShadow:`0 0 ${size}px ${c}`,
      }}/>
      <span style={{
        position:'absolute', inset:-4, borderRadius:'50%',
        border:`1.5px solid ${c}`, opacity:0.4,
        animation:'pulseDot 1.6s ease-out infinite',
      }}/>
      <style>{`
        @keyframes pulseDot {
          0% { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Section header con kicker ───────────────────────────────────────────────
function SectionHeader({ kicker, title, action, color }) {
  const c = color || NEON.orange;
  return (
    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 12, padding: '0 4px' }}>
      <div>
        {kicker && (
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 4, height: 4, borderRadius: 2, background: c, boxShadow: `0 0 6px ${c}` }}/>
            <span style={{ color: c, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{kicker}</span>
          </div>
        )}
        <div style={{ color: NEON.text, fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</div>
      </div>
      {action && (
        <div onClick={action.onClick} style={{ color: c, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{action.label}</div>
      )}
    </div>
  );
}

// ─── StatPill: piccola pillola con valore + label ────────────────────────────
function StatPill({ icon, label, value, color }) {
  const c = color || NEON.text;
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 8, padding: '8px 12px',
      background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${NEON.border}`,
    }}>
      {icon && <div style={{ color: c, fontSize: 14 }}>{icon}</div>}
      <div style={{ display:'flex', flexDirection:'column', lineHeight: 1.1 }}>
        <span style={{ color: NEON.textFaint, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ color: c, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    </div>
  );
}

// Export
Object.assign(window, {
  NEON,
  BigNumber, AnimatedRing, GlowCard, MiniChart, FormCurve, PolylineMap,
  PulseDot, SectionHeader, StatPill,
  decodePolyline,
});
