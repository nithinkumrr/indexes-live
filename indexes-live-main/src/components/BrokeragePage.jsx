import { useState } from 'react';

const BROKERS = [
  {
    name: 'Zerodha', type: 'Discount', founded: 2010, logo: '🟩',
    equity: { delivery: '0', intraday: '0.03% or ₹20', futures: '0.03% or ₹20', options: '₹20/order' },
    demat: '₹300/yr', account: '₹200', min_brokerage: '₹20',
    features: ['Kite platform', 'Coin for MF', 'Streak algo', 'Sensibull options'],
    pros: ['Lowest cost', 'Best tech', 'Reliable uptime', 'Large community'],
    cons: ['No research', 'No 3-in-1 account', 'No NRI'],
    rating: 4.6, url: 'https://zerodha.com',
  },
  {
    name: 'Groww', type: 'Discount', founded: 2016, logo: '💚',
    equity: { delivery: '0', intraday: '0.05% or ₹20', futures: '0.05% or ₹20', options: '₹20/order' },
    demat: '₹0', account: '₹0', min_brokerage: '₹20',
    features: ['Clean UI', 'Mutual Funds', 'US Stocks', 'Fixed Deposits'],
    pros: ['Free account', 'Simple UI', 'Good for beginners', 'US stocks'],
    cons: ['Limited charting', 'No F&O features', 'Slower order exec'],
    rating: 4.2, url: 'https://groww.in',
  },
  {
    name: 'Upstox', type: 'Discount', founded: 2009, logo: '🟣',
    equity: { delivery: '0', intraday: '0.05% or ₹20', futures: '0.05% or ₹20', options: '₹20/order' },
    demat: '₹0', account: '₹0', min_brokerage: '₹20',
    features: ['Pro Web', 'Options Analytics', 'Smallcase', 'IPO'],
    pros: ['Free account', 'Good charts', 'RKSV backed', 'Quick KYC'],
    cons: ['App crashes', 'Support issues', 'Platform bugs'],
    rating: 3.9, url: 'https://upstox.com',
  },
  {
    name: 'Angel One', type: 'Discount', founded: 1996, logo: '🔴',
    equity: { delivery: '0', intraday: '0.25% or ₹20', futures: '0.25% or ₹20', options: '₹20/order' },
    demat: '₹240/yr', account: '₹0', min_brokerage: '₹20',
    features: ['SmartAPI', 'ARQ research', 'Margin funding', 'Algo trading'],
    pros: ['Research reports', 'Large network', 'Margin trading', 'Old brand'],
    cons: ['Higher intraday fees', 'Outdated UI', 'Pushy advisors'],
    rating: 3.8, url: 'https://angelone.in',
  },
  {
    name: 'HDFC Sky', type: 'Bank', founded: 2022, logo: '🔵',
    equity: { delivery: '0', intraday: '0.05% or ₹20', futures: '0.05% or ₹20', options: '₹20/order' },
    demat: '₹0', account: '₹0', min_brokerage: '₹20',
    features: ['3-in-1 account', 'Bank integration', 'Research', 'FD booking'],
    pros: ['3-in-1', 'Bank trust', 'Research reports', 'Easy funding'],
    cons: ['New platform', 'Limited tools', 'Bank bureaucracy'],
    rating: 3.7, url: 'https://hdfcsky.com',
  },
  {
    name: 'ICICI Direct', type: 'Full Service', founded: 2000, logo: '🟠',
    equity: { delivery: '0.55%', intraday: '0.275%', futures: '0.05%', options: '₹95/lot' },
    demat: '₹700/yr', account: '₹975', min_brokerage: '₹35',
    features: ['Research', '3-in-1 account', 'IPO', 'FD/bonds', 'Loans'],
    pros: ['Full service', 'Research', 'Bank backing', 'Portfolio reports'],
    cons: ['Very expensive', 'Old platform', 'High AMC charges'],
    rating: 3.5, url: 'https://icicidirect.com',
  },
];

const SEGMENTS = ['delivery', 'intraday', 'futures', 'options'];

