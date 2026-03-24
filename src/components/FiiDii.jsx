import { useState, useEffect, useRef } from 'react';

function fmtDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return str; }
}

function fmtCr(n) {
  if (!n) return '0';
  const abs = Math.abs(n);
  if (abs >= 10000) return `${n < 0 ? '-' : '+'}₹${(abs/100).toFixed(1)}K Cr`;
  return `${n < 0 ? '-' : '+'}₹${abs.toFixed(0)} Cr`;
}

function BarGraph({ history }) {
  const [hovered, setHovered] = useState(null);
  if (!history?.length) return null;

  const maxAbs = Math.max(...history.flatMap(d => [Math.abs(d.fiiNet), Math.abs(d.diiNet)]), 1);
  const BAR_H  = 180; // max bar height in px

  return (
    <div className="fiig-wrap">
      <div className="fiig-title">FII vs DII — Net Flow (₹ Crores)</div>

      {/* Legend */}
      <div className="fiig-legend">
        <span className="fiig-leg-item"><span className="fiig-leg-dot" style={{background:'#00C896'}}/> FII / FPI</span>
        <span className="fiig-leg-item"><span className="fiig-leg-dot" style={{background:'#4A9EFF'}}/> DII</span>
        <span className="fiig-leg-zero">0 line</span>
      </div>

      {/* Chart area */}
      <div className="fiig-chart">
        {/* Y-axis labels */}
        <div className="fiig-yaxis">
          <span>{(maxAbs/100).toFixed(0)}K</span>
          <span>0</span>
          <span>-{(maxAbs/100).toFixed(0)}K</span>
        </div>

        {/* Bars */}
        <div className="fiig-bars">
          {history.map((day, i) => {
            const fiiH = (Math.abs(day.fiiNet) / maxAbs) * BAR_H;
            const diiH = (Math.abs(day.diiNet) / maxAbs) * BAR_H;
            const isHov = hovered === i;

            return (
              <div
                key={i}
                className={`fiig-col ${isHov ? 'fiig-col-hov' : ''}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Tooltip */}
                {isHov && (
                  <div className="fiig-tooltip">
                    <div className="fiig-tt-date">{fmtDate(day.date)}</div>
                    <div className="fiig-tt-row">
                      <span className="fiig-tt-dot" style={{background:'#00C896'}}/>
                      <span>FII</span>
                      <span className={day.fiiNet >= 0 ? 'fiig-pos' : 'fiig-neg'}>{fmtCr(day.fiiNet)}</span>
                    </div>
                    <div className="fiig-tt-row">
                      <span className="fiig-tt-dot" style={{background:'#4A9EFF'}}/>
                      <span>DII</span>
                      <span className={day.diiNet >= 0 ? 'fiig-pos' : 'fiig-neg'}>{fmtCr(day.diiNet)}</span>
                    </div>
                  </div>
                )}

                {/* Upper half — positive bars grow upward */}
                <div className="fiig-upper">
                  <div className="fiig-pair fiig-pair-up">
                    {day.fiiNet >= 0 && (
                      <div className="fiig-bar fiig-bar-fii fiig-bar-pos"
                        style={{height: fiiH, background: 'linear-gradient(180deg, #00C896 0%, rgba(0,200,150,0.6) 100%)'}} />
                    )}
                    {day.fiiNet < 0 && <div className="fiig-bar-spacer" />}
                    {day.diiNet >= 0 && (
                      <div className="fiig-bar fiig-bar-dii fiig-bar-pos"
                        style={{height: diiH, background: 'linear-gradient(180deg, #4A9EFF 0%, rgba(74,158,255,0.6) 100%)'}} />
                    )}
                    {day.diiNet < 0 && <div className="fiig-bar-spacer" />}
                  </div>
                </div>

                {/* Zero line */}
                <div className="fiig-zero-line" />

                {/* Lower half — negative bars grow downward */}
                <div className="fiig-lower">
                  <div className="fiig-pair fiig-pair-dn">
                    {day.fiiNet < 0 && (
                      <div className="fiig-bar fiig-bar-fii fiig-bar-neg"
                        style={{height: fiiH, background: 'linear-gradient(0deg, #FF4455 0%, rgba(255,68,85,0.6) 100%)'}} />
                    )}
                    {day.fiiNet >= 0 && <div className="fiig-bar-spacer" />}
                    {day.diiNet < 0 && (
                      <div className="fiig-bar fiig-bar-dii fiig-bar-neg"
                        style={{height: diiH, background: 'linear-gradient(0deg, #FF6B7A 0%, rgba(255,107,122,0.6) 100%)'}} />
                    )}
                    {day.diiNet >= 0 && <div className="fiig-bar-spacer" />}
                  </div>
                </div>

                {/* X label */}
                <div className="fiig-xlabel">{fmtDate(day.date)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Net totals row */}
      {history.length > 1 && (() => {
        const tf = history.reduce((s,d) => s + d.fiiNet, 0);
        const td = history.reduce((s,d) => s + d.diiNet, 0);
        return (
          <div className="fiig-totals">
            <span className="fiig-total-label">{history.length}-day net:</span>
            <span className={tf >= 0 ? 'fiig-pos' : 'fiig-neg'}>FII {fmtCr(tf)}</span>
            <span className="fiig-total-sep">·</span>
            <span className={td >= 0 ? 'fiig-pos' : 'fiig-neg'}>DII {fmtCr(td)}</span>
          </div>
        );
      })()}
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
      .then(data => { if (data.error) setError(true); else setD(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) return <div className="fno-loading">Fetching FII / DII data...</div>;
  if (error || !d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">FII / DII data unavailable</div>
      <div className="fiidii-unavail-sub">NSE intermittently blocks server requests.</div>
    </div>
  );

  const fiiPos  = d.fiiNet >= 0;
  const diiPos  = d.diiNet >= 0;

  return (
    <div className="fiidii-wrap">
      {/* Today cards */}
      <div className="fiidii-summary">
        <div className="fiidii-card">
          <div className="fiidii-card-label">FII / FPI</div>
          <div className={`fiidii-card-value ${fiiPos ? 'fii-buy' : 'fii-sell'}`}>
            {fiiPos?'+':''}{d.fiiNet.toFixed(0)} Cr
          </div>
          <div className="fiidii-card-tag">{fiiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {d.fiiBuy > 0 && <div className="fiidii-bs">Buy ₹{Math.abs(d.fiiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(d.fiiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Foreign Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">DII</div>
          <div className={`fiidii-card-value ${diiPos ? 'dii-buy' : 'dii-sell'}`}>
            {diiPos?'+':''}{d.diiNet.toFixed(0)} Cr
          </div>
          <div className="fiidii-card-tag">{diiPos ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {d.diiBuy > 0 && <div className="fiidii-bs">Buy ₹{Math.abs(d.diiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(d.diiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Domestic Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">Market Mood</div>
          {fiiPos&&diiPos   && <><div className="fiidii-mood fiidii-bullish">BULLISH</div><div className="fiidii-mood-sub">Both FII &amp; DII buying</div></>}
          {!fiiPos&&!diiPos && <><div className="fiidii-mood fiidii-bearish">BEARISH</div><div className="fiidii-mood-sub">Both FII &amp; DII selling</div></>}
          {fiiPos&&!diiPos  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">FII buying · DII selling</div></>}
          {!fiiPos&&diiPos  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">DII buying · FII selling</div></>}
          <div className="fiidii-card-sub">{d.date ? `As of ${fmtDate(d.date)}` : 'Latest'}</div>
        </div>
      </div>

      {/* Bar graph */}
      <BarGraph history={d.history || []} />
    </div>
  );
}
