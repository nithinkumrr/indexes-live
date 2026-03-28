import { useState, useEffect, useCallback } from 'react';

// ─── Economic calendar — sourced from Zerodha Markets (update periodically) ──
// Dates: YYYY-MM-DD. High impact only shown prominently. Medium shown if near.
const ECON_EVENTS = [
  // Week of Mar 30
  { date: '2026-03-29', time: 'All day', event: 'BOJ Policy Rate (Japan)',            impact: 'high',   country: 'Global', note: 'Bank of Japan rate decision. Yen volatility can spill into Asian markets including India.' },
  { date: '2026-03-30', time: 'All day', event: 'Germany Inflation (Preliminary)',    impact: 'high',   country: 'Global', note: 'Early read on Eurozone inflation. Affects ECB rate expectations and global bond markets.' },
  { date: '2026-03-31', time: 'All day', event: 'France & Italy Inflation',           impact: 'high',   country: 'Global', note: 'Eurozone inflation data. Combined with Germany read, shapes ECB policy direction.' },
  { date: '2026-03-31', time: 'All day', event: 'China Manufacturing PMI',            impact: 'medium', country: 'Global', note: 'Below 50 signals contraction in Chinese factory activity. Affects metals and commodity prices.' },
  { date: '2026-03-31', time: 'All day', event: 'Japan Unemployment Rate',            impact: 'medium', country: 'Global', note: 'Labour market health in Japan. Context for BOJ policy trajectory.' },
  { date: '2026-04-01', time: 'All day', event: 'India GST Collections',              impact: 'medium', country: 'India',  note: 'Monthly GST data reflects consumption and economic activity. Strong collections = positive for India growth narrative.' },
  // Week of Apr 3
  { date: '2026-04-03', time: '06:00 PM', event: 'US Non-Farm Payrolls (NFP)',        impact: 'high',   country: 'Global', note: 'Biggest monthly market mover globally. Strong NFP delays Fed rate cuts, weak NFP accelerates them. Direct impact on FII flows into India.' },
  { date: '2026-04-03', time: '06:00 PM', event: 'US Unemployment Rate',              impact: 'high',   country: 'Global', note: 'Released alongside NFP. Headline unemployment level watched by the Fed.' },
  // Week of Apr 7
  { date: '2026-04-08', time: 'All day', event: 'RBI Monetary Policy Rate Decision',  impact: 'high',   country: 'India',  note: 'Most important domestic event. Rate cut, hold, or hike directly impacts equities, bonds, and banking stocks. Previous: 5.25%.' },
  { date: '2026-04-08', time: 'All day', event: 'India Cash Reserve Ratio (CRR)',     impact: 'medium', country: 'India',  note: 'RBI liquidity tool. CRR cut injects liquidity into the banking system, bullish for banks and NBFCs.' },
  // Week of Apr 10
  { date: '2026-04-09', time: 'All day', event: 'US PCE Price Index',                 impact: 'medium', country: 'Global', note: "Fed's preferred inflation gauge. Higher than expected PCE pushes rate cut expectations further out." },
  { date: '2026-04-10', time: 'All day', event: 'US CPI Inflation',                   impact: 'high',   country: 'Global', note: 'Key US inflation reading. Above forecast = dollar strengthens, FIIs reduce EM exposure including India.' },
  { date: '2026-04-10', time: 'All day', event: 'China CPI Inflation',                impact: 'high',   country: 'Global', note: 'Deflation risk in China affects commodity demand. Weak China CPI is bearish for metals.' },
  { date: '2026-04-10', time: 'All day', event: 'Korea Central Bank Rate Decision',   impact: 'high',   country: 'Global', note: 'Regional central bank signal. Korea often leads Asian rate cycles.' },
  // Week of Apr 14
  { date: '2026-04-14', time: 'All day', event: 'China Trade Balance & Exports',      impact: 'medium', country: 'Global', note: 'Chinese export strength reflects global demand. Surplus data affects Yuan and commodity currencies.' },
  { date: '2026-04-15', time: 'All day', event: 'India Merchandise Trade Balance',    impact: 'medium', country: 'India',  note: 'Monthly trade deficit data. Large deficit puts pressure on Rupee and current account.' },
  // Week of Apr 17
  { date: '2026-04-17', time: 'All day', event: 'China GDP (Q1 2026)',                impact: 'high',   country: 'Global', note: 'Quarterly Chinese GDP. Directly impacts commodity prices, global risk appetite and FII allocation to EMs including India.' },
  // Week of Apr 20
  { date: '2026-04-20', time: 'All day', event: 'China Central Bank Rate Decision',   impact: 'high',   country: 'Global', note: 'PBOC rate. China easing is positive for risk assets and commodity-linked Indian stocks.' },
  // Week of Apr 29
  { date: '2026-04-29', time: 'All day', event: 'US Fed Rate Decision (FOMC)',        impact: 'high',   country: 'Global', note: 'Federal Reserve policy. Most impactful global event for FII flows. Rate cuts positive for Indian equities. Previous rate: 3.50-3.75%.' },
  { date: '2026-04-30', time: 'All day', event: 'US GDP Advance Estimate (Q1 2026)', impact: 'high',   country: 'Global', note: 'First read on US Q1 growth. Weak GDP accelerates Fed cut expectations.' },
  { date: '2026-04-30', time: 'All day', event: 'ECB Rate Decision (Euro area)',      impact: 'high',   country: 'Global', note: 'European Central Bank policy. ECB easing is generally positive for global risk appetite.' },
  { date: '2026-04-30', time: 'All day', event: 'Bank of England Rate Decision',      impact: 'high',   country: 'Global', note: 'BOE policy rate. Affects GBP and UK-linked capital flows.' },
];

