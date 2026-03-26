import { useState, useMemo, useCallback } from 'react';

// ── STRATEGY DATA ─────────────────────────────────────────────────────────────

const STRATEGIES = [
  {
    id: 'long_call', group: 'SINGLE LEG', label: 'Long Call',
    view: ['bullish'], complexity: 'Simple', credit: false,
    tagline: 'Bet the market goes up. Limited loss, unlimited profit.',
    explain: 'You buy the right to purchase Nifty at a fixed price. If Nifty rises above your strike + premium paid, you profit. If it falls, you only lose the premium paid — nothing more.',
    whenTo: 'When you expect a strong upward move before expiry. Best used before a positive event like RBI policy, earnings, or budget.',
    risk: 'Time decay hurts you every day. If Nifty stays flat or moves slowly, you lose the full premium even if the direction is right.',
    maxProfit: 'Unlimited', maxLoss: 'Premium paid',
  },
  {
    id: 'long_put', group: 'SINGLE LEG', label: 'Long Put',
    view: ['bearish'], complexity: 'Simple', credit: false,
    tagline: 'Bet the market goes down. Limited loss, large profit potential.',
    explain: 'You buy the right to sell Nifty at a fixed price. Profits when the market falls below your strike minus premium. Maximum loss is the premium paid.',
    whenTo: 'When you expect a sharp downward move. Useful as portfolio insurance during uncertain times.',
    risk: 'Time decay works against you. A slow grind down may not be enough to cover the premium paid.',
    maxProfit: 'Strike price minus premium', maxLoss: 'Premium paid',
  },
  {
    id: 'short_call', group: 'SINGLE LEG', label: 'Short Call',
    view: ['bearish', 'neutral'], complexity: 'Simple', credit: true,
    tagline: 'Collect premium. Profit if market stays flat or falls.',
    explain: 'You sell the right to buy Nifty at a fixed price. You collect premium upfront. Profit if Nifty stays below your strike at expiry.',
    whenTo: 'When you expect the market to stay flat or fall. Commonly sold against existing long positions.',
    risk: 'Unlimited loss if market rises sharply. Requires margin. Not suitable for beginners without a hedge.',
    maxProfit: 'Premium collected', maxLoss: 'Unlimited',
  },
  {
    id: 'short_put', group: 'SINGLE LEG', label: 'Short Put',
    view: ['bullish', 'neutral'], complexity: 'Simple', credit: true,
    tagline: 'Collect premium. Profit if market stays flat or rises.',
    explain: 'You sell the right to sell Nifty at a fixed price. Premium collected upfront. Profit if Nifty stays above your strike at expiry.',
    whenTo: 'When you expect the market to stay flat or rise. Popular income strategy during calm markets.',
    risk: 'Large loss if market falls sharply below strike. Requires margin.',
    maxProfit: 'Premium collected', maxLoss: 'Strike minus premium',
  },
  {
    id: 'long_straddle', group: 'VOLATILITY', label: 'Long Straddle',
    view: ['volatile'], complexity: 'Medium', credit: false,
    tagline: 'Profit from a big move in either direction.',
    explain: 'Buy both a call and put at the same strike. Profit when Nifty moves sharply either up or down. The move must be large enough to cover both premiums paid.',
    whenTo: 'Before major events like Union Budget, RBI policy, election results — when you expect a big move but are unsure of direction.',
    risk: 'If the market stays flat, you lose both premiums. Theta decay accelerates near expiry.',
    maxProfit: 'Unlimited in either direction', maxLoss: 'Total premium paid for both legs',
  },
  {
    id: 'short_straddle', group: 'VOLATILITY', label: 'Short Straddle',
    view: ['neutral'], complexity: 'Medium', credit: true,
    tagline: 'Collect maximum premium. Profit if market barely moves.',
    explain: 'Sell both a call and put at the same strike. Collect premium from both. Profit if Nifty stays close to the strike at expiry.',
    whenTo: 'When implied volatility is high and you expect the market to stay in a tight range. Popular on weekly expiry days.',
    risk: 'Unlimited loss if market moves sharply in either direction. The most dangerous naked strategy.',
    maxProfit: 'Total premium collected', maxLoss: 'Unlimited',
  },
  {
    id: 'long_strangle', group: 'VOLATILITY', label: 'Long Strangle',
    view: ['volatile'], complexity: 'Medium', credit: false,
    tagline: 'Cheaper than straddle. Needs a bigger move to profit.',
    explain: 'Buy an OTM call and OTM put. Cheaper than a straddle since both options are out of the money. Requires a larger move to profit.',
    whenTo: 'Before events when you expect a large move but want to spend less than a straddle.',
    risk: 'Needs an even bigger move than straddle. Time decay hurts both legs.',
    maxProfit: 'Unlimited in either direction', maxLoss: 'Total premium paid',
  },
  {
    id: 'short_strangle', group: 'VOLATILITY', label: 'Short Strangle',
    view: ['neutral'], complexity: 'Medium', credit: true,
    tagline: 'Wider profit range than short straddle. Still unlimited risk.',
    explain: 'Sell OTM call and OTM put. Collect premium. Profitable as long as Nifty stays between the two strikes at expiry.',
    whenTo: 'When you expect low volatility and the market to stay in a range. Gives more room than a short straddle.',
    risk: 'Unlimited loss if market breaks out strongly in either direction.',
    maxProfit: 'Total premium collected', maxLoss: 'Unlimited',
  },
  {
    id: 'bull_call_spread', group: 'VERTICAL SPREADS', label: 'Bull Call Spread',
    view: ['bullish'], complexity: 'Medium', credit: false,
    tagline: 'Capped upside, capped downside. Bullish with defined risk.',
    explain: 'Buy a lower strike call, sell a higher strike call. The sold call reduces your cost. Profit capped at the higher strike.',
    whenTo: 'When moderately bullish. Cheaper than buying a naked call. Good for range-bound bullish views.',
    risk: 'Maximum loss is the net premium paid. Profit is capped at the spread width minus premium.',
    maxProfit: 'Spread width minus net premium', maxLoss: 'Net premium paid',
  },
  {
    id: 'bear_put_spread', group: 'VERTICAL SPREADS', label: 'Bear Put Spread',
    view: ['bearish'], complexity: 'Medium', credit: false,
    tagline: 'Capped downside profit, defined risk. Bearish with protection.',
    explain: 'Buy a higher strike put, sell a lower strike put. Lower cost than buying a naked put. Profit capped at the lower strike.',
    whenTo: 'When moderately bearish. Reduces premium cost compared to a straight long put.',
    risk: 'Maximum loss is the net premium paid.',
    maxProfit: 'Spread width minus net premium', maxLoss: 'Net premium paid',
  },
  {
    id: 'short_iron_condor', group: 'IRON STRATS', label: 'Short Iron Condor',
    view: ['neutral'], complexity: 'Complex', credit: true,
    tagline: 'The professional income strategy. Profit in a range.',
    explain: 'Sell OTM call spread + sell OTM put spread. Collect premium from both sides. Profit as long as Nifty stays between the inner strikes at expiry. Risk is defined and capped.',
    whenTo: 'When you expect low volatility and the market to stay in a range. The go-to strategy for consistent income traders.',
    risk: 'Loss is capped at spread width minus premium collected. Much safer than naked strangles.',
    maxProfit: 'Net premium collected', maxLoss: 'Spread width minus premium',
  },
  {
    id: 'short_iron_butterfly', group: 'IRON STRATS', label: 'Short Iron Butterfly',
    view: ['neutral'], complexity: 'Complex', credit: true,
    tagline: 'Maximum premium at exact strike. Tight profit zone.',
    explain: 'Sell ATM call and put, buy OTM call and put as wings. Collect maximum premium if Nifty expires exactly at your strike.',
    whenTo: 'When you have a very precise view on where the market will expire. Higher reward than iron condor but narrower range.',
    risk: 'Loss is capped but the profit zone is narrow. Hard to manage near expiry.',
    maxProfit: 'Net premium collected', maxLoss: 'Wing width minus premium',
  },
  {
    id: 'long_call_butterfly', group: 'BUTTERFLY', label: 'Long Call Butterfly',
    view: ['neutral'], complexity: 'Complex', credit: false,
    tagline: 'Low cost, high reward if market pins exactly at strike.',
    explain: 'Buy 1 lower call, sell 2 ATM calls, buy 1 higher call. Maximum profit if Nifty expires exactly at the middle strike. Very low cost.',
    whenTo: 'When you expect the market to pin near a specific level at expiry. Very cheap to enter.',
    risk: 'Maximum loss is the small net premium paid. Very forgiving on the downside.',
    maxProfit: 'Wing width minus net premium', maxLoss: 'Net premium paid',
  },
  {
    id: 'long_iron_condor', group: 'IRON STRATS', label: 'Long Iron Condor',
    view: ['volatile'], complexity: 'Complex', credit: false,
    tagline: 'Profit from a big move breaking out of range.',
    explain: 'Buy OTM call spread + buy OTM put spread. Profit if Nifty breaks out strongly in either direction. Defined risk.',
    whenTo: 'Before major events when you expect a breakout but want defined risk.',
    risk: 'Net debit paid is the maximum loss. Market must break out strongly to profit.',
    maxProfit: 'Spread width minus net premium', maxLoss: 'Net premium paid',
  },
  {
    id: 'synthetic_long', group: 'SYNTHETIC', label: 'Synthetic Long',
    view: ['bullish'], complexity: 'Medium', credit: false,
    tagline: 'Acts like holding Nifty futures. Unlimited upside and downside.',
    explain: 'Buy ATM call, sell ATM put at the same strike. Behaves like a long futures position. No premium outflow if strikes are equal.',
    whenTo: 'When strongly bullish and want futures-like exposure with options flexibility.',
    risk: 'Unlimited loss on downside just like futures. Full directional exposure.',
    maxProfit: 'Unlimited', maxLoss: 'Unlimited',
  },
  {
    id: 'synthetic_short', group: 'SYNTHETIC', label: 'Synthetic Short',
    view: ['bearish'], complexity: 'Medium', credit: false,
    tagline: 'Acts like short Nifty futures. Profit from any fall.',
    explain: 'Sell ATM call, buy ATM put. Behaves like a short futures position.',
    whenTo: 'When strongly bearish and want futures-like exposure.',
    risk: 'Unlimited loss if market rises sharply.',
    maxProfit: 'Unlimited', maxLoss: 'Unlimited',
  },
];

