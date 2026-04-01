import { useState, useEffect } from 'react';

const fmtQty = v => v != null ? Number(v).toLocaleString('en-IN') : '--';
const fmtPct = v => v != null ? `${Number(v).toFixed(2)}%` : '--';
const pColor = v => v == null ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';
const fmtAmt = v => v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
const PAGE_STEP = 30;

// ── Index constituent lists ─────────────────────────────────────────────────
const INDICES = {
  'Nifty 50': [
    'ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK','BAJAJ-AUTO',
    'BAJFINANCE','BAJAJFINSV','BHARTIARTL','BPCL','BRITANNIA','CIPLA','COALINDIA',
    'DIVISLAB','DRREDDY','EICHERMOT','ETERNAL','GRASIM','HCLTECH','HDFCBANK',
    'HDFCLIFE','HEROMOTOCO','HINDALCO','HINDUNILVR','ICICIBANK','INDUSINDBK',
    'INFY','ITC','JIOFIN','JSWSTEEL','KOTAKBANK','LT','LTM','M&M','MARUTI',
    'NESTLEIND','NTPC','ONGC','POWERGRID','RELIANCE','SBIN','SBILIFE','SHRIRAMFIN',
    'SUNPHARMA','TATACONSUM','TATASTEEL','TCS','TECHM','TITAN','TRENT','ULTRACEMCO','WIPRO',
  ],
  'Sensex': [
    'ADANIENT','ADANIPORTS','AXISBANK','BAJAJ-AUTO','BAJFINANCE','BHARTIARTL',
    'BRITANNIA','ETERNAL','HCLTECH','HDFCBANK','HINDUNILVR','ICICIBANK','INDUSINDBK',
    'INFY','ITC','JSWSTEEL','KOTAKBANK','LT','LTM','M&M','MARUTI','NESTLEIND',
    'NTPC','POWERGRID','RELIANCE','SBIN','SUNPHARMA','TATASTEEL','TCS','TITAN','WIPRO',
  ],
  'Nifty Next 50': [
    'AMBUJACEM','ATGL','BAJAJHLDNG','BHEL','BEL','BOSCHLTD','CHOLAFIN','CUMMINSIND',
    'DABUR','DLF','GODREJCP','HAVELLS','HDFCAMC','HINDZINC','ICICIPRULI','ICICIGI',
    'INDUSTOWER','IRCTC','LICI','LODHA','LUPIN','MCDOWELL-N','MRF','NHPC','NMDC',
    'NYKAA','OFSS','PAGEIND','PIDILITIND','PNB','RECLTD','SAIL','TATAPOWER',
    'TORNTPHARM','TORNTPOWER','TRENT','UPL','VEDL','ZOMATO','ZYDUSLIFE',
    'INDHOTEL','CANBK','BANKBARODA','PFC','CGPOWER','RVNL','HAL','COCHINSHIP',
  ],
  'Nifty 100': [
    // Nifty 50 + Next 50
    'ADANIENT','ADANIPORTS','APOLLOHOSP','ASIANPAINT','AXISBANK','BAJAJ-AUTO',
    'BAJFINANCE','BAJAJFINSV','BHARTIARTL','BPCL','BRITANNIA','CIPLA','COALINDIA',
    'DIVISLAB','DRREDDY','EICHERMOT','ETERNAL','GRASIM','HCLTECH','HDFCBANK',
    'HDFCLIFE','HEROMOTOCO','HINDALCO','HINDUNILVR','ICICIBANK','INDUSINDBK',
    'INFY','ITC','JIOFIN','JSWSTEEL','KOTAKBANK','LT','LTM','M&M','MARUTI',
    'NESTLEIND','NTPC','ONGC','POWERGRID','RELIANCE','SBIN','SBILIFE','SHRIRAMFIN',
    'SUNPHARMA','TATACONSUM','TATASTEEL','TCS','TECHM','TITAN','TRENT','ULTRACEMCO','WIPRO',
    'AMBUJACEM','ATGL','BAJAJHLDNG','BHEL','BEL','BOSCHLTD','CHOLAFIN','CUMMINSIND',
    'DABUR','DLF','GODREJCP','HAVELLS','HDFCAMC','HINDZINC','ICICIPRULI','ICICIGI',
    'INDUSTOWER','IRCTC','LICI','LODHA','LUPIN','NMDC','NHPC',
    'OFSS','PAGEIND','PIDILITIND','PNB','RECLTD','SAIL','TATAPOWER',
    'TORNTPHARM','TORNTPOWER','UPL','VEDL','ZYDUSLIFE',
    'INDHOTEL','CANBK','BANKBARODA','PFC','CGPOWER','RVNL','HAL','COCHINSHIP',
  ],
  'F&O Stocks': [
    'AARTIIND','ABB','ABBOTINDIA','ABCAPITAL','ABFRL','ACC','ADANIENT','ADANIPORTS',
    'ALKEM','AMARAJABAT','AMBUJACEM','APOLLOHOSP','APOLLOTYRE','ASHOKLEY','ASIANPAINT',
    'AUROPHARMA','AXISBANK','BAJAJ-AUTO','BAJAJCON','BAJFINANCE','BAJAJFINSV','BAJAJHFL',
    'BANDHANBNK','BANKBARODA','BEL','BERGEPAINT','BHARTIARTL','BHEL','BIOCON',
    'BOSCHLTD','BPCL','BRITANNIA','CANBK','CANFINHOME','CHAMBLFERT','CHOLAFIN',
    'CIPLA','COALINDIA','COFORGE','COLPAL','CONCOR','COROMANDEL','CUMMINSIND',
    'DABUR','DALBHARAT','DEEPAKNTR','DELTACORP','DIVISLAB','DLF','DRREDDY',
    'EICHERMOT','ESCORTS','ETERNAL','EXIDEIND','FEDERALBNK','GAIL','GLENMARK',
    'GMRAIRPORT','GODREJCP','GODREJPROP','GRANULES','GRASIM','GUJGASLTD',
    'HAL','HAVELLS','HCLTECH','HDFCAMC','HDFCBANK','HDFCLIFE','HEROMOTOCO',
    'HINDALCO','HINDCOPPER','HINDPETRO','HINDUNILVR','ICICIBANK','ICICIGI','ICICIPRULI',
    'IDBI','IDFCFIRSTB','IEX','IGL','INDHOTEL','INDIACEM','INDIAMART','INDUSTOWER',
    'INDUSINDBK','INFY','INTELLECT','IOC','IRCTC','ITC','JIOFIN','JKCEMENT',
    'JSL','JSWENERGY','JSWSTEEL','JUBLFOOD','KAJARIACER','KOTAKBANK','LICHSGFIN',
    'LT','LTIM','LTM','LUPIN','M&M','MANAPPURAM','MARICO','MARUTI','MCX',
    'METROPOLIS','MFSL','MGL','MOTHERSON','MPHASIS','MRF','MUTHOOTFIN',
    'NAUKRI','NAVINFLUOR','NESTLEIND','NMDC','NTPC','OBEROIRLTY','OFSS','ONGC',
    'PAGEIND','PEL','PERSISTENT','PETRONET','PFC','PHOENIXLTD','PIDILITIND',
    'PIIND','PNB','POLYCAB','POWERGRID','PVR','PVRINOX','RAMCOCEM','RECLTD',
    'RELIANCE','SAIL','SBICARD','SBILIFE','SBIN','SHRIRAMFIN','SIEMENS','SRF',
    'SUNPHARMA','SUNTV','TATACHEM','TATACOMM','TATACONSUM','TATAELXSI',
    'TATAPOWER','TATASTEEL','TCS','TECHM','TITAN','TORNTPHARM','TORNTPOWER',
    'TRENT','TVSMOTOR','ULTRACEMCO','UPL','VEDL','VOLTAS','WIPRO','ZYDUSLIFE',
  ],
  'Nifty Auto': [
    'ASHOKLEY','BAJAJ-AUTO','BALKRISIND','BHARATFORG','BOSCHLTD','EICHERMOT',
    'ESCORTS','HEROMOTOCO','M&M','MARUTI','MOTHERSON','TVSMOTOR','TATAMOTORS',
    'TIINDIA','UNOMINDA','MRF','APOLLOTYRE',
  ],
  'Nifty Bank': [
    'AXISBANK','AUBANK','BANDHANBNK','CANBK','FEDERALBNK','HDFCBANK','ICICIBANK',
    'IDFCFIRSTB','INDUSINDBK','KOTAKBANK','PNB','RBLBANK','SBIN','YESBANK',
  ],
  'Nifty Financial Services': [
    'AXISBANK','BAJFINANCE','BAJAJFINSV','CHOLAFIN','HDFCAMC','HDFCBANK','HDFCLIFE',
    'ICICIBANK','ICICIPRULI','ICICIGI','JIOFIN','KOTAKBANK','LT','LTM',
    'MUTHOOTFIN','PFC','RECLTD','SBIN','SBICARD','SBILIFE','SHRIRAMFIN',
  ],
  'Nifty FMCG': [
    'BRITANNIA','COLPAL','DABUR','EMAMILTD','GODREJCP','HINDUNILVR','ITC',
    'MARICO','MCDOWELL-N','NESTLEIND','PGHH','RADICO','TATACONSUM','UBL','VBL',
  ],
  'Nifty Healthcare': [
    'ABBOTINDIA','ALKEM','APOLLOHOSP','AUROPHARMA','BIOCON','CIPLA','DIVISLAB',
    'DRREDDY','FORTIS','GLENMARK','GRANULES','LAURUSLABS','LUPIN','MAXHEALTH',
    'SUNPHARMA','TORNTPHARM','ZYDUSLIFE',
  ],
  'Nifty IT': [
    'COFORGE','HCLTECH','INFY','KPITTECH','LTM','MPHASIS','OFSS','PERSISTENT',
    'TCS','TECHM','WIPRO',
  ],
  'Nifty Media': [
    'NETWORK18','PVRINOX','SAREGAMA','SUNTV','TIPSMUSIC','TVTODAY','ZEEL',
  ],
  'Nifty Metal': [
    'ADANIENT','APLAPOLLO','COALINDIA','HINDALCO','HINDCOPPER','JINDALSTEL',
    'JSL','JSWSTEEL','NMDC','SAIL','TATASTEEL','VEDL','NATIONALUM','MOIL',
  ],
  'Nifty Pharma': [
    'ABBOTINDIA','ALKEM','AUROPHARMA','BIOCON','CIPLA','DIVISLAB','DRREDDY',
    'GLENMARK','GRANULES','LAURUSLABS','LUPIN','NATCOPHARM','SUNPHARMA',
    'TORNTPHARM','ZYDUSLIFE',
  ],
  'Nifty Private Bank': [
    'AXISBANK','AUBANK','BANDHANBNK','FEDERALBNK','HDFCBANK','ICICIBANK',
    'IDFCFIRSTB','INDUSINDBK','KOTAKBANK','RBLBANK','YESBANK',
  ],
  'Nifty PSU Bank': [
    'BANKBARODA','BANKINDIA','CANBK','CENTRALBK','IOB','MAHABANK','PNB',
    'SBIN','UCOBANK','UNIONBANK',
  ],
  'Nifty Realty': [
    'BRIGADE','DLF','GODREJPROP','OBEROIRLTY','PHOENIXLTD','PRESTIGE',
    'SOBHA','SUNTECK','LODHA','MAHLIFE',
  ],
  'Nifty Consumer Durables': [
    'AMBER','BLUESTARCO','CROMPTON','DIXON','HAVELLS','KAJARIACER','ORIENT',
    'POLYCAB','TITAN','VOLTAS','WHIRLPOOL',
  ],
  'Nifty CPSE': [
    'BPCL','COALINDIA','GAIL','HAL','IOC','NTPC','ONGC','POWERGRID',
    'RECLTD','SAIL',
  ],
  'Nifty Energy': [
    'ADANIGREEN','ADANIPOWER','ATGL','BPCL','GAIL','IOC','NTPC','ONGC',
    'POWERGRID','RELIANCE','TATAPOWER','TORNTPOWER',
  ],
  'Nifty Infrastructure': [
    'ADANIPORTS','GMRAIRPORT','HAL','INDHOTEL','IOC','IRCTC','LT','NTPC',
    'POWERGRID','RVNL','SAIL',
  ],
  'Nifty MNC': [
    'ABB','ABBOTINDIA','ASIANPAINT','BOSCHLTD','CASTROLIND','COLPAL','CUMMINSIND',
    'GLAXO','HONAUT','MCDOWELL-N','NESTLEIND','PFIZER','PGHH','SANOFI','SIEMENS',
  ],
  'Nifty PSE': [
    'BHEL','BPCL','COALINDIA','GAIL','HAL','IOC','IRCTC','NMDC','NTPC',
    'ONGC','POWERGRID','RECLTD','SAIL','SBIN',
  ],
  'Nifty Midcap 50': [
    'AARTIIND','ABCAPITAL','AUBANK','BAJAJHFL','BALKRISIND','BANDHANBNK',
    'CANBK','CHOLAFIN','COFORGE','CONCOR','DALBHARAT','DEEPAKNTR','ESCORTS',
    'FEDERALBNK','GAIL','GODREJPROP','GRANULES','IDFCFIRSTB','INDUSTOWER',
    'IRCTC','JSWENERGY','LICHSGFIN','LODHA','LUPIN','MANAPPURAM','MARICO',
    'MCX','MUTHOOTFIN','NMDC','OBEROIRLTY','PAGEIND','PERSISTENT','PIIND',
    'POLYCAB','PHOENIXLTD','RECLTD','SBICARD','SAIL','SIEMENS','SRF',
    'TATACHEM','TVSMOTOR','VOLTAS','ZYDUSLIFE',
  ],
  'Nifty Midcap 100': [
    'AARTIIND','ABCAPITAL','ABB','ABFRL','ALKEM','AMARAJABAT','AMBUJACEM',
    'APOLLOTYRE','AUROPHARMA','AUBANK','BAJAJHFL','BALKRISIND','BANDHANBNK',
    'BIOCON','BOSCHLTD','CANBK','CHOLAFIN','COFORGE','CONCOR','CROMPTON',
    'DALBHARAT','DEEPAKNTR','ESCORTS','EXIDEIND','FEDERALBNK','GAIL',
    'GLENMARK','GODREJPROP','GRANULES','HAVELLS','IDFCFIRSTB','INDUSTOWER',
    'IRCTC','JSL','JSWENERGY','KAJARIACER','LICHSGFIN','LODHA','LUPIN',
    'M&MFIN','MANAPPURAM','MARICO','MCX','METROPOLIS','MFSL','MOTHERSON',
    'MUTHOOTFIN','NAUKRI','NMDC','OBEROIRLTY','PAGEIND','PERSISTENT','PIIND',
    'POLYCAB','PHOENIXLTD','PVRINOX','RAMCOCEM','RECLTD','SBICARD','SAIL',
    'SIEMENS','SRF','TATACOMM','TATACHEM','TVSMOTOR','VOLTAS','ZYDUSLIFE',
  ],
  'Nifty Midcap 150': [], // Will be auto-expanded if needed
  'Nifty Midcap Select': [
    'ABCAPITAL','AUBANK','BAJAJHFL','BALKRISIND','BANDHANBNK','CHOLAFIN',
    'COFORGE','CONCOR','FEDERALBNK','GRANULES','IDFCFIRSTB','INDUSTOWER',
    'IRCTC','JSWENERGY','LUPIN','MANAPPURAM','MARICO','MCX','MUTHOOTFIN',
    'NMDC','PAGEIND','PERSISTENT','POLYCAB','PHOENIXLTD','RECLTD','SBICARD',
    'SIEMENS','SRF','TVSMOTOR','VOLTAS','ZYDUSLIFE',
  ],
  'Nifty Total Market': null, // null = all stocks
  'Nifty Smallcap 50': [
    'ANGELONE','APARINDS','ASTRAL','BSE','CAMS','CDSL','CLEAN','DMART',
    'EDELWEISS','GMRAIRPORT','HSCL','INDIAMART','IIFL','IRFC','JINDALSAW',
    'KANSAINER','KFINTECH','MEDPLUS','MOTHERSON','NAUKRI','NHPC','PCBL',
    'POWERMECH','RVNL','RELAXO','ROUTE','SAFARI','SJVN','SKFINDIA','SOLARINDS',
    'TIINDIA','TRIDENT','TTML','UJJIVANSFB','UTIAMC','WELENT',
  ],
  'Nifty Smallcap 100': [], // too many to list explicitly
  'Nifty Smallcap 250': null,
  'Nifty Microcap 250': null,
  'Nifty MidSmallCap 400': null,
  'All Stocks': null,
};

