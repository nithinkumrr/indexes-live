import { useState, useEffect, useMemo, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
const INR = v => {
  const n = Math.round(Math.abs(v));
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const INRF = v => `₹${Math.round(Math.abs(v)).toLocaleString('en-IN')}`;
const PCT  = (v, d = 2) => `${Number(v).toFixed(d)}%`;

// SIP FV
const sipFV = (monthly, rateAnnual, years) => {
  const r = rateAnnual / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
};
// Lump sum FV
const lsFV = (principal, rateAnnual, years) =>
  principal * Math.pow(1 + rateAnnual / 100, years);

// EMI
const emiAmt = (principal, rateAnnual, tenureYears) => {
  const r = rateAnnual / 100 / 12;
  const n = tenureYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

// ─────────────────────────────────────────────────────────────────────────────
// CSS INJECTION (slider + global calc styles)
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.ch-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; background: transparent; margin: 6px 0; }
.ch-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; }
.ch-slider::-moz-range-track { height: 4px; border-radius: 2px; background: var(--bg4); }
.ch-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,0.18); cursor: pointer; margin-top: -7px; }
.ch-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,0.18); cursor: pointer; }
.ch-tab-active { background: var(--accent) !important; color: #fff !important; border-color: var(--accent) !important; }
.ch-faq-open .ch-faq-icon { transform: rotate(45deg); }
.ch-section h3 { font-size: 17px; font-weight: 700; color: var(--text); margin: 0 0 10px; }
.ch-section p { font-size: 14px; color: var(--text2); line-height: 1.8; margin: 0 0 14px; }
.ch-section ul { padding-left: 18px; }
.ch-section ul li { font-size: 14px; color: var(--text2); line-height: 1.8; margin-bottom: 4px; }
.ch-formula-box { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 14px 18px; font-family: var(--mono); font-size: 13px; color: var(--text); margin: 12px 0 20px; line-height: 1.7; }
.ch-insight-box { background: var(--accent)10; border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 12px 16px; font-size: 13px; color: var(--text2); line-height: 1.7; margin: 16px 0; }
.ch-related a { display: inline-flex; align-items: center; gap: 6px; background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; padding: 8px 14px; font-size: 13px; color: var(--accent); text-decoration: none; font-weight: 600; cursor: pointer; }
.ch-related a:hover { background: var(--accent)18; }
@media (max-width: 700px) {
  .ch-shell-grid { grid-template-columns: 1fr !important; }
  .ch-donut-col { display: none !important; }
  .ch-res-grid { grid-template-columns: 1fr !important; }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Donut({ a, b, la = 'Invested', lb = 'Returns' }) {
  const total = (a || 0) + (b || 0);
  if (!total) return null;
  const pA = a / total;
  const r = 60, cx = 80, cy = 80, sw = 20;
  const circ = 2 * Math.PI * r;
  const dA = pA * circ;
  const dB = circ - dA;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
        {[{c:'#E8EAFF',l:la},{c:'#5B63F5',l:lb}].map((s,i) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text3)' }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:s.c, flexShrink:0 }}/>
            {s.l}
          </span>
        ))}
      </div>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg4)" strokeWidth={sw}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8EAFF" strokeWidth={sw}
          strokeDasharray={`${dA} ${dB}`} strokeLinecap="butt"
          transform={`rotate(-90 ${cx} ${cy})`}/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#5B63F5" strokeWidth={sw}
          strokeDasharray={`${dB} ${dA}`} strokeLinecap="butt"
          transform={`rotate(${-90 + pA*360} ${cx} ${cy})`}/>
      </svg>
    </div>
  );
}

function Donut3({ a, b, c, la, lb, lc, ca='#E8EAFF', cb='#5B63F5', cc='#00C896' }) {
  const total = (a||0)+(b||0)+(c||0);
  if (!total) return null;
  const segs = [{v:a,c:ca,l:la},{v:b,c:cb,l:lb},{v:c,c:cc,l:lc}];
  const r=60,cx=80,cy=80,sw=20,circ=2*Math.PI*r;
  let cum = -90;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        {segs.map((s,i) => (
          <span key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text3)' }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:s.c, flexShrink:0 }}/>{s.l}
          </span>
        ))}
      </div>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg4)" strokeWidth={sw}/>
        {segs.map((seg,i) => {
          const p = seg.v/total, d = p*circ, gap = circ-d, rot = cum;
          cum += p*360;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.c} strokeWidth={sw}
            strokeDasharray={`${d} ${gap}`} strokeLinecap="butt"
            transform={`rotate(${rot} ${cx} ${cy})`}/>;
        })}
      </svg>
    </div>
  );
}

function SliderRow({ label, value, set, min, max, step=1, pre='', suf='', fmt }) {
  const pct = Math.max(0, Math.min(100, ((value-min)/(max-min))*100));
  const display = fmt ? fmt(value) : value;
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:14, color:'var(--text2)' }}>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {pre && <span style={{ fontSize:14, color:'var(--accent)', fontFamily:'var(--mono)' }}>{pre}</span>}
          <div style={{ background:'var(--gain-bg)', border:'1px solid var(--accent)22', borderRadius:6, padding:'3px 10px',
            fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)', minWidth:90, display:'flex', alignItems:'center' }}>
            <input type="number" value={value}
              onChange={e => { const v=Number(e.target.value); if(!isNaN(v)) set(Math.max(min,Math.min(max,v))); }}
              style={{ background:'none', border:'none', outline:'none', width:'100%', fontSize:14, fontWeight:700,
                color:'var(--accent)', fontFamily:'var(--mono)', textAlign:'right' }}/>
          </div>
          {suf && <span style={{ fontSize:14, color:'var(--accent)', fontWeight:600 }}>{suf}</span>}
        </div>
      </div>
      <div style={{ position:'relative', height:18, display:'flex', alignItems:'center' }}>
        <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:'100%',
          height:4, background:'var(--bg4)', borderRadius:2 }}/>
        <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)',
          width:`${pct}%`, height:4, background:'var(--accent)', borderRadius:2 }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => set(Number(e.target.value))} className="ch-slider"
          style={{ position:'relative', zIndex:2, width:'100%' }}/>
      </div>
    </div>
  );
}

