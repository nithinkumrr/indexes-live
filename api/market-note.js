// api/market-note.js
// GET  — returns current market note
// POST — updates note (requires ?secret=INSIGHTS_SECRET env var)
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST') {
    const secret = process.env.INSIGHTS_SECRET;
    if (!secret || req.query.secret !== secret) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { note } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!note) return res.status(400).json({ error: 'missing note' });
    await kv.set('market_note', note);
    return res.json({ ok: true });
  }

  // GET
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try {
    const note = await kv.get('market_note');
    return res.json({ note: note || null });
  } catch {
    return res.json({ note: null });
  }
}
