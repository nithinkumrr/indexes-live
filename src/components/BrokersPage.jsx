import { useState, useMemo } from 'react';

// ── COMPLETE BROKER DATA ──────────────────────────────────────────────────────
const BROKERS = [
  {
    id: 'zerodha', name: 'Zerodha', type: 'discount', rank: 2, featured: true,
    tagline: "The broker that changed Indian markets. Zero delivery brokerage, traders' fav platform, highest networth.",
    delivery: 0, deliveryLabel: 'Zero',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '0.03% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 15.34, dpLabel: '₹13 + 18% GST',
    amc: 88.50, amcLabel: '₹75 + GST/quarter',
    mtfRate: 14.6, mtfLabel: '14.6% p.a.',
    mtfSlabs: [['All amounts','14.6% p.a.']],
    mtfBrokerage: '0.3% or ₹20',
    callTrade: 59, squareOff: 59, paymentGw: 10.62, instantWithdrawal: 'Free',
    api: '₹500/mo', apiNote: 'Trading API free · Data API ₹500/mo',
    ddpi: 118, reactivation: 0,
    networth: 13500, networthLabel: '₹13,500 Cr',
    activeClients: 6.9, activeClientsLabel: '6.9M',
    total50k: 126.58, brokerCharges50k: 15.34,
    pledgeUnpledge: '₹35.40 pledge / Free unpledge',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.035%/day (12.78% p.a.)',
    marginShortfallIntraday: 'Additional ₹20 brokerage',
    marginShortfallOvernight: '0.035%/day (12.78% p.a.)',
    delayedPayment: '0.05% per day',
    strengths: ['Kite — robust, with terminal mode for advanced trading setups','Zero delivery brokerage','Lowest margin shortfall (0.035%/day)','Access to govt securities (T-Bills, G-Secs)','Coin for direct mutual funds','Highest networth (₹13,500 Cr)'],
    watch: ['AMC ₹75+GST/quarter'],
    best: ['equity','options','algo','longterm'], url: 'https://zerodha.com',
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
    mtfSlabs: [['≤ ₹5L','12.49%'],['₹5L–₹10L','13.49%'],['₹10L–₹25L','14.49%'],['₹25L–₹50L','15.49%'],['> ₹50L','16.49%']],
    mtfBrokerage: '0.03% or ₹20',
    callTrade: 59, squareOff: 23.60, paymentGw: 0, instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Trading API free · Data API ₹499+GST/mo',
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—',
    activeClients: 1.0, activeClientsLabel: '1.0M',
    total50k: 125.99, brokerCharges50k: 14.75,
    pledgeUnpledge: '₹17.70/ISIN each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.0438%/day (15.99% p.a.)',
    marginShortfallIntraday: '0.0438%/day (15.99% p.a.)',
    marginShortfallOvernight: '0.0438%/day (15.99% p.a.)',
    delayedPayment: '0.0438% per day',
    cuspaCharge: '₹15/instruction/ISIN + GST',
    strengths: ['Zero AMC','Lowest DP charge (₹14.75 = ₹12.50 + 18% GST)','Dext trading terminal','Online SLB'],
    watch: ['UI not as refined as top brokers','MTF rates vary by slab','MTF interest charged both days on BTST','Newer broker — less track record vs Zerodha'],
    best: ['equity','longterm','beginner'], url: 'https://dhan.co',
  },
  {
    id: 'mstock', name: 'mStock', type: 'discount', rank: 3,
    tagline: 'Mirae Asset backed. Lowest intraday at ₹5/order. Watch the quarterly AMC.',
    delivery: 0, deliveryLabel: 'Zero',
    intraday: '₹5 flat', intradayB: 5,
    futures: '₹5 flat', futuresB: 5,
    options: '₹5/order', optionsB: 5,
    dp: 21.24, dpLabel: '₹18 + 18% GST', dpHighlight: 'red',
    amc: 259, amcLabel: '₹219+GST/quarter',
    mtfRate: 15.0, mtfLabel: '15% (≤₹25L)',
    mtfSlabs: [['≤ ₹25L','15% p.a.'],['₹25L–₹5Cr','10% p.a.'],['>₹5Cr','7% p.a.']],
    mtfBrokerage: '₹5/order',
    callTrade: 0, squareOff: 118, paymentGw: 10, instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'No trading API offered',
    ddpi: 99, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: 0.27, activeClientsLabel: '0.27M',
    total50k: 132.48, brokerCharges50k: 21.24,
    pledgeUnpledge: '₹32/unpledge only',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.0274%/day (10% p.a.)',
    marginShortfallIntraday: '0.0274%/day (10% p.a.)',
    marginShortfallOvernight: '0.0274%/day (10% p.a.)',
    delayedPayment: '—',
    strengths: ['Lowest intraday brokerage (₹5/order)','Zero delivery','Free call & trade','Low margin shortfall (0.0274%/day)'],
    watch: ['AMC ₹219+GST/quarter','Auto square-off ₹118 (highest discount)','No API','DP charge on every sell transaction (not per stock)'],
    best: ['intraday'], url: 'https://mstock.co.in',
  },
  {
    id: 'sahi', name: 'Sahi', type: 'discount', rank: 4,
    tagline: 'Flat ₹10/order. Zero AMC. Simple pricing.',
    delivery: null, deliveryLabel: '₹10 or 0.05%',
    intraday: '₹10 or 0.05%', intradayB: 10,
    futures: '₹10/order', futuresB: 10,
    options: '₹10/order', optionsB: 10,
    dp: 13.50, dpLabel: '₹13.50/scrip',
    amc: 0, amcLabel: 'Free',
    mtfRate: null, mtfLabel: 'N/A', mtfSlabs: null, mtfBrokerage: 'N/A',
    callTrade: 0, squareOff: 59, paymentGw: 0, instantWithdrawal: 'Free',
    api: 'N/A', apiNote: 'No API offered',
    ddpi: null, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: null, activeClientsLabel: '—',
    total50k: 148.34, brokerCharges50k: 37.10,
    pledgeUnpledge: '₹23.60 pledge / ₹5.90 repledge',
    dematerialisation: '₹177/cert',
    marginShortfall: 'N/A',
    strengths: ['Good UI — lacks platform maturity (still very new)','Zero AMC','Flat ₹10 pricing'],
    watch: ['No MTF','No API','Smaller broker — verify reliability'],
    best: ['equity'], url: 'https://sahi.co.in',
  },
  {
    id: 'fyers', name: 'Fyers', type: 'discount', rank: 5,
    tagline: 'TradingView charts built-in. Zero AMC.',
    delivery: null, deliveryLabel: '₹20 or 0.3%',
    intraday: '₹20 or 0.03%', intradayB: 20,
    futures: '₹20 or 0.03%', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 14.75, dpLabel: '₹12.5 + 18% GST',
    amc: 0, amcLabel: 'Free',
    mtfRate: 15.49, mtfLabel: '15.49% (₹1L–₹10L)',
    mtfSlabs: [['≤ ₹1,000','0%'],['₹1K–₹1L','16.49%'],['₹1L–₹10L','15.49%'],['₹10L–₹25L','14.49%'],['₹25L–₹50L','12.49%']],
    mtfBrokerage: '₹20 or 0.3%',
    callTrade: 59, squareOff: 59, paymentGw: 0, instantWithdrawal: 'Free',
    api: '₹500/mo', apiNote: 'Fyers API ₹500/mo',
    ddpi: 150, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: null, activeClientsLabel: '—',
    total50k: 173.19, brokerCharges50k: 61.95,
    pledgeUnpledge: '₹5/ISIN',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.041%/day',
    delayedPayment: '0.041% per day',
    strengths: ['TradingView charts integrated','Zero AMC','FYERS Automate','Lowest pledge charge (₹5/ISIN)'],
    watch: ['Delivery has brokerage (₹20 or 0.3%)','DDPI ₹150 (incl. GST)','Constant UI changes for trading platform','API costs ₹500/mo'],
    best: ['options','algo'], url: 'https://fyers.in',
  },
  {
    id: 'sharemarket', name: 'Share.Market', type: 'discount', rank: 6,
    tagline: 'PhonePe backed.',
    delivery: null, deliveryLabel: '₹2–₹20',
    intraday: '0.1% or ₹20', intradayB: 20,
    futures: '₹20/order', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 18.50, dpLabel: '₹18.50/ISIN incl. CDSL ₹3.25', dpHighlight: 'red',
    amc: 0, amcLabel: 'Free',
    mtfRate: null, mtfLabel: 'N/A', mtfSlabs: null, mtfBrokerage: 'N/A',
    callTrade: 50, squareOff: 50, paymentGw: 10.62, instantWithdrawal: 'N/A',
    api: 'N/A', apiNote: 'No API offered',
    ddpi: 0, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: null, activeClientsLabel: '—',
    total50k: 176.94, brokerCharges50k: 65.70,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.05%/day',
    delayedPayment: '0.05% per day',
    strengths: ['PhonePe backing','Zero AMC'],
    watch: ['No MTF','No API','Min ₹2 brokerage on delivery','Less transparency in the charges sheet','DP charge on every sell order (not per stock)'],
    best: ['beginner','equity'], url: 'https://share.market',
  },
  {
    id: 'groww', name: 'Groww', type: 'discount', rank: 7,
    tagline: '12.5M users. Easy trading app for beginners.',
    delivery: null, deliveryLabel: '₹5–₹20',
    intraday: '0.1% or ₹20', intradayB: 20,
    futures: '₹20/order', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip (free if <₹100)', dpHighlight: 'red',
    amc: 0, amcLabel: 'Free',
    mtfRate: 14.95, mtfLabel: '14.95% p.a.',
    mtfSlabs: [['All amounts','14.95% p.a.']],
    mtfBrokerage: '0.1% of order value (no cap)', mtfBrokerageHighlight: 'red',
    callTrade: 0, squareOff: 50, paymentGw: 0, instantWithdrawal: 'Free',
    api: '₹499+GST/mo', apiNote: 'Data API ₹499+GST/mo',
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: 12.5, activeClientsLabel: '12.5M',
    total50k: 178.44, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹23.60 each request',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.045%/day',
    delayedPayment: '0.05% per day',
    strengths: ['Easy to use platform','Largest user base in India (12.5M)','Best onboarding UX','MF + stocks in one app','915 trading app for F&O'],
    watch: ['Min ₹5 delivery brokerage (not zero)','DP charges on every sell along with brokerage','MTF brokerage is too high (0.1%, no cap)'],
    best: ['beginner','mf'], url: 'https://groww.in',
  },
  {
    id: 'upstox', name: 'Upstox', type: 'discount', rank: 7,
    tagline: 'Free API. Flat ₹20.',
    delivery: null, deliveryLabel: '₹20 flat',
    intraday: '₹20 or 0.1%', intradayB: 20,
    futures: '₹20 or 0.05%', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip per day on sell', dpHighlight: 'red',
    amc: 300, amcLabel: '₹300/yr (yr 1 free)',
    mtfRate: null, mtfLabel: '₹20/day per ₹40K slab',
    mtfSlabs: null,
    mtfBrokerage: '₹20/order',
    callTrade: 88.50, squareOff: 88.50, paymentGw: 8.26, instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Upstox API — free',
    ddpi: 150, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: 2.0, activeClientsLabel: '2.0M',
    total50k: 178.44, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    delayedPayment: '0.05% per day',
    strengths: ['Free API'],
    watch: ['AMC ₹300/yr after yr 1','Call & trade ₹88.50 — highest of discount','MTF interest can go up to 18% p.a.','Multiple brokerage plans for more features','DP charge per sell transaction (not per stock)'],
    best: ['algo','equity'], url: 'https://upstox.com',
  },
  {
    id: 'angelone', name: 'Angel One', type: 'discount', rank: 7,
    tagline: 'Around from 1987. Now discount. Free SmartAPI.',
    delivery: null, deliveryLabel: '₹2–₹20', deliveryHighlight: 'red',
    intraday: '0.03% or ₹20', intradayB: 20,
    futures: '₹20/order', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 20, dpLabel: '₹20/scrip per sell transaction', dpHighlight: 'red',
    amc: 283, amcLabel: '₹240+GST/yr', amcHighlight: 'red',
    mtfRate: 14.99, mtfLabel: '14.99% p.a.',
    mtfSlabs: [['All amounts','14.99% p.a. (0.0342%/day)']],
    mtfBrokerage: '0.1% or ₹20 (min ₹2)',
    callTrade: 20, squareOff: 20, paymentGw: 0, instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'SmartAPI — free',
    ddpi: 118, reactivation: 0,
    networth: 4400, networthLabel: '₹4,400 Cr', activeClients: 6.7, activeClientsLabel: '6.7M',
    total50k: 178.44, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.0342%/day (12.5% p.a.)',
    delayedPayment: '0.049% per day',
    strengths: ['Low call & trade (₹20)','Free SmartAPI','Track record since 1987','Networth ₹4,400 Cr'],
    watch: ['Brokerage on delivery','AMC ₹283/yr','Less transparent while displaying charges'],
    best: ['equity','algo'], url: 'https://angelone.in',
  },
  {
    id: 'paytm', name: 'Paytm Money', type: 'discount', rank: 10,
    tagline: 'Cheapest MTF for small amounts (7.99% up to ₹1L). Zero AMC.',
    delivery: null, deliveryLabel: '₹20/order', deliveryHighlight: 'red',
    intraday: '0.05% or ₹20', intradayB: 20,
    futures: '0.02% or ₹20', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 23.60, dpLabel: '₹20 + 18% GST',
    amc: 0, amcLabel: 'Free',
    mtfRate: 7.99, mtfLabel: '7.99% (≤₹1L)',
    mtfSlabs: [['≤ ₹1L','7.99% p.a.'],['₹1L–₹1Cr','9.99% p.a.'],['>₹1Cr','8.99% p.a.']],
    mtfBrokerage: '0.1% of trade', mtfBrokerageHighlight: 'red',
    callTrade: 100, squareOff: 59, paymentGw: 0, instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'API access free',
    ddpi: 0, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: 0.86, activeClientsLabel: '0.86M',
    total50k: 178.44, brokerCharges50k: 67.20,
    pledgeUnpledge: '₹20/transaction',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day (18% p.a.)',
    delayedPayment: '0.05% per day',
    strengths: ['Cheapest MTF (7.99% for ≤₹1L)','Zero AMC'],
    watch: ['Call & trade ₹100/order — 2nd highest','Margin shortfall 18%/yr — expensive'],
    best: ['beginner'], url: 'https://paytmmoney.com',
  },
  {
    id: 'indmoney', name: 'INDmoney', type: 'discount', rank: 11,
    tagline: 'SuperApp — Indian + US equities + MF. Zero AMC.',
    delivery: null, deliveryLabel: '₹2–₹20', deliveryHighlight: 'red',
    intraday: '0.05% or ₹20', intradayB: 20,
    futures: '₹20/order', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 21.83, dpLabel: '₹18.50/ISIN + 18% GST',
    amc: 0, amcLabel: 'Free',
    mtfRate: 14.6, mtfLabel: '14.6% p.a.',
    mtfSlabs: [['All amounts','14.6% p.a. (0.04%/day)']],
    mtfBrokerage: '0.1% or ₹20 (min ₹2)',
    callTrade: 500, squareOff: 59, paymentGw: 10, instantWithdrawal: 'Free',
    api: 'Free', apiNote: 'Trading API free · Data API free',
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: 0.68, activeClientsLabel: '0.68M',
    total50k: 180.27, brokerCharges50k: 69.03,
    pledgeUnpledge: '₹20+GST each',
    dematerialisation: '₹177/cert',
    marginShortfall: '0.05%/day',
    delayedPayment: '0.05% per day',
    strengths: ['US stocks access','Zero AMC','All investments in one app'],
    watch: ['Call & trade ₹500 — highest of all brokers','Poor customer support'],
    best: ['global'], url: 'https://indmoney.com',
  },
  {
    id: '5paisa', name: '5paisa', type: 'discount', rank: 12,
    tagline: 'IIFL Group. Flat ₹20.',
    delivery: null, deliveryLabel: '₹20 flat',
    intraday: '₹20 flat', intradayB: 20,
    futures: '₹20/order', futuresB: 20,
    options: '₹20/order', optionsB: 20,
    dp: 23.60, dpLabel: '₹20 + 18% GST', dpHighlight: 'red',
    amc: 354, amcLabel: '₹300+GST/yr',
    mtfRate: 9.50, mtfLabel: '9.5% (≤₹1L)',
    mtfSlabs: [['≤ ₹1L','9.5% p.a.'],['₹1L–₹5L','12.5% p.a.'],['₹5L–₹1Cr','15.5% p.a.']],
    mtfBrokerage: '₹20/order',
    callTrade: 23.60, squareOff: 23.60, paymentGw: 11.80, instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'API free',
    ddpi: 118, reactivation: 0,
    networth: null, networthLabel: '—', activeClients: 0.34, activeClientsLabel: '0.34M',
    total50k: 182.04, brokerCharges50k: 70.80,
    pledgeUnpledge: '₹23.60 each',
    dematerialisation: '₹236/cert',
    marginShortfall: '0.034%/day (billed weekly)',
    delayedPayment: '0.05% per day',
    strengths: ['IIFL Group backing','MTF 9.5% for ≤₹1L — competitive'],
    watch: ['Highest DP of discount brokers (₹23.60)','AMC ₹354/yr','Less transparency on charges'],
    best: ['simple'], url: 'https://5paisa.com',
  },
  {
    id: 'kotak', name: 'Kotak Securities', type: 'full', rank: 13,
    tagline: 'Kotak Bank 3-in-1.',
    delivery: null, deliveryLabel: '0.2%', deliveryHighlight: 'red',
    intraday: '₹10 or 0.05%', intradayB: 10,
    futures: '₹10/order', futuresB: 10,
    options: '₹10/lot', optionsB: 10, optionsHighlight: 'red',
    dp: 20, dpLabel: '0.04% min ₹20',
    amc: 600, amcLabel: '₹600/yr',
    mtfRate: 9.69, mtfLabel: '9.69% (Pro plan)',
    mtfSlabs: [['Trade Free plan','14.97% p.a.'],['Trade Free Pro','9.69% p.a.']],
    mtfBrokerage: '0–0.30% by plan', mtfBrokerageHighlight: 'red',
    callTrade: 57.82, squareOff: 59, paymentGw: 8.26, instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'Kotak Neo API — free',
    ddpi: 118, reactivation: 0,
    networth: 7900, networthLabel: '₹7,900 Cr', activeClients: 1.4, activeClientsLabel: '1.4M',
    total50k: 367.24, brokerCharges50k: 256,
    pledgeUnpledge: '₹20 each',
    dematerialisation: '₹295/cert',
    marginShortfall: '0.025%/day (8.99% p.a.)',
    delayedPayment: '0.0658% per day',
    strengths: ['Kotak Bank 3-in-1','Networth ₹7,900 Cr','Free Kotak Neo API'],
    watch: ['₹241 more than cheapest on ₹50K delivery','AMC ₹600/yr','High delivery brokerage (0.2%)'],
    best: ['bank_customer','fno'], url: 'https://kotaksecurities.com',
  },
  {
    id: 'icici', name: 'ICICI Direct', type: 'full', rank: 14,
    tagline: 'ICICI Bank 3-in-1. Multiple plans — lowest plan: 0.07% delivery, ₹9/lot options.',
    delivery: null, deliveryLabel: '0.07% (lowest plan)',
    intraday: 'Plan-based', intradayB: null,
    futures: '0.007% (lowest plan)', futuresB: null,
    options: '₹9/lot (lowest plan)', optionsB: 9,
    dp: 23.60, dpLabel: '₹20 + 18% GST',
    amc: 826, amcLabel: '₹826 incl. GST',
    mtfRate: 9.69, mtfLabel: '9.69% (₹4,999+ plan)',
    mtfSlabs: [['₹299/₹999 plan','17.99% p.a.'],['₹2,999 plan','16.49% p.a.'],['₹4,999/₹9,999 plan','9.69% p.a.']],
    mtfBrokerage: '0.07–0.25% by plan',
    callTrade: 50, squareOff: 59, paymentGw: 0, instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'Breeze API — free',
    ddpi: 0, reactivation: 0,
    networth: 4500, networthLabel: '₹4,500 Cr', activeClients: 2.0, activeClientsLabel: '2.0M',
    total50k: 429.84, brokerCharges50k: 318.60,
    pledgeUnpledge: '₹29.50 each',
    dematerialisation: '₹295/cert',
    marginShortfall: '0.05%/day',
    delayedPayment: '0.05%–0.07% per day (depends on plan)',
    strengths: ['ICICI Bank 3-in-1','Free Breeze API','Networth ₹4,500 Cr'],
    watch: ['₹303 more on standard comparison','AMC ₹826/yr','Base plan very expensive'],
    best: ['bank_customer'], url: 'https://icicidirect.com',
  },
  {
    id: 'axis', name: 'Axis Securities', type: 'full', rank: 15,
    tagline: 'Axis Bank subsidiary.',
    delivery: null, deliveryLabel: '0.5% min ₹25',
    intraday: '0.05% or ₹25', intradayB: null,
    futures: '0.05% of traded value', futuresB: null,
    options: '₹20/lot', optionsB: 20,
    dp: 0, dpLabel: 'Zero — unique among full-service',
    amc: 885, amcLabel: '₹885/yr (yr 2+)',
    mtfRate: 17.99, mtfLabel: '17.99% p.a.',
    mtfSlabs: [['All amounts','17.99% p.a. (0.05%/day)']],
    mtfBrokerage: '0.5% or ₹25',
    callTrade: 0, squareOff: 0, paymentGw: 0, instantWithdrawal: 'N/A',
    api: 'N/A', apiNote: 'No API',
    ddpi: null, reactivation: 0,
    networth: 1700, networthLabel: '₹1,700 Cr', activeClients: 0.41, activeClientsLabel: '0.41M',
    total50k: 701.24, brokerCharges50k: 590,
    pledgeUnpledge: '0.5%+GST min ₹29.50',
    dematerialisation: '₹295/cert',
    marginShortfall: '0.032%/day (11.7% p.a.)',
    delayedPayment: '0.049% per day',
    strengths: ['Zero DP charge — unique among full-service','Free call & trade','Axis Bank integration'],
    watch: ['₹575 more than cheapest on delivery','0.5% delivery brokerage','AMC ₹885/yr','MTF 17.99% — very expensive','No standard plan and very high charges'],
    best: ['bank_customer'], url: 'https://axisdirect.in',
  },
  {
    id: 'hdfc', name: 'HDFC Securities', type: 'full', rank: 16,
    tagline: 'HDFC Bank subsidiary. Most expensive broker in India. Options = 1% or ₹100/lot.',
    delivery: null, deliveryLabel: '0.5% min ₹25',
    intraday: '0.05% min ₹25', intradayB: null,
    futures: '0.05% min ₹25', futuresB: null,
    options: '1% or ₹100/lot', optionsB: 100,
    dp: 20, dpLabel: '0.04% min ₹20',
    amc: 885, amcLabel: '₹885/yr',
    mtfRate: 12.0, mtfLabel: '12% p.a.',
    mtfSlabs: [['All amounts','12% p.a. (~0.032%/day)']],
    mtfBrokerage: '0.32% min ₹25',
    callTrade: 0, squareOff: 0, paymentGw: 0, instantWithdrawal: 'N/A',
    api: 'Free', apiNote: 'HDFC Securities API — free',
    ddpi: 500, reactivation: 0,
    networth: 2700, networthLabel: '₹2,700 Cr', activeClients: 1.4, activeClientsLabel: '1.4M',
    total50k: 721.24, brokerCharges50k: 610,
    pledgeUnpledge: '0.04% min ₹20',
    dematerialisation: '₹354/cert',
    marginShortfall: '0.05%/day',
    delayedPayment: '0.05% per day',
    strengths: ['HDFC Bank 3-in-1','Research & advisory'],
    watch: ['Most expensive broker in India','Options 1% or ₹100/lot — very expensive','DDPI ₹500','AMC ₹885/yr','MTF brokerage 0.32% min ₹25'],
    best: ['bank_customer'], url: 'https://hdfcsec.com',
  },
]

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