// ─── Rule engine ─────────────────────────────────────────────────────────────
function getStance(np, bp) {
  if (np === null) return null;
  if (np < -1.5 && bp !== null && bp < -1.5) return { label: 'Strong Bear', color: '#FF4455', bg: 'rgba(255,68,85,.08)', icon: '↓↓', confidence: 'High', reasons: ['Broad index decline across Nifty and BankNifty', 'Sustained selling pressure in large caps'] };
  if (np < -0.7) return { label: 'Bearish', color: '#F59E0B', bg: 'rgba(245,158,11,.06)', icon: '↓', confidence: 'Medium', reasons: ['Nifty declining more than 0.7%', 'Price momentum is negative'] };
  if (np > 1.5 && bp !== null && bp > 1.5) return { label: 'Strong Bull', color: '#00C896', bg: 'rgba(0,200,150,.08)', icon: '↑↑', confidence: 'High', reasons: ['Broad index advance across Nifty and BankNifty', 'Sustained buying across large caps'] };
  if (np > 0.7) return { label: 'Bullish', color: '#00C896', bg: 'rgba(0,200,150,.06)', icon: '↑', confidence: 'Medium', reasons: ['Nifty advancing more than 0.7%', 'Price momentum is positive'] };
  return { label: 'Neutral', color: 'var(--text2)', bg: 'var(--bg3)', icon: '→', confidence: 'Low', reasons: ['Nifty move within 0.7% on either side', 'No dominant directional bias'] };
}

function getVolatility(np) {
  if (np === null) return null;
  const a = Math.abs(np);
  if (a > 1.5) return { label: 'High', color: '#FF4455', note: 'Large moves. Reduce position size.' };
  if (a > 0.7) return { label: 'Moderate', color: '#F59E0B', note: 'Normal range. Standard sizing.' };
  return { label: 'Low', color: '#00C896', note: 'Tight range. Watch for breakout.' };
}

function getSessionChar(price, high, low) {
  if (!price || !high || !low || high === low) return null;
  const rel  = (price - low) / (high - low);
  const range = high - low;
  if (rel < 0.25) return { label: 'Closed Near Low', icon: '↘', color: '#FF4455', explanation: 'Price settled in the lower quarter of the day\'s range. Sustained selling pressure into close. Weak sentiment going into the next session.' };
  if (rel > 0.75) return { label: 'Closed Near High', icon: '↗', color: '#00C896', explanation: 'Price settled in the upper quarter of the day\'s range. Buying interest held through the session. Constructive close.' };
  return { label: 'Mid-Range Close', icon: '→', color: 'var(--text2)', explanation: 'Price settled near the middle of the day\'s range. Neither side had a decisive advantage by close.' };
}

