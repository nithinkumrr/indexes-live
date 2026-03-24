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


// ── Fear & Greed Speedometer ──────────────────────────────────────────
function FearGreedMeter({ vix }) {
  if (!vix) return null;
  const val = vix.price;

  // Map VIX to Fear/Greed score (0–100)
  // VIX < 12 = Extreme Greed (100), VIX > 35 = Extreme Fear (0)
  // Calibrated: VIX 12=74(Greed), VIX 18=56(Neutral), VIX 24=38(Fear), VIX 30+=Extreme Fear
  const score = Math.max(0, Math.min(100, Math.round(110 - (val * 3))));

  const zones = [
    { label: 'Extreme Fear',  min: 0,  max: 20,  color: '#FF4455' },
    { label: 'Fear',          min: 20, max: 40,  color: '#FF8C42' },
    { label: 'Neutral',       min: 40, max: 60,  color: '#F5C518' },
    { label: 'Greed',         min: 60, max: 80,  color: '#7BC67E' },
    { label: 'Extreme Greed', min: 80, max: 100, color: '#00C896' },
  ];

  const current = zones.find(z => score >= z.min && score <= z.max) || zones[0];

  // Needle angle: score 0 = -90deg (full left), score 100 = +90deg (full right)
  const angle = -90 + (score / 100) * 180;
  const rad   = (angle * Math.PI) / 180;
  const cx = 120, cy = 110, r = 80;
  const nx = cx + r * 0.72 * Math.cos(rad);
  const ny = cy + r * 0.72 * Math.sin(rad);

  return (
    <div className="fg-wrap">
      <div className="fg-header">
        <span className="fg-title">Market Fear &amp; Greed</span>
        <span className="fg-based">Based on India VIX · {val.toFixed(2)}</span>
      </div>

      <div className="fg-meter-row">
        <svg viewBox="0 0 240 130" className="fg-svg">
          {/* Coloured arc segments */}
          {zones.map((z, i) => {
            const startAngle = -180 + (z.min / 100) * 180;
            const endAngle   = -180 + (z.max / 100) * 180;
            const sRad = (startAngle * Math.PI) / 180;
            const eRad = (endAngle   * Math.PI) / 180;
            const r2   = 80, r1 = 58;
            const x1 = cx + r2 * Math.cos(sRad), y1 = cy + r2 * Math.sin(sRad);
            const x2 = cx + r2 * Math.cos(eRad), y2 = cy + r2 * Math.sin(eRad);
            const x3 = cx + r1 * Math.cos(eRad), y3 = cy + r1 * Math.sin(eRad);
            const x4 = cx + r1 * Math.cos(sRad), y4 = cy + r1 * Math.sin(sRad);
            const large = (z.max - z.min) > 50 ? 1 : 0;
            return (
              <path key={i}
                d={`M${x1},${y1} A${r2},${r2} 0 ${large},1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 ${large},0 ${x4},${y4} Z`}
                fill={z.color}
                opacity={score >= z.min && score <= z.max ? 1 : 0.3}
              />
            );
          })}

          {/* Zone labels */}
          {[
            { label: 'Fear',    angle: -150 },
            { label: 'Neutral', angle: -90  },
            { label: 'Greed',   angle: -30  },
          ].map(({ label, angle: a }) => {
            const ar = (a * Math.PI) / 180;
            return (
              <text key={label}
                x={cx + 95 * Math.cos(ar)}
                y={cy + 95 * Math.sin(ar)}
                textAnchor="middle" dominantBaseline="central"
                fontSize="8" fill="var(--text3)" fontFamily="monospace">
                {label}
              </text>
            );
          })}

          {/* Needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny}
            stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx={cx} cy={cy} r="5" fill="var(--text)" />
          <circle cx={cx} cy={cy} r="2.5" fill="var(--bg2)" />

          {/* Score in centre */}
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="22"
            fontFamily="monospace" fontWeight="700" fill={current.color}>
            {score}
          </text>
        </svg>

        {/* Right side: label + explanation */}
        <div className="fg-info">
          <div className="fg-score-label" style={{ color: current.color }}>{current.label.toUpperCase()}</div>
          <div className="fg-explain">
            {score < 20 && "Investors are extremely fearful. Markets may be oversold. Historically a contrarian buy signal."}
            {score >= 20 && score < 40 && "Fear is driving the market. Caution is high, selling pressure persists."}
            {score >= 40 && score < 60 && "Market sentiment is balanced. No strong directional bias."}
            {score >= 60 && score < 80 && "Greed is building. Investors are optimistic but watch for overheating."}
            {score >= 80 && "Extreme greed. Markets may be overextended. Risk of sharp reversal is higher."}
          </div>
          <div className="fg-scale">
            <div className="fg-scale-row"><span className="fg-dot" style={{background:'#FF4455'}}/><span>0–20 Extreme Fear</span></div>
            <div className="fg-scale-row"><span className="fg-dot" style={{background:'#FF8C42'}}/><span>20–40 Fear</span></div>
            <div className="fg-scale-row"><span className="fg-dot" style={{background:'#F5C518'}}/><span>40–60 Neutral</span></div>
            <div className="fg-scale-row"><span className="fg-dot" style={{background:'#7BC67E'}}/><span>60–80 Greed</span></div>
            <div className="fg-scale-row"><span className="fg-dot" style={{background:'#00C896'}}/><span>80–100 Extreme Greed</span></div>
          </div>
        </div>
      </div>

      <div className="fg-note">Derived from India VIX. Lower VIX = more greed, higher VIX = more fear. Not a standalone buy/sell signal.</div>
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
              <FearGreedMeter vix={vix} />
            </>
          ) : (
            <div className="fno-loading">VIX data unavailable</div>
          )}
        </div>

      </div>

      {/* FII / DII */}
      <div className="fno-section">
        <div className="fno-section-label">FII / DII FLOW</div>
        <FiiDii />
      </div>

      {/* Coming soon */}
      <div className="fno-section">
        <div className="fno-section-label">COMING SOON</div>
        <div className="fno-coming-grid">
          <ComingSoonCard title="PCR — Put Call Ratio"   desc="Live put-call ratio for Nifty & Bank Nifty. Above 1 = bullish sentiment, below 0.7 = bearish." />
          <ComingSoonCard title="OI Buildup"             desc="Which strikes are seeing heavy call/put writing. Identifies key support and resistance levels." />
          <ComingSoonCard title="Max Pain"               desc="The price at which option writers lose least. Nifty often gravitates here near expiry." />
          
        </div>
      </div>
    </div>
  );
}
