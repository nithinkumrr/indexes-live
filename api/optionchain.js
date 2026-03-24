// api/optionchain.js - F&O info using reliable NSE endpoints
// Replaces option chain (which NSE blocks from Vercel US servers)
// Shows: FII in F&O segments + top gainers/losers in F&O stocks

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=240');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const parseNum = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  let cookies = '';
  try {
    const r = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' } });
    cookies = (r.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(e) { return res.status(500).json({ error: 'Cookie failed' }); }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  const result = { fiifo: null, topGainers: [], topLosers: [], mostActive: [], sectors: [] };

  // 1. FII in F&O segments (same endpoint as fiidii which works)
  try {
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H });
    if (r.ok) {
      const data = await r.json();
      const rows = Array.isArray(data) ? data : (data.data || []);
      const isFII = r => /FII|FPI|FOREIGN/i.test(String(r?.category||r?.clientType||''));
      const isDII = r => /DII|DOMESTIC/i.test(String(r?.category||r?.clientType||''));
      const seg = s => {
        const t = String(s?.category||s?.clientType||'').toLowerCase();
        if (/index.*fut|fut.*index/i.test(t)) return 'indexFut';
        if (/index.*opt|opt.*index/i.test(t)) return 'indexOpt';
        if (/stock.*fut|fut.*stock/i.test(t)) return 'stockFut';
        if (/stock.*opt|opt.*stock/i.test(t)) return 'stockOpt';
        return 'equity';
      };
      const segs = {};
      for (const row of rows) {
        const s = seg(row);
        if (!segs[s]) segs[s] = { fii: null, dii: null };
        if (isFII(row)) segs[s].fii = row;
        if (isDII(row)) segs[s].dii = row;
      }
      const pr = row => ({
        net:  parseNum(row?.netValue ?? row?.net ?? 0),
        buy:  parseNum(row?.buyValue ?? row?.grossPurchase ?? 0),
        sell: parseNum(row?.sellValue ?? row?.grossSales ?? 0),
      });
      result.fiifo = {
        indexFut: segs.indexFut ? { fii: pr(segs.indexFut.fii), dii: pr(segs.indexFut.dii) } : null,
        indexOpt: segs.indexOpt ? { fii: pr(segs.indexOpt.fii), dii: pr(segs.indexOpt.dii) } : null,
        stockFut: segs.stockFut ? { fii: pr(segs.stockFut.fii), dii: pr(segs.stockFut.dii) } : null,
      };
    }
  } catch (_) {}

  // 2. Top gainers in F&O
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=gainers&limit=5', { headers: H });
    if (r.ok) {
      const d = await r.json();
      const rows = d?.NIFTY?.data || d?.data || [];
      result.topGainers = rows.slice(0,5).map(s => ({
        symbol: s.symbol, pct: parseNum(s.pChange||s.perChange), ltp: parseNum(s.lastPrice||s.ltp)
      }));
    }
  } catch (_) {}

  // 3. Top losers in F&O
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=loosers&limit=5', { headers: H });
    if (r.ok) {
      const d = await r.json();
      const rows = d?.NIFTY?.data || d?.data || [];
      result.topLosers = rows.slice(0,5).map(s => ({
        symbol: s.symbol, pct: parseNum(s.pChange||s.perChange), ltp: parseNum(s.lastPrice||s.ltp)
      }));
    }
  } catch (_) {}

  // 4. Sector performance from NSE indices
  try {
    const r = await fetch('https://www.nseindia.com/api/allIndices', { headers: H });
    if (r.ok) {
      const d = await r.json();
      const SECTORS = ['NIFTY BANK','NIFTY IT','NIFTY PHARMA','NIFTY AUTO','NIFTY FMCG','NIFTY METAL','NIFTY REALTY','NIFTY ENERGY','NIFTY FIN SERVICE','NIFTY MIDCAP 50'];
      const indices = d?.data || [];
      result.sectors = indices
        .filter(i => SECTORS.includes(i.index))
        .map(i => ({ name: i.index.replace('NIFTY ',''), pct: parseNum(i.percentChange), last: parseNum(i.last) }))
        .sort((a,b) => b.pct - a.pct);
    }
  } catch (_) {}

  return res.json(result);
}
