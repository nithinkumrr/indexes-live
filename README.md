# indexes.live

Global market indexes, live. Built for Indian traders.

## What it does

- 30+ global indexes tracked across Asia, Europe, Americas, MEA
- Timezone-aware open/close/pre-market detection for every exchange
- India-first: Nifty & Sensex as heroes, IST primary clock, NSE countdown timer
- Live prices via Yahoo Finance (proxied through Vercel serverless function)
- Auto-simulates prices when API is unavailable (dev mode / rate limits)
- Dark terminal aesthetic, mobile responsive

## Deploy to Vercel (10 minutes)

### 1. Push to GitHub
```bash
# If you don't have git set up, Vercel can also import from a zip
git init
git add .
git commit -m "indexes.live v1"
git remote add origin https://github.com/YOUR_USERNAME/indexes-live.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. Click Deploy — it will work immediately with simulated data

### 3. Connect indexes.live domain
1. In Vercel project → Settings → Domains
2. Add `indexes.live` and `www.indexes.live`
3. Go to your domain registrar (wherever you bought indexes.live)
4. Add these DNS records:
   - `A` record: `@` → `76.76.21.21`
   - `CNAME` record: `www` → `cname.vercel-dns.com`
5. SSL is automatic — takes 5–10 minutes

### 4. Live data kicks in automatically
The `/api/quote.js` serverless function proxies Yahoo Finance.
No API key needed. Vercel runs it for free up to 100k requests/month.

## Local development
```bash
npm install
npm run dev
# Open http://localhost:5173
# Note: /api/quote won't work locally without Vercel CLI
# Prices will auto-simulate in dev mode — that's expected
```

### To test live data locally
```bash
npm install -g vercel
vercel dev
# Open http://localhost:3000
```

## Project structure
```
src/
  data/markets.js        ← All 30+ markets, symbols, timezones
  utils/timezone.js      ← Market open/close logic
  utils/format.js        ← Price formatting
  hooks/useMarketData.js ← Yahoo Finance fetching + simulation
  components/
    Header.jsx
    Ticker.jsx           ← Scrolling price ticker
    WorldClocks.jsx      ← 7 city clocks
    CountdownTimer.jsx   ← NSE open countdown (the hero feature)
    HeroIndia.jsx        ← Large Nifty + Sensex cards
    MarketCard.jsx       ← Individual market card
    MarketGrid.jsx       ← Grid + stats bar
    Sparkline.jsx        ← SVG sparkline
    Footer.jsx
  styles.css             ← All styling (Bloomberg dark aesthetic)
api/
  quote.js               ← Vercel serverless: proxies Yahoo Finance
```

## Phase 2 ideas (next)
- SGX Nifty futures (India pre-market signal)
- FII/DII flow tracker
- Fear & Greed indicator
- Watchlist (pin your 5 indexes)
- WhatsApp/Telegram daily digest
