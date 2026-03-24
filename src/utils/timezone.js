// src/utils/timezone.js

// Get current Date object in a specific timezone
export function getLocalDate(tz) {
  return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
}

// Check if a market is currently open
export function isMarketOpen(market) {
  const d = getLocalDate(market.tz);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  const mins = d.getHours() * 60 + d.getMinutes();
  const open = market.open[0] * 60 + market.open[1];
  const close = market.close[0] * 60 + market.close[1];

  // Handle markets that close "next day" (like 24h futures — close < open)
  let inSession;
  if (close < open) {
    inSession = mins >= open || mins < close;
  } else {
    inSession = mins >= open && mins < close;
  }

  if (!inSession) return false;

  // Check lunch break
  if (market.lunch) {
    const lunchStart = market.lunch[0][0] * 60 + market.lunch[0][1];
    const lunchEnd = market.lunch[1][0] * 60 + market.lunch[1][1];
    if (mins >= lunchStart && mins < lunchEnd) return false;
  }

  return true;
}

// Check if a market is in pre-open session (within 90 mins of open)
export function isPreOpen(market) {
  const d = getLocalDate(market.tz);
  const day = d.getDay();
  if (day === 0 || day === 6) return false;

  const mins = d.getHours() * 60 + d.getMinutes();
  const open = market.open[0] * 60 + market.open[1];
  const close = market.close[0] * 60 + market.close[1];

  return mins >= open - 90 && mins < open && mins < close;
}

// Get market status: 'live' | 'pre' | 'closed'
export function getStatus(market) {
  if (isMarketOpen(market)) return 'live';
  if (isPreOpen(market)) return 'pre';
  return 'closed';
}

// Get formatted local time for a timezone
export function getLocalTime(tz, opts = {}) {
  return new Date().toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: opts.seconds ? '2-digit' : undefined,
    hour12: false,
    ...opts,
  });
}

// Seconds until India market opens (NSE 9:15 AM IST)
// Returns { open: bool, secondsLeft: number, secondsTotal: number, label: string }
export function getIndiaMarketStatus() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const h = ist.getHours(), m = ist.getMinutes(), s = ist.getSeconds();
  const totalMins = h * 60 + m;

  const OPEN_MINS = 9 * 60 + 15;
  const CLOSE_MINS = 15 * 60 + 30;

  if (day === 0 || day === 6) {
    // Weekend — show time to Monday open
    const daysToMonday = day === 0 ? 1 : 2;
    const secsToMonday = daysToMonday * 24 * 3600 - (h * 3600 + m * 60 + s) + OPEN_MINS * 60;
    return { status: 'weekend', secondsLeft: secsToMonday, label: 'Weekend' };
  }

  if (totalMins >= OPEN_MINS && totalMins < CLOSE_MINS) {
    // Market is OPEN — seconds until close
    const secsLeft = (CLOSE_MINS - totalMins) * 60 - s;
    const secsTotal = (CLOSE_MINS - OPEN_MINS) * 60;
    return { status: 'open', secondsLeft: secsLeft, secsTotal, label: 'MARKET OPEN' };
  }

  if (totalMins < OPEN_MINS) {
    // Before open today
    const secsLeft = (OPEN_MINS - totalMins) * 60 - s;
    const secsTotal = OPEN_MINS * 60;
    return { status: 'pre', secondsLeft: secsLeft, secsTotal, label: 'Opens in' };
  }

  // After close — find seconds to next open
  // If Mon–Thu: next day open
  // If Fri: Monday open
  const minsToMidnight = 24 * 60 - totalMins;
  const daysAhead = day === 5 ? 3 : 1; // Friday → Monday = 3 days
  const secsLeft = (minsToMidnight + (daysAhead - 1) * 24 * 60 + OPEN_MINS) * 60 - s;
  return { status: 'closed', secondsLeft: secsLeft, label: 'Closed' };
}