export default function BrokeragePage() {
  const [selected, setSelected]   = useState(['zerodha', 'groww', 'upstox']);
  const [segment, setSegment]     = useState('delivery');
  const [showAll, setShowAll]     = useState(false);

  const toggleBroker = name => {
    const key = name.toLowerCase().replace(' ','_');
    setSelected(prev => prev.includes(key)
      ? prev.filter(k => k !== key)
      : [...prev, key].slice(-4));
  };

  const shown = BROKERS.filter(b => selected.includes(b.name.toLowerCase().replace(' ','_')) || showAll);

  return (
    <div className="brok-wrap">
      <div className="brok-header">
        <div>
          <div className="brok-title">Brokerage Comparison</div>
          <div className="brok-subtitle">Compare fees, features and platforms across Indian brokers</div>
        </div>
        <div className="brok-disclaimer">Data is approximate. Verify on broker's website before opening account.</div>
      </div>

      {/* Broker selector */}
      <div className="brok-selector">
        {BROKERS.map(b => {
          const key = b.name.toLowerCase().replace(' ','_');
          const active = selected.includes(key);
          return (
            <button key={b.name} className={`brok-sel-btn ${active ? 'brok-sel-active' : ''}`}
              onClick={() => toggleBroker(b.name)}>
              <span>{b.logo}</span>{b.name}
            </button>
          );
        })}
      </div>

      {/* Segment tabs */}
      <div className="brok-seg-tabs">
        {SEGMENTS.map(s => (
          <button key={s} className={`brok-seg-btn ${segment===s?'brok-seg-active':''}`}
            onClick={() => setSegment(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Comparison table */}
      <div className="brok-table-wrap">
        <table className="brok-table">
          <thead>
            <tr>
              <th className="brok-th-feat">Feature</th>
              {BROKERS.filter(b => selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b => (
                <th key={b.name}>{b.logo} {b.name}<div className="brok-th-type">{b.type}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="brok-tr-head"><td colSpan="99">Brokerage Charges</td></tr>
            <tr><td className="brok-td-label">Equity Delivery</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className={b.equity.delivery==='0'?'brok-td-green':'brok-td'}>{b.equity.delivery==='0'?'FREE':b.equity.delivery}</td>)}</tr>
            <tr><td className="brok-td-label">Intraday</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td">{b.equity.intraday}</td>)}</tr>
            <tr><td className="brok-td-label">F&O Futures</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td">{b.equity.futures}</td>)}</tr>
            <tr><td className="brok-td-label">F&O Options</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td">{b.equity.options}</td>)}</tr>
            <tr className="brok-tr-head"><td colSpan="99">Account Charges</td></tr>
            <tr><td className="brok-td-label">Account Opening</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className={b.account==='₹0'?'brok-td-green':'brok-td'}>{b.account==='₹0'?'FREE':b.account}</td>)}</tr>
            <tr><td className="brok-td-label">Demat AMC</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className={b.demat==='₹0'?'brok-td-green':'brok-td'}>{b.demat==='₹0'?'FREE':b.demat}</td>)}</tr>
            <tr className="brok-tr-head"><td colSpan="99">Platform &amp; Features</td></tr>
            <tr><td className="brok-td-label">Rating</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td"><span className="brok-rating">★ {b.rating}</span></td>)}</tr>
            <tr><td className="brok-td-label">Founded</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td">{b.founded}</td>)}</tr>
            <tr><td className="brok-td-label">Key Features</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td-feat-list">{b.features.slice(0,3).map((f,i)=><div key={i} className="brok-feature-tag">{f}</div>)}</td>)}</tr>
            <tr><td className="brok-td-label">Pros</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td-list">{b.pros.map((p,i)=><div key={i} className="brok-pro">✓ {p}</div>)}</td>)}</tr>
            <tr><td className="brok-td-label">Cons</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td-list">{b.cons.map((c,i)=><div key={i} className="brok-con">✗ {c}</div>)}</td>)}</tr>
            <tr><td className="brok-td-label">Open Account</td>{BROKERS.filter(b=>selected.includes(b.name.toLowerCase().replace(' ','_'))).map(b=><td key={b.name} className="brok-td"><a href={b.url} className="brok-open-btn" target="_blank" rel="noopener">Open →</a></td>)}</tr>
          </tbody>
        </table>
      </div>
      <div className="ipo-source">Charges as of 2025–26. GST + SEBI charges additional. Verify before opening account.</div>
    </div>
  );
}
