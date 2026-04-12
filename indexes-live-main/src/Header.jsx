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


  // SVG icons — refined, 1.75px stroke, rounded caps
  const NavIcon = ({ id, size = 20 }) => {
    const s = { width: size, height: size, display: 'block' };
    const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch(id) {
      case 'grid': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <polyline points="3,17 8,10 13,14 19,6"/>
          <line x1="3" y1="20" x2="21" y2="20"/>
        </svg>
      );
      case 'bubble': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M5 17A7 7 0 0 1 19 17"/>
          <line x1="12" y1="17" x2="8" y2="11"/>
          <circle cx="12" cy="17" r="1.3" fill="currentColor" stroke="none"/>
        </svg>
      );
      case 'fno': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>
        </svg>
      );
      case 'mtf': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M12 4L21 19H3L12 4z"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      );
      case 'delivery': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <rect x="2" y="8" width="20" height="13" rx="2"/>
          <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="2" y1="14" x2="22" y2="14"/>
        </svg>
      );
      case 'ipo': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M12 2c0 0 5 3 5 9l-5 3-5-3c0-6 5-9 5-9z"/>
          <path d="M7 11l-3 4 3-.5v3l2.5-3.5"/>
          <path d="M17 11l3 4-3-.5v3l-2.5-3.5"/>
          <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      );
      case 'calculators': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <rect x="6.5" y="4.5" width="11" height="5" rx="1"/>
          <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/>
        </svg>
      );
      case 'gold': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M12 2l7 4v8l-7 4-7-4V6z"/>
          <path d="M12 6l4 2.3v4.7L12 15.3 8 13V8.3z" strokeOpacity="0.4"/>
        </svg>
      );
      case 'brokers': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <line x1="3" y1="20" x2="21" y2="20"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <polyline points="3,10 12,3 21,10"/>
          <line x1="7" y1="10" x2="7" y2="20"/>
          <line x1="12" y1="10" x2="12" y2="20"/>
          <line x1="17" y1="10" x2="17" y2="20"/>
        </svg>
      );
      case 'insights': return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      );
      default: return <span style={{fontSize:size*0.7}}>···</span>;
    }
  };t · F&O · MTF · Top Delivery · IPO · Calculators · Gold · Brokers · Insights
  const mainTabs = [
    { id: 'grid',        label: 'Markets',      icon: '◈' },
    { id: 'bubble',      label: 'Sentiment',    icon: '◉' },
    { id: 'fno',         label: 'F&O',          icon: '◬' },
    { id: 'mtf',         label: 'MTF',          icon: '◫' },
    { id: 'delivery',    label: 'Top Delivery', icon: '◈' },
    { id: 'ipo',         label: 'IPO',          icon: '◎', cls: 'tab-teal' },
    { id: 'calculators', label: 'Calculators',  icon: '⊞' },
    { id: 'gold',        label: 'Gold',         icon: '◆', cls: 'tab-gold' },
    { id: 'brokers',     label: 'Brokers',      icon: '⊞' },
    { id: 'insights',    label: 'Insights',     icon: '◐', cls: 'tab-purple' },
  ];

  // Mobile "More" menu: Calculators · Gold · Brokers · Insights
  const mobilePrimary = [
    { id: 'grid',     label: 'Markets',   icon: '◈' },
    { id: 'bubble',   label: 'Sentiment', icon: '◉' },
    { id: 'fno',      label: 'F&O',       icon: '◬' },
    { id: 'mtf',      label: 'MTF',       icon: '◫' },
    { id: 'delivery', label: 'Delivery',  icon: '◈' },
    { id: 'ipo',      label: 'IPO',       icon: '◎', cls: 'tab-teal' },
  ];
  const moreTabs = [
    { id: 'calculators', label: 'Calculators', icon: '⊞' },
    { id: 'gold',        label: 'Gold',        icon: '◆', cls: 'tab-gold' },
    { id: 'brokers',     label: 'Brokers',     icon: '⊞' },
    { id: 'insights',    label: 'Insights',    icon: '◐', cls: 'tab-purple' },
  ];

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
          {mainTabs.map(tab => (
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
        {mobilePrimary.map(tab => (
          <button key={tab.id}
            className={`mnav-btn ${tab.cls||''} ${view === tab.id ? 'mnav-active' : ''}`}
            onClick={() => setView(tab.id)}>
            <span className="mnav-icon"><NavIcon id={tab.id} size={20}/></span>
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
                  <span className="mnav-more-icon"><NavIcon id={tab.id} size={18}/></span>
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
