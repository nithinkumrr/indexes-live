// api/nse-india.js — Primary data source for all Indian indexes
// Returns OHLC, PE, PB, DY, Advances/Declines from NSE directly
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'NSE session failed' });
  }

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Referer': 'https://www.nseindia.com/',
    'Accept-Language': 'en-US,en;q=0.9',
    Cookie: cookies,
  };

  const pf = (v, d = 2) => {
    const n = parseFloat(String(v || '').replace(/,/g, ''));
    return isNaN(n) ? null : parseFloat(n.toFixed(d));
  };
  const pi = v => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

  const result = {};

  // ── NSE allIndices ──────────────────────────────────────────────────
  try {
    const r    = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    const body = await r.json();

    for (const idx of (body.data || [])) {
      const name = idx.index || idx.indexSymbol || '';

      const KEY_MAP = {
        'NIFTY 50':          'nifty50',
        'NIFTY BANK':        'banknifty',
        'NIFTY NEXT 50':     'niftynext50',
        'NIFTY MIDCAP 50':   'niftymidcap50',
        'INDIA VIX':         'indiavix',
        'NIFTY IT':          'niftyit',
        'NIFTY PHARMA':      'niftypharma',
        'NIFTY AUTO':        'niftyauto',
        'NIFTY FMCG':        'niftyfmcg',
        'NIFTY METAL':       'niftymetal',
        'NIFTY REALTY':      'niftyrealty',
        'NIFTY PSU BANK':    'niftypsubank',
        'NIFTY FIN SERVICE': 'niftyfinservice',
        'NIFTY ENERGY':      'niftyenergy',
        'NIFTY INFRA':       'niftyinfra',
        'NIFTY MEDIA':       'niftymedia',
      };

      const key = KEY_MAP[name];
      if (!key) continue;

      result[key] = {
        price:     pf(idx.last),
        prevClose: pf(idx.previousClose),
        change:    pf(idx.variation || idx.change),
        changePct: pf(idx.percentChange || idx.pChange),
        open:      pf(idx.open),
        high:      pf(idx.high),
        low:       pf(idx.low),
        yearHigh:  pf(idx.yearHigh),
        yearLow:   pf(idx.yearLow),
        pe:        pf(idx.pe),
        pb:        pf(idx.pb),
        dy:        pf(idx.dy),
        advances:  pi(idx.advances),
        declines:  pi(idx.declines),
        unchanged: pi(idx.unchanged),
        source:    'nse-live',
      };
    }
  } catch (e) {
    console.error('NSE allIndices failed:', e.message);
  }

  // ── NSE index-specific for OHLC + ratios (more complete) ───────────
  for (const [nseSymbol, key] of [['NIFTY 50', 'nifty50'], ['NIFTY BANK', 'banknifty']]) {
    try {
      const enc = encodeURIComponent(nseSymbol);
      const r   = await fetch(`https://www.nseindia.com/api/equity-stockIndices?index=${enc}`, { headers: H });
      const body = await r.json();
      const d    = body?.data?.[0]; // first row is the index itself
      if (d && result[key]) {
        // Merge in any additional fields
        result[key].open      = result[key].open  || pf(d.open);
        result[key].high      = result[key].high  || pf(d.dayHigh || d.high);
        result[key].low       = result[key].low   || pf(d.dayLow  || d.low);
        result[key].advances  = result[key].advances || pi(body.advance?.advances);
        result[key].declines  = result[key].declines || pi(body.advance?.declines);
        result[key].unchanged = result[key].unchanged || pi(body.advance?.unchanged);
        if (body.metadata?.indexPe)  result[key].pe = pf(body.metadata.indexPe);
        if (body.metadata?.indexPb)  result[key].pb = pf(body.metadata.indexPb);
        if (body.metadata?.dividendYield) result[key].dy = pf(body.metadata.dividendYield);
      }
    } catch (_) {}
  }

  // ── BSE Sensex ──────────────────────────────────────────────────────
  try {
    const r    = await fetch('https://api.bseindia.com/BseIndiaAPI/api/GetIndexData/w?pageno=1&strIndexCode=16', {
      headers: { 'User-Agent': UA, 'Referer': 'https://www.bseindia.com/', 'Accept': 'application/json' }
    });
    const body = await r.json();
    const d    = body?.Table?.[0] || body?.[0];

    if (d) {
      result['sensex'] = {
        price:     pf(d.CurrVal || d.IndexValue || d.Last),
        prevClose: pf(d.PrevClose || d.PrevCls),
        change:    pf(d.ChgAmt   || d.Change),
        changePct: pf(d.PctChg   || d.PctChange),
        open:      pf(d.Open     || d.OpenValue),
        high:      pf(d.High     || d.HighValue || d.DayHigh),
        low:       pf(d.Low      || d.LowValue  || d.DayLow),
        yearHigh:  pf(d.High52   || d.YearHigh),
        yearLow:   pf(d.Low52    || d.YearLow),
        pe:        pf(d.PE),
        pb:        pf(d.PB),
        dy:        pf(d.DY || d.DivYield),
        source:    'bse-live',
      };
    }
  } catch (_) {
    // BSE fallback — try another endpoint
    try {
      const r2   = await fetch('https://www.bseindia.com/indices/IndexProcessnew.aspx?page=0&pagesize=50&type=0', {
        headers: { 'User-Agent': UA, 'Referer': 'https://www.bseindia.com/' }
      });
      const body = await r2.json();
      const d    = (body.Table || []).find(i => /SENSEX/i.test(i.IndxDt || i.IndxNm || ''));
      if (d) {
        result['sensex'] = {
          price:     pf(d.CurrVal),
          prevClose: pf(d.PrevClose),
          change:    pf(d.ChgAmt),
          changePct: pf(d.PctChg),
          open:      pf(d.Open),
          high:      pf(d.High),
          low:       pf(d.Low),
          pe:        pf(d.PE),
          source:    'bse-live',
        };
      }
    } catch (_) {}
  }

  res.json({ data: result, timestamp: Date.now() });
}
