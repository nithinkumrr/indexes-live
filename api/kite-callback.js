import { createHash } from 'crypto';

async function saveToken(token, userName) {
  const EX = 72000; // 20 hours

  // Try Upstash Redis
  const upstashUrl   = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl}/set/kite_token/${token}?ex=${EX}`, {
        headers: { Authorization: `Bearer ${upstashToken}` }
      });
          console.log('Token saved to Upstash');
      return true;
    } catch (e) { console.error('Upstash save failed:', e.message); }
  }

  // Try Vercel KV
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    try {
      await fetch(`${kvUrl}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['SET', 'kite_token', token, 'EX', EX],
          ['SET', 'kite_user',  userName, 'EX', EX],
        ])
      });
      return true;
    } catch (e) { console.error('KV save failed:', e.message); }
  }

  return false;
}

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
      headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: apiKey, request_token, checksum }).toString(),
    });

    const data = await r.json();

    if (!r.ok || !data.data?.access_token) {
      console.error('Kite session error:', JSON.stringify(data));
      return res.redirect('/?kite=error');
    }

    const accessToken = data.data.access_token;
  

    // Save to storage
    await saveToken(accessToken, '');

    // Cookie as extra fallback
    res.setHeader('Set-Cookie',
      `kite_token=${accessToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=72000; Path=/`
    );

    // Redirect to F&O page
    res.redirect('/#/fno?kite=success');
  } catch (e) {
    console.error('Kite callback error:', e.message);
    res.redirect('/?kite=error');
  }
}
