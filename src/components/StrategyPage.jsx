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
function PayoffChart({ legs, spot, vix, dte, lots }) {
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

  const W=660, H=190, PAD={t:18,r:12,b:38,l:64};
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
          <clipPath id="spc3cl"><rect x={PAD.l} y={PAD.t} width={CW} height={CH}/></clipPath>
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
          {zy>=PAD.t&&zy<=PAD.t+CH&&<line x1={PAD.l} y1={zy} x2={PAD.l+CW} y2={zy} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="5,4"/>}
          {/* Fills */}
          <path d={fillPath(expPnls,true)} fill="rgba(0,200,150,0.1)" clipPath="url(#spc3cl)"/>
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
          <path d={mkPath(nowPnls)} fill="none" stroke="#4A9EFF" strokeWidth="2" strokeDasharray="6,3" strokeLinejoin="round" clipPath="url(#spc3cl)"/>
          {/* Expiry path solid */}
          <path d={mkPath(expPnls)} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinejoin="round" clipPath="url(#spc3cl)"/>
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
                <rect x={tx2} y={20} width={110} height={52} rx="4" fill="#1E1E22" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                <text x={tx2+55} y={33} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="monospace">{Math.round(hvPnl.s).toLocaleString('en-IN')}</text>
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
  const fmt = n => { const a=Math.abs(n); return a>=100000?`₹${(a/100000).toFixed(1)}L`:a>=1000?`₹${(a/1000).toFixed(1)}k`:`₹${Math.round(a).toLocaleString('en-IN')}`; };

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
  const hasLastSession = lastSession && JSON.stringify(lastSession) !== JSON.stringify(strat.legs(atm, w));

  return (
    <div className="spc-detail">
      {/* Header */}
      <div className="spc-dhead">
        <div>
          <div className="spc-dname">{strat.label}</div>
          <div className="spc-dhook">{strat.hook}</div>
        </div>
        <div className="spc-dscore" style={{borderColor:scoreC+'40',background:scoreC+'0D'}}>
          <div className="spc-dscore-num" style={{color:scoreC}}>{sc}/10</div>
          <div className="spc-dscore-lbl" style={{color:scoreC}}>{sc>=8?'Strong setup':sc>=6?'Decent':'Weak'}</div>
        </div>
      </div>

      {/* Last session banner */}
      {hasLastSession && (
        <div className="spc-session-banner">
          <span>📋 Restored your last session for this strategy</span>
          <button onClick={resetLegs} className="spc-session-reset">Reset to default</button>
        </div>
      )}

      {/* Shared from banner */}
      {sharedFrom?.stratId === strat.id && (
        <div className="spc-share-banner">
          <span>🔗 Someone shared this setup with you</span>
        </div>
      )}

      {/* Stats */}
      <div className="spc-dstats">
        {[
          ['Net '+(isC?'Collected':'Cost'), fmt(Math.abs(net*lots*LOT)), isC?'#00C896':'#FF4455'],
          ['Max Profit', iu(maxP)?'Unlimited':fmt(maxP), '#00C896'],
          ['Max Loss',   iu(maxL)?'Unlimited':fmt(Math.abs(maxL)), '#FF4455'],
        ].map(([l,v,c]) => (
          <div key={l} className="spc-dstat">
            <div className="spc-dstat-l">{l}</div>
            <div className="spc-dstat-v" style={{color:c}}>{v}</div>
          </div>
        ))}
        <div className="spc-dstat">
          <div className="spc-dstat-l">Lots</div>
          <input type="number" value={lots} min={1} step={1} className="spc-lots" onChange={e=>setLots(Math.max(1,+e.target.value))}/>
        </div>
      </div>

      {/* Premium input section */}
      <div className="spc-prem-header">
        <div>
          <span className="spc-section-lbl" style={{marginBottom:0}}>LEGS · enter premiums from your broker</span>
          {saved && <span className="spc-autosave">✓ auto-saved</span>}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className="spc-prem-hint-btn" onClick={() => setShowPremiumHint(v=>!v)}>
            How to get premiums?
          </button>
          <button className="spc-reset-btn" onClick={resetPremiums}>↺ Estimate</button>
          <button className="spc-reset-btn" onClick={resetLegs}>↺ Reset ATM</button>
        </div>
      </div>

      {showPremiumHint && (
        <div className="spc-hint-box">
          <strong>How to get live premiums:</strong>
          <ol>
            <li>Open Kite (or any broker) → Option Chain</li>
            <li>Select the same expiry as chosen above</li>
            <li>Find your strike → note the LTP (Last Traded Price)</li>
            <li>Type that number in the Premium field below</li>
          </ol>
          <p>Or click <strong>↺ Estimate</strong> to auto-fill with Black-Scholes estimates based on current VIX.</p>
        </div>
      )}

      <div className="spc-dlegs">
        {legs.map((l,i) => (
          <div key={i} className="spc-dleg">
            <span style={{color:l.q>0?'#4A9EFF':'#F59E0B',fontWeight:700,fontSize:11,fontFamily:'monospace',flexShrink:0}}>
              {l.q>0?'BUY':'SELL'}{Math.abs(l.q)>1?` ${Math.abs(l.q)}×`:''}
            </span>
            <span style={{color:l.t==='CE'?'#FF8090':'#80FFD0',fontWeight:700,fontSize:11,fontFamily:'monospace',flexShrink:0}}>
              {l.t==='CE'?'CALL':'PUT'}
            </span>
            <div className="spc-strike-wrap">
              <span className="spc-strike-lbl">Strike</span>
              <input type="number" value={l.k} step={step} className="spc-strike-input" onChange={e=>updK(i,e.target.value)}/>
            </div>
            <div className="spc-prem-wrap">
              <span className="spc-strike-lbl">Premium ₹</span>
              <input type="number" value={l.p||''} step={0.5} min={0} placeholder="0"
                className={`spc-prem-input ${l.p>0?'spc-prem-filled':''}`}
                onChange={e=>updP(i,e.target.value)}/>
            </div>
            {l.p > 0 && (
              <span style={{marginLeft:'auto',color:l.q>0?'#FF4455':'#00C896',fontSize:11,fontFamily:'monospace',fontWeight:600,flexShrink:0}}>
                {l.q>0?'-':'+'}₹{fmt(Math.abs(l.q*l.p*lots*LOT))}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Payoff */}
      {legs.some(l => l.p > 0) ? (
        <>
          <div className="spc-section-lbl">PAYOFF · hover for P&L · sliders to model scenarios</div>
          <PayoffChart legs={legs} spot={spot} vix={vix} dte={dte} lots={lots}/>
          <div className="spc-section-lbl" style={{marginTop:10}}>GREEKS · per {lots} lot{lots>1?'s':''}</div>
          <Greeks legs={legs} spot={spot} vix={vix} dte={dte} lots={lots}/>
        </>
      ) : (
        <div className="spc-prem-prompt">
          Enter the premium above to view the payoff diagram and greeks
        </div>
      )}

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

      {/* Actions */}
      <div className="spc-actions">
        <button className="spc-share-btn" onClick={handleShare}>
          {copied ? '✓ Link copied!' : '🔗 Share this setup'}
        </button>
        <button className="spc-bt-btn" onClick={() => onBT && onBT(strat.id)}>
          Backtest with real NSE data →
        </button>
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function StrategyPage({ data, onSwitchToBacktest }) {
  const spot = data?.nifty50?.price ? Math.round(data.nifty50.price) : 23000;
  const vix  = data?.vix?.price || 16;

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
                  const hasSession = lastS && JSON.stringify(lastS) !== JSON.stringify(s.legs(Math.round(spot/(spot>10000?100:50))*( spot>10000?100:50), (spot>10000?100:50)*2));
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
