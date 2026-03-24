export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(e) { return res.status(500).json({ error: 'Cookie failed' }); }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  // Parse number from any format
  const pn = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  // Parse a row — NSE uses different field names inconsistently
  const parseRow = row => {
    if (!row) return { net: 0, buy: 0, sell: 0 };
    // Try all known field name patterns
    const net  = pn(row.netValue ?? row.net ?? row.netPurchaseSales ?? row.NET ?? 0);
    const buy  = pn(row.buyValue ?? row.grossPurchase ?? row.BUY ?? row.buy ?? 0);
    const sell = pn(row.sellValue ?? row.grossSales ?? row.SELL ?? row.sell ?? 0);
    // If net is 0 but buy/sell exist, calculate it
    return { net: net || (buy - sell), buy, sell };
  };

  const isFII = r => /FII|FPI|FOREIGN/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||''));
  const isDII = r => /DII|DOMESTIC/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||''));

  const HOLIDAYS = new Set(['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31','2026-04-03','2026-04-14','2026-05-01']);

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
  const istToday = ist.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  for (const iso of tradingDays) {
    try {
      const [y, m, day] = iso.split('-');
      const nseDate = `${day}-${m}-${y}`;

      let rows = [];

      // Try with date param first
      const r1 = await fetch(`https://www.nseindia.com/api/fiidiiTradeReact?date=${nseDate}`, { headers: H });
      if (r1.ok) {
        const d = await r1.json();
        rows = Array.isArray(d) ? d : (d.data || []);
      }

      // For today, fallback to no-param endpoint
      if (!rows.length && iso === istToday) {
        const r2 = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
        if (r2.ok) {
          const d = await r2.json();
          rows = Array.isArray(d) ? d : (d.data || []);
        }
      }

      if (!rows.length) continue;

      // Log first time to diagnose field names
      if (history.length === 0) {
        console.log('FiiDii row sample:', JSON.stringify(rows[0]));
        console.log('All row categories:', rows.map(r => r.category||r.clientType||r.participant||'?'));
      }

      const fiiRow = rows.find(isFII);
      const diiRow = rows.find(isDII);

      if (!fiiRow && !diiRow) continue;

      const f = parseRow(fiiRow);
      const d = parseRow(diiRow);

      // Skip if already have this date
      if (history.find(h => h.date === iso)) continue;

      history.push({
        date: iso,
        fiiNet: f.net, fiiBuy: f.buy, fiiSell: f.sell,
        diiNet: d.net, diiBuy: d.buy, diiSell: d.sell,
      });
    } catch (_) {}
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = history[history.length - 1] || {};

  return res.json({
    fiiNet: latest.fiiNet || 0, fiiBuy: latest.fiiBuy || 0, fiiSell: latest.fiiSell || 0,
    diiNet: latest.diiNet || 0, diiBuy: latest.diiBuy || 0, diiSell: latest.diiSell || 0,
    date: latest.date || '',
    history: history.slice(-7),
    daysFound: history.length,
  });
}
