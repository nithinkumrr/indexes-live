import { useState, useMemo, useEffect } from 'react';

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
  if (score >= 3)  return { tag:'STRONG GMP', color:'#00C896', glow:'rgba(0,200,150,.15)', icon:'✔', line:'GMP well above issue price. Strong listing signal based on current grey market.' };
  if (score >= 2)  return { tag:'POSITIVE',   color:'#00C896', glow:'rgba(0,200,150,.1)',  icon:'✔', line:'Solid GMP signal. Listing premium visible in grey market.' };
  if (score >= 1)  return { tag:'MODERATE',   color:'#F59E0B', glow:'rgba(245,158,11,.1)', icon:'⚠', line:'Moderate GMP. Listing pop possible but limited room.' };
  if (score === 0) return { tag:'NEUTRAL',    color:'#F59E0B', glow:'rgba(245,158,11,.08)',icon:'⚠', line:'GMP near zero. Grey market pricing close to issue price.' };
  return               { tag:'WEAK GMP',    color:'#FF4455', glow:'rgba(255,68,85,.1)',  icon:'✖', line:'GMP below issue price. Grey market pricing a listing discount.' };
}

function getSignals(returnPct, gmpTrend, subTimes, hasGmp, lots) {
  const s = [];
  if (hasGmp) {
    if (returnPct > 40)       s.push({ type:'bull', text:'Strong GMP — high listing premium priced in grey market' });
    else if (returnPct > 20)  s.push({ type:'bull', text:'Solid GMP — meaningful listing premium visible' });
    else if (returnPct > 0)   s.push({ type:'warn', text:'Moderate GMP — limited listing pop expected' });
    else if (returnPct <= 0)  s.push({ type:'bear', text:'Negative or zero GMP — grey market pricing below issue price' });
  }
  if (gmpTrend === 'rising')  s.push({ type:'bull', text:'GMP rising — grey market momentum building' });
  if (gmpTrend === 'falling') s.push({ type:'bear', text:'GMP falling — grey market losing steam before listing' });
  if (subTimes > 200) s.push({ type:'bear', text:`${subTimes}x subscribed — very low allotment probability for retail` });
  else if (subTimes > 50)  s.push({ type:'warn', text:`${subTimes}x subscribed — allotment unlikely with multiple lots` });
  else if (subTimes > 0 && subTimes < 5) s.push({ type:'warn', text:`Only ${subTimes}x subscribed — weak demand signal from retail` });
  if (lots > 1 && subTimes > 50) s.push({ type:'warn', text:'Multiple lots with high subscription — 1 lot gives better allotment odds' });
  return s;
}

function getAllotment(subTimes) {
  if (!subTimes) return null;
  if (subTimes > 200) return { label:'Very Low',      color:'#FF4455' };
  if (subTimes > 100) return { label:'Low',           color:'#FF4455' };
  if (subTimes > 50)  return { label:'Low-Moderate',  color:'#F59E0B' };
  if (subTimes > 20)  return { label:'Moderate',      color:'#F59E0B' };
  if (subTimes > 5)   return { label:'Moderate-High', color:'#00C896' };
  return                     { label:'Higher',        color:'#00C896' };
}

// ── Data ──────────────────────────────────────────────────────────────────────
const APPLY_STEPS = [
  { n:'1', t:'Open IPO section', d:'Go to the IPO tab in your brokerage app or web platform. Check that the issue is open and note the closing date.' },
  { n:'2', t:'Select the IPO', d:'Find the live IPO. Confirm issue open and close dates before proceeding.' },
  { n:'3', t:'Bid at cut-off price', d:'Select cut-off price (upper end of the band). This maximises your allotment probability over lower bids.' },
  { n:'4', t:'1 lot = best odds', d:'In oversubscribed IPOs, 1 lot per unique applicant gives the best allotment probability. Multiple lots do not help in a lottery.' },
  { n:'5', t:'UPI fund block', d:'Funds are blocked (not debited) via UPI mandate until allotment. They remain in your account and earn interest.' },
  { n:'6', t:'Allotment in ~5 days', d:'Check allotment status on KFintech, Link Intime, NSE, or BSE using your PAN or application number.' },
  { n:'7', t:'Refund if not allotted', d:'UPI block is released within 1 business day of allotment. Stock gets listed the next trading day.' },
];