const VIEWS = [
  { id: 'all',      label: 'All Strategies' },
  { id: 'bullish',  label: 'Bullish' },
  { id: 'bearish',  label: 'Bearish' },
  { id: 'neutral',  label: 'Neutral' },
  { id: 'volatile', label: 'Volatile' },
];

const COMPLEXITY_COLOR = { Simple: '#00C896', Medium: '#F59E0B', Complex: '#FF4455' };
const VIEW_COLOR = { bullish: '#00C896', bearish: '#FF4455', neutral: '#F59E0B', volatile: '#4A9EFF' };

// ── DEFAULT LEGS ──────────────────────────────────────────────────────────────

function defaultLegs(stratId, spot) {
  const step = spot > 10000 ? 100 : 50;
  const atm  = Math.round(spot / step) * step;
  const w    = step * 2;

  const C = (K, p, q) => ({ type: 'call', qty: q, strike: K, premium: p });
  const P = (K, p, q) => ({ type: 'put',  qty: q, strike: K, premium: p });

  const map = {
    long_call:   [C(atm,150,1)],
    long_put:    [P(atm,150,1)],
    short_call:  [C(atm,150,-1)],
    short_put:   [P(atm,150,-1)],
    long_straddle:   [C(atm,150,1), P(atm,150,1)],
    short_straddle:  [C(atm,150,-1), P(atm,150,-1)],
    long_strangle:   [C(atm+w,100,1), P(atm-w,100,1)],
    short_strangle:  [C(atm+w,100,-1), P(atm-w,100,-1)],
    long_guts:       [C(atm-w,250,1), P(atm+w,250,1)],
    short_guts:      [C(atm-w,250,-1), P(atm+w,250,-1)],
    bull_call_spread: [C(atm,150,1), C(atm+w,70,-1)],
    bear_call_spread: [C(atm,150,-1), C(atm+w,70,1)],
    bull_put_spread:  [P(atm-w,70,-1), P(atm,150,1)],
    bear_put_spread:  [P(atm,150,1), P(atm-w,70,-1)],
    short_iron_condor:    [P(atm-w*2,40,1), P(atm-w,80,-1), C(atm+w,80,-1), C(atm+w*2,40,1)],
    long_iron_condor:     [P(atm-w*2,40,-1), P(atm-w,80,1), C(atm+w,80,1), C(atm+w*2,40,-1)],
    short_iron_butterfly: [P(atm-w,80,1), P(atm,150,-1), C(atm,150,-1), C(atm+w,80,1)],
    long_iron_butterfly:  [P(atm-w,80,-1), P(atm,150,1), C(atm,150,1), C(atm+w,80,-1)],
    long_call_butterfly:  [C(atm-w,120,1), C(atm,150,-2), C(atm+w,80,1)],
    short_call_butterfly: [C(atm-w,120,-1), C(atm,150,2), C(atm+w,80,-1)],
    long_put_butterfly:   [P(atm-w,80,1), P(atm,150,-2), P(atm+w,120,1)],
    short_put_butterfly:  [P(atm-w,80,-1), P(atm,150,2), P(atm+w,120,-1)],
    long_call_condor:  [C(atm-w*2,150,1), C(atm-w,120,-1), C(atm+w,80,-1), C(atm+w*2,60,1)],
    short_call_condor: [C(atm-w*2,150,-1), C(atm-w,120,1), C(atm+w,80,1), C(atm+w*2,60,-1)],
    long_put_condor:   [P(atm-w*2,60,1), P(atm-w,80,-1), P(atm+w,120,-1), P(atm+w*2,150,1)],
    short_put_condor:  [P(atm-w*2,60,-1), P(atm-w,80,1), P(atm+w,120,1), P(atm+w*2,150,-1)],
    synthetic_long:  [C(atm,150,1), P(atm,150,-1)],
    synthetic_short: [C(atm,150,-1), P(atm,150,1)],
  };
  return (map[stratId] || map.long_call).map(l => ({ ...l }));
}

