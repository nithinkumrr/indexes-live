// api/kite-nifty50.js
// Fetches all Nifty 50 constituent stocks via Kite Connect (one batched call)
// Falls back to Yahoo Finance if no token

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

// Nifty 50 constituents with sector grouping and relative free-float market cap weights
export const NIFTY50 = [
  // Financials
  { id: 'HDFCBANK',    name: 'HDFC Bank',        sector: 'Financials', weight: 135, symbol: 'HDFCBANK.NS'   },
  { id: 'ICICIBANK',   name: 'ICICI Bank',        sector: 'Financials', weight: 90,  symbol: 'ICICIBANK.NS'  },
  { id: 'KOTAKBANK',   name: 'Kotak Bank',        sector: 'Financials', weight: 55,  symbol: 'KOTAKBANK.NS'  },
  { id: 'SBIN',        name: 'SBI',               sector: 'Financials', weight: 70,  symbol: 'SBIN.NS'       },
  { id: 'AXISBANK',    name: 'Axis Bank',         sector: 'Financials', weight: 55,  symbol: 'AXISBANK.NS'   },
  { id: 'BAJFINANCE',  name: 'Bajaj Finance',     sector: 'Financials', weight: 60,  symbol: 'BAJFINANCE.NS' },
  { id: 'BAJAJFINSV',  name: 'Bajaj Finserv',     sector: 'Financials', weight: 30,  symbol: 'BAJAJFINSV.NS' },
  { id: 'INDUSINDBK',  name: 'IndusInd Bank',     sector: 'Financials', weight: 28,  symbol: 'INDUSINDBK.NS' },
  { id: 'HDFCLIFE',    name: 'HDFC Life',         sector: 'Financials', weight: 28,  symbol: 'HDFCLIFE.NS'   },
  { id: 'SBILIFE',     name: 'SBI Life',          sector: 'Financials', weight: 25,  symbol: 'SBILIFE.NS'    },
  { id: 'SHRIRAMFIN',  name: 'Shriram Finance',   sector: 'Financials', weight: 20,  symbol: 'SHRIRAMFIN.NS' },
  { id: 'JIOFIN',      name: 'Jio Financial',     sector: 'Financials', weight: 22,  symbol: 'JIOFIN.NS'     },

  // IT
  { id: 'TCS',         name: 'TCS',               sector: 'IT',         weight: 120, symbol: 'TCS.NS'        },
  { id: 'INFY',        name: 'Infosys',           sector: 'IT',         weight: 100, symbol: 'INFY.NS'       },
  { id: 'HCLTECH',     name: 'HCL Tech',          sector: 'IT',         weight: 55,  symbol: 'HCLTECH.NS'    },
  { id: 'WIPRO',       name: 'Wipro',             sector: 'IT',         weight: 40,  symbol: 'WIPRO.NS'      },
  { id: 'TECHM',       name: 'Tech Mahindra',     sector: 'IT',         weight: 28,  symbol: 'TECHM.NS'      },

  // Energy & Utilities
  { id: 'RELIANCE',    name: 'Reliance',          sector: 'Energy',     weight: 150, symbol: 'RELIANCE.NS'   },
  { id: 'NTPC',        name: 'NTPC',              sector: 'Energy',     weight: 40,  symbol: 'NTPC.NS'       },
  { id: 'POWERGRID',   name: 'Power Grid',        sector: 'Energy',     weight: 35,  symbol: 'POWERGRID.NS'  },
  { id: 'ONGC',        name: 'ONGC',              sector: 'Energy',     weight: 38,  symbol: 'ONGC.NS'       },
  { id: 'BPCL',        name: 'BPCL',              sector: 'Energy',     weight: 22,  symbol: 'BPCL.NS'       },
  { id: 'COALINDIA',   name: 'Coal India',        sector: 'Energy',     weight: 30,  symbol: 'COALINDIA.NS'  },

  // Consumer & FMCG
  { id: 'HINDUNILVR',  name: 'HUL',               sector: 'Consumer',   weight: 60,  symbol: 'HINDUNILVR.NS' },
  { id: 'ITC',         name: 'ITC',               sector: 'Consumer',   weight: 55,  symbol: 'ITC.NS'        },
  { id: 'NESTLEIND',   name: 'Nestle',            sector: 'Consumer',   weight: 22,  symbol: 'NESTLEIND.NS'  },
  { id: 'BRITANNIA',   name: 'Britannia',         sector: 'Consumer',   weight: 18,  symbol: 'BRITANNIA.NS'  },
  { id: 'TRENT',       name: 'Trent',             sector: 'Consumer',   weight: 25,  symbol: 'TRENT.NS'      },

  // Auto
  { id: 'MARUTI',      name: 'Maruti',            sector: 'Auto',       weight: 50,  symbol: 'MARUTI.NS'     },
  { id: 'TATAMOTORS',  name: 'Tata Motors',       sector: 'Auto',       weight: 45,  symbol: 'TATAMOTORS.NS' },
  { id: 'M&M',         name: 'M&M',               sector: 'Auto',       weight: 50,  symbol: 'M&M.NS'        },
  { id: 'BAJAJ-AUTO',  name: 'Bajaj Auto',        sector: 'Auto',       weight: 35,  symbol: 'BAJAJ-AUTO.NS' },
  { id: 'HEROMOTOCO',  name: 'Hero MotoCorp',     sector: 'Auto',       weight: 22,  symbol: 'HEROMOTOCO.NS' },
  { id: 'EICHERMOT',   name: 'Eicher Motors',     sector: 'Auto',       weight: 22,  symbol: 'EICHERMOT.NS'  },

  // Pharma
  { id: 'SUNPHARMA',   name: 'Sun Pharma',        sector: 'Pharma',     weight: 55,  symbol: 'SUNPHARMA.NS'  },
  { id: 'CIPLA',       name: 'Cipla',             sector: 'Pharma',     weight: 25,  symbol: 'CIPLA.NS'      },
  { id: 'DRREDDY',     name: "Dr Reddy's",        sector: 'Pharma',     weight: 28,  symbol: 'DRREDDY.NS'    },
  { id: 'DIVISLAB',    name: "Divi's Lab",        sector: 'Pharma',     weight: 22,  symbol: 'DIVISLAB.NS'   },

  // Metals & Mining
  { id: 'TATASTEEL',   name: 'Tata Steel',        sector: 'Metals',     weight: 35,  symbol: 'TATASTEEL.NS'  },
  { id: 'JSWSTEEL',    name: 'JSW Steel',         sector: 'Metals',     weight: 32,  symbol: 'JSWSTEEL.NS'   },

  // Industrials & Infra
  { id: 'LT',          name: 'L&T',               sector: 'Industrials',weight: 75,  symbol: 'LT.NS'         },
  { id: 'ADANIPORTS',  name: 'Adani Ports',       sector: 'Industrials',weight: 35,  symbol: 'ADANIPORTS.NS' },
  { id: 'ADANIENT',    name: 'Adani Ent.',        sector: 'Industrials',weight: 28,  symbol: 'ADANIENT.NS'   },
  { id: 'BEL',         name: 'BEL',               sector: 'Industrials',weight: 22,  symbol: 'BEL.NS'        },
  { id: 'GRASIM',      name: 'Grasim',            sector: 'Industrials',weight: 22,  symbol: 'GRASIM.NS'     },
  { id: 'ULTRACEMCO',  name: 'UltraTech Cement',  sector: 'Industrials',weight: 30,  symbol: 'ULTRACEMCO.NS' },

  // Discretionary
  { id: 'ASIANPAINT',  name: 'Asian Paints',      sector: 'Discretionary', weight: 32, symbol: 'ASIANPAINT.NS'},
  { id: 'TITAN',       name: 'Titan',             sector: 'Discretionary', weight: 35, symbol: 'TITAN.NS'     },
  { id: 'APOLLOHOSP',  name: 'Apollo Hospitals',  sector: 'Discretionary', weight: 25, symbol: 'APOLLOHOSP.NS'},
];

