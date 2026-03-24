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
import Footer from './components/Footer';

export default function App() {
  const region = useMemo(() => detectRegion(), []);
  const { data, lastUpdate } = useMarketData();
  const [view, setView] = useState('grid'); // 'grid' | 'bubble' | 'fno'

  const isFnO = view === 'fno';

  return (
    <div className="app">
      <Header lastUpdate={lastUpdate} view={view} setView={setView} />
      {/* Ticker + clocks always visible */}
      <Ticker data={data} />
      <WorldClocks />

      {isFnO ? (
        <FnOPage />
      ) : (
        <>
          <HeroSection data={data} region={region} />
          <WorldBenchmarks data={data} region={region} />
          {view === 'grid'   && <MarketGrid data={data} />}
          {view === 'bubble' && <BubbleView data={data} />}
        </>
      )}

      <Footer />
    </div>
  );
}
