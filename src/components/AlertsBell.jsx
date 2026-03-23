// src/components/AlertsBell.jsx — market open bell, minimal UI
import { useState, useEffect, useRef } from 'react';
import { ALERT_EVENTS } from '../data/markets';

function playBell(ctx) {
  const now = ctx.currentTime;
  [[880, 440, 0.25, 2.5], [1320, 660, 0.12, 2.0]].forEach(([f1, f2, vol, dur]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f2, now + 1.5);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur);
  });
}

export default function AlertsBell() {
  const [enabled, setEnabled] = useState(false);
  const [toast, setToast]     = useState(null);
  const audioRef  = useRef(null);
  const firedRef  = useRef(new Set());

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setEnabled(e => !e);
  };

  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const now = new Date();
      const istMin = (now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440;
      const h = Math.floor(istMin / 60), m = istMin % 60;
      for (const ev of ALERT_EVENTS) {
        const key = `${ev.id}-${now.toDateString()}`;
        if (ev.hIST === h && ev.mIST === m && !firedRef.current.has(key)) {
          firedRef.current.add(key);
          playBell(audioRef.current);
          setToast(ev.label);
          setTimeout(() => setToast(null), 4000);
        }
      }
    };
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [enabled]);

  return (
    <>
      <button className={`bell-btn ${enabled ? 'bell-on' : ''}`} onClick={toggle} title={enabled ? 'Disable market bells' : 'Enable market open/close bells'}>
        <span className="bell-icon">{enabled ? '🔔' : '🔕'}</span>
        <span className="bell-label">{enabled ? 'Bell on' : 'Bell'}</span>
      </button>
      {toast && (
        <div className="bell-toast">
          <span>🔔</span> {toast}
        </div>
      )}
    </>
  );
}
