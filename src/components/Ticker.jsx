// src/components/Ticker.jsx
// Two ticker rows: GLOBAL (all markets) + INDIA (sector indices via Kite)
import { useState, useEffect } from 'react';
import { MARKETS } from '../data/markets';
import { formatPrice, formatPct } from '../utils/format';

// ── India ticker — polls /api/kite-indices every 20s ─────────────────
function useIndiaIndices() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const r    = await fetch('/api/kite-indices');
        const json = await r.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setItems(json.data);
        }
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

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
          {/* duplicate for seamless loop */}
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

  // India — sector indices
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
      <TickerRow label="GLOBAL" labelClass="ticker-label-global" speed={45}>
        {globalItems}
      </TickerRow>
      {indiaItems.length > 0 && (
        <TickerRow label="INDIA" labelClass="ticker-label-india" speed={38}>
          {indiaItems}
        </TickerRow>
      )}
    </div>
  );
}
