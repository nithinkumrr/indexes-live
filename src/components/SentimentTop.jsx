// SentimentTop — shown on Sentiment page
import { useState, useEffect } from 'react';
import { MARKETS, COMMODITY_STRIP_IDS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';
import FxCryptoStrip from './CurrencyStrip';

function FearGreedMeter() {
  const [vix, setVix] = useState(null);
  useEffect(() => {
    fetch('/api/quote?symbol=%5EINDIAVIX')
      .then(r => r.json())
      .then(json => {
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice) setVix(meta.regularMarketPrice);
      }).catch(() => {});
  }, []);

  if (!vix) return <div className="fg-loading">Loading VIX...</div>;

  const score   = Math.max(0, Math.min(100, Math.round(110 - (vix * 3))));
  const zones   = [
    { label: 'Extreme Fear',  min: 0,  max: 20,  color: '#FF4455' },
    { label: 'Fear',          min: 20, max: 40,  color: '#FF8C42' },
    { label: 'Neutral',       min: 40, max: 60,  color: '#F5C518' },
    { label: 'Greed',         min: 60, max: 80,  color: '#7BC67E' },
    { label: 'Extreme Greed', min: 80, max: 100, color: '#00C896' },
  ];
  const current = zones.find(z => score >= z.min && score <= z.max) || zones[0];
  const angle   = -90 + (score / 100) * 180;
  const rad     = (angle * Math.PI) / 180;
  const cx = 90, cy = 82, r = 62;
  const nx = cx + r * 0.75 * Math.cos(rad);
  const ny = cy + r * 0.75 * Math.sin(rad);

  return (
    <div className="fg-st-wrap">
      <div className="fg-st-label">MARKET FEAR &amp; GREED</div>
      <div className="fg-st-sub">India VIX: {vix.toFixed(2)}</div>
      <svg viewBox="0 0 180 100" className="fg-st-svg">
        {zones.map((z, i) => {
          const sa = -180 + (z.min / 100) * 180;
          const ea = -180 + (z.max / 100) * 180;
          const sr = (sa * Math.PI) / 180, er = (ea * Math.PI) / 180;
          const r2 = 62, r1 = 44;
          const x1=cx+r2*Math.cos(sr),y1=cy+r2*Math.sin(sr);
          const x2=cx+r2*Math.cos(er),y2=cy+r2*Math.sin(er);
          const x3=cx+r1*Math.cos(er),y3=cy+r1*Math.sin(er);
          const x4=cx+r1*Math.cos(sr),y4=cy+r1*Math.sin(sr);
          return <path key={i} d={`M${x1},${y1} A${r2},${r2} 0 0,1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0,0 ${x4},${y4} Z`}
            fill={z.color} opacity={current.label === z.label ? 1 : 0.25}/>;
        })}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="4" fill="var(--text)"/>
        <circle cx={cx} cy={cy} r="2" fill="var(--bg2)"/>
        <text x={cx} y={cy+16} textAnchor="middle" fontSize="16" fontFamily="monospace" fontWeight="700" fill={current.color}>{score}</text>
      </svg>
      <div className="fg-st-zone" style={{color: current.color}}>{current.label.toUpperCase()}</div>
      <div className="fg-st-desc">
        {score < 20 && 'Extreme fear. Possible contrarian buy signal.'}
        {score >= 20 && score < 40 && 'Fear dominates. Caution advised.'}
        {score >= 40 && score < 60 && 'Balanced sentiment. No clear bias.'}
        {score >= 60 && score < 80 && 'Greed building. Watch for overheating.'}
        {score >= 80 && 'Extreme greed. Risk of reversal higher.'}
      </div>
      <div className="fg-st-scale">
        {zones.map(z => (
          <div key={z.label} className="fg-st-row">
            <span className="fg-dot" style={{background: z.color}}/>
            <span>{z.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const BENCHMARK_IDS = ['nifty50', 'sensex', 'banknifty', 'giftnifty', 'sp500', 'nasdaq', 'dowjones', 'ftse', 'dax', 'nikkei', 'hangseng', 'shanghai'];

function fmtWB(value, id) {
  if (value == null || isNaN(value)) return '—';
  if (id === 'vix' || id === 'us10y') return value.toFixed(2);
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1000)  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

function WBCard({ market, data, nseData = {} }) {
  const d      = data[market.id];
  const status = getStatus(market);
  const gain   = d ? d.changePct >= 0 : true;
  const pe     = nseData[market.id]?.pe;
  return (
    <div className={`wb-card ${status === 'live' ? 'wb-live' : ''}`} data-market-id={market.id}>
      <div className="wb-top">
        <span className="wb-flag">{market.flag}</span>
        <div className="wb-info">
          <span className="wb-name">{market.name}</span>
          <span className="wb-exch">{market.exchange}</span>
        </div>
        {status === 'live' && <span className="wb-dot" />}
      </div>
      <div className="wb-price">
        {d ? fmtWB(d.price, market.id) : '—'}
        {market.unit && <span className="wb-unit"> {market.unit}</span>}
      </div>
      {d && (
        <div className={`wb-pct ${gain ? 'gain' : 'loss'}`}>
          {gain ? '▲' : '▼'} {formatPct(d.changePct)}
          {pe > 0 && <span className="wb-pe">P/E {pe.toFixed(1)}x</span>}
        </div>
      )}
      {d?.spark && <div className="wb-spark"><Sparkline points={d.spark} gain={gain} height={32} /></div>}
    </div>
  );
}

export default function SentimentTop({ data, nseData = {} }) {
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const benchmarks   = BENCHMARK_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

  return (
    <div className="st-wrap">

      {/* 1. Commodity strip — identical to Markets page */}
      <div className="commodity-strip">
        <div className="commodity-strip-label">COMMODITY</div>
        {stripMarkets.map(market => {
          const d    = data[market.id];
          const gain = d ? d.changePct >= 0 : true;
          return (
            <div key={market.id} className="commodity-strip-item">
              <span className="cs-flag">{market.flag}</span>
              <span className="cs-name">{market.name}</span>
              <span className="cs-price">{d ? formatPrice(d.price, true) : '—'}</span>
              <span className="cs-unit">{market.unit}</span>
              {d && <span className={`cs-pct ${gain ? 'gain' : 'loss'}`}>{gain ? '▲' : '▼'} {formatPct(d.changePct)}</span>}
            </div>
          );
        })}
      </div>

      {/* 2. FX + Crypto strip — identical to Markets page */}
      <FxCryptoStrip data={data} />

      {/* 3. Fear & Greed 20% | Benchmarks 80% */}
      <div className="st-panels-v2">
        <div className="st-fg-col">
          <FearGreedMeter />
        </div>
        <div className="st-bm-col">
          <div className="st-panel-label">BENCHMARKS</div>
          <div className="wb-grid st-bm-grid">
            {benchmarks.map(m => <WBCard key={m.id} market={m} data={data} nseData={nseData} />)}
          </div>
        </div>
      </div>

    </div>
  );
}
