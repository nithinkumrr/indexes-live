// api/fiidii-backfill.js
// Accepts historical FII/DII data posted from the client browser
// (Browser can hit NSE directly; server cannot due to Cloudflare blocking)
// POST body: { records: [{ date, fiiNet, fiiBuy, fiiSell, diiNet, diiBuy, diiSell }] }

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return current KV state (for debugging)
  if (req.method === 'GET') {
    try {
      const keys = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        keys.push(`fiidii:${iso}`);
      }
      const results = {};
      for (const key of keys) {
        try {
          const val = await kv.get(key);
          if (val) results[key] = typeof val === 'string' ? JSON.parse(val) : val;
        } catch (_) {}
      }
      return res.status(200).json({ stored: Object.keys(results).length, data: results });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — store records
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const records = body?.records;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Expected { records: [...] }' });
      }

      const stored = [];
      for (const rec of records) {
        if (!rec.date) continue;
        await kv.set(`fiidii:${rec.date}`, JSON.stringify(rec), { ex: 90 * 24 * 60 * 60 });
        stored.push(rec.date);
      }

      return res.status(200).json({ success: true, stored });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
