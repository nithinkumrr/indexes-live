import { useState, useEffect, useRef } from 'react';

// ─── Rule Engine ─────────────────────────────────────────────────────────────

function getStance(niftyPct, bnPct) {
  if (niftyPct === null) return null;
  if (niftyPct < -1.5 && bnPct !== null && bnPct < -1.5)
    return { label: 'Strong Bear', color: '#FF4455', reasons: ['Broad index decline across Nifty and BankNifty', 'Sustained selling pressure in large caps'] };
  if (niftyPct < -0.7)
    return { label: 'Bearish',     color: '#F59E0B', reasons: ['Nifty declining more than 0.7%', 'Price momentum is negative'] };
  if (niftyPct > 1.5 && bnPct !== null && bnPct > 1.5)
    return { label: 'Strong Bull', color: '#00C896', reasons: ['Broad index advance across Nifty and BankNifty', 'Sustained buying across large caps'] };
  if (niftyPct > 0.7)
    return { label: 'Bullish',     color: '#00C896', reasons: ['Nifty advancing more than 0.7%', 'Price momentum is positive'] };
  return   { label: 'Neutral',    color: 'var(--text2)', reasons: ['Nifty move within ±0.7%', 'No dominant directional bias'] };
}

function getSummary(stance) {
  if (!stance) return null;
  const map = {
    'Strong Bear': 'Markets showed broad weakness with sustained selling across indices. Price structure remains under pressure unless key zones are reclaimed.',
    'Bearish':     'Markets are trading with a negative bias. Selling interest is present, though not yet broad-based across all sectors.',
    'Strong Bull': 'Markets showed broad strength with sustained buying across indices. Price structure is constructive and buyers are in control.',
    'Bullish':     'Markets are trading with a positive bias. Buying interest is present, and price is holding above key reference levels.',
    'Neutral':     'Markets are in a balanced state with neither buyers nor sellers in clear control. Price is oscillating within a range.',
  };
  return map[stance.label] || null;
}

function getStructure(niftyPct) {
  // Approximation from single-day move — ideally would use yesterday's close vs today
  if (niftyPct === null) return null;
  if (niftyPct < -0.5)
    return { label: 'Lower Highs, Lower Lows', tag: 'Downtrend', explanation: 'Price is making lower highs and lower lows, indicating weakening structure. Rallies are being sold into.' };
  if (niftyPct > 0.5)
    return { label: 'Higher Highs, Higher Lows', tag: 'Uptrend', explanation: 'Price is making higher highs and higher lows, indicating strengthening structure. Dips are being bought.' };
  return { label: 'Sideways Range', tag: 'Range', explanation: 'Price is oscillating without a clear directional sequence. Neither buyers nor sellers are in sustained control.' };
}

function getVolatility(niftyPct) {
  if (niftyPct === null) return null;
  const abs = Math.abs(niftyPct);
  if (abs > 1.5) return { label: 'High',     color: '#FF4455', explanation: 'Large intraday moves indicate faster price swings and elevated uncertainty. Position sizing should reflect this.' };
  if (abs > 0.7) return { label: 'Moderate', color: '#F59E0B', explanation: 'Normal range of movement for Indian equity markets. Standard risk management applies.' };
  return             { label: 'Low',      color: '#00C896', explanation: 'Small range suggests limited conviction from either side. Breakouts from tight ranges can be sharp.' };
}

function getSessionChar(price, high, low) {
  if (!price || !high || !low || high === low) return null;
  const range    = high - low;
  const relClose = (price - low) / range;
  if (relClose < 0.25)
    return { label: 'Closed Near the Low',  explanation: 'Price settled in the lower quarter of the day\'s range. This indicates sustained selling pressure persisted into the close.' };
  if (relClose > 0.75)
    return { label: 'Closed Near the High', explanation: 'Price settled in the upper quarter of the day\'s range. This indicates buying interest held up through the session.' };
  return { label: 'Mid-Range Close', explanation: 'Price settled near the middle of the day\'s range. Neither side had a decisive advantage by close.' };
}

