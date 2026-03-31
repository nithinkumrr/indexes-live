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

  // Called by sub-pages when switching tabs
  const navigateSub = (path, title) => {
    window.history.pushState({}, '', path);
    document.title = title || 'indexes.live';
  };

  const selectedMarket = selectedId ? MARKETS.find(m => m.id === selectedId) : null;
  const isFullPage = FULL_PAGES.has(view);

  return (
    <div className="app" onClick={e => {
      const card = e.target.closest('[data-market-id]');
      if (card) setSelectedId(card.dataset.marketId);
    }}>
      <Header lastUpdate={lastUpdate} view={view} setView={navigate} />

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

      <Footer />

      {selectedMarket && (
        <IndexModal market={selectedMarket} data={data} nseData={nseData} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
