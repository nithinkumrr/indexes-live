// api/backtest.js
// Options strategy backtester using NSE historical data + Black-Scholes
// Supports 28 strategies across Nifty, Bank Nifty, Sensex

import { kv } from '@vercel/kv';

// ── Black-Scholes ─────────────────────────────────────────────────────────────
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

function getPremium(spot, strike, dteYears, vix, type) {
  const sigma = vix / 100;
  const r = 0.065; // Indian risk-free rate ~6.5%
  return Math.max(0.05, blackScholes(spot, strike, dteYears, r, sigma, type));
}

// ── Strike step sizes ────────────────────────────────────────────────────────
const STRIKE_STEPS = {
  NIFTY:      50,
  BANKNIFTY:  100,
  FINNIFTY:   50,
  MIDCPNIFTY: 25,
  NIFTYNXT50: 50,
  SENSEX:     100,
  BANKEX:     100,
  SENSEX50:   100,
};
const LOT_SIZES = {
  NIFTY:      65,   // Nifty 50
  BANKNIFTY:  30,   // Nifty Bank
  FINNIFTY:   60,   // Nifty Financial Services
  MIDCPNIFTY: 120,  // Nifty Midcap Select
  NIFTYNXT50: 25,   // Nifty Next 50
  SENSEX:     20,   // BSE Sensex
  BANKEX:     30,   // BSE Bankex
  SENSEX50:   75,   // BSE Sensex 50
};

function getATMStrike(spot, index) {
  const step = STRIKE_STEPS[index] || 50;
  return Math.round(spot / step) * step;
}

function getStrike(spot, index, offset, direction = 'up') {
  const atm  = getATMStrike(spot, index);
  const step = STRIKE_STEPS[index] || 50;
  return direction === 'up' ? atm + offset * step : atm - offset * step;
}

