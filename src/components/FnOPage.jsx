// src/components/FnOPage.jsx
// India F&O Dashboard — redesigned for options traders
import { useState, useEffect } from 'react';
import FiiDii from './FiiDii';
import { getNiftyExpiries, formatDuration } from '../utils/timezone';

function KitePrompt({ text }) {
  return (
    <div className="fno-kite-nudge">
      <span className="fno-kite-nudge-text">{text}</span>
      <a href="/api/kite-auth" className="fno-kite-nudge-btn">Login with Kite →</a>
    </div>
  );
}

function useIndiaVIX() {
  const [vix, setVix]         = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/quote?symbol=%5EINDIAVIX');
        const json = await res.json();
        const r    = json?.chart?.result?.[0];
        if (!r) return;
        const price     = r.meta.regularMarketPrice;
        const prevClose = r.meta.chartPreviousClose ?? r.meta.previousClose;
        setVix({ price, prevClose, change: price - prevClose, changePct: ((price - prevClose) / prevClose) * 100 });
      } catch (_) {}
      setLoading(false);
    };
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);
  return { vix, loading };
}

// Always fetch — show login prompt only on actual 401 response
// (never gate on a status check that might fail)

function ExpiryCard({ label, date, secsLeft, color, shifted, originalDate, holidayName }) {
  const [secs, setSecs] = useState(secsLeft);
  useEffect(() => {
    setSecs(secsLeft);
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secsLeft]);
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600),
        m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const p = n => String(n).padStart(2, '0');
  return (
    <div className="t-expiry-card" style={{ '--ec': color }}>
      <div className="t-expiry-top"><span className="t-expiry-label">{label}</span><span className="t-expiry-date">{date}</span></div>
      {shifted && <div className="t-expiry-shifted">⚠ {originalDate} is {holidayName} · shifted</div>}
      <div className="t-expiry-clock">
        {d > 0 && <><span className="t-cn">{d}</span><span className="t-cu">d</span></>}
        <span className="t-cn">{p(h)}</span><span className="t-cu">h</span>
        <span className="t-cn">{p(m)}</span><span className="t-cu">m</span>
        <span className="t-cn t-secs">{p(s)}</span><span className="t-cu">s</span>
      </div>
    </div>
  );
}

function VIXCard({ vix, loading }) {
  if (loading) return <div className="t-card t-loading">Loading VIX...</div>;
  if (!vix)    return <div className="t-card t-loading">VIX unavailable</div>;
  const v = vix.price;
  const zone = v < 12 ? { label: 'LOW VOL',  color: '#00C896' }
             : v < 20 ? { label: 'NORMAL',    color: '#4A9EFF' }
             : v < 30 ? { label: 'ELEVATED',  color: '#F59E0B' }
             :           { label: 'HIGH FEAR', color: '#FF4455' };
  const gain = vix.changePct >= 0;
  return (
    <div className="t-card t-vix-card">
      <div className="t-card-label">INDIA VIX</div>
      <div className="t-vix-main">
        <span className="t-vix-price">{v.toFixed(2)}</span>
        <span className="t-vix-badge" style={{ color: zone.color, background: `${zone.color}18`, border: `1px solid ${zone.color}30` }}>{zone.label}</span>
      </div>
      <div className={`t-vix-chg ${gain ? 'loss' : 'gain'}`}>{gain ? '▲' : '▼'} {Math.abs(vix.changePct).toFixed(2)}% {gain ? '↑ Fear rising' : '↓ Fear easing'}</div>
      <div className="t-vix-bar"><div className="t-vix-fill" style={{ width: `${Math.min((v/50)*100,100)}%`, background: zone.color }} /></div>
      <div className="t-vix-scale"><span>0</span><span>12</span><span>20</span><span>30</span><span>50</span></div>
      <div className="t-vix-note">{v < 15 ? 'Calm markets — cheap premiums' : v < 20 ? 'Normal range — balanced premiums' : v < 30 ? 'Elevated fear — expensive premiums' : 'High fear — premiums very expensive'}</div>
    </div>
  );
}

