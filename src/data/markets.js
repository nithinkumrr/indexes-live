// src/data/markets.js — single source of truth for indexes.live

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
  AMERICAS: ['sp500', 'nasdaq', 'dowjones', 'bovespa'],
  MEA:      ['tadawul', 'dfm', 'nifty50', 'sp500'],
  GLOBAL:   ['sp500', 'nifty50', 'ftse', 'nikkei'],
};

export const GLOBAL_PULSE_IDS = ['sp500', 'nifty50', 'nikkei', 'ftse', 'dax', 'shanghai', 'gold', 'crude'];
export const COMMODITY_STRIP_IDS = ['gold', 'crude', 'silver'];

export const MARKETS = [
  { id: 'nifty50',   symbol: '^NSEI',      flag: '🇮🇳', country: 'India',         exchange: 'NSE',           name: 'Nifty 50',       tz: 'Asia/Kolkata',        open: [9,15],  close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 22513, prevClose: 23115 } },
  { id: 'sensex',    symbol: '^BSESN',     flag: '🇮🇳', country: 'India',         exchange: 'BSE',           name: 'Sensex',         tz: 'Asia/Kolkata',        open: [9,15],  close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 74533, prevClose: 76142 } },
  { id: 'banknifty', symbol: '^NSEBANK',   flag: '🇮🇳', country: 'India',         exchange: 'NSE',           name: 'Bank Nifty',     tz: 'Asia/Kolkata',        open: [9,15],  close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 48520, prevClose: 49850 } },
  { id: 'giftnifty', symbol: 'NIFTY_GIFT', flag: '🇮🇳', country: 'India',         exchange: 'NSE IFSC',      name: 'Gift Nifty',     tz: 'Asia/Kolkata',        open: [6,30],  close: [23,30], region: 'Asia',      category: 'index',     fallback: { price: 22480, prevClose: 23100 }, simulation: true, note: 'Pre-market Nifty signal' },
  { id: 'nikkei',    symbol: '^N225',      flag: '🇯🇵', country: 'Japan',         exchange: 'TSE',           name: 'Nikkei 225',     tz: 'Asia/Tokyo',          open: [9,0],   close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 37155, prevClose: 37022 }, lunch: [[11,30],[12,30]] },
  { id: 'hangseng',  symbol: '^HSI',       flag: '🇭🇰', country: 'Hong Kong',     exchange: 'HKEX',          name: 'Hang Seng',      tz: 'Asia/Hong_Kong',      open: [9,30],  close: [16,0],  region: 'Asia',      category: 'index',     fallback: { price: 20956, prevClose: 20800 }, lunch: [[12,0],[13,0]] },
  { id: 'shanghai',  symbol: '000001.SS',  flag: '🇨🇳', country: 'China',         exchange: 'SSE',           name: 'Shanghai Comp.', tz: 'Asia/Shanghai',       open: [9,30],  close: [15,0],  region: 'Asia',      category: 'index',     fallback: { price: 3348,  prevClose: 3320 },  lunch: [[11,30],[13,0]] },
  { id: 'kospi',     symbol: '^KS11',      flag: '🇰🇷', country: 'South Korea',   exchange: 'KRX',           name: 'KOSPI',          tz: 'Asia/Seoul',          open: [9,0],   close: [15,30], region: 'Asia',      category: 'index',     fallback: { price: 2580,  prevClose: 2565 } },
  { id: 'asx200',    symbol: '^AXJO',      flag: '🇦🇺', country: 'Australia',     exchange: 'ASX',           name: 'S&P/ASX 200',    tz: 'Australia/Sydney',    open: [10,0],  close: [16,0],  region: 'Asia',      category: 'index',     fallback: { price: 7820,  prevClose: 7790 } },
  { id: 'sti',       symbol: '^STI',       flag: '🇸🇬', country: 'Singapore',     exchange: 'SGX',           name: 'Straits Times',  tz: 'Asia/Singapore',      open: [9,0],   close: [17,0],  region: 'Asia',      category: 'index',     fallback: { price: 3820,  prevClose: 3805 } },
  { id: 'taiex',     symbol: '^TWII',      flag: '🇹🇼', country: 'Taiwan',        exchange: 'TWSE',          name: 'TAIEX',          tz: 'Asia/Taipei',         open: [9,0],   close: [13,30], region: 'Asia',      category: 'index',     fallback: { price: 21580, prevClose: 21450 } },
  { id: 'jkse',      symbol: '^JKSE',      flag: '🇮🇩', country: 'Indonesia',     exchange: 'IDX',           name: 'Jakarta Comp.',  tz: 'Asia/Jakarta',        open: [9,0],   close: [16,0],  region: 'Asia',      category: 'index',     fallback: { price: 7280,  prevClose: 7255 },  lunch: [[12,0],[13,30]] },
  { id: 'ftse',      symbol: '^FTSE',      flag: '🇬🇧', country: 'United Kingdom',exchange: 'LSE',           name: 'FTSE 100',       tz: 'Europe/London',       open: [8,0],   close: [16,30], region: 'Europe',    category: 'index',     fallback: { price: 8620,  prevClose: 8585 } },
  { id: 'dax',       symbol: '^GDAXI',     flag: '🇩🇪', country: 'Germany',       exchange: 'XETRA',         name: 'DAX 40',         tz: 'Europe/Berlin',       open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 22180, prevClose: 22050 } },
  { id: 'cac40',     symbol: '^FCHI',      flag: '🇫🇷', country: 'France',        exchange: 'Euronext',      name: 'CAC 40',         tz: 'Europe/Paris',        open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 7985,  prevClose: 7940 } },
  { id: 'stoxx50',   symbol: '^STOXX50E',  flag: '🇪🇺', country: 'Eurozone',      exchange: 'Euronext',      name: 'Euro Stoxx 50',  tz: 'Europe/Amsterdam',    open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 5285,  prevClose: 5260 } },
  { id: 'smi',       symbol: '^SSMI',      flag: '🇨🇭', country: 'Switzerland',   exchange: 'SIX',           name: 'SMI',            tz: 'Europe/Zurich',       open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 12180, prevClose: 12140 } },
  { id: 'aex',       symbol: '^AEX',       flag: '🇳🇱', country: 'Netherlands',   exchange: 'Euronext',      name: 'AEX',            tz: 'Europe/Amsterdam',    open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 925,   prevClose: 920 } },
  { id: 'ibex',      symbol: '^IBEX',      flag: '🇪🇸', country: 'Spain',         exchange: 'BME',           name: 'IBEX 35',        tz: 'Europe/Madrid',       open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 12450, prevClose: 12380 } },
  { id: 'ftsemib',   symbol: 'FTSEMIB.MI', flag: '🇮🇹', country: 'Italy',         exchange: 'Borsa Italiana',name: 'FTSE MIB',       tz: 'Europe/Rome',         open: [9,0],   close: [17,30], region: 'Europe',    category: 'index',     fallback: { price: 36800, prevClose: 36600 } },
  { id: 'sp500',     symbol: '^GSPC',      flag: '🇺🇸', country: 'United States', exchange: 'NYSE',          name: 'S&P 500',        tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 5720,  prevClose: 5690 } },
  { id: 'nasdaq',    symbol: '^NDX',       flag: '🇺🇸', country: 'United States', exchange: 'NASDAQ',        name: 'Nasdaq 100',     tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 20245, prevClose: 20100 } },
  { id: 'dowjones',  symbol: '^DJI',       flag: '🇺🇸', country: 'United States', exchange: 'NYSE',          name: 'Dow Jones',      tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 43285, prevClose: 43050 } },
  { id: 'russell',   symbol: '^RUT',       flag: '🇺🇸', country: 'United States', exchange: 'NYSE',          name: 'Russell 2000',   tz: 'America/New_York',    open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 2085,  prevClose: 2072 } },
  { id: 'tsx',       symbol: '^GSPTSE',    flag: '🇨🇦', country: 'Canada',        exchange: 'TSX',           name: 'S&P/TSX',        tz: 'America/Toronto',     open: [9,30],  close: [16,0],  region: 'Americas',  category: 'index',     fallback: { price: 24850, prevClose: 24750 } },
  { id: 'bovespa',   symbol: '^BVSP',      flag: '🇧🇷', country: 'Brazil',        exchange: 'B3',            name: 'Ibovespa',       tz: 'America/Sao_Paulo',   open: [10,0],  close: [17,55], region: 'Americas',  category: 'index',     fallback: { price: 126480,prevClose: 125800 } },
  { id: 'tadawul',   symbol: '^TASI.SR',   flag: '🇸🇦', country: 'Saudi Arabia',  exchange: 'Tadawul',       name: 'Tadawul (TASI)', tz: 'Asia/Riyadh',         open: [10,0],  close: [15,0],  region: 'MEA',       category: 'index',     fallback: { price: 12500, prevClose: 12440 } },
  { id: 'dfm',       symbol: '^DFMGI',     flag: '🇦🇪', country: 'UAE',           exchange: 'DFM',           name: 'DFM General',    tz: 'Asia/Dubai',          open: [10,0],  close: [14,48], region: 'MEA',       category: 'index',     fallback: { price: 4680,  prevClose: 4655 } },
  { id: 'jse',       symbol: '^JN0U.JO',   flag: '🇿🇦', country: 'South Africa',  exchange: 'JSE',           name: 'JSE Top 40',     tz: 'Africa/Johannesburg', open: [9,0],   close: [17,0],  region: 'MEA',       category: 'index',     fallback: { price: 81200, prevClose: 80850 } },
  { id: 'gold',      symbol: 'GC=F',       flag: '🟡',  country: 'Global',        exchange: 'COMEX',         name: 'Gold',           tz: 'America/New_York',    open: [18,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/oz',   fallback: { price: 3022,  prevClose: 2980 } },
  { id: 'silver',    symbol: 'SI=F',       flag: '⚪',  country: 'Global',        exchange: 'COMEX',         name: 'Silver',         tz: 'America/New_York',    open: [18,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/oz',   fallback: { price: 33.5,  prevClose: 32.8 } },
  { id: 'crude',     symbol: 'CL=F',       flag: '🛢️',  country: 'Global',        exchange: 'NYMEX',         name: 'Crude Oil',      tz: 'America/New_York',    open: [18,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/bbl',  fallback: { price: 68.4,  prevClose: 69.1 } },
  { id: 'natgas',    symbol: 'NG=F',       flag: '🔥',  country: 'Global',        exchange: 'NYMEX',         name: 'Natural Gas',    tz: 'America/New_York',    open: [18,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/mmBtu',fallback: { price: 3.85,  prevClose: 3.72 } },
  { id: 'copper',    symbol: 'HG=F',       flag: '🟤',  country: 'Global',        exchange: 'COMEX',         name: 'Copper',         tz: 'America/New_York',    open: [18,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/lb',   fallback: { price: 4.52,  prevClose: 4.45 } },
  { id: 'aluminium', symbol: 'ALI=F',      flag: '🔩',  country: 'Global',        exchange: 'COMEX',         name: 'Aluminium',      tz: 'America/New_York',    open: [18,0],  close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/lb',   fallback: { price: 1.12,  prevClose: 1.10 } },
  { id: 'zinc',      symbol: 'ZNC=F',      flag: '🔷',  country: 'Global',        exchange: 'LME',           name: 'Zinc',           tz: 'Europe/London',       open: [8,0],   close: [17,0],  region: 'Commodity', category: 'commodity', unit: 'USD/t',    fallback: { price: 2820,  prevClose: 2790 } },
  { id: 'cotton',    symbol: 'CT=F',       flag: '🌿',  country: 'Global',        exchange: 'ICE',           name: 'Cotton',         tz: 'America/New_York',    open: [9,0],   close: [14,20], region: 'Commodity', category: 'commodity', unit: 'USD/lb',   fallback: { price: 0.68,  prevClose: 0.67 } },
];

export const WORLD_CLOCKS = [
  { city: 'MUMBAI',    tz: 'Asia/Kolkata',    label: 'IST',     primary: true },
  { city: 'TOKYO',     tz: 'Asia/Tokyo',      label: 'JST' },
  { city: 'SINGAPORE', tz: 'Asia/Singapore',  label: 'SGT' },
  { city: 'DUBAI',     tz: 'Asia/Dubai',      label: 'GST' },
  { city: 'LONDON',    tz: 'Europe/London',   label: 'GMT/BST' },
  { city: 'FRANKFURT', tz: 'Europe/Berlin',   label: 'CET' },
  { city: 'NEW YORK',  tz: 'America/New_York',label: 'EST/EDT' },
];

export const ALERT_EVENTS = [
  { id: 'mcx-open',  label: 'MCX Opens',  hIST: 9,  mIST: 0  },
  { id: 'nse-open',  label: 'NSE Opens',  hIST: 9,  mIST: 15 },
  { id: 'nse-close', label: 'NSE Closes', hIST: 15, mIST: 30 },
  { id: 'us-open',   label: 'US Opens',   hIST: 19, mIST: 0  },
  { id: 'us-close',  label: 'US Closes',  hIST: 1,  mIST: 30 },
];
