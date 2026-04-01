import { useState, useEffect } from 'react';

const fmtQty  = v => v != null ? Number(v).toLocaleString('en-IN') : '--';
const fmtPct  = v => v != null ? `${Number(v).toFixed(2)}%` : '--';
const pColor  = v => v == null ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';
const fmtAmt  = v => v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';

const PAGE_STEP = 30;

// Company name map for common symbols
const NAMES = {
  HDFCBANK:'HDFC Bank',RELIANCE:'Reliance Industries',ICICIBANK:'ICICI Bank',
  INFY:'Infosys',TCS:'Tata Consultancy Services',SBIN:'State Bank of India',
  AXISBANK:'Axis Bank',KOTAKBANK:'Kotak Mahindra Bank',LT:'Larsen & Toubro',
  WIPRO:'Wipro',HINDUNILVR:'Hindustan Unilever',BAJFINANCE:'Bajaj Finance',
  BAJAJFINSV:'Bajaj Finserv',ASIANPAINT:'Asian Paints',MARUTI:'Maruti Suzuki',
  TITAN:'Titan Company',ULTRACEMCO:'UltraTech Cement',NESTLEIND:'Nestle India',
  POWERGRID:'Power Grid',NTPC:'NTPC',ONGC:'ONGC',COALINDIA:'Coal India',
  TECHM:'Tech Mahindra',SUNPHARMA:'Sun Pharma',DRREDDY:"Dr Reddy's",
  CIPLA:'Cipla',DIVISLAB:"Divi's Labs",APOLLOHOSP:'Apollo Hospitals',
  HCLTECH:'HCL Technologies',INDUSINDBK:'IndusInd Bank',HAL:'Hindustan Aeronautics',
  BEL:'Bharat Electronics',BHEL:'BHEL',SAIL:'SAIL',NMDC:'NMDC',VEDL:'Vedanta',
  HINDALCO:'Hindalco Industries',JSWSTEEL:'JSW Steel',TATASTEEL:'Tata Steel',
  TATAPOWER:'Tata Power',TATAMOTORS:'Tata Motors',ITC:'ITC',IDEA:'Vodafone Idea',
  YESBANK:'Yes Bank',SUZLON:'Suzlon Energy',ADANIPOWER:'Adani Power',
  ADANIENT:'Adani Enterprises',ADANIPORTS:'Adani Ports',MAZDOCK:'Mazagon Dock',
  IRFC:'IRFC',RVNL:'Rail Vikas Nigam',PFC:'Power Finance Corp',RECLTD:'REC',
  CANBK:'Canara Bank',BANKBARODA:'Bank of Baroda',PNB:'Punjab National Bank',
  SBILIFE:'SBI Life',HDFCLIFE:'HDFC Life',ICICIGI:'ICICI Lombard',LICI:'LIC',
  JIOFIN:'Jio Financial Services',BAJAJHFL:'Bajaj Housing Finance',
  ETERNAL:'Eternal Limited',ZOMATO:'Zomato',SWIGGY:'Swiggy',NYKAA:'Nykaa',
  PAYTM:'Paytm',ASHOKLEY:'Ashok Leyland',TRENT:'Trent',BSE:'BSE',
  MCX:'MCX',CDSL:'CDSL',ANGELONE:'Angel One',DLF:'DLF',LODHA:'Lodha',
  OBEROIRLTY:'Oberoi Realty',PRESTIGE:'Prestige Estates',GODREJPROP:'Godrej Properties',
  DIXON:'Dixon Technologies',KAYNES:'Kaynes Technology',POLYCAB:'Polycab',
  HAVELLS:'Havells',VOLTAS:'Voltas',BLUESTARCO:'Blue Star',AMBER:'Amber Enterprises',
  IRCTC:'IRCTC',RAILTEL:'RailTel',COCHINSHIP:'Cochin Shipyard',GRSE:'GRSE',
  BDL:'Bharat Dynamics',BHEL:'BHEL',BEML:'BEML',
};

function symbolColor(sym) {
  const palette = ['#4A9EFF','#00C896','#A78BFA','#F59E0B','#FF4455','#FB923C','#34D399','#F472B6','#60A5FA'];
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) & 0xFFFFFF;
  return palette[Math.abs(hash) % palette.length];
}

