import { useState, useEffect } from 'react';

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '-';
  if (abs >= 10000) return `${sign}₹${(abs / 100).toFixed(0)}Cr`;
  if (abs >= 100)   return `${sign}₹${abs.toFixed(0)}Cr`;
  return `${sign}₹${abs.toFixed(2)}Cr`;
}

function TrendChart({ history }) {
  if (!history?.length) return null;
  // Need at least 2 days
  const days = history.slice(-7);
  if (days.length < 2) return null;

  const allVals = days.flatMap(d => [d.fiiNet, d.diiNet]);
  const maxAbs  = Math.max(...allVals.map(Math.abs), 1);

  const H = 100; // chart height in px
  const W = 100; // percent width per slot
  const midY = H / 2;
  const scale = (v) => midY - (v / maxAbs) * (midY * 0.85);

  const fiiPoints = days.map((d, i) => `${(i / (days.length - 1)) * 100},${scale(d.fiiNet)}`).join(' ');
  const diiPoints = days.map((d, i) => `${(i / (days.length - 1)) * 100},${scale(d.diiNet)}`).join(' ');

  const fmtDate = d => {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
    catch { return d; }
  };
  const fmtCr = n => {
    const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
    if (abs >= 10000) return `${sign}₹${(abs/100).toFixed(0)}Cr`;
    return `${sign}₹${abs.toFixed(0)}Cr`;
  };

  return (
    <div className="fiidii-trend">
      <div className="fiidii-trend-title">Last {days.length} Days — FII &amp; DII Net Flow</div>
      <div className="fiidii-trend-chart">
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="fiidii-svg">
          {/* Zero line */}
          <line x1="0" y1={midY} x2="100" y2={midY} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          {/* FII line */}
          <polyline points={fiiPoints} fill="none" stroke="#00C896" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {/* DII line */}
          <polyline points={diiPoints} fill="none" stroke="#4A9EFF" strokeWidth="1.5" strokeDasharray="3 2" vectorEffect="non-scaling-stroke" />
          {/* Dots */}
          {days.map((d, i) => {
            const x = (i / (days.length - 1)) * 100;
            return (
              <g key={i}>
                <circle cx={x} cy={scale(d.fiiNet)} r="1.5" fill="#00C896" vectorEffect="non-scaling-stroke" />
                <circle cx={x} cy={scale(d.diiNet)} r="1.5" fill="#4A9EFF" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
        {/* X-axis labels */}
        <div className="fiidii-trend-dates">
          {days.map((d, i) => (
            <div key={i} className="fiidii-trend-date">{fmtDate(d.date)}</div>
          ))}
        </div>
      </div>
      {/* Values table */}
      <div className="fiidii-trend-table">
        <div className="fiidii-trend-row fiidii-trend-head">
          <span>Date</span><span>FII Net</span><span>DII Net</span>
        </div>
        {days.map((d, i) => (
          <div key={i} className="fiidii-trend-row">
            <span>{fmtDate(d.date)}</span>
            <span className={d.fiiNet >= 0 ? 'gain' : 'loss'}>{fmtCr(d.fiiNet)}</span>
            <span className={d.diiNet >= 0 ? 'gain' : 'loss'}>{fmtCr(d.diiNet)}</span>
          </div>
        ))}
      </div>
      <div className="fiidii-trend-legend">
        <span><span style={{display:'inline-block',width:16,height:2,background:'#00C896',marginRight:5,verticalAlign:'middle'}}/>FII / FPI</span>
        <span><span style={{display:'inline-block',width:16,height:2,background:'#4A9EFF',marginRight:5,verticalAlign:'middle',borderTop:'2px dashed #4A9EFF'}}/>DII</span>
      </div>
    </div>
  );
}

export default function FiiDii() {
  const [d, setD]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/fiidii')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(true); } else { setD(data); }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return <div className="fno-loading">Fetching FII / DII data...</div>;
  if (error || !d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">FII / DII data unavailable</div>
      <div className="fiidii-unavail-sub">NSE blocks server requests intermittently. Data will appear when NSE responds.</div>
    </div>
  );

  const fiiPos = d.fiiNet >= 0;
  const diiPos = d.diiNet >= 0;

  return (
    <div className="fiidii-wrap">
      {/* Summary row */}
      <div className="fiidii-summary">
        <div className="fiidii-card">
          <div className="fiidii-card-label">FII / FPI</div>
          <div className={`fiidii-card-value ${fiiPos ? 'fii-buy' : 'fii-sell'}`}>{fmt(d.fiiNet)}</div>
          <div className="fiidii-card-tag">{fiiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {d.fiiBuy != null && <div className="fiidii-bs">Buy ₹{Math.abs(d.fiiBuy).toFixed(0)}Cr &nbsp;·&nbsp; Sell ₹{Math.abs(d.fiiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Foreign Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">DII</div>
          <div className={`fiidii-card-value ${diiPos ? 'dii-buy' : 'dii-sell'}`}>{fmt(d.diiNet)}</div>
          <div className="fiidii-card-tag">{diiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {d.diiBuy != null && <div className="fiidii-bs">Buy ₹{Math.abs(d.diiBuy).toFixed(0)}Cr &nbsp;·&nbsp; Sell ₹{Math.abs(d.diiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Domestic Institutional Investors</div>
        </div>
        <div className="fiidii-card fiidii-sentiment-card">
          <div className="fiidii-card-label">Market Mood</div>
          {(() => {
            if (fiiPos && diiPos)  return <><div className="fiidii-mood fiidii-bullish">BULLISH</div><div className="fiidii-mood-sub">Both FII &amp; DII buying</div></>;
            if (!fiiPos && !diiPos) return <><div className="fiidii-mood fiidii-bearish">BEARISH</div><div className="fiidii-mood-sub">Both FII &amp; DII selling</div></>;
            if (fiiPos && !diiPos) return <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">FII buying, DII selling</div></>;
            return <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">DII buying, FII selling</div></>;
          })()}
          <div className="fiidii-card-sub">{d.date ? `As of ${new Date(d.date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}` : 'Latest available'}</div>
        </div>
      </div>

      {/* Bar chart — last 10 days */}
      {d.history?.length > 1 && <TrendChart history={d.history} />}

      <div className="fiidii-note">
        Provisional data from NSE. Final figures published by NSDL/CDSL end of day.
        {d.source === 'nse-live' && <span className="fno-holiday-live"> · Live from NSE</span>}
      </div>
    </div>
  );
}
