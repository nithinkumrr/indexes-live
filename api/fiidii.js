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

  const H = {
    'User-Agent': UA, 'Accept': 'application/json',
    'Referer': 'https://www.nseindia.com/', Cookie: cookies,
  };

  const parseNum = v => {
    if (v == null) return 0;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  };

  try {
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (!r.ok) throw new Error(`NSE ${r.status}`);
    const data = await r.json();

    // NSE returns array of daily records grouped by date
    // Each record has: date, fiiNet or buyValue/sellValue/netValue, category
    let entries = Array.isArray(data) ? data : (data.data || []);

    if (!entries.length) throw new Error('Empty');

    // Log raw to understand structure
    const sample = entries[0];
    console.log('Sample entry:', JSON.stringify(sample));

    // Try to find category-based structure first
    const hasCat = entries.some(e => e.category || e.clientType || e.client);

    let history = [];

    if (hasCat) {
      // Group by date, each date has FII and DII rows
      const byDate = {};
      for (const e of entries) {
        const date = e.date || e.tradingDate || e.DATE || '';
        if (!byDate[date]) byDate[date] = { date, fiiRow: null, diiRow: null };
        const cat = String(e.category || e.clientType || e.client || '').toUpperCase();
        if (cat.includes('FII') || cat.includes('FPI') || cat.includes('FOREIGN')) {
          byDate[date].fiiRow = e;
        } else if (cat.includes('DII') || cat.includes('DOMESTIC')) {
          byDate[date].diiRow = e;
        }
      }

      history = Object.values(byDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-10)
        .map(({ date, fiiRow, diiRow }) => ({
          date,
          fiiNet:  parseNum(fiiRow?.netValue ?? fiiRow?.net ?? fiiRow?.netPurchaseSales ?? 0),
          fiiBuy:  parseNum(fiiRow?.buyValue ?? fiiRow?.grossPurchase ?? 0),
          fiiSell: parseNum(fiiRow?.sellValue ?? fiiRow?.grossSales ?? 0),
          diiNet:  parseNum(diiRow?.netValue ?? diiRow?.net ?? diiRow?.netPurchaseSales ?? 0),
          diiBuy:  parseNum(diiRow?.buyValue ?? diiRow?.grossPurchase ?? 0),
          diiSell: parseNum(diiRow?.sellValue ?? diiRow?.grossSales ?? 0),
        }));
    } else {
      // Date-level records with fiiNetVal/diiNetVal
      history = entries
        .sort((a, b) => new Date(a.date || a.DATE) - new Date(b.date || b.DATE))
        .slice(-10)
        .map(e => ({
          date:    e.date || e.DATE || '',
          fiiNet:  parseNum(e.fiiNetVal ?? e.fiiNet ?? e.FII_NET ?? 0),
          fiiBuy:  parseNum(e.fiiBuyVal ?? e.fiiBuy ?? 0),
          fiiSell: parseNum(e.fiiSellVal ?? e.fiiSell ?? 0),
          diiNet:  parseNum(e.diiNetVal ?? e.diiNet ?? e.DII_NET ?? 0),
          diiBuy:  parseNum(e.diiBuyVal ?? e.diiBuy ?? 0),
          diiSell: parseNum(e.diiSellVal ?? e.diiSell ?? 0),
        }));
    }

    const latest = history[history.length - 1] || {};

    return res.json({
      fiiNet: latest.fiiNet || 0,
      fiiBuy: latest.fiiBuy || 0,
      fiiSell: latest.fiiSell || 0,
      diiNet: latest.diiNet || 0,
      diiBuy: latest.diiBuy || 0,
      diiSell: latest.diiSell || 0,
      date: latest.date || '',
      history,
      source: 'nse-live',
    });
  } catch (e) {
    return res.status(503).json({ error: e.message, source: 'failed' });
  }
}
