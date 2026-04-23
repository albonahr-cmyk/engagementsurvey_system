const { queryDB, P } = require('../lib/notion');
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
      return res.status(403).json({ ok: false, error: 'forbidden', hint: !envSecret ? 'MAIL_API_SECRET not configured on Vercel' : 'secret mismatch' });
    }
  }

  try {
    const results = await queryDB('employees', {
      and: [
        { property: 'isActive', checkbox: { equals: true } },
        { property: 'mailExcluded', checkbox: { equals: false } },
      ],
    });

    const data = results
      .map(page => {
        const p = page.properties;
        return {
          empId: P.readRich(p.empId),
          name: P.readTitle(p.name),
          dept: P.readSelect(p.dept),
          email: P.readRich(p.email),
          surveyToken: P.readRich(p.surveyToken),
        };
      })
      .filter(e => e.email); // メアド登録済みのみ

    return res.json({ ok: true, data });
  } catch (e) {
    console.error('mail-employees error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
