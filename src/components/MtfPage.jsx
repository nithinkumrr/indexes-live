import { useState, useEffect, useRef } from 'react';

const fmtQty = v => v != null ? Number(v).toLocaleString('en-IN') : '--';
const fmtPct = v => v != null ? `${Number(v).toFixed(2)}%` : '--';
const pColor = v => v == null ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';
const fmtCr  = v => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` : '--';
const fmtAmt = v => v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';

const PAGE_STEP = 30;
const MAX_ROWS  = 80;

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
              <span>{fmtAmt(stock.ltp)}</span>
              <span style={{ color: pColor(stock.ltpPct), fontSize: 11, marginLeft: 6 }}>
                {(stock.ltpPct ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(stock.ltpPct ?? 0).toFixed(2)}%
              </span>
            </div>
          ) : (
            <div className="mtf-top-card-price">
              <span className="mtf-ltp-nil" title="LTP not yet fetched">
                <span className="mtf-ltp-nil-dot"/><span className="mtf-ltp-nil-dot"/><span className="mtf-ltp-nil-dot"/>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mtf-top-card-meta">
        <div className="mtf-top-card-row">
          <span className="mtf-top-card-k">Funded Value</span>
          <span className="mtf-top-card-v">{fmtAmt(stock.fundedAmt)} Cr</span>
        </div>
        <div className="mtf-top-card-row">
          <span className="mtf-top-card-k">Shares</span>
          <span className="mtf-top-card-v">
            {fmtQty(stock.fundedQty)}
            <span style={{ color: 'var(--text3)', marginLeft: 4 }}>({Number(stock.exposure).toFixed(2)}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MtfPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('overall');
  const [sortBy,      setSortBy]      = useState('fundedAmt');
  const [visibleRows, setVisibleRows] = useState(PAGE_STEP);
  const [newRows,     setNewRows]     = useState(0);
  const [ltpLoading,  setLtpLoading]  = useState(false);
  const [ltpMsg,      setLtpMsg]      = useState(null);

  const fetchLTP = async () => {
    setLtpLoading(true);
    setLtpMsg(null);
    try {
      const r    = await fetch('/api/mtf?action=ltp');
      const json = await r.json();
      if (json.ok) {
        setLtpMsg({ ok: true, text: `LTP updated for ${json.count} stocks via ${json.source}. ${json.fetchesRemaining} fetch${json.fetchesRemaining !== 1 ? 'es' : ''} remaining today.` });
        const d = await fetch('/api/mtf').then(r => r.json());
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
    fetch('/api/mtf')
      .then(r => r.json())
      .then(d => { setData(d.empty ? null : d); setLoading(false); })
      .catch(() => { setError('Could not load MTF data.'); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="mtf-state">
      <div className="mtf-spinner" /><span>Loading MTF data...</span>
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
        NSE MTF CSV has not been uploaded yet. Once uploaded, industry MTF book, top stocks and exposure data will appear here.
      </div>
    </div>
  );

  const { summary, stocks, date, ltpUpdatedAt, fetchesRemaining, limit } = data;
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

  const tabStocks = tab === 'added' ? stocks.filter(s => (s.dayChange ?? 0) > 0)
    : tab === 'liquidated' ? stocks.filter(s => (s.dayChange ?? 0) < 0)
    : stocks;

  const sorted = [...tabStocks].sort((a, b) => {
    if (sortBy === 'fundedAmt') return b.fundedAmt - a.fundedAmt;
    if (sortBy === 'exposure')  return b.exposure  - a.exposure;
    if (sortBy === 'fundedQty') return b.fundedQty - a.fundedQty;
    if (sortBy === 'ltp')       return (b.ltp ?? 0) - (a.ltp ?? 0);
    return 0;
  });

  const capped  = sorted.slice(0, MAX_ROWS);
  const paged   = capped.slice(0, visibleRows);
  const canLoad = visibleRows < capped.length;
  const atMax   = visibleRows >= MAX_ROWS && capped.length >= MAX_ROWS;

  const loadMore = () => {
    const prev = visibleRows;
    const next = Math.min(visibleRows + PAGE_STEP, capped.length);
    setNewRows(next - prev);
    setVisibleRows(next);
  };

  const SortBtn = ({ col, label }) => (
    <th className={`mtf-th mtf-th-sort ${sortBy === col ? 'mtf-th-active' : ''}`}
      onClick={() => { setSortBy(col); setVisibleRows(PAGE_STEP); setNewRows(0); }}>
      {label}{sortBy === col ? ' ▼' : ''}
    </th>
  );

  const netPositive = (summary.netChange ?? 0) >= 0;
  const top5 = stocks.slice(0, 5);
  const showingLabel = canLoad
    ? `Showing ${paged.length} of top ${capped.length}`
    : atMax
      ? `Showing top ${MAX_ROWS} stocks`
      : `${capped.length} stocks`;

  return (
    <div className="mtf-wrap">

      {/* HEADER */}
      <div className="mtf-header">
        <div className="mtf-header-left">
          <h1 className="mtf-title">MTF Flows</h1>
          {date && <span className="mtf-date">as on {fmtDate(date)}</span>}
        </div>
        <div className="mtf-header-right">
          {ltpUpdatedAt && (
            <div className="mtf-ltp-badge">
              <span className="mtf-ltp-dot" />
              LTP {fmtTime(ltpUpdatedAt)}
            </div>
          )}
          <button className="mtf-ltp-btn" onClick={fetchLTP}
            disabled={ltpLoading || remaining <= 0}
            title={remaining <= 0 ? 'Daily limit reached. Resets at midnight IST.' : `Fetch latest LTP (${remaining} of ${limit ?? 5} remaining today)`}>
            {ltpLoading ? <><span className="mtf-btn-spin" /> Fetching...</> : 'Fetch LTP'}
          </button>
          <span className="mtf-fetch-count" style={{ color: remaining <= 0 ? 'var(--loss)' : remaining <= 2 ? '#F59E0B' : 'var(--text3)' }}>
            {remaining ?? '--'}/{limit ?? 5} left
          </span>
        </div>
      </div>

      {ltpMsg && (
        <div className="mtf-ltp-msg" style={{
          background:  ltpMsg.ok ? 'rgba(0,200,150,.08)' : 'rgba(255,68,85,.08)',
          borderColor: ltpMsg.ok ? 'rgba(0,200,150,.3)'  : 'rgba(255,68,85,.3)',
          color:       ltpMsg.ok ? 'var(--gain)'          : 'var(--loss)',
        }}>{ltpMsg.text}</div>
      )}

      {/* SUMMARY */}
      <div className="mtf-summary">
        <SummaryCard label="Industry MTF Book"   value={fmtCr(summary.totalBook)} />
        <SummaryCard label="Positions Added"      value={`+${fmtCr(summary.positionsAdded)}`}     valueColor="var(--gain)" />
        <SummaryCard label="Positions Liquidated" value={`-${fmtCr(summary.positionsLiquidated)}`} valueColor="var(--loss)" />
        <SummaryCard label="Net Book Change"
          value={`${netPositive ? '+' : '-'}${fmtCr(Math.abs(summary.netChange))}`}
          sub={netPositive ? 'Net Expansion' : 'Net Liquidated'}
          valueColor={netPositive ? 'var(--gain)' : 'var(--loss)'} />
      </div>

      {/* TOP 5 */}
      <div className="mtf-top-label">Top MTF Stocks by Funded Value</div>
      <div className="mtf-top-row">
        {top5.map((s, i) => <TopCard key={i} stock={s} />)}
      </div>

      {/* TABLE */}
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
                onClick={() => { setTab(t.id); setVisibleRows(PAGE_STEP); setNewRows(0); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="mtf-table-count">{showingLabel}</div>
        </div>

        <div className="mtf-table-wrap">
          <table className="mtf-table">
            <thead>
              <tr>
                <th className="mtf-th mtf-th-left mtf-th-rank">#</th>
                <th className="mtf-th mtf-th-left">Company</th>
                <SortBtn col="fundedQty"  label="Funded Qty" />
                <SortBtn col="fundedAmt"  label="Funded Amt (Cr)" />
                <SortBtn col="exposure"   label="Exposure" />
                <SortBtn col="ltp"        label="LTP" />
              </tr>
            </thead>
            <tbody>
              {paged.map((s, i) => {
                const isNew   = i >= (visibleRows - newRows);
                const isTop10 = i < 10;
                return (
                  <tr key={`${tab}-${s.symbol}`}
                    className={`mtf-tr${i % 2 === 1 ? ' mtf-tr-alt' : ''}${isNew ? ' mtf-tr-new' : ''}`}>
                    <td className="mtf-td mtf-td-rank" style={{ opacity: isTop10 ? 1 : 0.65 }}>{i + 1}</td>
                    <td className="mtf-td mtf-td-company">
                      <div className="mtf-company-cell">
                        <StockAvatar symbol={s.symbol} />
                        <div>
                          <div className="mtf-company-name" style={{ fontWeight: isTop10 ? 700 : 600, opacity: isTop10 ? 1 : 0.9 }}>{s.company}</div>
                          <div className="mtf-company-sym">{s.symbol}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mtf-td mtf-td-num" style={{ opacity: isTop10 ? 1 : 0.8 }}>{fmtQty(s.fundedQty)}</td>
                    <td className="mtf-td mtf-td-num mtf-td-bold" style={{ opacity: isTop10 ? 1 : 0.85 }}>{fmtAmt(s.fundedAmt)}</td>
                    <td className="mtf-td mtf-td-num">
                      <span className="mtf-exp-bar-wrap">
                        <span className="mtf-exp-bar" style={{ width: `${Math.min(Number(s.exposure) * 20, 100)}%` }} />
                        <span className="mtf-exp-val" style={{ opacity: isTop10 ? 1 : 0.8 }}>{fmtPct(s.exposure)}</span>
                      </span>
                    </td>
                    <td className="mtf-td mtf-td-num">
                      {s.ltp != null ? (
                        <>
                          <span className="mtf-ltp-price">{fmtAmt(s.ltp)}</span>
                          {s.ltpPct != null && (
                            <span className="mtf-ltp-pct" style={{ color: pColor(s.ltpPct) }}>
                              {(s.ltpPct ?? 0) >= 0 ? ' ▲' : ' ▼'}{Math.abs(s.ltpPct).toFixed(2)}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="mtf-ltp-nil" title="LTP not yet fetched">
                          <span className="mtf-ltp-nil-dot"/><span className="mtf-ltp-nil-dot"/><span className="mtf-ltp-nil-dot"/>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mtf-more-wrap">
          {canLoad && !atMax ? (
            <button className="mtf-more-btn" onClick={loadMore}>
              Load next {Math.min(PAGE_STEP, capped.length - visibleRows)}
            </button>
          ) : atMax ? (
            <span className="mtf-more-status">Showing top {MAX_ROWS} stocks</span>
          ) : null}
        </div>

        {tab !== 'overall' && sorted.length === 0 && (
          <div className="mtf-empty-tab">
            {tab === 'added' ? 'No new positions added vs previous session.' : 'No positions liquidated vs previous session.'}
            {' '}Upload a new CSV to compare.
          </div>
        )}
      </div>

      <div className="mtf-footer-note">
        Data sourced from NSE MTF disclosure. LTP fetched post market close. Not investment advice.
      </div>
    </div>
  );
}
