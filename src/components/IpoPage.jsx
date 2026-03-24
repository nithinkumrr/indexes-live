import { useState, useEffect } from 'react';

function fmt(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}
function fmtCr(v) {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n >= 1000) return `₹${(n/100).toFixed(0)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
}

function StatusBadge({ open, close, list }) {
  const now = new Date();
  const o = open  ? new Date(open)  : null;
  const c = close ? new Date(close) : null;
  const l = list  ? new Date(list)  : null;
  if (o && o > now) return <span className="ipo-badge ipo-upcoming">Upcoming</span>;
  if (c && c >= now) return <span className="ipo-badge ipo-open">Open</span>;
  if (l && l > now) return <span className="ipo-badge ipo-allot">Allotment</span>;
  return <span className="ipo-badge ipo-listed">Listed</span>;
}

function GmpBadge({ gmp, gmpPct }) {
  if (gmp == null || gmp === 0) return <span className="ipo-gmp-nil">—</span>;
  const pos = gmp > 0;
  return (
    <span className={`ipo-gmp ${pos ? 'ipo-gmp-pos' : 'ipo-gmp-neg'}`}>
      {pos ? '+' : ''}{gmp} ({gmpPct != null ? `${pos?'+':''}${gmpPct}%` : ''})
    </span>
  );
}

const TABS = ['Active', 'Upcoming', 'Recent', 'GMP'];

export default function IpoPage() {
  const [data, setData]   = useState(null);
  const [loading, setL]   = useState(true);
  const [tab, setTab]     = useState('Active');

  useEffect(() => {
    fetch('/api/ipo')
      .then(r => r.json())
      .then(d => { setData(d); setL(false); })
      .catch(() => setL(false));
  }, []);

  const allActive = [...(data?.active || []), ...(data?.upcoming || []).filter(i => {
    const o = i.openDate ? new Date(i.openDate) : null;
    return o && (o - new Date()) < 3 * 24 * 3600000; // opening in 3 days
  })];

  return (
    <div className="ipo-wrap">
      <div className="ipo-header">
        <div>
          <div className="ipo-title">IPO Hub</div>
          <div className="ipo-subtitle">Active, upcoming IPOs · Grey Market Premium · NSE &amp; BSE</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ipo-tabs">
        {TABS.map(t => (
          <button key={t} className={`ipo-tab ${tab === t ? 'ipo-tab-active' : ''}`} onClick={() => setTab(t)}>
            {t}
            {t === 'Active'   && data?.active?.length   > 0 && <span className="ipo-count">{data.active.length}</span>}
            {t === 'Upcoming' && data?.upcoming?.length > 0 && <span className="ipo-count">{data.upcoming.length}</span>}
            {t === 'GMP'      && data?.gmp?.length      > 0 && <span className="ipo-count">{data.gmp.length}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="fno-loading">Fetching IPO data from NSE...</div>}

      {!loading && data && (
        <>
          {/* Active / Open IPOs */}
          {tab === 'Active' && (
            <div className="ipo-section">
              {data.active.length === 0
                ? <div className="ipo-empty">No IPOs currently open for subscription</div>
                : data.active.map((ipo, i) => <IpoCard key={i} ipo={ipo} gmpData={data.gmp} />)
              }
            </div>
          )}

          {/* Upcoming */}
          {tab === 'Upcoming' && (
            <div className="ipo-section">
              {data.upcoming.length === 0
                ? <div className="ipo-empty">No upcoming IPOs announced yet</div>
                : data.upcoming.map((ipo, i) => <IpoCard key={i} ipo={ipo} gmpData={data.gmp} />)
              }
            </div>
          )}

          {/* Recent / Listed */}
          {tab === 'Recent' && (
            <div className="ipo-section">
              <table className="ipo-table">
                <thead><tr>
                  <th>Company</th><th>Issue Price</th><th>List Date</th>
                  <th>Sub Times</th><th>Exchange</th>
                </tr></thead>
                <tbody>
                  {data.recent.length === 0
                    ? <tr><td colSpan="5" className="ipo-empty">No recent IPO data</td></tr>
                    : data.recent.map((ipo, i) => (
                      <tr key={i}>
                        <td className="ipo-td-name">{ipo.name}</td>
                        <td className="ipo-td">₹{ipo.priceHigh || ipo.priceLow || '—'}</td>
                        <td className="ipo-td">{fmt(ipo.listDate)}</td>
                        <td className="ipo-td">{ipo.subTimes ? `${parseFloat(ipo.subTimes).toFixed(1)}x` : '—'}</td>
                        <td className="ipo-td">{ipo.exchange || 'NSE'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}

          {/* GMP */}
          {tab === 'GMP' && (
            <div className="ipo-section">
              <div className="ipo-gmp-note">
                Grey Market Premium (GMP) is the unofficial premium at which IPO shares trade before listing.
                GMP is speculative and not regulated — use only as a sentiment indicator.
              </div>
              <table className="ipo-table">
                <thead><tr>
                  <th>Company</th><th>Issue Price</th><th>GMP</th><th>Expected Listing</th>
                </tr></thead>
                <tbody>
                  {data.gmp.length === 0
                    ? <tr><td colSpan="4" className="ipo-empty">No GMP data available</td></tr>
                    : data.gmp.map((g, i) => (
                      <tr key={i}>
                        <td className="ipo-td-name">{g.name}</td>
                        <td className="ipo-td">{g.price ? `₹${g.price}` : '—'}</td>
                        <td className="ipo-td"><GmpBadge gmp={g.gmp} gmpPct={g.gmpPct} /></td>
                        <td className="ipo-td">{g.price && g.gmp ? `₹${g.price + g.gmp}` : '—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
              <div className="ipo-source">Source: investorgain.com · GMP is unofficial grey market data · Not investment advice</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IpoCard({ ipo, gmpData }) {
  const gmp = gmpData?.find(g => g.name?.toLowerCase().includes(ipo.name?.toLowerCase().slice(0,8)));
  return (
    <div className="ipo-card">
      <div className="ipo-card-top">
        <div>
          <div className="ipo-card-name">{ipo.name}</div>
          <div className="ipo-card-exchange">{ipo.exchange || 'NSE'} · {ipo.issueSize ? fmtCr(ipo.issueSize) : ''}</div>
        </div>
        <StatusBadge open={ipo.openDate} close={ipo.closeDate} list={ipo.listDate} />
      </div>
      <div className="ipo-card-grid">
        <div className="ipo-card-stat"><span>Price Band</span><strong>{ipo.priceLow && ipo.priceHigh ? `₹${ipo.priceLow}–₹${ipo.priceHigh}` : ipo.priceHigh ? `₹${ipo.priceHigh}` : '—'}</strong></div>
        <div className="ipo-card-stat"><span>Lot Size</span><strong>{ipo.lotSize || '—'} shares</strong></div>
        <div className="ipo-card-stat"><span>Open</span><strong>{fmt(ipo.openDate)}</strong></div>
        <div className="ipo-card-stat"><span>Close</span><strong>{fmt(ipo.closeDate)}</strong></div>
        <div className="ipo-card-stat"><span>Listing</span><strong>{fmt(ipo.listDate)}</strong></div>
        {ipo.subTimes && <div className="ipo-card-stat"><span>Subscribed</span><strong>{parseFloat(ipo.subTimes).toFixed(1)}x</strong></div>}
        {gmp && gmp.gmp !== 0 && <div className="ipo-card-stat"><span>GMP</span><strong><GmpBadge gmp={gmp.gmp} gmpPct={gmp.gmpPct} /></strong></div>}
        {ipo.priceHigh && gmp?.gmp > 0 && <div className="ipo-card-stat"><span>Est. Listing</span><strong className="gain">₹{ipo.priceHigh + gmp.gmp} (+{gmp.gmpPct}%)</strong></div>}
      </div>
    </div>
  );
}