function getStructureLabel(np) {
  if (np === null) return 'Unknown';
  if (np < -0.5) return 'Downtrend';
  if (np > 0.5) return 'Uptrend';
  return 'Range';
}

function getMarketType(np, vix) {
  const abs = Math.abs(np ?? 0);
  if (abs > 1.0) return { type: 'Trending', approach: 'Breakout continuation mindset. Trade with the direction, not against it.' };
  return { type: 'Range-Bound', approach: 'Mean reversion mindset. Fades at extremes tend to work better than breakouts.' };
}

function getScenarios(price, np) {
  if (!price || np === null) return null;
  const step = price < 10000 ? 100 : 50;
  const r = v => Math.round(v / step) * step;
  const sup1 = r(price * 0.990);
  const sup2 = r(price * 0.976);
  const res1 = r(price * 1.010);
  const res2 = r(price * 1.022);
  return [
    { condition: `If ${sup1.toLocaleString('en-IN')} breaks`, outcome: 'Downside continuation likely. Next support around ' + sup2.toLocaleString('en-IN'), type: 'bear' },
    { condition: `If ${res1.toLocaleString('en-IN')} reclaims`, outcome: 'Short covering possible. Watch for follow-through above ' + res1.toLocaleString('en-IN'), type: 'bull' },
    { condition: `If range between ${sup1.toLocaleString('en-IN')} and ${res1.toLocaleString('en-IN')} holds`, outcome: 'Consolidation continues. Directional move likely on breakout of range', type: 'neutral' },
  ];
}

function getPriceZones(price) {
  if (!price) return null;
  const step = price < 10000 ? 100 : 50;
  const r = v => Math.round(v / step) * step;
  const zones = [
    { level: r(price * 0.990), type: 'support',    label: 'Immediate Support' },
    { level: r(price * 0.976), type: 'support',    label: 'Deeper Support'    },
    { level: r(price * 1.010), type: 'resistance', label: 'Immediate Resistance' },
    { level: r(price * 1.022), type: 'resistance', label: 'Supply Zone'       },
  ];
  return zones.map(z => ({
    ...z,
    distance: Math.abs(((z.level - price) / price) * 100).toFixed(1),
    distSign: z.level > price ? '+' : '-',
    nearest: Math.abs(z.level - price) === Math.min(...zones.map(zz => Math.abs(zz.level - price))),
  }));
}

function getGlobalContext(data) {
  const indices = [
    { id: 'sp500', label: 'S&P 500', region: 'US' }, { id: 'nasdaq', label: 'Nasdaq', region: 'US' },
    { id: 'nikkei', label: 'Nikkei', region: 'Asia' }, { id: 'hangseng', label: 'Hang Seng', region: 'Asia' },
    { id: 'ftse', label: 'FTSE', region: 'EU' }, { id: 'dax', label: 'DAX', region: 'EU' },
    { id: 'shanghai', label: 'Shanghai', region: 'Asia' },
  ];
  const items = indices.map(i => {
    const d = data[i.id];
    if (!d?.price || d.changePct === null || d.changePct === undefined) return null;
    return { ...i, changePct: d.changePct };
  }).filter(Boolean);
  if (!items.length) return null;
  const avg = items.reduce((s, i) => s + i.changePct, 0) / items.length;
  const usAvg = items.filter(i => i.region === 'US').reduce((s, i) => s + i.changePct, 0) / (items.filter(i=>i.region==='US').length||1);
  const asiaAvg = items.filter(i => i.region === 'Asia').reduce((s, i) => s + i.changePct, 0) / (items.filter(i=>i.region==='Asia').length||1);
  const bias = avg > 0.4 ? 'Positive' : avg > 0.1 ? 'Mildly Positive' : avg > -0.1 ? 'Mixed' : avg > -0.4 ? 'Mildly Negative' : 'Negative';
  const biasColor = avg > 0.1 ? 'var(--gain)' : avg < -0.1 ? 'var(--loss)' : 'var(--text2)';
  const usStr   = usAvg > 0.2 ? 'US positive' : usAvg < -0.2 ? 'US weak' : 'US flat';
  const asiaStr = asiaAvg > 0.2 ? 'Asia positive' : asiaAvg < -0.2 ? 'Asia weak' : 'Asia mixed';
  const interp  = `${usStr}, ${asiaStr} — ${avg < -0.2 ? 'bearish undertone for domestic markets' : avg > 0.2 ? 'supportive backdrop for domestic markets' : 'no strong directional signal globally'}.`;
  return { items, bias, biasColor, interp };
}

