import { useState, useMemo } from 'react';

// ── DATA ──────────────────────────────────────────────────────────────────────
// Regulatory charges on ₹50K delivery trade — identical at ALL brokers
const GOVT_CHARGES_50K = 111.51;

const BROKERS = [
  {
    id: 'zerodha', name: 'Zerodha', type: 'discount',
    tagline: 'Built the discount revolution in India. Transparent, reliable, consistently well-governed.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: { pct: 0.03, flat: 20 }, intradayLabel: '0.03% or ₹20',
    futures: { pct: 0.03, flat: 20 }, futuresLabel: '0.03% or ₹20',
    options: { flat: 20 }, optionsLabel: '₹20/order',
    dp: 15.34, dpLabel: '₹13 + GST',
    amc: 88.50, amcLabel: '₹75 + GST/yr',
    mtfInterest: 14.6, mtfBrokerage: 'Min(0.3%, ₹20)',
    callTrade: 59, squareOff: 59,
    total50k: 126.85,
    strengths: ['Platform reliability', 'Kite — best UI in India', 'Transparent pricing', 'Kite Connect API', 'No hidden charges', 'Strong compliance track record'],
    watch: ['AMC of ₹88.50/yr', 'No MTF for all stocks', 'Call & trade is ₹59/order'],
    best: ['equity', 'options', 'algo'],
    url: 'https://zerodha.com',
  },
  {
    id: 'dhan', name: 'Dhan', type: 'discount',
    tagline: 'Zero AMC, lowest DP charge, strong mobile experience.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: { pct: 0.03, flat: 20 }, intradayLabel: '0.03% or ₹20',
    futures: { pct: 0.03, flat: 20 }, futuresLabel: '0.03% or ₹20',
    options: { flat: 20 }, optionsLabel: '₹20/order',
    dp: 14.75, dpLabel: '₹12.5 + GST',
    amc: 0, amcLabel: 'Zero',
    mtfInterest: 13.49, mtfBrokerage: 'Min(0.03%, ₹20)',
    callTrade: 59, squareOff: 24,
    total50k: 126.26,
    strengths: ['Zero AMC', 'Lowest DP charge (₹14.75)', 'Clean mobile app', 'MTF at 12.49% for small amounts'],
    watch: ['Newer platform', 'MTF rate rises with amount', 'Less institutional track record'],
    best: ['equity', 'beginner'],
    url: 'https://dhan.co',
  },
  {
    id: 'mstock', name: 'mStock', type: 'discount',
    tagline: 'Mirae Asset backed. Zero delivery brokerage but watch the quarterly AMC.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: { flat: 5 }, intradayLabel: '₹5/order',
    futures: null, futuresLabel: '—',
    options: null, optionsLabel: '—',
    dp: 21.24, dpLabel: '₹18 + GST',
    amc: 1036, amcLabel: '₹219+GST/quarter',
    mtfInterest: 14.99, mtfBrokerage: '₹5/order',
    callTrade: 0, squareOff: 0,
    total50k: 132.75,
    strengths: ['Zero delivery brokerage', '₹5 intraday', 'Strong parent (Mirae Asset)'],
    watch: ['AMC: ₹219+GST per quarter = ~₹1,036/yr if active', 'Check if AMC is waived for you'],
    best: ['equity'],
    url: 'https://mstock.co.in',
  },
  {
    id: 'fyers', name: 'Fyers', type: 'discount',
    tagline: 'Clean charts, zero AMC, popular with options and algo traders.',
    delivery: null, deliveryLabel: '₹20 or 0.3%',
    intraday: { pct: 0.03, flat: 20 }, intradayLabel: '0.03% or ₹20',
    futures: { pct: 0.03, flat: 20 }, futuresLabel: '0.03% or ₹20',
    options: { flat: 20 }, optionsLabel: '₹20/order',
    dp: 14.75, dpLabel: '₹12.5 + GST',
    amc: 0, amcLabel: 'Zero',
    mtfInterest: 15.49, mtfBrokerage: 'Min(0.3%, ₹20)',
    callTrade: 59, squareOff: 59,
    total50k: 173.46,
    strengths: ['Clean charting platform', 'Zero AMC', 'Low DP charge', 'Options trader favourite'],
    watch: ['Delivery has brokerage (₹20 or 0.3%)', 'Higher MTF interest'],
    best: ['options', 'algo'],
    url: 'https://fyers.in',
  },
  {
    id: 'groww', name: 'Groww', type: 'discount',
    tagline: '37 million users. Strong for beginners and mutual fund investors.',
    delivery: null, deliveryLabel: '₹5–₹20',
    intraday: { pct: 0.1, flat: 20 }, intradayLabel: '0.1% or ₹20',
    futures: { flat: 20 }, futuresLabel: '₹20/order',
    options: { flat: 20 }, optionsLabel: '₹20/order',
    dp: 20, dpLabel: '₹20/scrip',
    amc: 0, amcLabel: 'Zero',
    mtfInterest: 14.95, mtfBrokerage: '0.1%/order',
    callTrade: 0, squareOff: 59,
    total50k: 178.71,
    strengths: ['Zero AMC', 'Strong mutual fund section', 'Very easy onboarding', 'Large user base = good support'],
    watch: ['Higher DP charge (₹20)', 'Brokerage on delivery', 'Not the cheapest for active traders'],
    best: ['beginner', 'mf'],
    url: 'https://groww.in',
  },
  {
    id: 'upstox', name: 'Upstox', type: 'discount',
    tagline: 'Backed by Ratan Tata and Tiger Global. Flat ₹20 delivery, developer-friendly API.',
    delivery: null, deliveryLabel: '₹20 flat',
    intraday: { pct: 0.1, flat: 20 }, intradayLabel: '0.1% or ₹20',
    futures: { pct: 0.05, flat: 20 }, futuresLabel: '0.05% or ₹20',
    options: { flat: 20 }, optionsLabel: '₹20/order',
    dp: 20, dpLabel: '₹20/scrip',
    amc: 300, amcLabel: '₹300/yr',
    mtfInterest: null, mtfBrokerage: '₹20/order',
    callTrade: 104, squareOff: 104,
    total50k: 178.71,
    strengths: ['Strong API', 'Backed by credible investors', 'Developer ecosystem'],
    watch: ['AMC ₹300/yr', 'Higher DP charge', 'Call & trade is ₹104/order'],
    best: ['algo', 'equity'],
    url: 'https://upstox.com',
  },
  {
    id: 'angelone', name: 'Angel One', type: 'discount',
    tagline: 'One of India\'s oldest brokers, now discount. Strong tier-2/3 city presence.',
    delivery: null, deliveryLabel: '₹2–₹20',
    intraday: { flat: 20 }, intradayLabel: '₹20/order',
    futures: { flat: 20 }, futuresLabel: '₹20/order',
    options: { flat: 20 }, optionsLabel: '₹20/order',
    dp: 20, dpLabel: '₹20/scrip',
    amc: 283, amcLabel: '₹240+GST/yr',
    mtfInterest: 14.99, mtfBrokerage: 'Min(0.1%, ₹20)',
    callTrade: 24, squareOff: 24,
    total50k: 178.71,
    strengths: ['Long track record', 'Advisory services', 'Strong support network'],
    watch: ['AMC ₹283/yr', 'Higher DP charge', 'Brokerage on delivery'],
    best: ['equity', 'beginner'],
    url: 'https://www.angelone.in',
  },
  {
    id: '5paisa', name: '5paisa', type: 'discount',
    tagline: 'Part of IIFL Group. Flat ₹20 across all segments. Higher DP charge.',
    delivery: null, deliveryLabel: '₹20 flat',
    intraday: null, intradayLabel: '₹20/order',
    futures: null, futuresLabel: '—',
    options: null, optionsLabel: '—',
    dp: 23.60, dpLabel: '₹20+GST/scrip',
    amc: 354, amcLabel: '₹354/yr',
    mtfInterest: 16.425, mtfBrokerage: '₹20/order',
    callTrade: 0, squareOff: 59,
    total50k: 182.31,
    strengths: ['Simple flat pricing', 'IIFL Group backing'],
    watch: ['Highest DP charge of discount brokers', 'AMC ₹354/yr', 'Higher MTF interest'],
    best: ['beginner'],
    url: 'https://5paisa.com',
  },
  {
    id: 'kotak', name: 'Kotak Securities', type: 'full',
    tagline: 'Kotak Bank subsidiary. Full-service research. Best for Kotak banking customers.',
    delivery: null, deliveryLabel: '0.20%',
    intraday: null, intradayLabel: '0.05%',
    futures: { flat: 10 }, futuresLabel: '₹10/order',
    options: null, optionsLabel: '—',
    dp: 20, dpLabel: '0.04% min ₹20',
    amc: 600, amcLabel: '₹600/yr',
    mtfInterest: 14.99, mtfBrokerage: '0.2% or 0.1%',
    callTrade: 58, squareOff: 58,
    total50k: 367.51,
    strengths: ['3-in-1 account with Kotak Bank', 'Research and advisory', 'Trusted name'],
    watch: ['Expensive for self-directed traders', '3× cost of discount brokers'],
    best: ['bank_customer'],
    url: 'https://kotaksecurities.com',
  },
  {
    id: 'icici', name: 'ICICI Direct', type: 'full',
    tagline: 'ICICI Bank subsidiary. 3-in-1 account. Expensive but plan-dependent.',
    delivery: null, deliveryLabel: '0.25%',
    intraday: null, intradayLabel: '0.05%',
    futures: null, futuresLabel: 'Plan-based',
    options: null, optionsLabel: 'Plan-based',
    dp: 23.60, dpLabel: '₹23.60/scrip',
    amc: 826, amcLabel: '₹826 incl. GST',
    mtfInterest: 17.99, mtfBrokerage: '0.22–0.07%',
    callTrade: 30, squareOff: 59,
    total50k: 430.11,
    strengths: ['Deep ICICI Bank integration', '3-in-1 account', 'Research coverage'],
    watch: ['Most expensive plan structure', '3.4× cost vs discount', 'Highest MTF rate at 17.99%'],
    best: ['bank_customer'],
    url: 'https://icicidirect.com',
  },
  {
    id: 'axis', name: 'Axis Securities', type: 'full',
    tagline: 'Axis Bank subsidiary. Zero DP charge, but brokerage minimums are steep.',
    delivery: null, deliveryLabel: '0.5% min ₹25',
    intraday: null, intradayLabel: '0.05%',
    futures: null, futuresLabel: '0.05%',
    options: null, optionsLabel: '₹20/order',
    dp: 0, dpLabel: 'Zero',
    amc: 885, amcLabel: '₹885/yr',
    mtfInterest: 17.99, mtfBrokerage: '0.5% min ₹25',
    callTrade: 50, squareOff: 59,
    total50k: 701.51,
    strengths: ['Zero DP charge', 'Axis Bank integration'],
    watch: ['Highest delivery brokerage (0.5%)', 'Highest AMC (₹885)', 'Near most expensive'],
    best: ['bank_customer'],
    url: 'https://axisdirect.in',
  },
  {
    id: 'hdfc', name: 'HDFC Securities', type: 'full',
    tagline: 'HDFC Bank subsidiary. India\'s most expensive broker by total cost.',
    delivery: null, deliveryLabel: '0.5% min ₹25',
    intraday: null, intradayLabel: '0.05%',
    futures: null, futuresLabel: '0.025% or ₹25',
    options: null, optionsLabel: '—',
    dp: 30, dpLabel: '0.04% min ₹30',
    amc: 885, amcLabel: '₹885/yr',
    mtfInterest: null, mtfBrokerage: '0.32% or ₹25',
    callTrade: 0, squareOff: 0,
    total50k: 721.51,
    strengths: ['3-in-1 HDFC Bank integration', 'Research and advisory'],
    watch: ['Highest DP charge (₹30)', 'Highest total cost (₹721 vs ₹126 at Dhan)', 'AMC ₹885/yr'],
    best: ['bank_customer'],
    url: 'https://hdfcsec.com',
  },
];

