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

  // Protractor geometry
  const CX = 100, CY = 92, R = 74, ARC_W = 14;
  const toRad = (a) => (a * Math.PI) / 180;
  const polarX = (a, r) => CX + r * Math.cos(toRad(a));
  const polarY = (a, r) => CY + r * Math.sin(toRad(a));

  // Needle angle: score 0 → -180°, score 100 → 0° (left to right semicircle)
  const needleAngle = -180 + (score / 100) * 180;
  const NEEDLE_LEN = R - ARC_W - 6;
  const nx = polarX(needleAngle, NEEDLE_LEN);
  const ny = polarY(needleAngle, NEEDLE_LEN);

  // 5 color zones — each 36° of the 180° arc
  const zones = [
    { from: -180, to: -144, color: '#FF4444' },
    { from: -144, to: -108, color: '#FF8C42' },
    { from: -108, to:  -72, color: '#F5C842' },
    { from:  -72, to:  -36, color: '#7DC67E' },
    { from:  -36, to:    0, color: '#2ECC71' },
  ];

  // Tick marks — every 5 units (= 9°), major every 25 (= 45°)
  const ticks = [];
  for (let i = 0; i <= 100; i += 5) {
    const a = -180 + (i / 100) * 180;
    const isMajor = i % 25 === 0;
    const outerR = R + 2;
    const innerR = isMajor ? R - ARC_W - 4 : R - ARC_W + 2;
    ticks.push({ x1: polarX(a, outerR), y1: polarY(a, outerR), x2: polarX(a, innerR), y2: polarY(a, innerR), major: isMajor, label: isMajor ? i : null, labelX: polarX(a, R + 10), labelY: polarY(a, R + 10) });
  }

  // Arc path helper
  const arcPath = (startAngle, endAngle, r) => {
    const x1 = polarX(startAngle, r), y1 = polarY(startAngle, r);
    const x2 = polarX(endAngle, r),   y2 = polarY(endAngle, r);
    const sweep = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${sweep} 1 ${x2} ${y2}`;
  };

  const comps = [
    { label: 'India VIX',    val: mmi.scores.vixScore, detail: mmi.vix ? 'VIX ' + mmi.vix.toFixed(2) : '' },
    { label: 'FII Activity', val: mmi.scores.fiiScore, detail: mmi.fiiNet ? ('Net ' + (mmi.fiiNet > 0 ? '+' : '') + Math.round(mmi.fiiNet) + 'Cr') : '' },
    { label: 'Momentum',     val: mmi.scores.momScore, detail: 'EMA30 vs EMA90' },
    { label: 'Breadth',      val: mmi.scores.adScore,  detail: (mmi.advancers && mmi.decliners) ? (mmi.advancers + 'A / ' + mmi.decliners + 'D') : '' },
    { label: '52W Strength', val: mmi.scores.psScore,  detail: (mmi.highs52w != null) ? (mmi.highs52w + 'H / ' + mmi.lows52w + 'L') : '' },
    { label: 'Price Change', val: mmi.scores.chgScore, detail: '' },
  ];

  return (
    <div className="fg-st-wrap">
      <div className="fg-st-label">MARKET MOOD INDEX</div>
      <div className="fg-st-sub">6-factor sentiment · India equity</div>
      <svg viewBox="0 0 200 120" className="fg-st-svg">
        {/* Track background */}
        <path d={arcPath(-180, 0, R)} fill="none" stroke="var(--border)" strokeWidth={ARC_W + 4} strokeLinecap="butt" />

        {/* Color zones */}
        {zones.map(function(z, i) {
          return <path key={i} d={arcPath(z.from, z.to, R)} fill="none" stroke={z.color} strokeWidth={ARC_W} strokeLinecap="butt" opacity="0.85" />;
        })}

        {/* Tick marks */}
        {ticks.map(function(t, i) {
          return <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.major ? 'var(--text2)' : 'var(--text3)'} strokeWidth={t.major ? 1.2 : 0.6} />;
        })}

        {/* Scale labels: 0, 25, 50, 75, 100 */}
        {ticks.filter(function(t) { return t.label != null; }).map(function(t, i) {
          return <text key={i} x={t.labelX} y={t.labelY} textAnchor="middle" dominantBaseline="middle" fontSize="7" fontFamily="var(--mono)" fill="var(--text3)">{t.label}</text>;
        })}

        {/* FEAR / GREED labels */}
        <text x={CX - R - 16} y={CY + 10} textAnchor="middle" fontSize="5.5" fontFamily="var(--mono)" fill="#FF4444" letterSpacing="0.5">FEAR</text>
        <text x={CX + R + 16} y={CY + 10} textAnchor="middle" fontSize="5.5" fontFamily="var(--mono)" fill="#2ECC71" letterSpacing="0.5">GREED</text>

        {/* Needle */}
        <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
        <circle cx={CX} cy={CY} r="4.5" fill="var(--bg2)" stroke="var(--text)" strokeWidth="2" />
        <circle cx={CX} cy={CY} r="2" fill={zoneColor} />

        {/* Score */}
        <text x={CX} y={CY - 20} textAnchor="middle" fontSize="22" fontWeight="800" fontFamily="var(--mono)" fill={zoneColor}>{score}</text>
      </svg>
      <div className="fg-st-zone" style={{ color: zoneColor }}>{zone}</div>
      <div className="fg-st-desc">{zoneDesc}</div>
      <div className="fg-components">
        {comps.filter(function(c){ return c.val != null; }).map(function(c, i) {
          var barColor = c.val <= 25 ? '#FF4444' : c.val <= 45 ? '#FF8C42' : c.val <= 55 ? '#F5C842' : c.val <= 75 ? '#7DC67E' : '#2ECC71';
          return (
            <div key={i} className="fg-comp-row" title={c.detail || c.label}>
              <span className="fg-comp-label">{c.label}</span>
              <div className="fg-comp-bar-wrap">
                <div className="fg-comp-bar" style={{ width: c.val + '%', background: barColor }}/>
              </div>
              <span className="fg-comp-val">{c.val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const SENTIMENT_BENCHMARK_IDS = [
  'nifty50','sensex','giftnifty','banknifty',
  'sp500','nasdaq','dowjones','ftse','dax','nikkei','hangseng','shanghai'
];

export default function SentimentTop({ data, nseData = {} }) {
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const benchmarks   = SENTIMENT_BENCHMARK_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

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
