import { useState, useEffect } from 'react';

function fmtCr(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '';
  if (abs >= 10000) return `${sign}${n.toFixed(0)}`;
  return `${sign}${n.toFixed(1)}`;
}

function fmtDate(str) {
  try {
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return str; }
}

function cellBg(val, type, maxAbs) {
  if (!val) return 'transparent';
  const intensity = Math.min(Math.abs(val) / maxAbs, 1);
  if (type === 'fii') {
    return val >= 0
      ? `rgba(0, 200, 150, ${0.15 + intensity * 0.55})`
      : `rgba(255, 68, 85,  ${0.15 + intensity * 0.55})`;
  }
  return val >= 0
    ? `rgba(0, 200, 150, ${0.15 + intensity * 0.55})`
    : `rgba(255, 68, 85,  ${0.15 + intensity * 0.55})`;
}

function cellColor(val) {
  if (!val) return 'var(--text3)';
  return val >= 0 ? 'var(--gain)' : 'var(--loss)';
}

export default function FiiDii() {
  const [d, setD]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/fiidii')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(true);
        else setD(data);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return <div className="fno-loading">Fetching FII / DII data...</div>;
  if (error || !d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">FII / DII data unavailable</div>
      <div className="fiidii-unavail-sub">NSE blocks server requests intermittently. Try again shortly.</div>
    </div>
  );

  const fiiPos = d.fiiNet >= 0;
  const diiPos = d.diiNet >= 0;
  const history = d.history || [];

  // For color intensity scaling
  const allVals = history.flatMap(h => [Math.abs(h.fiiNet), Math.abs(h.diiNet)]).filter(Boolean);
  const maxAbs  = allVals.length ? Math.max(...allVals) : 1;

  // Total row
  const totalFii = history.reduce((s, h) => s + (h.fiiNet || 0), 0);
  const totalDii = history.reduce((s, h) => s + (h.diiNet || 0), 0);

  return (
    <div className="fiidii-wrap">

      {/* Today's summary cards */}
      <div className="fiidii-summary">
        <div className="fiidii-card">
          <div className="fiidii-card-label">FII / FPI</div>
          <div className={`fiidii-card-value ${fiiPos ? 'fii-buy' : 'fii-sell'}`}>
            {fiiPos ? '+' : ''}₹{Math.abs(d.fiiNet).toFixed(0)}Cr
          </div>
          <div className="fiidii-card-tag">{fiiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {d.fiiBuy > 0 && <div className="fiidii-bs">Buy ₹{Math.abs(d.fiiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(d.fiiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Foreign Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">DII</div>
          <div className={`fiidii-card-value ${diiPos ? 'dii-buy' : 'dii-sell'}`}>
            {diiPos ? '+' : ''}₹{Math.abs(d.diiNet).toFixed(0)}Cr
          </div>
          <div className="fiidii-card-tag">{diiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {d.diiBuy > 0 && <div className="fiidii-bs">Buy ₹{Math.abs(d.diiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(d.diiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Domestic Institutional Investors</div>
        </div>
        <div className="fiidii-card fiidii-sentiment-card">
          <div className="fiidii-card-label">Market Mood</div>
          {fiiPos && diiPos   && <><div className="fiidii-mood fiidii-bullish">BULLISH</div><div className="fiidii-mood-sub">Both FII &amp; DII buying</div></>}
          {!fiiPos && !diiPos && <><div className="fiidii-mood fiidii-bearish">BEARISH</div><div className="fiidii-mood-sub">Both FII &amp; DII selling</div></>}
          {fiiPos && !diiPos  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">FII buying · DII selling</div></>}
          {!fiiPos && diiPos  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">DII buying · FII selling</div></>}
          <div className="fiidii-card-sub">{d.date ? `As of ${fmtDate(d.date)}` : 'Latest available'}</div>
        </div>
      </div>

      {/* History table — Zerodha-style color heatmap */}
      {history.length > 0 && (
        <div className="fiidii-table-wrap">
          <div className="fiidii-table-title">FII-DII Activity (₹ Crores) · Source: NSE</div>
          <table className="fiidii-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>FII Net Value</th>
                <th>DII Net Value</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((row, i) => (
                <tr key={i}>
                  <td className="fiidii-td-date">{fmtDate(row.date)}</td>
                  <td className="fiidii-td-val" style={{ background: cellBg(row.fiiNet, 'fii', maxAbs), color: cellColor(row.fiiNet) }}>
                    {fmtCr(row.fiiNet)}
                  </td>
                  <td className="fiidii-td-val" style={{ background: cellBg(row.diiNet, 'dii', maxAbs), color: cellColor(row.diiNet) }}>
                    {fmtCr(row.diiNet)}
                  </td>
                </tr>
              ))}
              {history.length > 1 && (
                <tr className="fiidii-total-row">
                  <td className="fiidii-td-date">Total</td>
                  <td className="fiidii-td-val" style={{ background: cellBg(totalFii, 'fii', maxAbs * history.length), color: cellColor(totalFii) }}>
                    {fmtCr(totalFii)}
                  </td>
                  <td className="fiidii-td-val" style={{ background: cellBg(totalDii, 'dii', maxAbs * history.length), color: cellColor(totalDii) }}>
                    {fmtCr(totalDii)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
