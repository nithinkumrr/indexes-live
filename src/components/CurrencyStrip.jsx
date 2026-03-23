// src/components/CurrencyStrip.jsx — Currencies only, no crypto
import { MARKETS, CURRENCY_STRIP_IDS, CRYPTO_IDS } from '../data/markets';
import { formatPct } from '../utils/format';

function fmtFX(value, id) {
  if (value == null || isNaN(value)) return '—';
  if (id === 'dxy')    return value.toFixed(2);
  if (id === 'usdinr') return value.toFixed(2);
  if (value >= 100)    return value.toFixed(2);
  if (value >= 1)      return value.toFixed(3);
  return value.toFixed(4);
}

function fmtCrypto(value) {
  if (value == null || isNaN(value)) return '—';
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100)   return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

function Strip({ ids, label, data, isCrypto }) {
  const items = ids.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  return (
    <div className="fx-strip">
      <div className="fx-strip-label">{label}</div>
      <div className="fx-strip-items">
        {items.map(market => {
          const d    = data[market.id];
          const gain = d ? d.changePct >= 0 : true;
          // USD/INR, USD/JPY, USD/CNY: rising = weaker local = show red
          const usdBase = ['usdinr','usdjpy','usdcny'].includes(market.id);
          const displayGain = usdBase ? !gain : gain;

          return (
            <div key={market.id} className="fx-item">
              <div className="fx-top">
                <span className="fx-flag">{market.flag}</span>
                <span className="fx-name">{market.name}</span>
              </div>
              <div className="fx-price">
                {d ? (isCrypto ? fmtCrypto(d.price) : fmtFX(d.price, market.id)) : '—'}
                <span className="fx-unit">{market.unit}</span>
              </div>
              {d && (
                <div className={`fx-pct ${displayGain ? 'gain' : 'loss'}`}>
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

export default function CurrencyAndCrypto({ data }) {
  return (
    <>
      <Strip ids={CURRENCY_STRIP_IDS} label="CURRENCIES" data={data} isCrypto={false} />
      <Strip ids={CRYPTO_IDS}         label="CRYPTO"     data={data} isCrypto={true}  />
    </>
  );
}
