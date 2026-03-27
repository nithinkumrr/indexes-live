import { useState, useMemo } from 'react';

const ACTIONS = [
  { icon: '⚡', label: 'Bid via Kite',           desc: 'Apply for open IPOs online',          url: 'https://zerodha.com/ipo/',                                                  color: '#4A9EFF' },
  { icon: '📊', label: 'Live GMP — InvestorGain', desc: 'Grey market premium tracker',          url: 'https://www.investorgain.com/report/live-ipo-gmp/331/',                    color: '#00C896' },
  { icon: '📊', label: 'Live GMP — IPO Watch',    desc: 'Grey market premium tracker',          url: 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/',             color: '#00C896' },
  { icon: '📋', label: 'Subscription status',    desc: 'Live bidding data on NSE',             url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',             color: '#6EE7B7' },
  { icon: '🎯', label: 'Allotment — KFintech',   desc: 'For IPOs with KFintech as registrar',  url: 'https://kosipo.kfintech.com/',                                             color: '#F59E0B' },
  { icon: '🎯', label: 'Allotment — Link Intime', desc: 'For IPOs with Link Intime as registrar', url: 'https://linkintime.co.in/MIPO/Ipoallotment.html',                      color: '#F59E0B' },
  { icon: '📄', label: 'DRHP / Prospectus',      desc: 'Official filings on NSE',              url: 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',             color: '#A78BFA' },
  { icon: '📅', label: 'IPO Calendar',            desc: 'All upcoming IPOs — Chittorgarh',      url: 'https://www.chittorgarh.com/report/ipo-in-india-list-main-board-sme/82/', color: '#A78BFA' },
];

const TABS = ['Calculator', 'Quick Links'];

function GmpCalc() {
  const [price,   setPrice]   = useState('');
  const [gmp,     setGmp]     = useState('');
  const [lotSize, setLotSize] = useState('');
  const [lots,    setLots]    = useState('1');

  const calc = useMemo(() => {
    const p  = parseFloat(price);
    const g  = parseFloat(gmp);
    const ls = parseInt(lotSize);
    const n  = parseInt(lots) || 1;
    if (!p || !ls) return null;
    const investment   = p * ls * n;
    const hasGmp       = !isNaN(g) && gmp !== '';
    const listingPrice = hasGmp ? p + g : null;
    const totalGain    = hasGmp ? g * ls * n : null;
    const returnPct    = hasGmp ? ((g / p) * 100) : null;
    const kostak       = hasGmp ? g * ls : null;
    return { investment, listingPrice, totalGain, returnPct, kostak, hasGmp, n };
  }, [price, gmp, lotSize, lots]);

  const pos = !calc?.hasGmp || calc?.returnPct >= 0;

  return (
    <div className="ipo-calc-wrap">
      <div className="ipo-calc-note">
        Enter price and lot size to calculate your investment. Add GMP from investorgain.com or ipowatch.in to see expected listing gain.
      </div>
      <div className="ipo-calc-grid">
        <div className="ipo-calc-inputs">
          <div className="ipo-calc-section-title">INPUTS</div>
          <div className="ipo-calc-field">
            <label>Issue Price (₹)</label>
            <input type="number" placeholder="e.g. 450" value={price}
              onChange={e => setPrice(e.target.value)} className="ipo-calc-input" />
          </div>
          <div className="ipo-calc-field">
            <label>Lot Size (shares)</label>
            <input type="number" placeholder="e.g. 33" value={lotSize}
              onChange={e => setLotSize(e.target.value)} className="ipo-calc-input" />
          </div>
          <div className="ipo-calc-field">
            <label>GMP ₹ <span className="ipo-calc-optional">optional</span></label>
            <input type="number" placeholder="e.g. 85" value={gmp}
              onChange={e => setGmp(e.target.value)} className="ipo-calc-input ipo-calc-gmp-input" />
          </div>
          <div className="ipo-calc-field">
            <label>Lots applying</label>
            <input type="number" placeholder="1" min="1" value={lots}
              onChange={e => setLots(e.target.value)} className="ipo-calc-input" />
          </div>
        </div>

        <div className="ipo-calc-output">
          <div className="ipo-calc-section-title">RESULT</div>
          {!calc ? (
            <div className="ipo-calc-empty">Enter issue price and lot size to begin</div>
          ) : (
            <>
              <div className="ipo-calc-hero">
                <div className="ipo-calc-hero-label">INVESTMENT ({calc.n} lot{calc.n > 1 ? 's' : ''})</div>
                <div className="ipo-calc-hero-val">₹{calc.investment.toLocaleString('en-IN')}</div>
              </div>
              {calc.hasGmp ? (
                <>
                  <div className="ipo-calc-divider" />
                  <div className="ipo-calc-row">
                    <span>Expected listing price</span>
                    <strong style={{color: pos ? 'var(--gain)' : 'var(--loss)'}}>₹{calc.listingPrice.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="ipo-calc-row">
                    <span>Expected gain</span>
                    <strong style={{color: pos ? 'var(--gain)' : 'var(--loss)'}}>{pos ? '+' : ''}₹{calc.totalGain.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="ipo-calc-row">
                    <span>Return on investment</span>
                    <strong style={{color: pos ? 'var(--gain)' : 'var(--loss)'}}>{pos ? '+' : ''}{calc.returnPct.toFixed(1)}%</strong>
                  </div>
                  <div className="ipo-calc-row">
                    <span>Kostak (gain per lot)</span>
                    <strong style={{color: pos ? 'var(--gain)' : 'var(--loss)'}}>{pos ? '+' : ''}₹{calc.kostak.toLocaleString('en-IN')}</strong>
                  </div>
                </>
              ) : (
                <div className="ipo-calc-no-gmp">Add GMP to see expected listing gain and return</div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="ipo-calc-disclaimer">
        GMP is unofficial grey market data. Not investment advice. Actual listing price may differ significantly.
      </div>
    </div>
  );
}

export default function IpoPage() {
  const [tab, setTab] = useState('Calculator');

  return (
    <div className="ipo-wrap">
      <div className="ipo-header">
        <div>
          <div className="ipo-title">IPO Hub</div>
          <div className="ipo-subtitle">GMP calculator · Apply · Subscription · Allotment</div>
        </div>
      </div>

      <div className="ipo-tabs">
        {TABS.map(t => (
          <button key={t} className={`ipo-tab ${tab === t ? 'ipo-tab-active' : ''}`}
            onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Calculator' && <GmpCalc />}

      {tab === 'Quick Links' && (
        <div className="ipo2-links-grid">
          {ACTIONS.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener" className="ipo2-link-card">
              <div className="ipo2-link-icon" style={{color: a.color}}>{a.icon}</div>
              <div className="ipo2-link-label">{a.label}</div>
              <div className="ipo2-link-desc">{a.desc}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
