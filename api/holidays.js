// api/holidays.js — Fetches NSE F&O trading holidays
// Tries NSE live endpoint; falls back to hardcoded 2025+2026 list
// Cached 24h since holidays don't change intraday

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  // Try NSE live
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      }
    });
    const cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');

    const r = await fetch('https://www.nseindia.com/api/holiday-master?type=trading', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
        Cookie: cookies,
      }
    });

    if (r.ok) {
      const data = await r.json();
      // FO segment holidays — array of { tradingDate, description }
      const fo = data?.FO || data?.CM || [];
      const dates = fo.map(h => h.tradingDate?.split(' ')[0]).filter(Boolean);
      if (dates.length > 0) {
        return res.json({ source: 'nse-live', holidays: dates });
      }
    }
  } catch (_) {}

  // Hardcoded fallback — NSE F&O holidays 2025 & 2026
  const holidays = [
    // 2025
    '2025-02-19', // Chhatrapati Shivaji Maharaj Jayanti
    '2025-02-26', // Mahashivratri
    '2025-03-14', // Holi
    '2025-03-31', // Ramzan-Eid (Id-Ul-Fitra)
    '2025-04-10', // Ram Navami (Shri Ram Navami)
    '2025-04-14', // Dr. Baba Saheb Ambedkar Jayanti
    '2025-04-18', // Good Friday
    '2025-05-01', // Maharashtra Day
    '2025-08-15', // Independence Day
    '2025-08-27', // Ganesh Chaturthi
    '2025-10-02', // Gandhi Jayanti / Dussehra
    '2025-10-21', // Diwali Laxmi Pujan (Muhurat trading - special)
    '2025-10-22', // Diwali Balipratipada
    '2025-11-05', // Prakash Gurpurb Sri Guru Nanak Dev ji
    '2025-12-25', // Christmas
    // 2026
    '2026-01-26', // Republic Day
    '2026-02-17', // Mahashivratri
    '2026-03-03', // Holi
    '2026-03-20', // Ramzan-Eid
    '2026-04-03', // Good Friday
    '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
    '2026-04-15', // Ram Navami
    '2026-05-01', // Maharashtra Day
    '2026-08-15', // Independence Day
    '2026-10-02', // Gandhi Jayanti
    '2026-11-13', // Diwali
    '2026-12-25', // Christmas
  ];

  res.json({ source: 'fallback', holidays });
}
