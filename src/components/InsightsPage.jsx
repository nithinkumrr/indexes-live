import { useState, useEffect, useCallback, useRef } from 'react';
import Ticker from './Ticker';

// ── Economic calendar ─────────────────────────────────────────────────────────
const ECON_EVENTS = [
  { date: '2026-03-29', event: 'BOJ Policy Rate',            impact: 'high',   country: 'Global', note: 'Bank of Japan rate decision. Yen moves spill into Asian markets and Indian IT/export stocks.' },
  { date: '2026-03-30', event: 'Germany Inflation (Prelim)', impact: 'high',   country: 'Global', note: 'Eurozone inflation proxy. Shapes ECB rate expectations.' },
  { date: '2026-03-31', event: 'China Manufacturing PMI',    impact: 'medium', country: 'Global', note: 'Below 50 = contraction. Bearish for metals and commodity stocks.' },
  { date: '2026-04-01', event: 'India GST Collections',      impact: 'medium', country: 'India',  note: 'Consumption proxy. Strong collections positive for domestic growth.' },
  { date: '2026-04-03', event: 'US Non-Farm Payrolls',       impact: 'high',   country: 'Global', note: 'Biggest monthly mover. Strong NFP delays Fed cuts. Drives FII flows into India.' },
  { date: '2026-04-03', event: 'US Unemployment Rate',       impact: 'high',   country: 'Global', note: 'Released with NFP. Fed watches this for labour market signals.' },
  { date: '2026-04-08', event: 'RBI Monetary Policy',        impact: 'high',   country: 'India',  note: 'Most important domestic event. Rate move impacts equities, bonds, banking stocks. Prev: 5.25%.' },
  { date: '2026-04-10', event: 'US CPI Inflation',           impact: 'high',   country: 'Global', note: 'Above forecast = dollar strengthens, FIIs reduce EM exposure.' },
  { date: '2026-04-10', event: 'China CPI Inflation',        impact: 'high',   country: 'Global', note: 'Deflation risk in China is bearish for metals and commodity-linked Indian stocks.' },
  { date: '2026-04-17', event: 'China GDP Q1 2026',          impact: 'high',   country: 'Global', note: 'Directly impacts commodity prices. Weak print pressures metals and crude.' },
  { date: '2026-04-20', event: 'China PBOC Rate Decision',   impact: 'high',   country: 'Global', note: 'China easing is positive for risk assets and commodity-linked Indian stocks.' },
  { date: '2026-04-29', event: 'US Fed FOMC Decision',       impact: 'high',   country: 'Global', note: 'Federal Reserve policy. Biggest driver of FII flows into India. Prev: 3.50-3.75%.' },
  { date: '2026-04-30', event: 'US GDP Q1 Advance',          impact: 'high',   country: 'Global', note: 'First read on US Q1 growth. Weak print accelerates Fed cut expectations.' },
  { date: '2026-04-30', event: 'ECB Rate Decision',          impact: 'high',   country: 'Global', note: 'ECB easing supports global risk appetite and EM inflows.' },
];

// Avg daily ranges (hardcoded from historical norms)
const AVG_RANGES = { nifty: 155, banknifty: 450 };

// ── IST helpers ───────────────────────────────────────────────────────────────
function getIST() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); }

const NSE_HOLIDAYS_IP = new Set(['2026-01-15','2026-01-26','2026-03-03','2026-03-26','2026-03-31',
  '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14',
  '2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25']);

function getNextTradingDay() {
  // Returns { iso, label } for next trading session
  const nowMs = Date.now();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(nowMs + i * 86400000);
    const iso = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dow = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
    if (dow !== 0 && dow !== 6 && !NSE_HOLIDAYS_IP.has(iso)) {
      const label = new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
      return { iso, label };
    }
  }
  return { iso: null, label: 'next session' };
}
function getSlot() {
  const ist = getIST(); const d = ist.getDay(); const m = ist.getHours()*60 + ist.getMinutes();
  if (d===0||d===6) return 'Weekend';
  if (m<540) return 'Pre-Market'; if (m<555) return 'Pre-Open';
  if (m<750) return 'Opening';    if (m<870) return 'Mid-Day';
  if (m<930) return 'Afternoon';  if (m<1020) return 'Market Close';
  return 'Post-Market';
}
function getMins() { const ist = getIST(); return ist.getHours()*60 + ist.getMinutes(); }

// ── Stance ────────────────────────────────────────────────────────────────────
function getStance(np, bp) {
  if (np === null) return null;
  if (np < -1.5 && bp !== null && bp < -1.5) return { label:'Strong Bear', color:'#FF4455', bg:'rgba(255,68,85,.07)', border:'rgba(255,68,85,.3)', icon:'↓↓', confidence:'High',   bias:'Selling on rallies',      reasons:['Broad decline across Nifty and Bank Nifty','Sustained selling pressure in large caps'] };
  if (np < -0.7)  return { label:'Bearish',     color:'#F59E0B', bg:'rgba(245,158,11,.06)', border:'rgba(245,158,11,.3)', icon:'↓',  confidence:'Medium', bias:'Cautious, negative bias',  reasons:['Nifty declining more than 0.7%','Price momentum is negative'] };
  if (np > 1.5 && bp !== null && bp > 1.5) return { label:'Strong Bull', color:'#00C896', bg:'rgba(0,200,150,.07)',  border:'rgba(0,200,150,.3)',  icon:'↑↑', confidence:'High',   bias:'Dips being bought',       reasons:['Broad advance across Nifty and Bank Nifty','Sustained buying across large caps'] };
  if (np > 0.7)   return { label:'Bullish',     color:'#00C896', bg:'rgba(0,200,150,.06)',  border:'rgba(0,200,150,.25)', icon:'↑',  confidence:'Medium', bias:'Positive bias',            reasons:['Nifty advancing more than 0.7%','Price momentum is positive'] };
  return { label:'Neutral', color:'var(--text2)', bg:'var(--bg3)', border:'var(--border2)', icon:'→', confidence:'Low', bias:'Neither side in control', reasons:['Nifty within 0.7% of previous close','No dominant directional bias'] };
}

// ── Day Type Detection ────────────────────────────────────────────────────────
function getDayType(price, high, low, np) {
  if (!price || !high || !low) return null;
  const range = high - low;
  const avg = AVG_RANGES.nifty;
  const posInRange = (price - low) / (high - low); // 0=at low, 1=at high
  const mins = getMins();
  const isMktOpen = mins >= 555 && mins < 1020;

  let type, label, detail, color;

  // Reversal: opened strong direction but price ended up against it
  const openedBullish = np !== null && np > 0;
  const openedBearish = np !== null && np < 0;
  const closingAtOpposite = (openedBullish && posInRange < 0.3) || (openedBearish && posInRange > 0.7);

  if (closingAtOpposite && Math.abs(np) > 0.5) {
    type = 'reversal'; color = '#A78BFA';
    label = 'Reversal Day';
    detail = openedBullish
      ? 'Opened positive but selling into highs. Weak close suggests reversal attempt.'
      : 'Opened negative but buying into lows. Potential reversal from key support.';
  } else if (range > avg * 1.5 && posInRange > 0.7 && np > 0.8) {
    type = 'trend-up'; color = '#00C896';
    label = 'Trend Day (Up)';
    detail = `Range ${Math.round(range)} points, ${Math.round(range/avg*100-100)}% above average. Price closing near high. Classic upside trend day.`;
  } else if (range > avg * 1.5 && posInRange < 0.3 && np < -0.8) {
    type = 'trend-down'; color = '#FF4455';
    label = 'Trend Day (Down)';
    detail = `Range ${Math.round(range)} points, ${Math.round(range/avg*100-100)}% above average. Price closing near low. Downside trend day with sustained selling.`;
  } else if (range < avg * 0.75) {
    type = 'range'; color = '#F59E0B';
    label = 'Range Day';
    detail = `Range ${Math.round(range)} points, below ${Math.round(avg)} point average. Market in compression. Breakout often follows tight range.`;
  } else {
    type = 'normal'; color = 'var(--text2)';
    label = 'Normal Day';
    detail = `Range ${Math.round(range)} points, near historical average. No strong directional structure established yet.`;
  }

  // Bias qualifier
  const biasTag = np > 0.5 ? 'with upside bias' : np < -0.5 ? 'with downside bias' : 'neutral bias';
  return { type, label: `${label}`, subLabel: biasTag, detail, color, range: Math.round(range), avg, posInRange };
}

