import { useState, useEffect, useCallback } from 'react';

// ── Economic calendar ──────────────────────────────────────────────────────────
const ECON_EVENTS = [
  { date: '2026-03-29', event: 'BOJ Policy Rate (Japan)',           impact: 'high',   country: 'Global', note: 'Bank of Japan rate decision. Yen moves spill into Asian markets and Indian IT/export stocks.' },
  { date: '2026-03-30', event: 'Germany Inflation (Preliminary)',  impact: 'high',   country: 'Global', note: 'Eurozone inflation proxy. Shapes ECB rate expectations and EUR/USD direction.' },
  { date: '2026-03-31', event: 'China Manufacturing PMI',          impact: 'medium', country: 'Global', note: 'Below 50 = contraction. Bearish for metals, copper, and commodity-linked Indian stocks.' },
  { date: '2026-04-01', event: 'India GST Collections',            impact: 'medium', country: 'India',  note: 'Consumption proxy. Strong collections signal positive domestic growth narrative.' },
  { date: '2026-04-03', event: 'US Non-Farm Payrolls (NFP)',       impact: 'high',   country: 'Global', note: 'Biggest monthly mover. Strong NFP delays Fed cuts. Weak NFP accelerates them. Drives FII flows.' },
  { date: '2026-04-03', event: 'US Unemployment Rate',             impact: 'high',   country: 'Global', note: 'Released alongside NFP. Fed watches this closely for labour market signals.' },
  { date: '2026-04-08', event: 'RBI Monetary Policy Decision',     impact: 'high',   country: 'India',  note: 'Most important domestic event. Rate move impacts equities, bonds, banking stocks. Prev: 5.25%.' },
  { date: '2026-04-10', event: 'US CPI Inflation',                 impact: 'high',   country: 'Global', note: 'Above forecast = dollar strengthens, gold rallies, FIIs reduce EM exposure.' },
  { date: '2026-04-10', event: 'China CPI Inflation',              impact: 'high',   country: 'Global', note: 'Deflation risk in China is bearish for metals, crude, and commodity-linked sectors.' },
  { date: '2026-04-17', event: 'China GDP Q1 2026',                impact: 'high',   country: 'Global', note: 'Directly impacts global commodity prices. Weak print pressures metals and crude.' },
  { date: '2026-04-20', event: 'China PBOC Rate Decision',         impact: 'high',   country: 'Global', note: 'China easing is positive for risk assets and commodity-linked Indian stocks.' },
  { date: '2026-04-29', event: 'US Fed FOMC Rate Decision',        impact: 'high',   country: 'Global', note: 'Federal Reserve policy. Biggest single driver of FII flows into Indian markets. Prev: 3.50-3.75%.' },
  { date: '2026-04-30', event: 'US GDP Advance Estimate Q1 2026', impact: 'high',   country: 'Global', note: 'First read on US Q1 growth. Weak GDP accelerates Fed cut expectations. Positive for gold.' },
  { date: '2026-04-30', event: 'ECB Rate Decision',                impact: 'high',   country: 'Global', note: 'ECB easing supports global risk appetite and emerging market inflows.' },
];

// ── Rule engine ────────────────────────────────────────────────────────────────
function getStance(np, bp) {
  if (np === null) return null;
  if (np < -1.5 && bp !== null && bp < -1.5) return { label: 'Strong Bear', color: '#FF4455', bg: 'rgba(255,68,85,.1)', icon: '↓↓', confidence: 'High', bias: 'Selling on rallies', reasons: ['Broad decline across Nifty and Bank Nifty', 'Sustained selling pressure in large caps'] };
  if (np < -0.7)  return { label: 'Bearish',     color: '#F59E0B', bg: 'rgba(245,158,11,.08)', icon: '↓',  confidence: 'Medium', bias: 'Cautious, negative bias', reasons: ['Nifty declining more than 0.7%', 'Price momentum is negative'] };
  if (np > 1.5 && bp !== null && bp > 1.5) return { label: 'Strong Bull', color: '#00C896', bg: 'rgba(0,200,150,.1)', icon: '↑↑', confidence: 'High', bias: 'Dips being bought', reasons: ['Broad advance across Nifty and Bank Nifty', 'Sustained buying across large caps'] };
  if (np > 0.7)   return { label: 'Bullish',     color: '#00C896', bg: 'rgba(0,200,150,.08)', icon: '↑',  confidence: 'Medium', bias: 'Positive bias', reasons: ['Nifty advancing more than 0.7%', 'Price momentum is positive'] };
  return { label: 'Neutral', color: 'var(--text2)', bg: 'var(--bg3)', icon: '→', confidence: 'Low', bias: 'Neutral range', reasons: ['Nifty within 0.7% of previous close', 'No dominant directional bias'] };
}

