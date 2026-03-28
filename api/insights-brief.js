// api/insights-brief.js
// Gemini-powered session brief: structured bullets + prose writeup.
// Cached per slot in KV. Falls back to rule engine if Gemini fails.

import { kv } from '@vercel/kv';

function getSlotInfo() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const pad  = n => String(n).padStart(2, '0');
  const dateStr = `${ist.getFullYear()}-${pad(ist.getMonth()+1)}-${pad(ist.getDate())}`;

  const slots = [
    { name: 'premarket', label: 'Pre-Market',       window: 'Before market open',   context: 'Markets have not opened yet. Cover overnight global cues, Gift Nifty level, and what to watch at open.',            minStart: 0,    minEnd: 554,  ttl: 3600  },
    { name: 'opening',   label: 'Opening Session',  window: '9:15 AM to 12:00 PM',  context: 'First hour of trade. Cover what has happened since open, direction, and early momentum.',                           minStart: 555,  minEnd: 749,  ttl: 5400  },
    { name: 'midday',    label: 'Mid-Day',           window: '12:00 PM to 2:30 PM',  context: 'Mid-session. Morning trend is established. Cover whether the trend is holding, reversing, or stalling.',           minStart: 750,  minEnd: 869,  ttl: 3600  },
    { name: 'afternoon', label: 'Afternoon Session', window: '2:30 PM to 3:30 PM',   context: 'Final stretch. Into the close. Institutional positioning and F&O expiry dynamics matter here.',                    minStart: 870,  minEnd: 929,  ttl: 2700  },
    { name: 'close',     label: 'Market Close',      window: '3:30 PM to 6:00 PM',   context: 'Session is done. Comprehensive day summary. Cover what drove the market and closing levels.',                      minStart: 930,  minEnd: 1079, ttl: 5400  },
    { name: 'eod',       label: 'Post-Market',       window: 'After 6:00 PM',         context: 'Post-market. Full day wrap. Cover FII/DII final data, what drove markets, and setup for tomorrow.',               minStart: 1080, minEnd: 9999, ttl: 43200 },
  ];

  if (day === 0 || day === 6) {
    return { name: 'weekend', label: 'Weekend', window: 'Market closed', context: 'Markets are closed. Cover the week that was and setup for the coming week.', key: `${dateStr}-weekend`, ttl: 86400 };
  }
  const slot = slots.find(s => mins >= s.minStart && mins <= s.minEnd) || slots[5];
  return { ...slot, key: `${dateStr}-${slot.name}` };
}

// ─── Rule-based fallback ─────────────────────────────────────────────────────
function buildFallback(d, slot) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel, sessionChar, niftyPrice, bnPrice } = d;
  const np = niftyPct ?? 0;
  const tone     = np < -1 ? 'Broad weakness across indices' : np < 0 ? 'Mild selling pressure' : np > 1 ? 'Broad strength across indices' : 'Flat to mixed session';
  const ctrl     = np < -0.5 ? 'Sellers active on rallies' : np > 0.5 ? 'Buyers stepping in on dips' : 'Neither side in clear control';
  const beh      = np < -1 ? 'Expect continuation or choppy downside' : np < 0 ? 'Watch for attempted bounces' : np > 1 ? 'Expect continuation or pullback to buy' : 'Range-bound action likely';
  const risk     = vix > 18 ? 'High volatility. Reduce position size' : vix > 14 ? 'Moderate volatility. Standard sizing' : 'Low volatility. Watch for breakout';
  const ctx      = np < -0.5 ? 'Market under selling pressure' : np > 0.5 ? 'Market holding positive bias' : 'Market in consolidation';
  const struc    = structure === 'Downtrend' ? 'Weakening. Lower highs forming' : structure === 'Uptrend' ? 'Constructive. Higher lows holding' : 'Range bound. No clear trend';
  const watch    = np < 0 ? 'Whether support zones hold on close' : 'Whether resistance zones are cleared';
  const prisk    = np < -1 ? 'Sustained breakdown can extend correction' : np > 1 ? 'Overextension risk if buying is not broad-based' : 'Wait for structure clarity before positioning';

  const pStr = niftyPrice ? niftyPrice.toLocaleString('en-IN') : 'current levels';
  const bnStr = bnPrice ? bnPrice.toLocaleString('en-IN') : '';
  const dirWord = np > 0.5 ? 'positive' : np < -0.5 ? 'negative' : 'mixed';
  const presWord = np > 0 ? 'buying interest' : 'selling pressure';
  const structWord = structure === 'Downtrend' ? 'lower highs and lower lows, indicating a weakening structure' : structure === 'Uptrend' ? 'higher highs and higher lows, indicating a constructive structure' : 'a sideways range without a clear directional sequence';

  const writeup = `Nifty is trading at ${pStr}${bnStr ? ', with Bank Nifty at ' + bnStr : ''}, reflecting a ${dirWord} bias in the ${slot.label.toLowerCase()} session. The overall tone is ${tone.toLowerCase()}, with ${volLabel.toLowerCase()} volatility conditions.

Price structure shows ${structWord}. ${sessionChar ? sessionChar + ', which reflects the character of participation seen during this session.' : 'The session has not yet produced a clear close relative to its range.'} ${np < 0 && vix > 16 ? 'Elevated VIX at ' + vix.toFixed(1) + ' indicates that uncertainty is present in the market.' : vix ? 'India VIX at ' + vix.toFixed(1) + ' reflects ' + (vix < 14 ? 'calm conditions.' : 'normal market activity.') : ''}

${presWord.charAt(0).toUpperCase() + presWord.slice(1)} is the dominant theme. Participants are watching whether key levels hold or give way as the session progresses. Global markets are providing the broader backdrop, and any sharp moves in US futures or Asian indices could amplify domestic moves.

This summary is generated from live price data using rule-based logic. For news-driven context, enable Gemini by setting the GEMINI_API_KEY environment variable in Vercel.`;

  return { trader: { tone, control: ctrl, behavior: beh, risk }, investor: { context: ctx, structure: struc, watch, risk: prisk }, writeup, fallback: true };
}

