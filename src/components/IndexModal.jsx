import { useState, useEffect } from 'react';
import { formatPrice, formatChange, formatPct } from '../utils/format';
import Sparkline from './Sparkline';

function StatRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="im-stat">
      <span className="im-stat-label">{label}</span>
      <span className="im-stat-value">{value}</span>
    </div>
  );
}

export default function IndexModal({ market, data, nseData = {}, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!market) return;
    document.body.style.overflow = 'hidden';

    // Fetch full Yahoo chart data for this market
    fetch(`/api/quote?symbol=${encodeURIComponent(market.symbol)}&range=1d&interval=5m`)
      .then(r => r.json())
      .then(json => {
        const result = json?.chart?.result?.[0];
        if (!result) return;
        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close?.filter(v => v != null) || [];
        const timestamps = result.timestamp || [];

        setDetail({
          price:       meta.regularMarketPrice,
          prevClose:   meta.chartPreviousClose ?? meta.previousClose,
          open:        meta.regularMarketOpen,
          high:        meta.regularMarketDayHigh,
          low:         meta.regularMarketDayLow,
          volume:      meta.regularMarketVolume,
          yearHigh:    meta.fiftyTwoWeekHigh,
          yearLow:     meta.fiftyTwoWeekLow,
          currency:    meta.currency,
          exchange:    meta.exchangeName || market.exchange,
          closes,
          timestamps,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => { document.body.style.overflow = ''; };
  }, [market]);

  if (!market) return null;

  const d    = data[market.id];
  const gain = d ? d.changePct >= 0 : true;

  const fmt = v => v != null ? formatPrice(v, market.category === 'commodity') : '—';
  const fmtVol = v => {
    if (!v) return '—';
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return String(v);
  };

  return (
    <div className="im-overlay" onClick={onClose}>
      <div className="im-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="im-header">
          <div className="im-title-row">
            <span className="im-flag">{market.flag}</span>
            <div>
              <div className="im-name">{market.name}</div>
              <div className="im-meta">{market.exchange} · {market.country}{market.unit ? ` · ${market.unit}` : ''}</div>
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
              {gain ? '▲' : '▼'} {formatChange(d.change)} ({formatPct(d.changePct)})
              <span className="im-change-label"> today</span>
            </div>
          )}
          {d && <div className="im-prev">Prev. close: {fmt(d.prevClose)}</div>}
        </div>

        {/* Chart */}
        <div className="im-chart">
          {d?.spark?.length > 1 ? (
            <Sparkline points={d.spark} gain={gain} height={120} />
          ) : (
            <div className="im-chart-empty">Chart loading...</div>
          )}
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="im-loading">Loading details...</div>
        ) : detail ? (
          <div className="im-stats">
            <StatRow label="Open"      value={fmt(detail.open)} />
            <StatRow label="Day High"  value={fmt(detail.high)} />
            <StatRow label="Day Low"   value={fmt(detail.low)} />
            <StatRow label="Prev Close" value={fmt(detail.prevClose)} />
            <StatRow label="Volume"    value={fmtVol(detail.volume)} />
            <StatRow label="52W High"  value={fmt(detail.yearHigh)} />
            <StatRow label="52W Low"   value={fmt(detail.yearLow)} />
            <StatRow label="Exchange"  value={detail.exchange} />
          </div>
        ) : null}

        {/* Ratios — Indian markets from NSE */}
        {nseData[market?.id] && (() => {
          const nd = nseData[market.id];
          return (
            <div className="im-ratios">
              {nd.pe   > 0 && <div className="im-ratio"><span>P/E</span><strong>{nd.pe.toFixed(2)}</strong></div>}
              {nd.pb   > 0 && <div className="im-ratio"><span>P/B</span><strong>{nd.pb.toFixed(2)}</strong></div>}
              {nd.dy   > 0 && <div className="im-ratio"><span>Div Yield</span><strong>{nd.dy.toFixed(2)}%</strong></div>}
              {nd.advances > 0 && <div className="im-ratio"><span>Advances</span><strong className="gain">{nd.advances}</strong></div>}
              {nd.declines > 0 && <div className="im-ratio"><span>Declines</span><strong className="loss">{nd.declines}</strong></div>}
            </div>
          );
        })()}
        <div className="im-footer">Indian markets: Live from NSE · Others: Yahoo Finance (15min delay)</div>
      </div>
    </div>
  );
}
