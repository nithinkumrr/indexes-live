export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) { return res.status(500).json({ error: 'NSE session failed' }); }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };
  const pf = v => { const n = parseFloat(String(v || '').replace(/,/g, '')); return isNaN(n) || n === 0 ? null : parseFloat(n.toFixed(2)); };
  const pi = v => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

  const result = {};

  const KEY_MAP = {
    'NIFTY 50': 'nifty50', 'NIFTY BANK': 'banknifty', 'NIFTY NEXT 50': 'niftynext50',
    'NIFTY MIDCAP 50': 'niftymidcap50', 'INDIA VIX': 'indiavix',
    'NIFTY IT': 'niftyit', 'NIFTY PHARMA': 'niftypharma', 'NIFTY AUTO': 'niftyauto',
    'NIFTY FMCG': 'niftyfmcg', 'NIFTY METAL': 'niftymetal', 'NIFTY REALTY': 'niftyrealty',
    'NIFTY PSU BANK': 'niftypsubank', 'NIFTY FIN SERVICE': 'niftyfinservice',
    'S&P BSE SENSEX': 'sensex', 'SENSEX': 'sensex',
  };

  // NSE allIndices
  try {
    const r = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    const body = await r.json();
    for (const idx of (body.data || [])) {
      const key = KEY_MAP[idx.index];
      if (!key) continue;
      result[key] = {
        price: pf(idx.last), prevClose: pf(idx.previousClose),
        change: pf(idx.variation || idx.change), changePct: pf(idx.percentChange || idx.pChange),
        open: pf(idx.open), high: pf(idx.high), low: pf(idx.low),
        yearHigh: pf(idx.yearHigh), yearLow: pf(idx.yearLow),
        pe: pf(idx.pe), pb: pf(idx.pb), dy: pf(idx.dy),
        advances: pi(idx.advances), declines: pi(idx.declines), unchanged: pi(idx.unchanged),
        source: 'nse-live',
      };
    }
  } catch (e) { console.error('allIndices failed:', e.message); }

  // Enrich Nifty 50 + Bank Nifty with equity-stockIndices (richer ratios + advances)
  for (const [sym, key] of [['NIFTY 50', 'nifty50'], ['NIFTY BANK', 'banknifty']]) {
    try {
      const r = await fetch(`https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(sym)}`, { headers: H });
      const body = await r.json();
      if (!result[key]) result[key] = {};
      const meta = body?.metadata || {};
      if (meta.indexPe)       result[key].pe = pf(meta.indexPe);
      if (meta.indexPb)       result[key].pb = pf(meta.indexPb);
      if (meta.dividendYield) result[key].dy = pf(meta.dividendYield);
      if (meta.open)          result[key].open = pf(meta.open);
      if (meta.high)          result[key].high = pf(meta.high);
      if (meta.low)           result[key].low  = pf(meta.low);
      if (body?.advance) {
        result[key].advances  = pi(body.advance.advances);
        result[key].declines  = pi(body.advance.declines);
        result[key].unchanged = pi(body.advance.unchanged);
      }
    } catch (_) {}
  }

  // Sensex — use Yahoo Finance (most reliable for OHLC)
  // Yahoo symbol for Sensex: ^BSESN
  try {
    const yUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1d';
    const yr   = await fetch(yUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    const yData = await yr.json();
    const meta  = yData?.chart?.result?.[0]?.meta;
    if (meta) {
      const existing = result['sensex'] || {};
      result['sensex'] = {
        price:     pf(meta.regularMarketPrice)    || existing.price,
        prevClose: pf(meta.chartPreviousClose)    || existing.prevClose,
        change:    pf(meta.regularMarketPrice - meta.chartPreviousClose) || existing.change,
        changePct: pf((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100) || existing.changePct,
        open:      pf(meta.regularMarketOpen)     || existing.open,
        high:      pf(meta.regularMarketDayHigh)  || existing.high,
        low:       pf(meta.regularMarketDayLow)   || existing.low,
        yearHigh:  pf(meta.fiftyTwoWeekHigh)      || existing.yearHigh,
        yearLow:   pf(meta.fiftyTwoWeekLow)       || existing.yearLow,
        pe:        existing.pe,
        pb:        existing.pb,
        dy:        existing.dy,
        advances:  existing.advances,
        declines:  existing.declines,
        unchanged: existing.unchanged,
        source:    'yahoo+nse',
      };
    }
  } catch (_) {}

  // VWAP for Nifty 50, Bank Nifty, Sensex using NSE's marketStatus / quote endpoints
  const VWAP_SYMBOLS = [
    { key: 'nifty50',   nseSymbol: 'NIFTY%2050' },
    { key: 'banknifty', nseSymbol: 'NIFTY%20BANK' },
  ];
  for (const { key, nseSymbol } of VWAP_SYMBOLS) {
    try {
      const r = await fetch(`https://www.nseindia.com/api/equity-stockIndices?index=${nseSymbol}`, { headers: H });
      const body = await r.json();
      // NSE returns VWAP in the metadata or first data row
      const meta = body?.metadata || {};
      const vwap = pf(meta.vwap) || pf(body?.data?.[0]?.vwap);
      if (vwap && result[key]) result[key].vwap = vwap;
    } catch (_) {}
  }

  res.json({ data: result, timestamp: Date.now() });
}
