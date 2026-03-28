import { useState, useMemo } from 'react';

// ── COMPLETE BROKER DATA ──────────────────────────────────────────────────────
const BROKERS = [
  {
    id: 'zerodha', name: 'Zerodha', type: 'discount', rank: 2, featured: true,
    tagline: 'The broker that changed Indian markets. Transparent pricing, best platform, highest networth.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '0.03% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 15.34, dpLabel: '₹13 + 18% GST',
    amc: 88.50, amcLabel: '₹75 + GST/yr',
    mtfRate: 14.6, mtfLabel: '14.6% p.a.',
    mtfBrokerage: '0.3% or ₹20',
    callTrade: 59, squareOff: 59,
    paymentGw: 10.62,
    instantWithdrawal: 'Free',
    api: '₹2,000/mo', apiNote: 'Kite Connect — most mature API in India',
    ddpi: 118, reactivation: 59,
    networth: 13500, networthLabel: '₹13,500 Cr',
    activeClients: 6.9, activeClientsLabel: '6.9M',
    total50k: 126.85, brokerCharges50k: 15.34,
    pledgeUnpledge: '₹35.40 pledge / Free unpledge',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.035%/day',
    strengths: [
      'Highest networth of any broker in India (₹13,500 Cr)',
      'Kite — widely considered best trading platform in India',
      'Varsity — free financial education platform',
      'Zero delivery brokerage',
      'Transparent pricing, no hidden charges',
      'Kite Connect API — most mature trading API',
      'Coin for direct mutual funds',
      'Low margin shortfall interest (0.035%/day vs 0.05% at most)',
    ],
    watch: ['AMC ₹88.50/yr (₹7.38/mo)', 'API costs ₹2,000/mo', 'No SLB or LAS'],
    best: ['equity', 'options', 'algo', 'longterm'],
    url: 'https://zerodha.com',
  },
  {
    id: 'dhan', name: 'Dhan', type: 'discount', rank: 1, featured: false,
    tagline: 'Zero delivery brokerage, zero AMC. Lowest per-trade cost in India by ₹0.59.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '0.03% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 14.75, dpLabel: '₹12.5 + 18% GST',
    amc: 0, amcLabel: 'Free',
    mtfRate: 12.49, mtfLabel: '12.49% (up to ₹5L)',
    mtfBrokerage: '0.03% or ₹20',
    callTrade: 59, squareOff: 23.60,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Dhan HQ API — free access',
    ddpi: 118, reactivation: 59,
    networth: null, networthLabel: '—',
    activeClients: 1.0, activeClientsLabel: '1.0M',
    total50k: 126.26, brokerCharges50k: 14.75,
    pledgeUnpledge: '₹17.70/ISIN each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Zero AMC', 'Lowest DP charge (₹14.75)', 'Free API (Dhan HQ)', 'Lowest MTF rate in class (12.49%)', 'Clean mobile-first app'],
    watch: ['Newer platform vs Zerodha', 'MTF rate rises with amount (up to 16.49%)', 'Less institutional track record'],
    best: ['equity', 'longterm', 'beginner'],
    url: 'https://dhan.co',
  },
  {
    id: 'mstock', name: 'mStock', type: 'discount', rank: 3,
    tagline: 'Mirae Asset backed. Lowest intraday at ₹5/order. Watch the quarterly AMC.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: '₹5 flat', intradayB: 5,
    futures: '₹5 flat', futuresB: 5,
    options: '₹5/order', optionsB: 5,
    dp: 21.24, dpLabel: '₹18 + 18% GST',
    amc: 259, amcLabel: '₹219+GST/quarter',
    mtfRate: 15.0, mtfLabel: '15.0% p.a.',
    mtfBrokerage: '₹5/order',
    callTrade: 0, squareOff: 118,
    paymentGw: 10,
    instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'Not offered',
    ddpi: 99, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 0.27, activeClientsLabel: '0.27M',
    total50k: 132.75, brokerCharges50k: 21.24,
    pledgeUnpledge: '₹32/unpledge only',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.049%/day',
    strengths: ['Lowest intraday brokerage (₹5/order)', 'Zero delivery', 'Mirae Asset backing'],
    watch: ['AMC is ₹259/quarter = ~₹1,036/yr — verify if waived', 'High auto square-off charge (₹118)', 'No API'],
    best: ['intraday'],
    url: 'https://mstock.co.in',
  },
  {
    id: 'sahi', name: 'Sahi', type: 'discount', rank: 4,
    tagline: 'Simple flat ₹10/order. Zero AMC. Lowest DP charge of all.',
    delivery: 10, deliveryLabel: '₹10 flat',
    intraday: '₹10 flat', intradayB: 10,
    futures: '₹10 flat', futuresB: 10,
    options: '₹10/order', optionsB: 10,
    dp: 13.50, dpLabel: '₹13.50/scrip',
    amc: 0, amcLabel: 'Free',
    mtfRate: null, mtfLabel: 'N/A',
    mtfBrokerage: 'N/A',
    callTrade: 0, squareOff: 59,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'Not offered',
    ddpi: 0, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: null, activeClientsLabel: '—',
    total50k: 148.61, brokerCharges50k: 37.10,
    pledgeUnpledge: '₹23.60 pledge / ₹5.90 repledge',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Lowest DP charge (₹13.50/scrip)', 'Zero AMC', 'Simple flat pricing', 'Free DDPI'],
    watch: ['No MTF', 'No API', 'Smaller broker — verify track record'],
    best: ['equity'],
    url: 'https://sahi.co.in',
  },
  {
    id: 'fyers', name: 'Fyers', type: 'discount', rank: 5,
    tagline: 'TradingView charts built in. Zero AMC. Popular with options and algo traders.',
    delivery: null, deliveryLabel: '₹20 or 0.3%',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '0.03% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 14.75, dpLabel: '₹12.5 + 18% GST',
    amc: 0, amcLabel: 'Free',
    mtfRate: 16.49, mtfLabel: '16.49% p.a.',
    mtfBrokerage: '₹20 or 0.3%',
    callTrade: 59, squareOff: 59,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Fyers API — free, well documented',
    ddpi: 0, reactivation: 59,
    networth: null, networthLabel: '—',
    activeClients: null, activeClientsLabel: '—',
    total50k: 173.46, brokerCharges50k: 61.95,
    pledgeUnpledge: '₹5/ISIN',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.041%/day',
    strengths: ['TradingView charts', 'Zero AMC', 'Low DP (₹14.75)', 'Free API', 'Lowest pledge charge (₹5/ISIN)'],
    watch: ['Delivery has brokerage (₹20)', 'Higher MTF rate (16.49%)'],
    best: ['options', 'algo'],
    url: 'https://fyers.in',
  },
  {
    id: 'groww', name: 'Groww', type: 'discount', rank: 7,
    tagline: '12.5M users. Best onboarding. Good for MF + stock combo. Not the cheapest.',
    delivery: null, deliveryLabel: '₹5–₹20',
    intraday: '0.1% or ₹20', intradayB: 20,
    futures: '₹20 flat', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip',
    amc: 0, amcLabel: 'Free',
    mtfRate: 15.75, mtfLabel: '15.75% (<₹25L)',
    mtfBrokerage: '0.1%',
    callTrade: 0, squareOff: 50,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'Not offered',
    ddpi: 118, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 12.5, activeClientsLabel: '12.5M',
    total50k: 178.71, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Largest user base (12.5M)', 'Best-in-class UX', 'Mutual funds + stocks', 'Zero AMC', 'Free payment gateway'],
    watch: ['Min ₹5 brokerage on delivery', 'No API', 'Higher DP (₹20)', 'MTF at 15.75%'],
    best: ['beginner', 'mf'],
    url: 'https://groww.in',
  },
  {
    id: 'upstox', name: 'Upstox', type: 'discount', rank: 7,
    tagline: 'Backed by Ratan Tata and Tiger Global. Free API. AMC ₹300/yr.',
    delivery: null, deliveryLabel: '₹20 flat',
    intraday: '0.1% or ₹20', intradayB: 20,
    futures: '0.05% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip',
    amc: 300, amcLabel: '₹300/yr (yr 1 free)',
    mtfRate: 18.25, mtfLabel: '18.25% p.a.',
    mtfBrokerage: '₹20 flat',
    callTrade: 88.50, squareOff: 88.50,
    paymentGw: 8.26,
    instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Upstox API — free',
    ddpi: 150, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 2.0, activeClientsLabel: '2.0M',
    total50k: 178.71, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Credible backing', 'Free API', 'Developer friendly', 'MTF free conversion'],
    watch: ['AMC ₹300/yr after yr 1', 'Call & trade ₹88.50 (highest)', 'Highest MTF rate (18.25%)'],
    best: ['algo'],
    url: 'https://upstox.com',
  },
  {
    id: 'angelone', name: 'Angel One', type: 'discount', rank: 7,
    tagline: 'Long track record. Now discount. Strong tier-2/3 city presence.',
    delivery: null, deliveryLabel: '₹2–₹20',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '₹20 flat', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip',
    amc: 283, amcLabel: '₹240+GST/yr',
    mtfRate: 14.99, mtfLabel: '14.99% p.a.',
    mtfBrokerage: '0.1% or ₹20',
    callTrade: 20, squareOff: 20,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'SmartAPI — free',
    ddpi: 118, reactivation: 118,
    networth: 4400, networthLabel: '₹4,400 Cr',
    activeClients: 6.7, activeClientsLabel: '6.7M',
    total50k: 178.71, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Long track record', 'Strong networth (₹4,400 Cr)', 'Free SmartAPI', 'Low call & trade (₹20)'],
    watch: ['AMC ₹283/yr', 'Higher DP (₹20)', 'Delivery has brokerage'],
    best: ['equity', 'beginner'],
    url: 'https://www.angelone.in',
  },
  {
    id: 'paytm', name: 'Paytm Money', type: 'discount', rank: 7,
    tagline: 'Paytm backed. Capped ₹20 across segments. Zero AMC.',
    delivery: null, deliveryLabel: 'Cap ₹20/order',
    intraday: '0.1% or ₹20', intradayB: 20,
    futures: '₹20 flat', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip',
    amc: 0, amcLabel: 'Free',
    mtfRate: 9.99, mtfLabel: '9.99% p.a.',
    mtfBrokerage: '0.1%',
    callTrade: 100, squareOff: 59,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'Not offered',
    ddpi: 0, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 0.86, activeClientsLabel: '0.86M',
    total50k: 178.71, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹20/transaction',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Zero AMC', 'Lowest MTF rate (9.99%)', 'Free DDPI', 'Free payment gateway'],
    watch: ['No API', 'Call & trade ₹100/order', 'Paytm brand stability concerns'],
    best: ['beginner'],
    url: 'https://paytmmoney.com',
  },
  {
    id: 'indmoney', name: 'INDmoney', type: 'discount', rank: 11,
    tagline: 'SuperApp — stocks, US equities, MF. Zero AMC. ₹500 call & trade.',
    delivery: null, deliveryLabel: '₹2–₹20',
    intraday: '0.1% or ₹20', intradayB: 20,
    futures: '₹20 flat', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 21.83, dpLabel: '₹18.50+GST/ISIN',
    amc: 0, amcLabel: 'Free',
    mtfRate: 14.6, mtfLabel: '14.60% p.a.',
    mtfBrokerage: '₹2–₹20',
    callTrade: 500, squareOff: 59,
    paymentGw: 10,
    instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'Not offered',
    ddpi: 118, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 0.68, activeClientsLabel: '0.68M',
    total50k: 180.54, brokerCharges50k: 69.03,
    pledgeUnpledge: 'Free',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.049%/day',
    strengths: ['US stocks access', 'Zero AMC', 'Free pledge', 'SuperApp for all investments'],
    watch: ['Call & trade ₹500 (highest of all)', 'No API'],
    best: ['global'],
    url: 'https://indmoney.com',
  },
  {
    id: '5paisa', name: '5paisa', type: 'discount', rank: 12,
    tagline: 'IIFL Group. Flat ₹20 all segments. Highest DP charge of discount brokers.',
    delivery: null, deliveryLabel: '₹20 flat',
    intraday: '₹20 flat', intradayB: 20,
    futures: '₹20 flat', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 23.60, dpLabel: '₹20+18% GST/scrip',
    amc: 354, amcLabel: '₹300+GST/yr',
    mtfRate: 15.5, mtfLabel: '15.5% p.a.',
    mtfBrokerage: '₹20 flat',
    callTrade: 23.60, squareOff: 23.60,
    paymentGw: 11.80,
    instantWithdrawal: 'Free',
    api: '₹500/mo', apiNote: '₹500/month',
    ddpi: 118, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 0.34, activeClientsLabel: '0.34M',
    total50k: 182.31, brokerCharges50k: 70.80,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Simple flat pricing', 'IIFL Group backing', 'Low call & trade (₹23.60)'],
    watch: ['Highest DP (₹23.60)', 'AMC ₹354/yr', 'API costs ₹500/mo'],
    best: [],
    url: 'https://5paisa.com',
  },
  {
    id: 'kotak', name: 'Kotak Securities', type: 'full', rank: 13,
    tagline: 'Kotak Bank subsidiary. 3-in-1 account. Research. Expensive for self-directed.',
    delivery: null, deliveryLabel: '0.2%',
    intraday: '₹10 or 0.05%', intradayB: 10,
    futures: '₹10 flat', futuresB: 10,
    options: '₹10/order', optionsB: 10,
    dp: 20, dpLabel: '0.04% min ₹20',
    amc: 600, amcLabel: '₹600/yr',
    mtfRate: 14.97, mtfLabel: '14.97% p.a.',
    mtfBrokerage: '0%–0.30%',
    callTrade: 57.82, squareOff: 59,
    paymentGw: 8.26,
    instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'Kotak Neo API — free',
    ddpi: 118, reactivation: 236,
    networth: 7900, networthLabel: '₹7,900 Cr',
    activeClients: 1.4, activeClientsLabel: '1.4M',
    total50k: 367.51, brokerCharges50k: 256,
    pledgeUnpledge: '₹20 each',
    dematerialisation: '₹295/cert',
    marginShortfall: '0.049%/day',
    strengths: ['Kotak Bank 3-in-1', 'High networth (₹7,900 Cr)', 'Best F&O brokerage among full-service', 'Research'],
    watch: ['₹241 more than Dhan/Zerodha on ₹50K trade', 'AMC ₹600/yr', 'Account opening ₹99'],
    best: ['bank_customer'],
    url: 'https://kotaksecurities.com',
  },
  {
    id: 'icici', name: 'ICICI Direct', type: 'full', rank: 14,
    tagline: 'ICICI Bank subsidiary. 3-in-1 account integration. Plan-dependent pricing.',
    delivery: null, deliveryLabel: '0.25%',
    intraday: '0.05%', intradayB: null,
    futures: 'Plan-based', futuresB: null,
    options: 'Plan-based', optionsB: null,
    dp: 23.60, dpLabel: '₹23.60/scrip',
    amc: 826, amcLabel: '₹826 incl. GST',
    mtfRate: 17.99, mtfLabel: '17.99% p.a.',
    mtfBrokerage: '0.22%–0.07%',
    callTrade: 50, squareOff: 59,
    paymentGw: 0,
    instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'ICICI Direct API — free',
    ddpi: 0, reactivation: 354,
    networth: 4500, networthLabel: '₹4,500 Cr',
    activeClients: 2.0, activeClientsLabel: '2.0M',
    total50k: 430.11, brokerCharges50k: 318.60,
    pledgeUnpledge: '₹29.50 each',
    dematerialisation: '₹295/cert',
    marginShortfall: '0.05%/day',
    strengths: ['ICICI Bank 3-in-1', 'Research', 'Free DDPI', 'High networth'],
    watch: ['₹303 more than cheapest on same trade', 'Highest MTF (17.99%)', 'Account opening ₹299'],
    best: ['bank_customer'],
    url: 'https://icicidirect.com',
  },
  {
    id: 'axis', name: 'Axis Securities', type: 'full', rank: 15,
    tagline: 'Axis Bank subsidiary. Zero DP charge, but brokerage is steep at 0.5%.',
    delivery: null, deliveryLabel: '0.5% min ₹25',
    intraday: '0.05%', intradayB: null,
    futures: '0.05%', futuresB: null,
    options: '₹20/order', optionsB: 20,
    dp: 0, dpLabel: 'Zero',
    amc: 885, amcLabel: '₹885/yr',
    mtfRate: 17.99, mtfLabel: '17.99% p.a.',
    mtfBrokerage: '0.5% min ₹25',
    callTrade: 0, squareOff: 0,
    paymentGw: 0,
    instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'Free',
    ddpi: 0, reactivation: 236,
    networth: 1700, networthLabel: '₹1,700 Cr',
    activeClients: 0.41, activeClientsLabel: '0.41M',
    total50k: 701.51, brokerCharges50k: 590,
    pledgeUnpledge: '0.5%+GST min ₹29.50',
    dematerialisation: '₹295/cert',
    marginShortfall: '0.05%/day',
    strengths: ['Zero DP charge', 'Axis Bank integration', 'Free call & trade'],
    watch: ['₹575 more than cheapest', 'Highest AMC (₹885)', 'Highest MTF (17.99%)'],
    best: ['bank_customer'],
    url: 'https://axisdirect.in',
  },
  {
    id: 'hdfc', name: 'HDFC Securities', type: 'full', rank: 16,
    tagline: 'HDFC Bank subsidiary. India\'s most expensive broker by total cost.',
    delivery: null, deliveryLabel: '0.5% min ₹25',
    intraday: '0.05% min ₹25', intradayB: null,
    futures: '0.025% or ₹25', futuresB: null,
    options: '—', optionsB: null,
    dp: 30, dpLabel: '0.04% min ₹30',
    amc: 885, amcLabel: '₹885/yr',
    mtfRate: 12.0, mtfLabel: '12.0% p.a.',
    mtfBrokerage: '0.32% min ₹25',
    callTrade: 0, squareOff: 0,
    paymentGw: 0,
    instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'Free',
    ddpi: 500, reactivation: 354,
    networth: 2700, networthLabel: '₹2,700 Cr',
    activeClients: 1.4, activeClientsLabel: '1.4M',
    total50k: 721.51, brokerCharges50k: 610,
    pledgeUnpledge: '0.04% min ₹20',
    dematerialisation: '₹354/cert',
    marginShortfall: '0.05%/day',
    strengths: ['HDFC Bank 3-in-1', 'Lowest MTF rate (12%)', 'Research'],
    watch: ['Most expensive broker (₹721 vs ₹126)', 'Highest DP of all (₹30)', 'DDPI ₹500'],
    best: ['bank_customer'],
    url: 'https://hdfcsec.com',
  },
];

