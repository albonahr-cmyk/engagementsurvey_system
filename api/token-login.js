const { queryDB, updatePage, P } = require('../lib/notion');
const { createToken, setCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const surveyToken = req.method === 'POST' ? req.body.token : req.query.token;
    if (!surveyToken || surveyToken.length < 10) {
      return res.json({ ok: false, error: 'invalid_token' });
    }

    // employees DBからトークンを検索
    const results = await queryDB('employees', {
      and: [
        { property: 'surveyToken', rich_text: { equals: surveyToken } },
        { property: 'isActive', checkbox: { equals: true } },
      ],
    });

    if (results.length === 0) {
      return res.json({ ok: false, error: 'invalid_token' });
    }

    const page = results[0];
    const empId = P.readRich(page.properties.empId);
    const name = P.readTitle(page.properties.name);
    const dept = P.readSelect(page.properties.dept);
    const role = P.readSelect(page.properties.role) || 'employee';

    // 管理者アカウントはトークンログイン不可
    if (role === 'admin') {
      return res.json({ ok: false, error: 'invalid_token' });
    }

    // JWTトークン生成
    const authToken = createToken({ empId, role });

    return res.json({ ok: true, token: authToken, role, empId, name, dept });
  } catch (e) {
    console.error('token-login error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
