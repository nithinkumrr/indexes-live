// api/fiidii.js — FII/DII with 7-day history
// Uses NSE's main fiidiiTradeReact (today) + historical endpoint for past days
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    cookies = (home.headers.get('set-cookie') || '').split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) { return res.status(500).json({ error: 'Cookie failed' }); }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  const parseNum = v => { const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? 0 : n; };
  const parseRow = row => ({
    net:  parseNum(row?.netValue  ?? row?.net  ?? row?.netPurchaseSales  ?? 0),
    buy:  parseNum(row?.buyValue  ?? row?.grossPurchase  ?? 0),
    sell: parseNum(row?.sellValue ?? row?.grossSales ?? 0),
  });

  const isFII = r => /FII|FPI|FOREIGN/i.test(String(r?.category || r?.clientType || r?.participant || r?.client || ''));
  const isDII = r => /DII|DOMESTIC/i.test(String(r?.category || r?.clientType || r?.participant || r?.client || ''));

  const HOLIDAYS = new Set(['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01']);

  // Get last 7 trading days
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const tradingDays = [];
  const cur = new Date(ist);
  while (tradingDays.length < 7) {
    const iso = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso)) tradingDays.push(iso);
    cur.setDate(cur.getDate() - 1);
  }

  const history = [];

  // Strategy: fetch the fiidiiTradeHistory endpoint which returns multiple days at once
  try {
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact?type=historical', { headers: H });
    if (r.ok) {
      const data = await r.json();
      const rows = Array.isArray(data) ? data : (data.data || []);
      if (rows.length > 1) {
        console.log('Historical endpoint worked, rows:', rows.length);
        // Group by date
        const byDate = {};
        for (const row of rows) {
          const date = row.date || row.tradingDate || row.DATE || '';
          if (!date) continue;
          if (!byDate[date]) byDate[date] = { fii: null, dii: null };
          if (isFII(row)) byDate[date].fii = row;
          if (isDII(row)) byDate[date].dii = row;
        }
        for (const [date, { fii, dii }] of Object.entries(byDate)) {
          if (!fii && !dii) continue;
          const f = parseRow(fii), d = parseRow(dii);
          history.push({ date, fiiNet: f.net, fiiBuy: f.buy, fiiSell: f.sell, diiNet: d.net, diiBuy: d.buy, diiSell: d.sell });
        }
        history.sort((a, b) => new Date(a.date) - new Date(b.date));
      }
    }
  } catch (_) {}

  // If historical didn't work, fetch each date with date param
  if (history.length <= 1) {
    for (const iso of tradingDays) {
      try {
        const [y, m, day] = iso.split('-');
        const nseDate = `${day}-${m}-${y}`;

        // Try with date param
        const r = await fetch(`https://www.nseindia.com/api/fiidiiTradeReact?date=${nseDate}`, { headers: H });
        let rows = [];
        if (r.ok) {
          const data = await r.json();
          rows = Array.isArray(data) ? data : (data.data || []);
        }

        // For today, also try without param
        const istToday = ist.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (!rows.length && iso === istToday) {
          const r2 = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
          if (r2.ok) {
            const data = await r2.json();
            rows = Array.isArray(data) ? data : (data.data || []);
          }
        }
        if (!rows.length) continue;

        const fiiRow = rows.find(isFII);
        const diiRow = rows.find(isDII);
        if (!fiiRow && !diiRow) continue;

        const f = parseRow(fiiRow), d = parseRow(diiRow);

        // Only add if data is different from previous day (dedup NSE returning same day repeatedly)
        const prev = history[history.length - 1];
        if (prev && prev.fiiNet === f.net && prev.diiNet === d.net) continue;

        history.push({ date: iso, fiiNet: f.net, fiiBuy: f.buy, fiiSell: f.sell, diiNet: d.net, diiBuy: d.buy, diiSell: d.sell });
      } catch (_) {}
    }
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  const latest = history[history.length - 1] || {};

  return res.json({
    fiiNet: latest.fiiNet || 0, fiiBuy: latest.fiiBuy || 0, fiiSell: latest.fiiSell || 0,
    diiNet: latest.diiNet || 0, diiBuy: latest.diiBuy || 0, diiSell: latest.diiSell || 0,
    date: latest.date || '',
    history: history.slice(-7),
    source: history.length > 1 ? 'nse-history' : 'nse-today',
    daysFound: history.length,
  });
}
