// api/insights-brief.js
// Generates slot-aware market brief using Gemini 2.0 Flash with Google Search grounding.
// Cached in Vercel KV per slot — max 6 Gemini calls per day regardless of traffic.

import { kv } from '@vercel/kv';

// ─── Slot detection (IST) ────────────────────────────────────────────────────
function getSlot() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const pad  = n => String(n).padStart(2, '0');
  const dateStr = `${ist.getFullYear()}-${pad(ist.getMonth()+1)}-${pad(ist.getDate())}`;

  const SLOTS = [
    { name: 'weekend',   label: 'Weekend',           range: 'Market closed',        minStart: 0,    minEnd: 9999, days: [0,6] },
    { name: 'premarket', label: 'Pre-Market',         range: 'Before 9:00 AM',       minStart: 0,    minEnd: 539 },
    { name: 'preopen',   label: 'Pre-Open Session',   range: '9:00 AM to 9:15 AM',   minStart: 540,  minEnd: 554 },
    { name: 'opening',   label: 'Opening Session',    range: '9:15 AM to 12:30 PM',  minStart: 555,  minEnd: 749 },
    { name: 'midday',    label: 'Mid-Day',            range: '12:30 PM to 2:30 PM',  minStart: 750,  minEnd: 869 },
    { name: 'afternoon', label: 'Afternoon Session',  range: '2:30 PM to 3:30 PM',   minStart: 870,  minEnd: 929 },
    { name: 'close',     label: 'Market Close',       range: '3:30 PM to 5:00 PM',   minStart: 930,  minEnd: 1019 },
    { name: 'eod',       label: 'End of Day',         range: 'After 5:00 PM',        minStart: 1020, minEnd: 9999 },
  ];

  if (day === 0 || day === 6) {
    return { ...SLOTS[0], key: `${dateStr}-weekend` };
  }
  const slot = SLOTS.slice(1).find(s => mins >= s.minStart && mins <= s.minEnd) || SLOTS[7];
  return { ...slot, key: `${dateStr}-${slot.name}` };
}

// ─── Gemini call with Google Search grounding ────────────────────────────────
async function callGemini(apiKey, slot, marketData) {
  const { nifty, banknifty, vix, fiiNet, diiNet, sp500, nikkei, hangseng, giftnifty } = marketData;

  const prompt = `You are writing a market session brief for indexes.live, a market data dashboard for Indian traders and investors.

Session: ${slot.label} (${slot.range})
Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })}

Live market data:
- Nifty 50: ${nifty.price ? nifty.price.toLocaleString('en-IN') + ' (' + (nifty.changePct >= 0 ? '+' : '') + nifty.changePct?.toFixed(2) + '%)' : 'data unavailable'}
- Bank Nifty: ${banknifty.price ? banknifty.price.toLocaleString('en-IN') + ' (' + (banknifty.changePct >= 0 ? '+' : '') + banknifty.changePct?.toFixed(2) + '%)' : 'data unavailable'}
${vix ? `- India VIX: ${vix.toFixed(1)}` : ''}
${giftnifty?.price ? `- Gift Nifty: ${giftnifty.price.toLocaleString('en-IN')} (${giftnifty.changePct >= 0 ? '+' : ''}${giftnifty.changePct?.toFixed(2)}%)` : ''}
${fiiNet !== null ? `- FII net: ${fiiNet >= 0 ? '+' : ''}${fiiNet.toLocaleString('en-IN')} Cr` : ''}
${diiNet !== null ? `- DII net: ${diiNet >= 0 ? '+' : ''}${diiNet.toLocaleString('en-IN')} Cr` : ''}
${sp500?.changePct !== null && sp500?.changePct !== undefined ? `- S&P 500: ${sp500.changePct >= 0 ? '+' : ''}${sp500.changePct?.toFixed(2)}%` : ''}
${nikkei?.changePct !== null && nikkei?.changePct !== undefined ? `- Nikkei: ${nikkei.changePct >= 0 ? '+' : ''}${nikkei.changePct?.toFixed(2)}%` : ''}
${hangseng?.changePct !== null && hangseng?.changePct !== undefined ? `- Hang Seng: ${hangseng.changePct >= 0 ? '+' : ''}${hangseng.changePct?.toFixed(2)}%` : ''}

Use Google Search to find what is actually driving Indian markets today. Include relevant news about RBI, results season, global macro, geopolitical events, or sector-specific moves if they are meaningful.

Write a market session brief with these sections:

**What is happening**
2 to 3 sentences. State the actual market situation right now with specific numbers. No vague language.

**What is driving it**
2 to 3 sentences. Use your search results to explain the actual reasons behind today's price action. Be specific. Name the actual news, event, or data if relevant.

**What participants are watching**
2 to 3 sentences. For the ${slot.label} session specifically, explain what the key focus points are for traders and investors in this time window.

**Into the session**
1 to 2 sentences. What to monitor as the session progresses. No predictions.

Strict rules:
- No em dashes anywhere. Use commas or full stops instead.
- No phrases like "you should", "consider", "recommend", "buy", "sell", "invest"
- Write in third person about markets. Not second person to the reader.
- Be factual and specific. Use real numbers from the data provided.
- Tone is a market desk note. Informed. Direct. No newsletter fluff.
- Do not start any sentence with "I"
- Keep total length under 280 words.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const slot = getSlot();

  // Check KV cache first
  try {
    const cached = await kv.get(`insights_brief_${slot.key}`);
    if (cached) {
      return res.json({ slot, brief: cached, cached: true });
    }
  } catch (_) {}

  // Parse market data from request body
  let marketData = {};
  try {
    marketData = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {}

  // Call Gemini
  try {
    const brief = await callGemini(apiKey, slot, marketData);
    if (!brief) return res.status(500).json({ error: 'empty_response' });

    // Cache for the slot duration (TTL in seconds)
    const TTL = {
      weekend:   86400,  // 24h
      premarket: 3600,   // 1h
      preopen:   900,    // 15min
      opening:   7200,   // 2h
      midday:    5400,   // 1.5h
      afternoon: 3600,   // 1h
      close:     5400,   // 1.5h
      eod:       43200,  // 12h
    }[slot.name] || 3600;

    try { await kv.set(`insights_brief_${slot.key}`, brief, { ex: TTL }); } catch (_) {}

    return res.json({ slot, brief, cached: false, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Gemini failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
