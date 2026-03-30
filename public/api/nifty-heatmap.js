// api/nifty-heatmap.js
// Returns Nifty 50 or Bank Nifty constituent stocks with price/change data
// Uses NSE equity-stockIndices endpoint
// ?index=nifty50 or ?index=banknifty

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  const index = req.query?.index === 'banknifty' ? 'NIFTY BANK' : 'NIFTY 50';
  const UA    = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

  // Sector map for Nifty 50 stocks
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

  // Weight map (free-float market cap proxy)
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

  // Bank Nifty sector map
  const BN_SECTOR_MAP = {
    'HDFCBANK':'Private Banks','ICICIBANK':'Private Banks','KOTAKBANK':'Private Banks',
    'AXISBANK':'Private Banks','INDUSINDBK':'Private Banks','BANDHANBNK':'Private Banks',
    'FEDERALBNK':'Private Banks','IDFCFIRSTB':'Private Banks','RBLBANK':'Private Banks',
    'SBIN':'PSU Banks','BANKBARODA':'PSU Banks','PNB':'PSU Banks','CANBK':'PSU Banks',
    'UNIONBANK':'PSU Banks','INDIANB':'PSU Banks',
    'BAJFINANCE':'NBFCs','BAJAJFINSV':'NBFCs','SHRIRAMFIN':'NBFCs',
  };

  try {
    // Get NSE cookies
    let cookies = '';
    const home = await fetch('https://www.nseindia.com', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    cookies = (home.headers.get('set-cookie')||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');

    const H = { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/', Cookie: cookies };

    const r = await fetch(`https://www.nseindia.com/api/equity-stockIndices?index=${encodeURIComponent(index)}`, { headers: H });
    if (!r.ok) return res.status(500).json({ error: `NSE ${r.status}` });

    const json = await r.json();
    const raw  = json.data || [];

    const isBN = index === 'NIFTY BANK';
    const smap = isBN ? BN_SECTOR_MAP : SECTOR_MAP;

    const stocks = raw
      .filter(s => s.symbol && s.symbol !== index.replace(' ', '_'))
      .map(s => ({
        id:        s.symbol,
        name:      s.meta?.companyName?.split(' ').slice(0,2).join(' ') || s.symbol,
        symbol:    s.symbol,
        price:     s.lastPrice,
        change:    s.change,
        changePct: s.pChange,
        open:      s.open,
        high:      s.dayHigh,
        low:       s.dayLow,
        prevClose: s.previousClose,
        sector:    smap[s.symbol] || (isBN ? 'Others' : 'Others'),
        weight:    WEIGHT_MAP[s.symbol] || 0.5,
      }))
      .filter(s => s.price > 0);

    return res.status(200).json({ data: stocks, index, source: 'nse', count: stocks.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
