// SentimentTop — shown on Sentiment page
import { useState, useEffect } from 'react';
import { MARKETS, COMMODITY_STRIP_IDS, WORLD_BENCHMARK_IDS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';
import FxCryptoStrip from './CurrencyStrip';

function FearGreedMeter() {
  const [mmi, setMmi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/nse-india')
      .then(r => r.json())
      .then(d => {
        // ── Component 1: VIX (inverted — high VIX = fear)
        // Score 0-100: VIX 10 = 100 (greed), VIX 35+ = 0 (extreme fear)
        const vixScore = d.vix
          ? Math.max(0, Math.min(100, Math.round(100 - (d.vix - 10) * 4)))
          : null;

        // ── Component 2: FII Activity
        // Normalize: net buy > 5000Cr = greed(100), net sell > 5000Cr = fear(0)
        const fiiScore = d.fiiNet !== undefined
          ? Math.max(0, Math.min(100, Math.round(50 + (d.fiiNet / 100))))
          : null;

        // ── Component 3: Nifty Momentum (EMA30 vs EMA90)
        // Positive momentum (EMA30 > EMA90) = greed, negative = fear
        const momScore = (d.ema30 && d.ema90)
          ? Math.max(0, Math.min(100, Math.round(50 + ((d.ema30 - d.ema90) / d.ema90) * 1000)))
          : null;

        // ── Component 4: Market Breadth (Advance/Decline)
        // More advancers = greed, more decliners = fear
        const adScore = (d.advancers && d.decliners)
          ? Math.max(0, Math.min(100, Math.round((d.advancers / (d.advancers + d.decliners)) * 100)))
          : null;

        // ── Component 5: Price Strength (52W highs vs lows)
        // More highs = greed, more lows = fear
        const psScore = (d.highs52w !== undefined && d.lows52w !== undefined && (d.highs52w + d.lows52w) > 0)
          ? Math.max(0, Math.min(100, Math.round((d.highs52w / (d.highs52w + d.lows52w)) * 100)))
          : null;

        // ── Component 6: Nifty % change (momentum proxy)
        // +2% = greed, -2% = fear
        const chgScore = d.niftyChange !== undefined
          ? Math.max(0, Math.min(100, Math.round(50 + d.niftyChange * 12.5)))
          : null;

        // Equal weight average of available components
        const components = [vixScore, fiiScore, momScore, adScore, psScore, chgScore].filter(v => v !== null);
        const score = components.length > 0
          ? Math.round(components.reduce((a,b) => a+b, 0) / components.length)
          : null;

        setMmi({
          score,
          vix: d.vix,
          components: { vixScore, fiiScore, momScore, adScore, psScore, chgScore },
          componentCount: components.length,
          fiiNet: d.fiiNet,
          ema30: d.ema30, ema90: d.ema90,
          advancers: d.advancers, decliners: d.decliners,
          highs52w: d.highs52w, lows52w: d.lows52w,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="fg-loading">Computing MMI...</div>;
  if (!mmi?.score) return <div className="fg-loading">MMI data unavailable</div>;

  const { score } = mmi;
  const zone = score <= 25 ? 'EXTREME FEAR'
    : score <= 45 ? 'FEAR'
    : score <= 55 ? 'NEUTRAL'
    : score <= 75 ? 'GREED'
    : 'EXTREME GREED';

  const zoneColor = score <= 25 ? '#FF4444'
    : score <= 45 ? '#FF8C42'
    : score <= 55 ? '#F5C842'
    : score <= 75 ? '#7DC67E'
    : '#2ECC71';

  const zoneDesc = score <= 25 ? 'Extreme caution. Investors are panicking. Historically a contrarian buy signal.'
    : score <= 45 ? 'Fear is driving the market. Caution is high, selling pressure persists.'
    : score <= 55 ? 'Market is balanced. Neither fear nor greed dominates.'
    : score <= 75 ? 'Optimism is building. Markets trending upward with broad participation.'
    : 'Euphoria zone. Markets may be overbought. Exercise caution on new positions.';

  // Gauge needle angle: 0 → -90°, 100 → +90°
  const angle = -90 + (score / 100) * 180;
  const r = 70, cx = 90, cy = 85;
  const rad = (a) => (a * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad(angle));
  const ny = cy + r * Math.sin(rad(angle));

  const components = [
    { label: 'India VIX',    val: mmi.components.vixScore,  detail: mmi.vix ? `VIX ${mmi.vix.toFixed(2)}` : '' },
    { label: 'FII Activity', val: mmi.components.fiiScore,  detail: mmi.fiiNet ? `₹${(mmi.fiiNet/100).toFixed(0)}Cr net` : '' },
    { label: 'Momentum',     val: mmi.components.momScore,  detail: (mmi.ema30 && mmi.ema90) ? `EMA30 vs EMA90` : '' },
    { label: 'Breadth',      val: mmi.components.adScore,   detail: (mmi.advancers && mmi.decliners) ? `${mmi.advancers}A / ${mmi.decliners}D` : '' },
    { label: '52W Strength', val: mmi.components.psScore,   detail: (mmi.highs52w !== undefined) ? `${mmi.highs52w}H / ${mmi.lows52w}L` : '' },
    { label: 'Price Change', val: mmi.components.chgScore,  detail: '' },
  ];

  return (
    <div className="fg-card">
      <div className="fg-st-label">MARKET MOOD INDEX</div>
      <div className="fg-st-sub">6-factor sentiment · India equity markets</div>

      {/* Gauge */}
      <svg viewBox="0 0 180 100" className="fg-svg">
        {/* Arc segments */}
        {[
          { from:-90, to:-54, color:'#FF4444' },
          { from:-54, to:-18, color:'#FF8C42' },
          { from:-18, to: 18, color:'#F5C842' },
          { from: 18, to: 54, color:'#7DC67E' },
          { from: 54, to: 90, color:'#2ECC71' },
        ].map(({from, to, color}, i) => {
          const x1=cx+r*Math.cos(rad(from)), y1=cy+r*Math.sin(rad(from));
          const x2=cx+r*Math.cos(rad(to)),   y2=cy+r*Math.sin(rad(to));
          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={color} opacity="0.15"/>;
        })}
        {/* Arc outline */}
        {[
          { from:-90, to:-54, color:'#FF4444' },
          { from:-54, to:-18, color:'#FF8C42' },
          { from:-18, to: 18, color:'#F5C842' },
          { from: 18, to: 54, color:'#7DC67E' },
          { from: 54, to: 90, color:'#2ECC71' },
        ].map(({from, to, color}, i) => {
          const x1=cx+r*Math.cos(rad(from)), y1=cy+r*Math.sin(rad(from));
          const x2=cx+r*Math.cos(rad(to)),   y2=cy+r*Math.sin(rad(to));
          return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
            fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"/>;
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="4" fill="var(--text)"/>
        {/* Score */}
        <text x={cx} y={cy-12} textAnchor="middle" fontSize="18" fontWeight="800" fill={zoneColor}>{score}</text>
      </svg>

      <div className="fg-zone" style={{ color: zoneColor }}>{zone}</div>
      <div className="fg-desc">{zoneDesc}</div>

      {/* Component breakdown */}
      <div className="fg-components">
        {components.filter(c => c.val !== null).map((c, i) => (
          <div key={i} className="fg-comp-row">
            <span className="fg-comp-label">{c.label}</span>
            <div className="fg-comp-bar-wrap">
              <div className="fg-comp-bar" style={{
                width: `${c.val}%`,
                background: c.val <= 25 ? '#FF4444' : c.val <= 45 ? '#FF8C42' : c.val <= 55 ? '#F5C842' : c.val <= 75 ? '#7DC67E' : '#2ECC71'
              }}/>
            </div>
            <span className="fg-comp-val">{c.val}</span>
            {c.detail && <span className="fg-comp-detail">{c.detail}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}


export default function SentimentTop({ data, nseData = {} }) {
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const benchmarks   = MARKETS.filter(m => m.category === 'index' || m.id === 'giftnifty');

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
