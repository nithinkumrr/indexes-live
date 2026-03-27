// api/backtest.js — Options Strategy Backtester
// Uses NSE bhav copy data for real entry/exit prices
// Entry = closing price on trade date (EOD, what you see before placing the trade)
// Exit  = official NSE settlement price on expiry day

import { kv } from '@vercel/kv';

// ── Black-Scholes (fallback when real data unavailable) ───────────────────────
function normCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x > 0 ? 1 - p : p;
}
function blackScholes(S, K, T, r, sigma, type) {
  if (T <= 0) return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === 'call') return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
}
function bsPrice(spot, strike, dteYears, vix, type) {
  return Math.max(0.05, blackScholes(spot, strike, Math.max(0.0001, dteYears), vix / 100, 0.065, type));
}

// ── Index config ──────────────────────────────────────────────────────────────
const STRIKE_STEPS = { NIFTY: 50, BANKNIFTY: 100, FINNIFTY: 50, MIDCPNIFTY: 25 };
const LOT_SIZES    = { NIFTY: 65, BANKNIFTY: 30,  FINNIFTY: 60, MIDCPNIFTY: 120 };

// ── Expiry schedule — complete accurate history ───────────────────────────────
// Sources: NSE circulars
//
// NIFTY weekly:
//   Before Sep 2025: Thursday
//   Sep 2025 onwards: Tuesday
//
// NIFTY monthly:
//   Before Sep 2025: last Thursday
//   Sep 2025 onwards: last Tuesday
//
// BANKNIFTY weekly:
//   Before Sep 2023: Thursday
//   Sep 2023 to Oct 2024: Wednesday
//   Nov 2024 onwards: DISCONTINUED (no weekly)
//
// BANKNIFTY monthly:
//   Before Sep 2023: last Thursday
//   Sep 2023 to Jan 2025: last Wednesday
//   Jan 2025 to Sep 2025: last Thursday (shifted back)
//   Sep 2025 onwards: last Tuesday
//
// FINNIFTY weekly:
//   Before Nov 2024: Tuesday
//   Nov 2024 onwards: DISCONTINUED (no weekly)
//
// FINNIFTY monthly:
//   All dates: Tuesday (last Tuesday of month)
//   Sep 2025 onwards: Tuesday (no change)
//
// MIDCPNIFTY weekly:
//   Before Nov 2024: Monday
//   Nov 2024 onwards: DISCONTINUED (no weekly)
//
// MIDCPNIFTY monthly:
//   All dates: Monday (last Monday of month)
//   Sep 2025 onwards: Tuesday

function getExpiryDow(index, dateStr, expiryType) {
  const isMonthly = expiryType === 'monthly';

  if (index === 'NIFTY') {
    // Weekly and monthly both Thursday → Tuesday from Sep 2025
    return dateStr >= '2025-09-01' ? 2 : 4;
  }

  if (index === 'BANKNIFTY') {
    if (isMonthly) {
      if (dateStr >= '2025-09-01') return 2;      // Tuesday
      if (dateStr >= '2025-01-01') return 4;      // Thursday (shifted back Jan 2025)
      if (dateStr >= '2023-09-01') return 3;      // Wednesday
      return 4;                                    // Thursday
    } else {
      // Weekly
      if (dateStr >= '2024-11-01') return null;   // DISCONTINUED
      if (dateStr >= '2023-09-01') return 3;      // Wednesday
      return 4;                                    // Thursday
    }
  }

  if (index === 'FINNIFTY') {
    if (isMonthly) return 2;                       // Always Tuesday
    return dateStr >= '2024-11-01' ? null : 2;    // Weekly discontinued Nov 2024
  }

  if (index === 'MIDCPNIFTY') {
    if (isMonthly) {
      return dateStr >= '2025-09-01' ? 2 : 1;    // Tuesday from Sep 2025, else Monday
    }
    return dateStr >= '2024-11-01' ? null : 1;   // Weekly discontinued Nov 2024
  }

  return 4; // default Thursday
}

// Get next expiry date from a given date
function getNextExpiry(fromDate, index, expiryType) {
  const dow = getExpiryDow(index, fromDate, expiryType);
  if (dow === null) return null; // no weekly for this index at this date

  const d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);

  if (expiryType === 'monthly') {
    // Find last occurrence of this DOW in the same month
    const month = d.getMonth();
    let last = new Date(d);
    while (true) {
      const next = new Date(last);
      next.setDate(next.getDate() + 7);
      if (next.getMonth() !== month) break;
      last = next;
    }
    return last.toISOString().slice(0, 10);
  }

  return d.toISOString().slice(0, 10);
}

