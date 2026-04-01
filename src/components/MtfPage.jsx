import { useState, useEffect } from 'react';

const fmtCr  = v => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` : '--';
const fmtQty = v => v != null ? Number(v).toLocaleString('en-IN') : '--';
const fmtPct = v => v != null ? `${Number(v).toFixed(2)}%` : '--';
const pColor = v => v == null ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';

// Deterministic color from symbol string
function symbolColor(sym) {
  const palette = ['#4A9EFF','#00C896','#A78BFA','#F59E0B','#FF4455','#FB923C','#34D399','#F472B6','#60A5FA'];
  let hash = 0;
  for (let i = 0; i < sym.length; i++) hash = (hash * 31 + sym.charCodeAt(i)) & 0xFFFFFF;
  return palette[Math.abs(hash) % palette.length];
}

function StockAvatar({ symbol }) {
  const color = symbolColor(symbol);
  const initials = symbol.length > 3 ? symbol.slice(0, 2) : symbol.slice(0, 3);
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: color + '22', border: `1.5px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color, fontSize: 9, fontWeight: 800, letterSpacing: '0.02em',
      flexShrink: 0, fontFamily: 'var(--mono)',
    }}>
      {initials}
    </div>
  );
}

function SummaryCard({ label, value, sub, valueColor }) {
  return (
    <div className="mtf-sum-card">
      <div className="mtf-sum-label">{label}</div>
      <div className="mtf-sum-value" style={{ color: valueColor || 'var(--text)' }}>{value}</div>
      {sub && <div className="mtf-sum-sub" style={{ color: valueColor || 'var(--text3)' }}>{sub}</div>}
    </div>
  );
}

