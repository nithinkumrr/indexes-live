// api/mtf.js
// MTF (Margin Trading Facility) data store.
// GET              -> return latest MTF data from KV
// GET ?action=ltp  -> refresh LTP from Yahoo Finance (cron at 3:40 PM IST)
// POST             -> upload NSE CSV (protected by MTF_SECRET header)

import { kv } from '@vercel/kv';

const KEY_LATEST = 'mtf_v1_latest';
const KEY_PREV   = 'mtf_v1_prev';

// ── Company name lookup (NSE symbol -> display name) ─────────────────────────
const NAMES = {
  HDFCBANK:'HDFC Bank',RELIANCE:'Reliance Industries',ICICIBANK:'ICICI Bank',
  INFY:'Infosys',TCS:'Tata Consultancy Services',SBIN:'State Bank of India',
  AXISBANK:'Axis Bank',KOTAKBANK:'Kotak Mahindra Bank',LT:'Larsen & Toubro',
  WIPRO:'Wipro',HINDUNILVR:'HUL',BAJFINANCE:'Bajaj Finance',
  BAJAJFINSV:'Bajaj Finserv',ASIANPAINT:'Asian Paints',MARUTI:'Maruti Suzuki',
  TITAN:'Titan Company',ULTRACEMCO:'UltraTech Cement',NESTLEIND:'Nestle India',
  POWERGRID:'Power Grid',NTPC:'NTPC',ONGC:'ONGC',COALINDIA:'Coal India',
  TECHM:'Tech Mahindra',SUNPHARMA:'Sun Pharma',DRREDDY:"Dr Reddy's",
  CIPLA:'Cipla',DIVISLAB:"Divi's Labs",APOLLOHOSP:'Apollo Hospitals',
  HCLTECH:'HCL Technologies',INDUSINDBK:'IndusInd Bank',
  ADANIPORTS:'Adani Ports',ADANIENT:'Adani Enterprises',ADANIPOWER:'Adani Power',
  ADANIGREEN:'Adani Green',ADANITRANS:'Adani Transmission',
  HAL:'Hindustan Aeronautics',BEL:'Bharat Electronics',BHEL:'BHEL',
  SAIL:'Steel Authority of India',NMDC:'NMDC',VEDL:'Vedanta',
  HINDALCO:'Hindalco Industries',JSWSTEEL:'JSW Steel',TATASTEEL:'Tata Steel',
  TATAPOWER:'Tata Power',TATAMOTORS:'Tata Motors',TIINDIA:'Tube Investments',
  BAJAJ_AUTO:'Bajaj Auto',EICHERMOT:'Eicher Motors',HEROMOTOCO:'Hero MotoCorp',
  MRF:'MRF',BOSCHLTD:'Bosch',BRITANNIA:'Britannia',ITC:'ITC',
  GODREJCP:'Godrej Consumer',DABUR:'Dabur',MARICO:'Marico',COLPAL:'Colgate',
  GRASIM:'Grasim Industries',AMBUJACEM:'Ambuja Cements',ACC:'ACC',
  SHREECEM:'Shree Cement',DMART:'Avenue Supermarts',TRENT:'Trent',
  NYKAA:'FSN E-Commerce (Nykaa)',ZOMATO:'Zomato',PAYTM:'Paytm',
  POLICYBZR:'PB Fintech (PolicyBazaar)',MAPMYINDIA:'MapmyIndia',
  IRCTC:'IRCTC',RAILTEL:'RailTel',RVNL:'Rail Vikas Nigam',IRFC:'IRFC',
  PFC:'Power Finance Corp',RECLTD:'REC',CANBK:'Canara Bank',
  BANKBARODA:'Bank of Baroda',PNB:'Punjab National Bank',UNIONBANK:'Union Bank',
  FEDERALBNK:'Federal Bank',IDFCFIRSTB:'IDFC First Bank',
  RBLBANK:'RBL Bank',YESBANK:'Yes Bank',BANDHANBNK:'Bandhan Bank',
  JIOFIN:'Jio Financial Services',BAJAJHFL:'Bajaj Housing Finance',
  MAZDOCK:'Mazagon Dock Shipbuilders',GRSE:'Garden Reach Shipbuilders',
  COCHINSHIP:'Cochin Shipyard',MIDHANI:'MIDHANI',MFSL:'Max Financial',
  SBILIFE:'SBI Life',HDFCLIFE:'HDFC Life',ICICIGI:'ICICI Lombard',
  LICI:'LIC of India',STARHEALTH:'Star Health',NIACL:'New India Assurance',
  CHOLAFIN:'Cholamandalam Finance',MUTHOOTFIN:'Muthoot Finance',
  MANAPPURAM:'Manappuram Finance',SBICARD:'SBI Cards',AUBANK:'AU Small Finance',
  EQUITASBNK:'Equitas Small Finance',UGROCAP:'UGRO Capital',
  NAZARA:'Nazara Technologies',ZEEL:'Zee Entertainment',PVRINOX:'PVR Inox',
  INOXGREEN:'INOX Green',INOXWIND:'INOX Wind',SUZLON:'Suzlon Energy',
  RENUKA:'Shree Renuka Sugars',BALRAMCHIN:'Balrampur Chini',DWARIKESH:'Dwarikesh Sugar',
  AARTIIND:'Aarti Industries',DEEPAKNTR:'Deepak Nitrite',GNFC:'GNFC',SRF:'SRF',
  PIDILITIND:'Pidilite Industries',BERGERPAINTS:'Berger Paints',KANSAINER:'Kansai Nerolac',
  WHIRLPOOL:'Whirlpool India',VOLTAS:'Voltas',BLUESTARCO:'Blue Star',HAVELLS:'Havells',
  POLYCAB:'Polycab India',KPITTECH:'KPIT Technologies',LTTS:'L&T Technology',
  PERSISTENT:'Persistent Systems',COFORGE:'Coforge',MPHASIS:'Mphasis',
  LTIM:'L&T Mindtree',ZENSARTECH:'Zensar Technologies',HEXAWARE:'Hexaware',
  TATACOMM:'Tata Communications',IDEA:'Vodafone Idea',BSNL:'BSNL',
  BHARTIARTL:'Bharti Airtel',TATAELXSI:'Tata Elxsi',DIXON:'Dixon Technologies',
  AMBER:'Amber Enterprises',KAYNES:'Kaynes Technology',SYRMA:'Syrma SGS',
  AVALON:'Avalon Technologies',CENTUM:'Centum Electronics',SILVERBEES:'Nippon Silver ETF',
  GOLDBEES:'Nippon Gold ETF',JUNIORBEES:'Nippon Junior Nifty ETF',
  NIFTYBEES:'Nippon Nifty 50 ETF',LIQUIDBEES:'Nippon Liquid ETF',
  MASTEK:'Mastek',RATEGAIN:'RateGain Travel',AFFLE:'Affle India',
  ROUTE:'Route Mobile',TANLA:'Tanla Platforms',CDSL:'CDSL',BSE:'BSE',
  MCX:'MCX',CAMS:'CAMS',KFINTECH:'KFin Technologies',ANGELONE:'Angel One',
  MOTILALOFS:'Motilal Oswal Financial',ICICIPRULI:'ICICI Prudential Life',
};

