// src/components/Backtest.jsx
// Strategy Education Cards. learn every options strategy with Nifty examples
import { useState } from 'react';

// ── Strategy definitions with full educational content ───────────────────────
const STRATEGY_GROUPS = [
  {
    group: 'SINGLE LEG',
    color: '#4A9EFF',
    strategies: [
      {
        id: 'long_call', label: 'Long Call', legs: 1, type: 'debit', outlook: 'Bullish',
        risk: 'Limited', reward: 'Unlimited', difficulty: 'Beginner',
        tagline: 'Bet on a rally with limited risk.',
        when: 'When you expect Nifty to rise sharply before expiry. Best when VIX is low so premiums are cheap.',
        how: 'Buy 1 ATM or OTM call option. You pay a premium upfront. If Nifty rises above your strike, you profit. If it falls or stays flat, you lose only the premium paid.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22000, premium: 150 }], maxProfit: 'Unlimited above 22150', maxLoss: '₹150 × 65 = ₹9,750', breakeven: '22150' },
        tips: ['Buy when IV is below 15 for cheaper entry', 'Avoid buying on expiry day. time decay kills value fast', 'Exit at 50% profit rather than holding to expiry'],
        payoffType: 'long_call',
      },
      {
        id: 'long_put', label: 'Long Put', legs: 1, type: 'debit', outlook: 'Bearish',
        risk: 'Limited', reward: 'High', difficulty: 'Beginner',
        tagline: 'Profit from a market fall.',
        when: 'When you expect Nifty to fall before expiry. Great as portfolio insurance during uncertain times.',
        how: 'Buy 1 put option. You pay a premium. If Nifty falls below your strike, the put gains value. If Nifty rises, you lose only the premium.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'PE', strike: 22000, premium: 140 }], maxProfit: 'Up to ₹22000 × 65 (if Nifty goes to 0)', maxLoss: '₹140 × 65 = ₹9,100', breakeven: '21860' },
        tips: ['Buy puts before major events like budget, elections, RBI policy', 'Deep OTM puts are cheaper but need a bigger fall', 'Rolling down: if Nifty falls, sell your put and buy a lower strike'],
        payoffType: 'long_put',
      },
      {
        id: 'short_call', label: 'Short Call', legs: 1, type: 'credit', outlook: 'Neutral/Bearish',
        risk: 'Unlimited', reward: 'Limited', difficulty: 'Intermediate',
        tagline: 'Collect premium when markets are flat or falling.',
        when: 'When you expect Nifty to stay below a certain level. High VIX means higher premiums = better income.',
        how: 'Sell 1 call option and collect premium. If Nifty stays below your strike at expiry, you keep the entire premium. If Nifty rises above strike, losses are theoretically unlimited.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22200, premium: 90 }], maxProfit: '₹90 × 65 = ₹5,850', maxLoss: 'Unlimited above 22290', breakeven: '22290' },
        tips: ['Sell OTM calls. gives more room before the trade goes wrong', 'Always keep a mental stop loss at 2x the premium collected', 'Best on Thursday expiry day when time decay is fastest'],
        payoffType: 'short_call',
      },
      {
        id: 'short_put', label: 'Short Put', legs: 1, type: 'credit', outlook: 'Neutral/Bullish',
        risk: 'High', reward: 'Limited', difficulty: 'Intermediate',
        tagline: 'Get paid to buy Nifty at a lower price.',
        when: 'When you expect Nifty to stay above a level. You are comfortable buying Nifty if it falls to your strike.',
        how: 'Sell 1 put option and collect premium. If Nifty stays above your strike, you keep the full premium. If Nifty falls below, you face losses. but you were willing to own it at that level.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'PE', strike: 21800, premium: 85 }], maxProfit: '₹85 × 65 = ₹5,525', maxLoss: 'Up to ₹21715 × 65 (Nifty to 0)', breakeven: '21715' },
        tips: ['Sell puts below strong support levels', 'Naked short puts require large margin. check before entering', 'Great strategy in bull markets when support holds'],
        payoffType: 'short_put',
      },
    ],
  },
  {
    group: 'VOLATILITY',
    color: '#F59E0B',
    strategies: [
      {
        id: 'long_straddle', label: 'Long Straddle', legs: 2, type: 'debit', outlook: 'High vol',
        risk: 'Limited', reward: 'Unlimited', difficulty: 'Intermediate',
        tagline: 'Profit from a big move in either direction.',
        when: 'Before major events. budget, RBI policy, election results, earnings. You expect a big move but do not know which way.',
        how: 'Buy 1 ATM call and 1 ATM put at the same strike. Pay premium for both. Profit if Nifty moves sharply up or down. Lose if Nifty stays near the strike.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22000, premium: 150 }, { action: 'BUY', type: 'PE', strike: 22000, premium: 140 }], maxProfit: 'Unlimited on either side', maxLoss: '₹290 × 65 = ₹18,850', breakeven: 'Below 21710 or above 22290' },
        tips: ['Enter 2-3 days before the event, not on the day', 'Exit just before or just after the event announcement', 'If IV is already very high, the move may already be priced in'],
        payoffType: 'long_straddle',
      },
      {
        id: 'short_straddle', label: 'Short Straddle', legs: 2, type: 'credit', outlook: 'Low vol',
        risk: 'Unlimited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Collect premium when you expect no big move.',
        when: 'When Nifty is range-bound and you expect it to stay near current levels. High VIX is ideal as premiums are elevated and you collect more.',
        how: 'Sell 1 ATM call and 1 ATM put at the same strike price. Collect premium from both legs. If Nifty expires at or near your strike, both options expire worthless and you keep the full premium.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22000, premium: 150 }, { action: 'SELL', type: 'PE', strike: 22000, premium: 140 }], maxProfit: '₹290 × 65 = ₹18,850', maxLoss: 'Unlimited on either side', breakeven: 'Below 21710 or above 22290' },
        tips: ['Most popular among professional traders on expiry Thursday/Tuesday', 'Keep strict stop loss. exit if Nifty moves more than 1% from strike', 'Collect more premium closer to expiry (faster time decay)'],
        payoffType: 'short_straddle',
      },
      {
        id: 'long_strangle', label: 'Long Strangle', legs: 2, type: 'debit', outlook: 'High vol',
        risk: 'Limited', reward: 'Unlimited', difficulty: 'Intermediate',
        tagline: 'Cheaper than straddle. needs a bigger move.',
        when: 'Before big events when you expect a large move but want to pay less premium than a straddle.',
        how: 'Buy 1 OTM call and 1 OTM put. Both are cheaper than ATM options. Needs a bigger move to profit but costs less to enter.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22200, premium: 90 }, { action: 'BUY', type: 'PE', strike: 21800, premium: 85 }], maxProfit: 'Unlimited beyond either strike', maxLoss: '₹175 × 65 = ₹11,375', breakeven: 'Below 21625 or above 22375' },
        tips: ['Choose strikes 1-2% OTM for a good risk-reward balance', 'Cheaper entry than straddle but needs a stronger move to profit', 'Exit one side if the move starts to capture profit early'],
        payoffType: 'long_strangle',
      },
      {
        id: 'short_strangle', label: 'Short Strangle', legs: 2, type: 'credit', outlook: 'Low vol',
        risk: 'Unlimited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Wider range than straddle. more room to breathe.',
        when: 'When you expect Nifty to stay within a range. More forgiving than short straddle since strikes are farther from spot.',
        how: 'Sell 1 OTM call and 1 OTM put. Collect premium from both. Profit if Nifty stays between your two strikes at expiry.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22200, premium: 90 }, { action: 'SELL', type: 'PE', strike: 21800, premium: 85 }], maxProfit: '₹175 × 65 = ₹11,375', maxLoss: 'Unlimited beyond either side', breakeven: 'Below 21625 or above 22375' },
        tips: ['Preferred over short straddle for lower risk of early adjustment', 'Wider the strikes, lower the premium but more safety margin', 'Monitor carefully if Nifty approaches either short strike'],
        payoffType: 'short_strangle',
      },
    ],
  },
  {
    group: 'VERTICAL SPREADS',
    color: '#00C896',
    strategies: [
      {
        id: 'bull_call_spread', label: 'Bull Call Spread', legs: 2, type: 'debit', outlook: 'Bullish',
        risk: 'Limited', reward: 'Limited', difficulty: 'Intermediate',
        tagline: 'Defined risk bullish bet. cheaper than buying a call.',
        when: 'When you are moderately bullish. You want upside but not willing to pay full call premium.',
        how: 'Buy 1 lower strike call and sell 1 higher strike call. The sold call reduces your cost. Maximum profit if Nifty closes above the higher strike at expiry.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22000, premium: 150 }, { action: 'SELL', type: 'CE', strike: 22200, premium: 90 }], maxProfit: '(200 - 60) × 65 = ₹9,100', maxLoss: '₹60 × 65 = ₹3,900', breakeven: '22060' },
        tips: ['Net debit is 150 - 90 = ₹60 per unit', 'Best when you have a clear target for Nifty', 'Width of spread (200 pts here) caps your profit but also reduces cost'],
        payoffType: 'bull_call_spread',
      },
      {
        id: 'bear_call_spread', label: 'Bear Call Spread', legs: 2, type: 'credit', outlook: 'Bearish',
        risk: 'Limited', reward: 'Limited', difficulty: 'Intermediate',
        tagline: 'Profit from stagnation or a fall. with defined risk.',
        when: 'When you expect Nifty to stay below a level or fall. Safer than naked short call.',
        how: 'Sell 1 lower strike call and buy 1 higher strike call. Collect net premium. Profit if Nifty stays below the sold strike.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22200, premium: 90 }, { action: 'BUY', type: 'CE', strike: 22400, premium: 45 }], maxProfit: '₹45 × 65 = ₹2,925', maxLoss: '(200 - 45) × 65 = ₹10,075', breakeven: '22245' },
        tips: ['Net credit = 90 - 45 = ₹45', 'The bought call caps your loss if Nifty rallies hard', 'Good near resistance levels when rally expected to stall'],
        payoffType: 'bear_call_spread',
      },
      {
        id: 'bull_put_spread', label: 'Bull Put Spread', legs: 2, type: 'credit', outlook: 'Bullish',
        risk: 'Limited', reward: 'Limited', difficulty: 'Intermediate',
        tagline: 'Get paid to be bullish with defined downside.',
        when: 'When you expect Nifty to stay above a support level. Most popular credit spread for bullish traders.',
        how: 'Sell 1 higher strike put and buy 1 lower strike put. Collect net premium. Profit if Nifty stays above the sold put strike.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'PE', strike: 21800, premium: 85 }, { action: 'BUY', type: 'PE', strike: 21600, premium: 50 }], maxProfit: '₹35 × 65 = ₹2,275', maxLoss: '(200 - 35) × 65 = ₹10,725', breakeven: '21765' },
        tips: ['Net credit = 85 - 50 = ₹35', 'Place strikes below strong support levels for safety', 'The most used strategy by professional F&O traders in India'],
        payoffType: 'bull_put_spread',
      },
      {
        id: 'bear_put_spread', label: 'Bear Put Spread', legs: 2, type: 'debit', outlook: 'Bearish',
        risk: 'Limited', reward: 'Limited', difficulty: 'Intermediate',
        tagline: 'Cheap bearish position with capped upside.',
        when: 'When you expect a moderate fall in Nifty. Cheaper than buying a put outright.',
        how: 'Buy 1 higher strike put and sell 1 lower strike put. The sold put reduces your cost. Maximum profit if Nifty falls below the lower strike.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'PE', strike: 22000, premium: 140 }, { action: 'SELL', type: 'PE', strike: 21800, premium: 85 }], maxProfit: '(200 - 55) × 65 = ₹9,425', maxLoss: '₹55 × 65 = ₹3,575', breakeven: '21945' },
        tips: ['Net debit = 140 - 85 = ₹55', 'Good for hedging a long Nifty position', 'Wider spread = more potential profit but higher cost'],
        payoffType: 'bear_put_spread',
      },
    ],
  },
  {
    group: 'IRON STRATS',
    color: '#A78BFA',
    strategies: [
      {
        id: 'short_iron_condor', label: 'Short Iron Condor', legs: 4, type: 'credit', outlook: 'Neutral',
        risk: 'Limited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'The professional range-trading strategy.',
        when: 'When you expect Nifty to stay within a range. High VIX helps because you collect more premium.',
        how: 'Sell OTM call, buy further OTM call. Sell OTM put, buy further OTM put. Four legs total. Profit if Nifty stays within the sold strikes range.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22300, premium: 70 }, { action: 'BUY', type: 'CE', strike: 22500, premium: 35 }, { action: 'SELL', type: 'PE', strike: 21700, premium: 65 }, { action: 'BUY', type: 'PE', strike: 21500, premium: 35 }], maxProfit: '₹65 × 65 = ₹4,225', maxLoss: '(200 - 65) × 65 = ₹8,775', breakeven: 'Below 21635 or above 22365' },
        tips: ['Net credit = 70 - 35 + 65 - 35 = ₹65', 'Best strategy for consistent monthly income generation', 'Adjust one side if Nifty threatens to breach a short strike'],
        payoffType: 'short_iron_condor',
      },
      {
        id: 'long_iron_condor', label: 'Long Iron Condor', legs: 4, type: 'debit', outlook: 'High vol',
        risk: 'Limited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Bet on a breakout beyond a range.',
        when: 'When you expect Nifty to make a big move beyond a range but want to limit cost. Opposite of short iron condor.',
        how: 'Buy OTM call, sell further OTM call. Buy OTM put, sell further OTM put. Profit if Nifty moves beyond either outer strike.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22300, premium: 70 }, { action: 'SELL', type: 'CE', strike: 22500, premium: 35 }, { action: 'BUY', type: 'PE', strike: 21700, premium: 65 }, { action: 'SELL', type: 'PE', strike: 21500, premium: 35 }], maxProfit: '(200 - 65) × 65 = ₹8,775', maxLoss: '₹65 × 65 = ₹4,225', breakeven: 'Below 21635 or above 22365' },
        tips: ['Net debit = ₹65. defined cost', 'Less common than short iron condor in practice', 'Good before high-volatility events when direction is uncertain'],
        payoffType: 'long_iron_condor',
      },
      {
        id: 'short_iron_butterfly', label: 'Short Iron Butterfly', legs: 4, type: 'credit', outlook: 'Neutral',
        risk: 'Limited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Maximum reward if Nifty pins at your strike.',
        when: 'When you expect Nifty to close very close to current levels. Narrower than iron condor but higher reward.',
        how: 'Sell ATM call and ATM put. Buy OTM call and OTM put as protection. Very high premium collected if Nifty pins at the ATM strike.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22000, premium: 150 }, { action: 'SELL', type: 'PE', strike: 22000, premium: 140 }, { action: 'BUY', type: 'CE', strike: 22300, premium: 70 }, { action: 'BUY', type: 'PE', strike: 21700, premium: 65 }], maxProfit: '₹155 × 65 = ₹10,075', maxLoss: '(300 - 155) × 65 = ₹9,425', breakeven: 'Below 21845 or above 22155' },
        tips: ['Net credit = 150 + 140 - 70 - 65 = ₹155', 'Higher reward than iron condor but tighter range', 'Expiry day strategy. works when Nifty is pinned near a round number'],
        payoffType: 'short_iron_butterfly',
      },
      {
        id: 'long_iron_butterfly', label: 'Long Iron Butterfly', legs: 4, type: 'debit', outlook: 'High vol',
        risk: 'Limited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Low-cost bet on a breakout.',
        when: 'When you expect a sharp move from current levels but want defined risk. Opposite of short iron butterfly.',
        how: 'Buy ATM call and put. Sell OTM call and put. Profit if Nifty moves sharply beyond the OTM sold strikes.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22000, premium: 150 }, { action: 'BUY', type: 'PE', strike: 22000, premium: 140 }, { action: 'SELL', type: 'CE', strike: 22300, premium: 70 }, { action: 'SELL', type: 'PE', strike: 21700, premium: 65 }], maxProfit: '(300 - 155) × 65 = ₹9,425', maxLoss: '₹155 × 65 = ₹10,075', breakeven: 'Below 21845 or above 22155' },
        tips: ['Net debit = ₹155', 'Cheaper than buying a straddle with defined downside', 'Enter before events when big moves expected'],
        payoffType: 'long_iron_butterfly',
      },
    ],
  },
  {
    group: 'BUTTERFLY',
    color: '#EC4899',
    strategies: [
      {
        id: 'long_call_butterfly', label: 'Long Call Butterfly', legs: 3, type: 'debit', outlook: 'Neutral',
        risk: 'Limited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Low-cost bet on Nifty pinning at a price.',
        when: 'When you strongly believe Nifty will close at a specific level. Very cheap to enter.',
        how: 'Buy 1 lower call, sell 2 middle calls, buy 1 higher call. All calls, equidistant strikes. Maximum profit exactly at the middle strike.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 21800, premium: 230 }, { action: 'SELL', type: 'CE', strike: 22000, premium: 150 }, { action: 'SELL', type: 'CE', strike: 22000, premium: 150 }, { action: 'BUY', type: 'CE', strike: 22200, premium: 90 }], maxProfit: '(200 - 20) × 65 = ₹11,700', maxLoss: '₹20 × 65 = ₹1,300', breakeven: '21820 to 22180' },
        tips: ['Net debit = 230 - 150 - 150 + 90 = ₹20. very cheap', 'Highest reward-to-risk ratio but needs very precise prediction', 'Works well near round numbers like 22000 or 22500 that attract pin risk'],
        payoffType: 'long_call_butterfly',
      },
      {
        id: 'long_put_butterfly', label: 'Long Put Butterfly', legs: 3, type: 'debit', outlook: 'Neutral',
        risk: 'Limited', reward: 'Limited', difficulty: 'Advanced',
        tagline: 'Same as call butterfly. using puts instead.',
        when: 'When you expect Nifty to close at a specific level. Put version gives same payoff as call butterfly.',
        how: 'Buy 1 higher put, sell 2 middle puts, buy 1 lower put. All puts, equidistant strikes.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'PE', strike: 22200, premium: 200 }, { action: 'SELL', type: 'PE', strike: 22000, premium: 140 }, { action: 'SELL', type: 'PE', strike: 22000, premium: 140 }, { action: 'BUY', type: 'PE', strike: 21800, premium: 85 }], maxProfit: '(200 - 5) × 65 = ₹12,675', maxLoss: '₹5 × 65 = ₹325', breakeven: '21805 to 22195' },
        tips: ['Very cheap debit. often under ₹10 per unit', 'Nearly identical payoff to call butterfly due to put-call parity', 'Exit at 50-70% of max profit rather than waiting for exact pin'],
        payoffType: 'long_put_butterfly',
      },
    ],
  },
  {
    group: 'SYNTHETIC',
    color: '#06B6D4',
    strategies: [
      {
        id: 'synthetic_long', label: 'Synthetic Long', legs: 2, type: 'debit', outlook: 'Bullish',
        risk: 'High', reward: 'Unlimited', difficulty: 'Advanced',
        tagline: 'Act like you own Nifty futures. at lower margin.',
        when: 'When you are strongly bullish and want futures-like exposure without actually buying futures.',
        how: 'Buy 1 ATM call and sell 1 ATM put at the same strike. Behaves like owning Nifty futures. Profit if Nifty rises, loss if it falls.',
        example: { spot: 22000, legs: [{ action: 'BUY', type: 'CE', strike: 22000, premium: 150 }, { action: 'SELL', type: 'PE', strike: 22000, premium: 140 }], maxProfit: 'Unlimited above 22010', maxLoss: 'Unlimited below 22010', breakeven: '22010' },
        tips: ['Net debit is only ₹10. nearly free position', 'Same payoff as Nifty futures but different margin requirement', 'Use when futures roll cost is high near expiry'],
        payoffType: 'synthetic_long',
      },
      {
        id: 'synthetic_short', label: 'Synthetic Short', legs: 2, type: 'credit', outlook: 'Bearish',
        risk: 'High', reward: 'High', difficulty: 'Advanced',
        tagline: 'Act like you are short Nifty futures.',
        when: 'When you are strongly bearish. Creates short futures exposure using options.',
        how: 'Sell 1 ATM call and buy 1 ATM put at the same strike. Behaves like shorting Nifty futures.',
        example: { spot: 22000, legs: [{ action: 'SELL', type: 'CE', strike: 22000, premium: 150 }, { action: 'BUY', type: 'PE', strike: 22000, premium: 140 }], maxProfit: 'Unlimited below 21990', maxLoss: 'Unlimited above 21990', breakeven: '21990' },
        tips: ['Net credit of ₹10 received', 'Useful when you want to avoid futures position limits', 'Requires good margin management as losses are unlimited on upside'],
        payoffType: 'synthetic_short',
      },
    ],
  },
];

