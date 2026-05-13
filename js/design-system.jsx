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

// ─── WeeklyLoadBars: barre del TSS per settimana (no linee, leggibile) ──────
function WeeklyLoadBars({ history, weeks = 8 }) {
  if (!history?.length) {
    return <div style={{ height: 140, color: NEON.textFaint, fontSize: 12, display:'flex', alignItems:'center', justifyContent:'center' }}>Nessun dato</div>;
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const buckets = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const endDay = new Date(today); endDay.setDate(today.getDate() - w * 7);
    const startDay = new Date(endDay); startDay.setDate(endDay.getDate() - 6);
    let tss = 0, ctlEnd = null, atlEnd = null, tsbEnd = null;
    for (const d of history) {
      const dt = new Date(d.date); dt.setHours(0,0,0,0);
      if (dt >= startDay && dt <= endDay) {
        tss += d.tss || 0;
        ctlEnd = d.ctl ?? ctlEnd;
        atlEnd = d.atl ?? atlEnd;
        tsbEnd = d.tsb ?? tsbEnd;
      }
    }
    buckets.push({
      label: w === 0 ? 'sett' : `−${w}`,
      tss, ctl: ctlEnd ?? 0, atl: atlEnd ?? 0, tsb: tsbEnd ?? 0,
      isCurrent: w === 0,
    });
  }
  const maxTss = Math.max(...buckets.map(b => b.tss), 100);
  const [shown, setShown] = useStateDS(false);
  useEffectDS(() => { const t = setTimeout(() => setShown(true), 30); return () => clearTimeout(t); }, []);
  const colorFor = (b) => {
    if (b.tss === 0) return 'rgba(255,255,255,0.12)';
    if (b.tsb >= 5)  return NEON.teal;
    if (b.tsb >= -10) return NEON.blue;
    if (b.tsb >= -20) return NEON.yellow;
    return NEON.orange;
  };
  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-end', gap: 6, height: 130 }}>
        {buckets.map((b, i) => {
          const h = b.tss > 0 ? Math.max(8, (b.tss / maxTss) * 110) : 6;
          const col = colorFor(b);
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
              <div style={{ color: b.tss > 0 ? NEON.text : NEON.textFaint, fontSize: 10, fontWeight: 700, lineHeight: 1, height: 12 }}>
                {b.tss > 0 ? Math.round(b.tss) : '·'}
              </div>
              <div style={{
                width: '100%', height: shown ? h : 6,
                background: `linear-gradient(180deg, ${col}, ${col}55)`,
                borderRadius: 6,
                boxShadow: b.isCurrent ? `0 0 14px ${col}99` : 'none',
                border: b.isCurrent ? `1px solid ${col}` : '1px solid rgba(255,255,255,0.04)',
                transition: 'height 0.6s cubic-bezier(.2,.7,.3,1)',
              }}/>
              <div style={{ color: b.isCurrent ? NEON.text : NEON.textFaint, fontSize: 9, fontWeight: b.isCurrent ? 700 : 500 }}>{b.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-around', marginTop: 10, gap: 8, flexWrap:'wrap' }}>
        {[
          ['Forma', NEON.teal], ['OK', NEON.blue], ['Stanco', NEON.yellow], ['Sovracc.', NEON.orange]
        ].map(([t,c]) => (
          <div key={t} style={{ display:'flex', alignItems:'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>
            <span style={{ color: NEON.textDim, fontSize: 10 }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FormDial: gauge semicircolare per TSB ─────────────────────────────────
function FormDial({ tsb = 0, ctl = 0, atl = 0, size = 220 }) {
  const v = Math.max(-30, Math.min(30, +tsb || 0));
  const pct = (v + 30) / 60;
  const w = size, h = size * 0.62;
  const cx = w/2, cy = h - 4, r = (w / 2) - 14;
  const startAng = Math.PI, endAng = 2 * Math.PI;
  const ang = startAng + (endAng - startAng) * pct;
  const nx = cx + r * Math.cos(ang);
  const ny = cy + r * Math.sin(ang);
  const col = v >= 5 ? NEON.teal : v >= -10 ? NEON.blue : v >= -20 ? NEON.yellow : NEON.orange;
  const label = v >= 5 ? 'IN FORMA' : v >= -10 ? 'OK' : v >= -20 ? 'STANCO' : 'SOVRACCARICO';
  const [shown, setShown] = useStateDS(0);
  useEffectDS(() => {
    let raf; const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 900);
      setShown(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  const segments = [
    { from: 0,    to: 0.33, color: NEON.orange + '55' },
    { from: 0.33, to: 0.50, color: NEON.yellow + '55' },
    { from: 0.50, to: 0.66, color: NEON.blue   + '55' },
    { from: 0.66, to: 1,    color: NEON.teal   + '55' },
  ];
  const arcPath = (from, to) => {
    const a0 = startAng + (endAng - startAng) * from;
    const a1 = startAng + (endAng - startAng) * to;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  return (
    <div style={{ position:'relative', width: w, height: h + 30, margin:'0 auto' }}>
      <svg width={w} height={h + 4} viewBox={`0 0 ${w} ${h + 4}`} style={{ overflow:'visible' }}>
        {segments.map((s, i) => (
          <path key={i} d={arcPath(s.from, s.to)} fill="none" stroke={s.color} strokeWidth="12" vectorEffect="non-scaling-stroke"/>
        ))}
        <path d={arcPath(0, Math.max(0.005, pct * shown))} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter:`drop-shadow(0 0 8px ${col}aa)` }}/>
        <circle cx={nx} cy={ny} r="6" fill={col} style={{ filter:`drop-shadow(0 0 8px ${col})` }}/>
        <circle cx={nx} cy={ny} r="2.5" fill={NEON.bg}/>
        <text x={cx - r} y={cy + 16} textAnchor="middle" fontSize="9" fill={NEON.textFaint} fontWeight="700">−30</text>
        <text x={cx}     y={4}       textAnchor="middle" fontSize="9" fill={NEON.textFaint} fontWeight="700">0</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" fontSize="9" fill={NEON.textFaint} fontWeight="700">+30</text>
      </svg>
      <div style={{ position:'absolute', left: 0, right: 0, bottom: 0, textAlign:'center' }}>
        <div style={{ color: col, fontSize: 42, fontWeight: 900, letterSpacing:'-0.04em', lineHeight: 1, textShadow:`0 0 14px ${col}55` }}>
          {v >= 0 ? '+' : ''}{Math.round(v)}
        </div>
        <div style={{ color: col, fontSize: 10, fontWeight: 800, letterSpacing:'0.18em', marginTop: 4 }}>{label}</div>
        <div style={{ color: NEON.textFaint, fontSize: 9, marginTop: 4, fontWeight: 600 }}>
          CTL {Math.round(ctl)} · ATL {Math.round(atl)}
        </div>
      </div>
    </div>
  );
}

// ─── FormCurve: CTL/ATL nel pannello sopra, TSB strip firmata sotto ─────────
// Layout pulito a due fasce + griglia + tooltip su tap/drag + etichette tempo.
function FormCurve({ history, height = 200 }) {
  if (!history?.length) {
    return <div style={{ height, color: NEON.textFaint, fontSize: 12, display:'flex', alignItems:'center', justifyContent:'center' }}>Nessun dato sufficiente</div>;
  }

  // viewBox in unità "logiche". Il viewBox preserva l'aspect ratio (no preserveAspectRatio="none")
  // così testi/cerchi non si deformano.
  const W = 360;
  const H = height;
  const padL = 26, padR = 10, padT = 14, padB = 22;
  const innerW = W - padL - padR;

  // due fasce: top = CTL/ATL (60%), bottom = TSB (40%)
  const topH = Math.round((H - padT - padB) * 0.62);
  const botH = (H - padT - padB) - topH;
  const gap  = 6;

  const ctlVals = history.map(d => Math.max(0, d.ctl || 0));
  const atlVals = history.map(d => Math.max(0, d.atl || 0));
  const tsbVals = history.map(d => d.tsb || 0);

  // Top axis
  const topMax = Math.max(...ctlVals, ...atlVals, 30);
  // round up to nearest 10 for nice ticks
  const topMaxNice = Math.ceil(topMax / 10) * 10;

  // Bottom axis: simmetrico attorno a 0 con padding
  const tsbAbsMax = Math.max(15, Math.ceil(Math.max(...tsbVals.map(Math.abs)) / 5) * 5);

  const N = history.length;
  const sx = (i) => padL + (N <= 1 ? innerW / 2 : (i / (N - 1)) * innerW);
  const syTop = (v) => padT + (topH - (v / topMaxNice) * topH);
  const tsbBaseY = padT + topH + gap + botH / 2;
  const syBot = (v) => tsbBaseY - (v / tsbAbsMax) * (botH / 2);

  // smooth path con Catmull-Rom -> Bezier
  const smooth = (pts) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const t = 0.18;
      const c1x = p1[0] + (p2[0] - p0[0]) * t;
      const c1y = p1[1] + (p2[1] - p0[1]) * t;
      const c2x = p2[0] - (p3[0] - p1[0]) * t;
      const c2y = p2[1] - (p3[1] - p1[1]) * t;
      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    }
    return d;
  };

  const ctlPts = ctlVals.map((v, i) => [sx(i), syTop(v)]);
  const atlPts = atlVals.map((v, i) => [sx(i), syTop(v)]);
  const tsbPts = tsbVals.map((v, i) => [sx(i), syBot(v)]);

  const ctlPath = smooth(ctlPts);
  const atlPath = smooth(atlPts);
  const tsbPath = smooth(tsbPts);

  const ctlBase = padT + topH;
  const ctlArea = `${ctlPath} L ${ctlPts[ctlPts.length-1][0].toFixed(2)} ${ctlBase} L ${ctlPts[0][0].toFixed(2)} ${ctlBase} Z`;
  const atlArea = `${atlPath} L ${atlPts[atlPts.length-1][0].toFixed(2)} ${ctlBase} L ${atlPts[0][0].toFixed(2)} ${ctlBase} Z`;

  // animazione fade-in
  const [drawn, setDrawn] = useStateDS(0);
  useEffectDS(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      setDrawn(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [history.length]);

  // hover/tap per tooltip
  const [hoverIdx, setHoverIdx] = useStateDS(null);
  const svgRef = useRefDS(null);

  const onMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const ratio = W / rect.width;
    const xLogical = cx * ratio;
    const xInner = xLogical - padL;
    const t = Math.max(0, Math.min(1, xInner / innerW));
    const idx = Math.round(t * (N - 1));
    setHoverIdx(idx);
  };
  const onLeave = () => setHoverIdx(null);

  const lastIdx = N - 1;
  const activeIdx = hoverIdx ?? lastIdx;
  const a = history[activeIdx];

  // Etichette x: -30gg, -15gg, oggi (più "metà" se c'è spazio)
  const xLabels = [];
  if (N > 1) {
    xLabels.push({ idx: 0, text: `-${N-1}gg` });
    if (N >= 8) xLabels.push({ idx: Math.floor((N - 1) / 2), text: `-${Math.round((N-1)/2)}gg` });
    xLabels.push({ idx: lastIdx, text: 'oggi' });
  }

  // TSB color band per ultimo valore
  const tsbColor = a.tsb >= 10 ? NEON.teal : a.tsb >= -10 ? NEON.purple : NEON.orange;

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display:'block', overflow:'visible', touchAction:'none' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onTouchStart={onMove}
      onTouchMove={onMove}
      onTouchEnd={onLeave}
    >
      <defs>
        <linearGradient id="fcCtlFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEON.teal} stopOpacity="0.32"/>
          <stop offset="100%" stopColor={NEON.teal} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="fcAtlFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEON.orange} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={NEON.orange} stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="fcTsbPos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={NEON.teal} stopOpacity="0.45"/>
          <stop offset="100%" stopColor={NEON.teal} stopOpacity="0.05"/>
        </linearGradient>
        <linearGradient id="fcTsbNeg" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={NEON.orange} stopOpacity="0.45"/>
          <stop offset="100%" stopColor={NEON.orange} stopOpacity="0.05"/>
        </linearGradient>
        <clipPath id="fcTsbPosClip">
          <rect x="0" y={padT + topH + gap} width={W} height={tsbBaseY - (padT + topH + gap)} />
        </clipPath>
        <clipPath id="fcTsbNegClip">
          <rect x="0" y={tsbBaseY} width={W} height={padT + topH + gap + botH - tsbBaseY} />
        </clipPath>
      </defs>

      {/* Y-axis ticks pannello superiore */}
      {[0, 0.5, 1].map((p, i) => {
        const y = padT + topH * (1 - p);
        const v = Math.round(topMaxNice * p);
        return (
          <g key={`yt-${i}`}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray={i === 0 ? '0' : '2 4'} vectorEffect="non-scaling-stroke"/>
            <text x={padL - 5} y={y + 3} textAnchor="end" fontSize="9" fill={NEON.textFaint} fontWeight="600">{v}</text>
          </g>
        );
      })}

      {/* Pannello CTL/ATL */}
      <g opacity={drawn}>
        <path d={atlArea} fill="url(#fcAtlFill)"/>
        <path d={ctlArea} fill="url(#fcCtlFill)"/>
        <path d={atlPath} fill="none" stroke={NEON.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter:`drop-shadow(0 0 3px ${NEON.orange}88)` }}/>
        <path d={ctlPath} fill="none" stroke={NEON.teal}   strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ filter:`drop-shadow(0 0 4px ${NEON.teal}aa)` }}/>
      </g>

      {/* Strip TSB */}
      {/* sfondo strip */}
      <rect x={padL} y={padT + topH + gap} width={innerW} height={botH} fill="rgba(255,255,255,0.025)" rx="4"/>
      {/* baseline 0 */}
      <line x1={padL} y1={tsbBaseY} x2={W - padR} y2={tsbBaseY} stroke="rgba(255,255,255,0.18)" vectorEffect="non-scaling-stroke"/>
      {/* zone target piccolo glow attorno a 0±10 */}
      <rect x={padL} y={tsbBaseY - (10 / tsbAbsMax) * (botH / 2)} width={innerW}
            height={(20 / tsbAbsMax) * (botH / 2)} fill={NEON.purple} opacity="0.05" rx="2"/>
      {/* TSB area positivo */}
      <g opacity={drawn} clipPath="url(#fcTsbPosClip)">
        <path d={`${tsbPath} L ${tsbPts[lastIdx][0].toFixed(2)} ${tsbBaseY} L ${tsbPts[0][0].toFixed(2)} ${tsbBaseY} Z`} fill="url(#fcTsbPos)"/>
      </g>
      <g opacity={drawn} clipPath="url(#fcTsbNegClip)">
        <path d={`${tsbPath} L ${tsbPts[lastIdx][0].toFixed(2)} ${tsbBaseY} L ${tsbPts[0][0].toFixed(2)} ${tsbBaseY} Z`} fill="url(#fcTsbNeg)"/>
      </g>
      {/* TSB linea */}
      <path d={tsbPath} fill="none" stroke={NEON.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={drawn} style={{ filter:`drop-shadow(0 0 3px ${NEON.purple}aa)` }}/>
      {/* etichetta TSB */}
      <text x={padL - 5} y={tsbBaseY + 3} textAnchor="end" fontSize="9" fill={NEON.textFaint} fontWeight="600">0</text>
      <text x={padL - 5} y={padT + topH + gap + 9} textAnchor="end" fontSize="9" fill={NEON.textFaint} fontWeight="600">+{tsbAbsMax}</text>
      <text x={padL - 5} y={padT + topH + gap + botH - 1} textAnchor="end" fontSize="9" fill={NEON.textFaint} fontWeight="600">−{tsbAbsMax}</text>

      {/* Etichette x */}
      {xLabels.map((l, i) => (
        <text key={`xl-${i}`} x={sx(l.idx)} y={H - 6} textAnchor={l.idx === 0 ? 'start' : l.idx === lastIdx ? 'end' : 'middle'} fontSize="9.5" fill={NEON.textFaint} fontWeight="600">{l.text}</text>
      ))}

      {/* Hover guide + dot + tooltip */}
      {drawn > 0.9 && a && (
        <g>
          <line x1={sx(activeIdx)} y1={padT} x2={sx(activeIdx)} y2={H - padB} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke"/>
          <circle cx={sx(activeIdx)} cy={syTop(ctlVals[activeIdx])} r="3.5" fill={NEON.teal}   stroke={NEON.bg} strokeWidth="1.5" style={{ filter:`drop-shadow(0 0 5px ${NEON.teal})` }}/>
          <circle cx={sx(activeIdx)} cy={syTop(atlVals[activeIdx])} r="3"   fill={NEON.orange} stroke={NEON.bg} strokeWidth="1.5" style={{ filter:`drop-shadow(0 0 5px ${NEON.orange})` }}/>
          <circle cx={sx(activeIdx)} cy={syBot(tsbVals[activeIdx])} r="3"   fill={tsbColor}    stroke={NEON.bg} strokeWidth="1.5" style={{ filter:`drop-shadow(0 0 5px ${tsbColor})` }}/>

          {/* Tooltip */}
          {(() => {
            const tx = sx(activeIdx);
            const right = tx > W - 90;
            const boxX = right ? tx - 84 : tx + 8;
            const boxY = padT + 4;
            const dt = new Date(a.date);
            const dayLabel = isNaN(dt) ? '' : dt.toLocaleDateString('it-IT', { day:'numeric', month:'short' });
            return (
              <g>
                <rect x={boxX} y={boxY} width="76" height="56" rx="6" fill="rgba(8,8,18,0.95)" stroke={NEON.borderHi} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
                <text x={boxX + 6} y={boxY + 13} fontSize="8.5" fontWeight="700" fill={NEON.textDim} letterSpacing="0.06em">{dayLabel.toUpperCase()}</text>
                <text x={boxX + 6} y={boxY + 26} fontSize="9" fill={NEON.teal}   fontWeight="700">CTL <tspan fill={NEON.text}>{Math.round(a.ctl)}</tspan></text>
                <text x={boxX + 6} y={boxY + 38} fontSize="9" fill={NEON.orange} fontWeight="700">ATL <tspan fill={NEON.text}>{Math.round(a.atl)}</tspan></text>
                <text x={boxX + 6} y={boxY + 50} fontSize="9" fill={tsbColor}    fontWeight="700">TSB <tspan fill={NEON.text}>{a.tsb >= 0 ? '+' : ''}{Math.round(a.tsb)}</tspan></text>
              </g>
            );
          })()}
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
            <span style={{ color: c, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', fontFamily:'Bebas Neue, sans-serif' }}>{kicker}</span>
          </div>
        )}
        <div className="font-script" style={{ color: NEON.text, fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px', lineHeight: 0.95 }}>{title}</div>
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
  BigNumber, AnimatedRing, GlowCard, MiniChart, FormCurve, FormDial, WeeklyLoadBars, PolylineMap,
  PulseDot, SectionHeader, StatPill,
  decodePolyline,
});
