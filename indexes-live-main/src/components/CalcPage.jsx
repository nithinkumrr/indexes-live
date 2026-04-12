import { useState, useCallback } from 'react';

const CALCS = [
  { id: 'sip',      label: 'SIP',       desc: 'Systematic Investment Plan' },
  { id: 'swp',      label: 'SWP',       desc: 'Systematic Withdrawal Plan' },
  { id: 'lumpsum',  label: 'Lumpsum',   desc: 'One-time Investment' },
  { id: 'emi',      label: 'EMI',       desc: 'Loan / Home Loan' },
  { id: 'fd',       label: 'FD / RD',   desc: 'Fixed / Recurring Deposit' },
  { id: 'ppf',      label: 'PPF',       desc: 'Public Provident Fund' },
  { id: 'cagr',     label: 'CAGR',      desc: 'Return Calculator' },
  { id: 'inflation',label: 'Inflation', desc: 'Real Value Calculator' },
];

function fmt(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e7)  return `₹${(n/1e7).toFixed(2)} Cr`;
  if (n >= 1e5)  return `₹${(n/1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function Slider({ label, min, max, step, value, onChange, display }) {
  return (
    <div className="calc-field">
      <div className="calc-field-row">
        <span className="calc-field-label">{label}</span>
        <span className="calc-field-val">{display || value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} className="calc-slider" />
      <div className="calc-slider-range"><span>{display ? display.replace(/\d+/, min) : min}</span><span>{display ? display.replace(/\d+/, max) : max}</span></div>
    </div>
  );
}

// ── Result bar ──────────────────────────────────────────────────────────
function ResultBar({ invested, returns, label = 'Returns' }) {
  const total = invested + returns;
  const invPct = total > 0 ? (invested / total) * 100 : 50;
  const retPct = 100 - invPct;
  return (
    <div className="calc-bar-wrap">
      <div className="calc-bar">
        <div className="calc-bar-inv"  style={{ width: `${invPct}%` }} />
        <div className="calc-bar-ret"  style={{ width: `${retPct}%` }} />
      </div>
      <div className="calc-bar-legend">
        <span><span className="calc-dot calc-dot-inv"/>Invested: <strong>{fmt(invested)}</strong></span>
        <span><span className="calc-dot calc-dot-ret"/>{label}: <strong>{fmt(returns)}</strong></span>
      </div>
    </div>
  );
}

// ── SIP ─────────────────────────────────────────────────────────────────
function SIPCalc() {
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate]       = useState(12);
  const [years, setYears]     = useState(10);

  const n = years * 12;
  const r = rate / 100 / 12;
  const fv = r > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : monthly * n;
  const invested = monthly * n;
  const gains    = fv - invested;

  return (
    <div className="calc-body">
      <Slider label="Monthly Investment" min={500} max={100000} step={500} value={monthly} onChange={setMonthly} display={`₹${monthly.toLocaleString('en-IN')}`} />
      <Slider label="Expected Return (p.a.)" min={1} max={30} step={0.5} value={rate} onChange={setRate} display={`${rate}%`} />
      <Slider label="Time Period" min={1} max={40} step={1} value={years} onChange={setYears} display={`${years} yr`} />
      <div className="calc-results">
        <div className="calc-result-main">{fmt(fv)}</div>
        <div className="calc-result-sub">Maturity value after {years} years</div>
      </div>
      <ResultBar invested={invested} returns={gains} />
    </div>
  );
}

// ── SWP ─────────────────────────────────────────────────────────────────
function SWPCalc() {
  const [corpus, setCorpus]       = useState(1000000);
  const [withdrawal, setWithdrawal] = useState(10000);
  const [rate, setRate]           = useState(10);

  const r = rate / 100 / 12;
  const months = r > 0
    ? Math.log(withdrawal / (withdrawal - corpus * r)) / Math.log(1 + r)
    : corpus / withdrawal;
  const years  = months / 12;
  const totalWithdrawn = withdrawal * months;

  return (
    <div className="calc-body">
      <Slider label="Total Corpus" min={100000} max={10000000} step={100000} value={corpus} onChange={setCorpus} display={fmt(corpus)} />
      <Slider label="Monthly Withdrawal" min={1000} max={200000} step={1000} value={withdrawal} onChange={setWithdrawal} display={`₹${withdrawal.toLocaleString('en-IN')}`} />
      <Slider label="Expected Return (p.a.)" min={1} max={20} step={0.5} value={rate} onChange={setRate} display={`${rate}%`} />
      <div className="calc-results">
        <div className="calc-result-main">{isFinite(years) ? `${years.toFixed(1)} years` : '∞'}</div>
        <div className="calc-result-sub">Corpus lasts {isFinite(months) ? `${Math.floor(months)} months` : 'indefinitely (return ≥ withdrawal)'}</div>
      </div>
      <ResultBar invested={corpus} returns={Math.max(0, totalWithdrawn - corpus)} label="Gains withdrawn" />
    </div>
  );
}

// ── LUMPSUM ─────────────────────────────────────────────────────────────
function LumpsumCalc() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate]           = useState(12);
  const [years, setYears]         = useState(10);

  const fv      = principal * Math.pow(1 + rate / 100, years);
  const gains   = fv - principal;

  return (
    <div className="calc-body">
      <Slider label="Investment Amount" min={10000} max={10000000} step={10000} value={principal} onChange={setPrincipal} display={fmt(principal)} />
      <Slider label="Expected Return (p.a.)" min={1} max={30} step={0.5} value={rate} onChange={setRate} display={`${rate}%`} />
      <Slider label="Time Period" min={1} max={40} step={1} value={years} onChange={setYears} display={`${years} yr`} />
      <div className="calc-results">
        <div className="calc-result-main">{fmt(fv)}</div>
        <div className="calc-result-sub">Maturity value · CAGR {rate}% · {years} years</div>
      </div>
      <ResultBar invested={principal} returns={gains} />
    </div>
  );
}

// ── EMI ─────────────────────────────────────────────────────────────────
function EMICalc() {
  const [loan, setLoan]     = useState(5000000);
  const [rate, setRate]     = useState(8.5);
  const [years, setYears]   = useState(20);

  const r   = rate / 100 / 12;
  const n   = years * 12;
  const emi = r > 0 ? loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : loan / n;
  const total     = emi * n;
  const interest  = total - loan;

  return (
    <div className="calc-body">
      <Slider label="Loan Amount" min={100000} max={20000000} step={100000} value={loan} onChange={setLoan} display={fmt(loan)} />
      <Slider label="Interest Rate (p.a.)" min={5} max={20} step={0.25} value={rate} onChange={setRate} display={`${rate}%`} />
      <Slider label="Loan Tenure" min={1} max={30} step={1} value={years} onChange={setYears} display={`${years} yr`} />
      <div className="calc-results">
        <div className="calc-result-main">₹{Math.round(emi).toLocaleString('en-IN')}</div>
        <div className="calc-result-sub">Monthly EMI · Total payable: {fmt(total)}</div>
      </div>
      <ResultBar invested={loan} returns={interest} label="Total Interest" />
    </div>
  );
}

// ── FD ──────────────────────────────────────────────────────────────────
function FDCalc() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate]           = useState(7);
  const [years, setYears]         = useState(3);
  const [freq, setFreq]           = useState(4); // quarterly

  const n   = freq * years;
  const r   = rate / 100 / freq;
  const fv  = principal * Math.pow(1 + r, n);
  const int = fv - principal;

  const FREQS = [{v:1,l:'Annually'},{v:2,l:'Half-yearly'},{v:4,l:'Quarterly'},{v:12,l:'Monthly'}];

  return (
    <div className="calc-body">
      <Slider label="Principal Amount" min={10000} max={5000000} step={10000} value={principal} onChange={setPrincipal} display={fmt(principal)} />
      <Slider label="Interest Rate (p.a.)" min={3} max={15} step={0.25} value={rate} onChange={setRate} display={`${rate}%`} />
      <Slider label="Tenure" min={1} max={10} step={1} value={years} onChange={setYears} display={`${years} yr`} />
      <div className="calc-field">
        <span className="calc-field-label">Compounding</span>
        <div className="calc-freq-tabs">
          {FREQS.map(f => <button key={f.v} className={`calc-freq-btn ${freq===f.v?'active':''}`} onClick={()=>setFreq(f.v)}>{f.l}</button>)}
        </div>
      </div>
      <div className="calc-results">
        <div className="calc-result-main">{fmt(fv)}</div>
        <div className="calc-result-sub">Maturity · Interest earned: {fmt(int)}</div>
      </div>
      <ResultBar invested={principal} returns={int} label="Interest Earned" />
    </div>
  );
}

// ── PPF ─────────────────────────────────────────────────────────────────
function PPFCalc() {
  const [yearly, setYearly] = useState(150000);
  const rate = 7.1; // current PPF rate

  let balance = 0;
  let invested = 0;
  for (let y = 0; y < 15; y++) {
    balance  = (balance + yearly) * (1 + rate / 100);
    invested += yearly;
  }
  const gains = balance - invested;

  return (
    <div className="calc-body">
      <Slider label="Yearly Investment" min={500} max={150000} step={500} value={yearly} onChange={setYearly} display={fmt(yearly)} />
      <div className="calc-field">
        <div className="calc-field-row">
          <span className="calc-field-label">PPF Interest Rate</span>
          <span className="calc-field-val">{rate}% (Current govt. rate)</span>
        </div>
      </div>
      <div className="calc-field">
        <div className="calc-field-row">
          <span className="calc-field-label">Lock-in Period</span>
          <span className="calc-field-val">15 years (extendable)</span>
        </div>
      </div>
      <div className="calc-results">
        <div className="calc-result-main">{fmt(balance)}</div>
        <div className="calc-result-sub">Maturity after 15 years · Tax-free under EEE</div>
      </div>
      <ResultBar invested={invested} returns={gains} label="Tax-free Interest" />
    </div>
  );
}

// ── CAGR ─────────────────────────────────────────────────────────────────
function CAGRCalc() {
  const [initial, setInitial] = useState(100000);
  const [final, setFinal]     = useState(250000);
  const [years, setYears]     = useState(5);

  const cagr   = (Math.pow(final / initial, 1 / years) - 1) * 100;
  const gains  = final - initial;

  return (
    <div className="calc-body">
      <Slider label="Initial Investment" min={10000} max={10000000} step={10000} value={initial} onChange={setInitial} display={fmt(initial)} />
      <Slider label="Final Value" min={10000} max={50000000} step={10000} value={final} onChange={setFinal} display={fmt(final)} />
      <Slider label="Time Period" min={1} max={40} step={1} value={years} onChange={setYears} display={`${years} yr`} />
      <div className="calc-results">
        <div className="calc-result-main">{cagr > 0 ? `${cagr.toFixed(2)}%` : '—'}</div>
        <div className="calc-result-sub">CAGR (Compounded Annual Growth Rate)</div>
      </div>
      <ResultBar invested={initial} returns={gains} />
    </div>
  );
}

// ── INFLATION ────────────────────────────────────────────────────────────
function InflationCalc() {
  const [amount, setAmount]     = useState(100000);
  const [inflation, setInflation] = useState(6);
  const [years, setYears]       = useState(10);

  const futureVal  = amount * Math.pow(1 + inflation / 100, years);
  const realVal    = amount / Math.pow(1 + inflation / 100, years);
  const purchasing = ((realVal / amount) * 100).toFixed(1);

  return (
    <div className="calc-body">
      <Slider label="Current Amount" min={10000} max={10000000} step={10000} value={amount} onChange={setAmount} display={fmt(amount)} />
      <Slider label="Inflation Rate (p.a.)" min={2} max={15} step={0.5} value={inflation} onChange={setInflation} display={`${inflation}%`} />
      <Slider label="Years" min={1} max={40} step={1} value={years} onChange={setYears} display={`${years} yr`} />
      <div className="calc-results">
        <div className="calc-result-main">{fmt(futureVal)}</div>
        <div className="calc-result-sub">You'll need {fmt(futureVal)} in {years} years to match today's {fmt(amount)}</div>
      </div>
      <div className="calc-results" style={{marginTop:8}}>
        <div className="calc-result-main" style={{fontSize:20,color:'var(--loss)'}}>{purchasing}%</div>
        <div className="calc-result-sub">Purchasing power of {fmt(amount)} after {years} years</div>
      </div>
    </div>
  );
}

const CALC_COMPONENTS = { sip: SIPCalc, swp: SWPCalc, lumpsum: LumpsumCalc, emi: EMICalc, fd: FDCalc, ppf: PPFCalc, cagr: CAGRCalc, inflation: InflationCalc };

export default function CalcPage() {
  const [active, setActive] = useState('sip');
  const ActiveCalc = CALC_COMPONENTS[active];

  return (
    <div className="calc-wrap">
      <div className="calc-header">
        <div className="calc-title">Financial Calculators</div>
        <div className="calc-subtitle">Plan your investments, loans and returns</div>
      </div>
      <div className="calc-layout">
        <div className="calc-sidebar">
          {CALCS.map(c => (
            <button key={c.id} className={`calc-nav-btn ${active===c.id?'calc-nav-active':''}`} onClick={()=>setActive(c.id)}>
              <span className="calc-nav-label">{c.label}</span>
              <span className="calc-nav-desc">{c.desc}</span>
            </button>
          ))}
        </div>
        <div className="calc-main">
          <div className="calc-card">
            <div className="calc-card-title">{CALCS.find(c=>c.id===active)?.label}</div>
            <div className="calc-card-desc">{CALCS.find(c=>c.id===active)?.desc}</div>
            {ActiveCalc && <ActiveCalc />}
          </div>
        </div>
      </div>
    </div>
  );
}
