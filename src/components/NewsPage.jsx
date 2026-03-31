import { useState, useEffect, useCallback, useRef } from 'react';

// ── News Sources (RSS via rss2json proxy) ─────────────────────────────────────
const NEWS_SOURCES = [
  // Indian Markets
  { id: 'et_markets',    name: 'ET Markets',       url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',  cat: 'India',  tag: 'Markets'   },
  { id: 'et_stocks',     name: 'ET Stocks',        url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms', cat: 'India', tag: 'Stocks' },
  { id: 'bs_markets',    name: 'Business Standard',url: 'https://www.business-standard.com/rss/markets-106.rss',                cat: 'India',  tag: 'Markets'   },
  { id: 'mint_markets',  name: 'Mint',             url: 'https://www.livemint.com/rss/markets',                                 cat: 'India',  tag: 'Markets'   },
  { id: 'moneycontrol',  name: 'Moneycontrol',     url: 'https://www.moneycontrol.com/rss/marketsindia.xml',                   cat: 'India',  tag: 'India'     },
  // Global
  { id: 'reuters_mkts',  name: 'Reuters Markets',  url: 'https://feeds.reuters.com/reuters/businessNews',                      cat: 'Global', tag: 'Global'    },
  { id: 'cnbc',          name: 'CNBC',             url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', cat: 'Global', tag: 'Global' },
  // FII/Macro
  { id: 'rbi',           name: 'RBI',              url: 'https://www.rbi.org.in/Scripts/RSS.aspx?Id=17',                       cat: 'Official', tag: 'Macro'   },
];

const TABS = ['All', 'India', 'Global', 'Macro', 'Official'];

const NOISE_PATTERNS = [
  /\b(click here|read more|subscribe|sign up|newsletter|advertisement|sponsored|partner content)\b/i,
  /\b(₹\d+ crore deal|price target)\b/i,
];

function isNoise(title) {
  return NOISE_PATTERNS.some(p => p.test(title));
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function cleanTitle(t) {
  return t?.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
           .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
           .replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim() || '';
}

function cleanDesc(d) {
  return d?.replace(/<[^>]+>/g,'')
           .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
           .replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim()
           .slice(0, 160) || '';
}

// Category tag color
function tagColor(tag) {
  const m = { India:'#00C896', Global:'#4A9EFF', Macro:'#F59E0B', Official:'#A78BFA', Stocks:'#00C896', Markets:'#4A9EFF' };
  return m[tag] || 'var(--text3)';
}

// Fetch one RSS feed via rss2json
async function fetchFeed(source) {
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&count=15`;
  const r = await fetch(api, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('fetch failed');
  const d = await r.json();
  if (d.status !== 'ok') throw new Error('rss error');
  return (d.items || [])
    .filter(i => i.title && !isNoise(i.title))
    .map(i => ({
      id:     `${source.id}_${i.guid || i.link}`,
      title:  cleanTitle(i.title),
      desc:   cleanDesc(i.description || i.content || ''),
      url:    i.link,
      date:   i.pubDate,
      source: source.name,
      tag:    source.tag,
      cat:    source.cat,
    }));
}

export default function NewsPage({ data }) {
  const [articles, setArticles]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch]       = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const fetchedRef = useRef(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadedCount(0);
    let all = [];
    let succeeded = 0;

    await Promise.allSettled(
      NEWS_SOURCES.map(src =>
        fetchFeed(src).then(items => {
          all = [...all, ...items];
          succeeded++;
          setLoadedCount(prev => prev + 1);
        }).catch(() => {
          setLoadedCount(prev => prev + 1);
        })
      )
    );

    if (succeeded === 0) {
      setError('Could not load news feeds. Check your connection.');
      setLoading(false);
      return;
    }

    // De-duplicate by title similarity
    const seen = new Set();
    const deduped = all.filter(a => {
      const key = a.title.toLowerCase().slice(0, 60).replace(/\s+/g, ' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date desc
    deduped.sort((a, b) => new Date(b.date) - new Date(a.date));

    setArticles(deduped.slice(0, 200));
    setLastUpdate(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAll();
    // Refresh every 15 min
    const id = setInterval(fetchAll, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Filter
  const filtered = articles.filter(a => {
    const tabMatch = activeTab === 'All' || a.tag === activeTab || a.cat === activeTab;
    const q = search.trim().toLowerCase();
    const searchMatch = !q || a.title.toLowerCase().includes(q) || a.source.toLowerCase().includes(q);
    return tabMatch && searchMatch;
  });

  const counts = {};
  TABS.forEach(t => {
    counts[t] = t === 'All' ? articles.length
      : articles.filter(a => a.tag === t || a.cat === t).length;
  });

  return (
    <div className="np-wrap">

      {/* Header bar */}
      <div className="np-header">
        <div className="np-header-left">
          <div className="np-title">MARKET NEWS</div>
          {lastUpdate && (
            <div className="np-updated">
              Updated {lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} IST
            </div>
          )}
        </div>
        <div className="np-header-right">
          <div className="np-search-wrap">
            <span className="np-search-icon">⌕</span>
            <input
              className="np-search"
              placeholder="Search news…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="np-search-clear" onClick={() => setSearch('')}>×</button>}
          </div>
          <button className="np-refresh" onClick={fetchAll} disabled={loading} title="Refresh">
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="np-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`np-tab${activeTab === t ? ' np-tab-active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
            {counts[t] > 0 && <span className="np-tab-count">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="np-loading">
          <div className="np-loading-bar">
            <div
              className="np-loading-fill"
              style={{ width: `${Math.round((loadedCount / NEWS_SOURCES.length) * 100)}%` }}
            />
          </div>
          <div className="np-loading-text">
            Loading feeds… {loadedCount}/{NEWS_SOURCES.length}
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="np-error">
          <div className="np-error-icon">⚡</div>
          <div className="np-error-text">{error}</div>
          <button className="np-retry" onClick={fetchAll}>Try Again</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="np-empty">
          {search ? `No results for "${search}"` : 'No articles found.'}
        </div>
      )}

      {/* Article grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="np-grid">
          {filtered.map((a, i) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`np-card${i === 0 && activeTab === 'All' ? ' np-card-hero' : ''}`}
            >
              <div className="np-card-top">
                <span className="np-card-tag" style={{ color: tagColor(a.tag), borderColor: tagColor(a.tag) + '40' }}>
                  {a.tag}
                </span>
                <span className="np-card-source">{a.source}</span>
                <span className="np-card-time">{timeAgo(a.date)}</span>
              </div>
              <div className="np-card-title">{a.title}</div>
              {a.desc && <div className="np-card-desc">{a.desc}</div>}
            </a>
          ))}
        </div>
      )}

      <div className="np-footer">
        {filtered.length} articles · {NEWS_SOURCES.length} sources · no ads, ever
      </div>
    </div>
  );
}
