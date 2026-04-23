const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res, 'admin');
  if (!user) return;

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const { gasUrl, token, action, params } = req.body || {};
    if (!gasUrl || typeof gasUrl !== 'string') return res.status(400).json({ ok: false, error: 'gasUrl required' });
    if (!action || typeof action !== 'string') return res.status(400).json({ ok: false, error: 'action required' });
    if (!/^https:\/\/script\.google\.com\//.test(gasUrl)) return res.status(400).json({ ok: false, error: 'invalid gasUrl' });

    const qs = new URLSearchParams({ action });
    if (token) qs.set('token', token);
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.set(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }

    const url = gasUrl + '?' + qs.toString();
    const gasRes = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text = await gasRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'GAS returned non-JSON', preview: text.substring(0, 300) });
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error('gas-proxy error:', e);
    return res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
};
