import { MARKETS, COMMODITY_STRIP_IDS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';
import FxCryptoStrip from './CurrencyStrip';

const INDIA_IDS = ['nifty50', 'sensex', 'banknifty', 'giftnifty'];
const WORLD_IDS = ['sp500', 'nasdaq', 'dowjones', 'ftse', 'dax', 'nikkei', 'hangseng', 'shanghai'];

function fmtPrice(value, id) {
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
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const india        = INDIA_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const world        = WORLD_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

  return (
    <div className="st-wrap">

      {/* Exact same commodity strip as Markets page */}
      <div className="commodity-strip">
        <div className="commodity-strip-label">COMMODITY</div>
        {stripMarkets.map(market => {
          const d = data[market.id];
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

      {/* Exact same FX + Crypto strip as Markets page */}
      <FxCryptoStrip data={data} />

      {/* India 2×2 + World 4×2 */}
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
