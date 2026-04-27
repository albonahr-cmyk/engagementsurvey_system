const { queryDB, updatePage, P } = require('../lib/notion');
const { setCors, authenticate } = require('../lib/auth');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 認証: 管理者セッション or シークレットキー（GAS用）のどちらかが必要
  const user = authenticate(req);
  const isAdmin = user && user.role === 'admin';

  if (!isAdmin) {
    const secret = req.headers['x-mail-secret'] || '';
    const envSecret = (process.env.MAIL_API_SECRET || '').trim();
    if (!envSecret || secret.length !== envSecret.length ||
        !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(envSecret))) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
  }

  try {
    if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

    const results = await queryDB('employees', {
      and: [
        { property: 'isActive', checkbox: { equals: true } },
        { property: 'mailExcluded', checkbox: { equals: false } },
      ],
    });

    let count = 0;
    const tokens = [];

    for (const page of results) {
      const empId = P.readRich(page.properties.empId);
      const role = P.readSelect(page.properties.role);
      if (!empId || role === 'admin') continue;

      const token = crypto.randomBytes(24).toString('base64url');
      await updatePage(page.id, { surveyToken: P.rich(token) });
      tokens.push({ empId, token });
      count++;
    }

    return res.json({ ok: true, count, tokens });
  } catch (e) {
    console.error('generate-tokens error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
