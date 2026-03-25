// src/components/FnOPage.jsx
import { useState, useEffect } from 'react';
import FiiDii from './FiiDii';
import { getNiftyExpiries } from '../utils/timezone';
import { formatPrice, formatPct } from '../utils/format';

// ── India indices strip (uses already-fetched market data, zero extra calls) ─
const INDIA_IDS = [
  { id: 'giftnifty', name: 'Gift Nifty' },
  { id: 'nifty50',   name: 'Nifty 50'  },
  { id: 'banknifty', name: 'Bank Nifty'},
  { id: 'sensex',    name: 'Sensex'    },
];

function IndiaStrip({ data }) {
  const items = INDIA_IDS.map(m => ({ ...m, d: data?.[m.id] })).filter(m => m.d);
  if (!items.length) return null;
  return (
    <div className="fno-india-strip">
      <span className="fno-india-strip-label">INDIA</span>
      {items.map(({ id, name, d }) => {
        const gain = d.changePct >= 0;
        return (
          <span key={id} className="fno-india-item">
            <span className="fno-india-name">{name}</span>
            <span className="fno-india-price">{formatPrice(d.price)}</span>
            <span className={`fno-india-chg ${gain ? 'gain' : 'loss'}`}>
              {gain ? '▲' : '▼'} {formatPct(d.changePct)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ── Expiry countdown card ─────────────────────────────────────────────────────
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
    <div className="fno-ec" style={{ '--ec': color }}>
      <div className="fno-ec-top">
        <span className="fno-ec-label">{label}</span>
        <span className="fno-ec-date">{date}</span>
      </div>
      {shifted && <div className="fno-ec-shifted">⚠ {originalDate} is {holidayName} · shifted</div>}
      <div className="fno-ec-clock">
        {d > 0 && <><span className="fno-ec-n">{d}</span><span className="fno-ec-u">d</span></>}
        <span className="fno-ec-n">{p(h)}</span><span className="fno-ec-u">h</span>
        <span className="fno-ec-n">{p(m)}</span><span className="fno-ec-u">m</span>
        <span className="fno-ec-n fno-ec-s">{p(s)}</span><span className="fno-ec-u">s</span>
      </div>
    </div>
  );
}

// ── India VIX ─────────────────────────────────────────────────────────────────
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
        setVix({ price, changePct: ((price - prevClose) / prevClose) * 100 });
      } catch (_) {}
      setLoading(false);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (loading || !vix) return (
    <div className="fno-metric-card">
      <div className="fno-metric-label">INDIA VIX</div>
      <div className="fno-loading">{loading ? 'Loading...' : 'Unavailable'}</div>
    </div>
  );

  const v = vix.price;
  const zone = v < 12 ? { label: 'LOW',      color: '#00C896' }
             : v < 20 ? { label: 'NORMAL',    color: '#4A9EFF' }
             : v < 30 ? { label: 'ELEVATED',  color: '#F59E0B' }
             :           { label: 'HIGH FEAR', color: '#FF4455' };
  const falling = vix.changePct < 0;
  const note    = v < 15 ? 'Calm markets — cheap premiums'
                : v < 20 ? 'Normal range — balanced premiums'
                : v < 30 ? 'Elevated fear — expensive premiums'
                :           'High fear — premiums very expensive';
  return (
    <div className="fno-metric-card">
      <div className="fno-metric-label">
        INDIA VIX
        <span className="fno-metric-badge" style={{ color: zone.color, borderColor: `${zone.color}50` }}>{zone.label}</span>
      </div>
      <div className="fno-metric-val">{v.toFixed(2)}</div>
      <div className="fno-metric-chg" style={{ color: falling ? '#00C896' : '#FF4455' }}>
        {falling ? '▼' : '▲'} {Math.abs(vix.changePct).toFixed(2)}%
        <span className="fno-metric-note">{falling ? ' · Fear easing' : ' · Fear rising'}</span>
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

// ── Nifty 50 Breadth ──────────────────────────────────────────────────────────
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
    : data.adv > data.dec * 1.5 ? { label: '↑ Broad strength', color: 'var(--gain)' }
    : data.dec > data.adv * 1.5 ? { label: '↓ Broad weakness', color: 'var(--loss)' }
    : { label: '⇌ Mixed market', color: 'var(--text3)' };

  return (
    <div className="fno-metric-card">
      <div className="fno-metric-label">NIFTY 50 BREADTH</div>
      {!data && !loaded ? <div className="fno-loading">Loading...</div>
      : !data ? <div className="fno-loading">Market closed</div>
      : (
        <>
          <div className="fno-breadth-row">
            <span className="fno-breadth-n gain">{data.adv}<span className="fno-breadth-lbl">up</span></span>
            {data.unch > 0 && <span className="fno-breadth-n" style={{ color: 'var(--text3)' }}>{data.unch}<span className="fno-breadth-lbl">unch</span></span>}
            <span className="fno-breadth-n loss">{data.dec}<span className="fno-breadth-lbl">dn</span></span>
          </div>
          <div className="fno-breadth-bar">
            <div style={{ width: `${data.advPct}%`, background: 'var(--gain)', height: '100%', borderRadius: '4px 0 0 4px', transition: 'width .5s' }} />
            <div style={{ width: `${data.decPct}%`, background: 'var(--loss)', height: '100%', borderRadius: '0 4px 4px 0', transition: 'width .5s' }} />
          </div>
          {signal && <div className="fno-metric-note" style={{ color: signal.color, marginTop: 8 }}>{signal.label}</div>}
        </>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FnOPage({ data = {} }) {
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

      {/* India indices strip */}
      <IndiaStrip data={data} />

      {/* Expiry countdowns */}
      <div className="fno-top-strip">
        <div className="fno-expiry-row">
          <div className="fno-expiry-group-label">
            Nifty 50 <span className="fno-group-rule">Tue weekly · last-Thu monthly</span>
          </div>
          <div className="fno-expiry-pair">
            <ExpiryCard label="Weekly"  color="#4A9EFF" {...expiries.niftyWeekly}  />
            <ExpiryCard label="Monthly" color="#4A9EFF" {...expiries.niftyMonthly} />
          </div>
        </div>
        <div className="fno-expiry-row" style={{ borderRight: 'none' }}>
          <div className="fno-expiry-group-label">
            Sensex <span className="fno-group-rule">Thu weekly · last-Thu monthly</span>
          </div>
          <div className="fno-expiry-pair">
            <ExpiryCard label="Weekly"  color="#F59E0B" {...expiries.sensexWeekly}  />
            <ExpiryCard label="Monthly" color="#F59E0B" {...expiries.sensexMonthly} />
          </div>
        </div>
        <div className="fno-expiry-note-row">
          Holiday-adjusted · 15:30 IST
          {holidayLive && <span style={{ color: 'var(--accent)', marginLeft: 5 }}>· NSE calendar live</span>}
        </div>
      </div>

      {/* VIX + Breadth */}
      <div className="fno-metrics-row">
        <VIXCard />
        <BreadthCard />
      </div>

      {/* FII / DII */}
      <div className="fno-section">
        <div className="fno-section-label">FII / DII FLOW</div>
        <FiiDii />
      </div>

    </div>
  );
}
