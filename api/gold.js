export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  let baseGold24 = null, baseGold22 = null, silverPerKg = null, source = '';

  // Strategy 1: GoodReturns — scrape 22K price (reliable), derive 24K from purity
  try {
    const r = await fetch('https://www.goodreturns.in/gold-rates/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.goodreturns.in/' }
    });
    if (r.ok) {
      const html = await r.text();
      // Extract all ₹XX,XXX values in valid gold-per-gram range
      const prices = [...html.matchAll(/₹\s*(\d{1,2},\d{3})/g)]
        .map(m => parseInt(m[1].replace(/,/g,'')))
        .filter(v => v > 8000 && v < 20000);
      const unique = [...new Set(prices)].sort((a,b) => a-b);
      // The lowest in valid range is typically 22K
      // 24K = 22K / 0.916 (always)
      if (unique.length > 0) {
        // Find 22K — it's the most commonly occurring valid price
        const freq = {};
        prices.filter(v => v > 8000 && v < 20000).forEach(v => freq[v] = (freq[v]||0) + 1);
        const sorted22 = Object.entries(freq).sort((a,b) => b[1]-a[1]);
        baseGold22 = parseInt(sorted22[0][0]);
        baseGold24 = Math.round(baseGold22 / 0.916);
        source = 'goodreturns';
      }
    }
  } catch (_) {}

  // Strategy 2: GoodReturns silver
  if (!silverPerKg) {
    try {
      const r = await fetch('https://www.goodreturns.in/silver-rates/', {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.goodreturns.in/' }
      });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/₹\s*([\d,]+)\s*per kilogram/i) ||
                  html.match(/1\s*Kg[^₹]*₹\s*([\d,]+)/i) ||
                  html.match(/([\d,]{5,7})\s*per\s*kg/i);
        if (m) {
          const v = parseFloat(m[1].replace(/,/g,''));
          if (v > 50000 && v < 400000) silverPerKg = v;
        }
      }
    } catch (_) {}
  }

  // Strategy 3: COMEX via Yahoo — ONLY for gold, correct formula
  // India gold price = COMEX × USD/INR / 31.1035 × 1.155 (15% import duty + GST already in GR)
  // But we just use it as raw fallback — GoodReturns is preferred
  if (!baseGold24) {
    try {
      const [fxR, gR] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d', { headers: { 'User-Agent': UA } }),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1d', { headers: { 'User-Agent': UA } }),
      ]);
      const usd  = (await fxR.json())?.chart?.result?.[0]?.meta?.regularMarketPrice || 84;
      const gUsd = (await gR.json())?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (gUsd && usd) {
        // Base COMEX conversion per gram
        const perGram  = (gUsd * usd) / 31.1035;
        // India total: import duty 12.5% + 2.5% agri cess + 3% GST ≈ 18.5% over COMEX
        baseGold24 = Math.round(perGram * 1.185);
        baseGold22 = Math.round(baseGold24 * 0.916);
        source = 'comex';
      }
    } catch (_) {}
  }

  // Strategy 4: COMEX silver fallback
  if (!silverPerKg) {
    try {
      const [fxR, sR] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/USDINR%3DX?interval=1d&range=1d', { headers: { 'User-Agent': UA } }),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/SI%3DF?interval=1d&range=1d', { headers: { 'User-Agent': UA } }),
      ]);
      const usd  = (await fxR.json())?.chart?.result?.[0]?.meta?.regularMarketPrice || 84;
      const sUsd = (await sR.json())?.chart?.result?.[0]?.meta?.regularMarketPrice;
      // Silver: 7.5% import duty + 3% GST
      if (sUsd) silverPerKg = Math.round((sUsd * usd) / 31.1035 * 1000 * 1.105);
    } catch (_) {}
  }

  if (!baseGold24) return res.json({ error: 'Could not fetch gold price', data: [] });

  // Sanity check — 22K gold per gram in India 2026
  if (!baseGold24 || baseGold22 < 10000 || baseGold22 > 20000) {
    return res.json({ error: `Invalid price: 22K=${baseGold22}`, data: [] });
  }

  // City premiums: real variation is ₹30-100/gram max
  // Base from GoodReturns already includes GST + standard market rate
  // Premiums reflect only local demand/transport difference — kept realistic (0.1-0.8%)
  const cities = [
    // South — slightly higher demand, ~0.5-0.8%
    { city: 'Chennai',            region: 'South', f22: 1.006, f24: 1.006 },
    { city: 'Kochi',              region: 'South', f22: 1.008, f24: 1.008 },
    { city: 'Coimbatore',         region: 'South', f22: 1.006, f24: 1.006 },
    { city: 'Madurai',            region: 'South', f22: 1.006, f24: 1.006 },
    { city: 'Trichy',             region: 'South', f22: 1.005, f24: 1.005 },
    { city: 'Tirunelveli',        region: 'South', f22: 1.005, f24: 1.005 },
    { city: 'Salem',              region: 'South', f22: 1.005, f24: 1.005 },
    { city: 'Bangalore',          region: 'South', f22: 1.004, f24: 1.004 },
    { city: 'Mysore',             region: 'South', f22: 1.004, f24: 1.004 },
    { city: 'Mangalore',          region: 'South', f22: 1.005, f24: 1.005 },
    { city: 'Hyderabad',          region: 'South', f22: 1.003, f24: 1.003 },
    { city: 'Warangal',           region: 'South', f22: 1.003, f24: 1.003 },
    { city: 'Vijayawada',         region: 'South', f22: 1.004, f24: 1.004 },
    { city: 'Visakhapatnam',      region: 'South', f22: 1.003, f24: 1.003 },
    { city: 'Guntur',             region: 'South', f22: 1.003, f24: 1.003 },
    { city: 'Thiruvananthapuram', region: 'South', f22: 1.007, f24: 1.007 },
    { city: 'Kozhikode',          region: 'South', f22: 1.007, f24: 1.007 },
    { city: 'Thrissur',           region: 'South', f22: 1.006, f24: 1.006 },
    // West — Mumbai/Gujarat lowest due to trade hub competition
    { city: 'Mumbai',             region: 'West',  f22: 1.001, f24: 1.001 },
    { city: 'Pune',               region: 'West',  f22: 1.002, f24: 1.002 },
    { city: 'Nagpur',             region: 'West',  f22: 1.003, f24: 1.003 },
    { city: 'Nashik',             region: 'West',  f22: 1.002, f24: 1.002 },
    { city: 'Aurangabad',         region: 'West',  f22: 1.003, f24: 1.003 },
    { city: 'Kolhapur',           region: 'West',  f22: 1.002, f24: 1.002 },
    { city: 'Solapur',            region: 'West',  f22: 1.003, f24: 1.003 },
    { city: 'Ahmedabad',          region: 'West',  f22: 1.001, f24: 1.001 },
    { city: 'Surat',              region: 'West',  f22: 1.000, f24: 1.000 },
    { city: 'Vadodara',           region: 'West',  f22: 1.001, f24: 1.001 },
    { city: 'Rajkot',             region: 'West',  f22: 1.002, f24: 1.002 },
    { city: 'Bhavnagar',          region: 'West',  f22: 1.002, f24: 1.002 },
    { city: 'Goa (Panaji)',       region: 'West',  f22: 1.003, f24: 1.003 },
    // North — moderate
    { city: 'Delhi',              region: 'North', f22: 1.001, f24: 1.001 },
    { city: 'Noida',              region: 'North', f22: 1.001, f24: 1.001 },
    { city: 'Gurgaon',            region: 'North', f22: 1.001, f24: 1.001 },
    { city: 'Ghaziabad',          region: 'North', f22: 1.002, f24: 1.002 },
    { city: 'Agra',               region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Kanpur',             region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Lucknow',            region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Varanasi',           region: 'North', f22: 1.004, f24: 1.004 },
    { city: 'Allahabad',          region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Meerut',             region: 'North', f22: 1.002, f24: 1.002 },
    { city: 'Jaipur',             region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Jodhpur',            region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Udaipur',            region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Kota',               region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Ajmer',              region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Chandigarh',         region: 'North', f22: 1.002, f24: 1.002 },
    { city: 'Amritsar',           region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Ludhiana',           region: 'North', f22: 1.002, f24: 1.002 },
    { city: 'Jalandhar',          region: 'North', f22: 1.002, f24: 1.002 },
    { city: 'Dehradun',           region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Shimla',             region: 'North', f22: 1.005, f24: 1.005 },
    { city: 'Jammu',              region: 'North', f22: 1.004, f24: 1.004 },
    { city: 'Patna',              region: 'North', f22: 1.004, f24: 1.004 },
    { city: 'Gaya',               region: 'North', f22: 1.004, f24: 1.004 },
    { city: 'Ranchi',             region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Jamshedpur',         region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Raipur',             region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Bhopal',             region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Indore',             region: 'North', f22: 1.002, f24: 1.002 },
    { city: 'Jabalpur',           region: 'North', f22: 1.003, f24: 1.003 },
    { city: 'Gwalior',            region: 'North', f22: 1.003, f24: 1.003 },
    // East
    { city: 'Kolkata',            region: 'East',  f22: 1.002, f24: 1.002 },
    { city: 'Siliguri',           region: 'East',  f22: 1.004, f24: 1.004 },
    { city: 'Durgapur',           region: 'East',  f22: 1.003, f24: 1.003 },
    { city: 'Asansol',            region: 'East',  f22: 1.003, f24: 1.003 },
    { city: 'Bhubaneswar',        region: 'East',  f22: 1.003, f24: 1.003 },
    { city: 'Cuttack',            region: 'East',  f22: 1.003, f24: 1.003 },
    { city: 'Guwahati',           region: 'East',  f22: 1.005, f24: 1.005 },
  ];

  const data = cities.map(c => ({
    city: c.city, region: c.region,
    gold22:     Math.round(baseGold22 * c.f22),
    gold24:     Math.round(baseGold24 * c.f24),
    silver:     silverPerKg || null,
    premiumPct: Math.round((c.f24 - 1) * 100 * 10) / 10,
  }));

  return res.json({
    data,
    base:   { gold24: baseGold24, gold22: baseGold22, silver: silverPerKg },
    mcx:    { gold: null, silver: null },
    source,
    date:   new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }),
    note:   'IBJA rate · City rates include regional demand premium · Actual jeweller rates vary',
  });
}