const CHARGE_EXPLAINERS = [
  { name: 'Brokerage', who: 'Broker', type: 'variable', note: 'The per-order fee charged by your broker. This is what varies most between brokers. Many discount brokers charge zero on delivery.' },
  { name: 'DP Charge', who: 'Broker + Depository', type: 'variable', note: 'Charged every time you sell shares from your demat (once per scrip per day). Ranges from ₹13.50 to ₹30 depending on broker. Unavoidable when you sell.' },
  { name: 'AMC', who: 'Broker', type: 'variable', note: 'Annual Maintenance Charge for your demat account. Ranges from ₹0 to ₹885/year. Many discount brokers charge nothing.' },
  { name: 'STT', who: 'Government', type: 'fixed', note: '0.1% on the sell side for delivery equity. Non-negotiable. Identical at every broker in India.' },
  { name: 'Exchange Fee', who: 'NSE/BSE', type: 'fixed', note: '~0.00297% of turnover for NSE equity delivery. Identical everywhere. Goes to the exchange, not the broker.' },
  { name: 'SEBI Fee', who: 'SEBI', type: 'fixed', note: '₹10 per crore of turnover. Regulatory charge. Identical at every broker.' },
  { name: 'Stamp Duty', who: 'State Govt', type: 'fixed', note: '0.015% of turnover on buy side. State government charge. Non-negotiable.' },
  { name: 'GST', who: 'Government', type: 'fixed', note: '18% GST on brokerage and transaction charges only. If brokerage is zero, GST on brokerage is also zero.' },
];

