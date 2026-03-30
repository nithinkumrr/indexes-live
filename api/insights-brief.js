// api/insights-brief.js
// AI-powered session brief: structured bullets + prose writeup.
// Cached per slot in KV. Falls back to rule engine if AI call fails.

import { kv } from '@vercel/kv';

// NSE holidays 2026 — for slot and next-trading-day logic
const NSE_HOL = new Set(['2026-01-15','2026-01-26','2026-03-03','2026-03-26','2026-03-31',
  '2026-04-03','2026-04-14','2026-05-01','2026-05-28','2026-06-26','2026-09-14',
  '2026-10-02','2026-10-20','2026-11-10','2026-11-24','2026-12-25']);

const NSE_HOL_NAMES = {
  '2026-01-15':'Municipal Corporation Elections','2026-01-26':'Republic Day',
  '2026-03-03':'Holi','2026-03-26':'Shri Ram Navami','2026-03-31':'Shri Mahavir Jayanti',
  '2026-04-03':'Good Friday','2026-04-14':'Dr. Baba Saheb Ambedkar Jayanti',
  '2026-05-01':'Maharashtra Day','2026-05-28':'Bakri Eid','2026-06-26':'Moharram',
  '2026-09-14':'Ganesh Chaturthi','2026-10-02':'Mahatma Gandhi Jayanti',
  '2026-10-20':'Dussehra','2026-11-10':'Diwali-Balipratipada',
  '2026-11-24':'Prakash Gurpurb Sri Guru Nanak Dev','2026-12-25':'Christmas',
};

function isTradingDay(isoStr) {
  const d = new Date(isoStr + 'T00:00:00Z');
  const dow = new Date(d.toLocaleString('en-US',{timeZone:'Asia/Kolkata'})).getDay();
  return dow !== 0 && dow !== 6 && !NSE_HOL.has(isoStr);
}

function nextTradingDay(fromIso) {
  const base = new Date(fromIso + 'T00:00:00Z');
  for (let i = 1; i <= 14; i++) {
    const next = new Date(base.getTime() + i * 86400000);
    const iso = next.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (isTradingDay(iso)) return iso;
  }
  return null;
}

