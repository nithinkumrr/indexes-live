// api/mcx.js — MCX India commodities via Kite Connect
// Dynamically finds near-month futures for key MCX commodities

const KITE_BASE = 'https://api.kite.trade';

// MCX commodity names as they appear in Kite instruments dump
const MCX_COMMODITIES = [
  { name: 'GOLD',       id: 'mcx_gold',      flag: '🟡', unit: '₹/10g'  },
  { name: 'SILVER',     id: 'mcx_silver',    flag: '⚪', unit: '₹/kg'   },
  { name: 'CRUDEOIL',   id: 'mcx_crude',     flag: '🛢️', unit: '₹/bbl'  },
  { name: 'NATURALGAS', id: 'mcx_natgas',    flag: '🔥', unit: '₹/mmBtu'},
  { name: 'COPPER',     id: 'mcx_copper',    flag: '🟤', unit: '₹/kg'   },
  { name: 'ZINC',       id: 'mcx_zinc',      flag: '🔷', unit: '₹/kg'   },
  { name: 'ALUMINIUM',  id: 'mcx_aluminium', flag: '🔩', unit: '₹/kg'   },
  { name: 'LEAD',       id: 'mcx_lead',      flag: '🩶', unit: '₹/kg'   },
];

async function getToken(req) {
  const uUrl = process.env.UPSTASH_REDIS_REST_URL;
  const uTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (uUrl && uTok) {
    try {
      const r = await fetch(`${uUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${uTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  const kUrl = process.env.KV_REST_API_URL;
  const kTok = process.env.KV_REST_API_TOKEN;
  if (kUrl && kTok) {
    try {
      const r = await fetch(`${kUrl}/get/kite_token`, { headers: { Authorization: `Bearer ${kTok}` } });
      const d = await r.json();
      if (d?.result) return d.result;
    } catch (_) {}
  }
  const m = (req.headers?.cookie || '').match(/kite_token=([^;]+)/);
  return m ? m[1] : null;
}

async function kiteGet(path, apiKey, token) {
  const r = await fetch(`${KITE_BASE}${path}`, {
    headers: { 'X-Kite-Version': '3', 'Authorization': `token ${apiKey}:${token}` }
  });
  if (r.status === 401 || r.status === 403) throw new Error('token_expired');
  if (!r.ok) throw new Error(`Kite ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120