import { useState, useEffect, useCallback } from 'react';

// ── Economic calendar ─────────────────────────────────────────────────────────
const ECON_EVENTS = [
  { date: '2026-03-29', event: 'BOJ Policy Rate',            impact: 'high',   country: 'Global', note: 'Bank of Japan rate decision. Yen moves spill into Asian markets and Indian IT/export stocks.' },
  { date: '2026-03-30', event: 'Germany Inflation (Prelim)', impact: 'high',   country: 'Global', note: 'Eurozone inflation proxy. Shapes ECB rate expectations.' },
  { date: '2026-03-31', event: 'China Manufacturing PMI',    impact: 'medium', country: 'Global', note: 'Below 50 = contraction. Bearish for metals and commodity stocks.' },
  { date: '2026-04-01', event: 'India GST Collections',      impact: 'medium', country: 'India',  note: 'Consumption proxy. Strong collections positive for domestic growth narrative.' },
  { date: '2026-04-03', event: 'US Non-Farm Payrolls',       impact: 'high',   country: 'Global', note: 'Biggest monthly mover. Strong NFP delays Fed cuts. Directly drives FII flows into India.' },
  { date: '2026-04-03', event: 'US Unemployment Rate',       impact: 'high',   country: 'Global', note: 'Released with NFP. Fed watches this for labour market signals.' },
  { date: '2026-04-08', event: 'RBI Monetary Policy',        impact: 'high',   country: 'India',  note: 'Most important domestic event. Rate move impacts equities, bonds, banking stocks. Prev: 5.25%.' },
  { date: '2026-04-10', event: 'US CPI Inflation',           impact: 'high',   country: 'Global', note: 'Above forecast = dollar strengthens, FIIs reduce EM exposure, gold rallies.' },
  { date: '2026-04-10', event: 'China CPI Inflation',        impact: 'high',   country: 'Global', note: 'Deflation risk in China is bearish for metals, crude, and commodity-linked Indian stocks.' },
  { date: '2026-04-17', event: 'China GDP Q1 2026',          impact: 'high',   country: 'Global', note: 'Directly impacts commodity prices. Weak print pressures metals and crude.' },
  { date: '2026-04-20', event: 'China PBOC Rate Decision',   impact: 'high',   country: 'Global', note: 'China easing is positive for risk assets and commodity-linked Indian stocks.' },
  { date: '2026-04-29', event: 'US Fed FOMC Decision',       impact: 'high',   country: 'Global', note: 'Federal Reserve policy. Biggest driver of FII flows into India. Prev: 3.50-3.75%.' },
  { date: '2026-04-30', event: 'US GDP Q1 Advance',          impact: 'high',   country: 'Global', note: 'First read on US Q1 growth. Weak print accelerates Fed cut expectations.' },
  { date: '2026-04-30', event: 'ECB Rate Decision',          impact: 'high',   country: 'Global', note: 'ECB easing supports global risk appetite and EM inflows.' },
];

// ── Stance ────────────────────────────────────────────────────────────────────
function getStance(np, bp) {
  if (np === null) return null;
  if (np < -1.5 && bp !== null && bp < -1.5) return { label: 'Strong Bear', color: '#FF4455', bg: 'rgba(255,68,85,.07)', border: 'rgba(255,68,85,.3)', icon: '↓↓', confidence: 'High',   bias: 'Selling on rallies',      reasons: ['Broad decline across Nifty and Bank Nifty', 'Sustained selling pressure in large caps'] };
  if (np < -0.7)  return { label: 'Bearish',     color: '#F59E0B', bg: 'rgba(245,158,11,.06)', border: 'rgba(245,158,11,.3)', icon: '↓',  confidence: 'Medium', bias: 'Cautious, negative bias',  reasons: ['Nifty declining more than 0.7%', 'Price momentum is negative'] };
  if (np > 1.5 && bp !== null && bp > 1.5) return { label: 'Strong Bull', color: '#00C896', bg: 'rgba(0,200,150,.07)',  border: 'rgba(0,200,150,.3)',  icon: '↑↑', confidence: 'High',   bias: 'Dips being bought',       reasons: ['Broad advance across Nifty and Bank Nifty', 'Sustained buying across large caps'] };
  if (np > 0.7)   return { label: 'Bullish',     color: '#00C896', bg: 'rgba(0,200,150,.06)',  border: 'rgba(0,200,150,.25)', icon: '↑',  confidence: 'Medium', bias: 'Positive bias',           reasons: ['Nifty advancing more than 0.7%', 'Price momentum is positive'] };
  return { label: 'Neutral', color: 'var(--text2)', bg: 'var(--bg3)', border: 'var(--border)', icon: '→', confidence: 'Low', bias: 'Neither side in control', reasons: ['Nifty within 0.7% of previous close', 'No dominant directional bias'] };
}

