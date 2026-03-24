export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'NSE session failed' });
  }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  const pf = (v) => { const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) || n === 0 ? null : parseFloat(n.toFixed(2)); };
  const pi = v => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

  const result = {};

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
    'S&P BSE SENSEX':    'sensex',
    'SENSEX':            'sensex',
  };

  // NSE allIndices — includes BSE Sensex too
  try {
    const r    = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    const body = await r.json();
    for (const idx of (body.data || [])) {
      const key = KEY_MAP[idx.index];
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

  // Enrich Nifty 50 and Bank Nifty with deeper OHLC + ratios from equity-stockIndices
  for (const [sym, key] of [['NIFTY 50', 'nifty50'], ['NIFTY BANK', 'banknifty']]) {
    try {
      const r    = await fetch(`https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(sym)}`, { headers: H });
      const body = await r.json();
      if (!result[key]) result[key] = {};
      const meta = body?.metadata || {};
      if (meta.indexPe)        result[key].pe       = pf(meta.indexPe);
      if (meta.indexPb)        result[key].pb       = pf(meta.indexPb);
      if (meta.dividendYield)  result[key].dy       = pf(meta.dividendYield);
      if (body?.advance) {
        result[key].advances  = pi(body.advance.advances);
        result[key].declines  = pi(body.advance.declines);
        result[key].unchanged = pi(body.advance.unchanged);
      }
    } catch (_) {}
  }

  // BSE Sensex — try multiple endpoints
  if (!result['sensex'] || !result['sensex'].open) {
    // Try NSE's BSE index endpoint
    try {
      const r    = await fetch('https://www.nseindia.com/api/equity-stockIndices?index=S%26P+BSE+SENSEX', { headers: H });
      const body = await r.json();
      const d    = body?.data?.[0];
      if (d) {
        result['sensex'] = {
          ...result['sensex'],
          price:     pf(d.lastPrice || d.last),
          prevClose: pf(d.previousClose || d.pClose),
          change:    pf(d.change),
          changePct: pf(d.pChange),
          open:      pf(d.open || d.dayOpen),
          high:      pf(d.dayHigh || d.high),
          low:       pf(d.dayLow  || d.low),
          yearHigh:  pf(d.weekHigh52 || d.high52),
          yearLow:   pf(d.weekLow52  || d.low52),
          source:    'nse-bse',
        };
      }
    } catch (_) {}

    // BSE direct API as backup
    try {
      const bseEndpoints = [
        'https://api.bseindia.com/BseIndiaAPI/api/GetIndexData/w?pageno=1&strIndexCode=16',
        'https://api.bseindia.com/BseIndiaAPI/api/SensexData/w',
        'https://www.bseindia.com/SiteAssets/xml/sensex.xml',
      ];
      for (const url of bseEndpoints) {
        try {
          const r    = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.bseindia.com/' } });
          if (!r.ok) continue;
          const ct = r.headers.get('content-type') || '';
          if (ct.includes('json')) {
            const body = await r.json();
            const d    = body?.Table?.[0] || body?.Table1?.[0] || body?.[0] || body;
            if (d && (d.CurrVal || d.IndexValue || d.Last || d.Close)) {
              result['sensex'] = {
                price:     pf(d.CurrVal    || d.IndexValue || d.Last  || d.Close),
                prevClose: pf(d.PrevClose  || d.PrevCls   || d.Prev),
                change:    pf(d.ChgAmt     || d.Change    || d.Chg),
                changePct: pf(d.PctChg     || d.PctChange || d.PChg),
                open:      pf(d.Open       || d.OpnVal    || d.OpenValue),
                high:      pf(d.High       || d.HighVal   || d.HighValue  || d.DayHigh),
                low:       pf(d.Low        || d.LowVal    || d.LowValue   || d.DayLow),
                yearHigh:  pf(d.High52     || d.Wk52High  || d.YearHigh),
                yearLow:   pf(d.Low52      || d.Wk52Low   || d.YearLow),
                pe:        pf(d.PE         || d.PERatio),
                pb:        pf(d.PB         || d.PBRatio),
                dy:        pf(d.DY         || d.DivYield  || d.Yield),
                source:    'bse-live',
              };
              break;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  res.json({ data: result, timestamp: Date.now() });
}
