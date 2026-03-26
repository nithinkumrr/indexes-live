import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// ── BLACK-SCHOLES ─────────────────────────────────────────────────────────────
function norm(x) {
  const t=1/(1+0.2316419*Math.abs(x)),d=0.3989423*Math.exp(-x*x/2);
  const p=d*t*(0.3193815+t*(-0.3565638+t*(1.7814779+t*(-1.8212560+t*1.3302744))));
  return x>=0?1-p:p;
}
const R=0.065;
function bsP(S,K,T,sig,tp){
  if(T<=0)return Math.max(0,tp==='CE'?S-K:K-S);
  const d1=(Math.log(S/K)+(R+sig*sig/2)*T)/(sig*Math.sqrt(T)),d2=d1-sig*Math.sqrt(T);
  return tp==='CE'?S*norm(d1)-K*Math.exp(-R*T)*norm(d2):K*Math.exp(-R*T)*norm(-d2)-S*norm(-d1);
}
function bsDelta(S,K,T,sig,tp){if(T<=0)return tp==='CE'?(S>K?1:0):(S<K?-1:0);const d1=(Math.log(S/K)+(R+sig*sig/2)*T)/(sig*Math.sqrt(T));return tp==='CE'?norm(d1):norm(d1)-1;}
function bsTheta(S,K,T,sig,tp){if(T<=0.001)return 0;const d1=(Math.log(S/K)+(R+sig*sig/2)*T)/(sig*Math.sqrt(T)),d2=d1-sig*Math.sqrt(T),nd1=0.3989423*Math.exp(-d1*d1/2);return tp==='CE'?(-S*nd1*sig/(2*Math.sqrt(T))-R*K*Math.exp(-R*T)*norm(d2))/365:(-S*nd1*sig/(2*Math.sqrt(T))+R*K*Math.exp(-R*T)*norm(-d2))/365;}
function bsGamma(S,K,T,sig){if(T<=0)return 0;const d1=(Math.log(S/K)+(R+sig*sig/2)*T)/(sig*Math.sqrt(T));return 0.3989423*Math.exp(-d1*d1/2)/(S*sig*Math.sqrt(T));}
function bsVega(S,K,T,sig){if(T<=0)return 0;const d1=(Math.log(S/K)+(R+sig*sig/2)*T)/(sig*Math.sqrt(T));return S*0.3989423*Math.exp(-d1*d1/2)*Math.sqrt(T)/100;}

const LOT=75;

