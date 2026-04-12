// api/delivery.js
// Top Delivery data from NSE MTO DAT file.
// GET              -> return latest data from KV
// GET ?action=ltp  -> refresh LTP via Kite (rate-limited 5/day)
// POST             -> upload NSE MTO DAT file (protected by MTF_SECRET)

import { kv } from '@vercel/kv';

const KEY_LATEST  = 'delivery_v1_latest';
const DAILY_LIMIT = 5;

function getISTDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

// ── Parse NSE MTO DAT file ────────────────────────────────────────────────────
// Format: 20,{sr},{symbol},{series},{traded},{delivered},{pct}
function parseDAT(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Extract trade date from header
  let tradeDate = null;
  for (const line of lines.slice(0, 5)) {
    const m = line.match(/(\d{2}-[A-Z]{3}-\d{4})/i);
    if (m) {
      tradeDate = normalizeDate(m[1]);
      break;
    }
  }

  const stocks = [];
  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    // Record type 20 = data row; we want EQ series only
    if (parts[0] !== '20' || parts.length < 7) continue;
    const series    = parts[3];
    if (series !== 'EQ') continue;
    const symbol    = parts[2].toUpperCase().trim();
    const traded    = parseInt(parts[4]) || 0;
    const delivered = parseInt(parts[5]) || 0;
    const pct       = parseFloat(parts[6]) || 0;
    if (!symbol || traded <= 0) continue;
    stocks.push({ symbol, traded, delivered, pct });
  }

  if (stocks.length === 0) throw new Error('No EQ series rows found in DAT file');
  return { stocks, tradeDate };
}

function normalizeDate(raw) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/(\d{2})-([A-Z]{3})-(\d{4})/i);
  if (m) {
    const months = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };
    const mo = months[m[2].toUpperCase()];
    if (mo) return `${m[3]}-${mo}-${m[1]}`;
  }
  return raw;
}

