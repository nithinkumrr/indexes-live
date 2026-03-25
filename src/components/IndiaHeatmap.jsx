// src/components/IndiaHeatmap.jsx
// Nifty 50 treemap — sized by free-float market cap, coloured by % change
// Grouped by sector. Polls every 20s during NSE hours, frozen outside.

import { useState, useEffect, useCallback } from 'react';
import { formatPct } from '../utils/format';

const SECTOR_ORDER = ['Financials', 'IT', 'Energy', 'Consumer', 'Auto', 'Industrials', 'Pharma', 'Discretionary', 'Metals'];

const SECTOR_COLORS = {
  Financials:    '#4A9EFF',
  IT:            '#A78BFA',
  Energy:        '#F59E0B',
  Consumer:      '#34D399',
  Auto:          '#F97316',
  Industrials:   '#64748B',
  Pharma:        '#06B6D4',
  Discretionary: '#EC4899',
  Metals:        '#94A3B8',
};

function isNSEOpen() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins < 930;
}

// Map % change to fill colour
function getHeatColor(pct) {
  if (pct == null) return { bg: 'rgba(60,62,68,0.9)', border: 'rgba(80,82,90,0.5)', text: '#666' };
  const abs = Math.abs(pct);
  const intensity = Math.min(abs / 3, 1);
  if (pct > 0) {
    return {
      bg:     `rgba(0,${Math.round(140 + intensity * 60)},${Math.round(80 + intensity * 20)},${0.18 + intensity * 0.38})`,
      border: `rgba(0,${Math.round(150 + intensity * 55)},${Math.round(100 + intensity * 20)},${0.45 + intensity * 0.45})`,
      text:   intensity > 0.35 ? '#00FF94' : '#00C896',
    };
  } else {
    return {
      bg:     `rgba(${Math.round(180 + intensity * 65)},${Math.round(35 - intensity * 15)},${Math.round(40 - intensity * 15)},${0.18 + intensity * 0.38})`,
      border: `rgba(${Math.round(200 + intensity * 55)},40,40,${0.45 + intensity * 0.45})`,
      text:   intensity > 0.35 ? '#FF6070' : '#FF4455',
    };
  }
}

// Squarified treemap — returns [{x,y,w,h}] for each item in data
function squarify(items, x, y, w, h) {
  if (!items.length) return [];
  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const area        = w * h;

  const rects = [];
  let remaining = [...items];
  let rx = x, ry = y, rw = w, rh = h;

  while (remaining.length) {
    const shortSide = Math.min(rw, rh);
    const isWide    = rw >= rh;
    const remWeight = remaining.reduce((s, i) => s + i.weight, 0);
    const remArea   = (rw * rh * (remWeight / totalWeight)) || 0;

    // Find optimal row to minimise worst aspect ratio
    let row = [];
    let rowWeight = 0;
    let bestWorst = Infinity;

    for (let k = 0; k < remaining.length; k++) {
      const item = remaining[k];
      row.push(item);
      rowWeight += item.weight;
      const rowArea  = remArea * (rowWeight / remWeight);
      const rowLen   = isWide ? rowArea / rh : rowArea / rw;
      let worstAR = 0;
      for (const ri of row) {
        const ri_area = remArea * (ri.weight / remWeight);
        const ri_len  = isWide ? ri_area / rowLen : ri_area / rowLen;
        const ar = Math.max(rowLen / ri_len, ri_len / rowLen);
        if (ar > worstAR) worstAR = ar;
      }
      if (worstAR > bestWorst && k > 0) { row.pop(); break; }
      bestWorst = worstAR;
    }

    // Layout the row
    const rowWeight2 = row.reduce((s, i) => s + i.weight, 0);
    const rowArea2   = remArea * (rowWeight2 / remWeight);
    const rowLen2    = isWide ? rowArea2 / rh : rowArea2 / rw;
    let pos = isWide ? ry : rx;

    for (const item of row) {
      const itemArea  = remArea * (item.weight / remWeight);
      const itemSlice = isWide ? itemArea / rowLen2 : itemArea / rowLen2;
      if (isWide) {
        rects.push({ ...item, x: rx, y: pos, w: rowLen2, h: itemSlice });
        pos += itemSlice;
      } else {
        rects.push({ ...item, x: pos, y: ry, w: itemSlice, h: rowLen2 });
        pos += itemSlice;
      }
    }

    if (isWide) { rx += rowLen2; rw -= rowLen2; }
    else        { ry += rowLen2; rh -= rowLen2; }

    remaining = remaining.filter(i => !row.includes(i));
    if (rw < 1 || rh < 1) break;
  }

  return rects;
}

