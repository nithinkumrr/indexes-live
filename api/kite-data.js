// api/kite-data.js
// Single endpoint replacing kite-hero.js, kite-indices.js, kite-nifty50.js
// ?type=hero     — Nifty50/Sensex/BankNifty (1s hero cards, no-cache)
// ?type=indices  — 14 sector indices for India ticker (20s cache)
// ?type=nifty50  — All 50 Nifty stocks for heatmap (20s cache)

async function getToken() {
  const uUrl = process.env.UPSTASH_REDIS_REST_URL;
  const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (uUrl && uTok) {
    try {
      const r = await fetch(`${uUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${uTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  const kvUrl = process.env.KV_REST_API_URL;
  const kvTok = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvTok) {
    try {
      const r = await fetch(`${kvUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${kvTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  return null;
}

// ── Data definitions ─────────────────────────────────────────────────

const HEROES = [
  { id: 'nifty50',   instrument: 'NSE:NIFTY 50'  },
  { id: 'sensex',    instrument: 'BSE:SENSEX'     },
  { id: 'banknifty', instrument: 'NSE:NIFTY BANK' },
];

const KITE_INDICES = [
  { name: 'Nifty 50',     instrument: 'NSE:NIFTY 50'          },
  { name: 'Sensex',       instrument: 'BSE:SENSEX'             },
  { name: 'Bank Nifty',   instrument: 'NSE:NIFTY BANK'         },
  { name: 'Nifty IT',     instrument: 'NSE:NIFTY IT'           },
  { name: 'Nifty Auto',   instrument: 'NSE:NIFTY AUTO'         },
  { name: 'Nifty FMCG',   instrument: 'NSE:NIFTY FMCG'         },
  { name: 'Nifty Pharma', instrument: 'NSE:NIFTY PHARMA'       },
  { name: 'Nifty Metal',  instrument: 'NSE:NIFTY METAL'        },
  { name: 'Nifty Realty', instrument: 'NSE:NIFTY REALTY'       },
  { name: 'PSU Bank',     instrument: 'NSE:NIFTY PSU BANK'     },
  { name: 'Fin Services', instrument: 'NSE:NIFTY FIN SERVICE'  },
  { name: 'Midcap 100',   instrument: 'NSE:NIFTY MIDCAP 100'  },
  { name: 'Smallcap 100', instrument: 'NSE:NIFTY SMLCAP 100'  },
  { name: 'India VIX',    instrument: 'NSE:INDIA VIX'          },
];

const YAHOO_INDICES = [
  { name: 'Nifty 50',     symbol: '^NSEI'      },
  { name: 'Sensex',       symbol: '^BSESN'     },
  { name: 'Bank Nifty',   symbol: '^NSEBANK'   },
  { name: 'Nifty IT',     symbol: '^CNXIT'     },
  { name: 'Nifty Auto',   symbol: '^CNXAUTO'   },
  { name: 'Nifty FMCG',   symbol: '^CNXFMCG'  },
  { name: 'Nifty Pharma', symbol: '^CNXPHARMA' },
  { name: 'Nifty Metal',  symbol: '^CNXMETAL'  },
  { name: 'Midcap 100',   symbol: '^NSMIDCP'   },
  { name: 'India VIX',    symbol: '^INDIAVIX'  },
];

const NIFTY50 = [
  { id: 'HDFCBANK',   name: 'HDFC Bank',       sector: 'Financials',    weight: 135, symbol: 'HDFCBANK.NS'   },
  { id: 'ICICIBANK',  name: 'ICICI Bank',       sector: 'Financials',    weight: 90,  symbol: 'ICICIBANK.NS'  },
  { id: 'KOTAKBANK',  name: 'Kotak Bank',       sector: 'Financials',    weight: 55,  symbol: 'KOTAKBANK.NS'  },
  { id: 'SBIN',       name: 'SBI',              sector: 'Financials',    weight: 70,  symbol: 'SBIN.NS'       },
  { id: 'AXISBANK',   name: 'Axis Bank',        sector: 'Financials',    weight: 55,  symbol: 'AXISBANK.NS'   },
  { id: 'BAJFINANCE', name: 'Bajaj Finance',    sector: 'Financials',    weight: 60,  symbol: 'BAJFINANCE.NS' },
  { id: 'BAJAJFINSV', name: 'Bajaj Finserv',    sector: 'Financials',    weight: 30,  symbol: 'BAJAJFINSV.NS' },
  { id: 'INDUSINDBK', name: 'IndusInd Bank',    sector: 'Financials',    weight: 28,  symbol: 'INDUSINDBK.NS' },
  { id: 'HDFCLIFE',   name: 'HDFC Life',        sector: 'Financials',    weight: 28,  symbol: 'HDFCLIFE.NS'   },
  { id: 'SBILIFE',    name: 'SBI Life',         sector: 'Financials',    weight: 25,  symbol: 'SBILIFE.NS'    },
  { id: 'SHRIRAMFIN', name: 'Shriram Finance',  sector: 'Financials',    weight: 20,  symbol: 'SHRIRAMFIN.NS' },
  { id: 'JIOFIN',     name: 'Jio Financial',    sector: 'Financials',    weight: 22,  symbol: 'JIOFIN.NS'     },
  { id: 'TCS',        name: 'TCS',              sector: 'IT',            weight: 120, symbol: 'TCS.NS'        },
  { id: 'INFY',       name: 'Infosys',          sector: 'IT',            weight: 100, symbol: 'INFY.NS'       },
  { id: 'HCLTECH',    name: 'HCL Tech',         sector: 'IT',            weight: 55,  symbol: 'HCLTECH.NS'    },
  { id: 'WIPRO',      name: 'Wipro',            sector: 'IT',            weight: 40,  symbol: 'WIPRO.NS'      },
  { id: 'TECHM',      name: 'Tech Mahindra',    sector: 'IT',            weight: 28,  symbol: 'TECHM.NS'      },
  { id: 'RELIANCE',   name: 'Reliance',         sector: 'Energy',        weight: 150, symbol: 'RELIANCE.NS'   },
  { id: 'NTPC',       name: 'NTPC',             sector: 'Energy',        weight: 40,  symbol: 'NTPC.NS'       },
  { id: 'POWERGRID',  name: 'Power Grid',       sector: 'Energy',        weight: 35,  symbol: 'POWERGRID.NS'  },
  { id: 'ONGC',       name: 'ONGC',             sector: 'Energy',        weight: 38,  symbol: 'ONGC.NS'       },
  { id: 'BPCL',       name: 'BPCL',             sector: 'Energy',        weight: 22,  symbol: 'BPCL.NS'       },
  { id: 'COALINDIA',  name: 'Coal India',       sector: 'Energy',        weight: 30,  symbol: 'COALINDIA.NS'  },
  { id: 'HINDUNILVR', name: 'HUL',              sector: 'Consumer',      weight: 60,  symbol: 'HINDUNILVR.NS' },
  { id: 'ITC',        name: 'ITC',              sector: 'Consumer',      weight: 55,  symbol: 'ITC.NS'        },
  { id: 'NESTLEIND',  name: 'Nestle',           sector: 'Consumer',      weight: 22,  symbol: 'NESTLEIND.NS'  },
  { id: 'BRITANNIA',  name: 'Britannia',        sector: 'Consumer',      weight: 18,  symbol: 'BRITANNIA.NS'  },
  { id: 'TRENT',      name: 'Trent',            sector: 'Consumer',      weight: 25,  symbol: 'TRENT.NS'      },
  { id: 'MARUTI',     name: 'Maruti',           sector: 'Auto',          weight: 50,  symbol: 'MARUTI.NS'     },
  { id: 'TATAMOTORS', name: 'Tata Motors',      sector: 'Auto',          weight: 45,  symbol: 'TATAMOTORS.NS' },
  { id: 'M&M',        name: 'M&M',              sector: 'Auto',          weight: 50,  symbol: 'M&M.NS'        },
  { id: 'BAJAJ-AUTO', name: 'Bajaj Auto',       sector: 'Auto',          weight: 35,  symbol: 'BAJAJ-AUTO.NS' },
  { id: 'HEROMOTOCO', name: 'Hero MotoCorp',    sector: 'Auto',          weight: 22,  symbol: 'HEROMOTOCO.NS' },
  { id: 'EICHERMOT',  name: 'Eicher Motors',    sector: 'Auto',          weight: 22,  symbol: 'EICHERMOT.NS'  },
  { id: 'SUNPHARMA',  name: 'Sun Pharma',       sector: 'Pharma',        weight: 55,  symbol: 'SUNPHARMA.NS'  },
  { id: 'CIPLA',      name: 'Cipla',            sector: 'Pharma',        weight: 25,  symbol: 'CIPLA.NS'      },
  { id: 'DRREDDY',    name: "Dr Reddy's",       sector: 'Pharma',        weight: 28,  symbol: 'DRREDDY.NS'    },
  { id: 'DIVISLAB',   name: "Divi's Lab",       sector: 'Pharma',        weight: 22,  symbol: 'DIVISLAB.NS'   },
  { id: 'TATASTEEL',  name: 'Tata Steel',       sector: 'Metals',        weight: 35,  symbol: 'TATASTEEL.NS'  },
  { id: 'JSWSTEEL',   name: 'JSW Steel',        sector: 'Metals',        weight: 32,  symbol: 'JSWSTEEL.NS'   },
  { id: 'LT',         name: 'L&T',              sector: 'Industrials',   weight: 75,  symbol: 'LT.NS'         },
  { id: 'ADANIPORTS', name: 'Adani Ports',      sector: 'Industrials',   weight: 35,  symbol: 'ADANIPORTS.NS' },
  { id: 'ADANIENT',   name: 'Adani Ent.',       sector: 'Industrials',   weight: 28,  symbol: 'ADANIENT.NS'   },
  { id: 'BEL',        name: 'BEL',              sector: 'Industrials',   weight: 22,  symbol: 'BEL.NS'        },
  { id: 'GRASIM',     name: 'Grasim',           sector: 'Industrials',   weight: 22,  symbol: 'GRASIM.NS'     },
  { id: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Industrials',   weight: 30,  symbol: 'ULTRACEMCO.NS' },
  { id: 'ASIANPAINT', name: 'Asian Paints',     sector: 'Discretionary', weight: 32,  symbol: 'ASIANPAINT.NS' },
  { id: 'TITAN',      name: 'Titan',            sector: 'Discretionary', weight: 35,  symbol: 'TITAN.NS'      },
  { id: 'APOLLOHOSP', name: 'Apollo Hospitals', sector: 'Discretionary', weight: 25,  symbol: 'APOLLOHOSP.NS' },
];

// ── Kite fetch helpers ───────────────────────────────────────────────

function kiteHeaders(token) {
  return {
    'X-Kite-Version': '3',
    'Authorization': `token ${process.env.KITE_API_KEY}:${token}`,
  };
}

function parseKiteQuote(q, price) {
  const prevClose = q.ohlc?.close || price;
  const change    = parseFloat((price - prevClose).toFixed(2));
  const changePct = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
  return {
    price, prevClose, change, changePct,
    open:  q.ohlc?.open  ?? null,
    high:  q.ohlc?.high  ?? null,
    low:   q.ohlc?.low   ?? null,
  };
}

async function kiteQuote(instruments, token) {
  const params = instruments.map(i => `i=${encodeURIComponent(i)}`).join('&');
  const r      = await fetch(`https://api.kite.trade/quote?${params}`, { headers: kiteHeaders(token) });
  if (r.status === 401 || r.status === 403) throw new Error('token_expired');
  if (!r.ok) throw new Error(`Kite ${r.status}`);
  const json = await r.json();
  if (json.status !== 'success') throw new Error('Kite error');
  return json.data;
}

// ── type=hero ────────────────────────────────────────────────────────

async function handleHero(token, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const data   = await kiteQuote(HEROES.map(h => h.instrument), token);
    const result = {};
    for (const h of HEROES) {
      const q = data?.[h.instrument];
      if (!q) continue;
      result[h.id] = {
        ...parseKiteQuote(q, q.last_price),
        volume: q.volume_traded,
      };
    }
    return res.json({ data: result, ts: Date.now() });
  } catch (e) {
    const status = e.message === 'token_expired' ? 401 : 500;
    return res.status(status).json({ error: e.message });
  }
}

// ── type=indices ─────────────────────────────────────────────────────

async function handleIndices(token, res) {
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  if (token) {
    try {
      const data   = await kiteQuote(KITE_INDICES.map(i => i.instrument), token);
      const result = KITE_INDICES.map(idx => {
        const q = data?.[idx.instrument];
        if (!q) return null;
        return { name: idx.name, ...parseKiteQuote(q, q.last_price) };
      }).filter(Boolean);
      return res.json({ source: 'kite', data: result });
    } catch (e) {
      if (e.message === 'token_expired') return res.status(401).json({ error: 'token_expired' });
      console.warn('Kite indices failed, falling back to Yahoo');
    }
  }

  // Yahoo fallback
  try {
    const results = await Promise.allSettled(YAHOO_INDICES.map(async idx => {
      const r    = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?interval=1d&range=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
      if (!r.ok) return null;
      const json = await r.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta?.regularMarketPrice) return null;
      const price     = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      return {
        name: idx.name, price, prevClose,
        change:    parseFloat((price - prevClose).toFixed(2)),
        changePct: prevClose ? parseFloat(((price - prevClose) / prevClose * 100).toFixed(2)) : 0,
        open:  meta.regularMarketOpen        ?? null,
        high:  meta.regularMarketDayHigh     ?? null,
        low:   meta.regularMarketDayLow      ?? null,
      };
    }));
    return res.json({ source: 'yahoo', data: results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean) });
  } catch (e) {
    return res.status(500).json({ error: e.message, data: [] });
  }
}

// ── type=nifty50 ─────────────────────────────────────────────────────

async function handleNifty50(token, res) {
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  if (token) {
    try {
      const instruments = NIFTY50.map(s => `NSE:${s.id}`);
      const data        = await kiteQuote(instruments, token);
      const result      = NIFTY50.map(stock => {
        const q = data?.[`NSE:${stock.id}`];
        if (!q) return null;
        return { ...stock, ...parseKiteQuote(q, q.last_price) };
      }).filter(Boolean);
      return res.json({ source: 'kite', data: result });
    } catch (e) {
      if (e.message === 'token_expired') return res.status(401).json({ error: 'token_expired' });
      console.warn('Kite nifty50 failed, falling back to Yahoo');
    }
  }

  // Yahoo fallback — chunks of 5
  try {
    const chunks  = [];
    for (let i = 0; i < NIFTY50.length; i += 5) chunks.push(NIFTY50.slice(i, i + 5));
    const settled = await Promise.allSettled(chunks.map(chunk =>
      Promise.allSettled(chunk.map(async stock => {
        const r    = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?interval=1d&range=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (!r.ok) return null;
        const json = await r.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) return null;
        const price     = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        return {
          ...stock, price, prevClose,
          change:    parseFloat((price - prevClose).toFixed(2)),
          changePct: prevClose ? parseFloat(((price - prevClose) / prevClose * 100).toFixed(2)) : 0,
          open:  meta.regularMarketOpen    ?? null,
          high:  meta.regularMarketDayHigh ?? null,
          low:   meta.regularMarketDayLow  ?? null,
        };
      }))
    ));
    const data = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])
      .map(r => r?.status === 'fulfilled' ? r.value : null).filter(Boolean);
    return res.json({ source: 'yahoo', data });
  } catch (e) {
    return res.status(500).json({ error: e.message, data: [] });
  }
}