const KITE_INSTRUMENTS = NIFTY50.map(s => `NSE:${s.id}`);

async function fetchViaKite(token) {
  const apiKey = process.env.KITE_API_KEY;
  const params = KITE_INSTRUMENTS.map(i => `i=${encodeURIComponent(i)}`).join('&');
  const r      = await fetch(`https://api.kite.trade/quote?${params}`, {
    headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` },
  });
  if (r.status === 401 || r.status === 403) throw new Error('token_expired');
  if (!r.ok) throw new Error(`Kite ${r.status}`);
  const json = await r.json();
  if (json.status !== 'success') throw new Error('Kite error');

  return NIFTY50.map(stock => {
    const q = json.data?.[`NSE:${stock.id}`];
    if (!q) return null;
    const price     = q.last_price;
    const prevClose = q.ohlc?.close || price;
    const change    = parseFloat((price - prevClose).toFixed(2));
    const changePct = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
    return { ...stock, price, prevClose, change, changePct };
  }).filter(Boolean);
}

async function fetchViaYahoo() {
  // Batch into groups of 5 to avoid Yahoo rate limits
  const chunks = [];
  for (let i = 0; i < NIFTY50.length; i += 5) chunks.push(NIFTY50.slice(i, i + 5));

  const results = await Promise.allSettled(
    chunks.map(async chunk => {
      return Promise.allSettled(chunk.map(async stock => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.symbol)}?interval=1d&range=1d`;
        const r   = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (!r.ok) return null;
        const json      = await r.json();
        const meta      = json?.chart?.result?.[0]?.meta;
        if (!meta?.regularMarketPrice) return null;
        const price     = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change    = parseFloat((price - prevClose).toFixed(2));
        const changePct = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
        return { ...stock, price, prevClose, change, changePct };
      }));
    })
  );

  return results
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])
    .map(r => r?.status === 'fulfilled' ? r.value : null)
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const token = await getToken();
  if (token) {
    try {
      const data = await fetchViaKite(token);
      return res.json({ source: 'kite', data });
    } catch (e) {
      console.warn('Kite nifty50 failed:', e.message);
      if (e.message === 'token_expired') {
        return res.status(401).json({ error: 'token_expired' });
      }
    }
  }

  try {
    const data = await fetchViaYahoo();
    return res.json({ source: 'yahoo', data });
  } catch (e) {
    return res.status(500).json({ error: e.message, data: [] });
  }
}
