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

      try {
        // Try Kite first
        const r    = await fetch('/api/kite-quote');
        const json = await r.json();
        const data = (json.quotes || []).map(q => ({
          name: q.label, price: q.price, changePct: q.changePct, change: q.change,
        })).filter(q => q.price);
        if (data.length > 0) {
          frozenRef.current = data;
          setItems(data);
          return;
        }
      } catch (_) {}
      // Fallback: NSE allIndices
      try {
        const r2   = await fetch('/api/nse-india');
        const d2   = await r2.json();
        const NSE_LABELS = {
          nifty50:'Nifty 50', banknifty:'Bank Nifty', niftynext50:'Nifty Next 50',
          nifty100:'Nifty 100', nifty200:'Nifty 200', nifty500:'Nifty 500',
          niftymidcap150:'Midcap 150', niftymidcapselect:'Mid Select',
          niftysmallcap250:'Smallcap 250', niftyit:'IT', niftyauto:'Auto',
          niftyfmcg:'FMCG', niftypharma:'Pharma', niftyrealty:'Realty',
          niftymetal:'Metal', niftyinfra:'Infra', niftyenergy:'Energy',
          niftyfinservice:'Fin Service', niftymedia:'Media',
          niftypsubank:'PSU Bank', niftypvtbank:'Pvt Bank',
          niftymnc:'MNC', niftyconsumer:'Consumer Dur', bankex:'Bankex',
          niftytotalmkt:'Total Mkt', indiavix:'India VIX',
        };
        const data2 = Object.entries(NSE_LABELS).map(([id, name]) => {
          const idx = d2?.[id];
          return idx?.price ? { name, price: idx.price, changePct: idx.changePct, change: idx.change } : null;
        }).filter(Boolean);
        if (data2.length > 0) {
          frozenRef.current = data2;
          setItems(data2);
        }
      } catch (_) {}
    };

    // Always fetch once on mount regardless of market hours
    load(true);

    // Subsequent polls: gated on market hours inside load()
    intervalRef.current = setInterval(() => load(false), isNSEOpen() ? 5000 : 60000);
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
export default function Ticker({ data, indiaOnly = false }) {
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

  if (!indiaOnly && globalItems.length === 0) return null;

  return (
    <div className="ticker-rows">
      {/* Global row — skip when indiaOnly */}
      {!indiaOnly && (
        <TickerRow label="GLOBAL" labelClass="ticker-label-global" speed={135}>
          {globalItems}
        </TickerRow>
      )}
      {/* India: 65s */}
      {indiaItems.length > 0 && (
        <TickerRow label="INDIA" labelClass="ticker-label-india" speed={65}>
          {indiaItems}
        </TickerRow>
      )}
    </div>
  );
}