// ── STRATEGIES ────────────────────────────────────────────────────────────────
const GROUPS=[
  {id:'bullish',label:'Bullish',icon:'↑',color:'#00C896',strategies:[
    {id:'long_call',label:'Long Call',credit:false,complexity:1,legs:(a,w)=>[{t:'CE',q:1,k:a,p:0}],hook:'Unlimited upside. Loss limited to premium paid.',why:'Best when VIX is low and a strong upward catalyst is coming.',kill:'Time decay kills you if the move is slow. Right direction wrong timing still loses.'},
    {id:'bull_call_spread',label:'Bull Call Spread',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:1,k:a,p:0},{t:'CE',q:-1,k:a+w,p:0}],hook:'Defined risk bull trade. Cheaper than a naked call.',why:'Sell higher strike to reduce cost. Good for moderate bullish views.',kill:'Profit capped at short strike. Misses gains on a big rally.'},
    {id:'bull_put_spread',label:'Bull Put Spread',credit:true,complexity:2,legs:(a,w)=>[{t:'PE',q:-1,k:a,p:0},{t:'PE',q:1,k:a-w,p:0}],hook:'Collect credit and profit if market stays flat or rises.',why:'High probability. Collect premium with defined maximum loss.',kill:'Full loss if market falls through the lower strike.'},
    {id:'call_ratio_backspread',label:'Call Ratio Backspread',credit:false,complexity:3,legs:(a,w)=>[{t:'CE',q:-1,k:a,p:0},{t:'CE',q:2,k:a+w,p:0}],hook:'Explosive profit on a big rally. Near zero cost entry.',why:'Sell 1 ATM call, buy 2 OTM calls. Unlimited upside on a big move.',kill:'Loses if market rises moderately to the short strike at expiry.'},
    {id:'synthetic_long',label:'Synthetic Long Future',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:1,k:a,p:0},{t:'PE',q:-1,k:a,p:0}],hook:'Acts like long futures using options.',why:'Futures-like exposure with options flexibility.',kill:'Unlimited downside exactly like a futures position.'},
    {id:'short_put',label:'Short Put',credit:true,complexity:2,legs:(a,w)=>[{t:'PE',q:-1,k:a-w,p:0}],hook:'Get paid to be bullish. Income in calm markets.',why:'Collect premium and profit if market stays flat or rises.',kill:'Sharp fall below strike wipes multiple weeks of gains.'},
    {id:'bull_butterfly',label:'Bull Butterfly',credit:false,complexity:3,legs:(a,w)=>[{t:'CE',q:1,k:a-w,p:0},{t:'CE',q:-2,k:a,p:0},{t:'CE',q:1,k:a+w,p:0}],hook:'Tiny cost, huge reward if market pins at strike.',why:'Very cheap. Maximum profit if market expires at the middle strike.',kill:'Narrow profit zone. Needs precise view on expiry level.'},
  ]},
  {id:'bearish',label:'Bearish',icon:'↓',color:'#FF4455',strategies:[
    {id:'long_put',label:'Long Put',credit:false,complexity:1,legs:(a,w)=>[{t:'PE',q:1,k:a,p:0}],hook:'Best portfolio hedge. Profits multiply on crashes.',why:'Cheap insurance before uncertain events.',kill:'Slow grind down rarely pays. Needs fast sharp move.'},
    {id:'bear_put_spread',label:'Bear Put Spread',credit:false,complexity:2,legs:(a,w)=>[{t:'PE',q:1,k:a,p:0},{t:'PE',q:-1,k:a-w,p:0}],hook:'Defined risk bear trade. Cheaper than a naked put.',why:'Sell lower strike to reduce cost. Good for moderate bearish views.',kill:'Profit capped if market falls sharply beyond the short strike.'},
    {id:'bear_call_spread',label:'Bear Call Spread',credit:true,complexity:2,legs:(a,w)=>[{t:'CE',q:-1,k:a,p:0},{t:'CE',q:1,k:a+w,p:0}],hook:'Collect credit and profit if market stays flat or falls.',why:'High probability bearish trade with defined risk.',kill:'Full loss if market rallies through the upper strike.'},
    {id:'put_ratio_backspread',label:'Put Ratio Backspread',credit:false,complexity:3,legs:(a,w)=>[{t:'PE',q:-1,k:a,p:0},{t:'PE',q:2,k:a-w,p:0}],hook:'Explosive profit on a crash. Near zero cost entry.',why:'Sell 1 ATM put, buy 2 OTM puts. Unlimited downside profit.',kill:'Loses if market falls moderately to the short strike at expiry.'},
    {id:'synthetic_short',label:'Synthetic Short Future',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:-1,k:a,p:0},{t:'PE',q:1,k:a,p:0}],hook:'Acts like short futures. Profit from any sustained fall.',why:'Bearish futures-like exposure with options flexibility.',kill:'Unlimited loss if market rises sharply.'},
    {id:'short_call',label:'Short Call',credit:true,complexity:2,legs:(a,w)=>[{t:'CE',q:-1,k:a+w,p:0}],hook:'Collect premium weekly. Profit from time decay.',why:'Works 60-65% of weeks historically.',kill:'Unlimited loss if market gaps up. Always use stop loss.'},
    {id:'bear_butterfly',label:'Bear Butterfly',credit:false,complexity:3,legs:(a,w)=>[{t:'PE',q:1,k:a+w,p:0},{t:'PE',q:-2,k:a,p:0},{t:'PE',q:1,k:a-w,p:0}],hook:'Tiny cost, high reward if market falls to target.',why:'Very cheap bearish bet with defined risk.',kill:'Narrow profit zone. Needs precise bearish expiry level.'},
  ]},
  {id:'neutral',label:'Neutral',icon:'↔',color:'#F59E0B',strategies:[
    {id:'short_straddle',label:'Short Straddle',credit:true,complexity:3,legs:(a,w)=>[{t:'CE',q:-1,k:a,p:0},{t:'PE',q:-1,k:a,p:0}],hook:'Most popular Indian strategy. High win rate, painful when wrong.',why:'61-72% profitable weekly. Best when VIX is elevated and expected to fall.',kill:'2% gap in either direction wipes 3-4 weeks of premium. Budget, elections, RBI.'},
    {id:'short_strangle',label:'Short Strangle',credit:true,complexity:3,legs:(a,w)=>[{t:'CE',q:-1,k:a+w,p:0},{t:'PE',q:-1,k:a-w,p:0}],hook:'Wider cushion than straddle. Collect from both sides.',why:'Higher probability than straddle. Market has to move further to hurt you.',kill:'Still unlimited risk. A black swan event destroys the trade instantly.'},
    {id:'short_iron_condor',label:'Short Iron Condor',credit:true,complexity:4,legs:(a,w)=>[{t:'PE',q:1,k:a-w*2,p:0},{t:'PE',q:-1,k:a-w,p:0},{t:'CE',q:-1,k:a+w,p:0},{t:'CE',q:1,k:a+w*2,p:0}],hook:'The professional income machine. Defined risk, consistent returns.',why:'4 legs give defined max loss. Works 65-70% of weeks.',kill:'Big directional move breaks one side. Manage early when wing is threatened.'},
    {id:'iron_butterfly',label:'Iron Butterfly',credit:true,complexity:4,legs:(a,w)=>[{t:'PE',q:1,k:a-w,p:0},{t:'PE',q:-1,k:a,p:0},{t:'CE',q:-1,k:a,p:0},{t:'CE',q:1,k:a+w,p:0}],hook:'Maximum premium at exact strike.',why:'Higher premium than iron condor but needs market to pin near your strike.',kill:'Narrow profit zone. Any significant move hurts.'},
    {id:'jade_lizard',label:'Jade Lizard',credit:true,complexity:3,legs:(a,w)=>[{t:'PE',q:-1,k:a-w,p:0},{t:'CE',q:-1,k:a+w,p:0},{t:'CE',q:1,k:a+w*2,p:0}],hook:'No upside risk. Collect premium from both sides.',why:'Sell put + call spread. Call spread caps upside risk.',kill:'Sharp fall below put strike is the main risk.'},
    {id:'reverse_jade_lizard',label:'Reverse Jade Lizard',credit:true,complexity:3,legs:(a,w)=>[{t:'CE',q:-1,k:a+w,p:0},{t:'PE',q:-1,k:a-w,p:0},{t:'PE',q:1,k:a-w*2,p:0}],hook:'No downside risk. Collect premium with capped downside loss.',why:'Sell call + put spread. No downside risk if credit exceeds spread width.',kill:'Large upward move above call strike is the main risk.'},
    {id:'long_call_butterfly',label:'Long Call Butterfly',credit:false,complexity:3,legs:(a,w)=>[{t:'CE',q:1,k:a-w,p:0},{t:'CE',q:-2,k:a,p:0},{t:'CE',q:1,k:a+w,p:0}],hook:'Tiny cost, huge reward if market pins at strike.',why:'Risk small to make large if Nifty expires at your target.',kill:'Narrow profit zone. Must be precise on expiry level.'},
    {id:'long_put_butterfly',label:'Long Put Butterfly',credit:false,complexity:3,legs:(a,w)=>[{t:'PE',q:1,k:a-w,p:0},{t:'PE',q:-2,k:a,p:0},{t:'PE',q:1,k:a+w,p:0}],hook:'Same butterfly structure using puts.',why:'Alternative to call butterfly. Sometimes better pricing on put side.',kill:'Same narrow profit zone. Must be precise.'},
  ]},
  {id:'volatile',label:'Volatile',icon:'⚡',color:'#4A9EFF',strategies:[
    {id:'long_straddle',label:'Long Straddle',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:1,k:a,p:0},{t:'PE',q:1,k:a,p:0}],hook:'Bet on chaos. Profit from any big move either way.',why:'Before RBI, Budget, elections when direction is uncertain.',kill:'Flat market loses both premiums. Every day costs you.'},
    {id:'long_strangle',label:'Long Strangle',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:1,k:a+w,p:0},{t:'PE',q:1,k:a-w,p:0}],hook:'Cheaper than straddle. Needs bigger move but costs less.',why:'When you expect large event-driven move but want lower cost.',kill:'Needs even bigger move than straddle. Both legs can expire worthless.'},
    {id:'long_iron_condor',label:'Long Iron Condor',credit:false,complexity:4,legs:(a,w)=>[{t:'PE',q:-1,k:a-w*2,p:0},{t:'PE',q:1,k:a-w,p:0},{t:'CE',q:1,k:a+w,p:0},{t:'CE',q:-1,k:a+w*2,p:0}],hook:'Profit from a big breakout with defined risk.',why:'Defined risk way to bet on large event-driven moves.',kill:'If market stays in range all 4 legs expire worthless.'},
    {id:'long_iron_butterfly',label:'Long Iron Butterfly',credit:false,complexity:3,legs:(a,w)=>[{t:'PE',q:-1,k:a-w,p:0},{t:'PE',q:1,k:a,p:0},{t:'CE',q:1,k:a,p:0},{t:'CE',q:-1,k:a+w,p:0}],hook:'Cheap volatility bet with defined maximum loss.',why:'Lower cost than straddle with defined risk.',kill:'Needs significant move to profit. Time decay hurts both long legs.'},
    {id:'strap',label:'Strap',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:2,k:a,p:0},{t:'PE',q:1,k:a,p:0}],hook:'Bullish volatility. Double profit on upward moves.',why:'Buy 2 calls + 1 put. Double profit on a rally.',kill:'Time decay kills 3 legs. Needs large move.'},
    {id:'strip',label:'Strip',credit:false,complexity:2,legs:(a,w)=>[{t:'CE',q:1,k:a,p:0},{t:'PE',q:2,k:a,p:0}],hook:'Bearish volatility. Double profit on downward moves.',why:'Buy 1 call + 2 puts. Double profit on a crash.',kill:'Time decay kills 3 legs. Needs large downward move.'},
    {id:'call_ratio_spread',label:'Call Ratio Spread',credit:true,complexity:3,legs:(a,w)=>[{t:'CE',q:1,k:a,p:0},{t:'CE',q:-2,k:a+w,p:0}],hook:'Collect credit with potential for large profit.',why:'Buy 1 call, sell 2 higher calls. Profits if market stays flat.',kill:'Unlimited loss on a very large rally. Needs stop loss.'},
    {id:'put_ratio_spread',label:'Put Ratio Spread',credit:true,complexity:3,legs:(a,w)=>[{t:'PE',q:1,k:a,p:0},{t:'PE',q:-2,k:a-w,p:0}],hook:'Collect credit with potential profit on a crash.',why:'Buy 1 put, sell 2 lower puts. Profits if market stays flat.',kill:'Unlimited loss on a sharp fall. Must be managed actively.'},
  ]},
];

