// api/kite-hero.js
// 1-second polling endpoint for the 3 India hero cards
// Nifty 50, Sensex, Bank Nifty — batched in one Kite call

async function getToken() {
  const uUrl = process.env.UPSTASH_REDIS_REST_URL;
  const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (uUrl && uTok) {
    try {
      const r = await fetch(`${uUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${uTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  const kvUrl = process.env.KV_REST_API_URL;
  const kvTok = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvTok) {
    try {
      const r = await fetch(`${kvUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${kvTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  return null;
}

const HEROES = [
  { id: 'nifty50',   instrument: 'NSE:NIFTY 50'  },
  { id: 'sensex',    instrument: 'BSE:SENSEX'     },
  { id: 'banknifty', instrument: 'NSE:NIFTY BANK' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // No caching — this is a 1s polling endpoint
  res.setHeader('Cache-Control', 'no-store');

  const apiKey = process.env.KITE_API_KEY;
  const token  = await getToken();

  if (!token || !apiKey) {
    return res.status(401).json({ error: 'no_token' });
  }

  try {
    const params = HEROES.map(h => `i=${encodeURIComponent(h.instrument)}`).join('&');
    const r      = await fetch(`https://api.kite.trade/quote?${params}`, {
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${apiKey}:${token}`,
      },
    });

    if (r.status === 401 || r.status === 403) {
      return res.status(401).json({ error: 'token_expired' });
    }

    if (!r.ok) throw new Error(`Kite ${r.status}`);

    const json = await r.json();
    if (json.status !== 'success') throw new Error('Kite error');

    const result = {};
    for (const h of HEROES) {
      const q = json.data?.[h.instrument];
      if (!q) continue;
      const price     = q.last_price;
      const prevClose = q.ohlc?.close || price;
      const change    = parseFloat((price - prevClose).toFixed(2));
      const changePct = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
      result[h.id] = {
        price,
        prevClose,
        change,
        changePct,
        open: q.ohlc?.open,
        high: q.ohlc?.high,
        low:  q.ohlc?.low,
        volume: q.volume_traded,
      };
    }

    return res.json({ data: result, ts: Date.now() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
