// src/components/Header.jsx
import AlertsBell from './AlertsBell';

export default function Header({ lastUpdate, usingSimulation }) {
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
        <AlertsBell />
        {usingSimulation && <div className="sim-badge">SIMULATED</div>}
        {timeStr && (
          <div className="update-time">
            <span className="update-dot" />
            <span>Updated {timeStr}</span>
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
