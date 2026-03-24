// api/optionchain.js
// Fetches NSE option chain for NIFTY and BANKNIFTY
// Returns: PCR, Max Pain, top OI strikes, ATM IV, FII F&O data

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const { symbol = 'NIFTY' } = req.query;
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' }
    });
    cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (e) {
    return res.status(500).json({ error: 'Cookie failed' });
  }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  try {
    const r    = await fetch(`https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`, { headers: H });
    if (!r.ok) throw new Error(`NSE ${r.status}`);
    const json = await r.json();

    const records    = json?.records?.data || [];
    const filtered   = json?.filtered?.data || records;
    const underlying = json?.records?.underlyingValue || json?.filtered?.CE?.underlyingValue;
    const expDates   = json?.records?.expiryDates || [];
    const nearExpiry = expDates[0];

    if (!records.length) throw new Error('No option chain data');

    const pf = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

    // Filter near expiry
    const nearRecords = records.filter(r => r.expiryDate === nearExpiry);

    // Aggregate by strike
    const strikes = {};
    for (const row of nearRecords) {
      const strike = row.strikePrice;
      if (!strikes[strike]) strikes[strike] = { strike, ceOI: 0, peOI: 0, ceIV: 0, peIV: 0, ceLTP: 0, peLTP: 0, ceChgOI: 0, peChgOI: 0 };
      if (row.CE) {
        strikes[strike].ceOI    = pf(row.CE.openInterest);
        strikes[strike].ceIV    = pf(row.CE.impliedVolatility);
        strikes[strike].ceLTP   = pf(row.CE.lastPrice);
        strikes[strike].ceChgOI = pf(row.CE.changeinOpenInterest);
      }
      if (row.PE) {
        strikes[strike].peOI    = pf(row.PE.openInterest);
        strikes[strike].peIV    = pf(row.PE.impliedVolatility);
        strikes[strike].peLTP   = pf(row.PE.lastPrice);
        strikes[strike].peChgOI = pf(row.PE.changeinOpenInterest);
      }
    }

    const strikeArr = Object.values(strikes).sort((a, b) => a.strike - b.strike);

    // PCR — total PE OI / total CE OI
    const totalCE = strikeArr.reduce((s, r) => s + r.ceOI, 0);
    const totalPE = strikeArr.reduce((s, r) => s + r.peOI, 0);
    const pcr     = totalCE > 0 ? parseFloat((totalPE / totalCE).toFixed(2)) : 0;

    // Max Pain — strike where total option premium loss for buyers is highest
    // = strike where sum of (intrinsic value of all options) is minimum
    let maxPain = 0, minLoss = Infinity;
    for (const target of strikeArr) {
      let totalLoss = 0;
      for (const s of strikeArr) {
        // CE buyers lose if target > s.strike (CE expires worthless)
        if (target.strike > s.strike) totalLoss += s.ceOI * (target.strike - s.strike);
        // PE buyers lose if target < s.strike
        if (target.strike < s.strike) totalLoss += s.peOI * (s.strike - target.strike);
      }
      if (totalLoss < minLoss) { minLoss = totalLoss; maxPain = target.strike; }
    }

    // ATM strike and IV
    const atm    = strikeArr.reduce((prev, curr) =>
      Math.abs(curr.strike - underlying) < Math.abs(prev.strike - underlying) ? curr : prev
    );
    const atmIV  = atm ? ((atm.ceIV + atm.peIV) / 2).toFixed(2) : null;

    // Top CE OI (resistance) and PE OI (support) strikes
    const topCE = [...strikeArr].sort((a, b) => b.ceOI - a.ceOI).slice(0, 5);
    const topPE = [...strikeArr].sort((a, b) => b.peOI - a.peOI).slice(0, 5);

    // OI buildup — strikes with highest change in OI (fresh positions)
    const freshCE = [...strikeArr].sort((a, b) => b.ceChgOI - a.ceChgOI).slice(0, 3);
    const freshPE = [...strikeArr].sort((a, b) => b.peChgOI - a.peChgOI).slice(0, 3);

    // Nearest strikes around ATM for display
    const atmIdx = strikeArr.findIndex(s => s.strike === atm?.strike);
    const displayStrikes = strikeArr.slice(Math.max(0, atmIdx - 6), atmIdx + 7);

    return res.json({
      symbol,
      underlying,
      nearExpiry,
      pcr,
      pcrSentiment: pcr > 1.2 ? 'Bullish' : pcr < 0.7 ? 'Bearish' : pcr > 1 ? 'Mildly Bullish' : 'Mildly Bearish',
      maxPain,
      maxPainDiff: underlying ? parseFloat((((maxPain - underlying) / underlying) * 100).toFixed(2)) : 0,
      atmStrike:   atm?.strike,
      atmIV,
      totalCEOI:   totalCE,
      totalPEOI:   totalPE,
      topResistance: topCE[0]?.strike,
      topSupport:    topPE[0]?.strike,
      topCE: topCE.map(s => ({ strike: s.strike, oi: s.ceOI, iv: s.ceIV.toFixed(1) })),
      topPE: topPE.map(s => ({ strike: s.strike, oi: s.peOI, iv: s.peIV.toFixed(1) })),
      freshCE: freshCE.map(s => ({ strike: s.strike, chgOI: s.ceChgOI })),
      freshPE: freshPE.map(s => ({ strike: s.strike, chgOI: s.peChgOI })),
      displayStrikes,
    });

  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
}
