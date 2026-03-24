// api/fiidii.js — FII/DII daily trading data from NSE
// NSE fiidiiTradeReact returns: [{ category, buyValue, sellValue, netValue, date }, ...]
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Step 1: get session cookie
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'Cookie fetch failed' });
  }

  const H = {
    'User-Agent': UA, 'Accept': 'application/json',
    'Referer': 'https://www.nseindia.com/', 'Accept-Language': 'en-US,en;q=0.9',
    Cookie: cookies,
  };

  try {
    const r    = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (!r.ok) throw new Error(`NSE returned ${r.status}`);
    const data = await r.json();

    // NSE returns array: [{category: "FII/FPI", buyValue: "...", sellValue: "...", netValue: "...", date: "..."}, ...]
    // or nested by date: { date: [...entries] }
    // Handle both formats

    let entries = [];
    if (Array.isArray(data)) {
      entries = data;
    } else if (data && typeof data === 'object') {
      // Could be { data: [...] } or date-keyed object
      entries = data.data || Object.values(data).flat();
    }

    if (!entries.length) throw new Error('Empty response');

    // Parse a number from NSE's formatted strings like "12,345.67" or "-1,234.56"
    const parseNum = v => {
      if (v == null) return 0;
      const n = parseFloat(String(v).replace(/,/g, ''));
      return isNaN(n) ? 0 : n;
    };

    // Find FII and DII rows
    const fiiRow = entries.find(e =>
      /FII|FPI|FOREIGN/i.test(e.category || e.client || e.clientType || '')
    );
    const diiRow = entries.find(e =>
      /DII|DOMESTIC/i.test(e.category || e.client || e.clientType || '')
    );

    if (!fiiRow && !diiRow) {
      // Return raw for debugging
      return res.status(422).json({ error: 'Could not identify FII/DII rows', sample: entries.slice(0, 3) });
    }

    const fiiNet = parseNum(fiiRow?.netValue ?? fiiRow?.net ?? fiiRow?.netPurchaseSales);
    const diinet = parseNum(diiRow?.netValue ?? diiRow?.net ?? diiRow?.netPurchaseSales);
    const fiiBuy  = parseNum(fiiRow?.buyValue ?? fiiRow?.grossPurchase);
    const fiiSell = parseNum(fiiRow?.sellValue ?? fiiRow?.grossSales);
    const diiBuy  = parseNum(diiRow?.buyValue ?? diiRow?.grossPurchase);
    const diiSell = parseNum(diiRow?.sellValue ?? diiRow?.grossSales);
    const date    = fiiRow?.date || diiRow?.date || entries[0]?.date || 'Today';

    return res.json({
      fiiNet, fiiBuy, fiiSell,
      diiNet: diinet, diiBuy, diiSell,
      date, source: 'nse-live',
      history: [],
    });
  } catch (e) {
    return res.status(503).json({ error: e.message, source: 'failed' });
  }
}
