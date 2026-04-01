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
const MtfPage      = lazy(() => import('./components/MtfPage'));
const DeliveryPage = lazy(() => import('./components/DeliveryPage'));

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
  '/fno':        'fno',
  '/gold':       'gold',
  '/ipo':        'ipo',
  '/calc':       'calc',
  '/insights':   'insights',
  '/brokers':    'brokers',
  '/blog':       'insights',
  '/mtf':        'mtf',
  '/delivery':   'delivery',
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
  'mtf':       '/mtf',
  'delivery':  '/delivery',
};

const FULL_PAGES = new Set(['fno', 'gold', 'ipo', 'calc', 'insights', 'brokers', 'mtf', 'delivery']);

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
    grid:     'indexes.live | Markets, F&O, IPO, Gold, Risk and Brokers',
    bubble:   'Market Sentiment | indexes.live',
    fno:      'F&O | Futures and Options | indexes.live',
    gold:     'Gold Prices Live | indexes.live',
    ipo:      'IPO Tracker | indexes.live',
    calc:     'Risk Calculator | indexes.live',
    insights: 'News & Market Insights | indexes.live',
    brokers:  'Indian Broker Charges | indexes.live',
    mtf:      'MTF Book | Margin Trading Facility | indexes.live',
    delivery: 'Top Delivery | NSE Delivery Data | indexes.live',
  };

  // Fire GA pageview
  const gaPageview = (path, title) => {
    if (window.gtag) {
      window.gtag('config', 'G-208DE1M9RR', { page_path: path, page_title: title });
    }
  };

  const navigate = (v) => {
    setView(v);
    const path = VIEW_PATH[v] || '/markets';
    const title = PAGE_TITLES[v] || 'indexes.live';
    window.history.pushState({}, '', path);
    document.title = title;
    gaPageview(path, title);
  };

  // Meta descriptions per sub-page
  const META_DESCS = {
    '/markets':             'Track 30+ global market indexes live. Real-time prices, status and changes across world markets, all in one place. Your edge starts here.',
    '/sentiment':           'Read the room before you trade. Live FII and DII flows, Nifty heatmap and Fear and Greed index. Know where the big money is moving.',
    '/fno':                 'Everything F&O traders need in one place. Live VIX, expiry countdown, pivot points and option strategy cheat codes for Nifty and Bank Nifty.',
    '/fno/overview':        'Live F&O dashboard. India VIX, expiry countdown, pivot points and rollover meter for Nifty and Bank Nifty. Updated in real time.',
    '/fno/strategy':        '30+ option strategies with payoff charts, Greeks and live VIX context. Long Straddle, Iron Condor, Credit Spreads and more. Know before you trade.',
    '/fno/learn':           'Learn every option strategy. How it works, when to use it, max profit and loss, and real Nifty examples. Build your edge from the ground up.',
    '/fno/reference':       'F&O quick reference. Expiry calendar, lot sizes, margin requirements and theta decay tables. Everything you need, nothing you do not.',
    '/brokers':             'Every Indian broker charge calculated and compared. Zerodha vs Dhan vs Groww vs Angel One. Find the broker that keeps more money in your pocket.',
    '/brokers/rankings':    'Indian brokers ranked by total cost on a 50K delivery trade. All charges included: brokerage, DP, AMC and government fees. No guesswork.',
    '/brokers/compare':     'Compare any two Indian brokers head to head. Per-trade cost, annual cost by profile and all charges. Pick the one that actually costs less.',
    '/brokers/charges':     'Complete guide to Indian broker charges. Delivery, intraday, F&O, DP, AMC, MTF and settlement fees all explained. Know every rupee you pay.',
    '/brokers/calculator':  'Calculate the exact brokerage and charges for any trade across 15+ Indian brokers. Enter your trade size. See the real cost instantly.',
    '/calc':                'Stop guessing your risk. Position sizing, stop loss distance, risk reward ratio and drawdown recovery. Built for traders who trade with discipline.',
    '/calc/calculators':    'Stop guessing your risk. Calculate position size, max loss, stop loss distance and risk reward ratio instantly. Trade with discipline, not luck.',
    '/calc/recovery':       'A 50% loss needs a 100% gain to recover. See exactly how deep the hole gets and how long it takes to climb out. Never ignore drawdown again.',
    '/calc/principles':     '5 laws of risk management every trader must know. Hard rules backed by real trading outcomes. Read them before your next trade.',
    '/gold':                'Live gold and silver prices right now. Spot price in USD per oz and INR per 10g. MCX gold live. Track the metal that never sleeps.',
    '/ipo':                 'Never miss an IPO. Upcoming listings, grey market premium, live subscription status and allotment dates. Stay ahead of every opening.',
    '/insights':            'Daily market write-up before the bell. FII and DII flows, intraday bias and key Nifty levels. Know what to watch before the market opens.',
  };

  // Called by sub-pages when switching tabs
  const navigateSub = (path, title) => {
    window.history.pushState({}, '', path);
    document.title = title || 'indexes.live';
    gaPageview(path, title || 'indexes.live');
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
          view === 'mtf'       ? <MtfPage /> :
          view === 'delivery'  ? <DeliveryPage /> :
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
