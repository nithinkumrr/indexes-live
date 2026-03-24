// Temporary debug endpoint - delete after fixing
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const uUrl = process.env.UPSTASH_REDIS_REST_URL;
  const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  const apiKey = process.env.KITE_API_KEY;

  let token = null;
  let tokenStatus = 'not found';

  if (uUrl && uTok) {
    try {
      const r = await fetch(`${uUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${uTok}` } });
      const d = await r.json();
      token = d?.result;
      tokenStatus = token ? 'found in upstash' : 'empty in upstash';
    } catch (e) { tokenStatus = 'upstash error: ' + e.message; }
  }

  if (!token || !apiKey) {
    return res.json({ tokenStatus, hasApiKey: !!apiKey });
  }

  // Try the symbols
  const symbols = ['INDICES:GIFT NIFTY', 'INDICES:GIFTNIFTY'];
  const results = {};

  for (const sym of symbols) {
    try {
      const r = await fetch(`https://api.kite.trade/quote?i=${encodeURIComponent(sym)}`, {
        headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` }
      });
      const d = await r.json();
      results[sym] = { status: r.status, data: d };
    } catch (e) {
      results[sym] = { error: e.message };
    }
  }

  return res.json({ tokenStatus, results });
}
