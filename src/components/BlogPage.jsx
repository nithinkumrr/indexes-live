import { useState, useEffect } from 'react';

const TOPICS = [
  { id: 'today', label: "Today's Market", prompt: 'Write a concise daily market commentary for Indian markets today. Cover: Nifty 50 trend, key movers, FII/DII activity, global cues, and what traders should watch tomorrow. Be specific, data-driven and under 300 words. Use clear sections.' },
  { id: 'fii',   label: 'FII/DII Analysis', prompt: 'Explain what recent FII selling and DII buying means for Indian markets. Cover: impact on Nifty levels, sectors most affected, historical context, and what retail investors should do. Keep it under 250 words.' },
  { id: 'fno',   label: 'F&O Expiry Guide', prompt: 'Write a guide on how Nifty and Sensex F&O weekly and monthly expiry works in India. Cover: what happens near expiry, max pain concept, how PCR affects price, what beginners should know. Under 300 words.' },
  { id: 'vix',   label: 'Understanding VIX', prompt: 'Explain India VIX and what it means for option traders and investors. What does VIX above 20 mean? When to buy and sell options based on VIX. Keep it practical and under 250 words.' },
  { id: 'gold',  label: 'Gold Market',       prompt: 'Write about gold as an investment for Indians in 2025-26. Cover: MCX gold price drivers, USD-INR impact, sovereign gold bonds vs physical gold vs gold ETF, and ideal allocation. Under 300 words.' },
  { id: 'ipo',   label: 'IPO Investing',     prompt: 'Explain how to evaluate IPOs in India. Cover: how to read DRHP, what GMP tells you, allotment process, listing gain vs long-term holding, and red flags to avoid. Practical guide under 300 words.' },
];

export default function BlogPage() {
  const [topic, setTopic]     = useState(TOPICS[0]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [cache, setCache]     = useState({});

  const generate = async (t) => {
    if (cache[t.id]) { setContent(cache[t.id]); return; }
    setLoading(true);
    setContent('');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are a sharp Indian financial journalist writing daily market commentary. Write in clear, direct language. Use ₹ for Indian rupee. Use specific numbers and percentages where relevant. Format with markdown headers (##) for sections.',
          messages: [{ role: 'user', content: t.prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || 'Could not generate commentary.';
      setCache(prev => ({ ...prev, [t.id]: text }));
      setContent(text);
    } catch (e) {
      setContent('Failed to generate commentary. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => { generate(TOPICS[0]); }, []);

  const handleTopic = (t) => {
    setTopic(t);
    generate(t);
  };

  // Simple markdown renderer
  const renderMd = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## '))   return <h2 key={i} className="blog-h2">{line.slice(3)}</h2>;
      if (line.startsWith('### '))  return <h3 key={i} className="blog-h3">{line.slice(4)}</h3>;
      if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="blog-bold">{line.slice(2,-2)}</p>;
      if (line.startsWith('- '))    return <li key={i} className="blog-li">{line.slice(2)}</li>;
      if (line.trim() === '')       return <div key={i} className="blog-spacer" />;
      return <p key={i} className="blog-p">{line}</p>;
    });
  };

  return (
    <div className="blog-wrap">
      <div className="blog-header">
        <div>
          <div className="blog-title">Market Commentary</div>
          <div className="blog-subtitle">AI-powered daily insights · Powered by Claude</div>
        </div>
        <div className="blog-badge">AI Generated · Not investment advice</div>
      </div>

      <div className="blog-layout">
        {/* Sidebar */}
        <div className="blog-sidebar">
          <div className="blog-sidebar-label">Topics</div>
          {TOPICS.map(t => (
            <button key={t.id} className={`blog-nav-btn ${topic.id===t.id?'blog-nav-active':''}`}
              onClick={() => handleTopic(t)}>
              {t.label}
              {cache[t.id] && <span className="blog-cached">✓</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="blog-content">
          <div className="blog-content-header">
            <span className="blog-content-title">{topic.label}</span>
            <button className="blog-regen" onClick={() => { setCache(prev => { const c={...prev}; delete c[topic.id]; return c; }); generate(topic); }}>
              ↻ Regenerate
            </button>
          </div>
          <div className="blog-article">
            {loading ? (
              <div className="blog-loading">
                <div className="blog-loading-bar" />
                <div className="blog-loading-text">Generating commentary...</div>
              </div>
            ) : content ? (
              <div className="blog-text">{renderMd(content)}</div>
            ) : null}
          </div>
          <div className="blog-footer-note">
            Generated by Claude AI · For educational purposes only · Not SEBI registered advice
          </div>
        </div>
      </div>
    </div>
  );
}
