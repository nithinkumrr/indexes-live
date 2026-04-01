import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('BrokersPage'))    return 'brokers';
          if (id.includes('CalcHubPage'))    return 'calculators';
          if (id.includes('FnOPage') || id.includes('StrategyPage')) return 'fno';
          if (id.includes('RiskCalcPage'))   return 'risk';
          if (id.includes('InsightsPage'))   return 'insights';
          if (id.includes('node_modules/react')) return 'react-vendor';
          if (id.includes('chart.js'))       return 'chart';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
