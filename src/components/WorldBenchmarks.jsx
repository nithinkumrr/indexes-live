// src/components/WorldBenchmarks.jsx
// S&P 500 · Nasdaq · Nikkei · FTSE · DAX · Shanghai · VIX · US 10Y
import { MARKETS, WORLD_BENCHMARK_IDS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';

const REGION_HOME_IDS = {
  INDIA:    ['nifty50', 'sensex', 'banknifty', 'giftnifty'],
  US:       ['sp500', 'nasdaq', 'dowjones', 'russell'],
  EUROPE:   ['ftse', 'dax', 'cac40', 'stoxx50'],
  JAPAN:    ['nikkei'],
  CHINA:    ['shanghai', 'hangseng'],
  ASIA:     ['nifty50', 'nikkei', 'hangseng', 'asx200'],
  AMERICAS: ['sp500', 'nasdaq', 'bovespa', 'tsx'],
  MEA:      ['tadawul', 'dfm'],
  GLOBAL:   [],
};

function formatBenchmarkPrice(value, id) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (id === 'vix' || id === 'us10y') return value.toFixed(2);
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1000)  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// VIX: higher = more fear, so "up" is bad. Show red when rising.
function getVIXSentiment(id, gain) {
  if (id === 'vix') return !gain; // inverted — rising VIX = bad
  return gain;
}

export default function WorldBenchmarks({ data, region }) {
  const homeIds = REGION_HOME_IDS[region] || [];

  const benchmarks = WORLD_BENCHMARK_IDS
    .map(id => MARKETS.find(m => m.id === id))
    .filter(Boolean);

  return (
    <div className="wb-section">
      <div className="wb-header">
        <span className="wb-title">WORLD BENCHMARKS</span>
      </div>
      <div className="wb-grid">
        {benchmarks.map(market => {
          const d      = data[market.id];
          const status = getStatus(market);
          const rawGain = d ? d.changePct >= 0 : true;
          const displayGain = getVIXSentiment(market.id, rawGain);
          const isHome = homeIds.includes(market.id);
          const isVIX  = market.id === 'vix';

          return (
            <div key={market.id} className={`wb-card ${status === 'live' ? 'wb-live' : ''} ${isHome ? 'wb-home' : ''} ${isVIX ? 'wb-vix' : ''}`}>
              <div className="wb-top">
                <span className="wb-flag">{market.flag}</span>
                <div className="wb-info">
                  <span className="wb-name">{market.name}</span>
                  <span className="wb-exch">{market.exchange}</span>
                </div>
                {status === 'live' && <span className="wb-dot" />}
              </div>
              <div className="wb-price">
                {d ? formatBenchmarkPrice(d.price, market.id) : '—'}
                {market.unit && <span className="wb-unit"> {market.unit}</span>}
              </div>
              {d && (
                <div className={`wb-pct ${displayGain ? 'gain' : 'loss'}`}>
                  {rawGain ? '▲' : '▼'} {formatPct(d.changePct)}
                  {isVIX && <span className="wb-vix-label">{rawGain ? ' FEAR↑' : ' CALM↓'}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
