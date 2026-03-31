// api/insights-brief.js
// AI-powered session brief: structured bullets + prose writeup.
// Cached per slot in KV. Falls back to rule engine if AI call fails.

import { kv } from '@vercel/kv';

// NSE holidays 2026  -  for slot and next-trading-day logic
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

  // 8 precise slots  -  matches what user described
  const slots = [
    { name: 'premarket',  label: 'Pre-Market',          window: 'Before 9:15 AM',
      context: 'NSE has not opened. GIFT Nifty is the only live indicator  -  reference it for the implied opening gap. Cover: GIFT Nifty level and what gap it implies for Nifty open, overnight US markets (S&P 500, Nasdaq), Asian markets open (Nikkei, Hang Seng, SGX Nifty), crude oil, gold, USD/INR. Do NOT mention Nifty cash market price changes as the market is not yet open. No pre-market session exists for NSE equities.',
      minStart: 0,   minEnd: 554,  ttl: 3600 },

    { name: 'open15',     label: '9:15 AM  -  First 15 Minutes', window: '9:15 AM to 9:30 AM',
      context: 'NSE just opened. Report exactly what happened in the first 15 minutes: the opening level, whether the gap vs previous close was up or down, how much, whether the opening move is holding or reversing, and early volume character. This is too early to call the day direction  -  just describe what has actually happened.',
      minStart: 555, minEnd: 569,  ttl: 900 },

    { name: 'opening',    label: '9:30 AM  -  Opening Hour Update', window: '9:30 AM to 10:30 AM',
      context: 'First 15-75 minutes of trade completed. Describe what Nifty and Bank Nifty have done since open: the range formed, whether the opening gap held or filled, which direction the early trend is, what sectors are leading or lagging, and any news driving the move. Be specific with levels.',
      minStart: 570, minEnd: 629,  ttl: 3600 },

    { name: 'midmorn',    label: '10:30 AM Update', window: '10:30 AM to 12:00 PM',
      context: 'First 75 minutes of trade is complete. The opening trend is now established. Describe what Nifty has done in the first hour and 15 minutes: is the opening trend continuing or reversing, what is the session high and low so far, which levels are being tested, and what is the volume character. Be specific.',
      minStart: 630, minEnd: 719,  ttl: 3600 },

    { name: 'midday',     label: '12:00 PM Update', window: '12:00 PM to 1:00 PM',
      context: 'Noon update. Describe the full morning session: what Nifty and Bank Nifty have done from open to now, the high and low of the session so far, the dominant trend, and what is happening in the current hour. Mid-day often sees reduced volume  -  note if trading is quiet or if there is continued momentum.',
      minStart: 720, minEnd: 779,  ttl: 3600 },

    { name: 'afternoon',  label: '1:00 PM Update', window: '1:00 PM to 2:00 PM',
      context: 'Post-lunch session underway. Describe what has happened since noon: whether the morning trend has continued or reversed, key levels that have been tested, and the current price action character. Note any F&O expiry dynamics if it is an expiry day.',
      minStart: 780, minEnd: 839,  ttl: 3600 },

    { name: 'latesess',   label: '2:00 PM Update', window: '2:00 PM to 3:00 PM',
      context: 'Final 90 minutes of trade. Describe the current state of Nifty and Bank Nifty: where they are relative to the day high and low, whether the trend from earlier is holding, and what the last hour of trade has looked like. Describe what participants are watching into the close.',
      minStart: 840, minEnd: 899,  ttl: 3600 },

    { name: 'closing',    label: '3:00 PM  -  Into Close', window: '3:00 PM to 3:30 PM',
      context: 'Final 30 minutes. NSE closes at exactly 3:30 PM  -  there is NO post-market trading session in India. Describe where Nifty is heading into close, whether there is buying or selling pressure in the last 30 minutes, and what the closing level is likely to be based on current price action.',
      minStart: 900, minEnd: 929,  ttl: 1800 },

    { name: 'close',      label: '3:30 PM  -  End of Day Summary', window: '3:30 PM to 5:00 PM',
      context: 'Market is closed. NSE closes at 3:30 PM sharp and there is NO post-market session. Write a comprehensive day summary covering: (1) how Nifty opened and the opening gap vs previous close, (2) the key turning points through the session, (3) the closing level and where it closed within the day range, (4) Bank Nifty performance vs Nifty, (5) what drove the move today. Do NOT say post-market session  -  it does not exist.',
      minStart: 930, minEnd: 1019, ttl: 5400 },

    { name: 'evening',    label: 'Evening Wrap', window: 'After 5:00 PM',
      context: 'Evening report after FII/DII data is published (NSE publishes at ~5 PM). Write a full end-of-day wrap: how Nifty played out through the entire session from open to close, the key levels hit, what drove the move, FII/DII final flows, and key items to watch for the next trading session.',
      minStart: 1020, minEnd: 9999, ttl: 43200 },
  ];

  // Holiday  -  serve previous trading day evening brief
  if (NSE_HOL.has(dateStr)) {
    const prevTrading = nextTradingDay(dateStr) ? null : dateStr; // find prev
    let prevIso = dateStr;
    for (let i = 1; i <= 7; i++) {
      const d = new Date(new Date(dateStr+'T00:00:00Z').getTime() - i*86400000);
      const iso = d.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
      if (isTradingDay(iso)) { prevIso = iso; break; }
    }
    const holName = NSE_HOL_NAMES[dateStr] || 'Market Holiday';
    return { name:'evening', label:`${holName}  -  Market Closed`, window:'Holiday', context:`Today is ${holName}  -  NSE is closed. Serve the previous session summary from ${formatDateLabel(prevIso)} and what to watch when markets reopen.`, key:`${prevIso}-evening`, ttl:86400, isHoliday:true };
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
  const { niftyPct, bnPct, vix, structure, niftyPrice, bnPrice, crudePct, goldPct } = d;
  const np = niftyPct ?? 0;
  const bp = bnPct ?? null;

  const tone  = np < -1.5 ? 'Broad selling across indices' : np < -0.5 ? 'Selling pressure visible' : np > 1.5 ? 'Broad buying across indices' : np > 0.5 ? 'Positive bias' : 'Flat session';
  const ctrl  = np < -0.5 ? 'Sellers in control' : np > 0.5 ? 'Buyers in control' : 'Neither side dominant';
  const beh   = np < -1 ? 'Downside momentum sustained' : np < 0 ? 'Brief bounces possible but trend negative' : np > 1 ? 'Upside momentum sustained' : 'Range-bound';
  const risk  = vix > 18 ? 'VIX elevated  -  volatility high' : vix > 14 ? 'Moderate volatility' : 'Low volatility';
  const ctx   = np < -0.5 ? 'Market under selling pressure' : np > 0.5 ? 'Market with positive bias' : 'Market in consolidation';
  const struc = structure === 'Downtrend' ? 'Weakening  -  lower highs forming' : structure === 'Uptrend' ? 'Constructive  -  higher lows holding' : 'Range bound';
  const watch = np < 0 ? 'Whether support zones hold' : 'Whether resistance zones are cleared on volume';
  const prisk = np < -1 ? 'Sustained breakdown can extend correction' : np > 1 ? 'Overextension risk if rally not broad-based' : 'Wait for directional clarity';

  const pStr  = niftyPrice ? niftyPrice.toLocaleString('en-IN') : ' - ';
  const bnStr = bnPrice    ? bnPrice.toLocaleString('en-IN')    : '';
  const npStr = np >= 0 ? `+${np.toFixed(2)}%` : `${np.toFixed(2)}%`;
  const bpStr = bp != null ? (bp >= 0 ? `+${bp.toFixed(2)}%` : `${bp.toFixed(2)}%`) : null;

  const commodLine = crudePct != null
    ? crudePct < -1 ? ' Crude oil fell sharply.' : crudePct > 1 ? ' Crude oil rising.' : '' : '';
  const goldLine = goldPct != null
    ? goldPct > 0.5 ? ' Gold moving higher  -  risk-off tone globally.' : goldPct < -0.5 ? ' Gold easing.' : '' : '';

  const isPreMarket = slot.name === 'premarket';
  const isEOD = ['close','evening'].includes(slot.name);

  let writeup;
  const vixLine = vix ? `India VIX is at ${vix.toFixed(1)}, ${vix > 18 ? 'an elevated reading reflecting heightened uncertainty and wider options premiums' : vix > 14 ? 'a moderately elevated reading reflecting normal market uncertainty' : 'a subdued reading indicating calm conditions in the derivatives market'}.` : '';
  const strucLine = structure === 'Downtrend' ? 'Short-term price structure shows lower highs forming, consistent with a distribution pattern.' : structure === 'Uptrend' ? 'Short-term price structure shows higher lows holding, consistent with systematic accumulation.' : 'Price structure remains range-bound without a clear directional sequence.';

  if (isPreMarket) {
    writeup = `NSE has not yet opened for the day. GIFT Nifty futures are the only live indicator before 9:15 AM IST, showing where Nifty may gap at the open. The premium or discount of GIFT Nifty to the previous Nifty cash close gives the implied opening direction.${commodLine}${goldLine}

Global markets provide the overnight context. US equity performance, Asian indices including Nikkei and Hang Seng, crude oil direction, gold, and the USD/INR rate are the primary inputs that typically shape the Nifty opening gap and early session momentum.

FII and DII flow data from the previous session remains the latest available institutional activity. Any pre-market block deals or bulk deals reported on the NSE website will indicate early large-participant positioning before the 9:15 AM open.`;
  } else if (isEOD) {
    const dir = np < -1.5 ? 'a sharp decline' : np < -0.5 ? 'a weak session' : np > 1.5 ? 'a strong rally' : np > 0.5 ? 'a positive session' : 'a flat session';
    const theme = np < -0.5 ? 'Selling was the dominant theme through the session, with broad-based weakness visible across most sectors.' : np > 0.5 ? 'Buying was the dominant theme through the session, with broad-based strength across most sectors.' : 'The session saw two-sided activity with neither buyers nor sellers establishing clear dominance.';
    writeup = `Nifty closed at ${pStr} (${npStr})${bnStr ? `, with Bank Nifty at ${bnStr}${bpStr ? ' (' + bpStr + ')' : ''}` : ''}, marking ${dir} for Monday's session. ${tone}.${commodLine}${goldLine}

${theme} ${vixLine}

${strucLine} The session close relative to the day's range provides a useful read on which side was in control into the final 30 minutes. A close near the session low indicates sellers held control through the close, while a close near the high shows buyers absorbed late selling.

FII and DII data will be published by NSE after 5:00 PM IST, providing the definitive institutional flow picture for the session. Global cues including US market direction, crude oil, gold, and USD/INR will shape the overnight setup for the next trading session.`;
  } else {
    const dir = np < -1.5 ? 'under sharp selling pressure' : np < -0.5 ? 'under selling pressure' : np > 1.5 ? 'in a strong rally' : np > 0.5 ? 'with a positive bias' : 'in a flat, range-bound session';
    const theme = np < -0.5 ? 'Selling pressure has been the dominant theme, with broad-based weakness across sectors.' : np > 0.5 ? 'Buying interest has been the dominant theme, with broad-based strength across sectors.' : 'Neither buyers nor sellers have established clear dominance, producing a two-sided session.';
    writeup = `Nifty is trading at ${pStr} (${npStr})${bnStr ? `, with Bank Nifty at ${bnStr}${bpStr ? ' (' + bpStr + ')' : ''}` : ''} in ${dir}. ${tone}.${commodLine}${goldLine}

${theme} ${vixLine}

${strucLine} The current session range relative to the previous close gives a read on opening gap behavior and whether the initial direction is holding or reversing as the session progresses.

FII and DII institutional flow data from the previous session remains the latest available. Commodity signals including crude oil and gold are providing additional context, with their direction influencing the energy, metals, and defensive sectors within the Nifty basket.`;
  }

  return { trader: { tone, control: ctrl, behavior: beh, risk }, investor: { context: ctx, structure: struc, watch, risk: prisk }, writeup, fallback: true };
}

