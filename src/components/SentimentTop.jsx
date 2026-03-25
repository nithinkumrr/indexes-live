// SentimentTop — shown on Sentiment page
import { useState, useEffect } from 'react';
import { MARKETS, COMMODITY_STRIP_IDS, WORLD_BENCHMARK_IDS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';
import FxCryptoStrip from './CurrencyStrip';


function fmtWB(value, id) {
  if (value == null || isNaN(value)) return '—';
  if (['vix','us10y'].includes(id)) return value.toFixed(2);
  if (value >= 10000) return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
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

function FearGreedMeter() {
  const [mmi, setMmi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nse-india')
      .then(r => r.json())
      .then(d => {
        const vixScore = d.vix != null ? Math.max(0, Math.min(100, Math.round(100 - (d.vix - 10) * 4))) : null;
        const fiiScore = d.fiiNet != null ? Math.max(0, Math.min(100, Math.round(50 + (d.fiiNet / 100)))) : null;
        const momScore = (d.ema30 && d.ema90) ? Math.max(0, Math.min(100, Math.round(50 + ((d.ema30 - d.ema90) / d.ema90) * 1000))) : null;
        const adScore  = (d.advancers && d.decliners) ? Math.max(0, Math.min(100, Math.round((d.advancers / (d.advancers + d.decliners)) * 100))) : null;
        const psScore  = ((d.highs52w != null) && (d.lows52w != null) && (d.highs52w + d.lows52w > 0)) ? Math.max(0, Math.min(100, Math.round((d.highs52w / (d.highs52w + d.lows52w)) * 100))) : null;
        const chgScore = d.niftyChange != null ? Math.max(0, Math.min(100, Math.round(50 + d.niftyChange * 12.5))) : null;

        const vals = [vixScore, fiiScore, momScore, adScore, psScore, chgScore].filter(v => v != null);
        const score = vals.length > 0 ? Math.round(vals.reduce((a,b) => a+b, 0) / vals.length) : null;

        setMmi({ score, vix: d.vix, fiiNet: d.fiiNet, ema30: d.ema30, ema90: d.ema90,
          advancers: d.advancers, decliners: d.decliners, highs52w: d.highs52w, lows52w: d.lows52w,
          scores: { vixScore, fiiScore, momScore, adScore, psScore, chgScore } });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="fg-loading">Computing MMI...</div>;
  if (!mmi || mmi.score == null) return <div className="fg-loading">MMI data unavailable</div>;

  const { score } = mmi;
  const zone = score <= 25 ? 'EXTREME FEAR' : score <= 45 ? 'FEAR' : score <= 55 ? 'NEUTRAL' : score <= 75 ? 'GREED' : 'EXTREME GREED';
  const zoneColor = score <= 25 ? '#FF4444' : score <= 45 ? '#FF8C42' : score <= 55 ? '#F5C842' : score <= 75 ? '#7DC67E' : '#2ECC71';
  const zoneDesc = score <= 25 ? 'Extreme caution. Historically a contrarian buy signal.'
    : score <= 45 ? 'Fear is driving the market. Selling pressure persists.'
    : score <= 55 ? 'Market is balanced. Neither fear nor greed dominates.'
    : score <= 75 ? 'Optimism is building. Markets trending upward.'
    : 'Euphoria zone. Markets may be overbought.';

  const angle = -90 + (score / 100) * 180;
  const R = 70, CX = 90, CY = 85;
  const toRad = (a) => (a * Math.PI) / 180;
  const nx = CX + R * Math.cos(toRad(angle));
  const ny = CY + R * Math.sin(toRad(angle));

  const arcs = [
    { from:-90, to:-54, color:'#FF4444' },
    { from:-54, to:-18, color:'#FF8C42' },
    { from:-18, to: 18, color:'#F5C842' },
    { from: 18, to: 54, color:'#7DC67E' },
    { from: 54, to: 90, color:'#2ECC71' },
  ];

  const comps = [
    { label: 'India VIX',    val: mmi.scores.vixScore, detail: mmi.vix ? 'VIX ' + mmi.vix.toFixed(2) : '' },
    { label: 'FII Activity', val: mmi.scores.fiiScore, detail: mmi.fiiNet ? ('Net ' + (mmi.fiiNet > 0 ? '+' : '') + Math.round(mmi.fiiNet) + 'Cr') : '' },
    { label: 'Momentum',     val: mmi.scores.momScore, detail: 'EMA30 vs EMA90' },
    { label: 'Breadth',      val: mmi.scores.adScore,  detail: (mmi.advancers && mmi.decliners) ? (mmi.advancers + 'A / ' + mmi.decliners + 'D') : '' },
    { label: '52W Strength', val: mmi.scores.psScore,  detail: (mmi.highs52w != null) ? (mmi.highs52w + 'H / ' + mmi.lows52w + 'L') : '' },
    { label: 'Price Change', val: mmi.scores.chgScore, detail: '' },
  ];

  return (
    <div className="fg-card">
      <div className="fg-st-label">MARKET MOOD INDEX</div>
      <div className="fg-st-sub">6-factor sentiment · India equity</div>
      <svg viewBox="0 0 180 100" className="fg-svg">
        {arcs.map(function(arc, i) {
          var x1=CX+R*Math.cos(toRad(arc.from)), y1=CY+R*Math.sin(toRad(arc.from));
          var x2=CX+R*Math.cos(toRad(arc.to)),   y2=CY+R*Math.sin(toRad(arc.to));
          return <path key={i} d={'M '+x1+' '+y1+' A '+R+' '+R+' 0 0 1 '+x2+' '+y2} fill="none" stroke={arc.color} strokeWidth="8" strokeLinecap="round"/>;
        })}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx={CX} cy={CY} r="4" fill="var(--text)"/>
        <text x={CX} y={CY - 14} textAnchor="middle" fontSize="18" fontWeight="800" fill={zoneColor}>{score}</text>
      </svg>
      <div className="fg-zone" style={{ color: zoneColor }}>{zone}</div>
      <div className="fg-desc">{zoneDesc}</div>
      <div className="fg-components">
        {comps.filter(function(c){ return c.val != null; }).map(function(c, i) {
          var barColor = c.val <= 25 ? '#FF4444' : c.val <= 45 ? '#FF8C42' : c.val <= 55 ? '#F5C842' : c.val <= 75 ? '#7DC67E' : '#2ECC71';
          return (
            <div key={i} className="fg-comp-row">
              <span className="fg-comp-label">{c.label}</span>
              <div className="fg-comp-bar-wrap">
                <div className="fg-comp-bar" style={{ width: c.val + '%', background: barColor }}/>
              </div>
              <span className="fg-comp-val">{c.val}</span>
              {c.detail ? <span className="fg-comp-detail">{c.detail}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
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
        <span className="wb-name">{market.name}</span>
        <span className="wb-exch">{market.exchange}</span>
      </div>
      <div className={`wb-price ${gain ? 'gain' : 'loss'}`}>
        {d ? fmtWB(d.price, market.id) : '—'}
      </div>
      <div className="wb-change">
        {d && <span className={`wb-pct ${gain ? 'gain' : 'loss'}`}>{gain ? '▲' : '▼'} {formatPct(d.changePct)}</span>}
        {pe > 0 && <span className="wb-pe">P/E {pe.toFixed(1)}x</span>}
      </div>
      {d?.spark && <Sparkline points={d.spark} gain={gain} height={40} />}
    </div>
  );
}

export default function SentimentTop({ data, nseData = {} }) {
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const benchmarks   = MARKETS.filter(m => m.category === 'index' || m.id === 'giftnifty');

  return (
    <div className="st-wrap">

      {/* 1. Commodity strip */}
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

      {/* 2. FX + Crypto strip */}
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
