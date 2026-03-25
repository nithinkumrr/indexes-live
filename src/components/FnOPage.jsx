// src/components/FnOPage.jsx — Full F&O dashboard
import { useState, useEffect, useMemo } from 'react';
import FiiDii from './FiiDii';
import Ticker from './Ticker';
import { getNiftyExpiries } from '../utils/timezone';
import { formatPrice } from '../utils/format';

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY COUNTDOWN
// ─────────────────────────────────────────────────────────────────────────────
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
      <div className="fno-expiry-label">{label}</div>
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

// ─────────────────────────────────────────────────────────────────────────────
// ROLLOVER METER
// ─────────────────────────────────────────────────────────────────────────────
function RolloverMeter({ expiries }) {
  const items = [
    { label: 'Nifty Weekly',  secsLeft: expiries.niftyWeekly?.secsLeft,   total: 7  * 86400, color: '#4A9EFF' },
    { label: 'Nifty Monthly', secsLeft: expiries.niftyMonthly?.secsLeft,  total: 30 * 86400, color: '#4A9EFF' },
    { label: 'Sensex Weekly', secsLeft: expiries.sensexWeekly?.secsLeft,  total: 7  * 86400, color: '#F59E0B' },
  ];
  return (
    <div className="fno-widget">
      <div className="fno-widget-title">ROLLOVER METER</div>
      <div className="fno-widget-sub">How much of the current expiry period has elapsed</div>
      <div className="fno-rollover-list">
        {items.map(({ label, secsLeft, total, color }) => {
          if (!secsLeft) return null;
          const elapsed = Math.max(0, total - secsLeft);
          const pct     = Math.min(100, Math.round((elapsed / total) * 100));
          const dte     = Math.ceil(secsLeft / 86400);
          return (
            <div key={label} className="fno-rollover-row">
              <div className="fno-rollover-label">{label}</div>
              <div className="fno-rollover-bar-wrap">
                <div className="fno-rollover-bar">
                  <div className="fno-rollover-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="fno-rollover-pct" style={{ color }}>{pct}%</span>
              </div>
              <div className="fno-rollover-dte">{dte}d left</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED MOVE
// ─────────────────────────────────────────────────────────────────────────────
function ExpectedMove({ data, expiries }) {
  const nifty = data?.nifty50;
  const [vix, setVix] = useState(null);
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/quote?symbol=%5EINDIAVIX');
        const json = await res.json();
        const r    = json?.chart?.result?.[0];
        if (r) setVix(r.meta.regularMarketPrice);
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const calc = (price, vixVal, secsLeft) => {
    if (!price || !vixVal || !secsLeft) return null;
    const dte  = secsLeft / 86400;
    const move = price * (vixVal / 100) * Math.sqrt(dte / 365);
    return { up: price + move, dn: price - move, pts: Math.round(move) };
  };

  const price    = nifty?.price;
  const weekly   = calc(price, vix, expiries.niftyWeekly?.secsLeft);
  const monthly  = calc(price, vix, expiries.niftyMonthly?.secsLeft);

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">EXPECTED MOVE <span className="fno-widget-formula">Price × (VIX÷100) × √(DTE÷365)</span></div>
      <div className="fno-widget-sub">Market-implied range for Nifty 50 by expiry</div>
      {(!price || !vix) ? (
        <div className="fno-loading">{!price ? 'Waiting for Nifty price...' : 'Waiting for VIX...'}</div>
      ) : (
        <div className="fno-em-grid">
          {[['Weekly', weekly, expiries.niftyWeekly], ['Monthly', monthly, expiries.niftyMonthly]].map(([lbl, em, exp]) => (
            em && <div key={lbl} className="fno-em-card">
              <div className="fno-em-label">{lbl} <span className="fno-em-date">· {exp?.date}</span></div>
              <div className="fno-em-range">
                <span className="fno-em-up gain">▲ {em.up.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                <span className="fno-em-pts">±{em.pts} pts</span>
                <span className="fno-em-dn loss">▼ {em.dn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="fno-em-note">From spot {price.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · VIX {vix?.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIX CARD WITH REGIME CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
function VIXCard({ onVix }) {
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
        const v = { price, changePct: ((price - prevClose) / prevClose) * 100 };
        setVix(v);
        onVix?.(price);
      } catch (_) {}
      setLoading(false);
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const REGIMES = [
    { max: 12, label: 'VERY LOW',  color: '#00C896', bias: 'Buy options — cheap insurance', bg: 'rgba(0,200,150,0.06)' },
    { max: 20, label: 'NORMAL',    color: '#4A9EFF', bias: 'Balanced — directional strategies', bg: 'rgba(74,158,255,0.06)' },
    { max: 30, label: 'ELEVATED',  color: '#F59E0B', bias: 'Sell premium — straddle / strangle', bg: 'rgba(245,158,11,0.06)' },
    { max: 99, label: 'HIGH FEAR', color: '#FF4455', bias: 'Hedge aggressively, reduce size', bg: 'rgba(255,68,85,0.06)' },
  ];

  const HISTORY = [
    { label: 'Pre-COVID normal', range: '10–15',  note: '2018–2019 baseline' },
    { label: 'COVID peak',       range: '~85',    note: 'Mar 2020 — all-time high' },
    { label: 'Post-COVID',       range: '12–18',  note: '2021–2022 recovery' },
    { label: 'Current',          range: vix ? vix.price.toFixed(2) : '—', note: 'Today', highlight: true },
  ];

  const v     = vix?.price || 0;
  const zone  = REGIMES.find(r => v <= r.max) || REGIMES[3];
  const falling = vix?.changePct < 0;

  if (loading) return <div className="fno-vix-card"><div className="fno-loading">Loading VIX...</div></div>;

  return (
    <div className="fno-vix-card">
      {/* Main reading */}
      <div className="fno-vix-header">
        <span className="fno-vix-title">INDIA VIX</span>
        <span className="fno-vix-zone" style={{ color: zone.color, borderColor: zone.color }}>{zone.label}</span>
      </div>
      <div className="fno-vix-price">{v.toFixed(2)}</div>
      <div className="fno-vix-row">
        <span className={`fno-vix-change ${falling ? 'fno-calm' : 'fno-fear'}`}>{falling ? '▼' : '▲'} {Math.abs(vix?.changePct || 0).toFixed(2)}%</span>
        <span className="fno-vix-dir">{falling ? '↓ Fear easing' : '↑ Fear rising'}</span>
      </div>
      <div className="fno-vix-bar-wrap">
        <div className="fno-vix-bar-track">
          <div className="fno-vix-bar-fill" style={{ width: `${Math.min((v / 50) * 100, 100)}%`, background: zone.color }} />
        </div>
        <div className="fno-vix-scale"><span>0</span><span>12</span><span>20</span><span>30</span><span>50</span></div>
      </div>

      {/* Regime context */}
      <div className="fno-vix-regime-title">HISTORICAL CONTEXT</div>
      <div className="fno-vix-history">
        {HISTORY.map(h => (
          <div key={h.label} className="fno-vix-hist-row" style={h.highlight ? { color: zone.color, fontWeight: 700 } : {}}>
            <span className="fno-vix-hist-label">{h.label}</span>
            <span className="fno-vix-hist-range">{h.range}</span>
            <span className="fno-vix-hist-note">{h.note}</span>
          </div>
        ))}
      </div>

      {/* Regime bias */}
      <div className="fno-vix-bias" style={{ background: zone.bg, borderColor: `${zone.color}30`, color: zone.color }}>
        → {zone.bias}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NIFTY 50 BREADTH
// ─────────────────────────────────────────────────────────────────────────────
function BreadthCard() {
  const [data, setData]     = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/nse-india'), d = await r.json(), n = d?.nifty50;
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
    <div className="fno-vix-card" style={{ flex: 1 }}>
      <div className="fno-vix-title" style={{ marginBottom: 16 }}>NIFTY 50 BREADTH</div>
      {!data && !loaded ? <div className="fno-loading">Loading...</div>
      : !data ? <div className="fno-loading" style={{ paddingTop: 8 }}>Market closed</div>
      : (
        <>
          <div className="fno-breadth-big">
            <span className="gain" style={{ fontSize: 48, fontFamily: 'var(--mono)', fontWeight: 700, lineHeight: 1 }}>{data.adv}</span>
            <span style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', alignSelf: 'flex-end', marginBottom: 6, marginLeft: 4 }}>up</span>
            <span style={{ fontSize: 28, color: 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: 700, lineHeight: 1, margin: '0 10px' }}>/</span>
            <span className="loss" style={{ fontSize: 48, fontFamily: 'var(--mono)', fontWeight: 700, lineHeight: 1 }}>{data.dec}</span>
            <span style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--mono)', alignSelf: 'flex-end', marginBottom: 6, marginLeft: 4 }}>dn</span>
            {data.unch > 0 && <>
              <span style={{ fontSize: 28, color: 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: 700, lineHeight: 1, margin: '0 10px' }}>/</span>
              <span style={{ fontSize: 36, color: 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: 700, lineHeight: 1 }}>{data.unch}</span>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', alignSelf: 'flex-end', marginBottom: 6, marginLeft: 4 }}>unch</span>
            </>}
          </div>
          <div className="fno-breadth-bar-2" style={{ height: 8, borderRadius: 4, background: 'var(--bg4)', display: 'flex', overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ width: `${data.advPct}%`, background: 'var(--gain)', borderRadius: '4px 0 0 4px', transition: 'width .5s' }} />
            <div style={{ width: `${data.decPct}%`, background: 'var(--loss)', borderRadius: '0 4px 4px 0', transition: 'width .5s' }} />
          </div>
          {signal && <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: signal.color }}>{signal.label}</div>}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS STRATEGY CHEATSHEET
// ─────────────────────────────────────────────────────────────────────────────
function StrategySheet({ vixLevel }) {
  const STRATEGIES = [
    {
      zone: 'VIX < 15 — Complacency',
      color: '#00C896',
      active: vixLevel != null && vixLevel < 15,
      strategies: [
        { name: 'Long Straddle',   note: 'Premiums historically cheap here. ATM call + put costs less — any sharp move tends to pay off.' },
        { name: 'Long Strangle',   note: 'Even cheaper. OTM wings need a bigger swing but the cost-to-move ratio is often favourable.' },
        { name: 'Debit Spreads',   note: 'Defined cost, defined max loss. Directional plays tend to be more efficient when IV is suppressed.' },
      ],
      pattern: 'Historically: low VIX periods precede the sharpest moves. Premium sellers get slowly ground down; buyers wait for the snap.',
    },
    {
      zone: 'VIX 15–20 — Equilibrium',
      color: '#4A9EFF',
      active: vixLevel != null && vixLevel >= 15 && vixLevel < 20,
      strategies: [
        { name: 'Iron Condor',      note: 'OTM call + put spreads on both sides. The "sweet spot" range — premium is fair, defined risk.' },
        { name: 'Covered Calls',    note: 'Writing calls against held positions tends to work well when IV is neither rich nor cheap.' },
        { name: 'Vertical Spreads', note: 'Both credit and debit flavours are viable. Market is typically pricing moves accurately here.' },
      ],
      pattern: 'The zone where most textbook strategies play out as designed. Neither premium buyers nor sellers have a structural edge.',
    },
    {
      zone: 'VIX 20–30 — Fear Spike',
      color: '#F59E0B',
      active: vixLevel != null && vixLevel >= 20 && vixLevel < 30,
      strategies: [
        { name: 'Short Straddle',   note: 'IV is historically "expensive" here. Selling ATM call + put captures inflated premium if market settles.' },
        { name: 'Short Strangle',   note: 'Wider strikes, more room to be wrong. Premium sellers have historically had an edge in this band.' },
        { name: 'Credit Spreads',   note: 'Defined-risk premium selling — elevated IV means more credit collected per unit of risk taken.' },
      ],
      pattern: 'Historically: elevated VIX tends to mean-revert. Markets that stay range-bound after a fear spike reward premium sellers.',
    },
    {
      zone: 'VIX > 30 — Panic',
      color: '#FF4455',
      active: vixLevel != null && vixLevel >= 30,
      strategies: [
        { name: 'Far OTM Puts',     note: 'Extreme IV means put sellers can collect enormous premium. Also the most dangerous trade — tails are fat.' },
        { name: 'Ratio Spreads',    note: 'Buy ATM protection, sell 2× OTM. Lets you participate in mean-reversion without pure naked exposure.' },
        { name: 'Wait & Observe',   note: 'Many professional desks reduce size during panic. Historically, entering too early in fear spikes is costly.' },
      ],
      pattern: 'The most dangerous and most profitable zone — simultaneously. Markets can gap 5%+ overnight. Position sizing matters more than strategy choice.',
    },
  ];

  return (
    <div className="fno-widget fno-strategy-widget">
      <div className="fno-widget-title">OPTIONS PLAYBOOK <span className="fno-widget-formula">based on live VIX · for educational reference only</span></div>
      <div className="fno-strategy-disclaimer">Historical patterns only · Not investment advice · Options trading involves substantial risk of loss</div>
      <div className="fno-strategy-grid">
        {STRATEGIES.map(s => (
          <div key={s.zone} className={`fno-strategy-zone ${s.active ? 'fno-strategy-active' : ''}`}
               style={s.active ? { borderColor: s.color, background: `${s.color}08` } : {}}>
            <div className="fno-strategy-zone-label" style={s.active ? { color: s.color } : {}}>
              {s.active && <span className="fno-strategy-dot" style={{ background: s.color }} />}
              {s.zone}
              {s.active && <span className="fno-strategy-current" style={{ color: s.color }}>← NOW</span>}
            </div>
            <div className="fno-strategy-list">
              {s.strategies.map(st => (
                <div key={st.name} className="fno-strategy-item">
                  <span className="fno-strategy-name" style={s.active ? { color: s.color } : {}}>{st.name}</span>
                  <span className="fno-strategy-note">{st.note}</span>
                </div>
              ))}
            </div>
            <div className="fno-strategy-avoid">{s.pattern}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIVOT POINTS
// ─────────────────────────────────────────────────────────────────────────────
function PivotPoints({ data }) {
  const indices = [
    { id: 'nifty50', label: 'Nifty 50' },
    { id: 'sensex',  label: 'Sensex'   },
    { id: 'banknifty', label: 'Bank Nifty' },
  ];

  const computePivots = (d) => {
    if (!d) return null;
    const H = d.high  || d.price * 1.005;
    const L = d.low   || d.price * 0.995;
    const C = d.price;
    const P  = (H + L + C) / 3;
    const R1 = 2 * P - L;
    const R2 = P + (H - L);
    const R3 = H + 2 * (P - L);
    const S1 = 2 * P - H;
    const S2 = P - (H - L);
    const S3 = L - 2 * (H - P);
    return { P, R1, R2, R3, S1, S2, S3, current: C };
  };

  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">PIVOT POINTS <span className="fno-widget-formula">Classic · (H+L+C)÷3</span></div>
      <div className="fno-widget-sub">Based on today's high/low/close · Intraday support & resistance</div>
      <div className="fno-pivot-tables">
        {indices.map(({ id, label }) => {
          const d = data?.[id];
          const p = computePivots(d);
          if (!p) return null;
          const levels = [
            { key: 'R3', label: 'R3', val: p.R3, type: 'res' },
            { key: 'R2', label: 'R2', val: p.R2, type: 'res' },
            { key: 'R1', label: 'R1', val: p.R1, type: 'res' },
            { key: 'P',  label: 'PP', val: p.P,  type: 'pivot' },
            { key: 'S1', label: 'S1', val: p.S1, type: 'sup' },
            { key: 'S2', label: 'S2', val: p.S2, type: 'sup' },
            { key: 'S3', label: 'S3', val: p.S3, type: 'sup' },
          ];
          // Find where current price sits
          const above = levels.filter(l => l.val <= p.current).map(l => l.key);
          return (
            <div key={id} className="fno-pivot-table">
              <div className="fno-pivot-header">
                <span className="fno-pivot-name">{label}</span>
                <span className="fno-pivot-price">{fmt(p.current)}</span>
              </div>
              {levels.map(l => {
                const isAbove = l.val <= p.current;
                const isPivot = l.type === 'pivot';
                return (
                  <div key={l.key} className={`fno-pivot-row ${isPivot ? 'fno-pivot-pp' : ''}`}>
                    <span className={`fno-pivot-key ${l.type === 'res' ? 'fno-pres' : l.type === 'sup' ? 'fno-psup' : 'fno-ppp'}`}>{l.label}</span>
                    <div className="fno-pivot-bar-wrap">
                      <div className="fno-pivot-fill" style={{
                        width: '100%',
                        background: l.type === 'res' ? 'rgba(255,68,85,0.12)' : l.type === 'sup' ? 'rgba(0,200,150,0.12)' : 'rgba(74,158,255,0.12)',
                        opacity: isAbove ? 1 : 0.4
                      }} />
                    </div>
                    <span className={`fno-pivot-val ${l.type === 'res' ? 'loss' : l.type === 'sup' ? 'gain' : ''}`}>{fmt(l.val)}</span>
                    {p.current > l.val * 0.998 && p.current < l.val * 1.002 &&
                      <span className="fno-pivot-near">← near</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THETA DECAY CURVE
// ─────────────────────────────────────────────────────────────────────────────
function ThetaDecayCurve() {
  const W = 560, H = 180, PAD = { t: 16, r: 20, b: 36, l: 44 };
  const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;

  // Theta decay: value ≈ sqrt(DTE/total) for simple illustration
  const TOTAL = 30;
  const points = Array.from({ length: TOTAL + 1 }, (_, i) => {
    const dte = TOTAL - i;
    const val = Math.sqrt(dte / TOTAL); // normalized 0–1
    const x   = PAD.l + (i / TOTAL) * CW;
    const y   = PAD.t + (1 - val) * CH;
    return { x, y, dte, val };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${(PAD.l + CW).toFixed(1)},${(PAD.t + CH).toFixed(1)} L${PAD.l},${(PAD.t + CH).toFixed(1)} Z`;

  // X axis labels
  const xLabels = [30, 21, 14, 7, 3, 0];

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">THETA DECAY CURVE</div>
      <div className="fno-widget-sub">How time value erodes as expiry approaches — decay accelerates in the last 7 days</div>
      <div className="fno-theta-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="fno-theta-svg">
          <defs>
            <linearGradient id="thetaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map(v => {
            const y = PAD.t + (1 - v) * CH;
            return (
              <g key={v}>
                <line x1={PAD.l} y1={y} x2={PAD.l + CW} y2={y} stroke="var(--border)" strokeWidth="1" />
                <text x={PAD.l - 6} y={y + 4} textAnchor="end" fill="var(--text3)" fontSize="9" fontFamily="monospace">
                  {Math.round(v * 100)}%
                </text>
              </g>
            );
          })}

          {/* 7-day danger zone */}
          {(() => {
            const x7 = PAD.l + ((TOTAL - 7) / TOTAL) * CW;
            return (
              <rect x={x7} y={PAD.t} width={CW - (x7 - PAD.l)} height={CH}
                fill="rgba(255,68,85,0.06)" />
            );
          })()}
          {(() => {
            const x7 = PAD.l + ((TOTAL - 7) / TOTAL) * CW;
            return <text x={x7 + 4} y={PAD.t + 12} fill="#FF4455" fontSize="8" fontFamily="monospace" opacity="0.7">7-day acceleration</text>;
          })()}

          {/* Area fill */}
          <path d={areaD} fill="url(#thetaGrad)" />

          {/* Main curve */}
          <path d={pathD} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* X axis labels */}
          {xLabels.map(dte => {
            const i = TOTAL - dte;
            const x = PAD.l + (i / TOTAL) * CW;
            return (
              <g key={dte}>
                <line x1={x} y1={PAD.t + CH} x2={x} y2={PAD.t + CH + 4} stroke="var(--border)" strokeWidth="1" />
                <text x={x} y={PAD.t + CH + 14} textAnchor="middle" fill="var(--text3)" fontSize="9" fontFamily="monospace">
                  {dte === 0 ? 'Expiry' : `${dte}d`}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + CH} stroke="var(--border2)" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t + CH} x2={PAD.l + CW} y2={PAD.t + CH} stroke="var(--border2)" strokeWidth="1" />

          {/* Y axis label */}
          <text x={10} y={PAD.t + CH / 2} textAnchor="middle" fill="var(--text3)" fontSize="9" fontFamily="monospace"
                transform={`rotate(-90, 10, ${PAD.t + CH / 2})`}>Time value</text>
        </svg>
        <div className="fno-theta-notes">
          <div className="fno-theta-note"><span className="fno-tn-dot" style={{ background: '#F59E0B' }} />Curve is not linear — decay speeds up near expiry</div>
          <div className="fno-theta-note"><span className="fno-tn-dot" style={{ background: '#FF4455' }} />Last 7 days: sharpest drop — sellers benefit, buyers fight time</div>
          <div className="fno-theta-note"><span className="fno-tn-dot" style={{ background: '#4A9EFF' }} />Far-dated options decay slowly — why sellers prefer weekly expiry</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOFF DIAGRAM BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function PayoffBuilder({ data }) {
  const spotDefault = data?.nifty50?.price ? Math.round(data.nifty50.price / 50) * 50 : 23000;
  const [type,    setType]    = useState('call');
  const [action,  setAction]  = useState('buy');
  const [strike,  setStrike]  = useState(spotDefault);
  const [premium, setPremium] = useState(150);
  const [lots,    setLots]    = useState(1);
  const LOT = 75;

  const W = 560, H = 180, PAD = { t: 16, r: 20, b: 36, l: 56 };
  const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;

  const range = useMemo(() => {
    const step = strike > 10000 ? 100 : 50;
    const from = strike - step * 8, to = strike + step * 8;
    return Array.from({ length: 17 }, (_, i) => from + i * step);
  }, [strike]);

  const pnl = (spot) => {
    let intrinsic;
    if (type === 'call') intrinsic = Math.max(0, spot - strike);
    else                  intrinsic = Math.max(0, strike - spot);
    const raw = (intrinsic - premium) * lots * LOT;
    return action === 'buy' ? raw : -raw;
  };

  const pnls  = range.map(pnl);
  const minPL = Math.min(...pnls), maxPL = Math.max(...pnls);
  const span  = Math.max(maxPL - minPL, 1);

  const toX = (i)  => PAD.l + (i / (range.length - 1)) * CW;
  const toY = (pl) => PAD.t + CH - ((pl - minPL) / span) * CH;
  const zeroY = toY(0);

  const pathD  = range.map((_, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(pnls[i]).toFixed(1)}`).join(' ');
  const breakeven = type === 'call'
    ? (action === 'buy' ? strike + premium : strike + premium)
    : (action === 'buy' ? strike - premium : strike - premium);
  const maxLoss   = action === 'buy' ? -premium * lots * LOT : null;
  const maxProfit = action === 'sell' ? premium * lots * LOT : null;

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">PAYOFF DIAGRAM BUILDER</div>
      <div className="fno-widget-sub">Visualise P&L at expiry for any single-leg position</div>
      <div className="fno-payoff-controls">
        <div className="fno-payoff-seg">
          {['call','put'].map(t => (
            <button key={t} className={`fno-seg-btn ${type===t?'fno-seg-active':''}`}
              style={type===t?{color:t==='call'?'#FF4455':'#00C896',borderColor:t==='call'?'#FF4455':'#00C896'}:{}}
              onClick={()=>setType(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
        <div className="fno-payoff-seg">
          {['buy','sell'].map(a => (
            <button key={a} className={`fno-seg-btn ${action===a?'fno-seg-active':''}`}
              style={action===a?{color:a==='buy'?'#4A9EFF':'#F59E0B',borderColor:a==='buy'?'#4A9EFF':'#F59E0B'}:{}}
              onClick={()=>setAction(a)}>{a.toUpperCase()}</button>
          ))}
        </div>
        <label className="fno-payoff-field">
          <span>Strike</span>
          <input type="number" value={strike} step={50} onChange={e=>setStrike(+e.target.value)} className="fno-payoff-input" />
        </label>
        <label className="fno-payoff-field">
          <span>Premium</span>
          <input type="number" value={premium} step={5} min={1} onChange={e=>setPremium(+e.target.value)} className="fno-payoff-input" />
        </label>
        <label className="fno-payoff-field">
          <span>Lots</span>
          <input type="number" value={lots} step={1} min={1} max={50} onChange={e=>setLots(+e.target.value)} className="fno-payoff-input" />
        </label>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="fno-payoff-svg">
        {/* Zero line */}
        {zeroY >= PAD.t && zeroY <= PAD.t + CH && (
          <line x1={PAD.l} y1={zeroY} x2={PAD.l + CW} y2={zeroY} stroke="var(--border2)" strokeWidth="1" strokeDasharray="4,3" />
        )}
        {/* Strike line */}
        {(() => {
          const si = range.findIndex(r => r >= strike);
          if (si < 0) return null;
          const sx = toX(si);
          return <line x1={sx} y1={PAD.t} x2={sx} y2={PAD.t + CH} stroke="var(--text3)" strokeWidth="1" strokeDasharray="3,3" />;
        })()}
        {/* Area */}
        <path d={`${pathD} L${toX(range.length-1)},${zeroY} L${PAD.l},${zeroY} Z`}
          fill={action==='buy'?'rgba(74,158,255,0.08)':'rgba(245,158,11,0.08)'} />
        {/* Curve */}
        <path d={pathD} fill="none"
          stroke={action==='buy'?'#4A9EFF':'#F59E0B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Y axis labels */}
        {[minPL, 0, maxPL].map(v => {
          const y = toY(v);
          if (y < PAD.t || y > PAD.t + CH) return null;
          const k = v === 0 ? '0' : v > 0 ? `+₹${(v/1000).toFixed(0)}k` : `-₹${Math.abs(v/1000).toFixed(0)}k`;
          return <text key={v} x={PAD.l - 4} y={y + 4} textAnchor="end" fill={v > 0 ? 'var(--gain)' : v < 0 ? 'var(--loss)' : 'var(--text3)'} fontSize="9" fontFamily="monospace">{k}</text>;
        })}
        {/* X labels */}
        {range.filter((_, i) => i % 4 === 0).map((v, _, arr) => {
          const i = range.indexOf(v);
          return <text key={v} x={toX(i)} y={PAD.t + CH + 14} textAnchor="middle" fill="var(--text3)" fontSize="9" fontFamily="monospace">{v.toLocaleString('en-IN')}</text>;
        })}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + CH} stroke="var(--border2)" strokeWidth="1" />
        <line x1={PAD.l} y1={PAD.t + CH} x2={PAD.l + CW} y2={PAD.t + CH} stroke="var(--border2)" strokeWidth="1" />
      </svg>

      <div className="fno-payoff-stats">
        <div className="fno-payoff-stat">
          <span className="fno-payoff-stat-l">Breakeven</span>
          <span className="fno-payoff-stat-v">{breakeven.toLocaleString('en-IN')}</span>
        </div>
        {maxLoss != null && <div className="fno-payoff-stat">
          <span className="fno-payoff-stat-l">Max Loss</span>
          <span className="fno-payoff-stat-v loss">₹{Math.abs(maxLoss).toLocaleString('en-IN')}</span>
        </div>}
        {maxProfit != null && <div className="fno-payoff-stat">
          <span className="fno-payoff-stat-l">Max Profit</span>
          <span className="fno-payoff-stat-v gain">₹{maxProfit.toLocaleString('en-IN')}</span>
        </div>}
        <div className="fno-payoff-stat">
          <span className="fno-payoff-stat-l">Lot size</span>
          <span className="fno-payoff-stat-v">{LOT} × {lots} = {LOT * lots}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-MONTH EXPIRY CALENDAR
// ─────────────────────────────────────────────────────────────────────────────
function ExpiryCalendar({ holidays = [], holidayNames = {} }) {
  const holidaySet = new Set(holidays);

  const getExpiries = () => {
    const now  = new Date();
    const ist  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const events = [];

    const toKey = d => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const fmt   = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Asia/Kolkata' });

    // Build next ~13 weeks of expiries
    for (let w = 0; w < 14; w++) {
      // Nifty weekly: Tuesday
      let nw = new Date(ist);
      nw.setDate(nw.getDate() + ((2 - nw.getDay() + 7) % 7) + w * 7);
      nw.setHours(15, 30, 0, 0);
      if (holidaySet.has(toKey(nw))) nw.setDate(nw.getDate() - 1); // shift back
      if (nw > now) events.push({ date: new Date(nw), label: 'Nifty Weekly', color: '#4A9EFF', type: 'weekly' });

      // Sensex weekly: Thursday
      let sw = new Date(ist);
      sw.setDate(sw.getDate() + ((4 - sw.getDay() + 7) % 7) + w * 7);
      sw.setHours(15, 30, 0, 0);
      if (holidaySet.has(toKey(sw))) sw.setDate(sw.getDate() - 1);
      if (sw > now) events.push({ date: new Date(sw), label: 'Sensex Weekly', color: '#F59E0B', type: 'weekly' });
    }

    // Monthly last Thursday for next 4 months
    for (let m = 0; m < 4; m++) {
      const yr  = ist.getMonth() + m > 11 ? ist.getFullYear() + 1 : ist.getFullYear();
      const mo  = (ist.getMonth() + m) % 12;
      const d   = new Date(yr, mo + 1, 0);
      while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
      d.setHours(15, 30, 0, 0);
      if (d > now) events.push({ date: new Date(d), label: 'Nifty Monthly', color: '#A78BFA', type: 'monthly' });
    }

    // Holiday markers
    holidays.filter(h => {
      const d = new Date(h + 'T00:00:00+05:30');
      const diff = (d - now) / 86400000;
      return diff > 0 && diff < 95;
    }).forEach(h => {
      const d = new Date(h + 'T00:00:00+05:30');
      events.push({ date: d, label: holidayNames[h] || 'Holiday', color: '#64748B', type: 'holiday' });
    });

    return events.sort((a, b) => a.date - b.date).slice(0, 30);
  };

  const events = useMemo(getExpiries, [holidays]);

  // Group by month
  const byMonth = {};
  events.forEach(e => {
    const mo = e.date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
    if (!byMonth[mo]) byMonth[mo] = [];
    byMonth[mo].push(e);
  });

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">EXPIRY CALENDAR <span className="fno-widget-formula">next 3 months · holiday-adjusted</span></div>
      <div className="fno-cal-wrap">
        {Object.entries(byMonth).slice(0, 3).map(([month, evts]) => (
          <div key={month} className="fno-cal-month">
            <div className="fno-cal-month-label">{month}</div>
            <div className="fno-cal-events">
              {evts.map((e, i) => (
                <div key={i} className="fno-cal-event" style={{ borderLeftColor: e.color }}>
                  <span className="fno-cal-date">{e.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Asia/Kolkata' })}</span>
                  <span className="fno-cal-label" style={{ color: e.color }}>{e.label}</span>
                  {e.type !== 'holiday' && (
                    <span className="fno-cal-dte">{Math.ceil((e.date - new Date()) / 86400000)}d away</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOT SIZE REFERENCE
// ─────────────────────────────────────────────────────────────────────────────
function LotSizes() {
  const LOTS = [
    { name: 'Nifty 50',      lot: 75,  expiry: 'Tue weekly',  color: '#4A9EFF' },
    { name: 'Bank Nifty',    lot: 35,  expiry: 'Wed weekly',  color: '#F59E0B' },
    { name: 'Sensex',        lot: 20,  expiry: 'Thu weekly',  color: '#A78BFA' },
    { name: 'Fin Nifty',     lot: 65,  expiry: 'Tue weekly',  color: '#34D399' },
    { name: 'Midcap Nifty',  lot: 75,  expiry: 'Mon weekly',  color: '#FB923C' },
    { name: 'Nifty Next 50', lot: 25,  expiry: 'Monthly',     color: '#64748B' },
  ];
  return (
    <div className="fno-widget">
      <div className="fno-widget-title">LOT SIZES</div>
      <div className="fno-lot-grid">
        {LOTS.map(l => (
          <div key={l.name} className="fno-lot-card">
            <div className="fno-lot-name" style={{ color: l.color }}>{l.name}</div>
            <div className="fno-lot-num">{l.lot}</div>
            <div className="fno-lot-expiry">{l.expiry}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function FnOPage({ data = {} }) {
  const FALLBACK_HOLIDAYS = ['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25'];
  const FALLBACK_NAMES    = {'2026-01-26':'Republic Day','2026-02-17':'Mahashivratri','2026-03-03':'Holi','2026-03-26':'Ram Navami','2026-03-31':'Mahavir Jayanti','2026-04-03':'Good Friday','2026-04-14':'Ambedkar Jayanti','2026-05-01':'Maharashtra Day','2026-05-28':'Bakri Id','2026-06-26':'Muharram','2026-09-14':'Ganesh Chaturthi','2026-10-02':'Gandhi Jayanti','2026-10-20':'Dussehra','2026-11-10':'Diwali Balipratipada','2026-11-24':'Guru Nanak Jayanti','2026-12-25':'Christmas'};

  const [holidays, setHolidays]         = useState(FALLBACK_HOLIDAYS);
  const [holidayNames, setHolidayNames] = useState(FALLBACK_NAMES);
  const [expiries, setExpiries]         = useState(() => getNiftyExpiries(FALLBACK_HOLIDAYS, FALLBACK_NAMES));
  const [holidayLive, setHolidayLive]   = useState(false);
  const [liveVix, setLiveVix]           = useState(null);

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

      {/* Ticker — reuse the same one from markets page */}
      <Ticker data={data} />

      {/* Expiry countdowns */}
      <div className="fno-expiry-vix-row">
        <div className="fno-expiry-panel">
          <div className="fno-expiry-group-label">Nifty 50 <span className="fno-expiry-rule">Tue weekly · last-Thu monthly</span></div>
          <div className="fno-expiry-grid">
            <ExpiryCard label="Weekly"  color="#4A9EFF" {...expiries.niftyWeekly}  />
            <ExpiryCard label="Monthly" color="#4A9EFF" {...expiries.niftyMonthly} />
          </div>
        </div>
        <div className="fno-expiry-panel" style={{ borderRight: 'none' }}>
          <div className="fno-expiry-group-label">Sensex <span className="fno-expiry-rule">Thu weekly · last-Thu monthly</span></div>
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

      {/* VIX + Strategy Cheatsheet */}
      <div className="fno-vix-breadth-row">
        <VIXCard onVix={setLiveVix} />
        <div style={{ padding: '20px', minWidth: 0 }}>
          <StrategySheet vixLevel={liveVix} />
        </div>
      </div>

      {/* Rollover + Expected Move */}
      <div className="fno-two-widgets">
        <RolloverMeter expiries={expiries} />
        <ExpectedMove data={data} expiries={expiries} />
      </div>

      {/* Strategy cheatsheet */}
      <div className="fno-section">
        <StrategySheet vixLevel={liveVix} />
      </div>

      {/* Pivot Points */}
      <div className="fno-section">
        <PivotPoints data={data} />
      </div>

      {/* Theta + Payoff side by side */}
      <div className="fno-two-widgets">
        <ThetaDecayCurve />
        <PayoffBuilder data={data} />
      </div>

      {/* Expiry Calendar + Lot Sizes */}
      <div className="fno-two-widgets">
        <ExpiryCalendar holidays={holidays} holidayNames={holidayNames} />
        <LotSizes />
      </div>

      {/* FII / DII */}
      <div className="fno-section">
        <div className="fno-section-label">FII / DII FLOW</div>
        <FiiDii />
      </div>

    </div>
  );
}
