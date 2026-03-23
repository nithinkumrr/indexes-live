// api/giftnifty.js — Gift Nifty via NSE India public API
// NSE requires: 1) session cookie from homepage, 2) then data request

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=25, stale-while-revalidate=50');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Step 1: Get session cookies
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=[^;])/)
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'Cookie fetch failed: ' + e.message });
  }

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/',
    'X-Requested-With': 'XMLHttpRequest',
    Cookie: cookies,
  };

  // Strategy 1: allIndices — includes GIFT Nifty
  try {
    const r    = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    const body = await r.json();
    const indices = body?.data || [];

    // Look for GIFT NIFTY or NIFTY 50 futures indicator
    const gift = indices.find(i =>
      /GIFT/i.test(i.index || '') || /GIFT/i.test(i.indexSymbol || '')
    );
    const niftyFut = indices.find(i =>
      /NIFTY 50 FUTURES/i.test(i.index || '') || /NIFTY50 FUTURES/i.test(i.index || '')
    );
    const target = gift || niftyFut;

    if (target) {
      return res.json({
        price:     parseFloat(target.last),
        prevClose: parseFloat(target.previousClose || target.yearLow),
        change:    parseFloat(target.variation || target.change || 0),
        changePct: parseFloat(target.percentChange || target.pChange || 0),
        source:    'nseindia-allIndices',
        name:      target.index,
      });
    }
  } catch (_) {}

  // Strategy 2: live F&O snapshot — near-month Nifty futures
  try {
    const r    = await fetch('https://www.nseindia.com/api/quote-derivative?symbol=NIFTY', { headers: H });
    const body = await r.json();
    const stocks = body?.stocks || [];

    // Near-month index futures
    const near = stocks.find(s =>
      s.metadata?.instrumentType === 'Index Futures' &&
      s.metadata?.expiryDate
    );

    if (near) {
      const ltp = parseFloat(near.metadata?.lastPrice || near.marketDeptOrderBook?.tradeInfo?.lastPrice);
      const pc  = parseFloat(near.metadata?.prevClose || near.metadata?.closePrice || 0);
      const chg = parseFloat(near.metadata?.change || (ltp - pc));
      const pct = parseFloat(near.metadata?.pChange || ((chg / pc) * 100));

      if (ltp > 0) {
        return res.json({ price: ltp, prevClose: pc || ltp, change: chg, changePct: pct, source: 'nseindia-derivatives' });
      }
    }
  } catch (_) {}

  // Strategy 3: NSE live market page scrape for Nifty 50 spot (accurate proxy)
  try {
    const r    = await fetch('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050', { headers: H });
    const body = await r.json();
    const d    = body?.data?.[0];
    if (d) {
      return res.json({
        price:     parseFloat(d.lastPrice || d.last),
        prevClose: parseFloat(d.previousClose || d.prevClose),
        change:    parseFloat(d.change),
        changePct: parseFloat(d.pChange),
        source:    'nseindia-nifty50-proxy',
        note:      'Using Nifty 50 spot as Gift Nifty proxy',
      });
    }
  } catch (_) {}

  res.status(503).json({ error: 'All NSE endpoints failed' });
}
