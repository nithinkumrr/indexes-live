// src/components/HeroIndia.jsx
import { MARKETS } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus, getLocalTime } from '../utils/timezone';
import Sparkline from './Sparkline';

export default function HeroIndia({ data }) {
  const heroMarkets = MARKETS.filter(m => m.hero);

  return (
    <section className="hero-section">
      <div className="hero-header">
        <div className="hero-badge">
          <span className="hero-flag">🇮🇳</span>
          INDIA
        </div>
        <div className="hero-note">Primary market · All prices in INR</div>
      </div>
      <div className="hero-cards">
        {heroMarkets.map(market => {
          const d = data[market.id];
          const status = getStatus(market);
          const gain = d ? d.changePct >= 0 : true;
          const localTime = getLocalTime(market.tz);

          return (
            <div key={market.id} className={`hero-card ${status === 'live' ? 'hero-card-live' : ''}`}>
              <div className="hero-card-top">
                <div>
                  <div className="hero-exchange">{market.exchange} · {market.country}</div>
                  <div className="hero-name">{market.name}</div>
                </div>
                <StatusPill status={status} />
              </div>

              <div className="hero-price">
                {d ? formatPrice(d.price) : '—'}
              </div>

              <div className="hero-changes">
                <span className={`hero-abs ${gain ? 'gain' : 'loss'}`}>
                  {d ? formatChange(d.change) : '—'}
                </span>
                <span className={`hero-pct-badge ${gain ? 'gain-bg' : 'loss-bg'}`}>
                  {d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : '—'}
                </span>
              </div>

              <div className="hero-spark">
                {d && <Sparkline points={d.spark} gain={gain} width={220} height={48} />}
              </div>

              <div className="hero-footer">
                <span className="hero-localtime">IST {localTime}</span>
                <span className="hero-prev">Prev. close: {d ? formatPrice(d.prevClose) : '—'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusPill({ status }) {
  const map = {
    live: { label: 'LIVE', cls: 'status-live' },
    pre: { label: 'PRE-OPEN', cls: 'status-pre' },
    closed: { label: 'CLOSED', cls: 'status-closed' },
  };
  const { label, cls } = map[status] || map.closed;
  return (
    <span className={`status-pill ${cls}`}>
      {status === 'live' && <span className="status-dot" />}
      {label}
    </span>
  );
}
