// src/components/FnOPage.jsx
// India F&O Dashboard — expiry countdowns, VIX, breadth, FII/DII
// Kite-dependent sections removed (Futures Premium, VWAP, OI Buildup, PCR, Straddle)
import { useState, useEffect } from 'react';
import FiiDii from './FiiDii';
import { getNiftyExpiries } from '../utils/timezone';

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
    <div className="fno-expiry-card" style={{ '--expiry-color': color }}>
      <div className="fno-expiry-index">{label}</div>
      <div className="fno-expiry-date">{date}</div>
      {shifted && <div className="fno-expiry-nudge">⚠ {originalDate} is {holidayName} · shifted</div>}
      <div className="fno-expiry-clock">
        {d > 0 && <><span className="fno-clock-num">{d}</span><span className="fno-clock-unit">d</span></>}
        <span className="fno-clock-num">{p(h)}</span><span className="fno-clock-unit">h</span>
        <span className="fno-clock-num">{p(m)}</span><span className="fno-clock-unit">m</span>
        <span className="fno-clock-num fno-clock-secs">{p(s)}</span><span className="fno-clock-unit">s</span>
      </div>
    </div>
  );
}

function VIXCard() {
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
        setVix({ price, change: price - prevClose, changePct: ((price - prevClose) / prevClose) * 100 });
      } catch (_) {}
      setLoading(false);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="fno-vix-card"><div className="fno-vix-title">INDIA VIX</div><div className="fno-loading">Loading...</div></div>;
  if (!vix)    return <div className="fno-vix-card"><div className="fno-vix-title">INDIA VIX</div><div className="fno-loading">Unavailable</div></div>;

  const v = vix.price;
  const zone = v < 12 ? { label: 'LOW',      color: '#00C896' }
             : v < 20 ? { label: 'NORMAL',    color: '#4A9EFF' }
             : v < 30 ? { label: 'ELEVATED',  color: '#F59E0B' }
             :           { label: 'HIGH FEAR', color: '#FF4455' };
  const note = v < 15 ? 'Calm markets — cheap premiums'
             : v < 20 ? 'Normal range — balanced premiums'
             : v < 30 ? 'Elevated fear — expensive premiums'
             :           'High fear — premiums very expensive';
  const falling = vix.changePct < 0;
  return (
    <div className="fno-vix-card">
      <div className="fno-vix-header">
        <span className="fno-vix-title">INDIA VIX</span>
        <span className="fno-vix-zone" style={{ color: zone.color, borderColor: zone.color }}>{zone.label}</span>
      </div>
      <div className="fno-vix-price">{v.toFixed(2)}</div>
      <div className="fno-vix-row">
        <span className={`fno-vix-change ${falling ? 'fno-calm' : 'fno-fear'}`}>{falling ? '▼' : '▲'} {Math.abs(vix.changePct).toFixed(2)}%</span>
        <span className="fno-vix-dir">{falling ? '↓ Fear easing' : '↑ Fear rising'}</span>
      </div>
      <div className="fno-vix-bar-wrap">
        <div className="fno-vix-bar-track">
          <div className="fno-vix-bar-fill" style={{ width: `${Math.min((v / 50) * 100, 100)}%`, background: zone.color }} />
        </div>
        <div className="fno-vix-scale"><span>0</span><span>12</span><span>20</span><span>30</span><span>50</span></div>
      </div>
      <div className="fno-vix-about">{note}</div>
    </div>
  );
}

function BreadthCard() {
  const [data, setData]     = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/nse-india');
        const d = await r.json();
        const n = d?.nifty50;
        if (n?.advances != null) {
          const adv = n.advances, dec = n.declines, unch = n.unchanged || 0, total = adv + dec + unch || 50;
          setData({ adv, dec, unch, advPct: Math.round((adv / total) * 100), decPct: Math.round((dec / total) * 100) });
        }
      } catch (_) {}
      setLoaded(true);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const signal = !data ? null
    : data.adv > data.dec * 1.5 ? { label: '↑ Broad strength', cls: 'gain' }
    : data.dec > data.adv * 1.5 ? { label: '↓ Broad weakness', cls: 'loss' }
    : { label: '⇌ Mixed market', cls: '' };

  return (
    <div className="fno-breadth-card">
      <div className="fno-vix-title" style={{ marginBottom: 16 }}>NIFTY 50 BREADTH</div>
      {!data && !loaded ? <div className="fno-loading">Loading...</div>
      : !data ? <div className="fno-loading">Breadth unavailable — market closed</div>
      : (
        <>
          <div className="fno-breadth-nums">
            <div className="fno-breadth-num gain">{data.adv}<span className="fno-breadth-lbl">advancing</span></div>
            {data.unch > 0 && <div className="fno-breadth-num" style={{ color: 'var(--text3)' }}>{data.unch}<span className="fno-breadth-lbl">unchanged</span></div>}
            <div className="fno-breadth-num loss">{data.dec}<span className="fno-breadth-lbl">declining</span></div>
          </div>
          <div className="fno-breadth-bar">
            <div className="fno-breadth-bar-a" style={{ width: `${data.advPct}%` }} />
            <div className="fno-breadth-bar-d" style={{ width: `${data.decPct}%` }} />
          </div>
          {signal && <div className={`fno-breadth-signal ${signal.cls}`}>{signal.label}</div>}
        </>
      )}
    </div>
  );
}

