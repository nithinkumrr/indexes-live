// src/components/Backtest.jsx
// Full strategy backtester — 28 strategies, NSE indices
import { useState, useCallback } from 'react';

// ── Strategy definitions ────────────────────────────────────────────────────
const STRATEGY_GROUPS = [
  {
    group: 'SINGLE LEG',
    color: '#4A9EFF',
    strategies: [
      { id: 'long_call',   label: 'Long Call',   legs: 1, type: 'debit',  outlook: 'Bullish' },
      { id: 'long_put',    label: 'Long Put',    legs: 1, type: 'debit',  outlook: 'Bearish' },
      { id: 'short_call',  label: 'Short Call',  legs: 1, type: 'credit', outlook: 'Neutral/Bearish' },
      { id: 'short_put',   label: 'Short Put',   legs: 1, type: 'credit', outlook: 'Neutral/Bullish' },
    ],
  },
  {
    group: 'VOLATILITY',
    color: '#F59E0B',
    strategies: [
      { id: 'long_straddle',   label: 'Long Straddle',   legs: 2, type: 'debit',  outlook: 'High vol' },
      { id: 'short_straddle',  label: 'Short Straddle',  legs: 2, type: 'credit', outlook: 'Low vol' },
      { id: 'long_strangle',   label: 'Long Strangle',   legs: 2, type: 'debit',  outlook: 'High vol' },
      { id: 'short_strangle',  label: 'Short Strangle',  legs: 2, type: 'credit', outlook: 'Low vol' },
      { id: 'long_guts',       label: 'Long Guts',       legs: 2, type: 'debit',  outlook: 'High vol' },
      { id: 'short_guts',      label: 'Short Guts',      legs: 2, type: 'credit', outlook: 'Low vol' },
    ],
  },
  {
    group: 'VERTICAL SPREADS',
    color: '#00C896',
    strategies: [
      { id: 'bull_call_spread', label: 'Bull Call Spread', legs: 2, type: 'debit',  outlook: 'Bullish' },
      { id: 'bear_call_spread', label: 'Bear Call Spread', legs: 2, type: 'credit', outlook: 'Bearish' },
      { id: 'bull_put_spread',  label: 'Bull Put Spread',  legs: 2, type: 'credit', outlook: 'Bullish' },
      { id: 'bear_put_spread',  label: 'Bear Put Spread',  legs: 2, type: 'debit',  outlook: 'Bearish' },
    ],
  },
  {
    group: 'IRON STRATS',
    color: '#A78BFA',
    strategies: [
      { id: 'short_iron_condor',    label: 'Short Iron Condor',    legs: 4, type: 'credit', outlook: 'Neutral' },
      { id: 'long_iron_condor',     label: 'Long Iron Condor',     legs: 4, type: 'debit',  outlook: 'High vol' },
      { id: 'short_iron_butterfly', label: 'Short Iron Butterfly', legs: 4, type: 'credit', outlook: 'Neutral' },
      { id: 'long_iron_butterfly',  label: 'Long Iron Butterfly',  legs: 4, type: 'debit',  outlook: 'High vol' },
    ],
  },
  {
    group: 'BUTTERFLY',
    color: '#EC4899',
    strategies: [
      { id: 'long_call_butterfly',  label: 'Long Call Butterfly',  legs: 3, type: 'debit',  outlook: 'Neutral' },
      { id: 'short_call_butterfly', label: 'Short Call Butterfly', legs: 3, type: 'credit', outlook: 'High vol' },
      { id: 'long_put_butterfly',   label: 'Long Put Butterfly',   legs: 3, type: 'debit',  outlook: 'Neutral' },
      { id: 'short_put_butterfly',  label: 'Short Put Butterfly',  legs: 3, type: 'credit', outlook: 'High vol' },
    ],
  },
  {
    group: 'CONDOR',
    color: '#F97316',
    strategies: [
      { id: 'long_call_condor',  label: 'Long Call Condor',  legs: 4, type: 'debit',  outlook: 'Neutral' },
      { id: 'short_call_condor', label: 'Short Call Condor', legs: 4, type: 'credit', outlook: 'High vol' },
      { id: 'long_put_condor',   label: 'Long Put Condor',   legs: 4, type: 'debit',  outlook: 'Neutral' },
      { id: 'short_put_condor',  label: 'Short Put Condor',  legs: 4, type: 'credit', outlook: 'High vol' },
    ],
  },
  {
    group: 'SYNTHETIC',
    color: '#06B6D4',
    strategies: [
      { id: 'synthetic_long',  label: 'Synthetic Long',  legs: 2, type: 'debit',  outlook: 'Bullish' },
      { id: 'synthetic_short', label: 'Synthetic Short', legs: 2, type: 'credit', outlook: 'Bearish' },
    ],
  },
];

