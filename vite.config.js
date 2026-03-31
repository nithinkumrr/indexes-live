import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React — always needed, load first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          // Chart.js — heavy, only needed on calc/broker pages
          if (id.includes('node_modules/chart.js')) {
            return 'chart';
          }
          // Split each heavy page into its own chunk
          if (id.includes('src/components/FnOPage'))      return 'page-fno';
          if (id.includes('src/components/RiskCalcPage')) return 'page-calc';
          if (id.includes('src/components/BrokersPage'))  return 'page-brokers';
          if (id.includes('src/components/InsightsPage')) return 'page-insights';
          if (id.includes('src/components/GoldPage'))     return 'page-gold';
          if (id.includes('src/components/IpoPage'))      return 'page-ipo';
          if (id.includes('src/components/BubbleView') ||
              id.includes('src/components/SentimentTop') ||
              id.includes('src/components/IndiaHeatmap') ||
              id.includes('src/components/FiiDii'))       return 'page-sentiment';
          // Everything else in node_modules goes to vendor
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 600,
    // Minify aggressively
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // Remove all console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.info'],
      },
    },
  },
})
