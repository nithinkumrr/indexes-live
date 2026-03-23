// src/data/markets.js

export function detectRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return 'GLOBAL';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'INDIA';
    if (['America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
         'America/Phoenix','America/Anchorage','Pacific/Honolulu'].includes(tz)) return 'US';
    if (tz.startsWith('Europe/')) return 'EUROPE';
    if (tz === 'Asia/Tokyo') return 'JAPAN';
    if (tz === 'Asia/Shanghai' || tz === 'Asia/Hong_Kong') return 'CHINA';
    if (tz.startsWith('Asia/')) return 'ASIA';
    if (tz.startsWith('America/')) return 'AMERICAS';
    if (tz.startsWith('Africa/') || tz === 'Asia/Dubai' || tz === 'Asia/Riyadh') return 'MEA';
  } catch { /**/ }
  return 'GLOBAL';
}

export const HERO_BY_REGION = {
  INDIA:    ['nifty50', 'sensex', 'banknifty', 'giftnifty'],
  US:       ['sp500', 'nasdaq', 'dowjones', 'russell'],
  EUROPE:   ['ftse', 'dax', 'cac40', 'stoxx50'],
  JAPAN:    ['nikkei', 'sp500', 'nifty50', 'ftse'],
  CHINA:    ['shanghai', 'hangseng', 'nikkei', 'sp500'],
  ASIA:     ['nifty50', 'nikkei', 'hangseng', 'asx200'],
  AMERICAS: ['sp500', 'nasdaq', 'bovespa', 'tsx'],
  MEA:      ['tadawul', 'dfm', 'nifty50', 'sp500'],
  GLOBAL:   ['sp500', 'nifty50', 'ftse', 'nikkei'],
};

export const WORLD_BENCHMARK_IDS = ['sp500', 'nasdaq', 'nikkei', 'ftse', 'dax', 'shanghai', 'vix', 'us10y'];
export const COMMODITY_STRIP_IDS = ['gold', 'silver', 'crude', 'natgas', 'copper'];
export const CURRENCY_STRIP_IDS  = ['usdinr', 'dxy', 'eurusd', 'gbpusd', 'usdjpy', 'usdcny'];
export const CRYPTO_IDS          = ['btcusd', 'ethusd', 'solusd', 'bnbusd'];

