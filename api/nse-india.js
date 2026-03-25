// api/nse-india.js — NSE data: VIX, FII, Advance/Decline, 52W highs/lows, Nifty EMA
// Used for MMI calculation

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const H  = (cookie='') => ({
    'User-Agent': UA, 'Accept': 'application/json',
    'Referer': 'https://www.nseindia.com/', Cookie: cookie
  });

  // Get NSE cookie
  let cookie = '';
  try {
    const r = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    cookie = (r.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(_) {}

  const result = {};

  // 1. VIX
  try {
    const r = await fetch('https://www.nseindia.com/api/allIndices', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      const vixRow = (d?.data||[]).find(i => i.index === 'INDIA VIX');
      if (vixRow) result.vix = parseFloat(vixRow.last);
      const niftyRow = (d?.data||[]).find(i => i.index === 'NIFTY 50');
      if (niftyRow) {
        result.niftyLast   = parseFloat(niftyRow.last);
        result.niftyChange = parseFloat(niftyRow.percentChange);
        result.niftyHigh52 = parseFloat(niftyRow['52WeekHigh'] || 0);
        result.niftyLow52  = parseFloat(niftyRow['52WeekLow']  || 0);
      }
    }
  } catch(_) {}

  // 2. FII net activity (latest)
  try {
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H(cookie) });
    if (r.ok) {
      const rows = await r.json();
      const arr  = Array.isArray(rows) ? rows : (rows?.data || []);
      const fii  = arr.find(r => /FII|FPI/i.test(r?.category||r?.clientType||''));
      if (fii) {
        result.fiiNet  = parseFloat(fii.netValue ?? fii.net ?? 0);
        result.fiiBuy  = parseFloat(fii.buyValue ?? fii.grossPurchase ?? 0);
        result.fiiSell = parseFloat(fii.sellValue ?? fii.grossSales ?? 0);
      }
    }
  } catch(_) {}

  // 3. Advance / Decline for Nifty 500 (broader market breadth)
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=gainers', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.advancers = (d?.NIFTY?.data||d?.data||[]).length;
    }
  } catch(_) {}
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=losers', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.decliners = (d?.NIFTY?.data||d?.data||[]).length;
    }
  } catch(_) {}

  // 4. Nifty 50 historical for EMA calculation (90d and 30d)
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=6mo', {
      headers: { 'User-Agent': UA }
    });
    if (r.ok) {
      const d      = await r.json();
      const closes = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const valid  = closes.filter(Boolean);
      if (valid.length >= 90) {
        const ema = (data, period) => {
          const k = 2 / (period + 1);
          return data.reduce((prev, cur, i) => i === 0 ? cur : cur * k + prev * (1-k));
        };
        result.ema30 = Math.round(ema(valid.slice(-30), 30));
        result.ema90 = Math.round(ema(valid.slice(-90), 90));
      }
    }
  } catch(_) {}

  // 5. 52-week highs vs lows count
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-data?index=high52', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.highs52w = (d?.data||[]).length;
    }
  } catch(_) {}
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-data?index=low52', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.lows52w = (d?.data||[]).length;
    }
  } catch(_) {}

  return res.json(result);
}
