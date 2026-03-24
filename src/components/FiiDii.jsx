import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function fmtDateShort(str) {
  try {
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return str; }
}
function fmtDateFull(str) {
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

// Returns true if we should attempt a fetch right now (5pm, 6:30pm, 7pm IST)
function shouldFetch() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h    = ist.getHours();
  const m    = ist.getMinutes();
  const mins = h * 60 + m;
  // Windows: 17:00–17:05, 18:30–18:35, 19:00–19:05
  return (mins >= 1020 && mins < 1025) ||
         (mins >= 1110 && mins < 1115) ||
         (mins >= 1140 && mins < 1145);
}

function FiiDiiChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!history?.length || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels    = history.map(d => fmtDateShort(d.date));
    const fiiData   = history.map(d => d.fiiNet);
    const diiData   = history.map(d => d.diiNet);
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
            backgroundColor: fiiData.map(v => v >= 0 ? 'rgba(0,200,150,0.85)' : 'rgba(255,68,85,0.85)'),
            borderRadius: 2,
            yAxisID: 'y1',
            order: 2,
          },
          {
            label: 'DII',
            data: diiData,
            backgroundColor: diiData.map(v => v >= 0 ? 'rgba(0,150,220,0.85)' : 'rgba(255,140,0,0.85)'),
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
              // Custom legend colours since backgroundColor is array
              generateLabels: (chart) => {
                return [
                  { text: 'FII (buy)', fillStyle: 'rgba(0,200,150,0.85)',  strokeStyle: 'transparent', lineWidth: 0 },
                  { text: 'FII (sell)', fillStyle: 'rgba(255,68,85,0.85)', strokeStyle: 'transparent', lineWidth: 0 },
                  { text: 'DII (buy)', fillStyle: 'rgba(0,150,220,0.85)',  strokeStyle: 'transparent', lineWidth: 0 },
                  { text: 'DII (sell)', fillStyle: 'rgba(255,140,0,0.85)', strokeStyle: 'transparent', lineWidth: 0 },
                  ...(hasNifty ? [{ text: 'Nifty 50', fillStyle: '#4A9EFF', strokeStyle: '#4A9EFF', lineWidth: 2 }] : []),
                ].map((l, i) => ({ ...l, datasetIndex: i, hidden: false, index: i }));
              },
            },
          },
          tooltip: {
            backgroundColor: '#1A1B1E',
            borderColor: '#2D2E32',
            borderWidth: 1,
            titleColor: '#E5E7EB',
            bodyColor: '#9CA3AF',
            titleFont: { family: 'monospace', size: 12, weight: 'bold' },
            bodyFont: { family: 'monospace', size: 11 },
            padding: 10,
            callbacks: {
              title: (items) => {
                // Show full date from data
                const idx = items[0]?.dataIndex;
                return idx != null ? fmtDateFull(history[idx]?.date) : '';
              },
              label: (ctx) => {
                const idx  = ctx.dataIndex;
                const day  = history[idx];
                if (!day) return '';
                if (ctx.dataset.label === 'Nifty 50') {
                  return ` Nifty 50: ${day.niftyClose?.toLocaleString('en-IN') || '—'}`;
                }
                if (ctx.dataset.label === 'FII') {
                  return [
                    ` FII Net: ${fmtCr(day.fiiNet)}`,
                    ` FII Buy: ₹${Math.abs(day.fiiBuy || 0).toFixed(0)} Cr`,
                    ` FII Sell: ₹${Math.abs(day.fiiSell || 0).toFixed(0)} Cr`,
                  ];
                }
                if (ctx.dataset.label === 'DII') {
                  return [
                    ` DII Net: ${fmtCr(day.diiNet)}`,
                    ` DII Buy: ₹${Math.abs(day.diiBuy || 0).toFixed(0)} Cr`,
                    ` DII Sell: ₹${Math.abs(day.diiSell || 0).toFixed(0)} Cr`,
                  ];
                }
                return '';
              },
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                const day = history[idx];
                if (!day) return [];
                const combined = (day.fiiNet || 0) + (day.diiNet || 0);
                return [``, ` Combined: ${fmtCr(combined)} ${combined >= 0 ? '↑ Net Inflow' : '↓ Net Outflow'}`];
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
            title: { display: hasNifty, text: 'Nifty 50', color: '#4A9EFF', font: { size: 10, family: 'monospace' } },
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
                if (abs >= 10000) return `${v < 0 ? '-' : ''}${(abs / 100).toFixed(0)}K`;
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

export default function FiiDii() {
  const [d, setD]       = useState(null);
  const [loading, setL] = useState(true);
  const [error, setE]   = useState(false);

  const doFetch = () => {
    fetch('/api/fiidii')
      .then(r => r.json())
      .then(data => { if (data.error) setE(true); else { setD(data); setE(false); } setL(false); })
      .catch(() => { setE(true); setL(false); });
  };

  useEffect(() => {
    // Always fetch once on mount to show latest cached data
    doFetch();

    // Auto-refetch only at 5:00 PM, 6:30 PM, 7:00 PM IST
    // Check every minute if we're in a 5-min fetch window
    const id = setInterval(() => {
      if (shouldFetch()) doFetch();
    }, 60 * 1000);

    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="fno-loading">Fetching FII / DII data...</div>;
  if (error || !d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">FII / DII data unavailable</div>
      <div className="fiidii-unavail-sub">NSE intermittently blocks server requests. Data updates at 5:00 PM, 6:30 PM and 7:00 PM IST.</div>
    </div>
  );

  const history = d.history || [];
  const latest  = history[history.length - 1] || d;
  const fP = latest.fiiNet >= 0, dP = latest.diiNet >= 0;

  return (
    <div className="fiidii-wrap">

      {/* Label */}
      <div className="fiidii-segment-label">CASH MARKET (EQUITY)</div>

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
          <div className="fiidii-card-sub">{latest.date ? `As of ${fmtDateFull(latest.date)}` : 'Latest'} · Updates 5pm / 6:30pm / 7pm IST</div>
        </div>
      </div>

      {/* Chart */}
      {history.length > 1 && (
        <div className="fiidii-chart-wrap">
          <div className="fiidii-chart-header">
            <span className="fiidii-chart-title">FII &amp; DII Net Flow — Last {history.length} Trading Days</span>
            <div className="fiidii-chart-legend">
              <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(0,200,150,0.85)',borderRadius:2,marginRight:4}}/>FII buy</span>
              <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(255,68,85,0.85)',borderRadius:2,marginRight:4}}/>FII sell</span>
              <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(0,150,220,0.85)',borderRadius:2,marginRight:4}}/>DII buy</span>
              <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(255,140,0,0.85)',borderRadius:2,marginRight:4}}/>DII sell</span>
            </div>
          </div>
          <FiiDiiChart history={history} />
        </div>
      )}

      {/* Summary strip */}
      {history.length > 1 && (() => {
        const tf = history.reduce((s, day) => s + day.fiiNet, 0);
        const td = history.reduce((s, day) => s + day.diiNet, 0);
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