const INDEX_GROUPS = [
  { label: 'Broad Market', items: ['Nifty 50','Sensex','Nifty Next 50','Nifty 100','F&O Stocks','All Stocks'] },
  { label: 'Mid & Small Cap', items: ['Nifty Midcap 50','Nifty Midcap 100','Nifty Midcap 150','Nifty Midcap Select','Nifty Smallcap 50','Nifty Smallcap 100','Nifty Smallcap 250','Nifty Microcap 250','Nifty MidSmallCap 400','Nifty Total Market'] },
  { label: 'Sector', items: ['Nifty Auto','Nifty Bank','Nifty Financial Services','Nifty FMCG','Nifty Healthcare','Nifty IT','Nifty Media','Nifty Metal','Nifty Pharma','Nifty Private Bank','Nifty PSU Bank','Nifty Realty','Nifty Consumer Durables','Nifty CPSE','Nifty Energy','Nifty Infrastructure','Nifty MNC','Nifty PSE'] },
];

const NAMES = {
  ADANIENT:'Adani Enterprises',ADANIPORTS:'Adani Ports',APOLLOHOSP:'Apollo Hospitals',
  ASIANPAINT:'Asian Paints',AXISBANK:'Axis Bank',BAJFINANCE:'Bajaj Finance',
  BAJAJFINSV:'Bajaj Finserv',BHARTIARTL:'Bharti Airtel',BPCL:'BPCL',
  BRITANNIA:'Britannia',CIPLA:'Cipla',COALINDIA:'Coal India',DIVISLAB:"Divi's Labs",
  DRREDDY:"Dr Reddy's",EICHERMOT:'Eicher Motors',ETERNAL:'Eternal Limited',
  GRASIM:'Grasim',HCLTECH:'HCL Technologies',HDFCBANK:'HDFC Bank',
  HDFCLIFE:'HDFC Life',HEROMOTOCO:'Hero MotoCorp',HINDALCO:'Hindalco',
  HINDUNILVR:'HUL',ICICIBANK:'ICICI Bank',INDUSINDBK:'IndusInd Bank',
  INFY:'Infosys',ITC:'ITC',JIOFIN:'Jio Financial',JSWSTEEL:'JSW Steel',
  KOTAKBANK:'Kotak Bank',LT:'L&T',LTM:'LTIMindtree',['M&M']:'Mahindra & Mahindra',
  MARUTI:'Maruti Suzuki',NESTLEIND:'Nestle India',NTPC:'NTPC',ONGC:'ONGC',
  POWERGRID:'Power Grid',RELIANCE:'Reliance Industries',SBIN:'SBI',
  SBILIFE:'SBI Life',SHRIRAMFIN:'Shriram Finance',SUNPHARMA:'Sun Pharma',
  TATACONSUM:'Tata Consumer',TATASTEEL:'Tata Steel',TCS:'TCS',
  TECHM:'Tech Mahindra',TITAN:'Titan',TRENT:'Trent',ULTRACEMCO:'UltraTech Cement',
  WIPRO:'Wipro','BAJAJ-AUTO':'Bajaj Auto',HDFCAMC:'HDFC AMC',
  NMDC:'NMDC',SAIL:'SAIL',TATAPOWER:'Tata Power',HAL:'HAL',BEL:'BEL',
  IRCTC:'IRCTC',RVNL:'RVNL',PFC:'PFC',RECLTD:'REC',CANBK:'Canara Bank',
  BANKBARODA:'Bank of Baroda',PNB:'PNB',YESBANK:'Yes Bank',VEDL:'Vedanta',
  COCHINSHIP:'Cochin Shipyard',LUPIN:'Lupin',DLF:'DLF',LODHA:'Lodha',
  CHOLAFIN:'Cholamandalam Finance',MARICO:'Marico',DABUR:'Dabur',
  GODREJCP:'Godrej Consumer',MUTHOOTFIN:'Muthoot Finance',MCX:'MCX',
  POLYCAB:'Polycab',HAVELLS:'Havells',SIEMENS:'Siemens',PIDILITIND:'Pidilite',
  PERSISTENT:'Persistent Systems',COFORGE:'Coforge',ZYDUSLIFE:'Zydus Lifesciences',
};

