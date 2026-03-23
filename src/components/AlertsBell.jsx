// src/components/AlertsBell.jsx
// Web Audio bell + market open/close notifications
import { useState, useEffect, useRef } from 'react';
import { ALERT_EVENTS } from '../data/markets';

function playBell(ctx) {
  const now = ctx.currentTime;
  // Primary tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1); gain1.connect(ctx.destination);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(440, now + 1.5);
  gain1.gain.setValueAtTime(0.25, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
  osc1.start(now); osc1.stop(now + 2.5);
  // Harmonic
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2); gain2.connect(ctx.destination);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1320, now);
  osc2.frequency.exponentialRampToValueAtTime(660, now + 1.5);
  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 2);
  osc2.start(now); osc2.stop(now + 2);
}

export default function AlertsBell() {
  const [enabled, setEnabled] = useState(false);
  const [toast, setToast] = useState(null);
  const audioRef = useRef(null);
  const firedRef = useRef(new Set());

  const enable = () => {
    // Must create AudioContext on user gesture
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setEnabled(e => !e);
  };

  // Check every 15 seconds if we should fire a bell
  useEffect(() => {
    if (!enabled) return;
    const check = () => {
      const now = new Date();
      const istOffset = 5.5 * 60; // IST = UTC+5:30
      const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
      const istMin = (utcMin + istOffset) % (24 * 60);
      const hIST = Math.floor(istMin / 60);
      const mIST = istMin % 60;

      for (const ev of ALERT_EVENTS) {
        const key = `${ev.id}-${now.toDateString()}`;
        if (ev.hIST === hIST && ev.mIST === mIST && !firedRef.current.has(key)) {
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
      <button
        className={`bell-btn ${enabled ? 'bell-on' : ''}`}
        onClick={enable}
        title={enabled ? 'Disable market alerts' : 'Enable market open/close alerts'}
      >
        {enabled ? '🔔' : '🔕'}
        <span className="bell-label">{enabled ? 'Alerts on' : 'Alerts'}</span>
      </button>
      {toast && (
        <div className="bell-toast">
          <span className="bell-toast-icon">🔔</span>
          {toast}
        </div>
      )}
    </>
  );
}
