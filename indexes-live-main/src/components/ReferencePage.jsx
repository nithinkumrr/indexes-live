import { useState } from 'react';

// ── Holiday calendar (NSE/BSE trading holidays 2026) ─────────────────────────
const HOLIDAYS_2026 = [
  { date: '2026-01-15', name: 'Municipal Corporation Elections (Maharashtra)', exchange: 'NSE BSE' },
  { date: '2026-01-26', name: 'Republic Day', exchange: 'NSE BSE MCX' },
  { date: '2026-03-03', name: 'Holi', exchange: 'NSE BSE' },
  { date: '2026-03-26', name: 'Shri Ram Navami', exchange: 'NSE BSE' },
  { date: '2026-03-31', name: 'Shri Mahavir Jayanti', exchange: 'NSE BSE' },
  { date: '2026-04-03', name: 'Good Friday', exchange: 'NSE BSE MCX' },
  { date: '2026-04-14', name: 'Dr. Baba Saheb Ambedkar Jayanti', exchange: 'NSE BSE' },
  { date: '2026-05-01', name: 'Maharashtra Day', exchange: 'NSE BSE' },
  { date: '2026-05-28', name: 'Bakri Eid', exchange: 'NSE BSE' },
  { date: '2026-06-26', name: 'Moharram', exchange: 'NSE BSE' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi', exchange: 'NSE BSE' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', exchange: 'NSE BSE MCX' },
  { date: '2026-10-20', name: 'Dussehra', exchange: 'NSE BSE' },
  { date: '2026-11-10', name: 'Diwali-Balipratipada', exchange: 'NSE BSE' },
  { date: '2026-11-24', name: 'Prakash Gurpurb Sri Guru Nanak Dev', exchange: 'NSE BSE' },
  { date: '2026-12-25', name: 'Christmas', exchange: 'NSE BSE MCX' },
];

const SETTLEMENT_HOLIDAYS = [
  { date: '2026-02-19', name: 'Chhatrapati Shivaji Maharaj Jayanti' },
  { date: '2026-03-19', name: 'Gudhi Padwa' },
  { date: '2026-04-01', name: 'Annual Bank Closing' },
  { date: '2026-08-26', name: 'Id-E-Milad' },
];

function isHoliday(dateStr) {
  return HOLIDAYS_2026.some(h => h.date === dateStr);
}
function isSettlement(dateStr) {
  return SETTLEMENT_HOLIDAYS.some(h => h.date === dateStr);
}
function getHolidayName(dateStr) {
  return HOLIDAYS_2026.find(h => h.date === dateStr)?.name || null;
}
function dateToStr(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}

// Advance date past holidays (skip weekends + holidays)
function nextTradingDay(dt, steps = 1) {
  let d = new Date(dt);
  let moved = 0;
  while (moved < steps) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    if (isHoliday(dateToStr(d))) continue;
    moved++;
  }
  return d;
}