// ── Rule-based signals ────────────────────────────────────────────────────────
function buildSignals({ np, bp, vix, niftyPrice, fiiNet, diiNet, fii7d, dii7d, data, history, allEvents }) {
  const signals = [];
  const cr = v => `Rs.${Math.abs(v).toLocaleString('en-IN')} Cr`;

  // FLOWS — today
  if (fiiNet !== null && diiNet !== null) {
    if      (fiiNet < 0 && diiNet > 0) signals.push({ tag: 'FLOWS', text: `FIIs net sold ${cr(fiiNet)} today. DIIs absorbed ${cr(diiNet)}. Domestic institutions cushioning the fall, limiting downside depth.`, type: 'warn' });
    else if (fiiNet > 0 && diiNet > 0) signals.push({ tag: 'FLOWS', text: `Both FIIs (${cr(fiiNet)}) and DIIs (${cr(diiNet)}) buying today. Broad institutional conviction visible on both sides.`, type: 'bull' });
    else if (fiiNet < 0 && diiNet < 0) signals.push({ tag: 'FLOWS', text: `Both FIIs (${cr(fiiNet)}) and DIIs (${cr(diiNet)}) are net sellers. No institutional support layer under this market right now.`, type: 'bear' });
    else                                signals.push({ tag: 'FLOWS', text: `FIIs buying ${cr(fiiNet)}, DIIs trimming ${cr(Math.abs(diiNet))}. Foreign flows are the dominant support in today's session.`, type: 'bull' });
  }

  // FLOWS — 7-day trend
  if (fii7d !== null && history?.length >= 3) {
    const sellDays = history.slice(-7).filter(d => (d.fiiNet ?? 0) < 0).length;
    if      (fii7d < -8000) signals.push({ tag: 'FLOWS', text: `FIIs have net sold Rs.${Math.abs(fii7d).toLocaleString('en-IN')} Cr over 7 sessions. This is structural outflow pressure, not a single-day event.`, type: 'bear' });
    else if (fii7d > 8000)  signals.push({ tag: 'FLOWS', text: `FIIs have net bought Rs.${fii7d.toLocaleString('en-IN')} Cr over 7 sessions. Consistent foreign inflow is supportive for large-cap index levels.`, type: 'bull' });
    else if (sellDays >= 5) signals.push({ tag: 'FLOWS', text: `FIIs have sold on ${sellDays} of the last 7 sessions. The selling trend is persistent even if daily amounts are moderate.`, type: 'warn' });
  }

  // VOLATILITY
  if (vix != null) {
    if      (vix > 20) signals.push({ tag: 'VOLATILITY', text: `India VIX at ${vix.toFixed(1)} is elevated. Intraday ranges will be wider than usual. Options premiums are inflated. Smaller position sizes are appropriate in this environment.`, type: 'bear' });
    else if (vix > 16) signals.push({ tag: 'VOLATILITY', text: `India VIX at ${vix.toFixed(1)} is moderately high. Expect choppy intraday swings. Market participants are pricing in near-term uncertainty.`, type: 'warn' });
    else if (vix < 12) signals.push({ tag: 'VOLATILITY', text: `India VIX at ${vix.toFixed(1)} is low. Options premiums are compressed. Low VIX environments can precede sudden spikes, often triggered by global events.`, type: 'neutral' });
    else               signals.push({ tag: 'VOLATILITY', text: `India VIX at ${vix.toFixed(1)} is in normal range. Volatility conditions are not a constraint on regular positioning today.`, type: 'neutral' });
  }

  // GLOBAL
  const globIdxs = [{ id: 'sp500', label: 'S&P 500' }, { id: 'nasdaq', label: 'Nasdaq' }, { id: 'nikkei', label: 'Nikkei' }, { id: 'hangseng', label: 'Hang Seng' }, { id: 'dax', label: 'DAX' }];
  const globMoves = globIdxs.map(i => ({ label: i.label, pct: data[i.id]?.changePct ?? null })).filter(i => i.pct !== null);
  if (globMoves.length) {
    const avg = globMoves.reduce((s, i) => s + i.pct, 0) / globMoves.length;
    if      (avg < -0.8) signals.push({ tag: 'GLOBAL', text: `Global markets broadly weak. Average decline across tracked indices is ${avg.toFixed(1)}%. FII flows into India typically come under pressure when global risk-off is this broad.`, type: 'bear' });
    else if (avg > 0.8)  signals.push({ tag: 'GLOBAL', text: `Global markets broadly positive. Average gain across tracked indices is +${avg.toFixed(1)}%. Supportive backdrop for risk assets including Indian equities.`, type: 'bull' });
    else                 signals.push({ tag: 'GLOBAL', text: `Global markets mixed. No strong directional cue from overseas. Indian markets are likely trading on domestic factors today.`, type: 'neutral' });
    const sp = data.sp500?.changePct;
    if (sp != null && Math.abs(sp) > 1.2) signals.push({ tag: 'GLOBAL', text: `S&P 500 moved ${sp > 0 ? 'up' : 'down'} ${Math.abs(sp).toFixed(1)}% in the last session. A move of this size in the US has a read-across for Indian large-cap IT and financial stocks.`, type: sp > 0 ? 'bull' : 'bear' });
  }

  // CRUDE
  const crude = data.crude;
  if (crude?.changePct != null) {
    if      (crude.changePct < -1.5) signals.push({ tag: 'COMMODITY', text: `Crude WTI down ${Math.abs(crude.changePct).toFixed(1)}% at $${crude.price?.toFixed(1)}. Positive for aviation, paints, FMCG. Negative for ONGC, Oil India, and the energy sector.`, type: 'neutral' });
    else if (crude.changePct > 1.5)  signals.push({ tag: 'COMMODITY', text: `Crude WTI up ${crude.changePct.toFixed(1)}% at $${crude.price?.toFixed(1)}. Energy sector may outperform. Inflationary pressure adds caution to RBI rate cut expectations.`, type: 'neutral' });
    else                             signals.push({ tag: 'COMMODITY', text: `Crude WTI stable at $${crude.price?.toFixed(1)} (${crude.changePct >= 0 ? '+' : ''}${crude.changePct.toFixed(1)}%). No significant energy sector impact or inflation signal from crude today.`, type: 'neutral' });
  }

  // GOLD
  const gold = data.gold;
  if (gold?.changePct != null && Math.abs(gold.changePct) > 0.7) {
    if (gold.changePct > 0) signals.push({ tag: 'COMMODITY', text: `Gold up ${gold.changePct.toFixed(1)}% at $${gold.price?.toFixed(0)}. Rising gold signals risk-off positioning globally. Defensive assets preferred over equities in global allocations.`, type: 'warn' });
    else                    signals.push({ tag: 'COMMODITY', text: `Gold down ${Math.abs(gold.changePct).toFixed(1)}% at $${gold.price?.toFixed(0)}. Declining gold suggests improving global risk appetite. Positive read for equities.`, type: 'bull' });
  }

  // COPPER
  const copper = data.copper;
  if (copper?.changePct != null && Math.abs(copper.changePct) > 1) {
    signals.push({ tag: 'COMMODITY', text: `Copper ${copper.changePct > 0 ? 'rising' : 'falling'} ${Math.abs(copper.changePct).toFixed(1)}% at $${copper.price?.toFixed(3)}. Copper tracks global industrial demand. ${copper.changePct > 0 ? 'Improving demand signal. Positive for metals sector stocks.' : 'Weakening demand signal. Watch metals and mining stocks.'}`, type: copper.changePct > 0 ? 'bull' : 'bear' });
  }

  // LEVELS
  if (niftyPrice && np !== null) {
    const s = niftyPrice < 10000 ? 100 : 50;
    const r = v => Math.round(v / s) * s;
    const sup1 = r(niftyPrice * 0.990);
    const res1 = r(niftyPrice * 1.010);
    if      (np < -0.5) signals.push({ tag: 'LEVELS', text: `Nifty down ${Math.abs(np).toFixed(1)}% today. Support at ${sup1.toLocaleString('en-IN')} is ${((niftyPrice - sup1) / niftyPrice * 100).toFixed(1)}% away. A close below this level shifts the structure further negative.`, type: 'bear' });
    else if (np > 0.5)  signals.push({ tag: 'LEVELS', text: `Nifty up ${np.toFixed(1)}% today. Resistance at ${res1.toLocaleString('en-IN')} is ${((res1 - niftyPrice) / niftyPrice * 100).toFixed(1)}% away. Holding above this on close would be constructive.`, type: 'bull' });
    else                signals.push({ tag: 'LEVELS', text: `Nifty flat, trading between support at ${sup1.toLocaleString('en-IN')} and resistance at ${res1.toLocaleString('en-IN')}. Breakout direction from this range will set the next trend.`, type: 'neutral' });

    if (bp !== null && Math.abs(bp - np) > 0.7) {
      if (bp < np) signals.push({ tag: 'LEVELS', text: `Bank Nifty underperforming Nifty by ${(np - bp).toFixed(1)}%. Banking sector weakness is dragging on broader market. Watch PSU banks and private bank names.`, type: 'warn' });
      else         signals.push({ tag: 'LEVELS', text: `Bank Nifty outperforming Nifty by ${(bp - np).toFixed(1)}%. Banking strength is leading the rally. Financials are the dominant driver today.`, type: 'bull' });
    }
  }

  // MACRO
  const today = new Date();
  const rbi = allEvents.find(e => e.event.includes('RBI'));
  if (rbi) { const d = Math.round((new Date(rbi.date) - today) / 86400000); if (d <= 5) signals.push({ tag: 'MACRO', text: `RBI policy decision in ${d} day${d !== 1 ? 's' : ''}. Markets historically move cautious 2 days before RBI. Banking stocks and bonds most sensitive.`, type: 'warn' }); }
  const fed = allEvents.find(e => e.event.includes('FOMC'));
  if (fed) { const d = Math.round((new Date(fed.date) - today) / 86400000); if (d <= 7) signals.push({ tag: 'MACRO', text: `US Fed FOMC in ${d} day${d !== 1 ? 's' : ''}. FII positioning in emerging markets including India typically turns cautious ahead of Fed decisions.`, type: 'warn' }); }

  return signals;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getIST()    { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); }
