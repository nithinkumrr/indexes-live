// KiteConnect.jsx — login status + connect button for F&O page
import { useState, useEffect } from 'react';

export default function KiteConnect({ onAuthenticated }) {
  const [status, setStatus]   = useState('checking'); // checking | connected | disconnected | error
  const [user, setUser]       = useState(null);

  useEffect(() => {
    // Check if already authenticated
    fetch('/api/kite-data?type=status')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) {
          setStatus('connected');
          setUser(d.user);
          onAuthenticated?.(true);
        } else {
          setStatus('disconnected');
          onAuthenticated?.(false);
        }
      })
      .catch(() => setStatus('disconnected'));

    // Check URL for kite=success/error after redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('kite') === 'success') {
      setStatus('connected');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('kite') === 'error') {
      setStatus('error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (status === 'checking') return null;

  if (status === 'connected') {
    return (
      <div className="kite-status kite-connected">
        <span className="kite-dot" />
        <span>Kite connected{user ? ` · ${user}` : ''}</span>
        <span className="kite-note">Access token valid until midnight IST</span>
      </div>
    );
  }

  return (
    <div className="kite-login-wrap">
      <div className="kite-login-card">
        <div className="kite-login-title">Connect Kite for live F&amp;O data</div>
        <div className="kite-login-desc">
          Log in once daily to unlock Gift Nifty live price, PCR, OI buildup and Max Pain.
          Access token expires at midnight IST — one login per day.
        </div>
        <a href="/api/kite-auth" className="kite-login-btn">
          Login with Kite
        </a>
        {status === 'error' && (
          <div className="kite-error">Login failed — please try again</div>
        )}
      </div>
    </div>
  );
}
