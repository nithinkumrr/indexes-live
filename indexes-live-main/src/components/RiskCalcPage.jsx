import { useState, useEffect, useRef, createContext, useContext } from 'react';

// ============================================================================== Cross-calculator shared context ──────────────────────────────────────────
const CalcCtx = createContext({ shared:{}, setShared:()=>{} });
function useCalcCtx() { return useContext(CalcCtx); }

// ============================================================================== Formatters ───────────────────────────────────────────────────────────────
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

// ============================================================================== Shared UI primitives ──────────────────────────────────────────────────────

function Field({ label, value, onChange, min=0, step=1, placeholder, prefix, suffix, note, fromCalc }) {
  return (
    <div className="rc-field">
      <div className="rc-field-header">
        <label className="rc-label">
          {label}
          {note && <span className="rc-note"> {note}</span>}
        </label>
        {fromCalc && <span className="rc-from-calc">↑ {fromCalc}</span>}
      </div>
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

function Result({ label, value, color, sub, big }) {
  const c = { gain:'var(--gain)', loss:'var(--loss)', accent:'var(--accent)', warn:'var(--pre)' };
  return (
    <div className={`rc-result-row${big?' rc-result-row-big':''}`}>
      <span className="rc-result-label">{label}</span>
      <div className="rc-result-right">
        <span className="rc-result-val" style={{ color: c[color] || 'var(--accent)' }}>{value}</span>
        {sub && <span className="rc-result-sub">{sub}</span>}
      </div>
    </div>
  );
}

function Results({ children, warning }) {
  return (
    <div className="rc-results">
      {children}
      {warning && <div className="rc-warning">⚠ {warning}</div>}
    </div>
  );
}

function Divider() { return <div className="rc-divider" />; }

function WhyMatters({ insight, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rc-why">
      {insight && <div className="rc-why-insight">💡 {insight}</div>}
      <button className="rc-why-toggle" onClick={() => setOpen(o => !o)}>
        <span>Read more</span>
        <span className="rc-why-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="rc-why-body">{children}</div>}
    </div>
  );
}

// Binary direction toggle, Long=green, Short=red
function DirToggle({ value, onChange }) {
  return (
    <div className="rc-dir-toggle">
      <button className={`rc-dir-btn rc-dir-long ${value==='Long'?'active':''}`} onClick={() => onChange('Long')}>
        ▲ Long
      </button>
      <button className={`rc-dir-btn rc-dir-short ${value==='Short'?'active':''}`} onClick={() => onChange('Short')}>
        ▼ Short
      </button>
    </div>
  );
}

function Toggle({ options, value, onChange }) {
  if (options.includes('Long') && options.includes('Short')) {
    return <DirToggle value={value} onChange={onChange} />;
  }
  return (
    <div className="rc-toggle-row">
      {options.map(o => (
        <button key={o} className={`rc-toggle-btn ${value===o?'active':''}`} onClick={()=>onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function CalcCard({ title, desc, children, priority }) {
  return (
    <div className={`rc-card ${priority ? 'rc-card-priority' : ''}`}>
      {priority && <div className="rc-card-priority-badge">Most Used</div>}
      <div className="rc-card-title">{title}</div>
      {desc && <div className="rc-card-desc">{desc}</div>}
      <div className="rc-card-body">{children}</div>
    </div>
  );
}

function LegRow({ children }) {
  return <div className="rc-leg-row">{children}</div>;
}

// ==============================================================================
// SECTION 1 HERO
// ==============================================================================

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

// ==============================================================================
// SECTION 2 START HERE
// ==============================================================================

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

// ==============================================================================
// SECTION 3 RECOVERY TRAP
// ==============================================================================

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
        A 50% loss requires a <strong>100% gain</strong> just to recover. That is not a setback it is a trap.
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
        Set your max drawdown limit before you start trading and treat it as a hard stop.
      </div>
    </div>
  );
}

// ==============================================================================
// SECTION 4 FIVE LAWS
// ==============================================================================

function TheFiveLaws() {
  const laws = [
    { num:'01', color:'#FF4455', bg:'rgba(255,68,85,0.08)', border:'rgba(255,68,85,0.25)',
      title:'Risk first, reward second',
      body:'Before thinking about profit, know exactly how much you will lose if you are wrong. The target is optional. The stop loss is not.',
      example:'Nifty trade at 24,500: define ₹5,000 max risk first. Quantity, stop and target all flow from that number.' },
    { num:'02', color:'#4A9EFF', bg:'rgba(74,158,255,0.08)', border:'rgba(74,158,255,0.25)',
      title:'Sizing is your only real decision',
      body:'Two traders with identical strategies but different position sizing will have completely different outcomes. One survives a 10-trade losing streak. The other does not.',
      example:'At 5% risk per trade, 14 losses cuts capital by 50%. At 1%, you need 69 losses. Same trades. Different survival.' },
    { num:'03', color:'#00C896', bg:'rgba(0,200,150,0.08)', border:'rgba(0,200,150,0.25)',
      title:'Win rate alone means nothing',
      body:'A 70% win rate with poor R:R loses money. A 35% win rate with 3:1 R:R makes excellent returns. Expectancy is the only real measure.',
      example:'35% wins × ₹3,000 gain minus 65% losses × ₹1,000 loss = +₹400 per trade. Profitable at 35%.' },
    { num:'04', color:'#F59E0B', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.25)',
      title:'Preserve capital to stay in the game',
      body:'You cannot profit on days you have no capital. Risk management exists to keep you alive long enough for your edge to compound.',
      example:'A 40% loss needs a 66.7% gain to recover. A 20% loss needs only 25%. Discipline always wins the math.' },
    { num:'05', color:'#A78BFA', bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.25)',
      title:'Consistency beats home runs',
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
          <div key={l.num} className="rc-law-card" style={{background: l.bg, borderColor: l.border}}>
            <div className="rc-law-num-row">
              <span className="rc-law-num" style={{ color: l.color }}>{l.num}</span>
              <div className="rc-law-num-line" style={{background: l.border}}/>
            </div>
            <div className="rc-law-title" style={{color: 'var(--text)'}}>{l.title}</div>
            <div className="rc-law-body">{l.body}</div>
            <div className="rc-law-example">
              <span className="rc-law-eg-label" style={{color: l.color}}>Example</span>
              <span> {l.example}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==============================================================================
// CALCULATORS (15 + 2 new)
// ==============================================================================

// ============================================================================== Trade Risk ────────────────────────────────────────────────────────────────

function PositionSizeCalc() {
  const { setShared } = useCalcCtx();
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('1');
  const [entry,setEntry]=useState('');
  const [sl,setSl]=useState('');
  const [mode,setMode]=useState('Equity');
  const [lotSize,setLotSize]=useState('65');
  const [reverseMode,setReverseMode]=useState(false);
  const [targetLots,setTargetLots]=useState('1');

  const cap=num(capital),risk=num(rp),ent=num(entry),stop=num(sl),ls=num(lotSize);
  const maxRisk=cap*risk/100;
  const slDist=Math.abs(ent-stop);
  const qty=slDist>0?Math.floor(maxRisk/slDist):0;
  const lots=ls>0?Math.floor(qty/ls):0;
  const actual=(mode==='F&O Lots'?lots*ls:qty)*slDist;
  const riskPerLot=ls>0&&slDist>0?ls*slDist:0;
  const minCapForOneLot=riskPerLot>0?(riskPerLot/(risk/100)):0;
  const lotsZero=mode==='F&O Lots'&&lots===0&&slDist>0&&riskPerLot>0;
  const tightSL=riskPerLot>0&&ls>0?maxRisk/ls:0; // SL distance to fit 1 lot in budget

  // Reverse: what SL to keep for N lots?
  const tl=num(targetLots);
  const reverseSLDist=tl>0&&ls>0&&maxRisk>0?maxRisk/(tl*ls):0;
  const reverseSLPrice=ent>0&&reverseSLDist>0?(stop<ent?ent-reverseSLDist:ent+reverseSLDist):0;

  useEffect(() => {
    if (entry && sl && maxRisk > 0) {
      setShared(s => ({ ...s, entry, sl, maxRisk: String(Math.round(maxRisk)), qty: String(qty) }));
    }
  }, [entry, sl, maxRisk, qty]);

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

      {/* Reverse toggle */}
      <button className="rc-reverse-btn" onClick={()=>setReverseMode(r=>!r)}>
        {reverseMode ? '← Back to normal' : '⇄ What SL for 1 lot?'}
      </button>

      {reverseMode && (
        <div className="rc-reverse-block">
          <div className="rc-reverse-title">Reverse: find SL for target lots</div>
          <Field label="Target Lots" value={targetLots} onChange={setTargetLots} step={1}/>
          {reverseSLDist>0 && (
            <div className="rc-suggestion-chip rc-chip-gain">
              Keep SL {reverseSLDist.toFixed(1)} pts away → ₹{reverseSLPrice.toFixed(2)}
            </div>
          )}
        </div>
      )}

      <Results warning={warn}>
        {mode==='F&O Lots' && riskPerLot>0 && (
          <div className="rc-result-row rc-result-subinfo">
            <span className="rc-result-label">Risk per lot</span>
            <span className="rc-result-val" style={{color:'var(--text2)'}}>{fmtINR(riskPerLot)}</span>
          </div>
        )}
        <Result label="Max Risk Amount" value={fmtINR(maxRisk)} color="loss" big/>
        <Result label="SL Distance" value={slDist>0?`₹${slDist.toFixed(2)}`:'-'} color="accent"/>
        {mode==='F&O Lots'
          ? <div className={`rc-result-row rc-result-row-big ${lotsZero?'rc-result-zero':''}`}>
              <span className="rc-result-label">
                {lotsZero && '⚠ '}Max Lots
              </span>
              <div className="rc-result-right">
                <span className="rc-result-val" style={{color:lotsZero?'var(--loss)':'var(--gain)'}}>
                  {lots>0?`${lots} lots`:'0 lots'}
                </span>
                {lots>0 && <span className="rc-result-sub">{lots*ls} shares</span>}
              </div>
            </div>
          : <Result label="Max Quantity" value={qty>0?`${qty} shares`:'-'} color="gain" big/>}
        <Result label="Actual Risk" value={fmtINR(actual)} color="accent"/>
      </Results>

      {/* Inline explanation when 0 lots */}
      {lotsZero && (
        <div className="rc-zero-lots-block">
          <div className="rc-zero-title">Why 0 lots?</div>
          <div className="rc-zero-line">1 lot risk = {fmtINR(riskPerLot)} &gt; your allowed {fmtINR(maxRisk)}</div>
          <div className="rc-zero-line">Min capital needed for 1 lot at {risk}% risk: {fmtINR(minCapForOneLot)}</div>
          {tightSL>0 && (
            <div className="rc-suggestion-chip rc-chip-accent">
              Tighten SL to {tightSL.toFixed(0)} pts → fits 1 lot in your budget
            </div>
          )}
        </div>
      )}

      <WhyMatters insight="Risking 1% means 100 consecutive losses to wipe your account.">
        <p>Most traders decide quantity from gut feel. That is the same as having no stop loss your actual risk is undefined.</p>
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
  const [lostSoFar,setLostSoFar]=useState('0');

  const cap=num(capital),risk=num(rp),tr=num(trades),lost=num(lostSoFar);
  const perTrade=cap*risk/100;
  const perDay=perTrade*tr;
  const dailyPct=(perDay/cap)*100;
  const remaining=Math.max(0,perDay-lost);
  const tradesLeft=perTrade>0?Math.floor(remaining/perTrade):0;
  const warn=dailyPct>5?`${dailyPct.toFixed(1)}% daily risk is very aggressive, most pros cap at 2-3%`:
             dailyPct>3?`${dailyPct.toFixed(1)}% daily risk, consider reducing`:null;

  return (
    <CalcCard priority title="Max Loss Per Trade" desc="Absolute rupee limit per trade, know your stop before you start">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Max Trades Per Day" value={trades} onChange={setTrades} step={1}/>
        <Field label="Lost Today (₹)" value={lostSoFar} onChange={setLostSoFar} prefix="₹" step={100} placeholder="0"/>
      </div>

      {/* Hero: daily limit */}
      <div className="rc-daily-hero">
        <div className="rc-daily-hero-label">Stop trading after</div>
        <div className="rc-daily-hero-val" style={{color: dailyPct>5?'var(--loss)':dailyPct>3?'var(--pre)':'var(--loss)'}}>
          {fmtINR(perDay)}
        </div>
        <div className="rc-daily-hero-sub">loss today ({fmtPct(dailyPct)} of capital)</div>
      </div>

      <Results warning={warn}>
        <Result label="Max Loss Per Trade" value={`${fmtINR(perTrade)} (${fmtPct(risk)})`} color="loss" big/>
        <Result label="Max Daily Loss" value={`${fmtINR(perDay)} (${fmtPct(dailyPct)})`} color="loss" sub={`${tr} trades × ${fmtINR(perTrade)}`}/>
        {lost>0 && <>
          <Result label="Lost Today" value={fmtINR(lost)} color="warn"/>
          <Result label="Remaining Buffer" value={remaining>0?fmtINR(remaining):'Limit hit'} color={remaining>0?'gain':'loss'} big/>
          <Result label="Trades Left Today" value={tradesLeft>0?`${tradesLeft} trades`:'Stop now'} color={tradesLeft>0?'accent':'loss'}/>
        </>}
      </Results>
      <WhyMatters insight="A daily loss limit stops you trading on tilt after a bad start.">
        <p>A concrete rupee number is harder to violate than a percentage. "I will not lose more than ₹5,000 today" creates a real line.</p>
        <p>Many professional traders stop the moment they hit their daily max not because they cannot continue, but because decision quality degrades after losses. The market will be there tomorrow.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function SLDistanceCalc() {
  const { shared } = useCalcCtx();
  const [entry,setEntry]=useState('');
  const [maxRisk,setMaxRisk]=useState('');
  const [qty,setQty]=useState('');
  const [dir,setDir]=useState('Long');

  useEffect(() => {
    if (shared.entry && !entry) setEntry(shared.entry);
    if (shared.maxRisk && !maxRisk) setMaxRisk(shared.maxRisk);
    if (shared.qty && !qty) setQty(shared.qty);
  }, [shared]);

  const ent=num(entry),mr=num(maxRisk),q=num(qty);
  const slDist=q>0?mr/q:0;
  const slPrice=dir==='Long'?ent-slDist:ent+slDist;
  const slPct=ent>0?(slDist/ent)*100:0;
  const riskUsedPct=mr>0?100:0;
  const isTight=slPct>0&&slPct<0.3;
  const isLoose=slPct>3;

  // Snap to 0.05 tick
  const slSnapped=Math.round(slPrice/0.05)*0.05;

  return (
    <CalcCard title="Stop Loss Distance Calculator" desc="Given entry and max risk, where should the SL be placed?">
      <DirToggle value={dir} onChange={setDir}/>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Max Risk (₹)" value={maxRisk} onChange={setMaxRisk} prefix="₹" step={100} placeholder="e.g. 5000"/>
        <Field label="Quantity" value={qty} onChange={setQty} step={1} placeholder="e.g. 50"/>
      </div>

      {/* Hero: the SL price */}
      {slPrice>0 && slDist>0 && (
        <div className="rc-sl-hero">
          <div className="rc-sl-hero-label">Place stop loss at</div>
          <div className="rc-sl-hero-val" style={{color:'var(--loss)'}}>₹{slSnapped.toFixed(2)}</div>
          <div className="rc-sl-hero-sub">{slDist.toFixed(2)} pts ({fmtPct(slPct)}) from entry</div>
        </div>
      )}

      <Results>
        <Result label="SL Distance" value={slDist>0?`₹${slDist.toFixed(2)}`:'-'} color="accent"/>
        <Result label="SL Price" value={slPrice>0&&slDist>0?`₹${slSnapped.toFixed(2)}`:'-'} color="loss" big/>
        <Result label="SL as % of Entry" value={slPct>0?fmtPct(slPct):'-'}
          color={isTight?'warn':isLoose?'warn':'accent'}/>
        {mr>0&&q>0 && <Result label="Risk Check" value={`${fmtINR(slDist*q)} (100% of allowed)`} color="accent"/>}
      </Results>

      {isTight && (
        <div className="rc-suggestion-chip rc-chip-warn">
          ⚠ SL is very tight ({fmtPct(slPct)}), may get triggered by noise
        </div>
      )}
      {isLoose && (
        <div className="rc-suggestion-chip rc-chip-warn">
          ⚠ SL is wide ({fmtPct(slPct)}), verify this is intentional
        </div>
      )}

      <WhyMatters insight="Never move the stop to fit the trade. Move the trade to fit the stop.">
        <p>Use this when you know your quantity and need to find where the stop must go to stay within your max loss.</p>
        <p>If the calculated SL lands at an illogical level, that is a signal to reduce quantity or skip the trade.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function RRCalc() {
  const { shared } = useCalcCtx();
  const [entry,setEntry]=useState('');
  const [sl,setSl]=useState('');
  const [target,setTarget]=useState('');
  const [dir,setDir]=useState('Long');

  useEffect(() => {
    if (shared.entry && !entry) setEntry(shared.entry);
    if (shared.sl && !sl) setSl(shared.sl);
  }, [shared]);

  const ent=num(entry),stop=num(sl),tgt=num(target);
  const risk=dir==='Long'?ent-stop:stop-ent;
  const reward=dir==='Long'?tgt-ent:ent-tgt;
  const rr=risk>0&&reward>0?reward/risk:0;
  const minWin=rr>0?(1/(1+rr))*100:0;

  // Sanity checks
  const slPct=ent>0&&risk>0?(risk/ent)*100:0;
  const tgtPct=ent>0&&reward>0?(reward/ent)*100:0;
  const invalidSL=sl&&ent&&risk<0;
  const invalidTarget=target&&ent&&reward<0;
  const weirdSL=slPct>10;
  const tightSL=slPct>0&&slPct<0.1;

  // Verdict
  const verdict=rr>=3?{text:'Excellent setup',color:'var(--gain)'}:
                rr>=2?{text:'Good setup',color:'var(--gain)'}:
                rr>=1.5?{text:'Acceptable',color:'var(--accent)'}:
                rr>=1?{text:'Marginal, only with high win rate',color:'var(--pre)'}:
                rr>0?{text:'Avoid, R:R too poor',color:'var(--loss)'}:null;

  // Bar widths (cap risk at 100px, reward proportional)
  const barMax=100;
  const riskBar=barMax;
  const rewardBar=rr>0?Math.min(rr*barMax,300):0;

  const warn=invalidSL?'SL is on wrong side of entry, check direction':
             weirdSL?`SL is ${slPct.toFixed(1)}% from entry, verify this is correct`:
             tightSL?'SL is less than 0.1% from entry, likely an input error':
             rr>0&&rr<1?'R:R below 1:1, needs very high win rate':null;

  return (
    <CalcCard title="Risk Reward Ratio" desc="Visualise your trade setup before entering">
      <DirToggle value={dir} onChange={setDir}/>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
        <Field label="Target Price" value={target} onChange={setTarget} prefix="₹" step={0.05} placeholder="e.g. 24900"/>
      </div>

      {/* Visual R:R bar */}
      {risk>0 && reward>0 && (
        <div className="rc-rr-visual">
          <div className="rc-rr-bar-row">
            <div className="rc-rr-bar-label">Risk</div>
            <div className="rc-rr-bar rc-rr-bar-risk" style={{width: riskBar}}></div>
            <span className="rc-rr-bar-val loss">₹{risk.toFixed(0)}</span>
          </div>
          <div className="rc-rr-bar-row">
            <div className="rc-rr-bar-label">Reward</div>
            <div className="rc-rr-bar rc-rr-bar-reward" style={{width: Math.min(rewardBar,280)}}></div>
            <span className="rc-rr-bar-val gain">₹{reward.toFixed(0)}</span>
          </div>
        </div>
      )}

      <Results warning={warn}>
        <Result label="Risk" value={risk>0?`₹${risk.toFixed(2)} (${fmtPct(slPct)})`:'-'} color="loss"/>
        <Result label="Reward" value={reward>0?`₹${reward.toFixed(2)} (${fmtPct(tgtPct)})`:'-'} color="gain"/>
        <Result label="R:R Ratio" value={rr>0?`1 : ${rr.toFixed(2)}`:'-'}
          color={rr>=2?'gain':rr>=1?'accent':'loss'} big/>
        <Result label="Min Win Rate Needed" value={minWin>0?`${minWin.toFixed(1)}% (1 in ${Math.round(100/minWin)} trades)`:'-'} color="accent"/>
      </Results>

      {verdict && (
        <div className="rc-verdict" style={{borderColor: verdict.color, color: verdict.color}}>
          {verdict.text}
        </div>
      )}

      <WhyMatters insight="At 2:1 R:R you only need to win 34% of trades to break even.">
        <p>A 2:1 R:R means you only need to be right 34% of the time to break even. Most retail traders chase win rates, not R:R, that is backwards.</p>
        <p>Never take a trade with R:R below 1.5:1 unless your win rate is consistently above 65%.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function BreakevenCalc() {
  const [strike,setStrike]=useState('');
  const [prem,setPrem]=useState('');
  const [spot,setSpot]=useState('');
  const [legs,setLegs]=useState([{type:'call',action:'buy',strike:'',premium:'',qty:'1'}]);
  const [mode,setMode]=useState('Single Leg');
  const [lotSize,setLotSize]=useState('65');

  const str=num(strike),pr=num(prem),sp=num(spot);
  const addLeg=()=>setLegs(l=>[...l,{type:'call',action:'buy',strike:'',premium:'',qty:'1'}]);
  const removeLeg=i=>setLegs(l=>l.filter((_,j)=>j!==i));
  const upd=(i,k,v)=>setLegs(l=>l.map((x,j)=>j===i?{...x,[k]:v}:x));
  const ls=num(lotSize);

  // Multi-leg calculations
  const netPremPerUnit=legs.reduce((acc,l)=>{
    const sign=l.action==='buy'?-1:1;
    return acc+sign*num(l.premium)*num(l.qty);
  },0);
  const isCredit=netPremPerUnit>0;
  const netPremAbs=Math.abs(netPremPerUnit);
  const totalCost=netPremAbs*ls;

  // Detect strategy from legs
  function detectStrategy(legs) {
    const valid=legs.filter(l=>l.strike&&l.premium);
    if(valid.length===2) {
      const [a,b]=valid;
      if(a.action==='buy'&&b.action==='buy'&&a.type==='call'&&b.type==='put'&&a.strike===b.strike) return 'Long Straddle';
      if(a.action==='sell'&&b.action==='sell'&&a.type==='call'&&b.type==='put'&&a.strike===b.strike) return 'Short Straddle';
      if(a.action==='buy'&&b.action==='buy'&&a.type==='call'&&b.type==='put') return 'Long Strangle';
      if(a.action==='sell'&&b.action==='sell'&&a.type==='call'&&b.type==='put') return 'Short Strangle';
      if(a.type==='call'&&b.type==='call'&&a.action==='buy'&&b.action==='sell') return 'Bull Call Spread';
      if(a.type==='call'&&b.type==='call'&&a.action==='sell'&&b.action==='buy') return 'Bear Call Spread';
      if(a.type==='put'&&b.type==='put'&&a.action==='buy'&&b.action==='sell') return 'Bear Put Spread';
      if(a.type==='put'&&b.type==='put'&&a.action==='sell'&&b.action==='buy') return 'Bull Put Spread';
    }
    return null;
  }

  // Multi-leg breakevens (simplified for common strategies)
  function getBreakevens(legs) {
    const valid=legs.filter(l=>l.strike&&l.premium);
    if(!valid.length) return [];
    const net=legs.reduce((acc,l)=>{
      const sign=l.action==='buy'?-1:1;
      return acc+sign*num(l.premium)*num(l.qty);
    },0); // positive=credit

    // For straddle/strangle-type: 2 breakevens
    const calls=valid.filter(l=>l.type==='call');
    const puts=valid.filter(l=>l.type==='put');
    if(calls.length===1&&puts.length===1) {
      const cStrike=num(calls[0].strike),pStrike=num(puts[0].strike);
      const atm=Math.max(cStrike,pStrike);
      return [
        { label:'Lower BE', price: Math.min(cStrike,pStrike)+net, dir:'below' },
        { label:'Upper BE', price: Math.max(cStrike,pStrike)-net, dir:'above' },
      ].filter(b=>b.price>0);
    }
    // For single-direction spreads
    if(calls.length===2&&puts.length===0) {
      const sorted=calls.sort((a,b)=>num(a.strike)-num(b.strike));
      const lowerStrike=num(sorted[0].strike);
      return [{ label:'Breakeven', price: lowerStrike+Math.abs(net), dir:'above' }];
    }
    if(calls.length===0&&puts.length===2) {
      const sorted=puts.sort((a,b)=>num(b.strike)-num(a.strike));
      const upperStrike=num(sorted[0].strike);
      return [{ label:'Breakeven', price: upperStrike-Math.abs(net), dir:'below' }];
    }
    return [];
  }

  const breakevens=mode==='Multi-Leg'?getBreakevens(legs):[];
  const strategy=mode==='Multi-Leg'?detectStrategy(legs):null;
  const callBE=str>0&&pr>0?str+pr:0;
  const putBE=str>0&&pr>0?str-pr:0;
  const callMovePct=sp>0&&callBE>0?((callBE-sp)/sp)*100:str>0&&callBE>0?null:null;
  const putMovePct=sp>0&&putBE>0?((sp-putBE)/sp)*100:null;

  return (
    <CalcCard title="Break-even Price (Options)" desc="Where must price be at expiry for this trade to profit?">
      <Toggle options={['Single Leg','Multi-Leg']} value={mode} onChange={setMode}/>
      {mode==='Single Leg' ? (
        <>
          <div className="rc-fields-grid">
            <Field label="Strike Price" value={strike} onChange={setStrike} prefix="₹" step={50} placeholder="e.g. 24500"/>
            <Field label="Premium Paid" value={prem} onChange={setPrem} prefix="₹" step={0.5} placeholder="e.g. 120"/>
            <Field label="Current Spot (optional)" value={spot} onChange={setSpot} prefix="₹" step={50} placeholder="e.g. 24500"/>
            <Select label="Instrument (for lot cost)" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>
          </div>

          {callBE>0 && (
            <div className="rc-be-block">
              <div className="rc-be-row">
                <div className="rc-be-side">
                  <div className="rc-be-label">Call buyer profits above</div>
                  <div className="rc-be-price" style={{color:'var(--gain)'}}>₹{callBE.toFixed(2)}</div>
                  {sp>0 && <div className="rc-be-move">Needs +{((callBE-sp)/sp*100).toFixed(2)}% move</div>}
                  <div className="rc-be-hint">You need Nifty above ₹{callBE.toFixed(0)} at expiry to profit</div>
                </div>
                <div className="rc-be-divider"/>
                <div className="rc-be-side">
                  <div className="rc-be-label">Put buyer profits below</div>
                  <div className="rc-be-price" style={{color:'var(--loss)'}}>₹{putBE.toFixed(2)}</div>
                  {sp>0 && <div className="rc-be-move">Needs -{((sp-putBE)/sp*100).toFixed(2)}% move</div>}
                  <div className="rc-be-hint">You need Nifty below ₹{putBE.toFixed(0)} at expiry to profit</div>
                </div>
              </div>
              <div className="rc-be-cost-row">
                <span>Cost per lot</span>
                <span style={{color:'var(--loss)',fontWeight:700}}>{fmtINR(pr*ls)}</span>
                <span style={{color:'var(--text3)'}}>({ls} shares × ₹{pr})</span>
              </div>
            </div>
          )}
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
                <button className="rc-leg-remove" onClick={()=>removeLeg(i)}>×</button>
              </div>
            ))}
            <button className="rc-add-leg" onClick={addLeg}>+ Add Leg</button>
          </div>

          {legs.length>0 && netPremAbs>0 && (
            <>
              {strategy && (
                <div className={`rc-suggestion-chip ${isCredit?'rc-chip-gain':'rc-chip-accent'}`}>
                  📊 Detected: {strategy}
                </div>
              )}

              <div className={`rc-net-prem-hero ${isCredit?'rc-net-credit':'rc-net-debit'}`}>
                <div className="rc-net-prem-label">{isCredit?'Net Credit Received':'Net Debit Paid'}</div>
                <div className="rc-net-prem-val">₹{netPremAbs.toFixed(2)} per unit</div>
                <div className="rc-net-prem-lot">₹{totalCost.toFixed(0)} per lot ({ls} shares)</div>
              </div>

              {breakevens.length>0 && (
                <div className="rc-be-multi">
                  {breakevens.map((b,i)=>(
                    <div key={i} className="rc-be-multi-row">
                      <span className="rc-be-multi-label">{b.label}</span>
                      <span className="rc-be-multi-price">₹{b.price.toFixed(2)}</span>
                      <span className="rc-be-multi-hint">profit if Nifty moves {b.dir} this</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
      <WhyMatters insight="Premium is not just a cost, it is a hurdle price must clear before you profit.">
        <p>The underlying does not just need to move in your direction, it needs to move past the breakeven just to not lose money.</p>
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
  const [traderMode,setTraderMode]=useState('Buyer');
  const [margin,setMargin]=useState('');

  const cap=num(capital),risk=num(rp),pr=num(prem),ls=num(lotSize),marg=num(margin);
  const maxRisk=cap*risk/100;
  const costPerLot=pr*ls;
  const maxLots=traderMode==='Buyer'
    ? (costPerLot>0?Math.floor(maxRisk/costPerLot):0)
    : (marg>0?Math.floor(cap*0.8/marg):0); // sellers: 80% of capital in margin
  const totalCost=maxLots*costPerLot;
  const unusedRisk=maxRisk-totalCost;
  const nextLotCost=(maxLots+1)*costPerLot;
  const capitalUsedPct=cap>0?(totalCost/cap)*100:0;

  return (
    <CalcCard title="Max Contracts Allowed" desc="How many lots can you take within your risk budget?">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.5}/>
        <Field label="Option Premium" value={prem} onChange={setPrem} prefix="₹" step={0.5} placeholder="e.g. 150"/>
        <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>
      </div>

      <Toggle options={['Buyer','Seller']} value={traderMode} onChange={setTraderMode}/>
      {traderMode==='Seller' && (
        <Field label="Margin Per Lot" value={margin} onChange={setMargin} prefix="₹" step={1000} placeholder="e.g. 80000"/>
      )}

      {/* Hero */}
      <div className={`rc-lots-hero ${maxLots===0?'rc-lots-hero-zero':''}`}>
        <div className="rc-lots-hero-label">You can take</div>
        <div className="rc-lots-hero-val" style={{color:maxLots>0?'var(--gain)':'var(--loss)'}}>
          {maxLots>0?`${maxLots} lot${maxLots>1?'s':''}`:costPerLot>0?'0 lots':'Enter premium'}
        </div>
        {maxLots>0&&costPerLot>0&&<div className="rc-lots-hero-sub">Total outflow: {fmtINR(totalCost)} ({capitalUsedPct.toFixed(2)}% of capital)</div>}
      </div>

      <Results>
        <Result label="Risk Budget" value={fmtINR(maxRisk)} color="loss"/>
        <Result label="Cost Per Lot" value={costPerLot>0?fmtINR(costPerLot):'-'} color="accent"/>
        {maxLots>0 && <>
          <Result label="Total Cost ({maxLots} lots)" value={fmtINR(totalCost)} color="loss" big/>
          <Result label="Unused Risk" value={unusedRisk>0?fmtINR(unusedRisk):'-'}
            color="gain" sub="budget remaining"/>
          <Result label="Capital Used" value={fmtPct(capitalUsedPct)} color="accent"/>
        </>}
        {costPerLot>0 && (
          <div className="rc-result-row" style={{background:'rgba(255,68,85,0.05)'}}>
            <span className="rc-result-label">Next lot ({maxLots+1}) cost</span>
            <span className="rc-result-val" style={{color:'var(--loss)'}}>
              {fmtINR(nextLotCost)} → exceeds budget by {fmtINR(nextLotCost-maxRisk)}
            </span>
          </div>
        )}
      </Results>

      <div className="rc-suggestion-chip rc-chip-warn" style={{marginTop:0}}>
        Worst case: {fmtINR(totalCost)} loss if {maxLots} lot{maxLots!==1?'s':''} expire worthless
      </div>

      <WhyMatters insight="Max loss = premium paid. Size so full loss stays within your risk budget.">
        <p>For option buyers, max loss is the entire premium, not a stop loss estimate. The question is: how many lots can you buy such that if this expires worthless, you stay within your risk limit?</p>
        <p>Buying 5 lots of a ₹150 Nifty call costs ₹48,750. On a ₹5L account that is 9.75% of capital on a single trade that can go to zero.</p>
      </WhyMatters>
    </CalcCard>
  );
}


// ============================================================================== Portfolio ─────────────────────────────────────────────────────────────────

function MarginUtilCalc() {
  const [capital,setCapital]=useState('500000');
  const [trades,setTrades]=useState([{name:'Nifty CE',margin:''},{name:'Bank Nifty PE',margin:''}]);
  const [newTrade,setNewTrade]=useState('');

  const cap=num(capital);
  const total=trades.reduce((a,t)=>a+num(t.margin),0);
  const pct=cap>0?(total/cap)*100:0;
  const freeCap=cap-total;
  const previewPct=newTrade?((total+num(newTrade))/cap)*100:0;
  const rating=pct>80?{text:'DANGER, forced exit risk',color:'var(--loss)'}:
               pct>60?{text:'HIGH, limit headroom',color:'var(--pre)'}:
               pct>40?{text:'MODERATE, monitor',color:'var(--accent)'}:
               {text:'HEALTHY, strong cushion',color:'var(--gain)'};
  const stressMoveNeeded=total>0?freeCap/total*100:Infinity;
  const stressLevel=stressMoveNeeded<10?'HIGH':stressMoveNeeded<25?'MEDIUM':'LOW';
  const stressColor=stressMoveNeeded<10?'var(--loss)':stressMoveNeeded<25?'var(--pre)':'var(--gain)';

  return (
    <CalcCard title="Margin Utilization" desc="High utilization = forced exit risk, not loss risk">
      <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      <div className="rc-leg-list">
        {trades.map((t,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} placeholder="Position name" value={t.name}
              onChange={e=>setTrades(tr=>tr.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="rc-mini-input" placeholder="Margin ₹" type="number" value={t.margin}
              onChange={e=>setTrades(tr=>tr.map((x,j)=>j===i?{...x,margin:e.target.value}:x))}/>
            {trades.length>1 && <button className="rc-leg-remove" onClick={()=>setTrades(tr=>tr.filter((_,j)=>j!==i))}>×</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setTrades(t=>[...t,{name:'',margin:''}])}>+ Add Position</button>
      </div>

      {/* Hero */}
      <div className="rc-util-hero">
        <div className="rc-util-pct" style={{color:rating.color}}>{pct.toFixed(1)}%</div>
        <div className="rc-util-label">margin utilization</div>
        <div className="rc-util-rating" style={{color:rating.color}}>{rating.text}</div>
        <div className="rc-util-sub">Safe threshold: under 50%</div>
      </div>

      <Results>
        <Result label="Margin Blocked" value={fmtINR(total)} color="loss"/>
        <Result label="Free Capital (buffer)" value={fmtINR(freeCap)} color="gain" big/>
        <Result label="Margin call risk on 10% move" value={stressLevel} color={stressMoveNeeded<10?'loss':stressMoveNeeded<25?'warn':'gain'}/>
      </Results>

      {/* Preview new trade */}
      <div className="rc-preview-row">
        <input className="rc-mini-input" style={{flex:1}} type="number" placeholder="Add new trade margin (₹)"
          value={newTrade} onChange={e=>setNewTrade(e.target.value)}/>
        {newTrade && <span className="rc-preview-val" style={{color:previewPct>60?'var(--loss)':'var(--accent)'}}>
          → {previewPct.toFixed(1)}%
        </span>}
      </div>

      <WhyMatters insight="High utilization means broker can force-close your positions at the worst moment.">
        <p>Margin utilization measures how much of your capital is locked as collateral. At 80%+, a sharp adverse move can trigger a margin call, your broker squares off positions automatically, often at the worst price.</p>
        <p>Most professionals keep utilization under 50-60%. This leaves room to hold through volatility without being forced out by mechanics.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function PortfolioRiskCalc() {
  const [capital,setCapital]=useState('500000');
  const [positions,setPositions]=useState([
    {name:'Nifty CE',risk:''},{name:'Bank Nifty PE',risk:''},
  ]);

  const cap=num(capital);
  const total=positions.reduce((a,p)=>a+num(p.risk),0);
  const pct=cap>0?(total/cap)*100:0;
  const perTrade=positions.length>0?pct/positions.length:0;
  const maxSafe=cap>0?Math.floor(cap*0.03/Math.max(total/Math.max(positions.length,1),1)):0;
  const streak3=total*3;
  const verdict=pct>8?{text:'Over-risked, reduce exposure now',color:'var(--loss)'}:
                pct>5?{text:'Aggressive, monitor closely',color:'var(--pre)'}:
                pct>3?{text:'Moderate, acceptable',color:'var(--accent)'}:
                {text:'Safe, well within limits',color:'var(--gain)'};

  return (
    <CalcCard title="Portfolio Capital at Risk" desc="Total rupee exposure across all open trades">
      <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      <div className="rc-leg-list" style={{marginTop:10}}>
        {positions.map((p,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} placeholder="e.g. Nifty CE" value={p.name}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            <input className="rc-mini-input" placeholder="Risk ₹" type="number" value={p.risk}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,risk:e.target.value}:x))}/>
            {positions.length>1 && <button className="rc-leg-remove" onClick={()=>setPositions(ps=>ps.filter((_,j)=>j!==i))}>×</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setPositions(p=>[...p,{name:'',risk:''}])}>+ Add Position</button>
      </div>

      {/* Hero */}
      <div className="rc-port-hero" style={{borderColor: pct>5?'rgba(255,68,85,0.3)':'rgba(0,200,150,0.3)'}}>
        <div className="rc-port-val" style={{color:pct>5?'var(--loss)':pct>3?'var(--pre)':'var(--gain)'}}>
          {fmtINR(total)} at risk ({fmtPct(pct)})
        </div>
        <div className="rc-port-verdict" style={{color:verdict.color}}>{verdict.text}</div>
      </div>

      <Results>
        <Result label="Per trade avg risk" value={fmtPct(perTrade)} color="accent"/>
        <Result label="3-loss streak impact" value={`${fmtINR(streak3)} (${fmtPct(streak3/cap*100)})`} color="loss"/>
        <Result label="Capital safe" value={fmtINR(cap-total)} color="gain"/>
      </Results>

      {pct>3 && (
        <div className="rc-suggestion-chip rc-chip-warn">
          At {fmtPct(perTrade)} per trade → max {Math.floor(3/perTrade)} trades safe at this size
        </div>
      )}

      <WhyMatters insight="Even 1% per trade becomes 8% total with 8 open positions, all correlated.">
        <p>Even if each trade risks 1%, having 8 open positions means 8% of capital is at risk simultaneously. In a market-wide move, all positions get hit at once.</p>
        <p>Keep total portfolio risk under 5%. A 3% rule means never more than 3 trades open at once at 1% risk each.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function DrawdownCalc() {
  const [capital,setCapital]=useState('500000');
  const [dd,setDd]=useState('20');
  const [rp,setRp]=useState('2');

  const cap=num(capital),d=num(dd),r=num(rp);
  const remaining=cap*(1-d/100);
  const loss=cap-remaining;
  const recovery=d<100?(d/(100-d))*100:Infinity;
  const tradesNeeded=r>0?Math.ceil(recovery/r):0;
  const zone=d>=30?{text:'Very hard recovery, treat as red line',color:'var(--loss)'}:
             d>=20?{text:'Serious drawdown, act now',color:'var(--pre)'}:
             d>=10?{text:'Manageable, but address quickly',color:'var(--accent)'}:
             {text:'Recoverable, stay disciplined',color:'var(--gain)'};

  // Table for visual curve data
  const points=[5,10,15,20,25,30,40,50].map(v=>({dd:v,rec:(v/(100-v))*100}));

  return (
    <CalcCard title="Drawdown Impact Calculator" desc="How much do you need to earn back after a loss?">
      <div className="rc-fields-grid">
        <Field label="Starting Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.5}/>
      </div>
      <div className="rc-dd-slider-row">
        <label className="rc-label">Drawdown: <strong style={{color:'var(--loss)'}}>{dd}%</strong></label>
        <input type="range" min={1} max={80} value={dd} onChange={e=>setDd(e.target.value)} className="rc-dd-slider"/>
      </div>

      {/* Hero */}
      <div className="rc-dd-hero" style={{borderColor:d>=30?'rgba(255,68,85,0.3)':d>=20?'rgba(245,158,11,0.3)':'rgba(74,158,255,0.3)'}}>
        <div className="rc-dd-hero-label">You need this gain to recover</div>
        <div className="rc-dd-hero-val" style={{color:d>=30?'var(--loss)':d>=20?'var(--pre)':'var(--accent)'}}>
          {isFinite(recovery)?fmtPct(recovery):'Impossible'}
        </div>
        <div className="rc-dd-hero-sub">
          You lost {fmtINR(loss)} → need {fmtINR(loss + remaining * recovery/100)} total gains
        </div>
        <div className="rc-dd-zone" style={{color:zone.color}}>{zone.text}</div>
      </div>

      <Results>
        <Result label="Capital Remaining" value={fmtINR(remaining)} color={d>50?'loss':'gain'}/>
        <Result label="Recovery Required" value={isFinite(recovery)?fmtPct(recovery):'Infinity'} color="warn" big/>
        <Result label={`Winning trades needed (at ${rp}%)`} value={tradesNeeded>0?`~${tradesNeeded} wins`:'-'} color="accent"/>
      </Results>

      {/* Mini recovery curve */}
      <div className="rc-dd-table-title">Drawdown vs recovery required</div>
      <div className="rc-mini-table">
        <div className="rc-mini-thead"><span>Drawdown</span><span>Recovery needed</span><span>Difficulty</span></div>
        {points.map(p=>(
          <div key={p.dd} className={`rc-mini-trow ${Math.abs(p.dd-d)<3?'rc-mini-trow-active':''}`}>
            <span style={{color:p.dd>=30?'var(--loss)':p.dd>=20?'var(--pre)':'var(--text)'}}>{p.dd}%</span>
            <span style={{color:p.dd>=30?'var(--loss)':'var(--text)'}}>{p.rec.toFixed(1)}%</span>
            <span style={{fontSize:11,color:'var(--text3)'}}>{p.dd>=30?'Very hard':p.dd>=20?'Hard':p.dd>=10?'Manageable':'Easy'}</span>
          </div>
        ))}
      </div>

      <WhyMatters insight="Avoid drawdowns above 20%, recovery becomes exponential, not linear.">
        <p>A 33% drawdown requires a 50% gain. A 50% drawdown requires a 100% gain. The math is not symmetric, losses compound faster than wins.</p>
        <p>Set your max drawdown as a hard rule before you start trading. Many professionals stop trading at 15-20% drawdown and review their system.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function LossStreakCalc() {
  const [capital,setCapital]=useState('500000');
  const [rp,setRp]=useState('1');
  const [floor,setFloor]=useState('200000');
  const [tradesPerDay,setTradesPerDay]=useState('2');

  const cap=num(capital),rf=num(rp)/100,fl=num(floor),tpd=num(tradesPerDay);
  const k=rf>0&&rf<1?Math.floor(Math.log(fl/cap)/Math.log(1-rf)):0;
  const after=n=>cap*Math.pow(1-rf,n);
  const daysToFloor=tpd>0?Math.ceil(k/tpd):0;
  // Simplified table: 5, 10, 20, max only
  const tableRows=[5,10,20,k>0?k:50].filter((v,i,a)=>v>0&&a.indexOf(v)===i).sort((a,b)=>a-b).slice(0,4);
  const safeMsg=k>=50?'Mathematically strong':k>=20?'Reasonable resilience':k>=10?'Acceptable, tighten sizing':' Fragile, reduce risk';
  const safeColor=k>=50?'var(--gain)':k>=20?'var(--accent)':k>=10?'var(--pre)':'var(--loss)';

  return (
    <CalcCard title="Loss Streak Survival" desc="Can your account survive a bad run?">
      <div className="rc-fields-grid">
        <Field label="Starting Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Min Capital Floor" value={floor} onChange={setFloor} prefix="₹" step={10000} placeholder="Stop-trading level"/>
        <Field label="Trades Per Day" value={tradesPerDay} onChange={setTradesPerDay} step={1}/>
      </div>

      {/* Hero */}
      <div className="rc-streak-hero">
        <div className="rc-streak-val" style={{color:safeColor}}>{k>0?k:','}</div>
        <div className="rc-streak-label">consecutive losses you can survive</div>
        <div className="rc-streak-verdict" style={{color:safeColor}}>{safeMsg}</div>
        {tpd>0&&k>0&&<div className="rc-streak-sub">At {tpd} trades/day → {daysToFloor} days of losing streak</div>}
      </div>

      <div className="rc-mini-table">
        <div className="rc-mini-thead"><span>After N losses</span><span>Capital left</span><span>Drawdown</span></div>
        {tableRows.map(n=>{
          const rem=after(n),pct=(rem/cap)*100,dd=100-pct;
          const isMax=n===k;
          return (
            <div key={n} className={`rc-mini-trow ${isMax?'rc-mini-trow-danger':''}`}
              style={isMax?{background:'rgba(255,68,85,0.08)',borderLeft:'3px solid var(--loss)'}:{}}>
              <span style={{fontWeight:isMax?700:400}}>{n}{isMax?' ⚠ floor':''}</span>
              <span style={{color:pct<50?'var(--loss)':'var(--text)'}}>{fmtINR(rem)}</span>
              <span style={{color:dd>40?'var(--loss)':dd>25?'var(--pre)':'var(--gain)'}}>{dd.toFixed(1)}% down</span>
            </div>
          );
        })}
      </div>

      {num(rp)>1 && (
        <div className="rc-suggestion-chip rc-chip-accent">
          At 0.5% risk → {Math.floor(Math.log(num(floor)/num(capital))/Math.log(1-0.005))}+ losses survivable
        </div>
      )}

      <WhyMatters insight="At 1% risk, 10 consecutive losses leaves 90% of capital intact.">
        <p>Every system has losing streaks. A 50% win rate system statistically produces 10+ consecutive losses in any given year. The question is whether your account can survive them.</p>
        <p>At 1% risk, a 10-loss streak leaves 90.4% of capital. At 5%, the same streak leaves 59.9%.</p>
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
  const rorAt2=edge>0&&base<1?Math.min(Math.pow(base,50)*100,100):100; // at 2% risk = 50 units

  const viable=edge>0;
  const viableColor=viable?'var(--gain)':'var(--loss)';
  const rorColor=ror<1?'var(--gain)':ror<10?'var(--accent)':ror<30?'var(--pre)':'var(--loss)';

  // Probability bar: 0-100% mapped to green-red
  const barPct=Math.min(ror,100);

  return (
    <CalcCard title="Risk of Ruin" desc="Probability your account eventually hits zero">
      <div className="rc-fields-grid">
        <Field label="Win Rate" value={wr} onChange={setWr} suffix="%" step={1}/>
        <Field label="Avg R:R (reward per unit)" value={rr} onChange={setRr} step={0.1}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="Risk Units in Account" value={units} onChange={setUnits} step={10} note="= 100 / risk%"/>
      </div>

      {/* Hero: system verdict */}
      <div className="rc-ruin-hero" style={{borderColor: viable?'rgba(0,200,150,0.3)':'rgba(255,68,85,0.3)'}}>
        <div className="rc-ruin-verdict" style={{color:viableColor}}>
          System {viable?'VIABLE':'NOT VIABLE'}: {viable?'positive edge':'negative edge'}
        </div>
        <div className="rc-ruin-edge">You earn {fmtPct(Math.abs(edge*100))} per trade on average ({edge>0?'profit':'loss'})</div>
      </div>

      {/* Probability bar */}
      <div className="rc-ror-bar-wrap">
        <div className="rc-ror-bar-label">
          <span>Ruin probability</span>
          <span style={{color:rorColor,fontWeight:700}}>{ror<0.1?'Near 0%':fmtPct(ror)}</span>
        </div>
        <div className="rc-ror-bar-track">
          <div className="rc-ror-bar-fill" style={{
            width:`${barPct}%`,
            background: ror<10?'var(--gain)':ror<30?'var(--pre)':'var(--loss)'
          }}/>
        </div>
        {ror<1&&<div style={{fontSize:11,color:'var(--text3)'}}>Near zero, not truly impossible. Good sizing is still required.</div>}
      </div>

      <Results>
        <Result label="Edge Per Trade" value={fmtPct(edge*100)} color={edge>0?'gain':'loss'} big/>
        <Result label="Risk of Ruin (current sizing)" value={ror<0.1?'< 0.1%':fmtPct(ror)} color={rorColor}/>
        {riskF<2&&<Result label="Risk of Ruin at 2% sizing" value={rorAt2<0.1?'< 0.1%':fmtPct(rorAt2)} color={rorAt2>ror?'warn':'accent'}/>}
      </Results>

      <div className="rc-suggestion-chip rc-chip-warn" style={{marginTop:0}}>
        Good system + bad sizing = ruin. Edge without discipline fails.
      </div>

      <WhyMatters insight="Even a profitable system goes bust with aggressive sizing.">
        <p>Risk of Ruin is the probability your account eventually hits zero. A negative-edge system will always reach 0%. The only question is when.</p>
        <p>Even with positive edge, too much risk per trade pushes ruin probability toward 100%.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function WinRateCalc() {
  const [rr,setRr]=useState('2');
  const r=num(rr);
  const minWin=r>0?(1/(1+r))*100:100;
  const winsIn=Math.round(100/minWin);
  const reverseRR=0.5; // at 50% winrate, min R:R needed
  const minRR50=(1/0.5)-1; // = 1.0

  const ease=minWin<35?{text:'Easy, very achievable system',color:'var(--gain)'}:
             minWin<45?{text:'Reasonable, most traders can do this',color:'var(--accent)'}:
             minWin<55?{text:'Difficult, requires strong setup quality',color:'var(--pre)'}:
             {text:'Very hard, reconsider your R:R',color:'var(--loss)'};

  // Focused table: ±2 around current R:R
  const allRRs=[0.5,1,1.5,2,2.5,3,4,5];
  const nearby=allRRs.filter(v=>Math.abs(v-r)<=1.5||v===r).slice(0,6);

  return (
    <CalcCard title="Win Rate Required" desc="At your R:R, how often must you win?">
      <Field label="Your R:R Ratio (reward : risk)" value={rr} onChange={setRr} step={0.1} placeholder="e.g. 2 for 2:1"/>

      {/* Hero */}
      <div className="rc-winrate-hero">
        <div className="rc-winrate-val" style={{color:minWin<40?'var(--gain)':minWin<50?'var(--accent)':'var(--pre)'}}>
          {minWin.toFixed(1)}%
        </div>
        <div className="rc-winrate-label">minimum win rate to break even</div>
        <div className="rc-winrate-trade">Win {Math.ceil(minWin)} out of 100 trades</div>
        <div className="rc-winrate-ease" style={{color:ease.color}}>{ease.text}</div>
      </div>

      <div className="rc-suggestion-chip rc-chip-accent">
        Most traders chase 70%+ win rate unnecessarily, R:R matters more
      </div>

      <div className="rc-mini-table" style={{marginTop:8}}>
        <div className="rc-mini-thead"><span>R:R</span><span>Min Win Rate</span><span>Verdict</span></div>
        {nearby.map(row=>{
          const mw=(1/(1+row))*100;
          const isActive=Math.abs(row-r)<0.01;
          return (
            <div key={row} className={`rc-mini-trow ${isActive?'rc-mini-trow-active':''}`}>
              <span style={{fontWeight:isActive?700:400}}>1:{row}{isActive?' ◀':''}</span>
              <span style={{color:mw<40?'var(--gain)':mw>55?'var(--loss)':'var(--text)',fontWeight:isActive?700:400}}>{mw.toFixed(1)}%</span>
              <span style={{fontSize:11,color:'var(--text3)'}}>{mw<35?'Easy':mw<45?'Good':mw<55?'Hard':'Very hard'}</span>
            </div>
          );
        })}
      </div>

      <WhyMatters insight="A 70% win rate with poor R:R loses money. R:R is the foundation.">
        <p>A 70% win rate with 0.5:1 R:R is a losing system. You would need to win 67 out of 100 just to break even. Build around R:R first. Win rate follows from good setups, not the reverse.</p>
        <p>At 50% win rate, you need at least 1:1 R:R to break even. Most scalpers with 70%+ win rates are running 0.5:1 R:R and losing money slowly.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function ExpectancyCalc() {
  const [wr,setWr]=useState('50');
  const [aw,setAw]=useState('');
  const [al,setAl]=useState('');
  const [tr,setTr]=useState('20');

  const w=num(wr)/100,avgW=num(aw),avgL=num(al),trades=num(tr);
  const exp=w*avgW-(1-w)*avgL;
  const total=exp*trades;
  const monthly=exp*20; // ~20 trades/month assumption
  const isPos=exp>0;

  return (
    <CalcCard title="Expectancy Calculator" desc="Average profit per trade, the true measure of any system">
      <div className="rc-fields-grid">
        <Field label="Win Rate" value={wr} onChange={setWr} suffix="%" step={1}/>
        <Field label="Avg Win (₹)" value={aw} onChange={setAw} prefix="₹" step={100} placeholder="e.g. 2000"/>
        <Field label="Avg Loss (₹)" value={al} onChange={setAl} prefix="₹" step={100} placeholder="e.g. 1000"/>
        <Field label="Trades per month" value={tr} onChange={setTr} step={5}/>
      </div>

      {aw&&al&&(
        <>
          {/* Hero */}
          <div className={`rc-exp-hero ${isPos?'rc-exp-pos':'rc-exp-neg'}`}>
            <div className="rc-exp-hero-label">You earn per trade</div>
            <div className="rc-exp-hero-val" style={{color:isPos?'var(--gain)':'var(--loss)'}}>
              {isPos?'+':''}{fmtINR(exp)}
            </div>
            <div className="rc-exp-hero-sub">
              {isPos?'Profitable system':'Losing system, fix R:R or win rate'}
            </div>
          </div>

          {/* Win vs loss breakdown */}
          <div className="rc-exp-breakdown">
            <div className="rc-exp-side">
              <div style={{color:'var(--gain)',fontWeight:700}}>{fmtPct(num(wr))}</div>
              <div>Win {fmtINR(avgW)}</div>
              <div style={{color:'var(--text3)',fontSize:11}}>= {fmtINR(w*avgW)} avg</div>
            </div>
            <div className="rc-exp-vs">vs</div>
            <div className="rc-exp-side">
              <div style={{color:'var(--loss)',fontWeight:700}}>{fmtPct(100-num(wr))}</div>
              <div>Lose {fmtINR(avgL)}</div>
              <div style={{color:'var(--text3)',fontSize:11}}>= {fmtINR((1-w)*avgL)} avg</div>
            </div>
          </div>

          <Results warning={!isPos?'This system loses money over time, positive expectancy is the minimum bar':null}>
            <Result label="Expectancy per trade" value={`${isPos?'+':''}${fmtINR(exp)}`} color={isPos?'gain':'loss'} big/>
            <Result label={`Monthly (${tr} trades)`} value={`${isPos?'+':''}${fmtINR(total)}`} color={isPos?'gain':'loss'}/>
            <Result label="Implied R:R" value={avgL>0?`1:${(avgW/avgL).toFixed(2)}`:'-'} color="accent"/>
          </Results>

          <div className="rc-suggestion-chip rc-chip-accent">
            Positive expectancy = long-term profit. You can still lose 5 in a row.
          </div>
        </>
      )}

      <WhyMatters insight="You earn ₹X per trade on average, even losing runs can't change that long term.">
        <p>Expectancy tells you whether your system makes money. A +₹300 expectancy means each trade adds ₹300 on average over time, regardless of individual outcomes.</p>
        <p>Your goal is not to win every trade. It is to have positive expectancy and take enough trades to let the math work.</p>
      </WhyMatters>
    </CalcCard>
  );
}

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
  const atrPct=pr>0&&at>0?(at/pr)*100:0;
  const stopAmt=volStop;
  const isHighVol=atrPct>3;

  return (
    <CalcCard title="Volatility-Based Sizing (ATR)" desc="Market is volatile → reduce size, not widen stop">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Risk Per Trade" value={rp} onChange={setRp} suffix="%" step={0.1}/>
        <Field label="ATR Value" value={atr} onChange={setAtr} prefix="₹" step={0.5} placeholder="e.g. 120"/>
        <Field label="ATR Multiplier" value={mult} onChange={setMult} step={0.5} note="SL = ATR × mult"/>
        <Field label="Current Price" value={price} onChange={setPrice} prefix="₹" step={0.5} placeholder="e.g. 24500"/>
      </div>
      <Toggle options={['Equity','F&O Lots']} value={mode} onChange={setMode}/>
      {mode==='F&O Lots' && <Select label="Instrument" value={lotSize} onChange={setLotSize} options={LOT_SIZES}/>}

      {/* Hero */}
      {(qty>0||lots>0) && (
        <div className="rc-atr-hero">
          <div className="rc-atr-hero-label">Maximum position size</div>
          <div className="rc-atr-hero-val" style={{color:qty>0?'var(--gain)':'var(--loss)'}}>
            {mode==='F&O Lots'?`${lots} lot${lots!==1?'s':''} (${lots*ls} shares)`:`${qty} shares`}
          </div>
          {atrPct>0&&<div className="rc-atr-hero-sub">ATR = {atrPct.toFixed(1)}% move daily</div>}
        </div>
      )}

      <Results warning={capUsed>cap*0.5&&qty>0&&pr>0?'Position uses over 50% of capital, consider reducing':null}>
        <Result label={`Volatility SL (ATR × ${mult})`} value={volStop>0?`₹${volStop.toFixed(2)} per share`:'-'} color="accent"/>
        <Result label="Max Risk Budget" value={fmtINR(maxRisk)} color="loss"/>
        {mode==='F&O Lots'
          ? <Result label="Max Lots" value={lots>0?`${lots} lots (${lots*ls} shares)`:'-'} color="gain" big/>
          : <Result label="Max Quantity" value={qty>0?`${qty} shares`:'-'} color="gain" big/>}
        {pr>0&&qty>0 && <Result label="Capital Deployed" value={fmtINR(capUsed)} sub={`${((capUsed/cap)*100).toFixed(1)}% of capital`} color={capUsed>cap*0.5?'warn':'accent'}/>}
      </Results>

      {isHighVol && (
        <div className="rc-suggestion-chip rc-chip-warn">
          High ATR ({atrPct.toFixed(1)}%/day) → position inefficient. Consider skipping.
        </div>
      )}

      <WhyMatters insight="High volatility means fewer shares, same risk, smaller position.">
        <p>A fixed 200-point stop on Nifty means very different things when ATR is 80 vs 300. Volatility-based sizing lets the market tell you where the stop goes, then you size down to fit the risk.</p>
        <p>During high-volatility events like elections or RBI announcements, ATR expands and your position size should shrink. Same risk, fewer lots.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function CapitalAllocationCalc() {
  const [capital,setCapital]=useState('500000');
  const [mode,setMode]=useState('Equal');
  const [positions,setPositions]=useState([
    {name:'Nifty CE',weight:'25',risk:'1'},{name:'Bank Nifty PE',weight:'25',risk:'1'},
    {name:'Stock trade',weight:'25',risk:'1'},{name:'',weight:'25',risk:'1'},
  ]);

  const cap=num(capital),n=positions.length;
  const tw=positions.reduce((a,p)=>a+num(p.weight),0);
  const alloc=p=>{
    if(mode==='Equal') return cap/n;
    if(mode==='By Risk %') return cap*(num(p.risk)/100);
    return tw>0?cap*(num(p.weight)/tw):0;
  };
  const totalAlloc=positions.reduce((acc,p)=>acc+alloc(p),0);
  const unalloc=cap-totalAlloc;
  const isOver=totalAlloc>cap*1.01;

  return (
    <CalcCard title="Capital Allocation" desc="Capital split ≠ risk split, know both">
      <Field label="Total Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
      <Toggle options={['Equal','By Risk %','Custom %']} value={mode} onChange={setMode}/>
      <div className="rc-leg-list">
        {positions.map((p,i)=>(
          <div key={i} className="rc-leg-row">
            <input className="rc-mini-input" style={{flex:1}} value={p.name} placeholder={`Trade ${i+1}`}
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/>
            {mode==='By Risk %' && <input className="rc-mini-input" type="number" value={p.risk} placeholder="Risk%"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,risk:e.target.value}:x))} style={{width:54}}/>}
            {mode==='Custom %' && <input className="rc-mini-input" type="number" value={p.weight} placeholder="Wt%"
              onChange={e=>setPositions(ps=>ps.map((x,j)=>j===i?{...x,weight:e.target.value}:x))} style={{width:54}}/>}
            <span className="rc-alloc-val">{fmtINR(alloc(p))}</span>
            {positions.length>1 && <button className="rc-leg-remove" onClick={()=>setPositions(ps=>ps.filter((_,j)=>j!==i))}>×</button>}
          </div>
        ))}
        <button className="rc-add-leg" onClick={()=>setPositions(p=>[...p,{name:'',weight:'25',risk:'1'}])}>+ Add Trade</button>
      </div>
      <Results warning={isOver?'Over-allocating capital, total exceeds 100%':null}>
        <Result label="Total Allocated" value={fmtINR(totalAlloc)} color={isOver?'loss':'accent'} big/>
        <Result label="Unallocated" value={unalloc>=0?fmtINR(unalloc):'Over by '+fmtINR(-unalloc)} color={unalloc>=0?'gain':'loss'}/>
      </Results>
      <div className="rc-suggestion-chip rc-chip-warn">
        4 Nifty trades ≠ diversification. Correlation = concentrated risk.
      </div>
      <WhyMatters insight="Capital split is not risk split, you need to know both.">
        <p>"I have ₹5L to trade" is not a plan. "I am allocating ₹1.25L to 4 non-correlated setups with max 1% risk each" is a plan.</p>
        <p>Always check whether your trades are correlated. 4 Nifty-linked positions move together, that is not diversification, it is concentration with extra steps.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function GapRiskCalc() {
  const [entry,setEntry]=useState('');
  const [sl,setSl]=useState('');
  const [gapPct,setGapPct]=useState('3');
  const [qty,setQty]=useState('');
  const [dir,setDir]=useState('Long');

  const ent=num(entry),stop=num(sl),gap=num(gapPct),q=num(qty);
  const slPct=ent>0&&stop>0?Math.abs(ent-stop)/ent*100:0;
  const badSL=ent>0&&stop>0&&slPct>15;
  const gapExit=dir==='Long'?ent*(1-gap/100):ent*(1+gap/100);
  const slLoss=Math.abs(ent-stop)*q;
  const gapLoss=Math.abs(ent-gapExit)*q;
  const slippage=gapLoss-slLoss;
  const gapMult=slLoss>0?gapLoss/slLoss:0;
  const gapMove=ent>0?ent*gap/100:0;
  const safeQty=gapLoss>0&&q>0?Math.floor(q*10000/gapLoss):0; // qty to cap gap loss at 10k

  return (
    <CalcCard title="Gap Risk Calculator" desc="Your stop loss can fail overnight, this shows what really happens">
      <DirToggle value={dir} onChange={setDir}/>
      <div className="rc-fields-grid">
        <Field label="Entry Price" value={entry} onChange={setEntry} prefix="₹" step={0.05} placeholder="e.g. 24500"/>
        <Field label="Stop Loss Price" value={sl} onChange={setSl} prefix="₹" step={0.05} placeholder="e.g. 24300"/>
        <Field label="Gap Size" value={gapPct} onChange={setGapPct} suffix="%" step={0.5} placeholder="e.g. 3"/>
        <Field label="Quantity" value={qty} onChange={setQty} step={1} placeholder="e.g. 50"/>
      </div>

      {badSL && (
        <div className="rc-suggestion-chip rc-chip-warn">⚠ SL is {slPct.toFixed(1)}% from entry, check inputs</div>
      )}

      {gapLoss>0 && (
        <div className="rc-gap-hero">
          <div className="rc-gap-hero-label">Actual gap loss (stop fails)</div>
          <div className="rc-gap-hero-val" style={{color:'var(--loss)'}}>{fmtINR(gapLoss)}</div>
          {gapMult>1&&<div className="rc-gap-hero-mult">{gapMult.toFixed(1)}× your planned SL loss of {fmtINR(slLoss)}</div>}
          {gapMove>0&&<div className="rc-gap-hero-sub">{gap}% gap = ₹{gapMove.toFixed(0)} move against you</div>}
        </div>
      )}

      <Results>
        <Result label="Planned SL Loss" value={slLoss>0?fmtINR(slLoss):'-'} color="accent"/>
        <Result label="Actual Gap Loss" value={gapLoss>0?fmtINR(gapLoss):'-'} color="loss" big/>
        <Result label="Extra slippage vs plan" value={slippage>0?fmtINR(slippage):'-'} color="warn"
          sub={gapMult>0?`${gapMult.toFixed(1)}× planned risk`:''}/>
      </Results>

      {q>0&&gapLoss>10000&&(
        <div className="rc-suggestion-chip rc-chip-accent">
          To cap gap loss at ₹10,000 → reduce qty to {Math.floor(10000/gapLoss*q)} shares
        </div>
      )}

      <div className="rc-suggestion-chip rc-chip-warn">
        Overnight positions: results, RBI, global events can gap 3–8%
      </div>

      <WhyMatters insight="Stop losses do not protect overnight positions. Size for worst-case gaps.">
        <p>If Nifty closes at 24,500 and opens next day at 24,200, your SL at 24,300 is never triggered, you exit at 24,200. The SL did not fail; it simply was not there when the market opened.</p>
        <p>Size overnight positions at 30-50% of normal. The gap risk is the position risk, not the SL distance.</p>
      </WhyMatters>
    </CalcCard>
  );
}

function LeverageRiskCalc() {
  const [capital,setCapital]=useState('500000');
  const [posSize,setPosSize]=useState('');
  const [margin,setMargin]=useState('');

  const cap=num(capital),pos=num(posSize),marg=num(margin);
  const leverage=marg>0?pos/marg:pos>0?pos/cap:0;
  const marginPct=cap>0?(marg>0?marg/cap:pos/cap)*100:0;
  const wipeoutPct=leverage>0?100/leverage:0;
  const pnlOn10pct=pos*0.10;
  const riskClass=leverage>10?{text:'EXTREME, danger zone',color:'var(--loss)'}:
                  leverage>5?{text:'HIGH, reduce immediately',color:'var(--loss)'}:
                  leverage>3?{text:'AGGRESSIVE, monitor closely',color:'var(--pre)'}:
                  leverage>1?{text:'MODERATE, acceptable',color:'var(--accent)'}:
                  {text:'SAFE, well managed',color:'var(--gain)'};
  const commonMove5=wipeoutPct>0&&wipeoutPct<5;

  return (
    <CalcCard title="Leverage Risk Calculator" desc="Leverage decides survival, not accuracy">
      <div className="rc-fields-grid">
        <Field label="Account Capital" value={capital} onChange={setCapital} prefix="₹" step={10000}/>
        <Field label="Total Position Size" value={posSize} onChange={setPosSize} prefix="₹" step={10000} placeholder="e.g. 1500000"/>
        <Field label="Margin Used" value={margin} onChange={setMargin} prefix="₹" step={1000} placeholder="Actual margin blocked"/>
      </div>

      {/* Hero: wipeout move */}
      {leverage>0 && (
        <div className="rc-lev-hero" style={{borderColor: leverage>5?'rgba(255,68,85,0.3)':'rgba(74,158,255,0.3)'}}>
          <div className="rc-lev-hero-label">Move to wipe your account</div>
          <div className="rc-lev-hero-val" style={{color:commonMove5?'var(--loss)':leverage>3?'var(--pre)':'var(--gain)'}}>
            {fmtPct(wipeoutPct)}
          </div>
          {commonMove5 && <div className="rc-lev-hero-warn">A 5% Nifty move happens regularly, you are at risk</div>}
          {!commonMove5 && <div className="rc-lev-hero-sub">A {fmtPct(wipeoutPct)} move would zero your account</div>}
        </div>
      )}

      <Results>
        <Result label="Effective Leverage" value={leverage>0?`${leverage.toFixed(1)}x`:'-'} color={leverage>5?'loss':leverage>3?'warn':'gain'} big/>
        <Result label="Classification" value={riskClass.text} color={leverage>5?'loss':leverage>3?'warn':leverage>1?'accent':'gain'}/>
        <Result label="10% move P&L impact" value={pos>0?`±${fmtINR(pnlOn10pct)}`:'-'} color="accent"/>
        <Result label="Benchmark: pro traders" value="Stay under 3x" color="accent"/>
      </Results>

      <div className="rc-leverage-legend">
        {[
          {label:'Safe',range:'<3x',color:'var(--gain)'},
          {label:'Moderate',range:'3-5x',color:'var(--accent)'},
          {label:'Aggressive',range:'5-10x',color:'var(--pre)'},
          {label:'Extreme',range:'10x+',color:'var(--loss)'},
        ].map(l=>(
          <div key={l.label} className="rc-leverage-chip"
            style={{borderColor:l.color,background:leverage>0&&((l.label==='Safe'&&leverage<=3)||(l.label==='Moderate'&&leverage>3&&leverage<=5)||(l.label==='Aggressive'&&leverage>5&&leverage<=10)||(l.label==='Extreme'&&leverage>10))?`rgba(0,0,0,0.2)`:undefined}}>
            <span style={{color:l.color,fontWeight:700}}>{l.label}</span>
            <span className="rc-leverage-range">{l.range}</span>
          </div>
        ))}
      </div>

      <WhyMatters insight="Leverage decides survival. A 10% move at 10x = 100% loss.">
        <p>Most retail F&O traders are at 5-15x leverage without realising it. The "move to wipe out" number is the most important metric, if Nifty regularly moves 5%, and your wipeout is at 5%, you have no safety margin.</p>
        <p>Professional traders rarely go above 3x. Not because they lack capital, but because position survival matters more than maximising exposure.</p>
      </WhyMatters>
    </CalcCard>
  );
}


// ==============================================================================
// GLOSSARY
// ==============================================================================

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
    { term:'Kelly Criterion',   def:'Formula for optimal bet sizing: f = W (1-W)/R where W = win rate and R = win/loss ratio. Most traders use half-Kelly to reduce variance. Full Kelly is mathematically optimal but psychologically brutal.' },
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

// ==============================================================================
// TABS CONFIG
// ==============================================================================

const TABS = [
  { id:'trade',    label:'Trade Risk',   count:4, calcs:[PositionSizeCalc,MaxLossCalc,SLDistanceCalc,RRCalc] },
  { id:'options',  label:'Options',      count:2, calcs:[BreakevenCalc,MaxContractsCalc] },
  { id:'portfolio',label:'Portfolio',    count:3, calcs:[MarginUtilCalc,PortfolioRiskCalc,DrawdownCalc] },
  { id:'system',   label:'System Stats', count:4, calcs:[LossStreakCalc,RiskOfRuinCalc,WinRateCalc,ExpectancyCalc] },
  { id:'sizing',   label:'Sizing',       count:2, calcs:[VolatilityPositionCalc,CapitalAllocationCalc] },
  { id:'advanced', label:'Advanced',     count:2, calcs:[GapRiskCalc,LeverageRiskCalc] },
];

// ==============================================================================
// STICKY PAGE NAV
// ==============================================================================

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

// ==============================================================================
// MAIN PAGE
// ==============================================================================

export default function RiskCalcPage({ initialTab = null, navigateSub = null }) {
  const [shared, setShared] = useState({});
  const [activeTab,   setActiveTab]   = useState('trade');
  const CALC_SECTION_PATHS = { start:'/calc', calculators:'/calc/calculators', recovery:'/calc/recovery', principles:'/calc/principles', glossary:'/calc/glossary' };
  const CALC_SECTION_TITLES = { start:'Risk Calculator — indexes.live', calculators:'Risk Calculators — indexes.live', recovery:'Recovery Trap — indexes.live', principles:'5 Laws of Risk — indexes.live', glossary:'Risk Glossary — indexes.live' };
  const [activeSection, setActiveSectionRaw] = useState(initialTab || 'start');
  const setActiveSection = (s) => { setActiveSectionRaw(s); if (navigateSub) navigateSub(CALC_SECTION_PATHS[s]||'/calc', CALC_SECTION_TITLES[s]); };
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
    setActiveSection(id);
    setTimeout(() => {
      if (id === 'calculators') {
        calcRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    }, 50);
  };

  // On direct URL visit, scroll to the right section after mount
  useEffect(() => {
    if (initialTab && initialTab !== 'start') {
      setTimeout(() => {
        if (initialTab === 'calculators') {
          calcRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
        } else {
          document.getElementById(initialTab)?.scrollIntoView({ behavior:'smooth', block:'start' });
        }
      }, 300);
    }
  }, []);

  const handleStartHereSelect = (calcId) => {
    setActiveTab(calcId);
    calcRef.current?.scrollIntoView({ behavior:'smooth', block:'start' });
  };

  return (
    <CalcCtx.Provider value={{ shared, setShared }}>
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

      {/* Calculators, immediately below the top row */}
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

        <div className="rc-grid" style={{ gridTemplateColumns: `repeat(${tab?.calcs.length || 3}, 1fr)` }}>
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
    </CalcCtx.Provider>
  );
}
