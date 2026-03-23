// src/components/WorldMapView.jsx
import { useState } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatPct, formatChange } from '../utils/format';
import { getStatus } from '../utils/timezone';

// Each center: cx/cy as % of 1000×500 viewBox
const CENTERS = [
  { id: 'tsx',       label: 'TSX',       cx: 17,  cy: 28,  anchor: 'right' },
  { id: 'sp500',     label: 'S&P 500',   cx: 15,  cy: 35,  anchor: 'right' },
  { id: 'nasdaq',    label: 'Nasdaq',    cx: 13,  cy: 40,  anchor: 'right' },
  { id: 'dowjones',  label: 'Dow',       cx: 17,  cy: 44,  anchor: 'right' },
  { id: 'bovespa',   label: 'Ibovespa',  cx: 26,  cy: 67,  anchor: 'right' },
  { id: 'ftse',      label: 'FTSE 100',  cx: 45,  cy: 22,  anchor: 'below' },
  { id: 'dax',       label: 'DAX 40',    cx: 49,  cy: 22,  anchor: 'below' },
  { id: 'cac40',     label: 'CAC 40',    cx: 47,  cy: 25,  anchor: 'below' },
  { id: 'stoxx50',   label: 'Stoxx 50',  cx: 51,  cy: 26,  anchor: 'below' },
  { id: 'tadawul',   label: 'TASI',      cx: 57,  cy: 43,  anchor: 'right' },
  { id: 'dfm',       label: 'DFM',       cx: 60,  cy: 45,  anchor: 'right' },
  { id: 'nifty50',   label: 'Nifty 50',  cx: 66,  cy: 44,  anchor: 'right' },
  { id: 'sensex',    label: 'Sensex',    cx: 66,  cy: 48,  anchor: 'right' },
  { id: 'hangseng',  label: 'Hang Seng', cx: 79,  cy: 38,  anchor: 'above' },
  { id: 'shanghai',  label: 'Shanghai',  cx: 77,  cy: 33,  anchor: 'above' },
  { id: 'nikkei',    label: 'Nikkei',    cx: 83,  cy: 30,  anchor: 'above' },
  { id: 'kospi',     label: 'KOSPI',     cx: 81,  cy: 34,  anchor: 'above' },
  { id: 'asx200',    label: 'ASX 200',   cx: 83,  cy: 70,  anchor: 'right' },
  { id: 'jse',       label: 'JSE',       cx: 54,  cy: 68,  anchor: 'right' },
  { id: 'sti',       label: 'STI',       cx: 78,  cy: 48,  anchor: 'right' },
];

const STATUS_COLOR = { live: '#00FF94', pre: '#F59E0B', closed: '#44444A' };
const GAIN_COLOR   = '#00C896';
const LOSS_COLOR   = '#FF4455';