// Get ATM strike rounded to correct step
function getATM(spot, index) {
  const step = STRIKE_STEPS[index] || 50;
  return Math.round(spot / step) * step;
}

// ── Historical price data ─────────────────────────────────────────────────────
async function getHistoricalData(index, fromYear, toYear) {
  const cacheKey = `bt:hist:${index}:${fromYear}:${toYear}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (_) {}

  const KITE_TOKENS = { NIFTY: 256265, BANKNIFTY: 260105, FINNIFTY: 257801, MIDCPNIFTY: 288009 };
  const YAHOO_SYMBOLS = { NIFTY: '%5ENSEI', BANKNIFTY: '%5ENSEBANK', FINNIFTY: '%5EFINNNIFTY', MIDCPNIFTY: '%5ENIFMDCP100' };

  let data = [];

  // Try Kite first
  const apiKey = process.env.KITE_API_KEY;
  let kiteToken = null;
  try { kiteToken = await kv.get('kite_token'); } catch (_) {}

  if (kiteToken && apiKey && KITE_TOKENS[index]) {
    try {
      const r = await fetch(
        `https://api.kite.trade/instruments/historical/${KITE_TOKENS[index]}/day?from=${fromYear}-01-01+09:15:00&to=${toYear}-12-31+15:30:00&oi=0`,
        { headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${kiteToken}` } }
      );
      if (r.ok) {
        const json = await r.json();
        const candles = json?.data?.candles || [];
        if (candles.length > 0) {
          data = candles.map(c => ({ date: c[0].slice(0, 10), open: c[1], high: c[2], low: c[3], close: c[4] })).filter(d => d.close);
        }
      }
    } catch (_) {}
  }

  // Yahoo fallback
  if (!data.length && YAHOO_SYMBOLS[index]) {
    try {
      const from = Math.floor(new Date(`${fromYear}-01-01`).getTime() / 1000);
      const to   = Math.floor(new Date(`${toYear}-12-31`).getTime() / 1000);
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${YAHOO_SYMBOLS[index]}?period1=${from}&period2=${to}&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const json = await r.json();
      const result = json?.chart?.result?.[0];
      if (result) {
        const ts = result.timestamp || [];
        const q  = result.indicators?.quote?.[0] || {};
        data = ts.map((t, i) => ({
          date:  new Date(t * 1000).toISOString().slice(0, 10),
          open:  q.open?.[i],
          close: q.close?.[i],
          high:  q.high?.[i],
          low:   q.low?.[i],
        })).filter(d => d.close && d.open);
      }
    } catch (_) {}
  }

  try { await kv.set(cacheKey, JSON.stringify(data), { ex: 7 * 24 * 60 * 60 }); } catch (_) {}
  return data;
}

// ── VIX history ───────────────────────────────────────────────────────────────
async function getVIXHistory(fromYear, toYear) {
  const cacheKey = `bt:vix:${fromYear}:${toYear}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (_) {}

  const vixMap = {};
  try {
    const from = Math.floor(new Date(`${fromYear}-01-01`).getTime() / 1000);
    const to   = Math.floor(new Date(`${toYear}-12-31`).getTime() / 1000);
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?period1=${from}&period2=${to}&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const json = await r.json();
    const result = json?.chart?.result?.[0];
    if (result) {
      const ts     = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      ts.forEach((t, i) => {
        if (closes[i]) vixMap[new Date(t * 1000).toISOString().slice(0, 10)] = closes[i];
      });
    }
  } catch (_) {}

  try { await kv.set(cacheKey, JSON.stringify(vixMap), { ex: 7 * 24 * 60 * 60 }); } catch (_) {}
  return vixMap;
}

// ── Fetch bhav premiums for specific dates + strikes ──────────────────────────
// Only fetches exactly what's needed — fast and targeted
async function fetchBhavPremiums(supabaseUrl, supabaseKey, index, trades) {
  // trades = [{date, expiry, atm, step, strikePct}]
  if (!supabaseUrl || !supabaseKey || !trades.length) return {};

  try {
    // Group by date, collect all strikes needed per date
    const dateMap = {};
    for (const t of trades) {
      if (!dateMap[t.date]) dateMap[t.date] = new Set();
      const offsets = [0, t.step * (t.strikePct + 1), -t.step * (t.strikePct + 1),
                          t.step * (t.strikePct + 2), -t.step * (t.strikePct + 2),
                          t.step * (t.strikePct + 3), -t.step * (t.strikePct + 3)];
      for (const o of offsets) dateMap[t.date].add(t.atm + o);
    }

    const allDates = Object.keys(dateMap);
    const byDate = {};

    // Fetch in batches of 15 dates at a time
    const BATCH = 15;
    for (let i = 0; i < allDates.length; i += BATCH) {
      const batchDates = allDates.slice(i, i + BATCH);

      // Collect all strikes for this batch
      const batchStrikes = new Set();
      for (const d of batchDates) {
        for (const s of dateMap[d]) batchStrikes.add(s);
      }

      const url = `${supabaseUrl}/rest/v1/bhav_options` +
        `?select=date,expiry,strike,type,close,settle` +
        `&symbol=eq.${index}` +
        `&date=in.(${batchDates.join(',')})` +
        `&strike=in.(${[...batchStrikes].join(',')})` +
        `&limit=10000`;

      const r = await fetch(url, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (!r.ok) continue;
      const rows = await r.json();
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const entry = row.close || row.settle;
        const exit  = row.settle || row.close;
        if (!entry) continue;
        if (!byDate[row.date]) byDate[row.date] = {};
        if (!byDate[row.date][row.expiry]) byDate[row.date][row.expiry] = {};
        byDate[row.date][row.expiry][`${Number(row.strike)}${row.type}`] = { entry, exit };
      }
    }

    return byDate;
  } catch (e) {
    console.error('fetchBhavPremiums error:', e.message);
    return {};
  }
}

// ── Get premiums from map for a specific trade ────────────────────────────────
function getPremiumsFromMap(bhavMap, dateStr, expiryStr, atm, step, strikePct) {
  const dateData = bhavMap?.[dateStr];
  if (!dateData) return null;

  // Try the target expiry first, then nearby expiries
  let strikes = dateData[expiryStr];

  // If exact expiry not found, try adjacent expiries (holiday shifts etc)
  if (!strikes) {
    const expiries = Object.keys(dateData).sort();
    const target = new Date(expiryStr).getTime();
    // Find closest expiry within 7 days
    for (const e of expiries) {
      const diff = Math.abs(new Date(e).getTime() - target);
      if (diff <= 7 * 24 * 60 * 60 * 1000) { strikes = dateData[e]; break; }
    }
  }
  if (!strikes) return null;

  const get = (s, t) => strikes[`${s}${t}`]?.entry ?? null;

  const atmC  = get(atm,                        'CE');
  const atmP  = get(atm,                        'PE');
  const otm1C = get(atm + step * (strikePct+1), 'CE');
  const otm1P = get(atm - step * (strikePct+1), 'PE');
  const otm2C = get(atm + step * (strikePct+2), 'CE');
  const otm2P = get(atm - step * (strikePct+2), 'PE');
  const otm3C = get(atm + step * (strikePct+3), 'CE');
  const otm3P = get(atm - step * (strikePct+3), 'PE');

  if (atmC === null && atmP === null) return null;

  return { atmC, atmP, otm1C, otm1P, otm2C, otm2P, otm3C, otm3P, source: 'bhav' };
}

// ── P&L Calculator ────────────────────────────────────────────────────────────
function calcPnl(strategy, entrySpot, exitSpot, vix, dteYears, lots, lotSize, step, atm, strikePct, width, slPct, tpPct, real) {
  const otm1  = step * (strikePct + 1);
  const otm2  = step * (strikePct + width + 1);

  // Entry premiums — real data or Black-Scholes fallback
  const E = (realVal, spot, strike, type) =>
    realVal != null ? realVal : bsPrice(spot, strike, dteYears, vix, type);

  const eAtmC  = E(real?.atmC,  entrySpot, atm,         'call');
  const eAtmP  = E(real?.atmP,  entrySpot, atm,         'put');
  const eOtm1C = E(real?.otm1C, entrySpot, atm + otm1,  'call');
  const eOtm1P = E(real?.otm1P, entrySpot, atm - otm1,  'put');
  const eOtm2C = E(real?.otm2C, entrySpot, atm + otm2,  'call');
  const eOtm2P = E(real?.otm2P, entrySpot, atm - otm2,  'put');
  const eOtm3C = E(real?.otm3C, entrySpot, atm + otm1*2,'call');
  const eOtm3P = E(real?.otm3P, entrySpot, atm - otm1*2,'put');

  // Exit values — intrinsic at expiry settlement
  const xAtmC  = Math.max(0, exitSpot - atm);
  const xAtmP  = Math.max(0, atm - exitSpot);
  const xOtm1C = Math.max(0, exitSpot - (atm + otm1));
  const xOtm1P = Math.max(0, (atm - otm1) - exitSpot);
  const xOtm2C = Math.max(0, exitSpot - (atm + otm2));
  const xOtm2P = Math.max(0, (atm - otm2) - exitSpot);
  const xOtm3C = Math.max(0, exitSpot - (atm + otm1*2));
  const xOtm3P = Math.max(0, (atm - otm1*2) - exitSpot);

  let entry = 0, exit = 0;

  switch (strategy) {
    case 'long_call':   entry = eAtmC;  exit = xAtmC;  break;
    case 'long_put':    entry = eAtmP;  exit = xAtmP;  break;
    case 'short_call':  entry = eAtmC;  exit = xAtmC;  break;
    case 'short_put':   entry = eAtmP;  exit = xAtmP;  break;

    case 'long_straddle':  entry = eAtmC + eAtmP;   exit = xAtmC + xAtmP;   break;
    case 'short_straddle': entry = eAtmC + eAtmP;   exit = xAtmC + xAtmP;   break;
    case 'long_strangle':  entry = eOtm1C + eOtm1P; exit = xOtm1C + xOtm1P; break;
    case 'short_strangle': entry = eOtm1C + eOtm1P; exit = xOtm1C + xOtm1P; break;
    case 'long_guts':      entry = eAtmC + eOtm1P;  exit = xAtmC + xOtm1P;  break;
    case 'short_guts':     entry = eAtmC + eOtm1P;  exit = xAtmC + xOtm1P;  break;

    case 'bull_call_spread': entry = eAtmC - eOtm1C; exit = xAtmC - xOtm1C; break;
    case 'bear_call_spread': entry = eOtm1C - eAtmC; exit = xOtm1C - xAtmC; break;
    case 'bull_put_spread':  entry = eOtm1P - eAtmP; exit = xOtm1P - xAtmP; break;
    case 'bear_put_spread':  entry = eAtmP - eOtm1P; exit = xAtmP - xOtm1P; break;

    case 'short_iron_condor':
      entry = (eOtm1C - eOtm2C) + (eOtm1P - eOtm2P);
      exit  = (xOtm1C - xOtm2C) + (xOtm1P - xOtm2P);
      break;
    case 'long_iron_condor':
      entry = (eOtm2C - eOtm1C) + (eOtm2P - eOtm1P);
      exit  = (xOtm2C - xOtm1C) + (xOtm2P - xOtm1P);
      break;
    case 'short_iron_butterfly':
      entry = eAtmC + eAtmP - eOtm1C - eOtm1P;
      exit  = xAtmC + xAtmP - xOtm1C - xOtm1P;
      break;
    case 'long_iron_butterfly':
      entry = eOtm1C + eOtm1P - eAtmC - eAtmP;
      exit  = xOtm1C + xOtm1P - xAtmC - xAtmP;
      break;

    case 'long_call_butterfly':
      entry = eAtmC - 2*eOtm1C + eOtm2C;
      exit  = xAtmC - 2*xOtm1C + xOtm2C;
      break;
    case 'short_call_butterfly':
      entry = 2*eOtm1C - eAtmC - eOtm2C;
      exit  = 2*xOtm1C - xAtmC - xOtm2C;
      break;
    case 'long_put_butterfly':
      entry = eAtmP - 2*eOtm1P + eOtm2P;
      exit  = xAtmP - 2*xOtm1P + xOtm2P;
      break;
    case 'short_put_butterfly':
      entry = 2*eOtm1P - eAtmP - eOtm2P;
      exit  = 2*xOtm1P - xAtmP - xOtm2P;
      break;

    case 'long_call_condor':
      entry = eAtmC - eOtm1C - eOtm2C + eOtm3C;
      exit  = xAtmC - xOtm1C - xOtm2C + xOtm3C;
      break;
    case 'short_call_condor':
      entry = eOtm1C + eOtm2C - eAtmC - eOtm3C;
      exit  = xOtm1C + xOtm2C - xAtmC - xOtm3C;
      break;
    case 'long_put_condor':
      entry = eAtmP - eOtm1P - eOtm2P + eOtm3P;
      exit  = xAtmP - xOtm1P - xOtm2P + xOtm3P;
      break;
    case 'short_put_condor':
      entry = eOtm1P + eOtm2P - eAtmP - eOtm3P;
      exit  = xOtm1P + xOtm2P - xAtmP - xOtm3P;
      break;

    case 'synthetic_long':  entry = eAtmC - eAtmP; exit = exitSpot - atm; break;
    case 'synthetic_short': entry = eAtmP - eAtmC; exit = atm - exitSpot; break;

    default: entry = eAtmC; exit = xAtmC;
  }

  const isCredit = ['short_call','short_put','short_straddle','short_strangle','short_guts',
    'bear_call_spread','bull_put_spread','short_iron_condor','short_iron_butterfly',
    'short_call_butterfly','short_put_butterfly','short_call_condor','short_put_condor',
    'synthetic_short'].includes(strategy);

  let pnl = (isCredit ? entry - exit : exit - entry) * lots * lotSize;

  // SL/TP (estimated — intraday path unknown)
  if (slPct) pnl = Math.max(pnl, -Math.abs(entry * lots * lotSize * slPct / 100));
  if (tpPct) pnl = Math.min(pnl,  Math.abs(entry * lots * lotSize * tpPct / 100));

  return { pnl, entryPremium: entry, exitPremium: exit };
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'POST only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    strategy,
    index      = 'NIFTY',
    expiry     = 'weekly',
    dte        = 0,
    lots       = 1,
    strikePct  = 0,
    width      = 1,
    fromYear   = 2016,
    toYear     = 2026,
    fromDate   = `${fromYear}-01-01`,
    toDate     = `${toYear}-12-31`,
    slPct      = null,
    tpPct      = null,
  } = body;

  // Extract years for historical data fetch
  const fromYearActual = parseInt(fromDate.slice(0, 4));
  const toYearActual   = parseInt(toDate.slice(0, 4));

  if (!strategy) return res.status(400).json({ error: 'strategy required' });

  const cacheKey = `bt:v17:${strategy}:${index}:${expiry}:${dte}:${lots}:${strikePct}:${width}:${fromDate}:${toDate}:${slPct}:${tpPct}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return res.json({ ...( typeof cached === 'string' ? JSON.parse(cached) : cached ), cached: true });
  } catch (_) {}

  try {
    const [priceData, vixData] = await Promise.all([
      getHistoricalData(index, fromYearActual, toYearActual),
      getVIXHistory(fromYearActual, toYearActual),
    ]);

    if (!priceData?.length) return res.status(400).json({ error: 'No price data available' });

    // Filter to selected date range
    const filteredPriceData = priceData.filter(d => d.date >= fromDate && d.date <= toDate);
    if (!filteredPriceData.length) return res.status(400).json({ error: 'No data for selected date range' });

    const lotSize = LOT_SIZES[index]    || 75;
    const step    = STRIKE_STEPS[index] || 50;

    // Build trade list
    const trades = [];
    const priceByDate = Object.fromEntries(filteredPriceData.map(d => [d.date, d]));

    for (let i = 0; i < filteredPriceData.length; i++) {
      const day = filteredPriceData[i];

      // Get expiry DOW for this date and expiry type
      const dow = getExpiryDow(index, day.date, expiry);

      // Skip if weekly contracts discontinued for this index at this date
      if (dow === null) continue;

      // Only process expiry days
      if (new Date(day.date).getDay() !== dow) continue;

      // For monthly: skip if this is not the last expiry of the month
      if (expiry === 'monthly') {
        const lastExpiry = getNextExpiry(
          new Date(new Date(day.date).getFullYear(), new Date(day.date).getMonth(), 1).toISOString().slice(0, 10),
          index, 'monthly'
        );
        if (day.date !== lastExpiry) continue;
      }

      // Find entry day going back DTE trading days
      const entryIdx = i - dte;
      if (entryIdx < 0) continue;
      const entryDay = filteredPriceData[entryIdx];
      if (!entryDay) continue;

      const entrySpot = entryDay.close || entryDay.open;
      const exitSpot  = day.close;
      if (!entrySpot || !exitSpot) continue;

      const atm = getATM(entrySpot, index);

      trades.push({
        date:       entryDay.date,
        expiryDate: day.date,
        entrySpot,
        exitSpot,
        atm,
        step,
        strikePct,
        vix:      vixData[entryDay.date] || 15,
        dteYears: Math.max(dte / 365, 0.001),
      });
    }

    if (!trades.length) return res.status(400).json({ error: 'No trades found for this period' });

    // Fetch real bhav premiums for all trade dates
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const bhavMap = await fetchBhavPremiums(supabaseUrl, supabaseKey, index, trades);

    // Calculate P&L for each trade
    const daily = [];
    for (const t of trades) {
      const real = getPremiumsFromMap(bhavMap, t.date, t.expiryDate, t.atm, t.step, t.strikePct);

      const { pnl, entryPremium, exitPremium } = calcPnl(
        strategy, t.entrySpot, t.exitSpot, t.vix, t.dteYears,
        lots, lotSize, t.step, t.atm, t.strikePct, width, slPct, tpPct, real
      );

      daily.push({
        date:         t.date,
        expiryDate:   t.expiryDate,
        pnl,
        entryPremium,
        exitPremium,
        spot:         t.entrySpot,
        exitSpot:     t.exitSpot,
        vix:          t.vix,
        dte,
        source:       real ? 'bhav' : 'bs',
      });
    }

    // Stats
    const pnls    = daily.map(d => d.pnl);
    const wins    = daily.filter(d => d.pnl >= 0);
    const losses  = daily.filter(d => d.pnl < 0);
    const totalPnl = pnls.reduce((s, p) => s + p, 0);
    const winRate  = (wins.length / pnls.length) * 100;
    const avgPnl   = totalPnl / pnls.length;

    let peak = 0, drawdown = 0, cumPnl = 0;
    for (const p of pnls) {
      cumPnl += p;
      if (cumPnl > peak) peak = cumPnl;
      if (cumPnl - peak < drawdown) drawdown = cumPnl - peak;
    }

    let maxWs = 0, maxLs = 0, curW = 0, curL = 0;
    for (const p of pnls) {
      if (p >= 0) { curW++; curL = 0; if (curW > maxWs) maxWs = curW; }
      else        { curL++; curW = 0; if (curL > maxLs) maxLs = curL; }
    }

    const avgWin       = wins.length   ? wins.reduce((s,d) => s+d.pnl, 0)   / wins.length   : 0;
    const avgLoss      = losses.length ? losses.reduce((s,d) => s+d.pnl, 0) / losses.length : 0;
    const grossWin     = wins.reduce((s,d) => s+d.pnl, 0);
    const grossLoss    = Math.abs(losses.reduce((s,d) => s+d.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

    const variance = pnls.reduce((s, p) => s + (p - avgPnl) ** 2, 0) / pnls.length;
    const sharpe   = Math.sqrt(variance) > 0 ? (avgPnl / Math.sqrt(variance)) * Math.sqrt(52) : 0;

    const bhavDays = daily.filter(d => d.source === 'bhav').length;

    const result = {
      daily,
      dataSource:   bhavDays > daily.length * 0.3 ? 'nse_bhav' : 'black_scholes',
      bhavCoverage: Math.round(bhavDays / daily.length * 100),
      stats: {
        totalPnl, avgPnl, winRate,
        totalTrades: pnls.length,
        wins: wins.length,
        losses: losses.length,
        avgWin, avgLoss,
        bestTrade:  Math.max(...pnls),
        worstTrade: Math.min(...pnls),
        maxDrawdown: drawdown,
        profitFactor, sharpe,
        winStreak:   maxWs,
        lossStreak:  maxLs,
        expectancy:  (winRate/100) * avgWin + (1 - winRate/100) * avgLoss,
      },
    };

    try { await kv.set(cacheKey, JSON.stringify(result), { ex: 12 * 60 * 60 }); } catch (_) {}
    return res.json(result);

  } catch (e) {
    console.error('Backtest error:', e);
    return res.status(500).json({ error: e.message });
  }
}
