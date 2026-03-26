// api/fiidii-store.js
// Called by Vercel cron at 7pm & 7:30pm IST (1:30pm & 2pm UTC) on weekdays
// Fetches today's FII/DII data from NSE and stores it in Vercel KV
// Each day's data is stored under key: fiidii:YYYY-MM-DD

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Allow manual trigger via browser too
  res.setHeader('Access-Control-Allow-Origin', '*');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const pn = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  const parseRow = row => {
    if (!row) return { net: 0, buy: 0, sell: 0 };
    const net  = pn(row.netValue ?? row.net ?? row.netPurchaseSales ?? row.NET ?? 0);
    const buy  = pn(row.buyValue ?? row.grossPurchase ?? row.BUY ?? row.buy ?? 0);
    const sell = pn(row.sellValue ?? row.grossSales ?? row.SELL ?? row.sell ?? 0);
    return { net: net || (buy - sell), buy, sell };
  };

  const isFII = r => /FII|FPI|FOREIGN/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||''));
  const isDII = r => /DII|DOMESTIC/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||''));

  try {
    // Get NSE cookies
    let cookies = '';
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');

    const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

    // Fetch today's data (no date param = today)
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (!r.ok) return res.status(500).json({ error: 'NSE fetch failed', status: r.status });

    const data = await r.json();
    const rows = Array.isArray(data) ? data : (data.data || []);
    if (!rows.length) return res.status(500).json({ error: 'No rows returned' });

    const fiiRow = rows.find(isFII);
    const diiRow = rows.find(isDII);
    if (!fiiRow && !diiRow) return res.status(500).json({ error: 'Could not find FII/DII rows', sample: rows[0] });

    const f = parseRow(fiiRow);
    const d = parseRow(diiRow);

    // Get today's IST date
    const ist    = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today  = ist.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD

    const record = {
      date:     today,
      fiiNet:   f.net,  fiiBuy:  f.buy,  fiiSell: f.sell,
      diiNet:   d.net,  diiBuy:  d.buy,  diiSell: d.sell,
      storedAt: new Date().toISOString(),
    };

    // Store in KV — key per day, expires after 60 days
    await kv.set(`fiidii:${today}`, JSON.stringify(record), { ex: 60 * 24 * 60 * 60 });

    console.log(`FiiDii stored for ${today}:`, record);
    return res.status(200).json({ success: true, date: today, record });

  } catch (err) {
    console.error('fiidii-store error:', err);
    return res.status(500).json({ error: err.message });
  }
}