// ── Intraday Bias Tracker ─────────────────────────────────────────────────────
function getIntradayBias(price, high, low, np) {
  if (!price || !high || !low) return null;
  const mins = getMins();
  // Only show intraday bias during market hours
  const isActive = mins >= 555 && mins < 930;
  if (!isActive) return null;

  const posInRange = (price - low) / (high - low);

  // Opening phase: 9:15–10:30 (555–630 mins)  -  show after 9:30 (570)
  const showOpening = mins >= 570;
  const openingCtrl  = showOpening ? (np > 0.3 ? 'Buyers' : np < -0.3 ? 'Sellers' : 'Neutral') : null;
  const openingColor = np > 0.3 ? 'var(--gain)' : np < -0.3 ? 'var(--loss)' : 'var(--text3)';

  // Mid session: 10:30–1:30 (630–810 mins)  -  only show after 10:30
  const showMid = mins >= 630;
  const midCtrl  = showMid
    ? (posInRange > 0.6 && np < 0 ? 'Buyers' : posInRange < 0.4 && np > 0 ? 'Sellers' : np > 0 ? 'Buyers' : np < 0 ? 'Sellers' : 'Neutral')
    : null;
  const midColor = midCtrl === 'Buyers' ? 'var(--gain)' : midCtrl === 'Sellers' ? 'var(--loss)' : 'var(--text3)';

  // Closing phase: 1:30–3:30 (810–930 mins)  -  only show after 1:30 PM
  const showClosing = mins >= 810;
  let closing = null, closingColor = 'var(--text3)', closingNote = '';
  if (showClosing) {
    if (posInRange > 0.75) {
      closing = 'Strength into close'; closingColor = 'var(--gain)';
      closingNote = 'Price holding near high. Buyers in control heading into close.';
    } else if (posInRange < 0.25) {
      closing = 'Weakness into close'; closingColor = 'var(--loss)';
      closingNote = 'Price near session low. Sellers dominating the close.';
    } else {
      closing = 'Volatile close'; closingColor = '#F59E0B';
      closingNote = 'Mid-range close. Directional move often comes in final 30 minutes.';
    }
  }

  const phase = mins < 630 ? 'Opening' : mins < 810 ? 'Mid Session' : 'Closing Phase';

  return {
    opening:  { ctrl: openingCtrl,  color: openingColor,  pending: !showOpening },
    mid:      { ctrl: midCtrl,      color: midColor,       pending: !showMid },
    closing:  { ctrl: closing,      color: closingColor,   pending: !showClosing, note: closingNote },
    phase, isActive, showOpening, showMid, showClosing,
  };
}

// ── Volatility Context ────────────────────────────────────────────────────────
function getVolContext(price, high, low, vix) {
  if (!price || !high || !low) return null;
  const range = high - low;
  const avg = AVG_RANGES.nifty;
  const pctOfAvg = (range / avg * 100).toFixed(0);

  let rangeLabel, rangeColor, expectation;
  if (range > avg * 2) {
    rangeLabel = 'Extremely expanded'; rangeColor = '#FF4455';
    expectation = 'Exhaustion likely. Extreme moves often see partial reversion before end of session.';
  } else if (range > avg * 1.4) {
    rangeLabel = 'Expanded'; rangeColor = '#F59E0B';
    expectation = 'Follow-through is possible but be cautious of chasing. Pullbacks to VWAP are common.';
  } else if (range < avg * 0.6) {
    rangeLabel = 'Compressed'; rangeColor = '#A78BFA';
    expectation = 'Compressed sessions often precede breakouts. Watch for volume spike on directional move.';
  } else {
    rangeLabel = 'Normal'; rangeColor = 'var(--gain)';
    expectation = 'Normal volatility day. Standard position sizing applies.';
  }

  const vixContext = vix ? (vix > 18 ? 'Elevated VIX confirms high-vol environment.' : vix < 13 ? 'Low VIX confirms calm conditions.' : '') : '';

  return { range: Math.round(range), avg, pctOfAvg, rangeLabel, rangeColor, expectation, vixContext };
}

// ── What Changed Today ────────────────────────────────────────────────────────
function getChanges(nifty, banknifty, fiiNet, diiNet, fii7d, data) {
  const items = [];
  const np = nifty?.changePct ?? null;
  const bp = banknifty?.changePct ?? null;

  if (np !== null) {
    const prevClose = nifty.price / (1 + np/100);
    if (nifty.low < prevClose && np < 0)
      items.push({ text: 'Nifty broke previous session close to the downside.', type: 'bear' });
    if (nifty.high > prevClose && np > 0)
      items.push({ text: 'Nifty extended above previous session close.', type: 'bull' });
    if (Math.abs(np) < 0.2)
      items.push({ text: 'Nifty effectively flat. Consolidation session with no new directional bias.', type: 'neutral' });
  }

  if (np !== null && bp !== null && Math.abs(bp - np) > 0.7) {
    if (bp < np) items.push({ text: `Bank Nifty underperforming Nifty by ${(np-bp).toFixed(1)}%. Banking sector weakness visible.`, type: 'bear' });
    else         items.push({ text: `Bank Nifty outperforming Nifty by ${(bp-np).toFixed(1)}%. Banking sector leading the move.`, type: 'bull' });
  }

  if (fiiNet !== null) {
    if (fiiNet < -3000 && fii7d < -10000)
      items.push({ text: `FII net outflow: ₹${Math.abs(fiiNet).toLocaleString('en-IN')} Cr, part of a sustained 7-session selling trend.`, type: 'bear' });
    else if (fiiNet > 3000 && fii7d > 10000)
      items.push({ text: `FII net inflow: ₹${fiiNet.toLocaleString('en-IN')} Cr, consistent buying across 7 sessions.`, type: 'bull' });
    else if (fiiNet < 0 && (diiNet ?? 0) > 0)
      items.push({ text: `FII selling offset by DII buying. Market absorbed institutional selling through the session.`, type: 'neutral' });
  }

  const crude = data.crude;
  if (crude?.changePct != null && Math.abs(crude.changePct) > 1.5)
    items.push({ text: `Crude ${crude.changePct > 0 ? 'up' : 'down'} ${Math.abs(crude.changePct).toFixed(1)}% in the session. Energy sector impact visible.`, type: crude.changePct > 0 ? 'warn' : 'bull' });

  const gold = data.gold;
  if (gold?.changePct != null && gold.changePct > 0.8)
    items.push({ text: `Gold up ${gold.changePct.toFixed(1)}% in the session. Risk-off tone visible in global asset allocation.`, type: 'warn' });

  if (items.length === 0)
    items.push({ text: 'No significant structural changes detected today. Market continuing prior session character.', type: 'neutral' });

  return items;
}

// ── Trader Warnings ───────────────────────────────────────────────────────────
function getWarnings(np, vix, fiiNet, diiNet, posInRange, range) {
  const warnings = [];
  const avg = AVG_RANGES.nifty;

  if (range > avg * 1.5 && np < -1)
    warnings.push('Avoid chasing breakdowns after large red candles. Extended moves often see brief bounces before continuation.');
  if (vix && vix > 18)
    warnings.push(`VIX at ${vix.toFixed(1)} is elevated. High volatility means wider stop-losses needed. Reduce position size accordingly.`);
  if (fiiNet !== null && fiiNet < 0 && diiNet !== null && diiNet > 0)
    warnings.push('FIIs selling while DIIs absorb creates a choppy, two-sided market. Momentum trades can fail quickly in this setup.');
  if (posInRange !== null && posInRange > 0.8 && np > 1.2)
    warnings.push('Price near session high after a strong move. Buying near highs late in the session carries increased reversal risk.');
  if (posInRange !== null && posInRange < 0.2 && np < -1.2)
    warnings.push('Price near session low after a large decline. Shorting near lows late in session carries increased bounce risk.');
  if (range < avg * 0.65)
    warnings.push('Compressed range day. Avoid overtrading in low-volatility environments. Wait for a clear breakout with volume.');
  if (vix && vix < 12 && Math.abs(np ?? 0) < 0.3)
    warnings.push('Low VIX with flat market. Options sellers benefit but be aware sudden events can cause sharp VIX spikes.');

  return warnings.slice(0, 3);
}