const ALL_STRATEGIES = STRATEGY_GROUPS.flatMap(g => g.strategies.map(s => ({ ...s, groupColor: g.color, group: g.group })));

// ── Payoff diagram SVG. improved ────────────────────────────────────────────
function PayoffDiagram({ type, spot = 22000, breakeven }) {
  const [hover, setHover] = useState(null);
  const W = 420, H = 160, PL = 48, PR = 16, PT = 20, PB = 36;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const prices = Array.from({ length: 200 }, (_, i) => spot * 0.87 + i * (spot * 0.26) / 199);

  function pnl(price) {
    const d = price - spot;
    switch (type) {
      case 'long_call':            return Math.max(0, d) - spot * 0.007;
      case 'long_put':             return Math.max(0, -d) - spot * 0.006;
      case 'short_call':           return spot * 0.004 - Math.max(0, d);
      case 'short_put':            return spot * 0.004 - Math.max(0, -d);
      case 'long_straddle':        return Math.max(Math.abs(d) - spot * 0.013, -spot * 0.013);
      case 'short_straddle':       return Math.min(spot * 0.013 - Math.abs(d), spot * 0.013);
      case 'long_strangle':        return Math.max(Math.abs(d) - spot * 0.02, -spot * 0.008);
      case 'short_strangle':       return Math.min(spot * 0.008 - Math.max(0, Math.abs(d) - spot * 0.009), spot * 0.008);
      case 'bull_call_spread':     return Math.min(Math.max(d, 0), spot * 0.009) - spot * 0.003;
      case 'bear_call_spread':     return spot * 0.002 - Math.min(Math.max(d - spot * 0.009, 0), spot * 0.009);
      case 'bull_put_spread':      return spot * 0.0016 - Math.min(Math.max(-d - spot * 0.009, 0), spot * 0.009);
      case 'bear_put_spread':      return Math.min(Math.max(-d, 0), spot * 0.009) - spot * 0.0025;
      case 'short_iron_condor':    return Math.min(spot * 0.003, spot * 0.003 - Math.max(0, Math.abs(d) - spot * 0.014));
      case 'long_iron_condor':     return Math.min(Math.max(Math.abs(d) - spot * 0.014, 0) - spot * 0.003, spot * 0.006);
      case 'short_iron_butterfly': return Math.min(spot * 0.007 - Math.abs(d), spot * 0.007);
      case 'long_iron_butterfly':  return Math.min(Math.max(Math.abs(d) - spot * 0.007, 0), spot * 0.007) - spot * 0.007;
      case 'long_call_butterfly':  return Math.max(Math.min(d + spot * 0.009, spot * 0.009) - Math.max(d - spot * 0.009, 0), -spot * 0.001) - spot * 0.001;
      case 'long_put_butterfly':   return Math.max(Math.min(-d + spot * 0.009, spot * 0.009) - Math.max(-d - spot * 0.009, 0), -spot * 0.001) - spot * 0.001;
      case 'synthetic_long':       return d * 0.5;
      case 'synthetic_short':      return -d * 0.5;
      default: return 0;
    }
  }

  const pnlVals = prices.map(p => pnl(p));
  const maxP = Math.max(...pnlVals);
  const minP = Math.min(...pnlVals);
  const range = Math.max(Math.abs(maxP), Math.abs(minP)) * 2.4 || 1;

  const toX = p => PL + ((p - prices[0]) / (prices[prices.length - 1] - prices[0])) * innerW;
  const toY = v => PT + innerH / 2 - (v / range) * innerH;
  const zeroY = toY(0);
  const spotX = toX(spot);

  // Split path into profit (green) and loss (red) segments
  const profitPath = prices.map((p, i) => {
    const v = pnlVals[i];
    if (v < 0) return null;
    return `${i === 0 || pnlVals[i - 1] < 0 ? 'M' : 'L'} ${toX(p).toFixed(1)} ${toY(v).toFixed(1)}`;
  }).filter(Boolean).join(' ');

  const lossPath = prices.map((p, i) => {
    const v = pnlVals[i];
    if (v >= 0) return null;
    return `${i === 0 || pnlVals[i - 1] >= 0 ? 'M' : 'L'} ${toX(p).toFixed(1)} ${toY(v).toFixed(1)}`;
  }).filter(Boolean).join(' ');

  const fullPath = prices.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(p).toFixed(1)} ${toY(pnlVals[i]).toFixed(1)}`
  ).join(' ');

  // Profit fill
  const profitFill = `${fullPath} L ${toX(prices[prices.length - 1]).toFixed(1)} ${zeroY.toFixed(1)} L ${PL} ${zeroY.toFixed(1)} Z`;

  // Hover handling
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const frac = (mx - PL) / innerW;
    const price = prices[0] + frac * (prices[prices.length - 1] - prices[0]);
    const idx = Math.min(Math.max(Math.round(frac * (prices.length - 1)), 0), prices.length - 1);
    setHover({ x: toX(prices[idx]), y: toY(pnlVals[idx]), price: prices[idx], pnl: pnlVals[idx] });
  };

  // Y-axis labels
  const yMax = (maxP / range * innerH / innerH * range).toFixed(0);
  const yMin = (minP / range * innerH / innerH * range).toFixed(0);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 160, display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`gp-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C896" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00C896" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`gl-${type}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#FF4455" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FF4455" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`cp-profit-${type}`}>
            <rect x={PL} y={PT} width={innerW} height={zeroY - PT} />
          </clipPath>
          <clipPath id={`cp-loss-${type}`}>
            <rect x={PL} y={zeroY} width={innerW} height={H - PB - zeroY} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={PL} y1={PT + innerH * f} x2={W - PR} y2={PT + innerH * f}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}

        {/* Profit zone fill */}
        <path d={profitFill} fill={`url(#gp-${type})`} clipPath={`url(#cp-profit-${type})`} />
        {/* Loss zone fill */}
        <path d={profitFill} fill={`url(#gl-${type})`} clipPath={`url(#cp-loss-${type})`} />

        {/* Zero line */}
        <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="5,4" />

        {/* ATM/spot line */}
        <line x1={spotX} y1={PT} x2={spotX} y2={H - PB}
          stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4,4" />
        <text x={spotX} y={H - PB + 14} textAnchor="middle"
          fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">ATM</text>

        {/* Payoff curve. profit part */}
        <path d={fullPath} fill="none" stroke="#00C896" strokeWidth="2.5"
          strokeLinejoin="round" clipPath={`url(#cp-profit-${type})`} />
        {/* Payoff curve. loss part */}
        <path d={fullPath} fill="none" stroke="#FF4455" strokeWidth="2.5"
          strokeLinejoin="round" clipPath={`url(#cp-loss-${type})`} />

        {/* Y-axis labels */}
        <text x={PL - 5} y={PT + 8} textAnchor="end"
          fill="rgba(0,200,150,0.6)" fontSize="9" fontFamily="monospace">Profit</text>
        <text x={PL - 5} y={H - PB - 3} textAnchor="end"
          fill="rgba(255,68,85,0.6)" fontSize="9" fontFamily="monospace">Loss</text>

        {/* X-axis label */}
        <text x={W / 2} y={H - 2} textAnchor="middle"
          fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">Underlying Price at Expiry</text>

        {/* Hover crosshair */}
        {hover && (
          <>
            <line x1={hover.x} y1={PT} x2={hover.x} y2={H - PB}
              stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
            <line x1={PL} y1={hover.y} x2={W - PR} y2={hover.y}
              stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={hover.x} cy={hover.y} r={4}
              fill={hover.pnl >= 0 ? '#00C896' : '#FF4455'}
              stroke="var(--bg1)" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '6px 10px', fontSize: 11,
          fontFamily: 'var(--mono)', pointerEvents: 'none',
          color: hover.pnl >= 0 ? '#00C896' : '#FF4455',
        }}>
          <div style={{ color: 'var(--text3)', fontSize: 10, marginBottom: 2 }}>
            Nifty: {Math.round(hover.price).toLocaleString('en-IN')}
          </div>
          P&L: {hover.pnl >= 0 ? '+' : ''}{(hover.pnl * 65).toLocaleString('en-IN', { maximumFractionDigits: 0 })} ₹
        </div>
      )}
    </div>
  );
}

