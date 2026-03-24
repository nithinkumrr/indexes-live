// api/kite-data.js — Generic Kite data endpoint
const KITE_BASE = 'https://api.kite.trade';

async function getKVToken() {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(`${url}/get/kite_token`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    return d?.result || null;
  } catch { return null; }
}

function getCookieToken(req) {
  const m = (req.headers.cookie || '').match(/kite_token=([^;]+)/);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const apiKey      = process.env.KITE_API_KEY;
  const accessToken = await getKVToken() || getCookieToken(req);

  if (!accessToken || !apiKey) {
    return res.status(401).json({ error: 'not_authenticated', loginUrl: '/api/kite-auth' });
  }

  const { type = 'status' } = req.query;

  try {
    if (type === 'status') {
      const r    = await fetch(`${KITE_BASE}/user/profile`, {
        headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${accessToken}` }
      });
      if (r.status === 403 || r.status === 401) {
        return res.status(401).json({ error: 'token_expired', loginUrl: '/api/kite-auth' });
      }
      const d = await r.json();
      return res.json({ authenticated: true, user: d.data?.user_name });
    }

    return res.status(400).json({ error: 'unknown type' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
