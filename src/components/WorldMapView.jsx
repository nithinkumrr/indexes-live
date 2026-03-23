// src/components/WorldMapView.jsx
// World map showing financial centers as live/closed dots with index values
import { MARKETS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';

// Financial centers: [id, name, cx%, cy%] — percentage position on the SVG viewBox
const CENTERS = [
  { id: 'sp500',     label: 'S&P 500',   cx: 18,  cy: 36 },
  { id: 'nasdaq',    label: 'Nasdaq',    cx: 17,  cy: 33 },
  { id: 'bovespa',   label: 'Bovespa',   cx: 28,  cy: 65 },
  { id: 'ftse',      label: 'FTSE',      cx: 46,  cy: 27 },
  { id: 'dax',       label: 'DAX',       cx: 49,  cy: 26 },
  { id: 'cac40',     label: 'CAC',       cx: 47,  cy: 28 },
  { id: 'stoxx50',   label: 'Stoxx50',   cx: 50,  cy: 27 },
  { id: 'nifty50',   label: 'Nifty',     cx: 65,  cy: 42 },
  { id: 'sensex',    label: 'Sensex',    cx: 65,  cy: 44 },
  { id: 'tadawul',   label: 'TASI',      cx: 58,  cy: 40 },
  { id: 'dfm',       label: 'DFM',       cx: 60,  cy: 41 },
  { id: 'nikkei',    label: 'Nikkei',    cx: 82,  cy: 31 },
  { id: 'hangseng',  label: 'HangSeng',  cx: 79,  cy: 37 },
  { id: 'shanghai',  label: 'Shanghai',  cx: 78,  cy: 34 },
  { id: 'kospi',     label: 'KOSPI',     cx: 81,  cy: 32 },
  { id: 'asx200',    label: 'ASX',       cx: 84,  cy: 68 },
  { id: 'jse',       label: 'JSE',       cx: 55,  cy: 67 },
  { id: 'tsx',       label: 'TSX',       cx: 20,  cy: 28 },
  { id: 'sti',       label: 'STI',       cx: 78,  cy: 45 },
];

const STATUS_COLOR = {
  live:   '#00FF94',
  pre:    '#F59E0B',
  closed: '#3A3A3E',
};

export default function WorldMapView({ data }) {
  return (
    <div className="wmap-wrap">
      <svg
        viewBox="0 0 1000 500"
        className="wmap-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Simple world silhouette using path approximations */}
        <WorldSilhouette />

        {/* Financial center markers */}
        {CENTERS.map(center => {
          const market = MARKETS.find(m => m.id === center.id);
          if (!market) return null;
          const d      = data[center.id];
          const status = getStatus(market);
          const gain   = d ? d.changePct >= 0 : true;
          const color  = STATUS_COLOR[status];
          const cx     = (center.cx / 100) * 1000;
          const cy     = (center.cy / 100) * 500;
          const price  = d ? formatPrice(d.price) : '—';
          const pct    = d ? formatPct(d.changePct) : null;

          return (
            <g key={center.id} className="wmap-center">
              {/* Pulse ring for live markets */}
              {status === 'live' && (
                <circle cx={cx} cy={cy} r="10" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4" className="wmap-pulse-ring" />
              )}
              {/* Main dot */}
              <circle cx={cx} cy={cy} r="5" fill={color} opacity={status === 'closed' ? 0.5 : 1} />

              {/* Label box */}
              <g transform={`translate(${cx + 8}, ${cy - 14})`}>
                <rect x="-2" y="-10" width="70" height="26" rx="3"
                  fill="rgba(8,8,10,0.85)" stroke={status === 'live' ? color : 'rgba(255,255,255,0.08)'} strokeWidth="0.8" />
                <text x="2" y="-2" fontSize="7" fill={status === 'closed' ? '#5A5856' : '#E8E6E1'} fontFamily="JetBrains Mono, monospace" fontWeight="600">
                  {center.label}
                </text>
                <text x="2" y="8" fontSize="8" fill={status === 'closed' ? '#5A5856' : '#E8E6E1'} fontFamily="JetBrains Mono, monospace" fontWeight="700">
                  {price}
                </text>
                {pct && (
                  <text x="2" y="17" fontSize="7" fill={gain ? '#00C896' : '#FF4455'} fontFamily="JetBrains Mono, monospace">
                    {gain ? '▲' : '▼'} {pct}
                  </text>
                )}
              </g>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 460)">
          <circle cx="6" cy="6" r="5" fill="#00FF94" />
          <text x="16" y="10" fontSize="9" fill="#9E9C97" fontFamily="JetBrains Mono, monospace">LIVE</text>
          <circle cx="56" cy="6" r="5" fill="#F59E0B" />
          <text x="66" y="10" fontSize="9" fill="#9E9C97" fontFamily="JetBrains Mono, monospace">PRE-OPEN</text>
          <circle cx="130" cy="6" r="5" fill="#3A3A3E" />
          <text x="140" y="10" fontSize="9" fill="#9E9C97" fontFamily="JetBrains Mono, monospace">CLOSED</text>
        </g>
      </svg>
    </div>
  );
}

// Simplified world map silhouette as SVG paths
function WorldSilhouette() {
  return (
    <g opacity="0.18">
      {/* North America */}
      <path d="M 80 120 L 120 100 L 160 95 L 200 110 L 220 130 L 230 160 L 210 200 L 180 230 L 150 240 L 130 220 L 100 200 L 80 170 Z" fill="#4A4A52" />
      {/* South America */}
      <path d="M 200 260 L 230 250 L 260 270 L 270 310 L 265 360 L 245 390 L 220 380 L 200 350 L 195 310 Z" fill="#4A4A52" />
      {/* Europe */}
      <path d="M 430 100 L 500 95 L 520 110 L 510 135 L 480 145 L 450 140 L 430 130 Z" fill="#4A4A52" />
      {/* Africa */}
      <path d="M 450 155 L 500 145 L 530 165 L 540 210 L 535 260 L 520 320 L 500 350 L 475 340 L 455 300 L 445 250 L 440 200 Z" fill="#4A4A52" />
      {/* Russia / Asia north */}
      <path d="M 520 80 L 650 70 L 780 80 L 820 100 L 800 120 L 750 115 L 700 110 L 650 115 L 600 120 L 560 115 L 530 105 Z" fill="#4A4A52" />
      {/* Middle East */}
      <path d="M 545 150 L 590 145 L 610 165 L 605 190 L 580 200 L 555 190 L 540 175 Z" fill="#4A4A52" />
      {/* South Asia */}
      <path d="M 610 165 L 660 160 L 680 180 L 670 220 L 645 235 L 620 225 L 608 200 Z" fill="#4A4A52" />
      {/* Southeast Asia */}
      <path d="M 700 175 L 750 165 L 780 180 L 785 210 L 760 230 L 730 225 L 705 205 Z" fill="#4A4A52" />
      {/* East Asia */}
      <path d="M 750 120 L 820 110 L 840 135 L 830 165 L 800 175 L 770 170 L 748 150 Z" fill="#4A4A52" />
      {/* Japan */}
      <path d="M 840 130 L 855 120 L 865 135 L 858 155 L 845 158 L 838 145 Z" fill="#4A4A52" />
      {/* Australia */}
      <path d="M 780 310 L 840 295 L 875 310 L 880 350 L 860 385 L 820 395 L 790 375 L 775 345 Z" fill="#4A4A52" />
    </g>
  );
}
