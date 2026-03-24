import { useState, useEffect } from 'react';

const REGIONS = {
  'South': ['Bangalore', 'Chennai', 'Hyderabad', 'Kochi', 'Coimbatore', 'Visakhapatnam'],
  'West':  ['Mumbai', 'Pune', 'Ahmedabad', 'Surat', 'Nagpur'],
  'North': ['Delhi', 'Jaipur', 'Lucknow', 'Chandigarh', 'Bhopal', 'Patna'],
  'East':  ['Kolkata'],
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [metal, setMetal]     = useState('gold22');
  const [date, setDate]       = useState('');
  const [view, setView]       = useState('grid'); // grid | table

  useEffect(() => {
    fetch('/api/gold')
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
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
              {Object.entries(REGIONS).map(([region, regionCities]) => {
                const regionData = regionCities.map(c => data.find(d => d.city === c)).filter(Boolean);
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
                    <th>Silver / gram</th>
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

          <div className="gold-source">
            Source: goodreturns.in · IBJA · Prices include 3% GST · Updated daily · Actual rate may vary by jeweller
          </div>
        </>
      )}
    </div>
  );
}
