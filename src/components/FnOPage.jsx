import { useState, useEffect } from 'react';
import FiiDii from './FiiDii';
import { getNiftyExpiries, getIndiaMarketStatus, formatDuration } from '../utils/timezone';

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
function ExpiryCard({ label, date, secsLeft, color, shifted, originalDate, holidayName }) {
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
function FuturesPremium() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Get Nifty spot from NSE
        const [spotRes, futRes] = await Promise.all([
          fetch('/api/nse-india'),
          fetch('/api/quote?symbol=NIFTY25MARFUT.NS'),
        ]);
        const spotD = await spotRes.json();
        const futD  = await futRes.json();
        const spot  = spotD?.nifty50?.price;
        const fut   = futD?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (spot && fut) {
          const premium = parseFloat((fut - spot).toFixed(2));
          const pct     = parseFloat(((premium / spot) * 100).toFixed(2));
          setData({ spot, fut, premium, pct });
        }
      } catch(_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (!data) return null;
  const pos = data.premium >= 0;

  return (
    <div className="fp-wrap">
      <div className="fp-label">NIFTY FUTURES PREMIUM</div>
      <div className="fp-row">
        <div className="fp-stat">
          <span className="fp-stat-label">Spot</span>
          <span className="fp-stat-val">{data.spot?.toLocaleString('en-IN')}</span>
        </div>
        <div className="fp-stat">
          <span className="fp-stat-label">Futures</span>
          <span className="fp-stat-val">{data.fut?.toLocaleString('en-IN')}</span>
        </div>
        <div className="fp-stat">
          <span className="fp-stat-label">Premium</span>
          <span className={`fp-stat-val fp-big ${pos ? 'gain' : 'loss'}`}>
            {pos ? '+' : ''}{data.premium} ({pos ? '+' : ''}{data.pct}%)
          </span>
        </div>
        <div className="fp-signal">
          <span className={`fp-badge ${pos ? 'fp-bull' : 'fp-bear'}`}>
            {pos ? '📈 Bullish Bias' : '📉 Bearish Bias'}
          </span>
          <span className="fp-note">{pos ? 'Market expects upside' : 'Market expects downside'}</span>
        </div>
      </div>
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

  if (!data) return null;

  return (
    <div className="ad-wrap">
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
            <div className="fno-page-sub">Nifty · Bank Nifty · NSE derivatives</div>
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
          <div className="fno-expiry-columns">

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

      {/* FII / DII */}
      <div className="fno-section">
        <div className="fno-section-label">FII / DII FLOW</div>
        <FiiDii />
      </div>

    </div>
  );
}
