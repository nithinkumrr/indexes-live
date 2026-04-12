import { useState, useEffect } from 'react';

// Regions derived dynamically from API response — no hardcoding needed

const METALS = [
  { key: 'gold22', label: 'Gold 22K', unit: '/ gram', color: '#D4A017', bg: 'rgba(212,160,23,0.1)', icon: '●' },
  { key: 'gold24', label: 'Gold 24K', unit: '/ gram', color: '#FFD700', bg: 'rgba(255,215,0,0.08)', icon: '●' },
  { key: 'silver', label: 'Silver',   unit: '/ kg',   color: '#4A6580', bg: 'rgba(74,101,128,0.08)', icon: '◆' },
];

function fmtPrice(n) {
  if (!n) return '—';
  return `₹${Number(n).toLocaleString('en-IN')}`;
}


// MCX Futures: GOLD (1 kg) + SILVER (1 kg)
// Refreshes every 2 hours during MCX market hours (9 AM - 11:30 PM IST)
// Uses Kite quote API; falls back to IBJA estimate if token unavailable

function isMcxOpen() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  if (ist.getDay() === 0) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9*60 && mins <= 23*60+30;
}

function McxFutures({ ibjaGold24, ibjaSilver }) {
  const [gold,   setGold]   = useState(null);
  const [silver, setSilver] = useState(null);

  // Dynamically build current MCX contract symbol.
  // MCX Gold & Silver expire on the last Thursday of each month.
  // Within 7 days of expiry we roll to the next month contract.
  const getMcxSymbols = () => {
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const yr  = now.getFullYear();
    const mo  = now.getMonth(); // 0-indexed

    // Last Thursday of a given year/month (0-indexed month)
    const lastThursday = (y, m) => {
      const last = new Date(y, m + 1, 0); // last day of month
      while (last.getDay() !== 4) last.setDate(last.getDate() - 1); // 4 = Thursday
      return last;
    };

    const expiry = lastThursday(yr, mo);
    const daysToExpiry = Math.round((expiry - now) / 86400000);

    let useMo, useYr;
    if (daysToExpiry <= 7) {
      // Roll to next month
      useMo = mo === 11 ? 0 : mo + 1;
      useYr = mo === 11 ? yr + 1 : yr;
    } else {
      useMo = mo;
      useYr = yr;
    }

    const mon = MONTHS[useMo];
    const yr2 = String(useYr).slice(-2);
    return {
      // Kite format: GOLD26APRFUT, SILVERM26APRFUT (year before month)
      gold:   `MCX:GOLD${yr2}${mon}FUT`,
      silver: `MCX:SILVERM${yr2}${mon}FUT`,
      label:  `${mon}${yr2}`,
    };
  };

  const load = () => {
    const open = isMcxOpen();
    const syms = getMcxSymbols();

    // Fetch via dedicated MCX Kite endpoint
    Promise.all([
      fetch(`/api/mcx-quote?symbol=${encodeURIComponent(syms.gold)}`).then(r=>r.json()).catch(()=>null),
      fetch(`/api/mcx-quote?symbol=${encodeURIComponent(syms.silver)}`).then(r=>r.json()).catch(()=>null),
    ]).then(([gd, sd]) => {
      if (gd?.price) {
        // GOLDM is quoted per 10g on Kite — show directly, label as /10g
        const price = Math.round(gd.price);
        const prev  = gd.prevClose ? Math.round(gd.prevClose) : null;
        const chgPct = prev ? ((price - prev) / prev * 100).toFixed(2) : null;
        setGold({ price, chgPct, isOpen: open, source: 'MCX live', contract: syms.label, unit: '10g' });
      } else if (ibjaGold24) {
        // IBJA ibjaGold24 is per gram, show per 10g for comparison
        setGold({ price: Math.round(ibjaGold24 * 10), chgPct: null, isOpen: open, source: 'IBJA est.', contract: null, unit: '10g' });
      }

      if (sd?.price) {
        // SILVERM is quoted per kg on Kite
        const price  = Math.round(sd.price);
        const prev   = sd.prevClose ? Math.round(sd.prevClose) : null;
        const chgPct = prev ? ((price - prev) / prev * 100).toFixed(2) : null;
        setSilver({ price, chgPct, isOpen: open, source: 'MCX live', contract: syms.label, unit: 'kg' });
      } else if (ibjaSilver) {
        setSilver({ price: Math.round(ibjaSilver), chgPct: null, isOpen: open, source: 'IBJA est.', contract: null, unit: 'kg' });
      }
    });
  };

  useEffect(() => {
    load();
    // During MCX hours refresh every 5 minutes, otherwise every 30 minutes
    const interval = isMcxOpen() ? 5 * 60 * 1000 : 30 * 60 * 1000;
    const id = setInterval(load, interval);
    return () => clearInterval(id);
  }, [ibjaGold24, ibjaSilver]);

  // Always show MCX section — show live price if available, else show contract label with fallback note
  const { gold: goldSym, silver: silverSym, label: contractLabel } = getMcxSymbols();
  const isLive = isMcxOpen();

  return (
    <>
      <div className="gold-mcx-item gold-mcx-live">
        <span className="gold-mcx-name">
          MCX Gold · {gold?.contract || contractLabel}
          {isLive && gold?.source === 'MCX live' && <span className="gold-live-dot"/>}
        </span>
        {gold?.price ? (
          <>
            <span className="gold-mcx-price">&#x20B9;{gold.price.toLocaleString('en-IN')}<span style={{fontSize:11,color:'var(--text3)',fontWeight:400,marginLeft:4}}>/{gold.unit||'10g'}</span></span>
            {gold.chgPct != null ? (
              <span className={`gold-mcx-sub ${parseFloat(gold.chgPct)>=0?'gain':'loss'}`}>
                {parseFloat(gold.chgPct)>=0?'▲':'▼'} {Math.abs(gold.chgPct)}% · {gold.source}
              </span>
            ) : (
              <span className="gold-mcx-sub">{gold.source}</span>
            )}
          </>
        ) : (
          <span className="gold-mcx-sub" style={{color:'var(--text3)'}}>
            {isLive ? 'Fetching from Kite...' : 'Market closed'}
          </span>
        )}
      </div>

      <div className="gold-mcx-item gold-mcx-live">
        <span className="gold-mcx-name" style={{color:'#A8B8CC'}}>
          MCX Silver M · {silver?.contract || contractLabel}
          {isLive && silver?.source === 'MCX live' && <span className="gold-live-dot" style={{background:'#8899cc'}}/>}
        </span>
        {silver?.price ? (
          <>
            <span className="gold-mcx-price" style={{color:'#A8B8CC'}}>&#x20B9;{silver.price.toLocaleString('en-IN')}<span style={{fontSize:11,color:'var(--text3)',fontWeight:400,marginLeft:4}}>/{silver.unit||'kg'}</span></span>
            {silver.chgPct != null ? (
              <span className={`gold-mcx-sub ${parseFloat(silver.chgPct)>=0?'gain':'loss'}`}>
                {parseFloat(silver.chgPct)>=0?'▲':'▼'} {Math.abs(silver.chgPct)}% · {silver.source}
              </span>
            ) : (
              <span className="gold-mcx-sub">{silver.source}</span>
            )}
          </>
        ) : (
          <span className="gold-mcx-sub" style={{color:'var(--text3)'}}>
            {isLive ? 'Fetching from Kite...' : 'Market closed'}
          </span>
        )}
      </div>
    </>
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
              <span className="gold-mcx-sub">IBJA · incl. 3% GST · ex-making charges</span>
            </div>

            {/* Silver 1kg */}
            {apiData.base.silver && (
              <div className="gold-mcx-item">
                <span className="gold-mcx-name">🥈 Silver 1 kg</span>
                <span className="gold-mcx-price">₹{apiData.base.silver?.toLocaleString('en-IN')}</span>
                <span className="gold-mcx-sub">IBJA · incl. 3% GST</span>
              </div>
            )}

            {/* MCX Live: Gold + Silver 1 kg futures */}
            <McxFutures
              ibjaGold24={apiData?.base?.gold24}
              ibjaSilver={apiData?.base?.silver}
            />

          </div>
          <div className="gold-mcx-note">IBJA rate incl. 3% GST · City prices below are higher due to regional demand premium · MCX spot updates live 9 AM – 11:30 PM IST · All prices excl. jeweller making charges</div>
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

      {/* Silver Section — below header so tabs never move */}
      {metal === 'silver' && (apiData?.base?.silver) && (() => {
        const silverKg = apiData.base.silver;
        const base1kg  = Math.round(silverKg / 1.03);
        const gst1kg   = silverKg - base1kg;
        // Helper: compute for any gram multiplier
        const row = (label, grams, highlight) => {
          const base  = Math.round(base1kg * grams / 1000);
          const gst   = Math.round(gst1kg  * grams / 1000);
          const total = base + gst;
          return (
            <div key={label} className={`silver-pt-row${highlight?' silver-pt-highlight':''}`}>
              <span className="silver-pt-qty">{label}</span>
              <span>₹{base.toLocaleString('en-IN')}</span>
              <span>₹{gst.toLocaleString('en-IN')}</span>
              <span className="silver-pt-total">₹{total.toLocaleString('en-IN')}</span>
            </div>
          );
        };
        return (
          <div className="silver-breakdown">
            <div className="silver-bd-header">
              <div className="silver-bd-title">🥈 Silver Rates</div>
              <div className="silver-bd-src">IBJA · Pan-India uniform rate</div>
            </div>
            <div className="silver-price-table">
              <div className="silver-pt-row silver-pt-header">
                <span>Quantity</span>
                <span>Base (ex-GST)</span>
                <span>GST 3%</span>
                <span>Total (incl. GST)</span>
              </div>
              {row('1 gram',       1)}
              {row('10 grams',    10)}
              {row('100 grams',  100)}
              {row('500 grams',  500)}
              {row('1 kg',      1000, true)}
              {row('5 kg',      5000)}
              {row('10 kg',    10000)}
              {row('100 kg',  100000)}
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
      {error   && <div className="fiidii-unavail"><div className="fiidii-unavail-msg">Could not fetch gold prices</div></div>}

      {!loading && !error && data.length > 0 && metal !== 'silver' && (
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
          <span className="gold-ibja-badge">📊 IBJA Daily Rate</span>
        </div>
        <div className="gold-source">
            IBJA official rate · Prices include 3% GST · Updated daily · Actual rate may vary by jeweller
          </div>
        </>
      )}
    </div>
  );
}
