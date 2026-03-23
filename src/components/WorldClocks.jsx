// src/components/WorldClocks.jsx
import { useState, useEffect } from 'react';
import { WORLD_CLOCKS } from '../data/markets';
import { MARKETS } from '../data/markets';
import { getLocalTime, isMarketOpen } from '../utils/timezone';

export default function WorldClocks() {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="clocks-bar">
      {WORLD_CLOCKS.map(ck => {
        const time = getLocalTime(ck.tz, { seconds: true });
        const active = MARKETS.some(m => m.tz === ck.tz && isMarketOpen(m));
        return (
          <div key={ck.city} className={`clock-item ${ck.primary ? 'clock-primary' : ''}`}>
            <div className="clock-city">{ck.city}</div>
            <div className="clock-time">{time}</div>
            <div className="clock-label">
              <span className={`clock-dot ${active ? 'dot-live' : 'dot-off'}`} />
              {ck.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