// ── type=futures ─────────────────────────────────────────────────────
function getCurrentMonthlyExpiry() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  function lastThursday(y, m) {
    const d = new Date(y, m + 1, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    return d;
  }
  let exp = lastThursday(ist.getFullYear(), ist.getMonth());
  if (exp <= ist) {
    const nm = ist.getMonth() === 11 ? 0 : ist.getMonth() + 1;
    const ny = ist.getMonth() === 11 ? ist.getFullYear() + 1 : ist.getFullYear();
    exp = lastThursday(ny, nm);
  }
  const YY  = String(exp.getFullYear()).slice(2);
  const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][exp.getMonth()];
  return { symbol: `NIFTY${YY}${MON}FUT`, date: exp };
}

// Fetch instruments for any exchange (NFO, BFO, etc.)
async function getInstruments(token, exchange = 'NFO') {
  const r = await fetch(`https://api.kite.trade/instruments?exchange=${exchange}`, { headers: kiteHeaders(token) });
  if (!r.ok) throw new Error(`instruments ${r.status}`);
  return r.text();
}

// Backward compat alias
async function getNFOInstruments(token) {
  return getInstruments(token, 'NFO');
}

async function handleFutures(token, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!token) return res.status(401).json({ error: 'no_token' });
  const { symbol } = getCurrentMonthlyExpiry();
  try {
    const text  = await getNFOInstruments(token);
    const ist   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}-${String(ist.getDate()).padStart(2,'0')}`;

    // Find nearest Nifty futures (not fragile date string matching)
    const fut = text.split('\n')
      .filter(l => l.includes(',NIFTY,') && l.includes(',FUT,'))
      .map(l => { const c = l.split(','); return { token: c[0], expiry: c[5], sym: c[2] }; })
      .filter(f => f.expiry >= today)
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))[0];

    if (!fut) return res.json({ error: 'instrument_not_found', symbol });

    const qr = await fetch(`https://api.kite.trade/quote?i=NFO:${encodeURIComponent(fut.sym)}&i=${encodeURIComponent('NSE:NIFTY 50')}`, { headers: kiteHeaders(token) });
    const qj = await qr.json();
    const q    = qj?.data?.[`NFO:${fut.sym}`] || Object.values(qj?.data || {}).find(d => d.instrument_token === parseInt(fut.token));
    const spotQ = qj?.data?.['NSE:NIFTY 50'];
    if (!q) return res.json({ error: 'no_quote', symbol: fut.sym });
    const price = q.last_price, pc = q.ohlc?.close || price;
    const spot  = spotQ?.last_price || pc;
    return res.json({ symbol: fut.sym, price, prevClose: pc, spot,
      change: parseFloat((price-pc).toFixed(2)), changePct: parseFloat(((price-pc)/pc*100).toFixed(2)),
      oi: q.oi, oiChange: q.oi_day_change, open: q.ohlc?.open, high: q.ohlc?.high, low: q.ohlc?.low });
  } catch(e) { return res.status(500).json({ error: e.message, symbol }); }
}