const ALLOTMENT_LINKS = [
  { label:'KFintech', href:'https://kosipo.kfintech.com/' },
  { label:'Link Intime', href:'https://linkintime.co.in/MIPO/Ipoallotment.html' },
  { label:'NSE', href:'https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids' },
  { label:'BSE', href:'https://www.bseindia.com/investors/appli_check.aspx' },
];

const PLAYBOOK = [
  { icon:'⚡', text:'GMP is unofficial and unregulated. It swings 30–50% in the 24 hours before listing and is not audited by any exchange.' },
  { icon:'📦', text:'Large issues (Rs.3,000 Cr+) typically see smaller listing pops. More shares = more supply hitting the market on day 1.' },
  { icon:'📉', text:'Falling GMP in the final 2 days before listing signals grey market participants are exiting positions.' },
  { icon:'🎯', text:'1 lot per family member maximises total allotment in oversubscribed IPOs. Multiple lots in one name do not help.' },
  { icon:'💧', text:'Capital is blocked 5–7 days via UPI. Factor in opportunity cost, especially during volatile market conditions.' },
  { icon:'🏦', text:'QIB subscription (10x+) is the most reliable positive signal. Institutional demand is a better indicator than retail GMP.' },
  { icon:'🔢', text:'Actual return = gain on capital blocked, not issue price. Rs.500 profit on Rs.1.5L blocked = only 0.33% in a week.' },
  { icon:'🔒', text:'Beware of lock-in expiries, as they may lead to increased selling activity. Currently, one can check these under Fundamentals → Events on Zerodha Kite. Powered by Tijori Finance.' },
  { icon:'📊', text:'Listing day performance and 6-month post-listing performance are often uncorrelated. Both timeframes need separate evaluation.' },
  { icon:'🔁', text:'Some IPOs underperform on day 1 but re-rate meaningfully 3–6 months post-listing as quarterly results come in.' },
];

const fmt = v => v != null ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '';
const fmtF = (v, d=1) => v != null ? Number(v).toFixed(d) : '';
const pColor = v => v == null ? 'var(--text)' : v > 0 ? '#00C896' : v < 0 ? '#FF4455' : 'var(--text3)';

