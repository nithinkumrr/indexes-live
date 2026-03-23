// src/components/GlobalPulse.jsx
// 8 key markets always visible — the heartbeat strip
import { MARKETS, GLOBAL_PULSE_IDS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';

const pulseMarkets = GLOBAL_PULSE_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);

export default function GlobalPulse({ data }) {
  return (
    <div className="pulse-strip">
      <div className="pulse-label">GLOBAL PULSE</div>
      <div className="pulse-cards">
        {pulseMarkets.map(market => {
          const d = data[market.id];
          const status = getStatus(market);
          const gain = d ? d.changePct >= 0 : null;
          const pct = d ? formatPct(d.changePct) : null;

          return (
            <div key={market.id} className={`pulse-card ${status === 'live' ? 'pulse-live' : ''}`}>
              <div className="pulse-top">
                <span className="pulse-flag">{market.flag}</span>
                <span className="pulse-name">{market.name}</span>
                {status === 'live' && <span className="pulse-dot" />}
              </div>
              <div className="pulse-price">{d ? formatPrice(d.price, market.category === 'commodity') : '—'}</div>
              {pct !== null && (
                <div className={`pulse-pct ${gain ? 'gain' : 'loss'}`}>
                  {gain ? '▲' : '▼'} {pct}
                </div>
              )}
              {market.unit && <div className="pulse-unit">{market.unit}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
