import { useState, useEffect, useRef } from 'react';

export default function Header({ lastUpdate, view, setView }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('indexeslive_theme') || 'dark'; } catch { return 'dark'; }
  });
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('indexeslive_theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    function handleClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('touchstart', handleClick); };
  }, []);

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : null;

  const mainTabs = [
    { id: 'grid',     label: 'Markets',    icon: '◈' },
    { id: 'bubble',   label: 'Sentiment',  icon: '◉' },
    { id: 'fno',      label: 'F&O',        icon: '◬' },
    { id: 'mtf',      label: 'MTF',          icon: '◫' },
    { id: 'delivery', label: 'Top Delivery', icon: '◈' },
    { id: 'calc',     label: 'Risk',         icon: '⊕' },
    { id: 'ipo',      label: 'IPO',        icon: '◎', cls: 'tab-teal' },
    { id: 'gold',     label: 'Gold',       icon: '◆', cls: 'tab-gold' },
  ];

  const moreTabs = [
    { id: 'brokers',  label: 'Brokers',        icon: '⊞' },
    { id: 'insights', label: 'News & Insights', icon: '◐', cls: 'tab-purple' },
  ];

  const allTabs = [...mainTabs, ...moreTabs];
  const isMoreActive = moreTabs.some(t => t.id === view);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="logo" onClick={() => setView('grid')} style={{ cursor: 'pointer' }}>
            <span className="logo-text">indexes</span>
            <span className="logo-dot">.</span>
            <span className="logo-live">live</span>
          </div>
          <div className="header-controls">
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            {timeStr && (
              <div className="update-time">
                <span className="update-dot" />
                <span>{timeStr}</span>
              </div>
            )}
            <div className="live-badge">
              <span className="live-pulse" />
              LIVE
            </div>
          </div>
        </div>
        {/* Desktop nav */}
        <nav className="desktop-nav">
          {allTabs.map(tab => (
            <button key={tab.id}
              className={`view-btn ${tab.cls||''} ${view === tab.id ? 'view-active' : ''}`}
              onClick={() => setView(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-nav">
        {mainTabs.map(tab => (
          <button key={tab.id}
            className={`mnav-btn ${tab.cls||''} ${view === tab.id ? 'mnav-active' : ''}`}
            onClick={() => setView(tab.id)}>
            <span className="mnav-icon">{tab.icon}</span>
            <span className="mnav-label">{tab.label}</span>
          </button>
        ))}
        {/* More menu */}
        <div className="mnav-more-wrap" ref={moreRef}>
          <button
            className={`mnav-btn ${isMoreActive ? 'mnav-active' : ''}`}
            onClick={() => setMoreOpen(o => !o)}>
            <span className="mnav-icon">⋯</span>
            <span className="mnav-label">More</span>
          </button>
          {moreOpen && (
            <div className="mnav-more-menu">
              {moreTabs.map(tab => (
                <button key={tab.id}
                  className={`mnav-more-item ${tab.cls||''} ${view === tab.id ? 'mnav-more-active' : ''}`}
                  onClick={() => { setView(tab.id); setMoreOpen(false); }}>
                  <span className="mnav-more-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
