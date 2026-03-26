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

  const { range, expPnls, nowPnls, bes, maxP, minP } = useMemo(() => {
    const st = spot > 10000 ? 50 : 25;
    const ks = legs.map(l => l.k);
    const pad = Math.max(...ks) - Math.min(...ks) + st * 14;
    const fr = Math.min(...ks, spot) - pad / 2, to = Math.max(...ks, spot) + pad / 2;
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
    return { range, expPnls, nowPnls, bes, maxP: Math.max(...all), minP: Math.min(...all) };
  }, [legs, spot, vix, dte, lots, tDte, sig]);

  const W=680, H=200, PAD={t:20,r:16,b:36,l:60};
  const CW=W-PAD.l-PAD.r, CH=H-PAD.t-PAD.b, span=Math.max(maxP-minP,1);
  const tx=s=>PAD.l+((s-range[0])/(range[range.length-1]-range[0]))*CW;
  const ty=p=>PAD.t+CH-((p-minP)/span)*CH;
  const zy=ty(0), sx=tx(spot), tsx=tx(tSpot);
  const mkPath=arr=>arr.map((v,i)=>`${i===0?'M':'L'}${tx(range[i]).toFixed(1)},${ty(v).toFixed(1)}`).join(' ');

  const fillPath=(arr,pos)=>{
    let d='',open=false;
    arr.forEach((p,i)=>{
      const x=tx(range[i]),y=ty(p),base=pos?Math.min(zy,PAD.t+CH):Math.max(zy,PAD.t);
      if((pos?p>=0:p<0)&&!open){open=true;d+=`M${x},${base} L${x},${y}`;}
      else if(pos?p>=0:p<0)d+=` L${x},${y}`;
      else if(open){open=false;d+=` L${tx(range[i-1])},${base} Z`;}
    });
    if(open)d+=` L${tx(range[arr.length-1])},${pos?Math.min(zy,PAD.t+CH):Math.max(zy,PAD.t)} Z`;
    return d;
  };

  const fmt=n=>{const a=Math.abs(n);if(a>9999999)return n>0?'+∞':'-∞';if(a>=100000)return`${n>0?'+':'-'}₹${(a/100000).toFixed(1)}L`;if(a>=1000)return`${n>0?'+':'-'}₹${(a/1000).toFixed(1)}k`;return`${n>0?'+':'-'}₹${a}`;};

  const hvPnl = useMemo(() => {
    if (hx === null) return null;
    const s = range[0] + (hx - PAD.l) / CW * (range[range.length-1] - range[0]);
    let ex = 0, nw = 0;
    const T1 = Math.max(tDte, 0.01) / 365;
    legs.forEach(l => {
      ex += l.q * (Math.max(0, l.t==='CE'?s-l.k:l.k-s) - l.p) * lots * LOT;
      nw += l.q * (bsP(s, l.k, T1, sig, l.t) - l.p) * lots * LOT;
    });
    return { s: Math.round(s), ex: Math.round(ex), nw: Math.round(nw) };
  }, [hx, legs, vix, dte, lots, tDte, sig, range]);

  const sd1 = Math.round(spot * (vix / 100) * Math.sqrt(Math.max(dte, 0.5) / 365));
  const nowIdx = range.reduce((b,s,i)=>Math.abs(s-tSpot)<Math.abs(range[b]-tSpot)?i:b, 0);
  const nowPnl = nowPnls[nowIdx] || 0;

  return (
    <div className="spc-chart-outer">
      <div className="spc-chart" onMouseLeave={() => setHx(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', cursor:'crosshair' }}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width * W;
            if (x >= PAD.l && x <= PAD.l+CW) setHx(x);
          }}>
          <defs>
            <clipPath id="spc3cl"><rect x={PAD.l} y={PAD.t} width={CW} height={CH}/></clipPath>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* SD zones */}
          {[sd1, sd1*2].map((sd,i) => {
            const x1=tx(spot-sd), x2=tx(spot+sd);
            return <rect key={i} x={Math.max(PAD.l,x1)} y={PAD.t} width={Math.min(PAD.l+CW,x2)-Math.max(PAD.l,x1)} height={CH} fill={`rgba(255,255,255,${0.025-i*0.01})`}/>;
          })}
          {[-sd1*2,-sd1,sd1,sd1*2].map((sd,i) => {
            const x=tx(spot+sd), lbl=`${i<2?'-':'+'}{${i<2?2-i:i-1}}SD`.replace('{','').replace('}','');
            const lb2 = i===0?'-2SD':i===1?'-1SD':i===2?'+1SD':'+2SD';
            return x>=PAD.l&&x<=PAD.l+CW?<text key={i} x={x} y={PAD.t+9} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">{lb2}</text>:null;
          })}
          {/* Zero line */}
          {zy>=PAD.t&&zy<=PAD.t+CH&&<line x1={PAD.l} y1={zy} x2={PAD.l+CW} y2={zy} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3"/>}
          {/* Fills */}
          <path d={fillPath(expPnls,true)} fill="rgba(0,200,150,0.08)" clipPath="url(#spc3cl)"/>
          <path d={fillPath(expPnls,false)} fill="rgba(255,68,85,0.1)" clipPath="url(#spc3cl)"/>
          {/* Strike lines */}
          {[...new Set(legs.map(l=>l.k))].map(k => {
            const kx=tx(k);
            return kx>=PAD.l&&kx<=PAD.l+CW?<line key={k} x1={kx} y1={PAD.t} x2={kx} y2={PAD.t+CH} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2,3"/>:null;
          })}
          {/* Breakevens */}
          {bes.map((be,i) => {
            const bx=tx(be);
            return bx>=PAD.l&&bx<=PAD.l+CW?<g key={i}><circle cx={bx} cy={zy} r="4" fill="#F59E0B" stroke="#08080A" strokeWidth="1.5"/><text x={bx} y={PAD.t+CH+14} textAnchor="middle" fill="#F59E0B" fontSize="8" fontFamily="monospace">{be.toLocaleString('en-IN')}</text></g>:null;
          })}
          {/* Today path dashed */}
          <path d={mkPath(nowPnls)} fill="none" stroke="#4A9EFF" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" strokeLinejoin="round" clipPath="url(#spc3cl)"/>
          {/* Expiry path solid */}
          <path d={mkPath(expPnls)} fill="none" stroke="#FFFFFF" strokeWidth="2.5" filter="url(#glow)" strokeLinejoin="round" clipPath="url(#spc3cl)"/>
          {/* Spot */}
          {sx>=PAD.l&&sx<=PAD.l+CW&&<g><line x1={sx} y1={PAD.t} x2={sx} y2={PAD.t+CH} stroke="rgba(245,158,11,0.5)" strokeWidth="1.5" strokeDasharray="3,3"/><text x={sx} y={PAD.t-3} textAnchor="middle" fill="#F59E0B" fontSize="8" fontFamily="monospace">SPOT</text></g>}
          {/* Target */}
          {tsx>=PAD.l&&tsx<=PAD.l+CW&&Math.abs(tsx-sx)>2&&<g><line x1={tsx} y1={PAD.t} x2={tsx} y2={PAD.t+CH} stroke="rgba(74,158,255,0.5)" strokeWidth="1.5" strokeDasharray="4,2"/><text x={tsx} y={PAD.t-3} textAnchor="middle" fill="#4A9EFF" fontSize="8" fontFamily="monospace">TARGET</text></g>}
          {/* Y labels */}
          {[[maxP,'#00C896'],[0,'rgba(255,255,255,0.2)'],[minP,'#FF4455']].map(([v,c]) => {
            const y=ty(v);
            return y>=PAD.t&&y<=PAD.t+CH?<text key={v} x={PAD.l-6} y={y+4} textAnchor="end" fill={c} fontSize="9" fontFamily="monospace">{v===0?'0':fmt(v)}</text>:null;
          })}
          {/* Legend */}
          <line x1={PAD.l+2} y1={PAD.t+8} x2={PAD.l+16} y2={PAD.t+8} stroke="rgba(255,255,255,0.75)" strokeWidth="2"/>
          <text x={PAD.l+19} y={PAD.t+12} fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="monospace">At expiry</text>
          <line x1={PAD.l+62} y1={PAD.t+8} x2={PAD.l+76} y2={PAD.t+8} stroke="#4A9EFF" strokeWidth="2" strokeDasharray="4,2"/>
          <text x={PAD.l+79} y={PAD.t+12} fill="rgba(74,158,255,0.6)" fontSize="8" fontFamily="monospace">Today ({tDte}d left)</text>
          {/* Hover */}
          {hx&&hvPnl&&hx>=PAD.l&&hx<=PAD.l+CW&&<g>
            <line x1={hx} y1={PAD.t} x2={hx} y2={PAD.t+CH} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            {(()=>{
              const tx2=hx>PAD.l+CW*0.65?hx-118:hx+8;
              return <g>
                <rect x={tx2} y={16} width={120} height={58} rx="6" fill="#13131A" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <text x={tx2+55} y={33} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">{Math.round(hvPnl.s).toLocaleString('en-IN')}</text>
                <text x={tx2+8} y={47} fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">Expiry:</text>
                <text x={tx2+102} y={47} textAnchor="end" fontSize="11" fontWeight="700" fill={hvPnl.ex>=0?'#00C896':'#FF4455'} fontFamily="monospace">{fmt(hvPnl.ex)}</text>
                <text x={tx2+8} y={60} fill="rgba(74,158,255,0.5)" fontSize="8" fontFamily="monospace">Today:</text>
                <text x={tx2+102} y={60} textAnchor="end" fontSize="11" fontWeight="700" fill={hvPnl.nw>=0?'#4A9EFF':'#FF8888'} fontFamily="monospace">{fmt(hvPnl.nw)}</text>
              </g>;
            })()}
          </g>}
        </svg>
      </div>
      {/* Sliders */}
      <div className="spc-sliders">
        <div className="spc-slider-row">
          <span className="spc-sl-lbl">Target Price</span>
          <input type="range" min={Math.round(spot*.85)} max={Math.round(spot*1.15)} step={spot>10000?50:25} value={tSpot} onChange={e=>setTSpot(+e.target.value)} className="spc-slider"/>
          <span className="spc-sl-val">{tSpot.toLocaleString('en-IN')}</span>
          <button className="spc-sl-reset" onClick={()=>setTSpot(spot)}>↺</button>
        </div>
        <div className="spc-slider-row">
          <span className="spc-sl-lbl">Days to Expiry</span>
          <input type="range" min={0} max={dte} step={1} value={tDte} onChange={e=>setTDte(+e.target.value)} className="spc-slider"/>
          <span className="spc-sl-val">{tDte}d left</span>
          <button className="spc-sl-reset" onClick={()=>setTDte(dte)}>↺</button>
        </div>
      </div>
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
    if (!legs?.length) return { d:0, th:0, ga:0, v:0 };
    let d=0, th=0, ga=0, v=0;
    legs.forEach(l => {
      d  += l.q * bsDelta(spot, l.k, T, sig, l.t) * lots * LOT;
      th += l.q * bsTheta(spot, l.k, T, sig, l.t) * lots * LOT;
      ga += l.q * bsGamma(spot, l.k, T, sig) * lots * LOT;
      v  += l.q * bsVega(spot, l.k, T, sig) * lots * LOT;
    });
    return { d: Math.round(d*100)/100, th: Math.round(th*100)/100, ga: Math.round(ga*10000)/10000, v: Math.round(v*100)/100 };
  }, [legs, spot, vix, dte, lots]);

  // Bar width: clamp -100..100 pct for visual
  const barPct = (val, max) => Math.min(100, Math.abs(val) / max * 100);

  const greeks = [
    {
      name:'Delta', symbol:'Δ',
      val: g.d.toFixed(2), unit:'',
      color: g.d>0?'#00C896':g.d<0?'#FF4455':'#666',
      bar: barPct(g.d, 300), barDir: g.d >= 0,
      plain: `Position makes ₹${Math.abs(g.d).toFixed(0)} for every 1pt ${g.d>=0?'rise':'fall'} in ${spot>10000?'Nifty':'the index'}.`,
      adv: `Net directional exposure. ${Math.abs(g.d)>100?'High delta — acts like a leveraged directional bet.':Math.abs(g.d)<20?'Near-zero delta — market direction matters less than volatility.':'Moderate exposure.'}`,
    },
    {
      name:'Theta', symbol:'Θ',
      val: g.th.toFixed(0), unit:'/day',
      color: g.th>0?'#00C896':'#FF4455',
      bar: barPct(g.th, 5000), barDir: g.th >= 0,
      plain: g.th>=0
        ? `Time is your friend — earns ₹${Math.abs(g.th).toFixed(0)} every day as expiry approaches.`
        : `Time decay hurts — costs ₹${Math.abs(g.th).toFixed(0)} every day even if market doesn't move.`,
      adv: `${g.th>=0?'Positive theta = premium seller. Strategy profits from time passing.':'Negative theta = premium buyer. Needs a big move before time kills the trade.'}`,
    },
    {
      name:'Gamma', symbol:'Γ',
      val: g.ga.toFixed(4), unit:'',
      color: g.ga>0?'#4A9EFF':'#F59E0B',
      bar: barPct(g.ga, 1), barDir: g.ga >= 0,
      plain: `Delta shifts by ${Math.abs(g.ga).toFixed(4)} for each 1pt move. ${Math.abs(g.ga)>0.05?'High — position accelerates on moves.':'Low — delta stays stable.'}`,
      adv: `${g.ga>0?'Long gamma: profits accelerate on big moves in either direction.':'Short gamma: profits erode quickly if market moves sharply. Needs active management.'}`,
    },
    {
      name:'Vega', symbol:'ν',
      val: g.v.toFixed(0), unit:'/1%IV',
      color: g.v>0?'#A78BFA':'#F59E0B',
      bar: barPct(g.v, 8000), barDir: g.v >= 0,
      plain: `IV changes by 1% → P&L changes by ₹${Math.abs(g.v).toFixed(0)}. ${g.v>0?'Rising VIX helps.':'Rising VIX hurts.'}`,
      adv: `${g.v>0?'Long vega: enter when VIX is low, expecting a spike.':'Short vega: enter when VIX is elevated, expecting it to fall back.'}`,
    },
  ];

  return (
    <div className="spc-greeks-v2">
      {greeks.map(gk => (
        <div key={gk.name} className="spc-greek-v2">
          <div className="spc-greek-v2-top">
            <span className="spc-greek-v2-sym" style={{color:gk.color}}>{gk.symbol}</span>
            <span className="spc-greek-v2-name">{gk.name}</span>
            <span className="spc-greek-v2-val" style={{color:gk.color}}>{gk.val}{gk.unit}</span>
          </div>
          <div className="spc-greek-v2-bar-track">
            <div className="spc-greek-v2-bar-fill"
              style={{width:`${gk.bar}%`, background:gk.color, opacity:.7,
                marginLeft: gk.barDir?0:'auto', marginRight: gk.barDir?'auto':0}}/>
          </div>
          <div className="spc-greek-v2-plain">{gk.plain}</div>
          <div className="spc-greek-v2-adv">{gk.adv}</div>
        </div>
      ))}
    </div>
  );
}