// ── Kite LTP fetch ────────────────────────────────────────────────────────────
async function fetchLTPsKite(symbols, apiKey, token) {
  const result = {};
  for (let i = 0; i < symbols.length; i += 500) {
    const batch = symbols.slice(i, i + 500);
    const qs    = batch.map(s => `i=NSE:${encodeURIComponent(s)}`).join('&');
    try {
      const r = await fetch(`https://api.kite.trade/quote?${qs}`, {
        headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` },
      });
      if (!r.ok) { console.error('Kite', r.status); continue; }
      const json = await r.json();
      for (const [key, q] of Object.entries(json?.data || {})) {
        const sym   = key.replace(/^NSE:/, '');
        const price = q.last_price;
        const prev  = q.ohlc?.close || q.ohlc?.open || price;
        result[sym] = {
          ltp:       price != null ? +price.toFixed(2) : null,
          change:    price && prev ? +(price - prev).toFixed(2) : null,
          changePct: price && prev && prev > 0 ? +((price - prev) / prev * 100).toFixed(2) : null,
        };
      }
    } catch (err) { console.error('Kite batch:', err.message); }
  }
  return result;
}

// Yahoo fallback
async function fetchLTPsYahoo(symbols) {
  const result = {};
  for (let i = 0; i < symbols.length; i += 20) {
    const batch = symbols.slice(i, i + 20);
    const syms  = batch.map(s => encodeURIComponent(s + '.NS')).join('%2C');
    try {
      const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/quote?symbols=${syms}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });
      if (!r.ok) continue;
      const json = await r.json();
      for (const q of (json?.quoteResponse?.result || [])) {
        const sym = (q.symbol || '').replace(/\.NS$/i, '');
        result[sym] = {
          ltp:       q.regularMarketPrice         != null ? +q.regularMarketPrice.toFixed(2)            : null,
          change:    q.regularMarketChange        != null ? +q.regularMarketChange.toFixed(2)           : null,
          changePct: q.regularMarketChangePercent != null ? +q.regularMarketChangePercent.toFixed(2)    : null,
        };
      }
    } catch (_) {}
    if (i + 20 < symbols.length) await new Promise(r => setTimeout(r, 250));
  }
  return result;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const urlObj = new URL(req.url, 'https://indexes.live');
  const action = urlObj.searchParams.get('action');

  // ── LTP refresh ──────────────────────────────────────────────────────────────
  if (req.method === 'GET' && action === 'ltp') {
    const isCron  = req.headers['x-vercel-cron'] === '1';
    const secret  = (req.headers['x-mtf-secret'] || urlObj.searchParams.get('secret') || '').trim();
    const isAdmin = secret === (process.env.MTF_SECRET || '').trim() && !!process.env.MTF_SECRET;

    const dateKey   = `delivery_ltp_daily_${getISTDate()}`;
    let fetchesUsed = 0;
    try { fetchesUsed = (await kv.get(dateKey)) || 0; } catch (_) {}

    if (!isCron && !isAdmin && fetchesUsed >= DAILY_LIMIT) {
      return res.json({ ok: false, reason: 'daily_limit', fetchesUsed, fetchesRemaining: 0, limit: DAILY_LIMIT });
    }

    try {
      const stored = await kv.get(KEY_LATEST);
      if (!stored?.stocks?.length) return res.json({ ok: false, reason: 'no data' });

      const symbols = stored.stocks.map(s => s.symbol);
      const apiKey  = process.env.KITE_API_KEY;
      const kToken  = await kv.get('kite_token').catch(() => null);
      let allLTP = {};
      let source = 'none';

      if (apiKey && kToken) { allLTP = await fetchLTPsKite(symbols, apiKey, kToken); source = 'kite'; }
      const hits = Object.values(allLTP).filter(v => v?.ltp != null).length;
      if (hits === 0) { allLTP = await fetchLTPsYahoo(symbols); source = 'yahoo'; }

      const stocks = stored.stocks.map(s => ({
        ...s,
        ltp:       allLTP[s.symbol]?.ltp       ?? s.ltp       ?? null,
        change:    allLTP[s.symbol]?.change    ?? s.change    ?? null,
        changePct: allLTP[s.symbol]?.changePct ?? s.changePct ?? null,
      }));

      const newCount = (isCron || isAdmin) ? fetchesUsed : fetchesUsed + 1;
      if (!isCron) { try { await kv.set(dateKey, newCount, { ex: 60 * 60 * 30 }); } catch (_) {} }

      const updated = { ...stored, stocks, ltpUpdatedAt: new Date().toISOString(), ltpSource: source };
      await kv.set(KEY_LATEST, updated, { ex: 60 * 60 * 24 * 7 });

      return res.json({
        ok: true, count: stocks.filter(s => s.ltp != null).length,
        ltpUpdatedAt: updated.ltpUpdatedAt, source,
        fetchesUsed: newCount, fetchesRemaining: Math.max(0, DAILY_LIMIT - newCount), limit: DAILY_LIMIT,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET data ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const [data, fetchesUsed] = await Promise.all([
        kv.get(KEY_LATEST),
        kv.get(`delivery_ltp_daily_${getISTDate()}`).catch(() => 0),
      ]);
      if (!data) return res.json({ empty: true });
      return res.json({ ...data, fetchesUsed: fetchesUsed || 0, fetchesRemaining: Math.max(0, DAILY_LIMIT - (fetchesUsed || 0)), limit: DAILY_LIMIT });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: upload DAT file ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const secret    = (req.headers['x-mtf-secret'] || urlObj.searchParams.get('secret') || '').trim();
    const envSecret = (process.env.MTF_SECRET || '').trim();
    if (!envSecret || secret !== envSecret) {
      return res.status(403).json({ error: 'Invalid secret' });
    }

    let body = req.body;
    if (typeof body !== 'string') {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = Buffer.concat(chunks).toString('utf8');
      } catch (_) {}
    }
    if (typeof body === 'string' && body.trim().startsWith('{')) {
      try { body = JSON.parse(body)?.csv || body; } catch (_) {}
    }
    if (!body || !body.trim()) return res.status(400).json({ error: 'No data received' });

    try {
      const { stocks, tradeDate } = parseDAT(body);
      const date = tradeDate || getISTDate();

      // Sort by delivered qty descending for default view
      stocks.sort((a, b) => b.delivered - a.delivered);

      const result = {
        date,
        uploadedAt:   new Date().toISOString(),
        totalStocks:  stocks.length,
        stocks,
        ltpUpdatedAt: null,
        ltpSource:    null,
      };
      await kv.set(KEY_LATEST, result, { ex: 60 * 60 * 24 * 7 });

      // Auto-fetch LTP if after 3:40 PM IST
      const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const mins = ist.getHours() * 60 + ist.getMinutes();
      if (mins >= 940) {
        const symbols = stocks.map(s => s.symbol);
        const apiKey  = process.env.KITE_API_KEY;
        const kToken  = await kv.get('kite_token').catch(() => null);
        let allLTP = {};
        if (apiKey && kToken) allLTP = await fetchLTPsKite(symbols, apiKey, kToken);
        const kHits = Object.values(allLTP).filter(v => v?.ltp != null).length;
        if (kHits === 0) allLTP = await fetchLTPsYahoo(symbols);
        result.stocks = stocks.map(s => ({
          ...s,
          ltp:       allLTP[s.symbol]?.ltp       ?? null,
          change:    allLTP[s.symbol]?.change    ?? null,
          changePct: allLTP[s.symbol]?.changePct ?? null,
        }));
        result.ltpUpdatedAt = new Date().toISOString();
        await kv.set(KEY_LATEST, result, { ex: 60 * 60 * 24 * 7 });
      }

      return res.json({
        ok: true, date, stockCount: stocks.length,
        ltpFetched: result.ltpUpdatedAt !== null,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