export const MARKETS = [
  { id: 'nifty50',   symbol: '^NSEI',      flag: '🇮🇳', country: 'India',          exchange: 'NSE',           name: 'Nifty 50',        tz: 'Asia/Kolkata',        open: [9,15],  close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 22513, prevClose: 23115 } },
  { id: 'sensex',    symbol: '^BSESN',     flag: '🇮🇳', country: 'India',          exchange: 'BSE',           name: 'Sensex',          tz: 'Asia/Kolkata',        open: [9,15],  close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 74533, prevClose: 76142 } },
  { id: 'banknifty', symbol: '^NSEBANK',   flag: '🇮🇳', country: 'India',          exchange: 'NSE',           name: 'Bank Nifty',      tz: 'Asia/Kolkata',        open: [9,15],  close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 48520, prevClose: 49850 } },
  { id: 'giftnifty', symbol: 'NIFTY_GIFT', flag: '🇮🇳', country: 'India',          exchange: 'NSE IFSC',      name: 'Gift Nifty',      tz: 'Asia/Kolkata',        open: [6,30],  close: [23,30], region: 'Asia',      category: 'index',     fallback: { price: 22480, prevClose: 23100 }, note: 'Pre-market signal', giftCard: true },
  { id: 'nikkei',    symbol: '^N225',      flag: '🇯🇵', country: 'Japan',          exchange: 'TSE',           name: 'Nikkei 225',      tz: 'Asia/Tokyo',          open: [9,0],   close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 37155, prevClose: 37022 }, lunch: [[11,30],[12,30]] },
  { id: 'hangseng',  symbol: '^HSI',       flag: '🇭🇰', country: 'Hong Kong',      exchange: 'HKEX',          name: 'Hang Seng',       tz: 'Asia/Hong_Kong',      open: [9,30],  close: [16,0],  region: 'Asia',      category: 'index',     fallback: { price: 20956, prevClose: 20800 }, lunch: [[12,0],[13,0]] },
  { id: 'shanghai',  symbol: '000001.SS',  flag: '🇨🇳', country: 'China',          exchange: 'SSE',           name: 'Shanghai Comp.',  tz: 'Asia/Shanghai',       open: [9,30],  close: [15,0],  region: 'Asia',      category: 'index',     fallback: { price: 3348,  prevClose: 3320  }, lunch: [[11,30],[13,0]] },
  { id: 'kospi',     symbol: '^KS11',      flag: '🇰🇷', country: 'South Korea',    exchange: 'KRX',           name: 'KOSPI',           tz: 'Asia/Seoul',          open: [9,0],   close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 2580,  prevClose: 2565  } },
  { id: 'asx200',    symbol: '^AXJO',      flag: '🇦🇺', country: 'Australia',      exchange: 'ASX',           name: 'S&P/ASX 200',     tz: 'Australia/Sydney',    open: [10,0],  close: [16,0],  region: 'Asia',      category: 'index',     fallback: { price: 7820,  prevClose: 7790  } },
  { id: 'sti',       symbol: '^STI',       flag: '🇸🇬', country: 'Singapore',      exchange: 'SGX',           name: 'Straits Times',   tz: 'Asia/Singapore',      open: [9,0],   close: [17,0],  region: 'Asia',      category: 'index',     fallback: { price: 3820,  prevClose: 3805  } },
  { id: 'taiex',     symbol: '^TWII',      flag: '🇹🇼', country: 'Taiwan',         exchange: 'TWSE',          name: 'TAIEX',           tz: 'Asia/Taipei',         open: [9,0],   close: [13,30], region: 'Asia',      category: 'index',     fallback: { price: 21580, prevClose: 21450 } },
  { id: 'jkse',      symbol: '^JKSE',      flag: '🇮🇩', country: 'Indonesia',      exchange: 'IDX',           name: 'Jakarta Comp.',   tz: 'Asia/Jakarta',        open: [9,0],   close: [16,0],  region: 'Asia',      category: 'index',     fallback: { price: 7280,  prevClose: 7255  }, lunch: [[12,0],[13,30]] },
  { id: 'ftse',      symbol: '^FTSE',      flag: '🇬🇧', country: 'United Kingdom', exchange: 'LSE',           name: 'FTSE 100',        tz: 'Europe/London',       open: [8,0],   close: [16,30], region: 'Europe',    category: 'index',     fallback: { price: 8620,  prevClose: 8585  } },
  { id: 'dax',       symbol: '^GDAXI',     flag: '🇩🇪', country: 'Germany',        exchange: 'XETRA',         name: 'DAX 40',          tz: 'Europe/Berlin',       open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 22180, prevClose: 22050 } },
  { id: 'cac40',     symbol: '^FCHI',      flag: '🇫🇷', country: 'France',         exchange: 'Euronext',      name: 'CAC 40',          tz: 'Europe/Paris',        open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 7985,  prevClose: 7940  } },
  { id: 'stoxx50',   symbol: '^STOXX50E',  flag: '🇪🇺', country: 'Eurozone',       exchange: 'Euronext',      name: 'Euro Stoxx 50',   tz: 'Europe/Amsterdam',    open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 5285,  prevClose: 5260  } },
  { id: 'smi',       symbol: '^SSMI',      flag: '🇨🇭', country: 'Switzerland',    exchange: 'SIX',           name: 'SMI',             tz: 'Europe/Zurich',       open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 12180, prevClose: 12140 } },
  { id: 'aex',       symbol: '^AEX',       flag: '🇳🇱', country: 'Netherlands',    exchange: 'Euronext',      name: 'AEX',             tz: 'Europe/Amsterdam',    open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 925,   prevClose: 920   } },
  { id: 'ibex',      symbol: '^IBEX',      flag: '🇪🇸', country: 'Spain',          exchange: 'BME',           name: 'IBEX 35',         tz: 'Europe/Madrid',       open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 12450, prevClose: 12380 } },
  { id: 'ftsemib',   symbol: 'FTSEMIB.MI', flag: '🇮🇹', country: 'Italy',          exchange: 'Borsa Italiana',name: 'FTSE MIB',        tz: 'Europe/Rome',         open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 36800, prevClose: 36600 } },
  { id: 'sp500',     symbol: '^GSPC',      flag: '🇺🇸', country: 'United States',  exchange: 'NYSE',          name: 'S&P 500',         tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 5720,  prevClose: 5690  } },
  { id: 'nasdaq',    symbol: '^NDX',       flag: '🇺🇸', country: 'United States',  exchange: 'NASDAQ',        name: 'Nasdaq 100',      tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 20245, prevClose: 20100 } },
  { id: 'dowjones',  symbol: '^DJI',       flag: '🇺🇸', country: 'United States',  exchange: 'NYSE',          name: 'Dow Jones',       tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 43285, prevClose: 43050 } },
  { id: 'russell',   symbol: '^RUT',       flag: '🇺🇸', country: 'United States',  exchange: 'NYSE',          name: 'Russell 2000',    tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 2085,  prevClose: 2072  } },
  { id: 'tsx',       symbol: '^GSPTSE',    flag: '🇨🇦', country: 'Canada',         exchange: 'TSX',           name: 'S&P/TSX',         tz: 'America/Toronto',     open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 24850, prevClose: 24750 } },
  { id: 'bovespa',   symbol: '^BVSP',      flag: '🇧🇷', country: 'Brazil',         exchange: 'B3',            name: 'Ibovespa',        tz: 'America/Sao_Paulo',   open: [10,0],  close: [17,55], region: 'Americas',  category: 'index',     fallback: { price: 126480,prevClose: 125800} },
  { id: 'tadawul',   symbol: '^TASI.SR',   flag: '🇸🇦', country: 'Saudi Arabia',   exchange: 'Tadawul',       name: 'Tadawul (TASI)',  tz: 'Asia/Riyadh',         open: [10,0],  close: [15,0],  region: 'MEA',       category: 'index',     fallback: { price: 12500, prevClose: 12440 } },
  { id: 'dfm',       symbol: '^DFMGI',     flag: '🇦🇪', country: 'UAE — Dubai',    exchange: 'DFM',           name: 'DFM General',     tz: 'Asia/Dubai',          open: [10,0],  close: [14,48], region: 'MEA',       category: 'index',     fallback: { price: 4680,  prevClose: 4655  } },
  { id: 'adx',       symbol: 'FADGI.FGI',   flag: '🇦🇪', country: 'UAE — Abu Dhabi',exchange: 'ADX',           name: 'ADX General',     tz: 'Asia/Dubai',          open: [10,0],  close: [14,45], region: 'MEA',       category: 'index',     fallback: { price: 9380,  prevClose: 9350  } },
  { id: 'jse',       symbol: '^J200.JO',   flag: '🇿🇦', country: 'South Africa',   exchange: 'JSE',           name: 'JSE Top 40',      tz: 'Africa/Johannesburg', open: [9,0],   close: [17,0],  region: 'MEA',       category: 'index',     fallback: { price: 81200, prevClose: 80850 } },
  { id: 'qse',       symbol: '^QEAS.QA',       flag: '🇶🇦', country: 'Qatar',          exchange: 'QSE',           name: 'QE All Share',    tz: 'Asia/Qatar',          open: [9,0],   close: [13,15], region: 'MEA',       category: 'index',     fallback: { price: 11250, prevClose: 11200 } },
  { id: 'kwse',      symbol: '^BKM50.KW',      flag: '🇰🇼', country: 'Kuwait',         exchange: 'Boursa',        name: 'Kuwait BK Main 50', tz: 'Asia/Kuwait',        open: [9,30],  close: [12,30], region: 'MEA',       category: 'index',     fallback: { price: 7820,  prevClose: 7795  } },
  { id: 'egx30',     symbol: '^CASE30',    flag: '🇪🇬', country: 'Egypt',          exchange: 'EGX',           name: 'EGX 30',          tz: 'Africa/Cairo',        open: [10,0],  close: [14,30], region: 'MEA',       category: 'index',     fallback: { price: 30450, prevClose: 30200 } },
  { id: 'ta125',     symbol: '^TA125.TA',  flag: '🇮🇱', country: 'Israel',         exchange: 'TASE',          name: 'TA-125',          tz: 'Asia/Jerusalem',      open: [9,59],  close: [17,15], region: 'MEA',       category: 'index',     fallback: { price: 2280,  prevClose: 2265  } },
  { id: 'gold',      symbol: 'GC=F',  flag: '🟡', country: 'Global', exchange: 'COMEX', name: 'Gold',        tz: 'America/New_York', open: [18,0], close: [17,0], region: 'Commodity', category: 'commodity', unit: 'USD/oz',    fallback: { price: 3022, prevClose: 2980 } },
  { id: 'silver',    symbol: 'SI=F',  flag: '⚪', country: 'Global', exchange: 'COMEX', name: 'Silver',      tz: 'America/New_York', open: [18,0], close: [17,0], region: 'Commodity', category: 'commodity', unit: 'USD/oz',    fallback: { price: 33.5, prevClose: 32.8 } },
  { id: 'crude',     symbol: 'CL=F',  flag: '🛢️', country: 'Global', exchange: 'NYMEX', name: 'Crude Oil',   tz: 'America/New_York', open: [18,0], close: [17,0], region: 'Commodity', category: 'commodity', unit: 'USD/bbl',   fallback: { price: 68.4, prevClose: 69.1 } },
  { id: 'natgas',    symbol: 'NG=F',  flag: '🔥', country: 'Global', exchange: 'NYMEX', name: 'Natural Gas', tz: 'America/New_York', open: [18,0], close: [17,0], region: 'Commodity', category: 'commodity', unit: 'USD/mmBtu', fallback: { price: 3.85, prevClose: 3.72 } },
  { id: 'copper',    symbol: 'HG=F',  flag: '🟤', country: 'Global', exchange: 'COMEX', name: 'Copper',      tz: 'America/New_York', open: [18,0], close: [17,0], region: 'Commodity', category: 'commodity', unit: 'USD/lb',    fallback: { price: 4.52, prevClose: 4.45 } },
  { id: 'aluminium', symbol: 'ALI=F', flag: '🔩', country: 'Global', exchange: 'COMEX', name: 'Aluminium',   tz: 'America/New_York', open: [18,0], close: [17,0], region: 'Commodity', category: 'commodity', unit: 'USD/lb',    fallback: { price: 1.12, prevClose: 1.10 } },
  { id: 'zinc',      symbol: 'ZNC=F', flag: '🔷', country: 'Global', exchange: 'LME',   name: 'Zinc',        tz: 'Europe/London',    open: [8,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/t',     fallback: { price: 2820, prevClose: 2790 } },
  { id: 'cotton',    symbol: 'CT=F',  flag: '🌿', country: 'Global', exchange: 'ICE',   name: 'Cotton',      tz: 'America/New_York', open: [9,0],  close: [14,20], region: 'Commodity', category: 'commodity', unit: 'USD/lb',    fallback: { price: 0.68, prevClose: 0.67 } },
  { id: 'usdinr',  symbol: 'INR=X',    flag: '🇮🇳', country: 'India',  exchange: 'FX',     name: 'USD/INR',  tz: 'America/New_York', open: [17,0], close: [17,0], region: 'Currency', category: 'currency', unit: '₹',     fallback: { price: 84.52, prevClose: 84.10 } },
  { id: 'dxy',     symbol: 'DX-Y.NYB', flag: '🇺🇸', country: 'Global', exchange: 'ICE',    name: 'DXY',      tz: 'America/New_York', open: [17,0], close: [17,0], region: 'Currency', category: 'currency', unit: 'Index', fallback: { price: 104.2, prevClose: 103.8 } },
  { id: 'eurusd',  symbol: 'EURUSD=X', flag: '🇪🇺', country: 'Global', exchange: 'FX',     name: 'EUR/USD',  tz: 'America/New_York', open: [17,0], close: [17,0], region: 'Currency', category: 'currency', unit: 'USD',   fallback: { price: 1.082, prevClose: 1.079 } },
  { id: 'gbpusd',  symbol: 'GBPUSD=X', flag: '🇬🇧', country: 'Global', exchange: 'FX',     name: 'GBP/USD',  tz: 'America/New_York', open: [17,0], close: [17,0], region: 'Currency', category: 'currency', unit: 'USD',   fallback: { price: 1.262, prevClose: 1.258 } },
  { id: 'usdjpy',  symbol: 'JPY=X',    flag: '🇯🇵', country: 'Global', exchange: 'FX',     name: 'USD/JPY',  tz: 'America/New_York', open: [17,0], close: [17,0], region: 'Currency', category: 'currency', unit: '¥',     fallback: { price: 149.8, prevClose: 150.2 } },
  { id: 'usdcny',  symbol: 'CNY=X',    flag: '🇨🇳', country: 'Global', exchange: 'FX',     name: 'USD/CNY',  tz: 'America/New_York', open: [17,0], close: [17,0], region: 'Currency', category: 'currency', unit: '¥',     fallback: { price: 7.24,  prevClose: 7.22  } },
  { id: 'btcusd',  symbol: 'BTC-USD',  flag: '₿',   country: 'Global', exchange: 'Crypto', name: 'Bitcoin',  tz: 'America/New_York', open: [0,0],  close: [23,59], region: 'Crypto', category: 'crypto', unit: 'USD', fallback: { price: 67450, prevClose: 66800 } },
  { id: 'ethusd',  symbol: 'ETH-USD',  flag: '⟠',   country: 'Global', exchange: 'Crypto', name: 'Ethereum', tz: 'America/New_York', open: [0,0],  close: [23,59], region: 'Crypto', category: 'crypto', unit: 'USD', fallback: { price: 3285,  prevClose: 3210  } },
  { id: 'solusd',  symbol: 'SOL-USD',  flag: '◎',   country: 'Global', exchange: 'Crypto', name: 'Solana',   tz: 'America/New_York', open: [0,0],  close: [23,59], region: 'Crypto', category: 'crypto', unit: 'USD', fallback: { price: 148.2, prevClose: 144.5 } },
  { id: 'bnbusd',  symbol: 'BNB-USD',  flag: '🔶',  country: 'Global', exchange: 'Crypto', name: 'BNB',      tz: 'America/New_York', open: [0,0],  close: [23,59], region: 'Crypto', category: 'crypto', unit: 'USD', fallback: { price: 412.0, prevClose: 405.0 } },
  { id: 'vix',   symbol: '^VIX', flag: '⚡', country: 'Global', exchange: 'CBOE', name: 'VIX',          tz: 'America/New_York', open: [9,30], close: [16,15], region: 'Benchmark', category: 'benchmark', unit: 'Fear Index', fallback: { price: 18.4, prevClose: 17.2 } },
  { id: 'us10y', symbol: '^TNX', flag: '🏦', country: 'USA',    exchange: 'CBOE', name: 'US 10Y Yield', tz: 'America/New_York', open: [8,0],  close: [17,0],  region: 'Benchmark', category: 'benchmark', unit: '%',          fallback: { price: 4.38, prevClose: 4.42 } },
];

// 7 clocks — trader order: Mumbai anchor, then follow the sun
export const WORLD_CLOCKS = [
  // Core 8 — always visible, ordered by trading session
  { city: 'MUMBAI',    tz: 'Asia/Kolkata',        label: 'IST',  primary: true },
  { city: 'TOKYO',     tz: 'Asia/Tokyo',           label: 'JST'  },
  { city: 'HONG KONG', tz: 'Asia/Hong_Kong',       label: 'HKT'  },
  { city: 'SINGAPORE', tz: 'Asia/Singapore',       label: 'SGT'  },
  { city: 'DUBAI',     tz: 'Asia/Dubai',           label: 'GST'  },
  { city: 'LONDON',    tz: 'Europe/London',        label: 'GMT'  },
  { city: 'FRANKFURT', tz: 'Europe/Berlin',        label: 'CET'  },
  { city: 'NEW YORK',  tz: 'America/New_York',     label: 'EST'  },
  // Secondary — scroll right
  { city: 'SYDNEY',    tz: 'Australia/Sydney',     label: 'AEDT' },
  { city: 'SEOUL',     tz: 'Asia/Seoul',           label: 'KST'  },
  { city: 'RIYADH',    tz: 'Asia/Riyadh',          label: 'AST'  },
  { city: 'TORONTO',   tz: 'America/Toronto',      label: 'EST'  },
  { city: 'SÃO PAULO', tz: 'America/Sao_Paulo',    label: 'BRT'  },
];

export const ALERT_EVENTS = [
  { id: 'mcx-open',  label: 'MCX Opens',  hIST: 9,  mIST: 0  },
  { id: 'nse-open',  label: 'NSE Opens',  hIST: 9,  mIST: 15 },
  { id: 'nse-close', label: 'NSE Closes', hIST: 15, mIST: 30 },
  { id: 'us-open',   label: 'US Opens',   hIST: 19, mIST: 0  },
  { id: 'us-close',  label: 'US Closes',  hIST: 1,  mIST: 30 },
];
