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
import IndexModal from './components/IndexModal';
import GoldPage from './components/GoldPage';
import Footer from './components/Footer';
import { MARKETS } from './data/markets';

export default function App() {
  const region = useMemo(() => detectRegion(), []);
  const { data, lastUpdate, nseData } = useMarketData();
  const [view, setView]           = useState('grid');
  const [selectedId, setSelectedId] = useState(null);

  const selectedMarket = selectedId ? MARKETS.find(m => m.id === selectedId) : null;

  return (
    <div className="app" onClick={e => {
      // Bubble up clicks from cards
      const card = e.target.closest('[data-market-id]');
      if (card) setSelectedId(card.dataset.marketId);
    }}>
      <Header lastUpdate={lastUpdate} view={view} setView={setView} />
      <Ticker data={data} />
      <WorldClocks />
      {view === 'gold' ? (
        <GoldPage />
      ) : view === 'fno' ? (
        <FnOPage />
      ) : (
        <>
          <HeroSection data={data} region={region} nseData={nseData} />
          <WorldBenchmarks data={data} region={region} />
          {view === 'grid'   && <MarketGrid data={data} nseData={nseData} />}
          {view === 'bubble' && <BubbleView data={data} />}
        </>
      )}
      <Footer />

      {selectedMarket && (
        <IndexModal
          market={selectedMarket}
          data={data}
          nseData={nseData}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