export function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Returns human-readable market hours string e.g. "9:15 – 15:30 IST"
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

  // UTC offsets in minutes for each timezone (standard time, approximate)
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

  const label = TZ_SHORT[tz] || tz.split('/').pop();
  const localStr = `${pad(o[0])}:${pad(o[1])} – ${pad(c[0])}:${pad(c[1])} ${label}`;

  // Skip IST conversion for Indian markets
  if (tz === 'Asia/Kolkata') return { local: localStr, ist: null };

  // Convert open/close to IST
  const IST_OFFSET = 330;
  const srcOffset = TZ_OFFSET[tz] ?? 0;
  const diff = IST_OFFSET - srcOffset; // minutes to add to get IST

  const toIST = (h, m) => {
    const total = h * 60 + m + diff;
    const wrapped = ((total % 1440) + 1440) % 1440;
    return [Math.floor(wrapped / 60), wrapped % 60];
  };

  const [oh, om] = toIST(o[0], o[1]);
  const [ch, cm] = toIST(c[0], c[1]);
  const istStr = `${pad(oh)}:${pad(om)} – ${pad(ch)}:${pad(cm)} IST`;

  return { local: localStr, ist: istStr };
}

// Adjust expiry: if it falls on a holiday or weekend, move to previous trading day
function adjustExpiry(date, holidaySet) {
  const d = new Date(date);
  while (true) {
    const day  = d.getDay();
    const iso  = d.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) break;
    d.setDate(d.getDate() - 1);
  }
  return d;
}