function RRow({ label, value, bold, accent, sub }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
      padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
      <span style={{ fontSize:13, color:'var(--text3)', lineHeight:1.4 }}>{label}</span>
      <div style={{ textAlign:'right' }}>
        <span style={{ fontSize: bold?16:14, fontWeight: bold?800:600,
          color: accent?'var(--accent)':'var(--text)', fontFamily:'var(--mono)' }}>{value}</span>
        {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ModeTab({ options, active, set }) {
  return (
    <div style={{ display:'inline-flex', background:'var(--bg3)', borderRadius:10, padding:3, marginBottom:20, gap:2 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => set(o.id)}
          style={{ padding:'6px 18px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: active===o.id ? 'var(--accent)' : 'transparent',
            color: active===o.id ? '#fff' : 'var(--text3)', transition:'all 0.15s' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Shell({ inputs, donut, results, cta, ctaLabel='INVEST NOW', donuts }) {
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div className="ch-shell-grid" style={{ display:'grid', gridTemplateColumns:'1fr 220px', gap:0 }}>
        <div style={{ padding:'26px 28px' }}>{inputs}</div>
        {(donut||donuts) && (
          <div className="ch-donut-col" style={{ padding:'26px 20px', borderLeft:'1px solid var(--border)',
            display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:16 }}>
            {donut||donuts}
          </div>
        )}
      </div>
      <div className="ch-res-grid" style={{ padding:'20px 28px 24px', borderTop:'1px solid var(--border)',
        display:'grid', gridTemplateColumns:'1fr auto', gap:32, alignItems:'end' }}>
        <div>{results}</div>
        {cta && (
          <button style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:8,
            padding:'12px 22px', fontSize:13, fontWeight:700, cursor:'pointer', letterSpacing:'0.05em',
            whiteSpace:'nowrap', alignSelf:'flex-end' }}>{ctaLabel}</button>
        )}
      </div>
    </div>
  );
}

function FAQ({ faqs }) {
  const [open, setOpen] = useState(null);
  return (
    <div>
      {faqs.map((f,i) => (
        <div key={i} className={open===i?'ch-faq-open':''} style={{ borderBottom:'1px solid var(--border)' }}>
          <button onClick={() => setOpen(open===i?null:i)}
            style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%',
              padding:'14px 0', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:12 }}>
            <span style={{ fontSize:14, fontWeight:600, color:'var(--text)', lineHeight:1.4 }}>{f.q}</span>
            <span className="ch-faq-icon" style={{ fontSize:20, color:'var(--text3)', flexShrink:0, display:'inline-block',
              transition:'transform 0.2s' }}>+</span>
          </button>
          {open===i && <div style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.75, paddingBottom:16 }}>{f.a}</div>}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="ch-section" style={{ marginBottom:28 }}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function RelatedCalcs({ ids, nav }) {
  const items = CALC_REGISTRY.filter(c => ids.includes(c.id));
  return (
    <div className="ch-related" style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:8 }}>
      {items.map(c => (
        <a key={c.id} onClick={() => nav(c.id)}>{c.label} →</a>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATORS
// ─────────────────────────────────────────────────────────────────────────────

function SipCalc({ nav }) {
  const [mode, setMode] = useState('sip');
  const [amount, setAmount] = useState(25000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const { invested, returns, total } = useMemo(() => {
    if (mode === 'sip') {
      const t = sipFV(amount, rate, years);
      const inv = amount * years * 12;
      return { invested: inv, returns: t - inv, total: t };
    } else {
      const t = lsFV(amount, rate, years);
      return { invested: amount, returns: t - amount, total: t };
    }
  }, [mode, amount, rate, years]);
  return (<>
    <Shell
      inputs={<>
        <ModeTab options={[{id:'sip',label:'SIP'},{id:'lumpsum',label:'Lumpsum'}]} active={mode} set={setMode}/>
        <SliderRow label={mode==='sip'?'Monthly investment':'Total investment'} value={amount} set={setAmount} min={500} max={500000} step={500} pre="₹"/>
        <SliderRow label="Expected return rate (p.a)" value={rate} set={setRate} min={1} max={30} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
      </>}
      donut={<Donut a={invested} b={returns}/>}
      results={<>
        <RRow label="Invested amount" value={INRF(invested)}/>
        <RRow label="Est. returns" value={INRF(returns)}/>
        <RRow label="Total value" value={INRF(total)} bold/>
      </>}
      cta ctaLabel="INVEST NOW"
    />
    <SipSEO nav={nav}/>
  </>);
}

function LumpsumCalc({ nav }) {
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const total = useMemo(() => lsFV(amount, rate, years), [amount, rate, years]);
  const returns = total - amount;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Total investment" value={amount} set={setAmount} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Expected return rate (p.a)" value={rate} set={setRate} min={1} max={30} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
      </>}
      donut={<Donut a={amount} b={returns}/>}
      results={<>
        <RRow label="Invested amount" value={INRF(amount)}/>
        <RRow label="Est. returns" value={INRF(returns)}/>
        <RRow label="Total value" value={INRF(total)} bold/>
      </>}
      cta ctaLabel="INVEST NOW"
    />
    <div className="ch-section">
      <Section title="What is a Lumpsum Investment?">
        <p>A lumpsum investment is when you put a single large amount into a mutual fund all at once, instead of spreading it out monthly. It works best when you have a windfall — a bonus, inheritance, or sale proceeds — and want to put it to work immediately.</p>
        <p>Unlike SIP, which benefits from rupee cost averaging, a lumpsum investment is entirely exposed to market timing. Invest at a market peak and returns suffer; invest at a dip and they can be spectacular.</p>
      </Section>
      <Section title="How the Calculator Works">
        <p>The lumpsum calculator applies compound interest annually to your investment. It uses the standard future value formula assuming a constant rate of return, which is a reasonable approximation for long-term equity mutual fund returns.</p>
        <div className="ch-formula-box">FV = P × (1 + r)ⁿ<br/>Where P = invested amount, r = annual return rate, n = number of years</div>
      </Section>
      <Section title="Example">
        <p>You invest ₹5 Lakhs in an equity mutual fund at an expected 12% return. After 15 years: FV = 5,00,000 × (1.12)¹⁵ = ₹27.37 Lakhs. Your ₹5L became ₹27L — the power of compounding over time.</p>
      </Section>
      <div className="ch-insight-box">💡 A lumpsum in an index fund during a market correction historically outperforms SIP over the same period. If you have conviction and timing, lumpsum can deliver better results.</div>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Is lumpsum better than SIP?',a:'Neither is universally better. SIP reduces timing risk through averaging. Lumpsum is better if you invest during market corrections. For most retail investors, SIP is safer.'},
          {q:'What is the minimum lumpsum investment?',a:'Most mutual funds have a minimum lumpsum of ₹1,000 to ₹5,000. Direct plans via AMC websites often have lower minimums.'},
          {q:'Can I do lumpsum in any mutual fund?',a:'Yes — equity, debt, hybrid, index funds. The expected return rate will differ. Equity: 10-14%, Debt: 6-8%.'},
          {q:'Is lumpsum investment taxable?',a:'Yes. Short-term capital gains (< 1 year for equity) are taxed at 20%. Long-term gains above ₹1.25L are taxed at 12.5% for equity funds.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','step-up-sip','cagr']} nav={nav}/></Section>
    </div>
  </>);
}

function SipSEO({ nav }) {
  return (
    <div>
      <Section title="What is a SIP Calculator?">
        <p>A SIP (Systematic Investment Plan) calculator helps you estimate the corpus you'll build by investing a fixed amount every month in a mutual fund. Type in your monthly amount, expected return, and tenure — and it instantly shows you the wealth you're headed towards.</p>
        <p>It doesn't predict the future, but it gives you a directional number that's surprisingly accurate over long periods, thanks to the mathematical consistency of compounding.</p>
      </Section>
      <Section title="How SIP Returns Are Calculated">
        <p>Each monthly instalment grows at the expected rate for the remaining tenure. The calculator sums the future value of all instalments. This is called the Future Value of an Annuity Due.</p>
        <div className="ch-formula-box">FV = P × [(1+r)ⁿ − 1] / r × (1+r)<br/>Where: P = monthly investment, r = monthly return (annual ÷ 12), n = total months</div>
      </Section>
      <Section title="Real Example">
        <p>₹10,000/month for 20 years at 12% p.a. → Total invested: ₹24L. Estimated corpus: ₹98.9L. Your money nearly quadrupled in real terms. Now try ₹15,000/month: corpus jumps to ₹1.48 Cr. Small increases in SIP amount have outsized impact.</p>
      </Section>
      <div className="ch-insight-box">💡 Increasing your SIP by 10% every year (Step-up SIP) can grow your corpus by 50–70% more than a flat SIP over 20 years. Always use the Step-up SIP calculator alongside this one.</div>
      <Section title="When to Use This">
        <ul>
          <li>Starting a new SIP and want to know how much you'll accumulate</li>
          <li>Reverse-calculating: what SIP do I need to reach ₹1 Cr?</li>
          <li>Comparing different fund return assumptions (10% vs 12% vs 14%)</li>
          <li>Planning for a goal — children's education, retirement, property</li>
        </ul>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What return rate should I assume for SIP?',a:'For large-cap equity funds, 10-12% is a reasonable long-term assumption. For mid/small-cap, 12-15%. For hybrid funds, 9-11%. The calculator lets you test different rates.'},
          {q:'Does the SIP calculator account for inflation?',a:"No. The results are in today's rupees. If inflation runs at 6%, your real return is roughly rate − 6%. For inflation-adjusted planning, use our Inflation Calculator alongside this."},
          {q:'Can I check SIP returns for existing investments?',a:"This calculator shows estimated future value. For actual past returns, use your fund's statement or a CAGR calculator with your starting NAV and current NAV."},
          {q:'Is SIP return guaranteed?',a:'No. SIP invests in market-linked mutual funds. Returns depend on fund performance. The calculator uses an assumed rate for illustration purposes only.'},
          {q:'What happens if I miss a SIP instalment?',a:'One missed instalment slightly reduces your corpus. Your fund does not penalise you for occasional misses, but making it up next month via a lumpsum top-up is advisable.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['lumpsum','step-up-sip','cagr']} nav={nav}/></Section>
    </div>
  );
}

function SwpCalc({ nav }) {
  const [corpus, setCorpus] = useState(2000000);
  const [withdrawal, setWithdrawal] = useState(15000);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(10);
  const { finalVal, totalWithdrawn } = useMemo(() => {
    let val = corpus;
    const mr = rate / 100 / 12;
    const months = years * 12;
    for (let i = 0; i < months; i++) {
      val = val * (1 + mr) - withdrawal;
      if (val <= 0) { val = 0; break; }
    }
    return { finalVal: val, totalWithdrawn: withdrawal * months };
  }, [corpus, withdrawal, rate, years]);
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Total investment" value={corpus} set={setCorpus} min={10000} max={50000000} step={10000} pre="₹"/>
        <SliderRow label="Withdrawal per month" value={withdrawal} set={setWithdrawal} min={500} max={500000} step={500} pre="₹"/>
        <SliderRow label="Expected return rate (p.a)" value={rate} set={setRate} min={1} max={25} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
      </>}
      results={<>
        <RRow label="Total investment" value={INRF(corpus)}/>
        <RRow label="Total withdrawal" value={INRF(totalWithdrawn)}/>
        <RRow label="Final value" value={finalVal > 0 ? INRF(finalVal) : '₹0 (depleted)'} bold accent={finalVal > 0}/>
      </>}
    />
    <div>
      <Section title="What is an SWP Calculator?">
        <p>A Systematic Withdrawal Plan (SWP) is the opposite of SIP. Instead of putting money in every month, you take a fixed amount out. The rest of your corpus stays invested and keeps growing. SWP is the preferred way to generate regular income in retirement without selling everything at once.</p>
        <p>The calculator shows whether your corpus will last the intended period, and what's left at the end.</p>
      </Section>
      <Section title="How It Works">
        <p>Each month, your corpus earns a monthly return (annual rate ÷ 12), and then your withdrawal amount is deducted. The calculator simulates this month by month for the full tenure.</p>
        <div className="ch-formula-box">Corpus(t+1) = Corpus(t) × (1 + r/12) − Monthly Withdrawal</div>
      </Section>
      <Section title="Example">
        <p>₹50L corpus, withdrawing ₹25,000/month at 8% return for 20 years. Monthly return: 0.67%. After simulating 240 months — corpus survives and still has ~₹8L remaining. Increase withdrawal to ₹35,000/month and the corpus depletes before 20 years.</p>
      </Section>
      <div className="ch-insight-box">💡 A safe withdrawal rate for a corpus invested in equity-debt hybrid is typically 3–4% annually. For ₹1 Cr corpus at 4% SWR, you can withdraw ₹4L/year (₹33,333/month) indefinitely.</div>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'How is SWP different from dividend payout?',a:'SWP gives you a fixed, predictable monthly amount regardless of market conditions. Dividends depend on fund performance and the AMC decision. SWP is more reliable for income planning.'},
          {q:'Is SWP tax-efficient?',a:'Yes. Each SWP withdrawal redeems units. Only the gains portion is taxable as capital gains. If held > 1 year (equity), it qualifies for LTCG at 12.5% above ₹1.25L.'},
          {q:'What if markets crash during SWP?',a:'If NAV drops significantly and you continue withdrawing, you redeem more units per withdrawal. This erodes the corpus faster. Consider a dynamic withdrawal strategy or keeping 1-2 years of expenses in liquid funds as a buffer.'},
          {q:'Can I do SWP from any mutual fund?',a:'Yes, but debt or hybrid funds are more stable for SWP. Equity funds can work over long periods (15+ years) if withdrawal rates are conservative.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','retirement','nps']} nav={nav}/></Section>
    </div>
  </>);
}

function MfCalc({ nav }) {
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const total = useMemo(() => lsFV(amount, rate, years), [amount, rate, years]);
  const returns = total - amount;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Total investment" value={amount} set={setAmount} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Expected return rate (p.a)" value={rate} set={setRate} min={1} max={30} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
      </>}
      donut={<Donut a={amount} b={returns}/>}
      results={<>
        <RRow label="Invested amount" value={INRF(amount)}/>
        <RRow label="Est. returns" value={INRF(returns)}/>
        <RRow label="Total value" value={INRF(total)} bold/>
      </>}
      cta ctaLabel="INVEST NOW"
    />
    <div>
      <Section title="What is a Mutual Fund Returns Calculator?">
        <p>This calculator estimates how a lumpsum mutual fund investment grows over time at an expected annual return rate. Think of it as a compounding machine — your money earns returns, and those returns earn more returns.</p>
        <p>Different fund categories have different expected return ranges. Large-cap equity: 10–13%. Mid-cap: 12–16%. Debt funds: 6–8%. Hybrid: 9–11%. This calculator lets you test any assumption.</p>
      </Section>
      <Section title="Formula">
        <div className="ch-formula-box">Future Value = P × (1 + r)ⁿ<br/>Where P = invested amount, r = annual return rate, n = years</div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'How do I know which return rate to use?',a:'Check the fund category benchmarks. Nifty 50 index funds have historically delivered ~12% CAGR over 15+ year periods. Actively managed large-cap funds: ~11-13%. Mid-cap active funds: 13-16%. Use conservative estimates.'},
          {q:'Does this account for fund expense ratio?',a:'No, the expected return you enter should already be net of expense ratio. For direct plans, expense ratio is 0.1-0.5% lower than regular plans.'},
          {q:'Can mutual fund returns be negative?',a:'Yes, over short periods. Equity funds have seen -40% drawdowns in bad years. Over 7+ year horizons, the probability of negative returns in diversified equity funds has historically been very low.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','lumpsum','cagr']} nav={nav}/></Section>
    </div>
  </>);
}