const ALL_STRATEGIES = STRATEGY_GROUPS.flatMap(g => g.strategies.map(s => ({ ...s, groupColor: g.color, group: g.group })));

// ── Parameters ──────────────────────────────────────────────────────────────
const INDICES = [
  // NSE
  { id: 'NIFTY',      label: 'Nifty 50',          lot: 65,  exchange: 'NSE' },
  { id: 'BANKNIFTY',  label: 'Bank Nifty',         lot: 30,  exchange: 'NSE' },
  { id: 'FINNIFTY',   label: 'Fin Nifty',          lot: 60,  exchange: 'NSE' },
  { id: 'MIDCPNIFTY', label: 'Midcap Select',      lot: 120, exchange: 'NSE' },
  { id: 'NIFTYNXT50', label: 'Nifty Next 50',      lot: 25,  exchange: 'NSE' },
  // BSE
  { id: 'SENSEX',     label: 'Sensex',             lot: 20,  exchange: 'BSE' },
  { id: 'BANKEX',     label: 'Bankex',             lot: 30,  exchange: 'BSE' },
  { id: 'SENSEX50',   label: 'Sensex 50',          lot: 75,  exchange: 'BSE' },
];

const EXPIRY_TYPES = [
  { id: 'weekly',  label: 'Weekly'  },
  { id: 'monthly', label: 'Monthly' },
];

