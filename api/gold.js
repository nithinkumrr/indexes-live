// api/gold.js — City-wise gold & silver prices for India
// Primary: goodreturns.in (city-wise daily rates)
// Fallback: ibja.co base rate + manual city multipliers

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  const cities = [
    'bangalore', 'mumbai', 'delhi', 'chennai', 'hyderabad',
    'kolkata', 'pune', 'ahmedabad', 'jaipur', 'surat',
    'lucknow', 'nagpur', 'bhopal', 'kochi', 'chandigarh',
    'coimbatore', 'visakhapatnam', 'patna'
  ];

  const cityNames = {
    bangalore: 'Bangalore', mumbai: 'Mumbai', delhi: 'Delhi',
    chennai: 'Chennai', hyderabad: 'Hyderabad', kolkata: 'Kolkata',
    pune: 'Pune', ahmedabad: 'Ahmedabad', jaipur: 'Jaipur',
    surat: 'Surat', lucknow: 'Lucknow', nagpur: 'Nagpur',
    bhopal: 'Bhopal', kochi: 'Kochi', chandigarh: 'Chandigarh',
    coimbatore: 'Coimbatore', visakhapatnam: 'Visakhapatnam', patna: 'Patna'
  };

  const results = [];

  // Fetch each city from goodreturns
  for (const city of cities) {
    try {
      const url = `https://www.goodreturns.in/gold-rates/${city}.html`;
      const r   = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
      if (!r.ok) continue;
      const html = await r.text();

      // Parse gold 22K, 24K per gram from the table
      // goodreturns has a table with "Today's Gold Rate in City"
      const pf = s => {
        const n = parseFloat(String(s || '').replace(/[₹,\s]/g, ''));
        return isNaN(n) ? null : n;
      };

      // Extract 22K 1g
      const g22_1g = html.match(/22\s*Carat.*?₹\s*([\d,]+)/s)?.[1] ||
                     html.match(/22K.*?(\d[\d,]+)/s)?.[1];
      // Extract 24K 1g  
      const g24_1g = html.match(/24\s*Carat.*?₹\s*([\d,]+)/s)?.[1] ||
                     html.match(/24K.*?(\d[\d,]+)/s)?.[1];

      // More targeted regex for the rate table
      const tableMatch = html.match(/id="gold_price_gram_22"[^>]*>.*?₹?\s*([\d,]+)/s) ||
                         html.match(/Gold Rate.*?22.*?Carat.*?1 gram.*?₹?\s*([\d,]+)/s) ||
                         html.match(/22 Carat Gold.*?Today.*?₹\s*([\d,]+)/s);

      const table24 = html.match(/id="gold_price_gram_24"[^>]*>.*?₹?\s*([\d,]+)/s) ||
                      html.match(/24 Carat Gold.*?Today.*?₹\s*([\d,]+)/s);

      // Try to find silver 1g
      const silver1g = html.match(/Silver.*?1 gram.*?₹?\s*([\d,]+)/s)?.[1] ||
                       html.match(/Silver.*?Today.*?₹\s*([\d,]+)/s)?.[1];

      // Parse what we found — try multiple patterns
      let gold22 = pf(tableMatch?.[1]) || pf(g22_1g);
      let gold24 = pf(table24?.[1]) || pf(g24_1g);
      let silver = pf(silver1g);

      // goodreturns sometimes shows per 10g — normalise
      if (gold22 && gold22 > 10000) gold22 = Math.round(gold22 / 10);
      if (gold24 && gold24 > 10000) gold24 = Math.round(gold24 / 10);
      if (silver && silver > 200)   silver  = Math.round(silver / 10);

      if (gold22 || gold24) {
        results.push({
          city:    cityNames[city],
          slug:    city,
          gold22:  gold22,
          gold24:  gold24,
          silver:  silver,
          source:  'goodreturns',
        });
      }
    } catch (_) {}
  }

  // If scraping failed, use IBJA base rate + city offsets
  if (results.length < 5) {
    try {
      const ibjaR = await fetch('https://ibja.co/', { headers: { 'User-Agent': UA } });
      const ibjaH = await ibjaR.text();
      const base22 = parseFloat(ibjaH.match(/Gold.*?22.*?([\d,]+\.\d+)/s)?.[1]?.replace(/,/g,'') || '0');
      const base24 = parseFloat(ibjaH.match(/Gold.*?24.*?([\d,]+\.\d+)/s)?.[1]?.replace(/,/g,'') || '0');

      // City multipliers (approximate making charge differences)
      const offsets = {
        'Mumbai': 0, 'Delhi': -5, 'Bangalore': 10, 'Chennai': 15,
        'Hyderabad': 5, 'Kolkata': -10, 'Pune': 5, 'Ahmedabad': -8,
        'Jaipur': 12, 'Surat': -5, 'Lucknow': 8, 'Nagpur': 5,
        'Bhopal': 8, 'Kochi': 20, 'Chandigarh': -5, 'Coimbatore': 18,
        'Visakhapatnam': 10, 'Patna': 8,
      };

      for (const [city, offset] of Object.entries(offsets)) {
        if (base22 > 0) {
          results.push({
            city, gold22: Math.round(base22 / 10 + offset),
            gold24: base24 > 0 ? Math.round(base24 / 10 + offset) : null,
            silver: null, source: 'ibja-estimated',
          });
        }
      }
    } catch (_) {}
  }

  res.json({
    data: results,
    timestamp: Date.now(),
    date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }),
  });
}
