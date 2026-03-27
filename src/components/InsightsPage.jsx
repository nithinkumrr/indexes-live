import { useState, useEffect, useMemo } from 'react';

// ─── Slot detection (IST) ────────────────────────────────────────────────────
function getIST() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

function getSlot() {
  const ist  = getIST();
  const day  = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  if (day === 0 || day === 6) return 'weekend';
  if (mins < 540)  return 'premarket';   // before 9:00
  if (mins < 555)  return 'preopen';     // 9:00–9:15
  if (mins < 660)  return 'opening';     // 9:15–11:00
  if (mins < 870)  return 'midday';      // 11:00–14:30
  if (mins < 930)  return 'afternoon';   // 14:30–15:30 (was supposed to be 14:30)
  if (mins < 1020) return 'close';       // 15:30–17:00
  return 'eod';                          // after 17:00
}

const SLOT_META = {
  weekend:   { label: 'Weekend Prep',     badge: 'WEEKEND',    color: '#A78BFA', desc: 'Market closed. Prep for next week.' },
  premarket: { label: 'Pre-Market',       badge: 'PRE-MARKET', color: '#4A9EFF', desc: 'Before open. Global cues active.' },
  preopen:   { label: 'Pre-Open Session', badge: 'PRE-OPEN',   color: '#4A9EFF', desc: '9:00–9:15. Price discovery window.' },
  opening:   { label: 'Opening Report',   badge: 'OPENING',    color: '#F59E0B', desc: 'First hour. Direction setting.' },
  midday:    { label: 'Mid-Day Pulse',    badge: 'MID-DAY',    color: '#6EE7B7', desc: 'Trend confirmation window.' },
  afternoon: { label: 'Afternoon Check',  badge: 'AFTERNOON',  color: '#6EE7B7', desc: 'Final stretch. F&O focus.' },
  close:     { label: 'Market Close',     badge: 'CLOSING',    color: '#F59E0B', desc: 'Session wrap. Delivery vs intraday.' },
  eod:       { label: 'End of Day Wrap',  badge: 'EOD',        color: '#00C896', desc: 'Markets closed. Full day summary.' },
};

// ─── Signal helpers ───────────────────────────────────────────────────────────
function trendSignal(pct) {
  if (pct === null || pct === undefined) return { label: 'NO DATA', color: 'var(--text3)', bg: 'var(--bg3)', border: 'var(--border)' };
  if (pct >  1.0) return { label: 'STRONG BULL', color: '#00C896', bg: 'rgba(0,200,150,.08)', border: '#00C896' };
  if (pct >  0.3) return { label: 'BULLISH',     color: '#00C896', bg: 'rgba(0,200,150,.06)', border: '#00C896' };
  if (pct > -0.3) return { label: 'FLAT',        color: 'var(--text2)', bg: 'var(--bg2)', border: 'var(--border2)' };
  if (pct > -1.0) return { label: 'BEARISH',     color: '#F59E0B', bg: 'rgba(245,158,11,.06)', border: '#F59E0B' };
  return              { label: 'STRONG BEAR',     color: '#FF4455', bg: 'rgba(255,68,85,.08)', border: '#FF4455' };
}

function vixSignal(vix) {
  if (!vix) return null;
  if (vix < 12) return { label: 'LOW', color: '#00C896',  note: 'Markets complacent. Options cheap. Good for buyers.' };
  if (vix < 16) return { label: 'NORMAL', color: 'var(--text2)', note: 'Normal volatility. Standard risk management applies.' };
  if (vix < 20) return { label: 'ELEVATED', color: '#F59E0B', note: 'Caution. Hedges worth holding. Reduce position size.' };
  if (vix < 25) return { label: 'HIGH', color: '#FF4455', note: 'High volatility. Only high-conviction trades. Tight stops.' };
  return { label: 'EXTREME', color: '#FF4455', note: 'Extreme volatility. Markets in fear. Avoid new positions.' };
}

function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}
function fmtPrice(v, decimals = 0) {
  if (!v) return '—';
  return v.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}
function pctColor(v) {
  if (v === null || v === undefined) return 'var(--text3)';
  return v >= 0 ? 'var(--gain)' : 'var(--loss)';
}

