import { useMemo, useState } from 'react';
import { useMarketData } from './hooks/useMarketData';
import { detectRegion } from './data/markets';
import Header from './components/Header';
import Ticker from './components/Ticker';
import WorldClocks from './components/WorldClocks';
import HeroSection from './components/HeroSection';
import WorldBenchmarks from './components/WorldBenchmarks';
import MarketGrid from './components/MarketGrid';
import BubbleView from './components/BubbleView';
import FnOPage from './components/FnOPage';
import GoldPage from './components/GoldPage';
import IpoPage from './components/IpoPage';
import BrokerageCalc from './components/BrokerageCalc';
import IndexModal from './components/IndexModal';
import Footer from './components/Footer';
import { MARKETS } from './data/markets';

const FULL_PAGES = new Set(['fno', 'gold', 'ipo', 'brokerage']);

export default function App() {
  const region = useMemo(() => detectRegion(), []);
  const { data, lastUpdate, nseData } = useMarketData();
  const [view, setView]             = useState('grid');
  const [selectedId, setSelectedId] = useState(null);

  const selectedMarket = selectedId ? MARKETS.find(m => m.id === selectedId) : null;
  const isFullPage = FULL_PAGES.has(view);

  return (
    <div className="app" onClick={e => {
      const card = e.target.closest('[data-market-id]');
      if (card) setSelectedId(card.dataset.marketId);
    }}>
      <Header lastUpdate={lastUpdate} view={view} setView={setView} />

      {isFullPage ? (
        view === 'fno'       ? <FnOPage /> :
        view === 'gold'      ? <GoldPage /> :
        view === 'ipo'       ? <IpoPage /> :
        view === 'brokerage' ? <div style={{maxWidth:1100,margin:'0 auto',padding:'24px 20px'}}><BrokerageCalc /></div> :
        null
      ) : (
        <>
          <Ticker data={data} />
          <WorldClocks />
          <HeroSection data={data} region={region} nseData={nseData} />
          <WorldBenchmarks data={data} region={region} />
          {view === 'grid'   && <MarketGrid data={data} nseData={nseData} />}
          {view === 'bubble' && <BubbleView data={data} />}
        </>
      )}

      <Footer />

      {selectedMarket && (
        <IndexModal market={selectedMarket} data={data} nseData={nseData} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
