// src/components/MarketGrid.jsx
import { MARKETS } from '../data/markets';
import { getStatus } from '../utils/timezone';
import MarketCard from './MarketCard';

export default function MarketGrid({ data }) {
  const sorted = [...MARKETS]
    .filter(m => !m.hero)
    .sort((a, b) => {
      const order = { live: 0, pre: 1, closed: 2 };
      return (order[getStatus(a)] ?? 2) - (order[getStatus(b)] ?? 2);
    });

  const live = sorted.filter(m => getStatus(m) === 'live').length;
  const pre = sorted.filter(m => getStatus(m) === 'pre').length;
  const closed = sorted.filter(m => getStatus(m) === 'closed').length;

  return (
    <section className="grid-section">
      <div className="grid-stats">
        <div className="grid-stat">
          <span className="grid-stat-dot dot-live" />
          <span className="grid-stat-num">{live}</span>
          <span className="grid-stat-label">LIVE</span>
        </div>
        <div className="grid-stat">
          <span className="grid-stat-dot dot-pre" />
          <span className="grid-stat-num">{pre}</span>
          <span className="grid-stat-label">PRE-OPEN</span>
        </div>
        <div className="grid-stat">
          <span className="grid-stat-dot dot-off" />
          <span className="grid-stat-num">{closed}</span>
          <span className="grid-stat-label">CLOSED</span>
        </div>
        <div className="grid-total">{sorted.length} MARKETS TRACKED</div>
      </div>
      <div className="mcard-grid">
        {sorted.map((market, i) => (
          <MarketCard
            key={market.id}
            market={market}
            d={data[market.id]}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
