// src/components/CurrencyStrip.jsx
// Single row: CURRENCIES | divider | CRYPTO — no separate rows
import { MARKETS, CURRENCY_STRIP_IDS, CRYPTO_IDS } from '../data/markets';
import { formatPct } from '../utils/format';

function fmtFX(value, id) {
  if (value == null || isNaN(value)) return '—';
  if (id === 'dxy' || id === 'usdinr') return value.toFixed(2);
  if (value >= 100) return value.toFixed(2);
  if (value >= 1)   return value.toFixed(3);
  return value.toFixed(4);
}

function fmtCrypto(value) {
  if (value == null || isNaN(value)) return '—';
  if (value >= 10000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 100)   return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return value.toFixed(2);
}

function Item({ market, data, isCrypto }) {
  const d    = data[market.id];
  const gain = d ? d.changePct >= 0 : true;
  const usdBase     = ['usdinr', 'usdjpy', 'usdcny'].includes(market.id);
  const displayGain = usdBase ? !gain : gain;
  const price = d ? (isCrypto ? fmtCrypto(d.price) : fmtFX(d.price, market.id)) : '—';

  return (
    <div className="fxrow-item">
      <div className="fxrow-top">
        <span className="fxrow-flag">{market.flag}</span>
        <span className="fxrow-name">{market.name}</span>
      </div>
      <div className="fxrow-price">
        {price}<span className="fxrow-unit">{market.unit}</span>
      </div>
      {d && (
        <div className={`fxrow-pct ${displayGain ? 'gain' : 'loss'}`}>
          {gain ? '▲' : '▼'} {formatPct(d.changePct)}
        </div>
      )}
    </div>
  );
}

export default function FxCryptoStrip({ data }) {
  const fxMarkets     = CURRENCY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const cryptoMarkets = CRYPTO_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

  return (
    <div className="fxrow-strip">
      {/* CURRENCIES label */}
      <div className="fxrow-section-label">CURRENCIES</div>

      {fxMarkets.map(m => <Item key={m.id} market={m} data={data} isCrypto={false} />)}

      {/* Visual divider */}
      <div className="fxrow-divider" />

      {/* CRYPTO label */}
      <div className="fxrow-section-label fxrow-crypto-label">CRYPTO</div>

      {cryptoMarkets.map(m => <Item key={m.id} market={m} data={data} isCrypto={true} />)}
    </div>
  );
}