export default function IpoPage() {
  const [name,     setName]     = useState('');
  const [price,    setPrice]    = useState('');
  const [lotSize,  setLotSize]  = useState('');
  const [lots,     setLots]     = useState('1');
  const [gmp,      setGmp]      = useState('');
  const [gmpTrend, setGmpTrend] = useState('flat');
  const [subTimes, setSubTimes] = useState('');

  const calc = useMemo(() => {
    const p   = parseFloat(price);
    const ls  = parseInt(lotSize);
    const n   = parseInt(lots) || 1;
    const g   = parseFloat(gmp);
    const sub = parseFloat(subTimes) || 0;
    if (!p || !ls || p <= 0 || ls <= 0) return null;
    const hasGmp    = gmp !== '' && !isNaN(g);
    const capital   = p * ls * n;
    const listingPx = hasGmp ? p + g : null;
    const gain      = hasGmp ? g * ls * n : null;
    const returnPct = hasGmp ? (g / p) * 100 : null;
    const capEff    = hasGmp && gain !== null ? (gain / capital) * 100 : null;
    const breakEven = Math.ceil(p * 0.005);
    const worstCase = -Math.round(p * 0.05 * ls * n);
    return { p, ls, n, capital, listingPx, gain, returnPct, capEff, hasGmp, g, sub, breakEven, worstCase };
  }, [price, lotSize, lots, gmp, subTimes]);

  const sub   = parseFloat(subTimes) || 0;
  const dec   = decide(calc?.returnPct ?? 0, gmpTrend, sub, calc?.hasGmp ?? false);
  const sigs  = calc ? getSignals(calc.returnPct ?? 0, gmpTrend, sub, calc.hasGmp, parseInt(lots)||1) : [];
  const allot = sub > 0 ? getAllotment(sub) : null;

  return (
    <div className="ipo-wrap">

      {/* HEADER */}
      <div className="ipo2-header">
        {/* LEFT 50%: Title */}
        <div className="ipo2-header-left">
          <div className="ipo2-title">IPO Decision Tool</div>
          <div className="ipo2-sub">Enter details. Get instant listing estimate, risk read, and decision signal.</div>
        </div>
        {/* RIGHT 50%: Quick links — bigger, highlighted, grouped */}
        <div className="ipo2-header-right">
          <div className="ipo2-link-section">
            <span className="ipo2-link-cat">GMP</span>
            <a href="https://www.investorgain.com/report/live-ipo-gmp/331/" target="_blank" rel="noopener noreferrer" className="ipo2-qlink ipo2-qlink-gmp">InvestorGain ↗</a>
            <a href="https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/" target="_blank" rel="noopener noreferrer" className="ipo2-qlink ipo2-qlink-gmp">IPOWatch ↗</a>
          </div>
          <div className="ipo2-link-section">
            <span className="ipo2-link-cat">Subscription</span>
            <a href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo" target="_blank" rel="noopener noreferrer" className="ipo2-qlink ipo2-qlink-sub">NSE Live ↗</a>
          </div>
          <div className="ipo2-link-section">
            <span className="ipo2-link-cat">Allotment</span>
            {ALLOTMENT_LINKS.map((l,i)=><a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="ipo2-qlink ipo2-qlink-allot">{l.label} ↗</a>)}
          </div>
        </div>
      </div>

      {/* MAIN: 40% INPUT | 60% OUTPUT */}
      <div className="ipo2-main">

        {/* LEFT 40%: Inputs */}
        <div className="ipo2-inputs">
          <div className="ipo2-section-label">IPO DETAILS</div>

          <input className="ipo2-name-input" placeholder="IPO Name (optional)" value={name} onChange={e=>setName(e.target.value)} />

          <div className="ipo2-row2">
            <div className="ipo2-field">
              <label className="ipo2-label">Issue Price (Rs.)</label>
              <input className="ipo2-input" type="number" placeholder="e.g. 480" value={price} onChange={e=>setPrice(e.target.value)} />
            </div>
            <div className="ipo2-field">
              <label className="ipo2-label">Lot Size (shares)</label>
              <input className="ipo2-input" type="number" placeholder="e.g. 31" value={lotSize} onChange={e=>setLotSize(e.target.value)} />
            </div>
          </div>

          <div className="ipo2-field">
            <label className="ipo2-label">Lots Applying</label>
            <div className="ipo2-lot-row">
              {['1','2','3','5'].map(v=>(
                <button key={v} className={`ipo2-lot-pill${lots===v?' active':''}`} onClick={()=>setLots(v)}>{v} lot{v!=='1'?'s':''}</button>
              ))}
              <input className="ipo2-input ipo2-lot-custom" type="number" placeholder="other" value={!['1','2','3','5'].includes(lots)?lots:''} onChange={e=>{if(e.target.value)setLots(e.target.value);}} />
            </div>
            {parseInt(lots) > 1 && sub > 50 && <div className="ipo2-hint warn">High subscription — 1 lot maximises allotment odds</div>}
          </div>

          <div className="ipo2-row2">
            <div className="ipo2-field">
              <label className="ipo2-label">GMP (Rs.) <a href="https://www.investorgain.com/report/live-ipo-gmp/331/" target="_blank" rel="noopener noreferrer" className="ipo2-label-link">get ↗</a></label>
              <input className="ipo2-input" type="number" placeholder="e.g. 90 (or 0)" value={gmp} onChange={e=>setGmp(e.target.value)} />
            </div>
            <div className="ipo2-field">
              <label className="ipo2-label">Subscription <a href="https://www.nseindia.com/market-data/all-upcoming-issues-ipo" target="_blank" rel="noopener noreferrer" className="ipo2-label-link">NSE ↗</a></label>
              <input className="ipo2-input" type="number" placeholder="times (e.g. 45)" value={subTimes} onChange={e=>setSubTimes(e.target.value)} />
            </div>
          </div>

          {gmp !== '' && (
            <div className="ipo2-field">
              <label className="ipo2-label">GMP Trend</label>
              <div className="ipo2-seg">
                {[['rising','↑ Rising'],['flat','→ Flat'],['falling','↓ Falling']].map(([v,l])=>(
                  <button key={v} className={`ipo2-seg-btn${gmpTrend===v?' active':''}`} onClick={()=>setGmpTrend(v)}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Capital stats bar */}
          {calc && (
            <div className="ipo2-stats-bar">
              <div className="ipo2-stat"><div className="ipo2-stat-label">CAPITAL BLOCKED</div><div className="ipo2-stat-val">Rs.{fmt(calc.capital)}</div></div>
              <div className="ipo2-stat"><div className="ipo2-stat-label">LOCK PERIOD</div><div className="ipo2-stat-val">~5–7 days</div></div>
              <div className="ipo2-stat"><div className="ipo2-stat-label">BREAK-EVEN GMP</div><div className="ipo2-stat-val">Rs.{calc.breakEven}+</div></div>
              <div className="ipo2-stat"><div className="ipo2-stat-label">MAX DOWNSIDE (5%)</div><div className="ipo2-stat-val" style={{color:'#FF4455'}}>-Rs.{fmt(Math.abs(calc.worstCase))}</div></div>
            </div>
          )}
        </div>

        {/* RIGHT 60%: Live output */}
        <div className="ipo2-output" style={dec?{boxShadow:`inset 0 0 0 1px ${dec.color}20`}:{}}>
          {!calc ? (
            <div className="ipo2-empty">
              <div className="ipo2-empty-title">Fill inputs → instant decision</div>
              <div className="ipo2-empty-list">
                <span>→ Expected listing price</span>
                <span>→ Profit estimate</span>
                <span>→ Allotment probability</span>
                <span>→ Capital efficiency</span>
                <span>→ GMP signals</span>
              </div>
            </div>
          ) : (
            <>
              {name && <div className="ipo2-out-name">{name}</div>}

              {/* Decision */}
              {dec && (
                <div className="ipo2-decision" style={{color:dec.color}}>
                  <span className="ipo2-decision-icon">{dec.icon}</span>
                  <span className="ipo2-decision-tag">{dec.tag}</span>
                  <span className="ipo2-decision-line">{dec.line}</span>
                </div>
              )}

              {/* Primary numbers */}
              <div className="ipo2-numbers">
                {calc.hasGmp && (
                  <>
                    <div className="ipo2-num ipo2-num-hero">
                      <div className="ipo2-num-label">PROFIT / LOSS</div>
                      <div className="ipo2-num-val" style={{color:pColor(calc.gain)}}>{(calc.gain??0)>=0?'+':''}Rs.{fmt(Math.abs(calc.gain??0))}</div>
                      <div className="ipo2-num-sub">{calc.n} lot{calc.n>1?'s':''}</div>
                    </div>
                    <div className="ipo2-num">
                      <div className="ipo2-num-label">EXPECTED LISTING</div>
                      <div className="ipo2-num-val" style={{color:pColor(calc.g)}}>Rs.{fmt(calc.listingPx)}</div>
                      <div className="ipo2-num-sub">at current GMP</div>
                    </div>
                    <div className="ipo2-num">
                      <div className="ipo2-num-label">RETURN %</div>
                      <div className="ipo2-num-val" style={{color:pColor(calc.returnPct)}}>{fmtF(calc.returnPct,1)}%</div>
                      <div className="ipo2-num-sub">on issue price</div>
                    </div>
                    <div className="ipo2-num">
                      <div className="ipo2-num-label">CAPITAL EFFICIENCY</div>
                      <div className="ipo2-num-val" style={{color:pColor(calc.capEff)}}>{calc.capEff!==null?fmtF(calc.capEff,2)+'%':'--'}</div>
                      <div className="ipo2-num-sub">return on blocked capital</div>
                    </div>
                  </>
                )}
                <div className="ipo2-num">
                  <div className="ipo2-num-label">CAPITAL BLOCKED</div>
                  <div className="ipo2-num-val">Rs.{fmt(calc.capital)}</div>
                  <div className="ipo2-num-sub">~5–7 day lock</div>
                </div>
                {allot && (
                  <div className="ipo2-num">
                    <div className="ipo2-num-label">ALLOTMENT CHANCE</div>
                    <div className="ipo2-num-val" style={{color:allot.color}}>{allot.label}</div>
                    <div className="ipo2-num-sub">{sub}x subscribed</div>
                  </div>
                )}
              </div>

              {/* Signals */}
              {sigs.length > 0 && (
                <div className="ipo2-signals">
                  {sigs.map((s,i)=>(
                    <div key={i} className="ipo2-sig">
                      <span style={{color:s.type==='bull'?'#00C896':s.type==='bear'?'#FF4455':'#F59E0B',fontWeight:700,flexShrink:0}}>
                        {s.type==='bull'?'✔':s.type==='bear'?'✖':'⚠'}
                      </span>
                      <span className="ipo2-sig-text">{s.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scenarios */}
              {calc.hasGmp && (
                <div className="ipo2-scens">
                  <div className="ipo2-scen ipo2-scen-bull">
                    <div className="ipo2-scen-label">Bull Case</div>
                    <div className="ipo2-scen-val" style={{color:'#00C896'}}>+Rs.{fmt(Math.abs(calc.gain??0))}</div>
                    <div className="ipo2-scen-note">GMP holds into listing</div>
                  </div>
                  <div className="ipo2-scen ipo2-scen-neutral">
                    <div className="ipo2-scen-label">Flat</div>
                    <div className="ipo2-scen-val" style={{color:'var(--text3)'}}>Rs.0</div>
                    <div className="ipo2-scen-note">Lists at issue price</div>
                  </div>
                  <div className="ipo2-scen ipo2-scen-bear">
                    <div className="ipo2-scen-label">Bear Case</div>
                    <div className="ipo2-scen-val" style={{color:'#FF4455'}}>-Rs.{fmt(Math.abs(calc.worstCase))}</div>
                    <div className="ipo2-scen-note">5% below issue price</div>
                  </div>
                </div>
              )}

              {/* Lot strategy */}
              {calc.n > 1 && (
                <div className="ipo2-lot-note">
                  <span className="ipo2-lot-note-label">LOT STRATEGY</span>
                  <span className="ipo2-lot-note-text">1 lot = best allotment probability · {calc.n} lots = {calc.hasGmp?`Rs.${fmt(Math.abs(calc.gain??0))} if allotted, lower odds`:'higher profit if allotted, lower odds'}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BOTTOM: HOW TO APPLY (50%) + IPO PLAYBOOK (50%) */}
      <div className="ipo2-bottom">

        {/* HOW TO APPLY */}
        <div className="ipo2-apply">
          <div className="ipo2-section-label">HOW TO APPLY</div>
          <div className="ipo2-steps">
            {APPLY_STEPS.map((s,i)=>(
              <div key={i} className="ipo2-step">
                <div className="ipo2-step-n">{s.n}</div>
                <div>
                  <div className="ipo2-step-title">{s.t}</div>
                  <div className="ipo2-step-desc">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="ipo2-allot-row">
            <span className="ipo2-allot-label">CHECK ALLOTMENT</span>
            {ALLOTMENT_LINKS.map((l,i)=>(
              <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" className="ipo2-allot-chip">{l.label} ↗</a>
            ))}
          </div>
        </div>

        {/* IPO PLAYBOOK */}
        <div className="ipo2-playbook">
          <div className="ipo2-section-label">IPO PLAYBOOK</div>
          <div className="ipo2-playbook-grid">
            {PLAYBOOK.map((p,i)=>(
              <div key={i} className="ipo2-play-item">
                <span className="ipo2-play-icon">{p.icon}</span>
                <span className="ipo2-play-text">{p.text}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="ipo2-footer">
        Educational use only. GMP is unofficial and unregulated. Listing price is not guaranteed. Not investment advice.
      </div>
    </div>
  );
}
