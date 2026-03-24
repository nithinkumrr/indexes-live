// api/kite-auth.js
// Step 1: Redirect user to Kite login
export default function handler(req, res) {
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'KITE_API_KEY not set' });
  const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${apiKey}&v=3`;
  res.redirect(loginUrl);
}