function StockAvatar({ symbol }) {
  const color    = symbolColor(symbol);
  const initials = symbol.length > 3 ? symbol.slice(0, 2) : symbol.slice(0, 3);
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

function TopCard({ stock, rank }) {
  const hasLTP   = stock.ltp != null;
  const name     = NAMES[stock.symbol] || stock.symbol;
  const barWidth = Math.min(stock.pct, 100);
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
              <span className="del-ltp-nil">
                <span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/>
              </span>
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
            <div className="del-pct-bar-fill" style={{ width: `${barWidth}%` }} />
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
  const [sortBy,      setSortBy]      = useState('delivered');
  const [sortDir,     setSortDir]     = useState('desc');
  const [visibleRows, setVisibleRows] = useState(PAGE_STEP);
  const [newRows,     setNewRows]     = useState(0);
  const [ltpLoading,  setLtpLoading]  = useState(false);
  const [ltpMsg,      setLtpMsg]      = useState(null);
  const [search,      setSearch]      = useState('');

  const fetchLTP = async () => {
    setLtpLoading(true);
    setLtpMsg(null);
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
    } catch {
      setLtpMsg({ ok: false, text: 'Network error. Try again.' });
    }
    setLtpLoading(false);
  };

  useEffect(() => {
    fetch('/api/delivery')
      .then(r => r.json())
      .then(d => { setData(d.empty ? null : d); setLoading(false); })
      .catch(() => { setError('Could not load delivery data.'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="del-state">
      <div className="del-spinner" /><span>Loading delivery data...</span>
    </div>
  );
  if (error) return (
    <div className="del-state">
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Could not load data</div>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{error}</div>
    </div>
  );
  if (!data) return (
    <div className="del-state">
      <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Delivery data not yet uploaded</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}>
        Upload the NSE MTO DAT file via the admin page to see top delivery stocks.
      </div>
    </div>
  );

  const { stocks, date, ltpUpdatedAt, fetchesRemaining, limit } = data;
  const remaining = fetchesRemaining ?? (limit ?? 5);

  const fmtDate = d => {
    if (!d) return '';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };
  const fmtTime = d => {
    if (!d) return null;
    try { return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST'; }
    catch { return null; }
  };

  // Filter
  const filtered = search.trim()
    ? stocks.filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()) || (NAMES[s.symbol] || '').toLowerCase().includes(search.toLowerCase()))
    : stocks;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const paged   = sorted.slice(0, visibleRows);
  const canLoad = visibleRows < sorted.length;

  const loadMore = () => {
    const prev = visibleRows;
    const next = Math.min(visibleRows + PAGE_STEP, sorted.length);
    setNewRows(next - prev);
    setVisibleRows(next);
  };

  const handleSort = col => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
    setVisibleRows(PAGE_STEP);
    setNewRows(0);
  };

  const SortBtn = ({ col, label, right = true }) => {
    const active = sortBy === col;
    const arrow  = active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
    return (
      <th className={`del-th${right ? '' : ' del-th-left'} del-th-sort${active ? ' del-th-active' : ''}`}
        onClick={() => handleSort(col)}>
        {label}{arrow}
      </th>
    );
  };

  // Top 5 by delivery %
  const top5byPct      = [...stocks].sort((a, b) => b.pct - a.pct).slice(0, 5);
  const showingLabel   = canLoad ? `Showing ${paged.length} of ${sorted.length}` : `${sorted.length} stocks`;

  return (
    <div className="del-wrap">

      {/* HEADER */}
      <div className="del-header">
        <div className="del-header-left">
          <h1 className="del-title">Top Delivery</h1>
          {date && <span className="del-date">as on {fmtDate(date)}</span>}
        </div>
        <div className="del-header-right">
          {ltpUpdatedAt && (
            <div className="del-ltp-badge">
              <span className="del-ltp-dot" />
              LTP {fmtTime(ltpUpdatedAt)}
            </div>
          )}
          <button className="del-ltp-btn" onClick={fetchLTP}
            disabled={ltpLoading || remaining <= 0}
            title={remaining <= 0 ? 'Daily limit reached.' : `Fetch LTP (${remaining} of ${limit ?? 5} remaining)`}>
            {ltpLoading ? <><span className="del-btn-spin" /> Fetching...</> : 'Fetch LTP'}
          </button>
          <span className="del-fetch-count" style={{ color: remaining <= 0 ? 'var(--loss)' : remaining <= 2 ? '#F59E0B' : 'var(--text3)' }}>
            {remaining ?? '--'}/{limit ?? 5} left
          </span>
        </div>
      </div>

      {ltpMsg && (
        <div className="del-ltp-msg" style={{
          background:  ltpMsg.ok ? 'rgba(0,200,150,.08)' : 'rgba(255,68,85,.08)',
          borderColor: ltpMsg.ok ? 'rgba(0,200,150,.3)'  : 'rgba(255,68,85,.3)',
          color:       ltpMsg.ok ? 'var(--gain)'          : 'var(--loss)',
        }}>{ltpMsg.text}</div>
      )}

      {/* TOP 5 CARDS */}
      <div className="del-section-label">Top 5 by Delivery %</div>
      <div className="del-top-row">
        {top5byPct.map((s, i) => <TopCard key={i} stock={s} rank={i + 1} />)}
      </div>

      {/* SUMMARY STRIP */}
      <div className="del-summary">
        <div className="del-sum-card">
          <div className="del-sum-label">Total EQ Stocks</div>
          <div className="del-sum-value">{stocks.length.toLocaleString('en-IN')}</div>
        </div>
        <div className="del-sum-card">
          <div className="del-sum-label">Avg Delivery %</div>
          <div className="del-sum-value">
            {(stocks.reduce((s, r) => s + r.pct, 0) / stocks.length).toFixed(1)}%
          </div>
        </div>
        <div className="del-sum-card">
          <div className="del-sum-label">High Delivery (&gt;75%)</div>
          <div className="del-sum-value" style={{ color: 'var(--gain)' }}>
            {stocks.filter(s => s.pct >= 75).length}
          </div>
        </div>
        <div className="del-sum-card">
          <div className="del-sum-label">Low Delivery (&lt;25%)</div>
          <div className="del-sum-value" style={{ color: 'var(--loss)' }}>
            {stocks.filter(s => s.pct < 25).length}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="del-table-section">
        <div className="del-tabs-row">
          <div className="del-search-wrap">
            <input
              className="del-search"
              type="text"
              placeholder="Search symbol or company..."
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleRows(PAGE_STEP); setNewRows(0); }}
            />
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
                const hasLTP  = s.ltp != null;
                const barW    = Math.min(s.pct, 100);
                // Color the delivery % bar
                const barColor = s.pct >= 75 ? 'var(--gain)' : s.pct >= 50 ? 'var(--accent)' : s.pct >= 25 ? '#F59E0B' : 'var(--loss)';
                return (
                  <tr key={`${s.symbol}-${i}`}
                    className={`del-tr${i % 2 === 1 ? ' del-tr-alt' : ''}${isNew ? ' del-tr-new' : ''}`}>
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
                      {hasLTP ? (
                        <span className="del-ltp-price">{fmtAmt(s.ltp)}</span>
                      ) : (
                        <span className="del-ltp-nil">
                          <span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/>
                        </span>
                      )}
                    </td>
                    <td className="del-td del-td-num" style={{ opacity: isTop10 ? 1 : 0.85 }}>
                      {s.changePct != null ? (
                        <span style={{ color: pColor(s.changePct), fontWeight: 600 }}>
                          {s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="del-ltp-nil">
                          <span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/><span className="del-ltp-nil-dot"/>
                        </span>
                      )}
                    </td>
                    <td className="del-td del-td-num" style={{ opacity: isTop10 ? 1 : 0.8 }}>{fmtQty(s.traded)}</td>
                    <td className="del-td del-td-num del-td-bold" style={{ opacity: isTop10 ? 1 : 0.85 }}>{fmtQty(s.delivered)}</td>
                    <td className="del-td del-td-num">
                      <div className="del-pct-cell">
                        <span className="del-pct-val" style={{ color: barColor, fontWeight: 700, opacity: isTop10 ? 1 : 0.88 }}>
                          {fmtPct(s.pct)}
                        </span>
                        <div className="del-pct-bar-track del-pct-bar-track-sm">
                          <div className="del-pct-bar-fill" style={{ width: `${barW}%`, background: barColor, opacity: 0.55 }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="del-more-wrap">
          {canLoad ? (
            <button className="del-more-btn" onClick={loadMore}>
              Load next {Math.min(PAGE_STEP, sorted.length - visibleRows)}
            </button>
          ) : (
            <span className="del-more-status">{sorted.length} stocks loaded</span>
          )}
        </div>
      </div>

      <div className="del-footer-note">
        Data sourced from NSE and processed for informational purposes only. This is not investment advice. Users should verify data independently.
      </div>
    </div>
  );
}
