import { useState, useEffect } from 'react';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import Sparkline from './Sparkline';

const INDIAN_IDS = new Set(['nifty50','banknifty','sensex','giftnifty','niftynext50',
  'niftymidcap50','niftyit','niftypharma','niftyauto','niftyfmcg','niftymetal',
  'niftyrealty','niftypsubank','niftyfinservice']);

const PERIODS = [
  { label: '1D', range: '1d', interval: '5m' },
  { label: '5D', range: '5d', interval: '30m' },
  { label: '1M', range: '1mo', interval: '1d' },
  { label: '6M', range: '6mo', interval: '1wk' },
  { label: 'YTD', range: 'ytd', interval: '1d' },
  { label: '1Y', range: '1y', interval: '1wk' },
  { label: '5Y', range: '5y', interval: '1mo' },
  { label: 'MAX', range: 'max', interval: '3mo' },
];

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return `${(n/1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${(n/1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

// Inline SVG sparkline for modal (bigger, full width)
function ChartLine({ points, gain }) {
  if (!points?.length) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const H = 120, W = 100;
  const pts = points.map((v, i) =>
    `${(i / (points.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`
  ).join(' ');
  const color = gain ? '#00C896' : '#FF4455';
  const fillId = `fill-${gain ? 'g' : 'r'}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:'100%',height:120,display:'block'}}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${fillId})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// Return calculation
function calcReturn(points) {
  if (!points?.length) return null;
  const first = points[0], last = points[points.length - 1];
  if (!first) return null;
  const pct = ((last - first) / first) * 100;
  return pct;
}

