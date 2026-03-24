// api/ratios.js — PE, PB, 52W, avg, beta for any symbol via Yahoo quoteSummary
export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  const headers = { 'User-Agent': UA, 'Accept': 'application/json', 'Accept-Language': 'en-US,en;q=0.9' };

  const raw = v => v?.raw ?? (typeof v === 'number' ? v : null);
  const pf  = v => { const n = parseFloat(v); return isNaN(n) || n === 0 ? null : parseFloat(n.toFixed(2)); };

  // Try v10 quoteSummary
  try {
    const modules = 'summaryDetail,defaultKeyStatistics,price';
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
    const r   = await fetch(url, { headers });
    if (r.ok) {
      const data   = await r.json();
      const result = data?.quoteSummary?.result?.[0];
      if (result) {
        const sd = result.summaryDetail        || {};
        const ks = result.defaultKeyStatistics || {};
        const pr = result.price                || {};

        const trailingPE = pf(raw(sd.trailingPE)) || pf(raw(sd.forwardPE));
        const pb         = pf(raw(ks.priceToBook));
        const dyRaw      = raw(sd.dividendYield);
        const dy         = dyRaw ? pf(dyRaw * 100) : null;

        return res.json({
          pe:        trailingPE,
          pb,
          dy,
          beta:      pf(raw(sd.beta)),
          yearHigh:  pf(raw(sd.fiftyTwoWeekHigh)),
          yearLow:   pf(raw(sd.fiftyTwoWeekLow)),
          avg50:     pf(raw(sd.fiftyDayAverage)),
          avg200:    pf(raw(sd.twoHundredDayAverage)),
          marketCap: raw(sd.marketCap) || raw(pr.marketCap),
          currency:  pr.currency,
          source:    'yahoo-v10',
        });
      }
    }
  } catch (_) {}

  // Fallback: v8 chart API meta has 52W and averages
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const r   = await fetch(url, { headers });
    if (r.ok) {
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta) {
        return res.json({
          pe:       null,
          pb:       null,
          dy:       null,
          yearHigh: pf(meta.fiftyTwoWeekHigh),
          yearLow:  pf(meta.fiftyTwoWeekLow),
          avg50:    pf(meta.fiftyDayAverage),
          avg200:   pf(meta.twoHundredDayAverage),
          source:   'yahoo-v8-meta',
        });
      }
    }
  } catch (_) {}

  return res.status(503).json({ error: 'All sources failed' });
}
