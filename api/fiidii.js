// api/fiidii.js — FII/DII daily trading data from NSE
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); // 5min cache

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Step 1: get session cookie
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'Cookie fetch failed' });
  }

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Referer': 'https://www.nseindia.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    Cookie: cookies,
  };

  try {
    const r    = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (!r.ok) throw new Error(`NSE returned ${r.status}`);
    const data = await r.json();

    // NSE returns array of objects with date, fiiNet, diiNet etc.
    // Find today's or most recent entry
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty response');

    // Sort by date descending, take most recent
    const sorted = [...data].sort((a, b) => {
      const da = new Date(a.date || a.DATE || 0);
      const db = new Date(b.date || b.DATE || 0);
      return db - da;
    });

    const latest = sorted[0];
    // NSE field names vary — try multiple
    const fiiNet = parseFloat(
      latest.fiiNet ?? latest.FII_NET ?? latest.fiinet ?? latest['FII NET'] ?? 0
    );
    const diiNet = parseFloat(
      latest.diiNet ?? latest.DII_NET ?? latest.diinet ?? latest['DII NET'] ?? 0
    );
    const date   = latest.date ?? latest.DATE ?? latest.tradeDate ?? 'Today';

    // Also grab last 5 days for sparkline trend
    const history = sorted.slice(0, 10).reverse().map(d => ({
      date:   d.date ?? d.DATE ?? '',
      fiiNet: parseFloat(d.fiiNet ?? d.FII_NET ?? d.fiinet ?? 0),
      diiNet: parseFloat(d.diiNet ?? d.DII_NET ?? d.diinet ?? 0),
    }));

    return res.json({ fiiNet, diiNet, date, history, source: 'nse-live', raw: latest });
  } catch (e) {
    return res.status(503).json({ error: e.message, source: 'failed' });
  }
}
