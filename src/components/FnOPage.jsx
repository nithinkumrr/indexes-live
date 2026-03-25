import { useState, useEffect } from 'react';
import FiiDii from './FiiDii';
import { getNiftyExpiries, getIndiaMarketStatus, formatDuration } from '../utils/timezone';

// Reusable Kite login nudge
function KitePrompt({ text }) {
  return (
    <div className="fno-kite-nudge">
      <span className="fno-kite-nudge-text">{text}</span>
      <a href="/api/kite-auth" className="fno-kite-nudge-btn">Login with Kite →</a>
    </div>
  );
}

// ── India VIX ────────────────────────────────────────────────────────
function useIndiaVIX() {
  const [vix, setVix]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    try {
      const res  = await fetch('/api/quote?symbol=%5EINDIAVIX');
      const json = await res.json();
      const r    = json?.chart?.result?.[0];
      if (!r) return;
      const price     = r.meta.regularMarketPrice;
      const prevClose = r.meta.chartPreviousClose ?? r.meta.previousClose;
      const change    = price - prevClose;
      const changePct = (change / prevClose) * 100;
      setVix({ price, prevClose, change, changePct });
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetch_(); const id = setInterval(fetch_, 20000); return () => clearInterval(id); }, []);
  return { vix, loading };
}

// ── Expiry countdown card ─────────────────────────────────────────────
function ExpiryCard({ label, date, secsLeft, color, shifted, originalDate, holidayName, indexName }) {
  const [secs, setSecs] = useState(secsLeft);
  useEffect(() => {
    setSecs(secsLeft);
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secsLeft]);

  const days = Math.floor(secs / 86400);
  const hrs  = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const sec  = secs % 60;
  const pad  = n => String(n).padStart(2, '0');

  return (
    <div className="fno-expiry-card" style={{ '--expiry-color': color }}>
      {indexName && <div className="fno-expiry-index">{indexName}</div>}
      <div className="fno-expiry-label">{label}</div>
      <div className="fno-expiry-date">{date}</div>
      {shifted && (
        <div className="fno-expiry-nudge">
          ⚠ {originalDate} is {holidayName} · shifted earlier
        </div>
      )}
      <div className="fno-expiry-clock">
        {days > 0 && <><span className="fno-clock-num">{days}</span><span className="fno-clock-unit">d</span></>}
        <span className="fno-clock-num">{pad(hrs)}</span><span className="fno-clock-unit">h</span>
        <span className="fno-clock-num">{pad(mins)}</span><span className="fno-clock-unit">m</span>
        <span className="fno-clock-num fno-clock-secs">{pad(sec)}</span><span className="fno-clock-unit">s</span>
      </div>
      <div className="fno-expiry-sub">to expiry · 15:30 IST</div>
    </div>
  );
}

