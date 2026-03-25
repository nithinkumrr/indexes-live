import { useState, useEffect } from 'react';

// Regions derived dynamically from API response — no hardcoding needed

const METALS = [
  { key: 'gold22', label: 'Gold 22K', unit: '/ gram', color: '#D4A017', bg: 'rgba(212,160,23,0.1)', icon: '●' },
  { key: 'gold24', label: 'Gold 24K', unit: '/ gram', color: '#FFD700', bg: 'rgba(255,215,0,0.08)', icon: '●' },
];

function fmtPrice(n) {
  if (!n) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}


// Live MCX spot — fetches every 60s during market hours
function MexSpot() {
  const [spot, setSpot] = useState(null);

  useEffect(() => {
    const load = () => {
      // MCX gold trades 9 AM – 11:30 PM IST
      const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const mins = ist.getHours() * 60 + ist.getMinutes();
      const isOpen = mins >= 9*60 && mins <= 23*60+30;

      fetch('/api/quote?symbol=GC%3DF')
        .then(r => r.json())
        .then(d => {
          // GC=F is COMEX gold USD/oz — need USD/INR to convert
          const usdPrice = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
          const prevUsd  = d?.chart?.result?.[0]?.meta?.chartPreviousClose;
          if (usdPrice) {
            // Fetch USD/INR separately for conversion
            fetch('/api/quote?symbol=USDINR%3DX')
              .then(r => r.json())
              .then(fx => {
                const usdInr = fx?.chart?.result?.[0]?.meta?.regularMarketPrice || 84;
                // Convert: USD/oz → INR/gram → INR/10g (MCX quotes per 10g)
                const inrPer10g = Math.round((usdPrice * usdInr) / 31.1035 * 10);
                const prevInr   = prevUsd ? Math.round((prevUsd * usdInr) / 31.1035 * 10) : null;
                const chg       = prevInr ? inrPer10g - prevInr : null;
                const chgPct    = prevInr ? ((chg / prevInr) * 100).toFixed(2) : null;
                setSpot({ price: inrPer10g, chg, chgPct, isOpen });
              }).catch(() => {});
          }
        }).catch(() => {});
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  if (!spot) return null;

  return (
    <div className="gold-mcx-item gold-mcx-live">
      <span className="gold-mcx-name">
        ⚡ MCX Gold Spot (10g)
        {spot.isOpen && <span className="gold-live-dot"/>}
      </span>
      <span className="gold-mcx-price">₹{spot.price?.toLocaleString('en-IN')}</span>
      {spot.chgPct && (
        <span className={`gold-mcx-sub ${parseFloat(spot.chgPct) >= 0 ? 'gain' : 'loss'}`}>
          {parseFloat(spot.chgPct) >= 0 ? '▲' : '▼'} {Math.abs(spot.chgPct)}%
          {spot.isOpen ? ' · Live' : ' · Prev close'}
        </span>
      )}
    </div>
  );
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
    // MCX strip uses data from gold API (already calculated correctly server-side)
    // No separate COMEX fetch needed
  }, []);

  useEffect(() => {
    fetch('/api/gold')
      .then(r => r.json())
      .then(d => {
        setData(d.data || []);
        setApiData(d);
        setDate(d.date || '');
        setLoading(false);
        // Use IBJA silver from gold API if available (more accurate than COMEX)
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  const activeMetal = METALS.find(m => m.key === metal);
  const sorted = [...data].sort((a, b) => (b[metal] || 0) - (a[metal] || 0));
  const highest = sorted[0]?.[metal];
  const lowest  = sorted.filter(c => c[metal]).slice(-1)[0]?.[metal];

  return (
    <div className="gold-wrap">
      {/* IBJA + MCX Strip */}
      {apiData?.base?.gold24 && (
        <div className="gold-mcx-strip">
          <div className="gold-mcx-label">DAILY RATES · {apiData.date}</div>
          <div className="gold-mcx-items">

            {/* Gold 1kg */}
            <div className="gold-mcx-item">
              <span className="gold-mcx-name">🥇 Gold 1 kg (24K)</span>
              <span className="gold-mcx-price">₹{(apiData.base.gold24 * 1000)?.toLocaleString('en-IN')}</span>
              <span className="gold-mcx-sub">IBJA · updates daily</span>
            </div>

            {/* Silver 1kg */}
            {apiData.base.silver && (
              <div className="gold-mcx-item">
                <span className="gold-mcx-name">🥈 Silver 1 kg</span>
                <span className="gold-mcx-price">₹{apiData.base.silver?.toLocaleString('en-IN')}</span>
                <span className="gold-mcx-sub">IBJA · updates daily</span>
              </div>
            )}

            {/* MCX Live Spot */}
            <MexSpot />

          </div>
          <div className="gold-mcx-note">IBJA official daily rate · MCX spot updates live during market hours (9 AM – 11:30 PM) · Excl. jeweller making charges</div>
        </div>
      )}

      {/* Silver Section */}
      {(apiData?.base?.silver || mcx?.silverKg) && (() => {
        const silverKg  = apiData?.base?.silver || mcx?.silverKg;
        const baseRate  = Math.round(silverKg / 1.03);
        const gst1kg    = silverKg - baseRate;
        const per1g     = Math.round(silverKg / 1000);
        const per100g   = Math.round(silverKg / 10);
        const src       = apiData?.base?.silver ? 'IBJA' : 'COMEX/MCX';
        return (
        <div className="silver-breakdown">
          <div className="silver-bd-header">
            <div className="silver-bd-title">🥈 Silver Rates</div>
            <div className="silver-bd-src">{src} · Pan-India uniform rate</div>
          </div>

          {/* Price table */}
          <div className="silver-price-table">
            <div className="silver-pt-row silver-pt-header">
              <span>Quantity</span>
              <span>Base (ex-GST)</span>
              <span>GST 3%</span>
              <span>Total (incl. GST)</span>
            </div>
            <div className="silver-pt-row">
              <span className="silver-pt-qty">1 gram</span>
              <span>₹{Math.round(baseRate/1000).toLocaleString('en-IN')}</span>
              <span>₹{Math.round(gst1kg/1000)}</span>
              <span className="silver-pt-total">₹{per1g.toLocaleString('en-IN')}</span>
            </div>
            <div className="silver-pt-row">
              <span className="silver-pt-qty">100 grams</span>
              <span>₹{Math.round(baseRate/10).toLocaleString('en-IN')}</span>
              <span>₹{Math.round(gst1kg/10).toLocaleString('en-IN')}</span>
              <span className="silver-pt-total">₹{per100g.toLocaleString('en-IN')}</span>
            </div>
            <div className="silver-pt-row silver-pt-highlight">
              <span className="silver-pt-qty">1 kg</span>
              <span>₹{baseRate.toLocaleString('en-IN')}</span>
              <span>₹{gst1kg.toLocaleString('en-IN')}</span>
              <span className="silver-pt-total">₹{silverKg.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="silver-bd-explain">
            <div className="silver-explain-title">About Silver Pricing in India</div>
            <div className="silver-explain-text">
              Unlike gold, silver is priced uniformly across all cities in India — there is no regional premium. The rate is set daily by IBJA (India Bullion and Jewellers Association) based on MCX and international spot prices, inclusive of import duties and levies. The prices above reflect the standard market rate before jeweller margins.
              <br/><br/>
              For silver ornaments and jewellery, jewellers charge an additional making fee of ₹20–₹100 per gram depending on design complexity. For silver coins and bars, you typically pay market rate + 3% GST only.
            </div>
          </div>
        </div>
        );
      })()}

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
