// src/components/CountdownTimer.jsx
import { useState, useEffect } from 'react';
import { getIndiaMarketStatus, formatDuration } from '../utils/timezone';

export default function CountdownTimer() {
  const [status, setStatus] = useState(() => getIndiaMarketStatus());

  useEffect(() => {
    const id = setInterval(() => setStatus(getIndiaMarketStatus()), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = Math.max(0, Math.floor(status.secondsLeft));
  const display = formatDuration(secs);
  const isOpen = status.status === 'open';
  const isPre = status.status === 'pre';

  let bgClass = 'countdown-closed';
  if (isOpen) bgClass = 'countdown-open';
  else if (isPre) bgClass = 'countdown-pre';

  // Progress bar
  const progress = status.secsTotal ? Math.max(0, Math.min(1, 1 - secs / status.secsTotal)) : 0;

  return (
    <div className={`countdown-wrap ${bgClass}`}>
      <div className="countdown-left">
        <div className="countdown-label">
          {isOpen ? (
            <><span className="live-pulse" style={{ marginRight: 8 }} />NSE · TRADING LIVE</>
          ) : isPre ? (
            'NSE · PRE-OPEN'
          ) : status.status === 'weekend' ? (
            'NSE · WEEKEND'
          ) : (
            'NSE · NEXT OPEN'
          )}
        </div>
        <div className="countdown-time">{display}</div>
        {isOpen && (
          <div className="countdown-sub">Market closes at 15:30 IST</div>
        )}
        {!isOpen && (
          <div className="countdown-sub">
            {isPre ? 'Pre-open session active · Opens at 09:15 IST' : 'Opens 09:15 IST Mon–Fri'}
          </div>
        )}
      </div>
      {isOpen && (
        <div className="countdown-progress-wrap">
          <div className="countdown-progress-label">
            <span>09:15</span><span>15:30</span>
          </div>
          <div className="countdown-progress-bar">
            <div className="countdown-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
