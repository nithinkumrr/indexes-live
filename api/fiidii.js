// api/fiidii.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

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

  const HOLIDAYS = new Set([
    '2026-01-26','2026-02-17','2026-03-03','2026-03-26',
    '2026-03-31','2026-04-03','2026-04-14','2026-05-01',
    '2026-05-28','2026-06-26','2026-09-14','2026-10-02',
    '2026-10-20','2026-11-10','2026-11-24','2026-12-25',
  ]);

  const istNow   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const istToday = istNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const tradingDays = [];
  let cur = new Date(istNow);
  while (tradingDays.length < 7) {
    const iso = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dow = new Date(iso + 'T00:00:00+05:30').getDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso)) tradingDays.push(iso);
    cur.setDate(cur.getDate() - 1);
  }

  // Parse a single FII/DII row — NSE uses different field names across endpoints
  const parseRow = (row) => {
    if (!row) return { net: 0, buy: 0, sell: 0 };
    // Try every known field name NSE has used
    const buy  = parseNum(row.buyValue  ?? row.grossPurchase   ?? row.grossBuy   ?? row.purchased   ?? row.buy  ?? 0);
    const sell = parseNum(row.sellValue ?? row.grossSales      ?? row.grossSell  ?? row.sold         ?? row.sell ?? 0);
    const net  = parseNum(row.netValue  ?? row.net             ?? row.netPurchaseSales ?? row.netTurnover ?? (buy - sell));
    return { net, buy, sell };
  };

  const history = [];

  for (const iso of tradingDays) {
    try {
      const [y, m, day] = iso.split('-');
      const nseDate = `${day}-${m}-${y}`;

      let rows = [];
      const r1 = await fetch(`https://www.nseindia.com/api/fiidiiTradeReact?date=${nseDate}`, { headers: H });
      if (r1.ok) {
        const data = await r1.json();
        rows = Array.isArray(data) ? data : (data.data || []);
      }
      if (!rows.length && iso === istToday) {
        const r2 = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
        if (r2.ok) {
          const data = await r2.json();
          rows = Array.isArray(data) ? data : (data.data || []);
        }
      }
      if (!rows.length) continue;

      // Log first row keys for debugging (only once)
      if (history.length === 0) {
        console.log('NSE fiidii row keys:', Object.keys(rows[0] || {}));
        console.log('NSE fiidii first rows:', JSON.stringify(rows.slice(0, 4)));
      }

      // Identify rows by participant type
      const isFII = r => /FII|FPI|FOREIGN/i.test(String(r.category||r.clientType||r.participant||r.client||''));
      const isDII = r => /DII|DOMESTIC/i.test(String(r.category||r.clientType||r.participant||r.client||''));

      // Identify segment
      const segOf = r => {
        const s = String(r.category||r.clientType||r.segment||r.mktType||'').toLowerCase();
        if (/index.*opt|opt.*index/.test(s)) return 'indexOptions';
        if (/index.*fut|fut.*index/.test(s)) return 'indexFutures';
        if (/stock.*opt|opt.*stock/.test(s)) return 'stockOptions';
        if (/stock.*fut|fut.*stock/.test(s)) return 'stockFutures';
        if (/equity|cash|cm/.test(s))        return 'equity';
        return 'equity'; // default
      };

      // Group by segment
      const segments = { equity:{}, indexFutures:{}, indexOptions:{}, stockFutures:{}, stockOptions:{} };
      for (const row of rows) {
        const seg = segOf(row);
        if (isFII(row)) segments[seg].fii = row;
        if (isDII(row)) segments[seg].dii = row;
      }

      // If no segment split worked, fallback: first FII and DII rows go to equity
      if (!segments.equity.fii) segments.equity.fii = rows.find(isFII);
      if (!segments.equity.dii) segments.equity.dii = rows.find(isDII);

      if (!segments.equity.fii && !segments.equity.dii) continue;

      const buildSeg = (seg) => {
        const f = parseRow(seg.fii), d = parseRow(seg.dii);
        return { fiiNet: f.net, fiiBuy: f.buy, fiiSell: f.sell, diiNet: d.net, diiBuy: d.buy, diiSell: d.sell };
      };

      const eq = buildSeg(segments.equity);

      // Nifty close
      let niftyClose = null;
      try {
        const nr = await fetch(`https://www.nseindia.com/api/historical/indicesHistory?indexType=NIFTY%2050&from=${nseDate}&to=${nseDate}`, { headers: H });
        if (nr.ok) {
          const nd = await nr.json();
          const rw = nd?.data?.indexCloseOnlineRecords?.[0] || nd?.data?.[0];
          if (rw) niftyClose = parseNum(rw.EOD_CLOSE_INDEX_VAL || rw.CLOSE || rw.close);
        }
      } catch (_) {}

      history.push({
        date: iso, niftyClose,
        ...eq,
        segments: {
          equity:       eq,
          indexFutures: buildSeg(segments.indexFutures),
          indexOptions: buildSeg(segments.indexOptions),
          stockFutures: buildSeg(segments.stockFutures),
          stockOptions: buildSeg(segments.stockOptions),
        },
      });
    } catch (_) {}
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = history[history.length - 1] || {};

  return res.json({
    fiiNet: latest.fiiNet || 0, fiiBuy: latest.fiiBuy || 0, fiiSell: latest.fiiSell || 0,
    diiNet: latest.diiNet || 0, diiBuy: latest.diiBuy || 0, diiSell: latest.diiSell || 0,
    date: latest.date || '', history,
    source: history.length > 1 ? 'nse-history' : 'nse-today',
    daysFound: history.length,
  });
}
