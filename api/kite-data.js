// api/kite-data.js — Fetches live F&O data from Kite
// Requires kite_token cookie (set after login)

const KITE_BASE = 'https://api.kite.trade';

function getToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/kite_token=([^;]+)/);
  return match ? match[1] : null;
}

async function kiteGet(path, token, apiKey) {
  const r = await fetch(`${KITE_BASE}${path}`, {
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${apiKey}:${token}`,
    }
  });
  if (!r.ok) throw new Error(`Kite API ${r.status}: ${path}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const token  = getToken(req);
  const apiKey = process.env.KITE_API_KEY;

  if (!token) {
    return res.status(401).json({ error: 'not_authenticated', loginUrl: `/api/kite-auth` });
  }

  try {
    const { type = 'giftnifty' } = req.query;

    if (type === 'giftnifty') {
      // Gift Nifty near-month futures: NSE:NIFTY25APRFUT (changes monthly)
      // Use the indices endpoint to get current expiry
      const quote = await kiteGet('/quote?i=NSE:NIFTY50', token, apiKey);
      // Also fetch Gift Nifty futures via instruments
      // NSE IFSC futures symbol: GIFT_NIFTY
      const giftQuote = await kiteGet('/quote?i=NSEIX:GIFT_NIFTY25APR', token, apiKey);
      return res.json({ type: 'giftnifty', data: giftQuote.data });
    }

    if (type === 'option_chain') {
      const symbol = req.query.symbol || 'NIFTY';
      const expiry = req.query.expiry || '';
      const oc = await kiteGet(
        `/instruments/NSE?segment=NFO-OPT&name=${symbol}${expiry ? `&expiry=${expiry}` : ''}`,
        token, apiKey
      );
      return res.json({ type: 'option_chain', data: oc });
    }

    if (type === 'status') {
      const profile = await kiteGet('/user/profile', token, apiKey);
      return res.json({ authenticated: true, user: profile.data?.user_name });
    }

    return res.status(400).json({ error: 'unknown type' });
  } catch (e) {
    if (e.message.includes('403') || e.message.includes('401')) {
      return res.status(401).json({ error: 'token_expired', loginUrl: `/api/kite-auth` });
    }
    return res.status(500).json({ error: e.message });
  }
}