function FdCalc({ nav }) {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(3);
  // Quarterly compounding (standard for FDs)
  const total = useMemo(() => principal * Math.pow(1 + rate/100/4, 4*years), [principal, rate, years]);
  const returns = total - principal;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Total investment" value={principal} set={setPrincipal} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Rate of interest (p.a)" value={rate} set={setRate} min={1} max={15} step={0.1} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={10} suf="Yr"/>
      </>}
      donut={<Donut a={principal} b={returns} lb="Total returns"/>}
      results={<>
        <RRow label="Invested amount" value={INRF(principal)}/>
        <RRow label="Est. returns" value={INRF(returns)}/>
        <RRow label="Total value" value={INRF(total)} bold/>
      </>}
      cta ctaLabel="INVEST NOW"
    />
    <div>
      <Section title="What is an FD Calculator?">
        <p>A Fixed Deposit (FD) calculator computes the maturity amount for a lump sum deposit in a bank or NBFC FD. FDs use quarterly compounding in India by default, which means your interest gets added to principal every 3 months and starts earning returns itself.</p>
        <p>Current FD rates: SBI at 6.5-7%, HDFC at 7-7.25%, small finance banks like AU SFB at 7.5-8.5% for 1-3 year tenures (rates change frequently).</p>
      </Section>
      <Section title="Formula">
        <div className="ch-formula-box">A = P × (1 + r/4)^(4×n)<br/>P = principal, r = annual rate, n = years (quarterly compounding)</div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Is FD interest taxable?',a:'Yes. FD interest is added to your income and taxed at your slab rate. If total FD interest exceeds ₹40,000/year (₹50,000 for seniors), the bank deducts TDS at 10%.'},
          {q:'What is the safest FD?',a:'FDs in scheduled commercial banks are insured up to ₹5 Lakhs per bank per depositor by DICGC. Split large amounts across multiple banks if needed.'},
          {q:'FD vs debt mutual fund — which is better?',a:'For tenures under 3 years, FD is simpler and predictable. For 3+ years, debt mutual funds (especially gilt or dynamic bond funds) can be more tax-efficient for high-bracket taxpayers since LTCG benefits apply.'},
          {q:'Can I break an FD early?',a:'Yes, but banks charge a premature withdrawal penalty of 0.5-1%, and you get the lower applicable rate for the period held, not the full tenure rate.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['rd','compound-interest','sip']} nav={nav}/></Section>
    </div>
  </>);
}

function RdCalc({ nav }) {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(3);
  // RD: quarterly compounding, each instalment compounds
  const total = useMemo(() => {
    const q = rate / 100 / 4;
    const n = years * 4; // quarters
    let fv = 0;
    // Monthly RD: 3 instalments per quarter
    for (let month = 0; month < years * 12; month++) {
      const quartersRemaining = (years * 12 - month) / 3;
      fv += monthly * Math.pow(1 + q, quartersRemaining);
    }
    return fv;
  }, [monthly, rate, years]);
  const invested = monthly * years * 12;
  const returns = total - invested;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Monthly investment" value={monthly} set={setMonthly} min={500} max={500000} step={500} pre="₹"/>
        <SliderRow label="Rate of interest (p.a)" value={rate} set={setRate} min={1} max={15} step={0.1} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={10} suf="Yr"/>
      </>}
      donut={<Donut a={invested} b={returns} lb="Total interest"/>}
      results={<>
        <RRow label="Invested amount" value={INRF(invested)}/>
        <RRow label="Est. returns" value={INRF(returns)}/>
        <RRow label="Total value" value={INRF(total)} bold/>
      </>}
      cta ctaLabel="RD ALTERNATIVE"
    />
    <div>
      <Section title="What is an RD Calculator?">
        <p>A Recurring Deposit (RD) calculator estimates the maturity amount when you deposit a fixed amount every month into a bank RD. It's similar to SIP but with guaranteed returns — no market risk. RDs use quarterly compounding.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Is RD interest taxable?',a:'Yes. RD interest is taxed at your income slab rate. TDS is deducted if total bank interest exceeds ₹40,000/year.'},
          {q:'RD vs SIP — which should I choose?',a:'RD guarantees the return but it will be 6-8%. SIP in equity mutual funds is not guaranteed but has historically delivered 10-14% over long periods. RD for short-term goals, SIP for long-term wealth.'},
          {q:'Can I break an RD early?',a:'Yes, with a penalty (typically 1% lower rate for the actual period). Post offices allow partial withdrawals after 1 year.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['fd','sip','simple-interest']} nav={nav}/></Section>
    </div>
  </>);
}

function NpsCalc({ nav }) {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(9);
  const [age, setAge] = useState(30);
  const RETIRE_AGE = 60;
  const years = Math.max(1, RETIRE_AGE - age);
  const { maturity, interest, invested, annuity } = useMemo(() => {
    const t = sipFV(monthly, rate, years);
    const inv = monthly * years * 12;
    return { maturity: t, interest: t - inv, invested: inv, annuity: t * 0.4 };
  }, [monthly, rate, years]);
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Investment per month" value={monthly} set={setMonthly} min={500} max={500000} step={500} pre="₹"/>
        <SliderRow label="Expected return (p.a)" value={rate} set={setRate} min={4} max={15} step={0.5} suf="%"/>
        <SliderRow label="Your age" value={age} set={setAge} min={18} max={55} suf="Yr"/>
      </>}
      results={<>
        <RRow label="Total investment" value={INRF(invested)}/>
        <RRow label="Interest earned" value={INRF(interest)}/>
        <RRow label="Maturity amount" value={INRF(maturity)} bold/>
        <RRow label="Min. annuity investment (40%)" value={INRF(annuity)} accent/>
      </>}
    />
    <div>
      <Section title="What is an NPS Calculator?">
        <p>The National Pension System (NPS) is a government-backed retirement savings scheme. You invest monthly until age 60, after which at least 40% of the corpus must be used to buy an annuity (monthly pension), and up to 60% can be withdrawn tax-free as a lump sum.</p>
        <p>NPS invests in equity (up to 75% in Tier 1), corporate bonds, government securities, and alternative assets. Expected long-term returns are 8-10%.</p>
      </Section>
      <Section title="Tax Benefits">
        <p>NPS is one of the most tax-efficient instruments in India. You get deductions under Section 80C (₹1.5L), an additional ₹50,000 under Section 80CCD(1B), and employer contributions up to 10% of salary under 80CCD(2). The lump sum withdrawal at retirement (60%) is tax-free.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Can I withdraw from NPS before 60?',a:'Partial withdrawal (up to 25% of contributions) is allowed after 3 years for specific purposes: children education, marriage, home purchase, or medical emergency. Complete exit before 60 requires 80% annuitisation.'},
          {q:'What is the annuity rate?',a:'Annuity rates depend on the insurance company and plan type. Typically 5-7% annually on the annuity corpus. For ₹40L annuity corpus, you get roughly ₹2-2.8L/year (₹16,000-23,000/month).'},
          {q:'NPS Tier 1 vs Tier 2?',a:'Tier 1 is the pension account with lock-in. Tier 2 is a voluntary savings account with no lock-in but no tax benefits. Most people should max out Tier 1 first.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','retirement','swp']} nav={nav}/></Section>
    </div>
  </>);
}

