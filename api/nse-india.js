// api/nse-india.js — NSE data: VIX, FII, Advance/Decline, 52W highs/lows, Nifty EMA
// Used for MMI calculation

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  // On holidays/weekends, try to serve cached previous session data
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const dow = ist.getDay();
  const todayIso = ist.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const NSE_HOL_FAST = new Set(['2026-01-15','2026-01-26','2026-03-03','2026-03-26','2026-03-31',
    '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14',
    '2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25']);
  const isClosedDay = dow === 0 || dow === 6 || NSE_HOL_FAST.has(todayIso);

  if (isClosedDay) {
    try {
      const { kv } = await import('@vercel/kv');
      const cached = await kv.get('mmi_data_v1');
      if (cached) {
        const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.json({ ...data, cached: true });
      }
    } catch(_) {}
  }

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

  // Use trading symbol names for Kite — more reliable than integer tokens
  // NSE:INDIA VIX is the correct symbol for India VIX on Kite
  // Kite instruments — integer token 264969 = India VIX (confirmed)
  const KITE_SYMBOLS = {
    'NIFTY 50':     'nifty50',
    'NIFTY BANK':   'banknifty',
    'NIFTY IT':     'niftyit',
    'NIFTY AUTO':   'niftyauto',
    'NIFTY FMCG':   'niftyfmcg',
    'NIFTY PHARMA': 'niftypharma',
    'NIFTY METAL':  'niftymetal',
    'NIFTY ENERGY': 'niftyenergy',
    'NIFTY REALTY': 'niftyrealty',
    'NIFTY 100':    'nifty100',
    'NIFTY 500':    'nifty500',
  };

  if (kiteToken && kiteKey) {
    try {
      // Fetch indices by symbol + India VIX by its confirmed token 264969
      const symInstruments = Object.keys(KITE_SYMBOLS).map(s => `NSE:${s}`);
      const allInstruments = [...symInstruments, '264969']; // 264969 = India VIX token
      const qs = allInstruments.map(i => `i=${encodeURIComponent(i)}`).join('&');
      const kr = await fetch(`https://api.kite.trade/quote?${qs}`, {
        headers: { 'X-Kite-Version': '3', 'Authorization': `token ${kiteKey}:${kiteToken}` }
      });
      if (kr.ok) {
        const kd = await kr.json();
        // Parse symbol-based results
        for (const [sym, key] of Object.entries(KITE_SYMBOLS)) {
          const q = kd?.data?.[`NSE:${sym}`];
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
        // India VIX by token 264969
        const vixQ = kd?.data?.['264969'];
        if (vixQ?.last_price) {
          result.vix = vixQ.last_price;
          result.indiavix = { price: vixQ.last_price, source: 'kite' };
        }
        if (result.nifty50?.changePct != null) result.niftyChange = result.nifty50.changePct;
      }
    } catch(e) { console.error('Kite nse-india error:', e.message); }
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
        'INDIA VIX':'indiavix','NIFTY 50':'nifty50','NIFTY BANK':'banknifty',
        'NIFTY NEXT 50':'niftynext50','NIFTY 100':'nifty100','NIFTY 200':'nifty200',
        'NIFTY 500':'nifty500','NIFTY MIDCAP 150':'niftymidcap150',
        'NIFTY MIDCAP SELECT':'niftymidcapselect','NIFTY MID SELECT':'niftymidcapselect',
        'NIFTY SMALLCAP 250':'niftysmallcap250','NIFTY SMLCAP 250':'niftysmallcap250',
        'NIFTY TOTAL MARKET':'niftytotalmkt','NIFTY TOTALMARKET':'niftytotalmkt',
        'NIFTY IT':'niftyit','NIFTY AUTO':'niftyauto',
        'NIFTY FMCG':'niftyfmcg','NIFTY PHARMA':'niftypharma','NIFTY REALTY':'niftyrealty',
        'NIFTY METAL':'niftymetal','NIFTY INFRA':'niftyinfra',
        'NIFTY INFRASTRUCTURE':'niftyinfra','NIFTY ENERGY':'niftyenergy',
        'NIFTY FINANCIAL SERVICES':'niftyfinservice','NIFTY FIN SERVICE':'niftyfinservice',
        'NIFTY MEDIA':'niftymedia','NIFTY PSU BANK':'niftypsubank',
        'NIFTY PRIVATE BANK':'niftypvtbank','NIFTY PVTBANK':'niftypvtbank',
        'NIFTY CONSUMER DURABLES':'niftyconsumer','NIFTY CONSR DURBL':'niftyconsumer',
        'NIFTY MNC':'niftymnc','BANKEX':'bankex',
        'NIFTY500 MULTICAP 50:25:25':'nifty500','NIFTY LARGEMIDCAP 250':'niftylargemid',
        'SENSEX':'sensex','S&P BSE SENSEX':'sensex',
      };

      // Debug — so we can see all index names NSE returns
      result._nseIndexNames = allData.map(r => r.index);

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

  // Fill missing fields from previous trading day KV data
  // This covers: FII (not published until 5 PM), 52W highs/lows, breadth, price change
  const needsFallback = result.fiiNet == null || result.fiiNet === 0 
    || result.niftyChange == null || result.highs52w == null;
  
  if (needsFallback) {
    try {
      const { kv: kvInst } = await import('@vercel/kv');
      // Try last 5 trading days
      for (let i = 1; i <= 5; i++) {
        const d = new Date(Date.now() - i * 86400000);
        const iso = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const dow = new Date(d.toLocaleString('en-US',{timeZone:'Asia/Kolkata'})).getDay();
        if (dow === 0 || dow === 6) continue;

        // Get FII data from fiidii KV store
        if (result.fiiNet == null || result.fiiNet === 0) {
          try {
            const raw = await kvInst.get(`fiidii:${iso}`);
            if (raw) {
              const rec = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (rec?.fiiNet != null && rec.fiiNet !== 0) {
                result.fiiNet  = rec.fiiNet;
                result.fiiBuy  = rec.fiiBuy;
                result.fiiSell = rec.fiiSell;
                result.fiiDate = rec.date;
              }
            }
          } catch(_) {}
        }

        // Get MMI data (vix, niftyChange, highs52w etc) from cached MMI
        const cachedMmi = await kvInst.get('mmi_data_v1').catch(()=>null);
        if (cachedMmi) {
          const prev = typeof cachedMmi === 'string' ? JSON.parse(cachedMmi) : cachedMmi;
          if (result.vix == null && prev.vix) result.vix = prev.vix;
          if (result.niftyChange == null && prev.niftyChange) result.niftyChange = prev.niftyChange;
          if (result.ema30 == null && prev.ema30) result.ema30 = prev.ema30;
          if (result.ema90 == null && prev.ema90) result.ema90 = prev.ema90;
          if (result.advancers == null && prev.advancers) result.advancers = prev.advancers;
          if (result.decliners == null && prev.decliners) result.decliners = prev.decliners;
          if (result.highs52w == null && prev.highs52w != null) result.highs52w = prev.highs52w;
          if (result.lows52w == null && prev.lows52w != null) result.lows52w = prev.lows52w;
        }
        break; // only need one day
      }
    } catch(_) {}
  }

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

  // Save to KV as fallback for holidays/weekends
  const hasUsefulData = (result.vix != null || result.niftyChange != null || result.fiiNet != null);
  if (hasUsefulData) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set('mmi_data_v1', JSON.stringify(result), { ex: 7 * 24 * 3600 });
    } catch(_) {}
  }

  return res.json(result);
}
