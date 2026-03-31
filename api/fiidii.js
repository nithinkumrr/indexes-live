// api/fiidii.js
// Returns FII/DII data:
// - History: reads last 7 trading days from Vercel KV (stored by cron)
// - Latest: always fetches live from NSE for today
// - Falls back to NSE scrape if KV has no data yet

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const pn = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  const parseRow = row => {
    if (!row) return { net: 0, buy: 0, sell: 0 };
    const net  = pn(row.netValue ?? row.net ?? row.netPurchaseSales ?? row.NET ?? 0);
    const buy  = pn(row.buyValue ?? row.grossPurchase ?? row.BUY ?? row.buy ?? 0);
    const sell = pn(row.sellValue ?? row.grossSales ?? row.SELL ?? row.sell ?? 0);
    return { net: net || (buy - sell), buy, sell };
  };

  const isFII = r => /FII|FPI|FOREIGN/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||''));
  const isDII = r => /DII|DOMESTIC/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||''));

  const HOLIDAYS = new Set(['2026-01-15','2026-01-26','2026-03-03','2026-03-26','2026-03-31',
    '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14',
    '2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25']);

  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const today = ist.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Build list of last 7 trading days
  const tradingDays = [];
  const cur = new Date(ist);
  while (tradingDays.length < 7) {
    const iso = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso)) tradingDays.push(iso);
    cur.setDate(cur.getDate() - 1);
  }
  tradingDays.reverse();

  // Step 1: Read history from KV
  const history = [];
  for (const iso of tradingDays) {
    try {
      const raw = await kv.get(`fiidii:${iso}`);
      if (raw) {
        const record = typeof raw === 'string' ? JSON.parse(raw) : raw;
        history.push(record);
      }
    } catch (_) {}
  }

  // Step 2: Fetch live today ONLY after 5 PM IST (NSE publishes FII/DII at ~5 PM)
  // Before 5 PM, today's data doesn't exist yet  -  don't attempt and don't show today's date
  let liveToday = null;
  const istHour = ist.getHours();
  const isPast5pm = istHour >= 17;
  const todayIsHoliday = HOLIDAYS.has(today) || new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay() === 0 || new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay() === 6;

  if (!todayIsHoliday && isPast5pm) {
    let cookies = '';
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
    const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };
    // Try dated endpoint first, fall back to latest
    let liveData = null;
    for (const url of [
      `https://www.nseindia.com/api/fiidiiTradeReact`,
      `https://www.nseindia.com/api/fiidiiTradeReact?type=equity`,
    ]) {
      try {
        const r = await fetch(url, { headers: H });
        if (r.ok) { liveData = await r.json(); break; }
      } catch(_) {}
    }
    const r = { ok: !!liveData, json: async () => liveData };
    if (r.ok) {
      const data = await r.json();
      const rows = Array.isArray(data) ? data : (data.data || []);
      const fiiRow = rows.find(isFII);
      const diiRow = rows.find(isDII);
      if (fiiRow || diiRow) {
        const f = parseRow(fiiRow);
        const d = parseRow(diiRow);
        liveToday = { date: today, fiiNet: f.net, fiiBuy: f.buy, fiiSell: f.sell, diiNet: d.net, diiBuy: d.buy, diiSell: d.sell };
      }
    }
  } // end isPast5pm

  // Step 3: Merge today's live data  -  only if confirmed trading day AND non-zero values
  // NSE sometimes returns all zeros before data is published  -  ignore those
  const todayIsTradingDay = tradingDays.includes(today);
  const todayHasRealData = liveToday && (
    Math.abs(liveToday.fiiNet) > 0 || Math.abs(liveToday.diiNet) > 0 ||
    liveToday.fiiBuy > 0 || liveToday.diiBuy > 0
  );
  if (todayHasRealData && todayIsTradingDay) {
    const existing = history.findIndex(h => h.date === today);
    if (existing >= 0) history[existing] = liveToday;
    else history.push(liveToday);
    try { await kv.set(`fiidii:${today}`, JSON.stringify(liveToday), { ex: 60 * 24 * 60 * 60 }); } catch (_) {}
  }

  // ── CRITICAL: Filter history to only confirmed trading days ──────────────────
  // Remove any entries that accidentally got stored on weekends or holidays.
  const allTradingDaySet = new Set(tradingDays);
  const filteredHistory = history.filter(h => {
    if (!h.date) return false;
    const d = new Date(h.date + 'T00:00:00');
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return false; // reject weekends
    if (HOLIDAYS.has(h.date)) return false;   // reject holidays
    return true;
  });

  filteredHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Latest is the most recent trading day  -  could be yesterday if today is weekend/holiday
  const latest = filteredHistory[filteredHistory.length - 1] || {};

  return res.status(200).json({
    fiiNet: latest.fiiNet || 0, fiiBuy: latest.fiiBuy || 0, fiiSell: latest.fiiSell || 0,
    diiNet: latest.diiNet || 0, diiBuy: latest.diiBuy || 0, diiSell: latest.diiSell || 0,
    date: latest.date || '',
    history: filteredHistory.slice(-7),
    daysFound: filteredHistory.length,
    kvDays: filteredHistory.filter(h => h.date !== today).length,
  });
}