function formatDateLabel(iso) {
  if (!iso) return 'next session';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getSlotInfo() {
  const now  = new Date();
  const ist  = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const pad  = n => String(n).padStart(2, '0');
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // 8 precise slots — matches what user described
  const slots = [
    { name: 'premarket',  label: 'Pre-Market',          window: 'Before 9:15 AM',
      context: 'NSE has not opened. GIFT Nifty is the only live indicator — reference it for the implied opening gap. Cover: GIFT Nifty level and what gap it implies for Nifty open, overnight US markets (S&P 500, Nasdaq), Asian markets open (Nikkei, Hang Seng, SGX Nifty), crude oil, gold, USD/INR. Do NOT mention Nifty cash market price changes as the market is not yet open. No pre-market session exists for NSE equities.',
      minStart: 0,   minEnd: 554,  ttl: 3600 },

    { name: 'open15',     label: '9:15 AM — First 15 Minutes', window: '9:15 AM to 9:30 AM',
      context: 'NSE just opened. Report exactly what happened in the first 15 minutes: the opening level, whether the gap vs previous close was up or down, how much, whether the opening move is holding or reversing, and early volume character. This is too early to call the day direction — just describe what has actually happened.',
      minStart: 555, minEnd: 569,  ttl: 900 },

    { name: 'opening',    label: '9:30 AM — Opening Hour Update', window: '9:30 AM to 10:30 AM',
      context: 'First 15-75 minutes of trade completed. Describe what Nifty and Bank Nifty have done since open: the range formed, whether the opening gap held or filled, which direction the early trend is, what sectors are leading or lagging, and any news driving the move. Be specific with levels.',
      minStart: 570, minEnd: 629,  ttl: 3600 },

    { name: 'midmorn',    label: '10:30 AM Update', window: '10:30 AM to 12:00 PM',
      context: 'First 75 minutes of trade is complete. The opening trend is now established. Describe what Nifty has done in the first hour and 15 minutes: is the opening trend continuing or reversing, what is the session high and low so far, which levels are being tested, and what is the volume character. Be specific.',
      minStart: 630, minEnd: 719,  ttl: 3600 },

    { name: 'midday',     label: '12:00 PM Update', window: '12:00 PM to 1:00 PM',
      context: 'Noon update. Describe the full morning session: what Nifty and Bank Nifty have done from open to now, the high and low of the session so far, the dominant trend, and what is happening in the current hour. Mid-day often sees reduced volume — note if trading is quiet or if there is continued momentum.',
      minStart: 720, minEnd: 779,  ttl: 3600 },

    { name: 'afternoon',  label: '1:00 PM Update', window: '1:00 PM to 2:00 PM',
      context: 'Post-lunch session underway. Describe what has happened since noon: whether the morning trend has continued or reversed, key levels that have been tested, and the current price action character. Note any F&O expiry dynamics if it is an expiry day.',
      minStart: 780, minEnd: 839,  ttl: 3600 },

    { name: 'latesess',   label: '2:00 PM Update', window: '2:00 PM to 3:00 PM',
      context: 'Final 90 minutes of trade. Describe the current state of Nifty and Bank Nifty: where they are relative to the day high and low, whether the trend from earlier is holding, and what the last hour of trade has looked like. Describe what participants are watching into the close.',
      minStart: 840, minEnd: 899,  ttl: 3600 },

    { name: 'closing',    label: '3:00 PM — Into Close', window: '3:00 PM to 3:30 PM',
      context: 'Final 30 minutes. NSE closes at exactly 3:30 PM — there is NO post-market trading session in India. Describe where Nifty is heading into close, whether there is buying or selling pressure in the last 30 minutes, and what the closing level is likely to be based on current price action.',
      minStart: 900, minEnd: 929,  ttl: 1800 },

    { name: 'close',      label: '3:30 PM — End of Day Summary', window: '3:30 PM to 5:00 PM',
      context: 'Market is closed. NSE closes at 3:30 PM sharp and there is NO post-market session. Write a comprehensive day summary covering: (1) how Nifty opened and the opening gap vs previous close, (2) the key turning points through the session, (3) the closing level and where it closed within the day range, (4) Bank Nifty performance vs Nifty, (5) what drove the move today. Do NOT say post-market session — it does not exist.',
      minStart: 930, minEnd: 1019, ttl: 5400 },

    { name: 'evening',    label: 'Evening Wrap', window: 'After 5:00 PM',
      context: 'Evening report after FII/DII data is published (NSE publishes at ~5 PM). Write a full end-of-day wrap: how Nifty played out through the entire session from open to close, the key levels hit, what drove the move, FII/DII final flows, and key items to watch for the next trading session.',
      minStart: 1020, minEnd: 9999, ttl: 43200 },
  ];

  // Holiday — serve previous trading day evening brief
  if (NSE_HOL.has(dateStr)) {
    const prevTrading = nextTradingDay(dateStr) ? null : dateStr; // find prev
    let prevIso = dateStr;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(new Date(dateStr+'T00:00:00Z').getTime() - i*86400000);
      const iso = d.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
      if (isTradingDay(iso)) { prevIso = iso; break; }
    }
    const holName = NSE_HOL_NAMES[dateStr] || 'Market Holiday';
    return { name:'evening', label:`${holName} — Market Closed`, window:'Holiday', context:`Today is ${holName} — NSE is closed. Serve the previous session summary from ${formatDateLabel(prevIso)} and what to watch when markets reopen.`, key:`${prevIso}-evening`, ttl:86400, isHoliday:true };
  }

  // Weekend
  if (day === 0 || day === 6) {
    let prevIso = dateStr;
    for (let i = 1; i <= 5; i++) {
      const d = new Date(new Date(dateStr+'T00:00:00Z').getTime() - i*86400000);
      const iso = d.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
      if (isTradingDay(iso)) { prevIso = iso; break; }
    }
    return { name:'evening', label:'Weekend Wrap', window:'Weekend', context:'Markets are closed for the weekend. Write a full week summary: key market drivers, Nifty and Bank Nifty weekly performance, FII/DII weekly flow trend, sector moves, and global setup for the coming week.', key:`${prevIso}-evening`, ttl:172800, isWeekend:true };
  }

  const slot = slots.find(s => mins >= s.minStart && mins <= s.minEnd) || slots[slots.length-1];
  // nextTradingDay for context
  const nextDay = nextTradingDay(dateStr);
  return { ...slot, key:`${dateStr}-${slot.name}`, nextTradingDay:nextDay, nextTradingLabel:formatDateLabel(nextDay), currentDate:dateStr };
}

