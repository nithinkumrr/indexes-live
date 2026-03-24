import { createHash } from 'crypto';

export default async function handler(req, res) {
  const { request_token, status } = req.query;

  if (status === 'error' || !request_token) {
    return res.redirect('/?kite=error');
  }

  const apiKey    = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return res.redirect('/?kite=error&reason=missing_keys');
  }

  const checksum = createHash('sha256')
    .update(apiKey + request_token + apiSecret)
    .digest('hex');

  try {
    const r = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: {
        'X-Kite-Version': '3',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ api_key: apiKey, request_token, checksum }).toString(),
    });

    const data = await r.json();

    if (!r.ok || !data.data?.access_token) {
      console.error('Kite session error:', JSON.stringify(data));
      return res.redirect('/?kite=error');
    }

    const accessToken = data.data.access_token;

    // Store token in cookie — 8 hours
    res.setHeader('Set-Cookie', [
      `kite_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=28800; Path=/`,
    ]);

    res.redirect('/?kite=success#fno');
  } catch (e) {
    console.error('Kite callback error:', e.message);
    res.redirect('/?kite=error');
  }
}
