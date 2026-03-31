import { useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useMarketData } from './hooks/useMarketData';
import { detectRegion } from './data/markets';
import Header from './components/Header';
import Ticker from './components/Ticker';
import WorldClocks from './components/WorldClocks';
import HeroSection from './components/HeroSection';
import WorldBenchmarks from './components/WorldBenchmarks';
import MarketGrid from './components/MarketGrid';
import IndexModal from './components/IndexModal';
import Footer from './components/Footer';
import { MARKETS } from './data/markets';

// Lazy load heavy pages
const FnOPage      = lazy(() => import('./components/FnOPage'));
const GoldPage     = lazy(() => import('./components/GoldPage'));
const IpoPage      = lazy(() => import('./components/IpoPage'));
const RiskCalcPage = lazy(() => import('./components/RiskCalcPage'));
const BubbleView   = lazy(() => import('./components/BubbleView'));
const SentimentTop = lazy(() => import('./components/SentimentTop'));
const IndiaHeatmap = lazy(() => import('./components/IndiaHeatmap'));
const FiiDii       = lazy(() => import('./components/FiiDii'));
const InsightsPage = lazy(() => import('./components/InsightsPage'));
const BrokersPage  = lazy(() => import('./components/BrokersPage'));

// Sub-tab path maps per page
const SUB_PATH = {
  // FnO
  '/fno':           { view: 'fno',     tab: 'overview'  },
  '/fno/overview':  { view: 'fno',     tab: 'overview'  },
  '/fno/strategy':  { view: 'fno',     tab: 'strategy'  },
  '/fno/learn':     { view: 'fno',     tab: 'backtest'  },
  '/fno/reference': { view: 'fno',     tab: 'reference' },
  // Brokers
  '/brokers':             { view: 'brokers', tab: 'Rankings'    },
  '/brokers/rankings':    { view: 'brokers', tab: 'Rankings'    },
  '/brokers/compare':     { view: 'brokers', tab: 'Direct Comparison' },
  '/brokers/charges':     { view: 'brokers', tab: 'Charges Guide' },
  '/brokers/calculator':  { view: 'brokers', tab: 'Brokerage Calc' },
  '/brokers/data':        { view: 'brokers', tab: 'Market Data' },
  // Risk calc
  '/calc':              { view: 'calc', tab: 'start'       },
  '/calc/calculators':  { view: 'calc', tab: 'calculators' },
  '/calc/recovery':     { view: 'calc', tab: 'recovery'    },
  '/calc/principles':   { view: 'calc', tab: 'principles'  },
  '/calc/glossary':     { view: 'calc', tab: 'glossary'    },
};

const PATH_MAP = {
  '/':           'grid',
  '/markets':    'grid',
  '/sentiment':  'bubble',
  '/gold':       'gold',
  '/ipo':        'ipo',
  '/insights':   'insights',
  '/blog':       'insights',
};

const VIEW_PATH = {
  'grid':      '/markets',
  'bubble':    '/sentiment',
  'fno':       '/fno',
  'gold':      '/gold',
  'ipo':       '/ipo',
  'calc':      '/calc',
  'insights':  '/insights',
  'brokers':   '/brokers',
};

const FULL_PAGES = new Set(['fno', 'gold', 'ipo', 'calc', 'insights', 'brokers']);

function getStateFromPath() {
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (SUB_PATH[path]) return SUB_PATH[path];
  if (PATH_MAP[path]) return { view: PATH_MAP[path], tab: null };
  return { view: 'grid', tab: null };
}

function getViewFromPath() {
  return getStateFromPath().view;
}

function PageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: 12,
    }}>
      Loading...
    </div>
  );
}