const TABS = ['Rankings', 'Direct Comparison', 'Cheatsheet', 'Brokerage Calc', 'MTF Comparison', 'Market Data'];

// ── UNIVERSAL BROKERAGE CALCULATOR ───────────────────────────────────────────

const CALC_BROKERS = [
  {
    id:'zerodha', name:'Zerodha', featured:true,
    delivery:{ rate:0, type:'zero' },
    intraday:{ rate:0.0003, cap:20 },
    futures: { rate:0.0003, cap:20 },
    options: { flat:20 },
    mtf:     { rate:0.0003, cap:20 },
    dp:15.34, dpPerSell:false, amc:88.50, mtfRate:14.6,
  },
  {
    id:'dhan', name:'Dhan',
    delivery:{ rate:0, type:'zero' },
    intraday:{ rate:0.0003, cap:20 },
    futures: { rate:0.0003, cap:20 },
    options: { flat:20 },
    mtf:     { rate:0.0003, cap:20 },
    dp:14.75, dpPerSell:false, amc:0, mtfRate:12.49,
  },
  {
    id:'mstock', name:'mStock',
    delivery:{ rate:0, type:'zero' },
    intraday:{ flat:5 },
    futures: { flat:5 },
    options: { flat:5 },
    mtf:     { flat:5 },
    dp:21.24, dpPerSell:true, amc:259, mtfRate:15.0,
  },
  {
    id:'sahi', name:'Sahi',
    delivery:{ rate:0.0005, cap:10, min:null },
    intraday:{ rate:0.0005, cap:10 },
    futures: { flat:10 },
    options: { flat:10 },
    mtf:     { rate:0, type:'zero' }, // no MTF
    dp:13.50, dpPerSell:false, amc:0, mtfRate:null,
  },
  {
    id:'fyers', name:'Fyers',
    delivery:{ rate:0.003, cap:20 },
    intraday:{ rate:0.0003, cap:20 },
    futures: { rate:0.0003, cap:20 },
    options: { flat:20 },
    mtf:     { rate:0.003, cap:20 },
    dp:14.75, dpPerSell:false, amc:0, mtfRate:15.49,
  },
  {
    id:'sharemarket', name:'Share.Market',
    delivery:{ rate:0.001, cap:20, min:2 },
    intraday:{ rate:0.001, cap:20 },
    futures: { flat:20 },
    options: { flat:20 },
    mtf:     { rate:0, type:'zero' }, // no MTF
    dp:18.50, dpPerSell:true, amc:0, mtfRate:null,
  },
  {
    id:'groww', name:'Groww',
    delivery:{ rate:0.001, cap:20, min:5 },
    intraday:{ rate:0.001, cap:20, min:5 },
    futures: { flat:20 },
    options: { flat:20 },
    mtf:     { rate:0.001 }, // no cap
    dp:20, dpPerSell:true, amc:0, mtfRate:14.95, mtfNoCap:true,
  },
  {
    id:'upstox', name:'Upstox',
    delivery:{ flat:20 },
    intraday:{ rate:0.001, cap:20 },
    futures: { rate:0.0005, cap:20 },
    options: { flat:20 },
    mtf:     { flat:20 },
    dp:20, dpPerSell:true, amc:300, mtfRate:18.25, mtfSpecial:'₹20/day per ₹40K',
  },
  {
    id:'angelone', name:'Angel One',
    delivery:{ rate:null, min:2, cap:20 },
    intraday:{ rate:0.0003, cap:20 },
    futures: { flat:20 },
    options: { flat:20 },
    mtf:     { rate:0.001, cap:20, min:2 },
    dp:20, dpPerSell:true, amc:283, mtfRate:14.99,
  },
  {
    id:'paytm', name:'Paytm Money',
    delivery:{ flat:20 },
    intraday:{ rate:0.0005, cap:20 },
    futures: { rate:0.0002, cap:20 },
    options: { flat:20 },
    mtf:     { rate:0.001, cap:20 },
    dp:23.60, dpPerSell:false, amc:0, mtfRate:7.99,
  },
  {
    id:'indmoney', name:'INDmoney',
    delivery:{ rate:null, min:2, cap:20 },
    intraday:{ rate:0.0005, cap:20 },
    futures: { flat:20 },
    options: { flat:20 },
    mtf:     { rate:0.001, cap:20, min:2 },
    dp:21.83, dpPerSell:false, amc:0, mtfRate:14.6,
  },
  {
    id:'5paisa', name:'5paisa',
    delivery:{ flat:20 },
    intraday:{ flat:20 },
    futures: { flat:20 },
    options: { flat:20 },
    mtf:     { flat:20 },
    dp:23.60, dpPerSell:false, amc:354, mtfRate:9.5,
  },
  {
    id:'kotak', name:'Kotak Securities',
    delivery:{ rate:0.002 },
    intraday:{ rate:0.0005, cap:10 },
    futures: { flat:10 },
    options: { flat:10 },
    mtf:     { rate:0.002 },
    dp:20, dpPerSell:false, amc:600, mtfRate:14.97,
  },
  {
    id:'icici', name:'ICICI Direct',
    delivery:{ rate:0.0007 },
    intraday:{ rate:0.0007, cap:20 },
    futures: { rate:0.00007 },
    options: { flat:9 },
    mtf:     { rate:0.0007 },
    dp:23.60, dpPerSell:false, amc:826, mtfRate:9.69,
  },
  {
    id:'axis', name:'Axis Securities',
    delivery:{ rate:0.005, min:25 },
    intraday:{ rate:0.0005, min:25 },
    futures: { rate:0.0005 },
    options: { flat:20 },
    mtf:     { rate:0.005, min:25 },
    dp:0, dpPerSell:false, amc:885, mtfRate:17.99,
  },
  {
    id:'hdfc', name:'HDFC Securities',
    delivery:{ rate:0.005, min:25 },
    intraday:{ rate:0.0005, min:25 },
    futures: { rate:0.0005, min:25 },
    options: { flat:100 },
    mtf:     { rate:0.0032, min:25 },
    dp:20, dpPerSell:false, amc:885, mtfRate:12.0,
  },
];

function calcBrokerage(scheme, tradeValue) {
  if (!scheme) return 0;
  if (scheme.type === 'zero') return 0;
  if (scheme.flat) return scheme.flat * 2; // buy + sell
  if (scheme.rate) {
    let b = tradeValue * scheme.rate;
    if (scheme.cap) b = Math.min(b, scheme.cap);
    if (scheme.min) b = Math.max(b, scheme.min);
    return b * 2;
  }
  // delivery-style (min ₹2, cap ₹20)
  let b = Math.max(scheme.min || 0, Math.min(scheme.cap || Infinity, tradeValue * 0.001));
  return b * 2;
}