// Index config — expiry day, Kite name, spot instrument, NSE API symbol
const INDEX_CONFIG = {
  NIFTY:      { kiteName: 'NIFTY',      expiryDay: 2, spotInstr: 'NSE:NIFTY 50',   nseSymbol: 'NIFTY',      label: 'Nifty 50'   },
  BANKNIFTY:  { kiteName: 'BANKNIFTY',  expiryDay: 3, spotInstr: 'NSE:NIFTY BANK', nseSymbol: 'BANKNIFTY',  label: 'Bank Nifty' },
  SENSEX:     { kiteName: 'SENSEX',     expiryDay: 4, spotInstr: 'BSE:SENSEX',      nseSymbol: 'SENSEX',     label: 'Sensex',     bse: true },
};

// Fetch option chain via Kite — instruments + batch quote
// Returns { spot, expiry, strikes: [{strike, callOI, putOI, callLTP, putLTP}] }
async function fetchKiteOptionChain(token, indexKey = 'NIFTY') {
  if (!token) throw new Error('no_token');
  const cfg = INDEX_CONFIG[indexKey] || INDEX_CONFIG.NIFTY;

  // Sensex options are on BFO, everything else on NFO
  const exchange = cfg.bse ? 'BFO' : 'NFO';
  const text  = await getInstruments(token, exchange);
  const lines = text.split('\n').filter(Boolean);

  // Find next weekly expiry for this index
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  let daysUntil = (cfg.expiryDay - day + 7) % 7;
  // Only skip to next week AFTER market close (15:30 IST = 930 minutes)
  if (daysUntil === 0 && ist.getHours() * 60 + ist.getMinutes() >= 15 * 60 + 30) daysUntil = 7;
  const expDate = new Date(ist);
  expDate.setDate(ist.getDate() + daysUntil);
  const expStr = `${expDate.getFullYear()}-${String(expDate.getMonth()+1).padStart(2,'0')}-${String(expDate.getDate()).padStart(2,'0')}`;

  // Filter options for this index + expiry
  // CSV: instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange
  const options = [];
  for (const line of lines) {
    const cols = line.split(',');
    if (cols.length < 12) continue;
    const tradingsymbol = cols[2];
    const name          = cols[3];
    const expiry        = cols[5];
    const instrType     = cols[9];
    if (name !== cfg.kiteName) continue;
    if (!expiry.startsWith(expStr)) continue;
    if (instrType !== 'CE' && instrType !== 'PE') continue;
    const strike = parseFloat(cols[6]);
    if (isNaN(strike)) continue;
    options.push({ tradingsymbol, strike, type: instrType });
  }

  if (!options.length) throw new Error(`No ${cfg.kiteName} options found for expiry ${expStr}`);

  // Get spot price
  const spotQ = await fetch(`https://api.kite.trade/quote?i=${encodeURIComponent(cfg.spotInstr)}`, { headers: kiteHeaders(token) });
  const spotJ = await spotQ.json();
  const spot  = Object.values(spotJ?.data || {})[0]?.last_price || 0;

  // Batch quote all options using exchange:tradingsymbol format
  const instruments = options.map(o => `${exchange}:${o.tradingsymbol}`);
  const quoteData   = {};
  for (let i = 0; i < instruments.length; i += 500) {
    const chunk  = instruments.slice(i, i + 500);
    const params = chunk.map(inst => `i=${encodeURIComponent(inst)}`).join('&');
    const r = await fetch(`https://api.kite.trade/quote?${params}`, { headers: kiteHeaders(token) });
    if (!r.ok) continue;
    Object.assign(quoteData, (await r.json())?.data || {});
  }

  // Build strike map
  const strikeMap = {};
  for (const opt of options) {
    const key = `${exchange}:${opt.tradingsymbol}`;
    const q   = quoteData[key];
    if (!strikeMap[opt.strike]) strikeMap[opt.strike] = { strike: opt.strike, callOI:0, putOI:0, callLTP:0, putLTP:0, callIV:0, putIV:0 };
    if (q) {
      if (opt.type === 'CE') { strikeMap[opt.strike].callOI = q.oi||0; strikeMap[opt.strike].callLTP = q.last_price||0; }
      if (opt.type === 'PE') { strikeMap[opt.strike].putOI  = q.oi||0; strikeMap[opt.strike].putLTP  = q.last_price||0; }
    }
  }

  return {
    spot,
    expiry:    expStr,
    indexKey,
    label:     cfg.label,
    strikes:   Object.values(strikeMap).sort((a, b) => a.strike - b.strike),
  };
}