function getVolatility(np) {
  if (np === null) return null;
  const a = Math.abs(np);
  if (a > 1.5) return { label: 'High',     color: '#FF4455' };
  if (a > 0.7) return { label: 'Moderate', color: '#F59E0B' };
  return             { label: 'Low',       color: '#00C896' };
}

function getSessionChar(price, high, low) {
  if (!price || !high || !low || high === low) return null;
  const rel = (price - low) / (high - low);
  if (rel < 0.25) return { label: 'Near Low',  color: '#FF4455', expl: 'Sustained selling into close. Weak sentiment heading into next session.' };
  if (rel > 0.75) return { label: 'Near High', color: '#00C896', expl: 'Buyers held ground through session. Constructive close.' };
  return               { label: 'Mid-Range',  color: 'var(--text2)', expl: 'Neither side decisive by close. Indecisive session character.' };
}

function getGlobal(data) {
  const idxs = [
    { id: 'sp500', label: 'S&P 500' }, { id: 'nasdaq', label: 'Nasdaq' },
    { id: 'nikkei', label: 'Nikkei' }, { id: 'hangseng', label: 'Hang Seng' },
    { id: 'ftse', label: 'FTSE' }, { id: 'dax', label: 'DAX' }, { id: 'shanghai', label: 'Shanghai' },
  ];
  const items = idxs.map(i => { const d = data[i.id]; return d?.price && d.changePct !== null ? { ...i, pct: d.changePct } : null; }).filter(Boolean);
  if (!items.length) return null;
  const avg = items.reduce((s, i) => s + i.pct, 0) / items.length;
  const bias = avg > 0.3 ? 'Positive' : avg > 0 ? 'Mildly Positive' : avg > -0.3 ? 'Mixed' : 'Negative';
  const biasColor = avg > 0.1 ? 'var(--gain)' : avg < -0.1 ? 'var(--loss)' : 'var(--text2)';
  return { items, bias, biasColor };
}

function getZones(price) {
  if (!price) return null;
  const s = price < 10000 ? 100 : 50;
  const r = v => Math.round(v / s) * s;
  return [
    { level: r(price * 0.990), label: 'Support 1',    type: 'support'    },
    { level: r(price * 0.976), label: 'Support 2',    type: 'support'    },
    { level: r(price * 1.010), label: 'Resistance 1', type: 'resistance' },
    { level: r(price * 1.022), label: 'Resistance 2', type: 'resistance' },
  ].map(z => ({ ...z, dist: ((z.level - price) / price * 100).toFixed(1) }));
}

function getScenarios(price, np) {
  if (!price || np === null) return null;
  const s = price < 10000 ? 100 : 50;
  const r = v => Math.round(v / s) * s;
  const sup = r(price * 0.990);
  const res = r(price * 1.010);
  return [
    { if: `Nifty breaks ${sup.toLocaleString('en-IN')}`, then: 'Downside continuation likely toward next support zone', type: 'bear' },
    { if: `Nifty reclaims ${res.toLocaleString('en-IN')}`, then: 'Short covering possible. Watch for follow-through buying', type: 'bull' },
    { if: `Range between ${sup.toLocaleString('en-IN')} and ${res.toLocaleString('en-IN')} holds`, then: 'Consolidation continues. Directional move on breakout', type: 'neutral' },
  ];
}

function getCommodityContext(data) {
  const crude = data.crude;
  const gold  = data.gold;
  const copper= data.copper;
  const lines = [];
  if (crude?.changePct !== null && crude?.changePct !== undefined) {
    if (crude.changePct < -1) lines.push({ text: 'Crude falling sharply. Negative for energy stocks. Positive for inflation and current account.', type: 'bear' });
    else if (crude.changePct > 1) lines.push({ text: 'Crude rising. Energy stocks may outperform. Watch for inflation and rupee pressure.', type: 'bull' });
    else lines.push({ text: 'Crude stable. Neutral impact on energy sector and inflation outlook.', type: 'neutral' });
  }
  if (gold?.changePct !== null && gold?.changePct !== undefined) {
    if (gold.changePct > 0.5) lines.push({ text: 'Gold rising. Risk-off positioning visible globally. Defensive bias across asset classes.', type: 'neutral' });
    else if (gold.changePct < -0.5) lines.push({ text: 'Gold declining. Risk appetite returning globally. Positive signal for equity indices.', type: 'bull' });
  }
  if (copper?.changePct !== null && copper?.changePct !== undefined) {
    if (copper.changePct > 1) lines.push({ text: 'Copper rising. Industrial demand signal improving. Positive for metals and infra stocks.', type: 'bull' });
    else if (copper.changePct < -1) lines.push({ text: 'Copper falling. Demand concerns visible. Watch metals sector.', type: 'bear' });
  }
  return lines;
}

// ── IST / slot helpers ─────────────────────────────────────────────────────────
function getIST() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); }