const ALL=GROUPS.flatMap(g=>g.strategies.map(s=>({...s,gid:g.id,gLabel:g.label,gColor:g.color})));

function calcScore(s,vix,dte){
  let sc=5;
  if(s.gid==='neutral'){if(vix>18)sc+=2;if(vix>25)sc+=1;if(dte<=2)sc+=1;if(dte<=1)sc+=1;}
  else if(s.gid==='volatile'){if(vix<15)sc+=2;if(dte>=2&&dte<=7)sc+=2;}
  else{if(vix<18)sc+=1;if(dte>=5)sc+=1;}
  if(s.credit&&vix>20)sc+=1;
  return Math.min(10,Math.max(1,sc));
}

// ── STORAGE HELPERS ───────────────────────────────────────────────────────────
const LS_KEY = 'spc_last_session';

function saveSession(stratId, legs) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    saved[stratId] = { legs, ts: Date.now() };
    localStorage.setItem(LS_KEY, JSON.stringify(saved));
  } catch(_) {}
}

function loadSession(stratId) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const s = saved[stratId];
    if (s && Date.now() - s.ts < 86400000 * 7) return s.legs; // 7 days
  } catch(_) {}
  return null;
}

// ── URL SHARE HELPERS ─────────────────────────────────────────────────────────
function buildShareUrl(stratId, legs, lots, spot, expiry) {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams({
    s: stratId,
    l: lots,
    sp: spot,
    ex: expiry || '',
    legs: JSON.stringify(legs.map(l => ({ t: l.t, q: l.q, k: l.k, p: Math.round(l.p) }))),
  });
  return `${base}?${params}#fno`;
}

function parseShareUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (!p.get('s')) return null;
    return {
      stratId: p.get('s'),
      lots: parseInt(p.get('l')) || 1,
      spot: parseInt(p.get('sp')) || null,
      expiry: p.get('ex') || '',
      legs: JSON.parse(p.get('legs') || 'null'),
    };
  } catch(_) { return null; }
}