function getSlot()   {
  const ist = getIST(); const d = ist.getDay(); const m = ist.getHours() * 60 + ist.getMinutes();
  if (d === 0 || d === 6) return 'Weekend';
  if (m < 540) return 'Pre-Market'; if (m < 555) return 'Pre-Open';
  if (m < 750) return 'Opening';    if (m < 870) return 'Mid-Day';
  if (m < 930) return 'Afternoon';  if (m < 1020) return 'Market Close';
  return 'Post-Market';
}
const fmtP   = v => v ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '--';
const fmtF   = (v, d=2) => v != null ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: d }) : '--';
const fmtPct = v => v != null ? `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%` : '--';
const pColor = v => v == null ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';
const prevClose = (price, pct) => (price && pct != null) ? price / (1 + pct / 100) : null;

const TAG_COLORS = {
  FLOWS:      { bg: 'rgba(74,158,255,.12)',  color: '#4A9EFF' },
  VOLATILITY: { bg: 'rgba(245,158,11,.1)',   color: '#F59E0B' },
  GLOBAL:     { bg: 'rgba(167,139,250,.1)',  color: '#A78BFA' },
  COMMODITY:  { bg: 'rgba(251,191,36,.1)',   color: '#FBB724' },
  LEVELS:     { bg: 'rgba(0,200,150,.1)',    color: '#00C896' },
  MACRO:      { bg: 'rgba(255,68,85,.1)',    color: '#FF4455' },
};
const SIGNAL_ICON  = { bull: '▲', bear: '▼', warn: '!', neutral: '·' };
const SIGNAL_COLOR = { bull: 'var(--gain)', bear: 'var(--loss)', warn: '#F59E0B', neutral: 'var(--text3)' };

