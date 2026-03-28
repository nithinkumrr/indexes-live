// api/insights-brief.js
// Gemini-powered session brief with trader + investor split.
// Cached per slot in KV. Falls back to rule engine if Gemini fails.

import { kv } from '@vercel/kv';

function getSlotInfo() {
  const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day  = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const pad  = n => String(n).padStart(2, '0');
  const dateStr = `${ist.getFullYear()}-${pad(ist.getMonth()+1)}-${pad(ist.getDate())}`;

  const slots = [
    { name: 'premarket', label: 'Pre-Market',        window: 'Before market open',         minStart: 0,    minEnd: 554  },
    { name: 'opening',   label: 'Opening Session',   window: 'First hour of trade',         minStart: 555,  minEnd: 749  },
    { name: 'midday',    label: 'Mid-Day',            window: 'Mid-session',                 minStart: 750,  minEnd: 869  },
    { name: 'afternoon', label: 'Afternoon Session', window: 'Into the close',              minStart: 870,  minEnd: 929  },
    { name: 'close',     label: 'Market Close',      window: 'Post-close',                  minStart: 930,  minEnd: 1019 },
    { name: 'eod',       label: 'End of Day',        window: 'After hours',                 minStart: 1020, minEnd: 9999 },
  ];

  if (day === 0 || day === 6) {
    return { name: 'weekend', label: 'Weekend', window: 'Market closed', key: `${dateStr}-weekend`, ttl: 86400 };
  }
  const slot = slots.find(s => mins >= s.minStart && mins <= s.minEnd) || slots[5];
  const ttl  = { premarket: 3600, opening: 5400, midday: 3600, afternoon: 2700, close: 5400, eod: 43200 }[slot.name] || 3600;
  return { ...slot, key: `${dateStr}-${slot.name}`, ttl };
}

// ─── Rule-based fallback (no Gemini needed) ──────────────────────────────────
function buildFallback(d) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel, sessionChar } = d;
  const np   = niftyPct ?? 0;
  const tone = np < -1 ? 'Broad weakness across indices' : np < 0 ? 'Mild selling pressure' : np > 1 ? 'Broad strength across indices' : 'Flat to mixed session';
  const ctrl = np < -0.5 ? 'Sellers active on rallies' : np > 0.5 ? 'Buyers stepping in on dips' : 'Neither side in clear control';
  const beh  = np < -1 ? 'Expect continuation or choppy downside' : np < 0 ? 'Watch for attempted bounces' : np > 1 ? 'Expect continuation or pullback to buy' : 'Range-bound action likely';
  const risk = vix > 18 ? 'High volatility. Reduce position size' : vix > 14 ? 'Moderate volatility. Standard sizing' : 'Low volatility. Watch for breakout';

  const ctx   = np < -0.5 ? 'Market under selling pressure' : np > 0.5 ? 'Market holding positive bias' : 'Market in consolidation';
  const struc = structure === 'Downtrend' ? 'Weakening. Lower highs forming' : structure === 'Uptrend' ? 'Constructive. Higher lows holding' : 'Range bound. No clear trend';
  const watch = np < 0 ? 'Whether support zones hold on close' : 'Whether resistance zones are cleared';
  const prisk = np < -1 ? 'Sustained breakdown can extend correction' : np > 1 ? 'Overextension risk if buying is not broad-based' : 'Wait for structure clarity before positioning';

  return {
    trader:   { tone, control: ctrl, behavior: beh, risk },
    investor: { context: ctx, structure: struc, watch, risk: prisk },
    fallback: true,
  };
}

// ─── Gemini call ─────────────────────────────────────────────────────────────
async function callGemini(apiKey, slot, d) {
  const { niftyPct, bnPct, vix, stance, structure, volLabel, sessionChar,
          fiiNet, diiNet, sp500Pct, nikkeiPct, hangsengPct, niftyPrice, bnPrice } = d;

  const prompt = `You are a market context engine for an Indian financial markets dashboard. Your job is to describe what is happening in the market right now. You do not give advice or recommendations.

Current session: ${slot.label} (${slot.window})
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

Use Google Search to find what is actually driving Indian markets today. Include relevant RBI news, earnings, global macro, or sector-specific events if meaningful.

Respond in this EXACT format. No extra text before or after. No em dashes. No recommendations:

TRADER_TONE: [1 sentence on overall market tone right now]
TRADER_CONTROL: [1 sentence on who has control, buyers or sellers]
TRADER_BEHAVIOR: [1 sentence on intraday behavior expectation]
TRADER_RISK: [1 sentence on key risk to watch]
INVESTOR_CONTEXT: [1 sentence on broader market context and what is driving it today]
INVESTOR_STRUCTURE: [1 sentence on structural health of the market]
INVESTOR_WATCH: [1 sentence on what to observe, not what to do]
INVESTOR_RISK: [1 sentence on medium-term risk factor]`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Parse structured output
  const get = key => {
    const match = text.match(new RegExp(`${key}:\\s*(.+)`));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
  };

  const trader = {
    tone:     get('TRADER_TONE'),
    control:  get('TRADER_CONTROL'),
    behavior: get('TRADER_BEHAVIOR'),
    risk:     get('TRADER_RISK'),
  };
  const investor = {
    context:   get('INVESTOR_CONTEXT'),
    structure: get('INVESTOR_STRUCTURE'),
    watch:     get('INVESTOR_WATCH'),
    risk:      get('INVESTOR_RISK'),
  };

  if (!trader.tone && !investor.context) throw new Error('parse_failed');
  return { trader, investor, fallback: false };
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const slot = getSlotInfo();

  // Check KV cache
  try {
    const cached = await kv.get(`insights_v2_${slot.key}`);
    if (cached) return res.json({ ...cached, cached: true, slot });
  } catch (_) {}

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (_) {}

  const apiKey = process.env.GEMINI_API_KEY;

  let result;

  if (apiKey) {
    try {
      result = await callGemini(apiKey, slot, body);
    } catch (err) {
      console.error('Gemini failed, using fallback:', err.message);
      result = buildFallback(body);
    }
  } else {
    result = buildFallback(body);
  }

  result.generatedAt = new Date().toISOString();

  // Cache result
  try { await kv.set(`insights_v2_${slot.key}`, result, { ex: slot.ttl }); } catch (_) {}

  return res.json({ ...result, cached: false, slot });
}