function calcFullCharges(broker, segment, buyPrice, sellPrice, qty) {
  const buyVal  = buyPrice * qty;
  const sellVal = sellPrice * qty;
  const tv      = buyVal; // use buy value as trade value base

  // Brokerage
  let brokerage = 0;
  const scheme  = broker[segment];
  if (scheme) {
    if (scheme.type === 'zero') brokerage = 0;
    else if (scheme.flat) brokerage = scheme.flat * 2;
    else if (scheme.rate !== null && scheme.rate !== undefined) {
      let b = tv * scheme.rate;
      if (scheme.cap) b = Math.min(b, scheme.cap);
      if (scheme.min) b = Math.max(b, scheme.min);
      brokerage = b * 2;
    } else {
      let b = Math.max(scheme.min || 0, Math.min(scheme.cap || Infinity, tv * 0.001));
      brokerage = b * 2;
    }
  }

  // Govt charges
  let stt = 0, stamp = 0;
  if (segment === 'delivery') {
    stt   = buyVal * 0.001 + sellVal * 0.001;
    stamp = buyVal * 0.00015;
  } else if (segment === 'intraday') {
    stt   = sellVal * 0.00025;
    stamp = buyVal * 0.00003;
  } else if (segment === 'futures') {
    stt   = sellVal * 0.0002;
    stamp = buyVal * 0.00002;
  } else if (segment === 'options') {
    stt   = sellVal * 0.001;
    stamp = buyVal * 0.00003;
  } else if (segment === 'mtf') {
    stt   = buyVal * 0.001 + sellVal * 0.001;
    stamp = buyVal * 0.00015;
  }

  const turnover  = buyVal + sellVal;
  const txn       = turnover * 0.0000297;
  const sebi      = turnover / 10000000 * 10;
  const gst       = (brokerage + txn + sebi) * 0.18;
  const dp        = (segment === 'delivery' || segment === 'mtf') ? broker.dp : 0;
  const totalGovt = stt + txn + sebi + stamp;
  const total     = brokerage + gst + totalGovt + dp;
  const grossPnl  = (sellPrice - buyPrice) * qty;
  const netPnl    = grossPnl - total;

  return { brokerage, stt, txn, sebi, stamp, gst, dp, totalGovt, total, grossPnl, netPnl };
}

