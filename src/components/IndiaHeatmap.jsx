// src/components/IndiaHeatmap.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { formatPct } from '../utils/format';

const NIFTY_SECTORS   = ['Financials','IT','Energy','Consumer','Auto','Industrials','Pharma','Discretionary','Metals','Others'];
const BNIFTY_SECTORS  = ['Private Banks','PSU Banks','NBFCs','Others'];

const SECTOR_COLORS = {
  Financials:'#4A9EFF', IT:'#A78BFA', Energy:'#F59E0B', Consumer:'#34D399',
  Auto:'#F97316', Industrials:'#64748B', Pharma:'#06B6D4', Discretionary:'#EC4899',
  Metals:'#94A3B8', Others:'#6B7280',
  'Private Banks':'#4A9EFF', 'PSU Banks':'#F59E0B', 'NBFCs':'#A78BFA',
};

function isNSEOpen() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  if (ist.getDay() === 0 || ist.getDay() === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins < 930;
}

function getHeatColor(pct) {
  if (pct == null) return { bg:'rgba(60,62,68,0.9)', border:'rgba(80,82,90,0.5)', text:'#666' };
  const abs = Math.abs(pct), intensity = Math.min(abs / 3, 1);
  if (pct > 0) return {
    bg:     `rgba(0,${Math.round(140+intensity*60)},${Math.round(80+intensity*20)},${0.18+intensity*0.38})`,
    border: `rgba(0,${Math.round(150+intensity*55)},${Math.round(100+intensity*20)},${0.45+intensity*0.45})`,
    text:   intensity > 0.35 ? '#00FF94' : '#00C896',
  };
  return {
    bg:     `rgba(${Math.round(180+intensity*65)},${Math.round(35-intensity*15)},${Math.round(40-intensity*15)},${0.18+intensity*0.38})`,
    border: `rgba(${Math.round(200+intensity*55)},40,40,${0.45+intensity*0.45})`,
    text:   intensity > 0.35 ? '#FF6070' : '#FF4455',
  };
}

function squarify(items, x, y, w, h) {
  if (!items.length || w < 1 || h < 1) return [];
  const total = items.reduce((s,i) => s+i.weight, 0);
  if (!total) return [];
  const rects = []; let remaining = [...items], cx=x, cy=y, cw=w, ch=h;
  while (remaining.length) {
    if (remaining.length === 1) { rects.push({...remaining[0],x:cx,y:cy,w:cw,h:ch}); break; }
    const remW = remaining.reduce((s,i)=>s+i.weight,0);
    const isWide = cw >= ch, stripW = isWide?cw:ch, stripH = isWide?ch:cw;
    let bestRow=[remaining[0]], bestAR=Infinity;
    for (let k=1; k<=remaining.length; k++) {
      const row=remaining.slice(0,k), rowW=row.reduce((s,i)=>s+i.weight,0);
      const stripLen=(rowW/remW)*stripW;
      let worst=0;
      for (const item of row) {
        const il=((item.weight/rowW)*stripLen*stripH)/stripLen;
        const ar=Math.max(stripLen/Math.max(il,0.01),Math.max(il,0.01)/stripLen);
        if (ar>worst) worst=ar;
      }
      if (worst<bestAR){bestAR=worst;bestRow=row;} else break;
    }
    const rowW=bestRow.reduce((s,i)=>s+i.weight,0), stripLen=(rowW/remW)*stripW;
    let pos=isWide?cy:cx;
    for (const item of bestRow) {
      const ib=(item.weight/rowW)*stripH;
      if (isWide){rects.push({...item,x:cx,y:pos,w:stripLen,h:ib});pos+=ib;}
      else{rects.push({...item,x:pos,y:cy,w:ib,h:stripLen});pos+=ib;}
    }
    if(isWide){cx+=stripLen;cw-=stripLen;}else{cy+=stripLen;ch-=stripLen;}
    remaining=remaining.slice(bestRow.length);
  }
  return rects;
}