// ── Fetch historical data — Kite first, Yahoo fallback ───────────────────────
async function getHistoricalData(index, fromYear, toYear) {
  const cacheKey = `bt:hist3:${index}:${fromYear}:${toYear}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (_) {}

  // Kite instrument tokens for indices
  const KITE_TOKENS = {
    NIFTY:      256265,
    BANKNIFTY:  260105,
    FINNIFTY:   257801,
    MIDCPNIFTY: 288009,
    NIFTYNXT50: 270857,
    SENSEX:     265,
    BANKEX:     270601,
    SENSEX50:   274441,
  };

  const apiKey = process.env.KITE_API_KEY;
  let kiteToken = null;
  try {
    kiteToken = await kv.get('kite_token');
  } catch (_) {}

  const fromStr = `${fromYear}-01-01+09:15:00`;
  const toStr   = `${toYear}-12-31+15:30:00`;

  // Try Kite first
  if (kiteToken && apiKey && KITE_TOKENS[index]) {
    try {
      const token = KITE_TOKENS[index];
      const r = await fetch(
        `https://api.kite.trade/instruments/historical/${token}/day?from=${fromStr}&to=${toStr}&oi=0`,
        { headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${kiteToken}` } }
      );
      if (r.ok) {
        const json = await r.json();
        const candles = json?.data?.candles || [];
        if (candles.length > 0) {
          const data = candles.map(c => ({
            date:  c[0].slice(0, 10),
            open:  c[1],
            high:  c[2],
            low:   c[3],
            close: c[4],
          })).filter(d => d.close);
          try { await kv.set(cacheKey, JSON.stringify(data), { ex: 7 * 24 * 60 * 60 }); } catch (_) {}
          return data;
        }
      }
    } catch (_) {}
  }

  // Fallback: Yahoo Finance
  const YAHOO_SYMBOLS = {
    NIFTY:      '%5ENSEI',
    BANKNIFTY:  '%5ENSEBANK',
    FINNIFTY:   '%5EFINNNIFTY',
    MIDCPNIFTY: '%5ENIFMDCP100',
    NIFTYNXT50: '%5ENIFTYNJR50',
    SENSEX:     '%5EBSESN',
    BANKEX:     '%5EBANKEX',
    SENSEX50:   '%5EBSESEN50',
  };
  const sym  = YAHOO_SYMBOLS[index];
  const from = Math.floor(new Date(`${fromYear}-01-01`).getTime() / 1000);
  const to   = Math.floor(new Date(`${toYear}-12-31`).getTime() / 1000);

  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?period1=${from}&period2=${to}&interval=1d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const json = await r.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No historical data available');

  const timestamps = result.timestamp || [];
  const quotes     = result.indicators?.quote?.[0] || {};
  const data = timestamps.map((ts, i) => ({
    date:  new Date(ts * 1000).toISOString().slice(0, 10),
    open:  quotes.open?.[i],
    close: quotes.close?.[i],
    high:  quotes.high?.[i],
    low:   quotes.low?.[i],
  })).filter(d => d.close && d.open); // only days with both open and close

  try { await kv.set(cacheKey, JSON.stringify(data), { ex: 7 * 24 * 60 * 60 }); } catch (_) {}
  return data;
}

// ── VIX history (India VIX proxy) ────────────────────────────────────────────
async function getVIXHistory(fromYear, toYear) {
  const cacheKey = `bt:vix2:${fromYear}:${toYear}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (_) {}

  const from = Math.floor(new Date(`${fromYear}-01-01`).getTime() / 1000);
  const to   = Math.floor(new Date(`${toYear}-12-31`).getTime() / 1000);
  const r = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/%5EINDIAVIX?period1=${from}&period2=${to}&interval=1d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  const json = await r.json();
  const result = json?.chart?.result?.[0];
  const vixMap = {};
  if (result) {
    const ts = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    ts.forEach((t, i) => {
      if (closes[i]) vixMap[new Date(t * 1000).toISOString().slice(0, 10)] = closes[i];
    });
  }
  try { await kv.set(cacheKey, JSON.stringify(vixMap), { ex: 7 * 24 * 60 * 60 }); } catch (_) {}
  return vixMap;
}


// ── Bulk fetch bhav premiums for date range — ATM strikes only ────────────────
async function fetchAllBhavPremiums(index, fromYear, toYear) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    const cacheKey = `bhav:v5:${index}:${fromYear}:${toYear}`;
    try {
      const cached = await kv.get(cacheKey);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (_) {}

    const fromDate = `${fromYear}-01-01`;
    const toDate   = `${toYear}-12-31`;

    // First get count to know how many pages we need
    const countR = await fetch(
      `${supabaseUrl}/rest/v1/bhav_options?select=id&symbol=eq.${index}&date=gte.${fromDate}&date=lte.${toDate}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
      }
    );
    const contentRange = countR.headers.get('content-range') || '';
    const totalRows = parseInt(contentRange.split('/')[1] || '0');

    if (totalRows === 0) return null;

    // Fetch all pages in parallel (max 10 concurrent)
    const pageSize = 1000;
    const totalPages = Math.ceil(totalRows / pageSize);
    const baseUrl = `${supabaseUrl}/rest/v1/bhav_options?select=date,expiry,strike,type,open,close,settle&symbol=eq.${index}&date=gte.${fromDate}&date=lte.${toDate}&order=date.asc`;

    const CONCURRENCY = 5;
    let allRows = [];

    for (let batch = 0; batch < totalPages; batch += CONCURRENCY) {
      const promises = [];
      for (let p = batch; p < Math.min(batch + CONCURRENCY, totalPages); p++) {
        promises.push(
          fetch(`${baseUrl}&limit=${pageSize}&offset=${p * pageSize}`, {
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          }).then(r => r.json())
        );
      }
      const results = await Promise.all(promises);
      for (const rows of results) {
        if (Array.isArray(rows)) allRows = allRows.concat(rows);
      }
    }

    if (allRows.length === 0) return null;

    // Build nested map: date -> expiry -> "strikeType" -> {open, settle}
    const byDate = {};
    for (const row of allRows) {
      const entryPrice = row.open || row.close || row.settle;
      const exitPrice  = row.settle || row.close;
      if (!entryPrice && !exitPrice) continue;
      if (!byDate[row.date]) byDate[row.date] = {};
      if (!byDate[row.date][row.expiry]) byDate[row.date][row.expiry] = {};
      byDate[row.date][row.expiry][`${row.strike}${row.type}`] = {
        open:   entryPrice,
        settle: exitPrice,
      };
    }

    try { await kv.set(cacheKey, JSON.stringify(byDate), { ex: 24 * 60 * 60 }); } catch (_) {}
    return byDate;
  } catch (_) { return null; }
}

function getBhavPremiumsFromMap(bhavMap, index, dateStr, atm, step, strikePct) {
  if (!bhavMap || !bhavMap[dateStr]) return null;

  const dateData = bhavMap[dateStr];

  // Find nearest expiry that has data
  const EXPIRY_DOW = { NIFTY: 4, BANKNIFTY: 3, FINNIFTY: 4, MIDCPNIFTY: 4, SENSEX: 5 };
  const dow = EXPIRY_DOW[index] ?? 4;
  const d   = new Date(dateStr);
  const exp = new Date(d);
  exp.setDate(exp.getDate() + 1);
  while (exp.getDay() !== dow) exp.setDate(exp.getDate() + 1);

  let strikes = null;
  for (let i = 0; i < 4; i++) {
    const e = new Date(exp);
    e.setDate(e.getDate() + i * 7);
    const expStr = e.toISOString().slice(0, 10);
    if (dateData[expStr]) { strikes = dateData[expStr]; break; }
  }
  if (!strikes) return null;

  const get = (strike, type) => {
    const row = strikes[`${strike}${type}`];
    return row ? { entry: row.open || row.close || row.settle, exit: row.settle || row.close } : null;
  };

  const atmC  = get(atm,                          'CE');
  const atmP  = get(atm,                          'PE');
  const otm1C = get(atm + step * (strikePct + 1), 'CE');
  const otm1P = get(atm - step * (strikePct + 1), 'PE');
  const otm2C = get(atm + step * (strikePct + 2), 'CE');
  const otm2P = get(atm - step * (strikePct + 2), 'PE');

  if (!atmC && !atmP) return null;
  return {
    atmC:  atmC?.entry,  atmP:  atmP?.entry,
    otm1C: otm1C?.entry, otm1P: otm1P?.entry,
    otm2C: otm2C?.entry, otm2P: otm2P?.entry,
    source: 'bhav',
  };
}

// ── Expiry logic ─────────────────────────────────────────────────────────────
function getNextExpiry(date, index, expiry) {
  const d = new Date(date);
  const isWeekly = expiry === 'weekly';

  if (index === 'NIFTY') {
    // Nifty: Thursday weekly, last Thursday monthly
    const target = isWeekly ? 4 : -1; // 4=Thu
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    while (next.getDay() !== 4) next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }
  if (index === 'BANKNIFTY') {
    // Bank Nifty: Wednesday weekly
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    while (next.getDay() !== 3) next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }
  if (index === 'SENSEX') {
    // Sensex: Friday weekly
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    while (next.getDay() !== 5) next.setDate(next.getDate() + 1);
    return next.toISOString().slice(0, 10);
  }
  return null;
}

// ── Strategy P&L calculator ──────────────────────────────────────────────────
// ── V2 P&L calculator with separate entry/exit spots ────────────────────────
function calcPnlV2(strategy, entrySpot, exitSpot, vix, dte, lots, lotSize, strikePct, width, slPct, tpPct, realPremiums = null) {
  // Entry: options priced at entrySpot with DTE remaining
  // Exit: options valued at expiry (intrinsic only if DTE=0, else BS with remaining time)
  const entryDteY = dte === 0 ? (6.25 / (365 * 24)) : (dte / 365); // 6.25 hrs for 0 DTE entry at 9:20
  const exitDteY  = 0.0001; // essentially at expiry

  const step    = lotSize === 65 ? 50 : lotSize === 30 ? 100 : 50; // crude but works
  const atm     = Math.round(entrySpot / step) * step;
  const otm1K   = step * (strikePct + 1);
  const otm2K   = step * (strikePct + width + 1);

  // Entry premiums: use real bhav data if available, else Black-Scholes
  const rp = realPremiums;
  const eAtmC  = (rp?.atmC  != null) ? rp.atmC  : getPremium(entrySpot, atm,          entryDteY, vix, 'call');
  const eAtmP  = (rp?.atmP  != null) ? rp.atmP  : getPremium(entrySpot, atm,          entryDteY, vix, 'put');
  const eOtm1C = (rp?.otm1C != null) ? rp.otm1C : getPremium(entrySpot, atm + otm1K,  entryDteY, vix, 'call');
  const eOtm1P = (rp?.otm1P != null) ? rp.otm1P : getPremium(entrySpot, atm - otm1K,  entryDteY, vix, 'put');
  const eOtm2C = (rp?.otm2C != null) ? rp.otm2C : getPremium(entrySpot, atm + otm2K,  entryDteY, vix, 'call');
  const eOtm2P = (rp?.otm2P != null) ? rp.otm2P : getPremium(entrySpot, atm - otm2K,  entryDteY, vix, 'put');

  // Exit values (intrinsic at expiry based on exitSpot vs strike)
  const xAtmC  = Math.max(0, exitSpot - atm);
  const xAtmP  = Math.max(0, atm - exitSpot);
  const xOtm1C = Math.max(0, exitSpot - (atm + otm1K));
  const xOtm1P = Math.max(0, (atm - otm1K) - exitSpot);
  const xOtm2C = Math.max(0, exitSpot - (atm + otm2K));
  const xOtm2P = Math.max(0, (atm - otm2K) - exitSpot);

  let entryPremium = 0, exitValue = 0;

  switch (strategy) {
    // ── Single leg ──
    case 'long_call':  entryPremium = eAtmC;  exitValue = xAtmC;  break;
    case 'long_put':   entryPremium = eAtmP;  exitValue = xAtmP;  break;
    case 'short_call': entryPremium = eAtmC;  exitValue = xAtmC;  break;
    case 'short_put':  entryPremium = eAtmP;  exitValue = xAtmP;  break;

    // ── Volatility ──
    case 'long_straddle':  entryPremium = eAtmC + eAtmP;   exitValue = xAtmC + xAtmP;   break;
    case 'short_straddle': entryPremium = eAtmC + eAtmP;   exitValue = xAtmC + xAtmP;   break;
    case 'long_strangle':  entryPremium = eOtm1C + eOtm1P; exitValue = xOtm1C + xOtm1P; break;
    case 'short_strangle': entryPremium = eOtm1C + eOtm1P; exitValue = xOtm1C + xOtm1P; break;
    case 'long_guts':      entryPremium = eAtmC + eAtmP + eOtm1C + eOtm1P; exitValue = xAtmC + xAtmP + xOtm1C + xOtm1P; break;
    case 'short_guts':     entryPremium = eAtmC + eAtmP + eOtm1C + eOtm1P; exitValue = xAtmC + xAtmP + xOtm1C + xOtm1P; break;

    // ── Vertical spreads ──
    case 'bull_call_spread': entryPremium = eAtmC - eOtm1C; exitValue = xAtmC - xOtm1C; break;
    case 'bear_call_spread': entryPremium = eOtm1C - eAtmC; exitValue = xOtm1C - xAtmC; break;
    case 'bull_put_spread':  entryPremium = eOtm1P - eAtmP; exitValue = xOtm1P - xAtmP; break;
    case 'bear_put_spread':  entryPremium = eAtmP - eOtm1P; exitValue = xAtmP - xOtm1P; break;

    // ── Iron strats ──
    case 'short_iron_condor':
      entryPremium = (eOtm1C - eOtm2C) + (eOtm1P - eOtm2P);
      exitValue    = (xOtm1C - xOtm2C) + (xOtm1P - xOtm2P);
      break;
    case 'long_iron_condor':
      entryPremium = (eOtm2C - eOtm1C) + (eOtm2P - eOtm1P);
      exitValue    = (xOtm2C - xOtm1C) + (xOtm2P - xOtm1P);
      break;
    case 'short_iron_butterfly':
      entryPremium = eAtmC + eAtmP - eOtm1C - eOtm1P;
      exitValue    = xAtmC + xAtmP - xOtm1C - xOtm1P;
      break;
    case 'long_iron_butterfly':
      entryPremium = eOtm1C + eOtm1P - eAtmC - eAtmP;
      exitValue    = xOtm1C + xOtm1P - xAtmC - xAtmP;
      break;

    // ── Butterfly ──
    case 'long_call_butterfly':  entryPremium = eAtmC - 2*eOtm1C + eOtm2C; exitValue = xAtmC - 2*xOtm1C + xOtm2C; break;
    case 'short_call_butterfly': entryPremium = 2*eOtm1C - eAtmC - eOtm2C; exitValue = 2*xOtm1C - xAtmC - xOtm2C; break;
    case 'long_put_butterfly':   entryPremium = eAtmP - 2*eOtm1P + eOtm2P; exitValue = xAtmP - 2*xOtm1P + xOtm2P; break;
    case 'short_put_butterfly':  entryPremium = 2*eOtm1P - eAtmP - eOtm2P; exitValue = 2*xOtm1P - xAtmP - xOtm2P; break;

    // ── Condor ──
    case 'long_call_condor':  entryPremium = eAtmC - eOtm1C - eOtm2C + getPremium(entrySpot,atm+step*3,entryDteY,vix,'call'); exitValue = xAtmC - xOtm1C - xOtm2C + Math.max(0,exitSpot-(atm+step*3)); break;
    case 'short_call_condor': entryPremium = eOtm1C + eOtm2C - eAtmC - getPremium(entrySpot,atm+step*3,entryDteY,vix,'call'); exitValue = xOtm1C + xOtm2C - xAtmC - Math.max(0,exitSpot-(atm+step*3)); break;
    case 'long_put_condor':   entryPremium = eAtmP - eOtm1P - eOtm2P + getPremium(entrySpot,atm-step*3,entryDteY,vix,'put'); exitValue = xAtmP - xOtm1P - xOtm2P + Math.max(0,(atm-step*3)-exitSpot); break;
    case 'short_put_condor':  entryPremium = eOtm1P + eOtm2P - eAtmP - getPremium(entrySpot,atm-step*3,entryDteY,vix,'put'); exitValue = xOtm1P + xOtm2P - xAtmP - Math.max(0,(atm-step*3)-exitSpot); break;

    // ── Synthetic ──
    case 'synthetic_long':  entryPremium = eAtmC - eAtmP; exitValue = exitSpot - atm; break;
    case 'synthetic_short': entryPremium = eAtmP - eAtmC; exitValue = atm - exitSpot; break;

    default: entryPremium = eAtmC; exitValue = xAtmC;
  }

  // Credit strategies: profit = premium received - cost to close
  const isCredit = ['short_call','short_put','short_straddle','short_strangle','short_guts',
    'bear_call_spread','bull_put_spread','short_iron_condor','short_iron_butterfly',
    'short_call_butterfly','short_put_butterfly','short_call_condor','short_put_condor','synthetic_short'].includes(strategy);

  const pnlPerUnit = isCredit ? (entryPremium - exitValue) : (exitValue - entryPremium);
  let pnl = pnlPerUnit * lots * lotSize;

  // Apply SL/TP
  const maxLoss   = slPct ? -Math.abs(entryPremium * lots * lotSize * slPct / 100) : null;
  const maxProfit = tpPct ?  Math.abs(entryPremium * lots * lotSize * tpPct / 100) : null;
  if (maxLoss   && pnl < maxLoss)   pnl = maxLoss;
  if (maxProfit && pnl > maxProfit) pnl = maxProfit;

  return { pnl, entryPremium, exitPremium: exitValue };
}

function calcPnl(strategy, spot, vix, dte, lots, lotSize, strikePct, width, slPct, tpPct) {
  const dteY    = Math.max(0.001, dte / 365);
  const exitDteY = 0.001; // exits at expiry = 0 DTE essentially
  const atm     = getATMStrike(spot, 'NIFTY'); // use spot directly
  const step    = 50; // generic, overridden by actual index step

  // Premium at entry
  const atmCall = getPremium(spot, atm, dteY, vix, 'call');
  const atmPut  = getPremium(spot, atm, dteY, vix, 'put');
  const otm1C   = getPremium(spot, atm + step * (strikePct + 1), dteY, vix, 'call');
  const otm1P   = getPremium(spot, atm - step * (strikePct + 1), dteY, vix, 'put');
  const otm2C   = getPremium(spot, atm + step * (strikePct + width + 1), dteY, vix, 'call');
  const otm2P   = getPremium(spot, atm - step * (strikePct + width + 1), dteY, vix, 'put');

  // Simplified: assume exits at expiry for now
  // Entry and exit premiums per lot (1 unit)
  let entryPremium = 0, exitPremium = 0;

  switch (strategy) {
    // Single leg — exit at 0 (intrinsic only)
    case 'long_call':  entryPremium = atmCall; exitPremium = Math.max(0, spot - atm); break;
    case 'long_put':   entryPremium = atmPut;  exitPremium = Math.max(0, atm - spot); break;
    case 'short_call': entryPremium = atmCall; exitPremium = Math.max(0, spot - atm); break;
    case 'short_put':  entryPremium = atmPut;  exitPremium = Math.max(0, atm - spot); break;

    // Volatility
    case 'long_straddle':  entryPremium = atmCall + atmPut; exitPremium = Math.max(0, spot - atm) + Math.max(0, atm - spot); break;
    case 'short_straddle': entryPremium = atmCall + atmPut; exitPremium = Math.max(0, spot - atm) + Math.max(0, atm - spot); break;
    case 'long_strangle':  entryPremium = otm1C + otm1P; exitPremium = Math.max(0, spot-(atm+step)) + Math.max(0, (atm-step)-spot); break;
    case 'short_strangle': entryPremium = otm1C + otm1P; exitPremium = Math.max(0, spot-(atm+step)) + Math.max(0, (atm-step)-spot); break;
    case 'long_guts':      entryPremium = atmCall + atmPut + otm1C + otm1P; exitPremium = 0; break;
    case 'short_guts':     entryPremium = atmCall + atmPut + otm1C + otm1P; exitPremium = 0; break;

    // Vertical spreads — simplified: capped by width
    case 'bull_call_spread': entryPremium = atmCall - otm1C; exitPremium = Math.min(step, Math.max(0, spot - atm)) - Math.min(step, Math.max(0, spot-(atm+step))); break;
    case 'bear_call_spread': entryPremium = otm1C - atmCall; exitPremium = Math.min(step, Math.max(0, spot-(atm+step))) - Math.min(step, Math.max(0, spot-atm)); break;
    case 'bull_put_spread':  entryPremium = otm1P - atmPut; exitPremium = Math.min(step, Math.max(0, (atm-step)-spot)) - Math.min(step, Math.max(0, atm-spot)); break;
    case 'bear_put_spread':  entryPremium = atmPut - otm1P; exitPremium = Math.min(step, Math.max(0, atm-spot)) - Math.min(step, Math.max(0, (atm-step)-spot)); break;

    // Iron condor: sell inner, buy outer
    case 'short_iron_condor':
      entryPremium = (otm1C - otm2C) + (otm1P - otm2P);
      exitPremium  = (Math.max(0,spot-(atm+step)) - Math.max(0,spot-(atm+step*2))) + (Math.max(0,(atm-step)-spot) - Math.max(0,(atm-step*2)-spot));
      break;
    case 'long_iron_condor':
      entryPremium = (otm2C - otm1C) + (otm2P - otm1P);
      exitPremium  = (Math.max(0,spot-(atm+step*2)) - Math.max(0,spot-(atm+step))) + (Math.max(0,(atm-step*2)-spot) - Math.max(0,(atm-step)-spot));
      break;
    case 'short_iron_butterfly':
      entryPremium = atmCall + atmPut - otm1C - otm1P;
      exitPremium  = (Math.max(0,spot-atm) + Math.max(0,atm-spot)) - (Math.max(0,spot-(atm+step)) + Math.max(0,(atm-step)-spot));
      break;
    case 'long_iron_butterfly':
      entryPremium = otm1C + otm1P - atmCall - atmPut;
      exitPremium  = (Math.max(0,spot-(atm+step)) + Math.max(0,(atm-step)-spot)) - (Math.max(0,spot-atm) + Math.max(0,atm-spot));
      break;

    // Butterfly
    case 'long_call_butterfly':  entryPremium = atmCall - 2*otm1C + otm2C; exitPremium = Math.max(0, spot-atm) - 2*Math.max(0,spot-(atm+step)) + Math.max(0,spot-(atm+step*2)); break;
    case 'short_call_butterfly': entryPremium = -(atmCall - 2*otm1C + otm2C); exitPremium = -(Math.max(0,spot-atm) - 2*Math.max(0,spot-(atm+step)) + Math.max(0,spot-(atm+step*2))); break;
    case 'long_put_butterfly':   entryPremium = atmPut - 2*otm1P + otm2P; exitPremium = Math.max(0,atm-spot) - 2*Math.max(0,(atm-step)-spot) + Math.max(0,(atm-step*2)-spot); break;
    case 'short_put_butterfly':  entryPremium = -(atmPut - 2*otm1P + otm2P); exitPremium = -(Math.max(0,atm-spot) - 2*Math.max(0,(atm-step)-spot) + Math.max(0,(atm-step*2)-spot)); break;

    // Condor (4 legs)
    case 'long_call_condor':  entryPremium = atmCall - otm1C - otm2C + getPremium(spot,atm+step*3,dteY,vix,'call'); break;
    case 'short_call_condor': entryPremium = otm1C + otm2C - atmCall - getPremium(spot,atm+step*3,dteY,vix,'call'); break;
    case 'long_put_condor':   entryPremium = atmPut - otm1P - otm2P + getPremium(spot,atm-step*3,dteY,vix,'put'); break;
    case 'short_put_condor':  entryPremium = otm1P + otm2P - atmPut - getPremium(spot,atm-step*3,dteY,vix,'put'); break;

    // Synthetic
    case 'synthetic_long':  entryPremium = atmCall - atmPut; exitPremium = spot - atm; break;
    case 'synthetic_short': entryPremium = atmPut - atmCall; exitPremium = atm - spot; break;

    default: entryPremium = atmCall; exitPremium = 0;
  }

  // Credit strategies: P&L = credit received - cost to close
  const isCredit = ['short_call','short_put','short_straddle','short_strangle','short_guts',
    'bear_call_spread','bull_put_spread','short_iron_condor','short_iron_butterfly',
    'short_call_butterfly','short_put_butterfly','short_call_condor','short_put_condor','synthetic_short'].includes(strategy);

  let pnlPerUnit;
  if (isCredit) {
    pnlPerUnit = entryPremium - exitPremium;
  } else {
    pnlPerUnit = exitPremium - entryPremium;
  }

  let pnl = pnlPerUnit * lots * lotSize;

  // Apply SL/TP
  const maxLoss   = slPct ? -Math.abs(entryPremium * lots * lotSize * slPct / 100) : null;
  const maxProfit = tpPct ? Math.abs(entryPremium * lots * lotSize * tpPct / 100) : null;
  if (maxLoss   && pnl < maxLoss)   pnl = maxLoss;
  if (maxProfit && pnl > maxProfit) pnl = maxProfit;

  return { pnl, entryPremium, exitPremium: isCredit ? exitPremium : exitPremium };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { strategy, index = 'NIFTY', expiry = 'weekly', dte = 0, lots = 1,
          strikePct = 0, width = 1, fromYear = 2016, toYear = 2026,
          slPct = null, tpPct = null } = body;

  if (!strategy) return res.status(400).json({ error: 'strategy required' });

  const cacheKey = `bt:v11:${strategy}:${index}:${expiry}:${dte}:${lots}:${strikePct}:${width}:${fromYear}:${toYear}:${slPct}:${tpPct}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({ ...data, cached: true });
    }
  } catch (_) {}

  try {
    const [priceData, vixData, bhavMap] = await Promise.all([
      getHistoricalData(index, fromYear, toYear),
      getVIXHistory(fromYear, toYear),
      fetchAllBhavPremiums(index, fromYear, toYear),
    ]);

    const lotSize  = LOT_SIZES[index] || 75;
    const step     = STRIKE_STEPS[index] || 50;
    const daily    = [];

    // Find expiry days — generate entry days based on expiry type
    // Entry: DTE days before expiry
    // Simple approach: trade every expiry day minus DTE
    const EXPIRY_DAYS = {
      'NIFTY_weekly':     [4],  // Thursday
      'NIFTY_monthly':    [4],
      'BANKNIFTY_weekly': [3],  // Wednesday
      'BANKNIFTY_monthly':[3],
      'SENSEX_weekly':    [5],  // Friday
      'SENSEX_monthly':   [5],
    };
    const expiryDow = EXPIRY_DAYS[`${index}_${expiry}`]?.[0] ?? 4;

    // Build a date->price lookup for fast access
    const priceByDate = {};
    for (const d of priceData) priceByDate[d.date] = d;

    // Find all expiry days first
    const expiryDays = priceData.filter(d => new Date(d.date).getDay() === expiryDow);

    for (const expiryDay of expiryDays) {
      // Find entry day: go back DTE trading days from expiry
      const expiryIdx = priceData.indexOf(expiryDay);
      if (expiryIdx < dte) continue;
      const entryDay = priceData[expiryIdx - dte];
      if (!entryDay) continue;

      const entrySpot = entryDay.open || entryDay.close;
      const exitSpot  = expiryDay.close;
      const vix       = vixData[entryDay.date] || 15;
      const dteUsed   = dte;

      if (!entrySpot || !exitSpot) continue;

      // Try real bhav premiums for entry day
      const atmStrike = Math.round(entrySpot / step) * step;
      const realPremiums = getBhavPremiumsFromMap(bhavMap, index, entryDay.date, atmStrike, step, strikePct);

      const { pnl, entryPremium, exitPremium } = calcPnlV2(
        strategy, entrySpot, exitSpot, vix, dteUsed, lots, lotSize, strikePct, width, slPct, tpPct, realPremiums
      );

      daily.push({ date: entryDay.date, expiryDate: expiryDay.date, pnl, entryPremium, exitPremium, spot: entrySpot, exitSpot, vix, dte: dteUsed, source: realPremiums?.source || 'bs' });
    }

    if (daily.length === 0) return res.status(400).json({ error: 'No trades found for this period' });

    // Compute stats
    const pnls      = daily.map(d => d.pnl);
    const wins      = daily.filter(d => d.pnl >= 0);
    const losses    = daily.filter(d => d.pnl < 0);
    const totalPnl  = pnls.reduce((s, p) => s + p, 0);
    const avgPnl    = totalPnl / pnls.length;
    const winRate   = (wins.length / pnls.length) * 100;

    // Max drawdown
    let peak = 0, drawdown = 0, cumPnl = 0;
    for (const p of pnls) {
      cumPnl += p;
      if (cumPnl > peak) peak = cumPnl;
      if (cumPnl - peak < drawdown) drawdown = cumPnl - peak;
    }

    // Streaks
    let ws = 0, ls = 0, maxWs = 0, maxLs = 0, curW = 0, curL = 0;
    for (const p of pnls) {
      if (p >= 0) { curW++; curL = 0; if (curW > maxWs) maxWs = curW; }
      else        { curL++; curW = 0; if (curL > maxLs) maxLs = curL; }
    }

    const avgWin  = wins.length   ? wins.reduce((s,d) => s+d.pnl, 0) / wins.length   : 0;
    const avgLoss = losses.length ? losses.reduce((s,d) => s+d.pnl, 0) / losses.length : 0;
    const grossWin  = wins.reduce((s,d) => s+d.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s,d) => s+d.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

    // Sharpe (annualized, assume 252 trading days)
    const mean = avgPnl;
    const variance = pnls.reduce((s, p) => s + (p - mean) ** 2, 0) / pnls.length;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(52) : 0;

    const bhavDays = daily.filter(d => d.source === 'bhav').length;
    const result = {
      daily,
      dataSource: bhavDays > daily.length * 0.5 ? 'nse_bhav' : 'black_scholes',
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
        winStreak: maxWs, lossStreak: maxLs,
        expectancy: (winRate/100) * avgWin + (1 - winRate/100) * avgLoss,
      },
    };

    try { await kv.set(cacheKey, JSON.stringify(result), { ex: 12 * 60 * 60 }); } catch (_) {}
    return res.json(result);

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