// NSE fallback — supports NIFTY, BANKNIFTY, SENSEX
async function fetchNSEOptionChain(nseSymbol = 'NIFTY') {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  let cookie = '';
  try {
    const home = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' } });
    cookie = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(_) {}
  try { await fetch('https://www.nseindia.com/option-chain', { headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Cookie': cookie } }); } catch(_) {}
  const H = { 'User-Agent': UA, 'Accept': 'application/json, */*', 'Referer': 'https://www.nseindia.com/option-chain', 'Cookie': cookie, 'X-Requested-With': 'XMLHttpRequest' };
  const endpoint = nseSymbol === 'SENSEX'
    ? `https://www.nseindia.com/api/option-chain-indices?symbol=SENSEX`
    : `https://www.nseindia.com/api/option-chain-indices?symbol=${nseSymbol}`;
  const r = await fetch(endpoint, { headers: H });
  if (!r.ok) throw new Error(`NSE ${r.status}`);
  const json = await r.json();
  if (!json?.records?.data?.length) throw new Error('NSE empty response');
  const records  = json.records.data;
  const spot     = json.records.underlyingValue || 0;
  const expiries = [...new Set(records.map(r => r.expiryDate))].sort((a,b) => new Date(a)-new Date(b));
  const near     = records.filter(r => r.expiryDate === expiries[0]);
  const strikeMap = {};
  for (const rec of near) {
    const s = rec.strikePrice;
    if (!strikeMap[s]) strikeMap[s] = { strike:s, callOI:0, putOI:0, callLTP:0, putLTP:0, callIV:0, putIV:0 };
    if (rec.CE) { strikeMap[s].callOI=rec.CE.openInterest||0; strikeMap[s].callLTP=rec.CE.lastPrice||0; strikeMap[s].callIV=rec.CE.impliedVolatility||0; }
    if (rec.PE) { strikeMap[s].putOI=rec.PE.openInterest||0;  strikeMap[s].putLTP=rec.PE.lastPrice||0;  strikeMap[s].putIV=rec.PE.impliedVolatility||0; }
  }
  const cfg = Object.values(INDEX_CONFIG).find(c => c.nseSymbol === nseSymbol) || INDEX_CONFIG.NIFTY;
  return { spot, expiry: expiries[0], indexKey: nseSymbol, label: cfg.label, strikes: Object.values(strikeMap).sort((a,b)=>a.strike-b.strike) };
}

async function handlePCR(token, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  const indexKey = (['NIFTY','BANKNIFTY','SENSEX'].includes(res.req?.query?.index)) ? res.req.query.index : 'NIFTY';

  let chain = null;
  if (token) {
    try { chain = await fetchKiteOptionChain(token, indexKey); } catch(e) { console.warn('Kite option chain failed:', e.message); }
  }
  if (!chain) {
    try {
      const cfg = INDEX_CONFIG[indexKey] || INDEX_CONFIG.NIFTY;
      chain = await fetchNSEOptionChain(cfg.nseSymbol);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  const { spot, expiry, strikes } = chain;
  let totalCallOI = 0, totalPutOI = 0;
  strikes.forEach(s => { totalCallOI += s.callOI; totalPutOI += s.putOI; });
  const pcr = totalCallOI > 0 ? parseFloat((totalPutOI/totalCallOI).toFixed(3)) : 0;

  let maxPainStrike = 0, maxPainLoss = Infinity;
  for (const { strike: settlement } of strikes) {
    let loss = 0;
    strikes.forEach(s => { loss += s.callOI * Math.max(0, s.strike - settlement); loss += s.putOI * Math.max(0, settlement - s.strike); });
    if (loss < maxPainLoss) { maxPainLoss = loss; maxPainStrike = settlement; }
  }
  const atm = strikes.length ? strikes.reduce((b,s) => Math.abs(s.strike-spot)<Math.abs(b.strike-spot)?s:b, strikes[0]) : null;
  const topStrikes = strikes.map(s=>({...s,totalOI:s.callOI+s.putOI})).sort((a,b)=>b.totalOI-a.totalOI).slice(0,10).sort((a,b)=>a.strike-b.strike);
  return res.json({ spot, expiry, pcr, totalCallOI, totalPutOI, maxPain: maxPainStrike,
    atmStrike: atm?.strike, atmCallLTP: atm?.callLTP, atmPutLTP: atm?.putLTP,
    atmIV: atm?.callIV && atm?.putIV ? parseFloat(((atm.callIV+atm.putIV)/2).toFixed(1)) : null,
    topStrikes, source: token ? 'kite' : 'nse' });
}

async function handleStraddle(token, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  const indexKey = (['NIFTY','BANKNIFTY','SENSEX'].includes(res.req?.query?.index)) ? res.req.query.index : 'NIFTY';

  let chain = null;
  if (token) {
    try { chain = await fetchKiteOptionChain(token, indexKey); } catch(e) { console.warn('Kite straddle failed:', e.message); }
  }
  if (!chain) {
    try {
      const cfg = INDEX_CONFIG[indexKey] || INDEX_CONFIG.NIFTY;
      chain = await fetchNSEOptionChain(cfg.nseSymbol);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  const { spot, expiry, strikes } = chain;
  const atm    = strikes.reduce((b,s) => Math.abs(s.strike-spot)<Math.abs(b.strike-spot)?s:b, strikes[0]);
  const atmIdx = strikes.indexOf(atm);
  const window_ = strikes.slice(Math.max(0,atmIdx-6), atmIdx+7);
  const straddles = window_.map(s => ({
    strike: s.strike, callLTP: s.callLTP, putLTP: s.putLTP,
    straddle: parseFloat((s.callLTP+s.putLTP).toFixed(2)),
    callOI: s.callOI, putOI: s.putOI,
    iv: s.callIV && s.putIV ? parseFloat(((s.callIV+s.putIV)/2).toFixed(1)) : (s.callIV||s.putIV||0),
    isATM: s.strike === atm.strike,
  }));
  const atmS = straddles.find(s => s.isATM);
  return res.json({ spot, expiry, atm: atm.strike, straddles,
    expectedMove: atmS && spot ? parseFloat((atmS.straddle/spot*100).toFixed(2)) : null,
    source: token ? 'kite' : 'nse' });
}

async function handleVWAP(token, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const text  = await getNFOInstruments(token);
    const lines = text.split('\n');

    // Find nearest Nifty futures (any FUT on NIFTY, pick closest expiry)
    const niftyFuts = lines
      .filter(l => l.includes(',NIFTY,') && l.includes(',FUT,'))
      .map(l => { const c = l.split(','); return { token: c[0], expiry: c[5] }; })
      .filter(f => f.expiry)
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    // Filter to expiry >= today
    const today = `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}-${String(ist.getDate()).padStart(2,'0')}`;
    const fut = niftyFuts.find(f => f.expiry >= today) || niftyFuts[0];
    if (!fut) throw new Error('Nifty futures not found');

    const instrToken = fut.token;
    // Fix: encode space as %20, not +
    const histR = await fetch(
      `https://api.kite.trade/instruments/historical/${instrToken}/5minute?from=${today}%2009:15:00&to=${today}%2015:30:00`,
      { headers: kiteHeaders(token) }
    );
    if (!histR.ok) throw new Error(`historical ${histR.status}`);
    const candles = (await histR.json())?.data?.candles || [];
    if (!candles.length) return res.json({ error: 'no_candles', date: today });
    let sumTPV = 0, sumV = 0;
    for (const [,o,h,l,c,v] of candles) { const tp=(h+l+c)/3; sumTPV+=tp*v; sumV+=v; }
    const vwap = sumV > 0 ? parseFloat((sumTPV/sumV).toFixed(2)) : null;
    const currentPrice = candles[candles.length-1]?.[4] ?? null;
    return res.json({ vwap, currentPrice, signal: vwap&&currentPrice?(currentPrice>vwap?'above':'below'):null, candles: candles.length });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}

async function handleOI(token, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const text  = await getNFOInstruments(token);
    const lines = text.split('\n');
    const ist   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}-${String(ist.getDate()).padStart(2,'0')}`;

    // Find nearest futures for each index
    function findNearest(indexName) {
      return lines
        .filter(l => l.includes(`,${indexName},`) && l.includes(',FUT,'))
        .map(l => { const c = l.split(','); return { token: c[0], sym: c[2], expiry: c[5] }; })
        .filter(f => f.expiry >= today)
        .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))[0];
    }

    const niftyFut = findNearest('NIFTY');
    const bankFut  = findNearest('BANKNIFTY');
    const futs     = [niftyFut, bankFut].filter(Boolean);
    const instrs   = futs.map(f => `NFO:${f.sym}`);
    if (!instrs.length) throw new Error('No futures instruments found');

    const params = instrs.map(i => `i=${encodeURIComponent(i)}`).join('&');
    const qj = await (await fetch(`https://api.kite.trade/quote?${params}`, { headers: kiteHeaders(token) })).json();
    const result = {};
    const names  = ['nifty', 'banknifty'];
    futs.forEach((f, idx) => {
      const q = qj?.data?.[`NFO:${f.sym}`];
      if (!q) return;
      const name = names[idx];
      const price = q.last_price, pc = q.ohlc?.close || price, oiChg = q.oi_day_change || 0;
      let signal = 'neutral';
      if (price > pc && oiChg > 0) signal = 'long_buildup';
      if (price < pc && oiChg > 0) signal = 'short_buildup';
      if (price > pc && oiChg < 0) signal = 'short_covering';
      if (price < pc && oiChg < 0) signal = 'long_unwinding';
      result[name] = { price, prevClose: pc,
        change: parseFloat((price-pc).toFixed(2)), changePct: parseFloat(((price-pc)/pc*100).toFixed(2)),
        oi: q.oi, oiChange: oiChg,
        oiChangePct: q.oi > 0 ? parseFloat((oiChg/(q.oi - oiChg)*100).toFixed(2)) : 0,
        signal };
    });
    return res.json(result);
  } catch(e) { return res.status(500).json({ error: e.message }); }
}

// ── Main handler ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const type  = req.query.type;
  const token = await getToken();

  if (type === 'hero')     return handleHero(token, res);
  if (type === 'indices')  return handleIndices(token, res);
  if (type === 'nifty50')  return handleNifty50(token, res);
  if (type === 'futures')  return handleFutures(token, res);
  if (type === 'pcr')      { res.req = req; return handlePCR(token, res); }
  if (type === 'straddle') { res.req = req; return handleStraddle(token, res); }
  if (type === 'vwap')     return handleVWAP(token, res);
  if (type === 'oi')       return handleOI(token, res);

  return res.status(400).json({ error: 'unknown type' });
}
