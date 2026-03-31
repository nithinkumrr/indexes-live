// api/nifty-heatmap.js
// Returns Nifty 50 or Bank Nifty constituent stocks with price/change data
// Priority: 1) Kite live (if token) 2) NSE scrape 3) KV cached previous day

import { kv } from '@vercel/kv';

const NSE_HOL = new Set(['2026-01-15','2026-01-26','2026-03-03','2026-03-26','2026-03-31',
  '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14',
  '2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25']);

function isTradingDay() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dow = ist.getDay();
  if (dow === 0 || dow === 6) return false;
  const iso = ist.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return !NSE_HOL.has(iso);
}

const SECTOR_MAP = {
  'HDFCBANK':'Financials','ICICIBANK':'Financials','KOTAKBANK':'Financials','AXISBANK':'Financials',
  'SBIN':'Financials','BAJFINANCE':'Financials','BAJAJFINSV':'Financials','HDFCLIFE':'Financials',
  'SBILIFE':'Financials','INDUSINDBK':'Financials',
  'TCS':'IT','INFY':'IT','WIPRO':'IT','HCLTECH':'IT','TECHM':'IT','LTIM':'IT',
  'RELIANCE':'Energy','ONGC':'Energy','COALINDIA':'Energy','NTPC':'Energy','POWERGRID':'Energy','BPCL':'Energy',
  'HINDUNILVR':'Consumer','ITC':'Consumer','NESTLEIND':'Consumer','BRITANNIA':'Consumer','TATACONSUM':'Consumer',
  'MARUTI':'Auto','TATAMOTORS':'Auto','M&M':'Auto','BAJAJ-AUTO':'Auto','HEROMOTOCO':'Auto','EICHERMOT':'Auto',
  'LT':'Industrials','ADANIPORTS':'Industrials','SIEMENS':'Industrials','BEL':'Industrials',
  'SUNPHARMA':'Pharma','DRREDDY':'Pharma','CIPLA':'Pharma','DIVISLAB':'Pharma','APOLLOHOSP':'Pharma',
  'TITAN':'Discretionary','ASIANPAINT':'Discretionary','ULTRACEMCO':'Discretionary',
  'TATASTEEL':'Metals','JSWSTEEL':'Metals','HINDALCO':'Metals','VEDL':'Metals',
  'BHARTIARTL':'IT','ADANIENT':'Energy','TRENT':'Discretionary','SHRIRAMFIN':'Financials',
};

const WEIGHT_MAP = {
  'HDFCBANK':13.5,'RELIANCE':9.8,'ICICIBANK':8.2,'INFY':6.1,'TCS':5.8,'BHARTIARTL':4.2,
  'KOTAKBANK':3.8,'AXISBANK':3.4,'LT':3.1,'HCLTECH':2.8,'SBIN':2.7,'WIPRO':2.3,
  'BAJFINANCE':2.2,'HINDUNILVR':2.1,'MARUTI':1.9,'TITAN':1.8,'ADANIENT':1.7,
  'ASIANPAINT':1.6,'ULTRACEMCO':1.5,'SUNPHARMA':1.5,'NTPC':1.4,'ONGC':1.3,
  'TATAMOTORS':1.2,'M&M':1.2,'TATASTEEL':1.1,'POWERGRID':1.1,'BAJAJFINSV':1.0,
  'JSWSTEEL':1.0,'TECHM':0.9,'INDUSINDBK':0.9,'COALINDIA':0.9,'DRREDDY':0.8,
  'CIPLA':0.8,'TATACONSUM':0.8,'ITC':0.8,'NESTLEIND':0.7,'HINDALCO':0.7,
  'HDFCLIFE':0.7,'SBILIFE':0.7,'BAJAJ-AUTO':0.7,'EICHERMOT':0.6,'HEROMOTOCO':0.6,
  'DIVISLAB':0.6,'BRITANNIA':0.6,'APOLLOHOSP':0.6,'LTIM':0.6,'ADANIPORTS':0.5,
  'BPCL':0.5,'TRENT':0.5,'SHRIRAMFIN':0.5,
};

const BN_SECTOR_MAP = {
  'HDFCBANK':'Private Banks','ICICIBANK':'Private Banks','KOTAKBANK':'Private Banks',
  'AXISBANK':'Private Banks','INDUSINDBK':'Private Banks','BANDHANBNK':'Private Banks',
  'FEDERALBNK':'Private Banks','IDFCFIRSTB':'Private Banks','RBLBANK':'Private Banks',
  'SBIN':'PSU Banks','BANKBARODA':'PSU Banks','PNB':'PSU Banks','CANBK':'PSU Banks',
  'UNIONBANK':'PSU Banks','INDIANB':'PSU Banks',
  'BAJFINANCE':'NBFCs','BAJAJFINSV':'NBFCs','SHRIRAMFIN':'NBFCs',
};

// Nifty 50 & Bank Nifty constituents with Kite instrument tokens
const NIFTY50_TOKENS = {
  738561:'RELIANCE',341249:'HDFCBANK',1270529:'ICICIBANK',492033:'INFY',
  2953217:'TCS',2714625:'BHARTIARTL',1484417:'KOTAKBANK',1510401:'AXISBANK',
  3861249:'LT',1850625:'HCLTECH',779521:'SBIN',3787777:'WIPRO',
  81153:'BAJFINANCE',356865:'HINDUNILVR',2815745:'MARUTI',897537:'TITAN',
  424961:'ADANIENT',60417:'ASIANPAINT',2952193:'ULTRACEMCO',857857:'SUNPHARMA',
  2977281:'NTPC',633601:'ONGC',900609:'TATAMOTORS',519937:'M&M',
  877057:'TATASTEEL',2930177:'POWERGRID',119553:'BAJAJFINSV',3001089:'JSWSTEEL',
  3465729:'TECHM',1346049:'INDUSINDBK',177665:'COALINDIA',225537:'DRREDDY',
  177921:'CIPLA',3432705:'TATACONSUM',424457:'ITC',1895937:'NESTLEIND',
  348929:'HINDALCO',2513921:'HDFCLIFE',3830849:'SBILIFE',4268801:'BAJAJ-AUTO',
  2920705:'EICHERMOT',2983425:'DIVISLAB',140033:'BRITANNIA',1023489:'APOLLOHOSP',
  4140033:'LTIM',2390529:'ADANIPORTS',1790529:'BPCL',2875137:'TRENT',
  2867073:'SHRIRAMFIN',3456769:'BEL',
};