// ── PAYOFF CHART ──────────────────────────────────────────────────────────────
function PayoffChart({ legs, spot, vix, dte, lots, symbol }) {
  const [tSpot, setTSpot] = useState(spot);
  const [tDte,  setTDte]  = useState(dte);
  const [hx, setHx] = useState(null);
  useEffect(() => setTSpot(spot), [spot]);
  useEffect(() => setTDte(dte), [dte]);

  const sig = (vix || 15) / 100;
  const spotStep = spot > 10000 ? 50 : 10;

  const { range, expPnls, nowPnls, bes, maxP, minP } = useMemo(() => {
    const st = spot > 10000 ? 50 : 25;
    const ks = legs.map(l => l.k);
    const pad = Math.max(...ks) - Math.min(...ks) + st * 14;
    const fr = Math.min(...ks, spot) - pad / 2;
    const to = Math.max(...ks, spot) + pad / 2;
    const range = []; for (let s = fr; s <= to; s += st) range.push(Math.round(s));
    const T0 = Math.max(dte, 0.25) / 365;
    const T1 = Math.max(tDte, 0.01) / 365;
    const expPnls = range.map(s => {
      let t = 0;
      legs.forEach(l => { t += l.q * (Math.max(0, l.t==='CE'?s-l.k:l.k-s) - l.p) * lots * LOT; });
      return Math.round(t);
    });
    const nowPnls = range.map(s => {
      let t = 0;
      legs.forEach(l => { t += l.q * (bsP(s, l.k, T1, sig, l.t) - l.p) * lots * LOT; });
      return Math.round(t);
    });
    const bes = [];
    for (let i = 0; i < expPnls.length - 1; i++) {
      if ((expPnls[i] < 0 && expPnls[i+1] >= 0) || (expPnls[i] >= 0 && expPnls[i+1] < 0)) {
        const f = -expPnls[i] / (expPnls[i+1] - expPnls[i]);
        bes.push(Math.round(range[i] + f * (range[i+1] - range[i])));
      }
    }
    const all = [...expPnls, ...nowPnls];
    return { range, expPnls, nowPnls, bes, maxP: Math.max(...all, 0), minP: Math.min(...all, 0) };
  }, [legs, spot, vix, dte, lots, tDte, sig]);

  const W = 660, H = 200, PAD = { t: 28, r: 20, b: 38, l: 64 };
  const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;
  const span = Math.max(maxP - minP, 1);
  const toX = s => PAD.l + ((s - range[0]) / (range[range.length-1] - range[0])) * CW;
  const toY = p => PAD.t + CH - ((p - minP) / span) * CH;
  const zy = toY(0), sx = toX(spot), tsx = toX(tSpot);

  // Smooth bezier path
  const mkSmooth = arr => {
    const pts = range.map((s,i) => [toX(s), toY(arr[i])]);
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i-1][0] + pts[i][0]) / 2;
      d += ` C${cp1x},${pts[i-1][1]} ${cp1x},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`;
    }
    return d;
  };

  const fillSmooth = (arr, pos) => {
    const pts = range.map((s,i) => [toX(s), toY(arr[i])]);
    const base = pos ? Math.min(zy, PAD.t+CH) : Math.max(zy, PAD.t);
    let inside = false, d = '';
    const segs = [];
    let cur = [];
    pts.forEach(([x,y], i) => {
      const p = arr[i];
      if ((pos ? p >= 0 : p < 0)) { if (!inside) { inside=true; cur=[]; } cur.push([x,y]); }
      else if (inside) { inside=false; segs.push(cur); cur=[]; }
    });
    if (inside && cur.length) segs.push(cur);
    segs.forEach(seg => {
      if (seg.length < 1) return;
      d += `M${seg[0][0]},${base}`;
      seg.forEach(([x,y]) => { d += ` L${x},${y}`; });
      d += ` L${seg[seg.length-1][0]},${base} Z`;
    });
    return d;
  };

  const sd1 = Math.round(spot * (vix/100) * Math.sqrt(Math.max(dte,1)/365));

  // Hover P&L
  const hvPnl = useMemo(() => {
    if (hx === null) return null;
    const s = range[0] + (hx - PAD.l) / CW * (range[range.length-1] - range[0]);
    const T1 = Math.max(tDte, 0.01) / 365;
    let ex = 0, nw = 0;
    legs.forEach(l => {
      ex += l.q * (Math.max(0, l.t==='CE'?s-l.k:l.k-s) - l.p) * lots * LOT;
      nw += l.q * (bsP(s, l.k, T1, sig, l.t) - l.p) * lots * LOT;
    });
    return { s: Math.round(s), ex: Math.round(ex), nw: Math.round(nw) };
  }, [hx, legs, spot, vix, dte, lots, tDte, sig, range]);

  const nowIdx = range.reduce((b,s,i) => Math.abs(s-tSpot)<Math.abs(range[b]-tSpot)?i:b, 0);
  const nowPnl = nowPnls[nowIdx] || 0;
  const spotPnl = nowPnls[range.reduce((b,s,i) => Math.abs(s-spot)<Math.abs(range[b]-spot)?i:b, 0)] || 0;
  const pctChange = spot > 0 ? ((tSpot - spot) / spot * 100).toFixed(1) : '0.0';
  const totalCost = legs.reduce((s,l) => s + Math.abs(l.q * l.p * lots * LOT), 0);

  const fmt = n => {
    const a = Math.abs(n);
    if (a > 9999999) return n > 0 ? '+∞' : '-∞';
    if (a >= 100000) return `${n>=0?'+':'-'}₹${(a/100000).toFixed(1)}L`;
    if (a >= 1000)   return `${n>=0?'+':'-'}₹${(a/1000).toFixed(1)}k`;
    return `${n>=0?'+':'-'}₹${Math.round(a)}`;
  };

  const expPath = mkSmooth(expPnls);
  const nowPath = mkSmooth(nowPnls);

  return (
    <div className="spc-chart-outer">
      {/* Chart */}
      <div className="spc-chart" onMouseLeave={() => setHx(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', cursor:'crosshair' }}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width * W;
            if (x >= PAD.l && x <= PAD.l+CW) setHx(x);
          }}>
          <defs>
            <clipPath id="pc3cl"><rect x={PAD.l} y={PAD.t} width={CW} height={CH}/></clipPath>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C896" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#00C896" stopOpacity="0.05"/>
            </linearGradient>
            <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4455" stopOpacity="0.05"/>
              <stop offset="100%" stopColor="#FF4455" stopOpacity="0.2"/>
            </linearGradient>
          </defs>

          {/* SD zones */}
          {[sd1, sd1*2].map((sd,i) => {
            const x1=toX(spot-sd), x2=toX(spot+sd);
            return <rect key={i} x={Math.max(PAD.l,x1)} y={PAD.t} width={Math.min(PAD.l+CW,x2)-Math.max(PAD.l,x1)} height={CH} fill={`rgba(255,255,255,${0.02-i*0.007})`}/>;
          })}

          {/* SD labels */}
          {['-2SD','-1SD','+1SD','+2SD'].map((lbl,i) => {
            const sds = [-sd1*2,-sd1,sd1,sd1*2];
            const x = toX(spot+sds[i]);
            return x>=PAD.l&&x<=PAD.l+CW ? <text key={i} x={x} y={PAD.t-8} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">{lbl}</text> : null;
          })}

          {/* Zero line */}
          {zy>=PAD.t&&zy<=PAD.t+CH&&<line x1={PAD.l} y1={zy} x2={PAD.l+CW} y2={zy} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>}

          {/* Green fill above zero */}
          <path d={fillSmooth(expPnls,true)} fill="url(#greenGrad)" clipPath="url(#pc3cl)"/>
          {/* Red fill below zero */}
          <path d={fillSmooth(expPnls,false)} fill="url(#redGrad)" clipPath="url(#pc3cl)"/>

          {/* Strike lines */}
          {[...new Set(legs.map(l=>l.k))].map(k => {
            const kx=toX(k);
            return kx>=PAD.l&&kx<=PAD.l+CW?<line key={k} x1={kx} y1={PAD.t} x2={kx} y2={PAD.t+CH} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3,3"/>:null;
          })}

          {/* Today line (blue) */}
          <path d={nowPath} fill="none" stroke="#4A9EFF" strokeWidth="2" strokeLinejoin="round" clipPath="url(#pc3cl)"/>

          {/* Expiry line (green) */}
          <path d={expPath} fill="none" stroke="#00C896" strokeWidth="2.5" strokeLinejoin="round" clipPath="url(#pc3cl)"/>

          {/* Breakevens */}
          {bes.map((be,i) => {
            const bx=toX(be);
            return bx>=PAD.l&&bx<=PAD.l+CW?<g key={i}>
              <circle cx={bx} cy={zy} r="5" fill="#F59E0B" stroke="#0A0A0F" strokeWidth="2"/>
              <text x={bx} y={PAD.t+CH+14} textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="monospace">{be.toLocaleString('en-IN')}</text>
            </g>:null;
          })}

          {/* Spot line */}
          {sx>=PAD.l&&sx<=PAD.l+CW&&<g>
            <line x1={sx} y1={PAD.t} x2={sx} y2={PAD.t+CH} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
            <text x={sx} y={PAD.t-8} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">SPOT</text>
          </g>}

          {/* Target line */}
          {tsx>=PAD.l&&tsx<=PAD.l+CW&&Math.abs(tsx-sx)>3&&<g>
            <line x1={tsx} y1={PAD.t} x2={tsx} y2={PAD.t+CH} stroke="rgba(74,158,255,0.5)" strokeWidth="1.5" strokeDasharray="4,3"/>
          </g>}

          {/* Y-axis */}
          {[[maxP,'#00C896'],[0,'rgba(255,255,255,0.2)'],[minP,'#FF4455']].map(([v,col]) => {
            const y = toY(v);
            return y>=PAD.t&&y<=PAD.t+CH ? <g key={v}>
              <line x1={PAD.l-3} y1={y} x2={PAD.l} y2={y} stroke={col} strokeWidth="1"/>
              <text x={PAD.l-6} y={y+4} textAnchor="end" fill={col} fontSize="9" fontFamily="monospace">
                {v===0?'0':fmt(v).replace('+','').replace('-','')}
              </text>
            </g>:null;
          })}

          {/* Legend */}
          <line x1={PAD.l+2} y1={12} x2={PAD.l+18} y2={12} stroke="#00C896" strokeWidth="2.5"/>
          <text x={PAD.l+21} y={16} fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">At expiry</text>
          <line x1={PAD.l+72} y1={12} x2={PAD.l+88} y2={12} stroke="#4A9EFF" strokeWidth="2"/>
          <text x={PAD.l+91} y={16} fill="rgba(74,158,255,0.6)" fontSize="8" fontFamily="monospace">Today ({tDte}d left)</text>

          {/* Hover */}
          {hx&&hvPnl&&hx>=PAD.l&&hx<=PAD.l+CW&&<g>
            <line x1={hx} y1={PAD.t} x2={hx} y2={PAD.t+CH} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
            <circle cx={hx} cy={Math.min(Math.max(toY(hvPnl.ex),PAD.t),PAD.t+CH)} r="4" fill="#00C896" stroke="#0A0A0F" strokeWidth="2"/>
            {(() => {
              const tx2 = hx > PAD.l+CW*0.6 ? hx-148 : hx+10;
              const pct = spot > 0 ? ((hvPnl.s-spot)/spot*100).toFixed(1) : '0';
              return <g>
                <rect x={tx2} y={PAD.t+4} width={138} height={54} rx="6" fill="#13131F" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
                <text x={tx2+8} y={PAD.t+18} fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">{hvPnl.s.toLocaleString('en-IN')} ({pct}%)</text>
                <text x={tx2+8} y={PAD.t+34} fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="monospace">At expiry:</text>
                <text x={tx2+130} y={PAD.t+34} textAnchor="end" fontSize="11" fontWeight="700" fill={hvPnl.ex>=0?'#00C896':'#FF4455'} fontFamily="monospace">{fmt(hvPnl.ex)}</text>
                <text x={tx2+8} y={PAD.t+49} fill="rgba(74,158,255,0.5)" fontSize="9" fontFamily="monospace">Today:</text>
                <text x={tx2+130} y={PAD.t+49} textAnchor="end" fontSize="11" fontWeight="700" fill={hvPnl.nw>=0?'#4A9EFF':'#FF8080'} fontFamily="monospace">{fmt(hvPnl.nw)}</text>
              </g>;
            })()}
          </g>}

          {/* Projected P&L pill at target */}
          {tsx>=PAD.l&&tsx<=PAD.l+CW&&nowPnl!==0&&<g>
            {(() => {
              const py = Math.min(Math.max(toY(nowPnl)-20, PAD.t), PAD.t+CH-30);
              const pct2 = totalCost > 0 ? ((nowPnl/totalCost)*100).toFixed(1)+'%' : '';
              const lbl = `${nowPnl>=0?'Profit':'Loss'}: ${fmt(nowPnl)}${pct2?' ('+pct2+')':''}`;
              const pw = Math.min(lbl.length * 6.5 + 16, 200);
              return <g>
                <rect x={tsx-pw/2} y={py} width={pw} height={20} rx="10"
                  fill={nowPnl>=0?'rgba(0,200,150,.85)':'rgba(255,68,85,.85)'} stroke="none"/>
                <text x={tsx} y={py+13} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700" fontFamily="monospace">{lbl}</text>
              </g>;
            })()}
          </g>}
        </svg>
      </div>

      {/* Sensibull-style sliders */}
      <div className="spc-sliders-modern">
        <div className="spc-slider-group">
          <div className="spc-slider-top">
            <span className="spc-sl-title">{symbol || 'NIFTY'} Target</span>
            <span className="spc-sl-pct" style={{color:tSpot>=spot?'#00C896':'#FF4455'}}>{tSpot>=spot?'+':''}{pctChange}%</span>
            <button className="spc-sl-step" onClick={()=>setTSpot(v=>Math.max(range[0],v-spotStep))}>−</button>
            <input type="number" value={tSpot} step={spotStep}
              className="spc-sl-num"
              onChange={e=>setTSpot(Math.max(range[0],Math.min(range[range.length-1],+e.target.value)))}/>
            <button className="spc-sl-step" onClick={()=>setTSpot(v=>Math.min(range[range.length-1],v+spotStep))}>+</button>
            <button className="spc-sl-reset-sm" onClick={()=>setTSpot(spot)}>Reset</button>
          </div>
          <input type="range" min={range[0]} max={range[range.length-1]} step={spotStep}
            value={tSpot} onChange={e=>setTSpot(+e.target.value)} className="spc-slider-full"/>
        </div>

        <div className="spc-slider-group">
          <div className="spc-slider-top">
            <span className="spc-sl-title">Date: {tDte}D to expiry</span>
            <button className="spc-sl-step" onClick={()=>setTDte(v=>Math.max(0,v-1))}>‹</button>
            <span className="spc-sl-datestr" style={{color:'var(--text2)',fontSize:11,fontFamily:'monospace',minWidth:60,textAlign:'center'}}>
              {tDte === dte ? 'Today' : tDte === 0 ? 'Expiry' : `${tDte}d left`}
            </span>
            <button className="spc-sl-step" onClick={()=>setTDte(v=>Math.min(dte,v+1))}>›</button>
            <button className="spc-sl-reset-sm" onClick={()=>setTDte(dte)}>Reset</button>
          </div>
          <input type="range" min={0} max={dte} step={1}
            value={tDte} onChange={e=>setTDte(+e.target.value)} className="spc-slider-full"/>
          <div className="spc-slider-dates">
            <span>Today</span><span>Expiry</span>
          </div>
        </div>
      </div>

      {/* P&L summary bar */}
      <div className="spc-pnl-bar">
        <span className="spc-pnl-lbl">At {tSpot.toLocaleString('en-IN')} · {tDte}d left:</span>
        <span className="spc-pnl-val" style={{color:nowPnl>=0?'#00C896':'#FF4455'}}>{fmt(nowPnl)}</span>
        {bes.length>0&&<span className="spc-pnl-be">BE: {bes.map(b=>b.toLocaleString('en-IN')).join(' / ')}</span>}
      </div>
    </div>
  );
}

