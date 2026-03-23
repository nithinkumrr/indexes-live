// src/components/HeroSection.jsx
// Geo-detected hero — 4 big cards based on visitor's region
import { useMemo } from 'react';
import { MARKETS, HERO_BY_REGION, COMMODITY_STRIP_IDS, detectRegion } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus, getLocalTime } from '../utils/timezone';
import Sparkline from './Sparkline';

const REGION_LABELS = {
  INDIA: { flag: '🇮🇳', label: 'INDIA', note: 'Primary market · INR' },
  US: { flag: '🇺🇸', label: 'UNITED STATES', note: 'Primary market · USD' },
  EUROPE: { flag: '🇪🇺', label: 'EUROPE', note: 'Major European indices' },
  JAPAN: { flag: '🇯🇵', label: 'JAPAN + GLOBAL', note: 'TSE · NYSE · LSE' },
  CHINA: { flag: '🇨🇳', label: 'GREATER CHINA', note: 'SSE · HKEX' },
  ASIA: { flag: '🌏', label: 'ASIA PACIFIC', note: 'Regional benchmarks' },
  AMERICAS: { flag: '🌎', label: 'AMERICAS', note: 'NYSE · NASDAQ · B3' },
  MEA: { flag: '🌍', label: 'MIDDLE EAST & AFRICA', note: 'Regional benchmarks' },
  GLOBAL: { flag: '🌐', label: 'GLOBAL', note: 'World benchmarks' },
};

export default function HeroSection({ data }) {
  const region = useMemo(() => detectRegion(), []);
  const heroIds = HERO_BY_REGION[region] || HERO_BY_REGION.GLOBAL;
  const heroMarkets = heroIds.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const rl = REGION_LABELS[region] || REGION_LABELS.GLOBAL;

  return (
    <>
      <section className="hero-section">
        <div className="hero-header">
          <div className="hero-badge">
            <span className="hero-flag">{rl.flag}</span>
            {rl.label}
          </div>
          <div className="hero-note">{rl.note}</div>
        </div>

        <div className="hero-cards">
          {heroMarkets.map(market => {
            const d = data[market.id];
            const status = getStatus(market);
            const gain = d ? d.changePct >= 0 : true;
            const localTime = getLocalTime(market.tz);

            return (
              <div key={market.id} className={`hero-card ${status === 'live' ? 'hero-card-live' : ''} ${market.id === 'giftnifty' ? 'hero-card-gift' : ''}`}>
                <div className="hero-card-top">
                  <div>
                    <div className="hero-exchange">{market.exchange} · {market.country}</div>
                    <div className="hero-name">
                      {market.name}
                      {market.note && <span className="hero-note-tag"> · {market.note}</span>}
                    </div>
                  </div>
                  <StatusPill status={status} />
                </div>

                <div className="hero-price">
                  {d ? formatPrice(d.price, market.category === 'commodity') : '—'}
                  {market.unit && <span className="hero-unit">{market.unit}</span>}
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
                  <span className="hero-localtime">{localTime}</span>
                  <span className="hero-prev">Prev. close: {d ? formatPrice(d.prevClose, market.category === 'commodity') : '—'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Commodity benchmark strip — always visible */}
      <div className="commodity-strip">
        {stripMarkets.map(market => {
          const d = data[market.id];
          const gain = d ? d.changePct >= 0 : true;
          return (
            <div key={market.id} className="commodity-strip-item">
              <span className="cs-flag">{market.flag}</span>
              <span className="cs-name">{market.name}</span>
              <span className="cs-price">{d ? formatPrice(d.price, true) : '—'}</span>
              <span className="cs-unit">{market.unit}</span>
              {d && (
                <span className={`cs-pct ${gain ? 'gain' : 'loss'}`}>
                  {gain ? '▲' : '▼'} {formatPct(d.changePct)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StatusPill({ status }) {
  const map = {
    live:   { label: 'LIVE',     cls: 'status-live' },
    pre:    { label: 'PRE-OPEN', cls: 'status-pre' },
    closed: { label: 'CLOSED',   cls: 'status-closed' },
  };
  const { label, cls } = map[status] || map.closed;
  return (
    <span className={`status-pill ${cls}`}>
      {status === 'live' && <span className="status-dot" />}
      {label}
    </span>
  );
}
