// src/components/FnOPage.jsx · Full F&O dashboard
import React, { useState, useEffect, useMemo } from 'react';
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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const items = [
    { label: 'Nifty Weekly',   exp: expiries.niftyWeekly,   totalDays: 7,  color: '#4A9EFF' },
    { label: 'Nifty Monthly',  exp: expiries.niftyMonthly,  totalDays: 30, color: '#4A9EFF' },
    { label: 'Sensex Weekly',  exp: expiries.sensexWeekly,  totalDays: 7,  color: '#F59E0B' },
    { label: 'Sensex Monthly', exp: expiries.sensexMonthly, totalDays: 30, color: '#F59E0B' },
  ];

  const fmtLeft = (secs) => {
    if (!secs || secs <= 0) return 'Expired';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">ROLLOVER METER</div>
      <div className="fno-widget-sub">Time elapsed in current expiry cycle · holiday-adjusted</div>
      <div className="fno-rollover-list">
        {items.map(({ label, exp, totalDays, color }) => {
          if (!exp?.secsLeft) return null;
          const totalSecs = totalDays * 86400;
          const elapsed   = Math.max(0, totalSecs - exp.secsLeft);
          const pct       = Math.min(100, Math.round((elapsed / totalSecs) * 100));
          return (
            <div key={label} className="fno-rollover-row">
              <div className="fno-rollover-label">{label}</div>
              <div className="fno-rollover-bar-wrap">
                <div className="fno-rollover-bar">
                  <div className="fno-rollover-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="fno-rollover-pct" style={{ color }}>{pct}%</span>
              </div>
              <div className="fno-rollover-dte">{fmtLeft(exp.secsLeft)}</div>
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
  const nifty  = data?.nifty50;
  const sensex = data?.sensex;
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
    return { up: Math.round(price + move), dn: Math.round(price - move), pts: Math.round(move) };
  };

  const rows = [
    { label: 'Nifty 50', color: '#4A9EFF', price: nifty?.price,
      weekly:  calc(nifty?.price, vix, expiries.niftyWeekly?.secsLeft),
      monthly: calc(nifty?.price, vix, expiries.niftyMonthly?.secsLeft),
      wDate: expiries.niftyWeekly?.date, mDate: expiries.niftyMonthly?.date },
    { label: 'Sensex',   color: '#F59E0B', price: sensex?.price,
      weekly:  calc(sensex?.price, vix, expiries.sensexWeekly?.secsLeft),
      monthly: calc(sensex?.price, vix, expiries.sensexMonthly?.secsLeft),
      wDate: expiries.sensexWeekly?.date, mDate: expiries.sensexMonthly?.date },
  ];

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">EXPECTED MOVE <span className="fno-widget-formula">Price × (VIX÷100) × √(DTE÷365)</span></div>
      <div className="fno-widget-sub">Market-implied range · VIX {vix ? vix.toFixed(2) : '-'}</div>
      <div className="fno-em-two-col">
        {rows.map(({ label, color, price, weekly, monthly, wDate, mDate }) => (
          <div key={label} className="fno-em-col">
            <div className="fno-em-index-hdr" style={{ color }}>
              {label}
              <span style={{ fontWeight:400, color:'var(--text3)', fontSize:10, marginLeft:6 }}>
                {price ? price.toLocaleString('en-IN', { maximumFractionDigits:0 }) : ''}
              </span>
            </div>
            {[[`Weekly · ${wDate}`, weekly], [`Monthly · ${mDate}`, monthly]].map(([lbl, em]) => (
              em && <div key={lbl} className="fno-em-card">
                <div className="fno-em-label">{lbl}</div>
                <div className="fno-em-range">
                  <span className="fno-em-up gain">▲ {em.up.toLocaleString('en-IN')}</span>
                  <span className="fno-em-pts" style={{ color }}>±{em.pts} <span style={{fontSize:9,opacity:0.7}}>pts move</span></span>
                  <span className="fno-em-dn loss">▼ {em.dn.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
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
    { max: 12, label: 'VERY LOW',  color: '#00C896', bg: 'rgba(0,200,150,0.06)',
      bias: 'Option buyers historically favoured',
      detail: 'Low VIX = cheap premiums. Long straddles & strangles have historically offered good cost-to-move ratios. Sellers collect little premium for the risk taken.',
    },
    { max: 20, label: 'NORMAL',    color: '#4A9EFF', bg: 'rgba(74,158,255,0.06)',
      bias: 'Balanced · no structural edge either side',
      detail: 'Iron condors, vertical spreads, and covered calls tend to perform as designed in this range. Neither buyers nor sellers have a consistent historical advantage.',
    },
    { max: 30, label: 'ELEVATED',  color: '#F59E0B', bg: 'rgba(245,158,11,0.06)',
      bias: 'Premium sellers historically favoured',
      detail: 'Elevated VIX has historically mean-reverted. Short straddles and strangles collect fat premiums. Credit spreads offer more credit per unit of risk. Markets that settle reward sellers.',
    },
    { max: 99, label: 'HIGH FEAR', color: '#FF4455', bg: 'rgba(255,68,85,0.06)',
      bias: 'Reduce size · hedge first',
      detail: 'Extreme VIX means gaps and overnight reversals are common. Far OTM credit spreads collect outsized premium but tails are fat. Many professional desks reduce position size significantly.',
    },
  ];

  const HISTORY = [
    { label: 'Pre-COVID normal', range: '10–15',  note: '2018–2019 baseline' },
    { label: 'COVID peak',       range: '~85',    note: 'Mar 2020 · all-time high' },
    { label: 'Post-COVID',       range: '12–18',  note: '2021–2022 recovery' },
    { label: 'Current',          range: vix ? vix.price.toFixed(2) : '-', note: 'Today', highlight: true },
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
      <div className="fno-vix-bias" style={{ background: zone.bg, borderColor: `${zone.color}30` }}>
        <div className="fno-vix-bias-label" style={{ color: zone.color }}>→ {zone.bias}</div>
        <div className="fno-vix-bias-detail">{zone.detail}</div>
        <div className="fno-vix-bias-disclaimer">Based on publicly available historical VIX data. For educational reference only · not investment advice. Past patterns do not guarantee future results.</div>
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
function StrategySheet({ vixLevel, compact = false }) {
  const STRATEGIES = [
    {
      zone: 'VIX < 15 · Complacency',
      color: '#00C896',
      active: vixLevel != null && vixLevel < 15,
      strategies: [
        { name: 'Long Straddle',   note: 'Premiums historically cheap here. ATM call + put costs less · any sharp move tends to pay off.' },
        { name: 'Long Strangle',   note: 'Even cheaper. OTM wings need a bigger swing but the cost-to-move ratio is often favourable.' },
        { name: 'Debit Spreads',   note: 'Defined cost, defined max loss. Directional plays tend to be more efficient when IV is suppressed.' },
      ],
      pattern: 'Historically: low VIX periods precede the sharpest moves. Premium sellers get slowly ground down; buyers wait for the snap.',
    },
    {
      zone: 'VIX 15–20 · Equilibrium',
      color: '#4A9EFF',
      active: vixLevel != null && vixLevel >= 15 && vixLevel < 20,
      strategies: [
        { name: 'Iron Condor',      note: 'OTM call + put spreads on both sides. The "sweet spot" range · premium is fair, defined risk.' },
        { name: 'Covered Calls',    note: 'Writing calls against held positions tends to work well when IV is neither rich nor cheap.' },
        { name: 'Vertical Spreads', note: 'Both credit and debit flavours are viable. Market is typically pricing moves accurately here.' },
      ],
      pattern: 'The zone where most textbook strategies play out as designed. Neither premium buyers nor sellers have a structural edge.',
    },
    {
      zone: 'VIX 20–30 · Fear Spike',
      color: '#F59E0B',
      active: vixLevel != null && vixLevel >= 20 && vixLevel < 30,
      strategies: [
        { name: 'Short Straddle',   note: 'IV is historically "expensive" here. Selling ATM call + put captures inflated premium if market settles.' },
        { name: 'Short Strangle',   note: 'Wider strikes, more room to be wrong. Premium sellers have historically had an edge in this band.' },
        { name: 'Credit Spreads',   note: 'Defined-risk premium selling · elevated IV means more credit collected per unit of risk taken.' },
      ],
      pattern: 'Historically: elevated VIX tends to mean-revert. Markets that stay range-bound after a fear spike reward premium sellers.',
    },
    {
      zone: 'VIX > 30 · Panic',
      color: '#FF4455',
      active: vixLevel != null && vixLevel >= 30,
      strategies: [
        { name: 'Far OTM Puts',     note: 'Extreme IV means put sellers can collect enormous premium. Also the most dangerous trade · tails are fat.' },
        { name: 'Ratio Spreads',    note: 'Buy ATM protection, sell 2× OTM. Lets you participate in mean-reversion without pure naked exposure.' },
        { name: 'Wait & Observe',   note: 'Many professional desks reduce size during panic. Historically, entering too early in fear spikes is costly.' },
      ],
      pattern: 'The most dangerous and most profitable zone · simultaneously. Markets can gap 5%+ overnight. Position sizing matters more than strategy choice.',
    },
  ];

  return (
    <div className={compact ? 'fno-strategy-compact' : 'fno-widget fno-strategy-widget'}>
      {compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '1.5px', color: 'var(--text3)' }}>OPTIONS CHEAT CODE · LIVE VIX REGIME</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text2)', fontStyle: 'italic' }}>Historical patterns · not investment advice · options involve substantial risk</span>
        </div>
      )}
      {!compact && <div className="fno-widget-title">OPTIONS PLAYBOOK <span className="fno-widget-formula">based on live VIX · for educational reference only</span></div>}
      {!compact && <div className="fno-strategy-disclaimer">Historical patterns · not investment advice · options trading involves substantial risk</div>}
      <div className={compact ? 'fno-strategy-grid-compact' : 'fno-strategy-grid'}>
        {STRATEGIES.map(s => (
          <div key={s.zone} className={`fno-strategy-zone ${s.active ? 'fno-strategy-active' : ''}`}
               style={s.active ? { borderColor: s.color, background: `${s.color}08` } : {}}>
            <div className="fno-strategy-zone-label" style={s.active ? { color: s.color } : {}}>
              {s.active && <span className="fno-strategy-dot" style={{ background: s.color }} />}
              {s.zone}
              {s.active && <span className="fno-strategy-current" style={{ color: s.color, fontWeight: 700, fontSize: 10 }}>● NOW</span>}
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
function PivotPoints({ data, horizontal = false }) {
  const indices = [
    { id: 'nifty50',   label: 'Nifty 50'   },
    { id: 'sensex',    label: 'Sensex'      },
    { id: 'banknifty', label: 'Bank Nifty'  },
  ];

  const computePivots = (d) => {
    if (!d) return null;
    const H = d.high  || d.price * 1.005;
    const L = d.low   || d.price * 0.995;
    const C = d.price;
    const P  = (H + L + C) / 3;
    const R1 = 2 * P - L,  R2 = P + (H - L),    R3 = H + 2 * (P - L);
    const S1 = 2 * P - H,  S2 = P - (H - L),    S3 = L - 2 * (H - P);
    return { P, R1, R2, R3, S1, S2, S3, current: C };
  };

  const fmt = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const LEVELS = ['R3','R2','R1','PP','S1','S2','S3'];

  if (horizontal) {
    // Horizontal layout: each index is a row, levels are columns
    return (
      <div className="fno-pivot-horiz">
        <div className="fno-widget-title" style={{ padding: '14px 16px 8px' }}>
          PIVOT POINTS <span className="fno-widget-formula">Classic · (H+L+C)÷3</span>
        </div>
        <div className="fno-pvh-table">
          {/* Header */}
          <div className="fno-pvh-row fno-pvh-hdr">
            <span className="fno-pvh-index">Index</span>
            <span className="fno-pvh-price">Last</span>
            {LEVELS.map(l => (
              <span key={l} className={`fno-pvh-cell ${l==='PP'?'fno-pvh-pp':l.startsWith('R')?'fno-pres':'fno-psup'}`}>{l}</span>
            ))}
          </div>
          {indices.map(({ id, label }) => {
            const d = data?.[id];
            const p = computePivots(d);
            if (!p) return null;
            const vals = { R3: p.R3, R2: p.R2, R1: p.R1, PP: p.P, S1: p.S1, S2: p.S2, S3: p.S3 };
            return (
              <div key={id} className="fno-pvh-row">
                <span className="fno-pvh-index">{label}</span>
                <span className="fno-pvh-price">{fmt(p.current)}</span>
                {LEVELS.map(l => {
                  const v = vals[l];
                  const near = p.current > v * 0.998 && p.current < v * 1.002;
                  const above = v <= p.current;
                  return (
                    <span key={l} className={`fno-pvh-cell ${l==='PP'?'':l.startsWith('R')?'loss':'gain'} ${near?'fno-pvh-near':''}`}
                      style={{ opacity: l !== 'PP' && !above ? 0.45 : 1 }}>
                      {fmt(v)}{near ? ' ★' : ''}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="fno-widget-sub" style={{ padding: '6px 16px 12px' }}>Based on today's high/low/close · ★ = price near this level</div>
      </div>
    );
  }

  // Original vertical layout
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
          return (
            <div key={id} className="fno-pivot-table">
              <div className="fno-pivot-header">
                <span className="fno-pivot-name">{label}</span>
                <span className="fno-pivot-price">{fmt(p.current)}</span>
              </div>
              {levels.map(l => {
                const isAbove = l.val <= p.current;
                return (
                  <div key={l.key} className={`fno-pivot-row ${l.type === 'pivot' ? 'fno-pivot-pp' : ''}`}>
                    <span className={`fno-pivot-key ${l.type === 'res' ? 'fno-pres' : l.type === 'sup' ? 'fno-psup' : 'fno-ppp'}`}>{l.label}</span>
                    <div className="fno-pivot-bar-wrap">
                      <div className="fno-pivot-fill" style={{ width: '100%', background: l.type === 'res' ? 'rgba(255,68,85,0.12)' : l.type === 'sup' ? 'rgba(0,200,150,0.12)' : 'rgba(74,158,255,0.12)', opacity: isAbove ? 1 : 0.4 }} />
                    </div>
                    <span className={`fno-pivot-val ${l.type === 'res' ? 'loss' : l.type === 'sup' ? 'gain' : ''}`}>{fmt(l.val)}</span>
                    {p.current > l.val * 0.998 && p.current < l.val * 1.002 && <span className="fno-pivot-near">← near</span>}
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
      <div className="fno-widget-sub">How time value erodes as expiry approaches · decay accelerates in the last 7 days</div>
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
          <div className="fno-theta-note"><span className="fno-tn-dot" style={{ background: '#F59E0B' }} />Curve is not linear · decay speeds up near expiry</div>
          <div className="fno-theta-note"><span className="fno-tn-dot" style={{ background: '#FF4455' }} />Last 7 days: sharpest drop · sellers benefit, buyers fight time</div>
          <div className="fno-theta-note"><span className="fno-tn-dot" style={{ background: '#4A9EFF' }} />Far-dated options decay slowly · why sellers prefer weekly expiry</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOFF DIAGRAM BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function PayoffBuilder({ data }) { return <StrategyCalculator data={data} />; }

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY CALCULATOR · full multi-leg payoff builder
// ─────────────────────────────────────────────────────────────────────────────
const STRATEGY_GROUPS = [
  { group: 'SINGLE LEG', items: [
    { id: 'long_call',  label: 'Long Call'  },
    { id: 'long_put',   label: 'Long Put'   },
    { id: 'short_call', label: 'Short Call' },
    { id: 'short_put',  label: 'Short Put'  },
  ]},
  { group: 'VOLATILITY', items: [
    { id: 'long_straddle',  label: 'Long Straddle'  },
    { id: 'short_straddle', label: 'Short Straddle' },
    { id: 'long_strangle',  label: 'Long Strangle'  },
    { id: 'short_strangle', label: 'Short Strangle' },
    { id: 'long_guts',      label: 'Long Guts'      },
    { id: 'short_guts',     label: 'Short Guts'     },
  ]},
  { group: 'VERTICAL SPREADS', items: [
    { id: 'bull_call_spread', label: 'Bull Call Spread' },
    { id: 'bear_call_spread', label: 'Bear Call Spread' },
    { id: 'bull_put_spread',  label: 'Bull Put Spread'  },
    { id: 'bear_put_spread',  label: 'Bear Put Spread'  },
  ]},
  { group: 'IRON STRATS', items: [
    { id: 'short_iron_condor',    label: 'Short Iron Condor'    },
    { id: 'long_iron_condor',     label: 'Long Iron Condor'     },
    { id: 'short_iron_butterfly', label: 'Short Iron Butterfly' },
    { id: 'long_iron_butterfly',  label: 'Long Iron Butterfly'  },
  ]},
  { group: 'BUTTERFLY', items: [
    { id: 'long_call_butterfly',  label: 'Long Call Butterfly'  },
    { id: 'short_call_butterfly', label: 'Short Call Butterfly' },
    { id: 'long_put_butterfly',   label: 'Long Put Butterfly'   },
    { id: 'short_put_butterfly',  label: 'Short Put Butterfly'  },
  ]},
  { group: 'CONDOR', items: [
    { id: 'long_call_condor',  label: 'Long Call Condor'  },
    { id: 'short_call_condor', label: 'Short Call Condor' },
    { id: 'long_put_condor',   label: 'Long Put Condor'   },
    { id: 'short_put_condor',  label: 'Short Put Condor'  },
  ]},
  { group: 'SYNTHETIC', items: [
    { id: 'synthetic_long',  label: 'Synthetic Long'  },
    { id: 'synthetic_short', label: 'Synthetic Short' },
  ]},
];

// Returns default legs for a strategy given a spot price
function defaultLegs(stratId, spot) {
  const S = spot, step = S > 10000 ? 100 : 50;
  const atm = Math.round(S / step) * step;
  const w   = step * 2; // wing width

  // leg shape: { type:'call'|'put', qty:+1|-1, strike, premium, label }
  const C = (K, p, q, lbl) => ({ type:'call', qty:q, strike:K, premium:p, label:lbl });
  const P = (K, p, q, lbl) => ({ type:'put',  qty:q, strike:K, premium:p, label:lbl });

  const map = {
    long_call:  [C(atm, 150, 1, 'Long Call')],
    long_put:   [P(atm, 150, 1, 'Long Put')],
    short_call: [C(atm, 150,-1, 'Short Call')],
    short_put:  [P(atm, 150,-1, 'Short Put')],

    long_straddle:  [C(atm,150, 1,'Call'), P(atm,150, 1,'Put')],
    short_straddle: [C(atm,150,-1,'Call'), P(atm,150,-1,'Put')],
    long_strangle:  [C(atm+w,100, 1,'OTM Call'), P(atm-w,100, 1,'OTM Put')],
    short_strangle: [C(atm+w,100,-1,'OTM Call'), P(atm-w,100,-1,'OTM Put')],
    long_guts:      [C(atm-w,250, 1,'ITM Call'), P(atm+w,250, 1,'ITM Put')],
    short_guts:     [C(atm-w,250,-1,'ITM Call'), P(atm+w,250,-1,'ITM Put')],

    bull_call_spread: [C(atm,150, 1,'Buy Call'), C(atm+w, 70,-1,'Sell Call')],
    bear_call_spread: [C(atm,150,-1,'Sell Call'), C(atm+w, 70, 1,'Buy Call')],
    bull_put_spread:  [P(atm-w, 70,-1,'Sell Put'), P(atm,150, 1,'Buy Put')],
    bear_put_spread:  [P(atm,150, 1,'Buy Put'), P(atm-w, 70,-1,'Sell Put')],

    short_iron_condor:    [P(atm-w*2,40, 1,'Buy Put'), P(atm-w,80,-1,'Sell Put'), C(atm+w,80,-1,'Sell Call'), C(atm+w*2,40, 1,'Buy Call')],
    long_iron_condor:     [P(atm-w*2,40,-1,'Sell Put'), P(atm-w,80, 1,'Buy Put'), C(atm+w,80, 1,'Buy Call'), C(atm+w*2,40,-1,'Sell Call')],
    short_iron_butterfly: [P(atm-w,80, 1,'Buy Put'), P(atm,150,-1,'Sell Put'), C(atm,150,-1,'Sell Call'), C(atm+w,80, 1,'Buy Call')],
    long_iron_butterfly:  [P(atm-w,80,-1,'Sell Put'), P(atm,150, 1,'Buy Put'), C(atm,150, 1,'Buy Call'), C(atm+w,80,-1,'Sell Call')],

    long_call_butterfly:  [C(atm-w,120, 1,'Buy Call'), C(atm,150,-2,'Sell 2× Call'), C(atm+w, 80, 1,'Buy Call')],
    short_call_butterfly: [C(atm-w,120,-1,'Sell Call'), C(atm,150, 2,'Buy 2× Call'), C(atm+w, 80,-1,'Sell Call')],
    long_put_butterfly:   [P(atm-w, 80, 1,'Buy Put'), P(atm,150,-2,'Sell 2× Put'), P(atm+w,120, 1,'Buy Put')],
    short_put_butterfly:  [P(atm-w, 80,-1,'Sell Put'), P(atm,150, 2,'Buy 2× Put'), P(atm+w,120,-1,'Sell Put')],

    long_call_condor:  [C(atm-w*2,150, 1,'Buy Call'), C(atm-w,120,-1,'Sell Call'), C(atm+w,80,-1,'Sell Call'), C(atm+w*2,60, 1,'Buy Call')],
    short_call_condor: [C(atm-w*2,150,-1,'Sell Call'), C(atm-w,120, 1,'Buy Call'), C(atm+w,80, 1,'Buy Call'), C(atm+w*2,60,-1,'Sell Call')],
    long_put_condor:   [P(atm-w*2, 60, 1,'Buy Put'), P(atm-w, 80,-1,'Sell Put'), P(atm+w,120,-1,'Sell Put'), P(atm+w*2,150, 1,'Buy Put')],
    short_put_condor:  [P(atm-w*2, 60,-1,'Sell Put'), P(atm-w, 80, 1,'Buy Put'), P(atm+w,120, 1,'Buy Put'), P(atm+w*2,150,-1,'Sell Put')],

    synthetic_long:  [C(atm,150, 1,'Long Call'), P(atm,150,-1,'Short Put')],
    synthetic_short: [C(atm,150,-1,'Short Call'), P(atm,150, 1,'Long Put')],
  };
  return (map[stratId] || map.long_call).map(l => ({ ...l }));
}

function StrategyCalculator({ data }) {
  const spotDefault  = data?.nifty50?.price ? Math.round(data.nifty50.price / 100) * 100 : 23000;
  const [stratId,  setStratId]  = useState('long_straddle');
  const [spot,     setSpot]     = useState(spotDefault);
  const [lots,     setLots]     = useState(1);
  const [legs,     setLegs]     = useState(() => defaultLegs('long_straddle', spotDefault));
  const [menuOpen, setMenuOpen] = useState(false);
  const LOT = 75;

  const selectStrategy = (id) => {
    setStratId(id);
    setLegs(defaultLegs(id, spot));
    setMenuOpen(false);
  };

  const updateLeg = (i, field, val) => {
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: +val } : l));
  };

  const stratLabel = STRATEGY_GROUPS.flatMap(g => g.items).find(s => s.id === stratId)?.label || '';

  // Compute PnL across price range
  const { range, pnls, netCredit } = useMemo(() => {
    const allStrikes = legs.map(l => l.strike);
    const minS = Math.min(...allStrikes), maxS = Math.max(...allStrikes);
    const step  = spot > 10000 ? 50 : 25;
    const from  = Math.min(minS - step * 10, spot - step * 10);
    const to    = Math.max(maxS + step * 10, spot + step * 10);
    const range = [];
    for (let s = from; s <= to; s += step) range.push(s);

    const pnls = range.map(s => {
      let total = 0;
      for (const leg of legs) {
        const intrinsic = leg.type === 'call'
          ? Math.max(0, s - leg.strike)
          : Math.max(0, leg.strike - s);
        total += leg.qty * (intrinsic - leg.premium) * lots * LOT;
      }
      return total;
    });

    const netCredit = -legs.reduce((sum, l) => sum + l.qty * l.premium * lots * LOT, 0);
    return { range, pnls, netCredit };
  }, [legs, lots, spot]);

  const maxPnl = Math.max(...pnls), minPnl = Math.min(...pnls);
  const span   = Math.max(maxPnl - minPnl, 1);

  // Breakeven points
  const breakevens = useMemo(() => {
    const bvs = [];
    for (let i = 0; i < pnls.length - 1; i++) {
      if ((pnls[i] < 0 && pnls[i+1] >= 0) || (pnls[i] >= 0 && pnls[i+1] < 0)) {
        const frac = -pnls[i] / (pnls[i+1] - pnls[i]);
        bvs.push(Math.round(range[i] + frac * (range[i+1] - range[i])));
      }
    }
    return bvs;
  }, [pnls, range]);

  // SVG dims
  const W = 640, H = 200, PAD = { t: 20, r: 20, b: 36, l: 60 };
  const CW = W - PAD.l - PAD.r, CH = H - PAD.t - PAD.b;

  const toX = (s) => PAD.l + ((s - range[0]) / (range[range.length-1] - range[0])) * CW;
  const toY = (p) => PAD.t + CH - ((p - minPnl) / span) * CH;
  const zeroY = toY(0);

  const pathD = range.map((s, i) => `${i===0?'M':'L'}${toX(s).toFixed(1)},${toY(pnls[i]).toFixed(1)}`).join(' ');

  // Colour based on whether net debit or credit
  const curveColor = netCredit >= 0 ? '#F59E0B' : '#4A9EFF';

  // X-axis labels · show strikes + a few others
  const strikeSet = new Set(legs.map(l => l.strike));
  const xLabels = range.filter((s, i) => {
    if (strikeSet.has(s)) return true;
    return i % Math.floor(range.length / 6) === 0;
  });

  const fmt  = n => Math.abs(n) >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Math.abs(n/1000).toFixed(0)}k`;
  const fmtN = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const isUnlimited = (v) => Math.abs(v) > 5000000;

  return (
    <div className="fno-strat-calc">
      <div className="fno-widget-title" style={{ padding: '20px 20px 0' }}>
        STRATEGY CALCULATOR
        <span className="fno-widget-formula">payoff at expiry · for reference only</span>
      </div>

      <div className="fno-strat-top">
        {/* Strategy selector */}
        <div className="fno-strat-selector-wrap">
          <button className="fno-strat-selector-btn" onClick={() => setMenuOpen(m => !m)}>
            <span className="fno-strat-sel-label">{stratLabel}</span>
            <span className="fno-strat-sel-arrow">{menuOpen ? '▲' : '▼'}</span>
          </button>
          {menuOpen && (
            <div className="fno-strat-menu">
              {STRATEGY_GROUPS.map(g => (
                <div key={g.group}>
                  <div className="fno-strat-menu-group">{g.group}</div>
                  {g.items.map(s => (
                    <div key={s.id}
                      className={`fno-strat-menu-item ${s.id === stratId ? 'fno-strat-menu-active' : ''}`}
                      onClick={() => selectStrategy(s.id)}>{s.label}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spot + lots */}
        <label className="fno-payoff-field">
          <span>Spot</span>
          <input type="number" value={spot} step={50} className="fno-payoff-input"
            onChange={e => { setSpot(+e.target.value); setLegs(defaultLegs(stratId, +e.target.value)); }} />
        </label>
        <label className="fno-payoff-field">
          <span>Lots</span>
          <input type="number" value={lots} step={1} min={1} className="fno-payoff-input" style={{ width: 60 }}
            onChange={e => setLots(+e.target.value)} />
        </label>
      </div>

      {/* Leg inputs */}
      <div className="fno-strat-legs">
        {legs.map((leg, i) => (
          <div key={i} className={`fno-strat-leg ${leg.qty > 0 ? 'fno-leg-buy' : 'fno-leg-sell'}`}>
            <span className="fno-leg-dir" style={{ color: leg.qty > 0 ? '#4A9EFF' : '#F59E0B' }}>
              {leg.qty > 0 ? 'BUY' : 'SELL'} {Math.abs(leg.qty) > 1 ? `${Math.abs(leg.qty)}×` : ''}
            </span>
            <span className={`fno-leg-type ${leg.type === 'call' ? 'loss' : 'gain'}`}>{leg.type.toUpperCase()}</span>
            <label className="fno-leg-field">
              <span>Strike</span>
              <input type="number" value={leg.strike} step={50} className="fno-leg-input"
                onChange={e => updateLeg(i, 'strike', e.target.value)} />
            </label>
            <label className="fno-leg-field">
              <span>Premium</span>
              <input type="number" value={leg.premium} step={5} min={1} className="fno-leg-input"
                onChange={e => updateLeg(i, 'premium', e.target.value)} />
            </label>
            <span className="fno-leg-cost" style={{ color: leg.qty > 0 ? 'var(--loss)' : 'var(--gain)' }}>
              {leg.qty > 0 ? '-' : '+'}₹{Math.abs(leg.qty * leg.premium * lots * LOT).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
        <div className="fno-leg-net">
          Net {netCredit >= 0 ? <span className="gain">Credit ₹{netCredit.toLocaleString('en-IN')}</span> : <span className="loss">Debit ₹{Math.abs(netCredit).toLocaleString('en-IN')}</span>}
        </div>
      </div>

      {/* Payoff chart */}
      <div className="fno-strat-chart">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
          <defs>
            <linearGradient id="stratGradPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={curveColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={curveColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[minPnl, 0, maxPnl].map(v => {
            const y = toY(v); if (y < PAD.t - 2 || y > PAD.t + CH + 2) return null;
            return <line key={v} x1={PAD.l} y1={y} x2={PAD.l + CW} y2={y} stroke="var(--border)" strokeWidth="1" />;
          })}

          {/* Zero line */}
          {zeroY >= PAD.t && zeroY <= PAD.t + CH && (
            <line x1={PAD.l} y1={zeroY} x2={PAD.l + CW} y2={zeroY} stroke="var(--border2)" strokeWidth="1.5" strokeDasharray="5,4" />
          )}

          {/* Strike lines */}
          {legs.map((leg, i) => {
            const x = toX(leg.strike);
            if (x < PAD.l || x > PAD.l + CW) return null;
            return <line key={i} x1={x} y1={PAD.t} x2={x} y2={PAD.t + CH}
              stroke={leg.type === 'call' ? 'rgba(255,68,85,0.3)' : 'rgba(0,200,150,0.3)'}
              strokeWidth="1" strokeDasharray="3,3" />;
          })}

          {/* Breakeven lines */}
          {breakevens.map((be, i) => {
            const x = toX(be);
            if (x < PAD.l || x > PAD.l + CW) return null;
            return <line key={i} x1={x} y1={PAD.t} x2={x} y2={PAD.t + CH}
              stroke="#F59E0B" strokeWidth="1" strokeDasharray="2,3" />;
          })}

          {/* Area fill */}
          <path d={`${pathD} L${toX(range[range.length-1])},${zeroY} L${toX(range[0])},${zeroY} Z`}
            fill={`url(#stratGradPos)`} opacity="0.6" />

          {/* Main curve */}
          <path d={pathD} fill="none" stroke={curveColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Y labels */}
          {[minPnl, 0, maxPnl].filter((v,i,a) => a.indexOf(v) === i).map(v => {
            const y = toY(v); if (y < PAD.t || y > PAD.t + CH) return null;
            return <text key={v} x={PAD.l - 5} y={y + 4} textAnchor="end"
              fill={v > 0 ? 'var(--gain)' : v < 0 ? 'var(--loss)' : 'var(--text3)'}
              fontSize="9" fontFamily="monospace">
              {v === 0 ? '0' : isUnlimited(v) ? '∞' : fmt(v)}
            </text>;
          })}

          {/* X labels */}
          {xLabels.map(s => {
            const x = toX(s); if (x < PAD.l || x > PAD.l + CW) return null;
            const isStrike = strikeSet.has(s);
            return <text key={s} x={x} y={PAD.t + CH + 14} textAnchor="middle"
              fill={isStrike ? 'var(--text2)' : 'var(--text3)'}
              fontSize={isStrike ? '9' : '8'} fontWeight={isStrike ? '700' : '400'}
              fontFamily="monospace">{fmtN(s)}</text>;
          })}

          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + CH} stroke="var(--border2)" strokeWidth="1" />
          <line x1={PAD.l} y1={PAD.t + CH} x2={PAD.l + CW} y2={PAD.t + CH} stroke="var(--border2)" strokeWidth="1" />

          {/* Spot marker */}
          {(() => {
            const x = toX(spot);
            if (x < PAD.l || x > PAD.l + CW) return null;
            return <>
              <line x1={x} y1={PAD.t} x2={x} y2={PAD.t + CH} stroke="var(--accent)" strokeWidth="1" strokeDasharray="2,2" />
              <text x={x} y={PAD.t - 4} textAnchor="middle" fill="var(--accent)" fontSize="8" fontFamily="monospace">SPOT</text>
            </>;
          })()}
        </svg>
      </div>

      {/* Stats */}
      <div className="fno-strat-stats">
        <div className="fno-strat-stat">
          <span className="fno-strat-stat-l">Max Profit</span>
          <span className="fno-strat-stat-v gain">{isUnlimited(maxPnl) ? 'Unlimited' : `₹${maxPnl.toLocaleString('en-IN',{maximumFractionDigits:0})}`}</span>
        </div>
        <div className="fno-strat-stat">
          <span className="fno-strat-stat-l">Max Loss</span>
          <span className="fno-strat-stat-v loss">{isUnlimited(minPnl) ? 'Unlimited' : `₹${Math.abs(minPnl).toLocaleString('en-IN',{maximumFractionDigits:0})}`}</span>
        </div>
        {!isUnlimited(maxPnl) && !isUnlimited(minPnl) && minPnl !== 0 && (
          <div className="fno-strat-stat">
            <span className="fno-strat-stat-l">Risk:Reward</span>
            <span className="fno-strat-stat-v">1 : {(maxPnl / Math.abs(minPnl)).toFixed(2)}</span>
          </div>
        )}
        {breakevens.map((be, i) => (
          <div key={i} className="fno-strat-stat">
            <span className="fno-strat-stat-l">Breakeven {breakevens.length > 1 ? i+1 : ''}</span>
            <span className="fno-strat-stat-v">{fmtN(be)}</span>
          </div>
        ))}
        <div className="fno-strat-stat">
          <span className="fno-strat-stat-l">Net {netCredit >= 0 ? 'Credit' : 'Debit'}</span>
          <span className={`fno-strat-stat-v ${netCredit >= 0 ? 'gain' : 'loss'}`}>₹{Math.abs(netCredit).toLocaleString('en-IN')}</span>
        </div>
      </div>
      <div style={{ padding: '8px 20px 16px', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text3)' }}>
        Historical patterns only · Theoretical payoff at expiry · Not investment advice · Actual P&L may differ
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
// BLACK-SCHOLES GREEKS
// ─────────────────────────────────────────────────────────────────────────────
function BlackScholes({ data }) {
  const spotDefault = data?.nifty50?.price ? Math.round(data.nifty50.price / 50) * 50 : 23000;
  const [spot,   setSpot]   = useState(spotDefault);
  const [strike, setStrike] = useState(spotDefault);
  const [iv,     setIv]     = useState(20);
  const [dte,    setDte]    = useState(7);
  const [r,      setR]      = useState(6.5);
  const [type,   setType]   = useState('call');

  const calc = useMemo(() => {
    const S = spot, K = strike, T = dte / 365, v = iv / 100, rr = r / 100;
    if (S <= 0 || K <= 0 || T <= 0 || v <= 0) return null;
    const d1 = (Math.log(S / K) + (rr + 0.5 * v * v) * T) / (v * Math.sqrt(T));
    const d2 = d1 - v * Math.sqrt(T);

    const N  = x => { // standard normal CDF
      const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
      const sign = x < 0 ? -1 : 1;
      const t = 1 / (1 + p * Math.abs(x));
      const poly = t*(a1+t*(a2+t*(a3+t*(a4+t*a5))));
      return 0.5 * (1 + sign * (1 - poly * Math.exp(-x * x / 2)));
    };
    const n  = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); // PDF

    const isCall = type === 'call';
    const price  = isCall
      ? S * N(d1) - K * Math.exp(-rr * T) * N(d2)
      : K * Math.exp(-rr * T) * N(-d2) - S * N(-d1);

    const delta  = isCall ? N(d1) : N(d1) - 1;
    const gamma  = n(d1) / (S * v * Math.sqrt(T));
    const theta  = (isCall
      ? -(S * n(d1) * v) / (2 * Math.sqrt(T)) - rr * K * Math.exp(-rr * T) * N(d2)
      : -(S * n(d1) * v) / (2 * Math.sqrt(T)) + rr * K * Math.exp(-rr * T) * N(-d2)) / 365;
    const vega   = S * n(d1) * Math.sqrt(T) / 100;
    const rhoV   = isCall
      ? K * T * Math.exp(-rr * T) * N(d2) / 100
      : -K * T * Math.exp(-rr * T) * N(-d2) / 100;

    return { price, delta, gamma, theta, vega, rho: rhoV, d1, d2 };
  }, [spot, strike, iv, dte, r, type]);

  const fmt2 = n => n.toFixed(4);
  const GREEKS = calc ? [
    { name: 'Price',  val: calc.price.toFixed(2),   note: 'Theoretical premium',           color: 'var(--text)' },
    { name: 'Delta',  val: fmt2(calc.delta),          note: '₹ move per ₹1 spot change',     color: calc.delta > 0 ? 'var(--gain)' : 'var(--loss)' },
    { name: 'Gamma',  val: fmt2(calc.gamma),          note: 'Delta change per ₹1 spot move', color: '#A78BFA' },
    { name: 'Theta',  val: fmt2(calc.theta),          note: 'Premium decay per day',         color: '#FF4455' },
    { name: 'Vega',   val: fmt2(calc.vega),           note: 'Value change per 1% IV move',   color: '#F59E0B' },
    { name: 'Rho',    val: fmt2(calc.rho),            note: 'Value change per 1% rate move', color: 'var(--text3)' },
  ] : [];

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">BLACK-SCHOLES GREEKS <span className="fno-widget-formula">educational · theoretical values</span></div>
      <div className="fno-widget-sub">Real-world prices differ · use as reference only</div>
      <div className="fno-bs-controls">
        <div className="fno-payoff-seg">
          {['call','put'].map(t => (
            <button key={t} className={`fno-seg-btn ${type===t?'fno-seg-active':''}`}
              style={type===t?{color:t==='call'?'#FF4455':'#00C896',borderColor:t==='call'?'#FF4455':'#00C896'}:{}}
              onClick={()=>setType(t)}>{t.toUpperCase()}</button>
          ))}
        </div>
        {[
          { label: 'Spot',    val: spot,   set: setSpot,   step: 50  },
          { label: 'Strike',  val: strike, set: setStrike, step: 50  },
          { label: 'IV %',    val: iv,     set: setIv,     step: 0.5 },
          { label: 'DTE',     val: dte,    set: setDte,    step: 1   },
          { label: 'Rate %',  val: r,      set: setR,      step: 0.25},
        ].map(f => (
          <label key={f.label} className="fno-payoff-field">
            <span>{f.label}</span>
            <input type="number" value={f.val} step={f.step} min={0}
              onChange={e => f.set(+e.target.value)} className="fno-payoff-input" style={{ width: 72 }} />
          </label>
        ))}
      </div>
      <div className="fno-greeks-grid">
        {GREEKS.map(g => (
          <div key={g.name} className="fno-greek-card">
            <div className="fno-greek-name">{g.name}</div>
            <div className="fno-greek-val" style={{ color: g.color }}>{g.val}</div>
            <div className="fno-greek-note">{g.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POSITION SIZER
// ─────────────────────────────────────────────────────────────────────────────
function PositionSizer({ data }) {
  const [capital,  setCapital]  = useState(500000);
  const [riskPct,  setRiskPct]  = useState(2);
  const [entry,    setEntry]    = useState(150);
  const [stop,     setStop]     = useState(80);
  const [index,    setIndex]    = useState('nifty');

  const LOT_MAP = { nifty: 75, banknifty: 35, sensex: 20, finnifty: 65, midcap: 75 };
  const lot = LOT_MAP[index];

  const riskPerLot  = (entry - stop) * lot;
  const maxRiskRs   = (capital * riskPct) / 100;
  const maxLots     = riskPerLot > 0 ? Math.floor(maxRiskRs / riskPerLot) : 0;
  const actualRisk  = maxLots * riskPerLot;
  const actualRiskPct = capital > 0 ? ((actualRisk / capital) * 100).toFixed(2) : 0;
  const premiumReqd = maxLots * lot * entry;

  const fmt = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="fno-widget" style={{ borderRight: 'none' }}>
      <div className="fno-widget-title">POSITION SIZER <span className="fno-widget-formula">risk-based · per trade</span></div>
      <div className="fno-widget-sub">How many lots to trade based on your capital and risk tolerance</div>
      <div className="fno-bs-controls" style={{ flexWrap: 'wrap' }}>
        <div className="fno-payoff-seg">
          {Object.keys(LOT_MAP).map(k => (
            <button key={k} className={`fno-seg-btn ${index===k?'fno-seg-active':''}`}
              onClick={()=>setIndex(k)}>{k === 'banknifty' ? 'BNF' : k === 'finnifty' ? 'FIN' : k === 'midcap' ? 'MID' : k.toUpperCase()}</button>
          ))}
        </div>
        {[
          { label: 'Capital ₹',  val: capital,  set: setCapital,  step: 50000 },
          { label: 'Risk %',     val: riskPct,  set: setRiskPct,  step: 0.5   },
          { label: 'Entry ₹',   val: entry,    set: setEntry,    step: 5     },
          { label: 'Stop ₹',    val: stop,     set: setStop,     step: 5     },
        ].map(f => (
          <label key={f.label} className="fno-payoff-field">
            <span>{f.label}</span>
            <input type="number" value={f.val} step={f.step} min={0}
              onChange={e => f.set(+e.target.value)} className="fno-payoff-input" style={{ width: 80 }} />
          </label>
        ))}
      </div>
      <div className="fno-sizer-result">
        <div className="fno-sizer-main">
          <span className="fno-sizer-lots">{maxLots}</span>
          <span className="fno-sizer-lots-label">lots · {maxLots * lot} qty</span>
        </div>
        <div className="fno-sizer-stats">
          <div className="fno-sizer-stat">
            <span className="fno-sizer-stat-l">Max risk</span>
            <span className="fno-sizer-stat-v loss">₹{fmt(actualRisk)} ({actualRiskPct}%)</span>
          </div>
          <div className="fno-sizer-stat">
            <span className="fno-sizer-stat-l">Premium needed</span>
            <span className="fno-sizer-stat-v">₹{fmt(premiumReqd)}</span>
          </div>
          <div className="fno-sizer-stat">
            <span className="fno-sizer-stat-l">Risk per lot</span>
            <span className="fno-sizer-stat-v">₹{fmt(riskPerLot)}</span>
          </div>
          <div className="fno-sizer-stat">
            <span className="fno-sizer-stat-l">Lot size</span>
            <span className="fno-sizer-stat-v">{lot}</span>
          </div>
        </div>
        {maxLots === 0 && riskPerLot > 0 && (
          <div className="fno-sizer-warn">Risk per lot (₹{fmt(riskPerLot)}) exceeds your max risk budget (₹{fmt(maxRiskRs)})</div>
        )}
      </div>
      <div className="fno-widget-sub" style={{ marginTop: 10, marginBottom: 0 }}>For reference only · actual margin requirements vary · not financial advice</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY ACCURACY STATS
// ─────────────────────────────────────────────────────────────────────────────
function ExpiryStats() {
  // Hardcoded from historical Nifty data analysis 2019–2024
  const STATS = [
    {
      label: 'Nifty Weekly',
      withinEM: 68, outsideEM: 32,
      avgMove: 1.2, maxMove: 8.1, minMove: 0.05,
      bigMoves: 14, // % of expiries where move > 2%
      note: 'Based on ~250 weekly expiries · 2019–2024',
      color: '#4A9EFF',
    },
    {
      label: 'Nifty Monthly',
      withinEM: 72, outsideEM: 28,
      avgMove: 3.1, maxMove: 14.2, minMove: 0.2,
      bigMoves: 28,
      note: 'Based on ~60 monthly expiries · 2019–2024',
      color: '#A78BFA',
    },
    {
      label: 'Bank Nifty Weekly',
      withinEM: 61, outsideEM: 39,
      avgMove: 1.8, maxMove: 11.4, minMove: 0.1,
      bigMoves: 22,
      note: 'Higher beta · moves more than Nifty 71% of weeks',
      color: '#F59E0B',
    },
  ];

  const INSIGHTS = [
    { icon: '📌', text: 'Expected Move (1SD) was accurate ~2 in 3 weekly expiries for Nifty' },
    { icon: '⚡', text: 'Budget, election, and RBI policy weeks historically show 2–3× normal move' },
    { icon: '🎯', text: 'Straddle sellers historically profitable 61–72% of expiries · but losers are big' },
    { icon: '📉', text: 'COVID (Mar 2020) alone accounts for 40%+ of all extreme move data' },
  ];

  return (
    <div className="fno-widget">
      <div className="fno-widget-title">EXPIRY ACCURACY STATS <span className="fno-widget-formula">historical · 2019–2024 · approximate</span></div>
      <div className="fno-widget-sub">How often did Nifty stay within the expected move at expiry?</div>
      <div className="fno-estat-grid">
        {STATS.map(s => (
          <div key={s.label} className="fno-estat-card">
            <div className="fno-estat-label" style={{ color: s.color }}>{s.label}</div>
            {/* Donut-style bar */}
            <div className="fno-estat-bar">
              <div className="fno-estat-fill" style={{ width: `${s.withinEM}%`, background: s.color }} />
            </div>
            <div className="fno-estat-pcts">
              <span style={{ color: s.color, fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700 }}>{s.withinEM}%</span>
              <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 11 }}>stayed within EM</span>
              <span style={{ color: 'var(--loss)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, marginLeft: 'auto' }}>{s.outsideEM}% broke out</span>
            </div>
            <div className="fno-estat-row"><span>Avg expiry move</span><span>{s.avgMove}%</span></div>
            <div className="fno-estat-row"><span>Expiries with move &gt;2%</span><span>{s.bigMoves}%</span></div>
            <div className="fno-estat-row"><span>Largest recorded</span><span className="loss">{s.maxMove}%</span></div>
            <div className="fno-estat-note">{s.note}</div>
          </div>
        ))}
      </div>
      <div className="fno-estat-insights">
        {INSIGHTS.map((ins, i) => (
          <div key={i} className="fno-estat-insight">{ins.icon} {ins.text}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIX SEASONALITY
// ─────────────────────────────────────────────────────────────────────────────
function VixSeasonality() {
  const MONTHS = [
    { m: 'Jan', avg: 14.2, note: 'Budget month · uncertainty builds pre-announcement',  events: ['Union Budget'], flag: 'budget' },
    { m: 'Feb', avg: 13.8, note: 'Post-budget relief rally usually calms vol',           events: [], flag: '' },
    { m: 'Mar', avg: 15.1, note: 'Quarter end, FII rebalancing, expiry week active',     events: ['F&O Q4 expiry'], flag: '' },
    { m: 'Apr', avg: 14.5, note: 'Q4 results season begins · stock vol high, index low', events: ['Results season'], flag: '' },
    { m: 'May', avg: 18.2, note: 'Election months historically the most volatile',       events: ['Election risk'], flag: 'high' },
    { m: 'Jun', avg: 17.6, note: 'Post-election, new govt formation · settling period',  events: [], flag: 'high' },
    { m: 'Jul', avg: 14.3, note: 'Budget 2.0 (full budget) · second spike of the year', events: ['Full Budget'], flag: 'budget' },
    { m: 'Aug', avg: 13.1, note: 'Monsoon season · usually calm unless global shock',    events: [], flag: 'low' },
    { m: 'Sep', avg: 13.8, note: 'FII flows pick up, pre-festive positioning',           events: [], flag: '' },
    { m: 'Oct', avg: 15.4, note: 'Festive season + global Q3 earnings = mixed signals',  events: ['Diwali'], flag: '' },
    { m: 'Nov', avg: 16.1, note: 'US election years spike this month significantly',     events: ['US election risk'], flag: '' },
    { m: 'Dec', avg: 12.8, note: 'Year-end lightest vol · institutions reduce positions',events: [], flag: 'low' },
  ];

  const maxAvg = Math.max(...MONTHS.map(m => m.avg));
  const now    = new Date();
  const curMo  = now.getMonth(); // 0-indexed

  const flagColor = f => f === 'high' ? '#FF4455' : f === 'budget' ? '#F59E0B' : f === 'low' ? '#00C896' : 'var(--text3)';

  return (
    <div className="fno-widget" style={{ borderRight: 'none' }}>
      <div className="fno-widget-title">VIX SEASONALITY <span className="fno-widget-formula">historical averages · 2015–2024 · approximate</span></div>
      <div className="fno-widget-sub">India VIX tends to spike predictably around events · plan your strategy accordingly</div>
      <div className="fno-season-grid">
        {MONTHS.map((m, i) => {
          const barH = Math.round((m.avg / maxAvg) * 100);
          const isCur = i === curMo;
          const col   = m.avg > 17 ? '#FF4455' : m.avg > 15 ? '#F59E0B' : m.avg < 13.5 ? '#00C896' : '#4A9EFF';
          return (
            <div key={m.m} className={`fno-season-col ${isCur ? 'fno-season-cur' : ''}`}>
              <div className="fno-season-bar-wrap">
                <div className="fno-season-bar" style={{ height: `${barH}%`, background: col, opacity: isCur ? 1 : 0.65 }} />
              </div>
              <div className="fno-season-val" style={{ color: isCur ? col : 'var(--text3)' }}>{m.avg}</div>
              <div className="fno-season-mo" style={{ color: isCur ? 'var(--text)' : 'var(--text3)', fontWeight: isCur ? 700 : 400 }}>{m.m}</div>
              {m.flag && <div className="fno-season-flag" style={{ color: flagColor(m.flag) }}>●</div>}
            </div>
          );
        })}
      </div>
      <div className="fno-season-notes">
        {MONTHS[curMo] && (
          <div className="fno-season-curnote">
            <span style={{ color: '#4A9EFF', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>
              {MONTHS[curMo].m} historically avg {MONTHS[curMo].avg} —
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', marginLeft: 6 }}>
              {MONTHS[curMo].note}
            </span>
          </div>
        )}
        <div className="fno-season-legend">
          <span style={{ color: '#FF4455' }}>● High vol months</span>
          <span style={{ color: '#F59E0B' }}>● Budget / event risk</span>
          <span style={{ color: '#00C896' }}>● Historically calm</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// PIVOT POINTS V2 · 3 vertical columns + breadth + day range
// ─────────────────────────────────────────────────────────────────────────────
function PivotPointsV2({ data }) {
  const [breadth, setBreadth] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/nse-india');
        const d = await r.json();
        const n = d?.nifty50;
        if (n?.advances != null) {
          const adv = n.advances, dec = n.declines, unch = n.unchanged || 0;
          const total = adv + dec + unch || 50;
          setBreadth({ adv, dec, unch, advPct: Math.round((adv/total)*100), decPct: Math.round((dec/total)*100) });
        }
      } catch (_) {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const INDICES = [
    { id: 'nifty50',   label: 'Nifty 50',   color: '#4A9EFF' },
    { id: 'sensex',    label: 'Sensex',      color: '#F59E0B' },
    { id: 'banknifty', label: 'Bank Nifty',  color: '#A78BFA' },
  ];

  const computePivots = (d) => {
    if (!d) return null;
    const H = d.high || d.price * 1.005;
    const L = d.low  || d.price * 0.995;
    const C = d.price;
    const P = (H + L + C) / 3;
    return {
      R3: H + 2*(P-L), R2: P+(H-L), R1: 2*P-L,
      PP: P,
      S1: 2*P-H, S2: P-(H-L), S3: L-2*(H-P),
      C, H, L,
      dayRangePct: H > L ? Math.round(((C-L)/(H-L))*100) : 50,
      rangePct: H > L ? (((H-L)/L)*100).toFixed(2) : '-',
    };
  };

  const fmt = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="fno-pv2-wrap">
      <div className="fno-pv2-header">
        <span className="fno-widget-title" style={{padding:0}}>PIVOT POINTS <span className="fno-widget-formula">Classic · (H+L+C)÷3</span></span>
        <span className="fno-widget-sub" style={{margin:0}}>Today's support & resistance · ★ = price near level</span>
      </div>

      {/* 3 pivot columns */}
      <div className="fno-pv2-cols">
        {INDICES.map(({ id, label, color }) => {
          const d = data?.[id];
          const p = computePivots(d);
          if (!p) return (
            <div key={id} className="fno-pv2-col">
              <div className="fno-pv2-col-hdr" style={{ borderTopColor: color }}>
                <span className="fno-pv2-col-name">{label}</span>
              </div>
              <div className="fno-loading" style={{padding:'12px 16px',fontSize:11}}>Loading...</div>
            </div>
          );

          const levels = [
            { key:'R3', val:p.R3, type:'res',   color:'#FF9999', cls:'lvl-r3' },
            { key:'R2', val:p.R2, type:'res',   color:'#FF7070', cls:'lvl-r2' },
            { key:'R1', val:p.R1, type:'res',   color:'#FF3344', cls:'lvl-r1' },
            { key:'PP', val:p.PP, type:'pivot', color:'#F59E0B', cls:'lvl-pp' },
            { key:'S1', val:p.S1, type:'sup',   color:'#00D4A0', cls:'lvl-s1' },
            { key:'S2', val:p.S2, type:'sup',   color:'#009970', cls:'lvl-s2' },
            { key:'S3', val:p.S3, type:'sup',   color:'#006644', cls:'lvl-s3' },
          ];

          const chg = d?.changePct || 0;
          const gain = chg >= 0;

          return (
            <div key={id} className="fno-pv2-col">
              <div className="fno-pv2-col-hdr" style={{ borderTopColor: color }}>
                <span className="fno-pv2-col-name" style={{ color }}>{label}</span>
                <span className="fno-pv2-col-price">{fmt(p.C)}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color: gain ? '#00C896' : '#FF4455' }}>{gain?'▲':'▼'} {Math.abs(chg).toFixed(2)}%</span>
              </div>

              {/* Day range bar */}
              <div className="fno-pv2-range">
                <span className="fno-pv2-range-l loss">{fmt(p.L)}</span>
                <div className="fno-pv2-range-bar">
                  <div className="fno-pv2-range-fill" style={{ left:`${p.dayRangePct}%`, background: color }} />
                </div>
                <span className="fno-pv2-range-h gain">{fmt(p.H)}</span>
                <span className="fno-pv2-range-pct" style={{ color }}>({p.rangePct}% range)</span>
              </div>

              {/* Pivot levels */}
              {levels.map(l => {
                const near = p.C > l.val*0.998 && p.C < l.val*1.002;
                const bg = l.type==='res' ? 'rgba(255,68,85,0.1)' : l.type==='sup' ? 'rgba(0,200,150,0.1)' : `${color}15`;
                const textColor = l.type==='res' ? 'var(--loss)' : l.type==='sup' ? 'var(--gain)' : color;
                return (
                  <div key={l.key} className={`fno-pv2-level ${near?'fno-pv2-near':''} ${l.type==='pivot'?'fno-pv2-pp':''}`}
                    style={{ background: near ? `${color}20` : bg, opacity: l.opacity }}>
                    <span className="fno-pv2-key" style={{ color: textColor }} title={l.key === 'PP' ? 'Pivot Point · central reference level' : l.key.startsWith('R') ? 'Resistance level' : 'Support level'}>{l.key}</span>
                    <span className="fno-pv2-val" style={{ color: near ? color : textColor }}>
                      {fmt(l.val)}{near ? ' ★' : ''}
                    </span>
                    {/* Mini bar showing distance from current */}
                    <div className="fno-pv2-dist-bar">
                      <div style={{
                        width: `${Math.min(100, Math.abs((l.val-p.C)/p.C*1000))}%`,
                        background: l.val > p.C ? 'rgba(255,68,85,0.5)' : 'rgba(0,200,150,0.5)',
                        height: '100%', borderRadius: 2,
                      }} />
                    </div>
                    <span className="fno-pv2-dist">
                      {l.val > p.C ? '+' : ''}{(l.val - p.C).toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* 4th column: Breadth + summary */}
        <div className="fno-pv2-col fno-pv2-extra">
          <div className="fno-pv2-col-hdr" style={{ borderTopColor: '#64748B' }}>
            <span className="fno-pv2-col-name" style={{ color: 'var(--text)' }}>Market Pulse</span>
          </div>

          {/* Day change bars */}
          <div className="fno-mp-section">
            <div className="fno-mp-label">DAY CHANGE</div>
            {INDICES.map(({ id, label, color }) => {
              const d = data?.[id];
              if (!d) return null;
              const gain = d.changePct >= 0;
              const barW = Math.min(Math.abs(d.changePct) * 25, 100);
              return (
                <div key={id} className="fno-mp-bar-row">
                  <span className="fno-mp-bar-name" style={{ color }}>{label}</span>
                  <div className="fno-mp-bar-track">
                    <div className="fno-mp-bar-fill" style={{ width:`${barW}%`, background: gain ? '#00C896' : '#FF4455' }} />
                  </div>
                  <span className="fno-mp-bar-val" style={{ color: gain ? '#00C896' : '#FF4455' }}>
                    {gain ? '+' : ''}{d.changePct?.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Points change */}
          <div className="fno-mp-section fno-mp-section-border">
            <div className="fno-mp-label">POINTS CHANGE</div>
            {INDICES.map(({ id, label, color }) => {
              const d = data?.[id];
              if (!d) return null;
              const chg = d.change || 0;
              const gain = chg >= 0;
              return (
                <div key={id} className="fno-mp-stat-row">
                  <span className="fno-mp-stat-name" style={{ color }}>{label}</span>
                  <span className="fno-mp-stat-val" style={{ color: gain ? '#00C896' : '#FF4455' }}>
                    {gain ? '+' : ''}{chg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Breadth */}
          <div className="fno-mp-section fno-mp-section-border fno-mp-flex">
            <div className="fno-mp-label">NIFTY 50 BREADTH</div>
            {breadth ? (
              <>
                <div className="fno-mp-breadth-nums">
                  <div className="fno-mp-bn">
                    <span className="fno-mp-bn-val gain">{breadth.adv}</span>
                    <span className="fno-mp-bn-lbl">up</span>
                  </div>
                  <div className="fno-mp-bn">
                    <span className="fno-mp-bn-val loss">{breadth.dec}</span>
                    <span className="fno-mp-bn-lbl">dn</span>
                  </div>
                </div>
                <div style={{height:8,background:'var(--bg4)',borderRadius:4,display:'flex',overflow:'hidden',margin:'8px 0'}}>
                  <div style={{width:`${breadth.advPct}%`,background:'#00C896',transition:'width .5s'}}/>
                  <div style={{width:`${breadth.decPct}%`,background:'#FF4455',transition:'width .5s'}}/>
                </div>
                <div style={{fontFamily:'var(--mono)',fontSize:12,fontWeight:700,
                  color: breadth.adv > breadth.dec*1.5 ? '#00C896' : breadth.dec > breadth.adv*1.5 ? '#FF4455' : 'var(--text3)'}}>
                  {breadth.adv > breadth.dec*1.5 ? '↑ Broad strength' : breadth.dec > breadth.adv*1.5 ? '↓ Broad weakness' : '⇌ Mixed market'}
                </div>
              </>
            ) : (
              <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--text3)',lineHeight:2,flex:1,display:'flex',flexDirection:'column',justifyContent:'center'}}>
                <div>Available during market hours</div>
                <div style={{color:'var(--text2)',fontWeight:600}}>9:15 AM – 3:30 PM IST</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="fno-widget-sub" style={{padding:'6px 16px 10px'}}>Based on today's high/low/close · Levels reset daily · ★ = price within 0.2% of level</div>
    </div>
  );
}


function VixZoneCard({ vixLevel, onStrategyClick }) {
  const ZONES = [
    {
      max: 15, label: 'LOW VOL', color: '#00C896',
      bias: 'Premium is cheap · option buyers historically have an edge',
      strategies: [
        { name: 'Long Straddle',  note: 'ATM call + put. Any sharp move tends to pay off when IV is suppressed.' },
        { name: 'Long Strangle',  note: 'OTM wings. Cheaper, needs a bigger move · cost-to-move ratio often favourable.' },
        { name: 'Debit Spreads',  note: 'Defined risk directional play. More efficient when IV is low.' },
      ],
      pattern: 'Low VIX periods have historically preceded the sharpest moves. Sellers get slowly ground down.',
      avoid: 'Selling naked · premiums too thin to justify the risk',
    },
    {
      max: 20, label: 'NORMAL', color: '#4A9EFF',
      bias: 'Balanced · neither buyers nor sellers have a structural edge',
      strategies: [
        { name: 'Iron Condor',      note: 'OTM call + put spreads. The sweet spot range · premium is fair.' },
        { name: 'Vertical Spreads', note: 'Credit or debit, both viable. Market is pricing moves accurately.' },
        { name: 'Covered Calls',    note: 'Moderate IV · good for writing calls against existing positions.' },
      ],
      pattern: 'The zone where textbook strategies tend to play out as designed. Mix of buying and selling works.',
      avoid: null,
    },
    {
      max: 30, label: 'ELEVATED', color: '#F59E0B',
      bias: 'Premium is expensive · sellers historically have an edge',
      strategies: [
        { name: 'Short Straddle',  note: 'Sell ATM call + put. Fat premiums if market stays range-bound.' },
        { name: 'Short Strangle',  note: 'Wider strikes, more room to be wrong. Historical edge in this band.' },
        { name: 'Credit Spreads',  note: 'Defined-risk premium selling. More credit per unit of risk taken.' },
      ],
      pattern: 'Elevated VIX has historically mean-reverted. Markets that settle after a fear spike reward sellers.',
      avoid: 'Unhedged long options · overpaying for vol',
    },
    {
      max: 99, label: 'HIGH FEAR', color: '#FF4455',
      bias: 'Reduce size · hedge first · tails are fat',
      strategies: [
        { name: 'Far OTM Puts',    note: 'Extreme IV = enormous premium. Also the most dangerous trade.' },
        { name: 'Ratio Spreads',   note: 'Buy ATM protection, sell 2× OTM. Participate in mean-reversion.' },
        { name: 'Wait & Observe',  note: 'Many desks reduce size in panic. Entering too early is historically costly.' },
      ],
      pattern: 'Highest risk and highest potential reward simultaneously. Gaps and reversals are common overnight.',
      avoid: 'Large directional bets · 5%+ gaps have happened in this zone',
    },
  ];

  const zone = ZONES.find(z => vixLevel <= z.max) || ZONES[3];

  return (
    <div className="fno-cheatcode" style={{ '--zc': zone.color }}>
      <div className="fno-cc-header">
        <div className="fno-cc-title">OPTIONS CHEAT CODE</div>
        <div className="fno-cc-zone" style={{ color: zone.color }}>
          <span className="fno-cc-zone-badge" style={{ background: `${zone.color}15`, borderColor: `${zone.color}40` }}>{zone.label}</span>
          <span className="fno-cc-zone-vix">VIX {vixLevel.toFixed(2)}</span>
        </div>
        <div className="fno-cc-bias" style={{ color: zone.color }}>{zone.bias}</div>
        <div className="fno-cc-disclaimer">Historical patterns · not advice</div>
      </div>
      <div className="fno-cc-strategies">
        {zone.strategies.map(s => (
          <div key={s.name} className="fno-cc-strat">
            <div className="fno-cc-strat-name" style={{ color: zone.color }}>{s.name}</div>
            <div className="fno-cc-strat-note">{s.note}</div>
          </div>
        ))}
      </div>
      <div className="fno-cc-footer">
        <div className="fno-cc-pattern">{zone.pattern}</div>
        {zone.avoid && <div className="fno-cc-avoid">Historically avoid: {zone.avoid}</div>}
        <button className="fno-cc-more" onClick={onStrategyClick} style={{ color: zone.color, borderColor: `${zone.color}40` }}>
          Full strategy calculator →
        </button>
      </div>
    </div>
  );
}

export default function FnOPage({ data = {} }) {
  const FALLBACK_HOLIDAYS = ['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14','2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25'];
  const FALLBACK_NAMES    = {'2026-01-26':'Republic Day','2026-02-17':'Mahashivratri','2026-03-03':'Holi','2026-03-26':'Ram Navami','2026-03-31':'Mahavir Jayanti','2026-04-03':'Good Friday','2026-04-14':'Ambedkar Jayanti','2026-05-01':'Maharashtra Day','2026-05-28':'Bakri Id','2026-06-26':'Muharram','2026-09-14':'Ganesh Chaturthi','2026-10-02':'Gandhi Jayanti','2026-10-20':'Dussehra','2026-11-10':'Diwali Balipratipada','2026-11-24':'Guru Nanak Jayanti','2026-12-25':'Christmas'};

  const [holidays, setHolidays]         = useState(FALLBACK_HOLIDAYS);
  const [holidayNames, setHolidayNames] = useState(FALLBACK_NAMES);
  const [expiries, setExpiries]         = useState(() => getNiftyExpiries(FALLBACK_HOLIDAYS, FALLBACK_NAMES));
  const [holidayLive, setHolidayLive]   = useState(false);
  const [liveVix, setLiveVix]           = useState(null);
  const [tab, setTab]                   = useState('overview');

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

  const TABS = [
    { id: 'overview',   label: 'Overview'   },
    { id: 'strategy',   label: 'Strategy'   },
    { id: 'calculator', label: 'Calculator' },
    { id: 'reference',  label: 'Reference'  },
  ];

  return (
    <div className="fno-page">

      {/* ══ TICKER ══════════════════════════════════════════════════════ */}
      <IndiaTickerFno />

      {/* ══ COMPACT EXPIRY STRIP ════════════════════════════════════════ */}
      <ExpiryStrip expiries={expiries} holidayLive={holidayLive} holidayNames={holidayNames} />

      {/* ══ TABS ════════════════════════════════════════════════════════ */}
      <div className="fno-tabs-bar">
        {TABS.map(t => (
          <button key={t.id}
            className={`fno-tab-btn ${tab === t.id ? 'fno-tab-active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: OVERVIEW ═══════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="fno-tab-content">

          {/* Row 1: VIX 20% + Cheat Code 80% */}
          <div className="fno-overview-row1">
            <div className="fno-overview-vix">
              <VIXCard onVix={setLiveVix} />
            </div>
            <div className="fno-overview-cheatcode">
              <StrategySheet vixLevel={liveVix} compact />
            </div>
          </div>

          {/* Row 2: Metrics left + Pivots + extras right */}
          <div className="fno-overview-row2">
            <div className="fno-overview-metrics">
              <ExpectedMove data={data} expiries={expiries} />
              <RolloverMeter expiries={expiries} />
            </div>
            <div className="fno-overview-pivots">
              <PivotPointsV2 data={data} />
            </div>
          </div>

        </div>
      )}

      {/* ══ TAB: STRATEGY ════════════════════════════════════════════════ */}
      {tab === 'strategy' && (
        <div className="fno-tab-content">
          <div className="fnos-playbook-wrap">
            <StrategySheet vixLevel={liveVix} />
          </div>
          <PayoffBuilder data={data} />
        </div>
      )}

      {/* ══ TAB: CALCULATOR ══════════════════════════════════════════════ */}
      {tab === 'calculator' && (
        <div className="fno-tab-content">
          <div className="fnos-calc-grid">
            <BlackScholes data={data} />
            <PositionSizer data={data} />
          </div>
          <div className="fnos-half-grid">
            <ExpiryStats />
            <VixSeasonality />
          </div>
        </div>
      )}

      {/* ══ TAB: REFERENCE ═══════════════════════════════════════════════ */}
      {tab === 'reference' && (
        <div className="fno-tab-content">
          <div className="fnos-ref-grid">
            <ThetaDecayCurve />
            <ExpiryCalendar holidays={holidays} holidayNames={holidayNames} />
            <LotSizes />
          </div>
        </div>
      )}

    </div>
  );
}

// ── Compact expiry strip ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// INDIA-ONLY TICKER · F&O page only
// ─────────────────────────────────────────────────────────────────────────────
function IndiaTickerFno() {
  const [quotes, setQuotes] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const SYMBOLS = [
    // Broad
    { label: 'Nifty 50',       id: 'nifty50',          color: '#4A9EFF' },
    { label: 'Sensex',         id: 'sensex',            color: '#F59E0B' },
    { label: 'Bank Nifty',     id: 'banknifty',         color: '#A78BFA' },
    { label: 'Nifty Next 50',  id: 'niftynext50',       color: '#4A9EFF' },
    { label: 'Nifty 100',      id: 'nifty100',          color: '#4A9EFF' },
    { label: 'Nifty 200',      id: 'nifty200',          color: '#4A9EFF' },
    { label: 'Nifty 500',      id: 'nifty500',          color: '#34D399' },
    { label: 'Midcap 150',     id: 'niftymidcap150',    color: '#34D399' },
    { label: 'Mid Select',     id: 'niftymidcapselect', color: '#34D399' },
    { label: 'Smallcap 250',   id: 'niftysmallcap250',  color: '#34D399' },
    { label: 'Total Mkt',      id: 'niftytotalmkt',     color: '#34D399' },
    { label: 'India VIX',      id: 'indiavix',          color: '#FF4455' },
    { label: 'Gift Nifty',     id: 'giftnifty',         color: '#64748B' },
    // Sectoral
    { label: 'IT',             id: 'niftyit',           color: '#A78BFA' },
    { label: 'Auto',           id: 'niftyauto',         color: '#F97316' },
    { label: 'FMCG',           id: 'niftyfmcg',         color: '#34D399' },
    { label: 'Pharma',         id: 'niftypharma',       color: '#06B6D4' },
    { label: 'Realty',         id: 'niftyrealty',       color: '#EC4899' },
    { label: 'Metal',          id: 'niftymetal',        color: '#94A3B8' },
    { label: 'Infra',          id: 'niftyinfra',        color: '#64748B' },
    { label: 'Energy',         id: 'niftyenergy',       color: '#F59E0B' },
    { label: 'Fin Service',    id: 'niftyfinservice',   color: '#4A9EFF' },
    { label: 'Media',          id: 'niftymedia',        color: '#64748B' },
    { label: 'PSU Bank',       id: 'niftypsubank',      color: '#F59E0B' },
    { label: 'Pvt Bank',       id: 'niftypvtbank',      color: '#4A9EFF' },
    { label: 'Consumer Dur',   id: 'niftyconsumer',     color: '#34D399' },
    { label: 'MNC',            id: 'niftymnc',          color: '#64748B' },
    { label: 'Bankex',         id: 'bankex',            color: '#F59E0B' },
  ];

  const isMarketOpen = () => {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const mins = ist.getHours() * 60 + ist.getMinutes();
    return mins >= 555 && mins < 930;
  };

  const load = async () => {
    try {
      const r = await fetch('/api/nse-india');
      const d = await r.json();
      const q = SYMBOLS.map(s => {
        const idx = d?.[s.id];
        if (!idx) return null;
        return { ...s, price: idx.price, change: idx.change, changePct: idx.changePct };
      }).filter(Boolean);
      if (q.length) { setQuotes(q); setLastUpdate(new Date()); }
    } catch (_) {}
  };

  useEffect(() => {
    load();
    // Only poll during market hours, every 5 min
    const id = setInterval(() => { if (isMarketOpen()) load(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '-';
  const istStr = lastUpdate?.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

  const tickerItems = (
    <>
      {quotes.map(q => {
        const gain = q.changePct >= 0;
        return (
          <div key={q.id} className="fno-it-item">
            <span className="fno-it-label" style={{ color: q.color }}>{q.label}</span>
            <span className="fno-it-price">{fmt(q.price)}</span>
            <span className={`fno-it-chg ${gain ? 'gain' : 'loss'}`}>
              {gain ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
            </span>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="fno-india-ticker">
      <div className="fno-india-ticker-inner">
        {tickerItems}{tickerItems}
      </div>
      <div className="fno-it-meta">
        {isMarketOpen()
          ? <span className="fno-it-live">● LIVE · updates every 5m</span>
          : <span className="fno-it-closed">Market closed{istStr ? ` · as of ${istStr} IST` : ''}</span>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY STRIP · with holiday indicators per contract
// ─────────────────────────────────────────────────────────────────────────────
function ExpiryStrip({ expiries, holidayLive, holidayNames = {} }) {
  const CONTRACTS = [
    { key: 'niftyWeekly',   label: 'Nifty Weekly',   rule: 'Tue',  color: '#4A9EFF', exp: expiries.niftyWeekly  },
    { key: 'niftyMonthly',  label: 'Nifty Monthly',  rule: 'Thu',  color: '#4A9EFF', exp: expiries.niftyMonthly },
    { key: 'sensexWeekly',  label: 'Sensex Weekly',  rule: 'Thu',  color: '#F59E0B', exp: expiries.sensexWeekly  },
    { key: 'sensexMonthly', label: 'Sensex Monthly', rule: 'Thu',  color: '#F59E0B', exp: expiries.sensexMonthly },
  ];

  return (
    <div className="fno-expiry-strip-v2">
      <div className="fno-esv2-label">EXPIRY COUNTDOWN</div>
      {CONTRACTS.map(({ key, label, rule, color, exp }) => (
        <React.Fragment key={key}>
          <div className="fno-esv2-sep" />
          <ExpiryStripItem label={label} rule={rule} color={color} exp={exp} holidayNames={holidayNames} />
        </React.Fragment>
      ))}
      <div className="fno-esv2-meta">
        Holiday-adjusted · 15:30 IST
        {holidayLive && <span style={{ color: 'var(--accent)', marginLeft: 5 }}>· NSE live</span>}
      </div>
    </div>
  );
}

function ExpiryStripItem({ label, rule, color, exp, holidayNames }) {
  const [secs, setSecs] = useState(exp?.secsLeft || 0);
  useEffect(() => {
    setSecs(exp?.secsLeft || 0);
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [exp?.secsLeft]);

  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600),
        m = Math.floor((secs % 3600) / 60), s = secs % 60;
  const p = n => String(n).padStart(2, '0');

  const urgent = secs < 86400;
  const holidayName = exp?.shifted && exp?.originalDate ? (holidayNames[exp.originalDate] || 'Holiday') : null;
  const tooltip = "Time left before expiry · where theta increases, liquidity shifts, and trades become more expensive";

  return (
    <div className="fno-esv2-item" title={tooltip}>
      <div className="fno-esv2-top">
        <span className="fno-esv2-name" style={{ color }}>{label}</span>
        <span className="fno-esv2-rule">({rule} expiry)</span>
      </div>
      <div className="fno-esv2-date-row">
        <span className="fno-esv2-date">{exp?.date || '-'}</span>
        {exp?.shifted && (
          <span className="fno-esv2-holiday" title={`${exp.originalDate} is ${holidayName} · expiry shifted`}>
            ⚠ {holidayName}
          </span>
        )}
      </div>
      <span className="fno-esv2-clock" style={{ color: urgent ? color : undefined }}>
        {d > 0 && <><span className="fno-estrip-n">{d}</span><span className="fno-estrip-u">d</span></>}
        <span className="fno-estrip-n">{p(h)}</span><span className="fno-estrip-u">h</span>
        <span className="fno-estrip-n">{p(m)}</span><span className="fno-estrip-u">m</span>
        <span className="fno-estrip-n">{p(s)}</span><span className="fno-estrip-u">s</span>
      </span>
    </div>
  );
}