// ── REGULATORY CHARGES (fixed everywhere) ────────────────────────────────────
const REGULATORY = {
  delivery: { stt: 100, exchange: 2.97, sebi: 0.51, stamp: 7.50, gstExch: 0.53, total: 111.51 },
  intraday: { stt: 6.25, exchange: 1.49, sebi: 0.26, stamp: 0.75, gstExch: 0.27, total: 9.01 },
  futures:  { stt: 100, exchange: 2.0,  sebi: 5.10, stamp: 10.0, gstExch: 0.36, total: 117.46 },
  options:  { stt: 50,  exchange: 53.0, sebi: 0.51, stamp: 1.50, gstExch: 9.54, total: 114.55 },
};

// ── ANNUAL SCENARIO DATA ──────────────────────────────────────────────────────
const SCENARIOS = {
  longterm: {
    label: 'Long-term Investor', icon: '📈', desc: '5 delivery trades/mo, ₹50K avg, 3 sells/mo',
    data: [
      { id:'zerodha', brokerage:0, dp:552.24, amc:88.50, regulatory:6690.88, total:7331.62 },
      { id:'dhan',    brokerage:0, dp:531.00, amc:0,     regulatory:6690.88, total:7221.88 },
      { id:'mstock',  brokerage:0, dp:764.64, amc:259,   regulatory:6690.88, total:7714.52 },
      { id:'groww',   brokerage:2832, dp:720, amc:0,     regulatory:6690.88, total:10242.88 },
      { id:'angelone',brokerage:2832, dp:720, amc:283,   regulatory:6690.88, total:10525.88 },
      { id:'kotak',   brokerage:14160, dp:720, amc:600,  regulatory:6690.88, total:22170.88 },
      { id:'hdfc',    brokerage:35400, dp:720, amc:885,  regulatory:6690.88, total:43695.88 },
    ],
  },
  active: {
    label: 'Active Trader', icon: '⚡', desc: '3 delivery + 30 intraday/mo',
    data: [
      { id:'dhan',    brokerage:6372, dp:885,  amc:0,   regulatory:7257, total:14514 },
      { id:'zerodha', brokerage:6372, dp:920,  amc:89,  regulatory:7257, total:14638 },
      { id:'angelone',brokerage:8071, dp:1200, amc:283, regulatory:7257, total:16811 },
      { id:'kotak',   brokerage:16992,dp:1200, amc:600, regulatory:7257, total:26049 },
      { id:'groww',   brokerage:18691,dp:1200, amc:0,   regulatory:7257, total:27148 },
      { id:'upstox',  brokerage:18691,dp:1200, amc:300, regulatory:7257, total:27448 },
      { id:'hdfc',    brokerage:42480,dp:1200, amc:885, regulatory:7257, total:51822 },
    ],
  },
  fno: {
    label: 'F&O Trader', icon: '🎯', desc: '50 options + 10 futures/mo',
    data: [
      { id:'kotak',   brokerage:16992, dp:0, amc:600, regulatory:82825, total:100417 },
      { id:'dhan',    brokerage:33984, dp:0, amc:0,   regulatory:82825, total:116809 },
      { id:'groww',   brokerage:33984, dp:0, amc:0,   regulatory:82825, total:116809 },
      { id:'zerodha', brokerage:33984, dp:0, amc:89,  regulatory:82825, total:116898 },
      { id:'angelone',brokerage:33984, dp:0, amc:283, regulatory:82825, total:117092 },
      { id:'upstox',  brokerage:33984, dp:0, amc:300, regulatory:82825, total:117109 },
      { id:'hdfc',    brokerage:177000,dp:0, amc:885, regulatory:82825, total:260710 },
    ],
  },
};

