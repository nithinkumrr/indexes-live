// src/components/HeroSection.jsx
import { useState, useEffect } from 'react';
import { MARKETS, HERO_BY_REGION, COMMODITY_STRIP_IDS } from '../data/markets';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import { getStatus, getLocalTime, getIndiaMarketStatus, formatDuration } from '../utils/timezone';
import Sparkline from './Sparkline';
import CurrencyStrip from './CurrencyStrip';

const REGION_META = {
  INDIA:    { flag: '🇮🇳', label: 'INDIA',               note: 'NSE · BSE · NSE IFSC' },
  US:       { flag: '🇺🇸', label: 'UNITED STATES',       note: 'NYSE · NASDAQ' },
  EUROPE:   { flag: '🇪🇺', label: 'EUROPE',              note: 'LSE · XETRA · Euronext' },
  JAPAN:    { flag: '🇯🇵', label: 'JAPAN',               note: 'TSE · Osaka' },
  CHINA:    { flag: '🇨🇳', label: 'GREATER CHINA',       note: 'SSE · HKEX' },
  ASIA:     { flag: '🌏',  label: 'ASIA PACIFIC',        note: 'Regional benchmarks' },
  AMERICAS: { flag: '🌎',  label: 'AMERICAS',            note: 'NYSE · NASDAQ · B3' },
  MEA:      { flag: '🌍',  label: 'MIDDLE EAST & AFRICA',note: 'Tadawul · DFM · JSE' },
  GLOBAL:   { flag: '🌐',  label: 'GLOBAL TOP 4',        note: 'World benchmarks' },
};

function NSECountdown() {
  const [status, setStatus] = useState(() => getIndiaMarketStatus());
  useEffect(() => {
    const id = setInterval(() => setStatus(getIndiaMarketStatus()), 1000);
    return () => clearInterval(id);
  }, []);

  const secs     = Math.max(0, Math.floor(status.secondsLeft));
  const display  = formatDuration(secs);
  const isOpen   = status.status === 'open';
  const isPre    = status.status === 'pre';
  const progress = status.secsTotal ? Math.max(0, Math.min(1, 1 - secs / status.secsTotal)) : 0;

  return (
    <div className={`nse-bar ${isOpen ? 'nse-open' : isPre ? 'nse-pre' : 'nse-closed'}`}>
      <div className="nse-bar-left">
        {isOpen && <span className="live-pulse" style={{ marginRight: 8 }} />}
        <span className="nse-label">
          {isOpen ? 'NSE LIVE' : isPre ? 'PRE-OPEN' : status.status === 'weekend' ? 'WEEKEND' : 'NEXT OPEN'}
        </span>
        <span className="nse-time">{display}</span>
        <span className="nse-sub">
          {isOpen ? 'Closes 15:30 IST' : isPre ? 'Opens at 09:15 IST' : 'Opens 09:15 IST Mon–Fri'}
        </span>
      </div>
      {isOpen && (
        <div className="nse-progress">
          <span className="nse-prog-label">09:15</span>
          <div className="nse-prog-track">
            <div className="nse-prog-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="nse-prog-label">15:30</span>
        </div>
      )}
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
      {isIndia && <NSECountdown />}

      <section className="hero-section">
        <div className="hero-header">
          <div className="hero-badge">
            <span className="hero-flag">{meta.flag}</span>
            {meta.label}
          </div>
          <div className="hero-note">{meta.note}</div>
        </div>

        <div className="hero-cards">
          {heroMarkets.map(market => {
            const d      = data[market.id];
            const status = getStatus(market);
            const gain   = d ? d.changePct >= 0 : true;
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

      {/* Commodity strip — Gold · Silver · Crude · Nat Gas · Copper */}
      <div className="commodity-strip">
        {stripMarkets.map(market => {
          const d    = data[market.id];
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

      {/* Currency strip — USD/INR · DXY · EUR/USD · GBP/USD · USD/JPY · USD/CNY · BTC */}
      <CurrencyStrip data={data} />
    </div>
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