// ── PAYOFF DIAGRAM ────────────────────────────────────────────────────────────

function PayoffDiagram({ legs, spot, lots = 1, lotSize = 75, height = 240 }) {
  const [hoverX, setHoverX] = useState(null);

  const { range, pnls, breakevens } = useMemo(() => {
    const strikes = legs.map(l => l.strike);
    const minS = Math.min(...strikes), maxS = Math.max(...strikes);
    const step  = spot > 10000 ? 50 : 25;
    const pad   = Math.max((maxS - minS) * 0.8, step * 12);
    const from  = Math.min(minS - pad, spot - pad);
    const to    = Math.max(maxS + pad, spot + pad);
    const range = [];
    for (let s = from; s <= to; s += step) range.push(Math.round(s));

    const pnls = range.map(s => {
      let total = 0;
      for (const leg of legs) {
        const intrinsic = leg.type === 'call'
          ? Math.max(0, s - leg.strike)
          : Math.max(0, leg.strike - s);
        total += leg.qty * (intrinsic - leg.premium) * lots * lotSize;
      }
      return Math.round(total);
    });

    const breakevens = [];
    for (let i = 0; i < pnls.length - 1; i++) {
      if ((pnls[i] < 0 && pnls[i+1] >= 0) || (pnls[i] >= 0 && pnls[i+1] < 0)) {
        const frac = -pnls[i] / (pnls[i+1] - pnls[i]);
        breakevens.push(Math.round(range[i] + frac * (range[i+1] - range[i])));
      }
    }
    return { range, pnls, breakevens };
  }, [legs, spot, lots, lotSize]);

  const W = 700, H = height;
  const PAD = { t: 20, r: 24, b: 40, l: 68 };
  const CW  = W - PAD.l - PAD.r;
  const CH  = H - PAD.t - PAD.b;

  const maxP = Math.max(...pnls, 0);
  const minP = Math.min(...pnls, 0);
  const span = Math.max(maxP - minP, 1);

  const toX = s  => PAD.l + ((s  - range[0])  / (range[range.length-1] - range[0])) * CW;
  const toY = p  => PAD.t + CH - ((p  - minP)  / span)  * CH;
  const zeroY    = toY(0);
  const spotX    = toX(spot);

  // Build SVG path
  const pts  = range.map((s, i) => ({ x: toX(s), y: toY(pnls[i]), p: pnls[i] }));
  const pathD = pts.map((pt, i) => `${i===0?'M':'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

  // Green fill (profit zone)
  const greenFill = (() => {
    let d = '';
    let inProfit = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.p >= 0 && !inProfit) {
        inProfit = true;
        d += `M${p.x.toFixed(1)},${zeroY.toFixed(1)} L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      } else if (p.p >= 0 && inProfit) {
        d += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      } else if (p.p < 0 && inProfit) {
        inProfit = false;
        d += ` L${pts[i-1].x.toFixed(1)},${zeroY.toFixed(1)} Z`;
      }
    }
    if (inProfit) d += ` L${pts[pts.length-1].x.toFixed(1)},${zeroY.toFixed(1)} Z`;
    return d;
  })();

  // Red fill (loss zone)
  const redFill = (() => {
    let d = '';
    let inLoss = false;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.p < 0 && !inLoss) {
        inLoss = true;
        d += `M${p.x.toFixed(1)},${zeroY.toFixed(1)} L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      } else if (p.p < 0 && inLoss) {
        d += ` L${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      } else if (p.p >= 0 && inLoss) {
        inLoss = false;
        d += ` L${pts[i-1].x.toFixed(1)},${zeroY.toFixed(1)} Z`;
      }
    }
    if (inLoss) d += ` L${pts[pts.length-1].x.toFixed(1)},${zeroY.toFixed(1)} Z`;
    return d;
  })();

  // Hover interpolation
  const hoverPnl = useMemo(() => {
    if (hoverX === null) return null;
    const s = range[0] + (hoverX - PAD.l) / CW * (range[range.length-1] - range[0]);
    let total = 0;
    for (const leg of legs) {
      const intrinsic = leg.type === 'call'
        ? Math.max(0, s - leg.strike)
        : Math.max(0, leg.strike - s);
      total += leg.qty * (intrinsic - leg.premium) * lots * lotSize;
    }
    return { s: Math.round(s), p: Math.round(total), x: hoverX, y: toY(total) };
  }, [hoverX, range, legs, lots, lotSize]);

  const fmt = n => {
    const abs = Math.abs(n);
    if (abs >= 100000) return `${n < 0 ? '-' : '+'}₹${(abs/100000).toFixed(1)}L`;
    if (abs >= 1000)   return `${n < 0 ? '-' : '+'}₹${(abs/1000).toFixed(1)}k`;
    return `${n < 0 ? '-' : '+'}₹${abs}`;
  };

  // Y-axis labels
  const yLabels = [minP, minP/2, 0, maxP/2, maxP].filter(v => v !== 0 || true);

  // X-axis labels - strikes + spot
  const strikes = [...new Set(legs.map(l => l.strike))];
  const xLabelPrices = [...new Set([...strikes, spot])].sort((a,b)=>a-b);

  return (
    <div className="sp-diagram" onMouseLeave={() => setHoverX(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', cursor: 'crosshair' }}
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width * W;
          if (x >= PAD.l && x <= PAD.l + CW) setHoverX(x);
        }}
      >
        <defs>
          <clipPath id="sp-clip">
            <rect x={PAD.l} y={PAD.t} width={CW} height={CH} />
          </clipPath>
        </defs>

        {/* Zero line */}
        {zeroY >= PAD.t && zeroY <= PAD.t + CH && (
          <line x1={PAD.l} y1={zeroY} x2={PAD.l+CW} y2={zeroY}
            stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="6,4" />
        )}

        {/* Green fill */}
        <path d={greenFill} fill="rgba(0,200,150,0.15)" clipPath="url(#sp-clip)" />

        {/* Red fill */}
        <path d={redFill} fill="rgba(255,68,85,0.15)" clipPath="url(#sp-clip)" />

        {/* Payoff curve */}
        <path d={pathD} fill="none" stroke="#4A9EFF" strokeWidth="2.5"
          strokeLinejoin="round" clipPath="url(#sp-clip)" />

        {/* Breakeven markers */}
        {breakevens.map((be, i) => {
          const bx = toX(be);
          return (
            <g key={i}>
              <line x1={bx} y1={PAD.t} x2={bx} y2={PAD.t+CH}
                stroke="rgba(245,158,11,0.5)" strokeWidth="1" strokeDasharray="4,3" />
              <circle cx={bx} cy={zeroY} r="4" fill="#F59E0B" />
              <text x={bx} y={PAD.t+CH+14} textAnchor="middle"
                fill="#F59E0B" fontSize="10" fontFamily="monospace">{be.toLocaleString('en-IN')}</text>
            </g>
          );
        })}

        {/* Spot line */}
        {spotX >= PAD.l && spotX <= PAD.l+CW && (
          <g>
            <line x1={spotX} y1={PAD.t} x2={spotX} y2={PAD.t+CH}
              stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="3,3" />
            <text x={spotX} y={PAD.t-6} textAnchor="middle"
              fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="monospace">SPOT</text>
          </g>
        )}

        {/* Y-axis */}
        {[-1, 0, 1].map(f => {
          const v = f === 0 ? 0 : f > 0 ? maxP * 0.7 : minP * 0.7;
          const y = toY(v);
          if (y < PAD.t || y > PAD.t+CH) return null;
          return (
            <g key={f}>
              <line x1={PAD.l-4} y1={y} x2={PAD.l} y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <text x={PAD.l-8} y={y+4} textAnchor="end"
                fill={v > 0 ? '#00C896' : v < 0 ? '#FF4455' : 'rgba(255,255,255,0.4)'}
                fontSize="10" fontFamily="monospace">
                {v === 0 ? '0' : fmt(v)}
              </text>
            </g>
          );
        })}

        {/* Hover line + tooltip */}
        {hoverPnl && hoverPnl.x >= PAD.l && hoverPnl.x <= PAD.l+CW && (
          <g>
            <line x1={hoverPnl.x} y1={PAD.t} x2={hoverPnl.x} y2={PAD.t+CH}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx={hoverPnl.x} cy={Math.min(Math.max(hoverPnl.y, PAD.t), PAD.t+CH)}
              r="5" fill={hoverPnl.p >= 0 ? '#00C896' : '#FF4455'}
              stroke="var(--bg)" strokeWidth="2" />
            {/* Tooltip box */}
            {(() => {
              const tx = hoverPnl.x > PAD.l + CW * 0.7 ? hoverPnl.x - 110 : hoverPnl.x + 10;
              const ty = 28;
              return (
                <g>
                  <rect x={tx} y={ty} width={100} height={42} rx="4"
                    fill="var(--bg4)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                  <text x={tx+50} y={ty+14} textAnchor="middle"
                    fill="rgba(255,255,255,0.6)" fontSize="10" fontFamily="monospace">
                    {hoverPnl.s.toLocaleString('en-IN')}
                  </text>
                  <text x={tx+50} y={ty+30} textAnchor="middle"
                    fill={hoverPnl.p >= 0 ? '#00C896' : '#FF4455'}
                    fontSize="13" fontWeight="700" fontFamily="monospace">
                    {fmt(hoverPnl.p)}
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* X-axis border */}
        <line x1={PAD.l} y1={PAD.t+CH} x2={PAD.l+CW} y2={PAD.t+CH}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </svg>

      {/* Breakeven legend below chart */}
      {breakevens.length > 0 && (
        <div className="sp-breakevens">
          {breakevens.map((be, i) => (
            <span key={i} className="sp-be-tag">
              BE{breakevens.length > 1 ? i+1 : ''} {be.toLocaleString('en-IN')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STRATEGY CARD ─────────────────────────────────────────────────────────────

function StrategyCard({ strat, isSelected, onSelect, spot }) {
  const legs    = defaultLegs(strat.id, spot);
  const LOT     = 75;
  const netCost = -legs.reduce((s, l) => s + l.qty * l.premium, 0);

  return (
    <div
      className={`sp-card ${isSelected ? 'sp-card-active' : ''}`}
      onClick={() => onSelect(strat.id)}
    >
      <div className="sp-card-header">
        <span className="sp-card-name">{strat.label}</span>
        <span className="sp-card-credit" style={{ color: strat.credit ? '#00C896' : '#FF4455' }}>
          {strat.credit ? 'CREDIT' : 'DEBIT'}
        </span>
      </div>
      <div className="sp-card-tagline">{strat.tagline}</div>
      <div className="sp-card-footer">
        <span className="sp-card-complexity" style={{ color: COMPLEXITY_COLOR[strat.complexity] }}>
          {strat.complexity}
        </span>
        <span className="sp-card-views">
          {strat.view.map(v => (
            <span key={v} style={{ color: VIEW_COLOR[v] }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

// ── STRATEGY DETAIL ───────────────────────────────────────────────────────────

function StrategyDetail({ strat, spot, data }) {
  const LOT_SIZE = 75;
  const [legs, setLegs]   = useState(() => defaultLegs(strat.id, spot));
  const [lots, setLots]   = useState(1);
  const [localSpot, setLocalSpot] = useState(spot);

  const updateLeg = (i, field, val) => {
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: +val } : l));
  };

  const netPremium = legs.reduce((s, l) => s + l.qty * l.premium, 0);
  const isCredit   = netPremium < 0;

  // Stats
  const { pnls, range } = useMemo(() => {
    const strikes = legs.map(l => l.strike);
    const minS = Math.min(...strikes), maxS = Math.max(...strikes);
    const step = localSpot > 10000 ? 50 : 25;
    const pad  = Math.max((maxS - minS) * 1.2, step * 15);
    const range = [];
    for (let s = Math.min(minS, localSpot) - pad; s <= Math.max(maxS, localSpot) + pad; s += step) {
      range.push(Math.round(s));
    }
    const pnls = range.map(s => {
      let total = 0;
      for (const leg of legs) {
        const intrinsic = leg.type === 'call' ? Math.max(0, s - leg.strike) : Math.max(0, leg.strike - s);
        total += leg.qty * (intrinsic - leg.premium) * lots * LOT_SIZE;
      }
      return Math.round(total);
    });
    return { pnls, range };
  }, [legs, lots, localSpot]);

  const maxProfit = Math.max(...pnls);
  const maxLoss   = Math.min(...pnls);
  const isUnlimited = v => Math.abs(v) > 10000000;
  const fmt = n => {
    const abs = Math.abs(n);
    if (isUnlimited(n)) return 'Unlimited';
    if (abs >= 100000) return `₹${(abs/100000).toFixed(1)}L`;
    if (abs >= 1000)   return `₹${(abs/1000).toFixed(1)}k`;
    return `₹${abs.toLocaleString('en-IN')}`;
  };

  return (
    <div className="sp-detail">
      {/* Header */}
      <div className="sp-detail-header">
        <div>
          <div className="sp-detail-title">{strat.label}</div>
          <div className="sp-detail-tagline">{strat.tagline}</div>
        </div>
        <div className="sp-detail-badges">
          <span className="sp-badge" style={{ color: COMPLEXITY_COLOR[strat.complexity], borderColor: COMPLEXITY_COLOR[strat.complexity] + '40' }}>
            {strat.complexity}
          </span>
          <span className="sp-badge" style={{ color: isCredit ? '#00C896' : '#FF4455', borderColor: (isCredit ? '#00C896' : '#FF4455') + '40' }}>
            {isCredit ? 'CREDIT' : 'DEBIT'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="sp-stats-row">
        <div className="sp-stat">
          <div className="sp-stat-label">Max Profit</div>
          <div className="sp-stat-val gain">{fmt(maxProfit)}</div>
        </div>
        <div className="sp-stat">
          <div className="sp-stat-label">Max Loss</div>
          <div className="sp-stat-val loss">{fmt(maxLoss)}</div>
        </div>
        <div className="sp-stat">
          <div className="sp-stat-label">Net {isCredit ? 'Credit' : 'Debit'}</div>
          <div className="sp-stat-val" style={{ color: isCredit ? '#00C896' : '#FF4455' }}>
            ₹{Math.abs(netPremium * lots * LOT_SIZE).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="sp-stat">
          <div className="sp-stat-label">Risk:Reward</div>
          <div className="sp-stat-val" style={{ color: 'var(--text)' }}>
            {isUnlimited(maxLoss) || isUnlimited(maxProfit) ? 'Unlimited'
              : `1 : ${(Math.abs(maxProfit / maxLoss)).toFixed(1)}`}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="sp-explain-grid">
        <div className="sp-explain-block">
          <div className="sp-explain-head">What it is</div>
          <div className="sp-explain-text">{strat.explain}</div>
        </div>
        <div className="sp-explain-block">
          <div className="sp-explain-head">When to use</div>
          <div className="sp-explain-text">{strat.whenTo}</div>
        </div>
        <div className="sp-explain-block sp-explain-risk">
          <div className="sp-explain-head">What can go wrong</div>
          <div className="sp-explain-text">{strat.risk}</div>
        </div>
      </div>

      {/* Inputs */}
      <div className="sp-inputs-row">
        <label className="sp-input-group">
          <span>Spot</span>
          <input type="number" value={localSpot} step={50}
            onChange={e => { setLocalSpot(+e.target.value); setLegs(defaultLegs(strat.id, +e.target.value)); }}
            className="sp-input" />
        </label>
        <label className="sp-input-group">
          <span>Lots</span>
          <input type="number" value={lots} min={1} step={1}
            onChange={e => setLots(+e.target.value)} className="sp-input sp-input-sm" />
        </label>
      </div>

      {/* Leg editor */}
      <div className="sp-legs">
        {legs.map((leg, i) => (
          <div key={i} className={`sp-leg ${leg.qty > 0 ? 'sp-leg-buy' : 'sp-leg-sell'}`}>
            <span className="sp-leg-dir" style={{ color: leg.qty > 0 ? '#4A9EFF' : '#F59E0B' }}>
              {leg.qty > 0 ? 'BUY' : 'SELL'}{Math.abs(leg.qty) > 1 ? ` ${Math.abs(leg.qty)}x` : ''}
            </span>
            <span className="sp-leg-type" style={{ color: leg.type === 'call' ? '#FF4455' : '#00C896' }}>
              {leg.type.toUpperCase()}
            </span>
            <label className="sp-leg-field">
              <span>Strike</span>
              <input type="number" value={leg.strike} step={50}
                onChange={e => updateLeg(i, 'strike', e.target.value)} className="sp-leg-input" />
            </label>
            <label className="sp-leg-field">
              <span>Premium</span>
              <input type="number" value={leg.premium} step={5} min={1}
                onChange={e => updateLeg(i, 'premium', e.target.value)} className="sp-leg-input" />
            </label>
            <span className="sp-leg-cost" style={{ color: leg.qty > 0 ? '#FF4455' : '#00C896' }}>
              {leg.qty > 0 ? '-' : '+'}₹{Math.abs(leg.qty * leg.premium * lots * LOT_SIZE).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* Payoff diagram */}
      <div className="sp-diagram-wrap">
        <div className="sp-diagram-title">PAYOFF AT EXPIRY <span>hover to see P&L at any price</span></div>
        <PayoffDiagram legs={legs} spot={localSpot} lots={lots} lotSize={LOT_SIZE} height={220} />
      </div>

      <div className="sp-disclaimer">Payoff shown at expiry only. For educational reference. Not investment advice.</div>
    </div>
  );
}

// ── COMPARE VIEW ──────────────────────────────────────────────────────────────

function CompareView({ spot }) {
  const [stratA, setStratA] = useState('short_straddle');
  const [stratB, setStratB] = useState('short_iron_condor');

  const allStrats = STRATEGIES.map(s => ({ id: s.id, label: s.label }));
  const LOT_SIZE  = 75;

  const renderSide = (stratId, setFn, label) => {
    const strat = STRATEGIES.find(s => s.id === stratId);
    const legs  = defaultLegs(stratId, spot);
    return (
      <div className="sp-compare-side">
        <select className="sp-compare-select" value={stratId} onChange={e => setFn(e.target.value)}>
          {allStrats.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        {strat && (
          <>
            <div className="sp-compare-tagline">{strat.tagline}</div>
            <PayoffDiagram legs={legs} spot={spot} lots={1} lotSize={LOT_SIZE} height={180} />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="sp-compare">
      <div className="sp-compare-title">COMPARE STRATEGIES</div>
      <div className="sp-compare-grid">
        {renderSide(stratA, setStratA, 'A')}
        <div className="sp-compare-vs">VS</div>
        {renderSide(stratB, setStratB, 'B')}
      </div>
    </div>
  );
}

// ── MAIN STRATEGY PAGE ────────────────────────────────────────────────────────

export default function StrategyPage({ data }) {
  const spot = data?.nifty50?.price ? Math.round(data.nifty50.price / 50) * 50 : 23000;
  const [view,       setView]       = useState('all');
  const [selectedId, setSelectedId] = useState('short_straddle');
  const [showCompare, setShowCompare] = useState(false);

  const filtered = view === 'all'
    ? STRATEGIES
    : STRATEGIES.filter(s => s.view.includes(view));

  const selectedStrat = STRATEGIES.find(s => s.id === selectedId) || STRATEGIES[0];

  // Group filtered strategies
  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  return (
    <div className="sp-root">
      {/* View filter */}
      <div className="sp-view-bar">
        <div className="sp-view-label">Your market view:</div>
        <div className="sp-view-tabs">
          {VIEWS.map(v => (
            <button key={v.id}
              className={`sp-view-btn ${view === v.id ? 'sp-view-active' : ''}`}
              onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <button className={`sp-compare-toggle ${showCompare ? 'sp-compare-on' : ''}`}
          onClick={() => setShowCompare(v => !v)}>
          {showCompare ? 'Hide Compare' : 'Compare Strategies'}
        </button>
      </div>

      <div className="sp-layout">
        {/* Left — strategy cards */}
        <div className="sp-cards-panel">
          {Object.entries(grouped).map(([group, strats]) => (
            <div key={group} className="sp-group">
              <div className="sp-group-label">{group}</div>
              {strats.map(s => (
                <StrategyCard key={s.id} strat={s}
                  isSelected={selectedId === s.id}
                  onSelect={setSelectedId}
                  spot={spot} />
              ))}
            </div>
          ))}
        </div>

        {/* Right — detail */}
        <div className="sp-detail-panel">
          <StrategyDetail strat={selectedStrat} spot={spot} data={data} />
          {showCompare && <CompareView spot={spot} />}
        </div>
      </div>
    </div>
  );
}
