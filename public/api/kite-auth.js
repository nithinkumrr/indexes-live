// api/kite-auth.js
// GET /api/kite-auth          → redirects to Kite login
// GET /api/kite-auth?action=callback&request_token=xxx → stores token
// GET /api/kite-auth?action=status → returns token status
// Visit /api/kite-auth every morning after 6:30 AM IST to refresh session

import crypto from 'crypto';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey    = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;
  const action    = req.query?.action;

  // ── Status check ────────────────────────────────────────────────────────
  if (action === 'status') {
    try {
      const token = await kv.get('kite_token');
      const stored = await kv.get('kite_token_time');
      return res.json({ hasToken: !!token, storedAt: stored || null, apiKeySet: !!apiKey });
    } catch(e) {
      return res.json({ hasToken: false, error: e.message });
    }
  }

  // ── Callback from Kite ────────────────────────────────────────────────── 
  if (action === 'callback' || req.query?.request_token) {
    const requestToken = req.query?.request_token;
    if (!requestToken || !apiKey || !apiSecret) {
      return res.status(400).send('Missing request_token, KITE_API_KEY or KITE_API_SECRET');
    }
    try {
      // Generate checksum
      const checksum = crypto.createHash('sha256')
        .update(apiKey + requestToken + apiSecret)
        .digest('hex');

      // Exchange for access token
      const r = await fetch('https://api.kite.trade/session/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Kite-Version': '3' },
        body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }),
      });
      const d = await r.json();
      if (!d?.data?.access_token) {
        return res.status(400).send(`Kite error: ${JSON.stringify(d)}`);
      }
      const accessToken = d.data.access_token;
      const now = new Date().toISOString();
      await kv.set('kite_token', accessToken, { ex: 30 * 60 * 60 }); // 30h expiry
      await kv.set('kite_token_time', now, { ex: 30 * 60 * 60 });

      return res.send(`
        <html><body style="font-family:monospace;background:#111;color:#eee;padding:40px">
          <h2 style="color:#00C896">✅ Kite session stored</h2>
          <p>Access token saved to KV. Valid for ~24h.</p>
          <p style="color:#666">Stored at: ${now}</p>
          <p><a href="/" style="color:#4A9EFF">← Back to indexes.live</a></p>
        </body></html>
      `);
    } catch(e) {
      return res.status(500).send(`Error: ${e.message}`);
    }
  }

  // ── Initiate login ───────────────────────────────────────────────────────
  if (!apiKey) {
    return res.status(500).send('KITE_API_KEY not set in Vercel env variables');
  }
  const loginUrl = `https://kite.trade/connect/login?api_key=${apiKey}&v=3`;
  return res.redirect(loginUrl);
}
