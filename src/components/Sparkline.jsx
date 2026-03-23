// src/components/Sparkline.jsx
export default function Sparkline({ points = [], gain, width = 120, height = 36 }) {
  if (!points || points.length < 2) return <div style={{ width, height }} />;

  const mn = Math.min(...points);
  const mx = Math.max(...points);
  const range = mx - mn || 1;

  const coords = points
    .map((v, i) => `${(i / (points.length - 1)) * width},${height - ((v - mn) / range) * (height - 6) - 3}`)
    .join(' ');

  const areaCoords = `${coords} ${width},${height} 0,${height}`;
  const color = gain ? '#00C896' : '#FF4455';
  const uid = `sg-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
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
