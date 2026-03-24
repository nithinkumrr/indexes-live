// SentimentLayout.jsx
// Shown on the Sentiment page above the bubble view:
// 1. Commodity strip (key commodities)
// 2. Currency strip
// 3. India 2×2 | World benchmarks 4×2

import { MARKETS } from '../data/markets';
import { formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';

// ── IDs to show ──────────────────────────────────────────────────────────────
const COMMODITY_STRIP_IDS = ['crude', 'brent', 'natgas', 'gold', 'silver', 'copper', 'aluminium', 'wheat'];
const CURRENCY_STRIP_IDS  = ['usdinr', 'dxy', 'eurusd', 'gbpusd', 'usdjpy', 'usdcny', 'btcusd', 'ethusd'];
const INDIA_IDS           = ['nifty50', 'sensex', 'banknifty', 'giftnifty'];
const BENCHMARK_IDS       = ['sp500', 'nasdaq', 'dowjones', 'ftse', 'dax', 'nikkei', 'hangseng', 'vix'];

// ── Price formatters ─────────────────────────────────────────────────────────
function fmtPrice(value, id) {
  if (value == null || isNaN(value)) return '—';
  if (['vix', 'us10y'].includes(id))   return value.toFixed(2);
  if (['eurusd', 'gbpusd'].includes(id)) return value.toFixed(3);
  if (['usdinr', 'usdjpy', 'usdcny'].includes(id)) return value.toFixed(2);
  if (['dxy'].includes(id)) return value.toFixed(2);
  if (['btcusd', 'ethusd'].includes(id)) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100)   return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 10)    return value.toFixed(2);
  return value.toFixed(3);
}

// ── Horizontal strip item ────────────────────────────────────────────────────
function StripItem({ market, data, invertGain = false }) {
  const d    = data[market.id];
  const gain = d ? (invertGain ? d.changePct < 0 : d.changePct >= 0) : true;
  const rawGain = d ? d.changePct >= 0 : true;
  return (
    <div className="sl-strip-item" data-market-id={market.id}>
      <div className="sl-strip-top">
        <span className="sl-strip-flag">{market.flag}</span>
        <span className="sl-strip-name">{market.name}</span>
        {d && <span className={`sl-strip-pct ${gain ? 'gain' : 'loss'}`}>{rawGain ? '▲' : '▼'} {formatPct(d.changePct)}</span>}
      </div>
      <div className="sl-strip-price">
        {d ? fmtPrice(d.price, market.id) : '—'}
        {market.unit && <span className="sl-strip-unit"> {market.unit}</span>}
      </div>
      {d?.spark && <div className="sl-strip-spark"><Sparkline points={d.spark} gain={gain} height={24} /></div>}
    </div>
  );
}

// ── India 2×2 card ───────────────────────────────────────────────────────────
function IndiaCard({ market, data, nseData }) {
  const d      = data[market.id];
  const status = getStatus(market);
  const gain   = d ? d.changePct >= 0 : true;
  const nd     = nseData[market.id];
  return (
    <div className={`sl-india-card ${status === 'live' ? 'sl-india-live' : ''}`} data-market-id={market.id}>
      <div className="sl-india-top">
        <div>
          <div className="sl-india-name">{market.name}</div>
          <div className="sl-india-exch">{market.exchange}</div>
        </div>
        <span className={`sl-india-badge ${status === 'live' ? 'sl-badge-live' : 'sl-badge-closed'}`}>
          {status === 'live' ? '● LIVE' : 'CLSD'}
        </span>
      </div>
      <div className="sl-india-price">{d ? fmtPrice(d.price, market.id) : '—'}</div>
      {d && (
        <div className={`sl-india-change ${gain ? 'gain' : 'loss'}`}>
          {gain ? '▲' : '▼'} {formatPct(d.changePct)}
          {nd?.pe > 0 && <span className="sl-india-pe"> · P/E {nd.pe.toFixed(1)}x</span>}
        </div>
      )}
      {d?.spark && <Sparkline points={d.spark} gain={gain} height={48} />}
    </div>
  );
}

// ── World benchmark card ─────────────────────────────────────────────────────
function BenchCard({ market, data }) {
  const d      = data[market.id];
  const status = getStatus(market);
  const isVIX  = market.id === 'vix';
  const rawGain = d ? d.changePct >= 0 : true;
  const gain    = isVIX ? !rawGain : rawGain;
  return (
    <div className={`sl-bench-card ${status === 'live' ? 'sl-bench-live' : ''}`} data-market-id={market.id}>
      <div className="sl-bench-top">
        <span className="sl-bench-flag">{market.flag}</span>
        <div>
          <div className="sl-bench-name">{market.name}</div>
          <div className="sl-bench-exch">{market.exchange}</div>
        </div>
        {status === 'live' && <span className="sl-bench-dot" />}
      </div>
      <div className="sl-bench-price">{d ? fmtPrice(d.price, market.id) : '—'}</div>
      {d && <div className={`sl-bench-pct ${gain ? 'gain' : 'loss'}`}>{rawGain ? '▲' : '▼'} {formatPct(d.changePct)}</div>}
      {d?.spark && <Sparkline points={d.spark} gain={gain} height={28} />}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function SentimentLayout({ data, nseData = {} }) {
  const commodities = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const currencies  = CURRENCY_STRIP_IDS.map(id  => MARKETS.find(m => m.id === id)).filter(Boolean);
  const indiaMarkets = INDIA_IDS.map(id  => MARKETS.find(m => m.id === id)).filter(Boolean);
  const benchmarks   = BENCHMARK_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

  return (
    <div className="sl-wrap">

      {/* Commodity strip */}
      <div className="sl-strip-section">
        <div className="sl-strip-label">COMMODITIES</div>
        <div className="sl-strip">
          {commodities.map(m => <StripItem key={m.id} market={m} data={data} />)}
        </div>
      </div>

      {/* Currency strip */}
      <div className="sl-strip-section">
        <div className="sl-strip-label">FX & CRYPTO</div>
        <div className="sl-strip">
          {currencies.map(m => (
            <StripItem key={m.id} market={m} data={data}
              invertGain={['usdinr','usdjpy','usdcny'].includes(m.id)} />
          ))}
        </div>
      </div>

      {/* India 2×2 + Benchmarks 4×2 */}
      <div className="sl-panels">
        <div className="sl-panel-india">
          <div className="sl-panel-label">INDIA</div>
          <div className="sl-india-grid">
            {indiaMarkets.map(m => <IndiaCard key={m.id} market={m} data={data} nseData={nseData} />)}
          </div>
        </div>
        <div className="sl-panel-world">
          <div className="sl-panel-label">WORLD BENCHMARKS</div>
          <div className="sl-bench-grid">
            {benchmarks.map(m => <BenchCard key={m.id} market={m} data={data} />)}
          </div>
        </div>
      </div>

    </div>
  );
}
