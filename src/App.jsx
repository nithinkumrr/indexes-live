import { useMemo } from 'react';
import { useMarketData } from './hooks/useMarketData';
import { detectRegion } from './data/markets';
import Header from './components/Header';
import Ticker from './components/Ticker';
import WorldClocks from './components/WorldClocks';
import HeroSection from './components/HeroSection';
import WorldBenchmarks from './components/WorldBenchmarks';
import MarketGrid from './components/MarketGrid';
import Footer from './components/Footer';

export default function App() {
  const region = useMemo(() => detectRegion(), []);
  const { data, loading, lastUpdate, usingSimulation } = useMarketData();
  return (
    <div className="app">
      <Header lastUpdate={lastUpdate} usingSimulation={usingSimulation} />
      <Ticker data={data} />
      <WorldClocks />
      <HeroSection data={data} region={region} />
      <WorldBenchmarks data={data} region={region} />
      <MarketGrid data={data} />
      <Footer usingSimulation={usingSimulation} />
    </div>
  );
}
