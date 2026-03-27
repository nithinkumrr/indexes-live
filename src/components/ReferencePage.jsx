import { useState, useEffect } from 'react';

// ── Today logic (no API) ──────────────────────────────────────────────────────
function getTodayInfo() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const date = now.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();

  // Last Tuesday of month = monthly expiry
  function lastTuesdayOfMonth(y, m) {
    const last = new Date(y, m + 1, 0); // last day of month
    const diff = (last.getDay() - 2 + 7) % 7;
    return new Date(y, m, last.getDate() - diff);
  }

  const lastTue = lastTuesdayOfMonth(year, month);
  const isLastTuesday = day === 2 && date === lastTue.getDate();
  const isNiftyWeekly = day === 2; // Tuesday
  const isSensexWeekly = day === 5; // Friday
  const isBankNiftyWeekly = day === 3; // Wednesday
  const isExpiryDay = isNiftyWeekly || isSensexWeekly || isBankNiftyWeekly;

  // Days to next Nifty weekly (Tuesday)
  const daysToTue = (2 - day + 7) % 7 || 7;
  const isExpiryWeek = daysToTue <= 2;

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  let expiryType = null;
  let expiryName = null;
  if (isLastTuesday) { expiryType = 'monthly'; expiryName = 'Nifty Monthly Expiry'; }
  else if (isNiftyWeekly) { expiryType = 'weekly'; expiryName = 'Nifty Weekly Expiry'; }
  else if (isSensexWeekly) { expiryType = 'weekly'; expiryName = 'Sensex Weekly Expiry'; }
  else if (isBankNiftyWeekly) { expiryType = 'weekly'; expiryName = 'Bank Nifty Weekly Expiry'; }

  let riskLevel, action, subAction;
  if (isExpiryDay && expiryType === 'monthly') {
    riskLevel = 'EXTREME'; action = 'Avoid new positions after 1 PM'; subAction = 'Gamma and theta spike near monthly expiry';
  } else if (isExpiryDay) {
    riskLevel = 'HIGH'; action = 'Avoid new positions after 2 PM'; subAction = 'Theta decay is fastest today';
  } else if (isExpiryWeek) {
    riskLevel = 'ELEVATED'; action = 'Prefer selling premium'; subAction = 'You are in expiry week, time decay accelerates';
  } else if (day === 1 || day === 5) {
    riskLevel = 'MODERATE'; action = 'Normal trading rules apply'; subAction = 'No major expiry pressure today';
  } else {
    riskLevel = 'NORMAL'; action = 'Standard position sizing applies'; subAction = 'Mid-week, moderate theta decay';
  }

  return {
    dayName: dayNames[day], date, month: monthNames[month], year,
    isExpiryDay, expiryType, expiryName, isExpiryWeek,
    riskLevel, action, subAction, daysToTue,
  };
}