const TRADER_TYPES = [
  {
    label: 'Long-term Investor',
    icon: '📈',
    desc: 'Buy and hold. Low turnover. Delivery only.',
    key_charges: ['DP charge per sell', 'AMC per year', 'Delivery brokerage'],
    picks: ['zerodha', 'dhan', 'mstock'],
    reasoning: 'Zero delivery brokerage matters most. DP charge hits every time you sell. Zero AMC saves ₹88-885/year for inactive accounts.',
  },
  {
    label: 'Active Intraday Trader',
    icon: '⚡',
    desc: 'High frequency, all segments, intraday focus.',
    key_charges: ['Intraday brokerage per order', 'Auto square-off charges', 'Call & trade cost'],
    picks: ['zerodha', 'dhan', 'fyers'],
    reasoning: 'Flat ₹20 cap on intraday orders at discount brokers means high-turnover traders pay the same per-order regardless of size. Platform reliability matters more than AMC.',
  },
  {
    label: 'Options Trader',
    icon: '🎯',
    desc: 'F&O focus. Multiple strikes, frequent orders.',
    key_charges: ['Options brokerage per lot', 'Margin charges', 'Auto square-off'],
    picks: ['zerodha', 'dhan', 'fyers'],
    reasoning: 'Most discount brokers charge flat ₹20/order for options. Platform quality, Greeks display, and order execution speed matter more than the marginal cost difference.',
  },
  {
    label: 'MTF User',
    icon: '🔄',
    desc: 'Margin Trading Facility. Buy more than your balance.',
    key_charges: ['MTF interest rate', 'MTF brokerage', 'Pledge/unpledge charges'],
    picks: ['dhan', 'zerodha'],
    reasoning: 'MTF interest compounds daily. Dhan offers 12.49% for amounts up to ₹5L. Zerodha at 14.6% is consistent and simple. Avoid ICICI/Axis at 17.99% for MTF.',
  },
];