function UniversalCalc() {
  const [segment,  setSegment]   = useState('delivery');
  const [buyPrice, setBuyPrice]  = useState('');
  const [sellPrice,setSellPrice] = useState('');
  const [qty,      setQty]       = useState('');
  const [lotSize,  setLotSize]   = useState('');
  const [lots,     setLots]      = useState('');
  const [mtfAmt,   setMtfAmt]    = useState('');
  const [mtfDays,  setMtfDays]   = useState('30');
  const [selectedId, setSelectedId] = useState(null);

  const isFno = segment==='futures'||segment==='options';
  const isMtf = segment==='mtf';

  const effQty = isFno ? (parseFloat(lotSize)||0)*(parseFloat(lots)||0) : parseFloat(qty)||0;
  const bp = parseFloat(buyPrice)||0;
  const sp = parseFloat(sellPrice)||0;
  const hasInputs = bp>0 && sp>0 && effQty>0;

  const results = hasInputs
    ? CALC_BROKERS.map(b=>({broker:b,...calcFullCharges(b,segment,bp,sp,effQty)}))
        .sort((a,b)=>a.total-b.total)
    : [];

  const selected = results.find(r=>r.broker.id===selectedId) || results[0] || null;
  const buyVal = bp*effQty;

  const SEGS = [
    ['delivery','Equity Delivery'],['intraday','Equity Intraday'],
    ['futures','F&O Futures'],['options','F&O Options'],['mtf','MTF'],
  ];
  const segLabel = SEGS.find(s=>s[0]===segment)?.[1]||segment;

  return (
    <div className="ucalc-wrap">
      {/* Header */}
      <div className="ucalc-header">
        <div className="ucalc-title">Brokerage Calculator</div>
        <div className="ucalc-sub">Enter trade details — see exact charges at every broker, instantly. Click any broker for full breakdown.</div>
      </div>

      {/* Segment */}
      <div className="ucalc-segs">
        {SEGS.map(([v,l])=>(
          <button key={v} className={`ucalc-seg${segment===v?' ucalc-seg-active':''}`}
            onClick={()=>{setSegment(v);setSelectedId(null);}}>
            {l}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="ucalc-inputs">
        {!isMtf&&<>
          <div className="ucalc-field">
            <label className="ucalc-label">BUY PRICE (₹)</label>
            <input className="ucalc-input" type="number" min="0" placeholder="0.00" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)}/>
          </div>
          <div className="ucalc-field">
            <label className="ucalc-label">SELL PRICE (₹)</label>
            <input className="ucalc-input" type="number" min="0" placeholder="0.00" value={sellPrice} onChange={e=>setSellPrice(e.target.value)}/>
          </div>
          {isFno?<>
            <div className="ucalc-field">
              <label className="ucalc-label">LOT SIZE</label>
              <input className="ucalc-input" type="number" min="1" placeholder="50" value={lotSize} onChange={e=>setLotSize(e.target.value)}/>
            </div>
            <div className="ucalc-field">
              <label className="ucalc-label">NO. OF LOTS</label>
              <input className="ucalc-input" type="number" min="1" placeholder="1" value={lots} onChange={e=>setLots(e.target.value)}/>
            </div>
          </>:<>
            <div className="ucalc-field">
              <label className="ucalc-label">QUANTITY</label>
              <input className="ucalc-input" type="number" min="1" placeholder="100" value={qty} onChange={e=>setQty(e.target.value)}/>
            </div>
          </>}
          {hasInputs&&<div className="ucalc-summary">
            <div className="ucalc-summary-item"><span className="ucalc-sl">Trade value</span><span className="ucalc-sv">₹{fmt(buyVal,2)}</span></div>
            <div className="ucalc-summary-item"><span className="ucalc-sl">Gross P&L</span><span className={`ucalc-sv ${sp>bp?'ucalc-gain':sp<bp?'ucalc-loss':''}`}>₹{fmt((sp-bp)*effQty,2)}</span></div>
          </div>}
        </>}
        {isMtf&&<>
          <div className="ucalc-field">
            <label className="ucalc-label">MTF AMOUNT (₹)</label>
            <input className="ucalc-input" type="number" min="0" placeholder="100000" value={mtfAmt} onChange={e=>setMtfAmt(e.target.value)}/>
          </div>
          <div className="ucalc-field">
            <label className="ucalc-label">HOLDING DAYS</label>
            <input className="ucalc-input" type="number" min="1" placeholder="30" value={mtfDays} onChange={e=>setMtfDays(e.target.value)}/>
          </div>
        </>}
      </div>

      {/* MTF table */}
      {isMtf&&parseFloat(mtfAmt)>0&&(()=>{
        const amt=parseFloat(mtfAmt)||0, days=parseFloat(mtfDays)||30;
        const mtfBrokers=[
          {id:'paytm',   name:'Paytm Money',     rate:7.99,  brk:0.001,  brkCap:20},
          {id:'5paisa',  name:'5paisa',           rate:9.5,   brkFlat:20},
          {id:'icici',   name:'ICICI Direct',     rate:9.69,  brk:0.0007},
          {id:'hdfc',    name:'HDFC Securities',  rate:12.0,  brk:0.0032, brkMin:25},
          {id:'dhan',    name:'Dhan',             rate:12.49, brk:0.0003, brkCap:20},
          {id:'zerodha', name:'Zerodha',          rate:14.6,  brk:0.003,  brkCap:20, featured:true},
          {id:'indmoney',name:'INDmoney',         rate:14.6,  brk:0.001,  brkCap:20},
          {id:'groww',   name:'Groww',            rate:14.95, brk:0.001,  noCap:true},
          {id:'kotak',   name:'Kotak Securities', rate:14.97, brk:0.002},
          {id:'angelone',name:'Angel One',        rate:14.99, brk:0.001,  brkCap:20, brkMin:2},
          {id:'mstock',  name:'mStock',           rate:15.0,  brkFlat:5},
          {id:'fyers',   name:'Fyers',            rate:15.49, brk:0.003,  brkCap:20},
          {id:'axis',    name:'Axis Securities',  rate:17.99, brk:0.005,  brkMin:25},
          {id:'upstox',  name:'Upstox',           special:'₹20/day per ₹40K', brkFlat:20},
        ].map(b=>{
          let interest=0;
          if(b.special){interest=Math.ceil(amt/40000)*20*days;}
          else if(b.rate){interest=amt*(b.rate/100)/365*days;}
          let brkAmt=0;
          if(b.brkFlat){brkAmt=b.brkFlat*2;}
          else if(b.brk){
            brkAmt=amt*b.brk*2;
            if(b.brkCap)brkAmt=Math.min(brkAmt,b.brkCap*2);
            if(b.brkMin)brkAmt=Math.max(brkAmt,b.brkMin*2);
            if(b.noCap)brkAmt=amt*b.brk*2;
          }
          return {...b,interest,brkAmt,total:interest+brkAmt};
        }).sort((a,b)=>a.total-b.total);

        return(
          <div className="ucalc-mtf-panel">
            <div className="ucalc-results-title">MTF Cost — ₹{fmt(amt,0)} for {days} days</div>
            <div className="ucalc-rank-table">
              <div className="ucalc-rank-th" style={{gridTemplateColumns:'28px 1fr 100px 120px 130px 110px'}}>
                <span>#</span><span>BROKER</span><span>RATE P.A.</span><span>INTEREST ({days}d)</span><span>MTF BROKERAGE</span><span>TOTAL COST</span>
              </div>
              {mtfBrokers.map((b,i)=>(
                <div key={b.id} className={`ucalc-rank-row${i===0?' ucalc-best':''}`} style={{gridTemplateColumns:'28px 1fr 100px 120px 130px 110px'}}>
                  <span className="ucalc-rank-num">{i+1}</span>
                  <span className="ucalc-rank-name">
                    {b.featured&&<span className="ucalc-star">★ </span>}{b.name}
                    {b.noCap&&<span className="ucalc-warn-tag">NO CAP</span>}
                  </span>
                  <span className={b.rate&&b.rate<=10?'ucalc-gain':b.rate&&b.rate>=17?'ucalc-loss':''}>{b.special||((b.rate||0)+'%')}</span>
                  <span>₹{fmt(b.interest,2)}</span>
                  <span className={b.noCap?'ucalc-loss':''}>₹{fmt(b.brkAmt,2)}</span>
                  <span className={i===0?'ucalc-gain':i>=mtfBrokers.length-2?'ucalc-loss':''}>₹{fmt(b.total,2)}</span>
                </div>
              ))}
            </div>
            <div className="ucalc-dp-note">
              <span className="ucalc-warn-tag">NO CAP</span> Groww MTF brokerage has no cap — 0.1% of full position per trade. On large positions this is significantly more than flat-₹20 brokers.
            </div>
          </div>
        );
      })()}

      {/* Main two-panel body */}
      {hasInputs&&results.length>0&&!isMtf&&(
        <div className="ucalc-body">

          {/* LEFT: ranked list */}
          <div className="ucalc-list-panel">
            <div className="ucalc-list-hdr">
              <span>#</span><span>BROKER</span>
              <span>TOTAL CHARGES</span><span>NET P&L</span>
            </div>
            {results.map((r,i)=>{
              const isSel = selected&&selected.broker.id===r.broker.id;
              return(
                <div key={r.broker.id}
                  className={`ucalc-list-row${i===0?' ucalc-list-winner':''}${isSel?' ucalc-list-sel':''}`}
                  onClick={()=>setSelectedId(r.broker.id)}>
                  <span className="ucalc-list-rank">{i+1}</span>
                  <span className="ucalc-list-name">
                    {r.broker.featured&&<span className="ucalc-star">★ </span>}
                    {r.broker.name}
                    {r.broker.dpPerSell&&(segment==='delivery'||segment==='intraday')&&
                      <span className="ucalc-dp-warn">DP/sell</span>}
                  </span>
                  <span className={`ucalc-list-charges${i===0?' ucalc-gain':i===results.length-1?' ucalc-loss':''}`}>
                    ₹{fmt(r.total,2)}
                  </span>
                  <span className={`ucalc-list-pnl${r.netPnl>0?' ucalc-gain':r.netPnl<0?' ucalc-loss':''}`}>
                    ₹{fmt(r.netPnl,2)}
                  </span>
                </div>
              );
            })}
            <div className="ucalc-list-note">
              <span className="ucalc-dp-warn">DP/sell</span> = DP charged on <strong>every sell transaction</strong> (not per stock held). Bad practice — highlighted in red.
            </div>
          </div>

          {/* RIGHT: deep breakdown */}
          {selected&&(
            <div className="ucalc-detail-panel">
              <div className="ucalc-detail-hdr">
                {selected.broker.featured&&<span className="ucalc-star">★</span>}
                {selected.broker.name}
                <span className="ucalc-detail-seg">{segLabel}</span>
              </div>

              {selected.broker.dpPerSell&&(segment==='delivery'||segment==='intraday')&&(
                <div className="ucalc-dp-alert">
                  <strong>⚠ Bad practice:</strong> {selected.broker.name} charges DP on <strong>every sell transaction</strong>, not per stock held. Selling 5 stocks = 5× DP charge.
                </div>
              )}

              <div className="ucalc-breakdown">
                <div className="ucalc-bk-section">TRADE SUMMARY</div>
                <div className="ucalc-bk-row"><span>Buy value</span><span>₹{fmt(bp*effQty,2)}</span></div>
                <div className="ucalc-bk-row"><span>Sell value</span><span>₹{fmt(sp*effQty,2)}</span></div>
                <div className="ucalc-bk-row ucalc-bk-gross">
                  <span>Gross P&L</span>
                  <span className={selected.grossPnl>0?'ucalc-gain':selected.grossPnl<0?'ucalc-loss':''}>
                    ₹{fmt(selected.grossPnl,2)}
                  </span>
                </div>

                <div className="ucalc-bk-section">CHARGES</div>
                <div className="ucalc-bk-row">
                  <span>Brokerage</span>
                  <span className={selected.brokerage===0?'ucalc-gain':'ucalc-loss'}>
                    {selected.brokerage===0?'Zero':'₹'+fmt(selected.brokerage,2)}
                  </span>
                </div>
                <div className="ucalc-bk-row ucalc-bk-sub"><span>STT</span><span>₹{fmt(selected.stt,2)}</span></div>
                <div className="ucalc-bk-row ucalc-bk-sub"><span>Exchange txn fee</span><span>₹{fmt(selected.txn,2)}</span></div>
                <div className="ucalc-bk-row ucalc-bk-sub"><span>SEBI charges</span><span>₹{fmt(selected.sebi,2)}</span></div>
                <div className="ucalc-bk-row ucalc-bk-sub"><span>Stamp duty</span><span>₹{fmt(selected.stamp,2)}</span></div>
                <div className="ucalc-bk-row ucalc-bk-sub"><span>GST (18%)</span><span>₹{fmt(selected.gst,2)}</span></div>
                {(segment==='delivery'||segment==='mtf')&&(
                  <div className={`ucalc-bk-row ucalc-bk-sub${selected.broker.dpPerSell?' ucalc-bk-warn':''}`}>
                    <span>DP charge{selected.broker.dpPerSell&&' ⚠'}</span>
                    <span className={selected.broker.dpPerSell?'ucalc-loss':''}>₹{fmt(selected.dp,2)}</span>
                  </div>
                )}
                <div className="ucalc-bk-row ucalc-bk-total">
                  <span>Total charges</span>
                  <span className="ucalc-loss">₹{fmt(selected.total,2)}</span>
                </div>

                <div className="ucalc-net-box">
                  <div className="ucalc-net-label">NET P&L</div>
                  <div className={`ucalc-net-val${selected.netPnl>0?' ucalc-gain':selected.netPnl<0?' ucalc-loss':''}`}>
                    ₹{fmt(selected.netPnl,2)}
                  </div>
                  <div className="ucalc-net-eq">
                    ₹{fmt(selected.grossPnl,2)} gross − ₹{fmt(selected.total,2)} charges
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasInputs&&!isMtf&&(
        <div className="ucalc-empty">Enter buy price, sell price and {isFno?'lot details':'quantity'} above to see charges across all 16 brokers instantly.</div>
      )}
    </div>
  );
}



// ── CHEATSHEET COMPONENT ──────────────────────────────────────────────────────

const CS_BROKERS = ['Dhan','Zerodha','Groww','Angel One','Upstox','Kotak Securities','HDFC Securities'];

const CS_SECTIONS = [
  { id:'verdict',   label:'Quick verdict',        num:'00' },
  { id:'annual',    label:'Annual cost',           num:'01' },
  { id:'delivery',  label:'Delivery brokerage',    num:'02' },
  { id:'intraday',  label:'Intraday brokerage',    num:'03' },
  { id:'fno',       label:'F&O brokerage',         num:'04' },
  { id:'dp',        label:'DP charge',             num:'05' },
  { id:'amc',       label:'AMC',                   num:'06' },
  { id:'mtf',       label:'MTF interest & brokerage', num:'07' },
  { id:'regulatory',label:'Regulatory charges',    num:'08' },
];

// All data verified from comparebroker.info screenshots
const CS_DATA = {
  // Annual cost by profile
  annual: {
    longterm: {
      label: 'Long-term investor',
      sub: '5 delivery trades/mo, no intraday or F&O',
      cols: ['BROKER','BROKERAGE','DP','AMC','REGULATORY','TOTAL/YEAR'],
      rows: [
        { name:'Dhan',             brokerage:0,      dp:354,  amc:0,   reg:6691, total:7045,    cheapest:true  },
        { name:'Zerodha',          brokerage:0,      dp:368,  amc:89,  reg:6691, total:7148,    cheapest:true  },
        { name:'Groww',            brokerage:2832,   dp:480,  amc:0,   reg:6691, total:10003,   cheapest:false },
        { name:'Angel One',        brokerage:2832,   dp:480,  amc:283, reg:6691, total:10286,   cheapest:false },
        { name:'Upstox',           brokerage:2832,   dp:480,  amc:300, reg:6691, total:10303,   cheapest:false },
        { name:'Kotak Securities', brokerage:14160,  dp:480,  amc:600, reg:6691, total:21931,   cheapest:false },
        { name:'HDFC Securities',  brokerage:35400,  dp:480,  amc:885, reg:6691, total:43456,   cheapest:false },
      ],
      gap: 36411,
    },
    active: {
      label: 'Active trader',
      sub: '3 delivery + 30 intraday trades/mo',
      cols: ['BROKER','BROKERAGE','DP','AMC','REGULATORY','TOTAL/YEAR'],
      rows: [
        { name:'Dhan',             brokerage:6372,  dp:885,  amc:0,   reg:7257, total:14514,   cheapest:true  },
        { name:'Zerodha',          brokerage:6372,  dp:920,  amc:89,  reg:7257, total:14638,   cheapest:true  },
        { name:'Angel One',        brokerage:8071,  dp:1200, amc:283, reg:7257, total:16811,   cheapest:false },
        { name:'Kotak Securities', brokerage:16992, dp:1200, amc:600, reg:7257, total:26049,   cheapest:false },
        { name:'Groww',            brokerage:18691, dp:1200, amc:0,   reg:7257, total:27148,   cheapest:false },
        { name:'Upstox',           brokerage:18691, dp:1200, amc:300, reg:7257, total:27448,   cheapest:false },
        { name:'HDFC Securities',  brokerage:42480, dp:1200, amc:885, reg:7257, total:51822,   cheapest:false },
      ],
      gap: 37308,
    },
    fno: {
      label: 'F&O trader',
      sub: '50 options + 10 futures trades/mo',
      cols: ['BROKER','BROKERAGE','DP','AMC','REGULATORY','TOTAL/YEAR'],
      rows: [
        { name:'Kotak Securities', brokerage:16992,  dp:0, amc:600, reg:82825, total:100417,  cheapest:true  },
        { name:'Groww',            brokerage:33984,  dp:0, amc:0,   reg:82825, total:116809,  cheapest:false },
        { name:'Dhan',             brokerage:33984,  dp:0, amc:0,   reg:82825, total:116809,  cheapest:false },
        { name:'Zerodha',          brokerage:33984,  dp:0, amc:89,  reg:82825, total:116898,  cheapest:false },
        { name:'Angel One',        brokerage:33984,  dp:0, amc:283, reg:82825, total:117092,  cheapest:false },
        { name:'Upstox',           brokerage:33984,  dp:0, amc:300, reg:82825, total:117109,  cheapest:false },
        { name:'HDFC Securities',  brokerage:177000, dp:0, amc:885, reg:82825, total:260710,  cheapest:false },
      ],
      gap: 160293,
    },
  },

  // Delivery brokerage — ₹50K trade
  delivery: {
    sub: 'How much does a ₹50,000 delivery trade actually cost?',
    explain: 'The fee your broker charges every time you buy or sell shares held overnight. Some brokers charge zero, others charge a percentage or flat fee. This is the single biggest variable cost for long-term investors.',
    cols: ['BROKER','RATE','BROKERAGE + GST','TOTAL TRADE COST'],
    rows: [
      { name:'Zerodha',          rate:'Zero brokerage',  brk:0,      total:126.85, cheapest:true  },
      { name:'Dhan',             rate:'Zero brokerage',  brk:0,      total:126.26, cheapest:false },
      { name:'Groww',            rate:'₹5–₹20',          brk:47.20,  total:178.71, cheapest:false },
      { name:'Angel One',        rate:'₹2–₹20',          brk:47.20,  total:178.71, cheapest:false },
      { name:'Upstox',           rate:'₹20 flat',        brk:47.20,  total:178.71, cheapest:false },
      { name:'Kotak Securities', rate:'0.2%',            brk:236.00, total:367.51, cheapest:false },
      { name:'HDFC Securities',  rate:'0.5% min ₹25',   brk:590.00, total:721.51, cheapest:false },
    ],
    insight: 'Zerodha charges zero delivery brokerage. At HDFC Securities, the same ₹50K trade costs ₹590.00 more. Over 50 trades/year: ₹29,500.00 extra.',
  },

  // Intraday — ₹25K round trip
  intraday: {
    sub: 'What does a ₹25,000 intraday round trip cost?',
    explain: 'The fee on same-day buy-and-sell trades. Brokers charge a percentage (0.03%–0.1%) capped at ₹10–₹20 per order. The cap means large trades cost the same as medium ones.',
    cols: ['BROKER','RATE','BROKERAGE + GST','100 TRADES/MO × 12'],
    rows: [
      { name:'Zerodha',          rate:'0.03% or ₹20',   brk:17.70, annual:21240,  cheapest:true  },
      { name:'Dhan',             rate:'0.03% or ₹20',   brk:17.70, annual:21240,  cheapest:false },
      { name:'Angel One',        rate:'0.03% or ₹20',   brk:17.70, annual:21240,  cheapest:false },
      { name:'Kotak Securities', rate:'0.05% or ₹10',   brk:23.60, annual:28320,  cheapest:false },
      { name:'Groww',            rate:'₹5–₹20',         brk:47.20, annual:56640,  cheapest:false },
      { name:'Upstox',           rate:'0.1% or ₹20',    brk:47.20, annual:56640,  cheapest:false },
      { name:'HDFC Securities',  rate:'0.05% min ₹25',  brk:59.00, annual:70800,  cheapest:false },
    ],
    insight: 'For active traders doing 100 trades/month, annual brokerage difference: ₹49,560.00. On trades below ~₹67K, the percentage rate matters more than the cap.',
  },

  // F&O brokerage
  fno: {
    sub: 'Futures vs options — who charges what?',
    explain: 'Futures brokerage works like intraday — a percentage capped at a flat fee. Options brokerage is almost always a flat fee per order regardless of lot size or premium.',
    futures: {
      label: 'Futures brokerage',
      sub: '₹5L lot value, round trip',
      cols: ['BROKER','RATE','BROKERAGE + GST'],
      rows: [
        { name:'Kotak Securities', rate:'₹10 flat',        brk:23.60,  cheapest:true  },
        { name:'Zerodha',          rate:'0.03% or ₹20',   brk:47.20,  cheapest:false },
        { name:'Groww',            rate:'₹20 flat',        brk:47.20,  cheapest:false },
        { name:'Dhan',             rate:'0.03% or ₹20',   brk:47.20,  cheapest:false },
        { name:'Angel One',        rate:'₹20 flat',        brk:47.20,  cheapest:false },
        { name:'Upstox',           rate:'0.05% or ₹20',   brk:47.20,  cheapest:false },
        { name:'HDFC Securities',  rate:'0.05% min ₹25',  brk:295.00, cheapest:false },
      ],
    },
    options: {
      label: 'Options brokerage',
      sub: 'Flat per order, round trip',
      cols: ['BROKER','RATE','BROKERAGE + GST','50 TRADES/MO × 12'],
      rows: [
        { name:'Kotak Securities', rate:'₹10 flat',  brk:23.60,  annual:14160,  cheapest:true  },
        { name:'Zerodha',          rate:'₹20 flat',  brk:47.20,  annual:28320,  cheapest:false },
        { name:'Groww',            rate:'₹20 flat',  brk:47.20,  annual:28320,  cheapest:false },
        { name:'Dhan',             rate:'₹20 flat',  brk:47.20,  annual:28320,  cheapest:false },
        { name:'Angel One',        rate:'₹20 flat',  brk:47.20,  annual:28320,  cheapest:false },
        { name:'Upstox',           rate:'₹20 flat',  brk:47.20,  annual:28320,  cheapest:false },
        { name:'HDFC Securities',  rate:'₹100 min',  brk:236.00, annual:141600, cheapest:false },
      ],
    },
  },

  // DP charge
  dp: {
    sub: 'The cost of selling your stocks',
    explain: 'Charged every time you sell delivery shares — per scrip per day. Sell 4 different stocks in one day = 4× the DP charge. Each broker marks up the CDSL/NSDL fee differently.',
    cols: ['BROKER','PER SELL','10 SELLS/MO','ANNUAL (10/MO)'],
    rows: [
      { name:'Dhan',             perSell:14.75, ten:147.50, annual:1770, cheapest:true  },
      { name:'Zerodha',          perSell:15.34, ten:153.40, annual:1841, cheapest:false },
      { name:'Groww',            perSell:20.00, ten:200.00, annual:2400, cheapest:false },
      { name:'Angel One',        perSell:20.00, ten:200.00, annual:2400, cheapest:false },
      { name:'Kotak Securities', perSell:20.00, ten:200.00, annual:2400, cheapest:false },
      { name:'HDFC Securities',  perSell:20.00, ten:200.00, annual:2400, cheapest:false },
      { name:'Upstox',           perSell:20.00, ten:200.00, annual:2400, cheapest:false },
    ],
    insight: 'DP charge gap: ₹5.25/sell. For active delivery sellers (10 sells/mo), that\'s ₹630/year difference.',
  },

  // AMC
  amc: {
    sub: 'What your broker charges for doing nothing',
    explain: 'Annual Maintenance Charge for your demat account — billed yearly regardless of trading. For low-frequency investors, this can be the single largest cost.',
    cols: ['BROKER','ANNUAL COST','MONTHLY EQUIV.'],
    rows: [
      { name:'Groww',            annual:0,    monthly:null, free:true,  cheapest:true  },
      { name:'Dhan',             annual:0,    monthly:null, free:true,  cheapest:true  },
      { name:'Zerodha',          annual:88.50,monthly:7.38, free:false, cheapest:false },
      { name:'Angel One',        annual:283,  monthly:23.58,free:false, cheapest:false },
      { name:'Upstox',           annual:300,  monthly:25.00,free:false, cheapest:false },
      { name:'Kotak Securities', annual:600,  monthly:50.00,free:false, cheapest:false },
      { name:'HDFC Securities',  annual:885,  monthly:73.75,free:false, cheapest:false },
    ],
    insight: '2 of 7 brokers charge zero AMC. If you barely trade, AMC is the one charge that hits you no matter what.',
  },

  // MTF
  mtf: {
    sub: 'What does borrowing ₹1 lakh for 30 days cost?',
    explain: 'Margin Trading Facility — buy stocks with borrowed money. Two costs: (1) interest on borrowed amount (12%–18%+ p.a., compounded daily), (2) MTF brokerage per order (often higher than regular brokerage).',
    cols: ['BROKER','RATE (P.A.)','30-DAY INTEREST','MTF BROKERAGE','TOTAL COST'],
    rows: [
      { name:'Dhan',             rate:12.5, interest:1026.58, brokerage:47.20,  total:1073.78, cheapest:true  },
      { name:'Zerodha',          rate:14.6, interest:1200.00, brokerage:47.20,  total:1247.20, cheapest:false },
      { name:'Angel One',        rate:15.0, interest:1232.05, brokerage:47.20,  total:1279.25, cheapest:false },
      { name:'Groww',            rate:15.8, interest:1294.52, brokerage:236.00, total:1530.52, cheapest:false },
      { name:'Upstox',           rate:18.3, interest:1500.00, brokerage:47.20,  total:1547.20, cheapest:false },
      { name:'Kotak Securities', rate:15.0, interest:1230.41, brokerage:472.00, total:1702.41, cheapest:false },
      { name:'HDFC Securities',  rate:12.0, interest:986.30,  brokerage:755.20, total:1741.50, cheapest:false },
    ],
    insight: 'On a ₹5L position held 30 days, the interest spread means a difference of ₹-201.37. MTF is expensive — only use it if you\'re confident in the trade.',
  },
};

function CsTable({ cols, rows, keys, cheapestKey }) {
  return (
    <div className="cs-table">
      <div className="cs-th" style={{gridTemplateColumns:`2fr ${cols.slice(1).map(()=>'1fr').join(' ')}`}}>
        {cols.map((c,i) => <span key={i}>{c}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:`2fr ${cols.slice(1).map(()=>'1fr').join(' ')}`}}>
          <span className="cs-td-name">
            {r.name}
            {r.cheapest && <span className="cs-cheapest-tag">CHEAPEST</span>}
          </span>
          {keys.map((k,j) => (
            <span key={j} className={`cs-td${r.cheapest&&j===keys.length-1?' cs-td-win':''}`}>
              {r[k]===null ? '—' :
               r[k]===0 && (k==='annual'||k==='brk') ? <span className="cs-green">Free</span> :
               r[k]===0 && k==='brokerage' ? <span className="cs-green">₹0</span> :
               r.free && k==='annual' ? <span className="cs-green">Free</span> :
               typeof r[k]==='number' ? '₹'+fmt(r[k],2) : r[k]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function CsInsight({ text }) {
  return <div className="cs-insight">{text}</div>;
}

function CsSectionHeader({ num, title, sub }) {
  return (
    <div className="cs-section-header">
      <span className="cs-section-num">{num}</span>
      <div>
        <div className="cs-section-title">{title}</div>
        {sub && <div className="cs-section-sub">{sub}</div>}
      </div>
    </div>
  );
}

function Cheatsheet() {
  const [activeSection, setActiveSection] = useState('verdict');
  const refs = {};
  CS_SECTIONS.forEach(s => { refs[s.id] = { current: null }; });

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById('cs-sec-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="cs-wrap">
      <div className="cs-header">
        <div className="cs-title">Every charge, every broker</div>
        <div className="cs-subtitle">8 charge categories. 3 trader profiles. The only comparison you need before picking a broker.</div>
      </div>

      {/* Nav pills */}
      <div className="cs-nav">
        {CS_SECTIONS.map(s => (
          <button key={s.id} className={`cs-nav-btn${activeSection===s.id?' cs-nav-active':''}`} onClick={() => scrollTo(s.id)}>
            <span className="cs-nav-num">{s.num}</span> {s.label}
          </button>
        ))}
      </div>

      {/* 00 Quick verdict */}
      <div id="cs-sec-verdict" className="cs-section">
        <CsSectionHeader num="00" title="Quick verdict" sub="Which broker for which trader?" />
        <div className="cs-verdict-grid">
          <div className="cs-verdict-card">
            <div className="cs-verdict-profile">LONG-TERM INVESTOR</div>
            <div className="cs-verdict-tag">NEAR-TIE</div>
            <div className="cs-verdict-row"><span className="cs-green cs-verdict-name">Dhan</span><span className="cs-green cs-verdict-cost">₹7,045/yr</span></div>
            <div className="cs-verdict-row"><span className="cs-verdict-name">Zerodha</span><span className="cs-verdict-cost">₹7,148/yr</span></div>
            <div className="cs-verdict-desc">5 delivery trades/mo, ₹50K avg</div>
          </div>
          <div className="cs-verdict-card">
            <div className="cs-verdict-profile">ACTIVE TRADER</div>
            <div className="cs-verdict-tag">NEAR-TIE</div>
            <div className="cs-verdict-row"><span className="cs-green cs-verdict-name">Dhan</span><span className="cs-green cs-verdict-cost">₹14,514/yr</span></div>
            <div className="cs-verdict-row"><span className="cs-verdict-name">Zerodha</span><span className="cs-verdict-cost">₹14,638/yr</span></div>
            <div className="cs-verdict-desc">3 delivery + 30 intraday/mo</div>
          </div>
          <div className="cs-verdict-card">
            <div className="cs-verdict-profile">F&O TRADER</div>
            <div className="cs-verdict-row cs-verdict-row-single"><span className="cs-green cs-verdict-name">Kotak Securities</span><span className="cs-green cs-verdict-cost">₹1,00,417/yr</span></div>
            <div className="cs-verdict-desc">50 options + 10 futures/mo</div>
          </div>
        </div>
        <CsInsight text="These are total costs including brokerage, GST, DP charges, AMC, and all regulatory fees (STT, exchange, SEBI, stamp duty). The cheapest broker changes depending on your trading style — there's no single 'best' broker." />
      </div>

      {/* 01 Annual cost */}
      <div id="cs-sec-annual" className="cs-section">
        <CsSectionHeader num="01" title="Total annual cost" sub="What each broker actually costs per year" />
        <p className="cs-explain"><strong>Why this matters:</strong> Comparing individual charges is misleading — a broker with ₹0 delivery brokerage but high DP charges may cost you more overall. These profiles combine every charge into one annual number.</p>

        {['longterm','active','fno'].map(key => {
          const d = CS_DATA.annual[key];
          const maxTotal = Math.max(...d.rows.map(r => r.total));
          return (
            <div key={key} className="cs-annual-block">
              <div className="cs-annual-label">{d.label} <span className="cs-annual-sub">{d.sub}</span></div>
              <div className="cs-table">
                <div className="cs-th" style={{gridTemplateColumns:'2fr 1fr 0.7fr 0.7fr 1fr 1.2fr'}}>
                  {d.cols.map((c,i)=><span key={i}>{c}</span>)}
                </div>
                {d.rows.map((r,i) => (
                  <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:'2fr 1fr 0.7fr 0.7fr 1fr 1.2fr'}}>
                    <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
                    <span className="cs-td">{r.brokerage===0?<span className="cs-green">₹0</span>:'₹'+fmt(r.brokerage,0)}</span>
                    <span className="cs-td">₹{fmt(r.dp,0)}</span>
                    <span className="cs-td">{r.amc===0?<span className="cs-green">Free</span>:'₹'+fmt(r.amc,0)}</span>
                    <span className="cs-td cs-muted">₹{fmt(r.reg,0)}</span>
                    <span className={`cs-td cs-td-total${r.cheapest?' cs-green':''}`}>₹{fmt(r.total,0)}</span>
                  </div>
                ))}
              </div>
              <div className="cs-gap-note">Gap between cheapest and costliest: <strong>₹{fmt(d.gap,0)}/year</strong></div>
            </div>
          );
        })}
      </div>

      {/* 02 Delivery */}
      <div id="cs-sec-delivery" className="cs-section">
        <CsSectionHeader num="02" title="Delivery brokerage" sub="How much does a ₹50,000 delivery trade actually cost?" />
        <p className="cs-explain"><strong>What is it?</strong> {CS_DATA.delivery.explain}</p>
        <div className="cs-table">
          <div className="cs-th" style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr'}}>
            {CS_DATA.delivery.cols.map((c,i)=><span key={i}>{c}</span>)}
          </div>
          {CS_DATA.delivery.rows.map((r,i)=>(
            <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr'}}>
              <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
              <span className="cs-td cs-muted">{r.rate}</span>
              <span className={`cs-td${r.brk===0?' cs-green':''}`}>{r.brk===0?'₹0.00':'₹'+fmt(r.brk,2)}</span>
              <span className={`cs-td${r.cheapest?' cs-green':''}`}>₹{fmt(r.total,2)}</span>
            </div>
          ))}
        </div>
        <CsInsight text={CS_DATA.delivery.insight} />
      </div>

      {/* 03 Intraday */}
      <div id="cs-sec-intraday" className="cs-section">
        <CsSectionHeader num="03" title="Intraday brokerage" sub="What does a ₹25,000 intraday round trip cost?" />
        <p className="cs-explain"><strong>What is it?</strong> {CS_DATA.intraday.explain}</p>
        <div className="cs-table">
          <div className="cs-th" style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr'}}>
            {CS_DATA.intraday.cols.map((c,i)=><span key={i}>{c}</span>)}
          </div>
          {CS_DATA.intraday.rows.map((r,i)=>(
            <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:'2fr 1.2fr 1fr 1fr'}}>
              <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
              <span className="cs-td cs-muted">{r.rate}</span>
              <span className={`cs-td${r.cheapest?' cs-green':''}`}>₹{fmt(r.brk,2)}</span>
              <span className="cs-td">₹{fmt(r.annual,0)}</span>
            </div>
          ))}
        </div>
        <CsInsight text={CS_DATA.intraday.insight} />
      </div>

      {/* 04 F&O */}
      <div id="cs-sec-fno" className="cs-section">
        <CsSectionHeader num="04" title="F&O brokerage" sub="Futures vs options — who charges what?" />
        <p className="cs-explain"><strong>What is it?</strong> {CS_DATA.fno.explain}</p>
        {['futures','options'].map(key => {
          const d = CS_DATA.fno[key];
          const hasFourCols = key==='options';
          const cols = hasFourCols ? '2fr 1fr 1fr 1fr' : '2fr 1.2fr 1fr';
          return (
            <div key={key} className="cs-annual-block">
              <div className="cs-annual-label">{d.label} <span className="cs-annual-sub">{d.sub}</span></div>
              <div className="cs-table">
                <div className="cs-th" style={{gridTemplateColumns:cols}}>
                  {d.cols.map((c,i)=><span key={i}>{c}</span>)}
                </div>
                {d.rows.map((r,i)=>(
                  <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:cols}}>
                    <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
                    <span className="cs-td cs-muted">{r.rate}</span>
                    <span className={`cs-td${r.cheapest?' cs-green':''}`}>₹{fmt(r.brk,2)}</span>
                    {hasFourCols && <span className="cs-td">₹{fmt(r.annual,0)}</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 05 DP charge */}
      <div id="cs-sec-dp" className="cs-section">
        <CsSectionHeader num="05" title="DP charge" sub="The cost of selling your stocks" />
        <p className="cs-explain"><strong>What is it?</strong> {CS_DATA.dp.explain}</p>
        <div className="cs-table">
          <div className="cs-th" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
            {CS_DATA.dp.cols.map((c,i)=><span key={i}>{c}</span>)}
          </div>
          {CS_DATA.dp.rows.map((r,i)=>(
            <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:'2fr 1fr 1fr 1fr'}}>
              <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
              <span className={`cs-td${r.cheapest?' cs-green':''}`}>₹{fmt(r.perSell,2)}</span>
              <span className="cs-td">₹{fmt(r.ten,2)}</span>
              <span className="cs-td">₹{fmt(r.annual,0)}</span>
            </div>
          ))}
        </div>
        <CsInsight text={CS_DATA.dp.insight} />
      </div>

      {/* 06 AMC */}
      <div id="cs-sec-amc" className="cs-section">
        <CsSectionHeader num="06" title="AMC" sub="What your broker charges for doing nothing" />
        <p className="cs-explain"><strong>What is it?</strong> {CS_DATA.amc.explain}</p>
        <div className="cs-table">
          <div className="cs-th" style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
            {CS_DATA.amc.cols.map((c,i)=><span key={i}>{c}</span>)}
          </div>
          {CS_DATA.amc.rows.map((r,i)=>(
            <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:'2fr 1fr 1fr'}}>
              <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
              <span className={`cs-td${r.free?' cs-green':''}`}>{r.free?'Free':'₹'+fmt(r.annual,2)}</span>
              <span className="cs-td cs-muted">{r.monthly===null?'—':'₹'+fmt(r.monthly,2)}</span>
            </div>
          ))}
        </div>
        <CsInsight text={CS_DATA.amc.insight} />
      </div>

      {/* 07 MTF */}
      <div id="cs-sec-mtf" className="cs-section">
        <CsSectionHeader num="07" title="MTF interest & brokerage" sub="What does borrowing ₹1 lakh for 30 days cost?" />
        <p className="cs-explain"><strong>What is it?</strong> {CS_DATA.mtf.explain}</p>
        <div className="cs-table">
          <div className="cs-th" style={{gridTemplateColumns:'2fr 0.8fr 1fr 1fr 1fr'}}>
            {CS_DATA.mtf.cols.map((c,i)=><span key={i}>{c}</span>)}
          </div>
          {CS_DATA.mtf.rows.map((r,i)=>(
            <div key={i} className={`cs-tr${r.cheapest?' cs-tr-best':''}`} style={{gridTemplateColumns:'2fr 0.8fr 1fr 1fr 1fr'}}>
              <span className="cs-td-name">{r.name}{r.cheapest&&<span className="cs-cheapest-tag">CHEAPEST</span>}</span>
              <span className="cs-td cs-muted">{r.rate}%</span>
              <span className="cs-td">₹{fmt(r.interest,2)}</span>
              <span className="cs-td">₹{fmt(r.brokerage,2)}</span>
              <span className={`cs-td${r.cheapest?' cs-green':''}`}>₹{fmt(r.total,2)}</span>
            </div>
          ))}
        </div>
        <CsInsight text={CS_DATA.mtf.insight} />
      </div>

      {/* 08 Regulatory */}
      <div id="cs-sec-regulatory" className="cs-section">
        <CsSectionHeader num="08" title="Regulatory charges" sub="Fixed by government — identical at every broker" />
        <p className="cs-explain"><strong>What is it?</strong> STT, exchange transaction charges, SEBI fees, and stamp duty are set by the government and exchanges. They are exactly the same at every broker — you cannot save on these by switching.</p>
        <div className="cs-reg-grid">
          {[
            { name:'STT (Delivery)',   rate:'0.1% on buy + 0.1% on sell',  ex:'₹50K trade = ₹100' },
            { name:'STT (Intraday)',   rate:'0.025% on sell side only',     ex:'₹50K trade = ₹12.50' },
            { name:'STT (F&O)',        rate:'Futures 0.02%, Options 0.1%',  ex:'Budget 2026: eff. Apr 1' },
            { name:'Exchange txn fee', rate:'NSE: 0.00297% on turnover',    ex:'₹50K round trip = ₹3.07' },
            { name:'SEBI fee',         rate:'₹10 per ₹1 Crore turnover',   ex:'₹50K round trip = ₹0.10' },
            { name:'Stamp duty',       rate:'0.015% on buy (delivery)',      ex:'₹50K buy = ₹7.50' },
            { name:'GST',              rate:'18% on (brokerage + exchange + SEBI)', ex:'Not on STT or stamp' },
          ].map((r,i) => (
            <div key={i} className="cs-reg-row">
              <div className="cs-reg-name">{r.name}</div>
              <div className="cs-reg-rate">{r.rate}</div>
              <div className="cs-reg-ex">{r.ex}</div>
            </div>
          ))}
        </div>
        <CsInsight text="On a ₹50,000 delivery trade, regulatory charges total ₹111.24 — identical at Zerodha, Dhan, HDFC, or any other broker. Switching brokers cannot reduce this amount." />
      </div>

      <div className="cs-footnote">
        Data verified from comparebroker.info and official broker websites. Annual profiles are illustrative — actual costs depend on trade frequency, size, and timing. All figures include GST where applicable. Verify before trading.
      </div>
    </div>
  );
}


// ── HEAD TO HEAD COMPONENT ────────────────────────────────────────────────────

const H2H_DATA = {
  'zerodha-dhan': {
    a:'Zerodha', b:'Dhan',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.85,bv:126.26},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2948.93,al:'Trading ₹2,860.43 · AMC ₹88.50',bv:2853.35,bl:'Trading ₹2,853.35 · AMC ₹0'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13671.30,al:'Trading ₹13,582.80 · AMC ₹88.50',bv:13554.48,bl:'Trading ₹13,554.48 · AMC ₹0'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224473.62,al:'Trading ₹224,385.12 · AMC ₹88.50',bv:224385.12,bl:'Trading ₹224,385.12 · AMC ₹0'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','₹0',true,true],
      ['Intraday Brokerage','0.03% or ₹20, lower','0.03% or ₹20, lower'],
      ['F&O Futures Brokerage','0.03% or ₹20, lower','0.03% or ₹20, lower'],
      ['F&O Options Brokerage','Flat ₹20/order','Flat ₹20/order'],
      ['CDS Futures','0.03% or ₹20, lower','0.03% or ₹20, lower'],
      ['CDS Options','Flat ₹20/order','Flat ₹20/order'],
      ['Commodity Futures','0.03% or ₹20, lower','0.03% or ₹20, lower'],
      ['Commodity Options','Flat ₹20/order','Flat ₹20/order'],
    ],
    demat:[
      ['DP Charge','₹13 + 18% GST = ₹15.34','₹12.50 + 18% GST = ₹14.75'],
      ['AMC','₹75 + 18% GST = ₹88.50/year','Free',false,true],
      ['MF DP Charges','Free for MF redemptions','₹12.50 + 18% GST = ₹14.75/ISIN',true],
      ['Dematerialisation','₹150 + GST/certificate + CDSL charges','₹150 + GST/certificate'],
      ['Rematerialisation','₹150 + GST/certificate + CDSL charges','₹150 + GST/certificate'],
      ['Failed Demat Transaction','₹50 + GST per failed instruction','₹50 + GST per failed instruction'],
    ],
    mtf:[
      ['MTF Interest Rate','14.60% p.a. (~0.040%/day)','12.49% p.a. (~0.034%/day, tiered)'],
      ['MTF Brokerage','0.3% or ₹20, lower','0.03% or ₹20, lower'],
      ['MTF Conversion','Free (auto-conversion at 3:20 PM)','Free',true,true],
      ['MTF Pledging','Pledge ₹15+GST/ISIN per request; Unpledge ₹15+GST','₹15 + GST = ₹17.70/ISIN'],
    ],
    settlement:[
      ['Physical Settlement','0.25% on physical delivery value','0.1% on contract value'],
      ['Physical Settlement (Netted)','0.25% on netted settlement value','0.1% on netted settlement value'],
      ['Clearing Charges','NSE: ₹0/trade (included)','Included in brokerage',true],
      ['Interest on Margin Shortfall','0.035%/day (12.775%/yr) on shortfall','0.05%/day on margin shortfall'],
      ['Pledge / Unpledge','Pledge ₹30+GST/ISIN (₹35.40); Unpledge free','Pledge ₹15+GST/ISIN (₹17.70); Unpledge ₹15+GST/ISIN (₹17.70)'],
      ['Delayed Payment Interest','0.05%/day on negative balance; 0.035%/day on non-cash overuse','0.0438%/day or 16.99% p.a.'],
      ['Off-Market Transfer','₹25 + 18% GST = ₹29.50/security/transaction','₹12.50 + 18% GST = ₹14.75/scrip'],
    ],
    services:[
      ['Call & Trade','₹50 + 18% GST = ₹59/order','₹50 + GST/order'],
      ['Auto Square-off','₹50 + 18% GST = ₹59/order','₹20 + GST/order'],
      ['Payment Gateway','₹9 + 18% GST = ₹10.62','Free',false,true],
      ['Instant Withdrawal','Free via UPI','Free via UPI',true,true],
      ['Corporate Action','Free','Free',true,true],
      ['API Access','Kite Connect: ₹2,000/month','Free (Dhan HQ API)',false,true],
      ['API Brokerage','Same as manual trades','Same as regular trades'],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
      ['Account Reactivation','₹50 + GST = ₹59','₹50 + GST = ₹59'],
      ['NPS','Not offered','Not offered'],
    ],
    documents:[
      ['DIS Slip','₹100 + GST/booklet (not needed with DDPI)','₹100 + GST/booklet'],
      ['Physical CMR','₹50 + GST','₹50 + GST'],
      ['P&L / Ledger (Digital)','Free (downloadable from Console)','Free (downloadable)',true,true],
      ['P&L / Ledger (Physical)','Not available','Not available'],
      ['Contract Note (Physical)','₹20 + GST per contract note','Not available'],
    ],
    instruments:[
      ['G-Sec / T-Bills','Available on Coin — no additional charge','Not offered',true],
      ['SLB','Not offered directly','Not offered'],
      ['LAS','Not offered','Not offered'],
    ],
    modifications:[
      ['Name Change','₹25 + GST (₹29.50) · Up to 72 hrs','Free · 5–7 working days',false,true],
      ['Mobile & Email','Free · Up to 24 hrs','Free · Up to 48 hrs',true,true],
      ['Address Change','₹25 + GST (₹29.50) · Up to 72 hrs','Free',false,true],
      ['Nominee Change','Adding: Free; Modification ₹25+GST (₹29.50)','Adding: Free; Modification ₹25+GST (₹29.50)'],
      ['DOB Change','₹25 + GST (₹29.50) · Up to 72 hrs','Free',false,true],
      ['Bank Account Change','₹25 + GST (₹29.50) · Up to 72 hrs','₹25 + GST (₹29.50) · Up to 48 hrs'],
      ['KYC Modification','Re-KYC: Free; Modification ₹25+GST (₹29.50)','Re-KYC: Free',false,true],
      ['Cheque Bounce','₹350 + 18% GST = ₹413','₹500 + 18% GST = ₹590'],
    ],
  },
  'zerodha-groww':{
    a:'Zerodha',b:'Groww',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.85,bv:178.71},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2948.93,al:'Trading ₹2,860.43 · AMC ₹88.50',bv:4849.15,bl:'Trading ₹4,049.15 · AMC ₹0'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13671.30,al:'Trading ₹13,582.80 · AMC ₹88.50',bv:18337.68,bl:'Trading ₹18,337.68 · AMC ₹0'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224473.62,al:'Trading ₹224,385.12 · AMC ₹88.50',bv:224385.12,bl:'Trading ₹224,385.12 · AMC ₹0'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','0.1% or ₹20, lower (min ₹5)',true],
      ['Intraday Brokerage','0.03% or ₹20, lower','0.1% or ₹20, lower (min ₹5)'],
      ['F&O Futures Brokerage','0.03% or ₹20, lower','Flat ₹20/order'],
      ['F&O Options Brokerage','Flat ₹20/order','Flat ₹20/order'],
      ['CDS Futures','0.03% or ₹20, lower','Flat ₹20/order'],
      ['CDS Options','Flat ₹20/order','Flat ₹20/order'],
      ['Commodity Futures','0.03% or ₹20, lower','Not offered'],
      ['Commodity Options','Flat ₹20/order','Not offered'],
    ],
    demat:[
      ['DP Charge','₹13 + 18% GST = ₹15.34','₹20/scrip (free under ₹100)'],
      ['AMC','₹75 + 18% GST = ₹88.50/year','Free',false,true],
      ['MF DP Charges','Free for MF redemptions','Free',true,true],
      ['Dematerialisation','₹150 + GST/certificate + CDSL charges','₹150 + GST/certificate'],
      ['Rematerialisation','₹150 + GST/certificate + CDSL charges','₹200 + GST/certificate'],
      ['Failed Demat Transaction','₹50 + GST per failed instruction','₹50 + GST per failed instruction'],
    ],
    mtf:[
      ['MTF Interest Rate','14.60% p.a. (~0.040%/day)','14.95% p.a. (~0.043%/day for <₹25L)'],
      ['MTF Brokerage','0.3% or ₹20, lower','0.1% of order value'],
      ['MTF Conversion','Free (auto-conversion at 3:20 PM)','Free',true,true],
      ['MTF Pledging','Pledge ₹15+GST/ISIN; Unpledge ₹15+GST','₹20 + GST = ₹23.60/ISIN'],
    ],
    settlement:[
      ['Physical Settlement','0.25% on physical delivery value','₹20/order'],
      ['Physical Settlement (Netted)','0.25% on netted settlement value','₹20/order'],
      ['Clearing Charges','NSE: ₹0/trade (included)','Included in brokerage',true],
      ['Interest on Margin Shortfall','0.035%/day (12.775%/yr)','0.05%/day on margin shortfall'],
      ['Pledge / Unpledge','Pledge ₹30+GST/ISIN (₹35.40); Unpledge free','₹20 + GST/ISIN = ₹23.60 each'],
      ['Delayed Payment Interest','0.05%/day on negative balance; 0.035%/day on non-cash overuse','0.045%/day on outstanding debit'],
      ['Off-Market Transfer','₹25 + 18% GST = ₹29.50/security/transaction','~₹16 + GST/ISIN'],
    ],
    services:[
      ['Call & Trade','₹50 + 18% GST = ₹59/order','Not available'],
      ['Auto Square-off','₹50 + 18% GST = ₹59/order','₹50/position'],
      ['Payment Gateway','₹9 + 18% GST = ₹10.62','Free',false,true],
      ['Instant Withdrawal','Free via UPI','Free via UPI',true,true],
      ['Corporate Action','Free','Free',true,true],
      ['API Access','Kite Connect: ₹2,000/month','Not offered'],
      ['API Brokerage','Same as manual trades','Not offered'],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
      ['Account Reactivation','₹50 + GST = ₹59','₹100 + GST = ₹118'],
      ['NPS','Not offered','Not offered'],
    ],
    documents:[
      ['DIS Slip','₹100 + GST/booklet (not needed with DDPI)','₹100 + GST/booklet'],
      ['Physical CMR','₹50 + GST','₹50 + GST'],
      ['P&L / Ledger (Digital)','Free (downloadable from Console)','Free (downloadable)',true,true],
      ['P&L / Ledger (Physical)','Not available','Not available'],
    ],
    instruments:[
      ['G-Sec / T-Bills','Available on Coin — no additional charge','Not offered',true],
      ['SLB','Not offered directly','Not offered'],
      ['LAS','Not offered','Not offered'],
    ],
    modifications:[
      ['Name Change','₹25 + GST (₹29.50)','₹25 + GST'],
      ['Mobile & Email','Free','Free',true,true],
      ['Address Change','₹25 + GST (₹29.50)','₹25 + GST'],
      ['Nominee Change','Adding: Free; Modification ₹25+GST','Free'],
      ['DOB Change','₹25 + GST (₹29.50)','Free',false,true],
      ['Bank Account Change','₹25 + GST (₹29.50)','Free',false,true],
      ['KYC Modification','Re-KYC: Free; Modification ₹25+GST','Free',false,true],
      ['Cheque Bounce','₹350 + 18% GST = ₹413','Free',false,true],
    ],
  },
  'zerodha-angelone':{
    a:'Zerodha',b:'Angel One',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.85,bv:178.71},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2948.93,al:'Trading ₹2,860.43 · AMC ₹88.50',bv:3231.93,bl:'Trading ₹2,948.93 · AMC ₹283'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13671.30,al:'Trading ₹13,582.80 · AMC ₹88.50',bv:14244.46,bl:'Trading ₹13,961.46 · AMC ₹283'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224473.62,al:'Trading ₹224,385.12 · AMC ₹88.50',bv:224668.12,bl:'Trading ₹224,385.12 · AMC ₹283'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','₹2–₹20 (min ₹2)',true],
      ['Intraday Brokerage','0.03% or ₹20, lower','0.03% or ₹20, lower'],
      ['F&O Futures Brokerage','0.03% or ₹20, lower','Flat ₹20/order'],
      ['F&O Options Brokerage','Flat ₹20/order','Flat ₹20/order'],
      ['CDS Futures','0.03% or ₹20, lower','Flat ₹20/order'],
      ['CDS Options','Flat ₹20/order','Flat ₹20/order'],
      ['Commodity Futures','0.03% or ₹20, lower','Flat ₹20/order'],
      ['Commodity Options','Flat ₹20/order','Flat ₹20/order'],
    ],
    demat:[
      ['DP Charge','₹13 + 18% GST = ₹15.34','₹20/scrip per sell transaction'],
      ['AMC','₹75 + 18% GST = ₹88.50/year','₹240 + GST/year = ₹283'],
      ['MF DP Charges','Free for MF redemptions','Free',true],
      ['Dematerialisation','₹150 + GST/certificate + CDSL charges','₹200 + GST/certificate'],
      ['Failed Demat Transaction','₹50 + GST per failed instruction','₹50 + GST per failed instruction'],
    ],
    mtf:[
      ['MTF Interest Rate','14.60% p.a. (~0.040%/day)','14.99% p.a. (0.0342%/day)'],
      ['MTF Brokerage','0.3% or ₹20, lower','0.1% or ₹20, lower (min ₹2)'],
      ['MTF Conversion','Free (auto-conversion at 3:20 PM)','Free',true,true],
      ['MTF Pledging','Pledge ₹15+GST/ISIN; Unpledge ₹15+GST','₹23.60 each'],
    ],
    settlement:[
      ['Physical Settlement','0.25% on physical delivery value','₹20/order'],
      ['Clearing Charges','NSE: ₹0/trade (included)','Included in brokerage',true],
      ['Interest on Margin Shortfall','0.035%/day (12.775%/yr) on shortfall','Additional ₹20 brokerage (intraday)'],
      ['Pledge / Unpledge','Pledge ₹30+GST/ISIN (₹35.40); Unpledge free','₹23.60 + GST/ISIN each'],
      ['Delayed Payment Interest','0.05%/day on negative balance','0.049%/day'],
      ['Off-Market Transfer','₹25 + 18% GST = ₹29.50/security/transaction','₹25 + GST/transaction'],
    ],
    services:[
      ['Call & Trade','₹50 + 18% GST = ₹59/order','₹20/order',false,true],
      ['Auto Square-off','₹50 + 18% GST = ₹59/order','₹20/order'],
      ['Payment Gateway','₹9 + 18% GST = ₹10.62','Free',false,true],
      ['Instant Withdrawal','Free via UPI','Free via UPI',true,true],
      ['Corporate Action','Free','Free',true,true],
      ['API Access','Kite Connect: ₹2,000/month','Free (SmartAPI)',false,true],
      ['API Brokerage','Same as manual trades','Same as regular trades'],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
      ['Account Reactivation','₹50 + GST = ₹59','₹50 + GST = ₹59'],
    ],
    documents:[
      ['DIS Slip','₹100 + GST/booklet','₹100 + GST/booklet'],
      ['Physical CMR','₹50 + GST','₹50 + GST'],
      ['P&L / Ledger (Digital)','Free (downloadable from Console)','Free (downloadable)',true,true],
    ],
    instruments:[
      ['G-Sec / T-Bills','Available on Coin — no additional charge','Not offered',true],
      ['SLB','Not offered directly','Not offered'],
      ['LAS','Not offered','Not offered'],
    ],
    modifications:[
      ['Name Change','₹25 + GST (₹29.50)','Free',false,true],
      ['Mobile & Email','Free','Free',true,true],
      ['Address Change','₹25 + GST (₹29.50)','Free',false,true],
      ['Nominee Change','Adding: Free; Modification ₹25+GST','Adding: Free; Modification ₹25+GST'],
      ['Bank Account Change','₹25 + GST (₹29.50)','₹25 + GST (₹29.50)'],
      ['Cheque Bounce','₹350 + 18% GST = ₹413','Free',false,true],
    ],
  },
  'zerodha-kotak':{
    a:'Zerodha',b:'Kotak Securities',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.85,bv:367.51},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2948.93,al:'Trading ₹2,860.43 · AMC ₹88.50',bv:6688.51,bl:'Trading ₹6,088.51 · AMC ₹600'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13671.30,al:'Trading ₹13,582.80 · AMC ₹88.50',bv:32097.40,bl:'Trading ₹31,497.40 · AMC ₹600'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224473.62,al:'Trading ₹224,385.12 · AMC ₹88.50',bv:224985.12,bl:'Trading ₹224,385.12 · AMC ₹600'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','0.2%',true],
      ['Intraday Brokerage','0.03% or ₹20, lower','₹10 or 0.05%, lower'],
      ['F&O Futures Brokerage','0.03% or ₹20, lower','₹10/order'],
      ['F&O Options Brokerage','Flat ₹20/order','₹10/lot'],
      ['CDS Futures','0.03% or ₹20, lower','0.05%/order'],
      ['CDS Options','Flat ₹20/order','0.05%/order'],
      ['Commodity Futures','0.03% or ₹20, lower','0.05%/order'],
      ['Commodity Options','Flat ₹20/order','0.05%/order'],
    ],
    demat:[
      ['DP Charge','₹13 + 18% GST = ₹15.34','0.04% min ₹20'],
      ['AMC','₹75 + 18% GST = ₹88.50/year','₹600/year'],
      ['Dematerialisation','₹150 + GST/certificate + CDSL charges','₹150 + GST/certificate'],
      ['Rematerialisation','₹150 + GST/certificate + CDSL charges','Available at branch'],
    ],
    mtf:[
      ['MTF Interest Rate','14.60% p.a. (~0.040%/day)','9.69% p.a. (Pro plan) / 14.97% (Free plan)'],
      ['MTF Brokerage','0.3% or ₹20, lower','0–0.30% by plan'],
      ['MTF Conversion','Free (auto-conversion at 3:20 PM)','Free',true],
      ['MTF Pledging','Pledge ₹15+GST/ISIN; Unpledge ₹15+GST','₹50 per ISIN + applicable charges'],
    ],
    settlement:[
      ['Physical Settlement','0.25% on physical delivery value','0.5%/order'],
      ['Clearing Charges','NSE: ₹0/trade (included)','Included in brokerage',true],
      ['Interest on Margin Shortfall','0.035%/day (12.775%/yr)','0.025%/day (9% p.a.)'],
      ['Pledge / Unpledge','Pledge ₹30+GST/ISIN (₹35.40); Unpledge free','₹20 each'],
      ['Delayed Payment Interest','0.05%/day on negative balance','0.0658% per day'],
      ['Off-Market Transfer','₹25 + 18% GST = ₹29.50/security','₹25 + GST per transaction'],
    ],
    services:[
      ['Call & Trade','₹50 + 18% GST = ₹59/order','₹50 + 18% GST per order'],
      ['Payment Gateway','₹9 + 18% GST = ₹10.62','Free',false,true],
      ['Instant Withdrawal','Free via UPI','N/A'],
      ['API Access','Kite Connect: ₹2,000/month','Free (Kotak Neo API)',false,true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
      ['Account Reactivation','₹50 + GST = ₹59','₹50 + GST = ₹59'],
      ['NPS','Not offered','Available'],
    ],
    documents:[
      ['DIS Slip','₹100 + GST/booklet','₹100 + GST/booklet'],
      ['Physical CMR','₹50 + GST','₹50 + GST'],
      ['P&L / Ledger (Digital)','Free (Console)','Free (downloadable)',true,true],
      ['Contract Note (Physical)','₹20 + GST per contract note','Available at branch'],
    ],
    instruments:[
      ['G-Sec / T-Bills','Available on Coin — no additional charge','Available at branch office',true],
      ['SLB','Not offered directly','Available at branch'],
      ['LAS','Not offered','Available at branch'],
    ],
    modifications:[
      ['Name Change','₹25 + GST (₹29.50)','Free'],
      ['Mobile & Email','Free','Free',true,true],
      ['Address Change','₹25 + GST (₹29.50)','Free'],
      ['Bank Account Change','₹25 + GST (₹29.50)','Free'],
      ['Cheque Bounce','₹350 + 18% GST = ₹413','Free'],
    ],
  },
  'dhan-groww':{
    a:'Dhan',b:'Groww',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.26,bv:178.71},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2853.35,al:'Trading ₹2,853.35 · AMC ₹0',bv:4849.15,bl:'Trading ₹4,849.15 · AMC ₹0'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13554.48,al:'Trading ₹13,554.48 · AMC ₹0',bv:18337.68,bl:'Trading ₹18,337.68 · AMC ₹0'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224385.12,al:'Trading ₹224,385.12 · AMC ₹0',bv:224385.12,bl:'Trading ₹224,385.12 · AMC ₹0'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','0.1% or ₹20, lower (min ₹5)',true],
      ['Intraday Brokerage','0.03% or ₹20, lower','0.1% or ₹20, lower (min ₹5)'],
      ['F&O Futures Brokerage','0.03% or ₹20, lower','Flat ₹20/order'],
      ['F&O Options Brokerage','Flat ₹20/order','Flat ₹20/order'],
      ['Commodity Futures','0.03% or ₹20, lower','Not offered'],
      ['Commodity Options','Flat ₹20/order','Not offered'],
    ],
    demat:[
      ['DP Charge','₹12.50 + 18% GST = ₹14.75','₹20/scrip (free under ₹100)'],
      ['AMC','Free','Free',true,true],
    ],
    mtf:[
      ['MTF Interest Rate','12.49% p.a. (~0.034%/day, tiered)','14.95% p.a.'],
      ['MTF Brokerage','0.03% or ₹20, lower','0.1% of order value'],
      ['MTF Conversion','Free','Free',true,true],
    ],
    settlement:[
      ['Interest on Margin Shortfall','0.05%/day on margin shortfall','0.045%/day on outstanding debit'],
      ['Pledge / Unpledge','Pledge ₹15+GST/ISIN (₹17.70); Unpledge ₹15+GST/ISIN','₹20 + GST/ISIN = ₹23.60 each'],
      ['Delayed Payment Interest','0.0438%/day or 16.99% p.a.','0.045%/day on outstanding debit'],
    ],
    services:[
      ['Call & Trade','₹50 + GST/order','Not available'],
      ['Auto Square-off','₹20 + GST/order','₹50/position'],
      ['Payment Gateway','Free','Free',true,true],
      ['API Access','Free (Dhan HQ API)','Not offered',true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
    ],
    instruments:[
      ['G-Sec / T-Bills','Not offered','Not offered'],
      ['SLB','Not offered','Not offered'],
    ],
    modifications:[
      ['Name Change','Free','₹25 + GST',true],
      ['Address Change','Free','₹25 + GST',true],
      ['DOB Change','Free','Free',true,true],
      ['Cheque Bounce','₹500 + 18% GST = ₹590','Free',false,true],
    ],
  },
  'dhan-angelone':{
    a:'Dhan',b:'Angel One',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.26,bv:178.71},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2853.35,al:'Trading ₹2,853.35 · AMC ₹0',bv:3231.93,bl:'Trading ₹2,948.93 · AMC ₹283'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13554.48,al:'Trading ₹13,554.48 · AMC ₹0',bv:14244.46,bl:'Trading ₹13,961.46 · AMC ₹283'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224385.12,al:'Trading ₹224,385.12 · AMC ₹0',bv:224668.12,bl:'Trading ₹224,385.12 · AMC ₹283'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','₹2–₹20 (min ₹2)',true],
      ['Intraday Brokerage','0.03% or ₹20, lower','0.03% or ₹20, lower'],
      ['F&O Options Brokerage','Flat ₹20/order','Flat ₹20/order'],
    ],
    demat:[
      ['DP Charge','₹12.50 + 18% GST = ₹14.75','₹20/scrip per sell transaction'],
      ['AMC','Free','₹240 + GST/year = ₹283',true],
    ],
    mtf:[
      ['MTF Interest Rate','12.49% p.a. (~0.034%/day, tiered)','14.99% p.a. (0.0342%/day)'],
      ['MTF Brokerage','0.03% or ₹20, lower','0.1% or ₹20, lower (min ₹2)'],
      ['MTF Conversion','Free','Free',true,true],
    ],
    settlement:[
      ['Interest on Margin Shortfall','0.05%/day on margin shortfall','Additional ₹20 brokerage (intraday)'],
      ['Pledge / Unpledge','Pledge ₹17.70; Unpledge ₹17.70','₹23.60 each'],
      ['Delayed Payment Interest','0.0438%/day or 16.99% p.a.','0.049%/day'],
    ],
    services:[
      ['Call & Trade','₹50 + GST/order','₹20/order',false,true],
      ['Payment Gateway','Free','Free',true,true],
      ['API Access','Free (Dhan HQ API)','Free (SmartAPI)',true,true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
    ],
    modifications:[
      ['Name Change','Free','Free',true,true],
      ['Address Change','Free','Free',true,true],
      ['DOB Change','Free','Free',true,true],
      ['Cheque Bounce','₹500 + 18% GST = ₹590','Free',false,true],
    ],
  },
  'dhan-kotak':{
    a:'Dhan',b:'Kotak Securities',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:126.26,bv:367.51},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:2853.35,al:'Trading ₹2,853.35 · AMC ₹0',bv:6688.51,bl:'Trading ₹6,088.51 · AMC ₹600'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:13554.48,al:'Trading ₹13,554.48 · AMC ₹0',bv:32097.40,bl:'Trading ₹31,497.40 · AMC ₹600'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224385.12,al:'Trading ₹224,385.12 · AMC ₹0',bv:224985.12,bl:'Trading ₹224,385.12 · AMC ₹600'},
    ],
    trading:[
      ['Delivery Brokerage','₹0','0.2%',true],
      ['Intraday Brokerage','0.03% or ₹20, lower','₹10 or 0.05%, lower'],
      ['F&O Options Brokerage','Flat ₹20/order','₹10/lot'],
    ],
    demat:[
      ['DP Charge','₹12.50 + 18% GST = ₹14.75','0.04% min ₹20'],
      ['AMC','Free','₹600/year',true],
    ],
    mtf:[
      ['MTF Interest Rate','12.49% p.a. (tiered)','9.69% p.a. (Pro plan) / 14.97% (Free plan)'],
      ['MTF Brokerage','0.03% or ₹20, lower','0–0.30% by plan'],
    ],
    settlement:[
      ['Interest on Margin Shortfall','0.05%/day','0.025%/day (9% p.a.)'],
      ['Delayed Payment Interest','0.0438%/day','0.0658% per day'],
    ],
    services:[
      ['Call & Trade','₹50 + GST/order','₹50 + 18% GST per order'],
      ['API Access','Free (Dhan HQ API)','Free (Kotak Neo API)',true,true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
    ],
    modifications:[
      ['Name Change','Free','Free',true,true],
      ['Address Change','Free','Free',true,true],
    ],
  },
  'groww-angelone':{
    a:'Groww',b:'Angel One',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:178.71,bv:178.71},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:4849.15,al:'Trading ₹4,849.15 · AMC ₹0',bv:3231.93,bl:'Trading ₹2,948.93 · AMC ₹283'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:18337.68,al:'Trading ₹18,337.68 · AMC ₹0',bv:14244.46,bl:'Trading ₹13,961.46 · AMC ₹283'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224385.12,al:'Trading ₹224,385.12 · AMC ₹0',bv:224668.12,bl:'Trading ₹224,385.12 · AMC ₹283'},
    ],
    trading:[
      ['Delivery Brokerage','0.1% or ₹20, lower (min ₹5)','₹2–₹20 (min ₹2)'],
      ['Intraday Brokerage','0.1% or ₹20, lower (min ₹5)','0.03% or ₹20, lower'],
      ['F&O Options','Flat ₹20/order','Flat ₹20/order'],
    ],
    demat:[
      ['DP Charge','₹20/scrip (free under ₹100)','₹20/scrip per sell transaction'],
      ['AMC','Free','₹240 + GST/year = ₹283',true],
    ],
    mtf:[
      ['MTF Interest Rate','14.95% p.a.','14.99% p.a.'],
      ['MTF Brokerage','0.1% of order value','0.1% or ₹20, lower (min ₹2)'],
    ],
    settlement:[
      ['Delayed Payment Interest','0.045%/day on outstanding debit','0.049%/day'],
      ['Pledge / Unpledge','₹20 + GST/ISIN = ₹23.60 each','₹23.60 each'],
    ],
    services:[
      ['Call & Trade','Not available','₹20/order'],
      ['API Access','Not offered','Free (SmartAPI)',false,true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
    ],
    modifications:[
      ['Name Change','₹25 + GST','Free',false,true],
      ['Address Change','₹25 + GST','Free',false,true],
    ],
  },
  'groww-kotak':{
    a:'Groww',b:'Kotak Securities',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:178.71,bv:367.51},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:4849.15,al:'Trading ₹4,849.15 · AMC ₹0',bv:6688.51,bl:'Trading ₹6,088.51 · AMC ₹600'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:18337.68,al:'Trading ₹18,337.68 · AMC ₹0',bv:32097.40,bl:'Trading ₹31,497.40 · AMC ₹600'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224385.12,al:'Trading ₹224,385.12 · AMC ₹0',bv:224985.12,bl:'Trading ₹224,385.12 · AMC ₹600'},
    ],
    trading:[
      ['Delivery Brokerage','0.1% or ₹20, lower (min ₹5)','0.2%'],
      ['Intraday Brokerage','0.1% or ₹20, lower (min ₹5)','₹10 or 0.05%, lower'],
      ['F&O Options','Flat ₹20/order','₹10/lot'],
      ['Commodity','Not offered','0.05%/order'],
    ],
    demat:[
      ['DP Charge','₹20/scrip (free under ₹100)','0.04% min ₹20'],
      ['AMC','Free','₹600/year',true],
    ],
    mtf:[
      ['MTF Interest Rate','14.95% p.a.','9.69% p.a. (Pro plan) / 14.97% (Free plan)'],
      ['MTF Brokerage','0.1% of order value','0–0.30% by plan'],
    ],
    settlement:[
      ['Interest on Margin Shortfall','0.05%/day on margin shortfall','0.025%/day (9% p.a.)'],
      ['Delayed Payment Interest','0.045%/day','0.0658% per day'],
      ['Pledge / Unpledge','₹20 + GST/ISIN = ₹23.60 each','₹20 each'],
    ],
    services:[
      ['Call & Trade','Not available','₹50 + 18% GST per order'],
      ['API Access','Not offered','Free (Kotak Neo API)',false,true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
    ],
    modifications:[
      ['Name Change','₹25 + GST','Free',false,true],
      ['Address Change','₹25 + GST','Free',false,true],
    ],
  },
  'angelone-kotak':{
    a:'Angel One',b:'Kotak Securities',
    perTrade:[
      {type:'Delivery',sub:'₹50K round-trip',av:178.71,bv:367.51},
      {type:'Intraday',sub:'₹1L round-trip',av:83.23,bv:83.23},
      {type:'Futures',sub:'₹1L round-trip',av:70.69,bv:70.69},
      {type:'Options',sub:'₹1L round-trip',av:276.30,bv:276.30},
    ],
    annual:[
      {profile:'Passive Investor',sub:'2 delivery/mo, 1 sell day',av:3231.93,al:'Trading ₹2,948.93 · AMC ₹283',bv:6688.51,bl:'Trading ₹6,088.51 · AMC ₹600'},
      {profile:'Swing Trader',sub:'8 delivery/mo, 4 sell days',av:14244.46,al:'Trading ₹13,961.46 · AMC ₹283',bv:32097.40,bl:'Trading ₹31,497.40 · AMC ₹600'},
      {profile:'F&O Active',sub:'30 futures + 60 options/mo',av:224668.12,al:'Trading ₹224,385.12 · AMC ₹283',bv:224985.12,bl:'Trading ₹224,385.12 · AMC ₹600'},
    ],
    trading:[
      ['Delivery Brokerage','₹2–₹20 (min ₹2)','0.2%'],
      ['Intraday Brokerage','0.03% or ₹20, lower','₹10 or 0.05%, lower'],
      ['F&O Options','Flat ₹20/order','₹10/lot'],
    ],
    demat:[
      ['DP Charge','₹20/scrip per sell transaction','0.04% min ₹20'],
      ['AMC','₹240 + GST/year = ₹283','₹600/year'],
    ],
    mtf:[
      ['MTF Interest Rate','14.99% p.a.','9.69% p.a. (Pro plan) / 14.97% (Free plan)'],
      ['MTF Brokerage','0.1% or ₹20, lower (min ₹2)','0–0.30% by plan'],
    ],
    settlement:[
      ['Interest on Margin Shortfall','Additional ₹20 brokerage (intraday)','0.025%/day (9% p.a.)'],
      ['Delayed Payment Interest','0.049%/day','0.0658% per day'],
    ],
    services:[
      ['Call & Trade','₹20/order','₹50 + 18% GST per order'],
      ['API Access','Free (SmartAPI)','Free (Kotak Neo API)',true,true],
    ],
    account:[
      ['Account Opening','Free','Free',true,true],
      ['DDPI','₹100 + 18% GST = ₹118','₹100 + 18% GST = ₹118'],
    ],
    modifications:[
      ['Name Change','Free','Free',true,true],
      ['Address Change','Free','Free',true,true],
    ],
  },
};

