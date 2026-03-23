// src/components/CurrencyStrip.jsx — equal-width items, full stretch, sparklines
import { MARKETS, CURRENCY_STRIP_IDS, CRYPTO_IDS } from '../data/markets';
import { formatPct } from '../utils/format';
import Sparkline from './Sparkline';

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
        {price}<span className="fxrow-unit"> {market.unit}</span>
      </div>
      <div className="fxrow-bottom">
        {d && (
          <span className={`fxrow-pct ${displayGain ? 'gain' : 'loss'}`}>
            {gain ? '▲' : '▼'} {formatPct(d.changePct)}
          </span>
        )}
        {d?.spark && (
          <Sparkline points={d.spark} gain={displayGain} width={56} height={18} />
        )}
      </div>
    </div>
  );
}

export default function FxCryptoStrip({ data }) {
  const fxMarkets     = CURRENCY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const cryptoMarkets = CRYPTO_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

  return (
    <div className="fxrow-strip">
      {/* CURRENCIES */}
      <div className="fxrow-section-label">CURRENCIES</div>
      <div className="fxrow-group">
        {fxMarkets.map(m => <Item key={m.id} market={m} data={data} isCrypto={false} />)}
      </div>

      {/* Divider */}
      <div className="fxrow-divider" />

      {/* CRYPTO */}
      <div className="fxrow-section-label fxrow-crypto-label">CRYPTO</div>
      <div className="fxrow-group fxrow-group-crypto">
        {cryptoMarkets.map(m => <Item key={m.id} market={m} data={data} isCrypto={true} />)}
      </div>
    </div>
  );
}
