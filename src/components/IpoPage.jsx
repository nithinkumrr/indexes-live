import { useState, useMemo, useEffect } from 'react';

// ── Decision engine ───────────────────────────────────────────────────────────
function decide(returnPct, gmpTrend, subTimes, gmp) {
  if (!gmp && gmp !== 0) return null;
  let score = 0;
  if (returnPct > 40)  score += 3;
  else if (returnPct > 20) score += 2;
  else if (returnPct > 8)  score += 1;
  else if (returnPct <= 0) score -= 2;
  if (gmpTrend === 'rising')  score += 1;
  if (gmpTrend === 'falling') score -= 1;
  if (subTimes > 100) score -= 1; // very high sub = low allotment
  if (score >= 3)  return { tag:'STRONG APPLY',   color:'#00C896', bg:'rgba(0,200,150,.08)', border:'rgba(0,200,150,.3)', icon:'✔', verdict:'Strong GMP signal. High listing potential.' };
  if (score >= 2)  return { tag:'APPLY',           color:'#00C896', bg:'rgba(0,200,150,.05)', border:'rgba(0,200,150,.2)', icon:'✔', verdict:'Good listing potential. Monitor GMP day before.' };
  if (score >= 1)  return { tag:'APPLY IF AGGRESSIVE', color:'#F59E0B', bg:'rgba(245,158,11,.07)', border:'rgba(245,158,11,.25)', icon:'⚠', verdict:'Moderate upside. Worth applying if funds available.' };
  if (score === 0) return { tag:'NEUTRAL',         color:'#F59E0B', bg:'rgba(245,158,11,.05)', border:'rgba(245,158,11,.2)', icon:'⚠', verdict:'Risk-reward balanced. No strong edge either way.' };
  return { tag:'AVOID',  color:'#FF4455', bg:'rgba(255,68,85,.08)', border:'rgba(255,68,85,.3)', icon:'✖', verdict:'Limited or negative upside at current GMP. Skip.' };
}

function getSignals(returnPct, gmpTrend, subTimes, gmp, lots) {
  const signals = [];
  if (gmp !== '' && gmp !== null && !isNaN(gmp)) {
    if (returnPct > 40) signals.push({ type:'bull', text:'Strong GMP — high listing potential' });
    else if (returnPct > 20) signals.push({ type:'bull', text:'Solid GMP — good listing expected' });
    else if (returnPct > 0)  signals.push({ type:'warn', text:'Moderate GMP — limited pop expected' });
    else if (returnPct <= 0) signals.push({ type:'bear', text:'Negative GMP — listing below issue price possible' });
  }
  if (gmpTrend === 'rising')  signals.push({ type:'bull', text:'GMP rising — momentum building' });
  if (gmpTrend === 'falling') signals.push({ type:'bear', text:'Falling GMP near listing — warning sign' });
  if (subTimes > 200) signals.push({ type:'bear', text:`Very high subscription (${subTimes}x) — very low allotment chance` });
  else if (subTimes > 50) signals.push({ type:'warn', text:`High subscription (${subTimes}x) — allotment unlikely with multiple lots` });
  else if (subTimes > 0 && subTimes < 5) signals.push({ type:'warn', text:`Low subscription (${subTimes}x) — demand weak, listing risk higher` });
  if (lots > 1 && subTimes > 50) signals.push({ type:'warn', text:'Multiple lots with high subscription — 1 lot gives better allotment odds' });
  return signals;
}

function getAllotmentLabel(subTimes, lots) {
  if (!subTimes) return null;
  if (subTimes > 200) return { label:'Very Low', color:'#FF4455' };
  if (subTimes > 100) return { label:'Low', color:'#FF4455' };
  if (subTimes > 50)  return { label:'Low-Moderate', color:'#F59E0B' };
  if (subTimes > 20)  return { label:'Moderate', color:'#F59E0B' };
  if (subTimes > 5)   return { label:'Moderate-High', color:'#00C896' };
  return { label:'Higher', color:'#00C896' };
}

