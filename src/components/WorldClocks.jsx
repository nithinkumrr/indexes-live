// src/components/WorldClocks.jsx — scrollable, all 13 financial hubs
import { useState, useEffect } from 'react';
import { WORLD_CLOCKS } from '../data/markets';

function useTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
}

export default function WorldClocks() {
  useTick();
  return (
    <div className="clocks-strip">
      {WORLD_CLOCKS.map(({ city, tz, label, primary }) => {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', {
          timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });
        const date = now.toLocaleDateString('en-US', {
          timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
        });
        return (
          <div key={city} className={`clock-cell ${primary ? 'clock-primary' : ''}`}>
            <div className="clock-city">{city}</div>
            <div className="clock-time">{time}</div>
            <div className="clock-meta">{label} · {date}</div>
          </div>
        );
      })}
    </div>
  );
}
