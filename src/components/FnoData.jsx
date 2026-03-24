import { useState, useEffect } from 'react';

const fmtCr = n => {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
  if (abs >= 10000) return `${sign}₹${(abs/100).toFixed(1)}K Cr`;
  return `${sign}₹${abs.toFixed(0)} Cr`;
};

function FiiSegmentTable({ data }) {
  if (!data) return null;
  const rows = [
    { label: 'Index Futures', key: 'indexFut' },
    { label: 'Index Options', key: 'indexOpt' },
    { label: 'Stock Futures', key: 'stockFut' },
  ];
  return (
    <div className="fno-seg-wrap">
      <div className="fno-seg-title">FII ACTIVITY IN F&amp;O SEGMENTS</div>
      <table className="fno-seg-table">
        <thead>
          <tr>
            <th>Segment</th>
            <th>FII Net</th>
            <th>FII Buy</th>
            <th>FII Sell</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, key }) => {
            const d = data[key];
            if (!d?.fii) return null;
            const pos = d.fii.net >= 0;
            return (
              <tr key={key}>
                <td className="fno-seg-label">{label}</td>
                <td className={`fno-seg-net ${pos ? 'gain' : 'loss'}`}>{fmtCr(d.fii.net)}</td>
                <td className="fno-seg-val">₹{Math.abs(d.fii.buy).toFixed(0)} Cr</td>
                <td className="fno-seg-val">₹{Math.abs(d.fii.sell).toFixed(0)} Cr</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="fno-seg-note">FII activity in derivatives · Updates after market close</div>
    </div>
  );
}

function SectorHeatmap({ sectors }) {
  if (!sectors?.length) return null;
  return (
    <div className="fno-sector-wrap">
      <div className="fno-seg-title">SECTOR PERFORMANCE</div>
      <div className="fno-sector-grid">
        {sectors.map(s => {
          const pos = s.pct >= 0;
          const intensity = Math.min(Math.abs(s.pct) / 3, 1);
          const bg = pos
            ? `rgba(0,200,150,${0.08 + intensity * 0.25})`
            : `rgba(255,68,85,${0.08 + intensity * 0.25})`;
          return (
            <div key={s.name} className="fno-sector-card" style={{ background: bg }}>
              <div className="fno-sector-name">{s.name}</div>
              <div className={`fno-sector-pct ${pos ? 'gain' : 'loss'}`}>
                {pos ? '▲' : '▼'} {Math.abs(s.pct).toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopMovers({ gainers, losers }) {
  if (!gainers?.length && !losers?.length) return null;
  return (
    <div className="fno-movers-wrap">
      <div className="fno-movers-grid">
        <div>
          <div className="fno-seg-title">TOP GAINERS (F&amp;O)</div>
          {gainers.map((s,i) => (
            <div key={i} className="fno-mover-row">
              <span className="fno-mover-sym">{s.symbol}</span>
              <span className="fno-mover-ltp">₹{s.ltp?.toFixed(1)}</span>
              <span className="fno-mover-pct gain">▲ {Math.abs(s.pct).toFixed(2)}%</span>
            </div>
          ))}
        </div>
        <div>
          <div className="fno-seg-title">TOP LOSERS (F&amp;O)</div>
          {losers.map((s,i) => (
            <div key={i} className="fno-mover-row">
              <span className="fno-mover-sym">{s.symbol}</span>
              <span className="fno-mover-ltp">₹{s.ltp?.toFixed(1)}</span>
              <span className="fno-mover-pct loss">▼ {Math.abs(s.pct).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FnoData() {
  const [data, setData]   = useState(null);
  const [loading, setL]   = useState(true);

  useEffect(() => {
    const load = () => {
      fetch('/api/optionchain')
        .then(r => r.json())
        .then(d => { setData(d); setL(false); })
        .catch(() => setL(false));
    };
    load();
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="fno-loading">Fetching F&amp;O data from NSE...</div>;

  if (!data || (!data.fiifo && !data.sectors?.length && !data.topGainers?.length)) {
    return (
      <div className="fiidii-unavail">
        <div className="fiidii-unavail-msg">F&amp;O data unavailable</div>
        <div className="fiidii-unavail-sub">NSE data loads during and after market hours. Retrying every 2 minutes.</div>
      </div>
    );
  }

  return (
    <div className="fno-data-wrap">
      <SectorHeatmap sectors={data.sectors} />
      <div className="fno-data-divider" />
      <TopMovers gainers={data.topGainers} losers={data.topLosers} />
      {data.fiifo && <><div className="fno-data-divider" /><FiiSegmentTable data={data.fiifo} /></>}
    </div>
  );
}