// ── Cards ─────────────────────────────────────────────────────────────────────
function IndexCard({ label, d, main, flag }) {
  if (!d?.price) return null;
  const gain = (d.changePct ?? 0) >= 0;
  return (
    <div className="ip-idx-card" style={{ borderTopColor: gain ? 'rgba(0,200,150,.5)' : 'rgba(255,68,85,.5)', background: main ? 'var(--bg3)' : 'var(--bg2)' }}>
      <div className="ip-idx-top">{flag && <span className="ip-idx-flag">{flag}</span>}<span className="ip-idx-name">{label}</span></div>
      <div className="ip-idx-price">{fmtP(d.price)}</div>
      <div className="ip-idx-pct" style={{ color: pColor(d.changePct) }}>{gain ? '▲' : '▼'} {Math.abs(d.changePct ?? 0).toFixed(2)}%</div>
      {d.high && d.low && <div className="ip-idx-hl">H {fmtP(d.high)} · L {fmtP(d.low)}</div>}
    </div>
  );
}

function BenchCard({ label, d, flag }) {
  if (!d?.price) return null;
  const gain = (d.changePct ?? 0) >= 0;
  return (
    <div className="ip-bench-card" style={{ borderTopColor: gain ? 'rgba(0,200,150,.4)' : 'rgba(255,68,85,.4)' }}>
      <div className="ip-bench-top">{flag && <span style={{fontSize:12}}>{flag}</span>}<span className="ip-bench-name">{label}</span></div>
      <div className="ip-bench-price">{d.price > 999 ? fmtP(d.price) : fmtF(d.price, 2)}</div>
      <div className="ip-bench-pct" style={{ color: pColor(d.changePct) }}>{gain ? '▲' : '▼'} {fmtPct(d.changePct)}</div>
    </div>
  );
}

