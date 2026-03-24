export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=240');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const pn = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  let cookies = '';
  try {
    const r = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (r.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(e) { return res.status(500).json({ error: 'Cookie failed' }); }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };
  const result = { fiifo: null, topGainers: [], topLosers: [], sectors: [] };

  // 1. FII in F&O
  try {
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (r.ok) {
      const data = await r.json();
      const rows = Array.isArray(data) ? data : (data.data || []);
      const isFII = r => /FII|FPI|FOREIGN/i.test(String(r?.category||r?.clientType||''));
      const pr = row => ({
        net:  pn(row?.netValue ?? row?.net ?? 0),
        buy:  pn(row?.buyValue ?? row?.grossPurchase ?? 0),
        sell: pn(row?.sellValue ?? row?.grossSales ?? 0),
      });
      const segKey = r => {
        const t = String(r?.category||r?.clientType||'').toLowerCase();
        if (/index.*fut|fut.*index/i.test(t)) return 'indexFut';
        if (/index.*opt|opt.*index/i.test(t)) return 'indexOpt';
        if (/stock.*fut|fut.*stock/i.test(t)) return 'stockFut';
        return null;
      };
      const segs = {};
      for (const row of rows) {
        const sk = segKey(row);
        if (!sk || !isFII(row)) continue;
        segs[sk] = pr(row);
      }
      if (Object.keys(segs).length) result.fiifo = segs;
    }
  } catch (_) {}

  // 2. Top gainers — NSE live analysis
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=gainers', { headers: H });
    if (r.ok) {
      const d = await r.json();
      const rows = d?.NIFTY?.data || d?.data || d?.gainers || [];
      result.topGainers = rows.slice(0, 5).map(s => ({
        symbol: s.symbol, pct: pn(s.pChange||s.perChange), ltp: pn(s.lastPrice||s.ltp)
      })).filter(s => s.symbol);
    }
  } catch (_) {}

  // 3. Top losers
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=losers', { headers: H });
    if (r.ok) {
      const d = await r.json();
      const rows = d?.NIFTY?.data || d?.data || d?.losers || [];
      result.topLosers = rows.slice(0, 5).map(s => ({
        symbol: s.symbol, pct: pn(s.pChange||s.perChange), ltp: pn(s.lastPrice||s.ltp)
      })).filter(s => s.symbol);
    }
  } catch (_) {}

  // 4. Sectors from allIndices
  try {
    const r = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    if (r.ok) {
      const d = await r.json();
      const SECTORS = ['NIFTY BANK','NIFTY IT','NIFTY PHARMA','NIFTY AUTO','NIFTY FMCG',
                       'NIFTY METAL','NIFTY REALTY','NIFTY ENERGY','NIFTY FIN SERVICE','NIFTY MIDCAP 50'];
      result.sectors = (d?.data||[])
        .filter(i => SECTORS.includes(i.index))
        .map(i => ({ name: i.index.replace('NIFTY ',''), pct: pn(i.percentChange), last: pn(i.last) }))
        .sort((a,b) => b.pct - a.pct);
    }
  } catch (_) {}

  return res.json(result);
}
