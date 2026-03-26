// api/nse-india.js — NSE data: VIX, FII, Advance/Decline, 52W highs/lows, Nifty EMA
// Used for MMI calculation

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const H  = (cookie='') => ({
    'User-Agent': UA, 'Accept': 'application/json',
    'Referer': 'https://www.nseindia.com/', Cookie: cookie
  });

  // Get NSE cookie
  let cookie = '';
  try {
    const r = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    cookie = (r.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');
  } catch(_) {}

  const result = {};

  // Try Kite for live data if token available
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

  // Kite instrument tokens for Indian indices
  const KITE_INSTRUMENTS = {
    256265: 'nifty50',   260105: 'banknifty',  274441: 'niftymidcap150',
    288009: 'niftynext50', 264969: 'niftyit',  258313: 'niftyauto',
    261897: 'niftyfmcg',  261641: 'niftypharma', 290825: 'niftyrealty',
    258825: 'niftymetal', 262409: 'niftyenergy', 257801: 'niftyfinservice',
    288265: 'niftymedia', 261385: 'niftypsubank', 261129: 'niftypvtbank',
    408065: 'niftysmallcap250',
  };

  if (kiteToken && kiteKey) {
    try {
      const tokens = Object.keys(KITE_INSTRUMENTS).map(t => `i=NSE:${t}`).join('&');
      const kr = await fetch(`https://api.kite.trade/quote?${Object.keys(KITE_INSTRUMENTS).map(t=>`i=${t}`).join('&')}`, {
        headers: { 'X-Kite-Version': '3', 'Authorization': `token ${kiteKey}:${kiteToken}` }
      });
      if (kr.ok) {
        const kd = await kr.json();
        for (const [token, key] of Object.entries(KITE_INSTRUMENTS)) {
          const q = kd?.data?.[token];
          if (q) {
            const price = q.last_price, prev = q.ohlc?.close || price;
            result[key] = {
              price, change: +(price - prev).toFixed(2),
              changePct: prev > 0 ? +((price-prev)/prev*100).toFixed(2) : 0,
              high: q.ohlc?.high, low: q.ohlc?.low, open: q.ohlc?.open,
              source: 'kite'
            };
          }
        }
      }
    } catch(_) {}
  }


  // 1. VIX
  try {
    const r = await fetch('https://www.nseindia.com/api/allIndices', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      const allData = d?.data || [];
      const parseRow = row => ({
        price: parseFloat(row.last),
        change: parseFloat(row.variation || row.change || 0),
        changePct: parseFloat(row.percentChange || 0),
        high52: parseFloat(row['52WeekHigh'] || 0),
        low52:  parseFloat(row['52WeekLow']  || 0),
        advances: parseInt(row.advances || 0),
        declines: parseInt(row.declines || 0),
      });

      const IDX_MAP = {
        'INDIA VIX':                    'indiavix',
        'NIFTY 50':                     'nifty50',
        'NIFTY BANK':                   'banknifty',
        'NIFTY NEXT 50':               'niftynext50',
        'NIFTY MIDCAP 150':            'niftymidcap150',
        'NIFTY SMALLCAP 250':          'niftysmallcap250',
        'NIFTY IT':                     'niftyit',
        'NIFTY AUTO':                   'niftyauto',
        'NIFTY FMCG':                   'niftyfmcg',
        'NIFTY PHARMA':                 'niftypharma',
        'NIFTY REALTY':                 'niftyrealty',
        'NIFTY METAL':                  'niftymetal',
        'NIFTY ENERGY':                 'niftyenergy',
        'NIFTY FINANCIAL SERVICES':     'niftyfinservice',
        'NIFTY MEDIA':                  'niftymedia',
        'NIFTY PSU BANK':               'niftypsubank',
        'NIFTY PRIVATE BANK':           'niftypvtbank',
        'NIFTY CONSUMER DURABLES':      'niftyconsumer',
        'NIFTY MIDCAP SELECT':         'niftymidcapselect',
        'NIFTY500 MULTICAP 50:25:25':  'nifty500',
      };

      for (const row of allData) {
        const key = IDX_MAP[row.index];
        if (key) result[key] = parseRow(row);
      }

      // VIX special — just a number
      if (result.indiavix) result.vix = result.indiavix.price;

      // Nifty50 breadth
      const niftyRow = allData.find(i => i.index === 'NIFTY 50');
      if (niftyRow) {
        result.nifty50 = { ...result.nifty50,
          advances: parseInt(niftyRow.advances || 0),
          declines: parseInt(niftyRow.declines || 0),
          unchanged: parseInt(niftyRow.unchanged || 0),
        };
        result.niftyLast   = result.nifty50.price;
        result.niftyChange = result.nifty50.changePct;
        result.niftyHigh52 = result.nifty50.high52;
        result.niftyLow52  = result.nifty50.low52;
      }
    }
  } catch(_) {}

  // 2. FII net activity (latest)
  try {
    const r = await fetch('https://www.nseindia.com/api/fiidiiTradeReact', { headers: H(cookie) });
    if (r.ok) {
      const rows = await r.json();
      const arr  = Array.isArray(rows) ? rows : (rows?.data || []);
      const fii  = arr.find(r => /FII|FPI/i.test(r?.category||r?.clientType||''));
      if (fii) {
        result.fiiNet  = parseFloat(fii.netValue ?? fii.net ?? 0);
        result.fiiBuy  = parseFloat(fii.buyValue ?? fii.grossPurchase ?? 0);
        result.fiiSell = parseFloat(fii.sellValue ?? fii.grossSales ?? 0);
      }
    }
  } catch(_) {}

  // 3. Advance / Decline for Nifty 500 (broader market breadth)
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=gainers', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.advancers = (d?.NIFTY?.data||d?.data||[]).length;
    }
  } catch(_) {}
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-variations?index=losers', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.decliners = (d?.NIFTY?.data||d?.data||[]).length;
    }
  } catch(_) {}

  // 4. Nifty 50 historical for EMA calculation (90d and 30d)
  try {
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=6mo', {
      headers: { 'User-Agent': UA }
    });
    if (r.ok) {
      const d      = await r.json();
      const closes = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
      const valid  = closes.filter(Boolean);
      if (valid.length >= 90) {
        const ema = (data, period) => {
          const k = 2 / (period + 1);
          return data.reduce((prev, cur, i) => i === 0 ? cur : cur * k + prev * (1-k));
        };
        result.ema30 = Math.round(ema(valid.slice(-30), 30));
        result.ema90 = Math.round(ema(valid.slice(-90), 90));
      }
    }
  } catch(_) {}

  // 5. 52-week highs vs lows count
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-data?index=high52', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.highs52w = (d?.data||[]).length;
    }
  } catch(_) {}
  try {
    const r = await fetch('https://www.nseindia.com/api/live-analysis-data?index=low52', { headers: H(cookie) });
    if (r.ok) {
      const d = await r.json();
      result.lows52w = (d?.data||[]).length;
    }
  } catch(_) {}

  // Sensex from BSE
  try {
    const r = await fetch('https://api.bseindia.com/BseIndiaAPI/api/GetSensexData/w', {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.bseindia.com/' }
    });
    if (r.ok) {
      const d = await r.json();
      const price = parseFloat(d?.CurrVal || d?.Data?.[0]?.CurrVal || 0);
      const prev  = parseFloat(d?.PrevClose || d?.Data?.[0]?.PrevClose || 0);
      if (price) result.sensex = {
        price, change: parseFloat(d?.Change || price - prev),
        changePct: parseFloat(d?.PchangeStr || ((price-prev)/prev*100).toFixed(2)),
      };
    }
  } catch(_) {}

  return res.json(result);
}