// ── Risk Meter ────────────────────────────────────────────────────────────────
function getRiskMeter(np, vix, fiiNet, diiNet) {
  let score = 0;
  if (np !== null && np < -1)   score += 2;
  else if (np !== null && np < 0) score += 1;
  if (vix && vix > 18) score += 2;
  else if (vix && vix > 14) score += 1;
  if (fiiNet !== null && fiiNet < -2000) score += 2;
  else if (fiiNet !== null && fiiNet < 0) score += 1;
  if (fiiNet !== null && fiiNet < 0 && diiNet !== null && diiNet < 0) score += 1;

  let level, color, bg, factors = [];
  if (score >= 5) { level = 'High Risk'; color = '#FF4455'; bg = 'rgba(255,68,85,.08)'; }
  else if (score >= 3) { level = 'Moderate Risk'; color = '#F59E0B'; bg = 'rgba(245,158,11,.07)'; }
  else { level = 'Lower Risk'; color = '#00C896'; bg = 'rgba(0,200,150,.07)'; }

  if (np !== null && np < -0.7) factors.push('Selling pressure');
  if (vix && vix > 16) factors.push('Elevated volatility');
  if (fiiNet !== null && fiiNet < 0) factors.push('FII outflow');
  if (fiiNet !== null && fiiNet < 0 && diiNet !== null && diiNet < 0) factors.push('No institutional support');
  if (factors.length === 0) factors.push('No elevated risk factors');

  return { level, color, bg, factors, score, maxScore: 7 };
}

// ── Trap Zones ────────────────────────────────────────────────────────────────
function getTrapZones(price, high, low) {
  if (!price) return [];
  const zones = [];
  const round = (v, step) => Math.round(v / step) * step;
  const step = price < 10000 ? 500 : 500;

  // Previous day high/low (approximated from today's open move)
  if (high) zones.push({ level: Math.round(high), label: "Today's High", note: 'Stop-loss cluster above this. Breakout here often traps longs.', type: 'resist' });
  if (low)  zones.push({ level: Math.round(low),  label: "Today's Low",  note: 'Stop-loss cluster below this. Break here triggers cascade selling.', type: 'support' });

  // Round number traps near price
  const below = round(price, step);
  const above = below + step;
  if (Math.abs(below - price) / price < 0.025) zones.push({ level: below, label: `Round ${below.toLocaleString('en-IN')}`, note: 'Psychological level. Heavy options OI. Expect reaction here.', type: below < price ? 'support' : 'resist' });
  if (Math.abs(above - price) / price < 0.025) zones.push({ level: above, label: `Round ${above.toLocaleString('en-IN')}`, note: 'Psychological level. Heavy options OI. Expect reaction here.', type: 'resist' });

  return zones;
}

// ── What to Watch Tomorrow ────────────────────────────────────────────────────
function getTomorrow(np, vix, fiiNet, diiNet, posInRange, dayType, events) {
  const items = [];

  // 1  -  Direction cue from today's session
  if (dayType?.type === 'trend-down' || (np !== null && np < -1)) {
    items.push('Gap down opens are common after strong down sessions. Watch whether the gap fills in the first 30 minutes or extends further.');
    items.push(`The first 30 minutes tomorrow will show whether ${np !== null && np < 0 ? "today's closing level" : "prior support"} acts as resistance or gets reclaimed.`);
  } else if (dayType?.type === 'trend-up' || (np !== null && np > 1)) {
    items.push('Strong up sessions are followed by one of two patterns: gap-up continuation or a morning fade. Watch opening range in the first 15 minutes.');
    items.push('Flat open after today\'s rally is often the sign of distribution. Volume on early weakness will be the tell.');
  } else if (dayType?.type === 'range') {
    items.push('Today\'s compressed range sets up a potential breakout session tomorrow. The direction of the first clean move with volume is often the day\'s bias.');
    items.push('Low-range sessions often see a high-range follow-through. Wide stop levels on both sides are appropriate when going into this kind of setup.');
  } else {
    items.push('A neutral session like today\'s often resolves with a directional move the next day. The opening gap direction and first 30 minutes are the key reads.');
    items.push('Gap and hold above prior resistance = sustained buying interest. Gap and fade = likely another rotation or range day.');
  }

  // 2  -  Volatility context
  if (vix !== null && vix !== undefined) {
    if (vix > 18)
      items.push(`VIX closed at ${vix.toFixed(1)}  -  elevated. Wider intraday ranges and faster moves are likely tomorrow. Positions sized for normal days will feel oversized.`);
    else if (vix < 13)
      items.push(`VIX at ${vix.toFixed(1)}  -  subdued. Low volatility often keeps intraday ranges tight. A breakout of note will stand out clearly.`);
  }

  // 3  -  FII/DII
  if (fiiNet !== null && fiiNet < -3000)
    items.push(`FII outflow was ₹${Math.abs(fiiNet).toLocaleString('en-IN')} Cr today. Tomorrow morning\'s DII data will show whether domestic institutions step up absorption again.`);
  else if (fiiNet !== null && fiiNet > 3000)
    items.push(`FII inflow of ₹${fiiNet.toLocaleString('en-IN')} Cr today. Sustained foreign buying over multiple sessions is typically supportive for index levels.`);
  else if (fiiNet !== null && fiiNet < 0 && diiNet !== null && diiNet > 0)
    items.push('FIIs selling, DIIs absorbing  -  this two-sided flow pattern often creates choppy intraday conditions. Range-bound behaviour is common in such setups.');

  // 4  -  Position in range
  if (posInRange !== null) {
    if (posInRange < 0.25)
      items.push('Today\'s close near session low suggests sellers were in control into the close. A bounce attempt tomorrow is possible but needs volume confirmation.');
    else if (posInRange > 0.75)
      items.push('Closing near session high shows buyers held momentum into the close. This is generally constructive for the next session open.');
  }

  // 5  -  Tomorrow's event
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
  const tmEvent = events.find(e => e.date === tStr);
  if (tmEvent) items.push(`${tmEvent.event} is scheduled tomorrow. High-impact events typically increase pre-event caution and post-event volatility.`);

  // 6  -  Upcoming events in next 3 days
  const in3 = new Date(); in3.setDate(in3.getDate() + 3);
  const in3Str = `${in3.getFullYear()}-${String(in3.getMonth()+1).padStart(2,'0')}-${String(in3.getDate()).padStart(2,'0')}`;
  const soon = events.filter(e => e.date > tStr && e.date <= in3Str && e.impact === 'high');
  if (soon.length > 0)
    items.push(`High-impact events within 3 days: ${soon.map(e => e.event).join(', ')}. Pre-event positioning effects can show up a session or two before the actual date.`);

  // Pad to 8 if needed with general structure observation
  if (items.length < 8)
    items.push('Nifty F&O open interest data released after market close today will show whether positions are being built or unwound for the next session.');
  if (items.length < 8)
    items.push('Global cues: check S&P 500 futures, crude oil, and USD/INR after 6 PM IST for the overnight setup before the next session opens.');

  return { items: items.slice(0, 8), show: true };
}