// ── VIX gauge ─────────────────────────────────────────────────────────
function VIXGauge({ vix }) {
  if (!vix) return null;
  const val  = vix.price;
  const zone = val < 12 ? { label: 'LOW VOLATILITY', color: '#00C896', bg: 'rgba(0,200,150,0.08)' }
             : val < 20 ? { label: 'NORMAL',          color: '#4A9EFF', bg: 'rgba(74,158,255,0.08)' }
             : val < 30 ? { label: 'ELEVATED',         color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' }
             :             { label: 'HIGH FEAR',        color: '#FF4455', bg: 'rgba(255,68,85,0.08)'  };
  const gain = vix.changePct >= 0;

  return (
    <div className="fno-vix-card" style={{ '--vix-color': zone.color, '--vix-bg': zone.bg }}>
      <div className="fno-vix-header">
        <span className="fno-vix-title">India VIX</span>
        <span className="fno-vix-zone">{zone.label}</span>
      </div>
      <div className="fno-vix-price">{val.toFixed(2)}</div>
      <div className="fno-vix-row">
        <span className={`fno-vix-change ${gain ? 'fno-fear' : 'fno-calm'}`}>
          {gain ? '▲' : '▼'} {Math.abs(vix.changePct).toFixed(2)}%
        </span>
        <span className="fno-vix-dir">{gain ? '↑ Fear rising' : '↓ Fear easing'}</span>
      </div>
      <div className="fno-vix-bar-wrap">
        <div className="fno-vix-bar-track">
          <div className="fno-vix-bar-fill" style={{ width: `${Math.min((val / 50) * 100, 100)}%`, background: zone.color }} />
          <div className="fno-vix-bar-needle" style={{ left: `${Math.min((val / 50) * 100, 100)}%` }} />
        </div>
        <div className="fno-vix-bar-labels">
          <span>0</span><span>12</span><span>20</span><span>30</span><span>50+</span>
        </div>
      </div>
      <div className="fno-vix-about">
        Measures expected volatility in Nifty 50 options for the next 30 days. Historically ranges between 15–35 in normal markets. Below 15 = calm, above 35 = high fear. Options premiums rise when VIX is elevated.
      </div>
    </div>
  );
}

// ── Coming soon card ──────────────────────────────────────────────────
function ComingSoonCard({ title, desc }) {
  return (
    <div className="fno-coming-card">
      <div className="fno-coming-title">{title}</div>
      <div className="fno-coming-desc">{desc}</div>
      <div className="fno-coming-badge">Coming Soon</div>
    </div>
  );
}



// ── VIX History Chart ─────────────────────────────────────────────────
function VixSparkline({ points, color }) {
  if (!points?.length) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const w = 200, h = 40;
  const pts = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="vix-spark-svg" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function VixTrend({ vix }) {
  const [history, setHistory] = useState([]);
  useEffect(() => {
    fetch('/api/quote?symbol=%5EINDIAVIX&range=5d&interval=1d')
      .then(r => r.json())
      .then(json => {
        const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
        const times  = json?.chart?.result?.[0]?.timestamp || [];
        const valid  = closes.map((v, i) => v != null ? { v, t: times[i] } : null).filter(Boolean);
        setHistory(valid);
      }).catch(() => {});
  }, []);

  if (!vix || !history.length) return null;
  const pts    = history.map(h => h.v);
  const trend  = pts.length > 1 ? pts[pts.length-1] - pts[0] : 0;
  const color  = vix.price > 20 ? '#FF8C42' : '#00C896';
  const days   = history.map(h => new Date(h.t * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));

  return (
    <div className="vix-trend-wrap">
      <div className="vix-trend-header">
        <span className="vix-trend-label">7-DAY VIX TREND</span>
        <span className={`vix-trend-chg ${trend >= 0 ? 'loss' : 'gain'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(2)} over 5 days
        </span>
      </div>
      <VixSparkline points={pts} color={color} />
      <div className="vix-trend-dates">
        <span>{days[0]}</span>
        <span>{days[days.length-1]}</span>
      </div>
    </div>
  );
}

// ── Futures Premium ───────────────────────────────────────────────────
// ── Futures Premium (auto-rolling via Kite) ───────────────────────────
function FuturesPremium() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [spotRes, futRes] = await Promise.all([
          fetch('/api/nse-india'),
          fetch('/api/kite-data?type=futures'),
        ]);
        const spotD = await spotRes.json();
        const futD  = await futRes.json();
        const spot  = spotD?.nifty50?.price || spotD?.niftyLast;
        const fut   = futD?.price;
        if (spot && fut) {
          const premium = parseFloat((fut - spot).toFixed(2));
          const pct     = parseFloat(((premium / spot) * 100).toFixed(2));
          setData({ spot, fut, premium, pct, symbol: futD.symbol, oi: futD.oi });
        }
      } catch(_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (!data) return (
    <div className="fp-wrap fno-kite-prompt">
      <div className="fp-label">NIFTY FUTURES PREMIUM</div>
      <KitePrompt text="Login with Kite for live futures data" />
    </div>
  );
  const pos = data.premium >= 0;
  return (
    <div className="fp-wrap">
      <div className="fp-label">
        NIFTY FUTURES PREMIUM
        {data.symbol && <span className="fp-sym">{data.symbol}</span>}
      </div>
      <div className="fp-row">
        <div className="fp-stat"><span className="fp-stat-label">Spot</span><span className="fp-stat-val">{data.spot?.toLocaleString('en-IN')}</span></div>
        <div className="fp-stat"><span className="fp-stat-label">Futures</span><span className="fp-stat-val">{data.fut?.toLocaleString('en-IN')}</span></div>
        <div className="fp-stat">
          <span className="fp-stat-label">Premium</span>
          <span className={`fp-stat-val fp-big ${pos ? 'gain' : 'loss'}`}>{pos?'+':''}{data.premium} ({pos?'+':''}{data.pct}%)</span>
        </div>
        <div className="fp-signal">
          <span className={`fp-badge ${pos ? 'fp-bull' : 'fp-bear'}`}>{pos ? '📈 Bullish Bias' : '📉 Bearish Bias'}</span>
          <span className="fp-note">{pos ? 'Market expects upside' : 'Market expects downside'}</span>
        </div>
      </div>
    </div>
  );
}

// ── PCR + Max Pain ────────────────────────────────────────────────────
function PCRPanel() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex]   = useState('NIFTY');

  const INDICES = [
    { key: 'NIFTY',     label: 'Nifty 50',   color: '#4A9EFF' },
    { key: 'BANKNIFTY', label: 'Bank Nifty', color: '#F59E0B' },
    { key: 'SENSEX',    label: 'Sensex',     color: '#A78BFA' },
  ];

  useEffect(() => {
    setLoading(true); setData(null);
    const load = async () => {
      try {
        const r = await fetch(`/api/kite-data?type=pcr&index=${index}`);
        const j = await r.json();
        if (j.pcr != null) { setData(j); }
        setLoading(false);
      } catch(_) { setLoading(false); }
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [index]);
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="fno-loading">Fetching PCR data...</div>;
  if (!data)   return (
    <div className="pcr-wrap">
      <div className="pcr-title">PCR — PUT CALL RATIO</div>
      <div className="fno-unavail">Option chain data unavailable — NSE may be blocking or market is closed</div>
    </div>
  );

  const pcr     = data.pcr;
  const signal  = pcr > 1.2 ? { label: 'BULLISH', color: '#00C896', note: 'Puts dominate — market hedged / bullish' }
                : pcr < 0.8 ? { label: 'BEARISH',  color: '#FF4455', note: 'Calls dominate — market complacent / bearish' }
                :              { label: 'NEUTRAL',  color: '#F59E0B', note: 'Balanced put-call activity' };
  const noOI = data.totalCallOI === 0 && data.totalPutOI === 0;
  const maxPainDiff = data.maxPain && data.spot ? data.maxPain - data.spot : null;

  return (
    <div className="pcr-wrap">
      <div className="pcr-header">
        <div>
          <div className="pcr-title">PCR — PUT CALL RATIO</div>
          <div className="pcr-expiry">{data?.expiry || '—'} · {INDICES.find(i=>i.key===index)?.label} Weekly</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div className="fno-index-tabs">
            {INDICES.map(i => (
              <button key={i.key} className={`fno-index-tab ${index === i.key ? 'fno-index-tab-active' : ''}`}
                style={index === i.key ? { borderColor: i.color, color: i.color } : {}}
                onClick={() => setIndex(i.key)}>{i.label}</button>
            ))}
          </div>
          {data && <div className="pcr-value" style={{ color: (() => { const pcr=data.pcr; return pcr>1.2?'#00C896':pcr<0.8?'#FF4455':'#F59E0B'; })() }}>{data.pcr.toFixed(2)}</div>}
        </div>
      </div>

      <div className="pcr-signal-row">
        {noOI ? (
          <span className="fno-unavail">OI data unavailable — market may be closed or NSE is not responding. Login with Kite for reliable data.</span>
        ) : (
          <>
            <span className="pcr-badge" style={{ background: `${signal.color}18`, border: `1px solid ${signal.color}40`, color: signal.color }}>{signal.label}</span>
            <span className="pcr-note">{signal.note}</span>
          </>
        )}
      </div>

      <div className="pcr-oi-row">
        <div className="pcr-oi-item">
          <span className="pcr-oi-label">Total Call OI</span>
          <span className="pcr-oi-val loss">{(data.totalCallOI/100000).toFixed(1)}L</span>
        </div>
        <div className="pcr-oi-item">
          <span className="pcr-oi-label">Total Put OI</span>
          <span className="pcr-oi-val gain">{(data.totalPutOI/100000).toFixed(1)}L</span>
        </div>
        <div className="pcr-oi-item">
          <span className="pcr-oi-label">ATM IV</span>
          <span className="pcr-oi-val">{data.atmIV ? `${data.atmIV}%` : '—'}</span>
        </div>
      </div>

      {data.maxPain > 0 && (
        <div className="pcr-maxpain">
          <span className="pcr-mp-label">MAX PAIN</span>
          <span className="pcr-mp-val">{data.maxPain.toLocaleString('en-IN')}</span>
          {maxPainDiff !== null && (
            <span className={`pcr-mp-diff ${maxPainDiff >= 0 ? 'gain' : 'loss'}`}>
              {maxPainDiff >= 0 ? '+' : ''}{maxPainDiff.toFixed(0)} pts from spot
            </span>
          )}
          <span className="pcr-mp-note">Gravity level — index often pulls toward this at expiry</span>
        </div>
      )}

      {data.topStrikes?.length > 0 && (
        <div className="pcr-strikes">
          <div className="pcr-strikes-label">OI CONCENTRATION</div>
          {data.topStrikes.map(s => {
            const isATM = s.strike === data.atmStrike;
            const callW = s.totalOI > 0 ? (s.callOI / s.totalOI) * 100 : 50;
            return (
              <div key={s.strike} className={`pcr-strike-row ${isATM ? 'pcr-strike-atm' : ''}`}>
                <span className="pcr-strike-val">{s.strike.toLocaleString('en-IN')}{isATM ? ' ★' : ''}</span>
                <div className="pcr-oi-bar">
                  <div className="pcr-oi-bar-call" style={{ width: `${callW}%` }} />
                  <div className="pcr-oi-bar-put"  style={{ width: `${100-callW}%` }} />
                </div>
                <span className="pcr-oi-c loss">{(s.callOI/100000).toFixed(1)}L</span>
                <span className="pcr-oi-p gain">{(s.putOI/100000).toFixed(1)}L</span>
              </div>
            );
          })}
          <div className="pcr-oi-legend"><span className="loss">■ Call OI</span><span className="gain">■ Put OI</span></div>
        </div>
      )}
    </div>
  );
}

// ── Straddle Chain ────────────────────────────────────────────────────
function StraddleChain() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex]   = useState('NIFTY');

  const INDICES = [
    { key: 'NIFTY',     label: 'Nifty 50',   color: '#4A9EFF' },
    { key: 'BANKNIFTY', label: 'Bank Nifty', color: '#F59E0B' },
    { key: 'SENSEX',    label: 'Sensex',     color: '#A78BFA' },
  ];

  useEffect(() => {
    setLoading(true); setData(null);
    const load = async () => {
      try {
        const r = await fetch(`/api/kite-data?type=straddle&index=${index}`);
        const j = await r.json();
        if (j.straddles) { setData(j); }
        setLoading(false);
      } catch(_) { setLoading(false); }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [index]);
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="fno-loading">Fetching straddle chain...</div>;
  if (!data)   return (
    <div className="straddle-wrap">
      <div className="straddle-title">STRADDLE CHAIN — NIFTY</div>
      <div className="fno-unavail">Option chain data unavailable — NSE may be blocking or market is closed</div>
    </div>
  );

  return (
    <div className="straddle-wrap">
      <div className="straddle-header">
        <div>
          <div className="straddle-title">STRADDLE CHAIN
            {data?.source === 'kite' && <span className="hm-source-badge hm-kite" style={{marginLeft:8}}>via Kite</span>}
            {data?.source === 'nse'  && <span className="hm-source-badge hm-yahoo" style={{marginLeft:8}}>via NSE</span>}
          </div>
          <div className="straddle-sub">{data?.expiry || '—'} · Spot: {data?.spot?.toLocaleString('en-IN') || '—'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div className="fno-index-tabs">
            {INDICES.map(i => (
              <button key={i.key} className={`fno-index-tab ${index === i.key ? 'fno-index-tab-active' : ''}`}
                style={index === i.key ? { borderColor: i.color, color: i.color } : {}}
                onClick={() => setIndex(i.key)}>{i.label}</button>
            ))}
          </div>
          {data?.expectedMove != null && (
            <div className="straddle-move">
              <span className="straddle-move-label">Expected move</span>
              <span className="straddle-move-val">±{data.expectedMove}%</span>
              <span className="straddle-move-pts">±{Math.round((data.spot||0) * data.expectedMove / 100)} pts</span>
            </div>
          )}
        </div>
      </div>

      <div className="straddle-table">
        <div className="straddle-thead">
          <span>Call LTP</span>
          <span>Call OI</span>
          <span>Strike</span>
          <span>Put OI</span>
          <span>Put LTP</span>
          <span>Straddle</span>
          <span>IV</span>
        </div>
        {data.straddles.map(s => (
          <div key={s.strike} className={`straddle-row ${s.isATM ? 'straddle-atm' : ''}`}>
            <span className="loss">{s.callLTP.toFixed(1)}</span>
            <span className="straddle-oi">{(s.callOI/100000).toFixed(1)}L</span>
            <span className="straddle-strike">{s.strike.toLocaleString('en-IN')}{s.isATM ? ' ★' : ''}</span>
            <span className="straddle-oi">{(s.putOI/100000).toFixed(1)}L</span>
            <span className="gain">{s.putLTP.toFixed(1)}</span>
            <span className="straddle-total">{s.straddle.toFixed(1)}</span>
            <span className="straddle-iv">{s.iv ? `${s.iv}%` : '—'}</span>
          </div>
        ))}
      </div>
      <div className="straddle-note">★ ATM strike · Straddle = Call LTP + Put LTP · Expected move based on ATM straddle cost</div>
    </div>
  );
}

// ── VWAP ──────────────────────────────────────────────────────────────
function VWAPPanel() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/kite-data?type=vwap');
        const j = await r.json();
        if (j.vwap) setData(j);
      } catch(_) {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (!data) return (
    <div className="vwap-wrap fno-kite-prompt">
      <div className="vwap-label">NIFTY FUTURES — VWAP</div>
      <KitePrompt text="Login with Kite for intraday VWAP" />
    </div>
  );
  const diff   = data.currentPrice && data.vwap ? (data.currentPrice - data.vwap).toFixed(2) : null;

  return (
    <div className="vwap-wrap">
      <div className="vwap-label">NIFTY FUTURES — VWAP</div>
      <div className="vwap-row">
        <div className="vwap-item">
          <span className="vwap-item-label">VWAP</span>
          <span className="vwap-item-val">{data.vwap?.toLocaleString('en-IN')}</span>
        </div>
        <div className="vwap-item">
          <span className="vwap-item-label">Last Price</span>
          <span className={`vwap-item-val ${above ? 'gain' : 'loss'}`}>{data.currentPrice?.toLocaleString('en-IN')}</span>
        </div>
        {diff && (
          <div className="vwap-item">
            <span className="vwap-item-label">vs VWAP</span>
            <span className={`vwap-item-val ${above ? 'gain' : 'loss'}`}>{above ? '+' : ''}{diff}</span>
          </div>
        )}
        <div className={`vwap-signal ${above ? 'vwap-above' : 'vwap-below'}`}>
          <span className="vwap-sig-dot" />
          {above ? 'Above VWAP — Bullish intraday' : 'Below VWAP — Bearish intraday'}
        </div>
      </div>
    </div>
  );
}

// ── OI Buildup ────────────────────────────────────────────────────────
function OIBuildup() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/kite-data?type=oi');
        const j = await r.json();
        if (j.nifty) setData(j);
      } catch(_) {}
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (!data) return (
    <div className="oib-wrap fno-kite-prompt">
      <div className="oib-label">OI BUILDUP — FUTURES</div>
      <KitePrompt text="Login with Kite for OI buildup signals" />
    </div>
  );
    long_buildup:   { label: 'Long Buildup',   color: '#00C896', note: 'Price ↑ + OI ↑ — fresh longs being added' },
    short_buildup:  { label: 'Short Buildup',  color: '#FF4455', note: 'Price ↓ + OI ↑ — fresh shorts being added' },
    short_covering: { label: 'Short Covering', color: '#34D399', note: 'Price ↑ + OI ↓ — shorts exiting' },
    long_unwinding: { label: 'Long Unwinding', color: '#F97316', note: 'Price ↓ + OI ↓ — longs exiting' },
    neutral:        { label: 'Neutral',         color: '#64748B', note: 'No clear directional signal' },
  };

  return (
    <div className="oib-wrap">
      <div className="oib-label">OI BUILDUP — FUTURES</div>
      {[['nifty', 'Nifty 50'], ['banknifty', 'Bank Nifty']].map(([key, name]) => {
        const d = data[key];
        if (!d) return null;
        const m = SIGNAL_META[d.signal] || SIGNAL_META.neutral;
        return (
          <div key={key} className="oib-row">
            <div className="oib-name">{name}</div>
            <div className="oib-price-col">
              <span className={`oib-price ${d.changePct >= 0 ? 'gain' : 'loss'}`}>{d.price?.toLocaleString('en-IN')}</span>
              <span className={`oib-chg ${d.changePct >= 0 ? 'gain' : 'loss'}`}>{d.changePct >= 0 ? '+' : ''}{d.changePct}%</span>
            </div>
            <div className="oib-oi-col">
              <span className="oib-oi-label">OI</span>
              <span className="oib-oi-val">{d.oi ? (d.oi/100000).toFixed(1) + 'L' : '—'}</span>
              {d.oiChange !== 0 && (
                <span className={`oib-oi-chg ${d.oiChange > 0 ? 'gain' : 'loss'}`}>
                  {d.oiChange > 0 ? '+' : ''}{d.oiChangePct}%
                </span>
              )}
            </div>
            <div className="oib-signal-col">
              <span className="oib-sig-badge" style={{ color: m.color, borderColor: `${m.color}40`, background: `${m.color}12` }}>{m.label}</span>
              <span className="oib-sig-note">{m.note}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Advance / Decline ─────────────────────────────────────────────────
function AdvanceDecline() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/nse-india');
        const d = await r.json();
        const n = d?.nifty50;
        if (n?.advances != null) {
          const adv = n.advances, dec = n.declines, unch = n.unchanged || 0;
          const total = adv + dec + unch || 50;
          setData({ adv, dec, unch, advPct: Math.round((adv/total)*100), decPct: Math.round((dec/total)*100) });
        }
      } catch(_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (!data) return (
    <div className="ad-wrap fno-kite-prompt">
      <div className="ad-label">NIFTY 50 — ADVANCE / DECLINE</div>
      <div className="fno-unavail">Market breadth data loading...</div>
    </div>
  );
      <div className="ad-label">NIFTY 50 — ADVANCE / DECLINE</div>
      <div className="ad-row">
        <div className="ad-stat">
          <span className="ad-num gain">{data.adv}</span>
          <span className="ad-sub">Advancing</span>
        </div>
        <div className="ad-bar-wrap">
          <div className="ad-bar">
            <div className="ad-bar-adv" style={{width: `${data.advPct}%`}}/>
            <div className="ad-bar-dec" style={{width: `${data.decPct}%`}}/>
          </div>
          <div className="ad-ratio">{data.adv}:{data.dec}</div>
        </div>
        <div className="ad-stat">
          <span className="ad-num loss">{data.dec}</span>
          <span className="ad-sub">Declining</span>
        </div>
      </div>
      {data.unch > 0 && <div className="ad-unch">{data.unch} unchanged</div>}
      <div className="ad-note">
        {data.adv > data.dec * 1.5 ? 'Broad market strength — majority of Nifty 50 stocks advancing' :
         data.dec > data.adv * 1.5 ? 'Broad market weakness — majority of Nifty 50 stocks declining' :
         'Mixed market — roughly equal advancers and decliners'}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function FnOPage() {
  const { vix, loading }   = useIndiaVIX();
  // Hardcoded fallback so expiries are correct even before API responds
  const FALLBACK_HOLIDAYS = [
    '2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31',
    '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26',
    '2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25',
  ];
  const FALLBACK_NAMES = {
    '2026-01-26':'Republic Day','2026-02-17':'Mahashivratri','2026-03-03':'Holi',
    '2026-03-26':'Ram Navami','2026-03-31':'Mahavir Jayanti','2026-04-03':'Good Friday',
    '2026-04-14':'Ambedkar Jayanti','2026-05-01':'Maharashtra Day','2026-05-28':'Bakri Id',
    '2026-06-26':'Muharram','2026-09-14':'Ganesh Chaturthi','2026-10-02':'Gandhi Jayanti',
    '2026-10-20':'Dussehra','2026-11-10':'Diwali Balipratipada','2026-11-24':'Guru Nanak Jayanti',
    '2026-12-25':'Christmas',
  };
  const [holidays, setHolidays]         = useState(FALLBACK_HOLIDAYS);
  const [holidayNames, setHolidayNames] = useState(FALLBACK_NAMES);
  const [expiries, setExpiries]         = useState(() => getNiftyExpiries(FALLBACK_HOLIDAYS, FALLBACK_NAMES));
  const [holidaySource, setHolidaySource] = useState('');

  // Fetch holidays once on mount
  useEffect(() => {
    fetch('/api/holidays')
      .then(r => r.json())
      .then(d => {
        const h = d.holidays || [];
        const n = d.holidayNames || {};
        setHolidays(h);
        setHolidayNames(n);
        setHolidaySource(d.source || '');
        setExpiries(getNiftyExpiries(h, n));
      })
      .catch(() => {});
  }, []);

  // Refresh expiry countdown every minute
  useEffect(() => {
    const id = setInterval(() => setExpiries(getNiftyExpiries(holidays, holidayNames)), 60000);
    return () => clearInterval(id);
  }, [holidays, holidayNames]);

  return (
    <div className="fno-wrap">
      <div className="fno-page-header">
        <div className="fno-page-title">
          <div>
            <div className="fno-page-name">India F&amp;O Dashboard</div>
          </div>
        </div>
        <div className="fno-live-badge">
          <span className="live-pulse" />
          LIVE
        </div>
      </div>

      {/* Expiry + VIX side by side */}
      <div className="fno-expiry-vix-row">

        {/* Left: expiry countdowns */}
        <div className="fno-expiry-panel">
          <div className="fno-section-label">EXPIRY COUNTDOWN</div>

          {/* Desktop: column layout with group headers */}
          <div className="fno-expiry-columns fno-desktop-only">
            <div className="fno-expiry-col">
              <div className="fno-expiry-group-label">
                Nifty 50 <span className="fno-expiry-rule">Tue · last Thu</span>
              </div>
              <ExpiryCard label="Weekly"  {...expiries.niftyWeekly}  color="#4A9EFF" />
              <ExpiryCard label="Monthly" {...expiries.niftyMonthly} color="#4A9EFF" />
            </div>
            <div className="fno-expiry-col">
              <div className="fno-expiry-group-label">
                Sensex <span className="fno-expiry-rule">Thu · last Thu</span>
              </div>
              <ExpiryCard label="Weekly"  {...expiries.sensexWeekly}  color="#F59E0B" />
              <ExpiryCard label="Monthly" {...expiries.sensexMonthly} color="#F59E0B" />
            </div>
          </div>

          {/* Mobile: flat 2x2 grid, each card self-identifies */}
          <div className="fno-expiry-flat fno-mobile-only">
            <ExpiryCard indexName="Nifty" label="Weekly"  {...expiries.niftyWeekly}  color="#4A9EFF" />
            <ExpiryCard indexName="Sensex" label="Weekly"  {...expiries.sensexWeekly}  color="#F59E0B" />
            <ExpiryCard indexName="Nifty" label="Monthly" {...expiries.niftyMonthly} color="#4A9EFF" />
            <ExpiryCard indexName="Sensex" label="Monthly" {...expiries.sensexMonthly} color="#F59E0B" />
          </div>
          <div className="fno-expiry-note">
            Holiday-adjusted · 15:30 IST · Shifts to previous trading day if holiday
            {holidaySource === 'nse-live' && <span className="fno-holiday-live"> · NSE calendar live</span>}
            {holidaySource === 'fallback' && <span className="fno-holiday-fb"> · Using cached calendar</span>}
          </div>
        </div>

        {/* Right: India VIX */}
        <div className="fno-vix-panel">
          <div className="fno-section-label">INDIA VIX — FEAR GAUGE</div>
          {loading ? (
            <div className="fno-loading">Fetching India VIX...</div>
          ) : vix ? (
            <>
              <VIXGauge vix={vix} />
              <VixTrend vix={vix} />
            </>
          ) : (
            <div className="fno-loading">VIX data unavailable</div>
          )}
        </div>

      </div>

      {/* Futures Premium + Advance Decline */}
      <div className="fno-section">
        <div className="fno-two-col">
          <FuturesPremium />
          <AdvanceDecline />
        </div>
      </div>

      {/* VWAP + OI Buildup */}
      <div className="fno-section">
        <div className="fno-two-col">
          <VWAPPanel />
          <OIBuildup />
        </div>
      </div>

      {/* PCR + Max Pain */}
      <div className="fno-section">
        <PCRPanel />
      </div>

      {/* Straddle Chain */}
      <div className="fno-section">
        <StraddleChain />
      </div>

      {/* FII / DII */}
      <div className="fno-section">
        <div className="fno-section-label">FII / DII FLOW</div>
        <FiiDii />
      </div>

    </div>
  );
}
