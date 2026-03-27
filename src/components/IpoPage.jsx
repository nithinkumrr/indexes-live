import { useState, useMemo, useEffect } from 'react';

// ─── localStorage history ────────────────────────────────────────────────────
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('ipo_calc_history') || '[]'); } catch { return []; }
}
function saveHistory(entry) {
  try {
    const h = loadHistory();
    h.unshift(entry);
    localStorage.setItem('ipo_calc_history', JSON.stringify(h.slice(0, 5)));
  } catch {}
}

// ─── Decision engine ─────────────────────────────────────────────────────────
function decide(returnPct, gmpTrend) {
  let level = returnPct > 25 ? 2 : returnPct > 10 ? 1 : 0;
  if (gmpTrend === 'rising')  level = Math.min(level + 1, 2);
  if (gmpTrend === 'falling') level = Math.max(level - 1, 0);
  return [
    { tag: 'AVOID',   color: '#FF4455', bg: 'rgba(255,68,85,.1)',   icon: '🔴', line: 'Limited upside at current GMP. Capital better deployed elsewhere.' },
    { tag: 'NEUTRAL', color: '#F59E0B', bg: 'rgba(245,158,11,.1)',  icon: '🟡', line: 'Moderate listing gains possible. Risk-reward is balanced.' },
    { tag: 'APPLY',   color: '#00C896', bg: 'rgba(0,200,150,.1)',   icon: '🟢', line: 'Strong listing potential based on GMP. Watch for GMP volatility near listing.' },
  ][level];
}

function contextLine(returnPct, gmpTrend, issueSize) {
  if (returnPct <= 0)  return 'GMP suggests a listing below issue price. High-risk application.';
  if (gmpTrend === 'falling') return 'Falling GMP near listing is a warning sign. Consider reducing lots.';
  if (returnPct > 40)  return 'Very high GMP-based return. Verify GMP is still valid — extreme premiums often compress.';
  if (returnPct > 20)  return 'Good short-term listing gain expected. Best case for retail 1-lot players.';
  return 'Moderate upside. Worth applying if funds are available and GMP is stable.';
}