// ── Upcoming expiries ─────────────────────────────────────────────────────────
function getUpcomingExpiries() {
  const now = new Date();
  const expiries = [];

  for (let m = 0; m < 3; m++) {
    const yr = now.getFullYear() + Math.floor((now.getMonth() + m) / 12);
    const mo = (now.getMonth() + m) % 12;

    // Nifty Weekly: every Tuesday
    const firstDay = new Date(yr, mo, 1);
    const firstTue = (2 - firstDay.getDay() + 7) % 7 + 1;
    for (let d = firstTue; d <= new Date(yr, mo + 1, 0).getDate(); d += 7) {
      const dt = new Date(yr, mo, d);
      if (dt >= now) {
        // Last Tuesday = monthly
        const nextTue = new Date(yr, mo, d + 7);
        const isMonthly = nextTue.getMonth() !== mo;
        expiries.push({ date: dt, label: isMonthly ? 'Nifty Monthly' : 'Nifty Weekly', type: isMonthly ? 'monthly' : 'weekly', exchange: 'NSE' });
      }
    }

    // Sensex Weekly: every Friday
    const firstFri = (5 - firstDay.getDay() + 7) % 7 + 1;
    for (let d = firstFri; d <= new Date(yr, mo + 1, 0).getDate(); d += 7) {
      const dt = new Date(yr, mo, d);
      if (dt >= now) {
        expiries.push({ date: dt, label: 'Sensex Weekly', type: 'weekly', exchange: 'BSE' });
      }
    }
  }

  // Sort and return next 16
  return expiries.sort((a, b) => a.date - b.date).slice(0, 18);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAway(dt) {
  const diff = Math.ceil((dt - new Date()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff}d away`;
}

function fmtDate(dt) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]}`;
}

function fmtMonth(dt) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

// ── INDEX LOT DATA ────────────────────────────────────────────────────────────
const INDEX_LOTS = [
  { sym:'NIFTY', name:'Nifty 50', lot:65, exchange:'NSE', expiry:'Tue Weekly', approxPrice:24500, color:'#4A9EFF' },
  { sym:'BANKNIFTY', name:'Bank Nifty', lot:30, exchange:'NSE', expiry:'Wed Weekly', approxPrice:52000, color:'#F59E0B' },
  { sym:'FINNIFTY', name:'Fin Nifty', lot:60, exchange:'NSE', expiry:'Tue Weekly', approxPrice:23000, color:'#00C896' },
  { sym:'MIDCPNIFTY', name:'Midcap Select', lot:120, exchange:'NSE', expiry:'Mon Monthly', approxPrice:12000, color:'#A78BFA' },
  { sym:'NIFTYNXT50', name:'Nifty Next 50', lot:25, exchange:'NSE', expiry:'Tue Monthly', approxPrice:68000, color:'#FF6B6B' },
  { sym:'SENSEX', name:'Sensex', lot:20, exchange:'BSE', expiry:'Fri Weekly', approxPrice:81000, color:'#4A9EFF' },
  { sym:'BANKEX', name:'Bankex', lot:30, exchange:'BSE', expiry:'Mon Weekly', approxPrice:58000, color:'#F59E0B' },
  { sym:'SENSEX50', name:'Sensex 50', lot:75, exchange:'BSE', expiry:'Thu Monthly', approxPrice:26000, color:'#00C896' },
];

const COMMODITY_LOTS = [
  { name:'Gold', lot:'1 kg', margin:'8.25%', tickPL:'₹100/tick', note:'Futures' },
  { name:'Gold Mini', lot:'100 gm', margin:'8.25%', tickPL:'₹10/tick', note:'Futures' },
  { name:'Silver', lot:'30 kg', margin:'17.25%', tickPL:'₹30/tick', note:'Futures' },
  { name:'Crude Oil', lot:'100 barrels', margin:'34.25%', tickPL:'₹100/tick', note:'Futures' },
  { name:'Natural Gas', lot:'1250 MMBTU', margin:'24.50%', tickPL:'₹125/tick', note:'Futures' },
];

// ════════════════════════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════════════════════════

function TodayBar() {
  const t = getTodayInfo();
  const riskColors = {
    EXTREME: '#FF4455', HIGH: '#FF4455', ELEVATED: '#F59E0B', MODERATE: '#4A9EFF', NORMAL: '#00C896'
  };
  const riskBg = {
    EXTREME: 'rgba(255,68,85,0.1)', HIGH: 'rgba(255,68,85,0.08)', ELEVATED: 'rgba(245,158,11,0.08)',
    MODERATE: 'rgba(74,158,255,0.06)', NORMAL: 'rgba(0,200,150,0.06)'
  };
  const color = riskColors[t.riskLevel];
  const bg = riskBg[t.riskLevel];

  return (
    <div className="ref-today-bar" style={{ background: bg, borderColor: color + '40' }}>
      <div className="ref-today-left">
        <div className="ref-today-eyebrow">Today's Trading Context</div>
        <div className="ref-today-main">
          {t.dayName}, {t.date} {t.month}
          {t.expiryName && <span className="ref-today-expiry" style={{ color }}> · {t.expiryName}</span>}
        </div>
        <div className="ref-today-action">{t.action}</div>
        <div className="ref-today-sub">{t.subAction}</div>
      </div>
      <div className="ref-today-right">
        <div className="ref-risk-tag" style={{ color, borderColor: color + '60', background: color + '18' }}>
          {t.riskLevel} RISK
        </div>
        {t.isExpiryDay && (
          <div className="ref-today-theta">Theta decay highest today</div>
        )}
        {!t.isExpiryDay && t.isExpiryWeek && (
          <div className="ref-today-theta">{t.daysToTue}d to Nifty expiry</div>
        )}
        {!t.isExpiryDay && !t.isExpiryWeek && (
          <div className="ref-today-theta">{t.daysToTue}d to next Nifty expiry</div>
        )}
      </div>
    </div>
  );
}

function ExpiryCalendar() {
  const expiries = getUpcomingExpiries();
  // Group by month
  const byMonth = {};
  expiries.forEach(e => {
    const k = fmtMonth(e.date);
    if (!byMonth[k]) byMonth[k] = [];
    byMonth[k].push(e);
  });

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Expiry Calendar</div>
        <div className="ref-panel-sub">Next 3 months · holiday-adjusted</div>
      </div>
      <div className="ref-insight-line">Most losses happen on expiry day. Plan before, not during.</div>
      <div className="ref-cal-cols">
        {Object.entries(byMonth).slice(0, 3).map(([month, items]) => (
          <div key={month} className="ref-cal-col">
            <div className="ref-cal-month">{month}</div>
            {items.map((e, i) => {
              const away = daysAway(e.date);
              const isToday = away === 'Today';
              const isTomorrow = away === 'Tomorrow';
              return (
                <div key={i} className={`ref-cal-row ${isToday ? 'ref-cal-today' : ''}`}>
                  <span className="ref-cal-date">{fmtDate(e.date)}</span>
                  <span className={`ref-cal-label ${e.type === 'monthly' ? 'ref-cal-monthly' : 'ref-cal-weekly'}`}>
                    {e.label}
                  </span>
                  <span className="ref-cal-away" style={{ color: isToday ? '#FF4455' : isTomorrow ? '#F59E0B' : 'var(--text3)' }}>
                    {away}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function LotSizePanel() {
  const [move, setMove] = useState('100');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const sel = INDEX_LOTS[selectedIdx];
  const m = parseFloat(move) || 0;
  const pnl = m * sel.lot;
  const exposure = sel.approxPrice * sel.lot;

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Lot Sizes</div>
        <div className="ref-panel-sub">Index F&O · NSE + BSE</div>
      </div>
      <div className="ref-insight-line ref-insight-warn">1 lot is never small. Know the exposure before you trade.</div>

      {/* Index grid */}
      <div className="ref-lot-grid">
        {INDEX_LOTS.map((l, i) => (
          <button key={l.sym}
            className={`ref-lot-card ${selectedIdx === i ? 'ref-lot-active' : ''}`}
            style={{ '--lot-color': l.color }}
            onClick={() => setSelectedIdx(i)}>
            <div className="ref-lot-exchange">{l.exchange}</div>
            <div className="ref-lot-name">{l.sym}</div>
            <div className="ref-lot-num" style={{ color: l.color }}>{l.lot}</div>
            <div className="ref-lot-expiry">{l.expiry}</div>
          </button>
        ))}
      </div>

      {/* Mini calculator */}
      <div className="ref-lot-calc">
        <div className="ref-lot-calc-hdr">{sel.name} · {sel.lot} shares per lot</div>
        <div className="ref-lot-calc-row">
          <div className="ref-lot-calc-field">
            <label>Price move (₹)</label>
            <input type="number" value={move} onChange={e => setMove(e.target.value)} className="ref-input"/>
          </div>
          <div className="ref-lot-calc-result">
            <div className="ref-lot-pnl" style={{ color: pnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              ₹{Math.abs(pnl).toLocaleString('en-IN')}
            </div>
            <div className="ref-lot-pnl-label">P&L per lot</div>
          </div>
        </div>
        <div className="ref-lot-exposure">
          Approx exposure: ₹{(exposure / 100000).toFixed(1)}L per lot at ₹{sel.approxPrice.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Commodity table */}
      <div className="ref-lot-section">Commodity Futures</div>
      <div className="ref-mini-table">
        <div className="ref-mini-thead"><span>Product</span><span>Lot Size</span><span>Margin</span><span>₹/tick</span></div>
        {COMMODITY_LOTS.map(c => (
          <div key={c.name} className="ref-mini-trow">
            <span>{c.name}</span><span>{c.lot}</span><span>{c.margin}</span><span>{c.tickPL}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThetaPanel() {
  const [mode, setMode] = useState('Weekly');
  // Static decay data points: days to expiry → % value remaining
  const weekly = [
    { d: 7, v: 100 }, { d: 6, v: 88 }, { d: 5, v: 75 }, { d: 4, v: 62 },
    { d: 3, v: 50 }, { d: 2, v: 36 }, { d: 1, v: 20 }, { d: 0, v: 0 },
  ];
  const monthly = [
    { d: 30, v: 100 }, { d: 25, v: 92 }, { d: 20, v: 82 }, { d: 15, v: 70 },
    { d: 10, v: 56 }, { d: 7, v: 44 }, { d: 4, v: 28 }, { d: 1, v: 10 }, { d: 0, v: 0 },
  ];
  const pts = mode === 'Weekly' ? weekly : monthly;
  const maxD = pts[0].d;
  const W = 260, H = 120;

  const toX = d => ((maxD - d) / maxD) * (W - 20) + 10;
  const toY = v => H - (v / 100) * (H - 10) - 5;

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.d)},${toY(p.v)}`).join(' ');
  const areaD = pathD + ` L${toX(0)},${H} L${toX(maxD)},${H} Z`;

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Theta Decay Curve</div>
        <div className="ref-toggle-row">
          {['Weekly','Monthly'].map(m => (
            <button key={m} className={`ref-toggle-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
      </div>
      <div className="ref-insight-line ref-insight-warn">70% of decay happens in last 7 days. Time works against buyers.</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ref-theta-svg">
        <defs>
          <linearGradient id="thetaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[25,50,75].map(v => (
          <line key={v} x1={10} y1={toY(v)} x2={W-10} y2={toY(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        ))}
        {/* Area fill */}
        <path d={areaD} fill="url(#thetaGrad)"/>
        {/* Curve */}
        <path d={pathD} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* 7-day marker for monthly */}
        {mode === 'Monthly' && (
          <line x1={toX(7)} y1={0} x2={toX(7)} y2={H} stroke="rgba(255,68,85,0.4)" strokeWidth="1" strokeDasharray="3,3"/>
        )}
        {/* Labels */}
        <text x={12} y={H-2} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">{maxD}d</text>
        <text x={W/2-10} y={H-2} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">Halfway</text>
        <text x={W-28} y={H-2} fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">Expiry</text>
      </svg>
      <div className="ref-theta-legend">
        <div className="ref-theta-leg-item"><span style={{color:'#F59E0B'}}>●</span> Decay is non-linear, speeds up near expiry</div>
        <div className="ref-theta-leg-item"><span style={{color:'#FF4455'}}>●</span> Last 7 days: sharpest drop, sellers benefit</div>
        <div className="ref-theta-leg-item"><span style={{color:'#4A9EFF'}}>●</span> Far-dated options decay slowly</div>
      </div>
      <div className="ref-theta-example">
        Example: ₹100 premium → ₹60 at halfway → ₹20 near expiry → ₹0 at expiry
      </div>
    </div>
  );
}

function IVPanel() {
  const [state, setState] = useState('Normal');
  const states = {
    Low: { color: '#00C896', label: 'Options are cheap', action: 'Buyers have edge', insight: 'Low IV = low premiums = options cheap to buy. Buyers benefit when IV expands later.', badge: 'BUY ZONE' },
    Normal: { color: '#4A9EFF', label: 'Fairly priced', action: 'Both strategies viable', insight: 'Normal IV = fair pricing. Neither buyers nor sellers have a structural edge.', badge: 'NEUTRAL' },
    High: { color: '#FF4455', label: 'Options are expensive', action: 'Sellers have edge', insight: 'High IV = elevated premiums = options expensive to buy. Sellers benefit when IV contracts.', badge: 'SELL ZONE' },
  };
  const s = states[state];

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Implied Volatility Guide</div>
      </div>
      <div className="ref-insight-line">IV affects option pricing, not direction. High IV ≠ market falling.</div>
      <div className="ref-toggle-row" style={{ marginBottom: 12 }}>
        {Object.keys(states).map(k => (
          <button key={k} className={`ref-toggle-btn ${state === k ? 'active' : ''}`}
            style={state === k ? { '--toggle-active': states[k].color } : {}}
            onClick={() => setState(k)}>{k} IV</button>
        ))}
      </div>
      <div className="ref-iv-card" style={{ borderColor: s.color + '40', background: s.color + '0D' }}>
        <div className="ref-iv-badge" style={{ color: s.color, borderColor: s.color + '60', background: s.color + '20' }}>{s.badge}</div>
        <div className="ref-iv-label" style={{ color: s.color }}>{s.label}</div>
        <div className="ref-iv-action">{s.action}</div>
        <div className="ref-iv-insight">{s.insight}</div>
      </div>
    </div>
  );
}

function CheatSheets() {
  return (
    <div className="ref-cheat-row">
      {/* R:R cheat sheet */}
      <div className="ref-panel ref-panel-half">
        <div className="ref-panel-hdr">
          <div className="ref-panel-title">R:R Win Rate Cheat Sheet</div>
        </div>
        <div className="ref-insight-line">You don't need high accuracy to make money.</div>
        <div className="ref-mini-table">
          <div className="ref-mini-thead"><span>R:R</span><span>Min Win Rate</span><span>Win 1 in N</span></div>
          {[
            { rr:'1:1', wr:'50%', n:'2 trades', highlight: false },
            { rr:'1:2', wr:'33%', n:'3 trades', highlight: true },
            { rr:'1:3', wr:'25%', n:'4 trades', highlight: false },
            { rr:'1:4', wr:'20%', n:'5 trades', highlight: false },
            { rr:'1:5', wr:'17%', n:'6 trades', highlight: false },
          ].map(r => (
            <div key={r.rr} className={`ref-mini-trow ${r.highlight ? 'ref-row-highlight' : ''}`}>
              <span style={{ fontWeight: r.highlight ? 700 : 400, color: r.highlight ? '#4A9EFF' : 'var(--text)' }}>{r.rr}{r.highlight ? ' ◀' : ''}</span>
              <span style={{ color: r.highlight ? '#00C896' : 'var(--text)' }}>{r.wr}</span>
              <span style={{ color: 'var(--text2)' }}>{r.n}</span>
            </div>
          ))}
        </div>
        <div className="ref-cheat-insight">1:2 R:R means 1 win covers 2 losses. Sustainable without high accuracy.</div>
      </div>

      {/* Leverage cheat sheet */}
      <div className="ref-panel ref-panel-half">
        <div className="ref-panel-hdr">
          <div className="ref-panel-title">Leverage Wipeout Table</div>
        </div>
        <div className="ref-insight-line ref-insight-warn">Leverage kills accounts, not bad trades.</div>
        <div className="ref-mini-table">
          <div className="ref-mini-thead"><span>Leverage</span><span>Wipeout Move</span><span>Safety</span></div>
          {[
            { lev:'2x', wipe:'50%', safe:'Very safe', color:'var(--gain)' },
            { lev:'3x', wipe:'33%', safe:'Safe', color:'var(--gain)' },
            { lev:'5x', wipe:'20%', safe:'Risky', color:'var(--pre)' },
            { lev:'10x', wipe:'10%', safe:'Dangerous', color:'var(--loss)', highlight: true },
            { lev:'15x', wipe:'6.7%', safe:'Extreme', color:'var(--loss)' },
          ].map(r => (
            <div key={r.lev} className={`ref-mini-trow ${r.highlight ? 'ref-row-highlight-red' : ''}`}>
              <span style={{ fontWeight: r.highlight ? 700 : 400, color: r.color }}>{r.lev}{r.highlight ? ' ⚠' : ''}</span>
              <span style={{ color: r.color }}>{r.wipe}</span>
              <span style={{ fontSize: 11, color: r.color }}>{r.safe}</span>
            </div>
          ))}
        </div>
        <div className="ref-cheat-insight">At 10x leverage, a 10% Nifty move wipes your account. 10% happens.</div>
      </div>
    </div>
  );
}

function GapRiskReference() {
  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Gap Risk Reference</div>
      </div>
      <div className="ref-insight-line ref-insight-warn">Stop loss does not work overnight. Gaps skip your SL price entirely.</div>
      <div className="ref-mini-table">
        <div className="ref-mini-thead"><span>Gap Size</span><span>SL loss multiplier</span><span>When it happens</span></div>
        {[
          { gap:'1%', mult:'1–2×', when:'Common' },
          { gap:'2%', mult:'2–4×', when:'Results, global cues' },
          { gap:'3%', mult:'3–6×', when:'RBI, budget, war' },
          { gap:'5%', mult:'5–10×', when:'Black swan events' },
          { gap:'8%+', mult:'8×+', when:'Circuit breaker events' },
        ].map(r => (
          <div key={r.gap} className="ref-mini-trow">
            <span style={{ color: 'var(--loss)', fontWeight: 600 }}>{r.gap}</span>
            <span style={{ color: 'var(--pre)' }}>{r.mult}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{r.when}</span>
          </div>
        ))}
      </div>
      <div className="ref-gap-actions">
        <div className="ref-gap-action">Before RBI / Budget / Results: reduce overnight size by 50%+</div>
        <div className="ref-gap-action">Intraday only: close all positions before market close on event days</div>
      </div>
    </div>
  );
}

function TodayPlaybook() {
  const t = getTodayInfo();

  let marketType, strategy, riskLevel, tips;
  if (t.isExpiryDay && t.expiryType === 'monthly') {
    marketType = 'Monthly Expiry Day'; strategy = 'Exit existing short positions early'; riskLevel = 'Extreme';
    tips = ['Gamma risk is maximum today', 'Avoid new positions after 1 PM', 'Spreads safer than naked options', 'Expect sharp intraday moves'];
  } else if (t.isExpiryDay) {
    marketType = 'Weekly Expiry Day'; strategy = 'Sell premium with tight stops'; riskLevel = 'High';
    tips = ['Theta decay is fastest today', 'Avoid new long option buys after 2 PM', 'Sell OTM options if trend is clear', 'Close positions before 3:20 PM'];
  } else if (t.isExpiryWeek) {
    marketType = 'Expiry Week'; strategy = 'Prefer selling premium'; riskLevel = 'Elevated';
    tips = ['Time decay accelerating', 'Selling strategies have edge', 'Keep position sizes moderate', `${t.daysToTue} day${t.daysToTue > 1 ? 's' : ''} to Nifty expiry`];
  } else {
    marketType = 'Normal Trading Day'; strategy = 'Standard risk rules apply'; riskLevel = 'Normal';
    tips = ['No major expiry pressure', 'Both buying and selling viable', 'Follow your system rules', 'Maintain position sizing discipline'];
  }

  const riskColor = { Extreme: '#FF4455', High: '#FF4455', Elevated: '#F59E0B', Normal: '#00C896' }[riskLevel];

  return (
    <div className="ref-panel ref-playbook">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Today's Playbook</div>
        <div className="ref-panel-sub">Rule-based · No prediction</div>
      </div>
      <div className="ref-playbook-grid">
        <div className="ref-playbook-row">
          <span className="ref-playbook-lbl">Market type</span>
          <span className="ref-playbook-val">{marketType}</span>
        </div>
        <div className="ref-playbook-row">
          <span className="ref-playbook-lbl">Strategy</span>
          <span className="ref-playbook-val" style={{ color: '#4A9EFF' }}>{strategy}</span>
        </div>
        <div className="ref-playbook-row">
          <span className="ref-playbook-lbl">Risk level</span>
          <span className="ref-playbook-val" style={{ color: riskColor, fontWeight: 700 }}>{riskLevel}</span>
        </div>
      </div>
      <div className="ref-playbook-tips">
        {tips.map((tip, i) => (
          <div key={i} className="ref-playbook-tip">
            <span style={{ color: riskColor }}>→</span> {tip}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════

export default function ReferencePage() {
  return (
    <div className="ref-page">
      {/* TOP: Today bar */}
      <TodayBar />

      {/* MAIN GRID */}
      <div className="ref-main-grid">
        {/* LEFT COLUMN: Theta + IV */}
        <div className="ref-col ref-col-left">
          <ThetaPanel />
          <IVPanel />
          <GapRiskReference />
        </div>

        {/* CENTER: Expiry calendar */}
        <div className="ref-col ref-col-center">
          <ExpiryCalendar />
          <CheatSheets />
        </div>

        {/* RIGHT COLUMN: Lot sizes + Playbook */}
        <div className="ref-col ref-col-right">
          <TodayPlaybook />
          <LotSizePanel />
        </div>
      </div>
    </div>
  );
}
