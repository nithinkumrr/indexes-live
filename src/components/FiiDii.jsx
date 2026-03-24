import { useState, useEffect } from 'react';

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n >= 0 ? '+' : '-';
  if (abs >= 1000) return `${sign}₹${(abs / 100).toFixed(0)}Cr`;
  return `${sign}₹${abs.toFixed(0)}Cr`;
}

function BarChart({ history }) {
  if (!history?.length) return null;
  const max = Math.max(...history.map(d => Math.max(Math.abs(d.fiiNet), Math.abs(d.diiNet))));
  if (max === 0) return null;

  return (
    <div className="fiidii-chart">
      {history.map((d, i) => {
        const fPct = (Math.abs(d.fiiNet) / max) * 100;
        const dPct = (Math.abs(d.diiNet) / max) * 100;
        const label = d.date ? new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
        return (
          <div key={i} className="fiidii-bar-col">
            <div className="fiidii-bar-pair">
              <div className="fiidii-bar-wrap">
                <div className="fiidii-bar fii-bar" style={{
                  height: `${fPct}%`,
                  background: d.fiiNet >= 0 ? '#00C896' : '#FF4455',
                }} title={`FII: ${fmt(d.fiiNet)}`} />
              </div>
              <div className="fiidii-bar-wrap">
                <div className="fiidii-bar dii-bar" style={{
                  height: `${dPct}%`,
                  background: d.diiNet >= 0 ? '#4A9EFF' : '#F59E0B',
                }} title={`DII: ${fmt(d.diiNet)}`} />
              </div>
            </div>
            <div className="fiidii-bar-date">{label}</div>
          </div>
        );
      })}
      <div className="fiidii-legend">
        <span><span className="fiidii-dot" style={{background:'#00C896'}} /> FII Net Buy</span>
        <span><span className="fiidii-dot" style={{background:'#FF4455'}} /> FII Net Sell</span>
        <span><span className="fiidii-dot" style={{background:'#4A9EFF'}} /> DII Net Buy</span>
        <span><span className="fiidii-dot" style={{background:'#F59E0B'}} /> DII Net Sell</span>
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
          <div className={`fiidii-card-value ${fiiPos ? 'fii-buy' : 'fii-sell'}`}>
            {fmt(d.fiiNet)}
          </div>
          <div className="fiidii-card-tag">{fiiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          <div className="fiidii-card-sub">Foreign Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">DII</div>
          <div className={`fiidii-card-value ${diiPos ? 'dii-buy' : 'dii-sell'}`}>
            {fmt(d.diiNet)}
          </div>
          <div className="fiidii-card-tag">{diiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
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
      {d.history?.length > 1 && <BarChart history={d.history} />}

      <div className="fiidii-note">
        Provisional data from NSE. Final figures published by NSDL/CDSL end of day.
        {d.source === 'nse-live' && <span className="fno-holiday-live"> · Live from NSE</span>}
      </div>
    </div>
  );
}