function HraCalc({ nav }) {
  const [basic, setBasic] = useState(540000);
  const [da, setDa] = useState(0);
  const [hraReceived, setHraReceived] = useState(100000);
  const [rentPaid, setRentPaid] = useState(300000);
  const [metro, setMetro] = useState(false);
  const { exempt, taxable } = useMemo(() => {
    const basicDa = basic + da;
    const a = hraReceived;
    const b = (metro ? 0.5 : 0.4) * basicDa;
    const c = Math.max(0, rentPaid - 0.1 * basicDa);
    const exempt = Math.min(a, b, c);
    return { exempt: Math.max(0, exempt), taxable: Math.max(0, hraReceived - exempt) };
  }, [basic, da, hraReceived, rentPaid, metro]);

  const inputStyle = { background:'var(--gain-bg)', border:'1px solid var(--accent)22', borderRadius:6,
    padding:'8px 12px', fontSize:14, fontWeight:600, color:'var(--accent)', fontFamily:'var(--mono)',
    width:'100%', textAlign:'right', outline:'none' };

  const FieldRow = ({ label, value, set, pre='₹' }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, gap:16 }}>
      <span style={{ fontSize:14, color:'var(--text2)', flexShrink:0 }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:160 }}>
        <span style={{ color:'var(--accent)', fontFamily:'var(--mono)', fontSize:14 }}>{pre}</span>
        <input type="number" value={value} onChange={e => set(Number(e.target.value))} style={{...inputStyle, width:140}}/>
      </div>
    </div>
  );

  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <FieldRow label="Basic salary (p.a)" value={basic} set={setBasic}/>
        <FieldRow label="Dearness allowance (p.a)" value={da} set={setDa}/>
        <FieldRow label="HRA received (p.a)" value={hraReceived} set={setHraReceived}/>
        <FieldRow label="Total rent paid (p.a)" value={rentPaid} set={setRentPaid}/>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontSize:14, color:'var(--text2)' }}>Are you working in a metro city?</span>
          <div style={{ display:'flex', gap:16 }}>
            {['Yes','No'].map(opt => (
              <label key={opt} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14, color:'var(--text2)' }}>
                <input type="radio" checked={opt==='Yes'?metro:!metro} onChange={()=>setMetro(opt==='Yes')}
                  style={{ accentColor:'var(--accent)', width:16, height:16 }}/>
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div style={{ background:'var(--gain-bg)', borderTop:'1px solid var(--border)', padding:'20px 28px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:6 }}>Exempted HRA</div>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--accent)', fontFamily:'var(--mono)' }}>{INRF(exempt)}</div>
          </div>
          <div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:6 }}>Taxable HRA</div>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--loss)', fontFamily:'var(--mono)' }}>{INRF(taxable)}</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'var(--text3)', marginTop:14, lineHeight:1.6 }}>
          Invest in <span style={{ color:'var(--accent)', fontWeight:600 }}>ELSS Mutual Funds</span> and save tax upto ₹46,800 under 80C as per old tax regime.
        </div>
      </div>
    </div>
    <div>
      <Section title="What is HRA Exemption?">
        <p>HRA (House Rent Allowance) is a component of your salary that can be partially or fully exempted from income tax if you live in a rented house. The exemption is the minimum of three amounts — actual HRA received, a percentage of basic salary, and rent paid minus 10% of basic salary.</p>
      </Section>
      <Section title="Formula">
        <div className="ch-formula-box">
          Exempt HRA = Minimum of:<br/>
          1. Actual HRA received<br/>
          2. 50% of (Basic + DA) for metro cities, 40% for non-metro<br/>
          3. Rent paid − 10% of (Basic + DA)
        </div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Which cities are considered metro for HRA?',a:'Delhi, Mumbai, Chennai, and Kolkata are the four metro cities for HRA calculation (50% rule). All other cities get the 40% rule.'},
          {q:'Can I claim HRA if I pay rent to parents?',a:"Yes, but it requires a formal rent agreement and actual rent payment via bank transfer. Your parents must declare this rental income in their ITR."},
          {q:'What if I don\'t receive HRA?',a:'You can still claim deduction under Section 80GG (up to ₹5,000/month) if you don\'t receive HRA but pay rent. Income cannot exceed ₹5L for this.'},
          {q:'Is HRA applicable under new tax regime?',a:'No. The new tax regime does not allow HRA exemption. It is only available under the old tax regime.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['salary','tds','sip']} nav={nav}/></Section>
    </div>
  </>);
}

function RetirementCalc({ nav }) {
  const [age, setAge] = useState(30);
  const [monthlyExpense, setMonthlyExpense] = useState(50000);
  const [lifestyle, setLifestyle] = useState('happy');
  const [savingsType, setSavingsType] = useState('safe');
  const RETIRE = 60;
  const years = RETIRE - age;
  const { corpusNeeded, monthlySavings } = useMemo(() => {
    const inflationRate = 0.06;
    const returnRate = savingsType === 'safe' ? 0.07 : 0.12;
    const multiplier = lifestyle === 'king' ? 1.5 : lifestyle === 'monk' ? 0.7 : 1;
    const adjMonthly = monthlyExpense * multiplier * Math.pow(1 + inflationRate, years);
    const annualExpense = adjMonthly * 12;
    const swr = savingsType === 'safe' ? 0.04 : 0.05;
    const corpus = annualExpense / swr;
    const r = returnRate / 12;
    const n = years * 12;
    const pmt = r === 0 ? corpus / n : corpus * r / ((Math.pow(1 + r, n) - 1) * (1 + r));
    return { corpusNeeded: corpus, monthlySavings: pmt };
  }, [age, monthlyExpense, lifestyle, savingsType]);

  const LifeBtn = ({ id, label }) => (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:8, fontSize:14, color:'var(--text2)' }}>
      <input type="radio" checked={lifestyle===id} onChange={()=>setLifestyle(id)}
        style={{ accentColor:'var(--accent)', width:16, height:16 }}/>{label}
    </label>
  );

  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <SliderRow label="How old are you?" value={age} set={setAge} min={18} max={55} suf="Yr"/>
        <SliderRow label="Monthly expenses today" value={monthlyExpense} set={setMonthlyExpense} min={5000} max={500000} step={1000} pre="₹"/>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:14, color:'var(--text3)', marginBottom:10 }}>What kind of retirement do you want?</div>
          <LifeBtn id="king" label="LIKE A KING (1.5× expenses)"/>
          <LifeBtn id="happy" label="I AM HAPPY THE WAY I AM (same)"/>
          <LifeBtn id="monk" label="LIKE A MONK (0.7× expenses)"/>
        </div>
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:14, color:'var(--text3)', marginBottom:10 }}>Where are you saving?</div>
          {[{id:'safe',l:'SAFE (PF, FD, ETC)'},{id:'aggressive',l:'AGGRESSIVE (MUTUAL FUNDS, EQUITY)'}].map(s => (
            <label key={s.id} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:8, fontSize:14, color:'var(--text2)' }}>
              <input type="radio" checked={savingsType===s.id} onChange={()=>setSavingsType(s.id)}
                style={{ accentColor:'var(--accent)', width:16, height:16 }}/>{s.l}
            </label>
          ))}
        </div>
      </div>
      <div style={{ background:'var(--gain-bg)', borderTop:'1px solid var(--border)', padding:'20px 28px' }}>
        <RRow label="Amount required for retirement" value={INR(corpusNeeded)} bold/>
        <RRow label="How much to save per month to retire?" value={INRF(monthlySavings)} bold accent/>
      </div>
    </div>
    <div>
      <Section title="What is a Retirement Calculator?">
        <p>This calculator estimates how much corpus you need to retire comfortably, and how much you need to save every month from today to get there. It factors in inflation (the silent destroyer of retirement plans) and adjusts your future monthly expenses accordingly.</p>
        <p>Retiring at 60 with today's ₹50,000/month lifestyle is not the same as needing ₹50,000/month at 60 — if inflation runs at 6%, you'll need ₹1,60,000+/month by then.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What is a safe withdrawal rate?',a:'The 4% rule: you can withdraw 4% of your corpus annually without depleting it over 30 years (assuming balanced portfolio returns). For a 3% rate, the corpus lasts much longer. This calculator uses 4% for safe/conservative and 5% for aggressive portfolios.'},
          {q:'Should I account for pension and other income?',a:"Yes. If you'll have a pension, rental income, or interest income in retirement, reduce your required corpus accordingly. This calculator gives you the gross number — subtract guaranteed income streams."},
          {q:'Does this account for healthcare costs?',a:"Healthcare costs tend to rise faster than general inflation in India (10-12% annually). Add a 15-20% buffer to your corpus if you don't have a comprehensive health cover in retirement."},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['nps','swp','sip']} nav={nav}/></Section>
    </div>
  </>);
}

