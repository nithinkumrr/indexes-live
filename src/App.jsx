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

// Lazy load heavy pages — only download when user navigates there
const FnOPage       = lazy(() => import('./components/FnOPage'));
const GoldPage      = lazy(() => import('./components/GoldPage'));
const IpoPage       = lazy(() => import('./components/IpoPage'));
const RiskCalcPage  = lazy(() => import('./components/RiskCalcPage'));
const BubbleView    = lazy(() => import('./components/BubbleView'));
const SentimentTop  = lazy(() => import('./components/SentimentTop'));
const IndiaHeatmap  = lazy(() => import('./components/IndiaHeatmap'));
const FiiDii        = lazy(() => import('./components/FiiDii'));

const HASH_MAP = {
  '':           'grid',
  'markets':    'grid',
  'sentiment':  'bubble',
  'fno':        'fno',
  'gold':       'gold',
  'ipo':        'ipo',
  'calc':       'calc',
};

const REVERSE_MAP = {
  'grid':   'markets',
  'bubble': 'sentiment',
  'fno':    'fno',
  'gold':   'gold',
  'ipo':    'ipo',
  'calc':   'calc',
};

const FULL_PAGES = new Set(['fno', 'gold', 'ipo', 'calc']);

// Simple spinner for lazy loaded pages
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
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    return HASH_MAP[hash] || 'grid';
  };

  const [view, setView]             = useState(getInitialView);
  const [selectedMarket, setMarket] = useState(null);
  const [region, setRegion]         = useState('india');

  const { data, nseData, loading, error } = useMarketData(region);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#', '');
      setView(HASH_MAP[hash] || 'grid');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const handleNav = (v) => {
    setView(v);
    window.location.hash = REVERSE_MAP[v] || '';
  };

  const isFullPage = FULL_PAGES.has(view);

  return (
    <div className="app-shell">
      <Header view={view} onNav={handleNav} />
      <Ticker data={data} nseData={nseData} />
      <WorldClocks />

      <Suspense fallback={<PageSpinner />}>
        {isFullPage ? (
          <div className="full-page">
            {view === 'fno'  && <FnOPage data={data} nseData={nseData} />}
            {view === 'gold' && <GoldPage />}
            {view === 'ipo'  && <IpoPage />}
            {view === 'calc' && <RiskCalcPage />}
          </div>
        ) : (
          <main className="main-content">
            <HeroSection data={data} nseData={nseData} onRegionChange={setRegion} />
            <WorldBenchmarks data={data} />
            {view === 'grid'   && <MarketGrid data={data} nseData={nseData} />}
            {view === 'bubble' && <SentimentTop data={data} nseData={nseData} />}
            {view === 'bubble' && (
              <FiiDii />
            )}
            {view === 'bubble' && <IndiaHeatmap />}
            <Footer />
          </main>
        )}
      </Suspense>

      {selectedMarket && (
        <IndexModal market={selectedMarket} onClose={() => setMarket(null)} />
      )}
    </div>
  );
}