// ── Rule-based fallback ──────────────────────────────────────────────────────
function buildFallback(d, slot) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel, sessionChar, niftyPrice, bnPrice, crudePct, goldPct } = d;
  const np = niftyPct ?? 0;
  const tone    = np < -1 ? 'Broad weakness across indices' : np < 0 ? 'Mild selling pressure' : np > 1 ? 'Broad strength across indices' : 'Flat to mixed session';
  const ctrl    = np < -0.5 ? 'Sellers active on rallies' : np > 0.5 ? 'Buyers stepping in on dips' : 'Neither side in clear control';
  const beh     = np < -1 ? 'Expect continuation or choppy downside' : np < 0 ? 'Watch for attempted bounces' : np > 1 ? 'Expect continuation or pullback to buy' : 'Range-bound action likely';
  const risk    = vix > 18 ? 'High volatility. Reduce position size' : vix > 14 ? 'Moderate volatility. Standard sizing' : 'Low volatility. Watch for breakout';
  const ctx     = np < -0.5 ? 'Market under selling pressure' : np > 0.5 ? 'Market holding positive bias' : 'Market in consolidation';
  const struc   = structure === 'Downtrend' ? 'Weakening. Lower highs forming' : structure === 'Uptrend' ? 'Constructive. Higher lows holding' : 'Range bound. No clear trend';
  const watch   = np < 0 ? 'Whether support zones hold into the close' : 'Whether resistance zones are cleared on volume';
  const prisk   = np < -1 ? 'Sustained breakdown can extend correction' : np > 1 ? 'Overextension risk if buying is not broad-based' : 'Wait for structure clarity before building positions';

  const pStr  = niftyPrice ? niftyPrice.toLocaleString('en-IN') : 'current levels';
  const bnStr = bnPrice ? bnPrice.toLocaleString('en-IN') : '';
  const dirWord  = np > 0.5 ? 'positive' : np < -0.5 ? 'negative' : 'mixed';
  const presWord = np > 0 ? 'buying interest' : 'selling pressure';
  const structWord = structure === 'Downtrend' ? 'lower highs and lower lows, indicating a weakening structure' : structure === 'Uptrend' ? 'higher highs and higher lows, indicating a constructive structure' : 'a sideways range without a clear directional sequence';

  const commodLine = crudePct !== null && crudePct !== undefined
    ? crudePct < -1 ? ' Crude oil is declining sharply, providing some relief on the inflation front.'
    : crudePct > 1 ? ' Crude oil is rising, which adds to cost pressures across the economy.'
    : ' Crude oil is relatively stable in this session.' : '';

  const goldLine = goldPct !== null && goldPct !== undefined
    ? goldPct > 0.5 ? ' Gold is moving higher, signalling a risk-off tone in global markets.'
    : goldPct < -0.5 ? ' Gold is easing, suggesting improving risk appetite globally.' : '' : '';

  const writeup = `Nifty is trading at ${pStr}${bnStr ? ', with Bank Nifty at ' + bnStr : ''}, reflecting a ${dirWord} bias in the ${slot.label.toLowerCase()} session. The overall tone is ${tone.toLowerCase()}, with ${volLabel.toLowerCase()} volatility conditions.${commodLine}${goldLine}

Price structure shows ${structWord}. ${sessionChar ? sessionChar + ', reflecting the character of participation during this session.' : 'The session has not yet produced a clear close relative to its range.'} ${np < 0 && vix > 16 ? 'Elevated VIX at ' + vix.toFixed(1) + ' indicates market uncertainty is elevated.' : vix ? 'India VIX at ' + vix.toFixed(1) + ' reflects ' + (vix < 14 ? 'calm conditions.' : 'normal market activity.') : ''}

${presWord.charAt(0).toUpperCase() + presWord.slice(1)} is the dominant theme. Participants are watching whether key levels hold or give way as the session progresses. Global markets are providing the broader backdrop, and any sharp moves in US futures or Asian indices could amplify domestic moves.`;

  return { trader: { tone, control: ctrl, behavior: beh, risk }, investor: { context: ctx, structure: struc, watch, risk: prisk }, writeup, fallback: true };
}