// ── Apply steps ───────────────────────────────────────────────────────────────
const STEPS = [
  { n:'1', title:'Open your broker app', desc:'Go to IPO section in your brokerage app or web platform.' },
  { n:'2', title:'Select the IPO', desc:'Find the live IPO. Check that the issue is open — dates matter.' },
  { n:'3', title:'Choose lot size', desc:'Retail minimum is 1 lot. Applying with 1 lot maximises allotment probability in oversubscribed IPOs.' },
  { n:'4', title:'Enter bid price', desc:'Bid at the cut-off price (upper end of price band) to maximise allotment chance.' },
  { n:'5', title:'Funds are blocked via UPI', desc:'Your UPI linked bank account will have funds blocked (not debited) until allotment.' },
  { n:'6', title:'Allotment in ~5 days', desc:'Check allotment on KFintech or Link Intime registrar portals using your PAN or application number.' },
  { n:'7', title:'Refund if not allotted', desc:'Funds unblocked within 1 day of allotment. Listed next trading day.' },
];

// ── Playbook ──────────────────────────────────────────────────────────────────
const PLAYBOOK = [
  { icon:'⚡', text:'High GMP does not guarantee a good listing. GMP is unofficial and can swing 30-50% in 24 hours before listing.' },
  { icon:'📦', text:'Large issues (Rs.3,000 Cr+) usually see smaller listing pops — more shares means more supply on day 1.' },
  { icon:'📉', text:'Falling GMP in the final 1-2 days before listing is a strong warning sign. Smart money is exiting the grey market.' },
  { icon:'🎯', text:'In oversubscribed IPOs, applying with 1 lot per family member maximises total allotment. Multiple lots do not help.' },
  { icon:'💧', text:'Capital is locked for 5-7 days. Factor in opportunity cost especially during volatile markets.' },
  { icon:'🧮', text:'The real return is on capital deployed, not listing gain. A Rs.500 gain on Rs.1.5 lakh blocked is only 0.33% in a week.' },
  { icon:'📊', text:'QIB subscription is the leading indicator. High QIB demand (10x+) is the most reliable positive signal for listing.' },
  { icon:'🔁', text:'Listing day is not the only exit. Some IPOs underperform on day 1 but re-rate 3-6 months post-listing as fundamentals show.' },
];

const QUICK_LINKS = [
  { label:'Live GMP', href:'https://www.investorgain.com/report/live-ipo-gmp/331/', hint:'InvestorGain' },
  { label:'GMP (verify)', href:'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/', hint:'IPOWatch' },
  { label:'NSE subscription', href:'https://www.nseindia.com/market-data/all-upcoming-issues-ipo', hint:'Live bid data' },
  { label:'Allotment (KFin)', href:'https://kosipo.kfintech.com/', hint:'KFintech registrar' },
  { label:'Allotment (Link)', href:'https://linkintime.co.in/MIPO/Ipoallotment.html', hint:'Link Intime registrar' },
];

const fmt = v => v != null ? v.toLocaleString('en-IN',{maximumFractionDigits:0}) : '';

