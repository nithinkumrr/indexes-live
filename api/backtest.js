// api/backtest.js
// Backtest engine — uses real NSE bhav data from Supabase when available,
// falls back to Black-Scholes for dates not yet downloaded.

import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://axobtyzujcbckkbsakpb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── BLACK-SCHOLES FALLBACK ─────────────────────────────────────────────────

function norm(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  return x >= 0 ? 1 - p : p;
}

function bs(S, K, T, r, sigma, type) {
  if (T <= 0) return Math.max(0, type === "CE" ? S - K : K - S);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (type === "CE") return S * norm(d1) - K * Math.exp(-r * T) * norm(d2);
  return K * Math.exp(-r * T) * norm(-d2) - S * norm(-d1);
}

// ── LOT SIZES ─────────────────────────────────────────────────────────────

const LOT_SIZES = {
  NIFTY:      65,
  BANKNIFTY:  30,
  FINNIFTY:   60,
  MIDCPNIFTY: 120,
  SENSEX:     20,
  BANKEX:     30,
};

const STRIKE_STEPS = {
  NIFTY:      50,
  BANKNIFTY:  100,
  FINNIFTY:   50,
  MIDCPNIFTY: 25,
  SENSEX:     100,
  BANKEX:     100,
};

const YAHOO_SYMBOLS = {
  NIFTY:      "^NSEI",
  BANKNIFTY:  "^NSEBANK",
  FINNIFTY:   "NIFTY_FIN_SERVICE.NS",
  MIDCPNIFTY: "^NSEMDCP50",
  SENSEX:     "^BSESN",
  BANKEX:     "^BSEBANKEX",
};

// ── FETCH HISTORICAL OHLC ──────────────────────────────────────────────────

async function fetchHistoricalOHLC(symbol, fromDate, toDate) {
  const cacheKey = `ohlc:${symbol}:${fromDate}:${toDate}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return cached;
  } catch (_) {}

  const yahooSym = YAHOO_SYMBOLS[symbol] || "^NSEI";
  const from = Math.floor(new Date(fromDate).getTime() / 1000);
  const to   = Math.floor(new Date(toDate).getTime() / 1000) + 86400;
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?period1=${from}&period2=${to}&interval=1d`;

  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const j = await r.json();
  const result = j?.chart?.result?.[0];
  if (!result) return [];

  const ts = result.timestamp || [];
  const q  = result.indicators?.quote?.[0] || {};
  const data = ts.map((t, i) => ({
    date:  new Date(t * 1000).toISOString().split("T")[0],
    open:  q.open?.[i]  || q.close?.[i] || 0,
    high:  q.high?.[i]  || 0,
    low:   q.low?.[i]   || 0,
    close: q.close?.[i] || 0,
  })).filter(d => d.close > 0);

  try { await kv.set(cacheKey, data, { ex: 86400 * 7 }); } catch (_) {}
  return data;
}

// ── FETCH REAL BHAV PREMIUMS FROM SUPABASE ────────────────────────────────

async function fetchBhavPremium(supabase, symbol, tradeDate, expiry, strike, optionType) {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("bhav_options")
      .select("settle, close, open")
      .eq("symbol", symbol)
      .eq("date", tradeDate)
      .eq("expiry", expiry)
      .eq("strike", strike)
      .eq("type", optionType)
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0];
      return row.open || row.close || row.settle || null;
    }
  } catch (_) {}
  return null;
}