const fmt = v => v != null ? v.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

const TABS = ['Rankings', 'Calculator', 'Charges Explained', 'Who Should Use What'];

export default function BrokersPage() {
  const [tab,        setTab]    = useState('Rankings');
  const [sortBy,     setSortBy] = useState('total50k');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tradeVal,   setTradeVal]   = useState('50000');
  const [segment,    setSegment]    = useState('delivery');
  const [expanded,   setExpanded]   = useState(null);

  // Sort and filter brokers
  const sorted = useMemo(() => {
    let list = [...BROKERS];
    if (typeFilter !== 'all') list = list.filter(b => b.type === typeFilter);
    list.sort((a, b) => (a[sortBy] ?? 9999) - (b[sortBy] ?? 9999));
    return list;
  }, [sortBy, typeFilter]);

  // Calculator
  const tv = parseFloat(tradeVal) || 0;
  const calcResults = useMemo(() => {
    if (!tv) return [];
    return BROKERS.map(b => {
      let brokerage = 0;
      if (segment === 'delivery') {
        if (b.delivery === 0) brokerage = 0;
        else if (b.id === 'fyers') brokerage = Math.min(20, tv * 0.003);
        else if (['groww','angelone'].includes(b.id)) brokerage = Math.min(20, Math.max(2, tv * 0.001));
        else if (b.id === 'kotak') brokerage = tv * 0.002;
        else if (['icici','axis','hdfc'].includes(b.id)) brokerage = Math.max(25, tv * 0.005);
        else brokerage = Math.min(20, tv * 0.001);
      } else if (segment === 'intraday') {
        brokerage = Math.min(20, tv * 0.0003);
        if (['kotak','icici'].includes(b.id)) brokerage = Math.max(25, tv * 0.0005);
        if (b.id === 'mstock') brokerage = 5;
      } else if (segment === 'options') {
        brokerage = 20;
        if (b.id === 'kotak') brokerage = 10;
        if (b.id === 'icici') brokerage = Math.max(100, tv * 0.01);
      }
      const gst      = brokerage * 0.18;
      // Govt charges scale with trade value
      const stt      = segment === 'delivery' ? tv * 0.001 : segment === 'intraday' ? tv * 0.00025 : 0;
      const exchFee  = tv * 0.0000297;
      const sebiFee  = tv / 10000000 * 10;
      const stampDuty= segment !== 'options' ? tv * 0.00015 : 0;
      const govtTotal= stt + exchFee + sebiFee + stampDuty;
      const total    = brokerage + gst + govtTotal;
      return { ...b, brokerage, gst, govtTotal, total };
    }).sort((a, b) => a.total - b.total);
  }, [tv, segment]);

  const rank = b => sorted.indexOf(b) + 1;

  return (
    <div className="brk-wrap">

      {/* HEADER */}
      <div className="brk-header">
        <div>
          <div className="brk-title">Broker Charges in India</div>
          <div className="brk-sub">Every charge, calculated. {BROKERS.length} brokers. No affiliates.</div>
        </div>
        <div className="brk-insight">
          <div className="brk-insight-num">₹111.51</div>
          <div className="brk-insight-label">in govt + exchange charges on every ₹50K delivery trade — identical at all {BROKERS.length} brokers. Only brokerage, DP charge and AMC vary.</div>
        </div>
      </div>

      {/* TABS */}
      <div className="brk-tabs">
        {TABS.map(t => (
          <button key={t} className={`brk-tab ${tab===t?'brk-tab-active':''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── TAB: RANKINGS ── */}
      {tab === 'Rankings' && (
        <div className="brk-content">
          <div className="brk-filters">
            <div className="brk-filter-group">
              <span className="brk-filter-label">TYPE</span>
              {[['all','All'],['discount','Discount'],['full','Full-Service']].map(([v,l])=>(
                <button key={v} className={`brk-filter-btn ${typeFilter===v?'active':''}`} onClick={()=>setTypeFilter(v)}>{l}</button>
              ))}
            </div>
            <div className="brk-filter-group">
              <span className="brk-filter-label">SORT BY</span>
              {[['total50k','Cost (₹50K)'],['dp','DP Charge'],['amc','AMC'],['mtfInterest','MTF Rate']].map(([v,l])=>(
                <button key={v} className={`brk-filter-btn ${sortBy===v?'active':''}`} onClick={()=>setSortBy(v)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="brk-table">
            {/* Header */}
            <div className="brk-table-head">
              <span>#</span>
              <span>Broker</span>
              <span>Delivery</span>
              <span>Intraday</span>
              <span>F&O</span>
              <span>DP Charge</span>
              <span>AMC/yr</span>
              <span>Total (₹50K buy+sell)</span>
            </div>
            {sorted.map((b, i) => (
              <div key={b.id}>
                <div
                  className={`brk-table-row ${b.type==='full'?'brk-row-full':''} ${expanded===b.id?'brk-row-expanded':''}`}
                  onClick={()=>setExpanded(expanded===b.id?null:b.id)}
                >
                  <span className="brk-rank">{i+1}</span>
                  <span className="brk-broker-cell">
                    <span className="brk-broker-name">{b.name}</span>
                    <span className={`brk-broker-type ${b.type==='discount'?'brk-type-discount':'brk-type-full'}`}>{b.type==='discount'?'Discount':'Full service'}</span>
                  </span>
                  <span className={`brk-charge ${b.delivery===0?'brk-zero':''}`}>{b.deliveryLabel}</span>
                  <span className="brk-charge">{b.intradayLabel}</span>
                  <span className="brk-charge">{b.optionsLabel}</span>
                  <span className="brk-charge">₹{fmt(b.dp)}</span>
                  <span className={`brk-charge ${b.amc===0?'brk-zero':''}`}>{b.amcLabel}</span>
                  <span className={`brk-total ${i===0?'brk-total-best':''}`}>₹{fmt(b.total50k)}</span>
                </div>
                {expanded===b.id && (
                  <div className="brk-expand">
                    <div className="brk-expand-tagline">{b.tagline}</div>
                    <div className="brk-expand-grid">
                      <div>
                        <div className="brk-expand-label">STRENGTHS</div>
                        {b.strengths.map((s,i)=><div key={i} className="brk-expand-item brk-item-good">✔ {s}</div>)}
                      </div>
                      <div>
                        <div className="brk-expand-label">WATCH OUT FOR</div>
                        {b.watch.map((s,i)=><div key={i} className="brk-expand-item brk-item-warn">⚠ {s}</div>)}
                      </div>
                      {b.mtfInterest && (
                        <div>
                          <div className="brk-expand-label">MTF INTEREST</div>
                          <div className="brk-expand-item">{b.mtfInterest}% p.a.</div>
                          <div className="brk-expand-item">Brokerage: {b.mtfBrokerage}</div>
                        </div>
                      )}
                    </div>
                    <div className="brk-expand-footer">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="brk-ext-link">Visit {b.name} ↗</a>
                      <span className="brk-disclaimer">Verify current charges on their official website before trading.</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="brk-table-note">
            Total cost on ₹50K delivery trade (buy + sell) includes brokerage, GST, DP charge, STT, exchange fee, SEBI fee, stamp duty. Regulatory charges = ₹111.51 on this trade — identical at all brokers. Click any row for full breakdown.
          </div>
        </div>
      )}

      {/* ── TAB: CALCULATOR ── */}
      {tab === 'Calculator' && (
        <div className="brk-content">
          <div className="brk-calc-inputs">
            <div className="brk-calc-field">
              <label className="brk-calc-label">TRADE VALUE (₹)</label>
              <input className="brk-calc-input" type="number" value={tradeVal} onChange={e=>setTradeVal(e.target.value)} placeholder="e.g. 50000" />
            </div>
            <div className="brk-calc-field">
              <label className="brk-calc-label">SEGMENT</label>
              <div className="brk-seg">
                {[['delivery','Delivery'],['intraday','Intraday'],['options','Options']].map(([v,l])=>(
                  <button key={v} className={`brk-seg-btn ${segment===v?'active':''}`} onClick={()=>setSegment(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {tv > 0 && (
            <div className="brk-calc-results">
              <div className="brk-calc-head">
                <span>#</span><span>Broker</span><span>Brokerage</span><span>GST</span><span>Govt + Exchange</span><span>Total</span>
              </div>
              {calcResults.map((b, i) => (
                <div key={b.id} className={`brk-calc-row ${i===0?'brk-calc-best':''}`}>
                  <span className="brk-rank">{i+1}</span>
                  <span className="brk-broker-name">{b.name}</span>
                  <span>₹{fmt(b.brokerage)}</span>
                  <span>₹{fmt(b.gst)}</span>
                  <span className="brk-govt">₹{fmt(b.govtTotal)}</span>
                  <span className="brk-calc-total">₹{fmt(b.total)}</span>
                </div>
              ))}
              <div className="brk-calc-note">
                Govt + Exchange charges are identical at all brokers. Includes STT, exchange fee, SEBI fee{segment==='delivery'?' and stamp duty':''}.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CHARGES EXPLAINED ── */}
      {tab === 'Charges Explained' && (
        <div className="brk-content">
          <div className="brk-charges-intro">
            Every trade has two kinds of charges. The government/exchange charges are fixed — identical at every broker. Only the broker charges vary. Understanding the difference is what this page is for.
          </div>
          <div className="brk-charges-grid">
            <div className="brk-charges-col">
              <div className="brk-charges-col-title brk-col-broker">BROKER CHARGES — vary by broker</div>
              {CHARGE_EXPLAINERS.filter(c=>c.type==='variable').map((c,i)=>(
                <div key={i} className="brk-charge-card brk-charge-variable">
                  <div className="brk-charge-name">{c.name}</div>
                  <div className="brk-charge-who">Collected by: {c.who}</div>
                  <div className="brk-charge-note">{c.note}</div>
                </div>
              ))}
            </div>
            <div className="brk-charges-col">
              <div className="brk-charges-col-title brk-col-govt">GOVT + EXCHANGE CHARGES — fixed, identical everywhere</div>
              {CHARGE_EXPLAINERS.filter(c=>c.type==='fixed').map((c,i)=>(
                <div key={i} className="brk-charge-card brk-charge-fixed">
                  <div className="brk-charge-name">{c.name}</div>
                  <div className="brk-charge-who">Collected by: {c.who}</div>
                  <div className="brk-charge-note">{c.note}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="brk-dp-note">
            <div className="brk-dp-title">DP CHARGES — WHAT ACTUALLY CHANGES</div>
            <div className="brk-dp-grid">
              {BROKERS.filter(b=>b.dp>0).sort((a,b)=>a.dp-b.dp).map((b,i)=>(
                <div key={b.id} className="brk-dp-row">
                  <span className="brk-dp-name">{b.name}</span>
                  <div className="brk-dp-bar-wrap">
                    <div className="brk-dp-bar" style={{width:`${(b.dp/30)*100}%`, background: b.dp<=15?'var(--gain)':b.dp<=20?'#F59E0B':'var(--loss)'}}/>
                  </div>
                  <span className="brk-dp-val">₹{fmt(b.dp)}</span>
                </div>
              ))}
            </div>
            <div className="brk-table-note" style={{marginTop:8}}>DP charge is levied once per scrip per sell per day, regardless of quantity sold. Source: CDSL tariff + broker levy.</div>
          </div>
        </div>
      )}

      {/* ── TAB: WHO SHOULD USE WHAT ── */}
      {tab === 'Who Should Use What' && (
        <div className="brk-content">
          <div className="brk-charges-intro">
            The cheapest broker by total cost isn't always the right one. Your trading style determines which charges hit you most.
          </div>
          <div className="brk-trader-grid">
            {TRADER_TYPES.map((t,i)=>(
              <div key={i} className="brk-trader-card">
                <div className="brk-trader-icon">{t.icon}</div>
                <div className="brk-trader-label">{t.label}</div>
                <div className="brk-trader-desc">{t.desc}</div>
                <div className="brk-trader-section">CHARGES THAT HIT YOU MOST</div>
                {t.key_charges.map((c,j)=><div key={j} className="brk-trader-charge">→ {c}</div>)}
                <div className="brk-trader-section">BROKERS TO CONSIDER</div>
                <div className="brk-trader-picks">
                  {t.picks.map((id,j)=>{
                    const b = BROKERS.find(x=>x.id===id);
                    return b ? <span key={j} className="brk-trader-pick">{b.name}</span> : null;
                  })}
                </div>
                <div className="brk-trader-reasoning">{t.reasoning}</div>
              </div>
            ))}
          </div>
          <div className="brk-table-note" style={{marginTop:16}}>
            Charges sourced from official broker websites and fee documents. Always verify before trading. Not a recommendation.
          </div>
        </div>
      )}

      <div className="brk-footer">
        Charges sourced from official broker websites and fee schedules. Regulatory charges (STT, exchange fee, SEBI fee, stamp duty) are set by government and exchanges — identical at every broker. Verify all charges directly with your broker before trading. No affiliates. No paid placements.
      </div>
    </div>
  );
}