export default function IpoPage() {
  const [name,      setName]      = useState('');
  const [price,     setPrice]     = useState('');
  const [lotSize,   setLotSize]   = useState('');
  const [lots,      setLots]      = useState('1');
  const [gmp,       setGmp]       = useState('');
  const [gmpTrend,  setGmpTrend]  = useState('flat');
  const [subTimes,  setSubTimes]  = useState('');
  const [stepsOpen, setStepsOpen] = useState(false);
  const [lotMode,   setLotMode]   = useState('1'); // '1' | 'custom'

  const calc = useMemo(() => {
    const p  = parseFloat(price);
    const ls = parseInt(lotSize);
    const n  = parseInt(lots) || 1;
    const g  = parseFloat(gmp);
    const sub = parseFloat(subTimes) || 0;
    if (!p || !ls) return null;

    const capital     = p * ls * n;
    const hasGmp      = !isNaN(g) && gmp !== '';
    const listingPx   = hasGmp ? p + g : null;
    const listingGain = hasGmp ? g * ls * n : null;
    const returnPct   = hasGmp ? (g / p) * 100 : null;
    const capEff      = hasGmp && listingGain !== null ? (listingGain / capital) * 100 : null;
    const breakEven   = Math.max(1, Math.round(p * 0.01)); // 1% of issue price as min GMP needed to cover brokerage/charges
    const flatCase    = 0;
    const worstCase   = hasGmp ? Math.min(0, listingGain) : null;

    return { p, ls, n, capital, listingPx, listingGain, returnPct, capEff, hasGmp, g, sub, breakEven, flatCase, worstCase };
  }, [price, lotSize, lots, gmp, subTimes]);

  const sub   = parseFloat(subTimes) || 0;
  const dec   = decide(calc?.returnPct ?? 0, gmpTrend, sub, gmp !== '' ? parseFloat(gmp) : undefined);
  const sigs  = calc ? getSignals(calc.returnPct ?? 0, gmpTrend, sub, gmp !== '' ? parseFloat(gmp) : undefined, parseInt(lots)||1) : [];
  const allot = sub > 0 ? getAllotmentLabel(sub, parseInt(lots)||1) : null;
  const hasCalc = calc !== null;

  const pColor = v => v == null ? '' : v >= 0 ? '#00C896' : '#FF4455';

  return (
    <div className="ipo-wrap">

      {/* HEADER */}
      <div className="ipo-header">
        <div className="ipo-header-left">
          <div className="ipo-page-title">IPO Decision Tool</div>
          <div className="ipo-page-sub">Enter IPO details. Get instant decision, expected listing, and risk analysis.</div>
        </div>
        <div className="ipo-quick-links">
          {QUICK_LINKS.map((l,i) => (
            <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="ipo-qlink">
              <span className="ipo-qlink-label">{l.label}</span>
              <span className="ipo-qlink-hint">{l.hint} ↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* MAIN: INPUT + OUTPUT */}
      <div className="ipo-main">

        {/* LEFT: INPUT PANEL */}
        <div className="ipo-input-panel">
          <div className="ipo-panel-title">IPO DETAILS</div>

          <div className="ipo-field">
            <label className="ipo-label">IPO Name <span className="ipo-label-opt">optional</span></label>
            <input className="ipo-input" placeholder="e.g. Ola Electric, HDB Financial..." value={name} onChange={e=>setName(e.target.value)} />
          </div>

          <div className="ipo-field-row">
            <div className="ipo-field">
              <label className="ipo-label">Issue Price (Rs.)</label>
              <input className="ipo-input" type="number" placeholder="e.g. 72" value={price} onChange={e=>setPrice(e.target.value)} />
            </div>
            <div className="ipo-field">
              <label className="ipo-label">Lot Size (shares)</label>
              <input className="ipo-input" type="number" placeholder="e.g. 200" value={lotSize} onChange={e=>setLotSize(e.target.value)} />
            </div>
          </div>

          {/* Lot strategy */}
          <div className="ipo-field">
            <label className="ipo-label">Number of Lots</label>
            <div className="ipo-lot-btns">
              {['1','2','3','5'].map(v => (
                <button key={v} className={`ipo-lot-btn ${lots===v?'ipo-lot-btn-active':''}`} onClick={()=>setLots(v)}>{v} Lot{v!=='1'?'s':''}</button>
              ))}
              <input className="ipo-input ipo-lot-custom" type="number" min="1" placeholder="custom" value={!['1','2','3','5'].includes(lots)?lots:''} onChange={e=>{if(e.target.value)setLots(e.target.value);}} />
            </div>
            {parseInt(lots)>1 && sub>50 && <div className="ipo-field-hint ipo-hint-warn">High subscription — 1 lot gives better allotment odds</div>}
          </div>

          {/* GMP */}
          <div className="ipo-field">
            <label className="ipo-label">GMP — Grey Market Premium (Rs.) <span className="ipo-label-opt">optional</span></label>
            <input className="ipo-input" type="number" placeholder="e.g. 40 (enter 0 if no GMP)" value={gmp} onChange={e=>setGmp(e.target.value)} />
            <div className="ipo-field-hint">
              Get GMP from <a href="https://www.investorgain.com/report/live-ipo-gmp/331/" target="_blank" rel="noopener noreferrer" className="ipo-link">InvestorGain ↗</a> or <a href="https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/" target="_blank" rel="noopener noreferrer" className="ipo-link">IPOWatch ↗</a>
            </div>
          </div>

          {/* GMP Trend */}
          {gmp !== '' && (
            <div className="ipo-field">
              <label className="ipo-label">GMP Trend</label>
              <div className="ipo-seg">
                {[['rising','Rising ↑'],['flat','Flat →'],['falling','Falling ↓']].map(([v,l])=>(
                  <button key={v} className={`ipo-seg-btn ${gmpTrend===v?'ipo-seg-active':''}`} onClick={()=>setGmpTrend(v)}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Subscription */}
          <div className="ipo-field">
            <label className="ipo-label">Subscription <span className="ipo-label-opt">times oversubscribed — optional</span></label>
            <input className="ipo-input" type="number" placeholder="e.g. 45 (times)" value={subTimes} onChange={e=>setSubTimes(e.target.value)} />
            <div className="ipo-field-hint">
              Check live subscription at <a href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo" target="_blank" rel="noopener noreferrer" className="ipo-link">NSE live ↗</a>
            </div>
          </div>

          {/* Capital at stake */}
          {hasCalc && (
            <div className="ipo-capital-bar">
              <div className="ipo-capital-item">
                <span className="ipo-cap-label">Capital Blocked</span>
                <span className="ipo-cap-val">Rs.{fmt(calc.capital)}</span>
              </div>
              <div className="ipo-capital-item">
                <span className="ipo-cap-label">Lock Duration</span>
                <span className="ipo-cap-val">~5–7 days</span>
              </div>
              <div className="ipo-capital-item">
                <span className="ipo-cap-label">Break-even GMP</span>
                <span className="ipo-cap-val">Rs.{calc.breakEven}+</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: OUTPUT PANEL */}
        <div className="ipo-output-panel">

          {!hasCalc ? (
            <div className="ipo-empty">
              <div className="ipo-empty-icon">⟶</div>
              <div className="ipo-empty-title">Enter issue price and lot size to get started</div>
              <div className="ipo-empty-sub">Listing price, profit, allotment chance, and decision will appear here instantly.</div>
            </div>
          ) : (
            <>
              {/* IPO name if given */}
              {name && <div className="ipo-out-name">{name}</div>}

              {/* Decision verdict */}
              {dec && (
                <div className="ipo-verdict" style={{background:dec.bg,borderColor:dec.border}}>
                  <div className="ipo-verdict-tag" style={{color:dec.color}}>{dec.icon} {dec.tag}</div>
                  <div className="ipo-verdict-text">{dec.verdict}</div>
                </div>
              )}

              {/* Key numbers */}
              <div className="ipo-out-grid">
                {calc.hasGmp && (
                  <>
                    <div className="ipo-out-card">
                      <div className="ipo-out-label">Expected Listing</div>
                      <div className="ipo-out-val" style={{color:pColor(calc.g)}}>Rs.{fmt(calc.listingPx)}</div>
                      <div className="ipo-out-sub">at current GMP</div>
                    </div>
                    <div className="ipo-out-card">
                      <div className="ipo-out-label">Expected Profit</div>
                      <div className="ipo-out-val" style={{color:pColor(calc.listingGain)}}>Rs.{fmt(Math.abs(calc.listingGain))}</div>
                      <div className="ipo-out-sub">{calc.listingGain >= 0 ? 'gain' : 'loss'} · {calc.n} lot{calc.n>1?'s':''}</div>
                    </div>
                    <div className="ipo-out-card">
                      <div className="ipo-out-label">Return on Capital</div>
                      <div className="ipo-out-val" style={{color:pColor(calc.returnPct)}}>{calc.returnPct !== null ? `${calc.returnPct.toFixed(1)}%` : '--'}</div>
                      <div className="ipo-out-sub">on issue price</div>
                    </div>
                    <div className="ipo-out-card">
                      <div className="ipo-out-label">Capital Efficiency</div>
                      <div className="ipo-out-val" style={{color:pColor(calc.capEff)}}>{calc.capEff !== null ? `${calc.capEff.toFixed(2)}%` : '--'}</div>
                      <div className="ipo-out-sub">return on Rs.{fmt(calc.capital)} blocked</div>
                    </div>
                  </>
                )}
                <div className="ipo-out-card">
                  <div className="ipo-out-label">Issue Price</div>
                  <div className="ipo-out-val">Rs.{fmt(calc.p)}</div>
                  <div className="ipo-out-sub">{calc.ls} shares per lot</div>
                </div>
                <div className="ipo-out-card">
                  <div className="ipo-out-label">Capital Blocked</div>
                  <div className="ipo-out-val">Rs.{fmt(calc.capital)}</div>
                  <div className="ipo-out-sub">{calc.n} lot{calc.n>1?'s':''} · ~5-7 days</div>
                </div>
                {allot && (
                  <div className="ipo-out-card">
                    <div className="ipo-out-label">Allotment Chance</div>
                    <div className="ipo-out-val" style={{color:allot.color}}>{allot.label}</div>
                    <div className="ipo-out-sub">{sub}x subscribed</div>
                  </div>
                )}
                <div className="ipo-out-card">
                  <div className="ipo-out-label">Break-even GMP</div>
                  <div className="ipo-out-val">Rs.{calc.breakEven}+</div>
                  <div className="ipo-out-sub">to cover charges</div>
                </div>
              </div>

              {/* Scenarios */}
              {calc.hasGmp && (
                <div className="ipo-scenarios">
                  <div className="ipo-scen-title">LISTING SCENARIOS</div>
                  <div className="ipo-scen-grid">
                    <div className="ipo-scen ipo-scen-bull">
                      <div className="ipo-scen-label">Bull Case</div>
                      <div className="ipo-scen-sub">GMP holds or rises</div>
                      <div className="ipo-scen-val" style={{color:'#00C896'}}>+Rs.{fmt(Math.abs(calc.listingGain ?? 0))}</div>
                    </div>
                    <div className="ipo-scen ipo-scen-neutral">
                      <div className="ipo-scen-label">Flat Listing</div>
                      <div className="ipo-scen-sub">Lists at issue price</div>
                      <div className="ipo-scen-val" style={{color:'var(--text3)'}}>Rs.0</div>
                    </div>
                    <div className="ipo-scen ipo-scen-bear">
                      <div className="ipo-scen-label">Bear Case</div>
                      <div className="ipo-scen-sub">Lists below issue price (5%)</div>
                      <div className="ipo-scen-val" style={{color:'#FF4455'}}>-Rs.{fmt(Math.round(calc.p * 0.05 * calc.ls * calc.n))}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Signals */}
              {sigs.length > 0 && (
                <div className="ipo-signals">
                  <div className="ipo-scen-title">SIGNAL ANALYSIS</div>
                  {sigs.map((s,i) => (
                    <div key={i} className="ipo-sig-row">
                      <span className="ipo-sig-icon" style={{color:s.type==='bull'?'#00C896':s.type==='bear'?'#FF4455':'#F59E0B'}}>{s.type==='bull'?'✔':s.type==='bear'?'✖':'⚠'}</span>
                      <span className="ipo-sig-text">{s.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lot strategy note */}
              {calc.n > 1 && (
                <div className="ipo-lot-note">
                  <div className="ipo-scen-title">LOT STRATEGY</div>
                  <div className="ipo-lot-compare">
                    <div className="ipo-lot-compare-item">
                      <div className="ipo-lot-compare-label">1 lot strategy</div>
                      <div className="ipo-lot-compare-val">Better allotment probability in oversubscribed IPOs</div>
                    </div>
                    <div className="ipo-lot-compare-item">
                      <div className="ipo-lot-compare-label">{calc.n} lots strategy</div>
                      <div className="ipo-lot-compare-val">{calc.hasGmp ? `Rs.${fmt(Math.abs(calc.listingGain ?? 0))} if allotted — but lower allotment odds` : 'Higher profit if allotted — but lower allotment odds'}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* HOW TO APPLY — collapsible */}
      <div className="ipo-collapse-section">
        <button className="ipo-collapse-toggle" onClick={()=>setStepsOpen(v=>!v)}>
          <span>HOW TO APPLY</span>
          <span className="ipo-collapse-chevron">{stepsOpen?'▲ Collapse':'▼ Expand'}</span>
        </button>
        {stepsOpen && (
          <div className="ipo-steps-grid">
            {STEPS.map((s,i) => (
              <div key={i} className="ipo-step">
                <div className="ipo-step-n">{s.n}</div>
                <div className="ipo-step-body">
                  <div className="ipo-step-title">{s.title}</div>
                  <div className="ipo-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
            <div className="ipo-allot-links">
              <div className="ipo-allot-title">CHECK ALLOTMENT STATUS</div>
              <a href="https://kosipo.kfintech.com/" target="_blank" rel="noopener noreferrer" className="ipo-allot-btn">KFintech ↗</a>
              <a href="https://linkintime.co.in/MIPO/Ipoallotment.html" target="_blank" rel="noopener noreferrer" className="ipo-allot-btn">Link Intime ↗</a>
              <a href="https://ris.kfintech.com/ipostatus" target="_blank" rel="noopener noreferrer" className="ipo-allot-btn">SEBI Registrar ↗</a>
            </div>
          </div>
        )}
      </div>

      {/* IPO PLAYBOOK — always visible */}
      <div className="ipo-playbook">
        <div className="ipo-playbook-title">IPO PLAYBOOK</div>
        <div className="ipo-playbook-grid">
          {PLAYBOOK.map((p,i) => (
            <div key={i} className="ipo-playbook-item">
              <span className="ipo-playbook-icon">{p.icon}</span>
              <span className="ipo-playbook-text">{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ipo-footer">
        This tool is for educational use only. GMP is an unofficial, unregulated market. Listing price is not guaranteed. Not investment advice.
      </div>
    </div>
  );
}
