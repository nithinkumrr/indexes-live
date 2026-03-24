// api/ratios.js — Fetches P/E, P/B, 52W range, volume etc for any symbol
// Uses Yahoo Finance quoteSummary endpoint which has richer data than chart API

export default async function handler(req, res) {
  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const modules = 'summaryDetail,defaultKeyStatistics,price,summaryProfile';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!r.ok) throw new Error(`Yahoo ${r.status}`);
    const data = await r.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) throw new Error('No data');

    const sd  = result.summaryDetail || {};
    const ks  = result.defaultKeyStatistics || {};
    const pr  = result.price || {};

    const raw = v => v?.raw ?? null;
    const fmt = v => v?.fmt ?? null;

    return res.json({
      pe:           raw(sd.trailingPE)    || raw(sd.forwardPE),
      pb:           raw(ks.priceToBook),
      ps:           raw(ks.priceToSalesTrailing12Months),
      beta:         raw(sd.beta),
      dy:           raw(sd.dividendYield) != null ? (raw(sd.dividendYield) * 100).toFixed(2) : null,
      yearHigh:     raw(sd.fiftyTwoWeekHigh),
      yearLow:      raw(sd.fiftyTwoWeekLow),
      avg50:        raw(sd.fiftyDayAverage),
      avg200:       raw(sd.twoHundredDayAverage),
      volume:       raw(sd.volume) || raw(pr.regularMarketVolume),
      avgVolume:    raw(sd.averageVolume),
      marketCap:    raw(sd.marketCap) || raw(pr.marketCap),
      currency:     pr.currency,
      exchange:     pr.exchangeName,
    });
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
}
