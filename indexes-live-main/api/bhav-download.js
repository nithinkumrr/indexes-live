// api/bhav-download.js
// Downloads NSE F&O bhav copy for a given date range and stores in KV
// GET /api/bhav-download?from=2024-01-01&to=2024-01-31&index=NIFTY
// POST /api/bhav-download { dates: ['2024-01-01', ...], indices: ['NIFTY','BANKNIFTY'] }
// GET /api/bhav-download?action=status&date=2024-01-01 → check if date is stored

import { kv } from '@vercel/kv';
import { createGunzip } from 'zlib';

const INDICES = ['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY', 'MIDCPNIFTY'];
const SYMBOL_MAP = {
  'NIFTY':      ['NIFTY'],
  'BANKNIFTY':  ['BANKNIFTY'],
  'SENSEX':     ['SENSEX'],
  'FINNIFTY':   ['FINNIFTY'],
  'MIDCPNIFTY': ['MIDCPNIFTY', 'MIDCPNIFTY'],
};

function formatDate(iso) {
  // YYYY-MM-DD → YYYYMMDD
  return iso.replace(/-/g, '');
}

function isWeekday(dateStr) {
  const d = new Date(dateStr);
  return d.getDay() !== 0 && d.getDay() !== 6;
}

// Download and parse NSE bhav copy CSV for a date
async function downloadBhav(dateStr) {
  const d = formatDate(dateStr);

  // Try multiple URL formats (NSE changes these occasionally)
  const urls = [
    `https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_${d}_F_0000.csv.zip`,
    `https://nsearchives.nseindia.com/archives/fo/bhav/fo${d.slice(6,8)}${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][parseInt(d.slice(4,6))-1]}${d.slice(0,4)}bhav.csv.zip`,
  ];

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/zip,*/*',
          'Referer': 'https://www.nseindia.com/',
        },
      });
      if (!r.ok) continue;

      const buf = Buffer.from(await r.arrayBuffer());
      const csv = await unzipBuffer(buf);
      return parseCSV(csv, dateStr);
    } catch (_) {
      continue;
    }
  }
  return null;
}

// Unzip buffer to string
function unzipBuffer(buf) {
  return new Promise((resolve, reject) => {
    const gunzip = createGunzip();
    const chunks = [];
    gunzip.on('data', c => chunks.push(c));
    gunzip.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    gunzip.on('error', reject);
    gunzip.end(buf);
  });
}

// Parse CSV and extract options data
// Returns: { NIFTY: { '22000CE': 45.5, '22000PE': 67.2, ... }, BANKNIFTY: {...} }
function parseCSV(csv, dateStr) {
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  // Find column indices
  const cols = {
    symbol:   header.findIndex(h => /symbol/i.test(h)),
    expiry:   header.findIndex(h => /expiry/i.test(h)),
    strike:   header.findIndex(h => /strike/i.test(h)),
    optType:  header.findIndex(h => /option.*type|opttype/i.test(h)),
    close:    header.findIndex(h => /^close$/i.test(h)),
    settle:   header.findIndex(h => /settle/i.test(h)),
    open:     header.findIndex(h => /^open$/i.test(h)),
  };

  const result = {};

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (row.length < 5) continue;

    const sym     = row[cols.symbol]?.toUpperCase();
    const optType = row[cols.optType]?.toUpperCase();
    if (!sym || (optType !== 'CE' && optType !== 'PE')) continue;

    // Check if this is one of our tracked indices
    const idx = INDICES.find(i => sym === i || sym.startsWith(i));
    if (!idx) continue;

    const strike   = parseFloat(row[cols.strike]);
    const close    = parseFloat(row[cols.close] || row[cols.settle]);
    const open     = parseFloat(row[cols.open]);
    const expiry   = row[cols.expiry]; // DD-Mon-YYYY format

    if (!strike || !close || isNaN(close)) continue;

    if (!result[idx]) result[idx] = {};
    const key = `${strike}${optType}`;
    result[idx][key] = {
      close,
      open:   isNaN(open) ? close : open,
      expiry: expiry || '',
    };
  }

  return result;
}

// Store one day's data in KV
async function storeDay(dateStr, data) {
  const stored = [];
  for (const [index, strikes] of Object.entries(data)) {
    if (!strikes || Object.keys(strikes).length === 0) continue;
    const key = `bhav:${index}:${dateStr}`;
    try {
      await kv.set(key, JSON.stringify(strikes), { ex: 365 * 24 * 60 * 60 }); // 1 year TTL
      stored.push(index);
    } catch (_) {}
  }
  return stored;
}

// Get trading days in a range
function getTradingDays(fromStr, toStr) {
  const days = [];
  const cur = new Date(fromStr);
  const end = new Date(toStr);
  while (cur <= end) {
    const iso = cur.toISOString().slice(0, 10);
    if (isWeekday(iso)) days.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action;

  // ── Status check ─────────────────────────────────────────────────────────
  if (action === 'status') {
    const date = req.query.date;
    if (!date) return res.json({ error: 'date required' });
    const results = {};
    for (const idx of INDICES) {
      try {
        const val = await kv.get(`bhav:${idx}:${date}`);
        results[idx] = val ? Object.keys(typeof val === 'string' ? JSON.parse(val) : val).length : 0;
      } catch (_) { results[idx] = 0; }
    }
    return res.json({ date, strikes: results });
  }

  // ── Coverage check ────────────────────────────────────────────────────────
  if (action === 'coverage') {
    const fromYear = parseInt(req.query.from || '2022');
    const toYear   = parseInt(req.query.to   || '2024');
    const days = getTradingDays(`${fromYear}-01-01`, `${toYear}-12-31`);
    const sample = days.filter((_, i) => i % 20 === 0).slice(0, 20); // sample 20 days
    const coverage = {};
    for (const d of sample) {
      try {
        const val = await kv.get(`bhav:NIFTY:${d}`);
        coverage[d] = val ? 'stored' : 'missing';
      } catch (_) { coverage[d] = 'error'; }
    }
    const stored = Object.values(coverage).filter(v => v === 'stored').length;
    return res.json({ coverage, pct: Math.round(stored/sample.length*100), sampled: sample.length });
  }

  // ── Download single date (GET) ────────────────────────────────────────────
  if (req.method === 'GET' && req.query.date) {
    const date = req.query.date;
    if (!isWeekday(date)) return res.json({ skipped: true, reason: 'weekend', date });

    // Check if already stored
    try {
      const existing = await kv.get(`bhav:NIFTY:${date}`);
      if (existing) return res.json({ cached: true, date });
    } catch (_) {}

    const data = await downloadBhav(date);
    if (!data) return res.json({ error: 'Download failed', date });

    const stored = await storeDay(date, data);
    return res.json({ success: true, date, stored, strikes: Object.fromEntries(
      stored.map(idx => [idx, Object.keys(data[idx] || {}).length])
    )});
  }

  // ── Download date range (POST) ────────────────────────────────────────────
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { dates, skipExisting = true } = body;

    if (!dates?.length) return res.status(400).json({ error: 'dates array required' });

    const results = { stored: [], skipped: [], failed: [] };
    const start = Date.now();

    for (const date of dates.slice(0, 20)) { // max 20 dates per call (timeout safety)
      if (!isWeekday(date)) { results.skipped.push({ date, reason: 'weekend' }); continue; }

      // Check existing
      if (skipExisting) {
        try {
          const ex = await kv.get(`bhav:NIFTY:${date}`);
          if (ex) { results.skipped.push({ date, reason: 'cached' }); continue; }
        } catch (_) {}
      }

      // Timeout safety: stop if close to 9s
      if (Date.now() - start > 8500) {
        results.failed.push({ date, reason: 'timeout' });
        break;
      }

      const data = await downloadBhav(date);
      if (!data) { results.failed.push({ date, reason: 'download_failed' }); continue; }

      const stored = await storeDay(date, data);
      if (stored.length > 0) {
        results.stored.push({ date, indices: stored });
      } else {
        results.failed.push({ date, reason: 'no_data' });
      }
    }

    return res.json({
      ...results,
      summary: `Stored: ${results.stored.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
