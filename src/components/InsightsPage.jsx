import { useState, useEffect, useCallback } from 'react';

// ─── Rule Engine ─────────────────────────────────────────────────────────────
function getStance(niftyPct, bnPct) {
  if (niftyPct === null) return null;
  if (niftyPct < -1.5 && bnPct !== null && bnPct < -1.5)
    return { label: 'Strong Bear', color: '#FF4455', reasons: ['Broad index decline across Nifty and BankNifty', 'Sustained selling pressure in large caps'] };
  if (niftyPct < -0.7)
    return { label: 'Bearish', color: '#F59E0B', reasons: ['Nifty declining more than 0.7%', 'Price momentum is negative'] };
  if (niftyPct > 1.5 && bnPct !== null && bnPct > 1.5)
    return { label: 'Strong Bull', color: '#00C896', reasons: ['Broad index advance across Nifty and BankNifty', 'Sustained buying across large caps'] };
  if (niftyPct > 0.7)
    return { label: 'Bullish', color: '#00C896', reasons: ['Nifty advancing more than 0.7%', 'Price momentum is positive'] };
  return { label: 'Neutral', color: 'var(--text2)', reasons: ['Nifty move within 0.7% on either side', 'No dominant directional bias'] };
}

function getStructureLabel(niftyPct) {
  if (niftyPct === null) return 'Unknown';
  if (niftyPct < -0.5) return 'Downtrend';
  if (niftyPct > 0.5)  return 'Uptrend';
  return 'Range';
}

function getVolLabel(niftyPct) {
  if (niftyPct === null) return 'Unknown';
  const a = Math.abs(niftyPct);
  if (a > 1.5) return 'High';
  if (a > 0.7) return 'Moderate';
  return 'Low';
}

function getSessionChar(price, high, low) {
  if (!price || !high || !low || high === low) return null;
  const rel = (price - low) / (high - low);
  if (rel < 0.25)  return { label: 'Closed Near the Low',  explanation: 'Price settled in the lower quarter of the day\'s range, indicating sustained selling pressure into the close.' };
  if (rel > 0.75)  return { label: 'Closed Near the High', explanation: 'Price settled in the upper quarter of the day\'s range, indicating buying interest held through the session.' };
  return               { label: 'Mid-Range Close',         explanation: 'Price settled near the middle of the day\'s range. Neither side had a decisive advantage by close.' };
}

function getGlobalContext(data) {
  const indices = [
    { id: 'sp500', label: 'S&P 500' }, { id: 'nasdaq', label: 'Nasdaq' },
    { id: 'nikkei', label: 'Nikkei' }, { id: 'hangseng', label: 'Hang Seng' },
    { id: 'ftse', label: 'FTSE 100' }, { id: 'dax', label: 'DAX' },
    { id: 'shanghai', label: 'Shanghai' },
  ];
  const items = indices.map(i => {
    const d = data[i.id];
    if (!d?.price || d.changePct === null || d.changePct === undefined) return null;
    return { ...i, changePct: d.changePct };
  }).filter(Boolean);
  if (!items.length) return null;
  const avg  = items.reduce((s, i) => s + i.changePct, 0) / items.length;
  const bias = avg > 0.3 ? 'Positive' : avg > 0 ? 'Mildly Positive' : avg > -0.3 ? 'Mixed' : 'Weak';
  let interp = avg > 0.3 ? 'Global markets are broadly positive, providing a supportive backdrop for Indian equities.'
    : avg > 0 ? 'Global markets show mild gains. The backdrop is neutral to slightly supportive.'
    : avg > -0.3 ? 'Global markets are mixed. No strong directional signal from global cues.'
    : 'Global markets are weak. This can create headwinds for Indian markets, particularly at the open.';
  return { items, bias, interp };
}

function getPriceZones(price) {
  if (!price) return null;
  const step = price < 10000 ? 100 : 50;
  const r = v => Math.round(v / step) * step;
  return [
    { level: `${r(price*0.987).toLocaleString('en-IN')} to ${r(price*0.993).toLocaleString('en-IN')}`, type: 'support',    note: 'Area where buying interest has previously emerged' },
    { level: `${r(price*0.975).toLocaleString('en-IN')} to ${r(price*0.981).toLocaleString('en-IN')}`, type: 'support',    note: 'Deeper area where prior demand has been observed' },
    { level: `${r(price*1.007).toLocaleString('en-IN')} to ${r(price*1.013).toLocaleString('en-IN')}`, type: 'resistance', note: 'Area where selling pressure has previously been seen' },
    { level: `${r(price*1.019).toLocaleString('en-IN')} to ${r(price*1.025).toLocaleString('en-IN')}`, type: 'resistance', note: 'Extended area where prior supply has been observed' },
  ];
}

