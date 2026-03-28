import { useState, useMemo, useEffect, useRef } from 'react';

// ── Decision engine ───────────────────────────────────────────────────────────
function decide(returnPct, gmpTrend, subTimes, hasGmp) {
  if (!hasGmp) return null;
  let score = 0;
  if (returnPct > 40)       score += 3;
  else if (returnPct > 20)  score += 2;
  else if (returnPct > 8)   score += 1;
  else if (returnPct <= 0)  score -= 2;
  if (gmpTrend === 'rising')  score += 1;
  if (gmpTrend === 'falling') score -= 1;
  if (subTimes > 100) score -= 1;
  if (score >= 3)  return { tag:'STRONG APPLY', color:'#00C896', glow:'rgba(0,200,150,.18)', icon:'✔' };
  if (score >= 2)  return { tag:'APPLY', color:'#00C896', glow:'rgba(0,200,150,.12)', icon:'✔' };
  if (score >= 1)  return { tag:'APPLY IF AGGRESSIVE', color:'#F59E0B', glow:'rgba(245,158,11,.12)', icon:'⚠' };
  if (score === 0) return { tag:'NEUTRAL', color:'#F59E0B', glow:'rgba(245,158,11,.08)', icon:'⚠' };
  return { tag:'AVOID', color:'#FF4455', glow:'rgba(255,68,85,.12)', icon:'✖' };
}

function getSignals(returnPct, gmpTrend, subTimes, hasGmp) {
  const s = [];
  if (hasGmp) {
    if (returnPct > 40)      s.push({ type:'bull', text:'Strong GMP — high listing potential' });
    else if (returnPct > 20) s.push({ type:'bull', text:'Solid GMP — good listing expected' });
    else if (returnPct > 0)  s.push({ type:'warn', text:'Moderate GMP — limited pop expected' });
    else                     s.push({ type:'bear', text:'Negative/zero GMP — listing risk present' });
  }
  if (gmpTrend === 'rising')  s.push({ type:'bull', text:'GMP rising — momentum building' });
  if (gmpTrend === 'falling') s.push({ type:'bear', text:'Falling GMP — smart money exiting grey market' });
  if (subTimes > 200) s.push({ type:'bear', text:`${subTimes}x subscribed — very low allotment chance` });
  else if (subTimes > 50) s.push({ type:'warn', text:`${subTimes}x subscribed — allotment unlikely with multiple lots` });
  else if (subTimes > 0 && subTimes < 5) s.push({ type:'warn', text:`Only ${subTimes}x subscribed — weak demand signal` });
  return s;
}

function getAllotment(subTimes) {
  if (!subTimes) return null;
  if (subTimes > 200) return { label:'Very Low', color:'#FF4455' };
  if (subTimes > 100) return { label:'Low', color:'#FF4455' };
  if (subTimes > 50)  return { label:'Low-Moderate', color:'#F59E0B' };
  if (subTimes > 20)  return { label:'Moderate', color:'#F59E0B' };
  if (subTimes > 5)   return { label:'Moderate-High', color:'#00C896' };
  return { label:'Higher', color:'#00C896' };
}

// ── Playbook (tight 1-liners) ─────────────────────────────────────────────────
const PLAYBOOK = [
  { icon:'⚡', text:'High GMP does not guarantee a good listing. GMP swings 30–50% in 24 hrs before listing.' },
  { icon:'📦', text:'Large issues (Rs.3,000 Cr+) see smaller listing pops. More shares = more supply on day 1.' },
  { icon:'📉', text:'Falling GMP in the final 1–2 days before listing = smart money exiting the grey market.' },
  { icon:'🎯', text:'1 lot per family member maximises total allotment in oversubscribed IPOs. Multiple lots = lottery.' },
  { icon:'💧', text:'Capital is locked 5–7 days. Factor in opportunity cost, especially in volatile markets.' },
  { icon:'🏦', text:'QIB subscription (10x+) is the most reliable positive signal. More predictive than retail GMP.' },
  { icon:'🔢', text:'Real return = gain on capital blocked, not issue price. Rs.500 gain on Rs.1.5L blocked = 0.33%.' },
  { icon:'🔁', text:'Listing day is not the only exit. Some IPOs re-rate 3–6 months post-listing on fundamentals.' },
];

