// src/components/HeroSection.jsx
// NSE countdown is inline with the INDIA header — saves vertical space
import { useState, useEffect } from 'react';
import { MARKETS, HERO_BY_REGION, COMMODITY_STRIP_IDS } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus, getLocalTime, getIndiaMarketStatus, formatDuration, getMarketHoursLabel } from '../utils/timezone';
import Sparkline from './Sparkline';
import FxCryptoStrip from './CurrencyStrip';
import HoursTooltip from './HoursTooltip';

const REGION_META = {
  INDIA:    { flag: '🇮🇳', label: 'INDIA',               note: 'NSE · BSE · NSE IFSC' },
  US:       { flag: '🇺🇸', label: 'UNITED STATES',       note: 'NYSE · NASDAQ' },
  EUROPE:   { flag: '🇪🇺', label: 'EUROPE',              note: 'LSE · XETRA · Euronext' },
  JAPAN:    { flag: '🇯🇵', label: 'JAPAN',               note: 'TSE' },
  CHINA:    { flag: '🇨🇳', label: 'GREATER CHINA',       note: 'SSE · HKEX' },
  ASIA:     { flag: '🌏',  label: 'ASIA PACIFIC',        note: 'Regional benchmarks' },
  AMERICAS: { flag: '🌎',  label: 'AMERICAS',            note: 'NYSE · NASDAQ · B3' },
  MEA:      { flag: '🌍',  label: 'MIDDLE EAST & AFRICA',note: 'Tadawul · DFM · JSE' },
  GLOBAL:   { flag: '🌐',  label: 'GLOBAL TOP 4',        note: 'World benchmarks' },
};

// Inline countdown — just the number + status, no full row
function InlineCountdown() {
  const [s, setS] = useState(() => getIndiaMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setS(getIndiaMarketStatus()), 1000);
    return () => clearInterval(id);
  }, []);
  const secs    = Math.max(0, Math.floor(s.secondsLeft));
  const display = formatDuration(secs);
  const isOpen  = s.status === 'open';
  const isPre   = s.status === 'pre';
  return (
    <div className={`inline-countdown ${isOpen ? 'ic-open' : isPre ? 'ic-pre' : 'ic-closed'}`}>
      {isOpen && <span className="live-pulse" style={{ marginRight: 6 }} />}
      <span className="ic-label">
        {isOpen ? 'LIVE' : isPre ? 'PRE-OPEN' : s.status === 'weekend' ? 'WEEKEND' : 'OPENS IN'}
      </span>
      <span className="ic-time">{display}</span>
      {!isOpen && <span className="ic-sub">{isPre ? '· 09:15 IST' : '· 09:15 IST Mon–Fri'}</span>}
    </div>
  );
}

export default function HeroSection({ data, region }) {
  const heroIds     = HERO_BY_REGION[region] || HERO_BY_REGION.GLOBAL;
  const heroMarkets = heroIds.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const stripMarkets = COMMODITY_STRIP_IDS.map(id => MARKETS.find(m => m.id === id)).filter(Boolean);
  const meta    = REGION_META[region] || REGION_META.GLOBAL;
  const isIndia = region === 'INDIA';

  return (
    <div className="hero-wrapper">
      <section className="hero-section">
        {/* Header row: flag + label + inline countdown on right */}
        <div className="hero-header">
          <div className="hero-badge">
            <span className="hero-flag">{meta.flag}</span>
            {meta.label}
            <span className="hero-exch-note">{meta.note}</span>
          </div>
          {isIndia && <InlineCountdown />}
        </div>

        <div className="hero-cards">
          {heroMarkets.map(market => {
            const d      = data[market.id];
            const status = getStatus(market);
            const gain   = d ? d.changePct >= 0 : true;
            const hrs    = getMarketHoursLabel(market);
            const now    = new Date();
            const istMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
            const showPreMarket = market.id === 'giftnifty' && (istMin < 9*60+15 || istMin > 15*60+30);
            return (
              <HoursTooltip key={market.id} local={hrs.local} ist={hrs.ist}
                className={`hero-card ${status === 'live' ? 'hero-card-live' : ''} ${market.giftCard ? 'hero-card-gift' : ''}`} data-market-id={market.id}>
                <div className="hero-card-top">
                  <div>
                    <div className="hero-exchange">{market.exchange} · {market.country}</div>
                    <div className="hero-name">
                      {market.name}
                      {showPreMarket && <span className="hero-note-tag"> · {market.note}</span>}
                      {market.note && market.id !== 'giftnifty' && <span className="hero-note-tag"> · {market.note}</span>}
                    </div>
                  </div>
                  <StatusPill status={status} />
                </div>
                <div className="hero-price">
                  {d ? formatPrice(d.price, market.category === 'commodity') : '—'}
                  {market.unit && <span className="hero-unit">{market.unit}</span>}
                </div>
                <div className="hero-changes">
                  <span className={`hero-abs ${gain ? 'gain' : 'loss'}`}>{d ? formatChange(d.change) : '—'}</span>
                  <span className={`hero-pct-badge ${gain ? 'gain-bg' : 'loss-bg'}`}>
                    {d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : '—'}
                  </span>
                </div>
                <div className="hero-spark">
                  {d && <Sparkline points={d.spark} gain={gain} height={60} />}
                </div>
                <div className="hero-footer">
                  <span className="hero-localtime">{getLocalTime(market.tz)}</span>
                  <span className="hero-prev">Prev. close: {d ? formatPrice(d.prevClose, market.category === 'commodity') : '—'}</span>
                </div>
              </HoursTooltip>
            );
          })}
        </div>
      </section>

      {/* Commodity strip */}
      <div className="commodity-strip">
        <div className="commodity-strip-label">COMMODITY</div>
        {stripMarkets.map(market => {
          const d = data[market.id]; const gain = d ? d.changePct >= 0 : true;
          return (
            <div key={market.id} className="commodity-strip-item">
              <span className="cs-flag">{market.flag}</span>
              <span className="cs-name">{market.name}</span>
              <span className="cs-price">{d ? formatPrice(d.price, true) : '—'}</span>
              <span className="cs-unit">{market.unit}</span>
              {d && <span className={`cs-pct ${gain ? 'gain' : 'loss'}`}>{gain ? '▲' : '▼'} {formatPct(d.changePct)}</span>}
            </div>
          );
        })}
      </div>

      {/* Single FX + Crypto row */}
      <FxCryptoStrip data={data} />
    </div>
  );
}

function StatusPill({ status }) {
  const map = { live: { label: 'LIVE', cls: 'status-live' }, pre: { label: 'PRE-OPEN', cls: 'status-pre' }, closed: { label: 'CLOSED', cls: 'status-closed' } };
  const { label, cls } = map[status] || map.closed;
  return <span className={`status-pill ${cls}`}>{status === 'live' && <span className="status-dot" />}{label}</span>;
}