function HeatmapCanvas({ stocks, sectorOrder, title, indexKey }) {
  const [hovered, setHovered]       = useState(null);
  const [filter, setFilter]         = useState('ALL');
  const [containerW, setContainerW] = useState(0);
  const containerRef                = useRef(null);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    setContainerW(el.offsetWidth);
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(el); return () => ro.disconnect();
  }, [stocks]);

  const visible  = stocks.filter(s => filter === 'ALL' || s.sector === filter);
  const CANVAS_H = Math.max(320, Math.round(containerW * 0.38));
  const GAP      = 2;

  const grouped = sectorOrder
    .map(sector => ({ sector, items: visible.filter(s => s.sector === sector) }))
    .filter(g => g.items.length > 0);

  const sectorBlocks = squarify(grouped.map(g=>({ sector:g.sector, weight:g.items.reduce((s,i)=>s+i.weight,0) })), 0, 0, containerW, CANVAS_H);

  const allRects = [];
  for (const block of sectorBlocks) {
    const g = grouped.find(g=>g.sector===block.sector); if(!g) continue;
    const inner = squarify(g.items, block.x+GAP, block.y+GAP, Math.max(0,block.w-GAP*2), Math.max(0,block.h-GAP*2));
    if (inner.length > 0) inner[0]._sectorLabel = block.sector;
    allRects.push(...inner);
  }

  const sectors = sectorOrder.filter(s => stocks.some(st=>st.sector===s));
  const gainers = stocks.filter(s=>s.changePct>0).length;
  const losers  = stocks.filter(s=>s.changePct<0).length;
  const avgChg  = stocks.length ? (stocks.reduce((s,i)=>s+(i.changePct||0),0)/stocks.length).toFixed(2) : null;

  return (
    <div className="hm-wrap">
      <div className="hm-header">
        <div className="hm-header-left">
          <div className="hm-title">
            <span className="hm-flag">🇮🇳</span> {title}
          </div>
          {avgChg != null && (
            <div className="hm-stats">
              <span className={`hm-avg ${parseFloat(avgChg)>=0?'gain':'loss'}`}>Avg {parseFloat(avgChg)>=0?'+':''}{avgChg}%</span>
              <span className="hm-gainer">▲ {gainers} up</span>
              <span className="hm-loser">▼ {losers} down</span>
            </div>
          )}
        </div>
        <div className="hm-header-right">
          <div className="hm-filter-row">
            <button className={`hm-filter-btn ${filter==='ALL'?'hm-filter-active':''}`} onClick={()=>setFilter('ALL')}>All</button>
            {sectors.map(s=>(
              <button key={s} className={`hm-filter-btn ${filter===s?'hm-filter-active':''}`}
                style={filter===s?{borderColor:SECTOR_COLORS[s],color:SECTOR_COLORS[s]}:{}}
                onClick={()=>setFilter(f=>f===s?'ALL':s)}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="hm-container" ref={containerRef} style={{height:CANVAS_H}} onMouseLeave={()=>setHovered(null)}>
        {allRects.map((rect,i) => {
          const colors=getHeatColor(rect.changePct);
          const showName=rect.w>55&&rect.h>28, showPct=rect.w>50&&rect.h>46;
          const showSector=rect._sectorLabel&&rect.w>80&&rect.h>70;
          return (
            <div key={rect.id||i} className="hm-cell"
              style={{left:rect.x,top:rect.y,width:Math.max(0,rect.w-1),height:Math.max(0,rect.h-1),background:colors.bg,borderColor:colors.border}}
              onMouseEnter={e=>{
                const box=e.currentTarget.closest('.hm-container').getBoundingClientRect();
                setHovered({stock:rect,x:e.clientX-box.left,y:e.clientY-box.top});
              }}>
              {showSector&&<span className="hm-cell-sector" style={{color:SECTOR_COLORS[rect._sectorLabel]}}>{rect._sectorLabel}</span>}
              {showName&&<span className="hm-cell-name" style={{color:colors.text}}>{rect.name}</span>}
              {showPct&&<span className="hm-cell-pct" style={{color:colors.text}}>{rect.changePct>=0?'+':''}{formatPct(rect.changePct)}</span>}
            </div>
          );
        })}
        {hovered && (
          <div className="hm-tooltip" style={{left:hovered.x>containerW*0.65?'auto':hovered.x+12,right:hovered.x>containerW*0.65?containerW-hovered.x+12:'auto',top:Math.min(hovered.y+8,260)}}>
            <div className="hm-tt-name">{hovered.stock.name}</div>
            <div className="hm-tt-sector" style={{color:SECTOR_COLORS[hovered.stock.sector]}}>{hovered.stock.sector}</div>
            {hovered.stock.price!=null&&(
              <>
                <div className="hm-tt-price">₹{hovered.stock.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                <div className="hm-tt-chg" style={{color:getHeatColor(hovered.stock.changePct).text}}>
                  {hovered.stock.changePct>=0?'+':''}{formatPct(hovered.stock.changePct)}
                </div>
                <div className="hm-tt-prev">Prev: ₹{hovered.stock.prevClose?.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
              </>
            )}
          </div>
        )}
        {stocks.length===0&&<div className="hm-loading"><span className="hm-loading-dot"/>Loading {title}...</div>}
      </div>
      <div className="hm-legend">
        <div className="hm-legend-colors">
          <span className="hm-leg-block hm-leg-sg">Strong gain</span>
          <span className="hm-leg-block hm-leg-mg">Mild gain</span>
          <span className="hm-leg-block hm-leg-flat">Flat</span>
          <span className="hm-leg-block hm-leg-ml">Mild loss</span>
          <span className="hm-leg-block hm-leg-sl">Strong loss</span>
        </div>
        <div className="hm-legend-sectors">
          {sectors.map(s=>(
            <span key={s} className="hm-sector-badge">
              <span className="hm-sector-dot" style={{background:SECTOR_COLORS[s]}}/>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function IndiaHeatmap() {
  const [niftyStocks,  setNiftyStocks]  = useState([]);
  const [bniftyStocks, setBniftyStocks] = useState([]);

  const load = useCallback(async (initial=false) => {
    if (!initial && !isNSEOpen()) return;
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/nifty-heatmap?index=nifty50'),
        fetch('/api/nifty-heatmap?index=banknifty'),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      if (d1.data?.length) setNiftyStocks(d1.data);
      if (d2.data?.length) setBniftyStocks(d2.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div>
      <HeatmapCanvas stocks={niftyStocks}  sectorOrder={NIFTY_SECTORS}  title="Nifty 50 Heatmap"    indexKey="nifty50"   />
      <HeatmapCanvas stocks={bniftyStocks} sectorOrder={BNIFTY_SECTORS} title="Bank Nifty Heatmap"  indexKey="banknifty" />
    </div>
  );
}