// ── GREEKS ────────────────────────────────────────────────────────────────────
function Greeks({ legs, spot, vix, dte, lots }) {
  const sig=(vix||15)/100, T=Math.max(dte,0.25)/365;
  const g = useMemo(() => {
    let d=0, th=0, ga=0, v=0;
    legs.forEach(l => {
      d  += l.q * bsDelta(spot, l.k, T, sig, l.t) * lots * LOT;
      th += l.q * bsTheta(spot, l.k, T, sig, l.t) * lots * LOT;
      ga += l.q * bsGamma(spot, l.k, T, sig) * lots * LOT;
      v  += l.q * bsVega(spot, l.k, T, sig) * lots * LOT;
    });
    return { d: Math.round(d*100)/100, th: Math.round(th*100)/100, ga: Math.round(ga*10000)/10000, v: Math.round(v*100)/100 };
  }, [legs, spot, vix, dte, lots]);

  const rows = [
    ['Delta', g.d.toFixed(2), '', `₹${Math.abs(g.d*1).toFixed(0)} P&L per 1pt Nifty move`, g.d>0?'#00C896':g.d<0?'#FF4455':'var(--text2)'],
    ['Theta', g.th.toFixed(0), '/day', `Loses ₹${Math.abs(g.th).toFixed(0)} per day from time decay`, g.th>0?'#00C896':'#FF4455'],
    ['Gamma', g.ga.toFixed(4), '', `Delta changes by ${Math.abs(g.ga).toFixed(4)} per 1pt move`, 'var(--text2)'],
    ['Vega',  g.v.toFixed(0),  '/1%IV', `₹${Math.abs(g.v).toFixed(0)} P&L per 1% IV change`, g.v>0?'#4A9EFF':'#F59E0B'],
  ];

  return (
    <div className="spc-greeks">
      {rows.map(([n,val,unit,desc,c]) => (
        <div key={n} className="spc-greek">
          <div className="spc-greek-top"><span className="spc-greek-name">{n}</span><span className="spc-greek-val" style={{color:c}}>{val}{unit}</span></div>
          <div className="spc-greek-desc">{desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function Detail({ strat, spot, vix, dte, expiry, lots, setLots, onBT, onShare, sharedFrom }) {
  const step = spot > 10000 ? 100 : 50;
  const atm  = Math.round(spot / step) * step;
  const w    = step * 2;

  // Init legs — check URL share, then localStorage, then default
  const [legs, setLegs] = useState(() => {
    if (sharedFrom?.stratId === strat.id && sharedFrom?.legs) return sharedFrom.legs;
    const saved = loadSession(strat.id);
    if (saved) return saved;
    return strat.legs(atm, w);
  });

  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPremiumHint, setShowPremiumHint] = useState(false);

  // Reset when strategy changes
  useEffect(() => {
    if (sharedFrom?.stratId === strat.id && sharedFrom?.legs) {
      setLegs(sharedFrom.legs);
      return;
    }
    const s = loadSession(strat.id);
    setLegs(s || strat.legs(atm, w));
  }, [strat.id]);

  // Auto-save when legs change
  useEffect(() => {
    saveSession(strat.id, legs);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [legs]);

  const updK = (i, val) => setLegs(p => p.map((l,j) => j===i ? {...l, k: Math.round(+val/step)*step} : l));
  const updP = (i, val) => setLegs(p => p.map((l,j) => j===i ? {...l, p: Math.max(0, +val)} : l));
  const resetLegs = () => setLegs(strat.legs(atm, w));
  const resetPremiums = () => {
    const sig = (vix||15)/100, T = Math.max(dte,0.25)/365;
    setLegs(p => p.map(l => ({ ...l, p: Math.round(bsP(spot, l.k, T, sig, l.t)) })));
  };

  const net = legs.reduce((s,l) => s + l.q * l.p, 0);
  const isC = net < 0;
  const sc = calcScore(strat, vix, dte);
  const scoreC = sc>=8?'#00C896':sc>=6?'#F59E0B':'#FF4455';
  const fmt = n => { const a=Math.abs(n); return a>=100000?`${(a/100000).toFixed(1)}L`:a>=1000?`${(a/1000).toFixed(1)}k`:`${Math.round(a).toLocaleString('en-IN')}`; };
  const fmtRs = n => `₹${fmt(n)}`;

  const { maxP, maxL } = useMemo(() => {
    const s2 = spot > 10000 ? 50 : 25, ks = legs.map(l=>l.k), ps = [];
    for (let s = Math.min(...ks)-s2*15; s <= Math.max(...ks)+s2*15; s += s2) {
      let t = 0; legs.forEach(l => { t += l.q * (Math.max(0,l.t==='CE'?s-l.k:l.k-s) - l.p) * lots * LOT; }); ps.push(t);
    }
    return { maxP: Math.max(...ps), maxL: Math.min(...ps) };
  }, [legs, lots]);

  const iu = v => Math.abs(v) > 5000000;

  const handleShare = () => {
    const url = buildShareUrl(strat.id, legs, lots, spot, expiry);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    if (onShare) onShare();
  };

  const lastSession = loadSession(strat.id);
  const hasLastSession = lastSession && lastSession.some(l => l.p > 0);

  return (
    <div className="spc-detail">
      {/* Banners */}
      {hasLastSession && (
        <div className="spc-session-banner">
          <span>📋 Restored your last session</span>
          <button onClick={resetLegs} className="spc-session-reset">Reset</button>
        </div>
      )}
      {sharedFrom?.stratId === strat.id && (
        <div className="spc-share-banner"><span>🔗 Someone shared this setup with you</span></div>
      )}

      {/* Header row */}
      <div className="spc-dhead">
        <div>
          <div className="spc-dname">{strat.label}</div>
          <div className="spc-dhook">{strat.hook}</div>
        </div>
        <div className="spc-dscore" style={{borderColor:scoreC+'40',background:scoreC+'0D'}}>
          <div className="spc-dscore-num" style={{color:scoreC}}>{sc}/10</div>
          <div className="spc-dscore-lbl" style={{color:scoreC}}>{sc>=8?'Strong':sc>=6?'Decent':'Weak'}</div>
        </div>
      </div>

      {/* Highlighted key stats */}
      <div className="spc-hero-stats">
        <div className="spc-hero-stat spc-hero-net" style={{borderColor:isC?'rgba(0,200,150,.3)':'rgba(255,68,85,.3)',background:isC?'rgba(0,200,150,.06)':'rgba(255,68,85,.06)'}}>
          <div className="spc-hero-lbl">Net {isC?'Collected':'Cost'}</div>
          <div className="spc-hero-val" style={{color:isC?'#00C896':'#FF4455'}}>{net===0?'—':fmtRs(Math.abs(net*lots*LOT))}</div>
        </div>
        <div className="spc-hero-stat" style={{borderColor:'rgba(0,200,150,.2)',background:'rgba(0,200,150,.04)'}}>
          <div className="spc-hero-lbl">Max Profit</div>
          <div className="spc-hero-val gain">{maxP===0&&net===0?'—':iu(maxP)?'∞':fmtRs(maxP)}</div>
        </div>
        <div className="spc-hero-stat" style={{borderColor:'rgba(255,68,85,.2)',background:'rgba(255,68,85,.04)'}}>
          <div className="spc-hero-lbl">Max Loss</div>
          <div className="spc-hero-val loss">{maxL===0&&net===0?'—':iu(maxL)?'∞':fmtRs(Math.abs(maxL))}</div>
        </div>

      </div>

      {/* TWO COLUMN: inputs left, chart right */}
      <div className="spc-two-col">
        {/* LEFT: leg inputs */}
        <div className="spc-inputs-col">
          <div className="spc-inputs-hdr">
            <span className="spc-section-lbl" style={{marginBottom:0}}>LEGS</span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {saved && <span className="spc-autosave">✓ saved</span>}
              <span style={{fontSize:10,color:'var(--text3)'}}>Lots</span>
              <input type="number" value={lots} min={1} step={1} className="spc-lots" onChange={e=>setLots(Math.max(1,+e.target.value))}/>
            </div>
          </div>
          <div className="spc-dlegs-v">
            {legs.map((l,i) => (
              <div key={i} className="spc-dleg-v">
                <div className="spc-dleg-top">
                  <span className="spc-leg-act" style={{color:l.q>0?'#4A9EFF':'#F59E0B'}}>{l.q>0?'BUY':'SELL'}{Math.abs(l.q)>1?` ${Math.abs(l.q)}×`:''}</span>
                  <span className="spc-leg-tp" style={{color:l.t==='CE'?'#FF8090':'#80FFD0'}}>{l.t==='CE'?'CALL':'PUT'}</span>
                  {l.p>0&&<span className="spc-leg-net" style={{color:l.q>0?'#FF4455':'#00C896'}}><span style={{fontSize:8,opacity:.6}}>{l.q>0?'you pay':'you receive'}</span> {l.q>0?'-':'+'}₹{fmt(Math.abs(l.q*l.p*lots*LOT))}</span>}
                </div>
                <div className="spc-dleg-inputs">
                  <div className="spc-dleg-field">
                    <span className="spc-strike-lbl">Strike</span>
                    <input type="number" value={l.k} step={step} className="spc-strike-input-v" onChange={e=>updK(i,e.target.value)}/>
                  </div>
                  <div className="spc-dleg-field">
                    <span className="spc-strike-lbl">Premium ₹</span>
                    <input type="number" value={l.p||''} step={0.5} min={0} placeholder="enter"
                      className={`spc-prem-input-v ${l.p>0?'spc-prem-filled':''}`}
                      onChange={e=>updP(i,e.target.value)}/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="spc-inputs-actions">
            <button className="spc-prem-hint-btn" onClick={() => setShowPremiumHint(v=>!v)}>How to get premium?</button>
            <button className="spc-reset-btn" onClick={resetPremiums}>↺ Estimate</button>
            <button className="spc-reset-btn" onClick={resetLegs}>↺ ATM</button>
          </div>
          {showPremiumHint && (
            <div className="spc-hint-box">
              <strong>How to get premiums:</strong>
              <ol>
                <li>Open Kite → Option Chain</li>
                <li>Select the same expiry</li>
                <li>Note the LTP for your strike</li>
                <li>Type it in Premium above</li>
              </ol>
              <p>Or click <strong>↺ Estimate</strong> for Black-Scholes estimate.</p>
            </div>
          )}
          {/* Education */}
          <div className="spc-edu" style={{marginTop:'auto',paddingTop:10}}>
            <div className="spc-edu-block">
              <div className="spc-edu-h">WHY IT WORKS</div>
              <div className="spc-edu-t">{strat.why}</div>
            </div>
            <div className="spc-edu-block spc-edu-danger">
              <div className="spc-edu-h">WHAT KILLS IT</div>
              <div className="spc-edu-t">{strat.kill}</div>
            </div>
          </div>
          <div className="spc-actions" style={{marginTop:8}}>
            <button className="spc-share-btn" onClick={handleShare}>{copied?'✓ Copied!':'🔗 Share'}</button>
            <button className="spc-bt-btn" onClick={() => onBT && onBT(strat.id)}>Backtest →</button>
          </div>
        </div>

        {/* RIGHT: chart + greeks */}
        <div className="spc-chart-col">
          {legs.some(l => l.p > 0) ? (
            <>
              <PayoffChart legs={legs} spot={spot} vix={vix} dte={dte} lots={lots} symbol={symbol}/>
              <div className="spc-section-lbl" style={{marginTop:10}}>GREEKS · per {lots} lot{lots>1?'s':''}</div>
              <Greeks legs={legs} spot={spot} vix={vix} dte={dte} lots={lots}/>
            </>
          ) : (
            <div className="spc-prem-prompt">
              ↑ Enter premium on the left to see payoff diagram and greeks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function StrategyPage({ data, onSwitchToBacktest }) {
  const spot = data?.nifty50?.price ? Math.round(data.nifty50.price) : 23000;
  const vix  = data?.vix?.price || 16;

  const [symbol,  setSymbol]  = useState('NIFTY');
  const [filter,  setFilter]  = useState('all');
  const [selId,   setSelId]   = useState('short_straddle');
  const [cmpId,   setCmpId]   = useState('short_iron_condor');
  const [compare, setCompare] = useState(false);
  const [expiries,setExpiries]= useState([]);
  const [expIdx,  setExpIdx]  = useState(0);
  const [lots,    setLots]    = useState(1);

  // Check URL for shared setup
  const sharedFrom = useMemo(() => parseShareUrl(), []);
  useEffect(() => {
    if (sharedFrom?.stratId) {
      setSelId(sharedFrom.stratId);
      if (sharedFrom.lots) setLots(sharedFrom.lots);
    }
  }, []);

  const sel = ALL.find(s => s.id === selId) || ALL[0];
  const cmp = ALL.find(s => s.id === cmpId) || ALL[1];

  // Fetch expiries from Kite (30min cache in option-chain API)
  useEffect(() => {
    fetch('/api/option-chain?action=expiries&symbol=NIFTY')
      .then(r => r.json())
      .then(d => {
        if (d.expiries?.length > 0) {
          const now = new Date();
          setExpiries(d.expiries.map(e => ({
            raw: e,
            label: new Date(e).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
            dte: Math.max(0, Math.ceil((new Date(e) - now) / 86400000)),
          })));
        }
      })
      .catch(() => {
        // Fallback: compute Thursdays
        const now = new Date(), opts = [];
        for (let w = 0; w < 13; w++) {
          const d = new Date(now);
          const dt = ((4 - d.getDay()) + 7) % 7 || 7;
          d.setDate(d.getDate() + dt + w * 7);
          opts.push({ raw: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-IN', { day:'numeric', month:'short' }), dte: Math.max(0, Math.ceil((d - now) / 86400000)) });
        }
        setExpiries(opts);
      });
  }, []);

  const curExp = expiries[expIdx];
  const dte = curExp?.dte ?? 4;

  const FILTERS = [
    {id:'all',label:'All'},{id:'bullish',label:'Bullish'},{id:'bearish',label:'Bearish'},
    {id:'neutral',label:'Neutral'},{id:'volatile',label:'Volatile'},
    {id:'income',label:'Collect Premium (Selling)'},{id:'buying',label:'Pay Premium (Buying)'},
  ];

  const scores = useMemo(() => {
    const m = {};
    ALL.forEach(s => { m[s.id] = calcScore(s, vix, dte); });
    return m;
  }, [vix, dte]);

  const top = useMemo(() => ALL.filter(s => scores[s.id] >= 8).slice(0, 3), [scores]);

  const fGroups = useMemo(() =>
    GROUPS.map(g => ({
      ...g,
      strategies: g.strategies.filter(s => {
        if (filter === 'all')    return true;
        if (filter === 'income') return s.credit;
        if (filter === 'buying') return !s.credit;
        return g.id === filter;
      })
    })).filter(g => g.strategies.length > 0),
    [filter]
  );

  return (
    <div className="spc-root">
      {/* Top bar */}
      <div className="spc-topbar">
        <div className="spc-pills">
          {[
            ['NIFTY', spot.toLocaleString('en-IN'), null],
            ['VIX',   vix.toFixed(1), vix>25?'#FF4455':vix>18?'#F59E0B':'#00C896'],
            ['REGIME', vix<15?'LOW · buy options':vix<20?'NORMAL':vix<25?'ELEVATED · sell premium':'HIGH · sell premium', '#F59E0B'],
          ].map(([l,v,c]) => (
            <div key={l} className="spc-pill">
              <span className="spc-pill-l">{l}</span>
              <span className="spc-pill-v" style={c?{color:c}:{}}>{v}</span>
            </div>
          ))}
          <div className="spc-pill spc-expiry-pill">
            <span className="spc-pill-l">EXPIRY</span>
            {expiries.length > 0
              ? <select className="spc-expiry-sel" value={expIdx} onChange={e => setExpIdx(+e.target.value)}>
                  {expiries.map((o,i) => <option key={i} value={i}>{o.label} ({o.dte}d)</option>)}
                </select>
              : <span className="spc-pill-v">Loading...</span>
            }
          </div>
        </div>
        {top.length > 0 && (
          <div className="spc-best">
            <span className="spc-best-l">SETUPS IDENTIFIED · NOT A RECOMMENDATION</span>
            {top.map(s => (
              <button key={s.id} className="spc-best-btn" onClick={() => setSelId(s.id)}>
                {s.label} <span style={{color:'#00C896',fontWeight:700}}>{scores[s.id]}/10</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="spc-body">
        {/* Left panel */}
        <div className="spc-left">
          <div className="spc-filters">
            {FILTERS.map(f => (
              <button key={f.id} className={`spc-fb ${filter===f.id?'spc-fb-on':''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="spc-list">
            {fGroups.map(g => (
              <div key={g.id}>
                <div className="spc-glabel" style={{color:g.color}}>{g.icon} {g.label}</div>
                {g.strategies.map(s => {
                  const sc = scores[s.id];
                  const c  = sc>=8?'#00C896':sc>=6?'#F59E0B':'var(--text3)';
                  const lastS = loadSession(s.id);
                  const hasSession = lastS && lastS.some(l => l.p > 0);
                  return (
                    <div key={s.id} className={`spc-item ${selId===s.id?'spc-item-on':''}`} onClick={() => setSelId(s.id)}>
                      <div className="spc-item-r1">
                        <span className="spc-item-name">{s.label}</span>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          {hasSession && <span style={{fontSize:8,color:'var(--text3)'}}>📋</span>}
                          <span style={{color:c,fontSize:10,fontFamily:'monospace',fontWeight:700}}>{sc}/10</span>
                        </div>
                      </div>
                      <div className="spc-item-r2">
                        <span style={{color:g.color,fontSize:10}}>{g.label.toLowerCase()}</span>
                        <span style={{color:s.credit?'#00C896':'#FF4455',fontSize:10}}>{s.credit?'collect':'pay'}</span>
                        <span style={{color:'var(--text3)',fontSize:9,letterSpacing:2}}>{'●'.repeat(s.complexity)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="spc-cmp-row">
            <button className={`spc-cmp-btn ${compare?'spc-cmp-on':''}`} onClick={() => setCompare(v=>!v)}>
              {compare?'✕ Close':'⇄ Compare'}
            </button>
            {compare && (
              <select className="spc-cmp-sel" value={cmpId} onChange={e => setCmpId(e.target.value)}>
                {ALL.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="spc-right">
          {!compare ? (
            <Detail strat={sel} spot={spot} vix={vix} dte={dte} expiry={curExp?.raw}
              lots={lots} setLots={setLots}
              onBT={id => onSwitchToBacktest && onSwitchToBacktest(id)}
              sharedFrom={sharedFrom}/>
          ) : (
            <div className="spc-cmp-grid">
              <Detail strat={sel} spot={spot} vix={vix} dte={dte} expiry={curExp?.raw}
                lots={lots} setLots={setLots}
                onBT={id => onSwitchToBacktest && onSwitchToBacktest(id)}
                sharedFrom={sharedFrom}/>
              <div className="spc-cmp-div"/>
              <Detail strat={cmp} spot={spot} vix={vix} dte={dte} expiry={curExp?.raw}
                lots={lots} setLots={setLots}
                onBT={id => onSwitchToBacktest && onSwitchToBacktest(id)}
                sharedFrom={null}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