// ── AI call ──────────────────────────────────────────────────────────────────
async function callGemini(apiKey, slot, d) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel,
          fiiNet, diiNet, fiiDate, sp500Pct, nikkeiPct, hangsengPct,
          niftyPrice, bnPrice, niftyHigh, niftyLow,
          crudePct, crudePrc, goldPct, goldPrc, usdInr } = d;

  const prompt = `You are a market context engine for an Indian financial markets dashboard.
Your role is to describe what is happening in the market based only on verified, observable data. You do not predict, infer, or give advice.

Session: ${slot.label} (${slot.window})
Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}

LIVE DATA:
- Nifty 50: ${niftyPrice ? niftyPrice.toLocaleString('en-IN') : 'unavailable'} (${niftyPct != null ? (niftyPct >= 0 ? '+' : '') + niftyPct.toFixed(2) + '%' : 'unavailable'})${niftyHigh && niftyLow ? ' | High: ' + niftyHigh.toLocaleString('en-IN') + ' | Low: ' + niftyLow.toLocaleString('en-IN') : ''}
- Bank Nifty: ${bnPrice ? bnPrice.toLocaleString('en-IN') : 'unavailable'} (${bnPct != null ? (bnPct >= 0 ? '+' : '') + bnPct.toFixed(2) + '%' : 'unavailable'})
- India VIX: ${vix != null ? vix.toFixed(2) : 'unavailable'}
- FII Net (${fiiDate || 'latest'}): ${fiiNet != null ? (fiiNet >= 0 ? '+' : '') + fiiNet.toLocaleString('en-IN') + ' Cr' : 'unavailable'}
- DII Net (${fiiDate || 'latest'}): ${diiNet != null ? (diiNet >= 0 ? '+' : '') + diiNet.toLocaleString('en-IN') + ' Cr' : 'unavailable'}
- S&P 500: ${sp500Pct != null ? (sp500Pct >= 0 ? '+' : '') + sp500Pct.toFixed(2) + '%' : 'unavailable'}
- Nikkei: ${nikkeiPct != null ? (nikkeiPct >= 0 ? '+' : '') + nikkeiPct.toFixed(2) + '%' : 'unavailable'}
- Hang Seng: ${hangsengPct != null ? (hangsengPct >= 0 ? '+' : '') + hangsengPct.toFixed(2) + '%' : 'unavailable'}
- Crude WTI: ${crudePrc != null ? '$' + crudePrc.toFixed(1) : 'unavailable'} (${crudePct != null ? (crudePct >= 0 ? '+' : '') + crudePct.toFixed(2) + '%' : 'unavailable'})
- Gold: ${goldPrc != null ? '$' + goldPrc.toFixed(0) : 'unavailable'} (${goldPct != null ? (goldPct >= 0 ? '+' : '') + goldPct.toFixed(2) + '%' : 'unavailable'})
- USD/INR: ${usdInr != null ? usdInr.toFixed(2) : 'unavailable'}

GLOBAL RULES (STRICT):
- Only describe what is visible or confirmed
- If a reason is not explicitly reported in news, do not state a cause
- Do not connect multiple events into a narrative unless confirmed
- Do not fill gaps with assumptions
- No advice, no forward-looking language
- No words: buy, sell, invest, enter, exit, recommend, should, must, consider, might, could
- No em dashes anywhere
- Every sentence must reflect observed reality
- Failsafe: if insufficient data, write "Market movement is currently not linked to any single confirmed trigger and reflects ongoing positioning."

SLOT BEHAVIOUR:
${['open15','opening'].includes(slot.name) ? 'MODE: Opening Snapshot. Focus: opening levels, gap vs previous close, early sector movement. Do NOT explain reasons unless confirmed in news. Do NOT mention derivatives unless strong data available. Length: 3 to 4 paragraphs, 300 to 500 words.' :
  slot.name === 'midmorn' ? 'MODE: Early Trend. Focus: first hour trend, sector leaders, initial flows. News only if directly reported. Length: 4 paragraphs, 400 to 600 words.' :
  ['midday','afternoon'].includes(slot.name) ? 'MODE: Midday Structure. Focus: index stability, sector rotation, options positioning. Introduce PCR, max pain, OI if available. Length: 4 to 5 paragraphs, 500 to 700 words.' :
  slot.name === 'latesess' ? 'MODE: Late Positioning. Focus: institutional flows, OI shifts, key strikes. Do NOT describe closing direction. Length: 4 to 5 paragraphs, 500 to 700 words.' :
  slot.name === 'closing' ? 'MODE: Closing Snapshot. Focus: closing levels, intraday range, sector contribution. Reasons only if confirmed. Length: 5 paragraphs, 600 to 800 words.' :
  ['close','evening'].includes(slot.name) ? 'MODE: End of Day Wrap. Full structure required: (1) Index summary with range and gap from open, (2) News drivers with specific numbers, (3) Options data PCR max pain OI at key strikes, (4) FII/DII exact amounts, (5) Sector performance with levels, (6) Global and commodities crude gold USD/INR, (7) VIX and structure. Length: 6 to 7 paragraphs, 900 to 1000 words.' :
  'MODE: Pre-Market. Focus: GIFT Nifty implied gap, global overnight cues, commodities. Do NOT mention Nifty cash price. Length: 3 to 4 paragraphs, 300 to 500 words.'}

MANDATORY ORDER (all slots):
1. Index movement (Nifty, Bank Nifty, range)
2. Sector behavior
3. Derivatives (only if data available)
4. Institutional flows
5. News (only if confirmed with numbers)
6. Global context (S&P 500, Asia, crude, gold, USD/INR)

SEARCH INSTRUCTIONS:
Search for all of these before writing:
- "Nifty market news today ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}"
- "Nifty PCR max pain OI NSE today"
- "India Nifty 50 company earnings results today"
- "RBI news India today"
Use only same-day verified information. If conflicting reasons, list them separately. If no confirmed reason: "No confirmed news-based trigger is observed for the move so far."

Output: Plain flowing prose paragraphs separated by blank lines. No headers, no labels, no bullets. No em dashes.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2500 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`AI API ${res.status}: ${errText.slice(0, 200)}`);
  }
  const json = await res.json();
  // Gemini with search grounding can return multiple parts  -  concatenate all text parts
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');

  if (!text) throw new Error('empty_response');

  const get = key => {
    const match = text.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim().replace(/^["']|["']$/g, '').replace(/ - /g, ' ') : null;
  };

  const writeupMatch = text.match(/WRITEUP_START\s*([\s\S]*?)\s*WRITEUP_END/);
  const writeup = writeupMatch ? writeupMatch[1].trim().replace(/ - /g, ' ') : null;

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
    const cached = await kv.get(`insights_v9_${slot.key}`);
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
  try { await kv.set(`insights_v9_${slot.key}`, result, { ex: slot.ttl }); } catch (_) {}
  return res.json({ ...result, cached: false, slot });
}