function symbolColor(sym) {
  const palette = ['#4A9EFF','#00C896','#A78BFA','#F59E0B','#FF4455','#FB923C','#34D399','#F472B6','#60A5FA'];
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) & 0xFFFFFF;
  return palette[Math.abs(hash) % palette.length];
}

function StockAvatar({ symbol }) {
  const color    = symbolColor(symbol);
  const initials = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 2) || symbol.slice(0, 2);
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: color + '1a', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontSize: 8, fontWeight: 800, letterSpacing: '0.03em',
      flexShrink: 0, fontFamily: 'var(--mono)',
    }}>
      {initials}
    </div>
  );
}

function TopCard({ stock }) {
  const hasLTP = stock.ltp != null;
  const name   = NAMES[stock.symbol] || stock.symbol;
  return (
    <div className="del-top-card">
      <div className="del-top-card-hdr">
        <StockAvatar symbol={stock.symbol} />
        <div className="del-top-card-info">
          <div className="del-top-card-name">{name}</div>
          {hasLTP ? (
            <div className="del-top-card-price">
              <span>{fmtAmt(stock.ltp)}</span>
              {stock.changePct != null && (
                <span style={{ color: pColor(stock.changePct), fontSize: 11, marginLeft: 6 }}>
                  {stock.changePct >= 0 ? '▲' : '▼'} {Math.abs(stock.changePct).toFixed(2)}%
                </span>
              )}
            </div>
          ) : (
            <div className="del-top-card-price">
              <span className="del-ltp-nil"><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/></span>
            </div>
          )}
        </div>
      </div>
      <div className="del-top-card-meta">
        <div className="del-top-card-row">
          <span className="del-top-card-k">Delivered</span>
          <span className="del-top-card-v" style={{ color: 'var(--gain)', fontWeight: 700 }}>{fmtPct(stock.pct)}</span>
        </div>
        <div className="del-pct-bar-wrap">
          <div className="del-pct-bar-track">
            <div className="del-pct-bar-fill" style={{ width: `${Math.min(stock.pct, 100)}%` }} />
          </div>
        </div>
        <div className="del-top-card-row" style={{ marginTop: 4 }}>
          <span className="del-top-card-k">Traded</span>
          <span className="del-top-card-v">{fmtQty(stock.traded)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [index,       setIndex]       = useState('Nifty 50');
  const [dropOpen,    setDropOpen]    = useState(false);
  const [sortBy,      setSortBy]      = useState('delivered');
  const [sortDir,     setSortDir]     = useState('desc');
  const [visibleRows, setVisibleRows] = useState(PAGE_STEP);
  const [newRows,     setNewRows]     = useState(0);
  const [ltpLoading,  setLtpLoading]  = useState(false);
  const [ltpMsg,      setLtpMsg]      = useState(null);
  const [search,      setSearch]      = useState('');

  const fetchLTP = async () => {
    setLtpLoading(true); setLtpMsg(null);
    try {
      const r    = await fetch('/api/delivery?action=ltp');
      const json = await r.json();
      if (json.ok) {
        setLtpMsg({ ok: true, text: `LTP updated for ${json.count} stocks via ${json.source}. ${json.fetchesRemaining} fetch${json.fetchesRemaining !== 1 ? 'es' : ''} remaining today.` });
        const d = await fetch('/api/delivery').then(r => r.json());
        if (!d.empty) setData(d);
      } else if (json.reason === 'daily_limit') {
        setLtpMsg({ ok: false, text: 'Daily limit of 5 fetches reached. Resets at midnight IST.' });
      } else {
        setLtpMsg({ ok: false, text: json.error || 'LTP fetch failed.' });
      }
    } catch { setLtpMsg({ ok: false, text: 'Network error. Try again.' }); }
    setLtpLoading(false);
  };

  useEffect(() => {
    fetch('/api/delivery')
      .then(r => r.json())
      .then(d => { setData(d.empty ? null : d); setLoading(false); })
      .catch(() => { setError('Could not load delivery data.'); setLoading(false); });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const fn = e => { if (!e.target.closest('.del-index-picker')) setDropOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  if (loading) return <div className="del-state"><div className="del-spinner" /><span>Loading delivery data...</span></div>;
  if (error)   return <div className="del-state"><div style={{ fontSize:28,marginBottom:8 }}>⚠️</div><div style={{ fontWeight:700,marginBottom:4 }}>Could not load data</div><div style={{ fontSize:12,color:'var(--text3)' }}>{error}</div></div>;
  if (!data)   return (
    <div className="del-state">
      <div style={{ fontSize:32,marginBottom:12 }}>📦</div>
      <div style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>Delivery data not yet uploaded</div>
      <div style={{ fontSize:12,color:'var(--text3)',maxWidth:320,textAlign:'center',lineHeight:1.7 }}>
        Upload the NSE MTO DAT file via the admin page to see top delivery stocks.
      </div>
    </div>
  );

  const { stocks, date, ltpUpdatedAt, fetchesRemaining, limit } = data;
  const remaining = fetchesRemaining ?? (limit ?? 5);

  const fmtDate = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); } catch { return d; } };
  const fmtTime = d => { try { return new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Kolkata' }) + ' IST'; } catch { return null; } };

  // Apply index filter
  const constituents = INDICES[index];
  const indexFiltered = constituents == null
    ? stocks
    : constituents.length === 0
      ? stocks // empty list = show all (for indices we haven't mapped yet)
      : stocks.filter(s => constituents.includes(s.symbol));

  // Apply search
  const filtered = search.trim()
    ? indexFiltered.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()) || (NAMES[s.symbol] || '').toLowerCase().includes(search.toLowerCase()))
    : indexFiltered;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const paged   = sorted.slice(0, visibleRows);
  const canLoad = visibleRows < sorted.length;

  const loadMore = () => {
    const prev = visibleRows, next = Math.min(visibleRows + PAGE_STEP, sorted.length);
    setNewRows(next - prev); setVisibleRows(next);
  };

  const handleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
    setVisibleRows(PAGE_STEP); setNewRows(0);
  };

  const changeIndex = idx => { setIndex(idx); setDropOpen(false); setVisibleRows(PAGE_STEP); setNewRows(0); setSearch(''); };

  const SortBtn = ({ col, label }) => {
    const active = sortBy === col;
    return (
      <th className={`del-th del-th-sort${active ? ' del-th-active' : ''}`} onClick={() => handleSort(col)}>
        {label}{active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ''}
      </th>
    );
  };

  // Top 5 by delivery % within current index filter
  const top5 = [...indexFiltered].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const showingLabel = canLoad ? `Showing ${paged.length} of ${sorted.length}` : `${sorted.length} stocks`;

  return (
    <div className="del-wrap">

      {/* HEADER */}
      <div className="del-header">
        <div className="del-header-left">
          <h1 className="del-title">Top Delivery</h1>
          {date && <span className="del-date">as on {fmtDate(date)}</span>}
        </div>
        <div className="del-header-right">
          {ltpUpdatedAt && <div className="del-ltp-badge"><span className="del-ltp-dot" />LTP {fmtTime(ltpUpdatedAt)}</div>}
          <button className="del-ltp-btn" onClick={fetchLTP} disabled={ltpLoading || remaining <= 0}>
            {ltpLoading ? <><span className="del-btn-spin" /> Fetching...</> : 'Fetch LTP'}
          </button>
          <span className="del-fetch-count" style={{ color: remaining <= 0 ? 'var(--loss)' : remaining <= 2 ? '#F59E0B' : 'var(--text3)' }}>
            {remaining ?? '--'}/{limit ?? 5} left
          </span>
        </div>
      </div>

      {ltpMsg && (
        <div className="del-ltp-msg" style={{ background: ltpMsg.ok ? 'rgba(0,200,150,.08)' : 'rgba(255,68,85,.08)', borderColor: ltpMsg.ok ? 'rgba(0,200,150,.3)' : 'rgba(255,68,85,.3)', color: ltpMsg.ok ? 'var(--gain)' : 'var(--loss)' }}>
          {ltpMsg.text}
        </div>
      )}

      {/* INDEX PICKER + SUMMARY */}
      <div className="del-controls-row">
        <div className="del-index-picker">
          <span className="del-index-label">Index:</span>
          <button className="del-index-btn" onClick={() => setDropOpen(o => !o)}>
            {index} {dropOpen ? '▲' : '▼'}
          </button>
          {dropOpen && (
            <div className="del-index-drop">
              {INDEX_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="del-index-group">{group.label}</div>
                  {group.items.map(idx => (
                    <button key={idx}
                      className={`del-index-item${index === idx ? ' del-index-item-on' : ''}`}
                      onClick={() => changeIndex(idx)}>
                      {idx}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="del-summary-inline">
          <span className="del-sum-pill">{indexFiltered.length} stocks</span>
          <span className="del-sum-pill">
            Avg delivery: <strong>{(indexFiltered.reduce((s, r) => s + r.pct, 0) / (indexFiltered.length || 1)).toFixed(1)}%</strong>
          </span>
          <span className="del-sum-pill del-sum-green">
            High (&gt;75%): <strong>{indexFiltered.filter(s => s.pct >= 75).length}</strong>
          </span>
          <span className="del-sum-pill del-sum-red">
            Low (&lt;25%): <strong>{indexFiltered.filter(s => s.pct < 25).length}</strong>
          </span>
        </div>
      </div>

      {/* TOP 5 CARDS */}
      {top5.length > 0 && (
        <>
          <div className="del-section-label" style={{ marginTop: 16 }}>Top 5 by Delivery % — {index}</div>
          <div className="del-top-row">
            {top5.map((s, i) => <TopCard key={i} stock={s} />)}
          </div>
        </>
      )}

      {/* TABLE */}
      <div className="del-table-section">
        <div className="del-tabs-row">
          <div className="del-search-wrap">
            <input className="del-search" type="text" placeholder="Search symbol or company..."
              value={search} onChange={e => { setSearch(e.target.value); setVisibleRows(PAGE_STEP); setNewRows(0); }} />
          </div>
          <div className="del-table-count">{showingLabel}</div>
        </div>

        <div className="del-table-wrap">
          <table className="del-table">
            <thead>
              <tr>
                <th className="del-th del-th-left del-th-rank">#</th>
                <th className="del-th del-th-left">Stock</th>
                <SortBtn col="ltp"       label="LTP" />
                <SortBtn col="changePct" label="Change %" />
                <SortBtn col="traded"    label="Traded Qty" />
                <SortBtn col="delivered" label="Delivered Qty" />
                <SortBtn col="pct"       label="Delivery %" />
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => {
                const isNew   = i >= (visibleRows - newRows);
                const isTop10 = i < 10;
                const name    = NAMES[s.symbol] || s.symbol;
                const barColor = s.pct >= 75 ? 'var(--gain)' : s.pct >= 50 ? 'var(--accent)' : s.pct >= 25 ? '#F59E0B' : 'var(--loss)';
                return (
                  <tr key={`${s.symbol}-${i}`} className={`del-tr${i % 2 === 1 ? ' del-tr-alt' : ''}${isNew ? ' del-tr-new' : ''}`}>
                    <td className="del-td del-td-rank" style={{ opacity: isTop10 ? 1 : 0.6 }}>{i + 1}</td>
                    <td className="del-td del-td-company">
                      <div className="del-company-cell">
                        <StockAvatar symbol={s.symbol} />
                        <div>
                          <div className="del-company-name" style={{ fontWeight: isTop10 ? 700 : 600, opacity: isTop10 ? 1 : 0.9 }}>{name}</div>
                          <div className="del-company-sym">{s.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="del-td del-td-num" style={{ opacity: isTop10 ? 1 : 0.85 }}>
                      {s.ltp != null ? <span className="del-ltp-price">{fmtAmt(s.ltp)}</span>
                        : <span className="del-ltp-nil"><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/></span>}
                    </td>
                    <td className="del-td del-td-num" style={{ opacity: isTop10 ? 1 : 0.85 }}>
                      {s.changePct != null
                        ? <span style={{ color: pColor(s.changePct), fontWeight: 600 }}>{s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%</span>
                        : <span className="del-ltp-nil"><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/></span>}
                    </td>
                    <td className="del-td del-td-num" style={{ opacity: isTop10 ? 1 : 0.8 }}>{fmtQty(s.traded)}</td>
                    <td className="del-td del-td-num del-td-bold" style={{ opacity: isTop10 ? 1 : 0.85 }}>{fmtQty(s.delivered)}</td>
                    <td className="del-td del-td-num">
                      <div className="del-pct-cell">
                        <span className="del-pct-val" style={{ color: barColor, fontWeight: 700, opacity: isTop10 ? 1 : 0.88 }}>{fmtPct(s.pct)}</span>
                        <div className="del-pct-bar-track del-pct-bar-track-sm">
                          <div className="del-pct-bar-fill" style={{ width: `${Math.min(s.pct, 100)}%`, background: barColor, opacity: 0.55 }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {paged.length === 0 && indexFiltered.length === 0 && (
          <div className="del-empty-tab">
            No {index} stocks found in today's delivery data. They may not have traded today.
          </div>
        )}

        <div className="del-more-wrap">
          {canLoad
            ? <button className="del-more-btn" onClick={loadMore}>Load next {Math.min(PAGE_STEP, sorted.length - visibleRows)}</button>
            : <span className="del-more-status">{sorted.length} stocks loaded</span>}
        </div>
      </div>

      <div className="del-footer-note">
        Data sourced from NSE and processed for informational purposes only. This is not investment advice. Users should verify data independently.
      </div>
    </div>
  );
}
