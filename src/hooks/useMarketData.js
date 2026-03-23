// src/hooks/useMarketData.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { MARKETS } from '../data/markets';

const REFRESH_MS = 20000; // refresh every 20 seconds

// Generate a realistic sparkline from seed + trend
function makeSpark(basePrice, changePct, n = 30) {
  const pts = [];
  let v = 50;
  const trend = changePct * 0.18;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.48 + trend * 0.1) * 3.5;
    v = Math.clamp ? Math.clamp(v, 4, 96) : Math.max(4, Math.min(96, v));
    pts.push(v);
  }
  // Make sure the last point reflects the overall direction
  pts[pts.length - 1] = changePct >= 0 ? Math.max(pts[pts.length - 1], 52) : Math.min(pts[pts.length - 1], 48);
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
      // Normalize closes to 0–100 range for sparkline
      const mn = Math.min(...validCloses), mx = Math.max(...validCloses);
      const range = mx - mn || 1;
      spark = validCloses.map(v => ((v - mn) / range) * 88 + 6);
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
    // Continue existing simulation — small tick
    const tick = (Math.random() - 0.5) * 0.0004 * existing.price;
    const price = existing.price + tick;
    const change = price - market.fallback.prevClose;
    const changePct = (change / market.fallback.prevClose) * 100;
    // Update sparkline
    const spark = [...existing.spark.slice(1)];
    let last = spark[spark.length - 1] + (Math.random() - 0.48) * 2.5;
    last = Math.max(4, Math.min(96, last));
    spark.push(last);
    return { price, prevClose: market.fallback.prevClose, change, changePct, spark, simulated: true };
  }
  // Initial simulation
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