// ── DETAIL PANEL ──────────────────────────────────────────────────────────────
function Detail({ strat, spot, vix, dte, expiry, lots, setLots, onBT, onShare, sharedFrom, symbol }) {
  const step = spot > 10000 ? 100 : 50;
  const atm  = Math.round(spot / step) * step;
  const w    = step * 2;

  const [legs, setLegs] = useState(() => {
    if (sharedFrom?.stratId === strat.id && sharedFrom?.legs) return sharedFrom.legs;
    const saved = loadSession(strat.id);
    if (saved) return saved;
    return strat.legs(atm, w);
  });

  const [saved,           setSaved]           = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [showPremiumHint, setShowPremiumHint] = useState(false);

  useEffect(() => {
    if (sharedFrom?.stratId === strat.id && sharedFrom?.legs) { setLegs(sharedFrom.legs); return; }
    const s = loadSession(strat.id);
    setLegs(s || strat.legs(atm, w));
  }, [strat.id]);

  useEffect(() => {
    saveSession(strat.id, legs);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [legs]);

  const updK = (i, val) => setLegs(p => p.map((l,j) => j===i ? {...l, k: Math.round(+val/step)*step} : l));
  const updP = (i, val) => setLegs(p => p.map((l,j) => j===i ? {...l, p: Math.max(0, +val)} : l));
  const resetLegs     = () => setLegs(strat.legs(atm, w));
  const resetPremiums = () => {
    const sig = (vix||15)/100, T = Math.max(dte,0.25)/365;
    setLegs(p => p.map(l => ({ ...l, p: Math.round(bsP(spot, l.k, T, sig, l.t)) })));
  };

  const net     = legs.reduce((s,l) => s + l.q * l.p, 0);
  const isC     = net < 0;
  const sc      = calcScore(strat, vix, dte);
  const scoreC  = sc>=8?'#00C896':sc>=6?'#F59E0B':'#FF4455';
  const scoreLbl= sc>=8?'STRONG FIT':sc>=6?'DECENT FIT':'WEAK FIT';
  const fmt     = n => { const a=Math.abs(n); return a>=100000?`₹${(a/100000).toFixed(1)}L`:a>=1000?`₹${(a/1000).toFixed(1)}k`:`₹${Math.round(a).toLocaleString('en-IN')}`; };

  const { maxP, maxL } = useMemo(() => {
    const s2 = spot>10000?50:25, ks=legs.map(l=>l.k), ps=[];
    if(!ks.length) return {maxP:0,maxL:0};
    for(let s=Math.min(...ks)-s2*15; s<=Math.max(...ks)+s2*15; s+=s2){
      let t=0; legs.forEach(l=>{t+=l.q*(Math.max(0,l.t==='CE'?s-l.k:l.k-s)-l.p)*lots*LOT;}); ps.push(t);
    }
    return {maxP:Math.max(...ps), maxL:Math.min(...ps)};
  }, [legs, lots]);

  const iu = v => Math.abs(v) > 5000000;

  const rr = useMemo(() => {
    if(iu(maxP)||iu(maxL)||maxL===0||maxP<=0) return null;
    return (maxP / Math.abs(maxL)).toFixed(1);
  }, [maxP, maxL]);

  const handleShare = () => {
    const url = buildShareUrl(strat.id, legs, lots, spot, expiry);
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000); });
    if(onShare) onShare();
  };

  const hasLastSession = loadSession(strat.id)?.some(l=>l.p>0);
  const hasPremiums    = legs.some(l => l.p > 0);

  const vixCtx = vix < 15 ? {label:'VIX LOW',    color:'#4A9EFF', tip:'Options are cheap — good for buying strategies'}
               : vix < 20 ? {label:'VIX NORMAL',  color:'#00C896', tip:'Balanced conditions for most strategies'}
               : vix < 25 ? {label:'VIX ELEVATED',color:'#F59E0B', tip:'Elevated premiums — ideal for sellers'}
               :             {label:'VIX HIGH',    color:'#FF4455', tip:'High fear — premium selling richly priced but risky'};

  const compLbl = ['','BEGINNER','EASY','INTERMEDIATE','ADVANCED','EXPERT'][strat.complexity] || '';

  return (
    <div className="spc-detail">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="spc-dh">
        <div className="spc-dh-left">
          {hasLastSession && (
            <div className="spc-banner spc-banner-session">
              <span>📋 Last session restored</span>
              <button onClick={resetLegs}>Reset</button>
            </div>
          )}
          {sharedFrom?.stratId===strat.id && (
            <div className="spc-banner spc-banner-share">🔗 Shared setup loaded</div>
          )}
          <div className="spc-dh-name">{strat.label}</div>
          <div className="spc-dh-hook">{strat.hook}</div>
          <div className="spc-dh-tags">
            <span className="spc-tag" style={{color:scoreC,borderColor:scoreC+'40',background:scoreC+'0D'}}>{scoreLbl}</span>
            <span className="spc-tag" style={{color:'#666',borderColor:'#333'}}>{compLbl}</span>
            <span className="spc-tag" style={{color:strat.credit?'#00C896':'#FF4455',borderColor:strat.credit?'#00C89630':'#FF445530'}}>
              {strat.credit?'PREMIUM SELLER':'PREMIUM BUYER'}
            </span>
            <span className="spc-tag" style={{color:vixCtx.color,borderColor:vixCtx.color+'40',background:vixCtx.color+'0D'}} title={vixCtx.tip}>
              {vixCtx.label}
            </span>
          </div>
        </div>
        <div className="spc-dh-right">
          <div className="spc-score-big" style={{color:scoreC,borderColor:scoreC+'50',background:scoreC+'0A'}}>
            <div className="spc-score-num">{sc}</div>
            <div className="spc-score-denom">/10</div>
          </div>
          <div className="spc-dh-actions">
            <button className="spc-btn-share" onClick={handleShare}>{copied?'✓ Copied':'🔗 Share'}</button>
            <button className="spc-btn-bt" onClick={()=>onBT&&onBT(strat.id)}>Backtest →</button>
          </div>
        </div>
      </div>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <div className="spc-stats-bar">
        <div className="spc-stat-cell" style={{borderColor:isC?'#00C89640':'#FF445530',background:isC?'#00C8960A':'#FF44550A'}}>
          <div className="spc-stat-lbl">NET {isC?'COLLECTED':'COST'}</div>
          <div className="spc-stat-val" style={{color:isC?'#00C896':'#FF4455'}}>
            {net===0?<span style={{color:'#444'}}>—</span>:fmt(Math.abs(net*lots*LOT))}
          </div>
          {net!==0&&<div className="spc-stat-sub">{isC?'you receive upfront':'you pay upfront'}</div>}
        </div>
        <div className="spc-stat-cell" style={{borderColor:'#00C89630',background:'#00C8960A'}}>
          <div className="spc-stat-lbl">MAX PROFIT</div>
          <div className="spc-stat-val gain">
            {maxP===0&&net===0?<span style={{color:'#444'}}>—</span>:iu(maxP)?<span style={{fontSize:26}}>∞</span>:fmt(maxP)}
          </div>
          {!iu(maxP)&&maxP>0&&rr&&<div className="spc-stat-sub" style={{color:'#00C896'}}>{rr}:1 risk:reward</div>}
        </div>
        <div className="spc-stat-cell" style={{borderColor:'#FF445530',background:'#FF44550A'}}>
          <div className="spc-stat-lbl">MAX LOSS</div>
          <div className="spc-stat-val loss">
            {maxL===0&&net===0?<span style={{color:'#444'}}>—</span>:iu(maxL)?<span style={{fontSize:26}}>∞</span>:fmt(Math.abs(maxL))}
          </div>
          {iu(maxL)&&<div className="spc-stat-sub" style={{color:'#FF4455'}}>use stop loss</div>}
        </div>
        <div className="spc-stat-cell" style={{borderColor:'#4A9EFF30'}}>
          <div className="spc-stat-lbl">LOTS</div>
          <input type="number" value={lots} min={1} step={1} className="spc-lots-input"
            onChange={e=>setLots(Math.max(1,+e.target.value))}/>
          <div className="spc-stat-sub">{lots*LOT} units</div>
        </div>
        <div className="spc-stat-cell" style={{borderColor:'#F59E0B30',background:'#F59E0B06'}}>
          <div className="spc-stat-lbl">DTE</div>
          <div className="spc-stat-val" style={{color:'#F59E0B'}}>{dte}d</div>
          <div className="spc-stat-sub">days to expiry</div>
        </div>
      </div>

      {/* ── THREE-COLUMN BODY ───────────────────────────────────────────── */}
      <div className="spc-3col">

        {/* COL 1: LEGS */}
        <div className="spc-col-legs">
          <div className="spc-col-title">
            <span>LEGS</span>
            {saved&&<span className="spc-autosave-dot">● saved</span>}
          </div>

          <div className="spc-legs-list">
            {legs.map((l,i) => (
              <div key={i} className={`spc-leg-card ${l.q>0?'spc-leg-buy':'spc-leg-sell'}`}>
                <div className="spc-leg-card-header">
                  <span className="spc-leg-dir" style={{color:l.q>0?'#4A9EFF':'#F59E0B',background:l.q>0?'rgba(74,158,255,.12)':'rgba(245,158,11,.12)'}}>
                    {l.q>0?'▲ BUY':'▼ SELL'}{Math.abs(l.q)>1?` ${Math.abs(l.q)}×`:''}
                  </span>
                  <span className="spc-leg-type" style={{color:l.t==='CE'?'#FF8090':'#6EE7B7',background:l.t==='CE'?'rgba(255,64,80,.12)':'rgba(0,200,150,.1)'}}>
                    {l.t==='CE'?'CALL':'PUT'}
                  </span>
                  {l.p>0&&(
                    <span className="spc-leg-pnl" style={{color:l.q>0?'#FF4455':'#00C896'}}>
                      {l.q>0?'−':'+'}₹{Math.abs(l.q*l.p*lots*LOT).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="spc-leg-fields">
                  <div className="spc-leg-field">
                    <label className="spc-leg-flbl">Strike</label>
                    <input type="number" value={l.k} step={step} className="spc-leg-finput"
                      onChange={e=>updK(i,e.target.value)}/>
                  </div>
                  <div className="spc-leg-field">
                    <label className="spc-leg-flbl">Premium ₹</label>
                    <input type="number" value={l.p||''} step={0.5} min={0} placeholder="0"
                      className={`spc-leg-finput spc-leg-prem${l.p>0?' filled':''}`}
                      onChange={e=>updP(i,e.target.value)}/>
                  </div>
                </div>
                <div className="spc-leg-atm">
                  {l.k===atm?<span className="spc-leg-atm-badge">ATM</span>
                  :l.k>atm?<span className="spc-leg-atm-otm">+{l.k-atm} OTM</span>
                  :<span className="spc-leg-atm-itm">{atm-l.k} ITM</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="spc-leg-btns">
            <button className="spc-legbtn spc-legbtn-primary" onClick={resetPremiums}>↺ Auto-fill premiums</button>
            <button className="spc-legbtn" onClick={resetLegs}>Reset to ATM</button>
          </div>
          <button className="spc-legbtn spc-legbtn-hint" onClick={()=>setShowPremiumHint(v=>!v)}>
            {showPremiumHint?'✕ Hide guide':'? How to get real premiums'}
          </button>

          {showPremiumHint && (
            <div className="spc-hint-box">
              <div className="spc-hint-title">📲 Getting real premiums from Kite</div>
              <ol>
                <li>Open <strong>Kite</strong> → go to Option Chain</li>
                <li>Select the expiry you want to trade</li>
                <li>Find your strike row, copy the <strong>LTP</strong></li>
                <li>Paste it in the Premium field above</li>
              </ol>
              <div className="spc-hint-note">💡 Or use <strong>Auto-fill</strong> for a quick Black-Scholes estimate based on current VIX {vix.toFixed(1)}.</div>
            </div>
          )}
        </div>

        {/* COL 2: CHART */}
        <div className="spc-col-chart">
          <div className="spc-col-title">
            <span>PAYOFF DIAGRAM</span>
            <span className="spc-col-title-sub">Black-Scholes · {symbol||'NIFTY'} · Lot={LOT}</span>
          </div>

          {hasPremiums ? (
            <>
              <PayoffChart legs={legs} spot={spot} vix={vix} dte={dte} lots={lots} symbol={symbol}/>

              <div className="spc-col-title" style={{marginTop:16}}>
                <span>GREEKS</span>
                <span className="spc-col-title-sub">per {lots} lot{lots>1?'s':''} · live estimates</span>
              </div>
              <Greeks legs={legs} spot={spot} vix={vix} dte={dte} lots={lots}/>
            </>
          ) : (
            <div className="spc-no-prem">
              <div className="spc-no-prem-icon">📊</div>
              <div className="spc-no-prem-title">Enter premiums to see payoff</div>
              <div className="spc-no-prem-sub">Type real premiums from Kite option chain, or auto-fill from Black-Scholes</div>
              <button className="spc-legbtn spc-legbtn-primary" style={{marginTop:14,width:'auto',alignSelf:'center'}} onClick={resetPremiums}>
                ↺ Auto-fill with Black-Scholes estimate
              </button>
            </div>
          )}
        </div>

        {/* COL 3: INTEL */}
        <div className="spc-col-intel">
          <div className="spc-col-title">STRATEGY INTEL</div>

          <div className="spc-intel-card spc-intel-green">
            <div className="spc-intel-hdr"><span className="spc-intel-icon">✓</span> WHY IT WORKS</div>
            <div className="spc-intel-body">{strat.why}</div>
          </div>

          <div className="spc-intel-card spc-intel-red">
            <div className="spc-intel-hdr"><span className="spc-intel-icon">⚠</span> WHAT KILLS IT</div>
            <div className="spc-intel-body">{strat.kill}</div>
          </div>

          <div className="spc-intel-card" style={{borderColor:vixCtx.color+'40',background:vixCtx.color+'08'}}>
            <div className="spc-intel-hdr" style={{color:vixCtx.color}}>
              <span className="spc-intel-icon">◎</span> MARKET NOW
            </div>
            <div className="spc-intel-body">
              <strong style={{color:vixCtx.color}}>VIX {vix.toFixed(1)} — {vixCtx.label}</strong><br/>
              {vixCtx.tip}
            </div>
          </div>

          <div className="spc-checklist">
            <div className="spc-checklist-title">BEFORE YOU TRADE</div>
            {[
              ['Pick expiry',         'Match DTE to your strategy'],
              ['Enter real premiums', 'Use Kite option chain LTP'],
              ['Set your stop loss',  'Know exit before you enter'],
              ['Check VIX regime',    'Confirms strategy fit today'],
              [strat.credit?'Check SPAN margin':'Arrange capital', strat.credit?'SPAN margin needed in Kite':'Full debit must be available'],
            ].map(([s, n]) => (
              <label key={s} className="spc-checklist-row">
                <input type="checkbox" className="spc-check"/>
                <div>
                  <div className="spc-check-step">{s}</div>
                  <div className="spc-check-note">{n}</div>
                </div>
              </label>
            ))}
          </div>
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

  // ── EXPIRY HELPERS ──────────────────────────────────────────────────────────
  // NSE weekly expiry days (post-SEBI 2024 consolidation):
  //   NIFTY 50  → Tuesday  (2)
  //   SENSEX    → Thursday (4)  [BSE]
  //   BANKNIFTY → Wednesday (3) — monthly only now, keep for reference
  //   FINNIFTY  → Tuesday  (2)
  //   MIDCPNIFTY→ Monday   (1)
  const EXPIRY_DAY = { NIFTY:2, SENSEX:4, BANKNIFTY:3, FINNIFTY:2, MIDCPNIFTY:1 };

  // NSE holidays 2025-2026 (hardcoded fallback — used only when API fails)
  const NSE_HOLIDAYS = new Set([
    '2025-03-31','2025-04-10','2025-04-14','2025-04-18','2025-05-01',
    '2025-08-15','2025-08-27','2025-10-02','2025-10-21','2025-10-22',
    '2025-11-05','2025-12-25',
    '2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31',
    '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26',
    '2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24',
    '2026-12-25',
  ]);

  // Shift date backward past weekends and holidays
  function adjustExpiry(d) {
    const dt = new Date(d);
    while (dt.getDay() === 0 || dt.getDay() === 6 || NSE_HOLIDAYS.has(dt.toISOString().split('T')[0])) {
      dt.setDate(dt.getDate() - 1);
    }
    return dt;
  }

  // Build fallback expiry list (13 weekly entries) with holiday shift
  function buildFallbackExpiries(weekday) {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const opts = [];
    let checked = 0, week = 0;
    while (opts.length < 13 && checked < 30) {
      checked++;
      const d = new Date(ist);
      let daysUntil = ((weekday - d.getDay()) + 7) % 7;
      if (daysUntil === 0 && (ist.getHours() > 15 || (ist.getHours() === 15 && ist.getMinutes() >= 30))) daysUntil = 7;
      d.setDate(d.getDate() + daysUntil + week * 7);
      d.setHours(15, 30, 0, 0);
      const adjusted = adjustExpiry(d);
      const raw = adjusted.toISOString().split('T')[0];
      const dte = Math.max(0, Math.ceil((adjusted - now) / 86400000));
      // Skip if same as last entry
      if (!opts.length || opts[opts.length-1].raw !== raw) {
        opts.push({ raw, label: adjusted.toLocaleDateString('en-IN', { day:'numeric', month:'short' }), dte });
      }
      week++;
    }
    return opts;
  }

  // Fetch expiries from API with fallback
  useEffect(() => {
    const weekday = EXPIRY_DAY[symbol] ?? 2;
    setExpIdx(0);
    fetch(`/api/option-chain?action=expiries&symbol=${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.expiries?.length > 0) {
          const now = new Date();
          setExpiries(d.expiries.map(e => ({
            raw: e,
            label: new Date(e).toLocaleDateString('en-IN', { day:'numeric', month:'short' }),
            dte: Math.max(0, Math.ceil((new Date(e) - now) / 86400000)),
          })));
        } else {
          setExpiries(buildFallbackExpiries(weekday));
        }
      })
      .catch(() => setExpiries(buildFallbackExpiries(weekday)));
  }, [symbol]);

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
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div className="spc-topbar">

        {/* Left cluster: market data pills */}
        <div className="spc-tb-left">

          {/* Symbol selector */}
          <div className="spc-tb-pill spc-tb-pill-select">
            <span className="spc-tb-lbl">SYMBOL</span>
            <select className="spc-tb-select" value={symbol} onChange={e => setSymbol(e.target.value)}>
              {['NIFTY','BANKNIFTY','SENSEX','FINNIFTY','MIDCPNIFTY'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="spc-tb-divider"/>

          {/* Spot price */}
          <div className="spc-tb-pill">
            <span className="spc-tb-lbl">{symbol}</span>
            <span className="spc-tb-val">{spot.toLocaleString('en-IN')}</span>
          </div>

          {/* VIX */}
          <div className="spc-tb-pill">
            <span className="spc-tb-lbl">VIX</span>
            <span className="spc-tb-val" style={{color:vix>25?'#FF4455':vix>18?'#F59E0B':'#00C896'}}>{vix.toFixed(1)}</span>
          </div>

          {/* Regime */}
          <div className="spc-tb-pill">
            <span className="spc-tb-lbl">REGIME</span>
            <span className="spc-tb-val" style={{color:vix<15?'#4A9EFF':vix<20?'#00C896':vix<25?'#F59E0B':'#FF4455'}}>
              {vix<15?'LOW · buy options':vix<20?'NORMAL':vix<25?'ELEVATED · sell premium':'HIGH · sell premium'}
            </span>
          </div>

          <div className="spc-tb-divider"/>

          {/* Expiry selector */}
          <div className="spc-tb-pill spc-tb-pill-select">
            <span className="spc-tb-lbl">EXPIRY</span>
            {expiries.length > 0
              ? <select className="spc-tb-select" value={expIdx} onChange={e => setExpIdx(+e.target.value)}>
                  {expiries.map((o,i) => <option key={i} value={i}>{o.label} · {o.dte}d</option>)}
                </select>
              : <span className="spc-tb-val spc-tb-loading">loading...</span>
            }
          </div>

          <div className="spc-tb-divider"/>

          {/* Lot size — global control */}
          <div className="spc-tb-pill spc-tb-pill-lots">
            <span className="spc-tb-lbl">LOTS</span>
            <div className="spc-tb-lots-wrap">
              <button className="spc-tb-lots-btn" onClick={() => setLots(l => Math.max(1, l-1))}>−</button>
              <input type="number" value={lots} min={1} step={1} className="spc-tb-lots-input"
                onChange={e => setLots(Math.max(1, +e.target.value || 1))}/>
              <button className="spc-tb-lots-btn" onClick={() => setLots(l => l+1)}>+</button>
            </div>
            <span className="spc-tb-lots-units">{lots * LOT} units</span>
          </div>

        </div>

        {/* Right cluster: top setups */}
        {top.length > 0 && (
          <div className="spc-tb-right">
            <span className="spc-tb-setups-lbl">TODAY'S SETUPS</span>
            {top.map(s => (
              <button key={s.id} className={`spc-tb-setup-btn ${selId===s.id?'active':''}`} onClick={() => setSelId(s.id)}>
                <span className="spc-tb-setup-name">{s.label}</span>
                <span className="spc-tb-setup-score" style={{color:scores[s.id]>=8?'#00C896':'#F59E0B'}}>{scores[s.id]}/10</span>
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
                <div className="spc-glabel">
                  <span className="spc-glabel-dot" style={{background:g.color}}/>
                  <span style={{color:g.color}}>{g.label.toUpperCase()}</span>
                </div>
                {g.strategies.map(s => {
                  const sc = scores[s.id];
                  const scoreC = sc>=8?'#00C896':sc>=6?'#F59E0B':'#666';
                  const hasSession = loadSession(s.id)?.some(l => l.p > 0);
                  return (
                    <div key={s.id}
                      className={`spc-item ${selId===s.id?'spc-item-on':''}`}
                      onClick={() => setSelId(s.id)}>
                      <span className="spc-item-name">{s.label}</span>
                      <div className="spc-item-meta">
                        {hasSession && <span className="spc-item-dot-saved">●</span>}
                        <span className="spc-item-score" style={{color:scoreC}}>{sc}/10</span>
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
              lots={lots} setLots={setLots} symbol={symbol}
              onBT={id => onSwitchToBacktest && onSwitchToBacktest(id)}
              sharedFrom={sharedFrom}/>
          ) : (
            <div className="spc-cmp-grid">
              <Detail strat={sel} spot={spot} vix={vix} dte={dte} expiry={curExp?.raw}
                lots={lots} setLots={setLots} symbol={symbol}
                onBT={id => onSwitchToBacktest && onSwitchToBacktest(id)}
                sharedFrom={sharedFrom}/>
              <div className="spc-cmp-div"/>
              <Detail strat={cmp} spot={spot} vix={vix} dte={dte} expiry={curExp?.raw}
                lots={lots} setLots={setLots} symbol={symbol}
                onBT={id => onSwitchToBacktest && onSwitchToBacktest(id)}
                sharedFrom={null}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
