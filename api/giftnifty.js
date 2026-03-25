// api/giftnifty.js — Gift Nifty via Kite Connect
// Token 291849 = GIFT NIFTY on NSE IX

const KITE_BASE = 'https://api.kite.trade';

function getISTMins() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.getHours() * 60 + ist.getMinutes();
}

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
  const kUrl = process.env.KV_REST_API_URL;
  const kTok = process.env.KV_REST_API_TOKEN;
  if (kUrl && kTok) {
    try {
      const r = await fetch(`${kUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${kTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const mins     = getISTMins();
  const session1 = mins >= 390 && mins < 540;
  const session2 = mins >= 995 || mins < 165;
  const isOpen   = session1 || session2;

  const apiKey = process.env.KITE_API_KEY;
  const token  = await getToken();

  // Debug info always returned
  const debug = { mins, isOpen, hasApiKey: !!apiKey, hasToken: !!token };

  if (!token || !apiKey) {
    return res.json({ price: null, isOpen, error: 'not_authenticated', debug });
  }

  try {
    // Try instrument token 291849
    const r = await fetch(`${KITE_BASE}/quote?i=291849`, {
      headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` }
    });

    debug.kiteStatus = r.status;

    if (r.status === 401 || r.status === 403) {
      return res.json({ price: null, isOpen, error: 'token_expired', debug });
    }

    const json = await r.json();
    debug.responseKeys = Object.keys(json?.data || {});

    // Kite returns data keyed by token as string
    const q = json?.data?.['291849'] || json?.data?.[291849];

    if (!q) {
      return res.json({ price: null, isOpen, error: 'no_quote', debug });
    }

    const price  = q.last_price;
    const pc     = q.ohlc?.close || q.ohlc?.open || price;
    const change = parseFloat((price - pc).toFixed(2));

    return res.json({
      price,
      prevClose: pc,
      change,
      changePct: pc > 0 ? parseFloat(((change / pc) * 100).toFixed(2)) : 0,
      open:  q.ohlc?.open,
      high:  q.ohlc?.high,
      low:   q.ohlc?.low,
      isOpen,
      debug,
    });

  } catch (e) {
    return res.json({ price: null, isOpen, error: e.message, debug });
  }
}