// Tooltip
function Tooltip({ stock, x, y, containerW }) {
  if (!stock) return null;
  const flip = x > containerW * 0.65;
  const colors = getHeatColor(stock.changePct);
  return (
    <div className="hm-tooltip" style={{ left: flip ? 'auto' : x + 12, right: flip ? containerW - x + 12 : 'auto', top: y + 8 }}>
      <div className="hm-tt-name">{stock.name}</div>
      <div className="hm-tt-sector" style={{ color: SECTOR_COLORS[stock.sector] }}>{stock.sector}</div>
      {stock.price != null && (
        <>
          <div className="hm-tt-price">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="hm-tt-chg" style={{ color: colors.text }}>
            {stock.changePct >= 0 ? '+' : ''}{formatPct(stock.changePct)}
            <span className="hm-tt-abs"> ({stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)})</span>
          </div>
          <div className="hm-tt-prev">Prev close: ₹{stock.prevClose?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
        </>
      )}
    </div>
  );
}

// Sector legend item
function SectorBadge({ sector }) {
  return (
    <span className="hm-sector-badge">
      <span className="hm-sector-dot" style={{ background: SECTOR_COLORS[sector] }} />
      {sector}
    </span>
  );
}

export default function IndiaHeatmap() {
  const [stocks, setStocks]     = useState([]);
  const [source, setSource]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [hovered, setHovered]   = useState(null);   // { stock, x, y }
  const [filter, setFilter]     = useState('ALL');   // sector filter
  const [containerW, setContainerW] = useState(1200);

  // Fetch data
  const load = useCallback(async (initial = false) => {
    if (!initial && !isNSEOpen()) return;
    try {
      const r    = await fetch('/api/kite-nifty50');
      const json = await r.json();
      if (Array.isArray(json.data) && json.data.length > 0) {
        setStocks(json.data);
        setSource(json.source || '');
        setLoading(false);
      }
    } catch (_) {}
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 20000);
    return () => clearInterval(id);
  }, [load]);

  // Measure container width
  useEffect(() => {
    const el = document.querySelector('.hm-container');
    if (el) setContainerW(el.offsetWidth);
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // Filter + sort
  const visible = stocks.filter(s => filter === 'ALL' || s.sector === filter);

  // Build treemap rects grouped by sector
  const grouped = SECTOR_ORDER.map(sector => {
    const items = visible.filter(s => s.sector === sector);
    return items.length ? { sector, items } : null;
  }).filter(Boolean);

  // Flat list for squarify — sector total weight as one block, then sub-layout per sector
  const totalWeight = visible.reduce((s, i) => s + i.weight, 0);
  const CANVAS_H    = Math.max(380, Math.round(containerW * 0.42));
  const GAP         = 3;

  // Two-pass treemap: sector blocks first, then stocks within each sector
  const sectorBlocks = squarify(
    grouped.map(g => ({ sector: g.sector, weight: g.items.reduce((s, i) => s + i.weight, 0) })),
    0, 0, containerW, CANVAS_H
  );

  const allRects = [];
  for (const block of sectorBlocks) {
    const g = grouped.find(g => g.sector === block.sector);
    if (!g) continue;
    const inner = squarify(
      g.items,
      block.x + GAP, block.y + GAP,
      block.w - GAP * 2, block.h - GAP * 2
    );
    allRects.push(...inner);
  }

  const sectors = [...new Set(stocks.map(s => s.sector))].filter(s => SECTOR_ORDER.includes(s));

  // Market stats
  const gainers  = stocks.filter(s => s.changePct > 0).length;
  const losers   = stocks.filter(s => s.changePct < 0).length;
  const avgChg   = stocks.length ? (stocks.reduce((s, i) => s + (i.changePct || 0), 0) / stocks.length).toFixed(2) : null;

  return (
    <div className="hm-wrap">
      {/* Header */}
      <div className="hm-header">
        <div className="hm-header-left">
          <div className="hm-title">
            <span className="hm-flag">🇮🇳</span>
            Nifty 50 Heatmap
            {source === 'kite' && <span className="hm-source-badge hm-kite">via Kite</span>}
            {source === 'yahoo' && <span className="hm-source-badge hm-yahoo">via Yahoo</span>}
          </div>
          {avgChg != null && (
            <div className="hm-stats">
              <span className={`hm-avg ${parseFloat(avgChg) >= 0 ? 'gain' : 'loss'}`}>
                Avg {parseFloat(avgChg) >= 0 ? '+' : ''}{avgChg}%
              </span>
              <span className="hm-gainer">▲ {gainers} up</span>
              <span className="hm-loser">▼ {losers} down</span>
            </div>
          )}
        </div>
        <div className="hm-header-right">
          <div className="hm-filter-row">
            <button
              className={`hm-filter-btn ${filter === 'ALL' ? 'hm-filter-active' : ''}`}
              onClick={() => setFilter('ALL')}
            >All</button>
            {sectors.map(s => (
              <button
                key={s}
                className={`hm-filter-btn ${filter === s ? 'hm-filter-active' : ''}`}
                style={filter === s ? { borderColor: SECTOR_COLORS[s], color: SECTOR_COLORS[s] } : {}}
                onClick={() => setFilter(f => f === s ? 'ALL' : s)}
              >{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Treemap canvas */}
      <div
        className="hm-container"
        style={{ height: CANVAS_H, position: 'relative' }}
        onMouseLeave={() => setHovered(null)}
      >
        {loading ? (
          <div className="hm-loading">
            <span className="hm-loading-dot" />
            Fetching Nifty 50 data...
          </div>
        ) : allRects.map((rect, i) => {
          const colors  = getHeatColor(rect.changePct);
          const showName = rect.w > 52 && rect.h > 28;
          const showPct  = rect.w > 48 && rect.h > 44;
          return (
            <div
              key={rect.id || i}
              className="hm-cell"
              style={{
                left: rect.x, top: rect.y, width: rect.w, height: rect.h,
                background: colors.bg, borderColor: colors.border,
              }}
              onMouseEnter={e => {
                const box = e.currentTarget.closest('.hm-container').getBoundingClientRect();
                const cx  = e.clientX - box.left;
                const cy  = e.clientY - box.top;
                setHovered({ stock: rect, x: cx, y: cy });
              }}
            >
              {showName && (
                <span className="hm-cell-name" style={{ color: colors.text }}>{rect.name}</span>
              )}
              {showPct && (
                <span className="hm-cell-pct" style={{ color: colors.text }}>
                  {rect.changePct >= 0 ? '+' : ''}{formatPct(rect.changePct)}
                </span>
              )}
            </div>
          );
        })}

        {hovered && (
          <Tooltip
            stock={hovered.stock}
            x={hovered.x}
            y={hovered.y}
            containerW={containerW}
          />
        )}
      </div>

      {/* Legend */}
      <div className="hm-legend">
        <div className="hm-legend-colors">
          <span className="hm-leg-block hm-leg-sg">Strong gain</span>
          <span className="hm-leg-block hm-leg-mg">Mild gain</span>
          <span className="hm-leg-block hm-leg-flat">Flat</span>
          <span className="hm-leg-block hm-leg-ml">Mild loss</span>
          <span className="hm-leg-block hm-leg-sl">Strong loss</span>
        </div>
        <div className="hm-legend-sectors">
          {sectors.map(s => <SectorBadge key={s} sector={s} />)}
        </div>
      </div>
    </div>
  );
}
