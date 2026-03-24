import { useState, useEffect } from 'react';

function fmt(n) { return n != null ? n.toLocaleString('en-IN') : '—'; }
function fmtOI(n) {
  if (!n) return '—';
  if (n >= 1e7) return `${(n/1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n/1e5).toFixed(1)}L`;
  return n.toLocaleString('en-IN');
}

function PCRCard({ pcr, sentiment }) {
  const color = pcr > 1.2 ? '#00C896' : pcr < 0.7 ? '#FF4455' : pcr > 1 ? '#7BC67E' : '#FF8C42';
  const barW  = Math.min((pcr / 2) * 100, 100);
  return (
    <div className="fno-data-card">
      <div className="fno-data-label">PUT CALL RATIO</div>
      <div className="fno-data-value" style={{color}}>{pcr?.toFixed(2) || '—'}</div>
      <div className="fno-data-tag" style={{color}}>{sentiment}</div>
      <div className="fno-pcr-bar">
        <div className="fno-pcr-track">
          <div className="fno-pcr-fill" style={{width: `${barW}%`, background: color}}/>
          <div className="fno-pcr-marker" style={{left: '50%'}}/>
        </div>
        <div className="fno-pcr-labels"><span>0</span><span>0.7</span><span>1.0</span><span>1.3</span><span>2+</span></div>
      </div>
      <div className="fno-data-note">PCR &gt; 1 = more puts = bullish · &lt; 0.7 = bearish · Near-expiry</div>
    </div>
  );
}

function MaxPainCard({ maxPain, underlying, diff }) {
  const above = diff > 0;
  return (
    <div className="fno-data-card">
      <div className="fno-data-label">MAX PAIN</div>
      <div className="fno-data-value">{fmt(maxPain)}</div>
      <div className="fno-data-tag" style={{color: above ? '#FF4455' : '#00C896'}}>
        {above ? `▲ ${Math.abs(diff)}% above current` : `▼ ${Math.abs(diff)}% below current`}
      </div>
      <div className="fno-data-note">
        Spot: {fmt(underlying)} · Options writers gain most at {fmt(maxPain)} · 
        Nifty often gravitates toward max pain near expiry
      </div>
    </div>
  );
}

function OICard({ symbol, topCE, topPE, atmStrike, atmIV }) {
  return (
    <div className="fno-data-card fno-oi-card">
      <div className="fno-data-label">OI — SUPPORT &amp; RESISTANCE</div>
      {atmIV && <div className="fno-atm-iv">ATM IV: <strong>{atmIV}%</strong> · ATM Strike: <strong>{fmt(atmStrike)}</strong></div>}
      <div className="fno-oi-grid">
        <div className="fno-oi-col">
          <div className="fno-oi-col-label loss">CE (Resistance)</div>
          {topCE?.slice(0,5).map((r, i) => (
            <div key={i} className="fno-oi-row">
              <span className="fno-oi-strike">{fmt(r.strike)}</span>
              <div className="fno-oi-bar-wrap">
                <div className="fno-oi-bar fno-oi-ce" style={{width: `${Math.min((r.oi / (topCE[0]?.oi||1)) * 100, 100)}%`}}/>
              </div>
              <span className="fno-oi-val">{fmtOI(r.oi)}</span>
            </div>
          ))}
        </div>
        <div className="fno-oi-col">
          <div className="fno-oi-col-label gain">PE (Support)</div>
          {topPE?.slice(0,5).map((r, i) => (
            <div key={i} className="fno-oi-row">
              <span className="fno-oi-strike">{fmt(r.strike)}</span>
              <div className="fno-oi-bar-wrap">
                <div className="fno-oi-bar fno-oi-pe" style={{width: `${Math.min((r.oi / (topPE[0]?.oi||1)) * 100, 100)}%`}}/>
              </div>
              <span className="fno-oi-val">{fmtOI(r.oi)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fno-data-note">Highest CE OI = likely resistance · Highest PE OI = likely support</div>
    </div>
  );
}

function FreshOICard({ freshCE, freshPE }) {
  const hasFresh = freshCE?.length || freshPE?.length;
  if (!hasFresh) return null;
  return (
    <div className="fno-data-card">
      <div className="fno-data-label">OI BUILDUP — FRESH POSITIONS</div>
      <div className="fno-oi-grid">
        <div className="fno-oi-col">
          <div className="fno-oi-col-label loss">Call Writing</div>
          {freshCE?.slice(0,3).map((r,i) => (
            <div key={i} className="fno-oi-row">
              <span className="fno-oi-strike">{fmt(r.strike)}</span>
              <span className="fno-oi-val loss">{r.chgOI > 0 ? '+' : ''}{fmtOI(r.chgOI)}</span>
            </div>
          ))}
        </div>
        <div className="fno-oi-col">
          <div className="fno-oi-col-label gain">Put Writing</div>
          {freshPE?.slice(0,3).map((r,i) => (
            <div key={i} className="fno-oi-row">
              <span className="fno-oi-strike">{fmt(r.strike)}</span>
              <span className="fno-oi-val gain">{r.chgOI > 0 ? '+' : ''}{fmtOI(r.chgOI)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fno-data-note">Fresh call writing = resistance forming · Put writing = support forming</div>
    </div>
  );
}

export default function FnoData() {
  const [nifty,  setNifty]  = useState(null);
  const [bnifty, setBnifty] = useState(null);
  const [tab,    setTab]    = useState('NIFTY');
  const [loading, setL]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/optionchain?symbol=NIFTY').then(r=>r.json()),
      fetch('/api/optionchain?symbol=BANKNIFTY').then(r=>r.json()),
    ]).then(([n, b]) => {
      if (!n.error) setNifty(n);
      if (!b.error) setBnifty(b);
      setL(false);
    }).catch(() => setL(false));
  }, []);

  if (loading) return <div className="fno-loading">Fetching option chain from NSE...</div>;

  const d = tab === 'NIFTY' ? nifty : bnifty;

  if (!d) return (
    <div className="fiidii-unavail">
      <div className="fiidii-unavail-msg">Option chain data unavailable</div>
      <div className="fiidii-unavail-sub">NSE may be temporarily unavailable. Retrying automatically every 60s.</div>
    </div>
  );

  return (
    <div className="fno-data-wrap">
      {/* Symbol tabs */}
      <div className="fno-sym-tabs">
        {['NIFTY', 'BANKNIFTY'].map(s => (
          <button key={s} className={`fno-sym-btn ${tab === s ? 'fno-sym-active' : ''}`} onClick={() => setTab(s)}>
            {s}
          </button>
        ))}
        <span className="fno-expiry-tag">Expiry: {d.nearExpiry}</span>
        <span className="fno-spot-tag">Spot: {fmt(d.underlying)}</span>
      </div>

      {/* Data grid */}
      <div className="fno-data-grid">
        <PCRCard pcr={d.pcr} sentiment={d.pcrSentiment} />
        <MaxPainCard maxPain={d.maxPain} underlying={d.underlying} diff={d.maxPainDiff} />
        <OICard symbol={tab} topCE={d.topCE} topPE={d.topPE} atmStrike={d.atmStrike} atmIV={d.atmIV} />
        <FreshOICard freshCE={d.freshCE} freshPE={d.freshPE} />
      </div>

      <div className="fno-data-source">Data: NSE India · Refreshes every 60s · Near-month expiry only</div>
    </div>
  );
}
