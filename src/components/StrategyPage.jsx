import { useState, useMemo, useCallback, useEffect } from 'react';
import { getNiftyExpiries } from '../utils/timezone';

// ── BLACK-SCHOLES ENGINE ──────────────────────────────────────────────────────
function norm(x) {
  const t = 1/(1+0.2316419*Math.abs(x));
  const d = 0.3989423*Math.exp(-x*x/2);
  const p = d*t*(0.3193815+t*(-0.3565638+t*(1.7814779+t*(-1.8212560+t*1.3302744))));
  return x >= 0 ? 1-p : p;
}
function bsPrice(S, K, T, sigma, type) {
  if (T <= 0) return Math.max(0, type==='CE' ? S-K : K-S);
  const d1 = (Math.log(S/K)+(0.065+sigma*sigma/2)*T)/(sigma*Math.sqrt(T));
  const d2 = d1-sigma*Math.sqrt(T);
  if (type==='CE') return S*norm(d1)-K*Math.exp(-0.065*T)*norm(d2);
  return K*Math.exp(-0.065*T)*norm(-d2)-S*norm(-d1);
}

const LOT_SIZE = 75;
const VIEW_COLORS = { bullish:'#00C896', bearish:'#FF4455', neutral:'#F59E0B', volatile:'#4A9EFF' };

