const { queryDB, updatePage, P } = require('../lib/notion');
const { requireAuth } = require('../lib/auth');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res, 'admin');
  if (!user) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

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
