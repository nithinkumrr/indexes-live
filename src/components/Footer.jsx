// src/components/Footer.jsx
export default function Footer({ usingSimulation }) {
  return (
    <footer className="footer">
      <div className="footer-left">
        <span className="footer-brand">indexes.live</span>
        <span className="footer-sep">·</span>
        <span>
          {usingSimulation
            ? 'Prices are simulated · Deploy to Vercel for live data via Yahoo Finance'
            : 'Data via Yahoo Finance · 20s refresh · Market hours are local exchange time'}
        </span>
      </div>
      <div className="footer-right">
        Built for Indian traders · All times IST primary
      </div>
    </footer>
  );
}
