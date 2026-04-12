// src/components/MarketCard.jsx
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus, getLocalTime } from '../utils/timezone';
import Sparkline from './Sparkline';

const STATUS_MAP = {
  live: { label: 'LIVE', cls: 'status-live' },
  pre: { label: 'PRE', cls: 'status-pre' },
  closed: { label: 'CLOSED', cls: 'status-closed' },
};

const REGION_COLORS = {
  Asia: '#4A9EFF',
  Europe: '#A78BFA',
  Americas: '#34D399',
  MEA: '#F59E0B',
};

export default function MarketCard({ market, d, index }) {
  const status = getStatus(market);
  const gain = d ? d.changePct >= 0 : null;
  const localTime = getLocalTime(market.tz);
  const { label, cls } = STATUS_MAP[status];
  const regionColor = REGION_COLORS[market.region] || '#7A7874';

  return (
    <article
      className={`mcard ${status === 'live' ? 'mcard-live' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="mcard-top">
        <div className="mcard-left">
          <div className="mcard-flag">{market.flag}</div>
          <div>
            <div className="mcard-country">{market.country}</div>
            <div className="mcard-name">{market.name}</div>
            <div className="mcard-exchange">{market.exchange}</div>
          </div>
        </div>
        <span className={`status-pill ${cls}`}>
          {status === 'live' && <span className="status-dot" />}
          {label}
        </span>
      </div>

      {d ? (
        <>
          <div className="mcard-price">{formatPrice(d.price)}</div>
          <div className="mcard-change-row">
            <span className={gain ? 'gain' : 'loss'}>
              {gain ? '▲' : '▼'} {formatChange(d.change)}
            </span>
            <span className={`chg-pct ${gain ? 'gain-bg' : 'loss-bg'}`}>
              {formatPct(d.changePct)}
            </span>
          </div>
          <div className="mcard-spark">
            <Sparkline points={d.spark} gain={gain} width={200} height={36} />
          </div>
        </>
      ) : (
        <div className="mcard-loading">
          <div className="skel skel-price" />
          <div className="skel skel-chg" />
          <div className="skel skel-spark" />
        </div>
      )}

      <div className="mcard-footer">
        <span className="mcard-time">{localTime}</span>
        <span className="mcard-region" style={{ color: regionColor }}>{market.region}</span>
      </div>
    </article>
  );
}