function CommCard({ label, unit, d, dec }) {
  if (!d?.price) return null;
  const gain = (d.changePct ?? 0) >= 0;
  return (
    <div className="ip-comm-card" style={{ borderTopColor: gain ? 'rgba(0,200,150,.4)' : 'rgba(255,68,85,.4)' }}>
      <div className="ip-comm-name">{label}</div>
      <div className="ip-comm-price">{fmtF(d.price, dec)}</div>
      <div className="ip-comm-row">
        <span className="ip-comm-unit">{unit}</span>
        <span style={{ color: pColor(d.changePct), fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>{fmtPct(d.changePct)}</span>
      </div>
    </div>
  );
}

function SignalCard({ tag, text, type }) {
  const tc = TAG_COLORS[tag] || { bg: 'var(--bg3)', color: 'var(--text3)' };
  return (
    <div className="ip-signal">
      <div className="ip-signal-left">
        <span className="ip-signal-tag" style={{ background: tc.bg, color: tc.color }}>{tag}</span>
        <span className="ip-signal-icon" style={{ color: SIGNAL_COLOR[type] }}>{SIGNAL_ICON[type]}</span>
      </div>
      <div className="ip-signal-text">{text}</div>
    </div>
  );
}

function FiiBar({ history }) {
  if (!history?.length) return null;
  const last7 = history.slice(-7);
  const maxAbs = Math.max(...last7.map(d => Math.max(Math.abs(d.fiiNet ?? 0), Math.abs(d.diiNet ?? 0))), 1);
  return (
    <div className="ip-fii-bars">
      {last7.map((d, i) => {
        const fii = d.fiiNet ?? 0; const dii = d.diiNet ?? 0;
        const fiiH = Math.abs(fii) / maxAbs * 100;
        const diiH = Math.abs(dii) / maxAbs * 100;
        const dt  = d.date ? new Date(d.date) : null;
        const lbl = dt ? dt.toLocaleDateString('en-IN', { weekday: 'short' }) : `D${i+1}`;
        return (
          <div key={i} className="ip-fii-bar-col">
            <div className="ip-fii-bar-pair">
              <div className="ip-fii-bar-wrap"><div className="ip-fii-bar" style={{ height: `${fiiH}%`, background: fii >= 0 ? 'var(--gain)' : 'var(--loss)' }} title={`FII: ${fii >= 0 ? '+' : ''}${fii.toLocaleString('en-IN')} Cr`} /></div>
              <div className="ip-fii-bar-wrap"><div className="ip-fii-bar" style={{ height: `${diiH}%`, background: dii >= 0 ? '#4A9EFF' : '#F59E0B' }} title={`DII: ${dii >= 0 ? '+' : ''}${dii.toLocaleString('en-IN')} Cr`} /></div>
            </div>
            <div className="ip-fii-bar-lbl">{lbl}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InsightsPage({ data = {}, nseData = {} }) {
  const [fiidii,       setFiidii]   = useState(null);
  const [brief,        setBrief]    = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [clock,        setClock]    = useState(getIST());
  const [slot,         setSlot]     = useState(getSlot());

  useEffect(() => {
    fetch('/api/fiidii').then(r => r.json()).then(setFiidii).catch(() => {});
    const id = setInterval(() => { setClock(getIST()); setSlot(getSlot()); }, 60000);
    return () => clearInterval(id);
  }, []);

  const fetchBrief = useCallback(() => {
    setBriefLoading(true);
    const nifty = nseData.nifty50 || data.nifty50 || {};
    const bn    = nseData.banknifty || data.banknifty || {};
    const np = nifty.changePct ?? null; const bp = bn.changePct ?? null;
    fetch('/api/insights-brief', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niftyPrice: nifty.price, bnPrice: bn.price, niftyPct: np, bnPct: bp,
        vix: nseData.vix ?? null,
        stance: getStance(np, bp)?.label || 'Neutral',
        structure: np < -0.5 ? 'Downtrend' : np > 0.5 ? 'Uptrend' : 'Range',
        volLabel: Math.abs(np ?? 0) > 1.5 ? 'High' : Math.abs(np ?? 0) > 0.7 ? 'Moderate' : 'Low',
        fiiNet: fiidii?.fiiNet ?? null, diiNet: fiidii?.diiNet ?? null,
        sp500Pct: data.sp500?.changePct ?? null, nikkeiPct: data.nikkei?.changePct ?? null,
        hangsengPct: data.hangseng?.changePct ?? null,
        crudePct: data.crude?.changePct ?? null, goldPct: data.gold?.changePct ?? null,
      }),
    }).then(r => r.json()).then(d => { setBrief(d); setBriefLoading(false); }).catch(() => setBriefLoading(false));
  }, [data, nseData, fiidii]);

  useEffect(() => { fetchBrief(); }, [fiidii]);

  // Data
  const nifty     = nseData.nifty50        || data.nifty50        || null;
  const banknifty = nseData.banknifty      || data.banknifty      || null;
  const finnifty  = nseData.niftyfinservice || data.niftyfinservice || null;
  const sensex    = nseData.sensex         || data.sensex         || null;
  const giftnifty = data.giftnifty         || null;
  const np = nifty?.changePct ?? null;
  const bp = banknifty?.changePct ?? null;
  const stance = getStance(np, bp);

  // FII/DII — use top-level fields from API (correct keys)
  const fiiNet  = fiidii?.fiiNet  ?? null;
  const fiiSell = fiidii?.fiiSell ?? null;
  const fiiBuy  = fiidii?.fiiBuy  ?? null;
  const diiNet  = fiidii?.diiNet  ?? null;
  const diiSell = fiidii?.diiSell ?? null;
  const diiBuy  = fiidii?.diiBuy  ?? null;
  const history = fiidii?.history || [];
  const fii7d   = history.slice(-7).reduce((s, d) => s + (d.fiiNet ?? 0), 0);
  const dii7d   = history.slice(-7).reduce((s, d) => s + (d.diiNet ?? 0), 0);
  const combined7d = fii7d + dii7d;

  const zones     = (() => {
    if (!nifty?.price) return null;
    const p = nifty.price; const s = p < 10000 ? 100 : 50; const r = v => Math.round(v / s) * s;
    return [
      { level: r(p * 0.990), label: 'Support 1',    type: 'support'    },
      { level: r(p * 0.976), label: 'Support 2',    type: 'support'    },
      { level: r(p * 1.010), label: 'Resistance 1', type: 'resistance' },
      { level: r(p * 1.022), label: 'Resistance 2', type: 'resistance' },
    ].map(z => ({ ...z, dist: ((z.level - p) / p * 100).toFixed(1) }));
  })();

  const scenarios = (() => {
    if (!nifty?.price || np === null) return null;
    const p = nifty.price; const s = p < 10000 ? 100 : 50; const r = v => Math.round(v / s) * s;
    const sup = r(p * 0.990); const res = r(p * 1.010);
    return [
      { if: `Nifty breaks ${sup.toLocaleString('en-IN')}`, then: 'Downside continuation toward next support zone likely.', type: 'bear' },
      { if: `Nifty reclaims ${res.toLocaleString('en-IN')}`, then: 'Short covering possible. Watch for volume confirmation.', type: 'bull' },
      { if: `Range ${sup.toLocaleString('en-IN')} to ${res.toLocaleString('en-IN')} holds`, then: 'Consolidation continues. Directional move on clean breakout.', type: 'neutral' },
    ];
  })();

  const niftyPrevClose = prevClose(nifty?.price, np);
  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const pad2 = n => String(n).padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
  const in7 = new Date(now); in7.setDate(now.getDate() + 6);
  const in7Str = `${in7.getFullYear()}-${pad2(in7.getMonth()+1)}-${pad2(in7.getDate())}`;
  const events    = ECON_EVENTS.filter(e => e.date >= todayStr && e.date <= in7Str).sort((a,b) => a.date.localeCompare(b.date));
  const allEvents = ECON_EVENTS.filter(e => e.date >= todayStr).slice(0, 8);
  const fmtEvtDate = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const signals = buildSignals({ np, bp, vix: nseData.vix, niftyPrice: nifty?.price, fiiNet, diiNet, fii7d, dii7d, data, history, allEvents });

  const COMMODITIES = [
    { id: 'gold',      label: 'Gold',      unit: 'USD/oz',    dec: 1 },
    { id: 'silver',    label: 'Silver',    unit: 'USD/oz',    dec: 2 },
    { id: 'crude',     label: 'Crude WTI', unit: 'USD/bbl',   dec: 1 },
    { id: 'brent',     label: 'Brent',     unit: 'USD/bbl',   dec: 1 },
    { id: 'natgas',    label: 'Nat Gas',   unit: 'USD/mmBtu', dec: 3 },
    { id: 'copper',    label: 'Copper',    unit: 'USD/lb',    dec: 3 },
    { id: 'aluminium', label: 'Aluminium', unit: 'USD/t',     dec: 0 },
    { id: 'wheat',     label: 'Wheat',     unit: 'USD/bu',    dec: 2 },
  ];

  return (
    <div className="ip-wrap">

      {/* STATUS STRIP */}
      <div className="ip-strip">
        {stance && <div className="ip-strip-item"><span className="ip-sl">TREND</span><span className="ip-sv" style={{color:stance.color}}>{stance.icon} {stance.label}</span></div>}
        {nseData.vix && <div className="ip-strip-item"><span className="ip-sl">INDIA VIX</span><span className="ip-sv" style={{color: nseData.vix > 18 ? 'var(--loss)' : nseData.vix < 13 ? 'var(--gain)' : 'var(--text)'}}>{nseData.vix.toFixed(1)}</span></div>}
        {fiiNet !== null && <div className="ip-strip-item"><span className="ip-sl">FII TODAY</span><span className="ip-sv" style={{color: pColor(fiiNet)}}>{fiiNet >= 0 ? '+' : ''}Rs.{Math.abs(fiiNet).toLocaleString('en-IN')} Cr</span></div>}
        {diiNet !== null && <div className="ip-strip-item"><span className="ip-sl">DII TODAY</span><span className="ip-sv" style={{color: pColor(diiNet)}}>{diiNet >= 0 ? '+' : ''}Rs.{Math.abs(diiNet).toLocaleString('en-IN')} Cr</span></div>}
        {niftyPrevClose  && <div className="ip-strip-item"><span className="ip-sl">PREV CLOSE</span><span className="ip-sv">{fmtP(niftyPrevClose)}</span></div>}
        <div className="ip-strip-right"><span className="ip-sl">{slot.toUpperCase()}</span><span className="ip-sv">{dateStr} · {timeStr}</span></div>
      </div>

      {/* INDIA INDICES */}
      <div className="ip-section">
        <div className="ip-section-label">INDIA INDICES</div>
        <div className="ip-india-grid">
          <IndexCard label="Nifty 50"   d={nifty}     main flag="🇮🇳" />
          <IndexCard label="Bank Nifty" d={banknifty}      flag="🇮🇳" />
          <IndexCard label="Fin Nifty"  d={finnifty}       flag="🇮🇳" />
          <IndexCard label="Sensex"     d={sensex}         flag="🇮🇳" />
          <IndexCard label="Gift Nifty" d={giftnifty}      flag="🇮🇳" />
        </div>
      </div>

      {/* GLOBAL */}
      <div className="ip-section ip-section-tight">
        <div className="ip-section-label">GLOBAL INDICES</div>
        <div className="ip-bench-grid">
          {[{id:'sp500',label:'S&P 500',flag:'🇺🇸'},{id:'nasdaq',label:'Nasdaq',flag:'🇺🇸'},{id:'dowjones',label:'Dow Jones',flag:'🇺🇸'},{id:'nikkei',label:'Nikkei',flag:'🇯🇵'},{id:'hangseng',label:'Hang Seng',flag:'🇭🇰'},{id:'shanghai',label:'Shanghai',flag:'🇨🇳'},{id:'dax',label:'DAX',flag:'🇩🇪'},{id:'ftse',label:'FTSE 100',flag:'🇬🇧'}]
            .map((m,i) => <BenchCard key={i} label={m.label} d={data[m.id]} flag={m.flag} />)}
        </div>
      </div>

      {/* COMMODITIES */}
      <div className="ip-section ip-section-tight">
        <div className="ip-section-label">COMMODITIES</div>
        <div className="ip-comm-grid">
          {COMMODITIES.map((c,i) => <CommCard key={i} label={c.label} unit={c.unit} d={data[c.id]} dec={c.dec} />)}
        </div>
      </div>

      {/* SIGNALS + STANCE side by side */}
      {signals.length > 0 && (
        <div className="ip-section">
          <div className="ip-signals-stance-row">
            {/* LEFT: SIGNALS */}
            <div className="ip-signals-col">
              <div className="ip-section-label">MARKET SIGNALS</div>
              <div className="ip-signals-grid">
                {signals.map((s,i) => <SignalCard key={i} {...s} />)}
              </div>
            </div>

            {/* RIGHT: STANCE */}
            {stance && (
              <div className="ip-stance-col">
                <div className="ip-section-label">MARKET STANCE</div>
                <div className="ip-stance-box" style={{ background: stance.bg, borderColor: stance.border }}>
                  <div className="ip-stance-icon" style={{color: stance.color}}>{stance.icon}</div>
                  <div className="ip-stance-label" style={{color: stance.color}}>{stance.label}</div>
                  <div className="ip-stance-bias">{stance.bias}</div>
                  <div className="ip-stance-conf">
                    <span className="ip-sl">CONFIDENCE</span>
                    <span style={{color: stance.color, fontFamily:'var(--mono)', fontSize:13, fontWeight:800, marginLeft:8}}>{stance.confidence}</span>
                  </div>
                  <ul className="ip-stance-reasons">
                    {stance.reasons.map((r,i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM GRID */}
      <div className="ip-bottom-grid">

        {/* KEY LEVELS */}
        <div className="ip-card">
          <div className="ip-card-title">KEY LEVELS</div>
          {zones ? zones.map((z,i) => (
            <div key={i} className={`ip-zone ip-zone-${z.type}`}>
              <span className="ip-zone-label">{z.label}</span>
              <span className="ip-zone-level" style={{color: z.type==='support'?'var(--gain)':'var(--loss)'}}>{z.level.toLocaleString('en-IN')}</span>
              <span className="ip-zone-dist">{z.dist > 0 ? '+' : ''}{z.dist}%</span>
            </div>
          )) : <div className="ip-note">No price data.</div>}
          {scenarios && (
            <>
              <div className="ip-card-title" style={{marginTop:16}}>SCENARIOS</div>
              {scenarios.map((s,i) => (
                <div key={i} className={`ip-scenario ip-sc-${s.type}`}>
                  <div className="ip-sc-if">{s.if}</div>
                  <div className="ip-sc-then">{s.then}</div>
                </div>
              ))}
            </>
          )}
          <div className="ip-note" style={{marginTop:8}}>Rule-based from live price. Not predictions.</div>
        </div>

        {/* FII / DII */}
        <div className="ip-card">
          <div className="ip-card-title">FII / DII FLOWS</div>
          {fiiNet !== null ? (
            <>
              {/* 7D summary row */}
              <div className="ip-flow-7d">
                <div className="ip-flow-7d-item">
                  <div className="ip-sl">FII 7D TOTAL</div>
                  <div className="ip-flow-7d-val" style={{color: pColor(fii7d)}}>{fii7d >= 0 ? '+' : ''}Rs.{Math.abs(fii7d).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-7d-sub">{history.slice(-7).length}d</div>
                </div>
                <div className="ip-flow-7d-item">
                  <div className="ip-sl">DII 7D TOTAL</div>
                  <div className="ip-flow-7d-val" style={{color: pColor(dii7d)}}>{dii7d >= 0 ? '+' : ''}Rs.{Math.abs(dii7d).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-7d-sub">{history.slice(-7).length}d</div>
                </div>
                <div className="ip-flow-7d-item">
                  <div className="ip-sl">COMBINED</div>
                  <div className="ip-flow-7d-val" style={{color: pColor(combined7d)}}>{combined7d >= 0 ? '+' : ''}Rs.{Math.abs(combined7d).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-7d-sub">{combined7d >= 0 ? 'Net inflow' : 'Net outflow'}</div>
                </div>
              </div>

              {/* Today's big numbers */}
              <div className="ip-flow-today">
                <div className="ip-flow-side">
                  <div className="ip-flow-who">FII / FPI</div>
                  <div className="ip-flow-net" style={{color: pColor(fiiNet)}}>{fiiNet >= 0 ? '+' : ''}Rs.{Math.abs(fiiNet).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-dir" style={{color: pColor(fiiNet)}}>{fiiNet >= 0 ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
                  {fiiBuy != null && fiiSell != null && (
                    <div className="ip-flow-buysell">
                      <span>Buy Rs.{Math.round(fiiBuy).toLocaleString('en-IN')} Cr</span>
                      <span>Sell Rs.{Math.round(fiiSell).toLocaleString('en-IN')} Cr</span>
                    </div>
                  )}
                  <div className="ip-flow-label">Foreign Institutional</div>
                </div>
                <div className="ip-flow-side">
                  <div className="ip-flow-who">DII</div>
                  <div className="ip-flow-net" style={{color: pColor(diiNet)}}>{diiNet >= 0 ? '+' : ''}Rs.{Math.abs(diiNet ?? 0).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-dir" style={{color: pColor(diiNet)}}>{(diiNet ?? 0) >= 0 ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
                  {diiBuy != null && diiSell != null && (
                    <div className="ip-flow-buysell">
                      <span>Buy Rs.{Math.round(diiBuy).toLocaleString('en-IN')} Cr</span>
                      <span>Sell Rs.{Math.round(diiSell).toLocaleString('en-IN')} Cr</span>
                    </div>
                  )}
                  <div className="ip-flow-label">Domestic Institutional</div>
                </div>
              </div>

              {/* 7-day bar chart */}
              <div className="ip-fii-legend">
                <span><span style={{display:'inline-block',width:9,height:9,background:'var(--gain)',borderRadius:2,marginRight:4}}/>FII</span>
                <span><span style={{display:'inline-block',width:9,height:9,background:'#4A9EFF',borderRadius:2,marginRight:4}}/>DII</span>
              </div>
              <FiiBar history={history} />

              {fiiNet < 0 && (diiNet ?? 0) > 0  && <div className="ip-note">FIIs selling, DIIs absorbing. Domestic support is visible.</div>}
              {fiiNet > 0 && (diiNet ?? 0) > 0  && <div className="ip-note">Both sides buying. Broad institutional conviction.</div>}
              {fiiNet < 0 && (diiNet ?? 0) < 0  && <div className="ip-note">Both selling. No institutional support layer.</div>}
            </>
          ) : <div className="ip-note">Loading FII/DII data...</div>}
        </div>

        {/* ECONOMIC CALENDAR */}
        <div className="ip-card">
          <div className="ip-card-title">ECONOMIC CALENDAR <span style={{fontWeight:400,opacity:.5,fontSize:9}}>NEXT 7 DAYS</span></div>
          {events.length > 0 ? events.map((e,i) => (
            <div key={i} className="ip-econ-row">
              <div className="ip-econ-meta">
                <span className="ip-econ-date">{fmtEvtDate(e.date)}</span>
                <span className={`ip-econ-ctry ip-ctry-${e.country==='India'?'india':'global'}`}>{e.country}</span>
              </div>
              <div className="ip-econ-body">
                <div className="ip-econ-event">{e.event}</div>
                <div className="ip-econ-note">{e.note}</div>
              </div>
              <div className={`ip-econ-imp ip-imp-${e.impact}`}>{e.impact}</div>
            </div>
          )) : <div className="ip-note">No major events in next 7 days.</div>}
        </div>

      </div>

      {/* AI WRITE-UP — always open */}
      <div className="ip-writeup-wrap">
        <div className="ip-writeup-header">
          <span>AI WRITE-UP</span>
          <span className="ip-writeup-tag">Gemini · {slot} · {briefLoading ? 'generating...' : brief?.cached ? 'cached' : 'live'}</span>
        </div>
        <div className="ip-writeup-body">
          {briefLoading ? (
            <div className="ip-loading"><div className="ip-spinner" /><span>Generating write-up with live news and market data...</span></div>
          ) : brief?.writeup ? (
            brief.writeup.split('\n').filter(p => p.trim()).map((para,i) => (
              <p key={i} className="ip-writeup-para">{para.trim()}</p>
            ))
          ) : (
            <p className="ip-writeup-para" style={{color:'var(--text3)'}}>
              {brief?._error ? `AI call failed: ${brief._error}` : 'Write-up not available. Refresh to try again.'}
            </p>
          )}
        </div>
      </div>

      <div className="ip-footer">
        Data-driven signals generated from live market data. Not investment advice. Data via Kite Connect and NSE. AI write-up uses Gemini with live search grounding.
      </div>
    </div>
  );
}