function Marker({ center, market, d }) {
  const [hovered, setHovered] = useState(false);
  const status = getStatus(market);
  const gain   = d ? d.changePct >= 0 : true;
  const color  = STATUS_COLOR[status];
  const cx     = (center.cx / 100) * 1000;
  const cy     = (center.cy / 100) * 500;

  // Card dimensions
  const W = 112, H = 52, PAD = 8;

  // Position card based on anchor direction
  let cardX, cardY;
  if (center.anchor === 'right')  { cardX = cx + 12; cardY = cy - H / 2; }
  if (center.anchor === 'above')  { cardX = cx - W / 2; cardY = cy - H - 14; }
  if (center.anchor === 'below')  { cardX = cx - W / 2; cardY = cy + 14; }
  if (!center.anchor)             { cardX = cx + 12; cardY = cy - H / 2; }

  // Clamp to viewBox
  cardX = Math.max(2, Math.min(cardX, 1000 - W - 2));
  cardY = Math.max(2, Math.min(cardY, 500 - H - 2));

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'default' }}
    >
      {/* Pulse ring for live */}
      {status === 'live' && (
        <circle cx={cx} cy={cy} r="12" fill="none" stroke={color}
          strokeWidth="1" opacity={hovered ? 0.6 : 0.3}
          style={{ animation: 'mapPulse 2s ease-in-out infinite' }} />
      )}
      {/* Dot */}
      <circle cx={cx} cy={cy} r={hovered ? 6 : 5}
        fill={color} opacity={status === 'closed' ? 0.45 : 1}
        style={{ transition: 'r 0.15s' }} />

      {/* Connector line */}
      {hovered && (
        <line
          x1={cx} y1={cy}
          x2={center.anchor === 'right' ? cardX : cardX + W / 2}
          y2={center.anchor === 'right' ? cardY + H / 2 : (center.anchor === 'above' ? cardY + H : cardY)}
          stroke={color} strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2"
        />
      )}

      {/* Info card — always visible but subtle when not hovered */}
      <g opacity={hovered ? 1 : 0.82} style={{ transition: 'opacity 0.15s' }}>
        <rect x={cardX} y={cardY} width={W} height={H} rx="4"
          fill="rgba(8,8,10,0.92)"
          stroke={hovered ? color : 'rgba(255,255,255,0.09)'}
          strokeWidth={hovered ? '1' : '0.6'} />

        {/* Exchange name */}
        <text x={cardX + PAD} y={cardY + 13}
          fontSize="8.5" fill={status === 'closed' ? '#52504D' : '#9E9C97'}
          fontFamily="JetBrains Mono, monospace" fontWeight="500">
          {center.label}
        </text>

        {/* Price */}
        <text x={cardX + PAD} y={cardY + 28}
          fontSize="12" fill={status === 'closed' ? '#52504D' : '#E8E6E1'}
          fontFamily="JetBrains Mono, monospace" fontWeight="700">
          {d ? formatPrice(d.price) : '—'}
        </text>

        {/* Change */}
        {d && (
          <text x={cardX + PAD} y={cardY + 43}
            fontSize="8.5" fill={gain ? GAIN_COLOR : LOSS_COLOR}
            fontFamily="JetBrains Mono, monospace" fontWeight="600">
            {gain ? '▲' : '▼'} {formatPct(d.changePct)}  {formatChange(d.change)}
          </text>
        )}

        {/* Status dot */}
        <circle cx={cardX + W - PAD} cy={cardY + PAD}
          r="3" fill={color} opacity={status === 'closed' ? 0.4 : 1} />
      </g>
    </g>
  );
}

export default function WorldMapView({ data }) {
  const liveCount   = CENTERS.filter(c => { const m = MARKETS.find(x => x.id === c.id); return m && getStatus(m) === 'live'; }).length;
  const closedCount = CENTERS.filter(c => { const m = MARKETS.find(x => x.id === c.id); return m && getStatus(m) === 'closed'; }).length;

  return (
    <div className="wmap-wrap">
      {/* Stats bar */}
      <div className="wmap-stats">
        <div className="wmap-stat">
          <span className="wmap-stat-dot" style={{ background: '#00FF94', animation: 'mapPulse 1.4s ease-in-out infinite' }} />
          <span className="wmap-stat-num">{liveCount}</span>
          <span className="wmap-stat-label">LIVE</span>
        </div>
        <div className="wmap-stat">
          <span className="wmap-stat-dot" style={{ background: '#F59E0B' }} />
          <span className="wmap-stat-num">{CENTERS.length - liveCount - closedCount}</span>
          <span className="wmap-stat-label">PRE-OPEN</span>
        </div>
        <div className="wmap-stat">
          <span className="wmap-stat-dot" style={{ background: '#44444A' }} />
          <span className="wmap-stat-num">{closedCount}</span>
          <span className="wmap-stat-label">CLOSED</span>
        </div>
        <div className="wmap-hint">Hover a marker for details</div>
      </div>

      <svg viewBox="0 0 1000 500" className="wmap-svg" xmlns="http://www.w3.org/2000/svg">
        <style>{`
          @keyframes mapPulse { 0%,100%{r:12;opacity:0.3} 50%{r:16;opacity:0.1} }
        `}</style>
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0D1117" />
            <stop offset="100%" stopColor="#08080A" />
          </radialGradient>
        </defs>
        <rect width="1000" height="500" fill="url(#mapBg)" rx="8" />

        {/* Grid lines — latitude/longitude feel */}
        <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.5">
          {[100,200,300,400].map(y => <line key={y} x1="0" y1={y} x2="1000" y2={y} />)}
          {[125,250,375,500,625,750,875].map(x => <line key={x} x1={x} y1="0" x2={x} y2="500" />)}
        </g>

        {/* Equator */}
        <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />

        <ContinentSilhouette />

        {/* Markers */}
        {CENTERS.map(center => {
          const market = MARKETS.find(m => m.id === center.id);
          if (!market) return null;
          return <Marker key={center.id} center={center} market={market} d={data[center.id] || null} />;
        })}
      </svg>
    </div>
  );
}

