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
  return { price, prevClose, change, changePct };
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
        open: q.ohlc?.open, high: q.ohlc?.high, low: q.ohlc?.low,
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
      return { name: idx.name, price, prevClose, ...parseKiteQuote({ ohlc: { close: prevClose } }, price) };
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
        return { ...stock, price, prevClose, ...parseKiteQuote({ ohlc: { close: prevClose } }, price) };
      }))
    ));
    const data = settled.flatMap(r => r.status === 'fulfilled' ? r.value : [])
      .map(r => r?.status === 'fulfilled' ? r.value : null).filter(Boolean);
    return res.json({ source: 'yahoo', data });
  } catch (e) {
    return res.status(500).json({ error: e.message, data: [] });
  }
}

// ── Main handler ─────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const type  = req.query.type;
  const token = await getToken();

  if (type === 'hero')    return handleHero(token, res);
  if (type === 'indices') return handleIndices(token, res);
  if (type === 'nifty50') return handleNifty50(token, res);

  return res.status(400).json({ error: 'type must be hero, indices, or nifty50' });
}
