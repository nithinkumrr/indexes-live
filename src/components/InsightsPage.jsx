import { useState, useEffect, useCallback } from 'react';

// ─── Economic calendar ────────────────────────────────────────────────────────
const ECON_EVENTS = [
  { date: '2026-03-29', event: 'BOJ Policy Rate (Japan)',           impact: 'high',   country: 'Global', note: 'Bank of Japan rate decision. Yen moves spill into Asian markets.' },
  { date: '2026-03-30', event: 'Germany Inflation (Preliminary)',  impact: 'high',   country: 'Global', note: 'Eurozone inflation proxy. Shapes ECB rate expectations.' },
  { date: '2026-03-31', event: 'China Manufacturing PMI',          impact: 'medium', country: 'Global', note: 'Below 50 = contraction. Bearish for metals and commodity stocks.' },
  { date: '2026-04-01', event: 'India GST Collections',            impact: 'medium', country: 'India',  note: 'Consumption proxy. Strong collections = positive for growth narrative.' },
  { date: '2026-04-03', event: 'US Non-Farm Payrolls (NFP)',       impact: 'high',   country: 'Global', note: 'Biggest monthly mover. Strong NFP delays Fed cuts, weak NFP accelerates them. Impacts FII flows.' },
  { date: '2026-04-03', event: 'US Unemployment Rate',             impact: 'high',   country: 'Global', note: 'Released with NFP. Fed watches this closely.' },
  { date: '2026-04-08', event: 'RBI Monetary Policy Decision',     impact: 'high',   country: 'India',  note: 'Most important domestic event. Rate move impacts equities, bonds, and banking stocks. Prev: 5.25%.' },
  { date: '2026-04-10', event: 'US CPI Inflation',                 impact: 'high',   country: 'Global', note: 'Above forecast = dollar strengthens, FIIs reduce EM exposure.' },
  { date: '2026-04-10', event: 'China CPI Inflation',              impact: 'high',   country: 'Global', note: 'Deflation risk in China is bearish for metals and commodities.' },
  { date: '2026-04-17', event: 'China GDP Q1 2026',                impact: 'high',   country: 'Global', note: 'Directly impacts commodity prices and global risk appetite.' },
  { date: '2026-04-20', event: 'China PBOC Rate Decision',         impact: 'high',   country: 'Global', note: 'China easing is positive for risk assets and commodity-linked Indian stocks.' },
  { date: '2026-04-29', event: 'US Fed FOMC Rate Decision',        impact: 'high',   country: 'Global', note: 'Federal Reserve policy. Most impactful global event for FII flows into India. Prev: 3.50-3.75%.' },
  { date: '2026-04-30', event: 'US GDP Advance Estimate Q1 2026', impact: 'high',   country: 'Global', note: 'First read on US Q1 growth. Weak GDP accelerates Fed cut expectations.' },
  { date: '2026-04-30', event: 'ECB Rate Decision',                impact: 'high',   country: 'Global', note: 'ECB easing supports global risk appetite.' },
];

// ─── Rule engine ──────────────────────────────────────────────────────────────
function getStance(np, bp) {
  if (np === null) return null;
  if (np < -1.5 && bp !== null && bp < -1.5) return { label: 'Strong Bear', color: '#FF4455', bg: 'rgba(255,68,85,.1)', icon: '↓↓', confidence: 'High', bias: 'Selling on rallies', reasons: ['Broad decline across Nifty and BankNifty', 'Sustained selling pressure in large caps'] };
  if (np < -0.7)  return { label: 'Bearish',     color: '#F59E0B', bg: 'rgba(245,158,11,.08)', icon: '↓',  confidence: 'Medium', bias: 'Cautious, negative bias', reasons: ['Nifty declining more than 0.7%', 'Price momentum is negative'] };
  if (np > 1.5 && bp !== null && bp > 1.5) return { label: 'Strong Bull', color: '#00C896', bg: 'rgba(0,200,150,.1)',  icon: '↑↑', confidence: 'High', bias: 'Dips being bought', reasons: ['Broad advance across Nifty and BankNifty', 'Sustained buying across large caps'] };
  if (np > 0.7)   return { label: 'Bullish',     color: '#00C896', bg: 'rgba(0,200,150,.08)', icon: '↑',  confidence: 'Medium', bias: 'Positive bias', reasons: ['Nifty advancing more than 0.7%', 'Price momentum is positive'] };
  return            { label: 'Neutral',           color: 'var(--text2)', bg: 'var(--bg3)',             icon: '→',  confidence: 'Low', bias: 'Neutral range', reasons: ['Nifty within ±0.7%', 'No dominant directional bias'] };
}

