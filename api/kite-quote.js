// api/kite-quote.js
// Returns live quotes for all Indian indices via Kite Connect REST API
// Called by the F&O ticker every 5s during market hours

import { kv } from '@vercel/kv';

const KITE_BASE = 'https://api.kite.trade';

// All NSE index instrument tokens
const INSTRUMENTS = [
  { token: 256265,  id: 'nifty50',          label: 'Nifty 50'      },
  { token: 260105,  id: 'banknifty',         label: 'Bank Nifty'    },
  { token: 288009,  id: 'niftynext50',       label: 'Nifty Next 50' },
  { token: 266249,  id: 'nifty100',          label: 'Nifty 100'     },
  { token: 270857,  id: 'nifty200',          label: 'Nifty 200'     },
  { token: 272905,  id: 'nifty500',          label: 'Nifty 500'     },
  { token: 274441,  id: 'niftymidcap150',    label: 'Midcap 150'    },
  { token: 268033,  id: 'niftymidcapselect', label: 'Mid Select'    },
  { token: 408065,  id: 'niftysmallcap250',  label: 'Smallcap 250'  },
  { token: 264969,  id: 'niftyit',           label: 'IT'            },
  { token: 258313,  id: 'niftyauto',         label: 'Auto'          },
  { token: 261897,  id: 'niftyfmcg',         label: 'FMCG'          },
  { token: 261641,  id: 'niftypharma',       label: 'Pharma'        },
  { token: 290825,  id: 'niftyrealty',       label: 'Realty'        },
  { token: 258825,  id: 'niftymetal',        label: 'Metal'         },
  { token: 259337,  id: 'niftyinfra',        label: 'Infra'         },
  { token: 262409,  id: 'niftyenergy',       label: 'Energy'        },
  { token: 257801,  id: 'niftyfinservice',   label: 'Fin Service'   },
  { token: 288265,  id: 'niftymedia',        label: 'Media'         },
  { token: 261385,  id: 'niftypsubank',      label: 'PSU Bank'      },
  { token: 261129,  id: 'niftypvtbank',      label: 'Pvt Bank'      },
  { token: 263945,  id: 'niftymnc',          label: 'MNC'           },
  { token: 259593,  id: 'niftyconsumer',     label: 'Consumer Dur'  },
  { token: 270601,  id: 'bankex',            label: 'Bankex'        },
  { token: 271881,  id: 'niftytotalmkt',     label: 'Total Mkt'     },
];

function isMarketOpen() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  if (ist.getDay() === 0 || ist.getDay() === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins < 930; // 9:15 - 15:30
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', isMarketOpen() ? 'no-store' : 's-maxage=300');

  const apiKey = process.env.KITE_API_KEY;

  // Get token from KV
  let token = null;
  try {
    token = await kv.get('kite_token');
  } catch (_) {}

  if (!token || !apiKey) {
    return res.status(200).json({ error: 'no_token', marketOpen: isMarketOpen(), quotes: [] });
  }

  try {
    // Fetch all in one call — Kite allows up to 500 instruments per quote request
    const qs = INSTRUMENTS.map(i => `i=NSE:${i.token}`).join('&');
    const r = await fetch(`${KITE_BASE}/quote?${qs}`, {
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${apiKey}:${token}`,
      },
    });

    if (r.status === 401 || r.status === 403) {
      return res.status(200).json({ error: 'token_expired', quotes: [] });
    }

    const json = await r.json();
    const data = json?.data || {};

    const quotes = INSTRUMENTS.map(inst => {
      const q = data[`NSE:${inst.token}`] || data[String(inst.token)];
      if (!q) return { ...inst, price: null, change: null, changePct: null };
      const price = q.last_price;
      const prev  = q.ohlc?.close || q.ohlc?.open || price;
      const change = parseFloat((price - prev).toFixed(2));
      const changePct = prev > 0 ? parseFloat(((change / prev) * 100).toFixed(2)) : 0;
      return {
        ...inst,
        price, change, changePct,
        open: q.ohlc?.open, high: q.ohlc?.high, low: q.ohlc?.low,
        prevClose: prev,
        volume: q.volume,
      };
    }).filter(q => q.price != null);

    return res.status(200).json({ quotes, marketOpen: isMarketOpen(), source: 'kite', ts: Date.now() });

  } catch (err) {
    return res.status(200).json({ error: err.message, quotes: [] });
  }
}
