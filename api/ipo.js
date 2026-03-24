// api/ipo.js - IPO data from NSE + GMP from investorgain
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    cookies = (home.headers.get('set-cookie') || '').split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch (_) {}

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  const result = { upcoming: [], active: [], recent: [], gmp: [] };

  // NSE IPO data
  try {
    const r = await fetch('https://www.nseindia.com/api/allIpo', { headers: H });
    const d = await r.json();

    const parseIpo = (item) => ({
      name:       item.companyName || item.symbol,
      symbol:     item.symbol,
      openDate:   item.openDate   || item.bidStartDate,
      closeDate:  item.closeDate  || item.bidEndDate,
      listDate:   item.listingDate,
      priceLow:   parseFloat(item.minBidQuantity ? item.cutOffPrice?.split('-')[0] : item.minPrice || 0),
      priceHigh:  parseFloat(item.cutOffPrice?.split('-').pop() || item.maxPrice || 0),
      lotSize:    parseInt(item.lotSize || item.minBidQuantity || 0),
      issueSize:  item.issueSize,
      status:     item.status,
      subTimes:   item.subscriptionTimes || item.totalSubscription,
      exchange:   item.exchange || 'NSE',
    });

    if (Array.isArray(d)) {
      d.forEach(ipo => {
        const parsed = parseIpo(ipo);
        const now = new Date();
        const open  = parsed.openDate  ? new Date(parsed.openDate)  : null;
        const close = parsed.closeDate ? new Date(parsed.closeDate) : null;
        if (open && open > now)  result.upcoming.push(parsed);
        else if (close && close >= now) result.active.push(parsed);
        else result.recent.push(parsed);
      });
    } else if (d.ipoOpenDate || d.pastUpcomingIPO) {
      (d.pastUpcomingIPO || []).forEach(ipo => result.upcoming.push(parseIpo(ipo)));
      (d.pastOngoingIPO  || []).forEach(ipo => result.active.push(parseIpo(ipo)));
      (d.pastListedIPO   || []).forEach(ipo => result.recent.push(parseIpo(ipo)));
    }
  } catch (e) {
    console.error('NSE IPO failed:', e.message);
  }

  // GMP from investorgain.com
  try {
    const r = await fetch('https://www.investorgain.com/report/live-ipo-gmp/331/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.investorgain.com/' }
    });
    if (r.ok) {
      const html = await r.text();
      // Parse table rows
      const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const rows = html.match(rowRegex) || [];

      for (const row of rows.slice(1, 30)) {
        const cells = [...row.matchAll(cellRegex)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
        if (cells.length >= 4 && cells[0]) {
          const gmpVal = parseInt(cells[2]?.replace(/[^0-9-]/g, '') || '0');
          const price  = parseInt(cells[1]?.replace(/[^0-9]/g, '') || '0');
          result.gmp.push({
            name:     cells[0],
            price:    price || null,
            gmp:      gmpVal,
            gmpPct:   price > 0 ? Math.round((gmpVal / price) * 100) : null,
            kosdaq:   cells[3] || '',
            fireDate: cells[4] || '',
          });
        }
      }
    }
  } catch (_) {}

  result.recent = result.recent.slice(0, 20);
  res.json(result);
}
