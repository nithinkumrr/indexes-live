export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  let baseGold24 = null, baseGold22 = null, silverPerKg = null, source = '';

  // Strategy 1: GoodReturns — most reliable Indian gold price (correct, incl. import duty)
  try {
    const r = await fetch('https://www.goodreturns.in/gold-rates/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.goodreturns.in/' }
    });
    if (r.ok) {
      const html = await r.text();
      // GoodReturns shows: "₹14,291 per gram" for 24K
      const m24 = html.match(/24\s*[Kk]arat[^₹]*₹\s*([\d,]+)/i) ||
                  html.match(/24K[^₹]*₹\s*([\d,]+)/i) ||
                  html.match(/₹\s*([\d,]+)\s*per gram[^]*?24/i) ||
                  html.match(/"price24k"\s*:\s*"?([\d,]+)/i);
      const m22 = html.match(/22\s*[Kk]arat[^₹]*₹\s*([\d,]+)/i) ||
                  html.match(/22K[^₹]*₹\s*([\d,]+)/i);

      if (m24) {
        const v = parseFloat(m24[1].replace(/,/g,''));
        if (v > 8000 && v < 25000) { baseGold24 = v; source = 'goodreturns'; }
      }
      if (m22) {
        const v = parseFloat(m22[1].replace(/,/g,''));
        if (v > 7000 && v < 23000) baseGold22 = v;
      }
      if (baseGold24 && !baseGold22) baseGold22 = Math.round(baseGold24 * 0.916);
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

  // Sanity check — real gold price should be 10,000–20,000/gram in 2026
  if (baseGold24 < 10000 || baseGold24 > 20000) {
    return res.json({ error: `Suspicious gold price: ${baseGold24}`, data: [] });
  }

  const cities = [
    { city: 'Chennai',        region: 'South', f22: 1.030, f24: 1.030 },
    { city: 'Kochi',          region: 'South', f22: 1.032, f24: 1.032 },
    { city: 'Coimbatore',     region: 'South', f22: 1.028, f24: 1.028 },
    { city: 'Madurai',        region: 'South', f22: 1.029, f24: 1.029 },
    { city: 'Trichy',         region: 'South', f22: 1.027, f24: 1.027 },
    { city: 'Tirunelveli',    region: 'South', f22: 1.026, f24: 1.026 },
    { city: 'Salem',          region: 'South', f22: 1.025, f24: 1.025 },
    { city: 'Bangalore',      region: 'South', f22: 1.022, f24: 1.022 },
    { city: 'Mysore',         region: 'South', f22: 1.020, f24: 1.020 },
    { city: 'Mangalore',      region: 'South', f22: 1.023, f24: 1.023 },
    { city: 'Hyderabad',      region: 'South', f22: 1.020, f24: 1.020 },
    { city: 'Warangal',       region: 'South', f22: 1.019, f24: 1.019 },
    { city: 'Vijayawada',     region: 'South', f22: 1.021, f24: 1.021 },
    { city: 'Visakhapatnam',  region: 'South', f22: 1.018, f24: 1.018 },
    { city: 'Guntur',         region: 'South', f22: 1.019, f24: 1.019 },
    { city: 'Thiruvananthapuram', region: 'South', f22: 1.031, f24: 1.031 },
    { city: 'Kozhikode',      region: 'South', f22: 1.030, f24: 1.030 },
    { city: 'Thrissur',       region: 'South', f22: 1.029, f24: 1.029 },
    { city: 'Mumbai',         region: 'West',  f22: 1.010, f24: 1.010 },
    { city: 'Pune',           region: 'West',  f22: 1.014, f24: 1.014 },
    { city: 'Nagpur',         region: 'West',  f22: 1.016, f24: 1.016 },
    { city: 'Nashik',         region: 'West',  f22: 1.015, f24: 1.015 },
    { city: 'Aurangabad',     region: 'West',  f22: 1.017, f24: 1.017 },
    { city: 'Kolhapur',       region: 'West',  f22: 1.015, f24: 1.015 },
    { city: 'Solapur',        region: 'West',  f22: 1.016, f24: 1.016 },
    { city: 'Ahmedabad',      region: 'West',  f22: 1.008, f24: 1.008 },
    { city: 'Surat',          region: 'West',  f22: 1.006, f24: 1.006 },
    { city: 'Vadodara',       region: 'West',  f22: 1.010, f24: 1.010 },
    { city: 'Rajkot',         region: 'West',  f22: 1.012, f24: 1.012 },
    { city: 'Bhavnagar',      region: 'West',  f22: 1.013, f24: 1.013 },
    { city: 'Goa (Panaji)',   region: 'West',  f22: 1.014, f24: 1.014 },
    { city: 'Delhi',          region: 'North', f22: 1.012, f24: 1.012 },
    { city: 'Noida',          region: 'North', f22: 1.013, f24: 1.013 },
    { city: 'Gurgaon',        region: 'North', f22: 1.013, f24: 1.013 },
    { city: 'Ghaziabad',      region: 'North', f22: 1.014, f24: 1.014 },
    { city: 'Agra',           region: 'North', f22: 1.018, f24: 1.018 },
    { city: 'Kanpur',         region: 'North', f22: 1.019, f24: 1.019 },
    { city: 'Lucknow',        region: 'North', f22: 1.020, f24: 1.020 },
    { city: 'Varanasi',       region: 'North', f22: 1.021, f24: 1.021 },
    { city: 'Allahabad',      region: 'North', f22: 1.020, f24: 1.020 },
    { city: 'Meerut',         region: 'North', f22: 1.017, f24: 1.017 },
    { city: 'Jaipur',         region: 'North', f22: 1.018, f24: 1.018 },
    { city: 'Jodhpur',        region: 'North', f22: 1.019, f24: 1.019 },
    { city: 'Udaipur',        region: 'North', f22: 1.020, f24: 1.020 },
    { city: 'Kota',           region: 'North', f22: 1.018, f24: 1.018 },
    { city: 'Ajmer',          region: 'North', f22: 1.019, f24: 1.019 },
    { city: 'Chandigarh',     region: 'North', f22: 1.016, f24: 1.016 },
    { city: 'Amritsar',       region: 'North', f22: 1.017, f24: 1.017 },
    { city: 'Ludhiana',       region: 'North', f22: 1.016, f24: 1.016 },
    { city: 'Jalandhar',      region: 'North', f22: 1.017, f24: 1.017 },
    { city: 'Dehradun',       region: 'North', f22: 1.018, f24: 1.018 },
    { city: 'Shimla',         region: 'North', f22: 1.022, f24: 1.022 },
    { city: 'Jammu',          region: 'North', f22: 1.022, f24: 1.022 },
    { city: 'Patna',          region: 'North', f22: 1.022, f24: 1.022 },
    { city: 'Gaya',           region: 'North', f22: 1.022, f24: 1.022 },
    { city: 'Ranchi',         region: 'North', f22: 1.021, f24: 1.021 },
    { city: 'Jamshedpur',     region: 'North', f22: 1.020, f24: 1.020 },
    { city: 'Raipur',         region: 'North', f22: 1.019, f24: 1.019 },
    { city: 'Bhopal',         region: 'North', f22: 1.018, f24: 1.018 },
    { city: 'Indore',         region: 'North', f22: 1.016, f24: 1.016 },
    { city: 'Jabalpur',       region: 'North', f22: 1.019, f24: 1.019 },
    { city: 'Gwalior',        region: 'North', f22: 1.018, f24: 1.018 },
    { city: 'Kolkata',        region: 'East',  f22: 1.016, f24: 1.016 },
    { city: 'Siliguri',       region: 'East',  f22: 1.020, f24: 1.020 },
    { city: 'Durgapur',       region: 'East',  f22: 1.018, f24: 1.018 },
    { city: 'Asansol',        region: 'East',  f22: 1.018, f24: 1.018 },
    { city: 'Bhubaneswar',    region: 'East',  f22: 1.018, f24: 1.018 },
    { city: 'Cuttack',        region: 'East',  f22: 1.019, f24: 1.019 },
    { city: 'Guwahati',       region: 'East',  f22: 1.024, f24: 1.024 },
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
