import { useState, useEffect } from 'react';
import AlertsBell from './AlertsBell';

export default function Header({ lastUpdate, view, setView }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('indexeslive_theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('indexeslive_theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const timeStr = lastUpdate
    ? lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : null;

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
          <button className={`view-btn ${view === 'grid' ? 'view-active' : ''}`} onClick={() => setView('grid')}>
            Markets
          </button>
          <button className={`view-btn ${view === 'bubble' ? 'view-active' : ''}`} onClick={() => setView('bubble')}>
            Sentiment
          </button>
          <button className={`view-btn fno-btn ${view === 'fno' ? 'view-active' : ''}`} onClick={() => setView('fno')}>
            F&amp;O
          </button>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <AlertsBell />
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
