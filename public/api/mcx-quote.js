// api/mcx-quote.js
// Fetches MCX futures quotes from Kite Connect.
// Kite quotes MCX by tradingsymbol e.g. MCX:GOLDAPR26FUT
// Gold is quoted per 10g, Silver per kg.
// This endpoint accepts ?symbol=MCX:GOLDAPR26FUT and returns a normalised response.

import { kv } from '@vercel/kv';

const KITE_BASE = 'https://api.kite.trade';

async function getKiteToken() {
  try { return await kv.get('kite_token'); } catch (_) { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  const apiKey = process.env.KITE_API_KEY;
  const token  = await getKiteToken();

  if (!apiKey || !token) {
    return res.status(200).json({ price: null, error: 'not_authenticated' });
  }

  try {
    // Kite quote endpoint accepts tradingsymbol in format EXCHANGE:SYMBOL
    const r = await fetch(`${KITE_BASE}/quote?i=${encodeURIComponent(symbol)}`, {
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${apiKey}:${token}`,
      },
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      // Kite returns 403 for expired/wrong symbols, 400 for invalid format
      if (r.status === 400 || r.status === 403) {
        return res.status(200).json({ price: null, error: `kite_${r.status}`, detail: errText.slice(0, 100) });
      }
      throw new Error(`Kite ${r.status}`);
    }

    const json = await r.json();
    const q    = json?.data?.[symbol];

    if (!q) {
      return res.status(200).json({ price: null, error: 'no_data', symbol });
    }

    return res.json({
      price:      q.last_price,
      prevClose:  q.ohlc?.close || q.ohlc?.open || q.last_price,
      open:       q.ohlc?.open,
      high:       q.ohlc?.high,
      low:        q.ohlc?.low,
      volume:     q.volume,
      oi:         q.oi,
      symbol,
    });

  } catch (err) {
    return res.status(200).json({ price: null, error: err.message });
  }
}
