// api/fiidii-fix.js — One-time fix: delete stale KV entry and re-fetch correct March 30 data
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const pn = v => { const n = parseFloat(String(v||'').replace(/,/g,'')); return isNaN(n) ? 0 : n; };

  const results = {};

  // Step 1: Delete the stale entry
  try {
    await kv.del('fiidii:2026-03-30');
    results.deleted = 'fiidii:2026-03-30';
  } catch(e) { results.deleteError = e.message; }

  // Step 2: Get NSE cookies
  let cookies = '';
  try {
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(e) { results.cookieError = e.message; }

  const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

  // Step 3: Try multiple endpoints to get March 30 data
  const endpoints = [
    'https://www.nseindia.com/api/fiidiiTradeReact?date=30-03-2026',
    'https://www.nseindia.com/api/fiidiiTradeReact',
  ];

  let fetched = null;
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers: H });
      if (!r.ok) { results[url] = `HTTP ${r.status}`; continue; }
      const data = await r.json();
      const rows = Array.isArray(data) ? data : (data.data || []);
      results[url] = `rows: ${rows.length}, sample: ${JSON.stringify(rows[0]).slice(0,200)}`;
      
      const fiiRow = rows.find(r => /FII|FPI|FOREIGN/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||'')));
      const diiRow = rows.find(r => /DII|DOMESTIC/i.test(String(r?.category||r?.clientType||r?.participant||r?.name||'')));
      
      if (fiiRow || diiRow) {
        const fiiNet = pn(fiiRow?.netValue ?? fiiRow?.net ?? 0) || (pn(fiiRow?.buyValue??0) - pn(fiiRow?.sellValue??0));
        const diiNet = pn(diiRow?.netValue ?? diiRow?.net ?? 0) || (pn(diiRow?.buyValue??0) - pn(diiRow?.sellValue??0));
        
        fetched = {
          date: '2026-03-30',
          fiiNet, fiiBuy: pn(fiiRow?.buyValue ?? fiiRow?.grossPurchase ?? 0),
          fiiSell: pn(fiiRow?.sellValue ?? fiiRow?.grossSales ?? 0),
          diiNet, diiBuy: pn(diiRow?.buyValue ?? diiRow?.grossPurchase ?? 0),
          diiSell: pn(diiRow?.sellValue ?? diiRow?.grossSales ?? 0),
        };
        results.fiiRow = fiiRow;
        results.diiRow = diiRow;
        results.parsed = fetched;
        break;
      }
    } catch(e) { results[url] = e.message; }
  }

  // Step 4: Store if we got real data
  if (fetched && (Math.abs(fetched.fiiNet) > 100 || fetched.fiiBuy > 100)) {
    try {
      await kv.set('fiidii:2026-03-30', JSON.stringify(fetched), { ex: 90 * 24 * 3600 });
      results.stored = fetched;
    } catch(e) { results.storeError = e.message; }
  } else {
    results.notice = 'Data not stored - values too small or zero, manual entry needed';
  }

  return res.json(results);
}