// ─── Slot-specific narrative ─────────────────────────────────────────────────
function buildNarrative(slot, niftyPct, bnPct, vix, fiiNet, diiNet, sectors) {
  const trend  = niftyPct === null ? 'unknown' : niftyPct > 0.3 ? 'bullish' : niftyPct < -0.3 ? 'bearish' : 'flat';
  const vixStr = vix ? (vix < 14 ? 'calm' : vix < 18 ? 'normal' : 'elevated') : 'unknown';
  const fiiStr = fiiNet ? (fiiNet > 0 ? `buying ₹${Math.abs(fiiNet).toLocaleString('en-IN')} Cr` : `selling ₹${Math.abs(fiiNet).toLocaleString('en-IN')} Cr`) : null;

  // Top and bottom sectors
  const ranked = sectors.filter(s => s.pct !== null).sort((a, b) => b.pct - a.pct);
  const topSec    = ranked[0];
  const bottomSec = ranked[ranked.length - 1];

  const traderLines = {
    weekend:   ['Market closed. Study the week\'s price action and plan levels for Monday.', 'Map out key support and resistance for Nifty and BankNifty.', 'Review open F&O positions. Decide on exit or carry strategy.'],
    premarket: ['Check Gift Nifty for gap-up or gap-down indication before trading.', 'Avoid pre-market panic or euphoria. Wait for actual market reaction.', 'Mark yesterday\'s high, low, and close as your reference levels for today.'],
    preopen:   ['Price discovery in progress. Bids and offers being placed, no trades executing yet.', 'Watch the order imbalance. Large buy/sell side imbalance signals opening direction.', `Expected open is ${trend === 'bullish' ? 'positive' : trend === 'bearish' ? 'negative' : 'near flat'}. First 15 minutes after 9:15 are key.`],
    opening:   [
      `Market opened ${trend}. ${vixStr === 'elevated' ? 'VIX elevated — keep stops tight.' : 'Volatility is normal.'}`,
      bnPct !== null && Math.abs(bnPct - niftyPct) > 0.5 ? `BankNifty ${bnPct > niftyPct ? 'outperforming' : 'underperforming'} Nifty — watch for sector rotation signals.` : 'Nifty and BankNifty are moving in tandem.',
      topSec ? `${topSec.label} is the strongest sector today (+${topSec.pct?.toFixed(1)}%). Consider sector-specific trades.` : 'Watch sector rotation for trade ideas.',
    ],
    midday:    [
      `Morning session ${trend === 'bullish' ? 'confirmed bullish bias' : trend === 'bearish' ? 'shows selling pressure' : 'remains range-bound'}.`,
      `VIX is ${vixStr}. ${vixStr === 'elevated' ? 'Short premium strategies face pressure.' : 'Premium decay working in sellers\' favor.'}`,
      bottomSec ? `${bottomSec.label} is the weakest sector (${bottomSec.pct?.toFixed(1)}%). Avoid longs here unless reversal signals appear.` : 'Monitor lagging sectors for reversal opportunities.',
    ],
    afternoon: [
      'Last 1 hour of trade. Institutional squaring can change direction quickly.',
      `Nifty ${trend === 'bullish' ? 'holding gains — bulls in control into close' : trend === 'bearish' ? 'under pressure — watch for late selling' : 'rangebound — likely to stay flat into close'}.`,
      vix && vix > 16 ? 'VIX still elevated. Expect volatile last 30 minutes.' : 'VIX calm. Orderly close expected.',
    ],
    close:     [
      'Last 30 minutes. Delivery-based positions will hold overnight.',
      `If you\'re intraday, square off before 3:20 to avoid slippage. Close is at 3:30.`,
      trend === 'bullish' ? 'Positive close likely. Could see gap-up continuation tomorrow.' : trend === 'bearish' ? 'Weak close. Check global overnight cues before tomorrow.' : 'Flat close. No strong directional signal for tomorrow.',
    ],
    eod:       [
      `Market closed ${trend === 'bullish' ? 'green' : trend === 'bearish' ? 'red' : 'flat'} for the day.`,
      fiiStr ? `FII activity: ${fiiStr} today. ${fiiNet > 0 ? 'Positive foreign flow supports the market.' : 'Foreign selling is a headwind.'}` : 'FII/DII data will be published after 6 PM.',
      'For tomorrow: Check US market close tonight. Gift Nifty from 6:30 AM will give pre-market direction.',
    ],
  };

  const investorLines = {
    weekend:   ['Use the weekend to review your portfolio against your original investment thesis.', 'IPOs, corporate actions, and results scheduled for next week — keep track.', 'Avoid making decisions based on weekend news. Markets will price it in on Monday open.'],
    premarket: ['No action needed unless you have a specific entry plan.', 'Indian markets are globally connected. US futures and Asian markets set the tone.', 'Pre-market is for observation, not action.'],
    preopen:   ['Price discovery does not require action. Just observe.', 'Any large overnight news should already be reflected in Gift Nifty.', 'Wait for 9:30 to see if opening reaction sustains before acting.'],
    opening:   [
      'Opening moves are often emotional. Give the market 30 minutes to settle.',
      fiiNet !== null ? `FII was ${fiiNet > 0 ? 'buying' : 'selling'} yesterday. Sustained FII ${fiiNet > 0 ? 'buying' : 'selling'} for 3+ days is a stronger signal.` : 'Monitor FII trend over multiple days for investable signals.',
      topSec ? `${topSec.label} sector is strong. Systemic rotation into this sector could be an opportunity.` : 'Watch for sector rotation over the week.',
    ],
    midday:    [
      'Midday dips in quality stocks are often buying opportunities. Check fundamentals first.',
      `Broader market (Midcap/Smallcap) ${trend === 'bullish' ? 'participating in the rally — healthy sign.' : trend === 'bearish' ? 'seeing selling too — broad-based weakness.' : 'stable.'}`,
      'For long-term investors: daily noise matters less than quarterly earnings trends.',
    ],
    afternoon: [
      'Afternoon FII data (provisional) will be out around 4 PM. Watch for surprises.',
      trend === 'bullish' ? 'A closing green day is constructive for the weekly trend.' : trend === 'bearish' ? 'Consecutive red closes should prompt a portfolio review.' : 'Flat markets are fine for long-term accumulation strategies.',
      'If you have SIP or systematic investment plans, ignore intraday noise.',
    ],
    close:     [
      `Today\'s close will set the reference for tomorrow. ${trend === 'bullish' ? 'Positive close supports uptrend continuation.' : trend === 'bearish' ? 'Weak close needs follow-through to confirm trend change.' : 'Flat — no strong signal.'}`,
      'Avoid end-of-day panic selling. Institutional investors average over time.',
      'Note stocks that closed at 52-week highs or lows — these are key watchlist candidates.',
    ],
    eod:       [
      fiiNet !== null ? `FII ${fiiNet > 0 ? 'bought' : 'sold'} ₹${Math.abs(fiiNet).toLocaleString('en-IN')} Cr. DII ${diiNet > 0 ? 'bought' : 'sold'} ₹${Math.abs(diiNet || 0).toLocaleString('en-IN')} Cr. ${diiNet > 0 && fiiNet < 0 ? 'DII absorbing FII selling — supportive.' : ''}` : 'FII/DII final data expected by 6 PM on NSE.',
      'Review today\'s movers for potential entries or exits in your watchlist.',
      'Set alerts for key levels overnight. Gift Nifty opens at 6:30 AM.',
    ],
  };

  return {
    trader:   (traderLines[slot]   || traderLines.eod),
    investor: (investorLines[slot] || investorLines.eod),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function IndexCard({ label, price, changePct, highlight }) {
  const c = pctColor(changePct);
  return (
    <div className={`ins-idx-card ${highlight ? 'ins-idx-highlight' : ''}`}>
      <div className="ins-idx-label">{label}</div>
      <div className="ins-idx-price">{fmtPrice(price, price && price < 1000 ? 2 : 0)}</div>
      <div className="ins-idx-chg" style={{color: c}}>{fmtPct(changePct)}</div>
    </div>
  );
}

function SectorBar({ label, pct }) {
  if (pct === null || pct === undefined) return null;
  const pos   = pct >= 0;
  const width = Math.min(Math.abs(pct) / 3 * 100, 100);
  return (
    <div className="ins-sec-row">
      <span className="ins-sec-label">{label}</span>
      <div className="ins-sec-bar-wrap">
        <div className="ins-sec-bar-track">
          <div className="ins-sec-bar-fill"
            style={{ width: `${width}%`, background: pos ? 'var(--gain)' : 'var(--loss)', opacity: 0.7 }} />
        </div>
      </div>
      <span className="ins-sec-pct" style={{color: pctColor(pct)}}>{fmtPct(pct)}</span>
    </div>
  );
}

function Section({ title, badge, badgeColor, children, borderColor }) {
  return (
    <div className="ins-section" style={borderColor ? {borderLeftColor: borderColor} : {}}>
      <div className="ins-section-hdr">
        <span className="ins-section-title">{title}</span>
        {badge && <span className="ins-section-badge" style={{color: badgeColor || 'var(--text3)', borderColor: badgeColor || 'var(--border2)'}}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function NarrativeLines({ lines, icon }) {
  return (
    <ul className="ins-narrative">
      {lines.map((l, i) => (
        <li key={i}><span className="ins-narrative-icon">{icon}</span>{l}</li>
      ))}
    </ul>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function InsightsPage({ data = {}, nseData = {} }) {
  const [slot, setSlot]     = useState(getSlot);
  const [note, setNote]     = useState(null);
  const [fiidii, setFiidii] = useState(null);
  const [clock, setClock]   = useState(getIST);

  // Update slot and clock every minute
  useEffect(() => {
    const id = setInterval(() => { setSlot(getSlot()); setClock(getIST()); }, 60000);
    return () => clearInterval(id);
  }, []);

  // Fetch FII/DII
  useEffect(() => {
    fetch('/api/fiidii')
      .then(r => r.json())
      .then(d => setFiidii(d))
      .catch(() => {});
  }, []);

  // Fetch manual note
  useEffect(() => {
    fetch('/api/market-note')
      .then(r => r.json())
      .then(d => { if (d.note) setNote(d.note); })
      .catch(() => {});
  }, []);

  const meta = SLOT_META[slot] || SLOT_META.eod;

  // ── Collect index data ──
  const nifty     = nseData.nifty50   || data.nifty50   || null;
  const banknifty = nseData.banknifty || data.banknifty || null;
  const sensex    = nseData.sensex    || data.sensex    || null;
  const giftnifty = data.giftnifty    || null;
  const vix       = nseData.vix       || null;

  // ── Sector data ──
  const SECTORS = [
    { id: 'niftyit',          label: 'IT'         },
    { id: 'niftyauto',        label: 'Auto'       },
    { id: 'niftypharma',      label: 'Pharma'     },
    { id: 'niftyfmcg',        label: 'FMCG'       },
    { id: 'niftymetal',       label: 'Metal'      },
    { id: 'niftyrealty',      label: 'Realty'     },
    { id: 'niftyenergy',      label: 'Energy'     },
    { id: 'niftyfinservice',  label: 'Fin Svc'    },
    { id: 'niftypsubank',     label: 'PSU Bank'   },
    { id: 'niftypvtbank',     label: 'Pvt Bank'   },
    { id: 'niftypharma',      label: 'Pharma'     },
    { id: 'niftymedia',       label: 'Media'      },
  ];
  // dedupe by id
  const seenSec = new Set();
  const sectors = SECTORS.filter(s => {
    if (seenSec.has(s.id)) return false;
    seenSec.add(s.id);
    return true;
  }).map(s => ({ ...s, pct: nseData[s.id]?.changePct ?? null }))
    .filter(s => s.pct !== null)
    .sort((a, b) => b.pct - a.pct);

  // ── Global cues ──
  const GLOBALS = [
    { id: 'sp500',    label: 'S&P 500'   },
    { id: 'nasdaq',   label: 'Nasdaq'    },
    { id: 'dowjones', label: 'Dow'       },
    { id: 'nikkei',   label: 'Nikkei'   },
    { id: 'hangseng', label: 'Hang Seng' },
    { id: 'ftse',     label: 'FTSE 100'  },
    { id: 'dax',      label: 'DAX'       },
    { id: 'shanghai', label: 'Shanghai'  },
  ];

  // ── FII/DII latest ──
  const latestFii = useMemo(() => {
    if (!fiidii?.history?.length) return null;
    return fiidii.history[fiidii.history.length - 1];
  }, [fiidii]);

  const fiiNet5d = useMemo(() => {
    if (!fiidii?.history?.length) return null;
    return fiidii.history.slice(-5).reduce((s, d) => s + (d.fii?.net || 0), 0);
  }, [fiidii]);

  // ── Signal ──
  const niftyPct  = nifty?.changePct ?? null;
  const bnPct     = banknifty?.changePct ?? null;
  const trend     = trendSignal(niftyPct);
  const vixSig    = vixSignal(vix);
  const narrative = buildNarrative(slot, niftyPct, bnPct, vix,
    latestFii?.fii?.net ?? null, latestFii?.dii?.net ?? null, sectors);

  // ── Time string ──
  const timeStr = clock.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const dateStr = clock.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

  return (
    <div className="ins-wrap">

      {/* ── Header ── */}
      <div className="ins-header">
        <div className="ins-header-left">
          <div className="ins-header-title">Market Brief</div>
          <div className="ins-header-date">{dateStr} · {timeStr} IST</div>
        </div>
        <div className="ins-header-right">
          <span className="ins-slot-badge" style={{background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}40`}}>
            {meta.badge}
          </span>
          <div className="ins-slot-desc">{meta.desc}</div>
        </div>
      </div>

      {/* ── Trend banner ── */}
      <div className="ins-trend-banner" style={{background: trend.bg, borderColor: trend.border}}>
        <span className="ins-trend-label" style={{color: trend.color}}>{trend.label}</span>
        <span className="ins-trend-detail">
          {niftyPct !== null
            ? `Nifty ${fmtPct(niftyPct)}${bnPct !== null ? ` · BankNifty ${fmtPct(bnPct)}` : ''}${vix ? ` · VIX ${vix.toFixed(1)}` : ''}`
            : 'Market data loading...'}
        </span>
      </div>

      <div className="ins-body">

        {/* ── Market Pulse ── */}
        <Section title="MARKET PULSE" badge={nifty ? 'LIVE' : 'LOADING'} badgeColor={nifty ? 'var(--gain)' : 'var(--text3)'}>
          <div className="ins-idx-grid">
            <IndexCard label="Nifty 50"   price={nifty?.price}     changePct={nifty?.changePct}     highlight />
            <IndexCard label="Bank Nifty" price={banknifty?.price} changePct={banknifty?.changePct} />
            <IndexCard label="Sensex"     price={sensex?.price}    changePct={sensex?.changePct}    />
            {(slot === 'premarket' || slot === 'preopen' || slot === 'weekend') && giftnifty && (
              <IndexCard label="Gift Nifty" price={giftnifty?.price} changePct={giftnifty?.changePct} />
            )}
            {vix && (
              <div className="ins-idx-card">
                <div className="ins-idx-label">India VIX</div>
                <div className="ins-idx-price">{vix.toFixed(2)}</div>
                {vixSig && <div className="ins-idx-chg" style={{color: vixSig.color}}>{vixSig.label}</div>}
              </div>
            )}
          </div>
          {vixSig && (
            <div className="ins-vix-note" style={{borderLeftColor: vixSig.color}}>
              <strong style={{color: vixSig.color}}>VIX {vix?.toFixed(1)}</strong> — {vixSig.note}
            </div>
          )}
        </Section>

        {/* ── Sectors ── */}
        {sectors.length > 0 && (
          <Section title="SECTOR HEAT">
            <div className="ins-sectors">
              {sectors.map(s => <SectorBar key={s.id} label={s.label} pct={s.pct} />)}
            </div>
            {sectors.length > 0 && (
              <div className="ins-sec-summary">
                <span style={{color:'var(--gain)'}}>↑ {sectors[0].label} {fmtPct(sectors[0].pct)}</span>
                <span style={{color:'var(--text3)'}}>strongest</span>
                <span style={{color:'var(--loss)'}}>↓ {sectors[sectors.length-1].label} {fmtPct(sectors[sectors.length-1].pct)}</span>
                <span style={{color:'var(--text3)'}}>weakest</span>
              </div>
            )}
          </Section>
        )}

        {/* ── FII / DII ── */}
        <Section title="FII / DII FLOW">
          {latestFii ? (
            <>
              <div className="ins-fiidii-row">
                <div className="ins-fiidii-card">
                  <div className="ins-fiidii-who">FII / FPI</div>
                  <div className="ins-fiidii-val" style={{color: pctColor(latestFii.fii?.net)}}>
                    {latestFii.fii?.net >= 0 ? '+' : ''}₹{Math.abs(latestFii.fii?.net || 0).toLocaleString('en-IN')} Cr
                  </div>
                  <div className="ins-fiidii-label">{latestFii.fii?.net >= 0 ? '▲ Buying' : '▼ Selling'}</div>
                </div>
                <div className="ins-fiidii-card">
                  <div className="ins-fiidii-who">DII</div>
                  <div className="ins-fiidii-val" style={{color: pctColor(latestFii.dii?.net)}}>
                    {latestFii.dii?.net >= 0 ? '+' : ''}₹{Math.abs(latestFii.dii?.net || 0).toLocaleString('en-IN')} Cr
                  </div>
                  <div className="ins-fiidii-label">{latestFii.dii?.net >= 0 ? '▲ Buying' : '▼ Selling'}</div>
                </div>
                {fiiNet5d !== null && (
                  <div className="ins-fiidii-card">
                    <div className="ins-fiidii-who">FII 5-Day</div>
                    <div className="ins-fiidii-val" style={{color: pctColor(fiiNet5d)}}>
                      {fiiNet5d >= 0 ? '+' : ''}₹{Math.abs(fiiNet5d).toLocaleString('en-IN')} Cr
                    </div>
                    <div className="ins-fiidii-label">{fiiNet5d >= 0 ? 'Net buyers' : 'Net sellers'}</div>
                  </div>
                )}
              </div>
              {latestFii.fii?.net < 0 && latestFii.dii?.net > 0 && (
                <div className="ins-fiidii-note">DII absorbing FII selling. Domestic institutions supporting the market.</div>
              )}
              {latestFii.fii?.net > 0 && (
                <div className="ins-fiidii-note ins-fiidii-note-pos">Foreign inflows active. Positive for near-term sentiment.</div>
              )}
            </>
          ) : (
            <div className="ins-empty-state">FII/DII data loading...</div>
          )}
        </Section>

        {/* ── Global Cues ── */}
        <Section title="GLOBAL CUES">
          <div className="ins-global-grid">
            {GLOBALS.map(g => {
              const d = data[g.id];
              if (!d?.price) return null;
              return (
                <div key={g.id} className="ins-global-row">
                  <span className="ins-global-label">{g.label}</span>
                  <span className="ins-global-price">{fmtPrice(d.price, d.price < 1000 ? 2 : 0)}</span>
                  <span className="ins-global-pct" style={{color: pctColor(d.changePct)}}>{fmtPct(d.changePct)}</span>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </Section>

        {/* ── Trader Brief ── */}
        <Section title="TRADER BRIEF" badge="FOR TRADERS" badgeColor="#4A9EFF" borderColor="#4A9EFF">
          <NarrativeLines lines={narrative.trader} icon="▸" />
        </Section>

        {/* ── Investor Brief ── */}
        <Section title="INVESTOR BRIEF" badge="FOR INVESTORS" badgeColor="#A78BFA" borderColor="#A78BFA">
          <NarrativeLines lines={narrative.investor} icon="▸" />
        </Section>

        {/* ── Key watch levels ── */}
        {nifty?.price && (
          <Section title="KEY LEVELS TO WATCH">
            <div className="ins-levels">
              {[
                { label: 'Nifty Support 1',   val: Math.round(nifty.price * 0.99 / 50) * 50,  type: 'support' },
                { label: 'Nifty Support 2',   val: Math.round(nifty.price * 0.975 / 50) * 50, type: 'support' },
                { label: 'Nifty Resistance 1',val: Math.round(nifty.price * 1.01 / 50) * 50,  type: 'resist'  },
                { label: 'Nifty Resistance 2',val: Math.round(nifty.price * 1.025 / 50) * 50, type: 'resist'  },
              ].map((l, i) => (
                <div key={i} className="ins-level-row">
                  <span className="ins-level-label">{l.label}</span>
                  <span className="ins-level-val" style={{color: l.type === 'support' ? 'var(--gain)' : 'var(--loss)'}}>
                    {l.val.toLocaleString('en-IN')}
                  </span>
                  <span className={`ins-level-tag ${l.type}`}>{l.type === 'support' ? 'SUPPORT' : 'RESISTANCE'}</span>
                </div>
              ))}
            </div>
            <div className="ins-levels-note">Approximate levels based on round numbers near current price. Not a prediction.</div>
          </Section>
        )}

        {/* ── Editor's Note ── */}
        {note && (
          <Section title="EDITOR'S NOTE" badge="MANUAL" badgeColor="var(--pre)" borderColor="var(--pre)">
            <div className="ins-note-body">{note}</div>
          </Section>
        )}

        <div className="ins-footer">
          Automated report. Data from Kite Connect, NSE. Refreshes every 20s with market data.
          Not investment advice. Past performance is not indicative of future results.
        </div>
      </div>
    </div>
  );
}