const BANKNIFTY_TOKENS = {
  738561:'RELIANCE',341249:'HDFCBANK',1270529:'ICICIBANK',
  1484417:'KOTAKBANK',1510401:'AXISBANK',1346049:'INDUSINDBK',
  779521:'SBIN',81153:'BAJFINANCE',119553:'BAJAJFINSV',
  2867073:'SHRIRAMFIN',1214721:'BANDHANBNK',3915265:'FEDERALBNK',
  4488961:'IDFCFIRSTB',4501505:'RBLBANK',
  1214721:'BANKBARODA',5215745:'PNB',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const indexKey  = req.query?.index === 'banknifty' ? 'banknifty' : 'nifty50';
  const KV_KEY    = `heatmap_v2_${indexKey}`;
  const isBN      = indexKey === 'banknifty';
  const smap      = isBN ? BN_SECTOR_MAP : SECTOR_MAP;
  const tokenMap  = isBN ? BANKNIFTY_TOKENS : NIFTY50_TOKENS;
  const indexName = isBN ? 'NIFTY BANK' : 'NIFTY 50';
  const UA        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  const trading = isTradingDay();
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const marketOpen = trading && mins >= 555 && mins < 930;

  // ── Step 1: Try Kite (live during market hours) ───────────────────────────
  let kiteToken = null;
  const kiteKey = process.env.KITE_API_KEY;
  try {
    const kUrl = process.env.KV_REST_API_URL, kTok = process.env.KV_REST_API_TOKEN;
    if (kUrl && kTok) {
      const kr = await fetch(`${kUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${kTok}` } });
      const kd = await kr.json();
      if (kd?.result) kiteToken = kd.result;
    }
  } catch(_) {}

  if (kiteToken && kiteKey) {
    try {
      const instruments = Object.keys(tokenMap).map(t => `NSE:${t}`);
      const kr = await fetch(
        `https://api.kite.trade/quote?${instruments.map(i=>`i=${i}`).join('&')}`,
        { headers: { 'X-Kite-Version': '3', 'Authorization': `token ${kiteKey}:${kiteToken}` } }
      );
      if (kr.ok) {
        const kd = await kr.json();
        const stocks = [];
        for (const [token, symbol] of Object.entries(tokenMap)) {
          const q = kd?.data?.[`NSE:${token}`];
          if (!q) continue;
          const price = q.last_price;
          const prev  = q.ohlc?.close || price;
          const change = price - prev;
          const changePct = prev > 0 ? (change / prev) * 100 : 0;
          stocks.push({
            id: symbol, name: symbol, symbol,
            price, change: +change.toFixed(2), changePct: +changePct.toFixed(2),
            open: q.ohlc?.open, high: q.ohlc?.high, low: q.ohlc?.low, prevClose: prev,
            sector: smap[symbol] || 'Others',
            weight: WEIGHT_MAP[symbol] || 0.5,
          });
        }
        if (stocks.length >= 10) {
          // Save to KV as latest good data
          try { await kv.set(KV_KEY, JSON.stringify({ data: stocks, source: 'kite', date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) }), { ex: 7 * 24 * 3600 }); } catch(_) {}
          return res.json({ data: stocks, index: indexName, source: 'kite', count: stocks.length });
        }
      }
    } catch(_) {}
  }

  // ── Step 2: Try NSE scrape (trading days only) ────────────────────────────
  if (trading) {
    try {
      let cookies = '';
      const home = await fetch('https://www.nseindia.com', {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
      });
      cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');

      const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };
      const r = await fetch(`https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(indexName)}`, { headers: H });

      if (r.ok) {
        const json = await r.json();
        const raw  = json.data || [];
        const stocks = raw
          .filter(s => s.symbol && s.symbol !== indexName.replace(' ', '_'))
          .map(s => ({
            id: s.symbol, name: s.meta?.companyName?.split(' ').slice(0,2).join(' ') || s.symbol,
            symbol: s.symbol, price: s.lastPrice, change: s.change, changePct: s.pChange,
            open: s.open, high: s.dayHigh, low: s.dayLow, prevClose: s.previousClose,
            sector: smap[s.symbol] || 'Others', weight: WEIGHT_MAP[s.symbol] || 0.5,
          }))
          .filter(s => s.price > 0);

        if (stocks.length >= 10) {
          try { await kv.set(KV_KEY, JSON.stringify({ data: stocks, source: 'nse', date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) }), { ex: 7 * 24 * 3600 }); } catch(_) {}
          return res.json({ data: stocks, index: indexName, source: 'nse', count: stocks.length });
        }
      }
    } catch(_) {}
  }

  // ── Step 3: Serve KV cached previous session data ─────────────────────────
  try {
    const cached = await kv.get(KV_KEY);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      if (parsed?.data?.length >= 10) {
        return res.json({ ...parsed, source: 'cached', cached: true, count: parsed.data.length });
      }
    }
  } catch(_) {}

  return res.status(503).json({ error: 'No heatmap data available', data: [] });
}
