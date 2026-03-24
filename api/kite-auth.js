// api/kite-auth.js
// Step 1: Redirect user to Kite login
export default async function handler(req, res) {
  // Status check endpoint (replaces kite-data.js)
  if (req.query.type === 'status') {
    const uUrl = process.env.UPSTASH_REDIS_REST_URL;
    const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
    let token = null;
    if (uUrl && uTok) {
      try {
        const r = await fetch(`${uUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${uTok}` } });
        const d = await r.json();
        token = d?.result;
      } catch (_) {}
    }
    return res.json({ authenticated: !!token });
  }
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'KITE_API_KEY not set' });
  const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`;
  res.redirect(loginUrl);
}
