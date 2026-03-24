// src/components/FnOPage.jsx — India F&O Dashboard
import { useState, useEffect } from 'react';
import { getNiftyExpiries, getIndiaMarketStatus, formatDuration } from '../utils/timezone';

// ── India VIX live via Yahoo Finance (^INDIAVIX) ─────────────────────
function useIndiaVIX() {
  const [vix, setVix] = useState(null);
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

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 20000);
    return () => clearInterval(id);
  }, []);

  return { vix, loading };
}

// ── Expiry countdown ─────────────────────────────────────────────────
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

  const pad = n => String(n).padStart(2, '0');

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

// ── VIX gauge ────────────────────────────────────────────────────────
function VIXGauge({ vix }) {
  if (!vix) return null;
  const val = vix.price;
  // VIX zones: <12 low, 12–20 normal, 20–30 elevated, 30+ high fear
  const zone = val < 12 ? { label: 'LOW VOLATILITY', color: '#00C896', bg: 'rgba(0,200,150,0.1)' }
             : val < 20 ? { label: 'NORMAL',          color: '#4A9EFF', bg: 'rgba(74,158,255,0.1)' }
             : val < 30 ? { label: 'ELEVATED',         color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
             :             { label: 'HIGH FEAR',        color: '#FF4455', bg: 'rgba(255,68,85,0.1)'  };

  const gain = vix.changePct >= 0;
  // Rising VIX = more fear = bad for bulls
  const fearDir = gain ? '↑ Fear rising' : '↓ Fear easing';

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
        <span className="fno-vix-dir">{fearDir}</span>
      </div>

      {/* Visual bar */}
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
        Measures expected volatility in Nifty 50 options for the next 30 days.
        Higher = more uncertainty. Options premiums move with VIX.
      </div>
    </div>
  );
}

// ── Coming soon card ─────────────────────────────────────────────────
function ComingSoonCard({ title, desc, icon }) {
  return (
    <div className="fno-coming-card">
      <div className="fno-coming-icon">{icon}</div>
      <div className="fno-coming-title">{title}</div>
      <div className="fno-coming-desc">{desc}</div>
      <div className="fno-coming-badge">Coming Soon</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function FnOPage() {
  const { vix, loading } = useIndiaVIX();
  const [expiries, setExpiries] = useState(() => getNiftyExpiries());

  useEffect(() => {
    const id = setInterval(() => setExpiries(getNiftyExpiries()), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fno-wrap">
      {/* Page header */}
      <div className="fno-page-header">
        <div className="fno-page-title">
          <div>
            <div className="fno-page-name">India F&O Dashboard</div>
            <div className="fno-page-sub">Nifty · Bank Nifty · NSE derivatives</div>
          </div>
        </div>
        <div className="fno-live-badge">
          <span className="live-pulse" />
          LIVE
        </div>
      </div>

      {/* Section: Expiry Countdowns */}
      <div className="fno-section">
        <div className="fno-section-label">⏱ EXPIRY COUNTDOWN</div>

        <div className="fno-expiry-group-label">Nifty 50</div>
        <div className="fno-expiry-grid">
          <ExpiryCard label="Weekly — Tuesday"  date={expiries.weekly.date}        secsLeft={expiries.weekly.secsLeft}        color="#4A9EFF" />
          <ExpiryCard label="Monthly — Thursday" date={expiries.monthly.date}       secsLeft={expiries.monthly.secsLeft}       color="#4A9EFF" />
        </div>

        <div className="fno-expiry-group-label" style={{ marginTop: 20 }}>Sensex</div>
        <div className="fno-expiry-grid">
          <ExpiryCard label="Weekly — Friday"   date={expiries.sensexWeekly.date}  secsLeft={expiries.sensexWeekly.secsLeft}  color="#F59E0B" />
          <ExpiryCard label="Monthly — Friday"  date={expiries.sensexMonthly.date} secsLeft={expiries.sensexMonthly.secsLeft} color="#F59E0B" />
        </div>

        <div className="fno-expiry-note">Nifty: weekly Tue · monthly last Thu &nbsp;|&nbsp; Sensex: weekly Fri · monthly last Fri · 15:30 IST · NSE / BSE</div>
      </div>

      {/* Section: India VIX */}
      <div className="fno-section">
        <div className="fno-section-label">⚡ INDIA VIX — FEAR GAUGE</div>
        {loading ? (
          <div className="fno-loading">Fetching India VIX...</div>
        ) : vix ? (
          <VIXGauge vix={vix} />
        ) : (
          <div className="fno-loading">VIX data unavailable</div>
        )}
      </div>

      {/* Section: Coming soon */}
      <div className="fno-section">
        <div className="fno-section-label">COMING SOON</div>
        <div className="fno-coming-grid">
          <ComingSoonCard
            icon=""
            title="PCR — Put Call Ratio"
            desc="Live put-call ratio for Nifty & Bank Nifty. Above 1 = bullish sentiment, below 0.7 = bearish."
          />
          <ComingSoonCard
            icon=""
            title="OI Buildup"
            desc="Which strikes are seeing heavy call/put writing. Identifies key support and resistance levels."
          />
          <ComingSoonCard
            icon=""
            title="Max Pain"
            desc="The price at which option writers lose least. Nifty often gravitates here near expiry."
          />
          <ComingSoonCard
            icon=""
            title="FII / DII Flow"
            desc="Net buying and selling by foreign and domestic institutions. Key sentiment indicator."
          />
        </div>
      </div>
    </div>
  );
}
