import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom'],
          'chart':         ['chart.js'],
          'brokers':       ['./src/components/BrokersPage.jsx'],
          'calculators':   ['./src/components/CalcHubPage.jsx'],
          'fno':           ['./src/components/FnOPage.jsx', './src/components/StrategyPage.jsx'],
          'risk':          ['./src/components/RiskCalcPage.jsx'],
          'insights':      ['./src/components/InsightsPage.jsx'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