function TopCard({ stock }) {
  const hasLTP = stock.ltp != null;
  return (
    <div className="mtf-top-card">
      <div className="mtf-top-card-hdr">
        <StockAvatar symbol={stock.symbol} />
        <div className="mtf-top-card-info">
          <div className="mtf-top-card-name">{stock.company}</div>
          {hasLTP ? (
            <div className="mtf-top-card-price">
              <span>{Number(stock.ltp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span style={{ color: pColor(stock.ltpPct), fontSize: 11, marginLeft: 6 }}>
                {(stock.ltpPct ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.ltpPct ?? 0).toFixed(2)}%
              </span>
            </div>
          ) : (
            <div className="mtf-top-card-price" style={{ color: 'var(--text3)', fontSize: 11 }}>LTP pending</div>
          )}
        </div>
      </div>
      <div className="mtf-top-card-meta">
        <div className="mtf-top-card-row">
          <span className="mtf-top-card-k">Funded Value</span>
          <span className="mtf-top-card-v">{Number(stock.fundedAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr</span>
        </div>
        <div className="mtf-top-card-row">
          <span className="mtf-top-card-k">Shares</span>
          <span className="mtf-top-card-v">
            {Number(stock.fundedQty).toLocaleString('en-IN')}
            <span style={{ color: 'var(--text3)', marginLeft: 4 }}>({Number(stock.exposure).toFixed(2)}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MtfPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('overall');
  const [sortBy,  setSortBy]  = useState('fundedAmt');
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setLoading(true);
    fetch('/api/mtf')
      .then(r => r.json())
      .then(d => { setData(d.empty ? null : d); setLoading(false); })
      .catch(() => { setError('Could not load MTF data.'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="mtf-state">
      <div className="mtf-spinner" />
      <span>Loading MTF data...</span>
    </div>
  );

  if (error) return (
    <div className="mtf-state">
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Could not load data</div>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{error}</div>
    </div>
  );

  if (!data) return (
    <div className="mtf-state">
      <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>MTF data not yet uploaded</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}>
        NSE MTF CSV has not been uploaded yet. Once uploaded, the industry MTF book,
        top stocks and exposure data will appear here.
      </div>
    </div>
  );

  const { summary, stocks, date, ltpUpdatedAt } = data;
  const fmtDate = d => {
    if (!d) return '';
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return d; }
  };
  const fmtTime = d => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
    } catch { return null; }
  };

  const top5 = stocks.slice(0, 5);

  // Tab filtering
  const tabStocks = (() => {
    if (tab === 'added')      return stocks.filter(s => (s.dayChange ?? 0) > 0);
    if (tab === 'liquidated') return stocks.filter(s => (s.dayChange ?? 0) < 0);
    return stocks;
  })();

  // Sort
  const sorted = [...tabStocks].sort((a, b) => {
    if (sortBy === 'fundedAmt')  return b.fundedAmt - a.fundedAmt;
    if (sortBy === 'exposure')   return b.exposure - a.exposure;
    if (sortBy === 'fundedQty')  return b.fundedQty - a.fundedQty;
    if (sortBy === 'ltp')        return (b.ltp ?? 0) - (a.ltp ?? 0);
    return 0;
  });

  const paged   = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = paged.length < sorted.length;

  const SortBtn = ({ col, label }) => (
    <th className={`mtf-th mtf-th-sort ${sortBy === col ? 'mtf-th-active' : ''}`}
      onClick={() => { setSortBy(col); setPage(1); }}>
      {label} {sortBy === col ? '▼' : ''}
    </th>
  );

  const netPositive = (summary.netChange ?? 0) >= 0;

  return (
    <div className="mtf-wrap">

      {/* HEADER */}
      <div className="mtf-header">
        <div className="mtf-header-left">
          <h1 className="mtf-title">MTF Insights</h1>
          {date && <span className="mtf-date">as on {fmtDate(date)}</span>}
        </div>
        {ltpUpdatedAt && (
          <div className="mtf-ltp-badge">
            <span className="mtf-ltp-dot" />
            LTP updated {fmtTime(ltpUpdatedAt)}
          </div>
        )}
      </div>

      {/* SUMMARY STRIP */}
      <div className="mtf-summary">
        <SummaryCard
          label="Industry MTF Book"
          value={fmtCr(summary.totalBook)}
        />
        <SummaryCard
          label="Positions Added"
          value={`+${fmtCr(summary.positionsAdded)}`}
          valueColor="var(--gain)"
        />
        <SummaryCard
          label="Positions Liquidated"
          value={`-${fmtCr(summary.positionsLiquidated)}`}
          valueColor="var(--loss)"
        />
        <SummaryCard
          label="Net Book Change"
          value={`${netPositive ? '+' : '-'}${fmtCr(Math.abs(summary.netChange))}`}
          sub={netPositive ? 'Net Expansion' : 'Net Liquidated'}
          valueColor={netPositive ? 'var(--gain)' : 'var(--loss)'}
        />
      </div>

      {/* TOP 5 STOCKS */}
      <div className="mtf-top-label">Top MTF Stocks by Funded Value</div>
      <div className="mtf-top-row">
        {top5.map((s, i) => <TopCard key={i} stock={s} />)}
      </div>

      {/* TABS + TABLE */}
      <div className="mtf-table-section">
        <div className="mtf-tabs-row">
          <div className="mtf-tabs">
            {[
              { id: 'overall',    label: 'Overall' },
              { id: 'added',      label: 'Positions Added' },
              { id: 'liquidated', label: 'Positions Liquidated' },
            ].map(t => (
              <button key={t.id}
                className={`mtf-tab ${tab === t.id ? 'mtf-tab-on' : ''}`}
                onClick={() => { setTab(t.id); setPage(1); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="mtf-table-count">
            {sorted.length} stocks
          </div>
        </div>

        <div className="mtf-table-wrap">
          <table className="mtf-table">
            <thead>
              <tr>
                <th className="mtf-th mtf-th-left">#</th>
                <th className="mtf-th mtf-th-left">Company</th>
                <SortBtn col="fundedQty"  label="Funded Qty" />
                <SortBtn col="fundedAmt"  label="Funded Amount (Cr)" />
                <SortBtn col="exposure"   label="Exposure" />
                <SortBtn col="ltp"        label="LTP" />
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => (
                <tr key={i} className="mtf-tr">
                  <td className="mtf-td mtf-td-rank">{i + 1}</td>
                  <td className="mtf-td mtf-td-company">
                    <div className="mtf-company-cell">
                      <StockAvatar symbol={s.symbol} />
                      <div>
                        <div className="mtf-company-name">{s.company}</div>
                        <div className="mtf-company-sym">{s.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mtf-td mtf-td-num">{fmtQty(s.fundedQty)}</td>
                  <td className="mtf-td mtf-td-num mtf-td-bold">{Number(s.fundedAmt).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="mtf-td mtf-td-num">
                    <span className="mtf-exp-bar-wrap">
                      <span className="mtf-exp-bar" style={{ width: `${Math.min(Number(s.exposure) * 20, 100)}%` }} />
                      <span className="mtf-exp-val">{fmtPct(s.exposure)}</span>
                    </span>
                  </td>
                  <td className="mtf-td mtf-td-num">
                    {s.ltp != null ? (
                      <div>
                        <span className="mtf-ltp-price">{Number(s.ltp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        {s.ltpPct != null && (
                          <span className="mtf-ltp-pct" style={{ color: pColor(s.ltpPct) }}>
                            {(s.ltpPct ?? 0) >= 0 ? ' ▲' : ' ▼'} {Math.abs(s.ltpPct).toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: 11 }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="mtf-more-wrap">
            <button className="mtf-more-btn" onClick={() => setPage(p => p + 1)}>
              Load more stocks ({sorted.length - paged.length} remaining)
            </button>
          </div>
        )}

        {tab !== 'overall' && sorted.length === 0 && (
          <div className="mtf-empty-tab">
            {tab === 'added' ? 'No new positions added vs previous session.' : 'No positions liquidated vs previous session.'}
            {' '}Upload a new CSV to compare with today.
          </div>
        )}
      </div>

      <div className="mtf-footer-note">
        Data sourced from NSE MTF disclosure. LTP fetched post market close.
        Not investment advice.
      </div>
    </div>
  );
}