function EmiCalc({ type = 'general', nav }) {
  const [loan, setLoan] = useState(1000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(5);
  const { emi, totalInterest, totalAmount } = useMemo(() => {
    const e = emiAmt(loan, rate, tenure);
    const total = e * tenure * 12;
    return { emi: e, totalInterest: total - loan, totalAmount: total };
  }, [loan, rate, tenure]);
  const [amortOpen, setAmortOpen] = useState(false);
  const amortRows = useMemo(() => {
    const rows = [];
    let balance = loan;
    const mr = rate / 100 / 12;
    for (let y = 1; y <= tenure; y++) {
      let principal = 0, interest = 0;
      for (let m = 0; m < 12; m++) {
        const int = balance * mr;
        const pri = emi - int;
        interest += int;
        principal += pri;
        balance -= pri;
      }
      rows.push({ year: y, principal, interest, balance: Math.max(0, balance) });
    }
    return rows;
  }, [loan, rate, tenure, emi]);

  const title = type === 'car' ? 'Car Loan' : type === 'home' ? 'Home Loan' : 'Loan';

  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Loan amount" value={loan} set={setLoan} min={10000} max={50000000} step={10000} pre="₹"/>
        <SliderRow label="Rate of interest (p.a)" value={rate} set={setRate} min={5} max={24} step={0.1} suf="%"/>
        <SliderRow label={`${title} tenure`} value={tenure} set={setTenure} min={1} max={type==='home'?30:10} suf="Yr"/>
      </>}
      donut={<Donut a={loan} b={totalInterest} la="Principal amount" lb="Interest amount"/>}
      results={<>
        <RRow label="Monthly EMI" value={INRF(emi)} bold accent/>
        <RRow label="Principal amount" value={INRF(loan)}/>
        <RRow label="Total interest" value={INRF(totalInterest)}/>
        <RRow label="Total amount" value={INRF(totalAmount)} bold/>
      </>}
    />
    <div>
      <div style={{ textAlign:'center', marginBottom:8, cursor:'pointer', color:'var(--text3)', fontSize:13 }}
        onClick={() => setAmortOpen(o=>!o)}>
        Your Amortization Details (Yearly) {amortOpen ? '▲' : '+'}
      </div>
      {amortOpen && (
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:24 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg3)', color:'var(--text3)', fontSize:11, letterSpacing:'0.05em', textTransform:'uppercase' }}>
                {['Year','Principal','Interest','Balance'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'right', fontWeight:700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {amortRows.map(r => (
                <tr key={r.year} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'9px 14px', textAlign:'right', color:'var(--text3)', fontFamily:'var(--mono)' }}>{r.year}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', color:'var(--gain)', fontFamily:'var(--mono)' }}>{INRF(r.principal)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', color:'var(--loss)', fontFamily:'var(--mono)' }}>{INRF(r.interest)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', color:'var(--text)', fontFamily:'var(--mono)', fontWeight:600 }}>{INRF(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Section title={`What is a ${type==='home'?'Home Loan':type==='car'?'Car Loan':'Loan'} EMI Calculator?`}>
        <p>EMI (Equated Monthly Instalment) is the fixed monthly payment you make towards your loan. It includes both principal repayment and interest. Early in the loan tenure, most of your EMI goes toward interest. As the loan matures, the principal portion grows (this is called amortisation).</p>
        <p>The calculator also shows you an amortisation schedule — a year-by-year breakdown of how much you're paying in principal vs interest, and how your outstanding balance reduces.</p>
      </Section>
      <Section title="EMI Formula">
        <div className="ch-formula-box">EMI = P × r × (1+r)ⁿ / [(1+r)ⁿ − 1]<br/>P = loan amount, r = monthly rate (annual ÷ 12), n = tenure in months</div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What happens if I prepay my loan?',a:'Prepayment reduces your outstanding principal, which reduces either future EMIs or the loan tenure (depending on your bank\'s policy). Most lenders allow prepayment with no charge after the first year.'},
          {q:`What is a good ${type==='home'?'home loan':type==='car'?'car loan':'loan'} interest rate?`,a:type==='home'?'Home loan rates in India range from 8.35% (SBI) to 9.5%+. Government scheme loans under PMAY can be lower. Compare across banks and NBFCs.':type==='car'?'Car loan rates range from 7.9% (banks) to 12%+ (NBFCs). Your credit score heavily influences the rate offered.':'Compare across banks, credit unions, and NBFCs. Always check the effective annual rate (EAR), not just the nominal rate.'},
          {q:'How does a lower interest rate affect EMI?',a:'Even a 0.5% reduction in rate saves significantly over long tenures. On a ₹50L home loan for 20 years, 0.5% lower rate saves approximately ₹3.5L in total interest.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['flat-reducing','simple-interest','compound-interest']} nav={nav}/></Section>
    </div>
  </>);
}

function StepUpSipCalc({ nav }) {
  const [monthly, setMonthly] = useState(10000);
  const [stepUp, setStepUp] = useState(10);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const { total, invested, returns } = useMemo(() => {
    const mr = rate / 100 / 12;
    let fv = 0, inv = 0, m = monthly;
    for (let y = 0; y < years; y++) {
      for (let mo = 0; mo < 12; mo++) {
        const remaining = (years - y) * 12 - mo;
        fv += m * Math.pow(1 + mr, remaining);
        inv += m;
      }
      m = m * (1 + stepUp / 100);
    }
    return { total: fv, invested: inv, returns: fv - inv };
  }, [monthly, stepUp, rate, years]);
  const flatTotal = useMemo(() => sipFV(monthly, rate, years), [monthly, rate, years]);

  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Monthly investment" value={monthly} set={setMonthly} min={500} max={200000} step={500} pre="₹"/>
        <SliderRow label="Annual step up" value={stepUp} set={setStepUp} min={1} max={50} suf="%"/>
        <SliderRow label="Expected return rate (p.a)" value={rate} set={setRate} min={1} max={30} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
      </>}
      donut={<Donut a={invested} b={returns}/>}
      results={<>
        <RRow label="Invested amount" value={INRF(invested)}/>
        <RRow label="Est. returns" value={INRF(returns)}/>
        <RRow label="Total value" value={INRF(total)} bold/>
        <RRow label="vs. flat SIP" value={`+${INR(total - flatTotal)} more`} accent/>
      </>}
      cta ctaLabel="INVEST NOW"
    />
    <div>
      <Section title="What is a Step-up SIP Calculator?">
        <p>A Step-up SIP (also called Top-up SIP or Escalation SIP) is a SIP where you automatically increase your monthly investment by a fixed percentage every year. It aligns perfectly with how salaries grow — as you earn more, you invest more.</p>
        <p>The extra wealth created by this simple habit is substantial. This calculator even shows you exactly how much more you accumulate vs a flat SIP at the same starting amount.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What step-up rate should I choose?',a:'Match it to your expected annual salary growth. If you expect 10% annual increments, a 10% step-up is natural and won\'t feel like a sacrifice.'},
          {q:'Can I set up step-up SIP automatically?',a:'Yes. Most AMCs and platforms like Zerodha Coin, Groww, and MF Central offer step-up SIP mandates where the amount auto-increases annually.'},
          {q:'What if my income doesn\'t grow one year?',a:'You can pause or skip the step-up. Most platforms let you modify the step-up frequency or amount anytime.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','lumpsum','cagr']} nav={nav}/></Section>
    </div>
  </>);
}

function SimpleInterestCalc({ nav }) {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(5);
  const si = useMemo(() => (principal * rate * years) / 100, [principal, rate, years]);
  const total = principal + si;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Principal amount" value={principal} set={setPrincipal} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Rate of interest (p.a)" value={rate} set={setRate} min={1} max={30} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={30} suf="Yr"/>
      </>}
      donut={<Donut a={principal} b={si} la="Principal amount" lb="Total interest"/>}
      results={<>
        <RRow label="Principal amount" value={INRF(principal)}/>
        <RRow label="Total interest" value={INRF(si)}/>
        <RRow label="Total amount" value={INRF(total)} bold/>
      </>}
    />
    <div>
      <Section title="What is Simple Interest?">
        <p>Simple interest is calculated only on the original principal amount. Unlike compound interest, there's no "interest on interest" — the interest earned each year is always the same fixed amount. Most short-term loans and some government schemes use simple interest.</p>
      </Section>
      <Section title="Formula">
        <div className="ch-formula-box">SI = (P × R × T) / 100<br/>Total = P + SI<br/>Where P = Principal, R = Rate per annum, T = Time in years</div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'When is simple interest used in real life?',a:'Car loans and personal loans from some lenders, gold loans, and some government savings bonds use simple interest. Post Office Monthly Income Scheme (POMIS) also uses simple interest for its monthly payouts.'},
          {q:'Is simple interest always worse than compound interest?',a:"For borrowers, simple interest loans are better (you pay less). For investors, compound interest is better (you earn more). The difference grows significantly over longer time periods."},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['compound-interest','fd','rd']} nav={nav}/></Section>
    </div>
  </>);
}

