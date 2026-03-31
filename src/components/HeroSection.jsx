// src/components/HeroSection.jsx
// NSE countdown is inline with the INDIA header  -  saves vertical space
import { useState, useEffect, useRef } from 'react';
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

const INDIA_HERO_IDS = new Set(['nifty50', 'sensex', 'banknifty']);

function isNSEOpen() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins < 930; // 9:15 AM – 3:30 PM
}

// 1-second Kite polling for Nifty 50, Sensex, Bank Nifty during market hours
function useKiteHero() {
  const [kiteData, setKiteData] = useState({});
  const sparkRef                = useRef({}); // maintain running spark per symbol
  const errorCount              = useRef(0);

  useEffect(() => {
    let id;

    const poll = async () => {
      if (!isNSEOpen()) return;
      try {
        const r    = await fetch('/api/kite-data?type=hero');
        if (r.status === 401) { clearInterval(id); return; } // no token  -  stop polling
        if (!r.ok) return;
        const json = await r.json();
        if (!json.data) return;
        errorCount.current = 0;

        // Merge new prices with running spark arrays
        const merged = {};
        for (const [id_, d] of Object.entries(json.data)) {
          const existing = sparkRef.current[id_] || [];
          const spark = existing.length >= 5
            ? [...existing.slice(-199), d.price]  // keep up to 200 points
            : [...existing, d.price];
          sparkRef.current[id_] = spark;
          merged[id_] = { ...d, spark };
        }
        setKiteData(merged);
      } catch (_) {
        errorCount.current++;
        if (errorCount.current > 10) clearInterval(id); // stop after 10 consecutive failures
      }
    };

    if (isNSEOpen()) {
      poll(); // immediate first call
      id = setInterval(poll, 1000);
    }
    return () => clearInterval(id);
  }, []);

  return kiteData;
}

// Inline countdown  -  just the number + status, no full row
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
  const isHol   = s.status === 'holiday';
  return (
    <div className={`inline-countdown ${isOpen ? 'ic-open' : isPre ? 'ic-pre' : isHol ? 'ic-holiday' : 'ic-closed'}`}>
      {isOpen && <span className="live-pulse" style={{ marginRight: 6 }} />}
      <span className="ic-label">
        {isOpen ? 'LIVE' : isPre ? 'PRE-OPEN' : isHol ? 'HOLIDAY' : s.status === 'weekend' ? 'WEEKEND' : 'OPENS IN'}
      </span>
      {isHol
        ? <span className="ic-time" style={{fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
        : <span className="ic-time">{display}</span>
      }
      {!isOpen && !isHol && <span className="ic-sub">{isPre ? '· 09:15 IST' : '· 09:15 IST Mon–Fri'}</span>}
      {isHol && <span className="ic-sub">· opens next session</span>}
    </div>
  );
}

export default function HeroSection({ data, region, nseData = {} }) {
  const heroIds     = HERO_BY_REGION[region] || HERO_BY_REGION.GLOBAL;
  const kiteHero    = useKiteHero(); // 1s live data for India heroes
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
            // Prefer 1s Kite data for India heroes during market hours, fall back to 20s NSE data
            const d      = (INDIA_HERO_IDS.has(market.id) && kiteHero[market.id]) ? kiteHero[market.id] : data[market.id];
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
                  {d ? formatPrice(d.price, market.category === 'commodity') : ' - '}
                  {market.unit && <span className="hero-unit">{market.unit}</span>}
                </div>
                <div className="hero-changes">
                  <span className={`hero-abs ${gain ? 'gain' : 'loss'}`}>{d ? formatChange(d.change) : ' - '}</span>
                  <span className={`hero-pct-badge ${gain ? 'gain-bg' : 'loss-bg'}`}>
                    {d ? `${gain ? '▲' : '▼'} ${formatPct(d.changePct)}` : ' - '}
                  </span>
                </div>
                <div className="hero-spark">
                  {d && <Sparkline points={d.spark} gain={gain} height={60} />}
                </div>
                {/* OHLC row  -  shown for Indian hero markets when data available */}
                {INDIA_HERO_IDS.has(market.id) && d?.open != null && (
                  <div className="hero-ohlc">
                    <span className="hero-ohlc-item"><span className="hero-ohlc-label">O</span>{formatPrice(d.open)}</span>
                    <span className="hero-ohlc-item hero-ohlc-high"><span className="hero-ohlc-label">H</span>{formatPrice(d.high)}</span>
                    <span className="hero-ohlc-item hero-ohlc-low"><span className="hero-ohlc-label">L</span>{formatPrice(d.low)}</span>
                  </div>
                )}
                <div className="hero-footer">
                  <span className="hero-localtime">
                    {market.id === 'giftnifty' && d?.fetchedAt
                      ? `Updated ${new Date(d.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST · every 15 min`
                      : getLocalTime(market.tz)}
                  </span>
                  <span className="hero-prev">Prev. close: {d ? formatPrice(d.prevClose, market.category === 'commodity') : ' - '}</span>
                  {nseData[market.id]?.pe > 0 && <span className="hero-pe">P/E <strong>{nseData[market.id].pe.toFixed(1)}x</strong></span>}
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
              <span className="cs-price">{d ? formatPrice(d.price, true) : ' - '}</span>
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