const fmt  = (v, d=0) => v != null ? Number(v).toLocaleString('en-IN', { maximumFractionDigits: d }) : '—';
const fmtR = (v) => v != null ? `₹${fmt(v)}` : '—';

const TABS = ['Overview', 'Rankings', 'Calculator', 'Annual Cost', 'All Charges', 'Market Data'];

export default function BrokersPage() {
  const [tab,      setTab]     = useState('Overview');
  const [sort,     setSort]    = useState('total50k');
  const [filter,   setFilter]  = useState('all');
  const [expanded, setExpanded]= useState(null);
  const [scenario, setScenario]= useState('longterm');
  const [tradeVal, setTradeVal]= useState('50000');
  const [segment,  setSegment] = useState('delivery');
  const [chargeTab,setChargeTab]=useState('demat');

  const sorted = useMemo(() => {
    let list = [...BROKERS];
    if (filter !== 'all') list = list.filter(b => b.type === filter);
    list.sort((a,b) => (a[sort]??9999)-(b[sort]??9999));
    return list;
  }, [sort, filter]);

  const tv = parseFloat(tradeVal) || 50000;
  const calcResults = useMemo(() => {
    return BROKERS.map(b => {
      const reg = REGULATORY[segment] || REGULATORY.delivery;
      let broker = 0;
      if (segment === 'delivery') {
        if (b.delivery === 0) broker = 0;
        else if (b.id === 'sahi') broker = Math.min(10, tv*0.0005);
        else if (['groww','angelone','indmoney'].includes(b.id)) broker = Math.min(20, Math.max(2, tv*0.001));
        else if (b.id === 'fyers') broker = Math.min(20, tv*0.003);
        else if (b.id === 'paytm') broker = Math.min(20, tv*0.025);
        else if (b.id === 'kotak') broker = tv*0.002;
        else if (['icici','axis','hdfc'].includes(b.id)) broker = Math.max(25, tv*0.005);
        else broker = Math.min(20, tv*0.001);
      } else if (segment === 'intraday') {
        if (b.id === 'mstock') broker = 5;
        else if (b.id === 'sahi') broker = 10;
        else if (b.id === 'angelone') broker = Math.min(20, Math.max(0.03*tv/100, 0));
        else if (['kotak'].includes(b.id)) broker = 10;
        else if (['icici','axis','hdfc'].includes(b.id)) broker = Math.max(25, tv*0.0005);
        else broker = Math.min(20, tv*0.0003);
      } else if (segment === 'options') {
        if (b.id === 'mstock'||b.id==='sahi'||b.id==='kotak') broker = 10;
        else if (b.id === 'icici') broker = Math.max(100, tv*0.01);
        else if (b.id === 'hdfc') broker = Math.max(100, tv*0.01);
        else broker = 20;
      } else { // futures
        if (b.id === 'mstock') broker = 5;
        else if (b.id === 'sahi'||b.id === 'kotak') broker = 10;
        else if (['icici','axis','hdfc'].includes(b.id)) broker = Math.max(25, tv*0.0005);
        else broker = 20;
      }
      const gst = broker * 0.18;
      const regScaled = segment==='delivery' ? reg.total*(tv/50000) : reg.total;
      return { ...b, brokerageRaw: broker, gst, regTotal: segment==='delivery'?regScaled:reg.total, total: broker+gst+reg.total };
    }).sort((a,b)=>a.total-b.total);
  }, [tv, segment]);

  return (
    <div className="brk-wrap">

      {/* HEADER */}
      <div className="brk-hero">
        <div className="brk-hero-left">
          <div className="brk-hero-headline">What your broker<br/>actually charges you.</div>
          <div className="brk-hero-sub">16 brokers · 8 charge categories · no affiliates</div>
          <div className="brk-hero-stats">
            <div className="brk-hstat">
              <div className="brk-hstat-n">₹126.26</div>
              <div className="brk-hstat-l">cheapest broker</div>
            </div>
            <div className="brk-hstat-vs">vs</div>
            <div className="brk-hstat">
              <div className="brk-hstat-n brk-hstat-red">₹721.51</div>
              <div className="brk-hstat-l">most expensive</div>
            </div>
            <div className="brk-hstat-badge">5.7× difference<br/><span>same ₹50K trade</span></div>
          </div>
          <div className="brk-hero-note">On every ₹50K delivery trade, ₹111.51 goes to the government and exchanges — fixed at every broker. The gap between brokers is entirely in brokerage, DP charge, and AMC.</div>
        </div>
        <div className="brk-hero-right">
          <div className="brk-featured-card">
            <div className="brk-featured-badge">EDITOR'S PICK</div>
            <div className="brk-featured-name">Zerodha</div>
            <div className="brk-featured-tag">15 years · ₹13,500 Cr networth · Kite platform · Varsity education</div>
            <div className="brk-featured-facts">
              <div className="brk-ffact"><span className="brk-ffact-v">₹13,500 Cr</span><span className="brk-ffact-l">Networth — #1 in India</span></div>
              <div className="brk-ffact"><span className="brk-ffact-v">6.9M</span><span className="brk-ffact-l">Active clients</span></div>
              <div className="brk-ffact"><span className="brk-ffact-v">15+ yrs</span><span className="brk-ffact-l">Track record</span></div>
              <div className="brk-ffact"><span className="brk-ffact-v">₹126.85</span><span className="brk-ffact-l">Total cost ₹50K trade</span></div>
            </div>
            <div className="brk-featured-vs">59 paise more than Dhan on a ₹50,000 trade.</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="brk-tabs">
        {TABS.map(t=>(
          <button key={t} className={`brk-tab${tab===t?' brk-tab-active':''}`} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='Overview' && (
        <div className="brk-content">
          <div className="brk-overview-grid">
            {/* Top brokers for each type */}
            <div className="brk-ov-section">
              <div className="brk-ov-title">Two brokers stand out on cost</div>
              <div className="brk-ov-cards">
                <div className="brk-ov-card brk-ov-primary">
                  <div className="brk-ov-rank">#2 by total cost · highest networth in India</div>
                  <div className="brk-ov-broker">Zerodha</div>
                  <div className="brk-ov-cost">₹126.85 / ₹50K trade</div>
                  <div className="brk-ov-list">
                    <div>✔ Kite — best trading UI in India</div>
                    <div>✔ Varsity — free education platform</div>
                    <div>✔ ₹13,500 Cr networth (highest in India)</div>
                    <div>✔ Zero delivery brokerage</div>
                    <div>✔ 15+ year track record</div>
                  </div>
                  <div className="brk-ov-note">₹88.50/yr AMC · 59 paise more than Dhan on a ₹50K trade</div>
                </div>
                <div className="brk-ov-card">
                  <div className="brk-ov-rank">#1 by total cost</div>
                  <div className="brk-ov-broker">Dhan</div>
                  <div className="brk-ov-cost">₹126.26 / ₹50K trade</div>
                  <div className="brk-ov-list">
                    <div>✔ Zero AMC (saves ₹88.50/yr vs Zerodha)</div>
                    <div>✔ Lowest DP charge (₹14.75)</div>
                    <div>✔ Lowest MTF rate (12.49% up to ₹5L)</div>
                    <div>✔ Free API</div>
                  </div>
                  <div className="brk-ov-note">Newer platform · networth not publicly filed vs Zerodha</div>
                </div>
              </div>
            </div>

            {/* What makes Zerodha different */}
            <div className="brk-ov-section">
              <div className="brk-ov-title">Cost is one number. Platform is another.</div>
              <div className="brk-ov-explainer">
                <p>Dhan comes in 59 paise cheaper than Zerodha on a single ₹50K trade. Both charge zero delivery brokerage. The difference is DP charge — ₹14.75 at Dhan vs ₹15.34 at Zerodha — and Zerodha's annual ₹88.50 AMC.</p>
                <p>Over a year with 5 delivery sells per month, Dhan costs ₹7,222 and Zerodha costs ₹7,332 — a ₹110 annual gap. Neither number is surprising. What is surprising: HDFC Securities costs ₹43,696 on the same activity.</p>
                <p>Zerodha's financials from NSE filings: networth ₹13,500 Cr, the highest of any broker in India. Dhan doesn't publish a comparable figure. For traders who care about counterparty safety, this is a meaningful data point.</p>
                <p>The practical split: Zerodha for platform depth, Kite's feature set, Varsity, and the API ecosystem. Dhan for zero AMC and the lowest per-transaction cost available today.</p>
              </div>
            </div>

            {/* Quick compare table */}
            <div className="brk-ov-section">
              <div className="brk-ov-title">All-in cost on a ₹50,000 delivery trade</div>
              <div className="brk-mini-table">
                <div className="brk-mini-head"><span>Broker</span><span>Broker charges</span><span>Govt charges</span><span>Total</span></div>
                {BROKERS.slice(0,8).sort((a,b)=>a.total50k-b.total50k).map((b,i)=>(
                  <div key={b.id} className={`brk-mini-row${b.id==='zerodha'?' brk-mini-highlight':''}`}>
                    <span>{b.id==='zerodha'&&<span className="brk-mini-star">★</span>}{b.name}</span>
                    <span className={b.brokerCharges50k<=15.34?'brk-green':''}>₹{fmt(b.brokerCharges50k,2)}</span>
                    <span className="brk-dim">₹111.51</span>
                    <span className={i===0?'brk-green':''}><strong>₹{fmt(b.total50k,2)}</strong></span>
                  </div>
                ))}
                <div className="brk-mini-row brk-mini-sep"><span>Full-service brokers</span><span/><span/><span/></div>
                {BROKERS.filter(b=>b.type==='full').sort((a,b)=>a.total50k-b.total50k).map((b,i)=>(
                  <div key={b.id} className="brk-mini-row brk-mini-full">
                    <span>{b.name}</span>
                    <span className="brk-red">₹{fmt(b.brokerCharges50k,2)}</span>
                    <span className="brk-dim">₹111.51</span>
                    <span><strong>₹{fmt(b.total50k,2)}</strong></span>
                  </div>
                ))}
              </div>
              <div className="brk-table-note">★ Platform Pick. Govt charges (STT + exchange + SEBI + stamp) are fixed by law and identical at every broker.</div>
            </div>

            {/* Charge breakdown explainer */}
            <div className="brk-ov-section">
              <div className="brk-ov-title">Every trade has six charge layers</div>
              <div className="brk-charges-split">
                <div>
                  <div className="brk-charges-col-title brk-col-broker">Varies by broker</div>
                  <div className="brk-charge-card brk-charge-variable">
                    <div className="brk-charge-name">Brokerage</div>
                    <div className="brk-charge-note">Ranges from zero (Zerodha, Dhan on delivery) to 0.5% per order at full-service brokers like HDFC and Axis. This is the most visible variable.</div>
                  </div>
                  <div className="brk-charge-card brk-charge-variable">
                    <div className="brk-charge-name">DP Charge</div>
                    <div className="brk-charge-note">Debited from your account each time you sell shares — once per scrip per trading day. Ranges from ₹13.50 at Sahi to ₹30 at HDFC Securities. You pay this even if brokerage is zero.</div>
                  </div>
                  <div className="brk-charge-card brk-charge-variable">
                    <div className="brk-charge-name">AMC</div>
                    <div className="brk-charge-note">Flat yearly fee to keep your demat account open. Seven discount brokers charge nothing. Full-service brokers charge ₹600–₹885 per year regardless of how much you trade.</div>
                  </div>
                </div>
                <div>
                  <div className="brk-charges-col-title brk-col-govt">Fixed everywhere</div>
                  <div className="brk-charge-card brk-charge-fixed">
                    <div className="brk-charge-name">STT</div>
                    <div className="brk-charge-note">Government tax on every stock transaction. On delivery equity, 0.1% is charged on the sell side — that's ₹100 on a ₹50K trade. Cannot be reduced or waived by any broker.</div>
                  </div>
                  <div className="brk-charge-card brk-charge-fixed">
                    <div className="brk-charge-name">Exchange Fee + SEBI</div>
                    <div className="brk-charge-note">NSE/BSE levy for executing your order, plus SEBI's regulatory fee. Together about ₹3.50 on a ₹50K delivery trade. The same amount at every broker — it goes to the exchange, not the broker.</div>
                  </div>
                  <div className="brk-charge-card brk-charge-fixed">
                    <div className="brk-charge-name">Stamp Duty + GST</div>
                    <div className="brk-charge-note">Stamp duty is a state government levy on share purchases (0.015% of buy value). GST of 18% applies to brokerage and exchange fees — not on STT. If your broker charges zero brokerage, the GST on brokerage is also zero.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RANKINGS ── */}
      {tab==='Rankings' && (
        <div className="brk-content">
          <div className="brk-filters">
            <div className="brk-filter-group">
              <span className="brk-filter-label">TYPE</span>
              {[['all','All'],['discount','Discount'],['full','Full-Service']].map(([v,l])=>(
                <button key={v} className={`brk-filter-btn${filter===v?' active':''}`} onClick={()=>setFilter(v)}>{l}</button>
              ))}
            </div>
            <div className="brk-filter-group">
              <span className="brk-filter-label">SORT</span>
              {[['total50k','Total Cost'],['dp','DP Charge'],['amc','AMC'],['mtfRate','MTF Rate']].map(([v,l])=>(
                <button key={v} className={`brk-filter-btn${sort===v?' active':''}`} onClick={()=>setSort(v)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="brk-table">
            <div className="brk-table-head">
              <span>#</span><span>Broker</span><span>Delivery</span><span>Intraday</span><span>F&O Options</span><span>DP/scrip</span><span>AMC/yr</span><span>Total (₹50K)</span>
            </div>
            {sorted.map((b,i)=>(
              <div key={b.id}>
                <div className={`brk-table-row${b.featured?' brk-row-featured':''}${b.type==='full'?' brk-row-full':''}${expanded===b.id?' brk-row-expanded':''}`}
                  onClick={()=>setExpanded(expanded===b.id?null:b.id)}>
                  <span className="brk-rank">{i+1}</span>
                  <span className="brk-broker-cell">
                    <span className="brk-broker-name">{b.featured&&<span className="brk-star">★ </span>}{b.name}</span>
                    <span className={`brk-broker-type ${b.type==='discount'?'brk-type-discount':'brk-type-full'}`}>{b.type==='discount'?'Discount':'Full service'}</span>
                  </span>
                  <span className={`brk-charge${b.delivery===0?' brk-zero':''}`}>{b.deliveryLabel}</span>
                  <span className="brk-charge">{b.intraday}</span>
                  <span className="brk-charge">{b.options}</span>
                  <span className="brk-charge">₹{fmt(b.dp,2)}</span>
                  <span className={`brk-charge${b.amc===0?' brk-zero':''}`}>{b.amcLabel}</span>
                  <span className={`brk-total${i===0?' brk-total-best':''}`}>₹{fmt(b.total50k,2)}</span>
                </div>
                {expanded===b.id&&(
                  <div className="brk-expand">
                    <div className="brk-expand-tagline">{b.tagline}</div>
                    <div className="brk-expand-grid">
                      <div>
                        <div className="brk-expand-label">KEY CHARGES</div>
                        <div className="brk-expand-item">Delivery: {b.deliveryLabel}</div>
                        <div className="brk-expand-item">Intraday: {b.intraday}</div>
                        <div className="brk-expand-item">Options: {b.options}</div>
                        <div className="brk-expand-item">DP charge: {b.dpLabel}</div>
                        <div className="brk-expand-item">AMC: {b.amcLabel}</div>
                        <div className="brk-expand-item">MTF: {b.mtfLabel}</div>
                        <div className="brk-expand-item">Pledge: {b.pledgeUnpledge}</div>
                        <div className="brk-expand-item">Call & trade: ₹{b.callTrade}</div>
                        <div className="brk-expand-item">Auto sq-off: ₹{b.squareOff}</div>
                        <div className="brk-expand-item">API: {b.api}</div>
                      </div>
                      <div>
                        <div className="brk-expand-label">STRENGTHS</div>
                        {b.strengths.map((s,i)=><div key={i} className="brk-expand-item brk-item-good">✔ {s}</div>)}
                      </div>
                      <div>
                        <div className="brk-expand-label">WATCH OUT FOR</div>
                        {b.watch.map((s,i)=><div key={i} className="brk-expand-item brk-item-warn">⚠ {s}</div>)}
                        {b.networth&&(
                          <>
                            <div className="brk-expand-label" style={{marginTop:12}}>FINANCIAL STRENGTH</div>
                            <div className="brk-expand-item">Networth: {b.networthLabel}</div>
                            <div className="brk-expand-item">Active clients: {b.activeClientsLabel}</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="brk-expand-footer">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="brk-ext-link">Visit {b.name} ↗</a>
                      <span className="brk-disclaimer">Verify current charges on official website.</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="brk-table-note">
            Total cost includes brokerage, GST, DP charge, STT, exchange fee, SEBI charge, and stamp duty. Regulatory charges (₹111.51 on ₹50K delivery) are set by law — the same at every broker. ★ = Editor's Pick. Click any row to expand.
          </div>
        </div>
      )}

      {/* ── CALCULATOR ── */}
      {tab==='Calculator' && (
        <div className="brk-content">
          <div className="brk-calc-inputs">
            <div className="brk-calc-field">
              <label className="brk-calc-label">TRADE VALUE (₹)</label>
              <input className="brk-calc-input" type="number" value={tradeVal} onChange={e=>setTradeVal(e.target.value)} placeholder="50000"/>
            </div>
            <div className="brk-calc-field">
              <label className="brk-calc-label">SEGMENT</label>
              <div className="brk-seg">
                {[['delivery','Delivery'],['intraday','Intraday'],['futures','F&O Futures'],['options','F&O Options']].map(([v,l])=>(
                  <button key={v} className={`brk-seg-btn${segment===v?' active':''}`} onClick={()=>setSegment(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          {tv>0&&(
            <div className="brk-calc-results">
              <div className="brk-calc-head">
                <span>#</span><span>Broker</span><span>Brokerage</span><span>GST</span><span>Govt + Exchange</span><span>Total</span>
              </div>
              {calcResults.map((b,i)=>(
                <div key={b.id} className={`brk-calc-row${i===0?' brk-calc-best':''}${b.id==='zerodha'?' brk-calc-featured':''}`}>
                  <span className="brk-rank">{i+1}</span>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span>₹{fmt(b.brokerageRaw,2)}</span>
                  <span>₹{fmt(b.gst,2)}</span>
                  <span className="brk-govt">₹{fmt(b.regTotal,2)}</span>
                  <span className="brk-calc-total">₹{fmt(b.total,2)}</span>
                </div>
              ))}
              <div className="brk-calc-note">
                Govt + Exchange charges (STT, exchange fee, SEBI fee, stamp duty) are fixed by law and identical at every broker. They add up to ₹{fmt(REGULATORY[segment]?.total,2)} on this {segment} trade.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANNUAL COST ── */}
      {tab==='Annual Cost' && (
        <div className="brk-content">
          <div className="brk-scenario-tabs">
            {Object.entries(SCENARIOS).map(([k,v])=>(
              <button key={k} className={`brk-stab${scenario===k?' brk-stab-active':''}`} onClick={()=>setScenario(k)}>
                <span>{v.icon}</span> {v.label}
              </button>
            ))}
          </div>
          <div className="brk-scenario-desc">{SCENARIOS[scenario].desc}</div>
          <div className="brk-calc-results">
            <div className="brk-annual-head">
              <span>#</span><span>Broker</span><span>Trading</span><span>DP charges</span><span>AMC</span><span>Regulatory</span><span>Total/year</span>
            </div>
            {SCENARIOS[scenario].data.sort((a,b)=>a.total-b.total).map((row,i)=>{
              const b = BROKERS.find(x=>x.id===row.id);
              const best = SCENARIOS[scenario].data[0].total;
              return (
                <div key={row.id} className={`brk-annual-row${i===0?' brk-calc-best':''}${row.id==='zerodha'?' brk-calc-featured':''}`}>
                  <span className="brk-rank">{i+1}</span>
                  <span className="brk-broker-name">{row.id==='zerodha'&&<span className="brk-star">★ </span>}{b?.name||row.id}</span>
                  <span>₹{fmt(row.brokerage)}</span>
                  <span>₹{fmt(row.dp)}</span>
                  <span>₹{fmt(row.amc)}</span>
                  <span className="brk-govt">₹{fmt(row.regulatory)}</span>
                  <span className="brk-calc-total">
                    ₹{fmt(row.total)}
                    {i>0&&<span className="brk-annual-diff"> +₹{fmt(row.total-best)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="brk-table-note">
            Annual cost includes all charges. Regulatory = STT + exchange + SEBI + stamp duty. Fixed by law, identical everywhere. ★ = Platform Pick.
          </div>
        </div>
      )}

      {/* ── ALL CHARGES ── */}
      {tab==='All Charges' && (
        <div className="brk-content">
          <div className="brk-charge-nav">
            {[['demat','Demat Charges'],['mtf','MTF'],['settlement','Settlement'],['service','Services'],['account','Account'],['mods','Modifications']].map(([v,l])=>(
              <button key={v} className={`brk-filter-btn${chargeTab===v?' active':''}`} onClick={()=>setChargeTab(v)}>{l}</button>
            ))}
          </div>

          {chargeTab==='demat'&&(
            <div className="brk-charge-table">
              <div className="brk-ct-head"><span>Broker</span><span>DP Charge</span><span>AMC/yr</span><span>MF DP</span><span>Demat</span><span>Remat</span><span>Failed Demat</span></div>
              {[...BROKERS].sort((a,b)=>a.dp-b.dp).map(b=>(
                <div key={b.id} className={`brk-ct-row${b.id==='zerodha'?' brk-ct-featured':''}`}>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span className={b.dp<=15?'brk-green':b.dp>=25?'brk-red':''}>{b.dpLabel}</span>
                  <span className={b.amc===0?'brk-green':b.amc>=600?'brk-red':''}>₹{fmt(b.amc)}{b.amc===0?' (Free)':''}</span>
                  <span>{b.id==='zerodha'?'Free':b.id==='dhan'?'₹14.75':b.id==='groww'?'Free':b.id==='fyers'?'₹14.75':'₹20+'}</span>
                  <span>{b.dematerialisation}</span>
                  <span>₹{fmt(b.dp<=15?177:b.dp<=20?177:236)}/cert</span>
                  <span>₹59</span>
                </div>
              ))}
            </div>
          )}

          {chargeTab==='mtf'&&(
            <div className="brk-charge-table">
              <div className="brk-ct-head"><span>Broker</span><span>Interest Rate</span><span>MTF Brokerage</span><span>Pledge</span><span>Conversion</span><span>₹1L for 30 days</span></div>
              {[...BROKERS].filter(b=>b.mtfRate).sort((a,b)=>(a.mtfRate||99)-(b.mtfRate||99)).map(b=>(
                <div key={b.id} className={`brk-ct-row${b.id==='zerodha'?' brk-ct-featured':''}`}>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span className={b.mtfRate<=13?'brk-green':b.mtfRate>=17?'brk-red':''}>{b.mtfLabel}</span>
                  <span>{b.mtfBrokerage}</span>
                  <span>{b.pledgeUnpledge}</span>
                  <span>{['zerodha','dhan','groww','upstox','angelone','fyers','5paisa','mstock','indmoney'].includes(b.id)?'Free':'₹29.50–₹59'}</span>
                  <span className={b.mtfRate<=13?'brk-green':b.mtfRate>=17?'brk-red':''}>₹{fmt(b.mtfRate!=null ? Math.round(100000*b.mtfRate/100/12) : 0)}</span>
                </div>
              ))}
              <div className="brk-table-note">MTF interest rates change frequently. Verify with broker before using MTF. MTF is leverage — losses compound.</div>
            </div>
          )}

          {chargeTab==='service'&&(
            <div className="brk-charge-table">
              <div className="brk-ct-head"><span>Broker</span><span>Call & Trade</span><span>Auto Sq-Off</span><span>Payment GW</span><span>Instant W/D</span><span>API</span></div>
              {BROKERS.map(b=>(
                <div key={b.id} className={`brk-ct-row${b.id==='zerodha'?' brk-ct-featured':''}`}>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span>₹{b.callTrade}</span>
                  <span>₹{b.squareOff}</span>
                  <span>{b.paymentGw===0?'Free':`₹${fmt(b.paymentGw,2)}`}</span>
                  <span className={b.instantWithdrawal==='Free'?'brk-green':'brk-red'}>{b.instantWithdrawal}</span>
                  <span className={b.api==='Free'||b.api==='N/A'?b.api==='Free'?'brk-green':'':''}>{b.api}</span>
                </div>
              ))}
            </div>
          )}

          {chargeTab==='account'&&(
            <div className="brk-charge-table">
              <div className="brk-ct-head"><span>Broker</span><span>Account Opening</span><span>DDPI</span><span>Reactivation</span></div>
              {BROKERS.map(b=>(
                <div key={b.id} className={`brk-ct-row${b.id==='zerodha'?' brk-ct-featured':''}`}>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span className={['zerodha','dhan','groww','upstox','angelone','fyers','5paisa','mstock','sahi','indmoney','paytm','hdfc','axis'].includes(b.id)?'brk-green':''}>
                    {['kotak'].includes(b.id)?'₹99':b.id==='icici'?'₹299':'Free'}
                  </span>
                  <span>₹{b.ddpi||'N/A'}</span>
                  <span>₹{b.reactivation}</span>
                </div>
              ))}
            </div>
          )}

          {chargeTab==='settlement'&&(
            <div className="brk-charge-table">
              <div className="brk-ct-head"><span>Broker</span><span>Margin Shortfall</span><span>Pledge/Unpledge</span><span>Physical Settlement</span><span>Delayed Payment</span></div>
              {BROKERS.map(b=>(
                <div key={b.id} className={`brk-ct-row${b.id==='zerodha'?' brk-ct-featured':''}`}>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span className={b.marginShortfall==='0.035%/day'?'brk-green':''}>{b.marginShortfall}</span>
                  <span>{b.pledgeUnpledge}</span>
                  <span>{b.id==='mstock'?'Free':b.id==='zerodha'||b.id==='dhan'?'0.1–0.25%':'₹20+'}</span>
                  <span>{b.id==='zerodha'?'0.05%/day':b.id==='angel'?'0.041%/day':'0.045–0.05%/day'}</span>
                </div>
              ))}
            </div>
          )}

          {chargeTab==='mods'&&(
            <div className="brk-charge-table">
              <div className="brk-ct-head"><span>Broker</span><span>Name Change</span><span>Mobile/Email</span><span>Address</span><span>Nominee</span><span>Bank Account</span></div>
              {BROKERS.map(b=>(
                <div key={b.id} className={`brk-ct-row${b.id==='zerodha'?' brk-ct-featured':''}`}>
                  <span className="brk-broker-name">{b.id==='zerodha'&&<span className="brk-star">★ </span>}{b.name}</span>
                  <span>{['dhan','angelone','5paisa','mstock','indmoney','kotak','axis'].includes(b.id)?'Free':b.id==='zerodha'?'₹29.50':b.id==='fyers'||b.id==='groww'||b.id==='upstox'?'₹59':b.id==='paytm'?'₹25':'—'}</span>
                  <span>{['zerodha','dhan','angelone','5paisa','mstock','indmoney','kotak','icici','axis'].includes(b.id)?<span className="brk-green">Free</span>:b.id==='fyers'||b.id==='groww'||b.id==='upstox'?'₹59':'₹25'}</span>
                  <span>{['dhan','angelone','5paisa','mstock','indmoney','kotak','icici','axis'].includes(b.id)?<span className="brk-green">Free</span>:b.id==='fyers'||b.id==='groww'||b.id==='upstox'?'₹59':b.id==='zerodha'?'₹29.50':'₹25'}</span>
                  <span>{['5paisa','mstock','indmoney','kotak','axis'].includes(b.id)?<span className="brk-green">Free</span>:b.id==='fyers'||b.id==='groww'||b.id==='upstox'?'₹59':b.id==='zerodha'||b.id==='dhan'||b.id==='angelone'?'₹29.50':b.id==='paytm'?'₹25':'—'}</span>
                  <span>{['groww','angelone','5paisa','mstock','sahi','indmoney','kotak','axis'].includes(b.id)?<span className="brk-green">Free</span>:b.id==='upstox'||b.id==='fyers'?'₹59':b.id==='zerodha'||b.id==='dhan'?'₹29.50':b.id==='paytm'?'₹25':'—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MARKET DATA ── */}
      {tab==='Market Data' && (
        <div className="brk-content">
          <div className="brk-mkt-grid">
            <div>
              <div className="brk-ov-title">Active Clients — NSE January 2026</div>
              <div className="brk-mkt-list">
                {[
                  {n:'Groww',v:12.5,pct:'28.1%'},{n:'Zerodha',v:6.9,pct:'15.45%',featured:true},
                  {n:'Angel One',v:6.7,pct:'15.19%'},{n:'ICICI Securities',v:2.0,pct:'4.60%'},
                  {n:'Upstox',v:2.0,pct:'4.58%'},{n:'HDFC Securities',v:1.4,pct:'3.22%'},
                  {n:'Kotak Securities',v:1.4,pct:'3.08%'},{n:'SBI Securities',v:1.1,pct:'2.57%'},
                  {n:'Dhan',v:1.0,pct:'2.25%'},{n:'Motilal Oswal',v:0.9,pct:'2.04%'},
                ].map((item,i)=>(
                  <div key={i} className={`brk-mkt-row${item.featured?' brk-mkt-featured':''}`}>
                    <span className="brk-rank">{i+1}</span>
                    <span className="brk-broker-name">{item.featured&&<span className="brk-star">★ </span>}{item.n}</span>
                    <div className="brk-mkt-bar-wrap">
                      <div className="brk-mkt-bar" style={{width:`${(item.v/12.5)*100}%`, background:item.featured?'var(--accent)':'var(--text3)'}}/>
                    </div>
                    <span className="brk-mkt-val">{item.v}M</span>
                    <span className="brk-mkt-pct">{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="brk-ov-title">Broker Networth — NSE Filing July 2025</div>
              <div className="brk-mkt-list">
                {[
                  {n:'Zerodha',v:13500,featured:true},{n:'Kotak Securities',v:7900},
                  {n:'ICICI Securities',v:4500},{n:'Angel One',v:4400},
                  {n:'Anand Rathi',v:4000},{n:'Mirae Asset',v:3600},
                  {n:'HDFC Securities',v:2700},{n:'SBI Securities',v:1900},
                  {n:'Motilal Oswal',v:1800},{n:'Axis Securities',v:1700},
                ].map((item,i)=>(
                  <div key={i} className={`brk-mkt-row${item.featured?' brk-mkt-featured':''}`}>
                    <span className="brk-rank">{i+1}</span>
                    <span className="brk-broker-name">{item.featured&&<span className="brk-star">★ </span>}{item.n}</span>
                    <div className="brk-mkt-bar-wrap">
                      <div className="brk-mkt-bar" style={{width:`${(item.v/13500)*100}%`, background:item.featured?'var(--gain)':'var(--text3)'}}/>
                    </div>
                    <span className="brk-mkt-val">₹{fmt(item.v)} Cr</span>
                  </div>
                ))}
              </div>
              <div className="brk-table-note">Zerodha's networth (₹13,500 Cr) is 1.7× the second-largest broker. Reflects 15 years of consistent profitability from a lean, tech-first model.</div>
            </div>
          </div>
          <div className="brk-mkt-summary">
            <div className="brk-mkt-stat"><div className="brk-mkt-stat-n">44.4M</div><div className="brk-mkt-stat-l">Active clients on NSE</div></div>
            <div className="brk-mkt-stat"><div className="brk-mkt-stat-n">59%</div><div className="brk-mkt-stat-l">Top 3 concentration (Groww + Zerodha + Angel)</div></div>
            <div className="brk-mkt-stat"><div className="brk-mkt-stat-n">383%</div><div className="brk-mkt-stat-l">Industry growth since 2020</div></div>
            <div className="brk-mkt-stat"><div className="brk-mkt-stat-n brk-red">-10.5%</div><div className="brk-mkt-stat-l">Off peak (Jan 2025) — SEBI F&O regulations</div></div>
          </div>
        </div>
      )}

      <div className="brk-footer">
        Data sourced from official broker websites, fee documents, and NSE filings. Regulatory charges (STT, exchange fee, SEBI fee, stamp duty) are fixed by government and exchanges — identical at every broker. Always verify current charges before trading. No affiliates. No paid placements. No sponsored rankings. ★ Editor's Pick = editorial judgment based on platform quality, financial strength, and track record — not cost alone. Not sponsored.
      </div>
    </div>
  );
}
