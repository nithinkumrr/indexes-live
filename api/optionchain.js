export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const { symbol = 'NIFTY' } = req.query;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const pf = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  let json = null;

  // Strategy 1: NSE with fresh cookies from multiple pages
  try {
    // Hit 3 pages to build a proper session
    const headers1 = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' };
    
    const r1 = await fetch('https://www.nseindia.com', { headers: headers1 });
    let cookies = (r1.headers.get('set-cookie')||'').split(/,(?=[^ ][^=]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');

    await new Promise(r => setTimeout(r, 200));

    const r2 = await fetch('https://www.nseindia.com/market-data/live-equity-market', {
      headers: { ...headers1, 'Referer': 'https://www.nseindia.com/', Cookie: cookies }
    });
    const c2 = (r2.headers.get('set-cookie')||'').split(/,(?=[^ ][^=]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
    if (c2) cookies += '; ' + c2;

    await new Promise(r => setTimeout(r, 200));

    const apiHeaders = {
      'User-Agent': UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.nseindia.com/option-chain',
      'X-Requested-With': 'XMLHttpRequest',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'Cookie': cookies,
    };

    const r3 = await fetch(`https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`, { headers: apiHeaders });
    if (r3.ok) {
      const text = await r3.text();
      if (text && text.startsWith('{')) {
        json = JSON.parse(text);
      }
    }
  } catch (_) {}

  // Strategy 2: Try the alternate NSE endpoint
  if (!json?.records?.data?.length) {
    try {
      const r1 = await fetch('https://www.nseindia.com', {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' }
      });
      const cookies = (r1.headers.get('set-cookie')||'').split(/,(?=[^ ][^=]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
      
      await new Promise(r => setTimeout(r, 500));

      const r2 = await fetch(`https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`, {
        headers: {
          'User-Agent': UA, 'Accept': 'application/json',
          'Referer': 'https://www.nseindia.com/', Cookie: cookies,
        }
      });
      if (r2.ok) json = await r2.json();
    } catch (_) {}
  }

  if (!json?.records?.data?.length) {
    return res.status(503).json({ error: 'NSE option chain unavailable. Try during market hours 9:15 AM – 3:30 PM IST.' });
  }

  const records    = json.records.data;
  const underlying = json.records.underlyingValue;
  const nearExpiry = json.records.expiryDates?.[0];

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
