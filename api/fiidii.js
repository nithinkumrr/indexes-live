// api/fiidii.js — FII/DII with 7-day history
// Strategy: fetch each of last 7 trading days individually from NSE
// NSE endpoint: /api/fiidiiTradeReact?date=DD-MM-YYYY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  // Get session cookie once
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'Cookie fetch failed' });
  }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };
  const parseNum = v => { const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) ? 0 : n; };

  // Holidays to skip when generating trading days
  const HOLIDAYS_2026 = new Set([
    '2026-01-26','2026-02-17','2026-03-03','2026-03-26',
    '2026-03-31','2026-04-03','2026-04-14','2026-05-01',
    '2026-05-28','2026-06-26','2026-09-14','2026-10-02',
    '2026-10-20','2026-11-10','2026-11-24','2026-12-25',
  ]);

  // Get last 7 trading days in IST
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const istToday = istNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const tradingDays = [];
  let cur = new Date(istNow);

  // If before 6pm IST, yesterday might still be the latest data
  while (tradingDays.length < 7) {
    const iso = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dow = new Date(iso + 'T00:00:00+05:30').getDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS_2026.has(iso)) {
      tradingDays.push(iso);
    }
    cur.setDate(cur.getDate() - 1);
  }

  // Fetch each trading day
  const history = [];
  for (const iso of tradingDays) {
    try {
      const [y, m, day] = iso.split('-');
      const nseDate = `${day}-${m}-${y}`; // NSE wants DD-MM-YYYY

      // Try with date param first
      let rows = [];
      const r1 = await fetch(`https://www.nseindia.com/api/fiidiiTradeReact?date=${nseDate}`, { headers: H });
      if (r1.ok) {
        const data = await r1.json();
        rows = Array.isArray(data) ? data : (data.data || []);
      }

      // If no date param, try without (today's data)
      if (!rows.length && iso === istToday) {
        const r2 = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
        if (r2.ok) {
          const data = await r2.json();
          rows = Array.isArray(data) ? data : (data.data || []);
        }
      }

      if (!rows.length) continue;

      const fiiRow = rows.find(e => /FII|FPI|FOREIGN/i.test(String(e.category || e.client || e.clientType || '')));
      const diiRow = rows.find(e => /DII|DOMESTIC/i.test(String(e.category || e.client || e.clientType || '')));
      if (!fiiRow && !diiRow) continue;

      history.push({
        date:    iso,
        fiiNet:  parseNum(fiiRow?.netValue  ?? fiiRow?.net  ?? fiiRow?.netPurchaseSales  ?? 0),
        fiiBuy:  parseNum(fiiRow?.buyValue  ?? fiiRow?.grossPurchase  ?? 0),
        fiiSell: parseNum(fiiRow?.sellValue ?? fiiRow?.grossSales  ?? 0),
        diiNet:  parseNum(diiRow?.netValue  ?? diiRow?.net  ?? diiRow?.netPurchaseSales  ?? 0),
        diiBuy:  parseNum(diiRow?.buyValue  ?? diiRow?.grossPurchase  ?? 0),
        diiSell: parseNum(diiRow?.sellValue ?? diiRow?.grossSales  ?? 0),
      });
    } catch (_) {}
  }

  // Sort oldest→newest
  history.sort((a, b) => new Date(a.date) - new Date(b.date));

  const latest = history[history.length - 1] || {};

  return res.json({
    fiiNet:  latest.fiiNet  || 0,
    fiiBuy:  latest.fiiBuy  || 0,
    fiiSell: latest.fiiSell || 0,
    diiNet:  latest.diiNet  || 0,
    diiBuy:  latest.diiBuy  || 0,
    diiSell: latest.diiSell || 0,
    date:    latest.date    || '',
    history,
    source:  history.length > 1 ? 'nse-history' : 'nse-today',
    daysFound: history.length,
  });
}
