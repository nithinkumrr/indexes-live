import { useState, useEffect } from 'react';

function fmtDate(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return str; }
}
function fmtCr(n) {
  const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
  if (abs >= 10000) return `${sign}₹${(abs/100).toFixed(1)}K Cr`;
  return `${sign}₹${abs.toFixed(0)} Cr`;
}

function FlowChart({ history }) {
  const [hov, setHov] = useState(null);
  if (!history?.length) return null;

  const maxAbs = Math.max(...history.flatMap(d => [Math.abs(d.fiiNet), Math.abs(d.diiNet)]), 1);
  const HALF   = 160; // px each side of zero

  return (
    <div className="fc-root">
      <div className="fc-header">
        <span className="fc-title">FII &amp; DII Net Flow — Last {history.length} Days</span>
        <div className="fc-legend">
          <span className="fc-leg"><span className="fc-leg-sq fc-green"/>Buying</span>
          <span className="fc-leg"><span className="fc-leg-sq fc-red"/>Selling</span>
          <span className="fc-leg fc-leg-dim">FII = solid · DII = striped</span>
        </div>
      </div>

      <div className="fc-chart-area">
        {/* Y axis */}
        <div className="fc-yaxis">
          <span>{(maxAbs/100).toFixed(0)}K</span>
          <span className="fc-yaxis-mid">0</span>
          <span>-{(maxAbs/100).toFixed(0)}K</span>
        </div>

        {/* Columns */}
        <div className="fc-cols">
          {history.map((day, i) => {
            const fH = (Math.abs(day.fiiNet) / maxAbs) * HALF;
            const dH = (Math.abs(day.diiNet) / maxAbs) * HALF;
            const fUp = day.fiiNet >= 0;
            const dUp = day.diiNet >= 0;
            const isH = hov === i;

            return (
              <div key={i} className={`fc-col${isH ? ' fc-col-hov' : ''}`}
                onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>

                {/* Tooltip */}
                {isH && (
                  <div className={`fc-tip ${i >= history.length - 2 ? 'fc-tip-left' : ''}`}>
                    <div className="fc-tip-date">{fmtDate(day.date)}</div>
                    <div className="fc-tip-row">
                      <span className="fc-tip-label">FII</span>
                      <span className={fUp ? 'fc-tip-buy' : 'fc-tip-sell'}>{fmtCr(day.fiiNet)}</span>
                    </div>
                    <div className="fc-tip-row">
                      <span className="fc-tip-label">DII</span>
                      <span className={dUp ? 'fc-tip-buy' : 'fc-tip-sell'}>{fmtCr(day.diiNet)}</span>
                    </div>
                    <div className="fc-tip-combined">
                      Net: <span className={(day.fiiNet+day.diiNet)>=0?'fc-tip-buy':'fc-tip-sell'}>{fmtCr(day.fiiNet+day.diiNet)}</span>
                    </div>
                  </div>
                )}

                {/* UPPER half — buying bars grow UP */}
                <div className="fc-upper" style={{height: HALF}}>
                  <div className="fc-bar-group fc-bar-group-up">
                    {/* FII bar */}
                    <div className="fc-bar-slot">
                      {fUp && (
                        <div className="fc-bar fc-bar-fii"
                          style={{height: fH, background: 'linear-gradient(180deg,#00C896,rgba(0,200,150,0.45))'}}/>
                      )}
                    </div>
                    {/* DII bar */}
                    <div className="fc-bar-slot">
                      {dUp && (
                        <div className="fc-bar fc-bar-dii"
                          style={{height: dH, background: 'repeating-linear-gradient(45deg,rgba(0,200,150,0.9),rgba(0,200,150,0.9) 3px,rgba(0,200,150,0.45) 3px,rgba(0,200,150,0.45) 6px)'}}/>
                      )}
                    </div>
                  </div>
                </div>

                {/* Zero line */}
                <div className="fc-zero"/>

                {/* LOWER half — selling bars grow DOWN */}
                <div className="fc-lower" style={{height: HALF}}>
                  <div className="fc-bar-group fc-bar-group-dn">
                    <div className="fc-bar-slot">
                      {!fUp && (
                        <div className="fc-bar fc-bar-fii"
                          style={{height: fH, background: 'linear-gradient(0deg,#FF4455,rgba(255,68,85,0.45))'}}/>
                      )}
                    </div>
                    <div className="fc-bar-slot">
                      {!dUp && (
                        <div className="fc-bar fc-bar-dii"
                          style={{height: dH, background: 'repeating-linear-gradient(45deg,rgba(255,68,85,0.9),rgba(255,68,85,0.9) 3px,rgba(255,68,85,0.45) 3px,rgba(255,68,85,0.45) 6px)'}}/>
                      )}
                    </div>
                  </div>
                </div>

                <div className="fc-xlabel">{fmtDate(day.date)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary strip */}
      {history.length > 1 && (() => {
        const tf = history.reduce((s,d)=>s+d.fiiNet,0);
        const td = history.reduce((s,d)=>s+d.diiNet,0);
        const fBuyDays = history.filter(d=>d.fiiNet>=0).length;
        const dBuyDays = history.filter(d=>d.diiNet>=0).length;
        return (
          <div className="fc-summary">
            <div className="fc-sum-block">
              <span className="fc-sum-lbl">FII {history.length}-day total</span>
              <span className={`fc-sum-val ${tf>=0?'fc-tip-buy':'fc-tip-sell'}`}>{fmtCr(tf)}</span>
              <span className="fc-sum-days">{fBuyDays} buy · {history.length-fBuyDays} sell days</span>
            </div>
            <div className="fc-sum-div"/>
            <div className="fc-sum-block">
              <span className="fc-sum-lbl">DII {history.length}-day total</span>
              <span className={`fc-sum-val ${td>=0?'fc-tip-buy':'fc-tip-sell'}`}>{fmtCr(td)}</span>
              <span className="fc-sum-days">{dBuyDays} buy · {history.length-dBuyDays} sell days</span>
            </div>
            <div className="fc-sum-div"/>
            <div className="fc-sum-block">
              <span className="fc-sum-lbl">Combined net</span>
              <span className={`fc-sum-val ${(tf+td)>=0?'fc-tip-buy':'fc-tip-sell'}`}>{fmtCr(tf+td)}</span>
              <span className="fc-sum-days">{(tf+td)>=0?'Net inflow':'Net outflow'}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function FiiDii() {
  const [d, setD]       = useState(null);
  const [loading, setL] = useState(true);
  const [error, setE]   = useState(false);

  useEffect(() => {
    fetch('/api/fiidii')
      .then(r => r.json())
      .then(data => { if (data.error) setE(true); else setD(data); setL(false); })
      .catch(() => { setE(true); setL(false); });
  }, []);

  if (loading) return <div className="fno-loading">Fetching FII / DII data...</div>;
  if (error || !d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">FII / DII data unavailable</div>
      <div className="fiidii-unavail-sub">NSE intermittently blocks server requests.</div>
    </div>
  );

  const fP = d.fiiNet >= 0, dP = d.diiNet >= 0;
  return (
    <div className="fiidii-wrap">
      <div className="fiidii-summary">
        <div className="fiidii-card">
          <div className="fiidii-card-label">FII / FPI</div>
          <div className={`fiidii-card-value ${fP?'fii-buy':'fii-sell'}`}>{fP?'+':''}{d.fiiNet.toFixed(0)} Cr</div>
          <div className="fiidii-card-tag">{fP?'↑ Net Buyers':'↓ Net Sellers'}</div>
          {d.fiiBuy>0 && <div className="fiidii-bs">Buy ₹{Math.abs(d.fiiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(d.fiiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Foreign Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">DII</div>
          <div className={`fiidii-card-value ${dP?'dii-buy':'dii-sell'}`}>{dP?'+':''}{d.diiNet.toFixed(0)} Cr</div>
          <div className="fiidii-card-tag">{dP?'↑ Net Buyers':'↓ Net Sellers'}</div>
          {d.diiBuy>0 && <div className="fiidii-bs">Buy ₹{Math.abs(d.diiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(d.diiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Domestic Institutional Investors</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">Market Mood</div>
          {fP&&dP   && <><div className="fiidii-mood fiidii-bullish">BULLISH</div><div className="fiidii-mood-sub">Both buying</div></>}
          {!fP&&!dP && <><div className="fiidii-mood fiidii-bearish">BEARISH</div><div className="fiidii-mood-sub">Both selling</div></>}
          {fP&&!dP  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">FII buying · DII selling</div></>}
          {!fP&&dP  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">DII buying · FII selling</div></>}
          <div className="fiidii-card-sub">{d.date?`As of ${fmtDate(d.date)}`:'Latest'}</div>
        </div>
      </div>
      <FlowChart history={d.history||[]} />
    </div>
  );
}