// Get next Nifty expiry (Tuesday, skip holidays to Monday)
function getNextNiftyExpiry(from = new Date()) {
  let d = new Date(from);
  // Find next Tuesday
  const daysToTue = (2 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysToTue);
  // If holiday, move to prior Monday (or Friday if Monday is also holiday)
  while (isHoliday(dateToStr(d)) || d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// ── Today logic ───────────────────────────────────────────────────────────────
function getTodayInfo() {
  const now = new Date();
  const todayStr = dateToStr(now);
  const dow = now.getDay();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const isMarketHoliday = isHoliday(todayStr);
  const isSettlementHoliday = isSettlement(todayStr);
  const holidayName = getHolidayName(todayStr);

  // Next Nifty expiry (holiday-adjusted)
  const nextExpiry = getNextNiftyExpiry(now);
  const daysToExpiry = Math.ceil((nextExpiry - now) / 86400000);
  const isExpiryToday = daysToExpiry <= 0 || dateToStr(nextExpiry) === todayStr;
  const isExpiryWeek = daysToExpiry <= 3 && daysToExpiry > 0;

  // Check if next expiry is monthly (last Tuesday of month)
  function lastTuesdayOfMonth(y, m) {
    const last = new Date(y, m + 1, 0);
    const diff = (last.getDay() - 2 + 7) % 7;
    let d = new Date(y, m, last.getDate() - diff);
    while (isHoliday(dateToStr(d))) d.setDate(d.getDate() - 1);
    return d;
  }
  const lastTue = lastTuesdayOfMonth(nextExpiry.getFullYear(), nextExpiry.getMonth());
  const isMonthlyExpiry = dateToStr(nextExpiry) === dateToStr(lastTue);

  let riskLevel, action, subAction, expiryNote;
  if (isMarketHoliday) {
    riskLevel = 'HOLIDAY'; action = 'Market closed today';
    subAction = holidayName || 'National holiday';
    expiryNote = null;
  } else if (isExpiryToday && isMonthlyExpiry) {
    riskLevel = 'EXTREME'; action = 'Monthly expiry. Gamma and volatility elevated  -  premium decay accelerates into close.';
    subAction = 'OTM options can go to zero rapidly in final 30 minutes.';
    expiryNote = 'Nifty Monthly Expiry today';
  } else if (isExpiryToday) {
    riskLevel = 'HIGH'; action = 'Expiry day. Elevated gamma risk  -  bid-ask spreads widen in final 90 minutes.';
    subAction = 'Theta decay is fastest today. Close or roll by 3:20 PM.';
    expiryNote = 'Nifty Weekly Expiry today';
  } else if (isExpiryWeek) {
    riskLevel = 'ELEVATED'; action = 'Expiry week. Time decay accelerates from here.';
    subAction = `${daysToExpiry} day${daysToExpiry > 1 ? 's' : ''} to expiry. Decay accelerating.`;
    expiryNote = isMonthlyExpiry ? 'Nifty Monthly Expiry this week' : 'Nifty Weekly Expiry this week';
  } else {
    riskLevel = 'NORMAL'; action = 'Standard position sizing applies.';
    subAction = `${daysToExpiry} days to next Nifty expiry.`;
    expiryNote = null;
  }

  const expiryDateFmt = nextExpiry.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

  return {
    dayName: dayNames[dow], date: now.getDate(),
    month: monthNames[now.getMonth()], year: now.getFullYear(),
    riskLevel, action, subAction, expiryNote,
    nextExpiryDate: expiryDateFmt,
    daysToExpiry, isMonthlyExpiry,
    isMarketHoliday, holidayName,
    isSettlementHoliday,
  };
}

// ── Upcoming expiries (holiday-adjusted) ─────────────────────────────────────
function getUpcomingExpiries() {
  const now = new Date();
  const expiries = [];
  let cursor = new Date(now);
  cursor.setDate(cursor.getDate() + 1); // start from tomorrow

  for (let i = 0; i < 60; i++) { // scan next 60 days
    const dow = cursor.getDay();
    const str = dateToStr(cursor);

    if (dow === 0 || dow === 6) { cursor.setDate(cursor.getDate() + 1); continue; }

    // Tuesday = Nifty weekly. If holiday, it would have moved, skip
    if (dow === 2 && !isHoliday(str)) {
      // Last Tuesday of month?
      function lastTueOfMonth(y, m) {
        const last = new Date(y, m + 1, 0);
        const diff = (last.getDay() - 2 + 7) % 7;
        let d = new Date(y, m, last.getDate() - diff);
        while (isHoliday(dateToStr(d))) d.setDate(d.getDate() - 1);
        return d;
      }
      const lt = lastTueOfMonth(cursor.getFullYear(), cursor.getMonth());
      const isMonthly = dateToStr(cursor) === dateToStr(lt);
      expiries.push({ date: new Date(cursor), label: isMonthly ? 'Nifty Monthly' : 'Nifty Weekly', type: isMonthly ? 'monthly' : 'weekly' });
    }
    // Friday = Sensex weekly. If holiday, moved to Thursday
    if (dow === 5 && !isHoliday(str)) {
      expiries.push({ date: new Date(cursor), label: 'Sensex Weekly', type: 'weekly' });
    }
    if (dow === 4 && isHoliday(dateToStr(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)))) {
      expiries.push({ date: new Date(cursor), label: 'Sensex Weekly', type: 'weekly', shifted: true });
    }

    cursor.setDate(cursor.getDate() + 1);
    if (expiries.length >= 20) break;
  }
  return expiries.slice(0, 18);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAway(dt) {
  const diff = Math.ceil((dt - new Date()) / 86400000);
  if (diff <= 0) return 'Today';
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

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function TodayBar() {
  const t = getTodayInfo();
  const riskColors = {
    EXTREME: '#FF4455', HIGH: '#FF4455', ELEVATED: '#F59E0B',
    NORMAL: '#00C896', HOLIDAY: '#A78BFA'
  };
  const riskBg = {
    EXTREME: 'rgba(255,68,85,0.1)', HIGH: 'rgba(255,68,85,0.08)',
    ELEVATED: 'rgba(245,158,11,0.08)', NORMAL: 'rgba(0,200,150,0.06)',
    HOLIDAY: 'rgba(167,139,250,0.08)'
  };
  const color = riskColors[t.riskLevel];

  return (
    <div className="ref-today-bar" style={{ background: riskBg[t.riskLevel], borderColor: color + '40' }}>
      <div className="ref-today-left">
        <div className="ref-today-eyebrow">Today's Trading Context</div>
        <div className="ref-today-main">
          {t.dayName}, {t.date} {t.month}
          {t.expiryNote && <span className="ref-today-expiry" style={{ color }}> · {t.expiryNote}</span>}
          {t.isMarketHoliday && <span className="ref-today-expiry" style={{ color }}> · Market Closed</span>}
        </div>
        <div className="ref-today-action">{t.action}</div>
        <div className="ref-today-sub">{t.subAction}</div>
        {t.isSettlementHoliday && (
          <div className="ref-today-settle">Settlement holiday today · deliveries delayed · trading continues normally</div>
        )}
      </div>
      <div className="ref-today-right">
        <div className="ref-risk-tag" style={{ color, borderColor: color + '60', background: color + '18' }}>
          {t.riskLevel} RISK
        </div>
        <div className="ref-today-theta">
          {t.isMarketHoliday ? t.holidayName : `Next expiry: ${t.nextExpiryDate} (${t.daysToExpiry}d)`}
        </div>
      </div>
    </div>
  );
}

function ExpiryCalendar() {
  const expiries = getUpcomingExpiries();
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
        <div className="ref-panel-sub">Holiday-adjusted · 2026</div>
      </div>
      <div className="ref-insight-line">31 Mar (Mahavir Jayanti) is a holiday. Nifty expiry moved to Mon 30 Mar.</div>
      <div className="ref-cal-cols">
        {Object.entries(byMonth).slice(0, 3).map(([month, items]) => (
          <div key={month} className="ref-cal-col">
            <div className="ref-cal-month">{month}</div>
            {items.map((e, i) => {
              const away = daysAway(e.date);
              const isToday = away === 'Today';
              return (
                <div key={i} className={`ref-cal-row ${isToday ? 'ref-cal-today' : ''}`}>
                  <span className="ref-cal-date">{fmtDate(e.date)}</span>
                  <span className={`ref-cal-label ${e.type === 'monthly' ? 'ref-cal-monthly' : 'ref-cal-weekly'}`}>
                    {e.label}
                  </span>
                  <span className="ref-cal-away" style={{ color: isToday ? '#FF4455' : away === 'Tomorrow' ? '#F59E0B' : 'var(--text3)' }}>
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

function HolidayCalendar() {
  const now = new Date();
  const upcoming = HOLIDAYS_2026.filter(h => new Date(h.date) >= now).slice(0, 12);
  const upcomingSettlement = SETTLEMENT_HOLIDAYS.filter(h => new Date(h.date) >= now).slice(0, 4);

  function fmtHolDate(str) {
    const d = new Date(str);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }
  function daysUntil(str) {
    const diff = Math.ceil((new Date(str) - now) / 86400000);
    if (diff <= 0) return 'Today';
    if (diff === 1) return '1d';
    return `${diff}d`;
  }

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Holiday Calendar 2026</div>
        <div className="ref-panel-sub">NSE / BSE</div>
      </div>

      <div className="ref-holiday-list">
        {upcoming.map(h => {
          const d = daysUntil(h.date);
          const isClose = parseInt(d) <= 7 && d !== 'Today';
          const isToday = d === 'Today';
          return (
            <div key={h.date} className={`ref-holiday-row ${isToday ? 'ref-holiday-today' : ''}`}>
              <span className="ref-holiday-date">{fmtHolDate(h.date)}</span>
              <span className="ref-holiday-name">{h.name}</span>
              <span className="ref-holiday-away" style={{ color: isToday ? '#FF4455' : isClose ? '#F59E0B' : 'var(--text3)' }}>{d}</span>
            </div>
          );
        })}
      </div>

      {upcomingSettlement.length > 0 && (
        <>
          <div className="ref-holiday-section-hdr">Settlement Holidays</div>
          <div className="ref-settle-box">
            <div className="ref-settle-what">Market trades normally. Depositories closed. Stock transfers and deliveries are delayed by one day.</div>
            <div className="ref-holiday-list" style={{marginTop: 8}}>
              {upcomingSettlement.map(h => (
                <div key={h.date} className="ref-holiday-row">
                  <span className="ref-holiday-date">{fmtHolDate(h.date)}</span>
                  <span className="ref-holiday-name">{h.name}</span>
                  <span className="ref-holiday-away" style={{color:'var(--accent)'}}>{daysUntil(h.date)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const INDEX_LOTS = [
  { sym:'NIFTY',     name:'Nifty 50',       lot:65,  exchange:'NSE', expiry:'Tue Weekly', approxPrice:24500, color:'#4A9EFF' },
  { sym:'BANKNIFTY', name:'Bank Nifty',      lot:30,  exchange:'NSE', expiry:'Wed Weekly', approxPrice:52000, color:'#F59E0B' },
  { sym:'FINNIFTY',  name:'Fin Nifty',       lot:60,  exchange:'NSE', expiry:'Tue Weekly', approxPrice:23000, color:'#00C896' },
  { sym:'MIDCPNIFTY',name:'Midcap Select',   lot:120, exchange:'NSE', expiry:'Mon Monthly',approxPrice:12000, color:'#A78BFA' },
  { sym:'NIFTYNXT50',name:'Nifty Next 50',   lot:25,  exchange:'NSE', expiry:'Tue Monthly',approxPrice:68000, color:'#FF6B6B' },
  { sym:'SENSEX',    name:'Sensex',          lot:20,  exchange:'BSE', expiry:'Fri Weekly', approxPrice:81000, color:'#4A9EFF' },
  { sym:'BANKEX',    name:'Bankex',          lot:30,  exchange:'BSE', expiry:'Mon Weekly', approxPrice:58000, color:'#F59E0B' },
  { sym:'SENSEX50',  name:'Sensex 50',       lot:75,  exchange:'BSE', expiry:'Thu Monthly',approxPrice:26000, color:'#00C896' },
];

// Full MCX commodity lot sizes
const COMMODITY_LOTS = [
  // Gold family
  { name:'Gold',        sym:'GOLD',       lot:'1 kg',        unit:'KGS',   margin:'8.25%',  plPerTick:'₹100', tickSize:'₹1',   category:'Precious Metals' },
  { name:'Gold Mini',   sym:'GOLDM',      lot:'100 gm',      unit:'GRMS',  margin:'8.25%',  plPerTick:'₹10',  tickSize:'₹1',   category:'Precious Metals' },
  { name:'Gold Ten',    sym:'GOLDTEN',    lot:'10 gm',       unit:'GRMS',  margin:'8.25%',  plPerTick:'₹1',   tickSize:'₹1',   category:'Precious Metals' },
  { name:'Gold Guinea', sym:'GOLDGUINEA', lot:'8 gm',        unit:'GRMS',  margin:'8.25%',  plPerTick:'₹1',   tickSize:'₹1',   category:'Precious Metals' },
  { name:'Gold Petal',  sym:'GOLDPETAL',  lot:'1 gm',        unit:'GRMS',  margin:'8.25%',  plPerTick:'₹1',   tickSize:'₹1',   category:'Precious Metals' },
  // Silver family
  { name:'Silver',      sym:'SILVER',     lot:'30 kg',       unit:'KGS',   margin:'17.25%', plPerTick:'₹30',  tickSize:'₹1',   category:'Precious Metals' },
  { name:'Silver Mini', sym:'SILVERM',    lot:'5 kg',        unit:'KGS',   margin:'17.25%', plPerTick:'₹5',   tickSize:'₹1',   category:'Precious Metals' },
  { name:'Silver Micro',sym:'SILVERMIC',  lot:'1 kg',        unit:'KGS',   margin:'17.25%', plPerTick:'₹1',   tickSize:'₹1',   category:'Precious Metals' },
  // Energy
  { name:'Crude Oil',   sym:'CRUDEOIL',   lot:'100 bbl',     unit:'BBL',   margin:'34.25%', plPerTick:'₹100', tickSize:'₹1',   category:'Energy' },
  { name:'Crude Mini',  sym:'CRUDEOILM',  lot:'10 bbl',      unit:'BBL',   margin:'34.25%', plPerTick:'₹10',  tickSize:'₹1',   category:'Energy' },
  { name:'Nat Gas',     sym:'NATURALGAS', lot:'1250 MMBTU',  unit:'MMBTU', margin:'24.50%', plPerTick:'₹125', tickSize:'10p',  category:'Energy' },
  { name:'Nat Gas Mini',sym:'NATGASMINI', lot:'250 MMBTU',   unit:'MMBTU', margin:'24.50%', plPerTick:'₹25',  tickSize:'10p',  category:'Energy' },
  // Base Metals
  { name:'Copper',      sym:'COPPER',     lot:'2500 kg',     unit:'KGS',   margin:'5.00%',  plPerTick:'₹25',  tickSize:'₹0.05',category:'Base Metals' },
  { name:'Aluminium',   sym:'ALUMINIUM',  lot:'5 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹5',   tickSize:'₹0.05',category:'Base Metals' },
  { name:'Alum Mini',   sym:'ALUMINI',    lot:'1 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹1',   tickSize:'₹0.05',category:'Base Metals' },
  { name:'Zinc',        sym:'ZINC',       lot:'5 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹25',  tickSize:'₹0.05',category:'Base Metals' },
  { name:'Zinc Mini',   sym:'ZINCMINI',   lot:'1 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹5',   tickSize:'₹0.05',category:'Base Metals' },
  { name:'Lead',        sym:'LEAD',       lot:'5 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹25',  tickSize:'₹0.05',category:'Base Metals' },
  { name:'Lead Mini',   sym:'LEADMINI',   lot:'1 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹5',   tickSize:'₹0.05',category:'Base Metals' },
  { name:'Nickel',      sym:'NICKEL',     lot:'250 kg',      unit:'KGS',   margin:'5.00%',  plPerTick:'₹25',  tickSize:'₹0.10',category:'Base Metals' },
  // Agri
  { name:'Mentha Oil',  sym:'MENTHAOIL',  lot:'360 kg',      unit:'KGS',   margin:'5.00%',  plPerTick:'₹36',  tickSize:'₹0.10',category:'Agri' },
  { name:'Cotton',      sym:'COTTON',     lot:'25 bales',    unit:'BALES', margin:'5.00%',  plPerTick:'₹25',  tickSize:'₹10',  category:'Agri' },
  { name:'Cotton Oil',  sym:'COTTONOIL',  lot:'5 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹50',  tickSize:'₹1',   category:'Agri' },
  { name:'Kapas',       sym:'KAPAS',      lot:'4 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹40',  tickSize:'₹1',   category:'Agri' },
  // Steel
  { name:'Steel Rebar', sym:'STEELREBAR', lot:'5 MT',        unit:'MT',    margin:'5.00%',  plPerTick:'₹25',  tickSize:'₹0.50',category:'Metals' },
];

const COMMOD_CATEGORIES = ['All', 'Precious Metals', 'Energy', 'Base Metals', 'Agri', 'Metals'];

function LotSizePanel() {
  const [move, setMove] = useState('100');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const sel = INDEX_LOTS[selectedIdx];
  const m = parseFloat(move) || 0;
  const pnl = m * sel.lot;
  const exposure = sel.approxPrice * sel.lot;

  const [commodMove, setCommodMove] = useState('10');
  const [selectedCommod, setSelectedCommod] = useState(0);
  const [commodCat, setCommodCat] = useState('All');

  const filteredCommodities = commodCat === 'All'
    ? COMMODITY_LOTS
    : COMMODITY_LOTS.filter(c => c.category === commodCat);
  const selCommod = COMMODITY_LOTS[selectedCommod] || COMMODITY_LOTS[0];
  const cm = parseFloat(commodMove) || 0;
  // P&L = move * lot quantity (for ₹/unit commodities, tick-based)
  const tickVal = parseFloat(selCommod.plPerTick?.replace('₹','')) || 0;
  const tickSz = parseFloat(selCommod.tickSize?.replace('₹','').replace('p','0.1')) || 1;
  const commodPnl = tickSz > 0 ? (cm / tickSz) * tickVal : 0;

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Lot Sizes</div>
        <div className="ref-panel-sub">Index F&O · NSE + BSE</div>
      </div>
      <div className="ref-insight-line ref-insight-warn">1 lot is never small. Know the exposure before you trade.</div>

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
          Exposure: ~₹{(exposure / 100000).toFixed(1)}L per lot at ₹{sel.approxPrice.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Commodity section */}
      <div className="ref-lot-section-hdr">
        <span className="ref-lot-section">Commodity</span>
        <span className="ref-lot-sub">MCX</span>
      </div>

      {/* Commodity calculator */}
      <div className="ref-lot-calc ref-commod-calc">
        <div className="ref-lot-calc-hdr">P&L Calculator · {selCommod.name}</div>
        <div className="ref-lot-calc-row">
          <div className="ref-lot-calc-field">
            <label>Price move (₹)</label>
            <input type="number" value={commodMove} onChange={e => setCommodMove(e.target.value)} className="ref-input"/>
          </div>
          <div className="ref-lot-calc-result">
            <div className="ref-lot-pnl" style={{ color: commodPnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
              ₹{Math.abs(Math.round(commodPnl)).toLocaleString('en-IN')}
            </div>
            <div className="ref-lot-pnl-label">P&L · {selCommod.lot}</div>
          </div>
        </div>
        <div className="ref-lot-exposure">
          Tick: {selCommod.tickSize} = {selCommod.plPerTick} · Margin ~{selCommod.margin}
        </div>
      </div>

      {/* Category filter */}
      <div className="ref-commod-filter">
        {COMMOD_CATEGORIES.map(c => (
          <button key={c}
            className={`ref-commod-filter-btn ${commodCat === c ? 'active' : ''}`}
            onClick={() => setCommodCat(c)}>{c}</button>
        ))}
      </div>

      {/* Scrollable commodity table */}
      <div className="ref-commod-scroll">
        <div className="ref-commod-table">
          <div className="ref-commod-hdr">
            <span>Product</span><span>Lot</span><span>Margin</span><span>₹/tick</span>
          </div>
          {filteredCommodities.map(c => (
            <div key={c.sym}
              className={`ref-commod-row ${COMMODITY_LOTS.indexOf(c) === selectedCommod ? 'ref-commod-selected' : ''}`}
              onClick={() => setSelectedCommod(COMMODITY_LOTS.indexOf(c))}>
              <span className="ref-commod-name">{c.name}</span>
              <span className="ref-commod-lot">{c.lot}</span>
              <span>{c.margin}</span>
              <span className="ref-commod-pl">{c.plPerTick}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThetaPanel() {
  const [mode, setMode] = useState('Weekly');
  const weekly = [
    {d:7,v:100},{d:6,v:88},{d:5,v:75},{d:4,v:62},
    {d:3,v:50},{d:2,v:36},{d:1,v:20},{d:0,v:0},
  ];
  const monthly = [
    {d:30,v:100},{d:25,v:92},{d:20,v:82},{d:15,v:70},
    {d:10,v:56},{d:7,v:44},{d:4,v:28},{d:1,v:10},{d:0,v:0},
  ];
  const pts = mode === 'Weekly' ? weekly : monthly;
  const maxD = pts[0].d;
  const W = 260, H = 130;
  const toX = d => ((maxD - d) / maxD) * (W - 20) + 10;
  const toY = v => H - (v / 100) * (H - 14) - 6;
  const pathD = pts.map((p, i) => `${i===0?'M':'L'}${toX(p.d)},${toY(p.v)}`).join(' ');
  const areaD = pathD + ` L${toX(0)},${H} L${toX(maxD)},${H} Z`;

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Theta Decay Curve</div>
        <div className="ref-toggle-row">
          {['Weekly','Monthly'].map(m => (
            <button key={m} className={`ref-toggle-btn ${mode===m?'active':''}`} onClick={()=>setMode(m)}>{m}</button>
          ))}
        </div>
      </div>
      <div className="ref-insight-line ref-insight-warn">70% of decay happens in the last 7 days. Time works against buyers.</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ref-theta-svg">
        <defs>
          <linearGradient id="thetaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[25,50,75].map(v => (
          <line key={v} x1={10} y1={toY(v)} x2={W-10} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
        ))}
        <path d={areaD} fill="url(#thetaGrad)"/>
        <path d={pathD} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {mode === 'Monthly' && (
          <line x1={toX(7)} y1={0} x2={toX(7)} y2={H} stroke="rgba(255,68,85,0.4)" strokeWidth="1" strokeDasharray="3,3"/>
        )}
        <text x={12} y={H-3} fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="monospace">{maxD}d</text>
        <text x={W-40} y={H-3} fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="monospace">Expiry</text>
      </svg>
      <div className="ref-theta-legend">
        <div className="ref-theta-leg-item"><span style={{color:'#F59E0B'}}>●</span> Decay is non-linear, speeds up near expiry</div>
        <div className="ref-theta-leg-item"><span style={{color:'#FF4455'}}>●</span> Last 7 days: sharpest drop, sellers benefit</div>
        <div className="ref-theta-leg-item"><span style={{color:'#4A9EFF'}}>●</span> Far-dated options decay slowly</div>
      </div>
      <div className="ref-theta-example">Example: ₹100 premium at 30d → ₹60 at 15d → ₹20 near expiry → ₹0</div>
    </div>
  );
}

function IVPanel() {
  const [state, setState] = useState('Normal');
  const states = {
    Low:    { color:'#00C896', label:'Options are cheap',    action:'Buyers have edge',           insight:'Low IV means premiums are cheap. Buy when IV is low, before it expands.', badge:'BUY ZONE' },
    Normal: { color:'#4A9EFF', label:'Fairly priced',        action:'Both strategies viable',     insight:'Normal IV means fair pricing. No structural edge for buyers or sellers.', badge:'NEUTRAL' },
    High:   { color:'#FF4455', label:'Options are expensive', action:'Sellers have edge',          insight:'High IV means premiums are elevated. Sellers benefit when IV contracts back.', badge:'SELL ZONE' },
  };
  const s = states[state];

  return (
    <div className="ref-panel">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Implied Volatility Guide</div>
      </div>
      <div className="ref-insight-line">IV affects option pricing, not direction. High IV is not the same as market falling.</div>
      <div className="ref-toggle-row" style={{marginBottom:12}}>
        {Object.keys(states).map(k => (
          <button key={k} className={`ref-toggle-btn ${state===k?'active':''}`} onClick={()=>setState(k)}>{k} IV</button>
        ))}
      </div>
      <div className="ref-iv-card" style={{borderColor:s.color+'40',background:s.color+'0D'}}>
        <div className="ref-iv-badge" style={{color:s.color,borderColor:s.color+'60',background:s.color+'20'}}>{s.badge}</div>
        <div className="ref-iv-label" style={{color:s.color}}>{s.label}</div>
        <div className="ref-iv-action">{s.action}</div>
        <div className="ref-iv-insight">{s.insight}</div>
      </div>
    </div>
  );
}

function CheatSheets() {
  return (
    <div className="ref-cheat-row">
      <div className="ref-panel ref-panel-half">
        <div className="ref-panel-hdr">
          <div className="ref-panel-title">R:R Win Rate Cheat Sheet</div>
        </div>
        <div className="ref-insight-line">You don't need high accuracy to make money.</div>
        <div className="ref-mini-table ref-mini-table-3">
          <div className="ref-mini-thead-3"><span>R:R</span><span>Min Win Rate</span><span>Win 1 in N</span></div>
          {[
            {rr:'1:1', wr:'50%', n:'2 trades', hl:false},
            {rr:'1:2', wr:'33%', n:'3 trades', hl:true},
            {rr:'1:3', wr:'25%', n:'4 trades', hl:false},
            {rr:'1:4', wr:'20%', n:'5 trades', hl:false},
            {rr:'1:5', wr:'17%', n:'6 trades', hl:false},
          ].map(r => (
            <div key={r.rr} className={`ref-mini-trow-3 ${r.hl?'ref-row-highlight':''}`}>
              <span style={{fontWeight:r.hl?700:400,color:r.hl?'#4A9EFF':'var(--text)'}}>{r.rr}{r.hl?' ◀':''}</span>
              <span style={{color:r.hl?'#00C896':'var(--text)'}}>{r.wr}</span>
              <span style={{color:'var(--text2)'}}>{r.n}</span>
            </div>
          ))}
        </div>
        <div className="ref-cheat-insight">At 1:2 R:R, 1 win covers 2 losses. Profitable without high accuracy.</div>
      </div>

      <div className="ref-panel ref-panel-half">
        <div className="ref-panel-hdr">
          <div className="ref-panel-title">Leverage Wipeout Table</div>
        </div>
        <div className="ref-insight-line ref-insight-warn">Leverage kills accounts, not bad trades.</div>
        <div className="ref-mini-table ref-mini-table-3">
          <div className="ref-mini-thead-3"><span>Leverage</span><span>Wipeout</span><span>Safety</span></div>
          {[
            {lev:'2x', wipe:'50%', safe:'Very safe', color:'var(--gain)'},
            {lev:'3x', wipe:'33%', safe:'Safe',      color:'var(--gain)'},
            {lev:'5x', wipe:'20%', safe:'Risky',     color:'var(--pre)'},
            {lev:'10x',wipe:'10%', safe:'Danger', color:'var(--loss)', hl:true},
            {lev:'15x',wipe:'6.7%',safe:'Extreme',   color:'var(--loss)'},
          ].map(r => (
            <div key={r.lev} className={`ref-mini-trow-3 ${r.hl?'ref-row-highlight-red':''}`}>
              <span style={{fontWeight:r.hl?700:400,color:r.color}}>{r.lev}{r.hl?' ⚠':''}</span>
              <span style={{color:r.color}}>{r.wipe}</span>
              <span style={{fontSize:12,color:r.color}}>{r.safe}</span>
            </div>
          ))}
        </div>
        <div className="ref-cheat-insight">At 10x leverage, a 10% Nifty move wipes your account. 10% happens regularly.</div>
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
      <div className="ref-insight-line ref-insight-warn">Stop loss does not work overnight. Gaps skip your SL entirely.</div>
      <div className="ref-mini-table ref-mini-table-3">
        <div className="ref-mini-thead-3"><span>Gap</span><span>SL multiplier</span><span>Trigger</span></div>
        {[
          {gap:'1%', mult:'1-2x',  when:'Common daily'},
          {gap:'2%', mult:'2-4x',  when:'Results, global cues'},
          {gap:'3%', mult:'3-6x',  when:'RBI, budget'},
          {gap:'5%', mult:'5-10x', when:'Black swan'},
          {gap:'8%+',mult:'8x+',   when:'Circuit events'},
        ].map(r => (
          <div key={r.gap} className="ref-mini-trow-3">
            <span style={{color:'var(--loss)',fontWeight:600}}>{r.gap}</span>
            <span style={{color:'var(--pre)'}}>{r.mult}</span>
            <span style={{fontSize:12,color:'var(--text3)'}}>{r.when}</span>
          </div>
        ))}
      </div>
      <div className="ref-gap-actions">
        <div className="ref-gap-action">Before RBI / Budget / Results: cut overnight size by 50%+</div>
        <div className="ref-gap-action">On event days: close all intraday positions before market close</div>
      </div>
    </div>
  );
}

function TodayPlaybook() {
  const t = getTodayInfo();
  let marketType, strategy, tips;
  if (t.isMarketHoliday) {
    marketType = 'Market Holiday'; strategy = 'No trading today';
    tips = [t.holidayName || 'Market closed', 'Use today to review open positions', 'Plan entries for next trading day', 'No SL orders needed'];
  } else if (t.riskLevel === 'EXTREME') {
    marketType = 'Monthly Expiry Day'; strategy = 'High gamma risk, exits before close';
    tips = ['Maximum gamma risk  -  premiums move faster', 'OTM options can go to zero rapidly', 'Wide bid-ask spreads common near close', 'Volume-weighted pricing often skewed near 3:20 PM'];
  } else if (t.riskLevel === 'HIGH') {
    marketType = 'Weekly Expiry Day'; strategy = 'Fastest theta decay of the week';
    tips = ['Theta decay is fastest today', 'Avoid buying after 2 PM', 'OTM selling works if trend is clear', 'Roll or close by 3:20 PM'];
  } else if (t.riskLevel === 'ELEVATED') {
    marketType = 'Expiry Week'; strategy = 'Time decay accelerating this week';
    tips = ['Decay accelerating this week', 'Selling strategies have statistical edge', 'Keep position sizes moderate', `${t.daysToExpiry} days to expiry`];
  } else {
    marketType = 'Normal Trading Day'; strategy = 'No structural bias from expiry';
    tips = ['No major expiry pressure', 'Both buying and selling viable', 'Follow your system rules', 'Standard position sizing'];
  }

  const riskColor = { EXTREME:'#FF4455', HIGH:'#FF4455', ELEVATED:'#F59E0B', NORMAL:'#00C896', HOLIDAY:'#A78BFA' }[t.riskLevel];

  return (
    <div className="ref-panel ref-playbook">
      <div className="ref-panel-hdr">
        <div className="ref-panel-title">Today's Playbook</div>
        <div className="ref-panel-sub">Rule-based</div>
      </div>
      <div className="ref-playbook-grid">
        <div className="ref-playbook-row">
          <span className="ref-playbook-lbl">Market type</span>
          <span className="ref-playbook-val">{marketType}</span>
        </div>
        <div className="ref-playbook-row">
          <span className="ref-playbook-lbl">Context</span>
          <span className="ref-playbook-val" style={{color:'var(--text2)'}}>{strategy}</span>
        </div>
        <div className="ref-playbook-row">
          <span className="ref-playbook-lbl">Risk level</span>
          <span className="ref-playbook-val" style={{color:riskColor,fontWeight:700}}>{t.riskLevel}</span>
        </div>
      </div>
      <div className="ref-playbook-tips">
        {tips.map((tip, i) => (
          <div key={i} className="ref-playbook-tip">
            <span style={{color:riskColor}}>→</span> {tip}
          </div>
        ))}
      </div>
      <div className="ref-playbook-disclaimer">
        Educational context only. Not investment advice. Always apply your own judgment.
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ReferencePage() {
  return (
    <div className="ref-page">
      <TodayBar />
      <div className="ref-main-grid">
        <div className="ref-col ref-col-left">
          <ThetaPanel />
          <IVPanel />
          <GapRiskReference />
        </div>
        <div className="ref-col ref-col-center">
          <ExpiryCalendar />
          <HolidayCalendar />
          <CheatSheets />
        </div>
        <div className="ref-col ref-col-right">
          <TodayPlaybook />
          <LotSizePanel />
        </div>
      </div>
    </div>
  );
}
