// src/hooks/useMarketData.js
// NO simulation. If data is unavailable, return null — cards show "—".
import { useState, useEffect, useCallback, useRef } from 'react';
import { MARKETS } from '../data/markets';

const REFRESH_MS = 20000;

// Build sparkline from real intraday closes
function makeSpark(closes) {
  if (!closes || closes.length < 2) return [];
  return closes;
}

// Parse Yahoo Finance chart response
function parseYahoo(data) {
  try {
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta      = result.meta;
    const price     = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose;
    if (!price || !prevClose) return null;
    const change    = price - prevClose;
    const changePct = (change / prevClose) * 100;
    const closes    = (result.indicators?.quote?.[0]?.close ?? []).filter(v => v !== null && !isNaN(v));
    const spark     = closes.length >= 5 ? closes : [];
    return { price, prevClose, change, changePct, spark };
  } catch {
    return null;
  }
}

export function useMarketData() {
  const [data, setData]           = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading]     = useState(true);
  const dataRef                   = useRef({});

  const fetchMarket = useCallback(async (market) => {
    // Gift Nifty — dedicated NSE India endpoint
    if (market.id === 'giftnifty') {
      try {
        const res  = await fetch('/api/giftnifty');
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.price && !isNaN(json.price)) {
          return {
            price:     json.price,
            prevClose: json.prevClose || json.price,
            change:    json.change    || 0,
            changePct: json.changePct || 0,
            spark:     [],
          };
        }
      } catch { /* intentionally empty — no data is better than fake data */ }
      return null; // No data available — show "—"
    }

    // Markets with no free data source — show "—" honestly
    if (market.simulation) return null;

    // All other markets — Yahoo Finance
    try {
      const res  = await fetch(`/api/quote?symbol=${encodeURIComponent(market.symbol)}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      return parseYahoo(json);
    } catch {
      return null; // No data — show "—"
    }
  }, []);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled(
      MARKETS.map(m => fetchMarket(m).then(d => ({ id: m.id, data: d })))
    );

    const newData = {};
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data !== null) {
        newData[r.value.id] = r.value.data;
      }
      // null means no data — we simply don't store it, card will show "—"
    }

    // Keep previous data for markets that haven't responded yet on this cycle
    const merged = { ...dataRef.current };
    for (const [id, d] of Object.entries(newData)) {
      merged[id] = d;
    }

    dataRef.current = merged;
    setData({ ...merged });
    setLastUpdate(new Date());
    setLoading(false);
  }, [fetchMarket]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, lastUpdate };
}