// ── STRATEGY DEFINITIONS ──────────────────────────────────────────────────────
const STRATEGY_GROUPS = [
  { id:'single', label:'Single Leg', icon:'▸', strategies:[
    { id:'long_call',   label:'Long Call',   view:'bullish', credit:false, complexity:1,
      hook:'Unlimited upside. You only lose what you paid.',
      why:'Buy when VIX is low and a big upward catalyst is coming. Time is your enemy but a large move is your friend.',
      kill:'Time decay kills you if the move is slow. Being right on direction but wrong on timing still loses money.',
      legs:(a,w)=>[{t:'CE',q:1,k:a}] },
    { id:'long_put',    label:'Long Put',    view:'bearish', credit:false, complexity:1,
      hook:'Best portfolio hedge. Profits multiply on crashes.',
      why:'Cheap insurance before uncertain events. Works best when VIX is low so put premiums are cheap.',
      kill:'A slow grind down rarely pays off. Needs a fast sharp move to cover premium paid.',
      legs:(a,w)=>[{t:'PE',q:1,k:a}] },
    { id:'short_call',  label:'Short Call',  view:'bearish', credit:true,  complexity:2,
      hook:'Collect premium weekly. Profit from time decay.',
      why:'Works 60-65% of weeks historically. Higher VIX gives better premiums to collect.',
      kill:'Unlimited loss if market gaps up strongly. Always have a stop loss.',
      legs:(a,w)=>[{t:'CE',q:-1,k:a+w}] },
    { id:'short_put',   label:'Short Put',   view:'bullish', credit:true,  complexity:2,
      hook:'Get paid to be bullish. Income strategy for calm markets.',
      why:'Collect premium and profit if market stays flat or rises. Popular for income generation.',
      kill:'Sharp fall below strike wipes multiple weeks of gains in one day.',
      legs:(a,w)=>[{t:'PE',q:-1,k:a-w}] },
  ]},
  { id:'volatility', label:'Volatility', icon:'⚡', strategies:[
    { id:'short_straddle', label:'Short Straddle', view:'neutral', credit:true,  complexity:3,
      hook:'Most popular Indian strategy. High win rate, very painful when wrong.',
      why:'Historically 61-72% profitable on weekly expiry. Best when VIX is elevated and expected to fall after the event.',
      kill:'A 2% gap in either direction wipes 3-4 weeks of premium. Budget day, election results, and RBI shocks are killers.',
      legs:(a,w)=>[{t:'CE',q:-1,k:a},{t:'PE',q:-1,k:a}] },
    { id:'long_straddle',  label:'Long Straddle',  view:'volatile',credit:false, complexity:2,
      hook:'Bet on chaos. Profit from any big move in either direction.',
      why:'Before RBI, Budget, elections when you know a big move is coming but not the direction.',
      kill:'If market stays flat you lose both premiums. Every day that passes costs you money.',
      legs:(a,w)=>[{t:'CE',q:1,k:a},{t:'PE',q:1,k:a}] },
    { id:'short_strangle', label:'Short Strangle', view:'neutral', credit:true,  complexity:3,
      hook:'Wider cushion than straddle. Collect premium from both sides with more room.',
      why:'Higher probability of profit than straddle. Market has to move further to hurt you.',
      kill:'Still unlimited risk. A black swan event like a flash crash destroys the trade instantly.',
      legs:(a,w)=>[{t:'CE',q:-1,k:a+w},{t:'PE',q:-1,k:a-w}] },
    { id:'long_strangle',  label:'Long Strangle',  view:'volatile',credit:false, complexity:2,
      hook:'Cheaper than straddle. Needs bigger move but costs less upfront.',
      why:'When you expect a large move but want to spend less premium than a straddle.',
      kill:'Needs an even bigger move than straddle. Both legs can expire completely worthless.',
      legs:(a,w)=>[{t:'CE',q:1,k:a+w},{t:'PE',q:1,k:a-w}] },
  ]},
  { id:'spreads', label:'Vertical Spreads', icon:'↕', strategies:[
    { id:'bull_call_spread', label:'Bull Call Spread', view:'bullish', credit:false, complexity:2,
      hook:'Defined risk bull trade. Cheaper than buying a naked call.',
      why:'Sell a higher strike call to reduce cost. Good for moderate bullish views where you expect a limited move.',
      kill:'Profit is capped. If market rallies strongly beyond your short strike, you miss the extra gains.',
      legs:(a,w)=>[{t:'CE',q:1,k:a},{t:'CE',q:-1,k:a+w}] },
    { id:'bear_put_spread',  label:'Bear Put Spread',  view:'bearish', credit:false, complexity:2,
      hook:'Defined risk bear trade. Cheaper than buying a naked put.',
      why:'Sell a lower strike put to reduce cost. Good for moderate bearish views.',
      kill:'Profit is capped if market falls sharply beyond your short strike.',
      legs:(a,w)=>[{t:'PE',q:1,k:a},{t:'PE',q:-1,k:a-w}] },
    { id:'bull_put_spread',  label:'Bull Put Spread',  view:'bullish', credit:true,  complexity:2,
      hook:'Collect credit upfront and profit if market stays flat or rises.',
      why:'High probability trade. Collect premium with defined maximum loss.',
      kill:'Full loss if market falls through the lower strike.',
      legs:(a,w)=>[{t:'PE',q:-1,k:a},{t:'PE',q:1,k:a-w}] },
    { id:'bear_call_spread', label:'Bear Call Spread', view:'bearish', credit:true,  complexity:2,
      hook:'Collect credit and profit if market stays flat or falls.',
      why:'High probability bearish or neutral trade with defined risk.',
      kill:'Full loss if market rallies through the upper strike.',
      legs:(a,w)=>[{t:'CE',q:-1,k:a},{t:'CE',q:1,k:a+w}] },
  ]},
  { id:'iron', label:'Iron Strategies', icon:'🔩', strategies:[
    { id:'short_iron_condor',    label:'Short Iron Condor',    view:'neutral', credit:true,  complexity:4,
      hook:'The professional income machine. Defined risk, consistent returns.',
      why:'4 legs give defined max loss unlike naked strangles. Works 65-70% of weeks. The go-to for serious income traders.',
      kill:'Big directional move breaks one side. Manage early when a wing gets threatened by rolling or closing.',
      legs:(a,w)=>[{t:'PE',q:1,k:a-w*2},{t:'PE',q:-1,k:a-w},{t:'CE',q:-1,k:a+w},{t:'CE',q:1,k:a+w*2}] },
    { id:'short_iron_butterfly', label:'Short Iron Butterfly', view:'neutral', credit:true,  complexity:4,
      hook:'Maximum premium at exact strike. Very tight profit zone but high reward.',
      why:'Higher premium than iron condor but needs market to pin near your strike.',
      kill:'Narrow profit zone means any significant move hurts. Hard to manage near expiry.',
      legs:(a,w)=>[{t:'PE',q:1,k:a-w},{t:'PE',q:-1,k:a},{t:'CE',q:-1,k:a},{t:'CE',q:1,k:a+w}] },
    { id:'long_iron_condor',     label:'Long Iron Condor',     view:'volatile',credit:false, complexity:4,
      hook:'Profit from a big breakout in either direction with defined risk.',
      why:'Defined risk way to bet on large event-driven moves.',
      kill:'If market stays in range all 4 legs expire worthless.',
      legs:(a,w)=>[{t:'PE',q:-1,k:a-w*2},{t:'PE',q:1,k:a-w},{t:'CE',q:1,k:a+w},{t:'CE',q:-1,k:a+w*2}] },
    { id:'long_iron_butterfly',  label:'Long Iron Butterfly',  view:'volatile',credit:false, complexity:3,
      hook:'Cheap volatility bet with defined maximum loss.',
      why:'Lower cost than straddle with defined risk. Good before big events.',
      kill:'Needs a significant move to profit. Time decay hurts both long legs.',
      legs:(a,w)=>[{t:'PE',q:-1,k:a-w},{t:'PE',q:1,k:a},{t:'CE',q:1,k:a},{t:'CE',q:-1,k:a+w}] },
  ]},
  { id:'butterfly', label:'Butterfly', icon:'🦋', strategies:[
    { id:'long_call_butterfly', label:'Long Call Butterfly', view:'neutral', credit:false, complexity:3,
      hook:'Tiny cost, huge reward if market pins exactly at your level.',
      why:'Risk ₹5k to potentially make ₹50k if Nifty expires near your middle strike.',
      kill:'Narrow profit zone. Needs precise view on exact expiry level.',
      legs:(a,w)=>[{t:'CE',q:1,k:a-w},{t:'CE',q:-2,k:a},{t:'CE',q:1,k:a+w}] },
    { id:'long_put_butterfly',  label:'Long Put Butterfly',  view:'neutral', credit:false, complexity:3,
      hook:'Same high reward low cost structure using puts.',
      why:'Alternative to call butterfly. Sometimes better pricing available on put side.',
      kill:'Same narrow profit zone issue. Must be precise on expiry level.',
      legs:(a,w)=>[{t:'PE',q:1,k:a-w},{t:'PE',q:-2,k:a},{t:'PE',q:1,k:a+w}] },
  ]},
  { id:'synthetic', label:'Synthetic', icon:'⚙', strategies:[
    { id:'synthetic_long',  label:'Synthetic Long',  view:'bullish', credit:false, complexity:2,
      hook:'Acts like long futures using options. No futures margin needed.',
      why:'Options flexibility with futures-like P&L. Good when futures spread is wide.',
      kill:'Unlimited downside like a futures position. Full directional exposure.',
      legs:(a,w)=>[{t:'CE',q:1,k:a},{t:'PE',q:-1,k:a}] },
    { id:'synthetic_short', label:'Synthetic Short', view:'bearish', credit:false, complexity:2,
      hook:'Acts like short futures. Profit from any sustained fall.',
      why:'Bearish futures-like exposure with options flexibility.',
      kill:'Unlimited loss if market rises sharply against you.',
      legs:(a,w)=>[{t:'CE',q:-1,k:a},{t:'PE',q:1,k:a}] },
  ]},
];

