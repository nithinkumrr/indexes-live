// Reusable wrapper that shows a clean two-line market hours tooltip on hover
import { useState } from 'react';

export default function HoursTooltip({ local, ist, children, className, style, ...rest }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className={className}
      style={{ ...style, position: 'relative' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      {...rest}
    >
      {children}
      {hov && (
        <div className="hours-tooltip">
          <div className="ht-local">{local}</div>
          {ist && (
            <div className="ht-ist">
              <span className="ht-flag">🇮🇳</span>
              <span>{ist}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
