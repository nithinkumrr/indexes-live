// api/fiidii-store.js
// Called by cron AND manually via GET ?days=7
// Fetches FII/DII data for last N trading days and stores in KV

import { kv } from '@vercel/kv';

const HOLIDAYS = new Set(['2026-01-26','2026-02-17','2026-03-03','2026-03-26','2026-03-31',
  '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14',
  '2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25']);

function getTradingDays(n) {
  const days = [];
  const cur = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  while (days.length < n) {
    const iso = cur.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso)) days.push(iso);
    cur.setDate(cur.getDate() - 1);
  }
  return days;
}

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

async function fetchDayData(iso, H) {
  const [y, m, d] = iso.split('-');
  const nseDate = `${d}-${m}-${y}`;

  // Try with date param
  const r = await fetch(`https://www.nseindia.com/api/fiidiiTradeReact?date=${nseDate}`, { headers: H });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const rows = Array.isArray(data) ? data : (data.data || []);
  if (!rows.length) throw new Error('empty');

  const fiiRow = rows.find(isFII);
  const diiRow = rows.find(isDII);
  if (!fiiRow && !diiRow) throw new Error('no FII/DII rows');

  const f = parseRow(fiiRow);
  const dv = parseRow(diiRow);
  return { date: iso, fiiNet: f.net, fiiBuy: f.buy, fiiSell: f.sell, diiNet: dv.net, diiBuy: dv.buy, diiSell: dv.sell };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const days = parseInt(req.query?.days || '1');
  const tradingDays = getTradingDays(Math.min(days, 10));

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  // Get NSE cookies
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(e) {
    return res.status(500).json({ error: 'Cookie fetch failed', detail: e.message });
  }

  const H = {
    'User-Agent': UA,
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/',
    'Cookie': cookies,
    'X-Requested-With': 'XMLHttpRequest',
  };

  const results = { stored: [], failed: [], skipped: [] };

  for (const iso of tradingDays) {
    // Skip if already in KV
    try {
      const existing = await kv.get(`fiidii:${iso}`);
      if (existing) { results.skipped.push(iso); continue; }
    } catch (_) {}

    try {
      // Small delay between requests to avoid rate limiting
      if (results.stored.length > 0) await new Promise(r => setTimeout(r, 800));
      const record = await fetchDayData(iso, H);
      await kv.set(`fiidii:${iso}`, JSON.stringify(record), { ex: 90 * 24 * 60 * 60 });
      results.stored.push(iso);
    } catch(e) {
      results.failed.push({ date: iso, error: e.message });
    }
  }

  return res.status(200).json({
    success: true,
    ...results,
    message: `Stored: ${results.stored.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`
  });
}
