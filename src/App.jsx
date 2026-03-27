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

const HASH_MAP = {
  '':           'grid',
  'markets':    'grid',
  'sentiment':  'bubble',
  'fno':        'fno',
  'gold':       'gold',
  'ipo':        'ipo',
  'calc':       'calc',
};

const VIEW_HASH = {
  'grid':      'markets',
  'bubble':    'sentiment',
  'fno':       'fno',
  'gold':      'gold',
  'ipo':       'ipo',
  'calc':      'calc',
};

const FULL_PAGES = new Set(['fno', 'gold', 'ipo', 'calc']);

function getViewFromHash() {
  const hash = window.location.hash.replace('#/', '').replace('#', '').toLowerCase();
  return HASH_MAP[hash] || 'grid';
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
  const [view, setView]             = useState(getViewFromHash);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const onHash = () => setView(getViewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (v) => {
    setView(v);
    window.location.hash = '#/' + (VIEW_HASH[v] || v);
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
          view === 'fno'       ? <FnOPage data={data} nseData={nseData} /> :
          view === 'gold'      ? <GoldPage /> :
          view === 'ipo'       ? <IpoPage /> :
          view === 'calc'      ? <RiskCalcPage /> :
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
