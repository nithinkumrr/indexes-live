// src/components/Ticker.jsx
import { MARKETS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';

export default function Ticker({ data }) {
  // Build ticker items — show all markets that have data
  const items = MARKETS.filter(m => data[m.id]).map(m => {
    const d = data[m.id];
    const gain = d.changePct >= 0;
    return (
      <span key={m.id} className="ticker-item">
        <span className="ticker-name">{m.name}</span>
        <span className="ticker-price">{formatPrice(d.price)}</span>
        <span className={`ticker-chg ${gain ? 'gain' : 'loss'}`}>
          {gain ? '▲' : '▼'} {formatPct(d.changePct)}
        </span>
      </span>
    );
  });

  if (items.length === 0) return null;

  // Duplicate for seamless loop
  return (
    <div className="ticker-wrap" title="Hover to pause">
      <div className="ticker-inner">
        {items}
        {items.map((item, i) => (
          <span key={`dup-${i}`} aria-hidden="true">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