// ── CSV Parser  (NSE MTF format: Rs. In Lakhs) ───────────────────────────────
// Format:
//   Line 1 : SEBI REPORT AS ON Reporting date 27-MAR-2026,,,
//   Lines 5-8 : summary stats (Rs. In Lakhs)
//   Stock header : Symbol,Name,Qty Fin by all the members(No.of Shares),Amt Fin...
//   Stock rows   : SYMBOL,COMPANY NAME,qty,amtInLakhs
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 5) throw new Error('CSV too short');

  const clean = s => parseFloat(String(s || '0').replace(/[",\s]/g, '')) || 0;

  // ── Extract date from first line ──────────────────────────────────────────
  let csvDate = null;
  const dateMatch = lines[0].match(/(\d{2}-[A-Z]{3}-\d{4})/i);
  if (dateMatch) csvDate = normalizeDate(dateMatch[1]);

  // ── Extract summary stats (Rs. In Lakhs, convert to Cr by /100) ──────────
  let beginBook = null, added = null, liquidated = null, endBook = null;
  for (const line of lines.slice(0, 12)) {
    const p = line.split(',').map(s => s.trim());
    if (/beginning of the day|outstanding.*beginning/i.test(p[1])) beginBook = clean(p[2]);
    if (/fresh exposure|exposure taken/i.test(p[1]))               added     = clean(p[2]);
    if (/liquidated/i.test(p[1]))                                   liquidated= clean(p[2]);
    if (/end of the day|outstanding.*end/i.test(p[1]))             endBook   = clean(p[2]);
  }

  // ── Find stock data header row ────────────────────────────────────────────
  const stockHeaderIdx = lines.findIndex(l => /^symbol/i.test(l.trim()));
  if (stockHeaderIdx < 0) throw new Error('Could not find Symbol column header');

  const headers = lines[stockHeaderIdx].split(',').map(h =>
    h.trim().replace(/^"|"$/g, '').toLowerCase()
  );
  // Col indices
  const iSym = headers.findIndex(h => h === 'symbol');
  const iName= headers.findIndex(h => /name/i.test(h));
  const iQty = headers.findIndex(h => /qty|quantity|shares/i.test(h));
  const iAmt = headers.findIndex(h => /amt|amount|lakhs|value/i.test(h));

  if (iSym < 0 || iAmt < 0) throw new Error('Symbol or Amount column not found');

  // ── Parse stock rows ──────────────────────────────────────────────────────
  const rows = [];
  for (let i = stockHeaderIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 3) continue;
    const symbol = (parts[iSym] || '').toUpperCase().trim();
    // Skip blank, header-repeat, footer rows
    if (!symbol || /^symbol$/i.test(symbol) || /\*|Figures/i.test(symbol)) continue;
    // Skip purely numeric symbols (e.g. "519397") — not standard equity symbols
    // but actually keep them, NSE includes them
    const rawAmt = iAmt >= 0 ? clean(parts[iAmt]) : 0;
    if (rawAmt <= 0) continue;
    const fundedAmt = +(rawAmt / 100).toFixed(2);  // Lakhs -> Crores
    const fundedQty = iQty >= 0 ? clean(parts[iQty]) : 0;
    const company   = (iName >= 0 && parts[iName]) ? toTitleCase(parts[iName]) : (NAMES[symbol] || symbol);
    rows.push({ symbol, company, fundedQty, fundedAmt, exposure: null });
  }

  if (rows.length === 0) throw new Error('No valid stock rows found');

  // Build official summary (from CSV header section, in Crores)
  const officialSummary = {
    endBook:    endBook    != null ? +(endBook    / 100).toFixed(2) : null,
    added:      added      != null ? +(added      / 100).toFixed(2) : null,
    liquidated: liquidated != null ? +(liquidated / 100).toFixed(2) : null,
    beginBook:  beginBook  != null ? +(beginBook  / 100).toFixed(2) : null,
  };

  return { rows, csvDate, officialSummary };
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Parse date from NSE format (27-MAR-2026 or 2026-03-27) ───────────────────
function normalizeDate(raw) {
  if (!raw) return null;
  // Try ISO format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try 27-MAR-2026 format
  const m = raw.match(/(\d{2})-([A-Z]{3})-(\d{4})/i);
  if (m) {
    const months = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };
    const mo = months[m[2].toUpperCase()];
    if (mo) return `${m[3]}-${mo}-${m[1]}`;
  }
  return raw;
}

// ── IST date string ───────────────────────────────────────────────────────────
function getISTDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

const DAILY_LIMIT   = 5;
const LTP_MIN_CR    = 5; // only fetch LTP for stocks with funded >= 5 Cr

// ── LTP fetcher via Kite API ──────────────────────────────────────────────────
async function fetchLTPsKite(symbols, apiKey, token) {
  const result = {};
  // Kite supports up to 500 instruments per call
  for (let i = 0; i < symbols.length; i += 500) {
    const batch = symbols.slice(i, i + 500);
    const qs    = batch.map(s => `i=NSE:${encodeURIComponent(s)}`).join('&');
    try {
      const r = await fetch(`https://api.kite.trade/quote?${qs}`, {
        headers: {
          'X-Kite-Version':  '3',
          'Authorization':   `token ${apiKey}:${token}`,
        },
      });
      if (!r.ok) {
        console.error('Kite quote error', r.status);
        continue;
      }
      const json = await r.json();
      for (const [key, q] of Object.entries(json?.data || {})) {
        const sym = key.replace(/^NSE:/, '');
        const price = q.last_price;
        const prev  = q.ohlc?.close || q.ohlc?.open || price;
        result[sym] = {
          price:     price     != null ? +price.toFixed(2)                                   : null,
          change:    price && prev ? +(price - prev).toFixed(2)                              : null,
          changePct: price && prev && prev > 0 ? +((price - prev) / prev * 100).toFixed(2)  : null,
        };
      }
    } catch (err) {
      console.error('Kite batch error:', err.message);
    }
  }
  return result;
}

// ── Fallback LTP via Yahoo Finance ────────────────────────────────────────────
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
          price:     q.regularMarketPrice            != null ? +q.regularMarketPrice.toFixed(2)            : null,
          change:    q.regularMarketChange           != null ? +q.regularMarketChange.toFixed(2)           : null,
          changePct: q.regularMarketChangePercent    != null ? +q.regularMarketChangePercent.toFixed(2)    : null,
        };
      }
    } catch (_) {}
    if (i + 20 < symbols.length) await new Promise(r => setTimeout(r, 250));
  }
  return result;
}