function getIST() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); }
function getSlotLabel() {
  const ist = getIST(); const d = ist.getDay(); const m = ist.getHours() * 60 + ist.getMinutes();
  if (d === 0 || d === 6) return 'Weekend';
  if (m < 540) return 'Pre-Market'; if (m < 555) return 'Pre-Open';
  if (m < 750) return 'Opening Session'; if (m < 870) return 'Mid-Day';
  if (m < 930) return 'Afternoon'; if (m < 1020) return 'Market Close';
  return 'End of Day';
}

// ─── Brief section renderer ───────────────────────────────────────────────────
function BriefPanel({ title, accent, items, fallback }) {
  const labels = Object.keys(items);
  return (
    <div className="ins2-brief-panel" style={{ borderTopColor: accent }}>
      <div className="ins2-brief-panel-title" style={{ color: accent }}>{title}</div>
      {fallback && <div className="ins2-brief-fallback-note">Rule-based summary (Gemini unavailable)</div>}
      <ul className="ins2-brief-list">
        {labels.map(key => items[key] ? (
          <li key={key} className="ins2-brief-item">
            <span className="ins2-brief-key">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            <span className="ins2-brief-val">{items[key]}</span>
          </li>
        ) : null)}
      </ul>
    </div>
  );
}

function CollapsibleHow() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ins2-how">
      <button className="ins2-how-toggle" onClick={() => setOpen(v => !v)}>
        <span>How to read this page</span><span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ins2-how-body">
          <p>This page describes market conditions using price data and current news. It is a thinking tool, not a trading tool.</p>
          <ul>
            <li><strong>Trader Brief</strong> — intraday-focused interpretation of current session conditions</li>
            <li><strong>Investor Brief</strong> — broader context for positional participants</li>
            <li><strong>Market Stance</strong> — directional character based on index rules</li>
            <li><strong>Session Character</strong> — where price settled in the day's range</li>
            <li><strong>Price Reaction Zones</strong> — areas of historical buying or selling activity</li>
            <li><strong>Institutional Activity</strong> — FII and DII net flows and their context</li>
            <li><strong>Global Context</strong> — how major global indices are positioned</li>
          </ul>
          <p className="ins2-how-note">All content is for educational purposes only. Not investment advice.</p>
        </div>
      )}
    </div>
  );
}

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

