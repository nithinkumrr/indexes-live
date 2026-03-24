import { useState, useEffect } from 'react';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import Sparkline from './Sparkline';

const INDIAN_IDS = new Set(['nifty50','banknifty','sensex','giftnifty','niftynext50',
  'niftymidcap50','niftyit','niftypharma','niftyauto','niftyfmcg','niftymetal',
  'niftyrealty','niftypsubank','niftyfinservice']);

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return `${(n/1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3)  return `${(n/1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function IndexModal({ market, data, nseData = {}, onClose }) {
  const [ratios, setRatios]   = useState(null);
  const [ohlc, setOhlc]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!market) return;
    document.body.style.overflow = 'hidden';

    const isIndia = INDIAN_IDS.has(market.id);
    const nd = nseData[market.id];

    // For Indian markets: use NSE data for OHLC
    if (isIndia && nd) {
      setOhlc({
        open: nd.open, high: nd.high, low: nd.low,
        yearHigh: nd.yearHigh, yearLow: nd.yearLow,
      });
    }

    // Fetch ratios from Yahoo for ALL markets
    if (market.symbol && !market.simulation) {
      fetch(`/api/ratios?symbol=${encodeURIComponent(market.symbol)}`)
        .then(r => r.json())
        .then(d => {
          if (!d.error) setRatios(d);
          // For non-Indian: also use Yahoo for OHLC
          if (!isIndia || !nd) {
            fetch(`/api/quote?symbol=${encodeURIComponent(market.symbol)}`)
              .then(r => r.json())
              .then(json => {
                const meta = json?.chart?.result?.[0]?.meta;
                if (meta) setOhlc({
                  open: meta.regularMarketOpen,
                  high: meta.regularMarketDayHigh,
                  low:  meta.regularMarketDayLow,
                  yearHigh: meta.fiftyTwoWeekHigh,
                  yearLow:  meta.fiftyTwoWeekLow,
                  volume: meta.regularMarketVolume,
                });
              }).catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => { document.body.style.overflow = ''; };
  }, [market]);

  if (!market) return null;

  const d       = data[market.id];
  const nd      = nseData[market.id];
  const isIndia = INDIAN_IDS.has(market.id);
  const gain    = d ? d.changePct >= 0 : true;
  const fmt     = v => (v != null && v > 0) ? formatPrice(v, market.category === 'commodity') : '—';

  const adv   = nd?.advances  || 0;
  const dec   = nd?.declines  || 0;
  const unch  = nd?.unchanged || 0;
  const total = adv + dec + unch;
  const advPct = total > 0 ? Math.round((adv / total) * 100) : 0;
  const decPct = total > 0 ? Math.round((dec / total) * 100) : 0;

  // Merge PE/PB from NSE (Indian) or Yahoo ratios
  const pe = (isIndia && nd?.pe) ? nd.pe : ratios?.pe;
  const pb = (isIndia && nd?.pb) ? nd.pb : ratios?.pb;
  const dy = (isIndia && nd?.dy) ? nd.dy : ratios?.dy;
  const yH = ohlc?.yearHigh || ratios?.yearHigh;
  const yL = ohlc?.yearLow  || ratios?.yearLow;
  const vol = ohlc?.volume  || ratios?.volume;
  const avg50  = ratios?.avg50;
  const avg200 = ratios?.avg200;
  const beta   = ratios?.beta;

  return (
    <div className="im-overlay" onClick={onClose}>
      <div className="im-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="im-header">
          <div className="im-title-row">
            <span className="im-flag">{market.flag}</span>
            <div>
              <div className="im-name">{market.name}</div>
              <div className="im-meta">{market.exchange} · {market.country}</div>
            </div>
          </div>
          <button className="im-close" onClick={onClose}>✕</button>
        </div>

        {/* Price */}
        <div className="im-price-section">
          <div className="im-price">
            {d ? formatPrice(d.price, market.category === 'commodity') : '—'}
            {market.unit && <span className="im-unit"> {market.unit}</span>}
          </div>
          {d && (
            <div className={`im-change ${gain ? 'gain' : 'loss'}`}>
              {gain ? '▲' : '▼'} {formatChange(d.change)} &nbsp;({formatPct(d.changePct)}) today
            </div>
          )}
          {d && <div className="im-prev">Prev. close: {fmt(d.prevClose)}</div>}
          <div className="im-source">{isIndia ? '● Live · NSE/BSE' : '● Yahoo Finance'}</div>
        </div>

        {/* Chart */}
        <div className="im-chart">
          {d?.spark?.length > 1
            ? <Sparkline points={d.spark} gain={gain} height={110} />
            : <div className="im-chart-empty">No chart data</div>}
        </div>

        {/* OHLC */}
        {ohlc && (
          <div className="im-stats">
            {ohlc.open  && <div className="im-stat"><span className="im-stat-label">Open</span>      <span className="im-stat-value">{fmt(ohlc.open)}</span></div>}
            {ohlc.high  && <div className="im-stat"><span className="im-stat-label">Day High</span>  <span className="im-stat-value gain">{fmt(ohlc.high)}</span></div>}
            {ohlc.low   && <div className="im-stat"><span className="im-stat-label">Day Low</span>   <span className="im-stat-value loss">{fmt(ohlc.low)}</span></div>}
            {d?.prevClose && <div className="im-stat"><span className="im-stat-label">Prev Close</span> <span className="im-stat-value">{fmt(d.prevClose)}</span></div>}
            {yH         && <div className="im-stat"><span className="im-stat-label">52W High</span>  <span className="im-stat-value">{fmt(yH)}</span></div>}
            {yL         && <div className="im-stat"><span className="im-stat-label">52W Low</span>   <span className="im-stat-value">{fmt(yL)}</span></div>}
            {vol        && <div className="im-stat"><span className="im-stat-label">Volume</span>    <span className="im-stat-value">{fmtNum(vol)}</span></div>}
            {avg50      && <div className="im-stat"><span className="im-stat-label">50D Avg</span>   <span className="im-stat-value">{fmt(avg50)}</span></div>}
            {avg200     && <div className="im-stat"><span className="im-stat-label">200D Avg</span>  <span className="im-stat-value">{fmt(avg200)}</span></div>}
            {beta       && <div className="im-stat"><span className="im-stat-label">Beta</span>      <span className="im-stat-value">{beta.toFixed(2)}</span></div>}
          </div>
        )}

        {/* Ratios — all markets */}
        {loading && <div className="im-loading">Loading ratios...</div>}
        {!loading && (pe || pb || dy) && (
          <div className="im-ratios">
            {pe   && <div className="im-ratio"><span>P/E Ratio</span>   <strong>{Number(pe).toFixed(2)}x</strong></div>}
            {pb   && <div className="im-ratio"><span>P/B Ratio</span>   <strong>{Number(pb).toFixed(2)}x</strong></div>}
            {dy   && <div className="im-ratio"><span>Div Yield</span>   <strong>{Number(dy)}%</strong></div>}
            {ratios?.marketCap && <div className="im-ratio"><span>Market Cap</span>  <strong>{fmtNum(ratios.marketCap)}</strong></div>}
          </div>
        )}

        {/* Advances/Declines — Indian only */}
        {isIndia && adv + dec > 0 && (
          <div className="im-adv-wrap">
            <div className="im-adv-header">
              <span className="im-adv-title">Market Breadth</span>
              <span className="im-adv-summary">
                <span className="gain">▲ {adv} up</span>
                <span> · </span>
                <span className="loss">▼ {dec} down</span>
                {unch > 0 && <span className="im-adv-unch"> · {unch} flat</span>}
              </span>
            </div>
            <div className="im-adv-bar">
              <div className="im-adv-gain" style={{ width: `${advPct}%` }} />
              <div className="im-adv-loss" style={{ width: `${decPct}%` }} />
            </div>
            <div className="im-adv-labels">
              <span className="gain">{advPct}% advancing</span>
              <span className="loss">{decPct}% declining</span>
            </div>
          </div>
        )}

        <div className="im-footer">
          {isIndia ? 'OHLC & Ratios: NSE · Real-time' : 'Data: Yahoo Finance · Ratios may be delayed'}
        </div>
      </div>
    </div>
  );
}
