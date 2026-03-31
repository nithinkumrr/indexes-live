// api/news.js — server-side RSS aggregator (avoids CORS issues)
const FEEDS = [
  // ── MARKETS (Indian) ──
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',         source: 'Economic Times',    cat: 'Markets' },
  { url: 'https://www.livemint.com/rss/markets',                                          source: 'Mint',              cat: 'Markets' },
  { url: 'https://www.business-standard.com/rss/markets-106.rss',                        source: 'Business Standard', cat: 'Markets' },
  { url: 'https://cnbctv18.com/commonfeeds/v1/eng/rss/market.xml',                       source: 'CNBC TV18',         cat: 'Markets' },
  { url: 'https://www.thehindubusinessline.com/markets/feeder/default.rss',              source: 'BusinessLine',      cat: 'Markets' },
  { url: 'https://www.moneycontrol.com/rss/marketreports.xml',                           source: 'Moneycontrol',      cat: 'Markets' },
  { url: 'https://www.moneycontrol.com/rss/technicals.xml',                              source: 'Moneycontrol',      cat: 'Markets' },
  { url: 'https://ndtvprofit.com/feed',                                                   source: 'NDTV Profit',       cat: 'Markets' },

  // ── STOCKS (Indian) ──
  { url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',     source: 'Economic Times',    cat: 'Stocks' },
  { url: 'https://www.moneycontrol.com/rss/results.xml',                                 source: 'Moneycontrol',      cat: 'Stocks' },
  { url: 'https://www.moneycontrol.com/rss/buzzingstocks.xml',                           source: 'Moneycontrol',      cat: 'Stocks' },
  { url: 'https://www.business-standard.com/rss/companies-101.rss',                      source: 'Business Standard', cat: 'Stocks' },
  { url: 'https://www.livemint.com/rss/companies',                                       source: 'Mint',              cat: 'Stocks' },
  { url: 'https://economictimes.indiatimes.com/markets/ipo/rssfeeds/16660364.cms',       source: 'Economic Times',    cat: 'Stocks' },

  // ── ECONOMY (Indian) ──
  { url: 'https://economictimes.indiatimes.com/economy/rssfeeds/1373380680.cms',         source: 'Economic Times',    cat: 'Economy' },
  { url: 'https://www.business-standard.com/rss/economy-policy-102.rss',                source: 'Business Standard', cat: 'Economy' },
  { url: 'https://www.financialexpress.com/feed/',                                        source: 'Financial Express', cat: 'Economy' },
  { url: 'https://www.livemint.com/rss/economy',                                         source: 'Mint',              cat: 'Economy' },
  { url: 'https://www.thehindubusinessline.com/economy/feeder/default.rss',             source: 'BusinessLine',      cat: 'Economy' },
  { url: 'https://www.moneycontrol.com/rss/economy.xml',                                 source: 'Moneycontrol',      cat: 'Economy' },
  { url: 'https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/1052732854.cms', source: 'Economic Times', cat: 'Economy' },

  // ── GLOBAL (for context) ──
  { url: 'https://feeds.reuters.com/reuters/businessNews',                               source: 'Reuters',           cat: 'Global' },
  { url: 'https://economictimes.indiatimes.com/markets/international/rssfeeds/4684039.cms', source: 'Economic Times', cat: 'Global' },
  { url: 'https://www.moneycontrol.com/rss/globalmktnews.xml',                           source: 'Moneycontrol',      cat: 'Global' },
];

function parseRSS(xml, feed) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag) => {
      // Match both plain text and CDATA-wrapped content
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = r.exec(block);
      if (!match) return '';
      let val = match[1].trim();
      // Strip CDATA wrapper if present
      val = val.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
      // Strip any trailing ]]> that leaked through
      val = val.replace(/\]\]>\s*$/, '').trim();
      return val;
    };
    const title = get('title')
      .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&#39;/g,"'").replace(/&quot;/g,'"')
      .replace(/\]\]>\s*$/,'').trim();
    const link  = get('link') || get('guid');
    const pubDate = get('pubDate') || get('dc:date') || '';
    if (title && link) {
      items.push({ title, link, pubDate, source: feed.source, cat: feed.cat });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const results = await Promise.allSettled(
    FEEDS.map(feed =>
      fetch(feed.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' }, signal: AbortSignal.timeout(8000) })
        .then(r => r.text())
        .then(xml => parseRSS(xml, feed))
        .catch(() => [])
    )
  );

  const allItems = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  // Sort by date desc, dedupe by title
  const seen = new Set();
  const deduped = allItems
    .filter(i => { const k = i.title.slice(0,60); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a,b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    })
    .slice(0, 200);

  res.status(200).json({ items: deduped, fetchedAt: new Date().toISOString() });
}