// ── Signals engine ────────────────────────────────────────────────────────────
function buildSignals({ np, bp, vix, niftyPrice, fiiNet, diiNet, fii7d, data, history, allEvents, fiiDate }) {
  const signals = [];
  const cr = v => `₹${Math.abs(v).toLocaleString('en-IN')} Cr`;

  if (fiiNet !== null && diiNet !== null) {
    // Date-aware label: say "on 28 Mar" not "today" if data is from previous session
    const fiiDateStr = fiiDate || null;
    const istNow = getIST();
    const todayIso = istNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const istMins = istNow.getHours()*60 + istNow.getMinutes();
    const isPast5pm = istMins >= 1020;
    const fiiLabel = (!fiiDateStr || (fiiDateStr === todayIso && isPast5pm))
      ? 'today'
      : new Date(fiiDateStr+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});
    if      (fiiNet < 0 && diiNet > 0) signals.push({ tag:'FLOWS', text:`FIIs net sold ${cr(fiiNet)} (${fiiLabel}). DIIs absorbed ${cr(diiNet)}. Domestic institutions cushioning the fall.`, type:'warn' });
    else if (fiiNet > 0 && diiNet > 0) signals.push({ tag:'FLOWS', text:`Both FIIs (${cr(fiiNet)}) and DIIs (${cr(diiNet)}) buying (${fiiLabel}). Broad institutional conviction.`, type:'bull' });
    else if (fiiNet < 0 && diiNet < 0) signals.push({ tag:'FLOWS', text:`Both FIIs and DIIs net sellers (${fiiLabel}). No institutional support layer under this market.`, type:'bear' });
    else                                signals.push({ tag:'FLOWS', text:`FIIs buying ${cr(fiiNet)}, DIIs trimming (${fiiLabel}). Foreign flows are the dominant support.`, type:'bull' });
  }

  if (fii7d !== null && history?.length >= 3) {
    const sellDays = history.slice(-7).filter(d => (d.fiiNet ?? 0) < 0).length;
    if      (fii7d < -8000) signals.push({ tag:'FLOWS', text:`FIIs net sold ₹${Math.abs(fii7d).toLocaleString('en-IN')} Cr over 7 sessions. Structural outflow, not a single-day event.`, type:'bear' });
    else if (fii7d > 8000)  signals.push({ tag:'FLOWS', text:`FIIs net bought ₹${fii7d.toLocaleString('en-IN')} Cr over 7 sessions. Consistent inflow supports large-cap indices.`, type:'bull' });
    else if (sellDays >= 5) signals.push({ tag:'FLOWS', text:`FIIs sold on ${sellDays} of last 7 sessions. Selling trend persistent even if daily amounts are moderate.`, type:'warn' });
  }

  if (vix != null) {
    if      (vix > 20) signals.push({ tag:'VOLATILITY', text:`India VIX ${vix.toFixed(1)}  -  elevated. Intraday ranges wider than usual. Options premiums inflated. Reduce position size.`, type:'bear' });
    else if (vix > 16) signals.push({ tag:'VOLATILITY', text:`India VIX ${vix.toFixed(1)}  -  moderately high. Expect choppy intraday swings. Participants pricing in near-term uncertainty.`, type:'warn' });
    else if (vix < 12) signals.push({ tag:'VOLATILITY', text:`India VIX ${vix.toFixed(1)}  -  low. Options premiums compressed. Low VIX can precede sudden spikes from global events.`, type:'neutral' });
    else               signals.push({ tag:'VOLATILITY', text:`India VIX ${vix.toFixed(1)}  -  normal range. Volatility not a constraint on regular positioning today.`, type:'neutral' });
  }

  const globIdxs = [{id:'sp500',label:'S&P 500'},{id:'nasdaq',label:'Nasdaq'},{id:'nikkei',label:'Nikkei'},{id:'hangseng',label:'Hang Seng'},{id:'dax',label:'DAX'}];
  const globMoves = globIdxs.map(i=>({label:i.label,pct:data[i.id]?.changePct??null})).filter(i=>i.pct!==null);
  if (globMoves.length) {
    const avg = globMoves.reduce((s,i)=>s+i.pct,0)/globMoves.length;
    if      (avg<-0.8) signals.push({ tag:'GLOBAL', text:`Global markets broadly weak. Average decline across tracked indices: ${avg.toFixed(1)}%. FII flows into India under pressure.`, type:'bear' });
    else if (avg>0.8)  signals.push({ tag:'GLOBAL', text:`Global markets broadly positive. Average gain: +${avg.toFixed(1)}%. Supportive backdrop for Indian equities.`, type:'bull' });
    else               signals.push({ tag:'GLOBAL', text:`Global markets mixed. No strong directional cue overseas. Indian markets trading on domestic factors.`, type:'neutral' });
    const sp = data.sp500?.changePct;
    if (sp!=null && Math.abs(sp)>1.2) signals.push({ tag:'GLOBAL', text:`S&P 500 moved ${sp>0?'up':'down'} ${Math.abs(sp).toFixed(1)}%. Direct read-across for Indian large-cap IT and financials.`, type:sp>0?'bull':'bear' });
  }

  const crude = data.crude;
  if (crude?.changePct!=null) {
    if      (crude.changePct<-1.5) signals.push({ tag:'COMMODITY', text:`Crude WTI down ${Math.abs(crude.changePct).toFixed(1)}% at $${crude.price?.toFixed(1)}. Positive for aviation, paints, FMCG. Negative for energy sector.`, type:'neutral' });
    else if (crude.changePct>1.5)  signals.push({ tag:'COMMODITY', text:`Crude WTI up ${crude.changePct.toFixed(1)}% at $${crude.price?.toFixed(1)}. Energy sector may outperform. Inflation caution for RBI rate cut expectations.`, type:'neutral' });
    else                           signals.push({ tag:'COMMODITY', text:`Crude stable at $${crude.price?.toFixed(1)} (${crude.changePct>=0?'+':''}${crude.changePct.toFixed(1)}%). No significant energy sector impact today.`, type:'neutral' });
  }

  const gold = data.gold;
  if (gold?.changePct!=null && Math.abs(gold.changePct)>0.7) {
    if (gold.changePct>0) signals.push({ tag:'COMMODITY', text:`Gold up ${gold.changePct.toFixed(1)}% at $${gold.price?.toFixed(0)}. Risk-off tone in global allocation. Defensive assets preferred.`, type:'warn' });
    else                  signals.push({ tag:'COMMODITY', text:`Gold down ${Math.abs(gold.changePct).toFixed(1)}% at $${gold.price?.toFixed(0)}. Declining gold suggests improving global risk appetite.`, type:'bull' });
  }

  if (niftyPrice && np!==null) {
    const s=niftyPrice<10000?100:50, r=v=>Math.round(v/s)*s;
    const sup1=r(niftyPrice*0.990), res1=r(niftyPrice*1.010);
    if      (np<-0.5) signals.push({ tag:'LEVELS', text:`Nifty down ${Math.abs(np).toFixed(1)}%. Support at ${sup1.toLocaleString('en-IN')} is ${((niftyPrice-sup1)/niftyPrice*100).toFixed(1)}% away. Close below shifts structure negative.`, type:'bear' });
    else if (np>0.5)  signals.push({ tag:'LEVELS', text:`Nifty up ${np.toFixed(1)}%. Resistance at ${res1.toLocaleString('en-IN')} is ${((res1-niftyPrice)/niftyPrice*100).toFixed(1)}% away. Holding above on close is constructive.`, type:'bull' });
    else              signals.push({ tag:'LEVELS', text:`Nifty flat between ${sup1.toLocaleString('en-IN')} support and ${res1.toLocaleString('en-IN')} resistance. Breakout direction sets the next trend.`, type:'neutral' });
    if (bp!==null && Math.abs(bp-np)>0.7) {
      if (bp<np) signals.push({ tag:'LEVELS', text:`Bank Nifty underperforming by ${(np-bp).toFixed(1)}%. Banking weakness dragging broader market. Watch PSU and private bank names.`, type:'warn' });
      else       signals.push({ tag:'LEVELS', text:`Bank Nifty outperforming by ${(bp-np).toFixed(1)}%. Banking strength leading. Financials are today's dominant driver.`, type:'bull' });
    }
  }

  const today = new Date();
  const rbi = allEvents.find(e=>e.event.includes('RBI'));
  if (rbi) { const d=Math.round((new Date(rbi.date)-today)/86400000); if(d>=0&&d<=5) signals.push({ tag:'MACRO', text:`RBI policy in ${d} day${d!==1?'s':''}. Markets historically turn cautious before RBI. Banking stocks and bonds most sensitive.`, type:'warn' }); }
  const fed = allEvents.find(e=>e.event.includes('FOMC'));
  if (fed) { const d=Math.round((new Date(fed.date)-today)/86400000); if(d>=0&&d<=7) signals.push({ tag:'MACRO', text:`US Fed FOMC in ${d} day${d!==1?'s':''}. FII positioning in EMs typically turns cautious ahead of Fed decisions.`, type:'warn' }); }

  return signals;
}

// ── Zones ─────────────────────────────────────────────────────────────────────
function getZones(price) {
  if (!price) return null;
  const s=price<10000?100:50, r=v=>Math.round(v/s)*s;
  return [
    {level:r(price*0.990),label:'Support 1',    type:'support'},
    {level:r(price*0.976),label:'Support 2',    type:'support'},
    {level:r(price*1.010),label:'Resistance 1', type:'resistance'},
    {level:r(price*1.022),label:'Resistance 2', type:'resistance'},
  ].map(z=>({...z,dist:((z.level-price)/price*100).toFixed(1)}));
}

