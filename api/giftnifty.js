// api/giftnifty.js
// Fetches Gift Nifty (near-month Nifty futures) from NSE India's public website API.
// NSE's website uses a two-step cookie approach — first hit the homepage to get
// the session cookie, then hit the data endpoint. This is the same mechanism all
// Indian fintech websites use to display live NSE data.

const NSE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

async function getNSECookies() {
  const res = await fetch('https://www.nseindia.com/', {
    headers: {
      'User-Agent': NSE_HEADERS['User-Agent'],
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  const cookies = res.headers.get('set-cookie') || '';
  // Extract cookie values
  const cookieParts = cookies.split(',').map(c => c.split(';')[0].trim()).filter(Boolean);
  return cookieParts.join('; ');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    // Step 1: Get session cookies from NSE homepage
    const cookies = await getNSECookies();

    // Step 2: Fetch Nifty futures (near-month) — this is what Gift Nifty tracks
    // The allIndices endpoint returns all indices including GIFT Nifty futures indicator
    const dataRes = await fetch(
      'https://www.nseindia.com/api/allIndices',
      {
        headers: { ...NSE_HEADERS, Cookie: cookies },
      }
    );

    if (!dataRes.ok) throw new Error(`NSE returned ${dataRes.status}`);
    const data = await dataRes.json();

    // Find GIFT Nifty or fall back to Nifty 50 futures from the indices list
    const indices = data.data || [];

    // Try to find GIFT NIFTY specifically
    let giftNifty = indices.find(i =>
      i.index?.toUpperCase().includes('GIFT') ||
      i.indexSymbol?.toUpperCase().includes('GIFT')
    );

    // Fall back to near-month Nifty futures
    if (!giftNifty) {
      giftNifty = indices.find(i =>
        i.index?.toUpperCase().includes('NIFTY 50 FUTURES') ||
        i.indexSymbol?.toUpperCase().includes('NIFTY 50 FUTURES')
      );
    }

    // Final fallback: Nifty 50 spot (at least it's accurate)
    if (!giftNifty) {
      giftNifty = indices.find(i =>
        i.index === 'NIFTY 50' || i.indexSymbol === 'NIFTY 50'
      );
    }

    if (!giftNifty) throw new Error('Could not find Gift Nifty data in response');

    const price      = parseFloat(giftNifty.last);
    const prevClose  = parseFloat(giftNifty.previousClose || giftNifty.yearLow);
    const change     = parseFloat(giftNifty.variation || giftNifty.change || 0);
    const changePct  = parseFloat(giftNifty.percentChange || giftNifty.pChange || 0);
    const indexName  = giftNifty.index || giftNifty.indexSymbol;

    res.json({
      price,
      prevClose: prevClose || (price - change),
      change,
      changePct,
      indexName,
      source: 'nseindia',
    });

  } catch (err) {
    // Fallback: try the simpler quote-derivative endpoint for near-month futures
    try {
      const cookies2 = await getNSECookies();
      const futRes = await fetch(
        'https://www.nseindia.com/api/quote-derivative?symbol=NIFTY',
        { headers: { ...NSE_HEADERS, Cookie: cookies2 } }
      );
      const futData = await futRes.json();

      // Get the near-month futures contract
      const contracts = futData.stocks || [];
      const nearMonth = contracts.find(c =>
        c.metadata?.instrumentType === 'Index Futures'
      );

      if (nearMonth) {
        const ltp = nearMonth.marketDeptOrderBook?.tradeInfo?.lastPrice ||
                    nearMonth.metadata?.lastPrice;
        const pc  = nearMonth.metadata?.prevClose || nearMonth.metadata?.closePrice;
        const chg = nearMonth.metadata?.change || (ltp - pc);
        const pct = nearMonth.metadata?.pChange || ((chg / pc) * 100);

        return res.json({
          price: parseFloat(ltp),
          prevClose: parseFloat(pc),
          change: parseFloat(chg),
          changePct: parseFloat(pct),
          indexName: nearMonth.metadata?.identifier || 'NIFTY Futures',
          source: 'nseindia-futures',
        });
      }
    } catch (_) { /* fall through */ }

    res.status(500).json({ error: err.message });
  }
}
