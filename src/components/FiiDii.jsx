import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

function fmtDateShort(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
  catch { return str; }
}
function fmtDateFull(str) {
  try { return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return str; }
}
function fmtCr(n) {
  if (n == null || isNaN(n)) return '-';
  const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
  if (abs >= 10000) return `${sign}₹${(abs / 100).toFixed(1)}K Cr`;
  return `${sign}₹${abs.toFixed(0)} Cr`;
}
function shouldFetch() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return (mins >= 1020 && mins < 1025) || (mins >= 1110 && mins < 1115) || (mins >= 1140 && mins < 1145);
}

function FiiDiiChart({ history }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!history?.length || !canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const labels  = history.map(d => fmtDateShort(d.date));
    const fiiData = history.map(d => d.fiiNet ?? 0);
    const diiData = history.map(d => d.diiNet ?? 0);

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
            borderRadius: 3,
          },
          {
            label: 'DII',
            data: diiData,
            backgroundColor: diiData.map(v => v >= 0 ? 'rgba(74,158,255,0.85)' : 'rgba(255,140,0,0.85)'),
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 4, bottom: 0, left: 0, right: 4 } },
        interaction: { mode: 'index', intersect: false },
        barPercentage: 0.75,
        categoryPercentage: 0.8,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#16171A',
            borderColor: '#333',
            borderWidth: 1,
            titleColor: '#E5E7EB',
            bodyColor: '#9CA3AF',
            titleFont: { family: 'monospace', size: 12, weight: 'bold' },
            bodyFont: { family: 'monospace', size: 11 },
            padding: 12,
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex;
                return idx != null ? fmtDateFull(history[idx]?.date) : '';
              },
              label: (item) => {
                const day = history[item.dataIndex];
                if (!day) return '';
                if (item.dataset.label === 'FII') {
                  const lines = [`FII Net : ${fmtCr(day.fiiNet)}`];
                  if (day.fiiBuy)  lines.push(`  Buy   : ₹${Math.abs(day.fiiBuy).toFixed(0)} Cr`);
                  if (day.fiiSell) lines.push(`  Sell  : ₹${Math.abs(day.fiiSell).toFixed(0)} Cr`);
                  return lines;
                }
                if (item.dataset.label === 'DII') {
                  const lines = [`DII Net : ${fmtCr(day.diiNet)}`];
                  if (day.diiBuy)  lines.push(`  Buy   : ₹${Math.abs(day.diiBuy).toFixed(0)} Cr`);
                  if (day.diiSell) lines.push(`  Sell  : ₹${Math.abs(day.diiSell).toFixed(0)} Cr`);
                  lines.push(``, `Combined: ${fmtCr((day.fiiNet||0)+(day.diiNet||0))}`);
                  return lines;
                }
                return '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#6B7280', font: { family: 'monospace', size: 10 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#9CA3AF',
              font: { family: 'monospace', size: 10 },
              callback: v => {
                const abs = Math.abs(v);
                if (abs >= 1000) return `${v < 0 ? '-' : ''}${(abs/100).toFixed(0)}K`;
                return `${v < 0 ? '-' : ''}${abs}`;
              },
            },
            title: { display: true, text: '₹ Crore', color: '#6B7280', font: { size: 9, family: 'monospace' } },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [history]);

  return (
    <div style={{ position: 'relative', height: 300, width: '100%' }}>
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
    doFetch();
    const id = setInterval(() => { if (shouldFetch()) doFetch(); }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="fno-loading">Fetching FII / DII data...</div>;
  if (error || !d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">FII / DII data unavailable</div>
      <div className="fiidii-unavail-sub">NSE intermittently blocks server requests. Updates at 5pm / 6:30pm / 7pm IST.</div>
    </div>
  );

  const history = d.history || [];
  const latest  = history[history.length - 1] || d;
  const fP = latest.fiiNet >= 0, dP = latest.diiNet >= 0;
  const tf = history.reduce((s, day) => s + (day.fiiNet||0), 0);
  const td = history.reduce((s, day) => s + (day.diiNet||0), 0);

  return (
    <div className="fiidii-wrap">
      <div className="fiidii-segment-label">🇮🇳 FII / DII Flow</div>

      {history.length > 0 && (
        <div className="fiidii-chart-col">
          <div className="fiidii-chart-header">
            <span className="fiidii-chart-title">FII &amp; DII Net Flow · Last {history.length} Trading Days</span>
            <div className="fiidii-legend-inline">
              <span><span className="fiidii-dot" style={{background:'rgba(0,200,150,0.85)'}}/> FII Buy</span>
              <span><span className="fiidii-dot" style={{background:'rgba(255,68,85,0.85)'}}/> FII Sell</span>
              <span><span className="fiidii-dot" style={{background:'rgba(74,158,255,0.85)'}}/> DII Buy</span>
              <span><span className="fiidii-dot" style={{background:'rgba(255,140,0,0.85)'}}/> DII Sell</span>
            </div>
          </div>
          <FiiDiiChart history={history} />
          <div className="fiidii-totals-row">
            <div className="fiidii-total-item">
              <span className="fiidii-total-lbl">FII {history.length}D Total</span>
              <span className={`fiidii-total-val ${tf >= 0 ? 'fii-buy' : 'fii-sell'}`}>{fmtCr(tf)}</span>
              <span className="fiidii-total-days">{history.filter(h=>h.fiiNet>=0).length}↑ {history.filter(h=>h.fiiNet<0).length}↓</span>
            </div>
            <div className="fiidii-total-sep"/>
            <div className="fiidii-total-item">
              <span className="fiidii-total-lbl">DII {history.length}D Total</span>
              <span className={`fiidii-total-val ${td >= 0 ? 'dii-buy' : 'dii-sell'}`}>{fmtCr(td)}</span>
              <span className="fiidii-total-days">{history.filter(h=>h.diiNet>=0).length}↑ {history.filter(h=>h.diiNet<0).length}↓</span>
            </div>
            <div className="fiidii-total-sep"/>
            <div className="fiidii-total-item">
              <span className="fiidii-total-lbl">Combined</span>
              <span className={`fiidii-total-val ${(tf+td) >= 0 ? 'fii-buy' : 'fii-sell'}`}>{fmtCr(tf+td)}</span>
              <span className="fiidii-total-days">{(tf+td) >= 0 ? 'Net inflow' : 'Net outflow'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="fiidii-cards-row">
        <div className="fiidii-card-v2">
          <div className="fiidii-cv2-label">FII / FPI</div>
          <div className={`fiidii-cv2-value ${fP ? 'fii-buy' : 'fii-sell'}`}>{fmtCr(latest.fiiNet)}</div>
          <div className={`fiidii-cv2-tag ${fP ? 'fii-buy' : 'fii-sell'}`}>{fP ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {latest.fiiBuy > 0 && (
            <div className="fiidii-cv2-bs">
              <span>Buy <strong>₹{Math.abs(latest.fiiBuy).toFixed(0)} Cr</strong></span>
              <span>Sell <strong>₹{Math.abs(latest.fiiSell).toFixed(0)} Cr</strong></span>
            </div>
          )}
          <div className="fiidii-cv2-sub">Foreign Institutional</div>
        </div>

        <div className="fiidii-card-v2">
          <div className="fiidii-cv2-label">DII</div>
          <div className={`fiidii-cv2-value ${dP ? 'dii-buy' : 'dii-sell'}`}>{fmtCr(latest.diiNet)}</div>
          <div className={`fiidii-cv2-tag ${dP ? 'dii-buy' : 'dii-sell'}`}>{dP ? '↑ Net Buyers' : '↓ Net Sellers'}</div>
          {latest.diiBuy > 0 && (
            <div className="fiidii-cv2-bs">
              <span>Buy <strong>₹{Math.abs(latest.diiBuy).toFixed(0)} Cr</strong></span>
              <span>Sell <strong>₹{Math.abs(latest.diiSell).toFixed(0)} Cr</strong></span>
            </div>
          )}
          <div className="fiidii-cv2-sub">Domestic Institutional</div>
        </div>

        <div className="fiidii-card-v2">
          <div className="fiidii-cv2-label">Market Mood</div>
          {fP && dP   && <><div className="fiidii-mood fiidii-bullish">BULLISH</div><div className="fiidii-mood-sub">Both buying</div></>}
          {!fP && !dP && <><div className="fiidii-mood fiidii-bearish">BEARISH</div><div className="fiidii-mood-sub">Both selling</div></>}
          {fP && !dP  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">FII buying · DII selling</div></>}
          {!fP && dP  && <><div className="fiidii-mood fiidii-mixed">MIXED</div><div className="fiidii-mood-sub">DII buying · FII selling</div></>}
          <div className="fiidii-cv2-sub">{latest.date ? `As of ${fmtDateFull(latest.date)}` : 'Latest'} · Updates 5pm / 6:30pm / 7pm IST</div>
        </div>
      </div>
    </div>
  );
}
