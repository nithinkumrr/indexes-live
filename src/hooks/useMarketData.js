// src/hooks/useMarketData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { MARKETS } from '../data/markets';

const REFRESH_MS = 20000; // refresh every 20 seconds

// Generate a sparkline as a realistic intraday price journey.
// Points are raw price-like values — NOT normalized to 0-100.
// The journey starts near prevClose and ends at current price, with realistic noise.
function makeSpark(basePrice, changePct, n = 40) {
  // start = yesterday's close (approx), end = today's price
  const start = basePrice / (1 + changePct / 100);
  const end   = basePrice;
  const pts   = [];

  // Volatility scales with magnitude of move — bigger moves = noisier chart
  const volPct  = Math.max(Math.abs(changePct) * 0.18, 0.12);
  const volStep = (basePrice * volPct) / 100;

  let v = start;
  for (let i = 0; i < n; i++) {
    const progress  = i / (n - 1);
    // Pull toward end price progressively
    const pull      = (end - v) * (0.06 + progress * 0.04);
    // Gaussian-ish noise
    const noise     = (Math.random() + Math.random() - 1) * volStep;
    v += pull + noise;
    pts.push(v);
  }
  // Guarantee last point is exactly the current price
  pts[pts.length - 1] = end;
  return pts;
}

// Parse Yahoo Finance chart response
function parseYahoo(data, market) {
  try {
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose;
    const change = price - prevClose;
    const changePct = (change / prevClose) * 100;

    // Extract intraday closes for sparkline
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter(v => v !== null && !isNaN(v));

    let spark;
    if (validCloses.length >= 5) {
      // Use raw price values — Sparkline handles its own scaling now
      spark = validCloses;
    } else {
      spark = makeSpark(price, changePct);
    }

    return { price, prevClose, change, changePct, spark, live: true };
  } catch {
    return null;
  }
}

// Simulate data from fallback base prices
function simulateData(market, existing) {
  if (existing && existing.simulated) {
    const tick = (Math.random() - 0.5) * 0.0004 * existing.price;
    const price = existing.price + tick;
    const change = price - market.fallback.prevClose;
    const changePct = (change / market.fallback.prevClose) * 100;
    // Append real price to spark array — same units as the line chart
    const spark = [...existing.spark.slice(1), price];
    return { price, prevClose: market.fallback.prevClose, change, changePct, spark, simulated: true };
  }
  const pctSeed = (Math.random() - 0.5) * 2.5;
  const price = market.fallback.price * (1 + pctSeed / 100);
  const change = price - market.fallback.prevClose;
  const changePct = (change / market.fallback.prevClose) * 100;
  const spark = makeSpark(price, changePct);
  return { price, prevClose: market.fallback.prevClose, change, changePct, spark, simulated: true };
}

export function useMarketData() {
  const [data, setData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingSimulation, setUsingSimulation] = useState(false);
  const dataRef = useRef({});

  const fetchMarket = useCallback(async (market) => {
    // Gift Nifty — use dedicated NSE India endpoint
    if (market.id === 'giftnifty') {
      try {
        const res = await fetch('/api/giftnifty');
        if (!res.ok) throw new Error('Gift Nifty API error');
        const json = await res.json();
        if (json.price && !isNaN(json.price)) {
          const price     = json.price;
          const prevClose = json.prevClose || price;
          const change    = json.change || 0;
          const changePct = json.changePct || 0;
          const spark     = makeSpark(price, changePct);
          return { price, prevClose, change, changePct, spark, simulated: false };
        }
      } catch { /* fall through to simulation */ }
      return simulateData(market, dataRef.current[market.id]);
    }

    // Skip Yahoo API for markets with no coverage
    if (market.simulation) {
      return simulateData(market, dataRef.current[market.id]);
    }
    try {
      const res = await fetch(`/api/quote?symbol=${encodeURIComponent(market.symbol)}`);
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      const parsed = parseYahoo(json, market);
      if (parsed) return { ...parsed, simulated: false };
    } catch {
      // Fall through to simulation
    }
    return simulateData(market, dataRef.current[market.id]);
  }, []);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(
      MARKETS.map(m => fetchMarket(m).then(d => ({ id: m.id, data: d })))
    );

    const newData = {};
    let hasReal = false;
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data) {
        newData[r.value.id] = r.value.data;
        if (!r.value.data.simulated) hasReal = true;
      }
    }

    dataRef.current = newData;
    setData({ ...newData });
    setLastUpdate(new Date());
    setLoading(false);
    setUsingSimulation(!hasReal);
  }, [fetchMarket]);

  // Tick live-only simulation while waiting between refreshes
  const tickSimulation = useCallback(() => {
    setData(prev => {
      const next = {};
      let changed = false;
      for (const [id, d] of Object.entries(prev)) {
        if (d.simulated) {
          const market = MARKETS.find(m => m.id === id);
          if (market) {
            next[id] = simulateData(market, d);
            changed = true;
          } else {
            next[id] = d;
          }
        } else {
          next[id] = d;
        }
      }
      if (!changed) return prev;
      dataRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
    const refreshInterval = setInterval(refresh, REFRESH_MS);
    const tickInterval = setInterval(tickSimulation, 3000);
    return () => { clearInterval(refreshInterval); clearInterval(tickInterval); };
  }, [refresh, tickSimulation]);

  return { data, loading, lastUpdate, usingSimulation };
}
