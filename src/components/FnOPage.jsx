import { useState, useEffect } from 'react';
import FiiDii from './FiiDii';
import KiteConnect from './KiteConnect';
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
function ExpiryCard({ label, date, secsLeft, color }) {
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

// ── Main ──────────────────────────────────────────────────────────────
export default function FnOPage() {
  const { vix, loading }   = useIndiaVIX();
  const [holidays, setHolidays] = useState([]);
  const [expiries, setExpiries] = useState(() => getNiftyExpiries([]));
  const [holidaySource, setHolidaySource] = useState('');

  // Fetch holidays once on mount
  useEffect(() => {
    fetch('/api/holidays')
      .then(r => r.json())
      .then(d => {
        setHolidays(d.holidays || []);
        setHolidaySource(d.source || '');
        setExpiries(getNiftyExpiries(d.holidays || []));
      })
      .catch(() => {});
  }, []);

  // Refresh expiry countdown every minute
  useEffect(() => {
    const id = setInterval(() => setExpiries(getNiftyExpiries(holidays)), 60000);
    return () => clearInterval(id);
  }, [holidays]);

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

      {/* Kite Connect */}
      <div className="fno-section" style={{paddingBottom: 0}}>
        <KiteConnect />
      </div>

      {/* Expiry Countdowns */}
      <div className="fno-section">
        <div className="fno-section-label">EXPIRY COUNTDOWN</div>

        <div className="fno-expiry-group-label">
          Nifty 50 &nbsp;<span className="fno-expiry-rule">Weekly — Tuesday &nbsp;·&nbsp; Monthly — last Thursday</span>
        </div>
        <div className="fno-expiry-grid">
          <ExpiryCard label="Weekly"  date={expiries.niftyWeekly.date}  secsLeft={expiries.niftyWeekly.secsLeft}  color="#4A9EFF" />
          <ExpiryCard label="Monthly" date={expiries.niftyMonthly.date} secsLeft={expiries.niftyMonthly.secsLeft} color="#4A9EFF" />
        </div>

        <div className="fno-expiry-group-label" style={{ marginTop: 20 }}>
          Sensex &nbsp;<span className="fno-expiry-rule">Weekly — Thursday &nbsp;·&nbsp; Monthly — last Thursday</span>
        </div>
        <div className="fno-expiry-grid">
          <ExpiryCard label="Weekly"  date={expiries.sensexWeekly.date}  secsLeft={expiries.sensexWeekly.secsLeft}  color="#F59E0B" />
          <ExpiryCard label="Monthly" date={expiries.sensexMonthly.date} secsLeft={expiries.sensexMonthly.secsLeft} color="#F59E0B" />
        </div>

        <div className="fno-expiry-note">
          Holiday-adjusted · 15:30 IST · Expiry shifts to previous trading day if holiday
          {holidaySource === 'nse-live' && <span className="fno-holiday-live"> · NSE calendar live</span>}
          {holidaySource === 'fallback' && <span className="fno-holiday-fb"> · Using cached holiday list</span>}
        </div>
      </div>

      {/* India VIX */}
      <div className="fno-section">
        <div className="fno-section-label">INDIA VIX — FEAR GAUGE</div>
        {loading ? (
          <div className="fno-loading">Fetching India VIX...</div>
        ) : vix ? (
          <VIXGauge vix={vix} />
        ) : (
          <div className="fno-loading">VIX data unavailable</div>
        )}
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
          <ComingSoonCard title="FII / DII Flow"         desc="Net buying and selling by foreign and domestic institutions. Key sentiment indicator." />
        </div>
      </div>
    </div>
  );
}