function ContinentSilhouette() {
  return (
    <g opacity="0.14" fill="#6B7280">
      {/* North America */}
      <path d="M60,90 L90,78 L130,72 L165,78 L195,90 L215,108 L230,132 L235,158 L228,185 L215,208 L195,228 L172,242 L150,248 L130,240 L110,225 L92,205 L75,182 L62,155 L55,128 L58,105 Z"/>
      {/* Greenland */}
      <path d="M175,52 L195,45 L215,48 L220,62 L210,75 L192,78 L175,70 Z"/>
      {/* South America */}
      <path d="M195,268 L220,258 L248,262 L265,278 L272,305 L270,335 L262,362 L248,385 L228,398 L208,392 L195,370 L188,342 L185,312 L188,285 Z"/>
      {/* Europe */}
      <path d="M418,78 L448,70 L478,68 L508,72 L528,82 L535,95 L528,112 L510,125 L488,132 L465,130 L445,122 L428,110 L418,95 Z"/>
      {/* UK */}
      <path d="M408,82 L418,75 L422,88 L415,98 L406,95 Z"/>
      {/* Scandinavia */}
      <path d="M448,52 L465,45 L475,55 L470,70 L455,72 L445,62 Z"/>
      {/* Africa */}
      <path d="M435,148 L468,138 L500,140 L528,155 L542,175 L548,205 L545,240 L538,275 L525,308 L508,335 L488,355 L465,358 L445,342 L432,315 L422,280 L418,248 L420,215 L425,182 Z"/>
      {/* Russia / Central Asia */}
      <path d="M508,58 L580,48 L655,45 L730,50 L790,58 L832,72 L838,88 L820,100 L785,105 L750,102 L715,98 L680,95 L645,98 L610,102 L578,108 L548,112 L518,105 L505,92 Z"/>
      {/* Middle East */}
      <path d="M525,148 L562,140 L592,145 L608,162 L608,185 L592,200 L568,208 L545,202 L528,188 L522,168 Z"/>
      {/* Indian subcontinent */}
      <path d="M592,158 L632,152 L658,162 L668,182 L665,208 L652,232 L632,245 L610,242 L595,225 L588,202 L588,178 Z"/>
      {/* Southeast Asia */}
      <path d="M665,175 L705,168 L735,172 L748,188 L745,208 L725,222 L700,228 L678,220 L662,205 L660,188 Z"/>
      {/* East Asia / China */}
      <path d="M648,95 L718,88 L762,92 L795,105 L808,125 L802,148 L782,162 L755,168 L725,162 L698,155 L675,148 L655,135 L645,115 Z"/>
      {/* Korea */}
      <path d="M798,108 L815,105 L822,118 L815,130 L802,132 L795,120 Z"/>
      {/* Japan */}
      <path d="M828,108 L845,100 L858,110 L858,128 L848,140 L835,142 L826,130 L824,115 Z"/>
      {/* Australia */}
      <path d="M758,308 L815,295 L858,302 L882,322 L888,350 L878,380 L858,398 L828,408 L798,402 L772,382 L758,355 L752,328 Z"/>
      {/* New Zealand */}
      <path d="M895,375 L908,368 L915,380 L910,395 L900,400 L892,390 Z"/>
    </g>
  );
}