export default function FnOPage() {
  const FALLBACK_HOLIDAYS = ['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25'];
  const FALLBACK_NAMES    = {'2026-01-26':'Republic Day','2026-02-17':'Mahashivratri','2026-03-03':'Holi','2026-03-26':'Ram Navami','2026-03-31':'Mahavir Jayanti','2026-04-03':'Good Friday','2026-04-14':'Ambedkar Jayanti','2026-05-01':'Maharashtra Day','2026-05-28':'Bakri Id','2026-06-26':'Muharram','2026-09-14':'Ganesh Chaturthi','2026-10-02':'Gandhi Jayanti','2026-10-20':'Dussehra','2026-11-10':'Diwali Balipratipada','2026-11-24':'Guru Nanak Jayanti','2026-12-25':'Christmas'};
  const [holidays, setHolidays]         = useState(FALLBACK_HOLIDAYS);
  const [holidayNames, setHolidayNames] = useState(FALLBACK_NAMES);
  const [expiries, setExpiries]         = useState(() => getNiftyExpiries(FALLBACK_HOLIDAYS, FALLBACK_NAMES));
  const [holidayLive, setHolidayLive]   = useState(false);

  useEffect(() => {
    fetch('/api/holidays').then(r => r.json()).then(d => {
      const h = d.holidays || [], n = d.holidayNames || {};
      setHolidays(h); setHolidayNames(n);
      setHolidayLive(d.source === 'nse-live');
      setExpiries(getNiftyExpiries(h, n));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setExpiries(getNiftyExpiries(holidays, holidayNames)), 60000);
    return () => clearInterval(id);
  }, [holidays, holidayNames]);

  return (
    <div className="fno-wrap">

      {/* Expiry countdowns */}
      <div className="fno-section">
        <div className="fno-expiry-vix-row">
          <div className="fno-expiry-panel">
            <div className="fno-expiry-group-label">Nifty 50 <span style={{ fontWeight: 400, color: 'var(--text3)' }}>Tue weekly · last-Thu monthly</span></div>
            <div className="fno-expiry-grid">
              <ExpiryCard label="Weekly"  color="#4A9EFF" {...expiries.niftyWeekly}  />
              <ExpiryCard label="Monthly" color="#4A9EFF" {...expiries.niftyMonthly} />
            </div>
          </div>
          <div className="fno-expiry-panel" style={{ borderRight: 'none' }}>
            <div className="fno-expiry-group-label">Sensex <span style={{ fontWeight: 400, color: 'var(--text3)' }}>Thu weekly · last-Thu monthly</span></div>
            <div className="fno-expiry-grid">
              <ExpiryCard label="Weekly"  color="#F59E0B" {...expiries.sensexWeekly}  />
              <ExpiryCard label="Monthly" color="#F59E0B" {...expiries.sensexMonthly} />
            </div>
          </div>
        </div>
        <div className="fno-expiry-note">
          Holiday-adjusted · 15:30 IST
          {holidayLive && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· NSE calendar live</span>}
        </div>
      </div>

      {/* VIX + Breadth */}
      <div className="fno-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--border)' }}>
          <div style={{ borderRight: '1px solid var(--border)', padding: '24px' }}>
            <VIXCard />
          </div>
          <div style={{ padding: '24px' }}>
            <BreadthCard />
          </div>
        </div>
      </div>

      {/* FII / DII Flow */}
      <div className="fno-section">
        <div className="fno-section-label">FII / DII FLOW</div>
        <FiiDii />
      </div>

    </div>
  );
}
