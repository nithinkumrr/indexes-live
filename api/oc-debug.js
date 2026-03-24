export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';
  const parseCookies = raw => (raw||'').split(/,(?=[^;]+=)/).map(c=>c.split(';')[0].trim()).filter(Boolean).join('; ');

  let step1cookies = '', step2cookies = '', finalStatus = 0, responseText = '';

  try {
    const r1 = await fetch('https://www.nseindia.com', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    step1cookies = parseCookies(r1.headers.get('set-cookie'));
  } catch(e) { return res.json({ error: 'step1: ' + e.message }); }

  try {
    const r2 = await fetch('https://www.nseindia.com/option-chain', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.nseindia.com/', Cookie: step1cookies }
    });
    step2cookies = parseCookies(r2.headers.get('set-cookie'));
  } catch(e) { step2cookies = 'failed: ' + e.message; }

  await new Promise(r => setTimeout(r, 300));

  const allCookies = step1cookies + (step2cookies ? '; ' + step2cookies : '');
  try {
    const r3 = await fetch('https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY', {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://www.nseindia.com/option-chain', 'X-Requested-With': 'XMLHttpRequest', Cookie: allCookies }
    });
    finalStatus = r3.status;
    responseText = await r3.text();
  } catch(e) { responseText = 'fetch error: ' + e.message; }

  return res.json({
    step1cookies: step1cookies.substring(0, 200),
    step2cookies: step2cookies.substring(0, 200),
    finalStatus,
    responsePreview: responseText.substring(0, 500),
  });
}