function CompoundInterestCalc({ nav }) {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(10);
  const [freq, setFreq] = useState(1);
  const total = useMemo(() => principal * Math.pow(1 + rate/100/freq, freq*years), [principal, rate, years, freq]);
  const interest = total - principal;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Principal amount" value={principal} set={setPrincipal} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Rate of interest (p.a)" value={rate} set={setRate} min={1} max={30} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:14, color:'var(--text2)', marginBottom:10 }}>Compounding frequency</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[{v:1,l:'Yearly'},{v:2,l:'Half-yearly'},{v:4,l:'Quarterly'},{v:12,l:'Monthly'}].map(o => (
              <button key={o.v} onClick={() => setFreq(o.v)}
                style={{ padding:'6px 14px', borderRadius:7, border:'1px solid var(--border)',
                  background: freq===o.v ? 'var(--accent)' : 'var(--bg3)',
                  color: freq===o.v ? '#fff' : 'var(--text3)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </>}
      donut={<Donut a={principal} b={interest} la="Principal amount" lb="Total interest"/>}
      results={<>
        <RRow label="Principal amount" value={INRF(principal)}/>
        <RRow label="Total interest" value={INRF(interest)}/>
        <RRow label="Total amount" value={INRF(total)} bold/>
      </>}
    />
    <div>
      <Section title="What is Compound Interest?">
        <p>Compound interest earns interest on previously earned interest, not just the principal. This is the fundamental reason why long-term investing is so powerful — your wealth grows exponentially, not linearly. Einstein reportedly called it the eighth wonder of the world.</p>
        <p>The compounding frequency matters: monthly compounding produces slightly more than quarterly, which is more than half-yearly, which beats annual. For most investments in India, quarterly compounding is standard.</p>
      </Section>
      <Section title="Formula">
        <div className="ch-formula-box">A = P × (1 + r/n)^(n×t)<br/>P = Principal, r = annual rate, n = compounding periods/year, t = years</div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'How much difference does compounding frequency make?',a:'₹1L at 10% for 20 years: Annual compounding → ₹6.73L. Quarterly → ₹7.04L. Monthly → ₹7.33L. The difference compounds significantly over longer periods.'},
          {q:'Why is starting early so important?',a:"Due to compounding, the first 5-10 years of investing matter disproportionately. ₹1L invested at 25 becomes ₹18.7L at 60 (at 8%). The same ₹1L invested at 35 becomes only ₹8.6L. 10 years less = more than half the corpus gone."},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['simple-interest','fd','cagr']} nav={nav}/></Section>
    </div>
  </>);
}

function NscCalc({ nav }) {
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(7.7);
  const PERIOD = 5;
  // NSC: half-yearly compounding, 5-year lock-in
  const total = useMemo(() => amount * Math.pow(1 + rate/100/2, 2*PERIOD), [amount, rate]);
  const interest = total - amount;
  return (<>
    <Shell
      inputs={<>
        <SliderRow label="Amount invested" value={amount} set={setAmount} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Rate of interest (p.a)" value={rate} set={setRate} min={5} max={10} step={0.1} suf="%"/>
        <div style={{ fontSize:13, color:'var(--text3)', marginBottom:20 }}>Time Period: 5 Years (fixed) • Compounding: Half-yearly</div>
      </>}
      donut={<Donut a={amount} b={interest} la="Principal amount" lb="Total interest"/>}
      results={<>
        <RRow label="Principal amount" value={INRF(amount)}/>
        <RRow label="Total interest" value={INRF(interest)}/>
        <RRow label="Total amount" value={INRF(total)} bold/>
      </>}
      cta ctaLabel="SAVE TAX"
    />
    <div>
      <Section title="What is an NSC Calculator?">
        <p>NSC (National Savings Certificate) is a government-backed savings scheme available at post offices across India. It offers a fixed return for a 5-year tenure with half-yearly compounding. The current rate (FY 2024-25) is 7.7% p.a. — one of the better guaranteed return options for conservative investors.</p>
        <p>NSC qualifies for Section 80C deduction (up to ₹1.5L), and the interest reinvested (not actually paid out) also qualifies for 80C in years 1-4. Only the year 5 interest is fully taxable.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Is NSC interest taxable?',a:'Yes, but with a twist. The interest is deemed reinvested for years 1-4 and qualifies for 80C deduction, effectively making it tax-free. Only the interest in year 5 is taxable as income from other sources.'},
          {q:'Can I break NSC early?',a:'NSC cannot be prematurely encashed, except in case of death of holder, court order, or forfeiture by pledged bank. Plan accordingly — keep emergency funds separately.'},
          {q:'NSC vs PPF vs FD — which is best?',a:'PPF gives 7.1% (tax-free maturity), NSC gives 7.7% (partially taxable), FD gives 7-7.5% (fully taxable). For those in the 30% tax bracket, PPF wins. For 10-20% bracket, NSC or FD are comparable. NSC is better than FD for 80C planning.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['fd','rd','compound-interest']} nav={nav}/></Section>
    </div>
  </>);
}

function CagrCalc({ nav }) {
  const [initial, setInitial] = useState(100000);
  const [final, setFinal] = useState(500000);
  const [duration, setDuration] = useState(10);
  const cagr = useMemo(() => {
    if (!initial || !duration) return 0;
    return (Math.pow(final / initial, 1 / duration) - 1) * 100;
  }, [initial, final, duration]);
  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <SliderRow label="Initial investment" value={initial} set={setInitial} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Final investment" value={final} set={setFinal} min={1000} max={100000000} step={1000} pre="₹"/>
        <SliderRow label="Duration of investment" value={duration} set={setDuration} min={1} max={40} suf="Yr"/>
      </div>
      <div style={{ background:'var(--gain-bg)', borderTop:'1px solid var(--border)', padding:'20px 28px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:18, fontWeight:700, color:'var(--text)' }}>
          CAGR is <span style={{ color:'var(--accent)', fontFamily:'var(--mono)' }}>{cagr.toFixed(2)}%</span>
        </div>
        <button style={{ background:'var(--accent)', color:'#fff', border:'none', borderRadius:8,
          padding:'10px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>RESET</button>
      </div>
    </div>
    <div>
      <Section title="What is CAGR?">
        <p>CAGR (Compound Annual Growth Rate) tells you the year-on-year growth rate that would take your investment from the initial value to the final value over the given period. It smooths out year-to-year volatility and gives you a single clean number to compare investments.</p>
        <p>If a mutual fund shows 18% CAGR over 5 years, it doesn't mean it returned 18% every year — some years could be 35%, others −10%. CAGR is the theoretical constant rate that would produce the same result.</p>
      </Section>
      <Section title="Formula">
        <div className="ch-formula-box">CAGR = (Final Value / Initial Value)^(1/n) − 1<br/>n = number of years</div>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What is a good CAGR for mutual funds?',a:'For large-cap equity funds in India, 10-13% CAGR over 10+ years is considered good. Mid-cap funds: 13-18%. Small-cap: 15-22% (with higher volatility). Compare CAGR of the fund vs its benchmark index.'},
          {q:'CAGR vs Absolute Returns — which to use?',a:'Absolute returns are misleading for multi-year investments. A 100% absolute return sounds great, but if it took 10 years, the CAGR is just 7.2%. Always use CAGR for returns over 1 year.'},
          {q:'How do I find the CAGR of a mutual fund?',a:"Use the fund's NAV on the start date and current NAV in this calculator. Or check the fund factsheet — it usually shows 1Y/3Y/5Y CAGR directly."},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','lumpsum','mf-returns']} nav={nav}/></Section>
    </div>
  </>);
}

function TdsCalc({ nav }) {
  const TDS_RULES = [
    { code:'192A', desc:'Premature withdrawal from EPF', rate:10, threshold:50000 },
    { code:'193',  desc:'Interest on securities', rate:10, threshold:10000 },
    { code:'194',  desc:'Dividend income', rate:10, threshold:5000 },
    { code:'194A', desc:'Interest other than securities (Banks)', rate:10, threshold:40000 },
    { code:'194B', desc:'Lottery / game show winnings', rate:30, threshold:10000 },
    { code:'194C', desc:'Payment to contractors (individual)', rate:1, threshold:30000 },
    { code:'194C2',desc:'Payment to contractors (company)', rate:2, threshold:30000 },
    { code:'194D', desc:'Insurance commission', rate:5, threshold:15000 },
    { code:'194H', desc:'Commission or brokerage', rate:5, threshold:15000 },
    { code:'194I', desc:'Rent (land/building/furniture)', rate:10, threshold:240000 },
    { code:'194I2',desc:'Rent (plant/machinery)', rate:2, threshold:240000 },
    { code:'194J', desc:'Professional / technical fees', rate:10, threshold:30000 },
    { code:'194LA',desc:'Compensation on compulsory acquisition', rate:10, threshold:250000 },
    { code:'194N', desc:'Cash withdrawal (>1Cr in FY)', rate:2, threshold:10000000 },
  ];
  const [selectedCode, setSelectedCode] = useState('194J');
  const [amount, setAmount] = useState(100000);
  const [hasPan, setHasPan] = useState(true);
  const rule = TDS_RULES.find(r => r.code === selectedCode);
  const tds = useMemo(() => {
    if (!rule) return 0;
    if (amount <= rule.threshold) return 0;
    const rate = hasPan ? rule.rate : 20; // Double if no PAN
    return (amount * rate) / 100;
  }, [rule, amount, hasPan]);

  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:13, color:'var(--text3)', marginBottom:8 }}>Nature of payment</div>
          <select value={selectedCode} onChange={e => setSelectedCode(e.target.value)}
            style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8,
              padding:'10px 14px', fontSize:14, color:'var(--text)', cursor:'pointer' }}>
            {TDS_RULES.map(r => (
              <option key={r.code} value={r.code}>{r.code} — {r.desc}</option>
            ))}
          </select>
        </div>
        <SliderRow label="Amount of payment" value={amount} set={setAmount} min={0} max={10000000} step={1000} pre="₹"/>
        <div style={{ display:'flex', gap:16, marginBottom:16 }}>
          <span style={{ fontSize:14, color:'var(--text2)' }}>PAN available?</span>
          {['Yes','No'].map(opt => (
            <label key={opt} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:14, color:'var(--text2)' }}>
              <input type="radio" checked={opt==='Yes'?hasPan:!hasPan} onChange={()=>setHasPan(opt==='Yes')}
                style={{ accentColor:'var(--accent)' }}/>{opt}
            </label>
          ))}
        </div>
        {rule && <div style={{ fontSize:12, color:'var(--text3)' }}>TDS rate: {hasPan?rule.rate:20}% | Threshold: {INRF(rule.threshold)}</div>}
      </div>
      <div style={{ background:'var(--gain-bg)', borderTop:'1px solid var(--border)', padding:'20px 28px', textAlign:'center' }}>
        <div style={{ fontSize:13, color:'var(--text3)', marginBottom:6 }}>Total TDS</div>
        <div style={{ fontSize:32, fontWeight:800, color: tds > 0 ? 'var(--loss)' : 'var(--gain)', fontFamily:'var(--mono)' }}>{INRF(tds)}</div>
      </div>
    </div>
    <div>
      <Section title="What is a TDS Calculator?">
        <p>TDS (Tax Deducted at Source) is tax deducted by the payer before making a payment. If you receive professional fees, rent, interest, or commission above certain thresholds, the payer deducts TDS and deposits it to the government on your behalf. This calculator helps you check how much TDS will be deducted for different payment types.</p>
        <p>If no PAN is provided, TDS is deducted at 20% (double rate) regardless of the applicable rate — making PAN submission important.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'How do I claim TDS refund?',a:"If TDS deducted is more than your actual tax liability, you get a refund when you file your ITR. The refund is processed by the Income Tax Department, usually within 3-6 months of filing."},
          {q:'What is Form 26AS?',a:'Form 26AS is your tax credit statement showing all TDS deducted against your PAN. Always verify it before filing ITR. Available on the Income Tax portal (incometax.gov.in).'},
          {q:'What if TDS is deducted incorrectly?',a:'Contact the deductor to issue a revised TDS certificate (Form 16/16A). If the error is theirs, they must correct it before the TDS return filing deadline.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['hra','salary','sip']} nav={nav}/></Section>
    </div>
  </>);
}

