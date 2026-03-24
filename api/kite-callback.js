// api/kite-callback.js
// Step 2: Kite redirects here with ?request_token=xxx
// We exchange it for an access token and store it
import crypto from 'crypto';

export default async function handler(req, res) {
  const { request_token, status } = req.query;

  if (status === 'error' || !request_token) {
    return res.redirect('/?kite=error');
  }

  const apiKey    = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  // Generate checksum: sha256(api_key + request_token + api_secret)
  const checksum = crypto
    .createHash('sha256')
    .update(apiKey + request_token + apiSecret)
    .digest('hex');

  try {
    const r = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: apiKey, request_token, checksum }),
    });

    const data = await r.json();
    if (!r.ok || !data.data?.access_token) {
      return res.redirect('/?kite=error');
    }

    const accessToken = data.data.access_token;
    const expiry      = Date.now() + 8 * 60 * 60 * 1000; // 8 hours

    // Store in a cookie (httpOnly, secure)
    res.setHeader('Set-Cookie',
      `kite_token=${accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=28800; Path=/`
    );
    res.setHeader('Set-Cookie',
      `kite_expiry=${expiry}; HttpOnly; Secure; SameSite=Strict; Max-Age=28800; Path=/`
    );

    res.redirect('/?kite=success');
  } catch (e) {
    res.redirect('/?kite=error');
  }
}
