// api/kite-indices.js
// Fetches Indian index quotes via Kite Connect (uses stored access token)
// Falls back to Yahoo Finance if no Kite token available

async function getKiteToken() {
  const uUrl = process.env.UPSTASH_REDIS_REST_URL;
  const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (uUrl && uTok) {
    try {
      const r = await fetch(`${uUrl}/get/kite_token`, {
        headers: { Authorization: `Bearer ${uTok}` },
      });
      const d = await r.json();
      return d?.result || null;
    } catch (_) {}
  }
  const kvUrl = process.env.KV_REST_API_URL;
  const kvTok = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvTok) {
    try {
      const r = await fetch(`${kvUrl}/get/kite_token`, {
        headers: { Authorization: `Bearer ${kvTok}` },
      });
      const d = await r.json();
      return d?.result || null;
    } catch (_) {}
  }
  return null;
}

// Indices to show in the India ticker
const KITE_INDICES = [
  { name: 'Nifty 50',       instrument: 'NSE:NIFTY 50' },
  { name: 'Sensex',         instrument: 'BSE:SENSEX' },
  { name: 'Bank Nifty',     instrument: 'NSE:NIFTY BANK' },
  { name: 'Nifty IT',       instrument: 'NSE:NIFTY IT' },
  { name: 'Nifty Auto',     instrument: 'NSE:NIFTY AUTO' },
  { name: 'Nifty FMCG',     instrument: 'NSE:NIFTY FMCG' },
  { name: 'Nifty Pharma',   instrument: 'NSE:NIFTY PHARMA' },
  { name: 'Nifty Metal',    instrument: 'NSE:NIFTY METAL' },
  { name: 'Nifty Realty',   instrument: 'NSE:NIFTY REALTY' },
  { name: 'PSU Bank',       instrument: 'NSE:NIFTY PSU BANK' },
  { name: 'Fin Services',   instrument: 'NSE:NIFTY FIN SERVICE' },
  { name: 'Midcap 100',     instrument: 'NSE:NIFTY MIDCAP 100' },
  { name: 'Smallcap 100',   instrument: 'NSE:NIFTY SMLCAP 100' },
  { name: 'India VIX',      instrument: 'NSE:INDIA VIX' },
];

// Yahoo fallback symbols for each index
const YAHOO_FALLBACK = [
  { name: 'Nifty 50',       symbol: '^NSEI'     },
  { name: 'Sensex',         symbol: '^BSESN'    },
  { name: 'Bank Nifty',     symbol: '^NSEBANK'  },
  { name: 'Nifty IT',       symbol: '^CNXIT'    },
  { name: 'Nifty Auto',     symbol: '^CNXAUTO'  },
  { name: 'Nifty FMCG',     symbol: '^CNXFMCG'  },
  { name: 'Nifty Pharma',   symbol: '^CNXPHARMA' },
  { name: 'Nifty Metal',    symbol: '^CNXMETAL'  },
  { name: 'Midcap 100',     symbol: '^NSMIDCP'   },
  { name: 'India VIX',      symbol: '^INDIAVIX'  },
];

async function fetchViaKite(token) {
  const apiKey = process.env.KITE_API_KEY;
  const params = KITE_INDICES.map(i => `i=${encodeURIComponent(i.instrument)}`).join('&');
  const url    = `https://api.kite.trade/quote?${params}`;

  const r = await fetch(url, {
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${apiKey}:${token}`,
    },
  });

  if (!r.ok) throw new Error(`Kite ${r.status}`);
  const json = await r.json();
  if (json.status !== 'success') throw new Error('Kite error');

  return KITE_INDICES.map(idx => {
    const q = json.data?.[idx.instrument];
    if (!q) return null;
    const price     = q.last_price;
    const prevClose = q.ohlc?.close || price;
    const change    = parseFloat((price - prevClose).toFixed(2));
    const changePct = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
    return { name: idx.name, price, change, changePct };
  }).filter(Boolean);
}

async function fetchViaYahoo() {
  const results = await Promise.allSettled(
    YAHOO_FALLBACK.map(async idx => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?interval=1d&range=1d`;
      const r   = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });
      if (!r.ok) return null;
      const json      = await r.json();
      const meta      = json?.chart?.result?.[0]?.meta;
      if (!meta) return null;
      const price     = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose;
      if (!price) return null;
      const change    = parseFloat((price - prevClose).toFixed(2));
      const changePct = prevClose ? parseFloat(((change / prevClose) * 100).toFixed(2)) : 0;
      return { name: idx.name, price, change, changePct };
    })
  );
  return results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  try {
    const token = await getKiteToken();
    if (token) {
      const data = await fetchViaKite(token);
      return res.json({ source: 'kite', data });
    }
  } catch (e) {
    console.warn('Kite indices fetch failed, falling back to Yahoo:', e.message);
  }

  try {
    const data = await fetchViaYahoo();
    return res.json({ source: 'yahoo', data });
  } catch (e) {
    return res.status(500).json({ error: e.message, data: [] });
  }
}