function FuturesPremium() {
  const [data, setData]       = useState(null);
  const [noToken, setNoToken] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const [spotRes, futRes] = await Promise.all([fetch('/api/nse-india'), fetch('/api/kite-data?type=futures')]);
        if (futRes.status === 401) { setNoToken(true); return; }
        setNoToken(false);
        const spotD = await spotRes.json(), futD = await futRes.json();
        const spot = spotD?.nifty50?.price || spotD?.niftyLast, fut = futD?.price;
        if (spot && fut) {
          const premium = parseFloat((fut - spot).toFixed(2)), pct = parseFloat(((premium/spot)*100).toFixed(2));
          setData({ spot, fut, premium, pct, symbol: futD.symbol, oi: futD.oi });
        }
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);
  const pos = data?.premium >= 0;
  return (
    <div className="t-card">
      <div className="t-card-label">FUTURES PREMIUM {data?.symbol && <span className="t-sym">{data.symbol}</span>}</div>
      {noToken ? <KitePrompt text="Requires Kite login" /> : !data ? <div className="t-loading">Fetching...</div> : (
        <>
          <div className="t-futures-row">
            <div className="t-stat"><div className="t-stat-l">Spot</div><div className="t-stat-v">{data.spot?.toLocaleString('en-IN')}</div></div>
            <div className="t-stat"><div className="t-stat-l">Futures</div><div className="t-stat-v">{data.fut?.toLocaleString('en-IN')}</div></div>
            <div className="t-stat"><div className="t-stat-l">Premium</div><div className={`t-stat-v t-stat-big ${pos?'gain':'loss'}`}>{pos?'+':''}{data.premium} ({pos?'+':''}{data.pct}%)</div></div>
          </div>
          <div className={`t-futures-signal ${pos?'t-bull':'t-bear'}`}><span className="t-sig-dot" />{pos?'Bullish bias — pricing upside':'Bearish bias — pricing downside'}</div>
          {data.oi && <div className="t-futures-oi">OI: {(data.oi/1000).toFixed(0)}K contracts</div>}
        </>
      )}
    </div>
  );
}

function AdvanceDecline() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/nse-india'), d = await r.json(), n = d?.nifty50;
        if (n?.advances != null) {
          const adv = n.advances, dec = n.declines, unch = n.unchanged || 0, total = adv + dec + unch || 50;
          setData({ adv, dec, unch, advPct: Math.round((adv/total)*100), decPct: Math.round((dec/total)*100) });
        }
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="t-card">
      <div className="t-card-label">NIFTY 50 BREADTH</div>
      {!data ? <div className="t-loading">Loading...</div> : (
        <>
          <div className="t-ad-row">
            <div className="t-ad-num gain">{data.adv}<span className="t-ad-sub">up</span></div>
            <div className="t-ad-bar"><div className="t-ad-bar-a" style={{width:`${data.advPct}%`}}/><div className="t-ad-bar-d" style={{width:`${data.decPct}%`}}/></div>
            <div className="t-ad-num loss">{data.dec}<span className="t-ad-sub">dn</span></div>
          </div>
          {data.unch > 0 && <div className="t-ad-unch">{data.unch} unchanged</div>}
          <div className={`t-ad-signal ${data.adv > data.dec*1.5?'gain':data.dec > data.adv*1.5?'loss':''}`}>
            {data.adv > data.dec*1.5 ? '↑ Broad strength' : data.dec > data.adv*1.5 ? '↓ Broad weakness' : '⇌ Mixed market'}
          </div>
        </>
      )}
    </div>
  );
}

