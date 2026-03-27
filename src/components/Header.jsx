import { useState, useEffect } from 'react';

export default function Header({ lastUpdate, view, setView }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('indexeslive_theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('indexeslive_theme', theme); } catch {}
  }, [theme]);

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : null;

  const tabs = [
    { id: 'grid',   label: 'Markets',   icon: '📊', cls: '' },
    { id: 'bubble', label: 'Sentiment', icon: '🫧', cls: '' },
    { id: 'fno',    label: 'F&O',       icon: '⚡', cls: '' },
    { id: 'gold',   label: 'Gold',      icon: '🥇', cls: 'tab-gold' },
    { id: 'ipo',    label: 'IPO',       icon: '🚀', cls: 'tab-teal' },
    { id: 'blog',   label: 'Insights',  icon: '📝', cls: 'tab-purple' },
    { id: 'calc',   label: 'Risk',       icon: '🎯', cls: '' },
  ];

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
        {/* Desktop nav — hidden on mobile */}
        <nav className="desktop-nav">
          {tabs.map(tab => (
            <button key={tab.id}
              className={`view-btn ${tab.cls} ${view === tab.id ? 'view-active' : ''}`}
              onClick={() => setView(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Mobile bottom tab bar — visible only on mobile */}
      <nav className="mobile-nav">
        {tabs.map(tab => (
          <button key={tab.id}
            className={`mnav-btn ${tab.cls} ${view === tab.id ? 'mnav-active' : ''}`}
            onClick={() => setView(tab.id)}>
            <span className="mnav-icon">{tab.icon}</span>
            <span className="mnav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
