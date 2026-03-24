// src/hooks/useMarketData.js
// Indian markets: NSE/BSE API first, Yahoo as fallback
// All others: Yahoo Finance
import { useState, useEffect, useCallback, useRef } from 'react';
import { MARKETS } from '../data/markets';
import { isMarketOpen } from '../utils/timezone';

const REFRESH_MS = 20000;

// Gift Nifty uses server-side smart caching (10min market hours, 15min off-hours)
// Frontend refreshes it every 10 minutes to match
function getGiftNiftyRefreshMs() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const isOpen = (mins >= 390 && mins < 940) || mins >= 995 || mins < 165;
  return isOpen ? 10 * 60 * 1000 : 15 * 60 * 1000; // 10min or 15min
}

function makeSpark(basePrice, changePct, n = 40) {
  const start = basePrice / (1 + changePct / 100);
  const end   = basePrice;
  const volPct  = Math.max(Math.abs(changePct) * 0.18, 0.12);
  const volStep = (basePrice * volPct) / 100;
  let v = start;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const progress = i / (n - 1);
    const pull  = (end - v) * (0.06 + progress * 0.04);
    const noise = (Math.random() + Math.random() - 1) * volStep;
    v += pull + noise;
    pts.push(v);
  }
  pts[pts.length - 1] = end;
  return pts;
}

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
    const spark     = closes.length >= 5 ? closes : makeSpark(price, changePct);
    // Extra data from Yahoo
    const extra = {
      open:     meta.regularMarketOpen,
      high:     meta.regularMarketDayHigh,
      low:      meta.regularMarketDayLow,
      yearHigh: meta.fiftyTwoWeekHigh,
      yearLow:  meta.fiftyTwoWeekLow,
    };
    return { price, prevClose, change, changePct, spark, ...extra };
  } catch { return null; }
}

// Indian market IDs that have NSE data
const NSE_IDS = new Set(['nifty50', 'banknifty', 'sensex', 'giftnifty']);

export function useMarketData() {
  const [data, setData]             = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [nseData, setNseData]       = useState({});
  const dataRef                     = useRef({});
  const nseRef                      = useRef({});

  // Fetch all Indian indexes from NSE in one call
  const fetchNSE = useCallback(async () => {
    try {
      const res  = await fetch('/api/nse-india');
      const json = await res.json();
      if (json.data) {
        nseRef.current = json.data;
        setNseData({ ...json.data });
        return json.data;
      }
    } catch {}
    return {};
  }, []);

  const fetchMarket = useCallback(async (market, nseSnapshot) => {
    // Gift Nifty — dedicated NSE endpoint
    if (market.id === 'giftnifty') {
      // Try NSE snapshot first
      if (nseSnapshot?.giftnifty) {
        const d = nseSnapshot.giftnifty;
        return { ...d, spark: makeSpark(d.price, d.changePct) };
      }
      // Then dedicated giftnifty API
      try {
        const res  = await fetch('/api/giftnifty');
        const json = await res.json();
        if (json.price && !isNaN(json.price)) {
          return {
            price: json.price, prevClose: json.prevClose || json.price,
            change: json.change || 0, changePct: json.changePct || 0,
            spark: makeSpark(json.price, json.changePct || 0),
            fetchedAt: json.fetchedAt || new Date().toISOString(),
          };
        }
      } catch {}
      // Don't fall back to Nifty 50 spot — it's a different product
      return null;
    }

    // Indian markets — use NSE data if available
    if (NSE_IDS.has(market.id) && nseSnapshot?.[market.id]) {
      const d = nseSnapshot[market.id];
      const existing = dataRef.current[market.id];
      // Only extend spark when market is open, otherwise keep existing spark frozen
      const isOpen = isMarketOpen(market);
      const spark = (!isOpen && existing?.spark?.length > 5)
        ? existing.spark
        : existing?.spark?.length > 5
          ? [...existing.spark.slice(1), d.price]
          : makeSpark(d.price, d.changePct);
      return { ...d, spark };
    }

    // Markets with no free data — skip
    if (market.simulation) return null;

    // All others — Yahoo Finance
    try {
      const res  = await fetch(`/api/quote?symbol=${encodeURIComponent(market.symbol)}`);
      if (!res.ok) throw new Error('API error');
      const json = await res.json();
      return parseYahoo(json);
    } catch { return null; }
  }, []);

  const refresh = useCallback(async () => {
    // Fetch NSE data first (one call for all Indian markets)
    const nseSnapshot = await fetchNSE();

    const results = await Promise.allSettled(
      MARKETS.map(m => fetchMarket(m, nseSnapshot).then(d => ({ id: m.id, data: d })))
    );

    const newData = { ...dataRef.current };
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.data !== null) {
        newData[r.value.id] = r.value.data;
      }
    }

    dataRef.current = newData;
    setData({ ...newData });
    setLastUpdate(new Date());
    setLoading(false);
  }, [fetchMarket, fetchNSE]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, loading, lastUpdate, nseData };
}