function getIST() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); }
function getSlotLabel() {
  const ist = getIST(); const d = ist.getDay(); const m = ist.getHours() * 60 + ist.getMinutes();
  if (d === 0 || d === 6) return 'Weekend';
  if (m < 540) return 'Pre-Market'; if (m < 555) return 'Pre-Open';
  if (m < 750) return 'Opening Session'; if (m < 870) return 'Mid-Day';
  if (m < 930) return 'Afternoon'; if (m < 1020) return 'Market Close';
  return 'End of Day';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtP = v => v ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
const fmtPct = v => v !== null && v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
const pColor = v => (!v && v !== 0) ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';

// ─── Brief panel ─────────────────────────────────────────────────────────────
function BriefPanel({ title, accent, items, fallback }) {
  return (
    <div className="ins3-brief-panel" style={{ borderTopColor: accent }}>
      <div className="ins3-brief-panel-title" style={{ color: accent }}>{title}</div>
      {fallback && <div className="ins3-brief-fallback">Rule-based summary</div>}
      <ul className="ins3-brief-list">
        {Object.entries(items).map(([key, val]) => val ? (
          <li key={key}>
            <span className="ins3-brief-key">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <span className="ins3-brief-val">{val}</span>
          </li>
        ) : null)}
      </ul>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children, accent, className = '' }) {
  return (
    <div className={`ins3-card ${className}`} style={accent ? { borderLeftColor: accent } : {}}>
      {title && <div className="ins3-card-title">{title}</div>}
      {children}
    </div>
  );
}

// ─── How to read ─────────────────────────────────────────────────────────────
function HowToRead() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ins3-how">
      <button className="ins3-how-toggle" onClick={() => setOpen(v => !v)}>
        How to read this page <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ins3-how-body">
          <p>This page describes market conditions using price data and live news. It is a thinking tool, not a trading tool. All interpretations are educational.</p>
          <ul>
            <li><strong>Trader Brief</strong> — intraday session context from Gemini with live news</li>
            <li><strong>Investor Brief</strong> — broader positional context</li>
            <li><strong>Market Stance</strong> — directional character based on index movement rules</li>
            <li><strong>Price Zones</strong> — areas of historical buying and selling activity</li>
            <li><strong>Scenarios</strong> — if-then frameworks based on key levels. Not predictions.</li>
          </ul>
          <p style={{fontSize:11,color:'var(--text3)',marginTop:8}}>Not a recommendation to buy or sell securities.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InsightsPage({ data = {}, nseData = {} }) {
  const [fiidii,       setFiidii]       = useState(null);
  const [brief,        setBrief]        = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [clock,        setClock]        = useState(getIST());
  const [slot,         setSlot]         = useState(getSlotLabel());

  useEffect(() => {
    fetch('/api/fiidii').then(r => r.json()).then(setFiidii).catch(() => {});
    const id = setInterval(() => { setClock(getIST()); setSlot(getSlotLabel()); }, 60000);
    return () => clearInterval(id);
  }, []);

  const fetchBrief = useCallback(() => {
    setBriefLoading(true);
    const nifty  = nseData.nifty50   || data.nifty50   || {};
    const bn     = nseData.banknifty || data.banknifty || {};
    const np     = nifty.changePct ?? null;
    const bp     = bn.changePct ?? null;
    const fiiNet = fiidii?.history?.slice(-1)[0]?.fii?.net ?? null;
    const diiNet = fiidii?.history?.slice(-1)[0]?.dii?.net ?? null;
    const payload = {
      niftyPrice: nifty.price, bnPrice: bn.price, niftyPct: np, bnPct: bp,
      vix: nseData.vix || null, stance: getStance(np, bp)?.label || 'Neutral',
      structure: getStructureLabel(np), volLabel: getVolatility(np)?.label || 'Unknown',
      sessionChar: getSessionChar(nifty.price, nifty.high, nifty.low)?.label || null,
      fiiNet, diiNet, sp500Pct: data.sp500?.changePct ?? null,
      nikkeiPct: data.nikkei?.changePct ?? null, hangsengPct: data.hangseng?.changePct ?? null,
    };
    fetch('/api/insights-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json()).then(d => { setBrief(d); setBriefLoading(false); })
      .catch(() => setBriefLoading(false));
  }, [data, nseData, fiidii]);

  useEffect(() => {
    if (fiidii !== null) { fetchBrief(); return; }
    const t = setTimeout(fetchBrief, 3000);
    return () => clearTimeout(t);
  }, [fiidii]);

  // ── Data ──
  const nifty     = nseData.nifty50   || data.nifty50   || null;
  const banknifty = nseData.banknifty || data.banknifty || null;
  const sensex    = nseData.sensex    || data.sensex    || null;
  const giftnifty = data.giftnifty    || null;
  const np        = nifty?.changePct ?? null;
  const bp        = banknifty?.changePct ?? null;

  const stance   = getStance(np, bp);
  const vol      = getVolatility(np);
  const sesChar  = getSessionChar(nifty?.price, nifty?.high, nifty?.low);
  const zones    = getPriceZones(nifty?.price);
  const global   = getGlobalContext(data);
  const scenarios= getScenarios(nifty?.price, np);
  const mktType  = getMarketType(np, nseData.vix);

  const fiiNet   = fiidii?.history?.slice(-1)[0]?.fii?.net ?? null;
  const diiNet   = fiidii?.history?.slice(-1)[0]?.dii?.net ?? null;
  const fii5d    = fiidii?.history?.slice(-5).reduce((s,d) => s + (d.fii?.net||0), 0) ?? null;
  let fiiCtx = '';
  if (fiiNet !== null) {
    if (fiiNet < 0 && (diiNet ?? 0) > 0) fiiCtx = 'FIIs selling, DIIs absorbing. Domestic institutions are providing a cushion.';
    else if (fiiNet > 0 && (diiNet ?? 0) > 0) fiiCtx = 'Both FIIs and DIIs buying. Broad institutional conviction.';
    else if (fiiNet < 0 && (diiNet ?? 0) < 0) fiiCtx = 'Both FIIs and DIIs selling. No domestic support.';
    else fiiCtx = 'FIIs buying, DIIs trimming. Foreign flows supporting the market.';
  }

  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  // Show events for today + next 6 days (7-day window), high impact first
  const now7 = new Date();
  const in7  = new Date(); in7.setDate(in7.getDate() + 6);
  const pad2 = n => String(n).padStart(2, '0');
  const todayStr = `${now7.getFullYear()}-${pad2(now7.getMonth()+1)}-${pad2(now7.getDate())}`;
  const in7Str   = `${in7.getFullYear()}-${pad2(in7.getMonth()+1)}-${pad2(in7.getDate())}`;
  const todayEvents = ECON_EVENTS
    .filter(e => e.date >= todayStr && e.date <= in7Str)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.impact === 'high' ? -1 : 1));
  const fmtEvtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  // Nearest zone
  const nearestZone = zones ? zones.reduce((a, b) => Math.abs(a.level - (nifty?.price||0)) < Math.abs(b.level - (nifty?.price||0)) ? a : b) : null;

  return (
    <div className="ins3-wrap">

      {/* ── What Matters Now strip ── */}
      {stance && (
        <div className="ins3-strip">
          <div className="ins3-strip-item">
            <span className="ins3-strip-label">TREND</span>
            <span className="ins3-strip-val" style={{ color: stance.color }}>{stance.icon} {stance.label}</span>
          </div>
          {vol && (
            <div className="ins3-strip-item">
              <span className="ins3-strip-label">VOLATILITY</span>
              <span className="ins3-strip-val" style={{ color: vol.color }}>{vol.label}</span>
            </div>
          )}
          {nearestZone && (
            <div className="ins3-strip-item">
              <span className="ins3-strip-label">KEY LEVEL</span>
              <span className="ins3-strip-val" style={{ color: nearestZone.type === 'support' ? 'var(--gain)' : 'var(--loss)' }}>
                {nearestZone.level.toLocaleString('en-IN')} ({nearestZone.label})
              </span>
            </div>
          )}
          {nseData.vix && (
            <div className="ins3-strip-item">
              <span className="ins3-strip-label">VIX</span>
              <span className="ins3-strip-val">{nseData.vix.toFixed(1)}</span>
            </div>
          )}
          <div className="ins3-strip-item ins3-strip-time">
            <span className="ins3-strip-label">{slot.toUpperCase()}</span>
            <span className="ins3-strip-val">{timeStr} IST</span>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div className="ins3-header">
        <div>
          <h1 className="ins3-page-title">Market Brief</h1>
          <div className="ins3-page-meta">{dateStr}</div>
        </div>
      </div>

      {/* ── Row 1: Index strip ── */}
      <div className="ins3-idx-strip">
        {[
          { label: 'Nifty 50',   d: nifty,     main: true },
          { label: 'Bank Nifty', d: banknifty              },
          { label: 'Sensex',     d: sensex                  },
          { label: 'Gift Nifty', d: giftnifty               },
        ].map((item, i) => item.d?.price ? (
          <div key={i} className={`ins3-idx ${item.main ? 'ins3-idx-main' : ''}`}>
            <div className="ins3-idx-name">{item.label}</div>
            <div className="ins3-idx-price">{fmtP(item.d.price)}</div>
            <div className="ins3-idx-chg" style={{ color: pColor(item.d.changePct) }}>{fmtPct(item.d.changePct)}</div>
            {item.d.high && item.d.low && (
              <div className="ins3-idx-hl">H: {fmtP(item.d.high)} · L: {fmtP(item.d.low)}</div>
            )}
          </div>
        ) : null)}
      </div>

      {/* ── Main grid ── */}
      <div className="ins3-grid">

        {/* ── Row 2: Brief (2/3) + Stance (1/3) ── */}
        <div className="ins3-brief-card ins3-card ins3-col2">
          <div className="ins3-card-hdr-row">
            <span className="ins3-card-title">SESSION BRIEF</span>
            {briefLoading
              ? <span className="ins3-badge ins3-badge-loading">GENERATING</span>
              : brief?.cached
                ? <span className="ins3-badge ins3-badge-cached">CACHED</span>
                : <span className="ins3-badge ins3-badge-live">LIVE</span>}
            {brief?.generatedAt && !briefLoading && (
              <span className="ins3-badge-time">{new Date(brief.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            )}
          </div>
          {briefLoading ? (
            <div className="ins3-brief-loading"><div className="ins3-spinner" /><span>Reading market data and news...</span></div>
          ) : brief?.trader ? (
            <div className="ins3-brief-panels">
              <BriefPanel title="Intraday Trader" accent="#4A9EFF" items={brief.trader} fallback={brief.fallback} />
              <BriefPanel title="Investor Context" accent="#A78BFA" items={brief.investor} fallback={false} />
            </div>
          ) : (
            <div className="ins3-brief-loading"><span>Brief unavailable.</span></div>
          )}
          <div className="ins3-brief-src">
            {brief?.fallback ? 'Rule-based. Set GEMINI_API_KEY in Vercel for AI briefs with live news.' : 'Gemini with Google Search. Refreshes once per session window.'}
          </div>
        </div>

        {/* Stance card (1/3) */}
        {stance && (
          <div className="ins3-card ins3-stance-card" style={{ background: stance.bg, borderLeftColor: stance.color }}>
            <div className="ins3-card-title">MARKET STANCE</div>
            <div className="ins3-stance-icon" style={{ color: stance.color }}>{stance.icon}</div>
            <div className="ins3-stance-label" style={{ color: stance.color }}>{stance.label}</div>
            <div className="ins3-stance-conf">
              <span className="ins3-conf-label">Confidence</span>
              <span className="ins3-conf-val" style={{ color: stance.color }}>{stance.confidence}</span>
            </div>
            <ul className="ins3-stance-reasons">
              {stance.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            {mktType && (
              <div className="ins3-mkttype">
                <span className="ins3-mkttype-tag">{mktType.type}</span>
                <p>{mktType.approach}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Row 3: Price Zones (1/3) + Session char + Global (2/3) ── */}
        {zones && (
          <div className="ins3-card">
            <div className="ins3-card-title">PRICE REACTION ZONES</div>
            <div className="ins3-zones">
              {zones.map((z, i) => (
                <div key={i} className={`ins3-zone ${z.type} ${z.nearest ? 'ins3-zone-nearest' : ''}`}>
                  <div className="ins3-zone-top">
                    <span className="ins3-zone-label">{z.label}</span>
                    {z.nearest && <span className="ins3-zone-nearest-badge">NEAREST</span>}
                  </div>
                  <div className="ins3-zone-level" style={{ color: z.type === 'support' ? 'var(--gain)' : 'var(--loss)' }}>
                    {z.level.toLocaleString('en-IN')}
                  </div>
                  <div className="ins3-zone-dist">{z.distSign}{z.distance}% from current</div>
                </div>
              ))}
            </div>
            <div className="ins3-zones-note">Areas of historical activity. Not predictions.</div>
          </div>
        )}

        <div className="ins3-card ins3-col-right-stack">
          {sesChar && (
            <div className="ins3-seschar" style={{ borderLeftColor: sesChar.color }}>
              <div className="ins3-card-title">SESSION CHARACTER</div>
              <div className="ins3-seschar-label" style={{ color: sesChar.color }}>{sesChar.icon} {sesChar.label}</div>
              <p className="ins3-explanation">{sesChar.explanation}</p>
            </div>
          )}
          {global && (
            <div className="ins3-global">
              <div className="ins3-card-title">GLOBAL CONTEXT</div>
              <div className="ins3-global-bias">
                <span className="ins3-global-bias-label">Global Bias</span>
                <span className="ins3-global-bias-val" style={{ color: global.biasColor }}>{global.bias}</span>
              </div>
              <div className="ins3-global-list">
                {global.items.map((g, i) => (
                  <div key={i} className="ins3-global-row">
                    <span className="ins3-global-name">{g.label}</span>
                    <span style={{ color: pColor(g.changePct), fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 13 }}>{fmtPct(g.changePct)}</span>
                  </div>
                ))}
              </div>
              <p className="ins3-explanation" style={{ marginTop: 10 }}>{global.interp}</p>
            </div>
          )}
        </div>

        {/* ── Row 4: Institutional + Scenarios + Playbook ── */}
        <div className="ins3-card">
          <div className="ins3-card-title">INSTITUTIONAL ACTIVITY</div>
          {fiiNet !== null ? (
            <>
              <div className="ins3-inst-grid">
                <div className="ins3-inst-card">
                  <div className="ins3-inst-who">FII / FPI</div>
                  <div className="ins3-inst-dir" style={{ color: fiiNet >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{fiiNet >= 0 ? 'Buying' : 'Selling'}</div>
                  <div className="ins3-inst-amt">{fiiNet >= 0 ? '+' : ''}₹{Math.abs(fiiNet).toLocaleString('en-IN')} Cr</div>
                </div>
                <div className="ins3-inst-card">
                  <div className="ins3-inst-who">DII</div>
                  <div className="ins3-inst-dir" style={{ color: (diiNet ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{(diiNet ?? 0) >= 0 ? 'Buying' : 'Selling'}</div>
                  <div className="ins3-inst-amt">{(diiNet ?? 0) >= 0 ? '+' : ''}₹{Math.abs(diiNet ?? 0).toLocaleString('en-IN')} Cr</div>
                </div>
                {fii5d !== null && (
                  <div className="ins3-inst-card">
                    <div className="ins3-inst-who">FII 5-Day</div>
                    <div className="ins3-inst-dir" style={{ color: fii5d >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{fii5d >= 0 ? 'Net Buyers' : 'Net Sellers'}</div>
                    <div className="ins3-inst-amt">{fii5d >= 0 ? '+' : ''}₹{Math.abs(fii5d).toLocaleString('en-IN')} Cr</div>
                  </div>
                )}
              </div>
              {fiiCtx && <p className="ins3-explanation">{fiiCtx}</p>}
            </>
          ) : <p className="ins3-loading">Loading...</p>}
        </div>

        {scenarios && (
          <div className="ins3-card">
            <div className="ins3-card-title">SCENARIO FRAMEWORK</div>
            <div className="ins3-scenarios">
              {scenarios.map((s, i) => (
                <div key={i} className={`ins3-scenario ins3-scenario-${s.type}`}>
                  <div className="ins3-scenario-if">{s.condition}</div>
                  <div className="ins3-scenario-arrow">→</div>
                  <div className="ins3-scenario-then">{s.outcome}</div>
                </div>
              ))}
            </div>
            <p className="ins3-zones-note">Scenario frameworks based on key levels. Not predictions.</p>
          </div>
        )}

        {/* Economic calendar */}
        <div className="ins3-card">
          <div className="ins3-card-title">ECONOMIC CALENDAR <span style={{fontWeight:400,opacity:.6,letterSpacing:0}}>— Next 7 days</span></div>
          {todayEvents.length > 0 ? (
            <div className="ins3-econ-list">
              {todayEvents.map((e, i) => (
                <div key={i} className={`ins3-econ-row ins3-econ-${e.impact}`}>
                  <div className="ins3-econ-meta">
                    <div className="ins3-econ-date">{fmtEvtDate(e.date)}</div>
                    <div className={`ins3-econ-country ins3-econ-country-${e.country === 'India' ? 'india' : 'global'}`}>{e.country}</div>
                  </div>
                  <div className="ins3-econ-body">
                    <div className="ins3-econ-event">{e.event}</div>
                    <div className="ins3-econ-note">{e.note}</div>
                  </div>
                  <div className={`ins3-econ-impact ins3-econ-impact-${e.impact}`}>{e.impact}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ins3-loading">No major events in the next 7 days.</p>
          )}
          <p className="ins3-zones-note">Source: Zerodha Markets economic calendar. All times approximate IST.</p>
        </div>

      </div>

      {/* ── Market Write-up ── */}
      {(brief?.writeup || briefLoading) && (
        <div className="ins3-writeup-wrap">
          <div className="ins3-card ins3-writeup-card">
            <div className="ins3-card-hdr-row">
              <span className="ins3-card-title">{slot.toUpperCase()} WRITE-UP</span>
              <span className="ins3-writeup-read">2 min read</span>
              {briefLoading
                ? <span className="ins3-badge ins3-badge-loading">GENERATING</span>
                : brief?.cached
                  ? <span className="ins3-badge ins3-badge-cached">CACHED</span>
                  : <span className="ins3-badge ins3-badge-live">LIVE</span>}
            </div>
            {briefLoading ? (
              <div className="ins3-brief-loading"><div className="ins3-spinner" /><span>Generating session writeup...</span></div>
            ) : brief?.writeup ? (
              <div className="ins3-writeup-body">
                {brief.writeup.split('\n').filter(p => p.trim()).map((para, i) => (
                  <p key={i} className="ins3-writeup-para">{para.trim()}</p>
                ))}
              </div>
            ) : null}
            {brief?.fallback && !briefLoading && (
              <div className="ins3-writeup-fallback">Rule-based writeup. Set GEMINI_API_KEY in Vercel for AI-generated writeups with live news.</div>
            )}
          </div>
        </div>
      )}

      <HowToRead />

      <div className="ins3-footer">
        This is a data-driven market summary for educational purposes.
        Not a recommendation to buy or sell securities.
        Data from Kite Connect and NSE. AI brief by Gemini with Google Search grounding.
      </div>
    </div>
  );
}
