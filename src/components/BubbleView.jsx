// src/components/BubbleView.jsx
// Sentiment bubble view — each market is a circle.
// Size = relative market importance. Color intensity = magnitude of % change.
// Green = up, Red = down, Grey = no data / flat.

import { useMemo, useState } from 'react';
import { MARKETS } from '../data/markets';
import { formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';

// Market importance weights (relative sizing)
const WEIGHTS = {
  sp500: 10, nasdaq: 9, dowjones: 7, nifty50: 8, sensex: 7,
  banknifty: 6, giftnifty: 5, nikkei: 8, hangseng: 7, shanghai: 8,
  ftse: 8, dax: 7, cac40: 6, stoxx50: 6, kospi: 5,
  asx200: 5, sti: 4, taiex: 4, jkse: 3, russell: 6,
  tsx: 5, bovespa: 5, tadawul: 5, dfm: 4, adx: 4,
  jse: 4, qse: 3, kwse: 3, egx30: 3, ta125: 3, masi: 2,
  vix: 6, us10y: 6,
  gold: 7, silver: 5, crude: 7, natgas: 5, copper: 5,
  aluminium: 3, zinc: 3, cotton: 2,
};

const REGIONS = ['Asia', 'Europe', 'Americas', 'MEA'];
const REGION_LABELS = { Asia: '🌏 Asia Pacific', Europe: '🌍 Europe', Americas: '🌎 Americas', MEA: '🕌 Middle East & Africa' };

// Color based on % change — intensity increases with magnitude
function getColor(changePct, hasData) {
  if (!hasData) return { fill: 'rgba(60,60,65,0.6)', text: '#52504D', border: 'rgba(80,80,85,0.4)' };
  const abs = Math.abs(changePct);
  const intensity = Math.min(abs / 3, 1); // saturates at ±3%
  if (changePct > 0) {
    const g = Math.round(140 + intensity * 60);
    const r = Math.round(0 + intensity * 0);
    const b = Math.round(80 + intensity * 20);
    return {
      fill:   `rgba(${r},${g},${b},${0.15 + intensity * 0.35})`,
      border: `rgba(${r},${g},${b},${0.4 + intensity * 0.5})`,
      text:   '#000000',
    };
  } else {
    const r = Math.round(180 + intensity * 75);
    const g = Math.round(40 - intensity * 20);
    const b = Math.round(40 - intensity * 20);
    return {
      fill:   `rgba(${r},${g},${b},${0.15 + intensity * 0.35})`,
      border: `rgba(${r},${g},${b},${0.4 + intensity * 0.5})`,
      text:   '#000000',
    };
  }
}

function Bubble({ market, d, weight, index }) {
  const [hovered, setHovered] = useState(false);
  const status    = getStatus(market);
  const hasData   = !!d;
  const changePct = d?.changePct ?? 0;
  const colors    = getColor(changePct, hasData);
  const r         = 28 + weight * 4.5; // base 28, max ~72
  const isLive    = status === 'live';

  const shortName = market.name.length > 12
    ? market.name.replace(' 100','').replace(' 225','').replace(' 200','').replace(' 40','').replace(' 50','').replace(' 500','')
    : market.name;

  const pctStr = hasData
    ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
    : '—';

  return (
    <div
      className="bubble-item"
      style={{ width: r * 2, height: r * 2, animationDelay: `${index * 0.03}s` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`bubble-circle ${isLive ? 'bubble-live' : ''} ${hovered ? 'bubble-hovered' : ''}`}
        style={{
          width: '100%', height: '100%',
          background: colors.fill,
          border: `1.5px solid ${colors.border}`,
          boxShadow: hovered ? `0 0 20px ${colors.border}` : isLive ? `0 0 8px ${colors.border}40` : 'none',
        }}
      >
        <div className="bubble-flag">{market.flag}</div>
        <div className="bubble-name" style={{ color: hasData ? '#000000' : '#52504D' }}>
          {r < 44 ? market.exchange : shortName}
        </div>
        {r >= 44 && (
          <div className="bubble-pct" style={{ color: colors.text, fontSize: r < 52 ? 11 : 13 }}>
            {pctStr}
          </div>
        )}
        {r < 44 && hasData && (
          <div className="bubble-pct" style={{ color: colors.text, fontSize: 10 }}>
            {pctStr}
          </div>
        )}
        {isLive && <div className="bubble-live-dot" />}
      </div>

      {/* Tooltip on hover */}
      {hovered && (
        <div className="bubble-tooltip">
          <div className="bt-name">{market.name}</div>
          <div className="bt-exchange">{market.exchange} · {market.country}</div>
          {hasData ? (
            <>
              <div className="bt-price">{d.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
              <div className="bt-change" style={{ color: changePct >= 0 ? '#00C896' : '#FF4455' }}>
                {changePct >= 0 ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
              </div>
            </>
          ) : (
            <div className="bt-nodata">No data</div>
          )}
          <div className="bt-status" style={{ color: isLive ? '#00FF94' : status === 'pre' ? '#F59E0B' : '#52504D' }}>
            {isLive ? '● LIVE' : status === 'pre' ? '● PRE-OPEN' : '○ CLOSED'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BubbleView({ data }) {
  const [activeRegion, setActiveRegion] = useState('all');
  const [sortBy, setSortBy] = useState('importance'); // 'importance' | 'change' | 'name'

  const equityMarkets = useMemo(() =>
    MARKETS.filter(m => m.category === 'index'),
  []);

  const filtered = useMemo(() => {
    let list = activeRegion === 'all'
      ? equityMarkets
      : equityMarkets.filter(m => m.region === activeRegion);

    if (sortBy === 'change') {
      list = [...list].sort((a, b) => {
        const da = data[a.id]?.changePct ?? -999;
        const db = data[b.id]?.changePct ?? -999;
        return db - da;
      });
    } else if (sortBy === 'name') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list = [...list].sort((a, b) => (WEIGHTS[b.id] || 3) - (WEIGHTS[a.id] || 3));
    }
    return list;
  }, [equityMarkets, activeRegion, sortBy, data]);

  // Overall sentiment
  const withData = equityMarkets.filter(m => data[m.id]);
  const gainers  = withData.filter(m => (data[m.id]?.changePct ?? 0) > 0).length;
  const losers   = withData.length - gainers;
  const avgChg   = withData.length
    ? (withData.reduce((s, m) => s + (data[m.id]?.changePct ?? 0), 0) / withData.length).toFixed(2)
    : null;

  return (
    <div className="bubble-wrap">
      {/* Header */}
      <div className="bubble-header">
        <div className="bubble-header-left">
          <div className="bubble-title">Market Sentiment</div>
          {avgChg !== null && (
            <div className="bubble-avg" style={{ color: parseFloat(avgChg) >= 0 ? '#00C896' : '#FF4455' }}>
              Global avg {parseFloat(avgChg) >= 0 ? '+' : ''}{avgChg}%
              <span className="bubble-avg-detail"> · {gainers} up · {losers} down</span>
            </div>
          )}
        </div>
        <div className="bubble-controls">
          <div className="bubble-sort">
            {[['importance','By Size'],['change','By Move'],['name','A–Z']].map(([val, label]) => (
              <button
                key={val}
                className={`bubble-sort-btn ${sortBy === val ? 'bubble-sort-active' : ''}`}
                onClick={() => setSortBy(val)}
              >{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Region filter */}
      <div className="bubble-regions">
        <button className={`bubble-region-btn ${activeRegion === 'all' ? 'bubble-region-active' : ''}`} onClick={() => setActiveRegion('all')}>
          All Markets
        </button>
        {REGIONS.map(r => (
          <button
            key={r}
            className={`bubble-region-btn ${activeRegion === r ? 'bubble-region-active' : ''}`}
            onClick={() => setActiveRegion(r)}
          >{REGION_LABELS[r]}</button>
        ))}
      </div>

      {/* Bubbles */}
      <div className="bubble-grid">
        {filtered.map((market, i) => (
          <Bubble
            key={market.id}
            market={market}
            d={data[market.id] || null}
            weight={WEIGHTS[market.id] || 3}
            index={i}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="bubble-legend">
        <div className="bl-item"><div className="bl-swatch" style={{ background: 'rgba(0,200,150,0.5)', border: '1.5px solid rgba(0,200,150,0.8)' }} /><span>Strong gain (&gt;2%)</span></div>
        <div className="bl-item"><div className="bl-swatch" style={{ background: 'rgba(0,140,80,0.3)', border: '1.5px solid rgba(0,140,80,0.5)' }} /><span>Mild gain</span></div>
        <div className="bl-item"><div className="bl-swatch" style={{ background: 'rgba(60,60,65,0.6)', border: '1px solid rgba(80,80,85,0.4)' }} /><span>No data</span></div>
        <div className="bl-item"><div className="bl-swatch" style={{ background: 'rgba(180,40,40,0.3)', border: '1.5px solid rgba(180,40,40,0.5)' }} /><span>Mild loss</span></div>
        <div className="bl-item"><div className="bl-swatch" style={{ background: 'rgba(255,60,60,0.5)', border: '1.5px solid rgba(255,60,60,0.8)' }} /><span>Strong loss (&gt;2%)</span></div>
        <div className="bl-item"><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF94', boxShadow: '0 0 6px #00FF94' }} /><span>● Live now</span></div>
      </div>
    </div>
  );
}
