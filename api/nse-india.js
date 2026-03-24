// api/nse-india.js
// Fetches live Indian index data directly from NSE's public API
// Returns: Nifty 50, Bank Nifty, Sensex (via BSE), with P/E, P/B, DY, advances/declines
// NSE allIndices is more reliable than derivatives endpoints

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Step 1: Session cookie
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'NSE session failed: ' + e.message });
  }

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/',
    'X-Requested-With': 'XMLHttpRequest',
    Cookie: cookies,
  };

  // Indices we care about on NSE
  const NSE_INDEX_MAP = {
    'NIFTY 50':        'nifty50',
    'NIFTY BANK':      'banknifty',
    'NIFTY NEXT 50':   'niftynext50',
    'NIFTY MIDCAP 50': 'niftymidcap50',
    'INDIA VIX':       'indiavix',
    'NIFTY IT':        'niftyit',
    'NIFTY PHARMA':    'niftypharma',
    'NIFTY AUTO':      'niftyauto',
    'NIFTY FMCG':      'niftyfmcg',
    'NIFTY METAL':     'niftymetal',
    'NIFTY REALTY':    'niftyrealty',
    'NIFTY ENERGY':    'niftyenergy',
    'NIFTY PSU BANK':  'niftypsubank',
    'NIFTY FIN SERVICE': 'niftyfinservice',
  };

  const result = {};

  try {
    const r = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    if (!r.ok) throw new Error(`NSE returned ${r.status}`);
    const data = await r.json();
    const indices = data.data || [];

    for (const idx of indices) {
      const key = NSE_INDEX_MAP[idx.index];
      if (!key) continue;

      result[key] = {
        price:       parseFloat(idx.last),
        prevClose:   parseFloat(idx.previousClose || idx.yearLow),
        change:      parseFloat(idx.variation || idx.change || 0),
        changePct:   parseFloat(idx.percentChange || idx.pChange || 0),
        open:        parseFloat(idx.open  || 0),
        high:        parseFloat(idx.high  || 0),
        low:         parseFloat(idx.low   || 0),
        pe:          parseFloat(idx.pe    || 0) || null,
        pb:          parseFloat(idx.pb    || 0) || null,
        dy:          parseFloat(idx.dy    || 0) || null,
        advances:    parseInt(idx.advances   || 0),
        declines:    parseInt(idx.declines   || 0),
        unchanged:   parseInt(idx.unchanged  || 0),
        yearHigh:    parseFloat(idx.yearHigh || 0),
        yearLow:     parseFloat(idx.yearLow  || 0),
        source:      'nse-live',
      };
    }
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }

  // Sensex from BSE
  try {
    const bseR = await fetch('https://www.bseindia.com/indices/IndexProcessnew.aspx?page=0&pagesize=100&type=0', {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.bseindia.com/' }
    });
    if (bseR.ok) {
      const bseData = await bseR.json();
      const sensex = (bseData.Table || []).find(i => i.IndxDt === 'SENSEX' || i.IndxNm === 'SENSEX');
      if (sensex) {
        result['sensex'] = {
          price:     parseFloat(sensex.CurrVal || sensex.ClsVal),
          prevClose: parseFloat(sensex.PrevClose || sensex.PrevCls),
          change:    parseFloat(sensex.ChgAmt || sensex.Change),
          changePct: parseFloat(sensex.PctChg || sensex.PctChange),
          pe:        parseFloat(sensex.PE) || null,
          pb:        parseFloat(sensex.PB) || null,
          source:    'bse-live',
        };
      }
    }
  } catch (_) {}

  res.json({ data: result, timestamp: Date.now() });
}