function getVolatility(np) {
  if (np === null) return null;
  const a = Math.abs(np);
  if (a > 1.5) return { label: 'High',     color: '#FF4455' };
  if (a > 0.7) return { label: 'Moderate', color: '#F59E0B' };
  return             { label: 'Low',      color: '#00C896' };
}

function getSessionChar(price, high, low) {
  if (!price || !high || !low || high === low) return null;
  const rel = (price - low) / (high - low);
  if (rel < 0.25) return { label: 'Near Low',  color: '#FF4455', expl: 'Sustained selling into close. Weak sentiment going into next session.' };
  if (rel > 0.75) return { label: 'Near High', color: '#00C896', expl: 'Buyers held ground through session. Constructive close.' };
  return               { label: 'Mid-Range',  color: 'var(--text2)', expl: 'Neither side decisive by close.' };
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
    { if: `Nifty reclaims ${res.toLocaleString('en-IN')}`, then: 'Short covering activity possible. Watch for follow-through', type: 'bull' },
    { if: `Range between ${sup.toLocaleString('en-IN')} and ${res.toLocaleString('en-IN')} holds`, then: 'Consolidation phase continues. Directional move on breakout', type: 'neutral' },
  ];
}

function getCommodityContext(data) {
  const gold  = data.gold;
  const crude = data.crude;
  const silver= data.silver;
  const natgas= data.natgas;
  const lines = [];
  if (crude?.changePct !== null && crude?.changePct !== undefined) {
    if (crude.changePct < -1) lines.push({ text: 'Crude falling sharply. Negative for energy stocks, positive for inflation outlook.', type: 'bear' });
    else if (crude.changePct > 1) lines.push({ text: 'Crude rising. Energy stocks may outperform. Watch inflation implications.', type: 'bull' });
    else lines.push({ text: 'Crude stable. Neutral impact on energy sector.', type: 'neutral' });
  }
  if (gold?.changePct !== null && gold?.changePct !== undefined) {
    if (gold.changePct > 0.5) lines.push({ text: 'Gold rising. Risk-off positioning visible. Defensive bias in global markets.', type: 'neutral' });
    else if (gold.changePct < -0.5) lines.push({ text: 'Gold declining. Risk appetite returning globally.', type: 'bull' });
  }
  return lines;
}

// ─── IST / slot helpers ───────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtP   = v => v ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
const fmtF   = (v, d=2) => v ? v.toLocaleString('en-IN', { maximumFractionDigits: d }) : '—';
const fmtPct = v => v !== null && v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
const pColor  = v => (!v && v !== 0) ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';

// ─── Sub-components ────────────────────────────────────────────────────────────
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

