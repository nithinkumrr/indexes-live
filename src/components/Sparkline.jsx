// Sparkline — renders real price values with directional scaling.
// A 2.6% drop looks like a real decline. A flat day looks flat.
export default function Sparkline({ points = [], gain, height = 36 }) {
  if (!points || points.length < 2) return <div style={{ width: '100%', height }} />;

  const mn  = Math.min(...points);
  const mx  = Math.max(...points);
  const raw = mx - mn;

  // Smart minimum range: at least 0.25% of midpoint so tiny moves still show slope
  const mid      = (mn + mx) / 2 || 1;
  const minRange = mid * 0.0025;
  const range    = Math.max(raw, minRange);

  // 20% vertical padding so line never touches edges
  const pad = range * 0.2;
  const lo  = mn - pad;
  const span = range + pad * 2;

  const W = 300;
  const H = height;

  const toY = v => H - ((v - lo) / span) * H;

  const coords = points
    .map((v, i) => `${(i / (points.length - 1)) * W},${toY(v).toFixed(2)}`)
    .join(' ');

  const areaCoords = `${coords} ${W},${H} 0,${H}`;
  const color = gain ? '#00C896' : '#FF4455';
  const uid   = `sp${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaCoords} fill={`url(#${uid})`} />
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
