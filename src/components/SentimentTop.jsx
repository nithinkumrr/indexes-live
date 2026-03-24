import { MARKETS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';

const COMMODITY_IDS = ['crude', 'brent', 'gold', 'silver', 'copper', 'natgas', 'wheat', 'cotton'];
const CURRENCY_IDS  = ['usdinr', 'dxy', 'eurusd', 'gbpusd', 'usdjpy', 'usdcny'];
const INDIA_IDS     = ['nifty50', 'sensex', 'banknifty', 'giftnifty'];
const WORLD_IDS     = ['sp500', 'nasdaq', 'dowjones', 'ftse', 'dax', 'nikkei', 'hangseng', 'shanghai'];

function fmtPrice(value, id) {
  if (value == null || isNaN(value)) return '—';
  if (id === 'vix' || id === 'us10y') return value.toFixed(2);
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1000)  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

function MiniCard({ market, data, isCommodity }) {
  const d    = data[market.id];
  const gain = d ? d.changePct >= 0 : true;
  return (
    <div className="st-mini" data-market-id={market.id}>
      <div className="st-mini-top">
        <span className="st-mini-flag">{market.flag}</span>
        <span className="st-mini-name">{market.name}</span>
        <span className={`st-mini-pct ${gain ? 'gain' : 'loss'}`}>
          {d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : '—'}
        </span>
      </div>
      <div className="st-mini-price">
        {d ? formatPrice(d.price, isCommodity) : '—'}
        {market.unit && <span className="st-mini-unit"> {market.unit}</span>}
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
        <div className="wb-info">
          <span className="wb-name">{market.name}</span>
          <span className="wb-exch">{market.exchange}</span>
        </div>
        {status === 'live' && <span className="wb-dot" />}
      </div>
      <div className="wb-price">
        {d ? fmtPrice(d.price, market.id) : '—'}
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
  const commodities = COMMODITY_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const currencies  = CURRENCY_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const india       = INDIA_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const world       = WORLD_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

  return (
    <div className="st-wrap">

      {/* Commodity strip */}
      <div className="st-row">
        <div className="st-row-label">COMMODITY</div>
        <div className="st-strip">
          {commodities.map(m => <MiniCard key={m.id} market={m} data={data} isCommodity />)}
        </div>
      </div>

      {/* Currency strip */}
      <div className="st-row">
        <div className="st-row-label">CURRENCIES</div>
        <div className="st-strip">
          {currencies.map(m => <MiniCard key={m.id} market={m} data={data} />)}
        </div>
      </div>

      {/* India 2x2 + World 4x2 side by side */}
      <div className="st-panels">
        <div className="st-panel">
          <div className="st-panel-label">INDIA</div>
          <div className="wb-grid st-india-grid">
            {india.map(m => <WBCard key={m.id} market={m} data={data} nseData={nseData} />)}
          </div>
        </div>
        <div className="st-panel">
          <div className="st-panel-label">WORLD BENCHMARKS</div>
          <div className="wb-grid st-world-grid">
            {world.map(m => <WBCard key={m.id} market={m} data={data} nseData={nseData} />)}
          </div>
        </div>
      </div>

    </div>
  );
}
