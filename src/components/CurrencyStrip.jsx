// src/components/CurrencyStrip.jsx
import { MARKETS, CURRENCY_STRIP_IDS } from '../data/markets';
import { formatPct } from '../utils/format';

function formatCurrencyPrice(value, id) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (id === 'btcusd') return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (id === 'usdinr')  return value.toFixed(2);
  if (id === 'dxy')     return value.toFixed(2);
  if (value >= 100)     return value.toFixed(2);
  if (value >= 1)       return value.toFixed(3);
  return value.toFixed(4);
}

const currencyMarkets = CURRENCY_STRIP_IDS
  .map(id => MARKETS.find(m => m.id === id))
  .filter(Boolean);

export default function CurrencyStrip({ data }) {
  return (
    <div className="currency-strip">
      <div className="currency-strip-label">FX &amp; CRYPTO</div>
      <div className="currency-strip-items">
        {currencyMarkets.map(market => {
          const d    = data[market.id];
          const gain = d ? d.changePct >= 0 : true;
          // For USD/INR and USD/JPY and USD/CNY, higher = weaker local = bad for local
          const isUSDBase = ['usdinr','usdjpy','usdcny'].includes(market.id);
          const displayGain = isUSDBase ? !gain : gain;

          return (
            <div key={market.id} className="cs2-item">
              <div className="cs2-top">
                <span className="cs2-flag">{market.flag}</span>
                <span className="cs2-name">{market.name}</span>
              </div>
              <div className="cs2-price">
                {d ? formatCurrencyPrice(d.price, market.id) : '—'}
                <span className="cs2-unit">{market.unit}</span>
              </div>
              {d && (
                <div className={`cs2-pct ${displayGain ? 'gain' : 'loss'}`}>
                  {gain ? '▲' : '▼'} {formatPct(d.changePct)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