// Nifty 50:  weekly = Tuesday,     monthly = last Monday of month
// Sensex:    weekly = Thursday,    monthly = last Thursday of month
// If expiry day is a holiday → shift to previous trading day
export function getNiftyExpiries(holidays = []) {
  const holidaySet = new Set(holidays);
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  const pad = n => String(n).padStart(2, '0');
  const alreadyExpiredToday = (ist.getHours() * 60 + ist.getMinutes()) >= 15 * 60 + 30;

  function nextWeekday(from, targetDay) {
    // targetDay: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
    const d = new Date(from);
    const day = d.getDay();
    let daysUntil = (targetDay - day + 7) % 7;
    // If today is the target day but market already closed, go to next week
    if (daysUntil === 0 && alreadyExpiredToday) daysUntil = 7;
    if (daysUntil === 0) daysUntil = 0; // today, not closed yet
    d.setDate(d.getDate() + daysUntil);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  function lastWeekdayOfMonth(year, month, targetDay) {
    const d = new Date(year, month + 1, 0); // last day of month
    while (d.getDay() !== targetDay) d.setDate(d.getDate() - 1);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  // ── Nifty 50 ────────────────────────────────────────────────────────
  // Weekly: Tuesday
  let niftyWeekly = nextWeekday(ist, 2);
  niftyWeekly = adjustExpiry(niftyWeekly, holidaySet);

  // Monthly: last Thursday of month
  let niftyMonthly = lastWeekdayOfMonth(ist.getFullYear(), ist.getMonth(), 4);
  if (niftyMonthly <= now) {
    niftyMonthly = ist.getMonth() === 11
      ? lastWeekdayOfMonth(ist.getFullYear() + 1, 0, 4)
      : lastWeekdayOfMonth(ist.getFullYear(), ist.getMonth() + 1, 4);
  }
  niftyMonthly = adjustExpiry(niftyMonthly, holidaySet);

  // ── Sensex ───────────────────────────────────────────────────────────
  // Weekly: Thursday
  let sensexWeekly = nextWeekday(ist, 4);
  sensexWeekly = adjustExpiry(sensexWeekly, holidaySet);

  // Monthly: last Thursday of month (same as Nifty)
  let sensexMonthly = lastWeekdayOfMonth(ist.getFullYear(), ist.getMonth(), 4);
  if (sensexMonthly <= now) {
    sensexMonthly = ist.getMonth() === 11
      ? lastWeekdayOfMonth(ist.getFullYear() + 1, 0, 4)
      : lastWeekdayOfMonth(ist.getFullYear(), ist.getMonth() + 1, 4);
  }
  sensexMonthly = adjustExpiry(sensexMonthly, holidaySet);

  const secsLeft   = d => Math.max(0, Math.floor((d - now) / 1000));
  const fmtDate    = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Asia/Kolkata' });

  return {
    niftyWeekly:   { date: fmtDate(niftyWeekly),   secsLeft: secsLeft(niftyWeekly)   },
    niftyMonthly:  { date: fmtDate(niftyMonthly),  secsLeft: secsLeft(niftyMonthly)  },
    sensexWeekly:  { date: fmtDate(sensexWeekly),  secsLeft: secsLeft(sensexWeekly)  },
    sensexMonthly: { date: fmtDate(sensexMonthly), secsLeft: secsLeft(sensexMonthly) },
  };
}

// Returns human-readable market hours string e.g. "9:15 – 15:30 IST"
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

  // UTC offsets in minutes for each timezone (standard time, approximate)
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

  const label = TZ_SHORT[tz] || tz.split('/').pop();
  const localStr = `${pad(o[0])}:${pad(o[1])} – ${pad(c[0])}:${pad(c[1])} ${label}`;

  // Skip IST conversion for Indian markets
  if (tz === 'Asia/Kolkata') return { local: localStr, ist: null };

  // Convert open/close to IST
  const IST_OFFSET = 330;
  const srcOffset = TZ_OFFSET[tz] ?? 0;
  const diff = IST_OFFSET - srcOffset; // minutes to add to get IST

  const toIST = (h, m) => {
    const total = h * 60 + m + diff;
    const wrapped = ((total % 1440) + 1440) % 1440;
    return [Math.floor(wrapped / 60), wrapped % 60];
  };

  const [oh, om] = toIST(o[0], o[1]);
  const [ch, cm] = toIST(c[0], c[1]);
  const istStr = `${pad(oh)}:${pad(om)} – ${pad(ch)}:${pad(cm)} IST`;

  return { local: localStr, ist: istStr };
}

// Returns next weekly and monthly Nifty F&O expiry dates
// Weekly = every Thursday, Monthly = last Thursday of month
export function getNiftyExpiries() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  function nextTuesday(from) {
    const d = new Date(from);
    const day = d.getDay();
    const daysUntil = (2 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntil);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  function nextFriday(from) {
    const d = new Date(from);
    const day = d.getDay();
    const daysUntil = (5 - day + 7) % 7 || 7; // 5 = Friday
    d.setDate(d.getDate() + daysUntil);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  function lastFridayOfMonth(year, month) {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  function lastThursdayOfMonth(year, month) {
    const d = new Date(year, month + 1, 0); // last day of month
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    d.setHours(15, 30, 0, 0);
    return d;
  }

  // Weekly — next Tuesday (Nifty weekly expiry)
  let weekly = nextTuesday(ist);
  if (ist.getDay() === 2 && (ist.getHours() * 60 + ist.getMinutes()) < 15 * 60 + 30) {
    weekly = new Date(ist);
    weekly.setHours(15, 30, 0, 0);
  }

  // Sensex weekly — next Friday
  let sensexWeekly = nextFriday(ist);
  if (ist.getDay() === 5 && (ist.getHours() * 60 + ist.getMinutes()) < 15 * 60 + 30) {
    sensexWeekly = new Date(ist);
    sensexWeekly.setHours(15, 30, 0, 0);
  }

  // Sensex monthly — last Friday of month
  let sensexMonthly = lastFridayOfMonth(ist.getFullYear(), ist.getMonth());
  if (sensexMonthly <= ist) {
    sensexMonthly = ist.getMonth() === 11
      ? lastFridayOfMonth(ist.getFullYear() + 1, 0)
      : lastFridayOfMonth(ist.getFullYear(), ist.getMonth() + 1);
  }

  const secsToSensexWeekly  = Math.max(0, Math.floor((sensexWeekly  - now) / 1000));
  const secsToSensexMonthly = Math.max(0, Math.floor((sensexMonthly - now) / 1000));
  let monthly = lastThursdayOfMonth(ist.getFullYear(), ist.getMonth());
  if (monthly <= ist) {
    monthly = ist.getMonth() === 11
      ? lastThursdayOfMonth(ist.getFullYear() + 1, 0)
      : lastThursdayOfMonth(ist.getFullYear(), ist.getMonth() + 1);
  }

  const secsToWeekly  = Math.max(0, Math.floor((weekly  - now) / 1000));
  const secsToMonthly = Math.max(0, Math.floor((monthly - now) / 1000));

  const fmtDate = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  const fmtDays = s => {
    const days = Math.floor(s / 86400);
    const hrs  = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}d ${String(hrs).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m`;
    return `${String(hrs).padStart(2,'0')}h ${String(mins).padStart(2,'0')}m`;
  };

  return {
    weekly:        { date: fmtDate(weekly),        secsLeft: secsToWeekly,        label: fmtDays(secsToWeekly)        },
    monthly:       { date: fmtDate(monthly),       secsLeft: secsToMonthly,       label: fmtDays(secsToMonthly)       },
    sensexWeekly:  { date: fmtDate(sensexWeekly),  secsLeft: secsToSensexWeekly,  label: fmtDays(secsToSensexWeekly)  },
    sensexMonthly: { date: fmtDate(sensexMonthly), secsLeft: secsToSensexMonthly, label: fmtDays(secsToSensexMonthly) },
  };
}