// ── AI call ──────────────────────────────────────────────────────────────────
async function callGemini(apiKey, slot, d) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel, sessionChar,
          fiiNet, diiNet, sp500Pct, nikkeiPct, hangsengPct, niftyPrice, bnPrice,
          crudePct, goldPct } = d;

  const prompt = `You are a market context engine for an Indian financial markets dashboard. You describe what is happening in the market. You do not give advice or recommendations.

Session: ${slot.label} (${slot.window})
Context for this session: ${slot.context}
Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}

Market data:
- Nifty 50: ${niftyPrice ? niftyPrice.toLocaleString('en-IN') : 'unavailable'} (${niftyPct >= 0 ? '+' : ''}${niftyPct?.toFixed(2) ?? '0'}%)
- Bank Nifty: ${bnPrice ? bnPrice.toLocaleString('en-IN') : 'unavailable'} (${bnPct >= 0 ? '+' : ''}${bnPct?.toFixed(2) ?? '0'}%)
- India VIX: ${vix ?? 'unavailable'}
- Market stance: ${stance}
- Structure: ${structure}
- Volatility: ${volLabel}
- Session character: ${sessionChar ?? 'unknown'}
- FII net today: ${fiiNet !== null && fiiNet !== undefined ? (fiiNet >= 0 ? '+' : '') + fiiNet.toLocaleString('en-IN') + ' Cr' : 'unavailable'}
- DII net today: ${diiNet !== null && diiNet !== undefined ? (diiNet >= 0 ? '+' : '') + diiNet.toLocaleString('en-IN') + ' Cr' : 'unavailable'}
- S&P 500: ${sp500Pct !== null && sp500Pct !== undefined ? (sp500Pct >= 0 ? '+' : '') + sp500Pct.toFixed(2) + '%' : 'unavailable'}
- Nikkei: ${nikkeiPct !== null && nikkeiPct !== undefined ? (nikkeiPct >= 0 ? '+' : '') + nikkeiPct.toFixed(2) + '%' : 'unavailable'}
- Hang Seng: ${hangsengPct !== null && hangsengPct !== undefined ? (hangsengPct >= 0 ? '+' : '') + hangsengPct.toFixed(2) + '%' : 'unavailable'}
- Crude WTI: ${crudePct !== null && crudePct !== undefined ? (crudePct >= 0 ? '+' : '') + crudePct.toFixed(2) + '%' : 'unavailable'}
- Gold: ${goldPct !== null && goldPct !== undefined ? (goldPct >= 0 ? '+' : '') + goldPct.toFixed(2) + '%' : 'unavailable'}

Use Google Search to find what is actually driving Indian markets today. Search for and include:
- Any news that is moving Nifty and Bank Nifty today specifically
- Nifty options open interest: max pain level, PCR (put-call ratio), and any significant OI buildup at key strikes
- Quarterly results from Nifty 50 companies announced this week, with actual numbers
- RBI news, global macro, geopolitical developments, or sector-specific news
- What happened in the last session (previous day close levels and any significant developments overnight)

Respond in EXACTLY this format. Nothing before or after. No em dashes anywhere. No advice:

TRADER_TONE: [1 sentence]
TRADER_CONTROL: [1 sentence]
TRADER_BEHAVIOR: [1 sentence]
TRADER_RISK: [1 sentence]
INVESTOR_CONTEXT: [1 sentence]
INVESTOR_STRUCTURE: [1 sentence]
INVESTOR_WATCH: [1 sentence]
INVESTOR_RISK: [1 sentence]
WRITEUP_START
[3 to 4 paragraphs, 220 to 260 words total. Educational and factual market context for the ${slot.label} session. Use actual news and data from your search. Plain English. Third person. Specific numbers. Structure the writeup to cover: (1) what the indices are doing with specific levels and what drove yesterday's session close, (2) what is driving the move today based on actual news including any Nifty 50 quarterly results and their numbers, (3) open interest picture: mention Nifty PCR, max pain level, and any significant OI buildup or writing at key strikes if data is available, (4) what participants are watching in this session and key commodity signals (crude, gold). Do not tell the reader what to do. Do not use the words buy, sell, invest, enter, exit, recommend, should, must, or consider. No predictions. Every statement must be descriptive of what is happening, not prescriptive of what to do. Reads like a market desk factsheet, not a tip sheet. No em dashes anywhere.]
WRITEUP_END`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  // Gemini with search grounding can return multiple parts — concatenate all text parts
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');

  if (!text) throw new Error('empty_response');

  const get = key => {
    const match = text.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim().replace(/^["']|["']$/g, '').replace(/—/g, ' ') : null;
  };

  const writeupMatch = text.match(/WRITEUP_START\s*([\s\S]*?)\s*WRITEUP_END/);
  const writeup = writeupMatch ? writeupMatch[1].trim().replace(/—/g, ' ') : null;

  const trader   = { tone: get('TRADER_TONE'), control: get('TRADER_CONTROL'), behavior: get('TRADER_BEHAVIOR'), risk: get('TRADER_RISK') };
  const investor = { context: get('INVESTOR_CONTEXT'), structure: get('INVESTOR_STRUCTURE'), watch: get('INVESTOR_WATCH'), risk: get('INVESTOR_RISK') };

  if (!trader.tone && !investor.context && !writeup) throw new Error('parse_failed');
  return { trader, investor, writeup, fallback: false };
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const slot = getSlotInfo();

  try {
    const cached = await kv.get(`insights_v6_${slot.key}`);
    if (cached) return res.json({ ...cached, cached: true, slot });
  } catch (_) {}

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (_) {}

  const apiKey = process.env.GEMINI_API_KEY;
  let result;

  if (apiKey) {
    try { result = await callGemini(apiKey, slot, body); }
    catch (err) {
      console.error('AI brief failed:', err.message);
      result = buildFallback(body, slot);
      result._error = err.message; // surfaced in response for debugging
    }
  } else {
    result = buildFallback(body, slot);
  }

  result.generatedAt = new Date().toISOString();
  try { await kv.set(`insights_v6_${slot.key}`, result, { ex: slot.ttl }); } catch (_) {}
  return res.json({ ...result, cached: false, slot });
}
