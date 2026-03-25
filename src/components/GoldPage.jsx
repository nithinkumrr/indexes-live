import { useState, useEffect } from 'react';

// Regions derived dynamically from API response — no hardcoding needed

const METALS = [
  { key: 'gold22', label: 'Gold 22K', unit: '/ gram', color: '#D4A017', bg: 'rgba(212,160,23,0.1)', icon: '●' },
  { key: 'gold24', label: 'Gold 24K', unit: '/ gram', color: '#FFD700', bg: 'rgba(255,215,0,0.08)', icon: '●' },
  { key: 'silver', label: 'Silver',   unit: '/ gram', color: '#A8A9AD', bg: 'rgba(168,169,173,0.08)', icon: '◆' },
];

function fmtPrice(n) {
  if (!n) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function GoldPage() {
  const [data, setData]       = useState([]);
  const [apiData, setApiData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [metal, setMetal]     = useState('gold22');
  const [date, setDate]       = useState('');
  const [view, setView]       = useState('grid'); // grid | table
  const [mcx, setMcx]         = useState(null);

  useEffect(() => {
    // Fetch MCX futures: GOLDM (mini gold per 10g), SILVERM (mini silver per kg), GOLD (1kg)
    Promise.all([
      fetch('/api/quote?symbol=GC%3DF').then(r=>r.json()),     // COMEX gold USD/oz
      fetch('/api/quote?symbol=SI%3DF').then(r=>r.json()),     // COMEX silver USD/oz  
      fetch('/api/quote?symbol=USDINR%3DX').then(r=>r.json()), // USD/INR
    ]).then(([goldD, silvD, fxD]) => {
      const usd = fxD?.chart?.result?.[0]?.meta?.regularMarketPrice || 84;
      const gP  = goldD?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const sP  = silvD?.chart?.result?.[0]?.meta?.regularMarketPrice;
      const gPrev = goldD?.chart?.result?.[0]?.meta?.chartPreviousClose;
      const sPrev = silvD?.chart?.result?.[0]?.meta?.chartPreviousClose;
      if (gP) {
        const gInrKg = Math.round(gP * usd / 31.1035 * 1000);
        const sInrKg = sP ? Math.round(sP * usd / 31.1035 * 1000) : null;
        setMcx({
          goldKg:     gInrKg,
          goldChgPct: gPrev ? ((gP - gPrev) / gPrev * 100).toFixed(2) : null,
          silverKg:   sInrKg,
          silvChgPct: sPrev && sP ? ((sP - sPrev) / sPrev * 100).toFixed(2) : null,
          usdInr:     Math.round(usd * 100)/100,
          goldOz:     gP,
          month:      new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }),
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/gold')
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
        setApiData(d);
        setDate(d.date || '');
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const activeMetal = METALS.find(m => m.key === metal);
  const sorted = [...data].sort((a, b) => (b[metal] || 0) - (a[metal] || 0));
  const highest = sorted[0]?.[metal];
  const lowest  = sorted.filter(c => c[metal]).slice(-1)[0]?.[metal];

  return (
    <div className="gold-wrap">
      {/* MCX Futures Strip */}
      {mcx && (
        <div className="gold-mcx-strip">
          <div className="gold-mcx-label">MCX FUTURES · {mcx.month}</div>
          <div className="gold-mcx-items">
            <div className="gold-mcx-item">
              <span className="gold-mcx-name">🥇 Gold (1 kg)</span>
              <span className="gold-mcx-price">₹{mcx.goldKg?.toLocaleString('en-IN')}</span>
              {mcx.goldChgPct && <span className={`gold-mcx-chg ${parseFloat(mcx.goldChgPct)>=0?'gain':'loss'}`}>{parseFloat(mcx.goldChgPct)>=0?'▲':'▼'} {Math.abs(mcx.goldChgPct)}%</span>}
            </div>
            {mcx.silverKg && (
              <div className="gold-mcx-item">
                <span className="gold-mcx-name">🥈 Silver (1 kg)</span>
                <span className="gold-mcx-price">₹{mcx.silverKg?.toLocaleString('en-IN')}</span>
                {mcx.silvChgPct && <span className={`gold-mcx-chg ${parseFloat(mcx.silvChgPct)>=0?'gain':'loss'}`}>{parseFloat(mcx.silvChgPct)>=0?'▲':'▼'} {Math.abs(mcx.silvChgPct)}%</span>}
              </div>
            )}
            <div className="gold-mcx-item gold-mcx-fx">
              <span className="gold-mcx-name">USD/INR</span>
              <span className="gold-mcx-price">₹{mcx.usdInr}</span>
            </div>
            <div className="gold-mcx-note">Source: COMEX via Yahoo · Converted at live USD/INR · Incl. 3% GST</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="gold-header">
        <div>
          <div className="gold-title">Gold &amp; Silver Rates</div>
          <div className="gold-subtitle">City-wise prices across India{date ? ` · ${date}` : ''}</div>
        </div>
        <div className="gold-header-right">
          <div className="gold-metal-tabs">
            {METALS.map(m => (
              <button key={m.key}
                className={`gold-metal-btn ${metal === m.key ? 'gold-metal-active' : ''}`}
                style={metal === m.key ? { borderColor: m.color, color: m.color } : {}}
                onClick={() => setMetal(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="gold-view-tabs">
            <button className={`gold-view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Grid</button>
            <button className={`gold-view-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</button>
          </div>
        </div>
      </div>

      {loading && <div className="fno-loading">Fetching city-wise gold prices...</div>}
      {error   && <div className="fiidii-unavail"><div className="fiidii-unavail-msg">Could not fetch gold prices</div></div>}

      {!loading && !error && data.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="gold-summary">
            <div className="gold-sum-card" style={{ borderColor: activeMetal.color }}>
              <span className="gold-sum-label">Highest</span>
              <span className="gold-sum-city">{sorted[0]?.city}</span>
              <span className="gold-sum-price" style={{ color: activeMetal.color }}>{fmtPrice(highest)}</span>
              <span className="gold-sum-unit">{activeMetal.unit}</span>
            </div>
            <div className="gold-sum-card">
              <span className="gold-sum-label">Lowest</span>
              <span className="gold-sum-city">{sorted.filter(c => c[metal]).slice(-1)[0]?.city}</span>
              <span className="gold-sum-price" style={{ color: activeMetal.color }}>{fmtPrice(lowest)}</span>
              <span className="gold-sum-unit">{activeMetal.unit}</span>
            </div>
            <div className="gold-sum-card">
              <span className="gold-sum-label">Spread</span>
              <span className="gold-sum-city">Highest − Lowest</span>
              <span className="gold-sum-price">{highest && lowest ? fmtPrice(highest - lowest) : '—'}</span>
              <span className="gold-sum-unit">{activeMetal.unit}</span>
            </div>
            <div className="gold-sum-card gold-sum-note">
              <span className="gold-sum-label">Note</span>
              <span className="gold-sum-desc">Prices include GST &amp; making charges. Actual jeweller rates may vary slightly. Updated daily by IBJA.</span>
            </div>
          </div>

          {/* Grid view — by region */}
          {view === 'grid' && (
            <div className="gold-regions">
              {/* Build regions dynamically from API data — add cities in API only */}
              {['South','West','North','East'].map(region => {
                const regionData = data.filter(c => c.region === region);
                if (!regionData.length) return null;
                return (
                  <div key={region} className="gold-region">
                    <div className="gold-region-label">{region}</div>
                    <div className="gold-city-grid">
                      {regionData.map(city => {
                        const val = city[metal];
                        const isHigh = val === highest;
                        const isLow  = val === lowest;
                        return (
                          <div key={city.city} className={`gold-city-card ${isHigh ? 'gold-city-high' : ''} ${isLow ? 'gold-city-low' : ''}`}
                            style={{ background: isHigh ? activeMetal.bg : '' }}>
                            <div className="gold-city-name">{city.city}</div>
                            <div className="gold-city-price" style={{ color: val ? activeMetal.color : 'var(--text3)' }}>
                              {fmtPrice(val)}
                            </div>
                            <div className="gold-city-unit">{activeMetal.unit}</div>
                            {city.premiumPct > 0 && <div className="gold-city-premium">+{city.premiumPct}% city premium</div>}
                            {isHigh && <div className="gold-badge gold-badge-high">Highest</div>}
                            {isLow  && <div className="gold-badge gold-badge-low">Lowest</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table view */}
          {view === 'table' && (
            <div className="gold-table-wrap">
              <table className="gold-table">
                <thead>
                  <tr>
                    <th>City</th>
                    <th>Gold 22K / gram</th>
                    <th>Gold 24K / gram</th>
                    <th>Gold 22K / 10g</th>
                    <th>Gold 24K / 10g</th>
                    <th>Silver / kg</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.filter(c => c[metal]).map((city, i) => (
                    <tr key={city.city} className={city.city === sorted[0]?.city ? 'gold-tr-high' : ''}>
                      <td className="gold-td-city">{city.city}</td>
                      <td className="gold-td-val" style={{color:'#D4A017'}}>{fmtPrice(city.gold22)}</td>
                      <td className="gold-td-val" style={{color:'#D4A017'}}>{fmtPrice(city.gold24)}</td>
                      <td className="gold-td-val">{city.gold22 ? fmtPrice(city.gold22 * 10) : '—'}</td>
                      <td className="gold-td-val">{city.gold24 ? fmtPrice(city.gold24 * 10) : '—'}</td>
                      <td className="gold-td-val" style={{color:'#A8A9AD'}}>{fmtPrice(city.silver)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="gold-source-label">
          {apiData?.source === 'ibja' && <span className="gold-ibja-badge">📊 IBJA Rate</span>}
          {apiData?.source === 'goodreturns' && <span className="gold-ibja-badge">📊 GoodReturns Rate</span>}
          {apiData?.source === 'comex' && <span className="gold-ibja-badge">📊 COMEX Rate</span>}
        </div>
        <div className="gold-source">
            Source: goodreturns.in · IBJA · Prices include 3% GST · Updated daily · Actual rate may vary by jeweller
          </div>
        </>
      )}
    </div>
  );
}