const ALL_STRATEGIES = STRATEGY_GROUPS.flatMap(g => g.strategies.map(s => ({ ...s, groupLabel: g.label })));

function calcSetupScore(strat, vix, dte) {
  let score = 5;
  if (strat.view === 'neutral') {
    if (vix > 18) score += 2;
    if (vix > 25) score += 1;
    if (dte <= 2)  score += 1;
    if (dte <= 1)  score += 1;
  } else if (strat.view === 'volatile') {
    if (vix < 15) score += 2;
    if (dte <= 5 && dte >= 2) score += 2;
  } else {
    if (vix < 18) score += 1;
    if (dte >= 5) score += 1;
  }
  if (strat.credit && vix > 20) score += 1;
  return Math.min(10, Math.max(1, score));
}

// ── PAYOFF CHART ──────────────────────────────────────────────────────────────
function PayoffChart({ legs, spot, vix, dte, lots }) {
  const [hoverX, setHoverX] = useState(null);

  const { range, pnls, breakevens, maxP, minP } = useMemo(() => {
    const step = spot > 10000 ? 50 : 25;
    const strikes = legs.map(l => l.k);
    const pad = Math.max(...strikes) - Math.min(...strikes) + step * 14;
    const from = Math.min(...strikes, spot) - pad / 2;
    const to   = Math.max(...strikes, spot) + pad / 2;
    const range = [];
    for (let s = from; s <= to; s += step) range.push(Math.round(s));

    const sigma = (vix || 15) / 100;
    const T = Math.max(dte, 0.25) / 365;

    const pnls = range.map(s => {
      let total = 0;
      for (const leg of legs) {
        const entry = bsPrice(spot, leg.k, T, sigma, leg.t);
        const exit  = Math.max(0, leg.t === 'CE' ? s - leg.k : leg.k - s);
        total += leg.q * (exit - entry) * lots * LOT_SIZE;
      }
      return Math.round(total);
    });

    const breakevens = [];
    for (let i = 0; i < pnls.length - 1; i++) {
      if ((pnls[i] < 0 && pnls[i+1] >= 0) || (pnls[i] >= 0 && pnls[i+1] < 0)) {
        const f = -pnls[i] / (pnls[i+1] - pnls[i]);
        breakevens.push(Math.round(range[i] + f * (range[i+1] - range[i])));
      }
    }
    return { range, pnls, breakevens, maxP: Math.max(...pnls), minP: Math.min(...pnls) };
  }, [legs, spot, vix, dte, lots]);

  const W = 660, H = 160;
  const PAD = { t: 14, r: 12, b: 32, l: 60 };
  const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;
  const span = Math.max(maxP - minP, 1);
  const toX = s => PAD.l + ((s - range[0]) / (range[range.length-1] - range[0])) * CW;
  const toY = p => PAD.t + CH - ((p - minP) / span) * CH;
  const zeroY = toY(0);
  const spotX = toX(spot);
  const pts = range.map((s, i) => ({ x: toX(s), y: toY(pnls[i]), p: pnls[i] }));
  const linePath = pts.map((p, i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const fillPath = (positive) => {
    let d = '', open = false;
    for (let i = 0; i < pts.length; i++) {
      const { x, y, p } = pts[i];
      const cond = positive ? p >= 0 : p < 0;
      const base = positive ? Math.min(zeroY, PAD.t + CH) : Math.max(zeroY, PAD.t);
      if (cond && !open) { open = true; d += `M${x},${base} L${x},${y}`; }
      else if (cond) { d += ` L${x},${y}`; }
      else if (open) { open = false; d += ` L${pts[i-1].x},${base} Z`; }
    }
    if (open) d += ` L${pts[pts.length-1].x},${positive ? Math.min(zeroY,PAD.t+CH) : Math.max(zeroY,PAD.t)} Z`;
    return d;
  };

  const fmt = n => {
    const a = Math.abs(n);
    if (a > 9999999) return n > 0 ? '+∞' : '-∞';
    if (a >= 100000) return `${n>0?'+':'-'}₹${(a/100000).toFixed(1)}L`;
    if (a >= 1000)   return `${n>0?'+':'-'}₹${(a/1000).toFixed(1)}k`;
    return `${n>0?'+':'-'}₹${a}`;
  };

  const hoverPnl = useMemo(() => {
    if (hoverX === null) return null;
    const s = range[0] + (hoverX - PAD.l) / CW * (range[range.length-1] - range[0]);
    const sigma = (vix || 15) / 100;
    const T = Math.max(dte, 0.25) / 365;
    let total = 0;
    for (const leg of legs) {
      const entry = bsPrice(spot, leg.k, T, sigma, leg.t);
      const exit  = Math.max(0, leg.t === 'CE' ? s - leg.k : leg.k - s);
      total += leg.q * (exit - entry) * lots * LOT_SIZE;
    }
    return { s: Math.round(s), p: Math.round(total), y: toY(total) };
  }, [hoverX, legs, spot, vix, dte, lots, range]);

  return (
    <div className="spc-chart" onMouseLeave={() => setHoverX(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', cursor:'crosshair' }}
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width * W;
          if (x >= PAD.l && x <= PAD.l + CW) setHoverX(x);
        }}>
        <clipPath id="spc-cl"><rect x={PAD.l} y={PAD.t} width={CW} height={CH}/></clipPath>
        <line x1={PAD.l} y1={zeroY} x2={PAD.l+CW} y2={zeroY}
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="5,4"/>
        <path d={fillPath(true)}  fill="rgba(0,200,150,0.15)" clipPath="url(#spc-cl)"/>
        <path d={fillPath(false)} fill="rgba(255,68,85,0.15)"  clipPath="url(#spc-cl)"/>
        <path d={linePath} fill="none" stroke="#4A9EFF" strokeWidth="2.5"
          strokeLinejoin="round" clipPath="url(#spc-cl)"/>
        {[...new Set(legs.map(l => l.k))].map(k => {
          const kx = toX(k);
          return kx >= PAD.l && kx <= PAD.l+CW ? (
            <line key={k} x1={kx} y1={PAD.t} x2={kx} y2={PAD.t+CH}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2,3"/>
          ) : null;
        })}
        {spotX >= PAD.l && spotX <= PAD.l+CW && (
          <g>
            <line x1={spotX} y1={PAD.t} x2={spotX} y2={PAD.t+CH}
              stroke="rgba(245,158,11,0.5)" strokeWidth="1.5" strokeDasharray="3,3"/>
            <text x={spotX} y={PAD.t-3} textAnchor="middle"
              fill="#F59E0B" fontSize="9" fontFamily="monospace">SPOT</text>
          </g>
        )}
        {breakevens.map((be, i) => {
          const bx = toX(be);
          return bx >= PAD.l && bx <= PAD.l+CW ? (
            <g key={i}>
              <circle cx={bx} cy={zeroY} r="4" fill="#F59E0B" stroke="#08080A" strokeWidth="1.5"/>
              <text x={bx} y={PAD.t+CH+14} textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="monospace">
                {be.toLocaleString('en-IN')}
              </text>
            </g>
          ) : null;
        })}
        {[[maxP,'#00C896'],[0,'rgba(255,255,255,0.2)'],[minP,'#FF4455']].map(([v,c]) => {
          const y = toY(v);
          return y >= PAD.t && y <= PAD.t+CH ? (
            <text key={v} x={PAD.l-6} y={y+4} textAnchor="end" fill={c} fontSize="9" fontFamily="monospace">
              {v === 0 ? '0' : fmt(v)}
            </text>
          ) : null;
        })}
        {hoverX && hoverPnl && (
          <g>
            <line x1={hoverX} y1={PAD.t} x2={hoverX} y2={PAD.t+CH}
              stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
            <circle cx={hoverX} cy={Math.min(Math.max(hoverPnl.y, PAD.t), PAD.t+CH)} r="5"
              fill={hoverPnl.p >= 0 ? '#00C896' : '#FF4455'} stroke="#08080A" strokeWidth="2"/>
            {(() => {
              const tx = hoverX > PAD.l + CW * 0.65 ? hoverX - 106 : hoverX + 8;
              return (
                <g>
                  <rect x={tx} y={22} width={98} height={36} rx="4"
                    fill="#1E1E22" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                  <text x={tx+49} y={35} textAnchor="middle" fill="rgba(255,255,255,0.4)"
                    fontSize="9" fontFamily="monospace">{Math.round(hoverPnl.s).toLocaleString('en-IN')}</text>
                  <text x={tx+49} y={50} textAnchor="middle" fontSize="13" fontWeight="700"
                    fill={hoverPnl.p >= 0 ? '#00C896' : '#FF4455'} fontFamily="monospace">
                    {fmt(hoverPnl.p)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>
      {breakevens.length > 0 && (
        <div className="spc-be-row">
          <span className="spc-be-lbl">BE</span>
          {breakevens.map((be,i) => <span key={i} className="spc-be-val">{be.toLocaleString('en-IN')}</span>)}
        </div>
      )}
    </div>
  );
}

// ── THETA TIMELINE ────────────────────────────────────────────────────────────
function ThetaLine({ legs, spot, vix, dte }) {
  const pts = useMemo(() => {
    const sigma = (vix || 15) / 100;
    const result = [];
    const steps = Math.min(dte * 4, 40);
    for (let i = 0; i <= steps; i++) {
      const d = dte - (dte / steps) * i;
      const T = Math.max(d, 0.1) / 365;
      let val = 0;
      for (const l of legs) val += l.q * bsPrice(spot, l.k, T, sigma, l.t);
      result.push({ d, v: Math.round(val * LOT_SIZE) });
    }
    return result;
  }, [legs, spot, vix, dte]);

  if (pts.length < 2) return null;
  const W = 660, H = 50;
  const PAD = { t: 4, r: 8, b: 18, l: 56 };
  const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;
  const vals = pts.map(p => p.v);
  const maxV = Math.max(...vals), minV = Math.min(...vals);
  const span = Math.max(maxV - minV, 1);
  const toX = d => PAD.l + (1 - d / dte) * CW;
  const toY = v => PAD.t + CH - ((v - minV) / span) * CH;
  const path = pts.map((p,i) => `${i===0?'M':'L'}${toX(p.d).toFixed(1)},${toY(p.v).toFixed(1)}`).join(' ');
  const isCredit = pts[0].v < 0;
  const fmt = n => { const a=Math.abs(n); return a>=100000?`${n>0?'+':'-'}₹${(a/100000).toFixed(1)}L`:a>=1000?`${n>0?'+':'-'}₹${(a/1000).toFixed(0)}k`:`${n>0?'+':'-'}₹${a}`; };

  return (
    <div className="spc-theta">
      <div className="spc-theta-lbl">THETA DECAY · how position value changes over time →</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%' }}>
        <path d={path} fill="none" stroke={isCredit?'#00C896':'#FF4455'} strokeWidth="2" strokeLinejoin="round"/>
        <line x1={toX(dte)} y1={PAD.t} x2={toX(dte)} y2={PAD.t+CH}
          stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="3,2"/>
        <text x={toX(dte)} y={PAD.t+CH+13} textAnchor="middle" fill="#F59E0B" fontSize="8" fontFamily="monospace">NOW</text>
        <text x={toX(0)+2} y={PAD.t+CH+13} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="monospace">EXPIRY</text>
        <text x={PAD.l-4} y={PAD.t+8} textAnchor="end" fill={maxV>=0?'#00C896':'#FF4455'} fontSize="8" fontFamily="monospace">{fmt(maxV)}</text>
        <text x={PAD.l-4} y={PAD.t+CH-2} textAnchor="end" fill={minV>=0?'#00C896':'#FF4455'} fontSize="8" fontFamily="monospace">{fmt(minV)}</text>
      </svg>
    </div>
  );
}

// ── STRATEGY DETAIL ───────────────────────────────────────────────────────────
function StrategyDetail({ strat, spot, vix, dte, onBacktest }) {
  const [lots, setLots] = useState(1);
  const step = spot > 10000 ? 100 : 50;
  const atm  = Math.round(spot / step) * step;
  const w    = step * 2;
  const legs = strat.legs(atm, w);
  const sigma = (vix || 15) / 100;
  const T = Math.max(dte, 0.25) / 365;
  const legPrices = legs.map(l => ({ ...l, price: Math.max(0.5, bsPrice(spot, l.k, T, sigma, l.t)) }));
  const netPrem = legPrices.reduce((s,l) => s + l.q * l.price, 0);
  const isCredit = netPrem < 0;
  const score = calcSetupScore(strat, vix, dte);
  const scoreC = score >= 8 ? '#00C896' : score >= 6 ? '#F59E0B' : '#FF4455';
  const scoreLbl = score >= 8 ? 'Strong setup today' : score >= 6 ? 'Decent conditions' : 'Weak setup today';

  const fmt = n => { const a=Math.abs(n); return a>=100000?`₹${(a/100000).toFixed(1)}L`:a>=1000?`₹${(a/1000).toFixed(1)}k`:`₹${Math.round(a).toLocaleString('en-IN')}`; };

  // Max profit/loss from payoff
  const { maxP, maxL } = useMemo(() => {
    const sigma = (vix||15)/100, T = Math.max(dte,0.25)/365;
    const step2 = spot > 10000 ? 50 : 25;
    const strikes = legs.map(l=>l.k);
    const pnls = [];
    for (let s = Math.min(...strikes)-step2*15; s <= Math.max(...strikes)+step2*15; s += step2) {
      let total = 0;
      for (const l of legs) {
        const entry = bsPrice(spot,l.k,T,sigma,l.t);
        const exit  = Math.max(0,l.t==='CE'?s-l.k:l.k-s);
        total += l.q*(exit-entry)*lots*LOT_SIZE;
      }
      pnls.push(total);
    }
    return { maxP: Math.max(...pnls), maxL: Math.min(...pnls) };
  }, [legs, spot, vix, dte, lots]);

  const isUnlimited = v => Math.abs(v) > 5000000;

  return (
    <div className="spc-detail">
      <div className="spc-dhead">
        <div className="spc-dhead-left">
          <div className="spc-dname">{strat.label}</div>
          <div className="spc-dhook">{strat.hook}</div>
        </div>
        <div className="spc-dscore" style={{ borderColor: scoreC+'40', background: scoreC+'0D' }}>
          <div className="spc-dscore-num" style={{ color: scoreC }}>{score}/10</div>
          <div className="spc-dscore-lbl" style={{ color: scoreC }}>{scoreLbl}</div>
        </div>
      </div>

      {/* Live stats bar */}
      <div className="spc-dstats">
        <div className="spc-dstat">
          <div className="spc-dstat-l">Net {isCredit?'Income':'Cost'}</div>
          <div className="spc-dstat-v" style={{ color: isCredit?'#00C896':'#FF4455' }}>
            {fmt(Math.abs(netPrem * lots * LOT_SIZE))}
          </div>
        </div>
        <div className="spc-dstat">
          <div className="spc-dstat-l">Max Profit</div>
          <div className="spc-dstat-v gain">{isUnlimited(maxP) ? 'Unlimited' : fmt(maxP)}</div>
        </div>
        <div className="spc-dstat">
          <div className="spc-dstat-l">Max Loss</div>
          <div className="spc-dstat-v loss">{isUnlimited(maxL) ? 'Unlimited' : fmt(Math.abs(maxL))}</div>
        </div>
        <div className="spc-dstat">
          <div className="spc-dstat-l">Lots</div>
          <input type="number" value={lots} min={1} step={1} className="spc-lots"
            onChange={e => setLots(Math.max(1,+e.target.value))}/>
        </div>
      </div>

      {/* Legs */}
      <div className="spc-dlegs">
        {legPrices.map((l,i) => (
          <div key={i} className="spc-dleg">
            <span style={{ color: l.q>0?'#4A9EFF':'#F59E0B', fontWeight:700, fontSize:11, fontFamily:'monospace' }}>
              {l.q>0?'BUY':'SELL'}{Math.abs(l.q)>1?` ${Math.abs(l.q)}×`:''}
            </span>
            <span style={{ color: l.t==='CE'?'#FF8090':'#80FFD0', fontWeight:700, fontSize:11, fontFamily:'monospace' }}>
              {l.t==='CE'?'CALL':'PUT'}
            </span>
            <span style={{ color:'var(--text)', fontSize:12, fontFamily:'monospace' }}>{l.k.toLocaleString('en-IN')}</span>
            <span style={{ color:'var(--text2)', fontSize:11 }}>≈ ₹{Math.round(l.price).toLocaleString('en-IN')}</span>
            <span style={{ marginLeft:'auto', color: l.q>0?'#FF4455':'#00C896', fontSize:11, fontFamily:'monospace', fontWeight:600 }}>
              {l.q>0?'-':'+'}₹{fmt(Math.abs(l.q*l.price*lots*LOT_SIZE))}
            </span>
          </div>
        ))}
      </div>

      {/* Payoff */}
      <div className="spc-section-lbl">PAYOFF AT EXPIRY · hover to see P&L at any price</div>
      <PayoffChart legs={legs} spot={spot} vix={vix} dte={dte} lots={lots}/>

      {/* Theta */}
      <ThetaLine legs={legs} spot={spot} vix={vix} dte={dte}/>

      {/* Education */}
      <div className="spc-edu">
        <div className="spc-edu-block">
          <div className="spc-edu-h">WHY IT WORKS</div>
          <div className="spc-edu-t">{strat.why}</div>
        </div>
        <div className="spc-edu-block spc-edu-danger">
          <div className="spc-edu-h">WHAT KILLS IT</div>
          <div className="spc-edu-t">{strat.kill}</div>
        </div>
      </div>

      <button className="spc-bt-btn" onClick={() => onBacktest && onBacktest(strat.id)}>
        Backtest {strat.label} with real data →
      </button>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function StrategyPage({ data, onSwitchToBacktest }) {
  const spot = data?.nifty50?.price ? Math.round(data.nifty50.price) : 23000;
  const vix  = data?.vix?.price || 16;

  // Build expiry options from real dates
  const expiryOptions = useMemo(() => {
    try {
      const exp = getNiftyExpiries();
      const now  = new Date();
      const opts = [];
      const addOpt = (label, dateObj) => {
        if (!dateObj?.date) return;
        try {
          const msLeft = dateObj.date - now;
          const dteVal = Math.max(0, Math.ceil(msLeft / 86400000));
          const d = dateObj.date;
          const fmt = `${d.getDate()} ${d.toLocaleString('en-IN',{month:'short'})}`;
          opts.push({ label: `${label} · ${fmt}`, dte: dteVal, date: fmt });
        } catch (_) {}
      };
      addOpt('Nifty Weekly', exp.niftyWeekly);
      addOpt('Nifty Monthly', exp.niftyMonthly);
      addOpt('Sensex Weekly', exp.sensexWeekly);
      const nw = exp.niftyWeekly?.date;
      if (nw) {
        const w2 = new Date(nw); w2.setDate(w2.getDate() + 7);
        const w3 = new Date(nw); w3.setDate(w3.getDate() + 14);
        const fmt2 = `${w2.getDate()} ${w2.toLocaleString('en-IN',{month:'short'})}`;
        const fmt3 = `${w3.getDate()} ${w3.toLocaleString('en-IN',{month:'short'})}`;
        const dte2 = Math.max(0, Math.ceil((w2 - now) / 86400000));
        const dte3 = Math.max(0, Math.ceil((w3 - now) / 86400000));
        opts.push({ label: `Nifty W+2 · ${fmt2}`, dte: dte2, date: fmt2 });
        opts.push({ label: `Nifty W+3 · ${fmt3}`, dte: dte3, date: fmt3 });
      }
      const sorted = opts.sort((a, b) => a.dte - b.dte);
      return sorted.length > 0 ? sorted : [
        { label: 'Weekly (4d)', dte: 4, date: '' },
        { label: 'Monthly (25d)', dte: 25, date: '' },
      ];
    } catch (_) {
      return [
        { label: 'Weekly (4d)', dte: 4, date: '' },
        { label: 'Monthly (25d)', dte: 25, date: '' },
      ];
    }
  }, []);

  const [filter,      setFilter]      = useState('all');
  const [selectedId,  setSelectedId]  = useState('short_straddle');
  const [compare,     setCompare]     = useState(false);
  const [compareId,   setCompareId]   = useState('short_iron_condor');
  const [expiryIdx,   setExpiryIdx]   = useState(0);

  const dte = expiryOptions[expiryIdx]?.dte ?? 4;
  const expiryLabel = expiryOptions[expiryIdx]?.date ?? '';

  const selectedStrat = ALL_STRATEGIES.find(s => s.id === selectedId) || ALL_STRATEGIES[0];
  const compareStrat  = ALL_STRATEGIES.find(s => s.id === compareId);

  const FILTERS = [
    {id:'all',label:'All'},{id:'bullish',label:'Bullish'},{id:'bearish',label:'Bearish'},
    {id:'neutral',label:'Neutral'},{id:'volatile',label:'Volatile'},
    {id:'income',label:'Premium Intake'},{id:'buying',label:'Buying (Pay Premium)'},
  ];

  const scores = useMemo(() => {
    const m = {};
    ALL_STRATEGIES.forEach(s => { m[s.id] = calcSetupScore(s, vix, dte); });
    return m;
  }, [vix, dte]);

  const topSetups = useMemo(() =>
    ALL_STRATEGIES.filter(s => scores[s.id] >= 8).slice(0, 3),
    [scores]
  );

  const filteredGroups = useMemo(() =>
    STRATEGY_GROUPS.map(g => ({
      ...g,
      strategies: g.strategies.filter(s => {
        if (filter === 'all')    return true;
        if (filter === 'income') return s.credit;
        if (filter === 'buying')  return !s.credit;
        return s.view === filter;
      })
    })).filter(g => g.strategies.length > 0),
    [filter]
  );

  const handleBacktest = useCallback((id) => {
    if (onSwitchToBacktest) onSwitchToBacktest(id);
  }, [onSwitchToBacktest]);

  return (
    <div className="spc-root">
      {/* Top bar */}
      <div className="spc-topbar">
        <div className="spc-pills">
          {[
            ['NIFTY', spot.toLocaleString('en-IN'), null],
            ['VIX', vix.toFixed(1), vix>25?'#FF4455':vix>18?'#F59E0B':'#00C896'],
            ['REGIME', vix<15?'LOW · buy options':vix<20?'NORMAL · mixed':vix<25?'ELEVATED · sell premium':'HIGH · sell premium', '#F59E0B'],
          ].map(([l,v,c]) => (
            <div key={l} className="spc-pill">
              <span className="spc-pill-l">{l}</span>
              <span className="spc-pill-v" style={c?{color:c}:{}}>{v}</span>
            </div>
          ))}
          {/* Expiry selector */}
          <div className="spc-pill spc-expiry-pill">
            <span className="spc-pill-l">EXPIRY</span>
            <select className="spc-expiry-sel" value={expiryIdx}
              onChange={e => setExpiryIdx(+e.target.value)}>
              {expiryOptions.map((o, i) => (
                <option key={i} value={i}>{o.label} ({o.dte}d)</option>
              ))}
            </select>
          </div>
        </div>
        {topSetups.length > 0 && (
          <div className="spc-best">
            <span className="spc-best-l">TODAY'S BEST</span>
            {topSetups.map(s => (
              <button key={s.id} className="spc-best-btn" onClick={() => setSelectedId(s.id)}>
                {s.label} <span style={{color:'#00C896',fontWeight:700}}>{scores[s.id]}/10</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="spc-body">
        {/* Left */}
        <div className="spc-left">
          <div className="spc-filters">
            {FILTERS.map(f => (
              <button key={f.id} className={`spc-fb ${filter===f.id?'spc-fb-on':''}`}
                onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>

          <div className="spc-list">
            {filteredGroups.map(g => (
              <div key={g.id}>
                <div className="spc-glabel">{g.icon} {g.label}</div>
                {g.strategies.map(s => {
                  const sc = scores[s.id];
                  const c  = sc >= 8 ? '#00C896' : sc >= 6 ? '#F59E0B' : 'var(--text3)';
                  return (
                    <div key={s.id}
                      className={`spc-item ${selectedId===s.id?'spc-item-on':''}`}
                      onClick={() => setSelectedId(s.id)}>
                      <div className="spc-item-r1">
                        <span className="spc-item-name">{s.label}</span>
                        <span style={{color:c,fontSize:10,fontFamily:'monospace',fontWeight:700}}>{sc}/10</span>
                      </div>
                      <div className="spc-item-r2">
                        <span style={{color:VIEW_COLORS[s.view],fontSize:10}}>{s.view}</span>
                        <span style={{color:s.credit?'#00C896':'#FF4455',fontSize:10}}>{s.credit?'intake':'buying'}</span>
                        <span style={{color:'var(--text3)',fontSize:9,letterSpacing:2}}>
                          {'●'.repeat(s.complexity)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="spc-cmp-row">
            <button className={`spc-cmp-btn ${compare?'spc-cmp-on':''}`}
              onClick={() => setCompare(v => !v)}>
              {compare ? '✕ Close' : '⇄ Compare'}
            </button>
            {compare && (
              <select className="spc-cmp-sel" value={compareId} onChange={e => setCompareId(e.target.value)}>
                {ALL_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="spc-right">
          {!compare ? (
            <StrategyDetail strat={selectedStrat} spot={spot} vix={vix} dte={dte} onBacktest={handleBacktest}/>
          ) : (
            <div className="spc-cmp-grid">
              <StrategyDetail strat={selectedStrat} spot={spot} vix={vix} dte={dte} onBacktest={handleBacktest}/>
              <div className="spc-cmp-div"/>
              <StrategyDetail strat={compareStrat}  spot={spot} vix={vix} dte={dte} onBacktest={handleBacktest}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
