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


  // SVG icons for each nav section
  const NavIcon = ({ id, size = 20 }) => {
    const s = { width: size, height: size, display: 'block' };
    const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch(id) {
      case 'grid': return ( // Candlestick chart
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <rect x="2.5" y="9" width="3" height="8" rx="0.5"/>
          <line x1="4" y1="9" x2="4" y2="6"/><line x1="4" y1="17" x2="4" y2="19"/>
          <rect x="8.5" y="5" width="3" height="9" rx="0.5"/>
          <line x1="10" y1="5" x2="10" y2="2"/><line x1="10" y1="14" x2="10" y2="16"/>
          <rect x="14.5" y="7" width="3" height="7" rx="0.5"/>
          <line x1="16" y1="7" x2="16" y2="4"/><line x1="16" y1="14" x2="16" y2="17"/>
        </svg>
      );
      case 'bubble': return ( // Sentiment gauge
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <path d="M3 14a7 7 0 0 1 14 0"/>
          <path d="M3 14a7 7 0 0 1 5-6.7" strokeOpacity="0.4"/>
          <line x1="10" y1="14" x2="7" y2="8" strokeWidth="1.8"/>
          <circle cx="10" cy="14" r="1.2" fill="currentColor" stroke="none"/>
          <line x1="4.5" y1="14" x2="3" y2="14" strokeWidth="1.2"/>
          <line x1="15.5" y1="14" x2="17" y2="14" strokeWidth="1.2"/>
        </svg>
      );
      case 'fno': return ( // Options payoff - breakeven V shape
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <polyline points="2,15 8,6 10,10 12,6 18,15"/>
          <line x1="2" y1="15" x2="18" y2="15" strokeOpacity="0.3"/>
        </svg>
      );
      case 'mtf': return ( // Margin/leverage - stacked ascending bars
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <rect x="2" y="12" width="4" height="6" rx="0.5"/>
          <rect x="8" y="7" width="4" height="11" rx="0.5"/>
          <rect x="14" y="3" width="4" height="15" rx="0.5"/>
          <line x1="2" y1="12" x2="6" y2="7" strokeOpacity="0.5" strokeDasharray="1,1.5"/>
          <line x1="8" y1="7" x2="14" y2="3" strokeOpacity="0.5" strokeDasharray="1,1.5"/>
        </svg>
      );
      case 'delivery': return ( // Top delivery - stock transfer arrow on box
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <rect x="3" y="9" width="14" height="9" rx="1"/>
          <path d="M7 9V7a3 3 0 0 1 6 0v2"/>
          <polyline points="10,3 10,7"/><polyline points="8,5 10,3 12,5"/>
        </svg>
      );
      case 'ipo': return ( // IPO - rocket launch
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <path d="M10 2c0 0 4 3 4 8l-4 2-4-2c0-5 4-8 4-8z"/>
          <path d="M6 10l-2 3 2 0 0 3 2-3"/>
          <path d="M14 10l2 3-2 0 0 3-2-3"/>
          <circle cx="10" cy="9" r="1.5" strokeWidth="1.4"/>
        </svg>
      );
      case 'calculators': return ( // Calculator grid
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <rect x="3" y="2" width="14" height="16" rx="2"/>
          <rect x="5.5" y="4.5" width="9" height="4" rx="0.8" strokeWidth="1.2"/>
          <circle cx="6.5" cy="13" r="1" fill="currentColor" stroke="none"/>
          <circle cx="10" cy="13" r="1" fill="currentColor" stroke="none"/>
          <circle cx="13.5" cy="13" r="1" fill="currentColor" stroke="none"/>
          <circle cx="6.5" cy="16" r="1" fill="currentColor" stroke="none"/>
          <circle cx="10" cy="16" r="1" fill="currentColor" stroke="none"/>
          <circle cx="13.5" cy="16" r="1" fill="currentColor" stroke="none"/>
        </svg>
      );
      case 'gold': return ( // Gold nugget
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <path d="M10 3c2 0 5 1.5 6 4 1 2 0 5-2 6.5-1.5 1.2-4 2-6 1-2.5-1-4-3.5-3.5-6C5 6 7.5 3 10 3z"/>
          <line x1="8" y1="7" x2="9" y2="9" strokeOpacity="0.45" strokeWidth="1.1"/>
          <line x1="12" y1="8" x2="11" y2="11" strokeOpacity="0.45" strokeWidth="1.1"/>
        </svg>
      );
      case 'brokers': return ( // Brokers - balance/compare scales
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <line x1="10" y1="2" x2="10" y2="18"/>
          <line x1="6" y1="2" x2="14" y2="2"/>
          <path d="M4 6L2 10h4L4 6z"/><path d="M4 10a2 2 0 0 0 2-2"/>
          <path d="M4 10a2 2 0 0 1-2-2"/>
          <path d="M16 6l-2 4h4l-2-4z"/><path d="M16 10a2 2 0 0 0 2-2"/>
          <path d="M16 10a2 2 0 0 1-2-2"/>
          <line x1="7" y1="18" x2="13" y2="18"/>
        </svg>
      );
      case 'insights': return ( // Insights - eye with chart line
        <svg style={s} viewBox="0 0 20 20" {...p}>
          <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
          <circle cx="10" cy="10" r="2.5"/>
          <polyline points="6,12 9,8 11,11 13,8" strokeWidth="1.2" stroke="currentColor"/>
        </svg>
      );
      default: return <span>···</span>;
    }
  };

  // Desktop order: Markets · Sentiment · F&O · MTF · Top Delivery · IPO · Calculators · Gold · Brokers · Insights
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
