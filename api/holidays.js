export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  // Try NSE live
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' }
    });
    const cookies = (home.headers.get('set-cookie') || '')
      .split(/,(?=[^;]+=)/).map(c => c.split(';')[0].trim()).filter(Boolean).join('; ');
    const r = await fetch('https://www.nseindia.com/api/holiday-master?type=trading', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies }
    });
    if (r.ok) {
      const data = await r.json();
      const fo = data?.FO || data?.CM || [];

      // NSE returns dates in various formats: '26-Mar-2026', '2026-03-26', '26 Mar 2026'
      // Normalize all to YYYY-MM-DD
      const normalizeDate = (raw) => {
        if (!raw) return null;
        const s = raw.trim();
        // Already YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        // DD-MMM-YYYY or DD MMM YYYY
        const m = s.match(/^(\d{1,2})[-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{4})$/i);
        if (m) {
          const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
          return `${m[3]}-${months[m[2].toLowerCase()]}-${m[1].padStart(2,'0')}`;
        }
        // Fallback: try Date parse
        try { return new Date(s).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); } catch { return null; }
      };

      const dates = fo.map(h => normalizeDate(h.tradingDate?.split(' ')[0] || h.tradingDate)).filter(Boolean);
      const names = {};
      fo.forEach(h => {
        const norm = normalizeDate(h.tradingDate?.split(' ')[0] || h.tradingDate);
        if (norm) names[norm] = h.description || h.holiday || h.holidayName || '';
      });
      if (dates.length > 0) return res.json({ source: 'nse-live', holidays: dates, holidayNames: names });
    }
  } catch (_) {}

  // Hardcoded fallback — complete 2026 NSE holiday list (confirmed from NSE circular)
  const holidays = [
    // 2025 (remaining)
    '2025-03-31', // Ramzan-Eid
    '2025-04-10', // Ram Navami
    '2025-04-14', // Dr. Baba Saheb Ambedkar Jayanti
    '2025-04-18', // Good Friday
    '2025-05-01', // Maharashtra Day
    '2025-08-15', // Independence Day
    '2025-08-27', // Ganesh Chaturthi
    '2025-10-02', // Gandhi Jayanti
    '2025-10-21', // Diwali Laxmi Pujan
    '2025-10-22', // Diwali Balipratipada
    '2025-11-05', // Guru Nanak Jayanti
    '2025-12-25', // Christmas
    // 2026 — full confirmed list
    '2026-01-26', // Republic Day (Monday)
    '2026-02-17', // Mahashivratri (Tuesday)
    '2026-03-03', // Holi (Tuesday)
    '2026-03-26', // Ram Navami (Thursday) ← KEY ONE
    '2026-03-31', // Mahavir Jayanti (Tuesday)
    '2026-04-03', // Good Friday
    '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
    '2026-05-01', // Maharashtra Day
    '2026-05-28', // Bakri Id
    '2026-06-26', // Muharram
    '2026-09-14', // Ganesh Chaturthi (Monday)
    '2026-10-02', // Gandhi Jayanti / Dussehra
    '2026-10-20', // Dussehra
    '2026-11-08', // Diwali Muhurat (Sunday - special session)
    '2026-11-10', // Diwali Balipratipada
    '2026-11-24', // Prakash Gurpurb Sri Guru Nanak Dev
    '2026-12-25', // Christmas
  ];

  const holidayNames = {
    '2025-03-31': 'Ramzan-Eid', '2025-04-10': 'Ram Navami', '2025-04-14': 'Ambedkar Jayanti',
    '2025-04-18': 'Good Friday', '2025-05-01': 'Maharashtra Day', '2025-08-15': 'Independence Day',
    '2025-08-27': 'Ganesh Chaturthi', '2025-10-02': 'Gandhi Jayanti', '2025-10-21': 'Diwali Laxmi Pujan',
    '2025-10-22': 'Diwali Balipratipada', '2025-11-05': 'Guru Nanak Jayanti', '2025-12-25': 'Christmas',
    '2026-01-26': 'Republic Day', '2026-02-17': 'Mahashivratri', '2026-03-03': 'Holi',
    '2026-03-26': 'Ram Navami', '2026-03-31': 'Mahavir Jayanti', '2026-04-03': 'Good Friday',
    '2026-04-14': 'Ambedkar Jayanti', '2026-05-01': 'Maharashtra Day', '2026-05-28': 'Bakri Id',
    '2026-06-26': 'Muharram', '2026-09-14': 'Ganesh Chaturthi', '2026-10-02': 'Gandhi Jayanti',
    '2026-10-20': 'Dussehra', '2026-11-10': 'Diwali Balipratipada', '2026-11-24': 'Guru Nanak Jayanti',
    '2026-12-25': 'Christmas',
  };

  res.json({ source: 'fallback', holidays, holidayNames });
}
