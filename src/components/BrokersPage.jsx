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
    mtfSlabs: [['All amounts','14.6% p.a.']],
    callTrade: 59, squareOff: 59,
    paymentGw: 10.62,
    instantWithdrawal: 'Free',
    api: '₹500/mo', apiNote: 'Kite Connect — ₹500/mo base plan',
    ddpi: 118, reactivation: 0,
    networth: 13500, networthLabel: '₹13,500 Cr',
    activeClients: 6.9, activeClientsLabel: '6.9M',
    total50k: 126.58, brokerCharges50k: 15.34,
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
    watch: ['AMC ₹88.50/yr (₹7.38/mo)', 'API ₹500/mo (Kite Connect)', 'No SLB or LAS'],
    best: ['equity', 'options', 'algo', 'longterm'],
    url: 'https://zerodha.com',
  },
  {
    id: 'dhan', name: 'Dhan', type: 'discount', rank: 1, featured: false,
    tagline: 'Zero delivery brokerage, zero AMC. Lower by ₹0.59 compared to Zerodha.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '0.03% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 14.75, dpLabel: '₹12.5 + 18% GST',
    amc: 0, amcLabel: 'Free',
    mtfRate: 12.49, mtfLabel: '12.49% (≤₹5L)',
    mtfBrokerage: '0.03% or ₹20',
    mtfSlabs: [['≤ ₹5L','12.49%'],['₹5L–₹10L','13.49%'],['₹10L–₹25L','14.49%'],['₹25L–₹50L','15.49%'],['> ₹50L','16.49%']],
    callTrade: 59, squareOff: 23.60,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Trading API free · Data API ₹499+GST (real-time feed + historical data)',
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: 1.0, activeClientsLabel: '1.0M',
    total50k: 125.99, brokerCharges50k: 14.75,
    pledgeUnpledge: '₹17.70/ISIN each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.0438%/day (15.99% p.a.)',
    strengths: ['Zero AMC', 'Lowest DP charge (₹14.75 = ₹12.50 + 18% GST)'],
    watch: ['UI design not as refined compared to top brokers', 'MTF rates vary by slab — not the same for everyone', 'MTF interest charged on both days for BTST trades', 'Intraday cash margin shortfall: 0.0438%/day (15.99% p.a.)', 'Newer broker — less institutional track record vs Zerodha'],
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
    ddpi: 99, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: 0.27, activeClientsLabel: '0.27M',
    total50k: 132.48, brokerCharges50k: 21.24,
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
    total50k: 148.34, brokerCharges50k: 37.10,
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
    mtfRate: 16.49, mtfLabel: '16.49% (up to ₹1L)',
    mtfBrokerage: '₹20 or 0.3%',
    callTrade: 59, squareOff: 59,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Fyers API — free, well documented',
    ddpi: 0, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: null, activeClientsLabel: '—',
    total50k: 173.19, brokerCharges50k: 61.95,
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
    api: '₹499+GST/mo', apiNote: 'Data API',
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: 12.5, activeClientsLabel: '12.5M',
    total50k: 178.44, brokerCharges50k: 67.20,
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
    ddpi: 150, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: 2.0, activeClientsLabel: '2.0M',
    total50k: 178.44, brokerCharges50k: 67.20,
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
    ddpi: 118, reactivation: 0,
    networth: 4400, networthLabel: '₹4,400 Cr',
    activeClients: 6.7, activeClientsLabel: '6.7M',
    total50k: 178.44, brokerCharges50k: 67.20,
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
    mtfRate: 7.99, mtfLabel: '7.99% (up to ₹1L)',
    mtfBrokerage: '0.1%',
    callTrade: 100, squareOff: 59,
    paymentGw: 0,
    instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'Not offered',
    ddpi: 0, reactivation: 118,
    networth: null, networthLabel: '—',
    activeClients: 0.86, activeClientsLabel: '0.86M',
    total50k: 178.44, brokerCharges50k: 67.20,
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
    total50k: 180.27, brokerCharges50k: 69.03,
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
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: 0.34, activeClientsLabel: '0.34M',
    total50k: 182.04, brokerCharges50k: 70.80,
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
    total50k: 367.24, brokerCharges50k: 256,
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
    total50k: 429.84, brokerCharges50k: 318.60,
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
    total50k: 701.24, brokerCharges50k: 590,
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
    total50k: 721.24, brokerCharges50k: 610,
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
// STT updated per Union Budget 2026, effective April 1 2026:
// Futures sell: 0.05% (was 0.02%) · Options premium sell: 0.15% (was 0.10%)
// Delivery/Intraday base: ₹50K · Futures base: ₹1.5L (realistic min contract) · Options base: ₹50K premium
const REGULATORY = {
  delivery: { stt: 100.00, txn: 3.07,  sebi: 0.10, stamp: 7.50,  gst: 0.57, total: 111.24, base: '₹50K' },
  intraday: { stt: 12.50,  txn: 3.07,  sebi: 0.10, stamp: 1.50,  gst: 0.57, total: 17.74,  base: '₹50K' },
  futures:  { stt: 75.00,  txn: 5.49,  sebi: 0.30, stamp: 3.00,  gst: 1.04, total: 84.83,  base: '₹1.5L' },
  options:  { stt: 75.00,  txn: 17.77, sebi: 0.05, stamp: 1.50,  gst: 3.21, total: 97.52,  base: '₹50K premium' },
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

const TABS = ['Rankings', 'Calculator', 'MTF Comparison', 'All Charges', 'Market Data'];

export default function BrokersPage() {
  const [tab,      setTab]     = useState('Rankings');
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
      <div className="brk-hero2">
        <div className="brk-hero2-title">Indian Broker Charges — Every Fee, Calculated</div>
        <div className="brk-hero2-sub">16 brokers covered. No bias from affiliates or paid placements.</div>
        <div className="brk-hero2-stats">
          <div className="brk-hs2">
            <div className="brk-hs2-n" style={{color:'var(--gain)'}}>₹125.99</div>
            <div className="brk-hs2-l">Cheapest — <strong style={{color:'var(--text)'}}>Dhan</strong> &amp; <strong style={{color:'var(--accent)'}}>Zerodha ★</strong></div>
          </div>
          <div className="brk-hs2-sep">vs</div>
          <div className="brk-hs2">
            <div className="brk-hs2-n" style={{color:'var(--loss)'}}>₹721.24</div>
            <div className="brk-hs2-l">Most expensive — <strong style={{color:'var(--text)'}}>HDFC Securities</strong></div>
          </div>
          <div className="brk-hs2-sep">·</div>
          <div className="brk-hs2">
            <div className="brk-hs2-n">₹111.51</div>
            <div className="brk-hs2-l">Fixed govt charges — same at every broker</div>
          </div>
          <div className="brk-hs2-sep">·</div>
          <div className="brk-hs2">
            <div className="brk-hs2-n">5.7×</div>
            <div className="brk-hs2-l">Difference between cheapest and costliest</div>
          </div>
        </div>
        <div className="brk-hero2-note">
          <span style={{color:'var(--accent)',fontWeight:900,fontSize:15}}>★ Zerodha</span> — Widely considered for combination of low cost, robust trading experience, reliability and trust. ₹13,500 Cr networth (highest of any broker in India), 15+ year track record, Kite platform, <a href="https://zerodha.com/varsity/" target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',textDecoration:'underline'}}>Varsity</a> education.<br/>Costs just ₹0.59 more than Dhan on a ₹50,000 delivery trade.

        </div>
      </div>

      {/* MAIN: left nav 40% + content 60% */}
      <div className="brk-layout">

        {/* LEFT NAV */}
        <div className="brk-sidenav">
          {TABS.map(t=>(
            <button key={t} className={`brk-nav-btn${tab===t?' brk-nav-active':''}`} onClick={()=>setTab(t)}>
              <span className="brk-nav-icon">{
                t==='Rankings'?'↓':t==='Calculator'?'₹':t==='MTF Comparison'?'%':t==='All Charges'?'≡':'📊'
              }</span>
              <span className="brk-nav-label">{t}</span>
            </button>
          ))}
        </div>

        {/* RIGHT CONTENT */}
        <div className="brk-main-content">

      {/* ── RANKINGS ── */}
      {tab==='Rankings' && (
        <div className="brk-content">

          {/* Filters */}
          <div className="brk-filters">
            <div className="brk-filter-group">
              <span className="brk-filter-label">BROKER TYPE</span>
              {[['all','All Brokers'],['discount','Discount Only'],['full','Full-Service Only']].map(([v,l])=>(
                <button key={v} className={`brk-filter-btn${filter===v?' active':''}`} onClick={()=>setFilter(v)}>{l}</button>
              ))}
            </div>
            <div className="brk-filter-group">
              <span className="brk-filter-label">SORT BY</span>
              {[['total50k','Total Cost'],['dp','DP Charge'],['amc','AMC'],['mtfRate','MTF Rate']].map(([v,l])=>(
                <button key={v} className={`brk-filter-btn${sort===v?' active':''}`} onClick={()=>setSort(v)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Regulatory note */}
          <div className="brk-reg-note">
            <span className="brk-reg-num">₹111.24</span> govt charges on ₹50K delivery — STT ₹100 + exchange ₹3.07 + SEBI ₹0.10 + stamp ₹7.50 + GST ₹0.57. Fixed by law, same at every broker.<br/>Futures calculated on ₹1.5L contract (realistic minimum). Budget 2026: futures STT 0.05%, options STT 0.15%, effective April 1 2026.
          </div>

          {/* Broker cards */}
          <div className="brk-cards-list">
            {sorted.map((b,i)=>(
              <div key={b.id} className={`brk-card${b.featured?' brk-card-featured':''}${expanded===b.id?' brk-card-open':''}`}>

                {/* Card — full redesign: name top, all columns, totals bottom */}
                <div className="brk-card-header" onClick={()=>setExpanded(expanded===b.id?null:b.id)}>

                  {/* TOP ROW: rank + name + type + expand hint */}
                  <div className="brk-card-top">
                    <div className="brk-card-rank-badge">#{i+1}</div>
                    <div className="brk-card-name">
                      {b.featured&&<span className="brk-card-star">★ </span>}
                      {b.name}
                    </div>
                    <span className={`brk-card-typetag ${b.type==='discount'?'brk-tag-d':'brk-tag-f'}`}>{b.type==='discount'?'Discount':'Full-Service'}</span>
                    <div className="brk-card-expand-hint">{expanded===b.id?'▲ collapse':'▼ full details'}</div>
                  </div>

                  {/* CHARGE COLUMNS */}
                  <div className="brk-card-cols">

                    {/* Col: Delivery */}
                    <div className="brk-col">
                      <div className="brk-col-label">DELIVERY</div>
                      <div className={`brk-col-val ${b.delivery===0?'brk-col-zero':''}`}>{b.deliveryLabel}</div>
                    </div>

                    {/* Col: Intraday */}
                    <div className="brk-col">
                      <div className="brk-col-label">INTRADAY</div>
                      <div className="brk-col-val">{b.intraday}</div>
                    </div>

                    {/* Col: Options */}
                    <div className="brk-col">
                      <div className="brk-col-label">OPTIONS</div>
                      <div className="brk-col-val">{b.options}</div>
                    </div>

                    <div className="brk-col-divider"/>

                    {/* Col: MTF Brokerage */}
                    <div className="brk-col">
                      <div className="brk-col-label">MTF BROKERAGE</div>
                      <div className="brk-col-val">{b.mtfBrokerage||'—'}</div>
                    </div>

                    {/* Col: MTF Interest — show slabs if available */}
                    <div className="brk-col brk-col-wide">
                      <div className="brk-col-label">MTF INTEREST</div>
                      {b.mtfSlabs ? (
                        <div className="brk-col-slabs">
                          {b.mtfSlabs.map((s,si)=>(
                            <div key={si} className="brk-col-slab">
                              <span className="brk-slab-range">{s[0]}</span>
                              <span className={`brk-slab-rate ${parseFloat(s[1])>=15?'brk-col-red':parseFloat(s[1])<=13?'brk-col-green':'brk-col-amber'}`}>{s[1]}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`brk-col-val ${b.mtfRate&&b.mtfRate<=13?'brk-col-green':b.mtfRate&&b.mtfRate>=17?'brk-col-red':''}`}>{b.mtfLabel||'N/A'}</div>
                      )}
                    </div>

                    <div className="brk-col-divider"/>

                    {/* Col: DP Charge */}
                    <div className="brk-col">
                      <div className="brk-col-label">DP CHARGE</div>
                      <div className={`brk-col-val ${b.dp<=14.75?'brk-col-green':''}`}>₹{fmt(b.dp,2)}</div>
                      <div className="brk-col-sub">{b.dpLabel} · per scrip per sell</div>
                    </div>

                    {/* Col: AMC */}
                    <div className="brk-col">
                      <div className="brk-col-label">AMC / YEAR</div>
                      <div className={`brk-col-val ${b.amc===0?'brk-col-green':b.amc>=600?'brk-col-red':''}`}>{b.amcLabel}</div>
                    </div>

                  </div>

                  {/* BOTTOM ROW: total costs */}
                  <div className="brk-card-totals">
                    <div className="brk-card-totals-label">TOTAL ALL-IN COST — ₹50,000 TRADE</div>
                    <div className="brk-card-totals-row">
                      <div className="brk-total-item">
                        <span className="brk-total-seg">Delivery</span>
                        <span className={`brk-total-num ${i===0?'brk-col-green':b.featured?'brk-col-accent':''}`}>₹{fmt(b.total50k,2)}</span>
                      </div>
                      <div className="brk-total-item">
                        <span className="brk-total-seg">Intraday</span>
                        <span className="brk-total-num">₹{fmt(((b.intradayB||20)*1.18 + 17.74).toFixed(2))}</span>
                      </div>
                      <div className="brk-total-item">
                        <span className="brk-total-seg">Options</span>
                        <span className="brk-total-num">₹{fmt(((b.optionsB||20)*1.18 + 97.52).toFixed(2))}</span>
                      </div>
                      {i>0&&<div className="brk-total-vs">+₹{fmt(b.total50k-sorted[0].total50k,2)} vs cheapest on delivery</div>}
                    </div>
                  </div>

                </div>

                {/* Expanded detail */}
                {expanded===b.id&&(
                  <div className="brk-card-detail">
                    <div className="brk-card-tagline">{b.tagline}</div>

                    {/* Full charge breakdown */}
                    <div className="brk-card-charge-grid">
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">BROKERAGE</div>
                        <div className="brk-ccs-row"><span>Delivery equity</span><span className={b.delivery===0?'brk-green':''}>{b.deliveryLabel}</span></div>
                        <div className="brk-ccs-row"><span>Intraday equity</span><span>{b.intraday}</span></div>
                        <div className="brk-ccs-row"><span>F&O Futures</span><span>{b.futures}</span></div>
                        <div className="brk-ccs-row"><span>F&O Options</span><span>{b.options}</span></div>
                      </div>
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">DEMAT CHARGES</div>
                        <div className="brk-ccs-row"><span>DP charge (per scrip sell)</span><span>{b.dpLabel}</span></div>
                        <div className="brk-ccs-row"><span>AMC</span><span className={b.amc===0?'brk-green':''}>{b.amcLabel}</span></div>
                        <div className="brk-ccs-row"><span>Pledge / Unpledge</span><span>{b.pledgeUnpledge}</span></div>
                        <div className="brk-ccs-row"><span>Dematerialisation</span><span>{b.dematerialisation}</span></div>
                      </div>
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">SERVICES</div>
                        <div className="brk-ccs-row"><span>Call & trade</span><span>₹{b.callTrade}</span></div>
                        <div className="brk-ccs-row"><span>Auto square-off</span><span>₹{b.squareOff}</span></div>
                        <div className="brk-ccs-row"><span>Instant withdrawal</span><span className={b.instantWithdrawal==='Free'?'brk-green':''}>{b.instantWithdrawal}</span></div>
                        <div className="brk-ccs-row"><span>Payment gateway</span><span>{b.paymentGw===0?'Free':'₹'+fmt(b.paymentGw,2)}</span></div>
                      </div>
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">MTF & API</div>
                        {b.mtfSlabs ? b.mtfSlabs.map((s,si)=>(
                          <div key={si} className="brk-ccs-row">
                            <span>{s[0]}</span>
                            <span className={parseFloat(s[1])>=15?'brk-card-red':parseFloat(s[1])<=13?'brk-green':''}>{s[1]}</span>
                          </div>
                        )) : <div className="brk-ccs-row"><span>MTF interest</span><span>{b.mtfLabel||'—'}</span></div>}
                        <div className="brk-ccs-row" style={{marginTop:4,borderTop:'1px solid var(--border)',paddingTop:4}}><span>MTF brokerage</span><span>{b.mtfBrokerage}</span></div>
                        <div className="brk-ccs-row"><span>API access</span><span>{b.apiNote||b.api}</span></div>
                        <div className="brk-ccs-row"><span>Margin shortfall</span><span className={b.marginShortfall==='0.035%/day'?'brk-green':''}>{b.marginShortfall}</span></div>
                      </div>
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">ACCOUNT</div>
                        <div className="brk-ccs-row"><span>Account opening</span><span className="brk-green">Free</span></div>
                        <div className="brk-ccs-row"><span>DDPI</span><span>₹{b.ddpi}</span></div>
                        <div className="brk-ccs-row"><span>Reactivation</span><span>₹{b.reactivation}</span></div>
                        {b.networth&&<div className="brk-ccs-row"><span>Networth (NSE)</span><span>{b.networthLabel}</span></div>}
                        {b.activeClients&&<div className="brk-ccs-row"><span>Active clients</span><span>{b.activeClientsLabel}</span></div>}
                      </div>
                    </div>

                    <div className="brk-card-sw">
                      <div className="brk-card-sw-col">
                        <div className="brk-ccs-title">STRENGTHS</div>
                        {b.strengths.map((s,i)=><div key={i} className="brk-sw-item brk-sw-good">✔ {s}</div>)}
                      </div>
                      <div className="brk-card-sw-col">
                        <div className="brk-ccs-title">WATCH OUT FOR</div>
                        {b.watch.map((s,i)=><div key={i} className="brk-sw-item brk-sw-warn">⚠ {s}</div>)}
                      </div>
                    </div>

                    <div className="brk-expand-footer">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="brk-ext-link">Visit {b.name} ↗</a>
                      <span className="brk-disclaimer">Verify all charges on the broker's official website before trading.</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="brk-table-note">
            Total cost on ₹50,000 delivery trade (buy + sell) includes all charges. ★ = Editor's Pick (platform quality, track record, financial strength). Click any broker to expand full charge breakdown.
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
                Regulatory charges (STT, exchange fee, SEBI fee, stamp duty + GST) are fixed by law — identical at every broker. Total: ₹{fmt(REGULATORY[segment]?.total,2)} on this trade. Futures base = ₹1.5L contract (realistic minimum). Budget 2026: futures STT 0.05%, options STT 0.15%.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MTF COMPARISON ── */}
      {tab==='MTF Comparison' && (
        <div className="brk-content">
          <div className="brk-reg-note">
            <span className="brk-reg-num">MTF = Margin Trading Facility</span> — buy stocks with borrowed money. Two costs hit you: interest on borrowed amount (daily, compounded) + brokerage per order. Rates below are indicative; verify with broker before using MTF.
          </div>

          <div className="brk-mtf-grid">
            {/* Interest rates ranked */}
            <div>
              <div className="brk-ccs-title" style={{fontSize:13,marginBottom:14}}>MTF INTEREST RATE — RANKED LOW TO HIGH</div>
              <div className="brk-cards-list">
                {[
                  {name:'Paytm Money', rate:'7.99%', note:'Up to ₹1L · 9.99% above ₹1L', color:'var(--gain)'},
                  {name:'HDFC Securities', rate:'12%', note:'~0.032%/day on funded amount', color:'var(--gain)'},
                  {name:'Dhan', rate:'12.49%', note:'Up to ₹5L · rises to 16.49% above ₹50L', color:'var(--gain)'},
                  {name:'Zerodha', rate:'14.6%', note:'0.04%/day · flat rate · unlimited holding', color:'var(--text)'},
                  {name:'INDmoney', rate:'14.6%', note:'0.04%/day', color:'var(--text)'},
                  {name:'Kotak Securities', rate:'14.97%', note:'0.041%/day (Trade Free plan)', color:'var(--text)'},
                  {name:'Angel One', rate:'14.99%', note:'0.049%/day', color:'var(--text)'},
                  {name:'mStock', rate:'15%', note:'0.0274%/day up to ₹25L', color:'var(--text)'},
                  {name:'5paisa', rate:'15.5%', note:'0.042%/day (₹5L–₹1Cr slab)', color:'#F59E0B'},
                  {name:'Groww', rate:'15.75%', note:'0.043%/day under ₹25L · 9.75% above', color:'#F59E0B'},
                  {name:'Fyers', rate:'16.49%', note:'For ₹1K–₹1L · lower for larger amounts', color:'#F59E0B'},
                  {name:'ICICI Direct', rate:'17.99%', note:'On base plan', color:'var(--loss)'},
                  {name:'Axis Securities', rate:'17.99%', note:'0.05%/day', color:'var(--loss)'},
                  {name:'Upstox', rate:'18.25%', note:'₹20/day per ₹40,000 slab', color:'var(--loss)'},
                ].map((b,i)=>(
                  <div key={i} className="brk-mtf-row">
                    <span className="brk-mtf-rank">#{i+1}</span>
                    <span className="brk-mtf-name">{b.name}</span>
                    <span className="brk-mtf-rate" style={{color:b.color}}>{b.rate}</span>
                    <span className="brk-mtf-note">{b.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MTF cost comparison for ₹1L borrowed 30 days */}
            <div>
              <div className="brk-ccs-title" style={{fontSize:13,marginBottom:14}}>COST OF ₹1,00,000 BORROWED FOR 30 DAYS</div>
              <div className="brk-cards-list">
                {[
                  {name:'Paytm Money', interest:657, brokerage:47, total:704, note:'7.99% p.a.'},
                  {name:'HDFC Securities', interest:986, brokerage:755, total:1741, note:'12% p.a. but high brokerage'},
                  {name:'Dhan', interest:1027, brokerage:47, total:1074, note:'12.49% for ≤₹5L'},
                  {name:'Zerodha', interest:1200, brokerage:47, total:1247, note:'14.6% p.a. flat'},
                  {name:'Angel One', interest:1232, brokerage:47, total:1279, note:'14.99% p.a.'},
                  {name:'Kotak Securities', interest:1230, brokerage:472, total:1702, note:'High brokerage on MTF'},
                  {name:'Groww', interest:1295, brokerage:236, total:1531, note:'15.75% + higher brokerage'},
                  {name:'Upstox', interest:1500, brokerage:47, total:1547, note:'₹20/day per ₹40K slab'},
                  {name:'ICICI Direct', interest:2465, brokerage:2950, total:5415, note:'Very expensive on base plan'},
                ].map((b,i)=>(
                  <div key={i} className="brk-mtf-cost-row">
                    <span className="brk-mtf-rank">#{i+1}</span>
                    <span className="brk-mtf-name">{b.name}</span>
                    <span className="brk-mtf-int">Int: ₹{b.interest.toLocaleString('en-IN')}</span>
                    <span className="brk-mtf-brk">Brk: ₹{b.brokerage.toLocaleString('en-IN')}</span>
                    <span className="brk-mtf-total-val" style={{color:i===0?'var(--gain)':i>=7?'var(--loss)':'var(--text)'}}>₹{b.total.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <div className="brk-reg-note" style={{marginTop:16}}>
                <span style={{color:'var(--loss)',fontWeight:800}}>MTF is leverage.</span> Interest compounds daily. A ₹5L position at 14.6% for 30 days costs ₹6,000 in interest alone. Use MTF only with a clear short-term thesis and planned exit.
              </div>

              <div className="brk-ccs-title" style={{fontSize:12,marginTop:20,marginBottom:10}}>MTF BROKERAGE PER ORDER</div>
              <div className="brk-cards-list">
                {[
                  {name:'mStock', brk:'₹5 flat'},
                  {name:'Zerodha / Dhan', brk:'0.3% or ₹20'},
                  {name:'Angel One', brk:'0.1% or ₹20'},
                  {name:'Groww', brk:'0.1% of order'},
                  {name:'Upstox / 5paisa', brk:'₹20 flat'},
                  {name:'Kotak Securities', brk:'0–0.30% by plan'},
                  {name:'HDFC Securities', brk:'0.32% min ₹25'},
                  {name:'ICICI Direct', brk:'0.25% base plan'},
                  {name:'Axis Securities', brk:'0.5% min ₹25'},
                ].map((b,i)=>(
                  <div key={i} className="brk-mtf-row">
                    <span className="brk-mtf-name" style={{flex:'1'}}>{b.name}</span>
                    <span className="brk-mtf-rate" style={{color:i<=1?'var(--gain)':'var(--text)'}}>{b.brk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="brk-table-note">
            MTF interest rates change frequently. Always confirm with your broker before using MTF. Rates shown are for standard/base plans. ₹1L for 30 days calculation uses 1 buy + 1 sell brokerage including 18% GST on brokerage.
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

        </div>{/* end brk-main-content */}
      </div>{/* end brk-layout */}

      <div className="brk-footer">
        Data sourced from official broker websites, fee documents, and NSE filings. Regulatory charges (STT, exchange fee, SEBI fee, stamp duty) are fixed by government and exchanges — identical at every broker. Always verify current charges before trading. No affiliates. No paid placements. No sponsored rankings. ★ Editor's Pick = editorial judgment based on platform quality, financial strength, and track record — not cost alone. Not sponsored.
      </div>
    </div>
  );
}
