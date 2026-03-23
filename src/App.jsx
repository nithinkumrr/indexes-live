import { useMemo, useState } from 'react';
import { useMarketData } from './hooks/useMarketData';
import { detectRegion } from './data/markets';
import Header from './components/Header';
import Ticker from './components/Ticker';
import WorldClocks from './components/WorldClocks';
import HeroSection from './components/HeroSection';
import WorldBenchmarks from './components/WorldBenchmarks';
import MarketGrid from './components/MarketGrid';
import WorldMapView from './components/WorldMapView';
import Footer from './components/Footer';

export default function App() {
  const region = useMemo(() => detectRegion(), []);
  const { data, loading, lastUpdate, usingSimulation } = useMarketData();
  const [view, setView] = useState('grid'); // 'grid' | 'map'

  return (
    <div className="app">
      <Header lastUpdate={lastUpdate} usingSimulation={usingSimulation} view={view} setView={setView} />
      <Ticker data={data} />
      <WorldClocks />
      <HeroSection data={data} region={region} />
      <WorldBenchmarks data={data} region={region} />
      {view === 'grid'
        ? <MarketGrid data={data} />
        : <WorldMapView data={data} />
      }
      <Footer />
    </div>
  );
}