function SalaryCalc({ nav }) {
  const [ctc, setCtc] = useState(1200000);
  const [bonusPct, setBonusPct] = useState(10);
  const [profTax, setProfTax] = useState(200);
  const [empPf, setEmpPf] = useState(1800);
  const [empEePf, setEmpEePf] = useState(1800);
  const [addDeduction, setAddDeduction] = useState(0);
  const { monthlyDeductions, annualDeductions, takeHomeMonthly, takeHomeAnnual } = useMemo(() => {
    const bonus = ctc * bonusPct / 100;
    const baseCTC = ctc - bonus;
    const monthly = baseCTC / 12;
    const monthlyDed = profTax + empPf + empEePf + addDeduction;
    const annualDed = monthlyDed * 12;
    return {
      monthlyDeductions: monthlyDed,
      annualDeductions: annualDed,
      takeHomeMonthly: monthly - monthlyDed,
      takeHomeAnnual: baseCTC - annualDed,
    };
  }, [ctc, bonusPct, profTax, empPf, empEePf, addDeduction]);

  const FRow = ({ label, value, set, pre='₹' }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
      <span style={{ fontSize:14, color:'var(--text2)' }}>{label}</span>
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <span style={{ color:'var(--accent)', fontFamily:'var(--mono)', fontSize:14 }}>{pre}</span>
        <input type="number" value={value} onChange={e => set(Number(e.target.value))}
          style={{ background:'var(--gain-bg)', border:'1px solid var(--accent)22', borderRadius:6, padding:'5px 10px',
            fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)', width:120, textAlign:'right', outline:'none' }}/>
      </div>
    </div>
  );

  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <FRow label="Cost to Company (CTC)" value={ctc} set={setCtc}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <span style={{ fontSize:14, color:'var(--text2)' }}>Bonus included in CTC</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'var(--accent)', fontSize:14 }}>%</span>
            <input type="number" value={bonusPct} onChange={e=>setBonusPct(Number(e.target.value))}
              style={{ background:'var(--gain-bg)', border:'1px solid var(--accent)22', borderRadius:6, padding:'5px 10px',
                fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)', width:80, textAlign:'right', outline:'none' }}/>
          </div>
        </div>
        <FRow label="Monthly professional tax" value={profTax} set={setProfTax}/>
        <FRow label="Monthly employer PF" value={empPf} set={setEmpPf}/>
        <FRow label="Monthly employee PF" value={empEePf} set={setEmpEePf}/>
        <FRow label="Monthly additional deduction" value={addDeduction} set={setAddDeduction}/>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', padding:'20px 28px' }}>
        <RRow label="Total monthly deductions" value={INRF(monthlyDeductions)}/>
        <RRow label="Total annual deductions" value={INRF(annualDeductions)}/>
        <RRow label="Take home monthly salary" value={INRF(takeHomeMonthly)} bold accent/>
        <RRow label="Take home annual salary" value={INRF(takeHomeAnnual)} bold/>
      </div>
    </div>
    <div>
      <Section title="What is a Salary Calculator?">
        <p>A salary calculator helps you convert CTC (Cost to Company) to your actual in-hand salary. CTC includes components that don't reach your bank account — employer PF contribution, gratuity provisions, insurance premiums, etc. This calculator breaks down the deductions to show your real take-home.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What is included in CTC?',a:'CTC = Basic salary + HRA + Special allowance + Employer PF + Gratuity + Insurance + Bonus. You only receive the cash components after deductions.'},
          {q:'Is Professional Tax the same everywhere?',a:'No. PT is a state tax. Maharashtra: ₹200/month (max ₹2,500/year). Karnataka: up to ₹200/month. Some states like Rajasthan and Delhi have no PT.'},
          {q:'Should I opt for new or old tax regime?',a:'New regime: lower rates, no deductions. Old regime: higher rates but HRA, 80C, home loan deductions apply. For incomes above ₹15L with significant deductions, old regime often wins. Use our HRA calculator alongside this.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['hra','tds','inflation']} nav={nav}/></Section>
    </div>
  </>);
}

function InflationCalc({ nav }) {
  const [amount, setAmount] = useState(100000);
  const [rate, setRate] = useState(6);
  const [years, setYears] = useState(10);
  const futureValue = useMemo(() => amount * Math.pow(1 + rate/100, years), [amount, rate, years]);
  const presentPower = useMemo(() => amount / Math.pow(1 + rate/100, years), [amount, rate, years]);
  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <SliderRow label="Current amount / cost" value={amount} set={setAmount} min={1000} max={10000000} step={1000} pre="₹"/>
        <SliderRow label="Expected inflation rate (p.a)" value={rate} set={setRate} min={1} max={15} step={0.5} suf="%"/>
        <SliderRow label="Time period" value={years} set={setYears} min={1} max={40} suf="Yr"/>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', padding:'20px 28px' }}>
        <RRow label="Future cost (after inflation)" value={INRF(futureValue)} bold accent/>
        <RRow label="Today's purchasing power of future amount" value={INRF(presentPower)}/>
        <RRow label="Inflation erosion" value={INRF(futureValue - amount)} sub="Amount needed additionally due to inflation"/>
      </div>
    </div>
    <div>
      <Section title="What is an Inflation Calculator?">
        <p>Inflation silently erodes your money's value. ₹1 Lakh today at 6% inflation is worth only ₹55,000 in purchasing power after 10 years. This calculator shows two things: how much something will cost in the future, and how much your current savings will be worth in real terms.</p>
        <p>India's long-run average CPI inflation is around 5-6%. However, education inflation runs 10-12%, healthcare 8-10%, and food varies widely. Adjust the rate based on your specific future expense category.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'What inflation rate should I assume?',a:'For general financial planning, 6% is reasonable for India. For education, use 10%. For healthcare, use 8-10%. For lifestyle expenses, 5-6%.'},
          {q:'How do I beat inflation?',a:'Your investment returns must exceed inflation. If inflation is 6% and your FD earns 7%, your real return is only 1%. Equity mutual funds targeting 12%+ real return of 6% help you genuinely grow wealth.'},
          {q:'What is RBI\'s inflation target?',a:'RBI targets CPI inflation at 4% (±2%). When inflation exceeds 6%, RBI raises repo rates to cool the economy. When it falls below 2%, rates may be cut.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['sip','retirement','salary']} nav={nav}/></Section>
    </div>
  </>);
}

