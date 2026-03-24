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
    { id: 'grid',      label: 'Markets' },
    { id: 'bubble',    label: 'Sentiment' },
    { id: 'fno',       label: 'F&O' },
    { id: 'gold',      label: 'Gold', cls: 'tab-gold' },
    { id: 'ipo',       label: 'IPO',  cls: 'tab-teal' },
    { id: 'blog',      label: 'Insights', cls: 'tab-purple' },
  ];

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <span className="logo-text">indexes</span>
          <span className="logo-dot">.</span>
          <span className="logo-live">live</span>
        </div>
      </div>
      <div className="header-right">
        <div className="view-toggle">
          {tabs.map(tab => (
            <button key={tab.id}
              className={`view-btn ${tab.cls || ''} ${view === tab.id ? 'view-active' : ''}`}
              onClick={() => setView(tab.id)}
              dangerouslySetInnerHTML={{ __html: tab.label }}
            />
          ))}
        </div>
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
    </header>
  );
}
