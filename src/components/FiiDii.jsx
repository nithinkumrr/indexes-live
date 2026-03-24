import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function fmtDate(str) {
  try {
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return str; }
}
function fmtCr(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
  if (abs >= 10000) return `${sign}₹${(abs / 100).toFixed(1)}K Cr`;
  return `${sign}₹${abs.toFixed(0)} Cr`;
}

function FiiDiiChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!history?.length || !canvasRef.current) return;

    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels   = history.map(d => fmtDate(d.date));
      const fiiData  = history.map(d => d.fiiNet);
      const diiData  = history.map(d => d.diiNet);
      // Fake Nifty line using cumulative net as proxy if no price data
      const niftyData = history.map(d => d.niftyClose || null);
      const hasNifty  = niftyData.some(v => v != null);

      const ctx = canvasRef.current.getContext('2d');
      chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'FII',
              data: fiiData,
              backgroundColor: fiiData.map(v => v >= 0 ? 'rgba(255,165,50,0.85)' : 'rgba(255,80,50,0.85)'),
              borderRadius: 2,
              yAxisID: 'y1',
              order: 2,
            },
            {
              label: 'DII',
              data: diiData,
              backgroundColor: diiData.map(v => v >= 0 ? 'rgba(99,120,255,0.85)' : 'rgba(180,80,255,0.75)'),
              borderRadius: 2,
              yAxisID: 'y1',
              order: 2,
            },
            ...(hasNifty ? [{
              label: 'Nifty 50',
              data: niftyData,
              type: 'line',
              borderColor: '#4A9EFF',
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: false,
              tension: 0.4,
              yAxisID: 'y0',
              order: 1,
            }] : []),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#9CA3AF',
                font: { family: 'monospace', size: 11 },
                boxWidth: 12,
                padding: 16,
              },
            },
            tooltip: {
              backgroundColor: '#1A1B1E',
              borderColor: '#2D2E32',
              borderWidth: 1,
              titleColor: '#E5E7EB',
              bodyColor: '#9CA3AF',
              titleFont: { family: 'monospace', size: 11 },
              bodyFont: { family: 'monospace', size: 11 },
              callbacks: {
                label: ctx => {
                  const v = ctx.parsed.y;
                  if (ctx.dataset.label === 'Nifty 50') return ` Nifty: ${v?.toLocaleString('en-IN')}`;
                  return ` ${ctx.dataset.label}: ${fmtCr(v)}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#6B7280', font: { family: 'monospace', size: 10 }, maxRotation: 45 },
            },
            y0: {
              type: 'linear',
              position: 'left',
              display: hasNifty,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: {
                color: '#4A9EFF',
                font: { family: 'monospace', size: 10 },
                callback: v => v?.toLocaleString('en-IN'),
              },
              title: { display: true, text: 'Nifty 50', color: '#4A9EFF', font: { size: 10, family: 'monospace' } },
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: !hasNifty, color: 'rgba(255,255,255,0.05)' },
              ticks: {
                color: '#9CA3AF',
                font: { family: 'monospace', size: 10 },
                callback: v => {
                  const abs = Math.abs(v);
                  if (abs >= 10000) return `${v < 0 ? '-' : ''}${(abs/100).toFixed(0)}K`;
                  return `${v < 0 ? '-' : ''}${abs.toFixed(0)}`;
                },
              },
              title: { display: true, text: 'Transactions (₹Cr)', color: '#9CA3AF', font: { size: 10, family: 'monospace' } },
            },
          },
        },
      });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [history]);

  return (
    <div style={{ position: 'relative', height: 320, width: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

const SEGMENTS = [
  { key: 'equity',       label: 'Equity' },
  { key: 'indexFutures', label: 'Index Future' },
  { key: 'indexOptions', label: 'Index Option' },
  { key: 'stockFutures', label: 'Stock Future' },
  { key: 'stockOptions', label: 'Stock Options' },
];

export default function FiiDii() {
  const [d, setD]           = useState(null);
  const [loading, setL]     = useState(true);
  const [error, setE]       = useState(false);
  const [segment, setSegment] = useState('equity');

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

  // Map history to selected segment
  const rawHistory = d.history || [];
  const history = rawHistory.map(day => ({
    date:       day.date,
    niftyClose: day.niftyClose,
    ...(day.segments?.[segment] || { fiiNet: day.fiiNet, fiiBuy: day.fiiBuy, fiiSell: day.fiiSell, diiNet: day.diiNet, diiBuy: day.diiBuy, diiSell: day.diiSell }),
  }));

  const latest  = history[history.length - 1] || {};
  const fP = latest.fiiNet >= 0, dP = latest.diiNet >= 0;

  return (
    <div className="fiidii-wrap">

      {/* Segment tabs */}
      <div className="fiidii-tabs">
        {SEGMENTS.map(s => (
          <button key={s.key}
            className={`fiidii-tab ${segment === s.key ? 'fiidii-tab-active' : ''}`}
            onClick={() => setSegment(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="fiidii-summary">
        <div className="fiidii-card">
          <div className="fiidii-card-label">FII / FPI</div>
          <div className={`fiidii-card-value ${fP ? 'fii-buy' : 'fii-sell'}`}>{fmtCr(latest.fiiNet)}</div>
          <div className="fiidii-card-tag">{fP ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {latest.fiiBuy > 0 && <div className="fiidii-bs">Buy ₹{Math.abs(latest.fiiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(latest.fiiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Foreign Institutional</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">DII</div>
          <div className={`fiidii-card-value ${dP ? 'dii-buy' : 'dii-sell'}`}>{fmtCr(latest.diiNet)}</div>
          <div className="fiidii-card-tag">{dP ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {latest.diiBuy > 0 && <div className="fiidii-bs">Buy ₹{Math.abs(latest.diiBuy).toFixed(0)}Cr · Sell ₹{Math.abs(latest.diiSell).toFixed(0)}Cr</div>}
          <div className="fiidii-card-sub">Domestic Institutional</div>
        </div>
        <div className="fiidii-card">
          <div className="fiidii-card-label">Market Mood</div>
          {fP && dP   && <><div className="fiidii-mood fiidii-bullish">BULLISH</div><div className="fiidii-mood-sub">Both buying</div></>}
          {!fP && !dP && <><div className="fiidii-mood fiidii-bearish">BEARISH</div><div className="fiidii-mood-sub">Both selling</div></>}
          {fP && !dP  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">FII buying · DII selling</div></>}
          {!fP && dP  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">DII buying · FII selling</div></>}
          <div className="fiidii-card-sub">{latest.date ? `As of ${fmtDate(latest.date)}` : 'Latest'}</div>
        </div>
      </div>

      {/* Bar chart */}
      {history.length > 1 && (
        <div className="fiidii-chart-wrap">
          <div className="fiidii-chart-header">
            <span className="fiidii-chart-title">FII &amp; DII Net Flow — Last {history.length} Days</span>
            <div className="fiidii-chart-legend">
              <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(255,165,50,0.85)',borderRadius:2,marginRight:4}}/>FII</span>
              <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(99,120,255,0.85)',borderRadius:2,marginRight:4}}/>DII</span>
              <span><span style={{display:'inline-block',width:20,height:2,background:'#4A9EFF',marginRight:4,verticalAlign:'middle'}}/>Nifty 50</span>
            </div>
          </div>
          <FiiDiiChart history={history} />
        </div>
      )}

      {/* 7-day summary strip */}
      {history.length > 1 && (() => {
        const tf = history.reduce((s, d) => s + d.fiiNet, 0);
        const td = history.reduce((s, d) => s + d.diiNet, 0);
        return (
          <div className="fc-summary">
            <div className="fc-sum-block">
              <span className="fc-sum-lbl">FII {history.length}-day total</span>
              <span className={`fc-sum-val ${tf >= 0 ? 'fc-tip-buy' : 'fc-tip-sell'}`}>{fmtCr(tf)}</span>
              <span className="fc-sum-days">{history.filter(d=>d.fiiNet>=0).length} buy · {history.filter(d=>d.fiiNet<0).length} sell days</span>
            </div>
            <div className="fc-sum-div"/>
            <div className="fc-sum-block">
              <span className="fc-sum-lbl">DII {history.length}-day total</span>
              <span className={`fc-sum-val ${td >= 0 ? 'fc-tip-buy' : 'fc-tip-sell'}`}>{fmtCr(td)}</span>
              <span className="fc-sum-days">{history.filter(d=>d.diiNet>=0).length} buy · {history.filter(d=>d.diiNet<0).length} sell days</span>
            </div>
            <div className="fc-sum-div"/>
            <div className="fc-sum-block">
              <span className="fc-sum-lbl">Combined net</span>
              <span className={`fc-sum-val ${(tf+td) >= 0 ? 'fc-tip-buy' : 'fc-tip-sell'}`}>{fmtCr(tf+td)}</span>
              <span className="fc-sum-days">{(tf+td) >= 0 ? 'Net inflow' : 'Net outflow'}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
