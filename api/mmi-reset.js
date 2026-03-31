// One-time cache bust for mmi_data_v1
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { kv } = await import('@vercel/kv');
    await kv.del('mmi_data_v1');
    res.json({ success: true, message: 'mmi_data_v1 deleted. Hit /api/nse-india to rebuild.' });
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
}