function VWAPCard() {
  const [data, setData]       = useState(null);
  const [noToken, setNoToken] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/kite-data?type=vwap');
        if (r.status === 401) { setNoToken(true); return; }
        setNoToken(false);
        const j = await r.json();
        if (j.vwap) setData(j);
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);
  const above = data?.signal === 'above';
  const diff  = data?.currentPrice && data?.vwap ? data.currentPrice - data.vwap : 0;
  return (
    <div className="t-card">
      <div className="t-card-label">NIFTY FUTURES — VWAP</div>
      {noToken ? <KitePrompt text="Requires Kite login" /> : !data ? <div className="t-loading">Available during market hours (9:15–15:30 IST)</div> : (
        <>
          <div className="t-futures-row">
            <div className="t-stat"><div className="t-stat-l">VWAP</div><div className="t-stat-v">{data.vwap?.toLocaleString('en-IN')}</div></div>
            <div className="t-stat"><div className="t-stat-l">Last</div><div className={`t-stat-v ${above?'gain':'loss'}`}>{data.currentPrice?.toLocaleString('en-IN')}</div></div>
            <div className="t-stat"><div className="t-stat-l">vs VWAP</div><div className={`t-stat-v ${above?'gain':'loss'}`}>{above?'+':''}{diff.toFixed(2)}</div></div>
          </div>
          <div className={`t-futures-signal ${above?'t-bull':'t-bear'}`}><span className="t-sig-dot" />{above?'Above VWAP — Bullish intraday':'Below VWAP — Bearish intraday'}</div>
          <div className="t-futures-oi">Based on {data.candles} × 5min candles since open</div>
        </>
      )}
    </div>
  );
}