export default function IndexModal({ market, data, nseData = {}, onClose }) {
  const [period, setPeriod]       = useState('1D');
  const [chartData, setChartData] = useState(null);
  const [ratios, setRatios]       = useState(null);
  const [ohlc, setOhlc]           = useState(null);
  const [loadingChart, setLC]     = useState(true);
  const [loadingRatios, setLR]    = useState(true);

  const isIndia = INDIAN_IDS.has(market?.id);
  const nd      = nseData[market?.id];

  // Fetch chart when period changes
  useEffect(() => {
    if (!market?.symbol || market.simulation) return;
    setLC(true);
    const p = PERIODS.find(x => x.label === period);
    fetch(`/api/quote?symbol=${encodeURIComponent(market.symbol)}&range=${p.range}&interval=${p.interval}`)
      .then(r => r.json())
      .then(json => {
        const result = json?.chart?.result?.[0];
        if (!result) return;
        const meta   = result.meta;
        const quotes = result.indicators?.quote?.[0] || {};
        const closes = (quotes.close ?? []).filter(v => v != null);
        const highs  = (quotes.high  ?? []).filter(v => v != null);
        const lows   = (quotes.low   ?? []).filter(v => v != null);
        setChartData({ closes, meta });
        // Always set OHLC from Yahoo meta for non-Indian or as fallback
        const yahooOhlc = {
          open:     meta.regularMarketOpen,
          high:     meta.regularMarketDayHigh,
          low:      meta.regularMarketDayLow,
          close:    meta.regularMarketPrice,
          yearHigh: meta.fiftyTwoWeekHigh,
          yearLow:  meta.fiftyTwoWeekLow,
        };
        // For Indian markets: keep NSE data as priority, Yahoo as fallback
        if (!isIndia) {
          setOhlc(yahooOhlc);
        } else {
          setOhlc(prev => ({
            open:     prev?.open     || yahooOhlc.open,
            high:     prev?.high     || yahooOhlc.high,
            low:      prev?.low      || yahooOhlc.low,
            close:    prev?.close    || yahooOhlc.close,
            yearHigh: prev?.yearHigh || yahooOhlc.yearHigh,
            yearLow:  prev?.yearLow  || yahooOhlc.yearLow,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLC(false));
  }, [market, period]);

  // Fetch ratios once
  useEffect(() => {
    if (!market) return;
    document.body.style.overflow = 'hidden';
    // Immediately seed OHLC from whatever data we already have
    const d0 = data[market.id];
    if (isIndia && nd) {
      setOhlc(nd);
    } else if (d0) {
      setOhlc({
        open:     d0.open,
        high:     d0.high,
        low:      d0.low,
        yearHigh: d0.yearHigh,
        yearLow:  d0.yearLow,
      });
    }
    if (market.symbol && !market.simulation) {
      fetch(`/api/ratios?symbol=${encodeURIComponent(market.symbol)}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setRatios(d); })
        .catch(() => {})
        .finally(() => setLR(false));
    } else setLR(false);
    return () => { document.body.style.overflow = ''; };
  }, [market]);

  if (!market) return null;

  const d    = data[market.id];
  const gain = d ? d.changePct >= 0 : true;
  const fmt  = v => (v != null && v > 0) ? formatPrice(v, market.category === 'commodity') : '—';
  const chartPoints = chartData?.closes || d?.spark || [];
  const chartGain   = chartPoints.length > 1 ? chartPoints[chartPoints.length-1] >= chartPoints[0] : gain;
  const periodReturn = period !== '1D' ? calcReturn(chartPoints) : null;

  // Merge ratios
  const pe = (isIndia && nd?.pe) ? nd.pe : ratios?.pe;
  const pb = (isIndia && nd?.pb) ? nd.pb : ratios?.pb;
  const dy = (isIndia && nd?.dy) ? nd.dy : ratios?.dy;
  const yH = (isIndia && nd?.yearHigh) ? nd.yearHigh : ohlc?.yearHigh || ratios?.yearHigh;
  const yL = (isIndia && nd?.yearLow)  ? nd.yearLow  : ohlc?.yearLow  || ratios?.yearLow;
  const avg50  = ratios?.avg50;
  const avg200 = ratios?.avg200;
  const beta   = ratios?.beta;
  const adv    = nd?.advances || 0;
  const dec    = nd?.declines || 0;
  const unch   = nd?.unchanged || 0;
  const total  = adv + dec + unch;
  const advPct = total > 0 ? Math.round((adv/total)*100) : 0;
  const decPct = total > 0 ? Math.round((dec/total)*100) : 0;

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

        {/* Price + change */}
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

        {/* Period selector */}
        <div className="im-periods">
          {PERIODS.map(p => (
            <button key={p.label}
              className={`im-period-btn ${period === p.label ? 'im-period-active' : ''}`}
              onClick={() => setPeriod(p.label)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="im-chart">
          {loadingChart
            ? <div className="im-chart-empty">Loading chart...</div>
            : <ChartLine points={chartPoints} gain={chartGain} />
          }
          {periodReturn != null && (
            <div className={`im-period-return ${periodReturn >= 0 ? 'gain' : 'loss'}`}>
              {period} return: {periodReturn >= 0 ? '+' : ''}{periodReturn.toFixed(2)}%
            </div>
          )}
        </div>

        {/* OHLC */}
        <div className="im-stats">
          <div className="im-stat"><span className="im-stat-label">Open</span>      <span className="im-stat-value">{fmt(ohlc?.open || nd?.open)}</span></div>
          <div className="im-stat"><span className="im-stat-label">High</span>      <span className="im-stat-value gain">{fmt(ohlc?.high || nd?.high)}</span></div>
          <div className="im-stat"><span className="im-stat-label">Low</span>       <span className="im-stat-value loss">{fmt(ohlc?.low  || nd?.low)}</span></div>
          <div className="im-stat"><span className="im-stat-label">Close</span>     <span className="im-stat-value">{d ? formatPrice(d.price, market.category==='commodity') : '—'}</span></div>
          <div className="im-stat"><span className="im-stat-label">Prev Close</span><span className="im-stat-value">{fmt(d?.prevClose)}</span></div>
          <div className="im-stat"><span className="im-stat-label">52W High</span>  <span className="im-stat-value">{fmt(yH)}</span></div>
          <div className="im-stat"><span className="im-stat-label">52W Low</span>   <span className="im-stat-value">{fmt(yL)}</span></div>
          {avg50  && <div className="im-stat"><span className="im-stat-label">50D Avg</span>  <span className="im-stat-value">{fmt(avg50)}</span></div>}
          {avg200 && <div className="im-stat"><span className="im-stat-label">200D Avg</span> <span className="im-stat-value">{fmt(avg200)}</span></div>}
          {beta   && <div className="im-stat"><span className="im-stat-label">Beta</span>     <span className="im-stat-value">{Number(beta).toFixed(2)}</span></div>}
        </div>

        {/* Ratios */}
        {!loadingRatios && (pe || pb || dy) && (
          <div className="im-ratios">
            {pe && <div className="im-ratio"><span>P/E Ratio</span><strong>{Number(pe).toFixed(2)}x</strong></div>}
            {pb && <div className="im-ratio"><span>P/B Ratio</span><strong>{Number(pb).toFixed(2)}x</strong></div>}
            {dy && <div className="im-ratio"><span>Div Yield</span><strong>{Number(dy)}%</strong></div>}
            {ratios?.marketCap && <div className="im-ratio"><span>Mkt Cap</span><strong>{fmtNum(ratios.marketCap)}</strong></div>}
          </div>
        )}

        {/* Advances/Declines */}
        {isIndia && adv + dec > 0 && (
          <div className="im-adv-wrap">
            <div className="im-adv-header">
              <span className="im-adv-title">MARKET BREADTH</span>
              <span className="im-adv-summary">
                <span className="gain">▲ {adv} up</span> · <span className="loss">▼ {dec} down</span>
                {unch > 0 && <span className="im-adv-unch"> · {unch} flat</span>}
              </span>
            </div>
            <div className="im-adv-bar">
              <div className="im-adv-gain" style={{width:`${advPct}%`}}/>
              <div className="im-adv-loss" style={{width:`${decPct}%`}}/>
            </div>
            <div className="im-adv-labels">
              <span className="gain">{advPct}% advancing</span>
              <span className="loss">{decPct}% declining</span>
            </div>
          </div>
        )}

        <div className="im-footer">
          {isIndia ? 'OHLC & Ratios: NSE · Real-time' : 'Data: Yahoo Finance'}
        </div>
      </div>
    </div>
  );
}
