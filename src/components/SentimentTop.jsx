import { MARKETS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import Sparkline from './Sparkline';

// Key commodities to show in the strip
const COMMODITY_IDS = ['crude', 'brent', 'gold', 'silver', 'copper', 'natgas', 'wheat', 'cotton'];
const CURRENCY_IDS  = ['usdinr', 'dxy', 'eurusd', 'gbpusd', 'usdjpy', 'usdcny'];
const INDIA_IDS     = ['nifty50', 'sensex', 'banknifty', 'giftnifty'];
const WORLD_IDS     = ['sp500', 'nasdaq', 'dowjones', 'ftse', 'dax', 'nikkei', 'hangseng', 'shanghai'];

function MiniCard({ market, data, isCommodity = false }) {
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

function GridCard({ market, data, nseData = {} }) {
  const d    = data[market.id];
  const gain = d ? d.changePct >= 0 : true;
  const pe   = nseData[market.id]?.pe;
  return (
    <div className="st-grid-card" data-market-id={market.id}>
      <div className="st-gc-top">
        <span className="st-gc-flag">{market.flag}</span>
        <div>
          <div className="st-gc-name">{market.name}</div>
          <div className="st-gc-exch">{market.exchange}</div>
        </div>
      </div>
      <div className="st-gc-price">
        {d ? formatPrice(d.price, false) : '—'}
      </div>
      <div className={`st-gc-pct ${gain ? 'gain' : 'loss'}`}>
        {d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : '—'}
        {pe > 0 && <span className="st-gc-pe"> · P/E {pe.toFixed(1)}x</span>}
      </div>
      {d?.spark && <Sparkline points={d.spark} gain={gain} height={36} />}
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
      <div className="st-section">
        <div className="st-label">COMMODITIES</div>
        <div className="st-strip">
          {commodities.map(m => <MiniCard key={m.id} market={m} data={data} isCommodity />)}
        </div>
      </div>

      {/* Currency strip */}
      <div className="st-section">
        <div className="st-label">CURRENCIES</div>
        <div className="st-strip">
          {currencies.map(m => <MiniCard key={m.id} market={m} data={data} />)}
        </div>
      </div>

      {/* India + World split */}
      <div className="st-split">

        {/* India 2×2 */}
        <div className="st-india-panel">
          <div className="st-label">INDIA</div>
          <div className="st-india-grid">
            {india.map(m => <GridCard key={m.id} market={m} data={data} nseData={nseData} />)}
          </div>
        </div>

        {/* World 4×2 */}
        <div className="st-world-panel">
          <div className="st-label">WORLD</div>
          <div className="st-world-grid">
            {world.map(m => <GridCard key={m.id} market={m} data={data} nseData={nseData} />)}
          </div>
        </div>

      </div>
    </div>
  );
}
