import { useState, useEffect, useRef } from 'react';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtCr  = v => v != null ? `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr` : '--';
const fmtAmt = v => v != null ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--';
const fmtQty = v => v != null ? Number(v).toLocaleString('en-IN') : '--';
const fmtPct = v => v != null ? `${Number(v).toFixed(2)}%` : '--';
const pColor = v => v == null ? '#888' : v >= 0 ? '#00c896' : '#ff4455';
const PAGE_STEP = 30;

function symbolColor(sym) {
  const palette = ['#4A9EFF','#00C896','#A78BFA','#F59E0B','#FF4455','#FB923C','#34D399','#F472B6','#60A5FA'];
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) & 0xFFFFFF;
  return palette[Math.abs(h) % palette.length];
}

function Avatar({ symbol, size = 38 }) {
  const c = symbolColor(symbol);
  const init = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 2) || symbol.slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c + '18', border: `1.5px solid ${c}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: c, fontSize: size * 0.26, fontWeight: 800,
      letterSpacing: '0.03em', flexShrink: 0,
      fontFamily: 'ui-monospace, monospace',
    }}>
      {init}
    </div>
  );
}

function LtpDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', opacity: 0.35 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: 'currentColor',
          animation: `mtfm-pulse 1.2s ${i*0.2}s ease-in-out infinite`,
        }} />
      ))}
    </span>
  );
}

// ── Hero summary card ─────────────────────────────────────────────────────────
function HeroCard({ summary }) {
  const net = summary.netChange ?? 0;
  const isNet = net >= 0;
  return (
    <div style={{
      margin: '12px 16px 0',
      background: 'var(--card, #1a1a1a)',
      border: '1px solid var(--border, #2a2a2a)',
      borderRadius: 16,
      padding: '20px 20px 18px',
    }}>
      {/* Total book */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text3, #888)', textTransform: 'uppercase', marginBottom: 4 }}>
          Total MTF Book
        </div>
        <div style={{
          fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em',
          color: 'var(--text, #f0f0f0)',
          fontFamily: 'ui-monospace, monospace',
          lineHeight: 1,
        }}>
          {fmtCr(summary.totalBook)}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border, #2a2a2a)', margin: '0 0 14px' }} />

      {/* Added vs Liquidated row */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', color: '#00c896', textTransform: 'uppercase', marginBottom: 3 }}>
            Added
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#00c896', fontFamily: 'ui-monospace, monospace' }}>
            +{fmtCr(summary.positionsAdded)}
          </div>
        </div>
        <div style={{ width: 1, background: 'var(--border, #2a2a2a)', margin: '0 16px' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', color: '#ff4455', textTransform: 'uppercase', marginBottom: 3 }}>
            Liquidated
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#ff4455', fontFamily: 'ui-monospace, monospace' }}>
            -{fmtCr(summary.positionsLiquidated)}
          </div>
        </div>
      </div>

      {/* Net */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: (isNet ? '#00c896' : '#ff4455') + '12',
        border: `1px solid ${(isNet ? '#00c896' : '#ff4455')}30`,
        borderRadius: 10, padding: '8px 12px',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: isNet ? '#00c896' : '#ff4455' }}>
          {isNet ? '▲' : '▼'}
        </span>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text3, #888)', marginRight: 6 }}>
            Net {isNet ? 'added' : 'liquidated'}
          </span>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: isNet ? '#00c896' : '#ff4455',
            fontFamily: 'ui-monospace, monospace',
          }}>
            {isNet ? '+' : '-'}{fmtCr(Math.abs(net))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Top 5 horizontal cards ─────────────────────────────────────────────────────
function TopStockCard({ stock, rank }) {
  const hasLTP = stock.ltp != null;
  const c = symbolColor(stock.symbol);
  return (
    <div style={{
      minWidth: '72vw', maxWidth: '72vw',
      background: 'var(--card, #1a1a1a)',
      border: '1px solid var(--border, #2a2a2a)',
      borderRadius: 14, padding: '16px',
      flexShrink: 0, scrollSnapAlign: 'start',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: c, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Avatar symbol={stock.symbol} size={36} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #f0f0f0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stock.company}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3, #888)', fontFamily: 'ui-monospace, monospace', marginTop: 1 }}>
            {stock.symbol}
          </div>
        </div>
        <div style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 700,
          background: c + '20', color: c, borderRadius: 6,
          padding: '2px 7px', letterSpacing: '0.05em', flexShrink: 0,
        }}>
          #{rank}
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--text3, #888)', marginBottom: 2 }}>Funded value</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text, #f0f0f0)', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
          ₹{fmtAmt(stock.fundedAmt)} Cr
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text3, #888)', marginBottom: 2 }}>Price</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, #f0f0f0)', fontFamily: 'ui-monospace, monospace' }}>
            {hasLTP ? `₹${fmtAmt(stock.ltp)}` : <LtpDots />}
          </div>
        </div>
        {hasLTP && (
          <div style={{
            fontSize: 12, fontWeight: 700, color: pColor(stock.ltpPct),
            background: pColor(stock.ltpPct) + '18', borderRadius: 6,
            padding: '3px 8px', fontFamily: 'ui-monospace, monospace',
          }}>
            {(stock.ltpPct ?? 0) >= 0 ? '+' : ''}{(stock.ltpPct ?? 0).toFixed(2)}%
          </div>
        )}
        <div style={{
          fontSize: 9, fontWeight: 700, color: 'var(--text3, #888)',
          background: 'var(--border, #2a2a2a)', borderRadius: 5, padding: '2px 6px',
        }}>
          {fmtPct(stock.exposure)} of book
        </div>
      </div>
    </div>
  );
}

// ── Stock list card ───────────────────────────────────────────────────────────
function StockCard({ stock, rank, isNew }) {
  const hasLTP = stock.ltp != null;
  const dayChange = stock.dayChange ?? 0;
  const hasChange = stock.dayChange != null;

  return (
    <div style={{
      background: 'var(--card, #1a1a1a)',
      border: '1px solid var(--border, #2a2a2a)',
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: isNew ? 'mtfm-fadein 0.2s ease' : 'none',
    }}>
      {/* Rank */}
      <div style={{
        width: 26, textAlign: 'center', flexShrink: 0,
        fontSize: 11, fontWeight: 700, color: 'var(--text3, #888)',
        fontFamily: 'ui-monospace, monospace',
      }}>
        {rank}
      </div>

      <Avatar symbol={stock.symbol} size={38} />

      {/* Stock info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text, #f0f0f0)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {stock.company}
          </div>
          {hasChange && (
            <span style={{
              fontSize: 9, fontWeight: 700, flexShrink: 0,
              color: dayChange > 0 ? '#00c896' : '#ff4455',
              background: (dayChange > 0 ? '#00c896' : '#ff4455') + '18',
              borderRadius: 5, padding: '1px 5px',
            }}>
              {dayChange > 0 ? 'Added' : 'Liquidated'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3, #888)', fontFamily: 'ui-monospace, monospace' }}>
          {stock.symbol} &middot; {fmtQty(stock.fundedQty)} shares
        </div>
      </div>

      {/* Right: funded + price */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: 'var(--text, #f0f0f0)',
          fontFamily: 'ui-monospace, monospace', lineHeight: 1.2,
        }}>
          ₹{fmtAmt(stock.fundedAmt)} Cr
        </div>
        <div style={{
          fontSize: 11, marginTop: 3,
          color: hasLTP ? pColor(stock.ltpPct) : 'var(--text3, #888)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {hasLTP
            ? `${(stock.ltpPct ?? 0) >= 0 ? '+' : ''}${(stock.ltpPct ?? 0).toFixed(2)}%`
            : <LtpDots />
          }
        </div>
      </div>
    </div>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
function BottomNav({ setView, currentView }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const mainTabs = [
    { id: 'grid',     label: 'Markets', icon: '◎' },
    { id: 'fno',      label: 'F&O',     icon: '⬡' },
    { id: 'mtf',      label: 'MTF',     icon: '◈' },
    { id: '__more__', label: 'More',    icon: '···' },
  ];

  const moreItems = [
    { id: 'delivery', label: 'Delivery', icon: '📦' },
    { id: 'ipo',      label: 'IPO',      icon: '🚀' },
    { id: 'gold',     label: 'Gold',     icon: '🪙' },
    { id: 'calc',     label: 'Risk',     icon: '⚖️' },
  ];

  const nav = (id) => {
    setMoreOpen(false);
    setView(id);
  };

  return (
    <>
      {/* More drawer overlay */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99, backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* More drawer */}
      {moreOpen && (
        <div style={{
          position: 'fixed', bottom: 64, left: 16, right: 16,
          background: 'var(--card, #1a1a1a)',
          border: '1px solid var(--border, #2a2a2a)',
          borderRadius: 16, zIndex: 100, padding: '8px 0',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        }}>
          {moreItems.map(item => (
            <button key={item.id}
              onClick={() => nav(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '14px 20px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text, #f0f0f0)', fontSize: 15, fontWeight: 600,
                textAlign: 'left',
              }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Nav bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--card, #111)',
        borderTop: '1px solid var(--border, #2a2a2a)',
        display: 'flex', height: 60, zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {mainTabs.map(tab => {
          const active = tab.id === 'mtf' ? currentView === 'mtf' : currentView === tab.id;
          const isMore = tab.id === '__more__';
          return (
            <button key={tab.id}
              onClick={() => isMore ? setMoreOpen(o => !o) : nav(tab.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'none', border: 'none', cursor: 'pointer',
                color: active ? '#4A9EFF' : 'var(--text3, #666)',
                transition: 'color 0.15s',
              }}>
              <span style={{ fontSize: 18, lineHeight: 1, fontFamily: 'ui-monospace, monospace' }}>
                {tab.icon}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MtfMobilePage({ setView }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tab,         setTab]         = useState('overall');
  const [sortBy,      setSortBy]      = useState('fundedAmt');
  const [visibleRows, setVisibleRows] = useState(PAGE_STEP);
  const [newRowStart, setNewRowStart] = useState(null);
  const [ltpLoading,  setLtpLoading]  = useState(false);
  const [ltpMsg,      setLtpMsg]      = useState(null);
  const listRef = useRef(null);

  // Inject keyframes once
  useEffect(() => {
    if (!document.getElementById('mtfm-styles')) {
      const s = document.createElement('style');
      s.id = 'mtfm-styles';
      s.textContent = `
        @keyframes mtfm-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes mtfm-pulse  { 0%,100% { opacity: 0.2; } 50% { opacity: 0.7; } }
        @keyframes mtfm-spin   { to { transform: rotate(360deg); } }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const fetchLTP = async () => {
    setLtpLoading(true);
    setLtpMsg(null);
    try {
      const r    = await fetch('/api/mtf?action=ltp');
      const json = await r.json();
      if (json.ok) {
        setLtpMsg({ ok: true, text: `LTP updated. ${json.fetchesRemaining ?? 0} left today.` });
        const d = await fetch('/api/mtf').then(r => r.json());
        if (!d.empty) setData(d);
      } else if (json.reason === 'daily_limit') {
        setLtpMsg({ ok: false, text: 'Daily limit reached. Resets midnight IST.' });
      } else {
        setLtpMsg({ ok: false, text: json.error || 'LTP fetch failed.' });
      }
    } catch {
      setLtpMsg({ ok: false, text: 'Network error.' });
    }
    setLtpLoading(false);
    setTimeout(() => setLtpMsg(null), 4000);
  };

  useEffect(() => {
    fetch('/api/mtf')
      .then(r => r.json())
      .then(d => { setData(d.empty ? null : d); setLoading(false); })
      .catch(() => { setError('Could not load MTF data.'); setLoading(false); });
  }, []);

  // Shared wrapper
  const Wrapper = ({ children }) => (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg, #0d0d0d)',
      fontFamily: 'var(--font, system-ui, sans-serif)',
      color: 'var(--text, #f0f0f0)',
    }}>
      {children}
    </div>
  );

  if (loading) return (
    <Wrapper>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16 }}>
        <div style={{ width: 28, height: 28, border: '2.5px solid var(--border,#333)', borderTopColor: '#4A9EFF', borderRadius: '50%', animation: 'mtfm-spin 0.8s linear infinite' }} />
        <div style={{ fontSize: 13, color: 'var(--text3, #888)' }}>Loading MTF data...</div>
      </div>
    </Wrapper>
  );

  if (error || !data) return (
    <Wrapper>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 10, padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>{error ? '⚠️' : '📊'}</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{error ? 'Could not load data' : 'No data uploaded yet'}</div>
        <div style={{ fontSize: 13, color: 'var(--text3, #888)', lineHeight: 1.6 }}>
          {error || 'Upload the NSE MTF CSV from the admin page to get started.'}
        </div>
      </div>
    </Wrapper>
  );

  const { summary, stocks, date } = data;
  const remaining = data.fetchesRemaining ?? (data.limit ?? 5);

  const fmtDate = d => {
    if (!d) return '';
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  // Filter + sort
  const tabStocks = tab === 'added'      ? stocks.filter(s => (s.dayChange ?? 0) > 0)
    : tab === 'liquidated' ? stocks.filter(s => (s.dayChange ?? 0) < 0)
    : stocks;

  const sorted = [...tabStocks].sort((a, b) => {
    if (sortBy === 'ltpPct') return Math.abs(b.ltpPct ?? 0) - Math.abs(a.ltpPct ?? 0);
    return (b.fundedAmt ?? 0) - (a.fundedAmt ?? 0);
  });

  const paged   = sorted.slice(0, visibleRows);
  const canLoad = visibleRows < sorted.length;

  const loadMore = () => {
    const prev = visibleRows;
    const next = Math.min(visibleRows + PAGE_STEP, sorted.length);
    setNewRowStart(prev);
    setVisibleRows(next);
  };

  const top5 = [...stocks].sort((a, b) => b.fundedAmt - a.fundedAmt).slice(0, 5);

  return (
    <Wrapper>
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg, #0d0d0d)',
        borderBottom: '1px solid var(--border, #1e1e1e)',
        padding: '12px 16px 11px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text, #f0f0f0)', lineHeight: 1 }}>
            MTF Flows
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3, #888)', marginTop: 2 }}>
            {fmtDate(date)}&nbsp;&bull;&nbsp;
            <span style={{ color: '#00c896', fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        <button
          onClick={fetchLTP}
          disabled={ltpLoading || remaining === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: ltpLoading ? 'var(--border,#2a2a2a)' : '#4A9EFF20',
            border: '1px solid #4A9EFF40',
            borderRadius: 8, padding: '7px 12px',
            color: remaining === 0 ? '#666' : '#4A9EFF',
            fontSize: 12, fontWeight: 700, cursor: ltpLoading ? 'default' : 'pointer',
            opacity: remaining === 0 ? 0.5 : 1,
          }}>
          {ltpLoading
            ? <span style={{ width: 12, height: 12, border: '2px solid #4A9EFF40', borderTopColor: '#4A9EFF', borderRadius: '50%', animation: 'mtfm-spin 0.7s linear infinite', display: 'inline-block' }} />
            : '↻'
          }
          Fetch LTP
          <span style={{ fontSize: 10, opacity: 0.7 }}>({remaining})</span>
        </button>
      </div>

      {/* LTP toast */}
      {ltpMsg && (
        <div style={{
          margin: '8px 16px 0',
          background: ltpMsg.ok ? '#00c89618' : '#ff445518',
          border: `1px solid ${ltpMsg.ok ? '#00c89640' : '#ff445540'}`,
          borderRadius: 10, padding: '10px 14px',
          fontSize: 12, color: ltpMsg.ok ? '#00c896' : '#ff4455',
          fontWeight: 600,
        }}>
          {ltpMsg.text}
        </div>
      )}

      {/* ── Hero summary ───────────────────────────────────────────────────── */}
      <HeroCard summary={summary} />

      {/* ── Top 5 horizontal scroll ────────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text, #f0f0f0)' }}>
            Top funded stocks
          </div>
          <button
            onClick={() => { setTab('overall'); setSortBy('fundedAmt'); window.scrollTo({ top: document.getElementById('mtfm-list')?.offsetTop - 120, behavior: 'smooth' }); }}
            style={{ fontSize: 12, color: '#4A9EFF', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            View all →
          </button>
        </div>
        <div style={{
          display: 'flex', gap: 12, overflowX: 'auto', paddingLeft: 16, paddingRight: 16,
          scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}>
          {top5.map((s, i) => <TopStockCard key={s.symbol} stock={s} rank={i + 1} />)}
          {/* Trailing spacer to hint scroll */}
          <div style={{ minWidth: 8, flexShrink: 0 }} />
        </div>
      </div>

      {/* ── Sticky filter tabs ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 57, zIndex: 40,
        background: 'var(--bg, #0d0d0d)',
        borderBottom: '1px solid var(--border, #1e1e1e)',
        padding: '10px 16px',
        display: 'flex', gap: 8,
      }}>
        {[
          { id: 'overall',    label: 'Overall' },
          { id: 'added',      label: 'Added' },
          { id: 'liquidated', label: 'Liquidated' },
        ].map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); setVisibleRows(PAGE_STEP); }}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
              background: tab === t.id
                ? (t.id === 'added' ? '#00c89620' : t.id === 'liquidated' ? '#ff445520' : '#4A9EFF20')
                : 'var(--card, #1a1a1a)',
              color: tab === t.id
                ? (t.id === 'added' ? '#00c896' : t.id === 'liquidated' ? '#ff4455' : '#4A9EFF')
                : 'var(--text3, #888)',
              border: tab === t.id
                ? `1px solid ${t.id === 'added' ? '#00c89640' : t.id === 'liquidated' ? '#ff445540' : '#4A9EFF40'}`
                : '1px solid var(--border, #2a2a2a)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── List section ───────────────────────────────────────────────────── */}
      <div id="mtfm-list" ref={listRef} style={{ padding: '12px 16px 0' }}>
        {/* Sort + count row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text3, #888)' }}>
            Showing {Math.min(visibleRows, sorted.length)} of {sorted.length}
          </div>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setVisibleRows(PAGE_STEP); }}
            style={{
              background: 'var(--card, #1a1a1a)',
              border: '1px solid var(--border, #2a2a2a)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 12, color: 'var(--text, #f0f0f0)', cursor: 'pointer',
            }}>
            <option value="fundedAmt">Funded value</option>
            <option value="ltpPct">Change %</option>
          </select>
        </div>

        {/* Stock cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paged.map((s, i) => (
            <StockCard
              key={s.symbol}
              stock={s}
              rank={i + 1}
              isNew={newRowStart != null && i >= newRowStart}
            />
          ))}
        </div>

        {/* Load more */}
        {canLoad && (
          <button
            onClick={loadMore}
            style={{
              display: 'block', width: '100%', margin: '16px 0',
              padding: '14px', borderRadius: 12,
              background: 'var(--card, #1a1a1a)',
              border: '1px solid var(--border, #2a2a2a)',
              color: '#4A9EFF', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.02em',
            }}>
            Load more stocks
          </button>
        )}

        {!canLoad && paged.length > 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text3, #888)' }}>
            All {sorted.length} stocks loaded
          </div>
        )}

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--text3, #888)' }}>
            No stocks in this category yet.
          </div>
        )}

        {/* Footer disclaimer */}
        <div style={{
          textAlign: 'center', fontSize: 11, color: 'var(--text3, #666)',
          lineHeight: 1.6, padding: '12px 8px 88px',
        }}>
          Data sourced from NSE. For informational purposes only.
        </div>
      </div>

      {/* ── Bottom nav ─────────────────────────────────────────────────────── */}
      <BottomNav setView={setView} currentView="mtf" />
    </Wrapper>
  );
}
