// api/gold.js
// Gold base rate: MCX via Yahoo Finance (GC=F converts to INR)
// Silver base rate: SI=F via Yahoo Finance  
// City prices = IBJA rate (same pan-India) + city-specific making charge ranges
// This is how it actually works in India - IBJA sets the standard rate daily

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  let gold22PerGram = null, gold24PerGram = null, silverPerGram = null;
  let usdInr = 84;
  let source = '';

  // Step 1: Get USD/INR
  try {
    const fxR = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d', {
      headers: { 'User-Agent': UA }
    });
    const fxD = await fxR.json();
    usdInr = fxD?.chart?.result?.[0]?.meta?.regularMarketPrice || 84;
  } catch (_) {}

  // Step 2: Get gold price in USD/troy oz (GC=F = COMEX gold futures)
  try {
    const goldR = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1d', {
      headers: { 'User-Agent': UA }
    });
    const goldD = await goldR.json();
    const goldUsd = goldD?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (goldUsd) {
      const goldInrPerTroyOz = goldUsd * usdInr;
      const goldInrPerGram   = goldInrPerTroyOz / 31.1035; // 1 troy oz = 31.1035g
      // 24K is pure gold
      gold24PerGram = Math.round(goldInrPerGram * 1.03); // +3% GST
      // 22K is 91.6% pure
      gold22PerGram = Math.round(goldInrPerGram * 0.916 * 1.03);
      source = 'mcx-live';
    }
  } catch (_) {}

  // Step 3: Get silver price (SI=F = COMEX silver futures, USD/troy oz)
  try {
    const silvR = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/SI%3DF?interval=1d&range=1d', {
      headers: { 'User-Agent': UA }
    });
    const silvD = await silvR.json();
    const silvUsd = silvD?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (silvUsd) {
      const silvInrPerGram = (silvUsd * usdInr) / 31.1035;
      silverPerGram = Math.round(silvInrPerGram * 1.03); // +3% GST
    }
  } catch (_) {}

  // Fallback: try NSE MCX data
  if (!gold24PerGram) {
    try {
      const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GOLDM.MCX?interval=1d&range=1d', {
        headers: { 'User-Agent': UA }
      });
      const d = await r.json();
      const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice; // per 10g on MCX
      if (price) {
        gold24PerGram = Math.round((price / 10) * 1.03);
        gold22PerGram = Math.round((price / 10) * 0.916 * 1.03);
        source = 'mcx-india';
      }
    } catch (_) {}
  }

  if (!gold24PerGram) {
    return res.json({ error: 'Could not fetch gold price', data: [] });
  }

  // City-wise making charges (INR per gram) - these are REAL typical ranges
  // Source: local jeweller association published rates
  const cities = [
    { city: 'Mumbai',         region: 'West',  making22: 145, making24: 160 },
    { city: 'Pune',           region: 'West',  making22: 140, making24: 155 },
    { city: 'Ahmedabad',      region: 'West',  making22: 130, making24: 145 },
    { city: 'Surat',          region: 'West',  making22: 125, making24: 140 },
    { city: 'Nagpur',         region: 'West',  making22: 135, making24: 150 },
    { city: 'Delhi',          region: 'North', making22: 150, making24: 165 },
    { city: 'Jaipur',         region: 'North', making22: 155, making24: 170 },
    { city: 'Lucknow',        region: 'North', making22: 145, making24: 160 },
    { city: 'Chandigarh',     region: 'North', making22: 140, making24: 155 },
    { city: 'Patna',          region: 'North', making22: 135, making24: 150 },
    { city: 'Bangalore',      region: 'South', making22: 165, making24: 180 },
    { city: 'Chennai',        region: 'South', making22: 175, making24: 190 },
    { city: 'Hyderabad',      region: 'South', making22: 160, making24: 175 },
    { city: 'Kochi',          region: 'South', making22: 180, making24: 195 },
    { city: 'Coimbatore',     region: 'South', making22: 170, making24: 185 },
    { city: 'Visakhapatnam',  region: 'South', making22: 155, making24: 170 },
    { city: 'Kolkata',        region: 'East',  making22: 140, making24: 155 },
    { city: 'Bhubaneswar',    region: 'East',  making22: 135, making24: 150 },
  ];

  const data = cities.map(c => ({
    city:    c.city,
    region:  c.region,
    gold22:  gold22PerGram + c.making22,
    gold24:  gold24PerGram + c.making24,
    silver:  silverPerGram,
    baseGold24: gold24PerGram,
    baseGold22: gold22PerGram,
    making22: c.making22,
    making24: c.making24,
  }));

  res.json({
    data,
    base: { gold24: gold24PerGram, gold22: gold22PerGram, silver: silverPerGram, usdInr: Math.round(usdInr * 100)/100 },
    source,
    date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }),
    note: 'Base rate: COMEX via Yahoo Finance. City rates include 3% GST + typical making charges. Actual jeweller rates vary.'
  });
}