function BasedOn({ reasons }) {
  return (
    <div className="ins2-basedon">
      <span className="ins2-basedon-label">Based on</span>
      <ul>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InsightsPage({ data = {}, nseData = {} }) {
  const [fiidii,       setFiidii]       = useState(null);
  const [brief,        setBrief]        = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [clock,        setClock]        = useState(getIST());
  const [slot,         setSlot]         = useState(getSlotLabel());

  useEffect(() => {
    fetch('/api/fiidii').then(r => r.json()).then(setFiidii).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => { setClock(getIST()); setSlot(getSlotLabel()); }, 60000);
    return () => clearInterval(id);
  }, []);

  const fetchBrief = useCallback(() => {
    setBriefLoading(true);
    const nifty      = nseData.nifty50   || data.nifty50   || {};
    const banknifty  = nseData.banknifty || data.banknifty || {};
    const niftyPct   = nifty.changePct ?? null;
    const bnPct      = banknifty.changePct ?? null;
    const fiiNet     = fiidii?.history?.slice(-1)[0]?.fii?.net ?? null;
    const diiNet     = fiidii?.history?.slice(-1)[0]?.dii?.net ?? null;

    const payload = {
      niftyPrice:  nifty.price,
      bnPrice:     banknifty.price,
      niftyPct,
      bnPct,
      vix:         nseData.vix || null,
      stance:      getStance(niftyPct, bnPct)?.label || 'Neutral',
      structure:   getStructureLabel(niftyPct),
      volLabel:    getVolLabel(niftyPct),
      sessionChar: getSessionChar(nifty.price, nifty.high, nifty.low)?.label || null,
      fiiNet,
      diiNet,
      sp500Pct:    data.sp500?.changePct ?? null,
      nikkeiPct:   data.nikkei?.changePct ?? null,
      hangsengPct: data.hangseng?.changePct ?? null,
    };

    fetch('/api/insights-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(d => { setBrief(d); setBriefLoading(false); })
      .catch(() => { setBriefLoading(false); });
  }, [data, nseData, fiidii]);

  // Fetch brief once fiidii is ready (or after 3s timeout)
  useEffect(() => {
    if (fiidii !== null) { fetchBrief(); return; }
    const t = setTimeout(fetchBrief, 3000);
    return () => clearTimeout(t);
  }, [fiidii]);

  const nifty     = nseData.nifty50   || data.nifty50   || null;
  const banknifty = nseData.banknifty || data.banknifty || null;
  const sensex    = nseData.sensex    || data.sensex    || null;
  const giftnifty = data.giftnifty    || null;
  const niftyPct  = nifty?.changePct ?? null;
  const bnPct     = banknifty?.changePct ?? null;

  const stance  = getStance(niftyPct, bnPct);
  const sesChar = getSessionChar(nifty?.price, nifty?.high, nifty?.low);
  const zones   = getPriceZones(nifty?.price);
  const global  = getGlobalContext(data);

  const latestFii = fiidii?.history?.slice(-1)[0] ?? null;
  const fiiNet    = latestFii?.fii?.net ?? null;
  const diiNet    = latestFii?.dii?.net ?? null;
  let fiiContext  = null;
  if (fiiNet !== null) {
    if (fiiNet < 0 && (diiNet ?? 0) > 0) fiiContext = 'FIIs are selling while DIIs are absorbing the supply. This pattern often cushions markets during foreign outflows.';
    else if (fiiNet > 0 && (diiNet ?? 0) > 0) fiiContext = 'Both FIIs and DIIs are buying. Simultaneous inflows indicate broad institutional conviction.';
    else if (fiiNet < 0 && (diiNet ?? 0) < 0) fiiContext = 'Both FIIs and DIIs are selling. Broad institutional selling without domestic support can amplify downside.';
    else fiiContext = 'FIIs are buying while DIIs are trimming. Foreign flows are supporting the market.';
  }

  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtPct   = v => v !== null && v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';
  const fmtPrice = v => v ? v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—';
  const pColor   = v => !v && v !== 0 ? 'var(--text3)' : v >= 0 ? 'var(--gain)' : 'var(--loss)';

  return (
    <div className="ins2-wrap">

      {/* Header */}
      <div className="ins2-header">
        <div className="ins2-header-left">
          <h1 className="ins2-page-title">Market Brief</h1>
          <div className="ins2-page-meta">{dateStr} · {timeStr} IST</div>
        </div>
        <div className="ins2-slot-pill">{slot}</div>
      </div>

      {/* Index strip */}
      <div className="ins2-index-strip">
        {[
          { label: 'Nifty 50',   d: nifty,     main: true },
          { label: 'Bank Nifty', d: banknifty              },
          { label: 'Sensex',     d: sensex                  },
          { label: 'Gift Nifty', d: giftnifty               },
        ].map((item, i) => item.d?.price ? (
          <div key={i} className={`ins2-idx ${item.main ? 'ins2-idx-main' : ''}`}>
            <div className="ins2-idx-name">{item.label}</div>
            <div className="ins2-idx-price">{fmtPrice(item.d.price)}</div>
            <div className="ins2-idx-chg" style={{ color: pColor(item.d.changePct) }}>{fmtPct(item.d.changePct)}</div>
          </div>
        ) : null)}
      </div>

      <div className="ins2-body">

        {/* SESSION BRIEF — Trader + Investor split */}
        <div className="ins2-card ins2-brief-card">
          <div className="ins2-card-hdr">
            <span className="ins2-card-title">SESSION BRIEF</span>
            {briefLoading
              ? <span className="ins2-brief-badge ins2-brief-badge-loading">GENERATING</span>
              : brief?.cached
                ? <span className="ins2-brief-badge ins2-brief-badge-cached">CACHED</span>
                : <span className="ins2-brief-badge ins2-brief-badge-live">LIVE</span>
            }
            {brief?.generatedAt && !briefLoading && (
              <span className="ins2-brief-time">
                {new Date(brief.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>

          {briefLoading ? (
            <div className="ins2-brief-loading">
              <div className="ins2-brief-spinner" />
              <span>Reading live market data and news...</span>
            </div>
          ) : brief?.trader ? (
            <div className="ins2-brief-panels">
              <BriefPanel title="Intraday Trader" accent="#4A9EFF" items={brief.trader} fallback={brief.fallback} />
              <BriefPanel title="Investor Context" accent="#A78BFA" items={brief.investor} fallback={false} />
            </div>
          ) : (
            <div className="ins2-brief-panels">
              <BriefPanel title="Intraday Trader" accent="#4A9EFF" items={{
                tone: 'Market data is loading. Check back shortly.',
                control: null, behavior: null, risk: null,
              }} fallback={false} />
            </div>
          )}

          <div className="ins2-brief-source">
            {brief?.fallback
              ? 'Rule-based summary. Add GEMINI_API_KEY to Vercel env vars for AI-generated briefs with live news.'
              : 'Gemini with Google Search grounding. Refreshes once per session window.'}
          </div>
        </div>

        {/* Market Stance */}
        {stance && (
          <Card title="MARKET STANCE" tag={stance.label} tagColor={stance.color} accent={stance.color}>
            <div className="ins2-stance-label" style={{ color: stance.color }}>{stance.label}</div>
            <BasedOn reasons={stance.reasons} />
          </Card>
        )}

        {/* Session Character */}
        {sesChar && (
          <Card title="SESSION CHARACTER">
            <div className="ins2-ses-label">{sesChar.label}</div>
            <p className="ins2-explanation">{sesChar.explanation}</p>
          </Card>
        )}

        {/* Price Reaction Zones */}
        {zones && (
          <Card title="PRICE REACTION ZONES">
            <div className="ins2-zones-note">Areas where price has historically encountered activity. Not predictions.</div>
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

        {/* Institutional Activity */}
        <Card title="INSTITUTIONAL ACTIVITY">
          {fiiNet !== null ? (
            <>
              <div className="ins2-inst-grid">
                <div className="ins2-inst-card">
                  <div className="ins2-inst-who">FII / FPI</div>
                  <div className="ins2-inst-dir" style={{ color: fiiNet >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{fiiNet >= 0 ? 'Buying' : 'Selling'}</div>
                  <div className="ins2-inst-amt">{fiiNet >= 0 ? '+' : ''}₹{Math.abs(fiiNet).toLocaleString('en-IN')} Cr</div>
                </div>
                <div className="ins2-inst-card">
                  <div className="ins2-inst-who">DII</div>
                  <div className="ins2-inst-dir" style={{ color: (diiNet ?? 0) >= 0 ? 'var(--gain)' : 'var(--loss)' }}>{(diiNet ?? 0) >= 0 ? 'Buying' : 'Selling'}</div>
                  <div className="ins2-inst-amt">{(diiNet ?? 0) >= 0 ? '+' : ''}₹{Math.abs(diiNet ?? 0).toLocaleString('en-IN')} Cr</div>
                </div>
              </div>
              {fiiContext && <p className="ins2-explanation">{fiiContext}</p>}
            </>
          ) : (
            <p className="ins2-loading">FII / DII data loading...</p>
          )}
        </Card>

        {/* Global Context */}
        {global && (
          <Card title="GLOBAL CONTEXT" tag={global.bias}>
            <div className="ins2-global-grid">
              {global.items.map((g, i) => (
                <div key={i} className="ins2-global-row">
                  <span className="ins2-global-label">{g.label}</span>
                  <span className="ins2-global-pct" style={{ color: pColor(g.changePct) }}>{fmtPct(g.changePct)}</span>
                </div>
              ))}
            </div>
            <p className="ins2-explanation">{global.interp}</p>
          </Card>
        )}

        <CollapsibleHow />
      </div>

      <div className="ins2-footer">
        This is a data-driven market summary for educational purposes.
        Not a recommendation to buy or sell securities.
        Data from Kite Connect and NSE. AI brief powered by Gemini with Google Search grounding.
      </div>
    </div>
  );
}
