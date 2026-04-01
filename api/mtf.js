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

// ── LTP fetcher via Yahoo Finance batch quote ─────────────────────────────────
async function fetchLTPs(symbols) {
  const yf = symbols.map(s => encodeURIComponent(s + '.NS')).join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yf}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange`;
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (!r.ok) return {};
    const json = await r.json();
    const result = {};
    for (const q of (json?.quoteResponse?.result || [])) {
      const sym = (q.symbol || '').replace('.NS', '');
      result[sym] = {
        price:     +(q.regularMarketPrice || 0).toFixed(2),
        change:    +(q.regularMarketChange || 0).toFixed(2),
        changePct: +(q.regularMarketChangePercent || 0).toFixed(2),
        longName:  q.longName || q.shortName || null,
      };
    }
    return result;
  } catch (_) {
    return {};
  }
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

  const action = req.query?.action;

  // ── LTP cron refresh (GET ?action=ltp, secured by Vercel cron header) ──────
  if (req.method === 'GET' && action === 'ltp') {
    const isCron = req.headers['x-vercel-cron'] === '1' ||
      req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!isCron && req.headers['x-mtf-secret'] !== process.env.MTF_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
      const stored = await kv.get(KEY_LATEST);
      if (!stored?.stocks?.length) return res.json({ ok: false, reason: 'no data' });
      const symbols = stored.stocks.map(s => s.symbol);
      // Batch in chunks of 50 (Yahoo Finance limit)
      const allLTP = {};
      for (let i = 0; i < symbols.length; i += 50) {
        const batch = symbols.slice(i, i + 50);
        const result = await fetchLTPs(batch);
        Object.assign(allLTP, result);
      }
      const stocks = stored.stocks.map(s => ({
        ...s,
        ltp:       allLTP[s.symbol]?.price     ?? s.ltp     ?? null,
        ltpChange: allLTP[s.symbol]?.change    ?? s.ltpChange ?? null,
        ltpPct:    allLTP[s.symbol]?.changePct ?? s.ltpPct   ?? null,
        company:   allLTP[s.symbol]?.longName  ?? s.company,
      }));
      const updated = { ...stored, stocks, ltpUpdatedAt: new Date().toISOString() };
      await kv.set(KEY_LATEST, updated, { ex: 60 * 60 * 24 * 7 });
      return res.json({ ok: true, count: symbols.length, ltpUpdatedAt: updated.ltpUpdatedAt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET data ────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const data = await kv.get(KEY_LATEST);
      if (!data) return res.json({ empty: true });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST: upload CSV ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const secret = req.headers['x-mtf-secret'] || req.query?.secret;
    if (!process.env.MTF_SECRET || secret !== process.env.MTF_SECRET) {
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

      // Also fetch LTP immediately if market is closed (after 3:40 PM IST)
      const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const mins = ist.getHours() * 60 + ist.getMinutes();
      if (mins >= 940) {
        const symbols = stocks.map(s => s.symbol);
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
