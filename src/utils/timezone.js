// src/utils/timezone.js

function getLocalDate(tz) {
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

export function isMarketOpen(market) {
  const d   = getLocalDate(market.tz);
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const mins  = d.getHours() * 60 + d.getMinutes();
  const open  = market.open[0]  * 60 + market.open[1];
  const close = market.close[0] * 60 + market.close[1];
  if (market.lunch) {
    const lb = market.lunch[0][0] * 60 + market.lunch[0][1];
    const le = market.lunch[1][0] * 60 + market.lunch[1][1];
    if (mins >= lb && mins < le) return false;
  }
  return mins >= open && mins < close;
}

export function isPreOpen(market) {
  const d    = getLocalDate(market.tz);
  const day  = d.getDay();
  if (day === 0 || day === 6) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  const open = market.open[0] * 60 + market.open[1];
  return mins >= open - 60 && mins < open;
}

export function getStatus(market) {
  if (market.simulation) return isMarketOpen(market) ? 'live' : 'closed';
  if (isMarketOpen(market)) return 'live';
  if (isPreOpen(market))    return 'pre';
  return 'closed';
}

export function getLocalTime(tz) {
  const d = getLocalDate(tz);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function getIndiaMarketStatus() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const h = ist.getHours(), m = ist.getMinutes(), s = ist.getSeconds();
  const totalMins = h * 60 + m;
  const OPEN_MINS  = 9 * 60 + 15;
  const CLOSE_MINS = 15 * 60 + 30;

  if (day === 0 || day === 6) {
    const daysToMonday = day === 0 ? 1 : 2;
    const secsToMonday = daysToMonday * 24 * 3600 - (h * 3600 + m * 60 + s) + OPEN_MINS * 60;
    return { status: 'weekend', secondsLeft: secsToMonday, label: 'Weekend' };
  }
  if (totalMins >= OPEN_MINS && totalMins < CLOSE_MINS) {
    const secsLeft  = (CLOSE_MINS - totalMins) * 60 - s;
    const secsTotal = (CLOSE_MINS - OPEN_MINS) * 60;
    return { status: 'open', secondsLeft: secsLeft, secsTotal, label: 'MARKET OPEN' };
  }
  if (totalMins < OPEN_MINS) {
    const secsLeft  = (OPEN_MINS - totalMins) * 60 - s;
    const secsTotal = OPEN_MINS * 60;
    return { status: 'pre', secondsLeft: secsLeft, secsTotal, label: 'Opens in' };
  }
  const minsToMidnight = 24 * 60 - totalMins;
  const daysAhead = day === 5 ? 3 : 1;
  const secsLeft  = (minsToMidnight + (daysAhead - 1) * 24 * 60 + OPEN_MINS) * 60 - s;
  return { status: 'closed', secondsLeft: secsLeft, label: 'Closed' };
}

export function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ── Expiry calculations ──────────────────────────────────────────────

function toISTDateStr(d) {
  // toISOString() gives UTC which can be wrong date for IST (+5:30)
  // Use toLocaleDateString with IST timezone to get correct YYYY-MM-DD
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD
}

function adjustExpiry(date, holidaySet) {
  const d = new Date(date);
  while (true) {
    const day = d.getDay();
    const iso = toISTDateStr(d);
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) break;
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// Nifty 50:  weekly = Tuesday,  monthly = last Thursday of month
// Sensex:    weekly = Thursday, monthly = last Thursday of month
// If expiry falls on holiday → shift to previous trading day
export function getNiftyExpiries(holidays = []) {
  const holidaySet = new Set(holidays);
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const alreadyExpiredToday = (ist.getHours() * 60 + ist.getMinutes()) >= 15 * 60 + 30;

  function nextWeekday(targetDay) {
    const d = new Date(ist);
    const day = d.getDay();
    let daysUntil = (targetDay - day + 7) % 7;
    if (daysUntil === 0 && alreadyExpiredToday) daysUntil = 7;
    if (daysUntil === 0) daysUntil = 0;
    d.setDate(d.getDate() + daysUntil);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  function lastThursdayOfMonth(year, month) {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  function getMonthly() {
    let d = lastThursdayOfMonth(ist.getFullYear(), ist.getMonth());
    d = adjustExpiry(d, holidaySet);
    if (d <= now) {
      const nm = ist.getMonth() === 11 ? 0 : ist.getMonth() + 1;
      const ny = ist.getMonth() === 11 ? ist.getFullYear() + 1 : ist.getFullYear();
      d = lastThursdayOfMonth(ny, nm);
      d = adjustExpiry(d, holidaySet);
    }
    return d;
  }

  const niftyWeekly   = adjustExpiry(nextWeekday(2), holidaySet); // Tuesday
  const niftyMonthly  = getMonthly();
  const sensexWeekly  = adjustExpiry(nextWeekday(4), holidaySet); // Thursday
  const sensexMonthly = getMonthly(); // same as Nifty monthly

  const secsLeft = d => Math.max(0, Math.floor((d - now) / 1000));
  const fmtDate  = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Asia/Kolkata' });

  return {
    niftyWeekly:   { date: fmtDate(niftyWeekly),   secsLeft: secsLeft(niftyWeekly)   },
    niftyMonthly:  { date: fmtDate(niftyMonthly),  secsLeft: secsLeft(niftyMonthly)  },
    sensexWeekly:  { date: fmtDate(sensexWeekly),  secsLeft: secsLeft(sensexWeekly)  },
    sensexMonthly: { date: fmtDate(sensexMonthly), secsLeft: secsLeft(sensexMonthly) },
  };
}

// ── Market hours tooltip ─────────────────────────────────────────────

export function getMarketHoursLabel(market) {
  const pad = n => String(n).padStart(2, '0');
  const o = market.open, c = market.close;
  const tz = market.tz || '';

  const TZ_SHORT = {
    'Asia/Kolkata': 'IST', 'America/New_York': 'ET', 'Europe/London': 'GMT',
    'Europe/Berlin': 'CET', 'Europe/Paris': 'CET', 'Europe/Amsterdam': 'CET',
    'Asia/Tokyo': 'JST', 'Asia/Hong_Kong': 'HKT', 'Asia/Shanghai': 'CST',
    'Asia/Seoul': 'KST', 'Australia/Sydney': 'AEDT', 'Asia/Singapore': 'SGT',
    'Asia/Taipei': 'CST', 'Asia/Jakarta': 'WIB', 'America/Toronto': 'ET',
    'America/Sao_Paulo': 'BRT', 'Asia/Riyadh': '+03', 'Asia/Dubai': 'GST',
    'Africa/Johannesburg': 'SAST', 'Africa/Lagos': 'WAT', 'Africa/Cairo': 'EET',
    'Asia/Jerusalem': '+02', 'Africa/Casablanca': 'WET', 'Asia/Kuwait': '+03',
    'Asia/Qatar': '+03',
  };

  const TZ_OFFSET = {
    'Asia/Kolkata': 330, 'America/New_York': -300, 'Europe/London': 0,
    'Europe/Berlin': 60, 'Europe/Paris': 60, 'Europe/Amsterdam': 60,
    'Asia/Tokyo': 540, 'Asia/Hong_Kong': 480, 'Asia/Shanghai': 480,
    'Asia/Seoul': 540, 'Australia/Sydney': 600, 'Asia/Singapore': 480,
    'Asia/Taipei': 480, 'Asia/Jakarta': 420, 'America/Toronto': -300,
    'America/Sao_Paulo': -180, 'Asia/Riyadh': 180, 'Asia/Dubai': 240,
    'Africa/Johannesburg': 120, 'Africa/Lagos': 60, 'Africa/Cairo': 120,
    'Asia/Jerusalem': 120, 'Africa/Casablanca': 0, 'Asia/Kuwait': 180,
    'Asia/Qatar': 180,
  };

  const label    = TZ_SHORT[tz] || tz.split('/').pop();
  const localStr = `${pad(o[0])}:${pad(o[1])} – ${pad(c[0])}:${pad(c[1])} ${label}`;

  if (tz === 'Asia/Kolkata') return { local: localStr, ist: null };

  const IST_OFFSET = 330;
  const srcOffset  = TZ_OFFSET[tz] ?? 0;
  const diff       = IST_OFFSET - srcOffset;

  const toIST = (h, m) => {
    const total   = h * 60 + m + diff;
    const wrapped = ((total % 1440) + 1440) % 1440;
    return [Math.floor(wrapped / 60), wrapped % 60];
  };

  const [oh, om] = toIST(o[0], o[1]);
  const [ch, cm] = toIST(c[0], c[1]);
  return { local: localStr, ist: `${pad(oh)}:${pad(om)} – ${pad(ch)}:${pad(cm)} IST` };
}