// ─── Quick links ─────────────────────────────────────────────────────────────
const STEPS = [
  { step: '1', action: 'Find the IPO',        desc: 'See all open & upcoming IPOs',         url: 'https://zerodha.com/ipo/',                                                  cta: 'Open Kite IPO ↗' },
  { step: '2', action: 'Check live GMP',      desc: 'Get today\'s grey market premium',     url: 'https://www.investorgain.com/report/live-ipo-gmp/331/',                    cta: 'InvestorGain ↗' },
  { step: '3', action: 'Also check here',     desc: 'Second GMP source to cross-verify',    url: 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/',             cta: 'IPO Watch ↗' },
  { step: '4', action: 'Paste GMP above',     desc: 'Enter details in calculator and decide', url: null,                                                                      cta: '↑ Use calculator' },
  { step: '5', action: 'Check subscription',  desc: 'Live bidding data on NSE',             url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',             cta: 'NSE live ↗' },
  { step: '6', action: 'Check allotment',     desc: 'KFintech registrar portal',            url: 'https://kosipo.kfintech.com/',                                             cta: 'KFintech ↗' },
  { step: '7', action: 'Check allotment',     desc: 'Link Intime registrar portal',         url: 'https://linkintime.co.in/MIPO/Ipoallotment.html',                          cta: 'Link Intime ↗' },
];

const PLAYBOOK = [
  { icon: '⚡', text: 'High GMP does not guarantee a good listing. GMP is unofficial and can swing 30–50% in 24 hours.' },
  { icon: '📦', text: 'Large issue sizes (₹3,000 Cr+) usually see smaller listing pops. More shares = more supply on day 1.' },
  { icon: '📉', text: 'Falling GMP in the last 1–2 days before listing is a warning sign. Institutional selling pressure.' },
  { icon: '🎯', text: 'Heavily oversubscribed IPOs mean low allotment probability for retail. 1-lot strategy maximises chances.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt    = v => v?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—';
const fmtPct = v => v !== null && v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—';

const TABS = ['Calculator', 'How to Apply', 'IPO Playbook'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function IpoPage() {
  const [tab,       setTab]      = useState('Calculator');
  const [price,     setPrice]    = useState('');
  const [lotSize,   setLotSize]  = useState('');
  const [lots,      setLots]     = useState('1');
  const [gmp,       setGmp]      = useState('');
  const [gmpMode,   setGmpMode]  = useState('base');      // conservative | base | aggressive
  const [gmpTrend,  setGmpTrend] = useState('flat');      // rising | flat | falling
  const [history,   setHistory]  = useState([]);
  const [copied,    setCopied]   = useState(false);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // ── Core calculations ──
  const calc = useMemo(() => {
    const p  = parseFloat(price);
    const ls = parseInt(lotSize);
    const n  = parseInt(lots) || 1;
    const g  = parseFloat(gmp);
    if (!p || !ls) return null;

    const investment = p * ls * n;
    const hasGmp     = !isNaN(g) && gmp !== '';

    // Max retail lots
    const maxLots = p && ls ? Math.floor(200000 / (p * ls)) || 1 : 1;

    if (!hasGmp) return { investment, hasGmp: false, maxLots };

    const adjGmp = gmpMode === 'conservative' ? g * 0.6
                 : gmpMode === 'aggressive'   ? g * 1.4
                 : g;

    const listingPrice  = p + adjGmp;
    const profitPerLot  = adjGmp * ls;
    const totalProfit   = profitPerLot * n;
    const returnPct     = (totalProfit / investment) * 100;
    const breakEvenGmp  = 0; // issue price is floor for ASBA; no charges on non-allotment
    const daysBlocked   = 6;
    const annualReturn  = (returnPct / daysBlocked) * 365;
    const decision      = decide(returnPct, gmpTrend);
    const context       = contextLine(returnPct, gmpTrend);

    return {
      investment, hasGmp: true, maxLots,
      listingPrice, profitPerLot, totalProfit,
      returnPct, breakEvenGmp, daysBlocked, annualReturn,
      decision, context, adjGmp, n,
    };
  }, [price, lotSize, lots, gmp, gmpMode, gmpTrend]);

  // Scenario table
  const scenarios = useMemo(() => {
    const p  = parseFloat(price);
    const ls = parseInt(lotSize);
    const n  = parseInt(lots) || 1;
    const g  = parseFloat(gmp);
    if (!p || !ls || !g || isNaN(g)) return null;
    return [
      { label: 'Conservative', mult: 0.6 },
      { label: 'Base',         mult: 1.0 },
      { label: 'Aggressive',   mult: 1.4 },
    ].map(s => {
      const ag      = g * s.mult;
      const profit  = ag * ls * n;
      const retPct  = (profit / (p * ls * n)) * 100;
      return { ...s, adjGmp: Math.round(ag), profit: Math.round(profit), retPct };
    });
  }, [price, lotSize, lots, gmp]);

  function setMaxRetail() {
    const p  = parseFloat(price);
    const ls = parseInt(lotSize);
    if (!p || !ls) return;
    setLots(String(Math.max(1, Math.floor(200000 / (p * ls)))));
  }

  function handleSave() {
    if (!calc?.hasGmp) return;
    const entry = {
      date:    new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      price, lotSize, lots, gmp: gmp + (gmpMode !== 'base' ? ` (${gmpMode})` : ''),
      returnPct: calc.returnPct.toFixed(1),
      tag: calc.decision.tag,
    };
    saveHistory(entry);
    setHistory(loadHistory());
  }

  function handleCopy() {
    if (!calc?.hasGmp) return;
    const text = [
      `IPO Calculation`,
      `Issue Price: ₹${price} | Lot: ${lotSize} shares | Lots: ${lots}`,
      `GMP: ₹${gmp} (${gmpMode})`,
      `Investment: ₹${fmt(calc.investment)}`,
      `Expected Listing: ₹${fmt(calc.listingPrice)}`,
      `Expected Profit: ₹${fmt(calc.totalProfit)} (${fmtPct(calc.returnPct)})`,
      `Decision: ${calc.decision.icon} ${calc.decision.tag}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const pos = !calc?.hasGmp || calc?.returnPct >= 0;

  return (
    <div className="ipo-wrap">
      <div className="ipo-header">
        <div>
          <div className="ipo-title">IPO Decision Calculator</div>
          <div className="ipo-subtitle">Estimate returns, risk, and capital efficiency before applying</div>
        </div>
      </div>

      <div className="ipo-tabs">
        {TABS.map(t => (
          <button key={t} className={`ipo-tab ${tab === t ? 'ipo-tab-active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── CALCULATOR ── */}
      {tab === 'Calculator' && (
        <div className="idc-layout">

          {/* LEFT: Inputs */}
          <div className="idc-inputs">
            <div className="idc-section-title">INPUTS</div>

            <div className="idc-field">
              <label>Issue Price (₹)</label>
              <input type="number" placeholder="e.g. 480" value={price}
                onChange={e => setPrice(e.target.value)} className="idc-input" />
            </div>

            <div className="idc-field">
              <label>Lot Size (shares per lot)</label>
              <input type="number" placeholder="e.g. 31" value={lotSize}
                onChange={e => setLotSize(e.target.value)} className="idc-input" />
            </div>

            <div className="idc-field">
              <label>Lots Applying</label>
              <input type="number" placeholder="1" min="1" value={lots}
                onChange={e => setLots(e.target.value)} className="idc-input" />
              <div className="idc-lot-presets">
                <button onClick={() => setLots('1')} className={`idc-preset ${lots==='1'?'active':''}`}>1 lot</button>
                <button onClick={() => setLots('2')} className={`idc-preset ${lots==='2'?'active':''}`}>2 lots</button>
                <button onClick={setMaxRetail} className="idc-preset">Max retail (₹2L)</button>
              </div>
            </div>

            <div className="idc-field">
              <label>GMP ₹ <span className="idc-optional">get from investorgain.com</span></label>
              <input type="number" placeholder="e.g. 90" value={gmp}
                onChange={e => setGmp(e.target.value)} className="idc-input idc-input-gmp" />
            </div>

            {gmp && (
              <>
                <div className="idc-field">
                  <label>GMP Scenario</label>
                  <div className="idc-toggle-group">
                    {['conservative','base','aggressive'].map(m => (
                      <button key={m} onClick={() => setGmpMode(m)}
                        className={`idc-toggle ${gmpMode===m?'active':''}`}>
                        {m === 'conservative' ? '60% GMP' : m === 'base' ? 'Current GMP' : '140% GMP'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="idc-field">
                  <label>GMP Trend</label>
                  <div className="idc-toggle-group">
                    {['rising','flat','falling'].map(t => (
                      <button key={t} onClick={() => setGmpTrend(t)}
                        className={`idc-toggle ${gmpTrend===t?'active':''} ${t==='rising'?'trend-up':t==='falling'?'trend-dn':''}`}>
                        {t === 'rising' ? '↑ Rising' : t === 'flat' ? '→ Flat' : '↓ Falling'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Output */}
          <div className="idc-output">
            {!calc ? (
              <div className="idc-empty">Enter issue price and lot size to evaluate opportunity</div>
            ) : (
              <>
                {/* Investment */}
                <div className="idc-inv-row">
                  <span className="idc-inv-label">CAPITAL REQUIRED</span>
                  <span className="idc-inv-val">₹{fmt(calc.investment)}</span>
                </div>

                {!calc.hasGmp ? (
                  <div className="idc-no-gmp">
                    Add GMP to see decision and return analysis.
                    <a href="https://www.investorgain.com/report/live-ipo-gmp/331/" target="_blank" rel="noopener" className="idc-gmp-link">Get GMP ↗</a>
                  </div>
                ) : (
                  <>
                    {/* Decision badge */}
                    <div className="idc-decision" style={{background: calc.decision.bg, borderColor: calc.decision.color}}>
                      <div className="idc-decision-top">
                        <span className="idc-decision-icon">{calc.decision.icon}</span>
                        <span className="idc-decision-tag" style={{color: calc.decision.color}}>{calc.decision.tag}</span>
                      </div>
                      <div className="idc-decision-line">{calc.decision.line}</div>
                    </div>

                    {/* Core numbers */}
                    <div className="idc-metrics">
                      <div className="idc-metric-big">
                        <div className="idc-metric-label">EXPECTED PROFIT</div>
                        <div className="idc-metric-val" style={{color: pos?'var(--gain)':'var(--loss)'}}>
                          {pos?'+':''}₹{fmt(calc.totalProfit)}
                        </div>
                      </div>
                      <div className="idc-metric-big">
                        <div className="idc-metric-label">RETURN</div>
                        <div className="idc-metric-val" style={{color: pos?'var(--gain)':'var(--loss)'}}>
                          {fmtPct(calc.returnPct)}
                        </div>
                      </div>
                    </div>

                    <div className="idc-submetrics">
                      <div className="idc-submetric">
                        <span>Expected listing</span>
                        <strong style={{color: pos?'var(--gain)':'var(--loss)'}}>₹{fmt(calc.listingPrice)}</strong>
                      </div>
                      <div className="idc-submetric">
                        <span>Profit per lot</span>
                        <strong>₹{fmt(calc.profitPerLot)}</strong>
                      </div>
                      <div className="idc-submetric">
                        <span>Days blocked</span>
                        <strong>{calc.daysBlocked} days</strong>
                      </div>
                      <div className="idc-submetric">
                        <span>Annualised return</span>
                        <strong style={{color:'var(--accent)'}}>~{calc.annualReturn.toFixed(0)}%</strong>
                      </div>
                    </div>

                    <div className="idc-context">{calc.context}</div>

                    {/* Scenario table */}
                    {scenarios && (
                      <div className="idc-scenarios">
                        <div className="idc-scenarios-title">GMP SCENARIOS</div>
                        <table className="idc-sc-table">
                          <thead><tr><th>Scenario</th><th>Adj. GMP</th><th>Profit</th><th>Return</th></tr></thead>
                          <tbody>
                            {scenarios.map(s => (
                              <tr key={s.label} className={gmpMode===s.label.toLowerCase()?'idc-sc-active':''}>
                                <td>{s.label}</td>
                                <td>₹{s.adjGmp}</td>
                                <td style={{color: s.profit>=0?'var(--gain)':'var(--loss)'}}>₹{fmt(s.profit)}</td>
                                <td style={{color: s.retPct>=0?'var(--gain)':'var(--loss)'}}>{fmtPct(s.retPct)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="idc-actions">
                      <button onClick={handleCopy} className="idc-act-btn">
                        {copied ? '✓ Copied' : '📋 Copy result'}
                      </button>
                      <button onClick={handleSave} className="idc-act-btn">💾 Save</button>
                      <a href="https://zerodha.com/ipo/" target="_blank" rel="noopener" className="idc-act-btn idc-act-primary">Apply via Kite ↗</a>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Recent history */}
            {history.length > 0 && (
              <div className="idc-history">
                <div className="idc-history-title">RECENT CALCULATIONS</div>
                {history.map((h, i) => (
                  <div key={i} className="idc-history-row">
                    <span className="idc-history-date">{h.date}</span>
                    <span className="idc-history-detail">₹{h.price} · {h.lotSize}sh · GMP {h.gmp}</span>
                    <span className="idc-history-ret" style={{color: parseFloat(h.returnPct)>=0?'var(--gain)':'var(--loss)'}}>
                      {h.returnPct}%
                    </span>
                    <span className="idc-history-tag">{h.tag}</span>
                  </div>
                ))}
                <button className="idc-history-clear" onClick={() => { localStorage.removeItem('ipo_calc_history'); setHistory([]); }}>
                  Clear history
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HOW TO APPLY ── */}
      {tab === 'How to Apply' && (
        <div className="idc-steps">
          <div className="idc-steps-header">Follow these steps every IPO</div>
          {STEPS.map((s, i) => (
            <div key={i} className="idc-step-row">
              <div className="idc-step-num">{s.step}</div>
              <div className="idc-step-body">
                <div className="idc-step-action">{s.action}</div>
                <div className="idc-step-desc">{s.desc}</div>
              </div>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener" className="idc-step-cta">{s.cta}</a>
              ) : (
                <span className="idc-step-cta idc-step-cta-inert">{s.cta}</span>
              )}
            </div>
          ))}
          <div className="idc-allotment-note">
            💡 Heavily oversubscribed IPOs have low allotment probability for retail. Applying for 1 lot maximises your chances relative to capital blocked.
          </div>
        </div>
      )}

      {/* ── PLAYBOOK ── */}
      {tab === 'IPO Playbook' && (
        <div className="idc-playbook">
          <div className="idc-playbook-header">How to think about IPOs</div>
          {PLAYBOOK.map((p, i) => (
            <div key={i} className="idc-play-row">
              <span className="idc-play-icon">{p.icon}</span>
              <span className="idc-play-text">{p.text}</span>
            </div>
          ))}
          <div className="idc-play-disclaimer">
            GMP is unofficial and unregulated. This calculator is for estimation only. Not investment advice.
          </div>
        </div>
      )}
    </div>
  );
}
