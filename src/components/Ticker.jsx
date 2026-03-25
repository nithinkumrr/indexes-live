// src/components/Ticker.jsx
// Two ticker rows: GLOBAL (all markets) + INDIA (sector indices via Kite)
// India row: polls every 20s during NSE hours (9:15–3:30 IST Mon–Fri), frozen outside
import { useState, useEffect, useRef } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';

// Returns true if NSE sector indices are live right now
function isNSEOpen() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins < 930; // 9:15 AM to 3:30 PM
}

// ── India indices hook — smart polling ───────────────────────────────
// Calls API only during NSE hours; outside hours shows frozen last-close
function useIndiaIndices() {
  const [items, setItems]     = useState([]);
  const frozenRef             = useRef([]); // holds last close snapshot
  const intervalRef           = useRef(null);

  useEffect(() => {
    const load = async (forceFirstLoad = false) => {
      // Skip polling outside market hours — but always run on first load
      // so we have the last close price to display
      if (!forceFirstLoad && !isNSEOpen()) return;
      try {
        const r    = await fetch('/api/kite-data?type=indices');
        const json = await r.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          frozenRef.current = json.data;
          setItems(json.data);
        }
      } catch (_) {}
    };

    // Always fetch once on mount regardless of market hours
    load(true);

    // Subsequent polls: gated on market hours inside load()
    intervalRef.current = setInterval(() => load(false), 20000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Return live items during hours, frozen snapshot outside hours
  // (state already holds last received value — no extra logic needed)
  return items;
}

// ── Single scrolling row ──────────────────────────────────────────────
function TickerRow({ label, labelClass, children, speed }) {
  return (
    <div className="ticker-wrap" title="Hover to pause">
      <div className={`ticker-label ${labelClass}`}>{label}</div>
      <div className="ticker-scroll-area">
        <div className="ticker-inner" style={{ animationDuration: `${speed}s` }}>
          {children}
          {Array.isArray(children) && children.map((c, i) => (
            <span key={`dup-${i}`} aria-hidden="true">{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────
export default function Ticker({ data }) {
  const indiaRaw = useIndiaIndices();

  // Global — all markets with live data
  const globalItems = MARKETS.filter(m => data[m.id]).map(m => {
    const d    = data[m.id];
    const gain = d.changePct >= 0;
    return (
      <span key={m.id} className="ticker-item">
        <span className="ticker-name">{m.name}</span>
        <span className="ticker-price">{formatPrice(d.price)}</span>
        <span className={`ticker-chg ${gain ? 'gain' : 'loss'}`}>
          {gain ? '▲' : '▼'} {formatPct(d.changePct)}
        </span>
      </span>
    );
  });

  // India — sector indices (live or frozen last close)
  const indiaItems = indiaRaw.map(idx => {
    const gain = idx.changePct >= 0;
    return (
      <span key={idx.name} className="ticker-item">
        <span className="ticker-name">{idx.name}</span>
        <span className="ticker-price">{formatPrice(idx.price)}</span>
        <span className={`ticker-chg ${gain ? 'gain' : 'loss'}`}>
          {gain ? '▲' : '▼'} {formatPct(idx.changePct)}
        </span>
      </span>
    );
  });

  if (globalItems.length === 0) return null;

  return (
    <div className="ticker-rows">
      {/* Global: 135s — ~30+ markets, steady readable pace */}
      <TickerRow label="GLOBAL" labelClass="ticker-label-global" speed={135}>
        {globalItems}
      </TickerRow>
      {/* India: 65s — 14 indices, proportionally matched pace */}
      {indiaItems.length > 0 && (
        <TickerRow label="INDIA" labelClass="ticker-label-india" speed={65}>
          {indiaItems}
        </TickerRow>
      )}
    </div>
  );
}
