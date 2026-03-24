import { useState } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus, getMarketHoursLabel } from '../utils/timezone';
import Sparkline from './Sparkline';
import HoursTooltip from './HoursTooltip';

const STATUS_ORDER = { live: 0, pre: 1, closed: 2 };
const PAIRED_REGIONS = [['Europe', 'Americas']];
const SOLO_REGIONS   = ['Asia'];
const SOLO_BOTTOM    = ['MEA'];
const COMMODITY_REGIONS = ['Commodity'];
const PANEL_COLS = { Asia: 6, Europe: 4, Americas: 3, MEA: 4, Commodity: 4 };

export default function MarketGrid({ data }) {
  const [tab, setTab]       = useState('equities');
  const [filter, setFilter] = useState('all');

  const allMarkets = MARKETS
    .filter(m => tab === 'equities' ? m.category === 'index' : m.category === 'commodity')
    .map(m => ({ market: m, status: getStatus(m) }))
    .filter(({ status }) => {
      if (filter === 'live')   return status === 'live';
      if (filter === 'closed') return status === 'closed' || status === 'pre';
      return true;
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2));

  const soloRegions   = tab === 'equities' ? SOLO_REGIONS : COMMODITY_REGIONS;
  const bottomRegions = tab === 'equities' ? SOLO_BOTTOM : [];
  const pairedRows    = tab === 'equities' ? PAIRED_REGIONS : [];

  const renderCard = ({ market, status }) => {
    const d    = data[market.id];
    const gain = d ? d.changePct >= 0 : true;
    const hrs  = getMarketHoursLabel(market);
    return (
      <HoursTooltip key={market.id} local={hrs.local} ist={hrs.ist}
        className={`market-card ${status === 'live' ? 'market-card-live' : ''}`} data-market-id={market.id}>
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
        {d && <div className="mc-spark"><Sparkline points={d.spark} gain={gain} height={32} /></div>}
      </HoursTooltip>
    );
  };

  const renderRegion = (region) => {
    const regionMarkets = allMarkets.filter(({ market }) => market.region === region);
    if (!regionMarkets.length) return null;
    const cols = PANEL_COLS[region] || 4;
    return (
      <div key={region} className="grid-region">
        <div className="grid-region-label">{region.toUpperCase()}</div>
        <div className={`market-grid grid-cols-${cols}`}>
          {regionMarkets.map(renderCard)}
        </div>
      </div>
    );
  };

  return (
    <section className="grid-section">
      <div className="grid-topbar">
        <div className="grid-toggle">
          <button className={`toggle-btn ${tab === 'equities' ? 'toggle-active' : ''}`} onClick={() => setTab('equities')}>
            📊 Equities
          </button>
          <button className={`toggle-btn ${tab === 'commodities' ? 'toggle-active' : ''}`} onClick={() => setTab('commodities')}>
            ⛏️ Commodities
          </button>
        </div>
        <div className="grid-filters">
          {['all','live','closed'].map(f => (
            <button key={f} className={`filter-pill ${filter === f ? 'filter-active' : ''} ${f === 'live' ? 'filter-live-btn' : ''}`} onClick={() => setFilter(f)}>
              {f === 'live' && <span className="filter-dot" />}
              {f === 'all' ? 'All' : f === 'live' ? 'Live' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      {soloRegions.map(renderRegion)}

      {pairedRows.map(pair => {
        const hasPair = pair.some(r => allMarkets.some(({ market }) => market.region === r));
        if (!hasPair) return null;
        return (
          <div key={pair.join('-')} className="grid-paired-row">
            {pair.map(region => {
              const regionMarkets = allMarkets.filter(({ market }) => market.region === region);
              if (!regionMarkets.length) return null;
              const cols = PANEL_COLS[region] || 4;
              return (
                <div key={region} className="grid-paired-panel">
                  <div className="grid-region-label">{region.toUpperCase()}</div>
                  <div className={`market-grid grid-cols-${cols}`}>
                    {regionMarkets.map(renderCard)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {allMarkets.length === 0 && (
        <div className="grid-empty">No {filter === 'live' ? 'live' : 'closed'} markets right now.</div>
      )}

      {bottomRegions.map(renderRegion)}
    </section>
  );
}

function StatusChip({ status }) {
  const map = { live: { label: 'LIVE', cls: 'chip-live' }, pre: { label: 'PRE', cls: 'chip-pre' }, closed: { label: 'CLSD', cls: 'chip-closed' } };
  const { label, cls } = map[status] || map.closed;
  return <span className={`status-chip ${cls}`}>{status === 'live' && <span className="chip-dot" />}{label}</span>;
}