// ─── Gemini call ─────────────────────────────────────────────────────────────
async function callGemini(apiKey, slot, d) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel, sessionChar,
          fiiNet, diiNet, sp500Pct, nikkeiPct, hangsengPct, niftyPrice, bnPrice } = d;

  const prompt = `You are a market context engine for an Indian financial markets dashboard. You describe what is happening. You do not give advice or recommendations.

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
- FII net: ${fiiNet !== null && fiiNet !== undefined ? (fiiNet >= 0 ? '+' : '') + fiiNet.toLocaleString('en-IN') + ' Cr' : 'unavailable'}
- DII net: ${diiNet !== null && diiNet !== undefined ? (diiNet >= 0 ? '+' : '') + diiNet.toLocaleString('en-IN') + ' Cr' : 'unavailable'}
- S&P 500: ${sp500Pct !== null && sp500Pct !== undefined ? (sp500Pct >= 0 ? '+' : '') + sp500Pct.toFixed(2) + '%' : 'unavailable'}
- Nikkei: ${nikkeiPct !== null && nikkeiPct !== undefined ? (nikkeiPct >= 0 ? '+' : '') + nikkeiPct.toFixed(2) + '%' : 'unavailable'}
- Hang Seng: ${hangsengPct !== null && hangsengPct !== undefined ? (hangsengPct >= 0 ? '+' : '') + hangsengPct.toFixed(2) + '%' : 'unavailable'}

Use Google Search to find what is actually driving Indian markets today. Search for and include where relevant:
- Current Nifty and BankNifty options open interest levels, max pain, PCR (put-call ratio)
- Any significant OI buildup or unwinding at key strikes
- Quarterly results from Nifty 50 companies announced today or this week, with actual numbers
- Earnings beats or misses and their price reaction
- RBI news, global macro, geopolitical developments, or sector-specific news

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
[3 to 4 paragraphs, 220 to 260 words total. Educational and factual market context for the ${slot.label} session. Use actual news and data from your search. Plain English. Third person. Specific numbers. Structure the writeup to cover: (1) what the indices are doing with specific levels, (2) what is driving the move today based on actual news including any Nifty 50 quarterly results and their numbers, (3) open interest picture: mention Nifty PCR, max pain level, and any significant OI buildup or writing at key strikes if data is available, (4) what participants are watching in this session. Do not tell the reader what to do. Do not use the words buy, sell, invest, enter, exit, recommend, should, must, or consider. No predictions. Every statement must be descriptive of what is happening, not prescriptive of what to do. Reads like a market desk factsheet, not a tip sheet.]
WRITEUP_END`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const get = key => {
    const match = text.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  // Extract prose writeup between markers
  const writeupMatch = text.match(/WRITEUP_START\s*([\s\S]*?)\s*WRITEUP_END/);
  const writeup = writeupMatch ? writeupMatch[1].trim() : null;

  const trader   = { tone: get('TRADER_TONE'), control: get('TRADER_CONTROL'), behavior: get('TRADER_BEHAVIOR'), risk: get('TRADER_RISK') };
  const investor = { context: get('INVESTOR_CONTEXT'), structure: get('INVESTOR_STRUCTURE'), watch: get('INVESTOR_WATCH'), risk: get('INVESTOR_RISK') };

  if (!trader.tone && !investor.context && !writeup) throw new Error('parse_failed');
  return { trader, investor, writeup, fallback: false };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const slot = getSlotInfo();

  try {
    const cached = await kv.get(`insights_v3_${slot.key}`);
    if (cached) return res.json({ ...cached, cached: true, slot });
  } catch (_) {}

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (_) {}

  const apiKey = process.env.GEMINI_API_KEY;
  let result;

  if (apiKey) {
    try { result = await callGemini(apiKey, slot, body); }
    catch (err) { console.error('Gemini failed:', err.message); result = buildFallback(body, slot); }
  } else {
    result = buildFallback(body, slot);
  }

  result.generatedAt = new Date().toISOString();
  try { await kv.set(`insights_v3_${slot.key}`, result, { ex: slot.ttl }); } catch (_) {}
  return res.json({ ...result, cached: false, slot });
}