// ── Compute summary ───────────────────────────────────────────────────────────
function computeSummary(rows, officialSummary) {
  // Total book = end-of-day net book (from CSV header) or sum of rows as fallback
  const totalBook = officialSummary.endBook ?? +rows.reduce((s, r) => s + r.fundedAmt, 0).toFixed(2);

  const stocksWithPct = rows.map(r => ({
    ...r,
    exposure: +(r.fundedAmt / totalBook * 100).toFixed(2),
  }));

  return {
    totalBook,
    positionsAdded:      officialSummary.added      ?? 0,
    positionsLiquidated: officialSummary.liquidated ?? 0,
    netChange:           officialSummary.added != null && officialSummary.liquidated != null
      ? +(officialSummary.added - officialSummary.liquidated).toFixed(2)
      : 0,
    stocks: stocksWithPct.sort((a, b) => b.fundedAmt - a.fundedAmt),
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const urlObj = new URL(req.url, 'https://indexes.live');
  const action = urlObj.searchParams.get('action');

  // ── Debug endpoint (GET ?action=debug) ─────────────────────────────────────
  if (req.method === 'GET' && action === 'debug') {
    const envSecret = (process.env.MTF_SECRET || '').trim();
    return res.json({
      version: 'v4',
      env_set: !!envSecret,
      env_len: envSecret.length,
      env_first3: envSecret.slice(0, 3) || 'not set',
    });
  }


  if (req.method === 'GET' && action === 'ltp') {
    const isCron  = req.headers['x-vercel-cron'] === '1';
    const isAdmin = (req.headers['x-mtf-secret'] || urlObj.searchParams.get('secret') || '').trim()
                    === (process.env.MTF_SECRET || '').trim() && !!process.env.MTF_SECRET;

    // Rate limit: 5 fetches per day (IST), bypassed by cron or admin secret
    const dateKey   = `mtf_ltp_daily_${getISTDate()}`;
    let fetchesUsed = 0;
    try { fetchesUsed = (await kv.get(dateKey)) || 0; } catch (_) {}

    if (!isCron && !isAdmin && fetchesUsed >= DAILY_LIMIT) {
      return res.json({ ok: false, reason: 'daily_limit', fetchesUsed, fetchesRemaining: 0, limit: DAILY_LIMIT });
    }

    try {
      const stored = await kv.get(KEY_LATEST);
      if (!stored?.stocks?.length) return res.json({ ok: false, reason: 'no data' });

      const ltpStocks = stored.stocks.filter(s => s.fundedAmt >= LTP_MIN_CR);
      const symbols   = ltpStocks.map(s => s.symbol);

      // Try Kite first, fallback to Yahoo
      const apiKey = process.env.KITE_API_KEY;
      const kToken = await kv.get('kite_token').catch(() => null);
      let allLTP = {};
      let source = 'none';

      if (apiKey && kToken) {
        allLTP = await fetchLTPsKite(symbols, apiKey, kToken);
        source = 'kite';
      }
      const kiteHits = Object.values(allLTP).filter(v => v?.price != null).length;
      if (kiteHits === 0) {
        allLTP = await fetchLTPsYahoo(symbols);
        source = 'yahoo';
      }

      const stocks = stored.stocks.map(s => ({
        ...s,
        ltp:       allLTP[s.symbol]?.price     ?? s.ltp     ?? null,
        ltpChange: allLTP[s.symbol]?.change    ?? s.ltpChange ?? null,
        ltpPct:    allLTP[s.symbol]?.changePct ?? s.ltpPct   ?? null,
      }));

      const newCount = (isCron || isAdmin) ? fetchesUsed : fetchesUsed + 1;
      if (!isCron) {
        try { await kv.set(dateKey, newCount, { ex: 60 * 60 * 30 }); } catch (_) {}
      }

      const updated = { ...stored, stocks, ltpUpdatedAt: new Date().toISOString(), ltpSource: source };
      await kv.set(KEY_LATEST, updated, { ex: 60 * 60 * 24 * 7 });

      const ltpHits = stocks.filter(s => s.ltp != null).length;
      return res.json({
        ok: true, count: ltpHits, ltpUpdatedAt: updated.ltpUpdatedAt,
        source, fetchesUsed: newCount,
        fetchesRemaining: Math.max(0, DAILY_LIMIT - newCount),
        limit: DAILY_LIMIT,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET data ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const [data, fetchesUsed] = await Promise.all([
        kv.get(KEY_LATEST),
        kv.get(`mtf_ltp_daily_${getISTDate()}`).catch(() => 0),
      ]);
      if (!data) return res.json({ empty: true });
      return res.json({ ...data, fetchesUsed: fetchesUsed || 0, fetchesRemaining: Math.max(0, DAILY_LIMIT - (fetchesUsed || 0)), limit: DAILY_LIMIT });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: upload CSV ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const secret    = (req.headers['x-mtf-secret'] || urlObj.searchParams.get('secret') || '').trim();
    const envSecret = (process.env.MTF_SECRET || '').trim();
    if (!envSecret || secret !== envSecret) {
      // Debug: return what we see (remove after fixing)
      return res.status(403).json({ error: 'Invalid secret', debug_env_set: !!envSecret, debug_env_len: envSecret.length, debug_sent_len: secret.length });
    }

    let body = req.body;
    if (typeof body !== 'string') {
      try {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        body = Buffer.concat(chunks).toString('utf8');
      } catch (_) {}
    }

    // If body is JSON with a `csv` field, extract it
    if (typeof body === 'string' && body.trim().startsWith('{')) {
      try { body = JSON.parse(body)?.csv || body; } catch (_) {}
    }

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'No CSV data received' });
    }

    try {
      const { rows, csvDate, officialSummary } = parseCSV(body);
      const prevData = await kv.get(KEY_LATEST).catch(() => null);

      // Rotate latest -> prev
      if (prevData) {
        await kv.set(KEY_PREV, prevData, { ex: 60 * 60 * 24 * 30 });
      }

      const { totalBook, positionsAdded, positionsLiquidated, netChange, stocks } = computeSummary(rows, officialSummary);
      const date = normalizeDate(csvDate) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const result = {
        date,
        uploadedAt: new Date().toISOString(),
        summary: { totalBook, positionsAdded, positionsLiquidated, netChange },
        stocks,
        ltpUpdatedAt: null,
      };
      await kv.set(KEY_LATEST, result, { ex: 60 * 60 * 24 * 7 });

        // Auto-fetch LTP if uploaded after 3:40 PM IST
      const ist2 = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const mins = ist2.getHours() * 60 + ist2.getMinutes();
      if (mins >= 940) {
        const ltpStocks = stocks.filter(s => s.fundedAmt >= LTP_MIN_CR);
        const symbols   = ltpStocks.map(s => s.symbol);
        const apiKey    = process.env.KITE_API_KEY;
        const kToken    = await kv.get('kite_token').catch(() => null);
        let allLTP = {};
        if (apiKey && kToken) allLTP = await fetchLTPsKite(symbols, apiKey, kToken);
        const kHits = Object.values(allLTP).filter(v => v?.price != null).length;
        if (kHits === 0) allLTP = await fetchLTPsYahoo(symbols);
        const allLTP = {};
        for (let i = 0; i < symbols.length; i += 50) {
          const batch = symbols.slice(i, i + 50);
          const ltps = await fetchLTPs(batch);
          Object.assign(allLTP, ltps);
        }
        result.stocks = stocks.map(s => ({
          ...s,
          ltp:       allLTP[s.symbol]?.price     ?? null,
          ltpChange: allLTP[s.symbol]?.change    ?? null,
          ltpPct:    allLTP[s.symbol]?.changePct ?? null,
          company:   allLTP[s.symbol]?.longName  ?? s.company,
        }));
        result.ltpUpdatedAt = new Date().toISOString();
        await kv.set(KEY_LATEST, result, { ex: 60 * 60 * 24 * 7 });
      }

      return res.json({
        ok: true,
        date,
        rowCount: stocks.length,
        totalBook,
        positionsAdded,
        positionsLiquidated,
        netChange,
        ltpFetched: result.ltpUpdatedAt !== null,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