const ENTRY_TIMES = ['09:20', '10:00', '11:00', '12:00', '14:00'];
const EXIT_TIMES  = ['15:15', '14:00', '12:00', 'next_open'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtCr = n => {
  if (n == null) return '-';
  const abs = Math.abs(n), sign = n >= 0 ? '+' : '-';
  if (abs >= 100000) return `${sign}₹${(abs/100000).toFixed(2)}L`;
  if (abs >= 1000)   return `${sign}₹${(abs/1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};
const fmtPct = n => n == null ? '-' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// ── Calendar Heatmap ─────────────────────────────────────────────────────────
function CalendarHeatmap({ results }) {
  if (!results?.daily?.length) return null;

  const byMonth = {};
  results.daily.forEach(d => {
    const key = d.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { total: 0, days: [], wins: 0, losses: 0 };
    byMonth[key].total += d.pnl;
    byMonth[key].days.push(d);
    if (d.pnl >= 0) byMonth[key].wins++; else byMonth[key].losses++;
  });

  const months = Object.keys(byMonth).sort();
  const maxAbs  = Math.max(...months.map(m => Math.abs(byMonth[m].total)));

  return (
    <div className="bt-cal-wrap">
      <div className="bt-section-title">MONTHLY PERFORMANCE</div>
      <div className="bt-cal-grid">
        {months.map(m => {
          const mb = byMonth[m];
          const pct = maxAbs > 0 ? mb.total / maxAbs : 0;
          const gain = mb.total >= 0;
          const intensity = Math.abs(pct);
          const bg = gain
            ? `rgba(0,200,150,${0.1 + intensity * 0.5})`
            : `rgba(255,68,85,${0.1 + intensity * 0.5})`;
          const [yr, mo] = m.split('-');
          const label = new Date(+yr, +mo - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
          return (
            <div key={m} className="bt-cal-month" style={{ background: bg }} title={`${label}: ${fmtCr(mb.total)}`}>
              <div className="bt-cal-label">{label}</div>
              <div className={`bt-cal-val ${gain ? 'gain' : 'loss'}`}>{fmtCr(mb.total)}</div>
              <div className="bt-cal-wr">{mb.wins}W {mb.losses}L</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day of Week Breakdown ─────────────────────────────────────────────────────
function DayBreakdown({ results }) {
  if (!results?.daily?.length) return null;
  const DAYS = ['Mon','Tue','Wed','Thu','Fri'];
  const byDay = {};
  DAYS.forEach(d => byDay[d] = { total: 0, count: 0, wins: 0 });
  results.daily.forEach(d => {
    const day = DAYS[new Date(d.date).getDay() - 1];
    if (!day) return;
    byDay[day].total += d.pnl;
    byDay[day].count++;
    if (d.pnl >= 0) byDay[day].wins++;
  });
  const maxAbs = Math.max(...DAYS.map(d => Math.abs(byDay[d].total)));
  return (
    <div className="bt-day-wrap">
      <div className="bt-section-title">DAY OF WEEK</div>
      <div className="bt-day-grid">
        {DAYS.map(d => {
          const b = byDay[d], gain = b.total >= 0;
          const barH = maxAbs > 0 ? Math.abs(b.total / maxAbs) * 80 : 0;
          const wr = b.count > 0 ? Math.round((b.wins / b.count) * 100) : 0;
          return (
            <div key={d} className="bt-day-col">
              <div className="bt-day-total" style={{ color: gain ? 'var(--gain)' : 'var(--loss)' }}>{fmtCr(b.total)}</div>
              <div className="bt-day-bar-wrap">
                <div className="bt-day-bar" style={{ height: barH, background: gain ? 'rgba(0,200,150,0.7)' : 'rgba(255,68,85,0.7)' }} />
              </div>
              <div className="bt-day-name">{d}</div>
              <div className="bt-day-wr">{wr}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stats Grid ───────────────────────────────────────────────────────────────
function StatsGrid({ results }) {
  if (!results) return null;
  const s = results.stats;
  const stats = [
    { label: 'Total P&L',      val: fmtCr(s.totalPnl),     color: s.totalPnl >= 0 ? 'var(--gain)' : 'var(--loss)', big: true },
    { label: 'Win Rate',       val: `${s.winRate.toFixed(1)}%`, color: s.winRate >= 50 ? 'var(--gain)' : 'var(--loss)' },
    { label: 'Total Trades',   val: s.totalTrades },
    { label: 'Winning Trades', val: s.wins,        color: 'var(--gain)' },
    { label: 'Losing Trades',  val: s.losses,      color: 'var(--loss)' },
    { label: 'Avg Win',        val: fmtCr(s.avgWin),  color: 'var(--gain)' },
    { label: 'Avg Loss',       val: fmtCr(s.avgLoss), color: 'var(--loss)' },
    { label: 'Best Trade',     val: fmtCr(s.bestTrade),  color: 'var(--gain)' },
    { label: 'Worst Trade',    val: fmtCr(s.worstTrade), color: 'var(--loss)' },
    { label: 'Max Drawdown',   val: fmtCr(s.maxDrawdown), color: 'var(--loss)' },
    { label: 'Profit Factor',  val: s.profitFactor?.toFixed(2) },
    { label: 'Sharpe Ratio',   val: s.sharpe?.toFixed(2) },
    { label: 'Avg P&L/Trade',  val: fmtCr(s.avgPnl) },
    { label: 'Win Streak',     val: `${s.winStreak}d`,  color: 'var(--gain)' },
    { label: 'Loss Streak',    val: `${s.lossStreak}d`, color: 'var(--loss)' },
    { label: 'Expectancy',     val: fmtCr(s.expectancy) },
  ];
  return (
    <div className="bt-stats-grid">
      {stats.map(st => (
        <div key={st.label} className={`bt-stat-item ${st.big ? 'bt-stat-big' : ''}`}>
          <div className="bt-stat-label">{st.label}</div>
          <div className="bt-stat-val" style={{ color: st.color }}>{st.val ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}

// ── Trade List ───────────────────────────────────────────────────────────────
function TradeList({ results }) {
  const [show, setShow] = useState(false);
  if (!results?.daily?.length) return null;
  const trades = [...results.daily].reverse().slice(0, show ? 1000 : 20);
  return (
    <div className="bt-trades-wrap">
      <div className="bt-section-title">TRADE LOG</div>
      <div className="bt-trades-table">
        <div className="bt-trade-hdr">
          <span>Date</span><span>Day</span><span>DTE</span><span>Entry</span><span>Exit</span><span>P&L</span>
        </div>
        {trades.map((t, i) => {
          const gain = t.pnl >= 0;
          const d = new Date(t.date);
          const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
          return (
            <div key={i} className={`bt-trade-row ${gain ? 'bt-tr-win' : 'bt-tr-loss'}`}>
              <span>{t.date}</span>
              <span>{day}</span>
              <span>{t.dte ?? '-'}</span>
              <span>₹{t.entryPremium?.toFixed(0) ?? '-'}</span>
              <span>₹{t.exitPremium?.toFixed(0) ?? '-'}</span>
              <span className={gain ? 'gain' : 'loss'} style={{ fontWeight: 700 }}>{fmtCr(t.pnl)}</span>
            </div>
          );
        })}
      </div>
      {results.daily.length > 20 && (
        <button className="bt-show-more" onClick={() => setShow(!show)}>
          {show ? 'Show less' : `Show all ${results.daily.length} trades`}
        </button>
      )}
    </div>
  );
}

// ── Main Backtest Component ──────────────────────────────────────────────────
export default function Backtest({ data }) {
  const [selected,   setSelected]   = useState(null);
  const [params,     setParams]      = useState({
    index:      'NIFTY',
    expiry:     'weekly',
    entryTime:  '09:20',
    exitTime:   '15:15',
    dte:        0,
    lots:       1,
    strikePct:  0,    // ATM=0, OTM=1,2...
    width:      1,    // spread width in strikes (for spreads)
    fromYear:   2020,
    toYear:     2025,
    slPct:      null, // stop loss %
    tpPct:      null, // take profit %
  });
  const [results,    setResults]     = useState(null);
  const [loading,    setLoading]     = useState(false);
  const [error,      setError]       = useState(null);
  const [activeTab,  setActiveTab]   = useState('summary');

  const strategy = ALL_STRATEGIES.find(s => s.id === selected);

  const runBacktest = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const r = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: selected, ...params }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else setResults(d);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  }, [selected, params]);

  const p = (key, val) => setParams(prev => ({ ...prev, [key]: val }));

  return (
    <div className="bt-wrap">

      {/* ── Left panel: Strategy selector ── */}
      <div className="bt-left">
        <div className="bt-panel-title">SELECT STRATEGY</div>
        {STRATEGY_GROUPS.map(g => (
          <div key={g.group} className="bt-group">
            <div className="bt-group-label" style={{ color: g.color }}>{g.group}</div>
            {g.strategies.map(s => (
              <button key={s.id}
                className={`bt-strat-btn ${selected === s.id ? 'bt-strat-active' : ''}`}
                style={selected === s.id ? { borderColor: g.color, color: g.color, background: `${g.color}10` } : {}}
                onClick={() => { setSelected(s.id); setResults(null); setError(null); }}>
                {s.label}
                <span className={`bt-strat-type ${s.type === 'credit' ? 'bt-credit' : 'bt-debit'}`}>
                  {s.type}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Right panel: Params + Results ── */}
      <div className="bt-right">

        {/* ── Parameters ── */}
        <div className="bt-params-bar">
          {/* Index */}
          <div className="bt-param-group">
            <label>Index</label>
            <select className="bt-select" value={params.index} onChange={e => p('index', e.target.value)}>
              <optgroup label="NSE">
                {INDICES.filter(i => i.exchange === 'NSE').map(idx => (
                  <option key={idx.id} value={idx.id}>{idx.label} (lot {idx.lot})</option>
                ))}
              </optgroup>
              <optgroup label="BSE">
                {INDICES.filter(i => i.exchange === 'BSE').map(idx => (
                  <option key={idx.id} value={idx.id}>{idx.label} (lot {idx.lot})</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Expiry */}
          <div className="bt-param-group">
            <label>Expiry</label>
            <div className="bt-seg">
              {EXPIRY_TYPES.map(e => (
                <button key={e.id} className={`bt-seg-btn ${params.expiry === e.id ? 'bt-seg-active' : ''}`}
                  onClick={() => p('expiry', e.id)}>{e.label}</button>
              ))}
            </div>
          </div>

          {/* Entry/Exit time */}
          <div className="bt-param-group">
            <label>Entry</label>
            <select className="bt-select" value={params.entryTime} onChange={e => p('entryTime', e.target.value)}>
              {ENTRY_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="bt-param-group">
            <label>Exit</label>
            <select className="bt-select" value={params.exitTime} onChange={e => p('exitTime', e.target.value)}>
              {EXIT_TIMES.map(t => <option key={t} value={t}>{t === 'next_open' ? 'Next Open' : t}</option>)}
            </select>
          </div>

          {/* DTE */}
          <div className="bt-param-group">
            <label>DTE</label>
            <select className="bt-select" value={params.dte} onChange={e => p('dte', +e.target.value)}>
              {[0,1,2,3,4,5,7,10,14].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Lots */}
          <div className="bt-param-group">
            <label>Lots</label>
            <input className="bt-input" type="number" min={1} max={50} value={params.lots}
              onChange={e => p('lots', +e.target.value)} />
          </div>

          {/* Strike */}
          <div className="bt-param-group">
            <label>Strike</label>
            <select className="bt-select" value={params.strikePct} onChange={e => p('strikePct', +e.target.value)}>
              <option value={0}>ATM</option>
              <option value={1}>1 OTM</option>
              <option value={2}>2 OTM</option>
              <option value={3}>3 OTM</option>
            </select>
          </div>

          {/* Width (for spreads/condors) */}
          {strategy?.legs >= 4 && (
            <div className="bt-param-group">
              <label>Width</label>
              <select className="bt-select" value={params.width} onChange={e => p('width', +e.target.value)}>
                {[1,2,3,4,5].map(w => <option key={w} value={w}>{w} strikes</option>)}
              </select>
            </div>
          )}

          {/* SL / TP */}
          <div className="bt-param-group">
            <label>Stop Loss</label>
            <select className="bt-select" value={params.slPct ?? ''} onChange={e => p('slPct', e.target.value ? +e.target.value : null)}>
              <option value="">None</option>
              {[20,30,50,75,100].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>
          <div className="bt-param-group">
            <label>Target</label>
            <select className="bt-select" value={params.tpPct ?? ''} onChange={e => p('tpPct', e.target.value ? +e.target.value : null)}>
              <option value="">None</option>
              {[25,50,75,100].map(v => <option key={v} value={v}>{v}%</option>)}
            </select>
          </div>

          {/* Year range */}
          <div className="bt-param-group">
            <label>From</label>
            <select className="bt-select" value={params.fromYear} onChange={e => p('fromYear', +e.target.value)}>
              {[2018,2019,2020,2021,2022,2023,2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="bt-param-group">
            <label>To</label>
            <select className="bt-select" value={params.toYear} onChange={e => p('toYear', +e.target.value)}>
              {[2020,2021,2022,2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Run button */}
          <button className={`bt-run-btn ${!selected ? 'bt-run-disabled' : ''}`}
            disabled={!selected || loading} onClick={runBacktest}>
            {loading ? '...' : '▶ Run Backtest'}
          </button>
        </div>

        {/* ── Results ── */}
        {!selected && !results && (
          <div className="bt-empty">
            <div className="bt-empty-icon">📊</div>
            <div className="bt-empty-title">Select a strategy to begin</div>
            <div className="bt-empty-sub">Choose from 28 strategies on the left, configure parameters above, then run</div>
          </div>
        )}

        {selected && !results && !loading && !error && (
          <div className="bt-empty">
            <div className="bt-empty-icon" style={{ color: strategy?.groupColor }}>
              {strategy?.label}
            </div>
            <div className="bt-empty-title">{strategy?.outlook} · {strategy?.legs}-leg {strategy?.type}</div>
            <div className="bt-empty-sub">Configure parameters above and click Run Backtest</div>
            <div className="bt-empty-note">
              Uses NSE historical data + Black-Scholes for premium estimation<br/>
              Results are based on EOD settlement prices. Not financial advice.
            </div>
          </div>
        )}

        {loading && (
          <div className="bt-loading-wrap">
            <div className="bt-loading-spinner" />
            <div className="bt-loading-text">Running backtest...</div>
            <div className="bt-loading-sub">Fetching NSE data · Computing {params.expiry} {params.index} {strategy?.label}</div>
          </div>
        )}

        {error && (
          <div className="bt-error">
            <div className="bt-error-icon">⚠</div>
            <div>{error}</div>
          </div>
        )}

        {results && (
          <div className="bt-results">
            {/* Results header */}
            <div className="bt-results-hdr">
              <div className="bt-results-title">
                <span style={{ color: strategy?.groupColor }}>{strategy?.label}</span>
                <span className="bt-results-meta">{params.index} · {params.expiry} · {params.fromYear}-{params.toYear}</span>
              </div>
              <div className="bt-results-pnl" style={{ color: results.stats.totalPnl >= 0 ? 'var(--gain)' : 'var(--loss)' }}>
                {fmtCr(results.stats.totalPnl)}
              </div>
            </div>

            {/* Quick stats bar */}
            <div className="bt-quick-stats">
              <div className="bt-qs-item">
                <span className="bt-qs-l">Win Rate</span>
                <span className={`bt-qs-v ${results.stats.winRate >= 50 ? 'gain' : 'loss'}`}>{results.stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="bt-qs-sep" />
              <div className="bt-qs-item">
                <span className="bt-qs-l">Trades</span>
                <span className="bt-qs-v">{results.stats.totalTrades}</span>
              </div>
              <div className="bt-qs-sep" />
              <div className="bt-qs-item">
                <span className="bt-qs-l">Avg/Trade</span>
                <span className={`bt-qs-v ${results.stats.avgPnl >= 0 ? 'gain' : 'loss'}`}>{fmtCr(results.stats.avgPnl)}</span>
              </div>
              <div className="bt-qs-sep" />
              <div className="bt-qs-item">
                <span className="bt-qs-l">Max DD</span>
                <span className="bt-qs-v loss">{fmtCr(results.stats.maxDrawdown)}</span>
              </div>
              <div className="bt-qs-sep" />
              <div className="bt-qs-item">
                <span className="bt-qs-l">Profit Factor</span>
                <span className={`bt-qs-v ${results.stats.profitFactor >= 1 ? 'gain' : 'loss'}`}>{results.stats.profitFactor?.toFixed(2)}</span>
              </div>
              <div className="bt-qs-sep" />
              <div className="bt-qs-item">
                <span className="bt-qs-l">Sharpe</span>
                <span className={`bt-qs-v ${results.stats.sharpe >= 0 ? 'gain' : 'loss'}`}>{results.stats.sharpe?.toFixed(2)}</span>
              </div>
            </div>

            {/* Result tabs */}
            <div className="bt-result-tabs">
              {['summary','calendar','days','trades'].map(t => (
                <button key={t} className={`bt-rt-btn ${activeTab === t ? 'bt-rt-active' : ''}`}
                  onClick={() => setActiveTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'summary'  && <StatsGrid results={results} />}
            {activeTab === 'calendar' && <CalendarHeatmap results={results} />}
            {activeTab === 'days'     && <DayBreakdown results={results} />}
            {activeTab === 'trades'   && <TradeList results={results} />}

            <div className="bt-disclaimer">
              Based on NSE historical prices and Black-Scholes premium estimates. For educational reference only.
              Past performance does not guarantee future results. Not investment advice.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
