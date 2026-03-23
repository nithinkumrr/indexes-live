// src/components/Sparkline.jsx
// Points are real price values (same units as the displayed price).
// We render with a padded fixed scale so the slope is always visible —
// NOT min-max normalization which flattens everything.
export default function Sparkline({ points = [], gain, height = 36 }) {
  if (!points || points.length < 2) return <div style={{ width: '100%', height }} />;

  const mn  = Math.min(...points);
  const mx  = Math.max(...points);
  const raw = mx - mn;

  // Pad the range so the line never touches the edges, and so
  // a small-range chart still shows meaningful slope.
  // Minimum visible range = 0.3% of the midpoint price.
  const mid     = (mn + mx) / 2;
  const minRange = mid * 0.003;
  const range   = Math.max(raw, minRange);
  const pad     = range * 0.25; // 25% breathing room top and bottom
  const lo      = mn - pad;
  const hi      = mx + pad;
  const span    = hi - lo;

  const W = 300;
  const H = height;

  const coords = points
    .map((v, i) => `${(i / (points.length - 1)) * W},${H - ((v - lo) / span) * (H - 2) - 1}`)
    .join(' ');

  const areaCoords = `${coords} ${W},${H} 0,${H}`;
  const color = gain ? '#00C896' : '#FF4455';
  const uid   = `sp-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
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