// Get nearest expiry date for given date + DTE
function getNearestExpiry(tradeDate, daysToExpiry, weekday = 4) {
  // weekday: 4 = Thursday (Nifty), 2 = Tuesday (BankNifty monthly)
  const d = new Date(tradeDate);
  d.setDate(d.getDate() + daysToExpiry);
  // Roll to next occurrence of weekday
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Round strike to nearest step
function roundStrike(spot, step, offset = 0) {
  return Math.round((spot + offset) / step) * step;
}

// ── STRATEGY LEG BUILDER ──────────────────────────────────────────────────

function buildLegs(strategy, spot, strikeStep, width) {
  const w = width || strikeStep * 2;
  const atm = roundStrike(spot, strikeStep);
  const otmCall = roundStrike(spot, strikeStep, w);
  const otmPut  = roundStrike(spot, strikeStep, -w);
  const wingW   = strikeStep * 2;

  const legs = {
    // Single leg
    "long_call":   [{ type:"CE", strike: atm, dir: 1 }],
    "long_put":    [{ type:"PE", strike: atm, dir: 1 }],
    "short_call":  [{ type:"CE", strike: atm, dir:-1 }],
    "short_put":   [{ type:"PE", strike: atm, dir:-1 }],

    // Volatility
    "long_straddle":  [{ type:"CE", strike: atm, dir: 1 }, { type:"PE", strike: atm, dir: 1 }],
    "short_straddle": [{ type:"CE", strike: atm, dir:-1 }, { type:"PE", strike: atm, dir:-1 }],
    "long_strangle":  [{ type:"CE", strike: otmCall, dir: 1 }, { type:"PE", strike: otmPut, dir: 1 }],
    "short_strangle": [{ type:"CE", strike: otmCall, dir:-1 }, { type:"PE", strike: otmPut, dir:-1 }],
    "long_guts":      [{ type:"CE", strike: otmPut,  dir: 1 }, { type:"PE", strike: otmCall, dir: 1 }],
    "short_guts":     [{ type:"CE", strike: otmPut,  dir:-1 }, { type:"PE", strike: otmCall, dir:-1 }],

    // Vertical spreads
    "bull_call_spread": [{ type:"CE", strike: atm, dir: 1 }, { type:"CE", strike: otmCall, dir:-1 }],
    "bear_call_spread": [{ type:"CE", strike: atm, dir:-1 }, { type:"CE", strike: otmCall, dir: 1 }],
    "bull_put_spread":  [{ type:"PE", strike: otmPut, dir:-1 }, { type:"PE", strike: atm, dir: 1 }],
    "bear_put_spread":  [{ type:"PE", strike: atm, dir:-1 }, { type:"PE", strike: otmPut, dir: 1 }],

    // Iron strats
    "short_iron_condor": [
      { type:"PE", strike: roundStrike(spot,strikeStep,-w*2), dir: 1 },
      { type:"PE", strike: otmPut,  dir:-1 },
      { type:"CE", strike: otmCall, dir:-1 },
      { type:"CE", strike: roundStrike(spot,strikeStep, w*2), dir: 1 },
    ],
    "long_iron_condor": [
      { type:"PE", strike: roundStrike(spot,strikeStep,-w*2), dir:-1 },
      { type:"PE", strike: otmPut,  dir: 1 },
      { type:"CE", strike: otmCall, dir: 1 },
      { type:"CE", strike: roundStrike(spot,strikeStep, w*2), dir:-1 },
    ],
    "short_iron_butterfly": [
      { type:"PE", strike: otmPut, dir: 1 },
      { type:"PE", strike: atm,    dir:-1 },
      { type:"CE", strike: atm,    dir:-1 },
      { type:"CE", strike: otmCall,dir: 1 },
    ],
    "long_iron_butterfly": [
      { type:"PE", strike: otmPut, dir:-1 },
      { type:"PE", strike: atm,    dir: 1 },
      { type:"CE", strike: atm,    dir: 1 },
      { type:"CE", strike: otmCall,dir:-1 },
    ],

    // Butterfly
    "long_call_butterfly":  [{ type:"CE", strike: atm-wingW, dir: 1 }, { type:"CE", strike: atm, dir:-2 }, { type:"CE", strike: atm+wingW, dir: 1 }],
    "short_call_butterfly": [{ type:"CE", strike: atm-wingW, dir:-1 }, { type:"CE", strike: atm, dir: 2 }, { type:"CE", strike: atm+wingW, dir:-1 }],
    "long_put_butterfly":   [{ type:"PE", strike: atm-wingW, dir: 1 }, { type:"PE", strike: atm, dir:-2 }, { type:"PE", strike: atm+wingW, dir: 1 }],
    "short_put_butterfly":  [{ type:"PE", strike: atm-wingW, dir:-1 }, { type:"PE", strike: atm, dir: 2 }, { type:"PE", strike: atm+wingW, dir:-1 }],

    // Condor
    "long_call_condor":  [{ type:"CE", strike: atm-wingW*2, dir: 1 }, { type:"CE", strike: atm-wingW, dir:-1 }, { type:"CE", strike: atm+wingW, dir:-1 }, { type:"CE", strike: atm+wingW*2, dir: 1 }],
    "short_call_condor": [{ type:"CE", strike: atm-wingW*2, dir:-1 }, { type:"CE", strike: atm-wingW, dir: 1 }, { type:"CE", strike: atm+wingW, dir: 1 }, { type:"CE", strike: atm+wingW*2, dir:-1 }],
    "long_put_condor":   [{ type:"PE", strike: atm-wingW*2, dir: 1 }, { type:"PE", strike: atm-wingW, dir:-1 }, { type:"PE", strike: atm+wingW, dir:-1 }, { type:"PE", strike: atm+wingW*2, dir: 1 }],
    "short_put_condor":  [{ type:"PE", strike: atm-wingW*2, dir:-1 }, { type:"PE", strike: atm-wingW, dir: 1 }, { type:"PE", strike: atm+wingW, dir: 1 }, { type:"PE", strike: atm+wingW*2, dir:-1 }],

    // Synthetic
    "synthetic_long":  [{ type:"CE", strike: atm, dir: 1 }, { type:"PE", strike: atm, dir:-1 }],
    "synthetic_short": [{ type:"CE", strike: atm, dir:-1 }, { type:"PE", strike: atm, dir: 1 }],
  };

  return legs[strategy] || legs["short_straddle"];
}

// ── PRICE A LEG (real data first, BS fallback) ────────────────────────────

async function priceleg(supabase, leg, spot, vix, dte, riskFreeRate, tradeDate, expiryDate) {
  // Try real Supabase data first
  if (supabase) {
    const real = await fetchBhavPremium(supabase, leg.symbol, tradeDate, expiryDate, leg.strike, leg.type);
    if (real && real > 0) return { price: real, source: "real" };
  }

  // Fallback to Black-Scholes
  const sigma = (vix || 15) / 100;
  const T = Math.max(dte, 0.5) / 365;
  const price = bs(spot, leg.strike, T, riskFreeRate / 100, sigma, leg.type);
  return { price: Math.max(price, 0.05), source: "bs" };
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const {
    strategy = "short_straddle",
    symbol   = "NIFTY",
    expiry   = "weekly",
    entryTime = "09:20",
    exitTime  = "15:15",
    dte       = 0,
    lots      = 1,
    slPct     = 50,
    tpPct     = 100,
    fromYear  = 2020,
    toYear    = 2025,
    width,
  } = req.body;

  const lotSize   = LOT_SIZES[symbol]   || 75;
  const strikeStep = STRIKE_STEPS[symbol] || 50;
  const riskFreeRate = 6.5;

  // Cache key
  const cacheKey = `bt:${strategy}:${symbol}:${expiry}:${dte}:${slPct}:${tpPct}:${fromYear}:${toYear}:${lots}:${width||"auto"}:v4`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  } catch (_) {}

  // Init Supabase if key available
  let supabase = null;
  if (SUPABASE_KEY) {
    try { supabase = createClient(SUPABASE_URL, SUPABASE_KEY); } catch (_) {}
  }

  // Fetch historical OHLC + VIX
  const fromDate = `${fromYear}-01-01`;
  const toDate   = `${toYear}-12-31`;
  const [ohlcData, vixData] = await Promise.all([
    fetchHistoricalOHLC(symbol, fromDate, toDate),
    fetchHistoricalOHLC("VIX", fromDate, toDate),
  ]);

  if (!ohlcData.length) return res.status(500).json({ error: "No price data" });

  const vixMap = {};
  for (const d of vixData) vixMap[d.date] = d.close;

  // ── BUILD TRADE LIST ──────────────────────────────────────────────────────

  const trades = [];
  let realDataCount = 0;

  for (let i = 0; i < ohlcData.length - 1; i++) {
    const day   = ohlcData[i];
    const dDate = new Date(day.date);
    const dow   = dDate.getDay();

    // Entry filter by expiry type
    const isWeekly = expiry === "weekly";
    // Weekly: enter on expiry day (DTE=0) or N days before
    // Monthly: last Thursday of month
    let shouldEnter = false;
    if (isWeekly) {
      if (dte === 0 && dow === 4) shouldEnter = true;           // Thursday expiry day
      else if (dte > 0 && dow === (4 - dte + 7) % 7) shouldEnter = true;
    } else {
      // Monthly: enter on specific day relative to last Thursday
      if (dow === 4) shouldEnter = true; // simplified: enter every Thursday for monthly too
    }

    if (!shouldEnter) continue;

    const spot   = day.open || day.close;
    const vix    = vixMap[day.date] || 15;
    const expiryDate = getNearestExpiry(day.date, dte, 4);

    // Build legs with symbol info
    const legs = buildLegs(strategy, spot, strikeStep, width).map(l => ({ ...l, symbol }));

    // Price entry
    let entryPremium = 0;
    let entrySource = "bs";
    for (const leg of legs) {
      const { price, source } = await priceleg(supabase, leg, spot, vix, Math.max(dte, 0.5), riskFreeRate, day.date, expiryDate);
      leg.entryPrice = price;
      entryPremium += leg.dir * price;
      if (source === "real") entrySource = "real";
    }

    // Exit day
    const exitDayIdx = dte === 0 ? i : Math.min(i + dte, ohlcData.length - 1);
    const exitDay  = ohlcData[exitDayIdx];
    const exitSpot = exitDay.close || exitDay.open;

    // Price exit
    let exitPremium = 0;
    for (const leg of legs) {
      const { price } = await priceleg(supabase, leg, exitSpot, vixMap[exitDay.date] || 15, 0.01, riskFreeRate, exitDay.date, expiryDate);
      leg.exitPrice = price;
      exitPremium += leg.dir * price;
    }

    // Raw PnL per lot
    const rawPnl = (entryPremium - exitPremium) * lotSize * lots;

    // Apply SL/TP
    let finalPnl = rawPnl;
    const maxLoss   = Math.abs(entryPremium) * lotSize * lots * (slPct / 100);
    const maxProfit = Math.abs(entryPremium) * lotSize * lots * (tpPct / 100);
    if (rawPnl < -maxLoss) finalPnl = -maxLoss;
    if (rawPnl > maxProfit) finalPnl = maxProfit;

    if (entrySource === "real") realDataCount++;

    trades.push({
      date:        day.date,
      spot:        Math.round(spot),
      vix:         Math.round(vix * 10) / 10,
      entryPremium: Math.round(entryPremium * 100) / 100,
      exitPremium:  Math.round(exitPremium  * 100) / 100,
      pnl:          Math.round(finalPnl),
      source:       entrySource,
    });
  }

  // ── STATS ─────────────────────────────────────────────────────────────────

  const wins   = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnl   = trades.reduce((s, t) => s + t.pnl, 0);
  const avgWin     = wins.length   ? wins.reduce((s,t) => s+t.pnl, 0)   / wins.length   : 0;
  const avgLoss    = losses.length ? losses.reduce((s,t) => s+t.pnl, 0) / losses.length : 0;
  const winRate    = trades.length ? (wins.length / trades.length) * 100 : 0;

  // Max drawdown
  let peak = 0, trough = 0, maxDD = 0, running = 0;
  for (const t of trades) {
    running += t.pnl;
    if (running > peak) peak = running;
    trough = running - peak;
    if (trough < maxDD) maxDD = trough;
  }

  // Sharpe ratio (annualised)
  const pnls = trades.map(t => t.pnl);
  const mean = pnls.reduce((s,v) => s+v, 0) / (pnls.length || 1);
  const std  = Math.sqrt(pnls.reduce((s,v) => s+(v-mean)**2, 0) / (pnls.length || 1));
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(52) : 0;

  // Profit factor
  const grossWin  = wins.reduce((s,t)  => s+t.pnl, 0);
  const grossLoss = losses.reduce((s,t) => s+Math.abs(t.pnl), 0);
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;

  // Max streak
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
  }

  // Calendar data (monthly P&L)
  const calendar = {};
  for (const t of trades) {
    const ym = t.date.slice(0, 7);
    calendar[ym] = (calendar[ym] || 0) + t.pnl;
  }

  // Day of week breakdown
  const dowPnl = { Mon:[], Tue:[], Wed:[], Thu:[], Fri:[] };
  const dowNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  for (const t of trades) {
    const d = dowNames[new Date(t.date).getDay()];
    if (dowPnl[d]) dowPnl[d].push(t.pnl);
  }
  const dowStats = Object.entries(dowPnl).map(([day, pnls]) => ({
    day,
    trades: pnls.length,
    total:  Math.round(pnls.reduce((s,v) => s+v, 0)),
    avg:    pnls.length ? Math.round(pnls.reduce((s,v) => s+v, 0) / pnls.length) : 0,
    winRate: pnls.length ? Math.round(pnls.filter(p => p>0).length / pnls.length * 100) : 0,
  }));

  const result = {
    stats: {
      totalPnl:     Math.round(totalPnl),
      totalTrades:  trades.length,
      wins:         wins.length,
      losses:       losses.length,
      winRate:      Math.round(winRate * 10) / 10,
      avgWin:       Math.round(avgWin),
      avgLoss:      Math.round(avgLoss),
      maxDD:        Math.round(maxDD),
      sharpe:       Math.round(sharpe * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxWinStreak,
      maxLossStreak,
      bestTrade:    Math.round(Math.max(...trades.map(t => t.pnl), 0)),
      worstTrade:   Math.round(Math.min(...trades.map(t => t.pnl), 0)),
      realDataPct:  trades.length ? Math.round(realDataCount / trades.length * 100) : 0,
    },
    trades:   trades.slice(-100),   // last 100 for trade log
    calendar,
    dowStats,
  };

  try { await kv.set(cacheKey, result, { ex: 86400 }); } catch (_) {}

  res.json(result);
}
