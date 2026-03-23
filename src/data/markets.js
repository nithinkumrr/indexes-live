// src/data/markets.js
// Single source of truth for all markets on indexes.live

export const MARKETS = [
  // ─── INDIA (hero — always shown first & large) ───────────────────────
  {
    id: 'nifty50', symbol: '^NSEI',
    flag: '🇮🇳', country: 'India', exchange: 'NSE', name: 'Nifty 50',
    tz: 'Asia/Kolkata', open: [9, 15], close: [15, 30],
    region: 'Asia', hero: true,
    fallback: { price: 22485, prevClose: 22388 },
  },
  {
    id: 'sensex', symbol: '^BSESN',
    flag: '🇮🇳', country: 'India', exchange: 'BSE', name: 'Sensex',
    tz: 'Asia/Kolkata', open: [9, 15], close: [15, 30],
    region: 'Asia', hero: true,
    fallback: { price: 74120, prevClose: 73880 },
  },

  // ─── ASIA PACIFIC ──────────────────────────────────────────────────────
  {
    id: 'nikkei', symbol: '^N225',
    flag: '🇯🇵', country: 'Japan', exchange: 'TSE', name: 'Nikkei 225',
    tz: 'Asia/Tokyo', open: [9, 0], close: [15, 30], lunch: [[11, 30], [12, 30]],
    region: 'Asia',
    fallback: { price: 37155, prevClose: 37022 },
  },
  {
    id: 'hangseng', symbol: '^HSI',
    flag: '🇭🇰', country: 'Hong Kong', exchange: 'HKEX', name: 'Hang Seng',
    tz: 'Asia/Hong_Kong', open: [9, 30], close: [16, 0], lunch: [[12, 0], [13, 0]],
    region: 'Asia',
    fallback: { price: 20956, prevClose: 20800 },
  },
  {
    id: 'shanghai', symbol: '000001.SS',
    flag: '🇨🇳', country: 'China', exchange: 'SSE', name: 'Shanghai Comp.',
    tz: 'Asia/Shanghai', open: [9, 30], close: [15, 0], lunch: [[11, 30], [13, 0]],
    region: 'Asia',
    fallback: { price: 3348, prevClose: 3320 },
  },
  {
    id: 'kospi', symbol: '^KS11',
    flag: '🇰🇷', country: 'South Korea', exchange: 'KRX', name: 'KOSPI',
    tz: 'Asia/Seoul', open: [9, 0], close: [15, 30],
    region: 'Asia',
    fallback: { price: 2580, prevClose: 2565 },
  },
  {
    id: 'asx200', symbol: '^AXJO',
    flag: '🇦🇺', country: 'Australia', exchange: 'ASX', name: 'S&P/ASX 200',
    tz: 'Australia/Sydney', open: [10, 0], close: [16, 0],
    region: 'Asia',
    fallback: { price: 7820, prevClose: 7790 },
  },
  {
    id: 'sti', symbol: '^STI',
    flag: '🇸🇬', country: 'Singapore', exchange: 'SGX', name: 'Straits Times',
    tz: 'Asia/Singapore', open: [9, 0], close: [17, 0],
    region: 'Asia',
    fallback: { price: 3820, prevClose: 3805 },
  },
  {
    id: 'taiex', symbol: '^TWII',
    flag: '🇹🇼', country: 'Taiwan', exchange: 'TWSE', name: 'TAIEX',
    tz: 'Asia/Taipei', open: [9, 0], close: [13, 30],
    region: 'Asia',
    fallback: { price: 21580, prevClose: 21450 },
  },
  {
    id: 'jkse', symbol: '^JKSE',
    flag: '🇮🇩', country: 'Indonesia', exchange: 'IDX', name: 'Jakarta Comp.',
    tz: 'Asia/Jakarta', open: [9, 0], close: [16, 0], lunch: [[12, 0], [13, 30]],
    region: 'Asia',
    fallback: { price: 7280, prevClose: 7255 },
  },

  // ─── EUROPE ────────────────────────────────────────────────────────────
  {
    id: 'ftse', symbol: '^FTSE',
    flag: '🇬🇧', country: 'United Kingdom', exchange: 'LSE', name: 'FTSE 100',
    tz: 'Europe/London', open: [8, 0], close: [16, 30],
    region: 'Europe',
    fallback: { price: 8620, prevClose: 8585 },
  },
  {
    id: 'dax', symbol: '^GDAXI',
    flag: '🇩🇪', country: 'Germany', exchange: 'XETRA', name: 'DAX 40',
    tz: 'Europe/Berlin', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 22180, prevClose: 22050 },
  },
  {
    id: 'cac40', symbol: '^FCHI',
    flag: '🇫🇷', country: 'France', exchange: 'Euronext', name: 'CAC 40',
    tz: 'Europe/Paris', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 7985, prevClose: 7940 },
  },
  {
    id: 'stoxx50', symbol: '^STOXX50E',
    flag: '🇪🇺', country: 'Eurozone', exchange: 'Euronext', name: 'Euro Stoxx 50',
    tz: 'Europe/Amsterdam', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 5285, prevClose: 5260 },
  },
  {
    id: 'smi', symbol: '^SSMI',
    flag: '🇨🇭', country: 'Switzerland', exchange: 'SIX', name: 'SMI',
    tz: 'Europe/Zurich', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 12180, prevClose: 12140 },
  },
  {
    id: 'aex', symbol: '^AEX',
    flag: '🇳🇱', country: 'Netherlands', exchange: 'Euronext', name: 'AEX',
    tz: 'Europe/Amsterdam', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 925, prevClose: 920 },
  },
  {
    id: 'ibex', symbol: '^IBEX',
    flag: '🇪🇸', country: 'Spain', exchange: 'BME', name: 'IBEX 35',
    tz: 'Europe/Madrid', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 12450, prevClose: 12380 },
  },
  {
    id: 'ftsemib', symbol: 'FTSEMIB.MI',
    flag: '🇮🇹', country: 'Italy', exchange: 'Borsa Italiana', name: 'FTSE MIB',
    tz: 'Europe/Rome', open: [9, 0], close: [17, 30],
    region: 'Europe',
    fallback: { price: 36800, prevClose: 36600 },
  },

  // ─── AMERICAS ──────────────────────────────────────────────────────────
  {
    id: 'sp500', symbol: '^GSPC',
    flag: '🇺🇸', country: 'United States', exchange: 'NYSE', name: 'S&P 500',
    tz: 'America/New_York', open: [9, 30], close: [16, 0],
    region: 'Americas',
    fallback: { price: 5720, prevClose: 5690 },
  },
  {
    id: 'nasdaq', symbol: '^NDX',
    flag: '🇺🇸', country: 'United States', exchange: 'NASDAQ', name: 'Nasdaq 100',
    tz: 'America/New_York', open: [9, 30], close: [16, 0],
    region: 'Americas',
    fallback: { price: 20245, prevClose: 20100 },
  },
  {
    id: 'dowjones', symbol: '^DJI',
    flag: '🇺🇸', country: 'United States', exchange: 'NYSE', name: 'Dow Jones',
    tz: 'America/New_York', open: [9, 30], close: [16, 0],
    region: 'Americas',
    fallback: { price: 43285, prevClose: 43050 },
  },
  {
    id: 'russell', symbol: '^RUT',
    flag: '🇺🇸', country: 'United States', exchange: 'NYSE', name: 'Russell 2000',
    tz: 'America/New_York', open: [9, 30], close: [16, 0],
    region: 'Americas',
    fallback: { price: 2085, prevClose: 2072 },
  },
  {
    id: 'tsx', symbol: '^GSPTSE',
    flag: '🇨🇦', country: 'Canada', exchange: 'TSX', name: 'S&P/TSX',
    tz: 'America/Toronto', open: [9, 30], close: [16, 0],
    region: 'Americas',
    fallback: { price: 24850, prevClose: 24750 },
  },
  {
    id: 'bovespa', symbol: '^BVSP',
    flag: '🇧🇷', country: 'Brazil', exchange: 'B3', name: 'Ibovespa',
    tz: 'America/Sao_Paulo', open: [10, 0], close: [17, 55],
    region: 'Americas',
    fallback: { price: 126480, prevClose: 125800 },
  },
  {
    id: 'ipc', symbol: '^MXX',
    flag: '🇲🇽', country: 'Mexico', exchange: 'BMV', name: 'IPC Mexico',
    tz: 'America/Mexico_City', open: [8, 30], close: [15, 0],
    region: 'Americas',
    fallback: { price: 53200, prevClose: 52950 },
  },

  // ─── MIDDLE EAST & AFRICA ─────────────────────────────────────────────
  {
    id: 'tadawul', symbol: '^TASI.SR',
    flag: '🇸🇦', country: 'Saudi Arabia', exchange: 'Tadawul', name: 'Tadawul (TASI)',
    tz: 'Asia/Riyadh', open: [10, 0], close: [15, 0],
    region: 'MEA',
    fallback: { price: 12500, prevClose: 12440 },
  },
  {
    id: 'dfm', symbol: '^DFMGI',
    flag: '🇦🇪', country: 'UAE', exchange: 'DFM', name: 'DFM General',
    tz: 'Asia/Dubai', open: [10, 0], close: [14, 48],
    region: 'MEA',
    fallback: { price: 4680, prevClose: 4655 },
  },
  {
    id: 'ta125', symbol: '^TA125.TA',
    flag: '🇮🇱', country: 'Israel', exchange: 'TASE', name: 'TA-125',
    tz: 'Asia/Jerusalem', open: [9, 59], close: [17, 15],
    region: 'MEA',
    fallback: { price: 2150, prevClose: 2140 },
  },
  {
    id: 'jse', symbol: '^JN0U.JO',
    flag: '🇿🇦', country: 'South Africa', exchange: 'JSE', name: 'JSE Top 40',
    tz: 'Africa/Johannesburg', open: [9, 0], close: [17, 0],
    region: 'MEA',
    fallback: { price: 81200, prevClose: 80850 },
  },
  {
    id: 'egx30', symbol: '^CASE30',
    flag: '🇪🇬', country: 'Egypt', exchange: 'EGX', name: 'EGX 30',
    tz: 'Africa/Cairo', open: [10, 0], close: [14, 30],
    region: 'MEA',
    fallback: { price: 30450, prevClose: 30200 },
  },
  {
    id: 'nikkei225futures', symbol: 'NKD=F',
    flag: '🇯🇵', country: 'Japan', exchange: 'CME', name: 'Nikkei Futures',
    tz: 'America/New_York', open: [18, 0], close: [17, 0],
    region: 'Asia', futures: true,
    fallback: { price: 37200, prevClose: 37100 },
  },
];

export const WORLD_CLOCKS = [
  { city: 'MUMBAI', tz: 'Asia/Kolkata', label: 'IST', primary: true },
  { city: 'TOKYO', tz: 'Asia/Tokyo', label: 'JST' },
  { city: 'SINGAPORE', tz: 'Asia/Singapore', label: 'SGT' },
  { city: 'DUBAI', tz: 'Asia/Dubai', label: 'GST' },
  { city: 'LONDON', tz: 'Europe/London', label: 'GMT/BST' },
  { city: 'FRANKFURT', tz: 'Europe/Berlin', label: 'CET' },
  { city: 'NEW YORK', tz: 'America/New_York', label: 'EST/EDT' },
];
