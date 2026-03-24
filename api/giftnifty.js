// api/giftnifty.js — Gift Nifty via Kite Connect
// Fetches NSE IFSC near-month Nifty futures (actual Gift Nifty)
// Sessions: 6:30–9:00 AM and 4:35 PM–2:45 AM IST, every 15 mins

const KITE_BASE = 'https://api.kite.trade';

function getISTInfo() {
  const now  = new Date();
  const ist  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const session1 = mins >= 390 && mins < 540;   // 6:30–9:00 AM
  const session2 = mins >= 995 || mins < 165;   // 4:35 PM–2:45 AM
  const isOpen   = session1 || session2;
  const cacheSecs = isOpen ? 900 : 3600;
  return { isOpen, session1, session2, cacheSecs };
}

async function getToken(req) {
  // Try Upstash
  const uUrl = process.env.UPSTASH_REDIS_REST_URL;
  const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (uUrl && uTok) {
    try {
      const r = await fetch(`${uUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${uTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  // Try KV
  const kUrl = process.env.KV_REST_API_URL;
  const kTok = process.env.KV_REST_API_TOKEN;
  if (kUrl && kTok) {
    try {
      const r = await fetch(`${kUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${kTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  const m = (req.headers?.cookie || '').match(/kite_token=([^;]+)/);
  return m ? m[1] : null;
}

async function kiteGet(path, apiKey, token) {
  const r = await fetch(`${KITE_BASE}${path}`, {
    headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` }
  });
  if (r.status === 401 || r.status === 403) throw new Error('token_expired');
  if (!r.ok) throw new Error(`Kite ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { isOpen, session1, session2, cacheSecs } = getISTInfo();
  res.setHeader('Cache-Control', `s-maxage=${cacheSecs}, stale-while-revalidate=${cacheSecs}`);

  if (!isOpen) {
    return res.json({ price: null, isOpen: false, message: 'Outside Gift Nifty fetch window' });
  }

  const apiKey = process.env.KITE_API_KEY;
  const token  = await getToken(req);

  if (!token || !apiKey) {
    return res.json({ price: null, isOpen, error: 'data_unavailable' });
  }

  try {
    const candidates = [
      'NSEIX:GIFT NIFTY',
    ];

    // Try quoting each symbol
    for (const sym of candidates) {
      try {
        const data = await kiteGet(`/quote?i=${encodeURIComponent(sym)}`, apiKey, token);
        const q    = data?.data?.[sym];
        if (!q?.last_price) continue;

        const price  = q.last_price;
        const pc     = q.ohlc?.close || q.ohlc?.open || price;
        const change = price - pc;

        return res.json({
          price,
          prevClose: pc,
          change:    parseFloat(change.toFixed(2)),
          changePct: pc > 0 ? parseFloat(((change / pc) * 100).toFixed(2)) : 0,
          open:      q.ohlc?.open,
          high:      q.ohlc?.high,
          low:       q.ohlc?.low,
          isOpen,
          source:    'nseix',
          fetchedAt: new Date().toISOString(),
        });
      } catch (e) {
        if (e.message === 'token_expired') {
          return res.status(401).json({ error: 'data_unavailable' });
        }
        continue;
      }
    }

    return res.status(503).json({ error: 'Data unavailable' });

  } catch (e) {
    if (e.message === 'token_expired') {
      return res.status(401).json({ error: 'data_unavailable' });
    }
    return res.status(500).json({ error: e.message });
  }
}
