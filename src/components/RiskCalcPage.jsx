import { useState, useEffect, useRef } from 'react';

// ── Formatters ───────────────────────────────────────────────────────────────
function fmtINR(n) {
  if (!isFinite(n) || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e7) return `₹${(n/1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n/1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
function fmtPct(n, d=2) {
  if (!isFinite(n) || isNaN(n)) return '-';
  return `${n.toFixed(d)}%`;
}
function num(v) { return parseFloat(v) || 0; }

const LOT_SIZES = [
  { value:'65',  label:'Nifty 50 (65)' },
  { value:'30',  label:'Bank Nifty (30)' },
  { value:'60',  label:'Fin Nifty (60)' },
  { value:'120', label:'Midcap Select (120)' },
  { value:'25',  label:'Nifty Next 50 (25)' },
  { value:'20',  label:'Sensex (20)' },
  { value:'30',  label:'Bankex (30)' },
  { value:'75',  label:'Sensex 50 (75)' },
];

// ── Shared UI primitives ──────────────────────────────────────────────────────

function Field({ label, value, onChange, min=0, step=1, placeholder, prefix, suffix, note }) {
  return (
    <div className="rc-field">
      <label className="rc-label">
        {label}
        {note && <span className="rc-note"> {note}</span>}
      </label>
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

function Toggle({ options, value, onChange }) {
  return (
    <div className="rc-toggle-row">
      {options.map(o => (
        <button key={o} className={`rc-toggle-btn ${value===o?'active':''}`} onClick={()=>onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

// CalcCard with optional priority flag
function CalcCard({ title, desc, children, priority }) {
  return (
    <div className={`rc-card ${priority ? 'rc-card-priority' : ''}`}>
      {priority && <div className="rc-card-priority-badge">Most Used</div>}
      <div className="rc-card-title">{title}</div>
      <div className="rc-card-desc">{desc}</div>
      <div className="rc-card-body">{children}</div>
    </div>
  );
}

// ── Mini leg input rows ───────────────────────────────────────────────────────
function LegRow({ children }) {
  return <div className="rc-leg-row">{children}</div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 - HERO
// ══════════════════════════════════════════════════════════════════════════════

function RiskHero() {
  return (
    <div className="rc-hero">
      <div className="rc-hero-content">
        <div className="rc-hero-eyebrow">The only edge that compounds</div>
        <h1 className="rc-hero-title">Risk management<br/>is not optional.</h1>
        <p className="rc-hero-body">
          Most traders obsess over entries. Professionals obsess over survival.
          You can have a mediocre strategy and stay consistently profitable,
          as long as you size correctly and protect your capital.
          This page has everything you need to do that.
        </p>
      </div>
      <div className="rc-hero-stats">
        {[
          { val:'90%',  label:'F&O traders lose money over 3 years',       color:'var(--loss)' },
          { val:'1%',   label:'Max risk per trade for most professionals',   color:'var(--gain)' },
          { val:'100%', label:'Gain needed to recover from a 50% loss',     color:'var(--pre)' },
          { val:'0',    label:'Systems survive long-term without risk rules',color:'var(--text3)' },
        ].map(s => (
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
// SECTION 2 - START HERE
// ══════════════════════════════════════════════════════════════════════════════

function StartHere({ onSelectCalc }) {
  const paths = [
    {
      icon: '🌱',
      type: 'New to trading',
      desc: 'Start with how much you can afford to lose per trade',
      calc: 'trade',
      highlight: 'Position Size Calculator',
      color: 'var(--gain)',
    },
    {
      icon: '⚡',
      type: 'Intraday trader',
      desc: 'Know your stop loss placement and daily loss limit before you enter',
      calc: 'trade',
      highlight: 'Stop Loss Distance + Max Loss',
      color: 'var(--accent)',
    },
    {
      icon: '📈',
      type: 'Options buyer',
      desc: 'Calculate breakeven, max lots, and position cost',
      calc: 'options',
      highlight: 'Breakeven + Max Contracts',
      color: 'var(--pre)',
    },
    {
      icon: '🧮',
      type: 'System trader',
      desc: 'Analyse your strategy edge, ruin probability and expectancy',
      calc: 'system',
      highlight: 'Risk of Ruin + Expectancy',
      color: 'var(--india)',
    },
  ];

  return (
    <div>
      <div className="rc-start-header">
        <div className="rc-start-eyebrow">Not sure where to begin?</div>
        <div className="rc-start-title">Start here</div>
        <div className="rc-start-sub">Pick your trader type and jump straight to the right calculator.</div>
      </div>
      <div className="rc-start-grid">
        {paths.map(p => (
          <button key={p.type} className="rc-start-card" onClick={() => onSelectCalc(p.calc)}>
            <div className="rc-start-icon" style={{ color: p.color }}>{p.icon}</div>
            <div className="rc-start-type">{p.type}</div>
            <div className="rc-start-desc">{p.desc}</div>
            <div className="rc-start-cta" style={{ color: p.color }}>
              {p.highlight} →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 - RECOVERY TRAP
// ══════════════════════════════════════════════════════════════════════════════

function RecoveryTrap() {
  const rows = [
    { loss:10, rec:11.1 }, { loss:20, rec:25 }, { loss:25, rec:33.3 },
    { loss:30, rec:42.9 }, { loss:40, rec:66.7 }, { loss:50, rec:100 },
    { loss:60, rec:150  }, { loss:70, rec:233  }, { loss:80, rec:400 },
    { loss:90, rec:900  },
  ];
  return (
    <div className="rc-section" id="recovery">
      <div className="rc-section-eyebrow">The math no one talks about</div>
      <div className="rc-section-title">The Recovery Trap</div>
      <div className="rc-section-sub">
        Losses are not symmetric. A 50% loss requires a 100% gain just to break even.
        This single fact explains why capital preservation matters more than chasing returns.
      </div>

      <div className="rc-recovery-takeaway">
        A 50% loss requires a <strong>100% gain</strong> just to recover. That is not a setback - it is a trap.
      </div>

      <div className="rc-recovery-grid">
        {rows.map(r => {
          const severity = r.loss >= 50 ? 'critical' : r.loss >= 30 ? 'danger' : 'warn';
          const barPct = Math.min((r.rec / 900) * 100, 100);
          return (
            <div key={r.loss} className={`rc-recovery-row rc-recovery-${severity}`}>
              <div className="rc-recovery-loss-col">
                <span className="rc-recovery-loss-pct">-{r.loss}%</span>
                <span className="rc-recovery-lbl">loss</span>
              </div>
              <div className="rc-recovery-bar-wrap">
                <div className="rc-recovery-bar" style={{ width: `${barPct}%` }} />
                {r.loss === 50 && <div className="rc-recovery-pin">← 100% gain needed</div>}
              </div>
              <div className="rc-recovery-gain-col">
                <span className="rc-recovery-gain-pct" style={{
                  color: r.loss >= 50 ? 'var(--loss)' : r.loss >= 30 ? 'var(--pre)' : 'var(--text2)'
                }}>+{r.rec.toFixed(1)}%</span>
                <span className="rc-recovery-lbl">to recover</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rc-recovery-note">
        A 33% drawdown requires a 50% gain just to get back to zero. You have not made a single rupee yet.
        Set your max drawdown limit before you start trading - and treat it as a hard stop.
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 - FIVE LAWS
// ══════════════════════════════════════════════════════════════════════════════

function TheFiveLaws() {
  const laws = [
    { num:'01', color:'var(--loss)',   title:'Risk first, reward second',
      body:'Before thinking about profit, know exactly how much you will lose if you are wrong. The target is optional. The stop loss is not.',
      example:'Nifty trade at 24,500 - define ₹5,000 max risk first. Quantity, stop and target all flow from that number.' },
    { num:'02', color:'var(--accent)', title:'Sizing is your only real decision',
      body:'Two traders with identical strategies but different position sizing will have completely different outcomes. One survives a 10-trade losing streak. The other does not.',
      example:'At 5% risk per trade, 14 losses cuts capital by 50%. At 1%, you need 69 losses. Same trades. Different survival.' },
    { num:'03', color:'var(--gain)',   title:'Win rate alone means nothing',
      body:'A 70% win rate with poor R:R loses money. A 35% win rate with 3:1 R:R makes excellent returns. Expectancy is the only real measure.',
      example:'35% wins x ₹3,000 avg gain minus 65% losses x ₹1,000 avg loss = +₹400 per trade. Profitable at 35%.' },
    { num:'04', color:'var(--pre)',    title:'Preserve capital to stay in the game',
      body:'You cannot profit on days you have no capital. Risk management exists to keep you alive long enough for your edge to compound.',
      example:'A 40% loss needs a 66.7% gain to recover. A 20% loss needs only 25%. Discipline always wins the math.' },
    { num:'05', color:'var(--india)',  title:'Consistency beats home runs',
      body:'One catastrophic trade can erase months of careful work. The market rewards system and patience, not bravado.',
      example:'10 trades at +₹2,000 each = ₹20,000 carefully built. One revenge trade at -₹18,000 wipes it. Without risk rules, this repeats.' },
  ];
  return (
    <div className="rc-section" id="principles">
      <div className="rc-section-eyebrow">Patterns from accounts that survived</div>
      <div className="rc-section-title">The 5 Laws of Risk</div>
      <div className="rc-section-sub">Not textbook rules. Patterns observed across thousands of trading outcomes.</div>
      <div className="rc-laws-grid">
        {laws.map(l => (
          <div key={l.num} className="rc-law-card">
            <div className="rc-law-num" style={{ color: l.color }}>{l.num}</div>
            <div className="rc-law-title">{l.title}</div>
            <div className="rc-law-body">{l.body}</div>
            <div className="rc-law-example">
              <span className="rc-law-eg-label">Example - </span>{l.example}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CALCULATORS (15 + 2 new)
// ══════════════════════════════════════════════════════════════════════════════

// ── Trade Risk ────────────────────────────────────────────────────────────────

function PositionSizeCalc() {
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('1');
  const [entry,setEntry]=useState('');
  const [sl,setSl]=useState('');
  const [mode,setMode]=useState('Equity');
  const [lotSize,setLotSize]=useState('65');

  const cap=num(capital),risk=num(rp),ent=num(entry),stop=num(sl),ls=num(lotSize);
  const maxRisk=cap*risk/100, slDist=Math.abs(ent-stop);
  const qty=slDist>0?Math.floor(maxRisk/slDist):0;
  const lots=ls>0?Math.floor(qty/ls):0;
  const actual=(mode==='F&O Lots'?lots*ls:qty)*slDist;
  const warn=risk>2?'Risking more than 2% per trade is aggressive':null;

  return (
    <CalcCard priority title="Position Size Calculator" desc="Exact quantity or lots from capital, risk % and SL distance">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss Price" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
      </div>
      <Toggle options={['Equity','F&O Lots']} value={mode} onChange={setMode}/>
      {mode==='F&O Lots' && <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>}
      <Results warning={warn}>
        <Result label="Max Risk Amount" value={fmtINR(maxRisk)} color="loss"/>
        <Result label="SL Distance" value={slDist>0?`₹${slDist.toFixed(2)}`:'-'} color="accent"/>
        {mode==='F&O Lots'
          ? <Result label="Max Lots" value={lots>0?`${lots} lots`:'-'} color="gain" sub={`${lots*ls} shares`}/>
          : <Result label="Max Quantity" value={qty>0?`${qty} shares`:'-'} color="gain"/>}
        <Result label="Actual Risk" value={fmtINR(actual)} color="accent"/>
      </Results>
      <WhyMatters>
        <p>Most traders decide quantity from gut feel. That is the same as having no stop loss - your actual risk is undefined.</p>
        <p>Fix your max loss first, then derive quantity. A ₹5L account risking 1% = ₹5,000 per trade. SL 200 points away = 25 shares, not more.</p>
        <p>The difference between 1% and 5% risk per trade is not 5x profit. It is the difference between surviving 10 losses in a row and not.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function MaxLossCalc() {
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('1');
  const [trades,setTrades]=useState('3');

  const cap=num(capital),risk=num(rp),tr=num(trades);
  const perTrade=cap*risk/100, perDay=perTrade*tr, perWeek=perDay*5;
  const warn=risk>2?'Most professionals cap single-trade risk at 1-2%':null;

  return (
    <CalcCard priority title="Max Loss Per Trade" desc="Absolute rupee limit per trade - no guessing, no excuses">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Max Trades Per Day" value={trades} onChange={setTrades} step={1}/>
      </div>
      <Results warning={warn}>
        <Result label="Max Loss Per Trade" value={fmtINR(perTrade)} color="loss"/>
        <Result label="Max Daily Loss" value={fmtINR(perDay)} color="loss" sub={`${trades} trades x ${fmtINR(perTrade)}`}/>
        <Result label="Max Weekly Loss" value={fmtINR(perWeek)} color="warn" sub="5 trading days"/>
        <Result label="Daily Loss % of Capital" value={fmtPct(perDay/cap*100)} color="accent"/>
      </Results>
      <WhyMatters>
        <p>A concrete rupee number is harder to violate than a percentage. "I will not lose more than ₹5,000 today" creates a real line.</p>
        <p>Many professional traders stop the moment they hit their daily max - not because they cannot continue, but because decision quality degrades after losses. The market will be there tomorrow.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function SLDistanceCalc() {
  const [entry,setEntry]=useState('');
  const [maxRisk,setMaxRisk]=useState('');
  const [qty,setQty]=useState('');
  const [dir,setDir]=useState('Long');

  const ent=num(entry),mr=num(maxRisk),q=num(qty);
  const slDist=q>0?mr/q:0;
  const slPrice=dir==='Long'?ent-slDist:ent+slDist;
  const slPct=ent>0?(slDist/ent)*100:0;

  return (
    <CalcCard title="Stop Loss Distance Calculator" desc="Given entry and max risk, where should the SL be placed?">
      <Toggle options={['Long','Short']} value={dir} onChange={setDir}/>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Max Risk (₹)" value={maxRisk} onChange={setMaxRisk} prefix="₹" step={100} placeholder="e.g. 5000"/>
        <Field label="Quantity" value={qty} onChange={setQty} step={1} placeholder="e.g. 50"/>
      </div>
      <Results>
        <Result label="SL Distance" value={slDist>0?`₹${slDist.toFixed(2)}`:'-'} color="accent"/>
        <Result label="SL Price" value={slPrice>0&&slDist>0?`₹${slPrice.toFixed(2)}`:'-'} color="loss"/>
        <Result label="SL as % of Entry" value={slPct>0?fmtPct(slPct):'-'} color="accent"/>
      </Results>
      <WhyMatters>
        <p>Use this when you know your quantity and need to find where the stop must go to stay within your max loss.</p>
        <p>If the calculated SL lands at an illogical level, that is a signal to reduce quantity or skip the trade. Never move the SL to fit the trade. Move the trade to fit the SL.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function RRCalc() {
  const [entry,setEntry]=useState('');
  const [sl,setSl]=useState('');
  const [target,setTarget]=useState('');
  const [dir,setDir]=useState('Long');

  const ent=num(entry),stop=num(sl),tgt=num(target);
  const risk=dir==='Long'?ent-stop:stop-ent;
  const reward=dir==='Long'?tgt-ent:ent-tgt;
  const rr=risk>0?reward/risk:0;
  const minWin=rr>0?(1/(1+rr))*100:0;
  const warn=rr>0&&rr<1?'R:R below 1:1 - needs very high win rate to stay profitable':null;

  return (
    <CalcCard title="Risk Reward Ratio" desc="Computes R:R using entry, SL and target">
      <Toggle options={['Long','Short']} value={dir} onChange={setDir}/>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
        <Field label="Target Price" value={target} onChange={setTarget} prefix="₹" step={0.05} placeholder="e.g. 24900"/>
      </div>
      <Results warning={warn}>
        <Result label="Risk (per share)" value={risk>0?`₹${risk.toFixed(2)}`:'-'} color="loss"/>
        <Result label="Reward (per share)" value={reward>0?`₹${reward.toFixed(2)}`:'-'} color="gain"/>
        <Result label="R:R Ratio" value={rr>0?`1 : ${rr.toFixed(2)}`:'-'}
          color={rr>=2?'gain':rr>=1?'accent':'loss'}/>
        <Result label="Min Win Rate Needed" value={minWin>0?fmtPct(minWin):'-'} color="accent"/>
      </Results>
      <WhyMatters>
        <p>A 2:1 R:R means you only need to be right 34% of the time to break even. Most retail traders chase win rates, not R:R - that is backwards.</p>
        <p>Never take a trade with R:R below 1.5:1 unless your win rate is consistently above 65%.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ── Options ───────────────────────────────────────────────────────────────────

function BreakevenCalc() {
  const [strike,setStrike]=useState('');
  const [prem,setPrem]=useState('');
  const [legs,setLegs]=useState([]);
  const [mode,setMode]=useState('Single Leg');

  const str=num(strike),pr=num(prem);
  const addLeg=()=>setLegs(l=>[...l,{type:'call',action:'buy',strike:'',premium:'',qty:'1'}]);
  const removeLeg=i=>setLegs(l=>l.filter((_,j)=>j!==i));
  const upd=(i,k,v)=>setLegs(l=>l.map((x,j)=>j===i?{...x,[k]:v}:x));
  const netPrem=legs.reduce((acc,l)=>acc+(l.action==='buy'?-1:1)*num(l.premium)*num(l.qty),0);

  return (
    <CalcCard title="Break-even Price (Options)" desc="Exact breakeven for calls, puts and multi-leg strategies">
      <Toggle options={['Single Leg','Multi-Leg']} value={mode} onChange={setMode}/>
      {mode==='Single Leg' ? (
        <>
          <div className="rc-fields-grid">
            <Field label="Strike Price" value={strike} onChange={setStrike} prefix="₹" step={50} placeholder="e.g. 24500"/>
            <Field label="Premium Paid" value={prem} onChange={setPrem} prefix="₹" step={0.5} placeholder="e.g. 120"/>
          </div>
          <Results>
            <Result label="Call Breakeven" value={str+pr>0?`₹${(str+pr).toFixed(2)}`:'-'} color="gain" sub="Strike + Premium"/>
            <Result label="Put Breakeven"  value={str-pr>0?`₹${(str-pr).toFixed(2)}`:'-'} color="loss" sub="Strike - Premium"/>
          </Results>
        </>
      ) : (
        <>
          <div className="rc-leg-list">
            {legs.map((l,i)=>(
              <div key={i} className="rc-leg-row">
                <select className="rc-mini-select" value={l.action} onChange={e=>upd(i,'action',e.target.value)}>
                  <option value="buy">Buy</option><option value="sell">Sell</option>
                </select>
                <select className="rc-mini-select" value={l.type} onChange={e=>upd(i,'type',e.target.value)}>
                  <option value="call">Call</option><option value="put">Put</option>
                </select>
                <input className="rc-mini-input" placeholder="Strike" type="number" value={l.strike} onChange={e=>upd(i,'strike',e.target.value)}/>
                <input className="rc-mini-input" placeholder="Premium" type="number" value={l.premium} onChange={e=>upd(i,'premium',e.target.value)}/>
                <input className="rc-mini-input" placeholder="Qty" type="number" value={l.qty} onChange={e=>upd(i,'qty',e.target.value)} style={{width:44}}/>
                <button className="rc-leg-remove" onClick={()=>removeLeg(i)}>x</button>
              </div>
            ))}
            <button className="rc-add-leg" onClick={addLeg}>+ Add Leg</button>
          </div>
          {legs.length>0 && (
            <Results>
              <Result label="Net Premium" value={`₹${Math.abs(netPrem).toFixed(2)}`}
                color={netPrem>=0?'gain':'loss'} sub={netPrem>=0?'Net Credit':'Net Debit'}/>
            </Results>
          )}
        </>
      )}
      <WhyMatters>
        <p>The underlying does not just need to move in your direction - it needs to move past the breakeven just to not lose money. Premium is a hurdle, not just a cost.</p>
        <p>A ₹24,500 Nifty call at ₹150 premium needs Nifty at ₹24,650 at expiry just to break even. That is a 0.6% move before a single rupee of profit.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function MaxContractsCalc() {
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('2');
  const [prem,setPrem]=useState('');
  const [lotSize,setLotSize]=useState('65');
  const [margin,setMargin]=useState('');

  const cap=num(capital),risk=num(rp),pr=num(prem),ls=num(lotSize),marg=num(margin);
  const maxRisk=cap*risk/100, costPerLot=pr*ls;
  const fromRisk=costPerLot>0?Math.floor(maxRisk/costPerLot):0;
  const fromMargin=marg>0?Math.floor(cap/marg):0;
  const maxLots=marg>0?Math.min(fromRisk,fromMargin):fromRisk;

  return (
    <CalcCard title="Max Contracts Allowed" desc="Max lots based on premium and defined risk budget">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.5}/>
        <Field label="Option Premium" value={prem} onChange={setPrem} prefix="₹" step={0.5} placeholder="e.g. 150"/>
        <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>
        <Field label="Margin Per Lot" value={margin} onChange={setMargin} prefix="₹" step={1000} placeholder="For sellers" note="optional"/>
      </div>
      <Results>
        <Result label="Max Risk Budget" value={fmtINR(maxRisk)} color="loss"/>
        <Result label="Cost Per Lot" value={costPerLot>0?fmtINR(costPerLot):'-'} color="accent"/>
        <Result label="Max Lots" value={maxLots>0?`${maxLots} lots`:'-'} color="gain"
          sub={maxLots>0?`Total outflow: ${fmtINR(maxLots*costPerLot)}`:''}/>
      </Results>
      <WhyMatters>
        <p>For option buyers, max loss is the entire premium. The question is not what your stop is - it is how many lots can you buy such that if this expires worthless, you are within your risk limit.</p>
        <p>Buying 5 lots of a ₹150 Nifty call costs ₹48,750. On a ₹5L account that is 9.75% of capital on a single trade that can go to zero.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

function MarginUtilCalc() {
  const [capital,setCapital]=useState('500000');
  const [blocked,setBlocked]=useState('');
  const [trades,setTrades]=useState([{name:'',margin:''}]);

  const cap=num(capital);
  const total=num(blocked)||trades.reduce((a,t)=>a+num(t.margin),0);
  const pct=cap>0?(total/cap)*100:0;
  const warn=pct>80?'Over 80% utilization - very little room for adverse moves':
             pct>60?'Over 60% - limited headroom for new positions':null;

  return (
    <CalcCard title="Margin Utilization" desc="% of capital blocked vs total capital">
      <div className="rc-fields-grid">
        <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Margin Blocked" value={blocked} onChange={setBlocked} prefix="₹" step={1000} placeholder="Or sum below"/>
      </div>
      <div className="rc-leg-list">
        {trades.map((t,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} placeholder={`Trade ${i+1}`} value={t.name}
              onChange={e=>setTrades(tr=>tr.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="rc-mini-input" placeholder="Margin ₹" type="number" value={t.margin}
              onChange={e=>setTrades(tr=>tr.map((x,j)=>j===i?{...x,margin:e.target.value}:x))}/>
            {trades.length>1 && <button className="rc-leg-remove" onClick={()=>setTrades(tr=>tr.filter((_,j)=>j!==i))}>x</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setTrades(t=>[...t,{name:'',margin:''}])}>+ Add Trade</button>
      </div>
      <Results warning={warn}>
        <Result label="Margin Blocked" value={fmtINR(total)} color="loss"/>
        <Result label="Free Capital" value={fmtINR(cap-total)} color="gain"/>
        <Result label="Utilization" value={fmtPct(pct)} color={pct>80?'loss':pct>60?'warn':'gain'}/>
      </Results>
      <WhyMatters>
        <p>High margin utilization means a sharp move against you can trigger a margin call, forcing you to close positions at the worst possible moment.</p>
        <p>Most professionals keep utilization under 50-60%. This leaves room to hold through volatility without being forced out by mechanics.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function PortfolioRiskCalc() {
  const [capital,setCapital]=useState('500000');
  const [positions,setPositions]=useState([
    {name:'Trade 1',risk:''},{name:'Trade 2',risk:''},
  ]);

  const cap=num(capital);
  const total=positions.reduce((a,p)=>a+num(p.risk),0);
  const pct=cap>0?(total/cap)*100:0;
  const warn=pct>5?'Total portfolio risk over 5% - consider reducing exposure':null;

  return (
    <CalcCard title="Portfolio Capital at Risk" desc="Aggregate risk across all open trades">
      <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      <div className="rc-leg-list" style={{marginTop:10}}>
        {positions.map((p,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} placeholder="Name" value={p.name}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="rc-mini-input" placeholder="Risk ₹" type="number" value={p.risk}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,risk:e.target.value}:x))}/>
            {positions.length>1 && <button className="rc-leg-remove" onClick={()=>setPositions(ps=>ps.filter((_,j)=>j!==i))}>x</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setPositions(p=>[...p,{name:`Trade ${p.length+1}`,risk:''}])}>+ Add Position</button>
      </div>
      <Results warning={warn}>
        <Result label="Total Risk (₹)" value={fmtINR(total)} color="loss"/>
        <Result label="Total Risk % of Capital" value={fmtPct(pct)} color={pct>5?'loss':pct>3?'warn':'gain'}/>
        <Result label="Capital Safe" value={fmtINR(cap-total)} color="gain"/>
      </Results>
      <WhyMatters>
        <p>Even if each trade risks 1%, having 8 open positions means 8% of capital is at risk simultaneously - and those positions are often correlated. A market-wide sell-off hits all of them at once.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function DrawdownCalc() {
  const [capital,setCapital]=useState('500000');
  const [dd,setDd]=useState('20');

  const cap=num(capital),d=num(dd);
  const remaining=cap*(1-d/100);
  const loss=cap-remaining;
  const recovery=d<100?(d/(100-d))*100:Infinity;

  return (
    <CalcCard title="Drawdown Impact Calculator" desc="Capital remaining after X% loss and recovery % required">
      <div className="rc-fields-grid">
        <Field label="Starting Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Drawdown" value={dd} onChange={setDd} suffix="%" step={1} min={1}/>
      </div>
      <Results>
        <Result label="Capital Lost" value={fmtINR(loss)} color="loss"/>
        <Result label="Capital Remaining" value={fmtINR(remaining)} color={d>50?'loss':'gain'}/>
        <Result label="Recovery Required" value={isFinite(recovery)?fmtPct(recovery):'Infinity'} color="warn"
          sub={`To return to ${fmtINR(cap)}`}/>
      </Results>
      <WhyMatters>
        <p>This is the Recovery Trap made personal. A 33% drawdown requires a 50% gain just to get back to zero. Set your max drawdown limit before trading and treat it as a hard stop.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ── System Stats ──────────────────────────────────────────────────────────────

function LossStreakCalc() {
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('1');
  const [floor,setFloor]=useState('200000');

  const cap=num(capital),rf=num(rp)/100,fl=num(floor);
  const k=rf>0&&rf<1?Math.floor(Math.log(fl/cap)/Math.log(1-rf)):0;
  const after=n=>cap*Math.pow(1-rf,n);
  const rows=[5,10,15,20,25,k].filter((v,i,a)=>v>0&&a.indexOf(v)===i).sort((a,b)=>a-b);

  return (
    <CalcCard title="Loss Streak Survival" desc="How many consecutive losses your system can sustain">
      <div className="rc-fields-grid">
        <Field label="Starting Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Min Capital Floor" value={floor} onChange={setFloor} prefix="₹" step={10000} placeholder="Stop-trading threshold"/>
      </div>
      <Results>
        <Result label="Losses Until Floor Breach" value={k>0?`${k} losses`:'-'}
          color={k>=20?'gain':k>=10?'warn':'loss'}/>
      </Results>
      <Divider/>
      <div className="rc-table-title">Capital after N consecutive losses</div>
      <div className="rc-mini-table">
        <div className="rc-mini-thead"><span>Losses</span><span>Capital Left</span><span>% Remaining</span></div>
        {rows.slice(0,6).map(n=>{
          const rem=after(n),pct=(rem/cap)*100;
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
        <p>Every system has losing streaks. A 50% win rate system statistically produces 10+ consecutive losses in any given year. The question is whether your account can survive them.</p>
        <p>At 1% risk, a 10-loss streak leaves 90.4% of capital. At 5%, the same streak leaves 59.9%. The difference is not strategy. It is sizing.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function RiskOfRuinCalc() {
  const [wr,setWr]=useState('50');
  const [rr,setRr]=useState('2');
  const [rp,setRp]=useState('1');
  const [units,setUnits]=useState('100');

  const w=num(wr)/100,r=num(rr),riskF=num(rp),n=num(units);
  const edge=w*r-(1-w);
  const base=w>0&&r>0?(1-w)/(w*r):1;
  const ror=edge>0&&base<1?Math.min(Math.pow(base,n)*100,100):100;
  const warn=ror>20?'High ruin probability - adjust win rate or R:R':null;

  return (
    <CalcCard title="Risk of Ruin" desc="Probability of account wipeout based on your system parameters">
      <div className="rc-fields-grid">
        <Field label="Win Rate" value={wr} onChange={setWr} suffix="%" step={1}/>
        <Field label="Avg R:R (reward per unit)" value={rr} onChange={setRr} step={0.1}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Risk Units in Account" value={units} onChange={setUnits} step={10} note="= 100 / risk%"/>
      </div>
      <Results warning={warn}>
        <Result label="Edge Per Trade" value={fmtPct(edge*100)} color={edge>0?'gain':'loss'}/>
        <Result label="Risk of Ruin" value={fmtPct(ror)} color={ror<5?'gain':ror<20?'warn':'loss'}/>
        <Result label="System Viable" value={edge>0?'Yes - positive edge':'No - negative edge'} color={edge>0?'gain':'loss'}/>
      </Results>
      <WhyMatters>
        <p>Risk of Ruin is the probability your account eventually hits zero. A negative-edge system will always reach 0%. The only question is when.</p>
        <p>Even with positive edge, too much risk per trade pushes ruin probability toward 100%. This is the mathematical proof that sizing matters more than strategy.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function WinRateCalc() {
  const [rr,setRr]=useState('2');
  const r=num(rr);
  const minWin=r>0?(1/(1+r))*100:100;
  const rows=[0.5,1,1.5,2,2.5,3,4,5].map(v=>({rr:v,mw:(1/(1+v))*100}));
  const diff=v=>v<35?'Easy':v<45?'Reasonable':v<55?'Difficult':'Very hard';

  return (
    <CalcCard title="Win Rate Required" desc="Minimum win rate needed to stay profitable at any R:R">
      <Field label="Your R:R Ratio (reward per unit risk)" value={rr} onChange={setRr} step={0.1} placeholder="e.g. 2 for 2:1"/>
      <Results>
        <Result label="Minimum Win Rate" value={fmtPct(minWin)} color={minWin<40?'gain':minWin<50?'accent':'warn'}/>
        <Result label="Formula" value={`1 / (1 + ${r}) = ${minWin.toFixed(1)}%`} color="accent"/>
      </Results>
      <Divider/>
      <div className="rc-table-title">R:R vs minimum win rate to break even</div>
      <div className="rc-mini-table">
        <div className="rc-mini-thead"><span>R:R</span><span>Min Win Rate</span><span>Difficulty</span></div>
        {rows.map(row=>(
          <div key={row.rr} className={`rc-mini-trow ${Math.abs(row.rr-r)<0.01?'rc-mini-trow-active':''}`}>
            <span>1:{row.rr}</span>
            <span style={{color:row.mw<40?'var(--gain)':row.mw>55?'var(--loss)':'var(--text)'}}>{row.mw.toFixed(1)}%</span>
            <span style={{color:'var(--text3)',fontSize:'11px'}}>{diff(row.mw)}</span>
          </div>
        ))}
      </div>
      <WhyMatters>
        <p>A 70% win rate with 0.5:1 R:R is a losing system. You would need to win 67 out of 100 just to break even. Build around R:R first. Win rate follows from good setups, not the reverse.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function ExpectancyCalc() {
  const [wr,setWr]=useState('50');
  const [aw,setAw]=useState('');
  const [al,setAl]=useState('');
  const [tr,setTr]=useState('100');

  const w=num(wr)/100,avgW=num(aw),avgL=num(al),trades=num(tr);
  const exp=w*avgW-(1-w)*avgL;
  const total=exp*trades;
  const warn=exp<0?'Negative expectancy - this system loses money over time':null;

  return (
    <CalcCard title="Expectancy Calculator" desc="Average profit per trade - the true measure of any system">
      <div className="rc-fields-grid">
        <Field label="Win Rate" value={wr} onChange={setWr} suffix="%" step={1}/>
        <Field label="Avg Win Amount" value={aw} onChange={setAw} prefix="₹" step={100} placeholder="e.g. 2000"/>
        <Field label="Avg Loss Amount" value={al} onChange={setAl} prefix="₹" step={100} placeholder="e.g. 1000"/>
        <Field label="Number of Trades" value={tr} onChange={setTr} step={10}/>
      </div>
      <Results warning={warn}>
        <Result label="Implied R:R" value={avgL>0?`1:${(avgW/avgL).toFixed(2)}`:'-'} color="accent"/>
        <Result label="Expectancy Per Trade" value={aw&&al?fmtINR(exp):'-'} color={exp>0?'gain':'loss'}/>
        <Result label={`Expected P&L (${tr} trades)`} value={aw&&al?fmtINR(total):'-'} color={total>0?'gain':'loss'}/>
      </Results>
      <WhyMatters>
        <p>Expectancy tells you whether your system makes money. A +₹300 expectancy means each trade adds ₹300 on average over time, regardless of the individual outcome.</p>
        <p>Your goal is not to win every trade. It is to have positive expectancy and take enough trades to let the math work.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ── Sizing ────────────────────────────────────────────────────────────────────

function VolatilityPositionCalc() {
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('1');
  const [atr,setAtr]=useState('');
  const [mult,setMult]=useState('2');
  const [price,setPrice]=useState('');
  const [mode,setMode]=useState('Equity');
  const [lotSize,setLotSize]=useState('65');

  const cap=num(capital),risk=num(rp),at=num(atr),am=num(mult),pr=num(price),ls=num(lotSize);
  const maxRisk=cap*risk/100, volStop=at*am;
  const qty=volStop>0?Math.floor(maxRisk/volStop):0;
  const lots=ls>0?Math.floor(qty/ls):0;
  const capUsed=qty*pr;
  const warn=capUsed>cap*0.5&&qty>0&&pr>0?'Position uses over 50% of capital - consider reducing size':null;

  return (
    <CalcCard title="Volatility-Based Sizing (ATR)" desc="Adjusts position size based on actual price volatility">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="ATR Value" value={atr} onChange={setAtr} prefix="₹" step={0.5} placeholder="e.g. 120"/>
        <Field label="ATR Multiplier" value={mult} onChange={setMult} step={0.5} note="stop = ATR x mult"/>
        <Field label="Current Price" value={price} onChange={setPrice} prefix="₹" step={0.5} placeholder="e.g. 24500"/>
      </div>
      <Toggle options={['Equity','F&O Lots']} value={mode} onChange={setMode}/>
      {mode==='F&O Lots' && <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>}
      <Results warning={warn}>
        <Result label="Volatility Stop (ATR x mult)" value={volStop>0?`₹${volStop.toFixed(2)}`:'-'} color="accent"/>
        <Result label="Max Risk Budget" value={fmtINR(maxRisk)} color="loss"/>
        {mode==='F&O Lots'
          ? <Result label="Max Lots" value={lots>0?`${lots} lots (${lots*ls} shares)`:'-'} color="gain"/>
          : <Result label="Max Quantity" value={qty>0?`${qty} shares`:'-'} color="gain"/>}
        {pr>0&&qty>0 && <Result label="Capital Deployed" value={fmtINR(capUsed)}
          sub={`${((capUsed/cap)*100).toFixed(1)}% of capital`} color={capUsed>cap*0.5?'warn':'accent'}/>}
      </Results>
      <WhyMatters>
        <p>A fixed 200-point stop on Nifty means very different things when ATR is 80 vs 300. Volatility-based sizing lets the market tell you where the stop goes, then you size down to fit the risk.</p>
        <p>During high-volatility events like elections or RBI announcements, ATR expands and your position size should shrink. Same risk, fewer lots. Consistent, not conservative.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function CapitalAllocationCalc() {
  const [capital,setCapital]=useState('500000');
  const [mode,setMode]=useState('Equal');
  const [positions,setPositions]=useState([
    {name:'Trade 1',weight:'25',risk:'1'},{name:'Trade 2',weight:'25',risk:'1'},
    {name:'Trade 3',weight:'25',risk:'1'},{name:'Trade 4',weight:'25',risk:'1'},
  ]);

  const cap=num(capital),n=positions.length;
  const tw=positions.reduce((a,p)=>a+num(p.weight),0);
  const alloc=p=>{
    if(mode==='Equal') return cap/n;
    if(mode==='By Risk %') return cap*(num(p.risk)/100);
    return tw>0?cap*(num(p.weight)/tw):0;
  };
  const totalAlloc=positions.reduce((acc,p)=>acc+alloc(p),0);

  return (
    <CalcCard title="Capital Allocation" desc="Splits capital across trades by rule">
      <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      <Toggle options={['Equal','By Risk %','Custom %']} value={mode} onChange={setMode}/>
      <div className="rc-leg-list">
        {positions.map((p,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} value={p.name} placeholder="Name"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            {mode==='By Risk %' && <input className="rc-mini-input" type="number" value={p.risk} placeholder="Risk%"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,risk:e.target.value}:x))} style={{width:60}}/>}
            {mode==='Custom %' && <input className="rc-mini-input" type="number" value={p.weight} placeholder="Wt%"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,weight:e.target.value}:x))} style={{width:60}}/>}
            <span className="rc-alloc-val">{fmtINR(alloc(p))}</span>
            {positions.length>1 && <button className="rc-leg-remove" onClick={()=>setPositions(ps=>ps.filter((_,j)=>j!==i))}>x</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setPositions(p=>[...p,{name:`Trade ${p.length+1}`,weight:'25',risk:'1'}])}>+ Add Position</button>
      </div>
      <Results>
        <Result label="Total Allocated" value={fmtINR(totalAlloc)} color="accent"/>
        <Result label="Unallocated" value={fmtINR(cap-totalAlloc)} color={cap-totalAlloc>=0?'gain':'loss'}/>
      </Results>
      <WhyMatters>
        <p>"I have ₹5L to trade" is not a plan. "I am allocating ₹1.25L to 4 non-correlated setups with max 1% risk each" is a plan.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ── NEW: Gap Risk Calculator ──────────────────────────────────────────────────

function GapRiskCalc() {
  const [entry,setEntry]=useState('');
  const [sl,setSl]=useState('');
  const [gapPct,setGapPct]=useState('3');
  const [qty,setQty]=useState('');
  const [dir,setDir]=useState('Long');

  const ent=num(entry),stop=num(sl),gap=num(gapPct),q=num(qty);
  const gapExit=dir==='Long'?ent*(1-gap/100):ent*(1+gap/100);
  const slLoss=Math.abs(ent-stop)*q;
  const gapLoss=Math.abs(ent-gapExit)*q;
  const slippage=gapLoss-slLoss;
  const gapMult=slLoss>0?gapLoss/slLoss:0;
  const warn=gapMult>2?`Gap could cause ${gapMult.toFixed(1)}x your planned SL loss`:null;

  return (
    <CalcCard title="Gap Risk Calculator" desc="Estimate loss if price gaps through your stop loss">
      <Toggle options={['Long','Short']} value={dir} onChange={setDir}/>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss Price" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
        <Field label="Expected Gap" value={gapPct} onChange={setGapPct} suffix="%" step={0.5} placeholder="e.g. 3"/>
        <Field label="Quantity" value={qty} onChange={setQty} step={1} placeholder="e.g. 50"/>
      </div>
      <Results warning={warn}>
        <Result label="Planned Exit (SL)" value={stop>0?`₹${stop.toFixed(2)}`:'-'} color="accent"/>
        <Result label="Actual Exit (After Gap)" value={gapExit>0?`₹${gapExit.toFixed(2)}`:'-'} color="loss"/>
        <Result label="Planned SL Loss" value={slLoss>0?fmtINR(slLoss):'-'} color="accent"/>
        <Result label="Actual Gap Loss" value={gapLoss>0?fmtINR(gapLoss):'-'} color="loss"/>
        <Result label="Extra Slippage" value={slippage>0?fmtINR(slippage):'-'} color="warn"
          sub={gapMult>0?`${gapMult.toFixed(1)}x your planned SL loss`:''}/>
      </Results>
      <WhyMatters>
        <p>Stop losses do not protect you from gaps. If Nifty closes at 24,500 and opens next day at 24,200, your SL at 24,300 is never triggered - you exit at 24,200.</p>
        <p>Overnight positions carry gap risk. This is especially relevant around earnings, RBI policy, budget, and global events. Size positions accordingly, not just based on intraday stop distance.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ── NEW: Leverage Risk Calculator ─────────────────────────────────────────────

function LeverageRiskCalc() {
  const [capital,setCapital]=useState('500000');
  const [posSize,setPosSize]=useState('');
  const [margin,setMargin]=useState('');

  const cap=num(capital),pos=num(posSize),marg=num(margin);
  const leverage=marg>0?pos/marg:pos>0?pos/cap:0;
  const marginPct=cap>0?(marg>0?marg/cap:pos/cap)*100:0;
  const riskClass=leverage>10?'Extreme':leverage>5?'High':leverage>3?'Aggressive':leverage>1?'Moderate':'Safe';
  const riskColor=leverage>10?'loss':leverage>5?'warn':leverage>3?'warn':leverage>1?'accent':'gain';
  const moveTo0=leverage>0?fmtPct(100/leverage):'-';

  return (
    <CalcCard title="Leverage Risk Calculator" desc="Effective exposure relative to capital and risk classification">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Total Position Size" value={posSize} onChange={setPosSize} prefix="₹" step={10000} placeholder="e.g. 1500000"/>
        <Field label="Margin Used" value={margin} onChange={setMargin} prefix="₹" step={1000} placeholder="Actual margin blocked"/>
      </div>
      <Results>
        <Result label="Effective Leverage" value={leverage>0?`${leverage.toFixed(1)}x`:'-'} color={riskColor}/>
        <Result label="Risk Classification" value={riskClass} color={riskColor}/>
        <Result label="Capital at Margin" value={fmtPct(marginPct)} color="accent"/>
        <Result label="Move to Wipe Out Capital" value={moveTo0} color="loss"
          sub="% move that would wipe account at this leverage"/>
      </Results>
      <div className="rc-leverage-legend">
        {[
          {label:'Safe',     range:'1-3x',  color:'var(--gain)'},
          {label:'Moderate', range:'3-5x',  color:'var(--accent)'},
          {label:'Aggressive',range:'5-10x',color:'var(--pre)'},
          {label:'Extreme',  range:'10x+',  color:'var(--loss)'},
        ].map(l=>(
          <div key={l.label} className="rc-leverage-chip" style={{borderColor:l.color}}>
            <span style={{color:l.color,fontWeight:700}}>{l.label}</span>
            <span className="rc-leverage-range">{l.range}</span>
          </div>
        ))}
      </div>
      <WhyMatters>
        <p>Leverage amplifies both gains and losses. At 10x leverage, a 10% move against you wipes your entire account. Most retail F&O traders are at 5-15x without realising it.</p>
        <p>The "move to wipe out" number is the most important one here. If a 5% Nifty move (which happens regularly) can wipe your account, your leverage is too high.</p>
      </WhyMatters>
    </CalcCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOSSARY
// ══════════════════════════════════════════════════════════════════════════════

function RiskGlossary() {
  const [open,setOpen]=useState(null);
  const terms = [
    { term:'Risk Per Trade',    def:'Max capital you are willing to lose on one trade, as % of account. Foundation of all position sizing. Most professionals use 0.5-2%. Beyond 2%, risk of ruin starts rising sharply.' },
    { term:'Risk:Reward (R:R)', def:'Ratio of potential profit to potential loss. A 2:1 R:R means for every ₹1 risked, you aim to make ₹2. Higher R:R means you need a lower win rate to be profitable.' },
    { term:'Expectancy',        def:'Average profit (or loss) per trade over many trades. Formula: (Win Rate x Avg Win) minus (Loss Rate x Avg Loss). Positive expectancy is the only sustainable edge.' },
    { term:'Drawdown',          def:'Percentage decline from peak to trough in account value. A 20% drawdown on a ₹5L account means you are ₹1L below your peak, not necessarily below your starting capital.' },
    { term:'Position Sizing',   def:'How many shares, lots or contracts to trade. The most impactful variable in trading performance, more than entry timing, indicator choice or strategy.' },
    { term:'Risk of Ruin',      def:'Probability that your account eventually reaches zero given your win rate, R:R and risk per trade. Even a profitable system has ruin risk if sized too aggressively.' },
    { term:'ATR',               def:'Average True Range. Measures how much a security moves on average per session. Higher ATR = higher volatility. Used to set stops and size positions for current market conditions.' },
    { term:'Kelly Criterion',   def:'Formula for optimal bet sizing: f = W - (1-W)/R where W = win rate and R = win/loss ratio. Most traders use half-Kelly to reduce variance. Full Kelly is mathematically optimal but psychologically brutal.' },
    { term:'Margin Utilization',def:'% of available capital blocked in margin. High utilization increases forced liquidation risk. If markets move against you, the broker may square off positions automatically at the worst moment.' },
    { term:'Breakeven Price',   def:'Price at which a trade neither gains nor loses money. For options buyers: Strike +/- Premium. Your target must always be comfortably beyond breakeven, not just barely past it.' },
  ];

  return (
    <div className="rc-section" id="glossary">
      <div className="rc-section-eyebrow">Know the language before you play the game</div>
      <div className="rc-section-title">Risk Glossary</div>
      <div className="rc-section-sub">10 terms every trader must understand, explained plainly.</div>
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
// TABS CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id:'trade',    label:'Trade Risk',   count:4, calcs:[PositionSizeCalc,MaxLossCalc,SLDistanceCalc,RRCalc] },
  { id:'options',  label:'Options',      count:2, calcs:[BreakevenCalc,MaxContractsCalc] },
  { id:'portfolio',label:'Portfolio',    count:3, calcs:[MarginUtilCalc,PortfolioRiskCalc,DrawdownCalc] },
  { id:'system',   label:'System Stats', count:4, calcs:[LossStreakCalc,RiskOfRuinCalc,WinRateCalc,ExpectancyCalc] },
  { id:'sizing',   label:'Sizing',       count:2, calcs:[VolatilityPositionCalc,CapitalAllocationCalc] },
  { id:'advanced', label:'Advanced',     count:2, calcs:[GapRiskCalc,LeverageRiskCalc] },
];

// ══════════════════════════════════════════════════════════════════════════════
// STICKY PAGE NAV
// ══════════════════════════════════════════════════════════════════════════════

function PageNav({ activeSection, onNav }) {
  const sections = [
    { id:'start',      label:'Start Here' },
    { id:'calculators',label:'Calculators' },
    { id:'recovery',   label:'Recovery Trap' },
    { id:'principles', label:'5 Laws' },
    { id:'glossary',   label:'Glossary' },
  ];
  return (
    <div className="rc-page-nav">
      <div className="rc-page-nav-inner">
        {sections.map(s=>(
          <button key={s.id} className={`rc-page-nav-btn ${activeSection===s.id?'rc-page-nav-active':''}`}
            onClick={()=>onNav(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function RiskCalcPage() {
  const [activeTab,   setActiveTab]   = useState('trade');
  const [activeSection,setActiveSection] = useState('start');
  const calcRef = useRef(null);

  const tab = TABS.find(t=>t.id===activeTab);

  // Scroll-spy: track which section is in view
  useEffect(() => {
    const ids = ['start','calculators','recovery','principles','glossary'];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setActiveSection(e.target.id);
      });
    }, { rootMargin:'-40% 0px -55% 0px' });

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => {
    if (id === 'calculators') {
      calcRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
    }
  };

  const handleStartHereSelect = (calcId) => {
    setActiveTab(calcId);
    calcRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  return (
    <div className="rc-page">

      {/* Sticky section nav */}
      <PageNav activeSection={activeSection} onNav={scrollTo}/>

      {/* TOP ROW: Hero (left 50%) + Start Here (right 50%) */}
      <div className="rc-top-row" id="start">
        <div className="rc-top-left">
          <RiskHero/>
        </div>
        <div className="rc-top-right">
          <StartHere onSelectCalc={handleStartHereSelect}/>
        </div>
      </div>

      {/* Calculators — immediately below the top row */}
      <div className="rc-section" id="calculators" ref={calcRef}>
        <div className="rc-section-eyebrow">17 calculators across 6 categories</div>
        <div className="rc-section-title">Risk Calculators</div>
        <div className="rc-section-sub">
          Every number you need before entering a trade. Position Size and Max Loss are highlighted
          as the most impactful starting points. Each calculator includes a "Why this matters" section.
        </div>

        <div className="rc-calc-tab-wrap">
          <div className="rc-tab-bar">
            {TABS.map(t=>(
              <button key={t.id} className={`rc-tab-btn ${activeTab===t.id?'rc-tab-active':''}`}
                onClick={()=>setActiveTab(t.id)}>
                <span>{t.label}</span>
                <span className="rc-tab-count">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rc-grid">
          {tab?.calcs.map((Calc,i)=><Calc key={i}/>)}
        </div>
      </div>

      {/* Recovery Trap */}
      <RecoveryTrap/>

      {/* Five Laws */}
      <TheFiveLaws/>

      {/* Glossary */}
      <RiskGlossary/>

      <div className="rc-footer-note">
        For educational purposes only. Not investment advice. Always verify calculations before trading.
      </div>
    </div>
  );
}