const PAIR_LIST = [
  {key:'zerodha-dhan',label:'Zerodha vs Dhan'},
  {key:'zerodha-groww',label:'Zerodha vs Groww'},
  {key:'zerodha-angelone',label:'Zerodha vs Angel One'},
  {key:'zerodha-kotak',label:'Zerodha vs Kotak'},
  {key:'dhan-groww',label:'Dhan vs Groww'},
  {key:'dhan-angelone',label:'Dhan vs Angel One'},
  {key:'dhan-kotak',label:'Dhan vs Kotak'},
  {key:'groww-angelone',label:'Groww vs Angel One'},
  {key:'groww-kotak',label:'Groww vs Kotak'},
  {key:'angelone-kotak',label:'Angel One vs Kotak'},
];

const SEC = {
  perTrade:'01  Per-trade cost',annual:'02  Annual cost by profile',
  trading:'03  Trading',demat:'04  Demat',mtf:'05  MTF',
  settlement:'06  Settlement',services:'07  Services',account:'08  Account',
  documents:'09  Documents',instruments:'10  Instruments',modifications:'11  Modifications',
};

function H2HTable({title,rows,aName,bName}){
  if(!rows||!rows.length)return null;
  return(
    <div className="h2h-section">
      <div className="h2h-section-title">{title}</div>
      <div className="h2h-table">
        <div className="h2h-th"><span>CHARGE</span><span>{aName.toUpperCase()}</span><span>{bName.toUpperCase()}</span></div>
        {rows.map(([label,av,bv,ag,bg],i)=>(
          <div key={i} className="h2h-tr">
            <span className="h2h-td-label">{label}</span>
            <span className={`h2h-td-val${ag?' h2h-green':''}`}>{av}</span>
            <span className={`h2h-td-val${bg?' h2h-green':''}`}>{bv}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeadToHead(){
  const [pair,setPair]=useState('zerodha-dhan');
  const d=H2H_DATA[pair];
  const delivA=d.perTrade[0].av, delivB=d.perTrade[0].bv;
  const winner=delivA<=delivB?d.a:d.b;
  const saves=Math.abs(delivA-delivB).toFixed(2);
  const maxT=Math.max(delivA,delivB);
  return(
    <div className="h2h-wrap">
      <div className="h2h-header">
        <div className="h2h-title">Head-to-Head</div>
        
      </div>
      <div className="h2h-pair-grid">
        {PAIR_LIST.map(p=>(
          <button key={p.key} className={`h2h-pair-btn${pair===p.key?' h2h-pair-active':''}`} onClick={()=>setPair(p.key)}>{p.label}</button>
        ))}
      </div>
      <div className="h2h-hero">
        <div className="h2h-hero-names">
          <span className={delivA<=delivB?'h2h-name-win':'h2h-name-lose'}>{d.a}</span>
          <span className="h2h-hero-vs">vs</span>
          <span className={delivB<delivA?'h2h-name-win':'h2h-name-lose'}>{d.b}</span>
        </div>
        <div className="h2h-hero-bars">
          {[{n:d.a,v:delivA,w:delivA<=delivB},{n:d.b,v:delivB,w:delivB<delivA}].map((s,i)=>(
            <div key={i} className="h2h-hero-bar-row">
              <span className={`h2h-hero-amt${s.w?' h2h-green':''}`}>₹{fmt(s.v,2)}</span>
              <div className="h2h-hero-track"><div className="h2h-hero-fill" style={{width:`${(s.v/maxT)*100}%`,background:s.w?'var(--gain)':'var(--border2)'}}/></div>
              <span className="h2h-hero-name">{s.n}</span>
            </div>
          ))}
        </div>
        <div className="h2h-hero-verdict">
          {parseFloat(saves)===0
            ?<span style={{color:'var(--text3)'}}>Same delivery cost on ₹50K trade</span>
            :<><span className="h2h-green" style={{fontWeight:900}}>{winner}</span><span style={{color:'var(--text3)'}}> saves ₹{saves} on a ₹50K delivery trade</span></>
          }
        </div>
      </div>
      <div className="h2h-section">
        <div className="h2h-section-title">{SEC.annual}</div>
        <div className="h2h-annual-grid">
          {d.annual.map((p,i)=>{
            const aW=p.av<=p.bv, diff=Math.abs(p.av-p.bv).toFixed(2);
            return(
              <div key={i} className="h2h-annual-card">
                <div className="h2h-annual-profile">{p.profile}</div>
                <div className="h2h-annual-sub">{p.sub}</div>
                <div className="h2h-annual-row">
                  <div className="h2h-annual-broker">
                    <div className="h2h-annual-name">{d.a}</div>
                    <div className={`h2h-annual-amt${aW?' h2h-green':''}`}>₹{fmt(p.av,2)}<span className="h2h-annual-yr">/yr</span></div>
                    <div className="h2h-annual-breakdown">{p.al}</div>
                  </div>
                  <div className="h2h-annual-broker">
                    <div className="h2h-annual-name">{d.b}</div>
                    <div className={`h2h-annual-amt${!aW?' h2h-green':''}`}>₹{fmt(p.bv,2)}<span className="h2h-annual-yr">/yr</span></div>
                    <div className="h2h-annual-breakdown">{p.bl}</div>
                  </div>
                </div>
                {parseFloat(diff)>0&&<div className="h2h-annual-verdict h2h-green">{aW?d.a:d.b} saves ₹{diff}/yr</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="h2h-section">
        <div className="h2h-section-title">{SEC.perTrade}</div>
        <div className="h2h-table">
          <div className="h2h-th"><span>TRADE TYPE</span><span>{d.a.toUpperCase()}</span><span>{d.b.toUpperCase()}</span><span>GAP</span></div>
          {d.perTrade.map((r,i)=>{
            const aW=r.av<=r.bv,gap=Math.abs(r.av-r.bv);
            return(
              <div key={i} className="h2h-tr">
                <span className="h2h-td-label"><div>{r.type}</div><div className="h2h-td-sub">{r.sub}</div></span>
                <span className={`h2h-td-val${aW?' h2h-green':''}`}>₹{fmt(r.av,2)}</span>
                <span className={`h2h-td-val${(!aW&&gap>0.01)?' h2h-green':''}`}>₹{fmt(r.bv,2)}</span>
                <span className="h2h-td-gap">{gap<0.01?'—':'₹'+fmt(gap,2)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <H2HTable title={SEC.trading}       rows={d.trading}       aName={d.a} bName={d.b}/>
      <H2HTable title={SEC.demat}         rows={d.demat}         aName={d.a} bName={d.b}/>
      <H2HTable title={SEC.mtf}           rows={d.mtf}           aName={d.a} bName={d.b}/>
      <H2HTable title={SEC.settlement}    rows={d.settlement}    aName={d.a} bName={d.b}/>
      <H2HTable title={SEC.services}      rows={d.services}      aName={d.a} bName={d.b}/>
      <H2HTable title={SEC.account}       rows={d.account}       aName={d.a} bName={d.b}/>
      {d.documents&&<H2HTable title={SEC.documents} rows={d.documents} aName={d.a} bName={d.b}/>}
      {d.instruments&&<H2HTable title={SEC.instruments} rows={d.instruments} aName={d.a} bName={d.b}/>}
      <H2HTable title={SEC.modifications} rows={d.modifications} aName={d.a} bName={d.b}/>
      <div className="h2h-footnote">Data sourced from comparebroker.info and official broker websites. ₹50K delivery baseline. Govt charges (STT, exchange, SEBI, stamp duty) are identical at every broker and not shown in the gap. Verify all charges before trading.</div>
    </div>
  );
}


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
        <div className="brk-hero2-top">
          <div className="brk-hero2-left">
            <div className="brk-hero2-title">Indian Broker Charges — Every Fee, Calculated</div>
            <div className="brk-hero2-stats">
              <div className="brk-hs2">
                <div className="brk-hs2-n" style={{color:'var(--gain)'}}>₹125.99</div>
                <div className="brk-hs2-l">Cheapest — <strong style={{color:'var(--text)',fontSize:15}}>Dhan</strong> &amp; <strong style={{color:'var(--accent)',fontSize:15}}>Zerodha ★</strong></div>
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
            <div className="brk-hero2-trade-note">Sample trade: ₹50,000 delivery (buy + sell), including brokerage, STT, exchange fees, SEBI charges, stamp duty, and DP charges. Statutory charges are identical across all brokers, while brokerage may vary. Adjust the trade size using the calculator.</div>
          </div>
          <div className="brk-hero2-note">
            <span style={{color:'var(--accent)',fontWeight:900,fontSize:13}}>★ Zerodha</span> — Widely considered for combination of low cost, robust trading experience, reliability and trust. ₹13,500 Cr networth (highest of any broker in India), 15+ year track record, Kite platform, <a href="https://zerodha.com/varsity/" target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',textDecoration:'underline'}}>Varsity</a> education. Costs just ₹0.59 more than Dhan on a ₹50,000 delivery trade.
          </div>
        </div>
      </div>

      {/* HORIZONTAL TAB BAR — like FnO */}
      <div className="brk-tabs-bar">
        {TABS.map(t=>(
          <button key={t} className={`brk-tab-btn${tab===t?' brk-tab-active':''}`} onClick={()=>setTab(t)}>
            <span className="brk-tab-icon">{
              t==='Rankings'?'↓':t==='Direct Comparison'?'⚔':t==='Cheatsheet'?'≋':t==='Brokerage Calc'?'₹':t==='MTF Comparison'?'%':'▦'
            }</span>
            <span className="brk-tab-label">{t}</span>
          </button>
        ))}
      </div>

        <div className="brk-main-content">

      {/* ── RANKINGS ── */}
      {tab==='Rankings' && (
        <div className="brk-content">

          {/* TRADE SIZE TOGGLE */}
          <div className="brk-size-bar">
            <span className="brk-size-label">TRADE SIZE</span>
            {[['₹50K','50000'],['₹1L','100000'],['₹10L','1000000']].map(([label,val])=>(
              <button key={val} className={`brk-size-btn${tradeVal===val?' brk-size-active':''}`} onClick={()=>setTradeVal(val)}>
                {label}
              </button>
            ))}
          </div>

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
                      <div className={`brk-col-val ${b.delivery===0?'brk-col-green':b.deliveryHighlight==='red'?'brk-col-red':''}`}>{b.deliveryLabel}</div>
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
                      <div className={`brk-col-val ${b.mtfBrokerageHighlight==='red'?'brk-col-red':''}`}>{b.mtfBrokerage||'—'}</div>
                    </div>

                    {/* Col: MTF Interest — compact slabs */}
                    <div className="brk-col brk-col-wide">
                      <div className="brk-col-label">MTF INTEREST</div>
                      {b.mtfSlabs ? (
                        <div className="brk-col-slabs-compact">
                          {b.mtfSlabs.map((s,si)=>(
                            <div key={si} className="brk-slab-compact">
                              <span className="brk-slab-r">{s[0]}</span>
                              <span className={`brk-slab-v ${parseFloat(s[1])>=15?'brk-col-red':parseFloat(s[1])<=13?'brk-col-green':'brk-col-amber'}`}>{s[1]}</span>
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
                      <div className={`brk-col-val ${b.dpHighlight==='red'?'brk-col-red':b.dp<=14.75?'brk-col-green':''}`}>₹{fmt(b.dp,2)}</div>
                      <div className="brk-col-sub">{b.dpLabel} · {['upstox','groww','angelone','mstock','sharemarket'].includes(b.id) ? 'per sell transaction' : 'per stock'}</div>
                    </div>

                    {/* Col: AMC */}
                    <div className="brk-col">
                      <div className="brk-col-label">AMC / YEAR</div>
                      <div className={`brk-col-val ${b.amc===0?'brk-col-green':b.amcHighlight==='red'||b.amc>=600?'brk-col-red':''}`}>{b.amcLabel}</div>
                    </div>

                    <div className="brk-col-divider"/>

                    {/* Col: Totals — Delivery + Intraday + MTF (all-in) */}
                    {(()=>{
                      const tv = parseFloat(tradeVal)||50000;
                      const scale = tv/50000;

                      // Govt charges scale with trade size (from Zerodha calculator verified)
                      const sttD   = tv * 0.002;          // 0.1% buy + 0.1% sell
                      const txn    = tv * 2 * 0.0000307;  // NSE 0.00307% on turnover
                      const sebi   = tv * 2 / 10000000 * 10;
                      const stampD = tv * 0.00015;         // 0.015% buy only
                      const sttI   = tv * 0.00025;         // 0.025% sell only
                      const stampI = tv * 0.00003;         // 0.003% buy only

                      // GST = 18% on (brokerage + txn + SEBI)
                      // Per-side brokerage, then × 2 for round trip
                      // Delivery: brokerCharges50k is already per-trade (buy+sell at ₹50K), scale linearly
                      const brkD   = b.delivery===0 ? 0 : Math.min(b.brokerCharges50k/50000*tv, tv*0.005*2);
                      // Intraday: min(rate%, flat cap) per side × 2
                      const intRate = b.intradayB||20;
                      const brkI   = Math.min(intRate, tv*0.0003) * 2; // 0.03% or cap, buy+sell
                      // MTF: same delivery rate structure
                      const mtfBrkAmt = b.mtfBrokerage==='N/A' ? 0
                        : b.delivery===0
                          ? Math.min(20, tv*0.003) * 2  // zero-delivery: use MTF rate (0.3% or ₹20 × 2)
                          : Math.min(b.intradayB||20, tv*0.0003) * 2; // standard: ₹20 flat × 2 = ₹40

                      const gstD   = (brkD + txn + sebi) * 0.18;
                      const gstI   = (brkI + txn + sebi) * 0.18;
                      const gstMTF = (mtfBrkAmt + txn + sebi) * 0.18;

                      const totD   = brkD + gstD + b.dp + sttD + txn + sebi + stampD;
                      const totI   = brkI + gstI + sttI + txn + sebi + stampI;
                      const totMTF = mtfBrkAmt + gstMTF + b.dp + sttD + txn + sebi + stampD;

                      const cheapTot = (sorted[0].delivery===0?0:Math.min(sorted[0].brokerCharges50k/50000*tv,tv*0.005)) + sorted[0].dp + (tv*0.002+tv*2*0.0000307+tv*2/10000000*10+tv*0.00015+(tv*2*0.0000307+tv*2/10000000*10)*0.18);
                      const isBest = totD <= cheapTot + 0.1;

                      const lbl = {'50000':'₹50K','100000':'₹1L','1000000':'₹10L'}[tradeVal]||'custom';
                      return (
                        <div className="brk-col brk-col-total">
                          <div className="brk-col-label">ALL-IN — {lbl}</div>
                          <div className="brk-total-3">
                            <div className="brk-t3-row">
                              <span className="brk-t3-seg">Delivery</span>
                              <span className={`brk-t3-num ${isBest?'brk-col-green':b.total50k>400?'brk-col-red':''}`}>₹{fmt(totD,2)}</span>
                            </div>
                            <div className="brk-t3-row">
                              <span className="brk-t3-seg">Intraday</span>
                              <span className={`brk-t3-num ${b.intradayB===5?'brk-col-green':''}`}>₹{fmt(totI,2)}</span>
                            </div>
                            <div className="brk-t3-row brk-t3-row-mtf">
                              <span className="brk-t3-seg">MTF</span>
                              {b.mtfRate===null && b.mtfLabel==='N/A' ? (
                                <span className="brk-t3-num brk-col-zero">N/A</span>
                              ) : (
                                <div className="brk-t3-mtf-stack">
                                  <span className="brk-t3-num">₹{fmt(totMTF,2)}</span>
                                  <span className={`brk-t3-brk ${b.mtfBrokerageHighlight==='red'?'brk-col-red':mtfBrkAmt<=40?'brk-col-green':'brk-col-red'}`}>(Brokerage: ₹{fmt(mtfBrkAmt,2)})</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="brk-col-sub" style={{marginTop:4}}>
                            {isBest
                              ? <span className="brk-col-green">↓ cheapest</span>
                              : <span>+₹{fmt(totD-cheapTot,0)} vs cheapest</span>
                            }
                          </div>
                          <div className="brk-col-sub">brk+GST+DP+govt</div>
                        </div>
                      );
                    })()}

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
                        <div className="brk-ccs-row"><span>MTF brokerage</span><span>{b.mtfBrokerage||'—'}</span></div>
                      </div>
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">DEMAT CHARGES</div>
                        <div className="brk-ccs-row"><span>DP charge (per scrip sell)</span><span className={b.dpHighlight==='red'?'brk-card-red':''}>{b.dpLabel}</span></div>
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
                        <div className="brk-ccs-title">API & DELAYED PAYMENT</div>
                        <div className="brk-ccs-row"><span>API access</span><span>{b.apiNote||b.api}</span></div>
                        <div className="brk-ccs-row"><span>Intraday margin shortfall</span><span className={b.id==='zerodha'?'brk-green':'brk-card-red'}>{b.marginShortfallIntraday||b.marginShortfall}</span></div>
                        <div className="brk-ccs-row"><span>Overnight margin shortfall</span><span className={b.id==='zerodha'?'brk-green':''}>{b.marginShortfallOvernight||b.marginShortfall}</span></div>
                        <div className="brk-ccs-row"><span>Delayed payment</span><span>{b.delayedPayment||'—'}</span></div>
                        {b.cuspaCharge&&<div className="brk-ccs-row"><span>CUSPA charges</span><span className="brk-card-red">{b.cuspaCharge}</span></div>}
                      </div>
                      <div className="brk-card-charge-section">
                        <div className="brk-ccs-title">ACCOUNT</div>
                        <div className="brk-ccs-row"><span>Account opening</span><span className="brk-green">Free</span></div>
                        <div className="brk-ccs-row"><span>DDPI</span><span>{b.ddpi===null?'N/A':'₹'+b.ddpi}</span></div>
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
      {tab==='Brokerage Calc' && (
        <div className="brk-content">
          <UniversalCalc />
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
      {tab==='__REMOVED__' && (
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
      {tab==='Cheatsheet' && (
        <div className="brk-content">
          <Cheatsheet />
        </div>
      )}

      {tab==='Direct Comparison' && (
        <div className="brk-content">
          <HeadToHead brokers={BROKERS} />
        </div>
      )}

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


      <div className="brk-footer">
        Data sourced from official broker websites, fee documents, and NSE filings. Regulatory charges (STT, exchange fee, SEBI fee, stamp duty) are fixed by government and exchanges — identical at every broker. Always verify current charges before trading. No affiliates. No paid placements. No sponsored rankings. ★ Editor's Pick = editorial judgment based on platform quality, financial strength, and track record — not cost alone. Not sponsored.
      </div>
    </div>
  );
}
