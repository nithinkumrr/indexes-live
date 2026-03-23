// src/components/Header.jsx
import AlertsBell from './AlertsBell';

export default function Header({ lastUpdate, usingSimulation, view, setView }) {
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
        {/* View toggle — Grid vs Map */}
        <div className="view-toggle">
          <button
            className={`view-btn ${view === 'grid' ? 'view-active' : ''}`}
            onClick={() => setView('grid')}
            title="Grid view"
          >
            ⊞ Grid
          </button>
          <button
            className={`view-btn ${view === 'map' ? 'view-active' : ''}`}
            onClick={() => setView('map')}
            title="World map view"
          >
            🌍 Map
          </button>
        </div>
        <AlertsBell />
        {usingSimulation && <div className="sim-badge">SIM</div>}
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