function getSlotLabel() {
  const ist = getIST(); const d = ist.getDay(); const m = ist.getHours() * 60 + ist.getMinutes();
  if (d === 0 || d === 6) return 'Market Closed';
  if (m < 540)  return 'Pre-Market';
  if (m < 555)  return 'Pre-Open';
  if (m < 750)  return 'Opening Session';
  if (m < 870)  return 'Mid-Day';
  if (m < 930)  return 'Afternoon';
  if (m < 1020) return 'Market Close';
  return 'Post-Market';
}

function isWeekend() { const d = getIST().getDay(); return d === 0 || d === 6; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtP   = v => v ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '--';
const fmtF   = (v, d=2) => v ? v.toLocaleString('en-IN', { maximumFractionDigits: d }) : '--';
const fmtPct = v => v !== null && v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '--';
const pColor  = v => (!v && v !== 0) ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';
const prevClose = (price, pct) => (price && pct !== null && pct !== undefined) ? price / (1 + pct / 100) : null;

// ── Sub-components ─────────────────────────────────────────────────────────────
function BriefPanel({ title, accent, items }) {
  return (
    <div className="ins4-bp" style={{ borderTopColor: accent }}>
      <div className="ins4-bp-title" style={{ color: accent }}>{title}</div>
      <ul className="ins4-bp-list">
        {Object.entries(items).map(([k, v]) => v ? (
          <li key={k}><span className="ins4-bp-key">{k.charAt(0).toUpperCase() + k.slice(1)}</span><span className="ins4-bp-val">{v}</span></li>
        ) : null)}
      </ul>
    </div>
  );
}

function IndexCard({ label, d, main, flag }) {
  if (!d?.price) return null;
  const gain = (d.changePct ?? 0) >= 0;
  return (
    <div className={`ins4-idx-card ${main ? 'ins4-idx-card-main' : ''}`} style={{ borderTopColor: gain ? 'rgba(0,200,150,0.4)' : 'rgba(255,68,85,0.4)' }}>
      <div className="ins4-idx-card-top">
        {flag && <span className="ins4-idx-flag">{flag}</span>}
        <span className="ins4-idx-card-name">{label}</span>
      </div>
      <div className="ins4-idx-card-price">{fmtP(d.price)}</div>
      {d.changePct !== null && d.changePct !== undefined && (
        <div className="ins4-idx-card-pct" style={{ color: pColor(d.changePct) }}>
          {gain ? '▲' : '▼'} {Math.abs(d.changePct).toFixed(2)}%
        </div>
      )}
      {d.high && d.low && <div className="ins4-idx-card-hl">H {fmtP(d.high)} · L {fmtP(d.low)}</div>}
    </div>
  );
}

function BenchCard({ label, d, flag }) {
  if (!d?.price) return null;
  const gain = (d.changePct ?? 0) >= 0;
  return (
    <div className="ins4-bench-card" style={{ borderTopColor: gain ? 'rgba(0,200,150,0.4)' : 'rgba(255,68,85,0.4)' }}>
      <div className="ins4-bench-top">
        {flag && <span className="ins4-idx-flag">{flag}</span>}
        <span className="ins4-bench-name">{label}</span>
      </div>
      <div className="ins4-bench-price">{d.price > 1000 ? fmtP(d.price) : fmtF(d.price, 2)}</div>
      <div className="ins4-bench-pct" style={{ color: pColor(d.changePct) }}>
        {gain ? '▲' : '▼'} {fmtPct(d.changePct)}
      </div>
    </div>
  );
}

function HowToRead() {
  return (
    <div className="ins4-htr-wrap">
      <div className="ins4-htr-header">HOW TO READ THIS PAGE</div>
      <div className="ins4-htr-grid">

        <div className="ins4-htr-col">
          <div className="ins4-htr-col-title ins4-htr-trader">FOR INTRADAY TRADERS</div>
          <div className="ins4-htr-item"><strong>Market Stance</strong> Computed from live index price movement. Strong Bull or Strong Bear means Nifty and Bank Nifty are moving together, which is a higher-conviction signal. Neutral means neither side is in control.</div>
          <div className="ins4-htr-item"><strong>Session Brief</strong> AI-generated summary refreshed each session window (Pre-Market, Opening, Mid-Day, Afternoon, Close, Post-Market). The Intraday tab describes what is happening right now. The news and OI data it uses is fresh for the day.</div>
          <div className="ins4-htr-item"><strong>Session Character</strong> Where price closed within the day range. Near High means buyers dominated the session. Near Low means sellers dominated. Mid-Range means neither side was decisive.</div>
          <div className="ins4-htr-item"><strong>Scenarios</strong> If-then frameworks based on key price levels. Use these to plan what you will do at each level, not to predict which one will trigger. Preparing for both directions is the right way to use this.</div>
          <div className="ins4-htr-item"><strong>Price Zones</strong> Key levels near current price with historical significance. The distance percentage shows how far away each level is from the current price right now.</div>
        </div>

        <div className="ins4-htr-col">
          <div className="ins4-htr-col-title ins4-htr-investor">FOR INVESTORS</div>
          <div className="ins4-htr-item"><strong>Institutional Flows</strong> FII (Foreign Institutional Investors) and DII (Domestic Institutional Investors) are the biggest market movers. When FIIs sell and DIIs absorb, domestic institutions are cushioning the fall. When both sell together, there is no support underneath the market.</div>
          <div className="ins4-htr-item"><strong>5-Day FII Flow</strong> The 5-day running total tells you the trend in foreign money. Sustained FII selling for 5 days is a meaningful signal. A single day does not tell the full story.</div>
          <div className="ins4-htr-item"><strong>Global Indices</strong> S&P 500 and Nasdaq set the overnight global tone. Nikkei and Hang Seng reflect Asian sentiment at open. Gift Nifty shows where Nifty is expected to open before market hours. All four together paint the opening picture.</div>
          <div className="ins4-htr-item"><strong>Economic Calendar</strong> Events marked High Impact can move markets sharply. RBI policy, US Fed decisions, and US NFP data are the most important for Indian equity investors. Plan around these dates and reduce risk exposure around them if needed.</div>
          <div className="ins4-htr-item"><strong>Last Session</strong> Previous session closing levels and FII/DII data give context to the current day opening. A strong close with FII buying is a constructive setup. A weak close with FII selling warrants caution.</div>
        </div>

        <div className="ins4-htr-col">
          <div className="ins4-htr-col-title ins4-htr-commodity">FOR COMMODITY TRADERS</div>
          <div className="ins4-htr-item"><strong>Crude Oil WTI/Brent</strong> The primary energy commodity. Drives energy stocks, the rupee, and India current account. Rising crude is inflationary and weakens the rupee. OPEC supply decisions and US inventory data are the key drivers. WTI and Brent usually move together, but the spread between them can indicate shipping and regional demand dynamics.</div>
          <div className="ins4-htr-item"><strong>Gold and Silver</strong> Gold rises in risk-off environments and when real interest rates fall. A rising gold price signals global uncertainty or dollar weakness. Silver follows gold but with higher volatility and has significant industrial demand linkage, making it sensitive to economic growth data as well.</div>
          <div className="ins4-htr-item"><strong>Natural Gas</strong> Highly seasonal and volatile. Relevant for power, fertiliser, and petrochemical sectors in India. Moves independently of crude oil. European demand and US storage data are the primary drivers.</div>
          <div className="ins4-htr-item"><strong>Copper</strong> Tracks global industrial demand directly. Rising copper signals improving global growth. Falling copper signals slowdown concerns. China manufacturing PMI data is the biggest driver. Use copper as a leading indicator for the metals sector in Indian equities.</div>
          <div className="ins4-htr-item"><strong>Commodity Scenarios</strong> The Scenarios card translates commodity price levels into potential equity sector implications. These describe what may happen at each level, not what will. Always cross-check with the broader market stance before acting.</div>
        </div>

      </div>
      <div className="ins4-htr-disclaimer">
        This page presents market data and context for educational purposes only. Nothing on this page is a recommendation to buy, sell, or hold any security, commodity, or derivative. All data is sourced from market feeds and is subject to delays. Past patterns do not guarantee future outcomes.
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function InsightsPage({ data = {}, nseData = {} }) {
  const [fiidii,       setFiidii]       = useState(null);
  const [brief,        setBrief]        = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [writeupOpen,  setWriteupOpen]  = useState(true);
  const [clock,        setClock]        = useState(getIST());
  const [slot,         setSlot]         = useState(getSlotLabel());
  const [weekend,      setWeekend]      = useState(isWeekend());

  useEffect(() => {
    fetch('/api/fiidii').then(r => r.json()).then(setFiidii).catch(() => {});
    const id = setInterval(() => { setClock(getIST()); setSlot(getSlotLabel()); setWeekend(isWeekend()); }, 60000);
    return () => clearInterval(id);
  }, []);

  const fetchBrief = useCallback(() => {
    if (isWeekend()) { setBriefLoading(false); return; }
    setBriefLoading(true);
    const nifty = nseData.nifty50 || data.nifty50 || {};
    const bn    = nseData.banknifty || data.banknifty || {};
    const np    = nifty.changePct ?? null;
    const bp    = bn.changePct ?? null;
    const payload = {
      niftyPrice: nifty.price, bnPrice: bn.price, niftyPct: np, bnPct: bp,
      vix: nseData.vix || null,
      stance: getStance(np, bp)?.label || 'Neutral',
      structure: np < -0.5 ? 'Downtrend' : np > 0.5 ? 'Uptrend' : 'Range',
      volLabel: getVolatility(np)?.label || 'Moderate',
      sessionChar: getSessionChar(nifty.price, nifty.high, nifty.low)?.label || null,
      fiiNet: fiidii?.history?.slice(-1)[0]?.fii?.net ?? null,
      diiNet: fiidii?.history?.slice(-1)[0]?.dii?.net ?? null,
      sp500Pct: data.sp500?.changePct ?? null,
      nikkeiPct: data.nikkei?.changePct ?? null,
      hangsengPct: data.hangseng?.changePct ?? null,
      crudePct: data.crude?.changePct ?? null,
      goldPct: data.gold?.changePct ?? null,
    };
    fetch('/api/insights-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json()).then(d => { setBrief(d); setBriefLoading(false); })
      .catch(() => setBriefLoading(false));
  }, [data, nseData, fiidii]);

  useEffect(() => { fetchBrief(); }, [fiidii]);

  // ── Data ──
  const nifty     = nseData.nifty50        || data.nifty50        || null;
  const banknifty = nseData.banknifty      || data.banknifty      || null;
  const finnifty  = nseData.niftyfinservice || data.niftyfinservice || null;
  const sensex    = nseData.sensex         || data.sensex         || null;
  const giftnifty = data.giftnifty         || null;
  const sp500     = data.sp500             || null;
  const nasdaq    = data.nasdaq            || null;
  const nikkei    = data.nikkei            || null;
  const hangseng  = data.hangseng          || null;
  const np        = nifty?.changePct ?? null;
  const bp        = banknifty?.changePct ?? null;

  const stance    = getStance(np, bp);
  const vol       = getVolatility(np);
  const sesChar   = getSessionChar(nifty?.price, nifty?.high, nifty?.low);
  const zones     = getZones(nifty?.price);
  const scenarios = getScenarios(nifty?.price, np);
  const global    = getGlobal(data);
  const commodCtx = getCommodityContext(data);

  // Last session derived data
  const niftyPrevClose = prevClose(nifty?.price, np);
  const bnPrevClose    = prevClose(banknifty?.price, bp);
  const prevFii  = fiidii?.history?.length >= 2 ? fiidii.history[fiidii.history.length - 2]?.fii?.net ?? null : null;
  const prevDii  = fiidii?.history?.length >= 2 ? fiidii.history[fiidii.history.length - 2]?.dii?.net ?? null : null;
  const prevDate = fiidii?.history?.length >= 2 ? fiidii.history[fiidii.history.length - 2]?.date ?? null : null;

  const fiiNet = fiidii?.history?.slice(-1)[0]?.fii?.net ?? null;
  const diiNet = fiidii?.history?.slice(-1)[0]?.dii?.net ?? null;
  const fii5d  = fiidii?.history?.slice(-5).reduce((s, d) => s + (d.fii?.net || 0), 0) ?? null;
  let fiiCtx = '';
  if (fiiNet !== null) {
    if (fiiNet < 0 && (diiNet ?? 0) > 0)      fiiCtx = 'FIIs selling, DIIs absorbing. Domestic institutions cushioning the market.';
    else if (fiiNet > 0 && (diiNet ?? 0) > 0) fiiCtx = 'Both FIIs and DIIs buying. Broad institutional conviction on display.';
    else if (fiiNet < 0 && (diiNet ?? 0) < 0) fiiCtx = 'Both FIIs and DIIs selling. No domestic support layer visible.';
    else                                        fiiCtx = 'FIIs buying, DIIs trimming. Foreign flows supporting the market.';
  }

  const nearestZone = zones ? zones.reduce((a, b) => Math.abs(a.level - (nifty?.price || 0)) < Math.abs(b.level - (nifty?.price || 0)) ? a : b) : null;

  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const now7 = new Date(); const in7 = new Date(); in7.setDate(in7.getDate() + 6);
  const pad2 = n => String(n).padStart(2, '0');
  const todayStr = `${now7.getFullYear()}-${pad2(now7.getMonth()+1)}-${pad2(now7.getDate())}`;
  const in7Str   = `${in7.getFullYear()}-${pad2(in7.getMonth()+1)}-${pad2(in7.getDate())}`;
  const events   = ECON_EVENTS.filter(e => e.date >= todayStr && e.date <= in7Str).sort((a, b) => a.date.localeCompare(b.date));
  const fmtEvtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const COMMODITIES = [
    { id: 'gold',      label: 'Gold',        unit: 'USD/oz',    dec: 1 },
    { id: 'silver',    label: 'Silver',      unit: 'USD/oz',    dec: 2 },
    { id: 'crude',     label: 'Crude WTI',   unit: 'USD/bbl',   dec: 1 },
    { id: 'brent',     label: 'Crude Brent', unit: 'USD/bbl',   dec: 1 },
    { id: 'natgas',    label: 'Natural Gas', unit: 'USD/mmBtu', dec: 3 },
    { id: 'copper',    label: 'Copper',      unit: 'USD/lb',    dec: 3 },
    { id: 'aluminium', label: 'Aluminium',   unit: 'USD/t',     dec: 0 },
    { id: 'wheat',     label: 'Wheat',       unit: 'USD/bu',    dec: 2 },
  ];

  return (
    <div className="ins4-wrap">

      {/* STATUS STRIP */}
      <div className="ins4-strip">
        {stance && <div className="ins4-strip-item"><span className="ins4-sl">TREND</span><span className="ins4-sv" style={{color:stance.color}}>{stance.icon} {stance.label}</span></div>}
        {vol && <div className="ins4-strip-item"><span className="ins4-sl">VOLATILITY</span><span className="ins4-sv" style={{color:vol.color}}>{nseData.vix ? nseData.vix.toFixed(1) + ' · ' : ''}{vol.label}</span></div>}
        {nearestZone && <div className="ins4-strip-item"><span className="ins4-sl">NEAREST LEVEL</span><span className="ins4-sv" style={{color: nearestZone.type==='support'?'var(--gain)':'var(--loss)'}}>{nearestZone.level.toLocaleString('en-IN')} {nearestZone.label}</span></div>}
        {stance && <div className="ins4-strip-item"><span className="ins4-sl">BIAS</span><span className="ins4-sv">{stance.bias}</span></div>}
        <div className="ins4-strip-item ins4-strip-right"><span className="ins4-sl">{weekend ? 'WEEKEND' : slot.toUpperCase()}</span><span className="ins4-sv">{dateStr} · {timeStr}</span></div>
      </div>

      {/* INDIA INDICES GRID */}
      <div className="ins4-section">
        <div className="ins4-section-label">INDIA INDICES</div>
        <div className="ins4-india-grid">
          <IndexCard label="Nifty 50"   d={nifty}     main flag="🇮🇳" />
          <IndexCard label="Bank Nifty" d={banknifty}      flag="🇮🇳" />
          <IndexCard label="Fin Nifty"  d={finnifty}       flag="🇮🇳" />
          <IndexCard label="Sensex"     d={sensex}         flag="🇮🇳" />
        </div>
      </div>

      {/* GLOBAL INDICES GRID */}
      <div className="ins4-section ins4-section-noborder">
        <div className="ins4-section-label">GLOBAL + GIFT NIFTY</div>
        <div className="ins4-bench-grid">
          <BenchCard label="Gift Nifty" d={giftnifty} flag="🇮🇳" />
          <BenchCard label="S&P 500"    d={sp500}     flag="🇺🇸" />
          <BenchCard label="Nasdaq"     d={nasdaq}    flag="🇺🇸" />
          <BenchCard label="Nikkei 225" d={nikkei}    flag="🇯🇵" />
          <BenchCard label="Hang Seng"  d={hangseng}  flag="🇭🇰" />
          {data.dax  && <BenchCard label="DAX"        d={data.dax}       flag="🇩🇪" />}
          {data.ftse && <BenchCard label="FTSE 100"   d={data.ftse}      flag="🇬🇧" />}
          {data.shanghai && <BenchCard label="Shanghai" d={data.shanghai} flag="🇨🇳" />}
        </div>
      </div>

      {/* COMMODITIES */}
      <div className="ins4-section">
        <div className="ins4-section-label">COMMODITIES</div>
        <div className="ins4-commod-grid">
          {COMMODITIES.map((c, i) => {
            const d = data[c.id];
            if (!d?.price) return null;
            const gain = (d.changePct ?? 0) >= 0;
            return (
              <div key={i} className="ins4-commod-card" style={{ borderTopColor: gain ? 'rgba(0,200,150,0.4)' : 'rgba(255,68,85,0.4)' }}>
                <div className="ins4-commod-card-name">{c.label}</div>
                <div className="ins4-commod-card-price">{fmtF(d.price, c.dec)}</div>
                <div className="ins4-commod-card-row">
                  <span className="ins4-commod-card-unit">{c.unit}</span>
                  <span className="ins4-commod-card-pct" style={{color: pColor(d.changePct)}}>{fmtPct(d.changePct)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {commodCtx.length > 0 && (
          <div className="ins4-commod-ctx-bar">
            {commodCtx.map((c, i) => (
              <div key={i} className={`ins4-commod-ctx-item ins4-ctx-${c.type}`}>{c.text}</div>
            ))}
          </div>
        )}
      </div>

      {/* MAIN ANALYSIS GRID */}
      <div className="ins4-grid">

        {/* SESSION BRIEF (2 cols) */}
        <div className="ins4-card ins4-brief-card ins4-col2">
          <div className="ins4-card-hdr">
            <span className="ins4-card-title">SESSION BRIEF</span>
            {briefLoading
              ? <span className="ins4-badge ins4-badge-loading">GENERATING</span>
              : brief?.cached
                ? <span className="ins4-badge ins4-badge-cached">CACHED</span>
                : <span className="ins4-badge ins4-badge-live">LIVE</span>}
            {brief?.generatedAt && !briefLoading && (
              <span className="ins4-badge-time">{new Date(brief.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            )}
          </div>

          {/* LAST SESSION STRIP */}
          {(niftyPrevClose || prevFii !== null) && (
            <div className="ins4-last-session">
              <span className="ins4-ls-label">LAST SESSION</span>
              {niftyPrevClose && <span className="ins4-ls-item"><span className="ins4-ls-key">Nifty close</span><span className="ins4-ls-val">{fmtP(niftyPrevClose)}</span></span>}
              {bnPrevClose    && <span className="ins4-ls-item"><span className="ins4-ls-key">BankNifty close</span><span className="ins4-ls-val">{fmtP(bnPrevClose)}</span></span>}
              {prevFii !== null && <span className="ins4-ls-item"><span className="ins4-ls-key">FII</span><span className="ins4-ls-val" style={{color: prevFii >= 0 ? 'var(--gain)' : 'var(--loss)'}}>{prevFii >= 0 ? '+' : ''}Rs.{Math.abs(prevFii).toLocaleString('en-IN')} Cr</span></span>}
              {prevDii !== null && <span className="ins4-ls-item"><span className="ins4-ls-key">DII</span><span className="ins4-ls-val" style={{color: prevDii >= 0 ? 'var(--gain)' : 'var(--loss)'}}>{prevDii >= 0 ? '+' : ''}Rs.{Math.abs(prevDii).toLocaleString('en-IN')} Cr</span></span>}
              {prevDate && <span className="ins4-ls-date">{new Date(prevDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
            </div>
          )}

          {weekend ? (
            <div className="ins4-weekend-note">Indian markets are closed on weekends. The brief generates during market hours Monday to Friday.</div>
          ) : briefLoading ? (
            <div className="ins4-loading-row"><div className="ins4-spinner" /><span>Reading live market data and current news...</span></div>
          ) : brief?.trader ? (
            <div className="ins4-bp-grid">
              <BriefPanel title="Intraday Traders" accent="#4A9EFF" items={brief.trader} />
              <BriefPanel title="Positional / Investors" accent="#A78BFA" items={brief.investor} />
            </div>
          ) : (
            <div className="ins4-weekend-note">Brief unavailable. Try refreshing the page.</div>
          )}
          <div className="ins4-brief-src">{brief?.fallback ? 'Generated from live market data using rule-based logic. Set up AI key for news-grounded briefs.' : 'AI-generated with live news and search. Refreshed each session window.'}</div>
        </div>

        {/* MARKET STANCE (1 col) */}
        {stance && (
          <div className="ins4-card ins4-stance-card" style={{background: stance.bg, borderLeftColor: stance.color}}>
            <div className="ins4-card-title">MARKET STANCE</div>
            <div className="ins4-stance-icon" style={{color: stance.color}}>{stance.icon}</div>
            <div className="ins4-stance-label" style={{color: stance.color}}>{stance.label}</div>
            <div className="ins4-stance-bias">{stance.bias}</div>
            <div className="ins4-stance-conf"><span className="ins4-sl">CONFIDENCE</span><span style={{color: stance.color, fontFamily:'var(--mono)', fontSize:13, fontWeight:700}}>{stance.confidence}</span></div>
            <ul className="ins4-stance-reasons">
              {stance.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* PRICE ZONES */}
        {zones && (
          <div className="ins4-card">
            <div className="ins4-card-title">PRICE ZONES</div>
            {zones.map((z, i) => (
              <div key={i} className={`ins4-zone ins4-zone-${z.type}`}>
                <div className="ins4-zone-label">{z.label}</div>
                <div className="ins4-zone-level" style={{color: z.type==='support'?'var(--gain)':'var(--loss)'}}>{z.level.toLocaleString('en-IN')}</div>
                <div className="ins4-zone-dist">{z.dist > 0 ? '+' : ''}{z.dist}%</div>
              </div>
            ))}
            <div className="ins4-note">Areas of historical significance. Not predictions.</div>
          </div>
        )}

        {/* SESSION CHARACTER + GLOBAL TONE */}
        <div className="ins4-card ins4-stack">
          {sesChar && (
            <div className="ins4-seschar" style={{borderLeftColor: sesChar.color}}>
              <div className="ins4-card-title">SESSION CHARACTER</div>
              <div className="ins4-seschar-label" style={{color: sesChar.color}}>{sesChar.label}</div>
              <div className="ins4-seschar-expl">{sesChar.expl}</div>
            </div>
          )}
          {global && (
            <div className="ins4-global">
              <div className="ins4-card-title">GLOBAL TONE <span className="ins4-global-bias" style={{color: global.biasColor}}>{global.bias}</span></div>
              {global.items.map((g, i) => (
                <div key={i} className="ins4-global-row">
                  <span className="ins4-global-name">{g.label}</span>
                  <span style={{color: pColor(g.pct), fontFamily:'var(--mono)', fontSize:13, fontWeight:700}}>{fmtPct(g.pct)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* INSTITUTIONAL FLOWS */}
        <div className="ins4-card">
          <div className="ins4-card-title">INSTITUTIONAL FLOWS</div>
          {fiiNet !== null ? (
            <>
              <div className="ins4-inst-grid">
                {[
                  { who: 'FII / FPI', net: fiiNet },
                  { who: 'DII',       net: diiNet ?? 0 },
                  { who: 'FII 5-Day', net: fii5d ?? 0 },
                ].map((c, i) => (
                  <div key={i} className="ins4-inst-card">
                    <div className="ins4-sl">{c.who}</div>
                    <div className="ins4-inst-dir" style={{color: c.net >= 0 ? 'var(--gain)' : 'var(--loss)'}}>{c.net >= 0 ? 'Buying' : 'Selling'}</div>
                    <div className="ins4-inst-amt">{c.net >= 0 ? '+' : ''}Rs.{Math.abs(c.net).toLocaleString('en-IN')} Cr</div>
                  </div>
                ))}
              </div>
              {fiiCtx && <div className="ins4-note ins4-note-top">{fiiCtx}</div>}
            </>
          ) : <div className="ins4-note">Loading institutional data...</div>}
        </div>

        {/* SCENARIOS */}
        {scenarios && (
          <div className="ins4-card">
            <div className="ins4-card-title">SCENARIOS</div>
            {scenarios.map((s, i) => (
              <div key={i} className={`ins4-scenario ins4-sc-${s.type}`}>
                <div className="ins4-sc-if">{s.if}</div>
                <div className="ins4-sc-arrow">then</div>
                <div className="ins4-sc-then">{s.then}</div>
              </div>
            ))}
            {commodCtx.length > 0 && (
              <>
                <div className="ins4-card-title" style={{marginTop:14}}>COMMODITY SCENARIOS</div>
                {data.crude?.price && (
                  <div className="ins4-scenario ins4-sc-neutral">
                    <div className="ins4-sc-if">Crude breaks below {Math.round(data.crude.price * 0.97)} USD</div>
                    <div className="ins4-sc-arrow">then</div>
                    <div className="ins4-sc-then">Energy sector stocks face pressure. Positive for inflation outlook.</div>
                  </div>
                )}
                {data.gold?.price && (
                  <div className="ins4-scenario ins4-sc-neutral">
                    <div className="ins4-sc-if">Gold sustains above {Math.round(data.gold.price / 10) * 10} USD</div>
                    <div className="ins4-sc-arrow">then</div>
                    <div className="ins4-sc-then">Risk-off global bias continues. Defensive positioning likely to increase.</div>
                  </div>
                )}
              </>
            )}
            <div className="ins4-note">Scenario frameworks from key levels. Not predictions.</div>
          </div>
        )}

        {/* ECONOMIC CALENDAR */}
        <div className="ins4-card ins4-col-wider">
          <div className="ins4-card-title">ECONOMIC CALENDAR <span style={{fontWeight:400,opacity:.5,letterSpacing:0,fontSize:10}}>next 7 days</span></div>
          {events.length > 0 ? (
            <div className="ins4-econ-list">
              {events.map((e, i) => (
                <div key={i} className="ins4-econ-row">
                  <div className="ins4-econ-meta">
                    <span className="ins4-econ-date">{fmtEvtDate(e.date)}</span>
                    <span className={`ins4-econ-ctry ins4-ctry-${e.country === 'India' ? 'india' : 'global'}`}>{e.country}</span>
                  </div>
                  <div className="ins4-econ-body">
                    <div className="ins4-econ-event">{e.event}</div>
                    <div className="ins4-econ-note">{e.note}</div>
                  </div>
                  <div className={`ins4-econ-imp ins4-imp-${e.impact}`}>{e.impact}</div>
                </div>
              ))}
            </div>
          ) : <div className="ins4-note">No major events in next 7 days.</div>}
        </div>

      </div>

      {/* WRITE-UP */}
      {(brief?.writeup || (briefLoading && !weekend)) && (
        <div className="ins4-writeup-wrap">
          <button className="ins4-writeup-toggle" onClick={() => setWriteupOpen(v => !v)}>
            <span>{slot.toUpperCase()} WRITE-UP <span className="ins4-writeup-tag">2 min read</span></span>
            <span className="ins4-writeup-chevron">{writeupOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {writeupOpen && (
            <div className="ins4-writeup-body">
              {briefLoading ? (
                <div className="ins4-loading-row"><div className="ins4-spinner" /><span>Generating writeup...</span></div>
              ) : brief?.writeup ? (
                brief.writeup.split('\n').filter(p => p.trim()).map((para, i) => (
                  <p key={i} className="ins4-writeup-para">{para.trim()}</p>
                ))
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* HOW TO READ */}
      <HowToRead />

      <div className="ins4-footer">
        Data-driven market summary for educational purposes only. Not a recommendation to buy or sell securities, commodities, or derivatives.
        Data sourced from market feeds via Kite Connect and NSE. AI brief uses live search and is refreshed each session window.
      </div>
    </div>
  );
}
