import { useState, useEffect } from 'react';

export default function KiteConnect() {
  const [status, setStatus] = useState('disconnected');
  const [, ]     = useState(null); // not used

  useEffect(() => {
    // Check URL for kite=success/error after redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('kite') === 'success') {
      setStatus('connected');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (params.get('kite') === 'error') {
      setStatus('error');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Check if already authenticated
    fetch('/api/kite-data?type=status')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) { setStatus('connected');  }
        else { setStatus('disconnected'); }
      })
      .catch(() => setStatus('disconnected'));
  }, []);

  if (status === 'connected') {
    return (
      <div className="kite-status kite-connected">
        <span className="kite-dot" />
        <span>Kite connected</span>
        <span className="kite-note">· Access token valid until midnight IST</span>
      </div>
    );
  }

  return (
    <div className="kite-login-card">
      <div>
        <div className="kite-login-title">Connect Kite for live F&amp;O data</div>
        <div className="kite-login-desc">
          Log in once daily to unlock Gift Nifty live price, PCR, OI buildup and Max Pain.
          Token expires at midnight IST.
        </div>
        {status === 'error' && <div className="kite-error">Login failed — please try again</div>}
      </div>
      <a href="/api/kite-auth" className="kite-login-btn">Login with Kite</a>
    </div>
  );
}
