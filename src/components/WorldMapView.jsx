// src/components/WorldMapView.jsx — proper world map with accurate continent silhouettes
import { useState } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatPct, formatChange } from '../utils/format';
import { getStatus } from '../utils/timezone';

// Positions on 1000×500 equirectangular projection (lon/lat → x/y)
// x = (lon + 180) / 360 * 1000,  y = (90 - lat) / 180 * 500
const CENTERS = [
  { id: 'tsx',      label: 'TSX',       lon:-79.4, lat:43.7  },
  { id: 'sp500',    label: 'S&P 500',   lon:-74,   lat:40.7  },
  { id: 'nasdaq',   label: 'Nasdaq',    lon:-122,  lat:37.5  },
  { id: 'bovespa',  label: 'Ibovespa',  lon:-46.6, lat:-23.5 },
  { id: 'ftse',     label: 'FTSE 100',  lon:-0.1,  lat:51.5  },
  { id: 'dax',      label: 'DAX 40',    lon:13.4,  lat:52.5  },
  { id: 'cac40',    label: 'CAC 40',    lon:2.3,   lat:48.9  },
  { id: 'stoxx50',  label: 'Stoxx 50',  lon:9.2,   lat:48.1  },
  { id: 'nifty50',  label: 'Nifty 50',  lon:72.9,  lat:19.1  },
  { id: 'sensex',   label: 'Sensex',    lon:72.9,  lat:18.5  },
  { id: 'tadawul',  label: 'TASI',      lon:46.7,  lat:24.7  },
  { id: 'dfm',      label: 'DFM',       lon:55.3,  lat:25.2  },
  { id: 'hangseng', label: 'HangSeng',  lon:114.2, lat:22.3  },
  { id: 'shanghai', label: 'Shanghai',  lon:121.5, lat:31.2  },
  { id: 'nikkei',   label: 'Nikkei',    lon:139.7, lat:35.7  },
  { id: 'kospi',    label: 'KOSPI',     lon:126.9, lat:37.6  },
  { id: 'asx200',   label: 'ASX 200',   lon:151.2, lat:-33.9 },
  { id: 'jse',      label: 'JSE',       lon:28.0,  lat:-26.2 },
  { id: 'sti',      label: 'STI',       lon:103.8, lat:1.3   },
  { id: 'taiex',    label: 'TAIEX',     lon:121.5, lat:25.0  },
];

const STATUS_COLOR = { live: '#00FF94', pre: '#F59E0B', closed: '#3A3A3E' };

function lonLatToXY(lon, lat) {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((90 - lat) / 180) * 500,
  };
}

function Marker({ center, market, d }) {
  const [hov, setHov] = useState(false);
  const { x, y }   = lonLatToXY(center.lon, center.lat);
  const status      = getStatus(market);
  const hasData     = !!d;
  const gain        = d ? d.changePct >= 0 : true;
  const color       = STATUS_COLOR[status];
  const pct         = hasData ? `${d.changePct >= 0 ? '+' : ''}${d.changePct.toFixed(2)}%` : null;

  // Card positioning — keep inside viewBox
  let cx = x + 10, cy = y - 36;
  if (x > 750) cx = x - 115;
  if (y < 50)  cy = y + 10;

  return (
    <g onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ cursor: 'default' }}>
      {status === 'live' && (
        <circle cx={x} cy={y} r="10" fill="none" stroke={color} strokeWidth="1"
          opacity="0.35" style={{ animation: 'mapPulse 2s ease-in-out infinite' }} />
      )}
      <circle cx={x} cy={y} r={hov ? 6 : 4.5}
        fill={color} opacity={status === 'closed' ? 0.4 : 1}
        style={{ transition: 'r 0.12s' }} />

      {/* Label card */}
      {(hov || true) && (
        <g opacity={hov ? 1 : 0.78}>
          <rect x={cx} y={cy} width="106" height={pct ? 46 : 32} rx="3"
            fill="rgba(8,8,10,0.88)"
            stroke={hov ? color : 'rgba(255,255,255,0.08)'}
            strokeWidth={hov ? '1' : '0.5'} />
          <text x={cx+6} y={cy+12} fontSize="8" fontWeight="600"
            fill={status === 'closed' ? '#52504D' : '#9E9C97'}
            fontFamily="JetBrains Mono,monospace">{center.label}</text>
          <text x={cx+6} y={cy+26} fontSize="10" fontWeight="700"
            fill={status === 'closed' ? '#44444A' : '#E8E6E1'}
            fontFamily="JetBrains Mono,monospace">
            {hasData ? formatPrice(d.price) : '—'}
          </text>
          {pct && (
            <text x={cx+6} y={cy+40} fontSize="8" fontWeight="600"
              fill={gain ? '#00C896' : '#FF4455'}
              fontFamily="JetBrains Mono,monospace">
              {gain ? '▲' : '▼'} {pct}
            </text>
          )}
          <circle cx={cx+100} cy={cy+7} r="3" fill={color}
            opacity={status === 'closed' ? 0.4 : 1} />
        </g>
      )}
    </g>
  );
}

