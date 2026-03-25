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

async function getNFOInstruments(token) {
  const r = await fetch('https://api.kite.trade/instruments?exchange=NFO', { headers: kiteHeaders(token) });
  if (!r.ok) throw new Error(`instruments ${r.status}`);
  return r.text();
}

async function handleFutures(token, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!token) return res.status(401).json({ error: 'no_token' });
  const { symbol, date } = getCurrentMonthlyExpiry();
  try {
    const text   = await getNFOInstruments(token);
    const expStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const line   = text.split('\n').find(l => l.includes(expStr) && l.includes(',NIFTY,') && l.includes('FUT'));
    if (!line) return res.json({ error: 'instrument_not_found', symbol });
    const itoken = line.split(',')[0];
    const qr = await fetch(`https://api.kite.trade/quote?i=NFO:${itoken}`, { headers: kiteHeaders(token) });
    const qj = await qr.json();
    const q  = Object.values(qj?.data || {})[0];
    if (!q) return res.json({ error: 'no_quote', symbol });
    const price = q.last_price, pc = q.ohlc?.close || price;
    return res.json({ symbol, price, prevClose: pc,
      change: parseFloat((price-pc).toFixed(2)), changePct: parseFloat(((price-pc)/pc*100).toFixed(2)),
      oi: q.oi, oiChange: q.oi_day_change, open: q.ohlc?.open, high: q.ohlc?.high, low: q.ohlc?.low });
  } catch(e) { return res.status(500).json({ error: e.message, symbol }); }
}

async function handlePCR(token, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
    let cookie = '';
    try { const r = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }); cookie = (r.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; '); } catch(_) {}
    const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookie };
    const r = await fetch('https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY', { headers: H });
    if (!r.ok) throw new Error(`NSE ${r.status}`);
    const json    = await r.json();
    const records = json?.records?.data || [];
    const spot    = json?.records?.underlyingValue || 0;
    const expiries = [...new Set(records.map(r => r.expiryDate))].sort((a,b) => new Date(a)-new Date(b));
    const nearRecords = records.filter(r => r.expiryDate === expiries[0]);
    let totalCallOI = 0, totalPutOI = 0;
    const strikeData = {};
    for (const rec of nearRecords) {
      const strike = rec.strikePrice;
      if (!strikeData[strike]) strikeData[strike] = { strike, callOI:0, putOI:0, callLTP:0, putLTP:0, callIV:0, putIV:0 };
      if (rec.CE) { strikeData[strike].callOI=rec.CE.openInterest||0; strikeData[strike].callLTP=rec.CE.lastPrice||0; strikeData[strike].callIV=rec.CE.impliedVolatility||0; totalCallOI+=rec.CE.openInterest||0; }
      if (rec.PE) { strikeData[strike].putOI=rec.PE.openInterest||0;  strikeData[strike].putLTP=rec.PE.lastPrice||0;  strikeData[strike].putIV=rec.PE.impliedVolatility||0;  totalPutOI+=rec.PE.openInterest||0; }
    }
    const pcr     = totalCallOI > 0 ? parseFloat((totalPutOI/totalCallOI).toFixed(3)) : 0;
    const strikes = Object.values(strikeData).sort((a,b) => a.strike-b.strike);
    let maxPainStrike = 0, maxPainLoss = Infinity;
    for (const { strike: settlement } of strikes) {
      let loss = 0;
      for (const s of strikes) {
        loss += s.callOI * Math.max(0, s.strike - settlement);
        loss += s.putOI  * Math.max(0, settlement - s.strike);
      }
      if (loss < maxPainLoss) { maxPainLoss = loss; maxPainStrike = settlement; }
    }
    const atm = strikes.reduce((b,s) => Math.abs(s.strike-spot)<Math.abs(b.strike-spot)?s:b, strikes[0]);
    const topStrikes = strikes.map(s=>({...s,totalOI:s.callOI+s.putOI})).sort((a,b)=>b.totalOI-a.totalOI).slice(0,10).sort((a,b)=>a.strike-b.strike);
    return res.json({ spot, expiry: expiries[0], pcr, totalCallOI, totalPutOI, maxPain: maxPainStrike,
      atmStrike: atm?.strike, atmCallLTP: atm?.callLTP, atmPutLTP: atm?.putLTP,
      atmIV: atm ? parseFloat(((atm.callIV+atm.putIV)/2).toFixed(1)) : null, topStrikes });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}

