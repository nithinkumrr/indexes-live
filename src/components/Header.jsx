import { useState, useEffect } from 'react';
import AlertsBell from './AlertsBell';

export default function Header({ lastUpdate }) {
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
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle light/dark">
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
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