export default function WorldMapView({ data }) {
  const liveCount   = CENTERS.filter(c => { const m = MARKETS.find(x => x.id === c.id); return m && getStatus(m) === 'live'; }).length;
  const closedCount = CENTERS.length - liveCount;

  return (
    <div className="wmap-wrap">
      <div className="wmap-stats">
        <div className="wmap-stat">
          <span className="wmap-stat-dot" style={{ background:'#00FF94', animation:'pulse 1.4s ease-in-out infinite' }} />
          <span className="wmap-stat-num">{liveCount}</span>
          <span className="wmap-stat-label">LIVE</span>
        </div>
        <div className="wmap-stat">
          <span className="wmap-stat-dot" style={{ background:'#3A3A3E' }} />
          <span className="wmap-stat-num">{closedCount}</span>
          <span className="wmap-stat-label">CLOSED</span>
        </div>
        <div className="wmap-hint">Hover markers for detail</div>
      </div>

      <svg viewBox="0 0 1000 500" className="wmap-svg" xmlns="http://www.w3.org/2000/svg">
        <style>{`@keyframes mapPulse{0%,100%{r:10;opacity:0.35}50%{r:15;opacity:0.1}}`}</style>

        {/* Ocean */}
        <rect width="1000" height="500" fill="#080c12" rx="8"/>

        {/* Grid lines */}
        <g stroke="rgba(255,255,255,0.035)" strokeWidth="0.5">
          <line x1="0" y1="125" x2="1000" y2="125"/>
          <line x1="0" y1="250" x2="1000" y2="250"/>
          <line x1="0" y1="375" x2="1000" y2="375"/>
          <line x1="250" y1="0" x2="250" y2="500"/>
          <line x1="500" y1="0" x2="500" y2="500"/>
          <line x1="750" y1="0" x2="750" y2="500"/>
        </g>
        {/* Equator */}
        <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(74,158,255,0.1)" strokeWidth="1" strokeDasharray="4 6"/>

        {/* Continents — proper simplified outlines */}
        <g fill="#1e2530" stroke="#2a3545" strokeWidth="0.8" opacity="0.9">

          {/* North America */}
          <path d="M83,52 L108,47 L130,44 L155,47 L175,52 L188,62 L195,75 L198,92
                   L200,110 L205,125 L210,140 L215,158 L215,172 L210,185 L202,198
                   L192,210 L178,222 L162,232 L148,238 L135,235 L122,226 L110,214
                   L100,200 L90,185 L80,168 L72,150 L68,132 L68,115 L72,98 L78,82
                   L82,65 Z"/>
          {/* Central America & Mexico bump */}
          <path d="M178,222 L185,228 L188,238 L183,245 L175,248 L168,242 L162,232 Z"/>
          {/* Alaska */}
          <path d="M68,52 L85,46 L98,50 L100,60 L90,66 L75,64 L65,58 Z"/>
          {/* Greenland */}
          <path d="M195,18 L215,12 L235,14 L240,24 L238,36 L228,44 L215,46 L200,40 L192,30 Z"/>

          {/* South America */}
          <path d="M205,260 L220,252 L238,252 L252,258 L262,270 L268,285 L270,302
                   L268,320 L262,340 L254,360 L242,378 L228,392 L215,398 L205,392
                   L197,378 L193,358 L192,338 L194,318 L196,298 L198,278 L200,262 Z"/>

          {/* Europe */}
          <path d="M440,62 L458,55 L475,52 L492,54 L508,58 L520,65 L525,76
                   L522,88 L514,98 L502,106 L488,110 L472,110 L458,106 L446,98
                   L438,88 L436,76 Z"/>
          {/* Iberian peninsula */}
          <path d="M436,88 L446,84 L452,90 L450,102 L440,108 L432,104 L430,96 Z"/>
          {/* Scandinavia */}
          <path d="M470,36 L482,30 L492,34 L494,45 L488,54 L475,52 L468,44 Z"/>
          {/* UK */}
          <path d="M430,64 L440,58 L445,65 L442,76 L435,80 L428,74 Z"/>

          {/* Africa */}
          <path d="M455,112 L475,106 L495,108 L512,116 L524,128 L530,145 L532,165
                   L530,185 L525,205 L518,225 L510,248 L504,268 L500,288 L498,310
                   L498,330 L500,348 L498,362 L490,374 L478,382 L465,384 L452,378
                   L442,364 L436,348 L434,328 L434,308 L436,288 L438,268 L440,248
                   L440,228 L440,208 L438,188 L438,168 L440,148 L445,132 Z"/>
          {/* Madagascar */}
          <path d="M536,282 L545,275 L550,285 L548,305 L540,315 L532,308 L530,295 Z"/>

          {/* Middle East */}
          <path d="M528,118 L550,112 L568,115 L580,124 L585,138 L582,152 L572,162
                   L558,168 L544,165 L532,156 L526,142 L525,128 Z"/>
          {/* Arabian Peninsula */}
          <path d="M542,152 L560,148 L575,155 L580,172 L578,192 L570,205 L555,212
                   L540,208 L530,198 L526,182 L528,165 Z"/>

          {/* Russia */}
          <path d="M500,42 L540,35 L580,30 L625,28 L668,28 L710,32 L748,38 L780,45
                   L808,54 L830,62 L845,72 L848,84 L840,94 L822,102 L800,108
                   L775,110 L750,108 L725,105 L700,102 L675,100 L650,100 L625,102
                   L600,105 L575,108 L550,110 L525,112 L505,108 L492,100 L485,90
                   L485,78 L490,66 L496,54 Z"/>

          {/* Central Asia / South Asia */}
          <path d="M560,108 L595,105 L620,108 L640,114 L655,124 L660,138 L658,152
                   L648,162 L630,168 L612,168 L595,162 L580,152 L570,138 L562,122 Z"/>
          {/* Indian Subcontinent */}
          <path d="M615,155 L638,150 L658,155 L668,168 L672,185 L668,202 L658,218
                   L642,232 L625,240 L610,238 L598,228 L590,212 L590,195 L594,178
                   L604,165 Z"/>
          {/* Sri Lanka */}
          <path d="M635,242 L642,238 L646,248 L640,256 L632,252 Z"/>

          {/* SE Asia mainland */}
          <path d="M660,148 L688,142 L710,148 L718,162 L715,178 L705,188 L690,192
                   L675,188 L664,175 L658,162 Z"/>
          {/* SE Asia islands — Sumatra/Java area */}
          <path d="M685,198 L715,192 L738,198 L748,210 L742,222 L725,228 L708,224
                   L695,215 Z"/>
          {/* Borneo */}
          <path d="M730,188 L752,182 L768,188 L775,202 L770,218 L755,224 L738,218
                   L728,205 Z"/>

          {/* East Asia / China */}
          <path d="M660,100 L695,94 L728,92 L758,96 L782,104 L800,115 L808,128
                   L805,142 L795,155 L778,162 L758,165 L735,162 L712,158 L690,152
                   L670,142 L658,128 L656,114 Z"/>
          {/* Korean Peninsula */}
          <path d="M800,108 L815,105 L822,114 L820,128 L810,135 L800,130 L796,118 Z"/>
          {/* Japan */}
          <path d="M832,98 L848,92 L860,100 L862,115 L854,128 L842,132 L832,124
                   L828,112 Z"/>
          {/* Taiwan */}
          <path d="M812,158 L820,152 L824,162 L818,170 L810,168 Z"/>

          {/* Australia */}
          <path d="M758,300 L788,290 L820,288 L848,295 L870,308 L882,325 L886,345
                   L882,365 L870,385 L852,400 L828,408 L804,408 L780,400 L760,386
                   L748,368 L742,348 L742,328 L748,310 Z"/>
          {/* New Zealand */}
          <path d="M898,365 L910,358 L918,368 L914,385 L904,392 L895,385 Z"/>

          {/* Japan islands */}
          <path d="M860,115 L870,108 L878,118 L872,130 L862,132 Z"/>
        </g>

        {/* Markers */}
        {CENTERS.map(c => {
          const m = MARKETS.find(x => x.id === c.id);
          if (!m) return null;
          return <Marker key={c.id} center={c} market={m} d={data[c.id] || null} />;
        })}

        {/* Legend */}
        <g transform="translate(12,470)">
          <circle cx="7" cy="7" r="4" fill="#00FF94"/>
          <text x="16" y="11" fontSize="9" fill="#9E9C97" fontFamily="JetBrains Mono,monospace">LIVE</text>
          <circle cx="62" cy="7" r="4" fill="#F59E0B"/>
          <text x="71" y="11" fontSize="9" fill="#9E9C97" fontFamily="JetBrains Mono,monospace">PRE-OPEN</text>
          <circle cx="148" cy="7" r="4" fill="#3A3A3E"/>
          <text x="157" y="11" fontSize="9" fill="#9E9C97" fontFamily="JetBrains Mono,monospace">CLOSED</text>
        </g>
      </svg>
    </div>
  );
}