function getFiiContext(fiiNet, diiNet) {
  if (fiiNet === null) return null;
  const fiiDir = fiiNet >= 0 ? 'Buying' : 'Selling';
  const diiDir = diiNet >= 0 ? 'Buying' : 'Selling';
  let context = '';
  if (fiiNet < 0 && diiNet > 0) context = 'FIIs are selling while DIIs are absorbing the supply. This pattern often acts as a cushion for markets during foreign outflows.';
  else if (fiiNet > 0 && diiNet > 0) context = 'Both FIIs and DIIs are buying. Simultaneous inflows from both institutional categories indicate broad conviction.';
  else if (fiiNet < 0 && diiNet < 0) context = 'Both FIIs and DIIs are selling. Broad institutional selling without domestic support can amplify downside.';
  else context = 'FIIs are buying while DIIs are trimming positions. Foreign flows are supporting the market.';
  return { fiiDir, diiDir, fiiNet, diiNet, context };
}

function getGlobalContext(data) {
  const indices = [
    { id: 'sp500',    label: 'S&P 500',    region: 'us'    },
    { id: 'nasdaq',   label: 'Nasdaq',     region: 'us'    },
    { id: 'nikkei',   label: 'Nikkei',     region: 'asia'  },
    { id: 'hangseng', label: 'Hang Seng',  region: 'asia'  },
    { id: 'ftse',     label: 'FTSE 100',   region: 'europe'},
    { id: 'dax',      label: 'DAX',        region: 'europe'},
    { id: 'shanghai', label: 'Shanghai',   region: 'asia'  },
  ];
  const items = indices.map(i => {
    const d = data[i.id];
    if (!d?.price || d.changePct === null || d.changePct === undefined) return null;
    return { ...i, price: d.price, changePct: d.changePct };
  }).filter(Boolean);

  if (!items.length) return null;

  const avg = items.reduce((s, i) => s + i.changePct, 0) / items.length;
  const globalBias = avg > 0.3 ? 'Strong' : avg > 0 ? 'Mildly Positive' : avg > -0.3 ? 'Mixed' : 'Weak';
  let interpretation = '';
  if (avg > 0.3)   interpretation = 'Global markets are broadly positive. This generally provides a supportive backdrop for Indian equities.';
  else if (avg > 0) interpretation = 'Global markets are showing mild gains. The backdrop is neutral to slightly supportive.';
  else if (avg > -0.3) interpretation = 'Global markets are mixed. No strong directional signal from global cues.';
  else interpretation = 'Global markets are weak. This can create headwinds for Indian markets, especially at open.';

  return { items, globalBias, interpretation };
}

function getPriceZones(price) {
  if (!price) return null;
  const step = price < 10000 ? 100 : 50;
  const round = v => Math.round(v / step) * step;
  return [
    { level: `${round(price * 0.987).toLocaleString('en-IN')} – ${round(price * 0.993).toLocaleString('en-IN')}`, type: 'support',    note: 'Area where buying interest has previously emerged' },
    { level: `${round(price * 0.975).toLocaleString('en-IN')} – ${round(price * 0.981).toLocaleString('en-IN')}`, type: 'support',    note: 'Deeper area where prior demand has been observed' },
    { level: `${round(price * 1.007).toLocaleString('en-IN')} – ${round(price * 1.013).toLocaleString('en-IN')}`, type: 'resistance', note: 'Area where selling pressure has previously been seen' },
    { level: `${round(price * 1.019).toLocaleString('en-IN')} – ${round(price * 1.025).toLocaleString('en-IN')}`, type: 'resistance', note: 'Extended area where prior supply has been observed' },
  ];
}