function FlatReducingCalc({ nav }) {
  const [loan, setLoan] = useState(500000);
  const [rate, setRate] = useState(12);
  const [tenure, setTenure] = useState(3);
  const { flatEmi, flatTotal, flatInterest, redEmi, redTotal, redInterest, savings } = useMemo(() => {
    const months = tenure * 12;
    const flatInt = loan * (rate/100) * tenure;
    const fTotal = loan + flatInt;
    const fEmi = fTotal / months;
    const rEmi = emiAmt(loan, rate, tenure);
    const rTotal = rEmi * months;
    const rInt = rTotal - loan;
    return { flatEmi: fEmi, flatTotal: fTotal, flatInterest: flatInt,
      redEmi: rEmi, redTotal: rTotal, redInterest: rInt, savings: flatInt - rInt };
  }, [loan, rate, tenure]);
  return (<>
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:32 }}>
      <div style={{ padding:'26px 28px' }}>
        <SliderRow label="Loan amount" value={loan} set={setLoan} min={10000} max={10000000} step={10000} pre="₹"/>
        <SliderRow label="Rate of interest (per annum)" value={rate} set={setRate} min={1} max={36} step={0.5} suf="%"/>
        <SliderRow label="Loan tenure" value={tenure} set={setTenure} min={1} max={20} suf="Yr"/>
      </div>
      <div style={{ borderTop:'1px solid var(--border)', padding:'20px 28px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr 1fr', gap:'10px 20px', marginBottom:16 }}>
          <div/><div style={{ fontSize:12, color:'var(--text3)', fontWeight:700, textAlign:'right' }}>Flat rate</div>
          <div style={{ fontSize:12, color:'var(--text3)', fontWeight:700, textAlign:'right' }}>Reducing balance</div>
          {[
            {label:'Monthly EMI', a:INRF(flatEmi), b:INRF(redEmi)},
            {label:'Total interest', a:INRF(flatInterest), b:INRF(redInterest)},
            {label:'Total amount', a:INRF(flatTotal), b:INRF(redTotal)},
          ].map((r,i) => (<>
            <span key={`l${i}`} style={{ fontSize:13, color:'var(--text3)', display:'flex', alignItems:'center' }}>{r.label}</span>
            <span key={`a${i}`} style={{ fontSize:14, fontFamily:'var(--mono)', textAlign:'right', color:'var(--text)' }}>{r.a}</span>
            <span key={`b${i}`} style={{ fontSize:14, fontFamily:'var(--mono)', textAlign:'right', color:'var(--gain)', fontWeight:700 }}>{r.b}</span>
          </>))}
        </div>
        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--gain-bg)',
          border:'1px solid var(--gain)', borderRadius:8, padding:'8px 14px',
          fontSize:13, color:'var(--gain)', fontWeight:700 }}>
          Save {INRF(savings)} by choosing reducing balance
        </div>
      </div>
    </div>
    <div>
      <Section title="Flat Rate vs Reducing Balance — What's the Difference?">
        <p>With a flat rate loan, interest is always calculated on the original principal. If you borrowed ₹5L, you pay interest on ₹5L for the entire tenure — even after repaying half. Flat rates are common in personal loans from NBFCs and dealer financing.</p>
        <p>With a reducing balance (diminishing balance) loan, interest is charged only on the remaining outstanding principal. Since the principal reduces each month, the interest also reduces. This is used by all banks for home loans and most consumer loans.</p>
        <p>The result: a 12% flat rate is roughly equivalent to a 21-22% effective reducing balance rate. Always compare on a reducing balance basis.</p>
      </Section>
      <Section title="FAQs">
        <FAQ faqs={[
          {q:'Why do some lenders offer flat rates?',a:'Flat rate loans look cheaper on paper (lower interest percentage), but they\'re actually more expensive. Lenders use flat rates to market loans more attractively to uninformed borrowers.'},
          {q:'How do I convert flat rate to effective reducing balance rate?',a:'There\'s no simple formula, but a rough approximation: Effective rate ≈ flat rate × 1.75 to 1.9. Use this calculator to compare accurately.'},
        ]}/>
      </Section>
      <Section title="Related Calculators"><RelatedCalcs ids={['emi','car-loan-emi','home-loan-emi']} nav={nav}/></Section>
    </div>
  </>);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATOR REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const CALC_REGISTRY = [
  { id:'sip',               label:'SIP Calculator',               cat:'Mutual Funds', url:'/calculators/sip',               comp: (p) => <SipCalc {...p}/> },
  { id:'lumpsum',           label:'Lumpsum Calculator',           cat:'Mutual Funds', url:'/calculators/lumpsum',           comp: (p) => <LumpsumCalc {...p}/> },
  { id:'step-up-sip',       label:'Step-up SIP Calculator',       cat:'Mutual Funds', url:'/calculators/step-up-sip',       comp: (p) => <StepUpSipCalc {...p}/> },
  { id:'swp',               label:'SWP Calculator',               cat:'Mutual Funds', url:'/calculators/swp',               comp: (p) => <SwpCalc {...p}/> },
  { id:'mf-returns',        label:'MF Returns Calculator',        cat:'Mutual Funds', url:'/calculators/mf-returns',        comp: (p) => <MfCalc {...p}/> },
  { id:'fd',                label:'FD Calculator',                cat:'Fixed Income', url:'/calculators/fd',                comp: (p) => <FdCalc {...p}/> },
  { id:'rd',                label:'RD Calculator',                cat:'Fixed Income', url:'/calculators/rd',                comp: (p) => <RdCalc {...p}/> },
  { id:'nsc',               label:'NSC Calculator',               cat:'Fixed Income', url:'/calculators/nsc',               comp: (p) => <NscCalc {...p}/> },
  { id:'simple-interest',   label:'Simple Interest',              cat:'Fixed Income', url:'/calculators/simple-interest',   comp: (p) => <SimpleInterestCalc {...p}/> },
  { id:'compound-interest', label:'Compound Interest',            cat:'Fixed Income', url:'/calculators/compound-interest', comp: (p) => <CompoundInterestCalc {...p}/> },
  { id:'emi',               label:'EMI Calculator',               cat:'Loans',        url:'/calculators/emi',               comp: (p) => <EmiCalc type="general" {...p}/> },
  { id:'car-loan-emi',      label:'Car Loan EMI',                 cat:'Loans',        url:'/calculators/car-loan-emi',      comp: (p) => <EmiCalc type="car" {...p}/> },
  { id:'home-loan-emi',     label:'Home Loan EMI',                cat:'Loans',        url:'/calculators/home-loan-emi',     comp: (p) => <EmiCalc type="home" {...p}/> },
  { id:'flat-reducing',     label:'Flat vs Reducing Rate',        cat:'Loans',        url:'/calculators/flat-reducing',     comp: (p) => <FlatReducingCalc {...p}/> },
  { id:'nps',               label:'NPS Calculator',               cat:'Retirement',   url:'/calculators/nps',               comp: (p) => <NpsCalc {...p}/> },
  { id:'retirement',        label:'Retirement Calculator',        cat:'Retirement',   url:'/calculators/retirement',        comp: (p) => <RetirementCalc {...p}/> },
  { id:'inflation',         label:'Inflation Calculator',         cat:'Retirement',   url:'/calculators/inflation',         comp: (p) => <InflationCalc {...p}/> },
  { id:'hra',               label:'HRA Calculator',               cat:'Tax & Salary', url:'/calculators/hra',               comp: (p) => <HraCalc {...p}/> },
  { id:'tds',               label:'TDS Calculator',               cat:'Tax & Salary', url:'/calculators/tds',               comp: (p) => <TdsCalc {...p}/> },
  { id:'salary',            label:'Salary Calculator',            cat:'Tax & Salary', url:'/calculators/salary',            comp: (p) => <SalaryCalc {...p}/> },
  { id:'cagr',              label:'CAGR Calculator',              cat:'Tools',        url:'/calculators/cagr',              comp: (p) => <CagrCalc {...p}/> },
];

const CATS = ['Mutual Funds','Fixed Income','Loans','Retirement','Tax & Salary','Tools'];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CalcHubPage({ initialTab, navigateSub }) {
  const defaultId = CALC_REGISTRY.find(c => c.id === initialTab)?.id || 'sip';
  const [activeId, setActiveId] = useState(defaultId);
  const active = CALC_REGISTRY.find(c => c.id === activeId) || CALC_REGISTRY[0];

  useEffect(() => {
    if (!document.getElementById('ch-styles')) {
      const s = document.createElement('style');
      s.id = 'ch-styles';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  }, []);

  const nav = (id) => {
    setActiveId(id);
    const calc = CALC_REGISTRY.find(c => c.id === id);
    if (calc && navigateSub) {
      const titles = {
        'sip':'SIP Calculator | indexes.live', 'lumpsum':'Lumpsum Calculator | indexes.live',
        'fd':'FD Calculator | indexes.live', 'emi':'EMI Calculator | indexes.live',
      };
      navigateSub(calc.url, titles[id] || `${calc.label} | indexes.live`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const NavItem = ({ calc }) => {
    const isActive = calc.id === activeId;
    return (
      <button onClick={() => nav(calc.id)}
        style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 14px',
          background: isActive ? 'var(--accent)15' : 'none',
          border: 'none',
          borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
          color: isActive ? 'var(--accent)' : 'var(--text2)',
          fontSize: 13, fontWeight: isActive ? 700 : 500, cursor:'pointer',
          borderRadius:'0 6px 6px 0', transition:'all 0.12s',
        }}>
        {calc.label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 16px 40px', display:'grid',
      gridTemplateColumns:'220px 1fr', gap:32, alignItems:'start', minHeight:'80vh' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{ position:'sticky', top:60, paddingTop:24 }}>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', paddingBottom:8 }}>
          {CATS.map(cat => {
            const calcs = CALC_REGISTRY.filter(c => c.cat === cat);
            return (
              <div key={cat}>
                <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', color:'var(--text3)',
                  textTransform:'uppercase', padding:'14px 14px 6px' }}>
                  {cat}
                </div>
                {calcs.map(c => <NavItem key={c.id} calc={c}/>)}
              </div>
            );
          })}
          <div>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', color:'var(--text3)',
              textTransform:'uppercase', padding:'14px 14px 6px' }}>Risk Tools</div>
            <button
              onClick={() => navigateSub && navigateSub('/calc', 'Risk Calculator | indexes.live')}
              style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 14px',
                background:'none', border:'none', borderLeft:'3px solid transparent',
                color:'var(--text2)', fontSize:13, fontWeight:500, cursor:'pointer',
                borderRadius:'0 6px 6px 0' }}>
              Position Sizing & Risk →
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ paddingTop:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:4, letterSpacing:'-0.02em' }}>
          {active.label}
        </h1>
        <p style={{ fontSize:14, color:'var(--text3)', marginBottom:22, lineHeight:1.5 }}>
          Free online {active.label.toLowerCase()} — instant results, no sign-up required.
        </p>
        {active.comp({ nav })}
      </div>
    </div>
  );
}
