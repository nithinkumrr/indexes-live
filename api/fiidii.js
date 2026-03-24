// api/fiidii.js — FII/DII data from NSE with full history
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

  // Helper: extract FII and DII net from an array of category rows
  function extractFromRows(rows) {
    const fiiRow = rows.find(e => /FII|FPI|FOREIGN/i.test(String(e.category || e.client || e.clientType || '')));
    const diiRow = rows.find(e => /DII|DOMESTIC/i.test(String(e.category || e.client || e.clientType || '')));
    if (!fiiRow && !diiRow) return null;
    return {
      fiiNet:  parseNum(fiiRow?.netValue ?? fiiRow?.net ?? fiiRow?.netPurchaseSales ?? 0),
      fiiBuy:  parseNum(fiiRow?.buyValue ?? fiiRow?.grossPurchase ?? 0),
      fiiSell: parseNum(fiiRow?.sellValue ?? fiiRow?.grossSales ?? 0),
      diiNet:  parseNum(diiRow?.netValue ?? diiRow?.net ?? diiRow?.netPurchaseSales ?? 0),
      diiBuy:  parseNum(diiRow?.buyValue ?? diiRow?.grossPurchase ?? 0),
      diiSell: parseNum(diiRow?.sellValue ?? diiRow?.grossSales ?? 0),
    };
  }

  try {
    const r    = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (!r.ok) throw new Error(`NSE ${r.status}`);
    const raw  = await r.json();

    // NSE can return either:
    // A) Array of category rows (all for today): [{category:"FII/FPI", buyValue, sellValue, netValue, date}, ...]
    // B) Object keyed by date: {"24-Mar-2026": [{category, ...}, ...], "23-Mar-2026": [...], ...}
    // C) {data: [...]} wrapper

    let history = [];

    if (Array.isArray(raw)) {
      // Format A: all rows for today only
      const today = extractFromRows(raw);
      const date  = raw[0]?.date || raw[0]?.tradingDate || new Date().toISOString().split('T')[0];
      if (today) history = [{ date, ...today }];

    } else if (raw && typeof raw === 'object' && !raw.data) {
      // Format B: date-keyed object — multiple days!
      for (const [dateKey, rows] of Object.entries(raw)) {
        if (!Array.isArray(rows)) continue;
        const extracted = extractFromRows(rows);
        if (extracted) history.push({ date: dateKey, ...extracted });
      }
      history.sort((a, b) => new Date(a.date) - new Date(b.date));

    } else {
      // Format C: {data: [...]}
      const entries = raw.data || [];
      if (Array.isArray(entries)) {
        const today = extractFromRows(entries);
        const date  = entries[0]?.date || new Date().toISOString().split('T')[0];
        if (today) history = [{ date, ...today }];
      }
    }

    // Also try the historical endpoint for last 10 days
    if (history.length <= 1) {
      try {
        const r2 = await fetch('https://www.nseindia.com/api/fiidiiTradeHistory', { headers: H });
        if (r2.ok) {
          const h2 = await r2.json();
          const rows2 = Array.isArray(h2) ? h2 : h2.data || [];
          // This usually returns [{date, fii_net, dii_net}] or similar
          const mapped = rows2.map(row => ({
            date:    row.date || row.tradingDate || '',
            fiiNet:  parseNum(row.fii_net ?? row.fiiNet ?? row.FII_NET ?? row.netFII ?? 0),
            fiiBuy:  parseNum(row.fii_buy ?? row.fiiBuy ?? 0),
            fiiSell: parseNum(row.fii_sell ?? row.fiiSell ?? 0),
            diiNet:  parseNum(row.dii_net ?? row.diiNet ?? row.DII_NET ?? row.netDII ?? 0),
            diiBuy:  parseNum(row.dii_buy ?? row.diiBuy ?? 0),
            diiSell: parseNum(row.dii_sell ?? row.diiSell ?? 0),
          })).filter(r => r.date && (r.fiiNet || r.diiNet));
          if (mapped.length > 1) {
            history = mapped.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-10);
          }
        }
      } catch (_) {}
    }

    const latest  = history[history.length - 1] || {};

    return res.json({
      fiiNet:  latest.fiiNet  || 0,
      fiiBuy:  latest.fiiBuy  || 0,
      fiiSell: latest.fiiSell || 0,
      diiNet:  latest.diiNet  || 0,
      diiBuy:  latest.diiBuy  || 0,
      diiSell: latest.diiSell || 0,
      date:    latest.date    || '',
      history: history.slice(-7), // last 7 days for chart
      source:  'nse-live',
    });

  } catch (e) {
    return res.status(503).json({ error: e.message, source: 'failed' });
  }
}