// ── Enhanced Scenarios ────────────────────────────────────────────────────────
function getScenarios(price, np, data) {
  if (!price || np===null) return null;
  const s=price<10000?100:50, r=v=>Math.round(v/s)*s;
  const sup=r(price*0.990), sup2=r(price*0.976), res=r(price*1.010), res2=r(price*1.022);
  return [
    { if:`${sup.toLocaleString('en-IN')} breaks`, action:'Momentum continuation', next:`Next reaction zone: ${sup2.toLocaleString('en-IN')}`, watch:'Volume on break. False breaks retrace quickly.', type:'bear' },
    { if:`${res.toLocaleString('en-IN')} reclaimed`, action:'Short covering zone', next:`Watch for follow-through to ${res2.toLocaleString('en-IN')}`, watch:'Volume on reclaim. Sustained above = continuation.', type:'bull' },
    { if:`${sup.toLocaleString('en-IN')} to ${res.toLocaleString('en-IN')} holds`, action:'Range compression', next:'Breakout expected when range narrows further', watch:'Direction of first break with volume is the signal.', type:'neutral' },
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtP   = v => v ? v.toLocaleString('en-IN',{maximumFractionDigits:0}) : '--';
const fmtF   = (v,d=2) => v!=null ? Number(v).toLocaleString('en-IN',{maximumFractionDigits:d}) : '--';
const fmtPct = v => v!=null ? `${v>=0?'+':''}${Number(v).toFixed(2)}%` : '--';
const pColor = v => v==null ? 'var(--text3)' : v>=0 ? 'var(--gain)' : 'var(--loss)';

const TAG_COLORS = {
  FLOWS:      {bg:'rgba(74,158,255,.12)', color:'#4A9EFF'},
  VOLATILITY: {bg:'rgba(245,158,11,.1)',  color:'#F59E0B'},
  GLOBAL:     {bg:'rgba(167,139,250,.1)', color:'#A78BFA'},
  COMMODITY:  {bg:'rgba(251,191,36,.1)',  color:'#FBB724'},
  LEVELS:     {bg:'rgba(0,200,150,.1)',   color:'#00C896'},
  MACRO:      {bg:'rgba(255,68,85,.1)',   color:'#FF4455'},
};
const SIG_ICON  = {bull:'▲',bear:'▼',warn:'!',neutral:'·'};
const SIG_COLOR = {bull:'var(--gain)',bear:'var(--loss)',warn:'#F59E0B',neutral:'var(--text3)'};

// ── Sub-components ────────────────────────────────────────────────────────────
function TickerItem({label, d, borderColor}) {
  if (!d?.price) return null;
  const gain = (d.changePct??0)>=0;
  const bc = borderColor || (gain ? 'rgba(0,200,150,.5)' : 'rgba(255,68,85,.5)');
  return (
    <div className="ip-ticker-item" style={{borderLeftColor:bc}}>
      <div className="ip-ticker-name">{label}</div>
      <div className="ip-ticker-price">{fmtP(d.price)}</div>
      <div className="ip-ticker-pct" style={{color:pColor(d.changePct)}}>{gain?'▲':'▼'} {Math.abs(d.changePct??0).toFixed(2)}%</div>
      {d.high&&d.low&&<div className="ip-ticker-hl">H {fmtP(d.high)} · L {fmtP(d.low)}</div>}
    </div>
  );
}

function CommStrip({label, d, dec=1}) {
  if (!d?.price) return null;
  const gain=(d.changePct??0)>=0;
  return (
    <div className="ip-commstrip-item" style={{borderLeftColor:gain?'rgba(0,200,150,.4)':'rgba(255,68,85,.4)'}}>
      <div className="ip-commstrip-name">{label}</div>
      <div className="ip-commstrip-price">{fmtF(d.price,dec)}</div>
      <div className="ip-commstrip-pct" style={{color:pColor(d.changePct)}}>{gain?'▲':'▼'} {fmtPct(d.changePct)}</div>
    </div>
  );
}

function SignalCard({tag, text, type}) {
  const tc=TAG_COLORS[tag]||{bg:'var(--bg3)',color:'var(--text3)'};
  return (
    <div className="ip-signal">
      <div className="ip-signal-left">
        <span className="ip-signal-tag" style={{background:tc.bg,color:tc.color}}>{tag}</span>
        <span className="ip-signal-icon" style={{color:SIG_COLOR[type]}}>{SIG_ICON[type]}</span>
      </div>
      <div className="ip-signal-text">{text}</div>
    </div>
  );
}

function FiiBar({history}) {
  if (!history?.length) return null;
  const last7=history.slice(-7);
  const maxAbs=Math.max(...last7.map(d=>Math.max(Math.abs(d.fiiNet??0),Math.abs(d.diiNet??0))),1);
  return (
    <div className="ip-fii-bars">
      {last7.map((d,i)=>{
        const fii=d.fiiNet??0,dii=d.diiNet??0;
        const dt=d.date?new Date(d.date):null;
        const lbl=dt?dt.toLocaleDateString('en-IN',{day:'numeric',month:'short'}):`D${i+1}`;
        return (
          <div key={i} className="ip-fii-bar-col">
            <div className="ip-fii-bar-pair">
              <div className="ip-fii-bar-wrap"><div className="ip-fii-bar" style={{height:`${Math.abs(fii)/maxAbs*100}%`,background:fii>=0?'var(--gain)':'var(--loss)'}} title={`FII: ${fii>=0?'+':''}${fii.toLocaleString('en-IN')} Cr`}/></div>
              <div className="ip-fii-bar-wrap"><div className="ip-fii-bar" style={{height:`${Math.abs(dii)/maxAbs*100}%`,background:dii>=0?'#4A9EFF':'#F59E0B'}} title={`DII: ${dii>=0?'+':''}${dii.toLocaleString('en-IN')} Cr`}/></div>
            </div>
            <div className="ip-fii-bar-lbl">{lbl}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InsightsPage({data={}, nseData={}}) {
  const [fiidii,       setFiidii]   = useState(null);
  const [brief,        setBrief]    = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [clock,        setClock]    = useState(getIST());
  const [slot,         setSlot]     = useState(getSlot());
  const [subTab,       setSubTab]   = useState('news');
  const [newsItems,    setNewsItems] = useState([]);
  const [newsLoading,  setNewsLoading] = useState(true);
  const [newsFilter,   setNewsFilter] = useState('All');
  const [newsError,    setNewsError]  = useState(false);
  const [newsPage,     setNewsPage]   = useState(1);
  const [bookmarks,    setBookmarks]  = useState(()=>{ try{ return JSON.parse(sessionStorage.getItem('nr_bm')||'[]'); }catch{ return []; } });
  const PAGE_SIZE = 8;

  useEffect(()=>{
    setNewsLoading(true);
    setNewsError(false);
    fetch('/api/news')
      .then(r=>r.json())
      .then(d=>{ setNewsItems(d.items||[]); setNewsLoading(false); })
      .catch(()=>{ setNewsError(true); setNewsLoading(false); });
  },[]);

  useEffect(()=>{
    fetch('/api/fiidii').then(r=>r.json()).then(setFiidii).catch(()=>{});
    const id=setInterval(()=>{setClock(getIST());setSlot(getSlot());},60000);
    return ()=>clearInterval(id);
  },[]);

  const fetchBrief=useCallback(()=>{
    const nifty=nseData.nifty50||data.nifty50||{};
    const bn=nseData.banknifty||data.banknifty||{};
    const np=nifty.changePct??null,bp=bn.changePct??null;

    // Don't fire with empty data — wait until prices are loaded
    if (!nifty.price) return;

    setBriefLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 20000);
    fetch('/api/insights-brief',{
      method:'POST',headers:{'Content-Type':'application/json'},
      signal:ctrl.signal,
      body:JSON.stringify({
        niftyPrice: nifty.price,     bnPrice:    bn.price,
        niftyHigh:  nifty.high,      niftyLow:   nifty.low,
        niftyPct:   np,              bnPct:      bp,
        vix:        nseData.vix??null,
        stance:     getStance(np,bp)?.label||'Neutral',
        structure:  np<-0.5?'Downtrend':np>0.5?'Uptrend':'Range',
        volLabel:   Math.abs(np??0)>1.5?'High':Math.abs(np??0)>0.7?'Moderate':'Low',
        fiiNet:     fiidii?.fiiNet??null,  diiNet: fiidii?.diiNet??null,
        fiiDate:    fiidii?.date??null,
        sp500Pct:   data.sp500?.changePct??null,
        nikkeiPct:  data.nikkei?.changePct??null,
        hangsengPct:data.hangseng?.changePct??null,
        crudePct:   data.crude?.changePct??null,  crudePrc: data.crude?.price??null,
        goldPct:    data.gold?.changePct??null,    goldPrc:  data.gold?.price??null,
        usdInr:     data.usdinr?.price??null,
      }),
    })
    .then(r=>r.json())
    .then(d=>{clearTimeout(t);setBrief(d);setBriefLoading(false);})
    .catch(()=>{clearTimeout(t);setBriefLoading(false);});
  },[data,nseData,fiidii]);

  // Only fetch brief when slot changes (max 10x/day) or when FII data first arrives
  // Do NOT fire every time market data refreshes (every 20s)
  const prevSlotRef = useRef(null);
  useEffect(()=>{
    // Fire on mount
    fetchBrief();
  },[]);

  useEffect(()=>{
    // Fire when slot changes (9:30, 10:30, 12:00, 1:00, 2:00, 3:00, 3:30, 5:00)
    if (slot !== prevSlotRef.current) {
      prevSlotRef.current = slot;
      if (slot !== 'Weekend' && slot !== 'Holiday') fetchBrief();
    }
  },[slot]);

  useEffect(()=>{
    // Fire once when FII date changes (new day's data arrived)
    if (fiidii?.date) fetchBrief();
  },[fiidii?.date]); // eslint-disable-line

  // Data
  const nifty     = nseData.nifty50        || data.nifty50        || null;
  const banknifty = nseData.banknifty      || data.banknifty      || null;
  const giftnifty = data.giftnifty         || null;
  const np = nifty?.changePct??null;
  const bp = banknifty?.changePct??null;
  const stance = getStance(np, bp);

  // FII/DII
  const fiiNet  = fiidii?.fiiNet??null;
  const fiiBuy  = fiidii?.fiiBuy??null;
  const fiiSell = fiidii?.fiiSell??null;
  const diiNet  = fiidii?.diiNet??null;
  const diiBuy  = fiidii?.diiBuy??null;
  const diiSell = fiidii?.diiSell??null;
  // Deduplicate history by date — keep last occurrence of each date
  const rawHistory = fiidii?.history||[];
  const historyMap = new Map();
  rawHistory.forEach(d => { if (d.date) historyMap.set(d.date, d); });
  const history = Array.from(historyMap.values()).sort((a,b)=>a.date.localeCompare(b.date));
  const fii7d   = history.slice(-7).reduce((s,d)=>s+(d.fiiNet??0),0);
  const dii7d   = history.slice(-7).reduce((s,d)=>s+(d.diiNet??0),0);

  // Analytics
  const posInRange = nifty?.price && nifty.high && nifty.low ? (nifty.price-nifty.low)/(nifty.high-nifty.low) : null;
  const dayType   = getDayType(nifty?.price, nifty?.high, nifty?.low, np);
  const intraday  = getIntradayBias(nifty?.price, nifty?.high, nifty?.low, np);
  const volCtx    = getVolContext(nifty?.price, nifty?.high, nifty?.low, nseData.vix);
  const changes   = getChanges(nifty, banknifty, fiiNet, diiNet, fii7d, data);
  const warnings  = getWarnings(np, nseData.vix, fiiNet, diiNet, posInRange, nifty?.high&&nifty?.low?nifty.high-nifty.low:null);
  const riskMeter = getRiskMeter(np, nseData.vix, fiiNet, diiNet);
  const trapZones = getTrapZones(nifty?.price, nifty?.high, nifty?.low);
  const zones     = getZones(nifty?.price);
  const scenarios = getScenarios(nifty?.price, np, data);

  const pad2=n=>String(n).padStart(2,'0');
  const now=new Date();
  const todayStr=`${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())}`;
  const in7=new Date(now); in7.setDate(now.getDate()+6);
  const in7Str=`${in7.getFullYear()}-${pad2(in7.getMonth()+1)}-${pad2(in7.getDate())}`;
  const events    = ECON_EVENTS.filter(e=>e.date>=todayStr&&e.date<=in7Str).sort((a,b)=>a.date.localeCompare(b.date));
  const allEvents = ECON_EVENTS.filter(e=>e.date>=todayStr).slice(0,8);
  const fmtEvtDate= d=>new Date(d+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});

  const tmrw    = getTomorrow(np, nseData.vix, fiiNet, diiNet, posInRange, dayType, ECON_EVENTS);
  const signals = buildSignals({np,bp,vix:nseData.vix,niftyPrice:nifty?.price,fiiNet,diiNet,fii7d,data,history,allEvents,fiiDate:fiidii?.date});

  const timeStr=clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
  const dateStr=clock.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});

  return (
    <div className="ip-wrap">

      {/* SUB-TAB NAV */}
      <div className="ip-subnav">
        <button className={`ip-subtab ${subTab==='news'?'ip-subtab-on':''}`} onClick={()=>setSubTab('news')}>
          📰 News
        </button>
        <button className={`ip-subtab ${subTab==='insights'?'ip-subtab-on':''}`} onClick={()=>setSubTab('insights')}>
          ◐ Market Insights
        </button>
      </div>

      {/* NEWS TAB */}
      {subTab==='news' && (
        <div className="ip-news-wrap">

          {/* ── PULSE HEADER ── */}
          <div className="ip-news-pulse">
            <div className="ip-news-pulse-left">
              <span className="ip-news-pulse-dot"/>
              <span className="ip-news-pulse-label">Market Pulse</span>
              <span className="ip-news-pulse-sub">Live headlines · Indian &amp; global markets</span>
            </div>
            <span className="ip-news-pulse-count">
              {!newsLoading && !newsError && `${newsItems.length} stories`}
            </span>
          </div>

          {/* ── CATEGORY TABS ── */}
          <div className="ip-news-tabs">
            {['All','Markets','Economy','Stocks','Global'].map(f=>(
              <button key={f} className={`ip-news-tab ${newsFilter===f?'ip-news-tab-on':''}`}
                onClick={()=>{ setNewsFilter(f); setNewsPage(1); }}>{f}</button>
            ))}
          </div>

          {/* ── STATES ── */}
          {newsLoading ? (
            <div className="ip-news-loading">
              <div className="ip-news-spinner"/>
              <span>Fetching latest headlines…</span>
            </div>
          ) : newsError ? (
            <div className="ip-news-empty">
              <div style={{fontSize:28,marginBottom:8}}>⚠️</div>
              <div style={{fontWeight:700,marginBottom:4}}>Feed unavailable</div>
              <div style={{fontSize:12,color:'var(--text3)'}}>Check back shortly.</div>
            </div>
          ) : (()=>{
            const catColors = { Markets:'#4A9EFF', Economy:'#A78BFA', Stocks:'#00C896', Global:'#F59E0B' };
            const timeAgo = pd => {
              if (!pd) return '';
              const d = (Date.now() - new Date(pd).getTime()) / 60000;
              if (d < 60)   return `${Math.round(d)}m ago`;
              if (d < 1440) return `${Math.round(d/60)}h ago`;
              return `${Math.round(d/1440)}d ago`;
            };
            const filtered = newsFilter==='All' ? newsItems : newsItems.filter(i=>i.cat===newsFilter);
            if (!filtered.length) return <div className="ip-news-empty"><span style={{color:'var(--text3)'}}>No articles found.</span></div>;

            const topStories = newsFilter==='All' ? filtered.slice(0,2) : [];
            const rest       = newsFilter==='All' ? filtered.slice(2)   : filtered;
            const pageItems  = rest.slice(0, newsPage * PAGE_SIZE);
            const hasMore    = pageItems.length < rest.length;

            const toggleBM = (link, e) => {
              e.preventDefault(); e.stopPropagation();
              setBookmarks(prev => {
                const next = prev.includes(link) ? prev.filter(x=>x!==link) : [...prev, link];
                try { sessionStorage.setItem('nr_bm', JSON.stringify(next)); } catch{}
                return next;
              });
            };

            const NewsCard = ({item, top=false}) => {
              const ta = timeAgo(item.pubDate);
              const bm = bookmarks.includes(item.link);
              const cc = catColors[item.cat]||'var(--accent)';
              return (
                <a href={item.link} target="_blank" rel="noopener noreferrer"
                  className={`ip-nc ${top?'ip-nc-top':''}`}
                  style={top ? {borderLeftColor: cc} : {}}>
                  {top && <span className="ip-nc-badge">TOP STORY</span>}
                  <div className="ip-nc-title">{item.title}</div>
                  <div className="ip-nc-foot">
                    <span className="ip-nc-cat" style={{color:cc}}>{item.cat}</span>
                    <span className="ip-nc-sep">·</span>
                    <span className="ip-nc-src">{item.source}</span>
                    {ta && <><span className="ip-nc-sep">·</span><span className="ip-nc-time">{ta}</span></>}
                    <button className={`ip-nc-bm ${bm?'ip-nc-bm-on':''}`}
                      onClick={e=>toggleBM(item.link,e)} title={bm?'Remove bookmark':'Bookmark'}>
                      {bm ? '★' : '☆'}
                    </button>
                  </div>
                </a>
              );
            };

            return (
              <div className="ip-news-body">
                {topStories.length > 0 && (
                  <div className="ip-news-heroes">
                    {topStories.map((item,i) => <NewsCard key={i} item={item} top />)}
                  </div>
                )}
                <div className="ip-news-feed">
                  {pageItems.map((item,i) => <NewsCard key={i} item={item} />)}
                </div>
                {hasMore && (
                  <div className="ip-news-more-wrap">
                    <button className="ip-news-more" onClick={()=>setNewsPage(p=>p+1)}>
                      Load more stories
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* MARKET INSIGHTS TAB — existing content */}
      {subTab==='insights' && (<>

      {/* SENTIMENT-STYLE TICKER (Global + India rows) */}
      <Ticker data={data} nseData={nseData} />

      {/* ROW 1: TIME/INDICES (50% left) + COMMODITIES (50% right) */}
      <div className="ip-toprow">
        {/* LEFT 50%: time + indices */}
        <div className="ip-toprow-right">
          <div className="ip-ticker-meta">
            <div className="ip-ticker-slot">{slot.toUpperCase()}</div>
            <div className="ip-ticker-date">{dateStr} · {timeStr}</div>
          </div>
          <div className="ip-ticker-indices">
            <TickerItem label="NIFTY 50"   d={nifty} />
            <TickerItem label="BANK NIFTY" d={banknifty} />
            <TickerItem label="GIFT NIFTY" d={giftnifty} />
            <TickerItem label="S&P 500"    d={data.sp500}  borderColor="#4A9EFF" />
            <TickerItem label="NASDAQ"     d={data.nasdaq} borderColor="#A78BFA" />
          </div>
          {nseData.vix&&(
            <div className="ip-ticker-vix">
              <div className="ip-ticker-vix-label">INDIA VIX</div>
              <div className="ip-ticker-vix-val" style={{color:nseData.vix>18?'var(--loss)':nseData.vix<13?'var(--gain)':'var(--text)'}}>{nseData.vix.toFixed(1)}</div>
            </div>
          )}
        </div>
        {/* RIGHT 50%: Commodities grid */}
        <div className="ip-toprow-left">
          <div className="ip-toprow-label">COMMODITIES</div>
          <div className="ip-commstrip-v">
            <CommStrip label="GOLD"      d={data.gold}      dec={1} />
            <CommStrip label="SILVER"    d={data.silver}    dec={2} />
            <CommStrip label="CRUDE WTI" d={data.crude}     dec={1} />
            <CommStrip label="BRENT"     d={data.brent}     dec={1} />
            <CommStrip label="NAT GAS"   d={data.natgas}    dec={3} />
            <CommStrip label="COPPER"    d={data.copper}    dec={3} />
            <CommStrip label="ALUMINIUM" d={data.aluminium} dec={0} />
          </div>
        </div>
      </div>

      {/* ROW 2: SIGNALS (50%) + RIGHT PANEL (50%) */}
      <div className="ip-row-half ip-section">

        {/* LEFT: all analytical blocks */}
        <div className="ip-half-left">

          {/* Market Signals */}
          <div className="ip-block-label">MARKET SIGNALS</div>
          <div className="ip-signals-list">
            {signals.map((s,i)=><SignalCard key={i} {...s}/>)}
          </div>

          {/* Day Profile */}
          {dayType&&(
            <div className="ip-ana-block">
              <div className="ip-ana-title">DAY PROFILE</div>
              <div className="ip-day-type-row">
                <span className="ip-day-type-badge" style={{background:dayType.color+'18',color:dayType.color,border:`1px solid ${dayType.color}40`}}>{dayType.label}</span>
                <span className="ip-day-type-sub">{dayType.subLabel}</span>
              </div>
              <div className="ip-day-type-detail">{dayType.detail}</div>
              {volCtx&&(
                <div className="ip-vol-row">
                  <span className="ip-vol-badge" style={{color:volCtx.rangeColor}}>Range: {volCtx.range} pts</span>
                  <span className="ip-vol-label" style={{color:volCtx.rangeColor}}>{volCtx.rangeLabel} ({volCtx.pctOfAvg}% of avg)</span>
                </div>
              )}
              {volCtx&&<div className="ip-vol-expect">{volCtx.expectation}{volCtx.vixContext?' '+volCtx.vixContext:''}</div>}
            </div>
          )}

          {/* Intraday Bias  -  only during market hours, only show completed phases */}
          {intraday&&(
            <div className="ip-ana-block">
              <div className="ip-ana-title" style={{display:'flex',alignItems:'center',gap:8}}>
                INTRADAY BIAS TRACKER
                <span style={{fontSize:9,color:'var(--accent)',fontWeight:700,letterSpacing:'0.5px'}}>{intraday.phase}</span>
              </div>
              <div className="ip-bias-grid">
                {[
                  {phase:'Opening',    ctrl:intraday.opening.ctrl,  color:intraday.opening.color,  time:'9:15–10:30', pending:intraday.opening.pending},
                  {phase:'Mid Session',ctrl:intraday.mid.ctrl,      color:intraday.mid.color,      time:'10:30–1:30', pending:intraday.mid.pending},
                  {phase:'Closing',    ctrl:intraday.closing.ctrl,  color:intraday.closing.color,  time:'1:30–3:30',  pending:intraday.closing.pending},
                ].map((ph,i)=>(
                  <div key={i} className="ip-bias-item" style={{
                    borderLeftColor: ph.pending ? 'var(--border)' : ph.color,
                    opacity: ph.pending ? 0.4 : 1,
                  }}>
                    <div className="ip-bias-phase">{ph.phase}</div>
                    <div className="ip-bias-time">{ph.time}</div>
                    <div className="ip-bias-ctrl" style={{color: ph.pending ? 'var(--text3)' : ph.color}}>
                      {ph.pending ? 'Not yet' : ph.ctrl}
                    </div>
                  </div>
                ))}
              </div>
              {intraday.closing.note&&!intraday.closing.pending&&<div className="ip-bias-note">{intraday.closing.note}</div>}
            </div>
          )}

          {/* What Changed Today  -  only after 4:30 PM IST when session is fully settled */}
          {changes.length>0 && getMins()>=990 &&(
            <div className="ip-ana-block">
              <div className="ip-ana-title">WHAT CHANGED TODAY</div>
              <div className="ip-changes-list">
                {changes.map((c,i)=>(
                  <div key={i} className="ip-change-row" style={{borderLeftColor:c.type==='bull'?'var(--gain)':c.type==='bear'?'var(--loss)':c.type==='warn'?'#F59E0B':'var(--border2)'}}>
                    <span className="ip-change-icon" style={{color:c.type==='bull'?'var(--gain)':c.type==='bear'?'var(--loss)':c.type==='warn'?'#F59E0B':'var(--text3)'}}>{c.type==='bull'?'▲':c.type==='bear'?'▼':'→'}</span>
                    <span className="ip-change-text">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trader Warnings */}
          {warnings.length>0&&(
            <div className="ip-ana-block ip-warnings-block">
              <div className="ip-ana-title" style={{color:'#F59E0B'}}>TRADER WARNINGS</div>
              <div className="ip-warnings-list">
                {warnings.map((w,i)=>(
                  <div key={i} className="ip-warning-row">
                    <span className="ip-warning-icon">!</span>
                    <span className="ip-warning-text">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI WRITE-UP lives here, directly below warnings, fills the left column */}
          <div className="ip-ana-block ip-writeup-block">
            <div className="ip-ana-title" style={{display:'flex',alignItems:'center',gap:8}}>
              AI WRITE-UP
              <span className="ip-writeup-badge">{briefLoading?'GENERATING':brief?.cached?'CACHED':'LIVE'}</span>
            </div>
            <div className="ip-writeup-content">
              {briefLoading?(
                <div className="ip-loading"><div className="ip-spinner"/><span>Generating write-up with live news and market data...</span></div>
              ):brief?.writeup?(
                brief.writeup.split('\n').filter(p=>p.trim()).map((para,i)=>(
                  <p key={i} className="ip-writeup-para">{para.trim()}</p>
                ))
              ):(
                <p className="ip-writeup-para" style={{color:'var(--text3)'}}>{brief?._error?`AI error: ${brief._error}`:'Write-up not available. Refresh to try again.'}</p>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT: Risk Meter + Stance + Key Levels + Trap Zones + Scenarios + Tomorrow */}
        <div className="ip-half-right">

          {/* Risk Meter */}
          <div className="ip-risk-meter" style={{background:riskMeter.bg,border:`1px solid ${riskMeter.color}40`}}>
            <div className="ip-risk-header">
              <div className="ip-risk-label">RISK ENVIRONMENT</div>
              <div className="ip-risk-level" style={{color:riskMeter.color}}>{riskMeter.level}</div>
            </div>
            <div className="ip-risk-bar-track">
              <div className="ip-risk-bar-fill" style={{width:`${(riskMeter.score/riskMeter.maxScore)*100}%`,background:riskMeter.color}}/>
            </div>
            <div className="ip-risk-factors">
              {riskMeter.factors.map((f,i)=><span key={i} className="ip-risk-factor" style={{color:riskMeter.color}}>{f}</span>)}
            </div>
          </div>

          {/* Stance */}
          {stance&&(
            <div className="ip-stance-box" style={{background:stance.bg,borderColor:stance.border}}>
              <div className="ip-stance-header">
                <div>
                  <div className="ip-stance-icon" style={{color:stance.color}}>{stance.icon}</div>
                  <div className="ip-stance-label" style={{color:stance.color}}>{stance.label}</div>
                  <div className="ip-stance-bias">{stance.bias}</div>
                </div>
                <div className="ip-stance-right">
                  <div className="ip-stance-conf-label">CONFIDENCE</div>
                  <div className="ip-stance-conf-val" style={{color:stance.color}}>{stance.confidence}</div>
                </div>
              </div>
              <ul className="ip-stance-reasons">
                {stance.reasons.map((r,i)=><li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Key Levels + Trap Zones */}
          <div className="ip-levels-box">
            <div className="ip-box-title">KEY LEVELS</div>
            {zones?zones.map((z,i)=>(
              <div key={i} className={`ip-zone ip-zone-${z.type}`}>
                <span className="ip-zone-label">{z.label}</span>
                <span className="ip-zone-level" style={{color:z.type==='support'?'var(--gain)':'var(--loss)'}}>{z.level.toLocaleString('en-IN')}</span>
                <span className="ip-zone-dist">{z.dist>0?'+':''}{z.dist}%</span>
              </div>
            )):<div className="ip-note">No price data.</div>}
            {trapZones.length>0&&(
              <>
                <div className="ip-box-title" style={{marginTop:12}}>TRAP ZONES</div>
                {trapZones.map((z,i)=>(
                  <div key={i} className="ip-trap-row" style={{borderLeftColor:z.type==='support'?'var(--gain)':'var(--loss)'}}>
                    <div className="ip-trap-level">{z.level.toLocaleString('en-IN')} <span className="ip-trap-badge">{z.label}</span></div>
                    <div className="ip-trap-note">{z.note}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Enhanced Scenarios */}
          {scenarios&&(
            <div className="ip-levels-box">
              <div className="ip-box-title">SCENARIO FRAMEWORK</div>
              {scenarios.map((s,i)=>(
                <div key={i} className={`ip-scen ip-scen-${s.type}`}>
                  <div className="ip-scen-if">IF {s.if}</div>
                  <div className="ip-scen-action">{s.action}</div>
                  <div className="ip-scen-next">{s.next}</div>
                  <div className="ip-scen-watch">Watch: {s.watch}</div>
                </div>
              ))}
            </div>
          )}

          {/* What to Watch  -  next trading session */}
          {tmrw.items.length>0&&(()=>{
            const nextDay = getNextTradingDay();
            const ist = getIST();
            const currentMins = ist.getHours()*60 + ist.getMinutes();
            const isPostClose = currentMins >= 930;
            const updatedAt = isPostClose
              ? `Updated ${ist.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} IST`
              : `Based on last session data`;
            return (
              <div className="ip-levels-box ip-tomorrow-box ip-tomorrow-full">
                <div className="ip-box-title" style={{display:'flex',flexDirection:'column',gap:3}}>
                  <span>WHAT TO WATCH  -  <span style={{color:'var(--accent)'}}>{nextDay.label}</span></span>
                  <span style={{fontSize:9,color:'var(--text3)',fontWeight:400,letterSpacing:0}}>
                    {updatedAt} · Valid for {nextDay.label} session only
                  </span>
                </div>
                {tmrw.items.map((item,i)=>(
                  <div key={i} className="ip-tomorrow-row">
                    <span className="ip-tomorrow-dot"/>
                    <span className="ip-tomorrow-text">{item}</span>
                  </div>
                ))}
              </div>
            );
          })()}

        </div>
      </div>

      {/* ROW 3: FII/DII FLOWS (full width) + ECONOMIC CALENDAR below */}
      <div className="ip-row-fiifull ip-section">
        {/* FII/DII FULL WIDTH */}
        <div className="ip-fiifull-top">
          <div className="ip-block-label">FII / DII FLOWS</div>
          {fiiNet!==null?(
            <div className="ip-fii-content">
              <div className="ip-flow-7d">
                {[{label:'FII 7D',val:fii7d},{label:'DII 7D',val:dii7d},{label:'COMBINED',val:fii7d+dii7d,sub:(fii7d+dii7d)>=0?'Net inflow':'Net outflow'}].map((c,i)=>(
                  <div key={i} className="ip-flow-7d-item">
                    <div className="ip-flow-7d-label">{c.label}</div>
                    <div className="ip-flow-7d-val" style={{color:pColor(c.val)}}>{c.val>=0?'+':'-'}₹{Math.abs(c.val).toLocaleString('en-IN')} Cr</div>
                    {c.sub&&<div className="ip-flow-7d-sub">{c.sub}</div>}
                  </div>
                ))}
              </div>
              <div className="ip-flow-today">
                <div className="ip-flow-side">
                  <div className="ip-flow-who">FII / FPI</div>
                  <div className="ip-flow-net" style={{color:pColor(fiiNet)}}>{fiiNet>=0?'+':''}₹{Math.abs(fiiNet).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-dir" style={{color:pColor(fiiNet)}}>{fiiNet>=0?'↑ Net Buyers':'↓ Net Sellers'}</div>
                  {fiiBuy!=null&&fiiSell!=null&&<div className="ip-flow-buysell"><span>Buy ₹{Math.round(fiiBuy).toLocaleString('en-IN')} Cr</span><span>Sell ₹{Math.round(fiiSell).toLocaleString('en-IN')} Cr</span></div>}
                  <div className="ip-flow-type">Foreign Institutional</div>
                </div>
                <div className="ip-flow-side">
                  <div className="ip-flow-who">DII</div>
                  <div className="ip-flow-net" style={{color:pColor(diiNet)}}>{(diiNet??0)>=0?'+':''}₹{Math.abs(diiNet??0).toLocaleString('en-IN')} Cr</div>
                  <div className="ip-flow-dir" style={{color:pColor(diiNet)}}>{(diiNet??0)>=0?'↑ Net Buyers':'↓ Net Sellers'}</div>
                  {diiBuy!=null&&diiSell!=null&&<div className="ip-flow-buysell"><span>Buy ₹{Math.round(diiBuy).toLocaleString('en-IN')} Cr</span><span>Sell ₹{Math.round(diiSell).toLocaleString('en-IN')} Cr</span></div>}
                  <div className="ip-flow-type">Domestic Institutional</div>
                </div>
              </div>
              <div className="ip-fii-legend">
                <span><span style={{display:'inline-block',width:9,height:9,background:'var(--gain)',borderRadius:2,marginRight:4}}/>FII</span>
                <span><span style={{display:'inline-block',width:9,height:9,background:'#4A9EFF',borderRadius:2,marginRight:4}}/>DII</span>
              </div>
              <FiiBar history={history}/>
              {fiiNet<0&&(diiNet??0)>0&&<div className="ip-note" style={{marginTop:8}}>FIIs selling, DIIs absorbing. Domestic support visible.</div>}
              {fiiNet>0&&(diiNet??0)>0&&<div className="ip-note" style={{marginTop:8}}>Both sides buying. Broad institutional conviction.</div>}
              {fiiNet<0&&(diiNet??0)<0&&<div className="ip-note" style={{marginTop:8}}>Both selling. No institutional support layer.</div>}
            </div>
          ):<div className="ip-note">Loading FII/DII data...</div>}
        </div>

        {/* ECONOMIC CALENDAR  -  2-column list */}
        <div className="ip-fiifull-cal">
          <div className="ip-block-label">ECONOMIC CALENDAR <span style={{opacity:.5,fontSize:9,fontWeight:400,letterSpacing:0}}>NEXT 7 DAYS</span></div>
          {events.length>0?(
            <div className="ip-econ-2col">
              {events.map((e,i)=>(
                <div key={i} className="ip-econ-row">
                  <div className="ip-econ-meta">
                    <span className="ip-econ-date">{fmtEvtDate(e.date)}</span>
                    <span className={`ip-econ-ctry ip-ctry-${e.country==='India'?'india':'global'}`}>{e.country}</span>
                  </div>
                  <div className="ip-econ-body">
                    <div className="ip-econ-event">{e.event}</div>
                    <div className="ip-econ-note">{e.note}</div>
                  </div>
                  <div className={`ip-econ-imp ip-imp-${e.impact}`}>{e.impact}</div>
                </div>
              ))}
            </div>
          ):<div className="ip-note">No major events in next 7 days.</div>}
        </div>
      </div>

      <div className="ip-footer-bold">
        Data-driven signals from live market data. Not investment advice.
      </div>
      </>)}
    </div>
  );
}
