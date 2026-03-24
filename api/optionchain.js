export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const { symbol = 'NIFTY' } = req.query;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Step 1: hit homepage to get session cookies
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
    const raw = home.headers.get('set-cookie') || '';
    cookies = raw.split(/,(?=[^ ][^=]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'Cookie failed: ' + e.message });
  }

  // Step 2: small delay to let session register
  await new Promise(r => setTimeout(r, 500));

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.nseindia.com/option-chain',
    'X-Requested-With': 'XMLHttpRequest',
    'Connection': 'keep-alive',
    'Cookie': cookies,
  };

  try {
    const url = `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`;
    const r   = await fetch(url, { headers: H });

    if (!r.ok) {
      return res.status(r.status).json({ error: `NSE returned ${r.status}` });
    }

    const json = await r.json();
    const records    = json?.records?.data || [];
    const underlying = json?.records?.underlyingValue;
    const expDates   = json?.records?.expiryDates || [];
    const nearExpiry = expDates[0];

    if (!records.length || !underlying) {
      return res.status(503).json({ error: 'No data returned from NSE' });
    }

    const pf = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

    // Near expiry records only
    const nearRec = records.filter(r => r.expiryDate === nearExpiry);

    // Build strike map
    const strikes = {};
    for (const row of nearRec) {
      const s = row.strikePrice;
      if (!strikes[s]) strikes[s] = { strike:s, ceOI:0, peOI:0, ceIV:0, peIV:0, ceLTP:0, peLTP:0, ceChgOI:0, peChgOI:0 };
      if (row.CE) {
        strikes[s].ceOI    = pf(row.CE.openInterest);
        strikes[s].ceIV    = pf(row.CE.impliedVolatility);
        strikes[s].ceLTP   = pf(row.CE.lastPrice);
        strikes[s].ceChgOI = pf(row.CE.changeinOpenInterest);
      }
      if (row.PE) {
        strikes[s].peOI    = pf(row.PE.openInterest);
        strikes[s].peIV    = pf(row.PE.impliedVolatility);
        strikes[s].peLTP   = pf(row.PE.lastPrice);
        strikes[s].peChgOI = pf(row.PE.changeinOpenInterest);
      }
    }

    const arr = Object.values(strikes).sort((a,b) => a.strike - b.strike);

    // PCR
    const totalCE = arr.reduce((s,r) => s + r.ceOI, 0);
    const totalPE = arr.reduce((s,r) => s + r.peOI, 0);
    const pcr     = totalCE > 0 ? parseFloat((totalPE/totalCE).toFixed(2)) : 0;

    // Max Pain
    let maxPain = 0, minLoss = Infinity;
    for (const target of arr) {
      let loss = 0;
      for (const s of arr) {
        if (target.strike > s.strike) loss += s.ceOI * (target.strike - s.strike);
        if (target.strike < s.strike) loss += s.peOI * (s.strike - target.strike);
      }
      if (loss < minLoss) { minLoss = loss; maxPain = target.strike; }
    }

    // ATM
    const atm   = arr.reduce((p,c) => Math.abs(c.strike-underlying) < Math.abs(p.strike-underlying) ? c : p);
    const atmIV = atm ? ((atm.ceIV + atm.peIV) / 2).toFixed(1) : null;

    // Top OI
    const topCE   = [...arr].sort((a,b) => b.ceOI - a.ceOI).slice(0,5);
    const topPE   = [...arr].sort((a,b) => b.peOI - a.peOI).slice(0,5);
    const freshCE = [...arr].sort((a,b) => b.ceChgOI - a.ceChgOI).slice(0,3);
    const freshPE = [...arr].sort((a,b) => b.peChgOI - a.peChgOI).slice(0,3);

    return res.json({
      symbol, underlying, nearExpiry, pcr,
      pcrSentiment: pcr > 1.2 ? 'Bullish' : pcr < 0.7 ? 'Bearish' : pcr >= 1 ? 'Mildly Bullish' : 'Mildly Bearish',
      maxPain,
      maxPainDiff: parseFloat((((maxPain - underlying) / underlying) * 100).toFixed(2)),
      atmStrike: atm?.strike, atmIV,
      totalCEOI: totalCE, totalPEOI: totalPE,
      topCE: topCE.map(s => ({ strike: s.strike, oi: s.ceOI, iv: s.ceIV.toFixed(1) })),
      topPE: topPE.map(s => ({ strike: s.strike, oi: s.peOI, iv: s.peIV.toFixed(1) })),
      freshCE: freshCE.map(s => ({ strike: s.strike, chgOI: s.ceChgOI })),
      freshPE: freshPE.map(s => ({ strike: s.strike, chgOI: s.peChgOI })),
    });

  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
}