function OIBuildup() {
  const [data, setData]       = useState(null);
  const [noToken, setNoToken] = useState(false);
  const SIGNALS = {
    long_buildup:   { label: 'Long Buildup',   color: '#00C896', note: 'Price ↑ + OI ↑ · Fresh longs added' },
    short_buildup:  { label: 'Short Buildup',  color: '#FF4455', note: 'Price ↓ + OI ↑ · Fresh shorts added' },
    short_covering: { label: 'Short Covering', color: '#34D399', note: 'Price ↑ + OI ↓ · Shorts exiting' },
    long_unwinding: { label: 'Long Unwinding', color: '#F97316', note: 'Price ↓ + OI ↓ · Longs exiting' },
    neutral:        { label: 'Neutral',         color: '#64748B', note: 'No clear direction' },
  };
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/kite-data?type=oi');
        if (r.status === 401) { setNoToken(true); return; }
        setNoToken(false);
        const j = await r.json();
        if (j.nifty) setData(j);
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="t-card">
      <div className="t-card-label">OI BUILDUP — FUTURES</div>
      {noToken ? <KitePrompt text="Requires Kite login" /> : !data ? <div className="t-loading">Fetching OI data...</div> : (
        <div className="t-oi-body">
          {[['nifty','Nifty 50'],['banknifty','Bank Nifty']].map(([key, name]) => {
            const d = data[key]; if (!d) return null;
            const m = SIGNALS[d.signal] || SIGNALS.neutral;
            return (
              <div key={key} className="t-oi-row">
                <div className="t-oi-name">{name}</div>
                <div className="t-oi-price">
                  <span className={d.changePct>=0?'gain':'loss'}>{d.price?.toLocaleString('en-IN')}</span>
                  <span className={`t-oi-chg ${d.changePct>=0?'gain':'loss'}`}>{d.changePct>=0?'+':''}{d.changePct}%</span>
                </div>
                <div className="t-oi-data">
                  <span className="t-oi-val">{d.oi?(d.oi/100000).toFixed(1)+'L':'—'}</span>
                  {d.oiChange!==0 && <span className={`t-oi-delta ${d.oiChange>0?'gain':'loss'}`}>{d.oiChange>0?'+':''}{d.oiChangePct}%</span>}
                </div>
                <div className="t-oi-sig" style={{color:m.color, background:`${m.color}12`, borderColor:`${m.color}30`}}>{m.label}</div>
                <div className="t-oi-note">{m.note}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PCRPanel() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex]     = useState('NIFTY');
  const INDICES = [
    { key:'NIFTY',     label:'Nifty 50',   color:'#4A9EFF' },
    { key:'BANKNIFTY', label:'Bank Nifty', color:'#F59E0B' },
    { key:'SENSEX',    label:'Sensex',     color:'#A78BFA' },
  ];
  useEffect(() => {
    setLoading(true); setData(null);
    const load = async () => {
      try { const r = await fetch(`/api/kite-data?type=pcr&index=${index}`), j = await r.json(); if (j.pcr!=null) setData(j); } catch(_) {}
      setLoading(false);
    };
    load(); const id = setInterval(load, 60000); return () => clearInterval(id);
  }, [index]);
  const idx    = INDICES.find(i => i.key === index);
  const pcr    = data?.pcr || 0;
  const signal = pcr>1.2 ? {label:'BULLISH',color:'#00C896',note:'Puts dominate — market hedged / bullish'}
               : pcr<0.8 ? {label:'BEARISH',color:'#FF4455',note:'Calls dominate — market complacent / bearish'}
               :            {label:'NEUTRAL',color:'#F59E0B',note:'Balanced put-call activity'};
  const noOI   = data && data.totalCallOI===0 && data.totalPutOI===0;
  const mpDiff = data?.maxPain && data?.spot ? data.maxPain - data.spot : null;
  return (
    <div className="t-card t-pcr-card">
      <div className="t-pcr-header">
        <div><div className="t-card-label">PCR · PUT-CALL RATIO</div><div className="t-pcr-sub">{data?.expiry||'—'} · {idx?.label} Weekly</div></div>
        <div className="fno-index-tabs">{INDICES.map(i=>(
          <button key={i.key} className={`fno-index-tab ${index===i.key?'fno-index-tab-active':''}`}
            style={index===i.key?{borderColor:i.color,color:i.color}:{}} onClick={()=>setIndex(i.key)}>{i.label}</button>
        ))}</div>
      </div>
      {loading ? <div className="t-loading">Fetching option chain...</div> : !data ? <div className="t-loading">Unavailable — market may be closed</div> : noOI ? (
        <div className="t-loading">OI is 0 — NSE may be blocking. <a href="/api/kite-auth" className="fno-kite-nudge-btn" style={{display:'inline-block',marginLeft:8}}>Login with Kite</a></div>
      ) : (
        <>
          <div className="t-pcr-body">
            <div className="t-pcr-num-wrap">
              <div className="t-pcr-num" style={{color:signal.color}}>{pcr.toFixed(2)}</div>
              <div className="t-pcr-badge" style={{color:signal.color,background:`${signal.color}15`,border:`1px solid ${signal.color}35`}}>{signal.label}</div>
              <div className="t-pcr-note">{signal.note}</div>
            </div>
            <div className="t-pcr-oi-summary">
              <div className="t-pcr-oi-item"><span className="t-pcr-oi-l">Call OI</span><span className="t-pcr-oi-v loss">{(data.totalCallOI/100000).toFixed(1)}L</span></div>
              <div className="t-pcr-oi-divider"/>
              <div className="t-pcr-oi-item"><span className="t-pcr-oi-l">Put OI</span><span className="t-pcr-oi-v gain">{(data.totalPutOI/100000).toFixed(1)}L</span></div>
              {data.atmIV && <><div className="t-pcr-oi-divider"/><div className="t-pcr-oi-item"><span className="t-pcr-oi-l">ATM IV</span><span className="t-pcr-oi-v">{data.atmIV}%</span></div></>}
            </div>
            {data.maxPain>0 && (
              <div className="t-maxpain">
                <span className="t-maxpain-label">MAX PAIN</span>
                <span className="t-maxpain-val">{data.maxPain.toLocaleString('en-IN')}</span>
                {mpDiff!==null && <span className={`t-maxpain-diff ${mpDiff>=0?'gain':'loss'}`}>{mpDiff>=0?'+':''}{mpDiff.toFixed(0)} pts from spot</span>}
                <span className="t-maxpain-note">Index gravitates toward this level at expiry</span>
              </div>
            )}
          </div>
          {data.topStrikes?.length>0 && (
            <div className="t-strikes">
              <div className="t-strikes-hdr"><span>Strike</span><span>Call OI</span><span style={{flex:1}}></span><span>Put OI</span></div>
              {data.topStrikes.map(s=>{
                const isATM = s.strike===data.atmStrike, callW = s.totalOI>0?(s.callOI/s.totalOI)*100:50;
                return (
                  <div key={s.strike} className={`t-strike-row ${isATM?'t-strike-atm':''}`}>
                    <span className="t-strike-val">{s.strike.toLocaleString('en-IN')}{isATM?' ★':''}</span>
                    <span className="t-strike-c loss">{(s.callOI/100000).toFixed(1)}L</span>
                    <div className="t-strike-bar"><div className="t-strike-call" style={{width:`${callW}%`}}/><div className="t-strike-put" style={{width:`${100-callW}%`}}/></div>
                    <span className="t-strike-p gain">{(s.putOI/100000).toFixed(1)}L</span>
                  </div>
                );
              })}
              <div className="t-strikes-leg"><span className="loss">▬ Calls</span><span className="gain">▬ Puts</span></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StraddleChain() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex]     = useState('NIFTY');
  const INDICES = [
    { key:'NIFTY',     label:'Nifty 50',   color:'#4A9EFF' },
    { key:'BANKNIFTY', label:'Bank Nifty', color:'#F59E0B' },
    { key:'SENSEX',    label:'Sensex',     color:'#A78BFA' },
  ];
  useEffect(() => {
    setLoading(true); setData(null);
    const load = async () => {
      try { const r = await fetch(`/api/kite-data?type=straddle&index=${index}`), j = await r.json(); if (j.straddles?.length) setData(j); } catch(_) {}
      setLoading(false);
    };
    load(); const id = setInterval(load, 30000); return () => clearInterval(id);
  }, [index]);
  return (
    <div className="t-card t-straddle-card">
      <div className="t-pcr-header">
        <div>
          <div className="t-card-label">
            STRADDLE CHAIN
            {data?.source==='kite' && <span className="t-src t-src-kite">Kite</span>}
            {data?.source==='nse'  && <span className="t-src t-src-nse">NSE</span>}
          </div>
          <div className="t-pcr-sub">
            {data?.expiry||'—'} · Spot: {data?.spot?.toLocaleString('en-IN')||'—'}
            {data?.expectedMove!=null && <span className="t-expected-move"> · Expected move: <strong>±{data.expectedMove}% (±{Math.round((data.spot||0)*data.expectedMove/100)} pts)</strong></span>}
          </div>
        </div>
        <div className="fno-index-tabs">{INDICES.map(i=>(
          <button key={i.key} className={`fno-index-tab ${index===i.key?'fno-index-tab-active':''}`}
            style={index===i.key?{borderColor:i.color,color:i.color}:{}} onClick={()=>setIndex(i.key)}>{i.label}</button>
        ))}</div>
      </div>
      {loading ? <div className="t-loading">Fetching straddle chain...</div> : !data ? <div className="t-loading">Option chain unavailable — market may be closed</div> : (
        <div className="t-straddle-table">
          <div className="t-straddle-hdr">
            <span className="t-sth-call">CALL LTP</span><span className="t-sth-coi">CALL OI</span>
            <span className="t-sth-strike">STRIKE</span>
            <span className="t-sth-poi">PUT OI</span><span className="t-sth-put">PUT LTP</span>
            <span className="t-sth-straddle">STRADDLE</span><span className="t-sth-iv">IV</span>
          </div>
          {data.straddles.map(s=>(
            <div key={s.strike} className={`t-straddle-row ${s.isATM?'t-straddle-atm':''}`}>
              <span className="t-sth-call loss">{s.callLTP.toFixed(1)}</span>
              <span className="t-sth-coi">{(s.callOI/100000).toFixed(1)}L</span>
              <span className="t-sth-strike">{s.strike.toLocaleString('en-IN')}{s.isATM?' ★':''}</span>
              <span className="t-sth-poi">{(s.putOI/100000).toFixed(1)}L</span>
              <span className="t-sth-put gain">{s.putLTP.toFixed(1)}</span>
              <span className="t-sth-straddle">{s.straddle.toFixed(1)}</span>
              <span className="t-sth-iv">{s.iv?`${s.iv}%`:'—'}</span>
            </div>
          ))}
          <div className="t-straddle-note">★ ATM · Straddle = Call LTP + Put LTP · Expected move = ATM straddle ÷ spot</div>
        </div>
      )}
    </div>
  );
}

export default function FnOPage() {
  const { vix, loading: vixLoading } = useIndiaVIX();
  const [kiteOn, setKiteOn]          = useState(false);
  const FALLBACK_HOLIDAYS = ['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25'];
  const FALLBACK_NAMES = {'2026-01-26':'Republic Day','2026-02-17':'Mahashivratri','2026-03-03':'Holi','2026-03-26':'Ram Navami','2026-03-31':'Mahavir Jayanti','2026-04-03':'Good Friday','2026-04-14':'Ambedkar Jayanti','2026-05-01':'Maharashtra Day','2026-05-28':'Bakri Id','2026-06-26':'Muharram','2026-09-14':'Ganesh Chaturthi','2026-10-02':'Gandhi Jayanti','2026-10-20':'Dussehra','2026-11-10':'Diwali Balipratipada','2026-11-24':'Guru Nanak Jayanti','2026-12-25':'Christmas'};
  const [holidays, setHolidays]           = useState(FALLBACK_HOLIDAYS);
  const [holidayNames, setHolidayNames]   = useState(FALLBACK_NAMES);
  const [expiries, setExpiries]           = useState(() => getNiftyExpiries(FALLBACK_HOLIDAYS, FALLBACK_NAMES));
  const [holidaySource, setHolidaySource] = useState('');

  // Check Kite status just for the header badge — data components fetch independently
  useEffect(() => {
    fetch('/api/kite-auth?type=status').then(r=>r.json()).then(d=>setKiteOn(!!d.authenticated)).catch(()=>{});
  }, []);
  useEffect(() => {
    fetch('/api/holidays').then(r=>r.json()).then(d=>{
      const h=d.holidays||[], n=d.holidayNames||{};
      setHolidays(h); setHolidayNames(n); setHolidaySource(d.source||''); setExpiries(getNiftyExpiries(h,n));
    }).catch(()=>{});
  }, []);
  useEffect(() => {
    const id = setInterval(() => setExpiries(getNiftyExpiries(holidays, holidayNames)), 60000);
    return () => clearInterval(id);
  }, [holidays, holidayNames]);

  return (
    <div className="t-fno-wrap">
      {/* Header */}
      <div className="t-fno-hdr">
        <div className="t-fno-title">
          India F&amp;O <span className="t-fno-sub">Options · Futures · Flow</span>
        </div>
        <div className="t-fno-hdr-right">
          {kiteOn ? (
            <div className="t-kite-status t-kite-on"><span className="t-kite-dot"/>Kite live — all data active</div>
          ) : (
            <div className="t-kite-status t-kite-off"><span className="t-kite-dot"/><a href="/api/kite-auth">Login with Kite</a> for futures, VWAP &amp; OI</div>
          )}
        </div>
      </div>

      {/* Expiry countdowns */}
      <div className="t-row t-expiry-row">
        <div className="t-expiry-group">
          <div className="t-group-label">Nifty 50 <span className="t-group-rule">Tue weekly · last-Thu monthly</span></div>
          <div className="t-expiry-pair">
            <ExpiryCard label="Weekly"  color="#4A9EFF" {...expiries.niftyWeekly}  />
            <ExpiryCard label="Monthly" color="#4A9EFF" {...expiries.niftyMonthly} />
          </div>
        </div>
        <div className="t-expiry-group">
          <div className="t-group-label">Sensex <span className="t-group-rule">Thu weekly · last-Thu monthly</span></div>
          <div className="t-expiry-pair">
            <ExpiryCard label="Weekly"  color="#F59E0B" {...expiries.sensexWeekly}  />
            <ExpiryCard label="Monthly" color="#F59E0B" {...expiries.sensexMonthly} />
          </div>
        </div>
        <div className="t-expiry-note">
          Holiday-adjusted · 15:30 IST{holidaySource==='nse-live'&&<span className="t-holiday-live"> · NSE calendar live</span>}
        </div>
      </div>

      {/* Row: VIX · Futures · Breadth · VWAP */}
      <div className="t-row t-row-4">
        <VIXCard vix={vix} loading={vixLoading} />
        <FuturesPremium />
        <AdvanceDecline />
        <VWAPCard />
      </div>

      {/* Row: PCR + OI Buildup */}
      <div className="t-row t-row-pcr">
        <PCRPanel />
        <OIBuildup />
      </div>

      {/* Straddle Chain */}
      <div className="t-row">
        <StraddleChain />
      </div>

      {/* FII / DII */}
      <div className="t-row">
        <div className="t-card t-fiidii-card">
          <div className="t-card-label">FII / DII FLOW</div>
          <FiiDii />
        </div>
      </div>
    </div>
  );
}