// ── Strategy Card ─────────────────────────────────────────────────────────────
function StrategyCard({ strategy, groupColor }) {
  const s = strategy;
  const isCredit  = s.type === 'credit';
  const diffColor = s.difficulty === 'Beginner' ? '#00C896' : s.difficulty === 'Intermediate' ? '#F59E0B' : '#FF6B6B';

  return (
    <div className="edu-card">

      {/* ── Header ── */}
      <div className="edu-card-header">
        <div>
          <div className="edu-card-title" style={{ color: groupColor }}>{s.label}</div>
          <div className="edu-card-tagline">{s.tagline}</div>
        </div>
        <div className="edu-card-badges">
          <span className="edu-badge" style={{
            background: isCredit ? 'rgba(0,200,150,0.15)' : 'rgba(255,107,107,0.15)',
            color:      isCredit ? '#00C896'              : '#FF6B6B',
            border:    `1px solid ${isCredit ? 'rgba(0,200,150,0.3)' : 'rgba(255,107,107,0.3)'}`,
          }}>{isCredit ? 'Credit' : 'Debit'}</span>
          <span className="edu-badge" style={{ color: diffColor, border: `1px solid ${diffColor}40`, background: 'rgba(255,255,255,0.04)' }}>{s.difficulty}</span>
          <span className="edu-badge" style={{ color: 'var(--text2)', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)' }}>{s.legs} {s.legs === 1 ? 'Leg' : 'Legs'}</span>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="edu-stats-row">
        <div className="edu-stat">
          <div className="edu-stat-label">Outlook</div>
          <div className="edu-stat-val" style={{ color: groupColor }}>{s.outlook}</div>
        </div>
        <div className="edu-stat">
          <div className="edu-stat-label">Max Risk</div>
          <div className="edu-stat-val" style={{ color: '#FF6B6B' }}>{s.risk}</div>
        </div>
        <div className="edu-stat">
          <div className="edu-stat-label">Max Reward</div>
          <div className="edu-stat-val" style={{ color: '#00C896' }}>{s.reward}</div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="edu-body">

        {/* Left */}
        <div className="edu-left">

          <div className="edu-section">
            <div className="edu-section-title">When to use</div>
            <div className="edu-section-text">{s.when}</div>
          </div>

          <div className="edu-section">
            <div className="edu-section-title">How it works</div>
            <div className="edu-section-text">{s.how}</div>
          </div>

          <div className="edu-section">
            <div className="edu-section-title">Pro tips</div>
            <ul className="edu-tips">
              {s.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>

        </div>

        {/* Right */}
        <div className="edu-right">

          <div className="edu-section">
            <div className="edu-section-title">Payoff at expiry</div>
            <div className="edu-payoff-wrap">
              <PayoffDiagram type={s.payoffType} />
            </div>
          </div>

          <div className="edu-section">
            <div className="edu-section-title">Nifty example. spot 22,000</div>
            <div className="edu-example">
              <div className="edu-legs">
                {s.example.legs
                  .filter((l, i, arr) => !arr.slice(0,i).find(p => p.action===l.action && p.type===l.type && p.strike===l.strike))
                  .map((leg, i) => (
                    <div key={i} className="edu-leg">
                      <span className={`edu-leg-action ${leg.action === 'BUY' ? 'buy' : 'sell'}`}>{leg.action}</span>
                      <span className="edu-leg-detail">{leg.strike} {leg.type}</span>
                      <span className="edu-leg-premium">₹{leg.premium}</span>
                    </div>
                  ))
                }
              </div>
              <div className="edu-result-row edu-result-highlight">
                <span className="edu-result-label">Max Profit</span>
                <span className="edu-result-val gain">{s.example.maxProfit}</span>
              </div>
              <div className="edu-result-row edu-result-highlight">
                <span className="edu-result-label">Max Loss</span>
                <span className="edu-result-val loss">{s.example.maxLoss}</span>
              </div>
              <div className="edu-result-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 10 }}>
                <span className="edu-result-label">Breakeven</span>
                <span className="edu-result-val" style={{ color: '#F59E0B' }}>{s.example.breakeven}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Backtest() {
  const [selected, setSelected] = useState('short_straddle');
  const strategy = ALL_STRATEGIES.find(s => s.id === selected);
  const group    = STRATEGY_GROUPS.find(g => g.strategies.some(s => s.id === selected));

  return (
    <div className="edu-wrap">

      {/* Sidebar */}
      <div className="edu-sidebar">
        <div className="edu-sidebar-label">SELECT STRATEGY</div>
        {STRATEGY_GROUPS.map(g => (
          <div key={g.group} className="edu-group">
            <div className="edu-group-label" style={{ color: g.color }}>{g.group}</div>
            {g.strategies.map(s => (
              <button
                key={s.id}
                className={`edu-strat-btn ${selected === s.id ? 'edu-strat-active' : ''}`}
                style={selected === s.id ? { borderLeftColor: g.color, color: g.color, background: `${g.color}14` } : {}}
                onClick={() => setSelected(s.id)}
              >
                <span className="edu-strat-name">{s.label}</span>
                <span className={`edu-type-tag ${s.type}`}>{s.type}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="edu-content">
        {strategy && <StrategyCard strategy={strategy} groupColor={group?.color || '#4A9EFF'} />}

        {/* Sensibull promo */}
        <div className="edu-sensibull">
          <div>
            <div className="edu-sensibull-logo">sensibull</div>
            <div className="edu-sensibull-tag">India's #1 Options Trading Platform</div>
            <div className="edu-sensibull-desc">
              Ready to trade this strategy live? Sensibull lets you build, visualise and execute any options strategy directly from your Zerodha account, with live payoff charts, Greeks, and one-click order placement.
            </div>
            <a href="https://sensibull.com" target="_blank" rel="noopener noreferrer" className="edu-sensibull-link">
              Try Sensibull Free →
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
