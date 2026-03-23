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
