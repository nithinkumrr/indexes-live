// api/quote.js — Yahoo Finance proxy + Gift Nifty via Kite
import { kv } from '@vercel/kv';

const KITE_BASE = 'https://api.kite.trade';

async function getKiteToken() {
  try { return await kv.get('kite_token'); } catch (_) { return null; }
}

function getISTMins() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.getHours() * 60 + ist.getMinutes();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol, range = '1d', interval = '5m' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  // Gift Nifty via Kite (token 291849 = GIFT NIFTY on NSE IX)
  if (symbol === '%5EGIFTNIFTY' || symbol === 'GIFT_NIFTY' || symbol === 'GIFTNIFTY') {
    const mins = getISTMins();
    const isOpen = (mins >= 390 && mins < 945) || (mins >= 990 || mins < 150);
    const apiKey = process.env.KITE_API_KEY;
    const token  = await getKiteToken();
    if (token && apiKey) {
      try {
        const r = await fetch(`${KITE_BASE}/quote?i=291849`, {
          headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` }
        });
        if (r.ok) {
          const json = await r.json();
          const q = json?.data?.['291849'] || json?.data?.[291849];
          if (q) {
            const price = q.last_price;
            const pc    = q.ohlc?.close || q.ohlc?.open || price;
            return res.json({ price, change: +(price-pc).toFixed(2), changePct: pc > 0 ? +((price-pc)/pc*100).toFixed(2) : 0, open: q.ohlc?.open, high: q.ohlc?.high, low: q.ohlc?.low, isOpen, source: 'kite' });
          }
        }
      } catch (_) {}
    }
    return res.json({ price: null, isOpen, error: 'not_authenticated' });
  }

  // All other symbols — Yahoo Finance
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!r.ok) throw new Error(`Yahoo ${r.status}`);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
