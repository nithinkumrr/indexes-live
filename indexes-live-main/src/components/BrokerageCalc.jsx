import { useState } from 'react';

const BROKERS = [
  {
    name: 'Zerodha',         color: '#387ED1', type: 'discount',
    equity_delivery: 0,      equity_intraday: 0.0003,  // 0.03% or ₹20 max
    futures: 0.0003,         options: 20,               // flat ₹20
    maxEquityIntraday: 20,   maxFutures: 20,
  },
  {
    name: 'Groww',           color: '#00D09C', type: 'discount',
    equity_delivery: 0,      equity_intraday: 0.0005,
    futures: 0.0005,         options: 20,
    maxEquityIntraday: 20,   maxFutures: 20,
  },
  {
    name: 'Upstox',          color: '#5B2EE5', type: 'discount',
    equity_delivery: 0,      equity_intraday: 0.0003,
    futures: 0.0003,         options: 20,
    maxEquityIntraday: 20,   maxFutures: 20,
  },
  {
    name: 'Angel One',       color: '#E63329', type: 'discount',
    equity_delivery: 0,      equity_intraday: 0.0003,
    futures: 0.0003,         options: 20,
    maxEquityIntraday: 20,   maxFutures: 20,
  },
  {
    name: 'HDFC Securities', color: '#004C8F', type: 'full',
    equity_delivery: 0.005,  equity_intraday: 0.004,
    futures: 0.004,          options: 0.004,
    maxEquityIntraday: null, maxFutures: null,
  },
  {
    name: 'ICICI Direct',    color: '#F7941D', type: 'full',
    equity_delivery: 0.0055, equity_intraday: 0.004,
    futures: 0.004,          options: 0.004,
    maxEquityIntraday: null, maxFutures: null,
  },
  {
    name: 'Kotak Securities',color: '#EF3E23', type: 'full',
    equity_delivery: 0.005,  equity_intraday: 0.004,
    futures: 0.0025,         options: 0.004,
    maxEquityIntraday: null, maxFutures: null,
  },
  {
    name: 'Sharekhan',       color: '#1D6FD8', type: 'full',
    equity_delivery: 0.005,  equity_intraday: 0.004,
    futures: 0.003,          options: 0.003,
    maxEquityIntraday: null, maxFutures: null,
  },
];

const SEGMENT_TYPES = [
  { id: 'equity_delivery', label: 'Equity Delivery', subtitle: 'Hold overnight' },
  { id: 'equity_intraday', label: 'Equity Intraday', subtitle: 'Buy & sell same day' },
  { id: 'futures',         label: 'F&O Futures',    subtitle: 'Index/Stock futures' },
  { id: 'options',         label: 'F&O Options',    subtitle: 'Per lot flat fee' },
];

function calcBrokerage(broker, segment, tradeValue) {
  const rate = broker[segment];
  if (!rate && rate !== 0) return 0;
  if (segment === 'options') return rate; // flat per lot
  const raw = tradeValue * rate;
  const max = broker[`max${segment === 'equity_intraday' ? 'EquityIntraday' : segment === 'futures' ? 'Futures' : ''}`];
  return max ? Math.min(raw, max) : raw;
}

function calcCharges(brokerageAmt, segment, tradeValue) {
  // STT
  const stt = segment === 'equity_delivery' ? tradeValue * 0.001
            : segment === 'equity_intraday' ? tradeValue * 0.00025
            : segment === 'futures'         ? tradeValue * 0.00002
            : tradeValue * 0.001; // options on premium
  // Exchange txn charge
  const exchange = segment === 'equity_delivery' || segment === 'equity_intraday'
    ? tradeValue * 0.0000345
    : tradeValue * 0.000019;
  // SEBI charge
  const sebi     = tradeValue * 0.000001;
  // GST on brokerage + exchange
  const gst      = (brokerageAmt + exchange + sebi) * 0.18;
  // Stamp duty (buy side only - approx)
  const stamp    = tradeValue * 0.00015;

  return { stt, exchange, sebi, gst, stamp,
    total: brokerageAmt + stt + exchange + sebi + gst + stamp };
}

