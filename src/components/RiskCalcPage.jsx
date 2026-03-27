import { useState } from 'react';

function fmtINR(n) {
  if (!isFinite(n) || isNaN(n)) return '- ';
  if (Math.abs(n) >= 1e7)  return `₹${(n/1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5)  return `₹${(n/1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function fmtPct(n, d=2) {
  if (!isFinite(n) || isNaN(n)) return '- ';
  return `${n.toFixed(d)}%`;
}
function num(v) { return parseFloat(v) || 0; }

const LOT_SIZES = [
  { value: '65',  label: 'Nifty 50 (65)' },
  { value: '30',  label: 'Bank Nifty (30)' },
  { value: '60',  label: 'Fin Nifty (60)' },
  { value: '120', label: 'Midcap Select (120)' },
  { value: '25',  label: 'Nifty Next 50 (25)' },
  { value: '20',  label: 'Sensex (20)' },
  { value: '30',  label: 'Bankex (30)' },
  { value: '75',  label: 'Sensex 50 (75)' },
];

// ── Shared UI ────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, min=0, step=1, placeholder, prefix, suffix, note }) {
  return (
    <div className="rc-field">
      <label className="rc-label">{label}{note && <span className="rc-note"> {note}</span>}</label>
      <div className="rc-input-wrap">
        {prefix && <span className="rc-affix rc-prefix">{prefix}</span>}
        <input className="rc-input" type="number" min={min} step={step} value={value}
          placeholder={placeholder} onChange={e => onChange(e.target.value)} />
        {suffix && <span className="rc-affix rc-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="rc-field">
      <label className="rc-label">{label}</label>
      <select className="rc-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value+o.label} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Result({ label, value, color, sub }) {
  const c = { gain:'var(--gain)', loss:'var(--loss)', accent:'var(--accent)', warn:'var(--pre)' };
  return (
    <div className="rc-result-row">
      <span className="rc-result-label">{label}</span>
      <span className="rc-result-val" style={{ color: c[color] || 'var(--accent)' }}>{value}</span>
      {sub && <span className="rc-result-sub">{sub}</span>}
    </div>
  );
}

function Results({ children, warning }) {
  return (
    <div className="rc-results">
      {children}
      {warning && <div className="rc-warning">{warning}</div>}
    </div>
  );
}

function Divider() { return <div className="rc-divider" />; }

function WhyMatters({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rc-why">
      <button className="rc-why-toggle" onClick={() => setOpen(o => !o)}>
        <span>💡 Why this matters</span>
        <span className="rc-why-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="rc-why-body">{children}</div>}
    </div>
  );
}

function CalcCard({ title, desc, children }) {
  return (
    <div className="rc-card">
      <div className="rc-card-title">{title}</div>
      <div className="rc-card-desc">{desc}</div>
      <div className="rc-card-body">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════════════════════

function RiskHero() {
  const stats = [
    { val: '90%',  label: 'F&O traders lose money over 3 years',          color: 'var(--loss)' },
    { val: '1%',   label: 'Max risk per trade for most professionals',      color: 'var(--gain)' },
    { val: '100%', label: 'Gain needed to recover from a 50% loss',        color: 'var(--pre)' },
    { val: '0',    label: 'Systems survive long-term without sizing rules', color: 'var(--text3)' },
  ];
  return (
    <div className="rc-hero">
      <div className="rc-hero-content">
        <div className="rc-hero-eyebrow">The only edge that actually compounds</div>
        <h1 className="rc-hero-title">Risk management<br/>is not optional.</h1>
        <p className="rc-hero-body">
          Most traders obsess over entries. Professionals obsess over survival.
          You can have a mediocre strategy and stay profitable - as long as you size correctly
          and protect your capital. The calculators and lessons on this page are what separate
          traders who last from traders who don't.
        </p>
      </div>
      <div className="rc-hero-stats">
        {stats.map(s => (
          <div key={s.label} className="rc-stat-card">
            <div className="rc-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="rc-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RECOVERY TRAP
// ══════════════════════════════════════════════════════════════════════════════

function RecoveryTrap() {
  const rows = [
    { loss:10, recovery:11.1 }, { loss:20, recovery:25 }, { loss:25, recovery:33.3 },
    { loss:30, recovery:42.9 }, { loss:40, recovery:66.7 }, { loss:50, recovery:100 },
    { loss:60, recovery:150 }, { loss:70, recovery:233 }, { loss:80, recovery:400 }, { loss:90, recovery:900 },
  ];
  return (
    <div className="rc-section">
      <div className="rc-section-header">
        <div className="rc-section-eyebrow">The math no one talks about</div>
        <div className="rc-section-title">The Recovery Trap</div>
        <div className="rc-section-sub">
          Losses are not symmetric. A 50% loss requires a 100% gain just to break even.
          This single fact explains why capital preservation is more important than maximizing returns.
        </div>
      </div>
      <div className="rc-recovery-grid">
        {rows.map(r => {
          const severity = r.loss >= 50 ? 'critical' : r.loss >= 30 ? 'danger' : 'warn';
          const barW = Math.min((r.recovery / 900) * 100, 100);
          return (
            <div key={r.loss} className={`rc-recovery-row rc-recovery-${severity}`}>
              <div className="rc-recovery-loss">
                <span className="rc-recovery-pct">-{r.loss}%</span>
                <span className="rc-recovery-label">loss</span>
              </div>
              <div className="rc-recovery-bar-wrap">
                <div className="rc-recovery-bar" style={{ width:`${barW}%` }} />
              </div>
              <div className="rc-recovery-need">
                <span className="rc-recovery-gain">+{r.recovery.toFixed(1)}%</span>
                <span className="rc-recovery-label">to recover</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rc-recovery-note">
        A -50% drawdown is not twice as bad as -25%. It is four times harder to recover from.
        This is why professionals treat drawdown limits as hard stops - not guidelines.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// THE 5 LAWS
// ══════════════════════════════════════════════════════════════════════════════

function TheFiveLaws() {
  const laws = [
    {
      num:'01', color:'var(--loss)',
      title:'Risk first, reward second',
      body:'Before you think about profit, know exactly how much you will lose if you\'re wrong. The target is optional. The stop loss is not.',
      example:'On a Nifty trade at 24,500 - define ₹5,000 max risk first. Quantity, stop placement and target all flow from that number.',
    },
    {
      num:'02', color:'var(--accent)',
      title:'Sizing is your only real decision',
      body:'Two traders with identical strategies but different position sizing will have completely different outcomes. One survives a 10-trade losing streak. The other doesn\'t.',
      example:'At 5% risk per trade, 14 losses in a row cuts capital by 50%. At 1%, you need 69 losses to lose the same. Same trades. Different survival.',
    },
    {
      num:'03', color:'var(--gain)',
      title:'Win rate alone means nothing',
      body:'A 70% win rate with poor R:R loses money. A 35% win rate with 3:1 R:R makes excellent returns. Expectancy - not win rate - is the only real measure.',
      example:'35% wins × ₹3,000 avg gain minus 65% losses × ₹1,000 avg loss = +₹400 per trade. Positive expectancy at 35% win rate.',
    },
    {
      num:'04', color:'var(--pre)',
      title:'Preserve capital to stay in the game',
      body:'You cannot profit on days you have no capital. Risk management\'s purpose is not to maximize returns - it\'s to stay alive long enough for your edge to compound.',
      example:'A trader who loses 40% needs a 66.7% gain to break even. A trader who limits losses to 20% needs only 25%. The math always favors the disciplined.',
    },
    {
      num:'05', color:'var(--india)',
      title:'Consistency beats home runs',
      body:'One catastrophic trade can erase months of careful work. The market rewards system and patience - not bravado. Risk management is what makes a good strategy repeatable.',
      example:'10 trades at +₹2,000 each = ₹20,000 built carefully. One revenge trade at -₹18,000 erases it. Without risk rules, that sequence repeats forever.',
    },
  ];
  return (
    <div className="rc-section">
      <div className="rc-section-header">
        <div className="rc-section-eyebrow">Principles from accounts that survived</div>
        <div className="rc-section-title">The 5 Laws of Risk</div>
        <div className="rc-section-sub">These are not textbook rules. They are patterns observed across thousands of trading outcomes.</div>
      </div>
      <div className="rc-laws-grid">
        {laws.map(l => (
          <div key={l.num} className="rc-law-card">
            <div className="rc-law-num" style={{ color: l.color }}>{l.num}</div>
            <div className="rc-law-title">{l.title}</div>
            <div className="rc-law-body">{l.body}</div>
            <div className="rc-law-example">
              <span className="rc-law-example-label">Example - </span>
              {l.example}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SIZING PROOF
// ══════════════════════════════════════════════════════════════════════════════

function SizingProof() {
  const trades = [
    {win:false},{win:true},{win:true},{win:false},{win:false},
    {win:true},{win:false},{win:true},{win:false},{win:true},
  ];
  let capA = 500000, capB = 500000;
  const histA = [capA], histB = [capB];
  trades.forEach(t => {
    if (t.win) { capA *= 1.075; capB *= 1.015; }
    else       { capA *= 0.95;  capB *= 0.99; }
    histA.push(capA);
    histB.push(capB);
  });
  const wins = trades.filter(t=>t.win).length;
  const losses = trades.length - wins;
  const minH = Math.min(...histA, ...histB);
  const maxH = Math.max(...histA, ...histB);
  const range = maxH - minH || 1;

  return (
    <div className="rc-section">
      <div className="rc-section-header">
        <div className="rc-section-eyebrow">Same strategy. Completely different outcomes.</div>
        <div className="rc-section-title">The Position Sizing Proof</div>
        <div className="rc-section-sub">
          Two traders. Same {wins} wins and {losses} losses. Same 1.5:1 R:R. Only the risk per trade differs.
        </div>
      </div>
      <div className="rc-proof-grid">
        <div className="rc-proof-card">
          <div className="rc-proof-badge" style={{background:'var(--loss-bg)',color:'var(--loss)'}}>Trader A - 5% risk per trade</div>
          <div className="rc-proof-capital" style={{color: capA < 500000 ? 'var(--loss)' : 'var(--gain)'}}>{fmtINR(capA)}</div>
          <div className="rc-proof-sub">{capA < 500000 ? `Down ${fmtPct((500000-capA)/500000*100)} from ₹5L` : `Up from ₹5L`}</div>
          <div className="rc-proof-chart">
            {histA.map((v,i) => {
              const h = ((v - minH) / range) * 56 + 8;
              return <div key={i} className="rc-proof-bar" style={{height:`${h}px`, background: v<500000?'var(--loss)':'var(--gain)'}} />;
            })}
          </div>
        </div>
        <div className="rc-proof-vs">VS</div>
        <div className="rc-proof-card">
          <div className="rc-proof-badge" style={{background:'var(--gain-bg)',color:'var(--gain)'}}>Trader B - 1% risk per trade</div>
          <div className="rc-proof-capital" style={{color:'var(--gain)'}}>{fmtINR(capB)}</div>
          <div className="rc-proof-sub">{capB >= 500000 ? `Up ${fmtPct((capB-500000)/500000*100)} from ₹5L` : `Down from ₹5L`}</div>
          <div className="rc-proof-chart">
            {histB.map((v,i) => {
              const h = ((v - minH) / range) * 56 + 8;
              return <div key={i} className="rc-proof-bar" style={{height:`${h}px`, background:'var(--gain)'}} />;
            })}
          </div>
        </div>
      </div>
      <div className="rc-recovery-note">
        The difference is not luck, skill, or market conditions. It is purely position sizing.
        Trader B survives another 20-trade losing streak. Trader A may not trade next month.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CALCULATORS
// ══════════════════════════════════════════════════════════════════════════════

function PositionSizeCalc() {
  const [capital, setCapital] = useState('500000');
  const [riskPct, setRiskPct] = useState('1');
  const [entry,   setEntry]   = useState('');
  const [sl,      setSl]      = useState('');
  const [lotMode, setLotMode] = useState(false);
  const [lotSize, setLotSize] = useState('65');

  const cap=num(capital), rp=num(riskPct), ent=num(entry), stop=num(sl), ls=num(lotSize);
  const maxRisk=cap*rp/100, slDist=Math.abs(ent-stop);
  const qty=slDist>0?Math.floor(maxRisk/slDist):0, lots=ls>0?Math.floor(qty/ls):0;
  const actualRisk=(lotMode?lots*ls:qty)*slDist;
  const warn=rp>2?'⚠ Risking more than 2% per trade is aggressive':null;

  return (
    <CalcCard title="Position Size Calculator" desc="Exact quantity or lots from capital, risk % and SL distance">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss Price" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
      </div>
      <div className="rc-toggle-row">
        <button className={`rc-toggle-btn ${!lotMode?'active':''}`} onClick={()=>setLotMode(false)}>Equity / Shares</button>
        <button className={`rc-toggle-btn ${lotMode?'active':''}`} onClick={()=>setLotMode(true)}>F&O Lots</button>
      </div>
      {lotMode && <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>}
      <Results warning={warn}>
        <Result label="Max Risk Amount" value={fmtINR(maxRisk)} color="loss"/>
        <Result label="SL Distance" value={slDist>0?`₹${slDist.toFixed(2)}`:'- '} color="accent"/>
        {lotMode ? <>
          <Result label="Max Lots" value={lots>0?`${lots} lots`:'- '} color="gain" sub={`${lots*ls} shares`}/>
          <Result label="Actual Risk" value={fmtINR(actualRisk)} color="accent"/>
        </> : <>
          <Result label="Max Quantity" value={qty>0?`${qty} shares`:'- '} color="gain"/>
          <Result label="Actual Risk" value={fmtINR(actualRisk)} color="accent"/>
        </>}
      </Results>
      <WhyMatters>
        <p>Most traders decide quantity based on round numbers. That is the same as skipping a stop loss - your actual risk is undefined.</p>
        <p>This flips the process: <strong>fix your max loss first, then derive quantity</strong>. A ₹5L account risking 1% = ₹5,000 per trade. SL at 200 points = 25 shares, not more.</p>
        <p>The difference between 1% and 5% risk per trade is not 5x profit. It is the difference between surviving a 10-loss streak and not.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function MaxLossCalc() {
  const [capital, setCapital] = useState('500000');
  const [riskPct, setRiskPct] = useState('1');
  const [trades,  setTrades]  = useState('3');

  const cap=num(capital), rp=num(riskPct), tr=num(trades);
  const perTrade=cap*rp/100, perDay=perTrade*tr, perWeek=perDay*5;
  const warn=rp>2?'⚠ Most professionals cap single-trade risk at 1–2%':null;

  return (
    <CalcCard title="Max Loss Per Trade" desc="Absolute ₹ allowed per trade - no guessing, no excuses">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Field label="Max Trades Per Day" value={trades} onChange={setTrades} step={1}/>
      </div>
      <Results warning={warn}>
        <Result label="Max Loss Per Trade" value={fmtINR(perTrade)} color="loss"/>
        <Result label="Max Daily Loss" value={fmtINR(perDay)} color="loss" sub={`${trades} trades × ${fmtINR(perTrade)}`}/>
        <Result label="Max Weekly Loss" value={fmtINR(perWeek)} color="warn" sub="5 trading days"/>
        <Result label="Daily Loss as % of Capital" value={fmtPct(perDay/cap*100)} color="accent"/>
      </Results>
      <WhyMatters>
        <p>Knowing your max loss as a concrete rupee amount is harder to violate than a percentage. "I will not lose more than ₹5,000 today" creates a real line.</p>
        <p>Set daily limits too. Many professional traders stop trading the moment they hit their daily max - not because they can't continue, but because decision quality degrades after losses. The market will be there tomorrow.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function SLDistanceCalc() {
  const [entry,   setEntry]   = useState('');
  const [maxRisk, setMaxRisk] = useState('');
  const [qty,     setQty]     = useState('');
  const [dir,     setDir]     = useState('long');

  const ent=num(entry), mr=num(maxRisk), q=num(qty);
  const slDist=q>0?mr/q:0;
  const slPrice=dir==='long'?ent-slDist:ent+slDist;
  const slPct=ent>0?(slDist/ent)*100:0;

  return (
    <CalcCard title="Stop Loss Distance Calculator" desc="Given entry and max risk ₹, where should your SL be?">
      <div className="rc-toggle-row">
        <button className={`rc-toggle-btn ${dir==='long'?'active':''}`} onClick={()=>setDir('long')}>Long</button>
        <button className={`rc-toggle-btn ${dir==='short'?'active':''}`} onClick={()=>setDir('short')}>Short</button>
      </div>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Max Risk (₹)" value={maxRisk} onChange={setMaxRisk} prefix="₹" step={100} placeholder="e.g. 5000"/>
        <Field label="Quantity / Shares" value={qty} onChange={setQty} step={1} placeholder="e.g. 50"/>
      </div>
      <Results>
        <Result label="SL Distance (per share)" value={slDist>0?`₹${slDist.toFixed(2)}`:'- '} color="accent"/>
        <Result label="SL Price" value={slPrice>0&&slDist>0?`₹${slPrice.toFixed(2)}`:'- '} color="loss"/>
        <Result label="SL as % of Entry" value={slPct>0?fmtPct(slPct):'- '} color="accent"/>
      </Results>
      <WhyMatters>
        <p>Use this when you already know your quantity and need to figure out where the stop must go given a fixed max loss.</p>
        <p>If the calculated SL lands at an illogical level - inside a candle body, beyond key support - that is a signal to reduce quantity or skip the trade. Never move the SL to fit the trade. Move the trade to fit the SL.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function RRCalc() {
  const [entry,  setEntry]  = useState('');
  const [sl,     setSl]     = useState('');
  const [target, setTarget] = useState('');
  const [dir,    setDir]    = useState('long');

  const ent=num(entry), stop=num(sl), tgt=num(target);
  const risk=dir==='long'?ent-stop:stop-ent;
  const reward=dir==='long'?tgt-ent:ent-tgt;
  const rr=risk>0?reward/risk:0;
  const minWin=rr>0?(1/(1+rr))*100:0;
  const warn=rr>0&&rr<1?'⚠ R:R below 1:1 - needs very high win rate to stay profitable':null;

  return (
    <CalcCard title="Risk Reward Ratio" desc="Computes R:R using entry, SL, and target">
      <div className="rc-toggle-row">
        <button className={`rc-toggle-btn ${dir==='long'?'active':''}`} onClick={()=>setDir('long')}>Long</button>
        <button className={`rc-toggle-btn ${dir==='short'?'active':''}`} onClick={()=>setDir('short')}>Short</button>
      </div>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss Price" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
        <Field label="Target Price" value={target} onChange={setTarget} prefix="₹" step={0.05} placeholder="e.g. 24900"/>
      </div>
      <Results warning={warn}>
        <Result label="Risk (per share)" value={risk>0?`₹${risk.toFixed(2)}`:'- '} color="loss"/>
        <Result label="Reward (per share)" value={reward>0?`₹${reward.toFixed(2)}`:'- '} color="gain"/>
        <Result label="R:R Ratio" value={rr>0?`1 : ${rr.toFixed(2)}`:'- '}
          color={rr>=2?'gain':rr>=1?'accent':'loss'}/>
        <Result label="Min Win Rate Needed" value={minWin>0?fmtPct(minWin):'- '} color="accent"/>
      </Results>
      <WhyMatters>
        <p>A 2:1 R:R means you only need to be right 34% of the time to break even. A 3:1 means 25%. Most retail traders chase win rates, not R:R - and that is backwards.</p>
        <p>Never take a trade with R:R below 1.5:1 unless your win rate is consistently above 65%. If you have a 65% win rate, why are you wasting it on low R:R setups?</p>
      </WhyMatters>
    </CalcCard>
  );
}

function BreakevenCalc() {
  const [strike,  setStrike]  = useState('');
  const [premium, setPremium] = useState('');
  const [legs,    setLegs]    = useState([]);
  const [mode,    setMode]    = useState('single');

  const str=num(strike), prem=num(premium);
  const addLeg=()=>setLegs(l=>[...l,{type:'call',action:'buy',strike:'',premium:'',qty:'1'}]);
  const removeLeg=i=>setLegs(l=>l.filter((_,j)=>j!==i));
  const updateLeg=(i,k,v)=>setLegs(l=>l.map((leg,j)=>j===i?{...leg,[k]:v}:leg));
  const netPremium=legs.reduce((acc,leg)=>acc+(leg.action==='buy'?-1:1)*num(leg.premium)*num(leg.qty),0);

  return (
    <CalcCard title="Break-even Price (Options)" desc="Exact breakeven for calls, puts, and multi-leg strategies">
      <div className="rc-toggle-row">
        <button className={`rc-toggle-btn ${mode==='single'?'active':''}`} onClick={()=>setMode('single')}>Single Leg</button>
        <button className={`rc-toggle-btn ${mode==='multi'?'active':''}`} onClick={()=>setMode('multi')}>Multi-Leg</button>
      </div>
      {mode==='single' ? (
        <>
          <div className="rc-fields-grid">
            <Field label="Strike Price" value={strike} onChange={setStrike} prefix="₹" step={50} placeholder="e.g. 24500"/>
            <Field label="Premium Paid" value={premium} onChange={setPremium} prefix="₹" step={0.5} placeholder="e.g. 120"/>
          </div>
          <Results>
            <Result label="Call Breakeven" value={str+prem>0?`₹${(str+prem).toFixed(2)}`:'- '} color="gain" sub="Strike + Premium"/>
            <Result label="Put Breakeven"  value={str-prem>0?`₹${(str-prem).toFixed(2)}`:'- '} color="loss" sub="Strike − Premium"/>
          </Results>
        </>
      ) : (
        <>
          <div className="rc-leg-list">
            {legs.map((leg,i)=>(
              <div key={i} className="rc-leg-row">
                <select className="rc-mini-select" value={leg.action} onChange={e=>updateLeg(i,'action',e.target.value)}>
                  <option value="buy">Buy</option><option value="sell">Sell</option>
                </select>
                <select className="rc-mini-select" value={leg.type} onChange={e=>updateLeg(i,'type',e.target.value)}>
                  <option value="call">Call</option><option value="put">Put</option>
                </select>
                <input className="rc-mini-input" placeholder="Strike" type="number" value={leg.strike} onChange={e=>updateLeg(i,'strike',e.target.value)}/>
                <input className="rc-mini-input" placeholder="Premium" type="number" value={leg.premium} onChange={e=>updateLeg(i,'premium',e.target.value)}/>
                <input className="rc-mini-input" placeholder="Qty" type="number" value={leg.qty} onChange={e=>updateLeg(i,'qty',e.target.value)} style={{width:48}}/>
                <button className="rc-leg-remove" onClick={()=>removeLeg(i)}>✕</button>
              </div>
            ))}
            <button className="rc-add-leg" onClick={addLeg}>+ Add Leg</button>
          </div>
          {legs.length>0 && (
            <Results>
              <Result label="Net Premium" value={`₹${Math.abs(netPremium).toFixed(2)}`}
                color={netPremium>=0?'gain':'loss'} sub={netPremium>=0?'Net Credit received':'Net Debit paid'}/>
            </Results>
          )}
        </>
      )}
      <WhyMatters>
        <p>Many options buyers forget that the underlying doesn't just need to move in their direction - it needs to move <em>past</em> the breakeven just to not lose money. Premium is a hurdle, not just a cost.</p>
        <p>On a ₹24,500 Nifty call at ₹150 premium, Nifty needs to reach ₹24,650 at expiry just to break even. That's a 0.6% move before a single rupee of profit. Factor this into your targets.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function MaxContractsCalc() {
  const [capital,  setCapital]  = useState('500000');
  const [riskPct,  setRiskPct]  = useState('2');
  const [premium,  setPremium]  = useState('');
  const [lotSize,  setLotSize]  = useState('65');
  const [margin,   setMargin]   = useState('');

  const cap=num(capital), rp=num(riskPct), prem=num(premium), ls=num(lotSize), marg=num(margin);
  const maxRisk=cap*rp/100, costPerLot=prem*ls;
  const lotsFromRisk=costPerLot>0?Math.floor(maxRisk/costPerLot):0;
  const lotsFromMargin=marg>0?Math.floor(cap/marg):0;
  const maxLots=marg>0?Math.min(lotsFromRisk,lotsFromMargin):lotsFromRisk;
  const totalPremium=maxLots*costPerLot;

  return (
    <CalcCard title="Max Contracts Allowed" desc="Max lots you can trade based on premium and defined risk">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" step={0.5}/>
        <Field label="Option Premium" value={premium} onChange={setPremium} prefix="₹" step={0.5} placeholder="e.g. 150"/>
        <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>
        <Field label="Margin Per Lot" value={margin} onChange={setMargin} prefix="₹" step={1000} placeholder="For selling" note="(optional)"/>
      </div>
      <Results>
        <Result label="Max Risk Budget" value={fmtINR(maxRisk)} color="loss"/>
        <Result label="Cost Per Lot" value={costPerLot>0?fmtINR(costPerLot):'- '} color="accent"/>
        <Result label="Max Lots" value={maxLots>0?`${maxLots} lots`:'- '} color="gain"
          sub={totalPremium>0?`Total outflow: ${fmtINR(totalPremium)}`:''}/>
      </Results>
      <WhyMatters>
        <p>For option buyers, max loss is the entire premium. So the question isn't "what is my stop?" It is: "how many lots can I buy such that even if this expires worthless, I'm within my risk limit?"</p>
        <p>Buying 5 lots of a ₹150 Nifty call costs ₹48,750. On a ₹5L account that's 9.75% on a single trade that can go to zero. That's how accounts erode - not from one catastrophic trade but from oversizing a series of them.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function MarginUtilCalc() {
  const [capital, setCapital] = useState('500000');
  const [blocked, setBlocked] = useState('');
  const [trades,  setTrades]  = useState([{name:'',margin:''}]);

  const cap=num(capital);
  const blockedTotal=num(blocked)||trades.reduce((acc,t)=>acc+num(t.margin),0);
  const utilPct=cap>0?(blockedTotal/cap)*100:0;
  const warn=utilPct>80?'⚠ Over 80% utilization - very little room for adverse moves':
             utilPct>60?'⚠ Over 60% - limited headroom for new positions':null;

  return (
    <CalcCard title="Margin Utilization" desc="% of capital blocked in margin vs total capital">
      <div className="rc-fields-grid">
        <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Total Margin Blocked" value={blocked} onChange={setBlocked} prefix="₹" step={1000} placeholder="Or sum below"/>
      </div>
      <div className="rc-leg-list">
        {trades.map((t,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} placeholder={`Trade ${i+1}`} value={t.name}
              onChange={e=>setTrades(tr=>tr.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="rc-mini-input" placeholder="Margin ₹" type="number" value={t.margin}
              onChange={e=>setTrades(tr=>tr.map((x,j)=>j===i?{...x,margin:e.target.value}:x))}/>
            {trades.length>1 && <button className="rc-leg-remove" onClick={()=>setTrades(tr=>tr.filter((_,j)=>j!==i))}>✕</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setTrades(t=>[...t,{name:'',margin:''}])}>+ Add Trade</button>
      </div>
      <Results warning={warn}>
        <Result label="Margin Blocked" value={fmtINR(blockedTotal)} color="loss"/>
        <Result label="Free Capital" value={fmtINR(cap-blockedTotal)} color="gain"/>
        <Result label="Utilization" value={fmtPct(utilPct)}
          color={utilPct>80?'loss':utilPct>60?'warn':'gain'}/>
      </Results>
      <WhyMatters>
        <p>High margin utilization is a hidden risk. When the market moves sharply against you, you may face a margin call - forcing you to close positions at the worst possible moment, locking in maximum loss.</p>
        <p>Most professionals keep utilization under 50–60%. This leaves room to hold through volatility without being forced out by mechanics.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function PortfolioRiskCalc() {
  const [capital, setCapital] = useState('500000');
  const [positions, setPositions] = useState([
    {name:'Trade 1',risk:''},{name:'Trade 2',risk:''},
  ]);

  const cap=num(capital);
  const totalRisk=positions.reduce((acc,p)=>acc+num(p.risk),0);
  const totalPct=cap>0?(totalRisk/cap)*100:0;
  const warn=totalPct>5?'⚠ Total portfolio risk over 5% - consider reducing exposure':null;

  return (
    <CalcCard title="Portfolio Capital at Risk" desc="Aggregate risk across all open trades - total exposure %">
      <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      <div className="rc-leg-list" style={{marginTop:10}}>
        {positions.map((p,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} placeholder="Name" value={p.name}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="rc-mini-input" placeholder="Risk ₹" type="number" value={p.risk}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,risk:e.target.value}:x))}/>
            {positions.length>1 && <button className="rc-leg-remove" onClick={()=>setPositions(ps=>ps.filter((_,j)=>j!==i))}>✕</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setPositions(p=>[...p,{name:`Trade ${p.length+1}`,risk:''}])}>+ Add Position</button>
      </div>
      <Results warning={warn}>
        <Result label="Total Risk (₹)" value={fmtINR(totalRisk)} color="loss"/>
        <Result label="Total Risk (% of Capital)" value={fmtPct(totalPct)}
          color={totalPct>5?'loss':totalPct>3?'warn':'gain'}/>
        <Result label="Capital Safe" value={fmtINR(cap-totalRisk)} color="gain"/>
      </Results>
      <WhyMatters>
        <p>Even if each trade risks 1%, having 8 open positions means 8% of capital is at risk simultaneously - and those positions are often correlated. A market-wide sell-off hits all of them at once.</p>
        <p>Think of your portfolio as a single entity. The question isn't "am I risking 1% per trade?" It's "how much do I lose if the market drops 3% in the next 10 minutes?"</p>
      </WhyMatters>
    </CalcCard>
  );
}

function DrawdownCalc() {
  const [capital,  setCapital]  = useState('500000');
  const [drawdown, setDrawdown] = useState('20');

  const cap=num(capital), dd=num(drawdown);
  const remaining=cap*(1-dd/100);
  const loss=cap-remaining;
  const recovery=dd<100?(dd/(100-dd))*100:Infinity;

  return (
    <CalcCard title="Drawdown Impact Calculator" desc="Capital remaining after X% loss and recovery % required">
      <div className="rc-fields-grid">
        <Field label="Starting Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Drawdown" value={drawdown} onChange={setDrawdown} suffix="%" step={1} min={1}/>
      </div>
      <Results>
        <Result label="Capital Lost" value={fmtINR(loss)} color="loss"/>
        <Result label="Capital Remaining" value={fmtINR(remaining)} color={dd>50?'loss':'gain'}/>
        <Result label="Recovery Required" value={isFinite(recovery)?fmtPct(recovery):'∞'} color="warn"
          sub={`To return to ${fmtINR(cap)}`}/>
      </Results>
      <WhyMatters>
        <p>This is The Recovery Trap made personal. A 33% drawdown requires a 50% gain just to get back to zero. You haven't made a single rupee of profit yet.</p>
        <p>Set your max drawdown limit before trading. When you hit it, stop. Review. This is not weakness - it is the discipline that keeps accounts alive long enough to compound.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function LossStreakCalc() {
  const [capital, setCapital] = useState('500000');
  const [riskPct, setRiskPct] = useState('1');
  const [floor,   setFloor]   = useState('200000');

  const cap=num(capital), rp=num(riskPct), fl=num(floor);
  const riskFrac=rp/100;
  const k=riskFrac>0&&riskFrac<1?Math.floor(Math.log(fl/cap)/Math.log(1-riskFrac)):0;
  const capitalAfter=n=>cap*Math.pow(1-riskFrac,n);
  const rows=[5,10,15,20,25,k].filter((v,i,a)=>v>0&&a.indexOf(v)===i).sort((a,b)=>a-b);

  return (
    <CalcCard title="Loss Streak Survival Calculator" desc="How many consecutive losses your system can sustain">
      <div className="rc-fields-grid">
        <Field label="Starting Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Field label="Min Capital Floor" value={floor} onChange={setFloor} prefix="₹" step={10000} placeholder="Stop-trading threshold"/>
      </div>
      <Results>
        <Result label="Losses Until Floor Breach" value={k>0?`${k} losses`:'- '}
          color={k>=20?'gain':k>=10?'warn':'loss'}/>
      </Results>
      <Divider/>
      <div className="rc-table-title">Capital after consecutive losses</div>
      <div className="rc-mini-table">
        <div className="rc-mini-thead"><span>Losses</span><span>Capital Left</span><span>% Remaining</span></div>
        {rows.slice(0,6).map(n=>{
          const rem=capitalAfter(n), pct=(rem/cap)*100;
          return (
            <div key={n} className="rc-mini-trow" style={n===k?{background:'var(--loss-bg)'}:{}}>
              <span>{n}</span>
              <span style={{color:pct<50?'var(--loss)':'var(--text)'}}>{fmtINR(rem)}</span>
              <span style={{color:pct<50?'var(--loss)':'var(--gain)'}}>{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
      <WhyMatters>
        <p>Every trading system will have losing streaks. A 50% win rate system will statistically produce streaks of 10+ losses in any given year. The question is: can your account survive them?</p>
        <p>At 1% risk, a 10-loss streak leaves 90.4% of capital. At 5% risk, the same streak leaves 59.9%. The difference is not strategy. It is sizing.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function RiskOfRuinCalc() {
  const [winRate, setWinRate] = useState('50');
  const [rr,      setRR]      = useState('2');
  const [riskPct, setRiskPct] = useState('1');
  const [units,   setUnits]   = useState('100');

  const w=num(winRate)/100, r=num(rr), rp=num(riskPct), n=num(units);
  const edge=w*r-(1-w);
  const base=w>0&&r>0?(1-w)/(w*r):1;
  const ror=edge>0&&base<1?Math.min(Math.pow(base,n)*100,100):100;
  const warn=ror>20?'⚠ High ruin probability - adjust win rate or R:R':null;

  return (
    <CalcCard title="Risk of Ruin Calculator" desc="Probability of account wipeout based on your system parameters">
      <div className="rc-fields-grid">
        <Field label="Win Rate" value={winRate} onChange={setWinRate} suffix="%" step={1}/>
        <Field label="Avg R:R (reward per unit)" value={rr} onChange={setRR} step={0.1}/>
        <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Field label="Risk Units in Account" value={units} onChange={setUnits} step={10} note="= 100 / risk%"/>
      </div>
      <Results warning={warn}>
        <Result label="Edge Per Trade" value={fmtPct(edge*100)} color={edge>0?'gain':'loss'}/>
        <Result label="Risk of Ruin" value={fmtPct(ror)}
          color={ror<5?'gain':ror<20?'warn':'loss'}/>
        <Result label="System Viable" value={edge>0?'Yes - positive edge':'No - negative edge'}
          color={edge>0?'gain':'loss'}/>
      </Results>
      <WhyMatters>
        <p>Risk of Ruin is the probability that your account will eventually reach zero given your current parameters. A negative-edge system will always reach 0% - the only question is when.</p>
        <p>Even with positive edge, if you risk too much per trade, your Risk of Ruin approaches 100%. This is the mathematical proof that position sizing matters more than strategy selection.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function WinRateCalc() {
  const [rr, setRR] = useState('2');
  const r=num(rr);
  const minWin=r>0?(1/(1+r))*100:100;
  const rows=[0.5,1,1.5,2,2.5,3,4,5].map(v=>({rr:v,minWin:(1/(1+v))*100}));
  const diff=v=>v<35?'Easy':v<45?'Reasonable':v<55?'Difficult':'Very hard';

  return (
    <CalcCard title="Win Rate Required" desc="Given R:R, the minimum win rate needed to stay profitable">
      <Field label="Your R:R Ratio (reward per unit risk)" value={rr} onChange={setRR} step={0.1} placeholder="e.g. 2 for 2:1"/>
      <Results>
        <Result label="Minimum Win Rate" value={fmtPct(minWin)}
          color={minWin<40?'gain':minWin<50?'accent':'warn'}/>
        <Result label="Formula" value={`1 ÷ (1 + ${r}) = ${minWin.toFixed(1)}%`} color="accent"/>
      </Results>
      <Divider/>
      <div className="rc-table-title">R:R vs minimum win rate to break even</div>
      <div className="rc-mini-table">
        <div className="rc-mini-thead"><span>R:R</span><span>Min Win Rate</span><span>Difficulty</span></div>
        {rows.map(row=>(
          <div key={row.rr} className={`rc-mini-trow ${Math.abs(row.rr-r)<0.01?'rc-mini-trow-active':''}`}>
            <span>1:{row.rr}</span>
            <span style={{color:row.minWin<40?'var(--gain)':row.minWin>55?'var(--loss)':'var(--text)'}}>{row.minWin.toFixed(1)}%</span>
            <span style={{color:'var(--text3)',fontSize:'10px'}}>{diff(row.minWin)}</span>
          </div>
        ))}
      </div>
      <WhyMatters>
        <p>Traders obsess over win rate because wins feel good. But a 70% win rate with 0.5:1 R:R is a losing system - you'd need to win 67 out of 100 trades just to break even.</p>
        <p>Build around R:R first. Win rate will follow from good setups. At 2:1 R:R, you can be wrong 66% of the time and still not lose money.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function ExpectancyCalc() {
  const [winRate, setWinRate] = useState('50');
  const [avgWin,  setAvgWin]  = useState('');
  const [avgLoss, setAvgLoss] = useState('');
  const [trades,  setTrades]  = useState('100');

  const w=num(winRate)/100, aw=num(avgWin), al=num(avgLoss), tr=num(trades);
  const expectancy=w*aw-(1-w)*al;
  const totalExpect=expectancy*tr;
  const rr=al>0?aw/al:0;
  const warn=expectancy<0?'⚠ Negative expectancy - this system loses money over time':null;

  return (
    <CalcCard title="Expectancy Calculator" desc="Average profit per trade - the true measure of any system">
      <div className="rc-fields-grid">
        <Field label="Win Rate" value={winRate} onChange={setWinRate} suffix="%" step={1}/>
        <Field label="Avg Win Amount" value={avgWin} onChange={setAvgWin} prefix="₹" step={100} placeholder="e.g. 2000"/>
        <Field label="Avg Loss Amount" value={avgLoss} onChange={setAvgLoss} prefix="₹" step={100} placeholder="e.g. 1000"/>
        <Field label="Number of Trades" value={trades} onChange={setTrades} step={10}/>
      </div>
      <Results warning={warn}>
        <Result label="Implied R:R" value={rr>0?`1:${rr.toFixed(2)}`:'- '} color="accent"/>
        <Result label="Expectancy Per Trade" value={avgWin&&avgLoss?fmtINR(expectancy):'- '}
          color={expectancy>0?'gain':'loss'}/>
        <Result label={`Expected P&L (${trades} trades)`} value={avgWin&&avgLoss?fmtINR(totalExpect):'- '}
          color={totalExpect>0?'gain':'loss'}/>
      </Results>
      <WhyMatters>
        <p>Expectancy is the single number that tells you whether your system makes money. A +₹300 expectancy means each trade adds ₹300 on average over time - regardless of the individual outcome.</p>
        <p>Your goal is not to win every trade. It is to have positive expectancy and take enough trades to let the math work. At +₹300 over 200 trades, that's ₹60,000 - through every winning streak and losing streak.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function VolatilityPositionCalc() {
  const [capital,  setCapital]  = useState('500000');
  const [riskPct,  setRiskPct]  = useState('1');
  const [atr,      setAtr]      = useState('');
  const [atrMult,  setAtrMult]  = useState('2');
  const [price,    setPrice]    = useState('');
  const [lotMode,  setLotMode]  = useState(false);
  const [lotSize,  setLotSize]  = useState('65');

  const cap=num(capital), rp=num(riskPct), at=num(atr), am=num(atrMult), pr=num(price), ls=num(lotSize);
  const maxRisk=cap*rp/100, volStop=at*am;
  const qty=volStop>0?Math.floor(maxRisk/volStop):0;
  const lots=ls>0?Math.floor(qty/ls):0;
  const capUsed=qty*pr;
  const warn=volStop>0&&qty>0&&pr>0&&capUsed>cap*0.5?'⚠ Position uses >50% of capital - consider reducing size':null;

  return (
    <CalcCard title="Volatility-Based Sizing (ATR)" desc="Adjusts position size based on actual price volatility">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1}/>
        <Field label="ATR Value" value={atr} onChange={setAtr} prefix="₹" step={0.5} placeholder="e.g. 120"/>
        <Field label="ATR Multiplier" value={atrMult} onChange={setAtrMult} step={0.5} note="(stop = ATR × mult)"/>
        <Field label="Current Price" value={price} onChange={setPrice} prefix="₹" step={0.5} placeholder="e.g. 24500"/>
      </div>
      <div className="rc-toggle-row">
        <button className={`rc-toggle-btn ${!lotMode?'active':''}`} onClick={()=>setLotMode(false)}>Equity</button>
        <button className={`rc-toggle-btn ${lotMode?'active':''}`} onClick={()=>setLotMode(true)}>F&O Lots</button>
      </div>
      {lotMode && <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>}
      <Results warning={warn}>
        <Result label="Volatility Stop (ATR × mult)" value={volStop>0?`₹${volStop.toFixed(2)}`:'- '} color="accent"/>
        <Result label="Max Risk Budget" value={fmtINR(maxRisk)} color="loss"/>
        {lotMode
          ? <Result label="Max Lots" value={lots>0?`${lots} lots (${lots*ls} shares)`:'- '} color="gain"/>
          : <Result label="Max Quantity" value={qty>0?`${qty} shares`:'- '} color="gain"/>}
        {pr>0&&qty>0 && <Result label="Capital Deployed" value={fmtINR(capUsed)}
          sub={`${((capUsed/cap)*100).toFixed(1)}% of capital`} color={capUsed>cap*0.5?'warn':'accent'}/>}
      </Results>
      <WhyMatters>
        <p>A fixed 200-point stop on Nifty when ATR is 80 is very wide. The same stop when ATR is 300 is too tight and will get hit on noise. Volatility-based sizing lets the market tell you where the stop goes.</p>
        <p>During high-volatility events - elections, RBI announcements, global shocks - ATR expands and your position size should shrink. Same risk budget, fewer lots. Not conservative. Consistent.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function CapitalAllocationCalc() {
  const [capital,   setCapital]   = useState('500000');
  const [mode,      setMode]      = useState('equal');
  const [positions, setPositions] = useState([
    {name:'Trade 1',weight:'25',risk:'1'},{name:'Trade 2',weight:'25',risk:'1'},
    {name:'Trade 3',weight:'25',risk:'1'},{name:'Trade 4',weight:'25',risk:'1'},
  ]);

  const cap=num(capital), n=positions.length;
  const totalWeight=positions.reduce((a,p)=>a+num(p.weight),0);
  const alloc=p=>{
    if(mode==='equal') return cap/n;
    if(mode==='risk') return cap*(num(p.risk)/100);
    return totalWeight>0?cap*(num(p.weight)/totalWeight):0;
  };
  const totalAlloc=positions.reduce((acc,p)=>acc+alloc(p),0);

  return (
    <CalcCard title="Capital Allocation Calculator" desc="Splits capital across multiple trades by rule">
      <div className="rc-fields-grid">
        <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      </div>
      <div className="rc-toggle-row">
        <button className={`rc-toggle-btn ${mode==='equal'?'active':''}`} onClick={()=>setMode('equal')}>Equal</button>
        <button className={`rc-toggle-btn ${mode==='risk'?'active':''}`} onClick={()=>setMode('risk')}>By Risk %</button>
        <button className={`rc-toggle-btn ${mode==='custom'?'active':''}`} onClick={()=>setMode('custom')}>Custom %</button>
      </div>
      <div className="rc-leg-list">
        {positions.map((p,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} value={p.name} placeholder="Name"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            {mode==='risk' && <input className="rc-mini-input" type="number" value={p.risk} placeholder="Risk%"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,risk:e.target.value}:x))} style={{width:64}}/>}
            {mode==='custom' && <input className="rc-mini-input" type="number" value={p.weight} placeholder="Wt%"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,weight:e.target.value}:x))} style={{width:64}}/>}
            <span className="rc-alloc-val">{fmtINR(alloc(p))}</span>
            {positions.length>1 && <button className="rc-leg-remove" onClick={()=>setPositions(ps=>ps.filter((_,j)=>j!==i))}>✕</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setPositions(p=>[...p,{name:`Trade ${p.length+1}`,weight:'25',risk:'1'}])}>+ Add Position</button>
      </div>
      <Results>
        <Result label="Total Allocated" value={fmtINR(totalAlloc)} color="accent"/>
        <Result label="Unallocated" value={fmtINR(cap-totalAlloc)} color={cap-totalAlloc>=0?'gain':'loss'}/>
      </Results>
      <WhyMatters>
        <p>Capital allocation forces intentionality. "I have ₹5L to trade" is not a plan. "I'm allocating ₹1.25L each to 4 setups with max 1% risk per position" is a plan.</p>
        <p>Use "By Risk %" when trades have different conviction levels. A high-conviction setup might get 2% risk; a speculative one might get 0.5%. Equal allocation is fine for similar setups with similar edge.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ══════════════════════════════════════════════════════════════════════════════

function RiskGlossary() {
  const [open, setOpen] = useState(null);
  const terms = [
    { term:'Risk Per Trade', def:'The maximum capital you\'re willing to lose on a single trade, expressed as % of account. The foundation of all position sizing. Most professionals use 0.5–2%. Beyond 2% per trade, risk of ruin starts rising sharply.' },
    { term:'Risk:Reward (R:R)', def:'Ratio of potential profit to potential loss. A 2:1 R:R means for every ₹1 risked, you aim to make ₹2. Higher R:R means you need a lower win rate to be profitable - which is almost always achievable with patience.' },
    { term:'Expectancy', def:'Average profit (or loss) per trade over many trades. Formula: (Win Rate × Avg Win) − (Loss Rate × Avg Loss). Positive expectancy is the only sustainable edge. A system without positive expectancy is a ticking clock.' },
    { term:'Drawdown', def:'Percentage decline from peak to trough in account value. A 20% drawdown on a ₹5L account means you\'re ₹1L below your peak - not necessarily ₹1L below your starting capital. Track both.' },
    { term:'Position Sizing', def:'How many shares, lots, or contracts to trade on a given setup. The single most impactful variable in trading performance - more than entry timing, indicator choice, or strategy selection.' },
    { term:'Risk of Ruin', def:'Mathematical probability that your account eventually reaches zero given your win rate, R:R, and risk per trade. Even a profitable system has some ruin risk if sized too aggressively. It should be as close to 0% as possible.' },
    { term:'ATR (Average True Range)', def:'Measures how much a security moves on average per session. Higher ATR = higher volatility. Used to set volatility-adjusted stops. A 200-point Nifty stop means very different things when ATR is 80 vs 300.' },
    { term:'Kelly Criterion', def:'Formula for optimal bet sizing: f = W − (1−W)/R where W = win rate and R = win/loss ratio. In practice, most traders use half-Kelly (50% of the output) to reduce variance. Full Kelly is mathematically optimal but psychologically brutal.' },
    { term:'Margin Utilization', def:'% of available capital blocked in margin requirements. High utilization increases forced liquidation risk - if markets move against you, the broker may square off positions automatically at the worst moment.' },
    { term:'Breakeven Price', def:'The price at which a trade neither gains nor loses money. For options buyers: Strike ± Premium. For equity: Entry Price + transaction costs. Your target must always be comfortably beyond breakeven - not just barely past it.' },
  ];

  return (
    <div className="rc-section">
      <div className="rc-section-header">
        <div className="rc-section-eyebrow">Know the language before you play the game</div>
        <div className="rc-section-title">Risk Glossary</div>
        <div className="rc-section-sub">10 terms every trader must understand - explained by traders, not textbooks.</div>
      </div>
      <div className="rc-glossary-grid">
        {terms.map((t,i)=>(
          <div key={t.term} className={`rc-glossary-item ${open===i?'rc-glossary-open':''}`}
            onClick={()=>setOpen(open===i?null:i)}>
            <div className="rc-glossary-term">
              <span>{t.term}</span>
              <span className="rc-glossary-arrow">{open===i?'▲':'▼'}</span>
            </div>
            {open===i && <div className="rc-glossary-def">{t.def}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TABS + PAGE
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id:'trade',    label:'Trade Risk',   count:4, calcs:[PositionSizeCalc,MaxLossCalc,SLDistanceCalc,RRCalc] },
  { id:'options',  label:'Options',      count:2, calcs:[BreakevenCalc,MaxContractsCalc] },
  { id:'portfolio',label:'Portfolio',    count:3, calcs:[MarginUtilCalc,PortfolioRiskCalc,DrawdownCalc] },
  { id:'system',   label:'System Stats', count:4, calcs:[LossStreakCalc,RiskOfRuinCalc,WinRateCalc,ExpectancyCalc] },
  { id:'sizing',   label:'Sizing',       count:2, calcs:[VolatilityPositionCalc,CapitalAllocationCalc] },
];

export default function RiskCalcPage() {
  const [activeTab, setActiveTab] = useState('trade');
  const tab = TABS.find(t => t.id === activeTab);

  return (
    <div className="rc-page">
      <RiskHero/>
      <RecoveryTrap/>
      <TheFiveLaws/>
      <SizingProof/>

      {/* Calculators */}
      <div className="rc-section">
        <div className="rc-section-header">
          <div className="rc-section-eyebrow">15 calculators across 5 categories</div>
          <div className="rc-section-title">Risk Calculators</div>
          <div className="rc-section-sub">
            Every number you need before entering a trade. Each calculator includes a "Why this matters"
            section so you understand what you're calculating - not just the output.
          </div>
        </div>
        <div className="rc-tab-bar">
          {TABS.map(t=>(
            <button key={t.id} className={`rc-tab-btn ${activeTab===t.id?'rc-tab-active':''}`}
              onClick={()=>setActiveTab(t.id)}>
              <span>{t.label}</span>
              <span className="rc-tab-count">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="rc-grid">
          {tab?.calcs.map((Calc,i)=><Calc key={i}/>)}
        </div>
      </div>

      <RiskGlossary/>

      <div className="rc-footer-note">
        These calculators are for educational purposes only and do not constitute investment advice.
        Always verify calculations before trading. Past performance of any system does not guarantee future results.
      </div>
    </div>
  );
}
