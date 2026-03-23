// src/App.jsx
import { useMarketData } from './hooks/useMarketData';
import Header from './components/Header';
import Ticker from './components/Ticker';
import WorldClocks from './components/WorldClocks';
import CountdownTimer from './components/CountdownTimer';
import GlobalPulse from './components/GlobalPulse';
import HeroSection from './components/HeroSection';
import MarketGrid from './components/MarketGrid';
import Footer from './components/Footer';

export default function App() {
  const { data, loading, lastUpdate, usingSimulation } = useMarketData();

  return (
    <div className="app">
      <Header lastUpdate={lastUpdate} usingSimulation={usingSimulation} />
      <Ticker data={data} />
      <WorldClocks />
      <GlobalPulse data={data} />
      <CountdownTimer />
      <HeroSection data={data} />
      <MarketGrid data={data} />
      <Footer usingSimulation={usingSimulation} />
    </div>
  );
}