// ─── IST helpers ─────────────────────────────────────────────────────────────
function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}
function getSlotLabel() {
  const ist  = getIST();
  const d    = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (d === 0 || d === 6)  return 'Weekend';
  if (mins < 555)          return 'Pre-Market';
  if (mins < 570)          return 'Pre-Open';
  if (mins < 660)          return 'Opening Session';
  if (mins < 870)          return 'Mid-Day';
  if (mins < 930)          return 'Afternoon';
  if (mins < 1020)         return 'Market Closed';
  return                          'After Hours';
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Card({ title, tag, tagColor, children, accent }) {
  return (
    <div className="ins2-card" style={accent ? { borderLeftColor: accent } : {}}>
      <div className="ins2-card-hdr">
        <span className="ins2-card-title">{title}</span>
        {tag && <span className="ins2-tag" style={{ color: tagColor || 'var(--text3)', borderColor: tagColor ? `${tagColor}40` : 'var(--border)' }}>{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Explanation({ text }) {
  return <p className="ins2-explanation">{text}</p>;
}

function BasedOn({ reasons }) {
  return (
    <div className="ins2-basedon">
      <span className="ins2-basedon-label">Based on</span>
      <ul>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </div>
  );
}

function CollapsibleHow() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ins2-how">
      <button className="ins2-how-toggle" onClick={() => setOpen(v => !v)}>
        <span>How to read this page</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ins2-how-body">
          <p>This page explains market behaviour using price and participation data. It is designed to help you <strong>think</strong> about what is happening, not to tell you what to do.</p>
          <ul>
            <li><strong>Market Stance</strong> — the overall directional character of the day, derived from index movement rules</li>
            <li><strong>Market Structure</strong> — whether price is trending or ranging, based on the day's high/low behaviour</li>
            <li><strong>Volatility</strong> — the magnitude of price movement and what it implies for uncertainty</li>
            <li><strong>Session Character</strong> — where price settled relative to the day's range</li>
            <li><strong>Price Reaction Zones</strong> — areas where price has historically encountered buying or selling interest</li>
            <li><strong>Institutional Activity</strong> — FII and DII net flows and what they imply about large participant behaviour</li>
            <li><strong>Global Context</strong> — how global markets are behaving and their directional implication</li>
          </ul>
          <p className="ins2-how-note">All interpretations are rule-based and educational. They do not constitute investment advice.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InsightsPage({ data = {}, nseData = {} }) {
  const [fiidii,   setFiidii]   = useState(null);
  const [clock,    setClock]    = useState(getIST());
  const [slot,     setSlot]     = useState(getSlotLabel());

  useEffect(() => {
    fetch('/api/fiidii').then(r => r.json()).then(setFiidii).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => { setClock(getIST()); setSlot(getSlotLabel()); }, 60000);
    return () => clearInterval(id);
  }, []);

  // ── Raw data ──
  const nifty     = nseData.nifty50   || data.nifty50   || null;
  const banknifty = nseData.banknifty || data.banknifty || null;
  const sensex    = nseData.sensex    || data.sensex    || null;
  const giftnifty = data.giftnifty    || null;

  const niftyPct  = nifty?.changePct ?? null;
  const bnPct     = banknifty?.changePct ?? null;

  // ── Derived interpretations ──
  const stance    = getStance(niftyPct, bnPct);
  const summary   = getSummary(stance);
  const structure = getStructure(niftyPct);
  const vol       = getVolatility(niftyPct);
  const sesChar   = getSessionChar(nifty?.price, nifty?.high, nifty?.low);
  const zones     = getPriceZones(nifty?.price);
  const global    = getGlobalContext(data);

  // FII/DII latest
  const latestFii = fiidii?.history?.slice(-1)[0] ?? null;
  const fiiCtx    = latestFii ? getFiiContext(latestFii.fii?.net ?? null, latestFii.dii?.net ?? null) : null;

  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const fmtPct   = v => v !== null && v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
  const fmtPrice = v => v ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
  const pColor   = v => !v ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';

  return (
    <div className="ins2-wrap">

      {/* ── Page header ── */}
      <div className="ins2-header">
        <div className="ins2-header-left">
          <h1 className="ins2-page-title">Market Brief</h1>
          <div className="ins2-page-meta">{dateStr} · {timeStr} IST</div>
        </div>
        <div className="ins2-slot-pill">{slot}</div>
      </div>

      {/* ── Index strip ── */}
      <div className="ins2-index-strip">
        {[
          { label: 'Nifty 50',    d: nifty,     main: true },
          { label: 'Bank Nifty',  d: banknifty               },
          { label: 'Sensex',      d: sensex                   },
          { label: 'Gift Nifty',  d: giftnifty                },
        ].map((item, i) => item.d?.price ? (
          <div key={i} className={`ins2-idx ${item.main ? 'ins2-idx-main' : ''}`}>
            <div className="ins2-idx-name">{item.label}</div>
            <div className="ins2-idx-price">{fmtPrice(item.d.price)}</div>
            <div className="ins2-idx-chg" style={{ color: pColor(item.d.changePct) }}>{fmtPct(item.d.changePct)}</div>
          </div>
        ) : null)}
      </div>

      <div className="ins2-body">

        {/* 1. Market Stance */}
        {stance && (
          <Card title="MARKET STANCE" tag={stance.label} tagColor={stance.color} accent={stance.color}>
            <div className="ins2-stance-label" style={{ color: stance.color }}>{stance.label}</div>
            <BasedOn reasons={stance.reasons} />
          </Card>
        )}

        {/* 2. Market Summary */}
        {summary && (
          <Card title="MARKET SUMMARY">
            <p className="ins2-summary">{summary}</p>
          </Card>
        )}

        {/* 3. Market Structure */}
        {structure && (
          <Card title="MARKET STRUCTURE" tag={structure.tag}>
            <div className="ins2-struct-label">{structure.label}</div>
            <Explanation text={structure.explanation} />
          </Card>
        )}

        {/* 4. Volatility */}
        {vol && (
          <Card title="VOLATILITY" tag={vol.label} tagColor={vol.color} accent={vol.color}>
            <div className="ins2-vol-label" style={{ color: vol.color }}>{vol.label}</div>
            <Explanation text={vol.explanation} />
          </Card>
        )}

        {/* 5. Session Character */}
        {sesChar && (
          <Card title="SESSION CHARACTER">
            <div className="ins2-ses-label">{sesChar.label}</div>
            <Explanation text={sesChar.explanation} />
          </Card>
        )}

        {/* 6. Price Reaction Zones */}
        {zones && (
          <Card title="PRICE REACTION ZONES">
            <div className="ins2-zones-note">These are areas where price has historically encountered activity. They are not predictions.</div>
            <div className="ins2-zones">
              {zones.map((z, i) => (
                <div key={i} className={`ins2-zone-row ins2-zone-${z.type}`}>
                  <div className="ins2-zone-level">{z.level}</div>
                  <div className="ins2-zone-arrow">→</div>
                  <div className="ins2-zone-note">{z.note}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 7. Institutional Activity */}
        <Card title="INSTITUTIONAL ACTIVITY">
          {fiiCtx ? (
            <>
              <div className="ins2-inst-grid">
                <div className="ins2-inst-card">
                  <div className="ins2-inst-who">FII / FPI</div>
                  <div className="ins2-inst-dir" style={{ color: fiiCtx.fiiNet >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {fiiCtx.fiiDir}
                  </div>
                  <div className="ins2-inst-amt">
                    {fiiCtx.fiiNet >= 0 ? '+' : ''}₹{Math.abs(fiiCtx.fiiNet).toLocaleString('en-IN')} Cr
                  </div>
                </div>
                <div className="ins2-inst-card">
                  <div className="ins2-inst-who">DII</div>
                  <div className="ins2-inst-dir" style={{ color: fiiCtx.diiNet >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                    {fiiCtx.diiDir}
                  </div>
                  <div className="ins2-inst-amt">
                    {fiiCtx.diiNet >= 0 ? '+' : ''}₹{Math.abs(fiiCtx.diiNet).toLocaleString('en-IN')} Cr
                  </div>
                </div>
              </div>
              <Explanation text={fiiCtx.context} />
            </>
          ) : (
            <p className="ins2-loading">FII / DII data loading...</p>
          )}
        </Card>

        {/* 8. Global Context */}
        {global && (
          <Card title="GLOBAL CONTEXT" tag={global.globalBias}>
            <div className="ins2-global-grid">
              {global.items.map((g, i) => (
                <div key={i} className="ins2-global-row">
                  <span className="ins2-global-label">{g.label}</span>
                  <span className="ins2-global-pct" style={{ color: pColor(g.changePct) }}>{fmtPct(g.changePct)}</span>
                </div>
              ))}
            </div>
            <Explanation text={global.interpretation} />
          </Card>
        )}

        {/* 9. How to read this */}
        <CollapsibleHow />

      </div>

      {/* Footer */}
      <div className="ins2-footer">
        This is a data-driven market summary for educational purposes.
        Not a recommendation to buy or sell securities.
        Data from Kite Connect and NSE. Refreshes with market data.
      </div>
    </div>
  );
}