export default function BrokerageCalc() {
  const [segment,    setSegment]    = useState('equity_intraday');
  const [tradeValue, setTradeValue] = useState(100000);
  const [qty,        setQty]        = useState(100);
  const [price,      setPrice]      = useState(1000);
  const [showFull,   setShowFull]   = useState(false);

  const actualValue = qty * price;
  const displayValue = actualValue || tradeValue;

  const brokerList = showFull ? BROKERS : BROKERS.filter(b => b.type === 'discount');
  const results = brokerList.map(b => {
    const brok = calcBrokerage(b, segment, displayValue);
    const charges = calcCharges(brok, segment, displayValue);
    return { ...b, brok, ...charges };
  }).sort((a, b) => a.total - b.total);

  const cheapest = results[0]?.total;

  return (
    <div className="bc-wrap">
      <div className="bc-title">Brokerage Comparison</div>
      <div className="bc-subtitle">Compare charges across India's top brokers</div>

      {/* Input row */}
      <div className="bc-inputs">
        <div className="bc-input-group">
          <label className="bc-label">Segment</label>
          <div className="bc-seg-tabs">
            {SEGMENT_TYPES.map(s => (
              <button key={s.id} className={`bc-seg-btn ${segment === s.id ? 'bc-seg-active' : ''}`}
                onClick={() => setSegment(s.id)}>
                <span>{s.label}</span>
                <span className="bc-seg-sub">{s.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bc-input-row">
          <div className="bc-input-group">
            <label className="bc-label">Qty</label>
            <input className="bc-input" type="number" value={qty} onChange={e => setQty(+e.target.value)} min="1"/>
          </div>
          <div className="bc-input-group">
            <label className="bc-label">Price (₹)</label>
            <input className="bc-input" type="number" value={price} onChange={e => setPrice(+e.target.value)} min="1"/>
          </div>
          <div className="bc-input-group bc-input-readonly">
            <label className="bc-label">Trade Value</label>
            <div className="bc-input-display">₹{(actualValue||tradeValue).toLocaleString('en-IN')}</div>
          </div>
          <div className="bc-input-group">
            <label className="bc-label" style={{opacity:0}}>.</label>
            <button className="bc-toggle" onClick={() => setShowFull(f => !f)}>
              {showFull ? 'Hide full-service' : 'Show full-service'}
            </button>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="bc-table-wrap">
        <table className="bc-table">
          <thead>
            <tr>
              <th>Broker</th>
              <th>Brokerage</th>
              <th>STT</th>
              <th>Exchange</th>
              <th>GST</th>
              <th>Total Cost</th>
              <th>vs Cheapest</th>
            </tr>
          </thead>
          <tbody>
            {results.map((b, i) => {
              const extra = b.total - cheapest;
              const isBest = i === 0;
              return (
                <tr key={b.name} className={isBest ? 'bc-row-best' : ''}>
                  <td className="bc-td-name">
                    <span className="bc-broker-dot" style={{background: b.color}}/>
                    {b.name}
                    {b.type === 'discount' && <span className="bc-type-badge">Discount</span>}
                  </td>
                  <td className="bc-td">₹{b.brok.toFixed(2)}</td>
                  <td className="bc-td">₹{b.stt.toFixed(2)}</td>
                  <td className="bc-td">₹{b.exchange.toFixed(2)}</td>
                  <td className="bc-td">₹{b.gst.toFixed(2)}</td>
                  <td className={`bc-td bc-td-total ${isBest ? 'gain' : ''}`}>₹{b.total.toFixed(2)}</td>
                  <td className={`bc-td ${extra > 0 ? 'loss' : 'gain'}`}>
                    {isBest ? <span className="bc-best-badge">LOWEST</span> : `+₹${extra.toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bc-note">
        Charges are indicative. STT, exchange txn charge, SEBI fees and 18% GST included.
        Stamp duty ~₹{(displayValue * 0.00015).toFixed(2)} not shown. Options brokerage is flat per order (not per lot).
      </div>
    </div>
  );
}