function HowToRead() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ins4-how">
      <button className="ins4-how-btn" onClick={() => setOpen(v => !v)}>How to read this page <span>{open ? '▲' : '▼'}</span></button>
      {open && (
        <div className="ins4-how-body">
          <p>This page describes market conditions using price data, news, and open interest. It is a thinking tool for market participants, not investment advice.</p>
          <ul>
            <li><strong>Session Brief</strong> — AI-generated using live data and current news. Refreshes once per session window.</li>
            <li><strong>Market Stance</strong> — directional character based on index movement rules.</li>
            <li><strong>Price Zones</strong> — historical support and resistance levels near current price.</li>
            <li><strong>Scenarios</strong> — if-then frameworks based on key levels. Not predictions.</li>
            <li><strong>Economic Calendar</strong> — upcoming high-impact events for the next 7 days.</li>
            <li><strong>Write-Up</strong> — narrative read covering news, OI, results, and global context.</li>
          </ul>
          <p style={{fontSize:11,color:'var(--text3)',marginTop:8}}>Not a recommendation to buy or sell. Educational use only.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
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
    };
    fetch('/api/insights-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json()).then(d => { setBrief(d); setBriefLoading(false); })
      .catch(() => setBriefLoading(false));
  }, [data, nseData, fiidii]);

  useEffect(() => {
    fetchBrief();// fire immediately
    // no delay needed
    // no cleanup needed
  }, [fiidii]);

  // ── Data ──
  const nifty     = nseData.nifty50   || data.nifty50   || null;
  const banknifty = nseData.banknifty || data.banknifty || null;
  const finnifty  = nseData.niftyfinservice || data.niftyfinservice || null;
  const sensex    = nseData.sensex    || data.sensex    || null;
  const giftnifty = data.giftnifty    || null;
  const np        = nifty?.changePct ?? null;
  const bp        = banknifty?.changePct ?? null;

  const stance   = getStance(np, bp);
  const vol      = getVolatility(np);
  const sesChar  = getSessionChar(nifty?.price, nifty?.high, nifty?.low);
  const zones    = getZones(nifty?.price);
  const scenarios= getScenarios(nifty?.price, np);
  const global   = getGlobal(data);
  const commodCtx= getCommodityContext(data);

  const fiiNet   = fiidii?.history?.slice(-1)[0]?.fii?.net ?? null;
  const diiNet   = fiidii?.history?.slice(-1)[0]?.dii?.net ?? null;
  const fii5d    = fiidii?.history?.slice(-5).reduce((s, d) => s + (d.fii?.net || 0), 0) ?? null;
  let fiiCtx = '';
  if (fiiNet !== null) {
    if (fiiNet < 0 && (diiNet ?? 0) > 0)      fiiCtx = 'FIIs selling, DIIs absorbing. Domestic institutions cushioning the market.';
    else if (fiiNet > 0 && (diiNet ?? 0) > 0) fiiCtx = 'Both FIIs and DIIs buying. Broad institutional conviction.';
    else if (fiiNet < 0 && (diiNet ?? 0) < 0) fiiCtx = 'Both FIIs and DIIs selling. No domestic support.';
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
    { id: 'gold',   label: 'Gold',        unit: 'USD/oz' },
    { id: 'crude',  label: 'Crude WTI',   unit: 'USD/bbl' },
    { id: 'silver', label: 'Silver',      unit: 'USD/oz' },
    { id: 'natgas', label: 'Natural Gas', unit: 'USD/mmBtu' },
  ];

  return (
    <div className="ins4-wrap">

      {/* ROW 1 — What Matters Now strip */}
      <div className="ins4-strip">
        {stance && <div className="ins4-strip-item"><span className="ins4-sl">TREND</span><span className="ins4-sv" style={{color:stance.color}}>{stance.icon} {stance.label}</span></div>}
        {vol && <div className="ins4-strip-item"><span className="ins4-sl">VIX / VOL</span><span className="ins4-sv" style={{color:vol.color}}>{nseData.vix ? nseData.vix.toFixed(1) + ' · ' : ''}{vol.label}</span></div>}
        {nearestZone && <div className="ins4-strip-item"><span className="ins4-sl">NEAREST LEVEL</span><span className="ins4-sv" style={{color: nearestZone.type==='support'?'var(--gain)':'var(--loss)'}}>{nearestZone.level.toLocaleString('en-IN')} {nearestZone.label}</span></div>}
        {stance && <div className="ins4-strip-item"><span className="ins4-sl">BIAS</span><span className="ins4-sv">{stance.bias}</span></div>}
        <div className="ins4-strip-item ins4-strip-right"><span className="ins4-sl">{weekend ? 'WEEKEND' : slot.toUpperCase()}</span><span className="ins4-sv">{dateStr} · {timeStr}</span></div>
      </div>

      {/* ROW 2 — Indices (60%) + Commodities (40%) */}
      <div className="ins4-row2">
        <div className="ins4-indices">
          {[
            { label: 'Nifty 50',   d: nifty,     main: true },
            { label: 'Bank Nifty', d: banknifty              },
            { label: 'Fin Nifty',  d: finnifty               },
            { label: 'Sensex',     d: sensex                  },
            { label: 'Gift Nifty', d: giftnifty               },
          ].map((item, i) => item.d?.price ? (
            <div key={i} className={`ins4-idx ${item.main ? 'ins4-idx-main' : ''}`}>
              <div className="ins4-idx-name">{item.label}</div>
              <div className="ins4-idx-price">{fmtP(item.d.price)}</div>
              <div className="ins4-idx-chg" style={{color: pColor(item.d.changePct)}}>{fmtPct(item.d.changePct)}</div>
              {item.d.high && item.d.low && <div className="ins4-idx-hl">H {fmtP(item.d.high)} · L {fmtP(item.d.low)}</div>}
            </div>
          ) : null)}
        </div>
        <div className="ins4-commodities">
          <div className="ins4-commod-title">COMMODITIES</div>
          {COMMODITIES.map((c, i) => {
            const d = data[c.id];
            if (!d?.price) return null;
            return (
              <div key={i} className="ins4-commod-row">
                <div className="ins4-commod-left">
                  <span className="ins4-commod-name">{c.label}</span>
                  <span className="ins4-commod-unit">{c.unit}</span>
                </div>
                <div className="ins4-commod-right">
                  <span className="ins4-commod-price">{fmtF(d.price, c.id === 'natgas' ? 3 : 1)}</span>
                  <span className="ins4-commod-pct" style={{color: pColor(d.changePct)}}>{fmtPct(d.changePct)}</span>
                </div>
              </div>
            );
          })}
          {commodCtx.length > 0 && (
            <div className="ins4-commod-ctx">
              {commodCtx.map((c, i) => (
                <div key={i} className={`ins4-commod-ctx-line ins4-ctx-${c.type}`}>{c.text}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="ins4-grid">

        {/* ROW 3: Session Brief (65%) + Stance (35%) */}
        <div className="ins4-card ins4-brief-card ins4-col2">
          <div className="ins4-card-hdr">
            <span className="ins4-card-title">SESSION BRIEF</span>
            {briefLoading ? <span className="ins4-badge ins4-badge-loading">GENERATING</span>
              : brief?.cached ? <span className="ins4-badge ins4-badge-cached">CACHED</span>
              : <span className="ins4-badge ins4-badge-live">LIVE</span>}
            {brief?.generatedAt && !briefLoading && (
              <span className="ins4-badge-time">{new Date(brief.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            )}
          </div>
          {weekend ? (
            <div className="ins4-weekend-note">Indian markets are closed on weekends. The brief generates during market hours: Pre-Market (before 9 AM) through Post-Market (after 6 PM), Monday to Friday.</div>
          ) : briefLoading ? (
            <div className="ins4-loading-row"><div className="ins4-spinner" /><span>Reading live market data, news, OI levels...</span></div>
          ) : brief?.trader ? (
            <div className="ins4-bp-grid">
              <BriefPanel title="Intraday" accent="#4A9EFF" items={brief.trader} />
              <BriefPanel title="Positional" accent="#A78BFA" items={brief.investor} />
            </div>
          ) : (
            <div className="ins4-weekend-note">Brief unavailable.</div>
          )}
          <div className="ins4-brief-src">{brief?.fallback ? 'Rule-based. Add GEMINI_API_KEY to Vercel for AI briefs with live news.' : 'Gemini + Google Search. Once per session window.'}</div>
        </div>

        {stance && (
          <div className="ins4-card ins4-stance-card" style={{background: stance.bg, borderLeftColor: stance.color}}>
            <div className="ins4-card-title">MARKET STANCE</div>
            <div className="ins4-stance-icon" style={{color: stance.color}}>{stance.icon}</div>
            <div className="ins4-stance-label" style={{color: stance.color}}>{stance.label}</div>
            <div className="ins4-stance-bias">{stance.bias}</div>
            <div className="ins4-stance-conf"><span className="ins4-sl">CONFIDENCE</span><span style={{color: stance.color, fontFamily:'var(--mono)', fontSize: 12, fontWeight:700}}>{stance.confidence}</span></div>
            <ul className="ins4-stance-reasons">
              {stance.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {/* ROW 4: Zones (33%) + Session+Global (34%) + Institutional (33%) */}
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
            <div className="ins4-note">Areas of historical activity. Not predictions.</div>
          </div>
        )}

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
              <div className="ins4-card-title">GLOBAL <span className="ins4-global-bias" style={{color: global.biasColor}}>{global.bias}</span></div>
              {global.items.map((g, i) => (
                <div key={i} className="ins4-global-row">
                  <span className="ins4-global-name">{g.label}</span>
                  <span style={{color: pColor(g.pct), fontFamily:'var(--mono)', fontSize:12, fontWeight:700}}>{fmtPct(g.pct)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="ins4-card">
          <div className="ins4-card-title">INSTITUTIONAL</div>
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
                    <div className="ins4-inst-amt">{c.net >= 0 ? '+' : ''}₹{Math.abs(c.net).toLocaleString('en-IN')} Cr</div>
                  </div>
                ))}
              </div>
              {fiiCtx && <div className="ins4-note ins4-note-top">{fiiCtx}</div>}
            </>
          ) : <div className="ins4-note">Loading...</div>}
        </div>

        {/* ROW 5: Scenarios (40%) + Economic Calendar (60%) */}
        {scenarios && (
          <div className="ins4-card">
            <div className="ins4-card-title">SCENARIOS</div>
            {scenarios.map((s, i) => (
              <div key={i} className={`ins4-scenario ins4-sc-${s.type}`}>
                <div className="ins4-sc-if">{s.if}</div>
                <div className="ins4-sc-arrow">→</div>
                <div className="ins4-sc-then">{s.then}</div>
              </div>
            ))}
            {commodCtx.length > 0 && (
              <>
                <div className="ins4-card-title" style={{marginTop:12}}>COMMODITY SCENARIOS</div>
                {data.crude?.price && (
                  <div className="ins4-scenario ins4-sc-neutral">
                    <div className="ins4-sc-if">If crude breaks below {Math.round((data.crude.price * 0.97) / 1) * 1} USD</div>
                    <div className="ins4-sc-arrow">→</div>
                    <div className="ins4-sc-then">Energy sector stocks likely to face pressure. Positive for inflation.</div>
                  </div>
                )}
                {data.gold?.price && (
                  <div className="ins4-scenario ins4-sc-neutral">
                    <div className="ins4-sc-if">If gold sustains above {Math.round(data.gold.price / 10) * 10} USD</div>
                    <div className="ins4-sc-arrow">→</div>
                    <div className="ins4-sc-then">Risk-off global bias. Defensive positioning may increase.</div>
                  </div>
                )}
              </>
            )}
            <div className="ins4-note">Scenario frameworks based on key levels. Not predictions.</div>
          </div>
        )}

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
          <div className="ins4-note ins4-note-top">Source: Zerodha Markets economic calendar.</div>
        </div>

      </div>

      {/* ROW 6 — Write-up (collapsible) */}
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

      <HowToRead />

      <div className="ins4-footer">
        This is a data-driven market summary for educational purposes. Not a recommendation to buy or sell securities.
        Data from Kite Connect and NSE. AI brief by Gemini with Google Search grounding.
      </div>
    </div>
  );
}
