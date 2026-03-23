// src/components/MarketGrid.jsx — Equities / Commodities toggle + All/Live/Closed filter
import { useState } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus } from '../utils/timezone';
import Sparkline from './Sparkline';

const STATUS_ORDER = { live: 0, pre: 1, closed: 2 };

export default function MarketGrid({ data }) {
  const [tab, setTab]       = useState('equities'); // 'equities' | 'commodities'
  const [filter, setFilter] = useState('all');       // 'all' | 'live' | 'closed'

  const allMarkets = MARKETS
    .filter(m => tab === 'equities' ? m.category === 'index' : m.category === 'commodity')
    .map(m => ({ market: m, status: getStatus(m) }))
    .filter(({ status }) => {
      if (filter === 'live')   return status === 'live';
      if (filter === 'closed') return status === 'closed' || status === 'pre';
      return true;
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2));

  const regionGroups = tab === 'equities'
    ? ['Asia', 'Europe', 'Americas', 'MEA']
    : ['Commodity'];

  return (
    <section className="grid-section">
      {/* Top bar: toggle left, filter right */}
      <div className="grid-topbar">
        <div className="grid-toggle">
          <button
            className={`toggle-btn ${tab === 'equities' ? 'toggle-active' : ''}`}
            onClick={() => setTab('equities')}
          >
            📊 Equities
          </button>
          <button
            className={`toggle-btn ${tab === 'commodities' ? 'toggle-active' : ''}`}
            onClick={() => setTab('commodities')}
          >
            ⛏️ Commodities
          </button>
        </div>

        <div className="grid-filters">
          {['all','live','closed'].map(f => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'filter-active' : ''} ${f === 'live' ? 'filter-live-btn' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'live' && <span className="filter-dot" />}
              {f === 'all' ? 'All' : f === 'live' ? 'Live' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      {regionGroups.map(region => {
        const regionMarkets = allMarkets.filter(({ market }) => market.region === region);
        if (!regionMarkets.length) return null;
        return (
          <div key={region} className="grid-region">
            <div className="grid-region-label">{region.toUpperCase()}</div>
            <div className="market-grid">
              {regionMarkets.map(({ market, status }) => {
                const d    = data[market.id];
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
                      <span className={`mc-abs ${gain ? 'gain' : 'loss'}`}>{d ? formatChange(d.change) : ''}</span>
                      <span className={`mc-pct ${gain ? 'gain' : 'loss'}`}>{d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : '—'}</span>
                    </div>
                    {d && <div className="mc-spark"><Sparkline points={d.spark} gain={gain} width={120} height={32} /></div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {allMarkets.length === 0 && (
        <div className="grid-empty">No {filter === 'live' ? 'live' : 'closed'} markets right now.</div>
      )}
    </section>
  );
}

function StatusChip({ status }) {
  const map = { live: { label: 'LIVE', cls: 'chip-live' }, pre: { label: 'PRE', cls: 'chip-pre' }, closed: { label: 'CLSD', cls: 'chip-closed' } };
  const { label, cls } = map[status] || map.closed;
  return <span className={`status-chip ${cls}`}>{status === 'live' && <span className="chip-dot" />}{label}</span>;
}
