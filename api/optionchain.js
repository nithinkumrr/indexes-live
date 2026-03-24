export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const { symbol = 'NIFTY' } = req.query;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  const parseCookies = (raw) =>
    (raw || '').split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');

  // Step 1: Homepage
  let cookies = '';
  try {
    const r1 = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = parseCookies(r1.headers.get('set-cookie'));
  } catch (e) {
    return res.status(500).json({ error: 'Step1 failed: ' + e.message });
  }

  // Step 2: Visit option-chain page to get additional cookies NSE requires
  try {
    const r2 = await fetch('https://www.nseindia.com/option-chain', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.nseindia.com/', Cookie: cookies }
    });
    const c2 = parseCookies(r2.headers.get('set-cookie'));
    if (c2) cookies = cookies + '; ' + c2;
  } catch (_) {}

  await new Promise(r => setTimeout(r, 300));

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/option-chain',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': cookies,
  };

  let json;
  try {
    const r = await fetch(`https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`, { headers: H });
    if (!r.ok) return res.status(r.status).json({ error: `NSE ${r.status}` });
    json = await r.json();
  } catch (e) {
    return res.status(503).json({ error: 'Fetch failed: ' + e.message });
  }

  const records    = json?.records?.data || [];
  const underlying = json?.records?.underlyingValue;
  const expDates   = json?.records?.expiryDates || [];
  const nearExpiry = expDates[0];

  if (!records.length || !underlying) {
    return res.status(503).json({ error: 'Empty response from NSE', keys: Object.keys(json || {}) });
  }

  const pf = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  const nearRec = records.filter(r => r.expiryDate === nearExpiry);
  const strikes = {};
  for (const row of nearRec) {
    const s = row.strikePrice;
    if (!strikes[s]) strikes[s] = { strike:s, ceOI:0, peOI:0, ceIV:0, peIV:0, ceChgOI:0, peChgOI:0 };
    if (row.CE) { strikes[s].ceOI=pf(row.CE.openInterest); strikes[s].ceIV=pf(row.CE.impliedVolatility); strikes[s].ceChgOI=pf(row.CE.changeinOpenInterest); }
    if (row.PE) { strikes[s].peOI=pf(row.PE.openInterest); strikes[s].peIV=pf(row.PE.impliedVolatility); strikes[s].peChgOI=pf(row.PE.changeinOpenInterest); }
  }

  const arr     = Object.values(strikes).sort((a,b) => a.strike - b.strike);
  const totalCE = arr.reduce((s,r) => s+r.ceOI, 0);
  const totalPE = arr.reduce((s,r) => s+r.peOI, 0);
  const pcr     = totalCE > 0 ? parseFloat((totalPE/totalCE).toFixed(2)) : 0;

  let maxPain = 0, minLoss = Infinity;
  for (const t of arr) {
    let loss = 0;
    for (const s of arr) {
      if (t.strike > s.strike) loss += s.ceOI * (t.strike - s.strike);
      if (t.strike < s.strike) loss += s.peOI * (s.strike - t.strike);
    }
    if (loss < minLoss) { minLoss = loss; maxPain = t.strike; }
  }

  const atm   = arr.reduce((p,c) => Math.abs(c.strike-underlying) < Math.abs(p.strike-underlying) ? c : p);
  const atmIV = atm ? ((atm.ceIV+atm.peIV)/2).toFixed(1) : null;
  const topCE = [...arr].sort((a,b)=>b.ceOI-a.ceOI).slice(0,5);
  const topPE = [...arr].sort((a,b)=>b.peOI-a.peOI).slice(0,5);

  return res.json({
    symbol, underlying, nearExpiry, pcr,
    pcrSentiment: pcr>1.2?'Bullish':pcr<0.7?'Bearish':pcr>=1?'Mildly Bullish':'Mildly Bearish',
    maxPain,
    maxPainDiff: parseFloat((((maxPain-underlying)/underlying)*100).toFixed(2)),
    atmStrike: atm?.strike, atmIV, totalCEOI: totalCE, totalPEOI: totalPE,
    topCE: topCE.map(s=>({strike:s.strike, oi:s.ceOI, iv:s.ceIV.toFixed(1)})),
    topPE: topPE.map(s=>({strike:s.strike, oi:s.peOI, iv:s.peIV.toFixed(1)})),
    freshCE: [...arr].sort((a,b)=>b.ceChgOI-a.ceChgOI).slice(0,3).map(s=>({strike:s.strike,chgOI:s.ceChgOI})),
    freshPE: [...arr].sort((a,b)=>b.peChgOI-a.peChgOI).slice(0,3).map(s=>({strike:s.strike,chgOI:s.peChgOI})),
  });
}