async function handleStraddle(token, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
    let cookie = '';
    try { const r = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } }); cookie = (r.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; '); } catch(_) {}
    const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookie };
    const r = await fetch('https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY', { headers: H });
    if (!r.ok) throw new Error(`NSE ${r.status}`);
    const json = await r.json();
    const records = json?.records?.data || [];
    const spot    = json?.records?.underlyingValue || 0;
    const expiries = [...new Set(records.map(r => r.expiryDate))].sort((a,b) => new Date(a)-new Date(b));
    const nearRecords = records.filter(r => r.expiryDate === expiries[0]);
    const strikeMap = {};
    for (const rec of nearRecords) {
      const s = rec.strikePrice;
      if (!strikeMap[s]) strikeMap[s] = { strike:s, callLTP:0, putLTP:0, callOI:0, putOI:0, callIV:0, putIV:0 };
      if (rec.CE) { strikeMap[s].callLTP=rec.CE.lastPrice||0; strikeMap[s].callOI=rec.CE.openInterest||0; strikeMap[s].callIV=rec.CE.impliedVolatility||0; }
      if (rec.PE) { strikeMap[s].putLTP=rec.PE.lastPrice||0;  strikeMap[s].putOI=rec.PE.openInterest||0;  strikeMap[s].putIV=rec.PE.impliedVolatility||0; }
    }
    const allStrikes = Object.values(strikeMap).sort((a,b) => a.strike-b.strike);
    const atm      = allStrikes.reduce((b,s) => Math.abs(s.strike-spot)<Math.abs(b.strike-spot)?s:b, allStrikes[0]);
    const atmIdx   = allStrikes.indexOf(atm);
    const window_  = allStrikes.slice(Math.max(0,atmIdx-6), atmIdx+7);
    const straddles = window_.map(s => ({
      strike: s.strike, callLTP: s.callLTP, putLTP: s.putLTP,
      straddle: parseFloat((s.callLTP+s.putLTP).toFixed(2)),
      callOI: s.callOI, putOI: s.putOI,
      iv: s.callIV && s.putIV ? parseFloat(((s.callIV+s.putIV)/2).toFixed(1)) : s.callIV||s.putIV,
      isATM: s.strike === atm.strike,
    }));
    const atmS = straddles.find(s => s.isATM);
    return res.json({ spot, expiry: expiries[0], atm: atm.strike, straddles,
      expectedMove: atmS ? parseFloat((atmS.straddle/spot*100).toFixed(2)) : null });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}

async function handleVWAP(token, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  if (!token) return res.status(401).json({ error: 'no_token' });
  try {
    const text   = await getNFOInstruments(token);
    const { date } = getCurrentMonthlyExpiry();
    const expStr   = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const line     = text.split('\n').find(l => l.includes(expStr) && l.includes(',NIFTY,') && l.includes('FUT'));
    if (!line) throw new Error('Nifty futures not found');
    const instrToken = line.split(',')[0];
    const ist   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today = `${ist.getFullYear()}-${String(ist.getMonth()+1).padStart(2,'0')}-${String(ist.getDate()).padStart(2,'0')}`;
    const histR = await fetch(`https://api.kite.trade/instruments/historical/${instrToken}/5minute?from=${today}+09:15:00&to=${today}+15:30:00`, { headers: kiteHeaders(token) });
    if (!histR.ok) throw new Error(`historical ${histR.status}`);
    const candles = (await histR.json())?.data?.candles || [];
    if (!candles.length) return res.json({ error: 'no_candles' });
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
    const text   = await getNFOInstruments(token);
    const { date } = getCurrentMonthlyExpiry();
    const expStr   = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const lines    = text.split('\n');
    const niftyLine = lines.find(l => l.includes(expStr) && l.includes(',NIFTY,')    && l.includes('FUT'));
    const bankLine  = lines.find(l => l.includes(expStr) && l.includes(',BANKNIFTY,') && l.includes('FUT'));
    const instrs    = [niftyLine, bankLine].filter(Boolean).map(l => l.split(',')[0]);
    if (!instrs.length) throw new Error('instruments not found');
    const qj = await (await fetch(`https://api.kite.trade/quote?${instrs.map(i=>`i=NFO:${i}`).join('&')}`, { headers: kiteHeaders(token) })).json();
    const result = {};
    Object.entries(qj?.data||{}).forEach(([,q], idx) => {
      const name = idx===0?'nifty':'banknifty', price=q.last_price, pc=q.ohlc?.close||price, oiChg=q.oi_day_change||0;
      let signal='neutral';
      if (price>pc&&oiChg>0) signal='long_buildup';
      if (price<pc&&oiChg>0) signal='short_buildup';
      if (price>pc&&oiChg<0) signal='short_covering';
      if (price<pc&&oiChg<0) signal='long_unwinding';
      result[name]={ price, prevClose:pc, change:parseFloat((price-pc).toFixed(2)), changePct:parseFloat(((price-pc)/pc*100).toFixed(2)), oi:q.oi, oiChange:oiChg, oiChangePct:q.oi>0?parseFloat((oiChg/(q.oi-oiChg)*100).toFixed(2)):0, signal };
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
  if (type === 'pcr')      return handlePCR(token, res);
  if (type === 'straddle') return handleStraddle(token, res);
  if (type === 'vwap')     return handleVWAP(token, res);
  if (type === 'oi')       return handleOI(token, res);

  return res.status(400).json({ error: 'unknown type' });
}