const APPLY_STEPS = [
  { n:'1', t:'Open your broker IPO section', d:'Go to IPO tab. Check issue open dates carefully.' },
  { n:'2', t:'Select IPO + enter bid', d:'Bid at cut-off price (upper band) to maximise allotment chance.' },
  { n:'3', t:'Apply via UPI block', d:'Funds are blocked (not debited) in your linked bank account until allotment.' },
  { n:'4', t:'Allotment in ~5 days', d:'Check status on KFintech, Link Intime, NSE, or BSE using your PAN.' },
  { n:'5', t:'Refund if not allotted', d:'Funds unblocked within 1 day of allotment. Stock listed next trading day.' },
];

const fmt = v => v != null ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '';
const fmtF = (v, d=1) => v != null ? Number(v).toFixed(d) : '';

export default function IpoPage() {
  const [name,     setName]     = useState('');
  const [price,    setPrice]    = useState('');
  const [lotSize,  setLotSize]  = useState('');
  const [lots,     setLots]     = useState('1');
  const [gmp,      setGmp]      = useState('');
  const [gmpTrend, setGmpTrend] = useState('flat');
  const [subTimes, setSubTimes] = useState('');
  const [stepsOpen,setStepsOpen]= useState(false);
  const [glowing,  setGlowing]  = useState(false);
  const prevCalc = useRef(null);

  const calc = useMemo(() => {
    const p   = parseFloat(price);
    const ls  = parseInt(lotSize);
    const n   = parseInt(lots) || 1;
    const g   = parseFloat(gmp);
    const sub = parseFloat(subTimes) || 0;
    if (!p || !ls || p <= 0 || ls <= 0) return null;
    const hasGmp      = gmp !== '' && !isNaN(g);
    const capital     = p * ls * n;
    const listingPx   = hasGmp ? p + g : null;
    const gain        = hasGmp ? g * ls * n : null;
    const returnPct   = hasGmp ? (g / p) * 100 : null;
    const capEff      = hasGmp && gain !== null ? (gain / capital) * 100 : null;
    const breakEven   = Math.ceil(p * 0.005); // ~0.5% to cover charges
    const worstCase   = -Math.round(p * 0.05 * ls * n);
    return { p, ls, n, capital, listingPx, gain, returnPct, capEff, hasGmp, g, sub, breakEven, worstCase };
  }, [price, lotSize, lots, gmp, subTimes]);

  // Glow on change
  useEffect(() => {
    if (calc && JSON.stringify(calc) !== JSON.stringify(prevCalc.current)) {
      setGlowing(true);
      prevCalc.current = calc;
      const t = setTimeout(() => setGlowing(false), 600);
      return () => clearTimeout(t);
    }
  }, [calc]);

  const sub    = parseFloat(subTimes) || 0;
  const dec    = decide(calc?.returnPct ?? 0, gmpTrend, sub, calc?.hasGmp ?? false);
  const sigs   = calc ? getSignals(calc.returnPct ?? 0, gmpTrend, sub, calc.hasGmp) : [];
  const allot  = sub > 0 ? getAllotment(sub) : null;
  const pColor = v => v == null ? 'var(--text)' : v > 0 ? '#00C896' : v < 0 ? '#FF4455' : 'var(--text3)';

  // Lot quick-select
  const lotOptions = ['1','2','3','5'];

  return (
    <div className="ipo-wrap">

      {/* HEADER: title + grouped quick links */}
      <div className="ipo-header">
        <div>
          <div className="ipo-page-title">IPO Decision Tool</div>
          <div className="ipo-page-sub">Enter 3 fields. Get instant decision.</div>
        </div>
        <div className="ipo-link-groups">
          <div className="ipo-link-group">
            <span className="ipo-link-group-label">GMP</span>
            <a href="https://www.investorgain.com/report/live-ipo-gmp/331/" target="_blank" rel="noopener noreferrer" className="ipo-qlink">InvestorGain ↗</a>
            <a href="https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/" target="_blank" rel="noopener noreferrer" className="ipo-qlink">IPOWatch ↗</a>
          </div>
          <div className="ipo-link-group">
            <span className="ipo-link-group-label">Subscription</span>
            <a href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo" target="_blank" rel="noopener noreferrer" className="ipo-qlink">NSE Live ↗</a>
          </div>
          <div className="ipo-link-group">
            <span className="ipo-link-group-label">Allotment</span>
            <a href="https://kosipo.kfintech.com/" target="_blank" rel="noopener noreferrer" className="ipo-qlink">KFintech ↗</a>
            <a href="https://linkintime.co.in/MIPO/Ipoallotment.html" target="_blank" rel="noopener noreferrer" className="ipo-qlink">Link Intime ↗</a>
            <a href="https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids" target="_blank" rel="noopener noreferrer" className="ipo-qlink">NSE ↗</a>
            <a href="https://www.bseindia.com/investors/appli_check.aspx" target="_blank" rel="noopener noreferrer" className="ipo-qlink">BSE ↗</a>
          </div>
        </div>
      </div>

      {/* MAIN: INPUTS (left) + LIVE OUTPUT (right) */}
      <div className="ipo-main">

        {/* LEFT: COMPACT INPUTS */}
        <div className="ipo-inputs">

          {/* IPO name */}
          <input className="ipo-name-input" placeholder="IPO Name (optional)" value={name} onChange={e=>setName(e.target.value)} />

          {/* Row 1: Price | Lot Size | Lots */}
          <div className="ipo-input-row">
            <div className="ipo-field-compact">
              <label className="ipo-clabel">Issue Price (Rs.)</label>
              <input className="ipo-cinput" type="number" placeholder="e.g. 72" value={price} onChange={e=>setPrice(e.target.value)} />
            </div>
            <div className="ipo-field-compact">
              <label className="ipo-clabel">Lot Size</label>
              <input className="ipo-cinput" type="number" placeholder="shares" value={lotSize} onChange={e=>setLotSize(e.target.value)} />
            </div>
            <div className="ipo-field-compact">
              <label className="ipo-clabel">Lots</label>
              <div className="ipo-lot-row">
                {lotOptions.map(v=>(
                  <button key={v} className={`ipo-lot-pill ${lots===v?'active':''}`} onClick={()=>setLots(v)}>{v}</button>
                ))}
                <input className="ipo-cinput ipo-lot-custom" type="number" placeholder="…" value={!lotOptions.includes(lots)?lots:''} onChange={e=>{if(e.target.value)setLots(e.target.value);}} />
              </div>
            </div>
          </div>

          {/* Row 2: GMP | GMP Trend | Subscription */}
          <div className="ipo-input-row">
            <div className="ipo-field-compact">
              <label className="ipo-clabel">GMP (Rs.) <a href="https://www.investorgain.com/report/live-ipo-gmp/331/" target="_blank" rel="noopener noreferrer" className="ipo-label-link">get ↗</a></label>
              <input className="ipo-cinput" type="number" placeholder="e.g. 40" value={gmp} onChange={e=>setGmp(e.target.value)} />
            </div>
            <div className="ipo-field-compact">
              <label className="ipo-clabel">GMP Trend</label>
              <div className="ipo-seg">
                {[['rising','↑ Rising'],['flat','→ Flat'],['falling','↓ Falling']].map(([v,l])=>(
                  <button key={v} className={`ipo-seg-btn ${gmpTrend===v?'active':''}`} onClick={()=>setGmpTrend(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="ipo-field-compact">
              <label className="ipo-clabel">Subscription (x) <a href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo" target="_blank" rel="noopener noreferrer" className="ipo-label-link">NSE ↗</a></label>
              <input className="ipo-cinput" type="number" placeholder="e.g. 45" value={subTimes} onChange={e=>setSubTimes(e.target.value)} />
            </div>
          </div>

          {/* Lock-in note */}
          <div className="ipo-lockin-note">
            Track lock-in period expiry (promoter / early investor / ESOP) in Kite under Fundamentals → Events. Large shareholder unlocks often precede stock pressure. Powered by Tijori Finance.
          </div>

        </div>

        {/* RIGHT: LIVE OUTPUT */}
        <div className={`ipo-output ${glowing ? 'ipo-output-glow' : ''}`} style={dec ? {boxShadow:`0 0 0 1px ${dec.color}30, 0 4px 24px ${dec.glow}`} : {}}>

          {!calc ? (
            <div className="ipo-output-empty">
              <div className="ipo-empty-headline">Fill inputs → instant decision</div>
              <div className="ipo-empty-items">
                <span>Expected listing price</span>
                <span>Profit per lot</span>
                <span>Allotment probability</span>
                <span>Risk flags</span>
                <span>Go / No-go decision</span>
              </div>
            </div>
          ) : (
            <>
              {/* Name */}
              {name && <div className="ipo-out-name">{name}</div>}

              {/* Decision — BIG */}
              {dec && (
                <div className="ipo-decision" style={{color:dec.color}}>
                  <span className="ipo-decision-icon">{dec.icon}</span>
                  <span className="ipo-decision-tag">{dec.tag}</span>
                </div>
              )}

              {/* Primary numbers */}
              {calc.hasGmp && (
                <div className="ipo-primary-nums">
                  <div className="ipo-pnum">
                    <div className="ipo-pnum-label">EXPECTED LISTING</div>
                    <div className="ipo-pnum-val" style={{color:pColor(calc.g)}}>Rs.{fmt(calc.listingPx)}</div>
                  </div>
                  <div className="ipo-pnum ipo-pnum-hero">
                    <div className="ipo-pnum-label">PROFIT / LOSS</div>
                    <div className="ipo-pnum-val" style={{color:pColor(calc.gain)}}>
                      {calc.gain >= 0 ? '+' : ''}Rs.{fmt(Math.abs(calc.gain))}
                    </div>
                    <div className="ipo-pnum-sub">{calc.n} lot{calc.n>1?'s':''}</div>
                  </div>
                  <div className="ipo-pnum">
                    <div className="ipo-pnum-label">CAPITAL EFFICIENCY</div>
                    <div className="ipo-pnum-val" style={{color:pColor(calc.capEff)}}>{calc.capEff !== null ? `${fmtF(calc.capEff,1)}%` : '--'}</div>
                    <div className="ipo-pnum-sub">on Rs.{fmt(calc.capital)} blocked</div>
                  </div>
                </div>
              )}

              {/* Secondary row */}
              <div className="ipo-secondary-row">
                {allot && (
                  <div className="ipo-sec-item">
                    <div className="ipo-sec-label">ALLOTMENT</div>
                    <div className="ipo-sec-val" style={{color:allot.color}}>{allot.label}</div>
                  </div>
                )}
                <div className="ipo-sec-item">
                  <div className="ipo-sec-label">CAPITAL BLOCKED</div>
                  <div className="ipo-sec-val">Rs.{fmt(calc.capital)}</div>
                </div>
                <div className="ipo-sec-item">
                  <div className="ipo-sec-label">LOCK PERIOD</div>
                  <div className="ipo-sec-val">~5–7 days</div>
                </div>
                {calc.hasGmp && (
                  <div className="ipo-sec-item">
                    <div className="ipo-sec-label">RETURN %</div>
                    <div className="ipo-sec-val" style={{color:pColor(calc.returnPct)}}>{fmtF(calc.returnPct,1)}%</div>
                  </div>
                )}
              </div>

              {/* Signals */}
              {sigs.length > 0 && (
                <div className="ipo-sigs">
                  {sigs.map((s,i)=>(
                    <div key={i} className="ipo-sig">
                      <span style={{color:s.type==='bull'?'#00C896':s.type==='bear'?'#FF4455':'#F59E0B',fontWeight:700}}>
                        {s.type==='bull'?'✔':s.type==='bear'?'✖':'⚠'}
                      </span>
                      <span className="ipo-sig-text">{s.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scenarios */}
              {calc.hasGmp && (
                <div className="ipo-scens">
                  <div className="ipo-scen ipo-scen-bull">
                    <div className="ipo-scen-label">Bull</div>
                    <div className="ipo-scen-val" style={{color:'#00C896'}}>+Rs.{fmt(Math.abs(calc.gain??0))}</div>
                    <div className="ipo-scen-note">GMP holds</div>
                  </div>
                  <div className="ipo-scen ipo-scen-neutral">
                    <div className="ipo-scen-label">Flat</div>
                    <div className="ipo-scen-val" style={{color:'var(--text3)'}}>Rs.0</div>
                    <div className="ipo-scen-note">Lists at issue price</div>
                  </div>
                  <div className="ipo-scen ipo-scen-bear">
                    <div className="ipo-scen-label">Bear</div>
                    <div className="ipo-scen-val" style={{color:'#FF4455'}}>-Rs.{fmt(Math.abs(calc.worstCase))}</div>
                    <div className="ipo-scen-note">5% below issue</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SMART METRICS BAR */}
      {calc && (
        <div className="ipo-metrics-bar">
          <div className="ipo-metric">
            <span className="ipo-metric-label">Break-even GMP</span>
            <span className="ipo-metric-val">Rs.{calc.breakEven}+</span>
          </div>
          <div className="ipo-metric-div"/>
          <div className="ipo-metric">
            <span className="ipo-metric-label">Capital Blocked</span>
            <span className="ipo-metric-val">Rs.{fmt(calc.capital)}</span>
          </div>
          <div className="ipo-metric-div"/>
          <div className="ipo-metric">
            <span className="ipo-metric-label">Lock Duration</span>
            <span className="ipo-metric-val">5–7 days</span>
          </div>
          <div className="ipo-metric-div"/>
          <div className="ipo-metric">
            <span className="ipo-metric-label">Max Downside (5%)</span>
            <span className="ipo-metric-val" style={{color:'#FF4455'}}>-Rs.{fmt(Math.abs(calc.worstCase))}</span>
          </div>
          <div className="ipo-metric-div"/>
          <div className="ipo-metric">
            <span className="ipo-metric-label">1 Lot vs {calc.n} Lots</span>
            <span className="ipo-metric-val">{calc.n > 1 ? `${calc.n}x capital, lower allotment odds` : 'Best allotment odds'}</span>
          </div>
          {calc.hasGmp && calc.capEff !== null && (
            <>
              <div className="ipo-metric-div"/>
              <div className="ipo-metric">
                <span className="ipo-metric-label">Capital Efficiency</span>
                <span className="ipo-metric-val" style={{color:pColor(calc.capEff)}}>{fmtF(calc.capEff,2)}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* BOTTOM: HOW TO APPLY + PLAYBOOK SIDE BY SIDE */}
      <div className="ipo-bottom">

        {/* HOW TO APPLY — collapsible left */}
        <div className="ipo-apply-col">
          <button className="ipo-apply-toggle" onClick={()=>setStepsOpen(v=>!v)}>
            HOW TO APPLY
            <span>{stepsOpen?'▲':'▼'}</span>
          </button>
          {stepsOpen && (
            <div className="ipo-steps">
              {APPLY_STEPS.map((s,i)=>(
                <div key={i} className="ipo-step">
                  <div className="ipo-step-n">{s.n}</div>
                  <div>
                    <div className="ipo-step-title">{s.t}</div>
                    <div className="ipo-step-desc">{s.d}</div>
                  </div>
                </div>
              ))}
              <div className="ipo-allot-links-row">
                <span className="ipo-allot-label">CHECK ALLOTMENT:</span>
                {[
                  {label:'KFintech', href:'https://kosipo.kfintech.com/'},
                  {label:'Link Intime', href:'https://linkintime.co.in/MIPO/Ipoallotment.html'},
                  {label:'NSE', href:'https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids'},
                  {label:'BSE', href:'https://www.bseindia.com/investors/appli_check.aspx'},
                ].map((l,i)=>(
                  <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="ipo-allot-chip">{l.label} ↗</a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PLAYBOOK — compact grid right */}
        <div className="ipo-playbook-col">
          <div className="ipo-playbook-heading">IPO PLAYBOOK</div>
          <div className="ipo-playbook-grid">
            {PLAYBOOK.map((p,i)=>(
              <div key={i} className="ipo-playbook-item">
                <span className="ipo-playbook-icon">{p.icon}</span>
                <span className="ipo-playbook-text">{p.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="ipo-footer">
        Educational use only. GMP is unofficial and unregulated. Listing price is not guaranteed. Not investment advice.
      </div>
    </div>
  );
}