export default function App() {
  const region = useMemo(() => detectRegion(), []);
  const { data, lastUpdate, nseData } = useMarketData();
  const initState                   = getStateFromPath();
  const [view, setView]             = useState(initState.view);
  const [initialTab]                = useState(initState.tab);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const onPop = () => setView(getViewFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const PAGE_TITLES = {
    grid:     'indexes.live — Global Market Indexes Live',
    bubble:   'Market Sentiment — indexes.live',
    fno:      'F&O — Futures & Options — indexes.live',
    gold:     'Gold Prices Live — indexes.live',
    ipo:      'IPO Tracker — indexes.live',
    calc:     'Risk Calculator — indexes.live',
    insights: 'Daily Market Insights — indexes.live',
    brokers:  'Indian Broker Charges — indexes.live',
  };

  const navigate = (v) => {
    setView(v);
    const path = VIEW_PATH[v] || '/markets';
    window.history.pushState({}, '', path);
    document.title = PAGE_TITLES[v] || 'indexes.live';
  };

  // Meta descriptions per sub-page
  const META_DESCS = {
    '/markets':             'Live global market indexes. 30+ markets across Asia, Europe and Americas. Real-time prices for Indian traders.',
    '/sentiment':           'India market sentiment — FII/DII flows, Nifty heatmap, Fear & Greed index. Live institutional data.',
    '/fno':                 'F&O live data — VIX, expiry countdown, pivot points, option strategy cheat codes for Nifty and Bank Nifty.',
    '/fno/overview':        'F&O Overview — India VIX, expiry countdown, pivot points and rollover meter for Nifty and Bank Nifty.',
    '/fno/strategy':        '30+ option strategies with payoff charts, Greeks and live VIX context. Long Straddle, Iron Condor, Credit Spreads and more.',
    '/fno/learn':           'Learn every option strategy — how it works, when to use it, max profit/loss and real Nifty examples.',
    '/fno/reference':       'F&O reference — expiry calendar, lot sizes, margin requirements and theta decay tables.',
    '/brokers':             'Indian broker charges compared — every fee calculated. Zerodha vs Dhan vs Groww vs Angel One.',
    '/brokers/rankings':    'Indian broker rankings by total cost on ₹50K delivery trade. All charges included — brokerage, DP, AMC, govt.',
    '/brokers/compare':     'Compare any two Indian brokers head to head — per-trade cost, annual cost by profile, all charges.',
    '/brokers/charges':     'Complete Indian broker charge guide — delivery, intraday, F&O, DP, AMC, MTF, settlement charges explained.',
    '/brokers/calculator':  'Brokerage calculator — calculate exact charges for any trade size across 15+ Indian brokers.',
    '/calc':                'Risk calculator for Indian traders — position sizing, stop loss, risk/reward, drawdown recovery.',
    '/calc/calculators':    'Trading risk calculators — position size, max loss per trade, stop loss distance, risk reward ratio.',
    '/calc/recovery':       'The recovery trap — why a 50% loss needs 100% gain to recover. Visual drawdown calculator.',
    '/calc/principles':     '5 laws of risk management every Indian trader must know. Patterns from thousands of trading outcomes.',
    '/gold':                'Live gold and silver prices — spot price, USD/oz, INR/10g. MCX gold live.',
    '/ipo':                 'IPO tracker — upcoming IPOs, GMP, subscription status and allotment dates.',
    '/insights':            'Daily market insights — AI-powered write-up, FII/DII flows, intraday bias and key levels for Nifty.',
  };

  // Called by sub-pages when switching tabs
  const navigateSub = (path, title) => {
    window.history.pushState({}, '', path);
    document.title = title || 'indexes.live';
    // Update meta description
    const desc = META_DESCS[path];
    if (desc) {
      let tag = document.querySelector('meta[name="description"]');
      if (tag) tag.setAttribute('content', desc);
    }
  };

  const selectedMarket = selectedId ? MARKETS.find(m => m.id === selectedId) : null;
  const isFullPage = FULL_PAGES.has(view);

  return (
    <div className="app" onClick={e => {
      const card = e.target.closest('[data-market-id]');
      if (card) setSelectedId(card.dataset.marketId);
    }}>
      <Header lastUpdate={lastUpdate} view={view} setView={navigate} />

      <div className="app-content">
      <Suspense fallback={<PageSpinner />}>
        {isFullPage ? (
          view === 'fno'       ? <FnOPage data={data} nseData={nseData} initialTab={initialTab} navigateSub={navigateSub} /> :
          view === 'gold'      ? <GoldPage /> :
          view === 'ipo'       ? <IpoPage /> :
          view === 'calc'      ? <RiskCalcPage initialTab={initialTab} navigateSub={navigateSub} /> :
          view === 'insights'  ? <InsightsPage data={data} nseData={nseData} /> :
          view === 'brokers'   ? <BrokersPage initialTab={initialTab} navigateSub={navigateSub} /> :
          null
        ) : (
          <>
            <Ticker data={data} />
            <WorldClocks />
            {view !== 'bubble' && <HeroSection data={data} region={region} nseData={nseData} />}
            {view !== 'bubble' && <WorldBenchmarks data={data} region={region} nseData={nseData} />}
            {view === 'grid'   && <MarketGrid data={data} nseData={nseData} />}
            {view === 'bubble' && <SentimentTop data={data} nseData={nseData} />}
            {view === 'bubble' && (
              <div className="sentiment-bubble-row">
                <div className="sentiment-bubble-main"><BubbleView data={data} /></div>
                <div className="sentiment-fiidii-panel">
                  <div className="sentiment-fiidii-hdr">🇮🇳 FII / DII Flow</div>
                  <FiiDii />
                </div>
              </div>
            )}
            {view === 'bubble' && <IndiaHeatmap />}
          </>
        )}
      </Suspense>
      </div>

      <Footer />

      {selectedMarket && (
        <IndexModal market={selectedMarket} data={data} nseData={nseData} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
