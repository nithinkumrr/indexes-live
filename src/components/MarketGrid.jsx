// src/components/MarketGrid.jsx — Markets + Commodities tabbed grid
import { useState } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';

const STATUS_ORDER = { live: 0, pre: 1, closed: 2 };

export default function MarketGrid({ data }) {
  const [tab, setTab] = useState('markets'); // 'markets' | 'commodities'

  const markets = MARKETS
    .filter(m => tab === 'markets' ? m.category === 'index' : m.category === 'commodity')
    .map(m => ({ market: m, status: getStatus(m) }))
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2));

  const regionGroups = tab === 'markets'
    ? ['Asia', 'Europe', 'Americas', 'MEA']
    : ['Commodity'];

  return (
    <section className="grid-section">
      <div className="grid-tabs">
        <button
          className={`grid-tab ${tab === 'markets' ? 'grid-tab-active' : ''}`}
          onClick={() => setTab('markets')}
        >
          📈 Markets
        </button>
        <button
          className={`grid-tab ${tab === 'commodities' ? 'grid-tab-active' : ''}`}
          onClick={() => setTab('commodities')}
        >
          🛢️ Commodities
        </button>
      </div>

      {regionGroups.map(region => {
        const regionMarkets = markets.filter(({ market }) => market.region === region);
        if (!regionMarkets.length) return null;
        return (
          <div key={region} className="grid-region">
            <div className="grid-region-label">{region.toUpperCase()}</div>
            <div className="market-grid">
              {regionMarkets.map(({ market, status }) => {
                const d = data[market.id];
                const gain = d ? d.changePct >= 0 : true;
                return (
                  <div key={market.id} className={`market-card ${status === 'live' ? 'market-card-live' : ''}`}>
                    <div className="mc-top">
                      <div className="mc-left">
                        <span className="mc-flag">{market.flag}</span>
                        <div>
                          <div className="mc-name">{market.name}</div>
                          <div className="mc-exchange">{market.exchange}</div>
                        </div>
                      </div>
                      <StatusChip status={status} />
                    </div>
                    <div className="mc-price">
                      {d ? formatPrice(d.price, market.category === 'commodity') : '—'}
                      {market.unit && <span className="mc-unit">{market.unit}</span>}
                    </div>
                    <div className="mc-changes">
                      <span className={`mc-abs ${gain ? 'gain' : 'loss'}`}>
                        {d ? formatChange(d.change) : ''}
                      </span>
                      <span className={`mc-pct ${gain ? 'gain' : 'loss'}`}>
                        {d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : '—'}
                      </span>
                    </div>
                    {d && (
                      <div className="mc-spark">
                        <Sparkline points={d.spark} gain={gain} width={120} height={32} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function StatusChip({ status }) {
  const map = {
    live:   { label: 'LIVE',  cls: 'chip-live' },
    pre:    { label: 'PRE',   cls: 'chip-pre' },
    closed: { label: 'CLSD',  cls: 'chip-closed' },
  };
  const { label, cls } = map[status] || map.closed;
  return (
    <span className={`status-chip ${cls}`}>
      {status === 'live' && <span className="chip-dot" />}
      {label}
    </span>
  );
}
