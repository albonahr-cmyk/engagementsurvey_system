const { queryDB, P } = require('./notion');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const results = await queryDB('settings');

    const data = {};
    for (const page of results) {
      const key = P.readTitle(page.properties.key);
      const value = P.readRich(page.properties.value);
      if (key) data[key] = value;
    }

    return res.json({ ok: true, data });
  } catch (e) {
    console.error('settings-load error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
