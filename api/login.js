const { queryDB, P, json, optionsResponse } = require('./notion');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).setHeader('Access-Control-Allow-Origin', '*').setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS').setHeader('Access-Control-Allow-Headers', 'Content-Type').end();

  try {
    const { empId, password } = req.method === 'POST' ? req.body : req.query;
    if (!empId || !password) return res.status(400).json({ ok: false, error: 'empId and password required' });

    // Auth DBから該当社員を検索
    const authResults = await queryDB('auth', {
      property: 'empId', rich_text: { equals: empId },
    });
    if (authResults.length === 0) return res.json({ ok: false, error: 'not_found' });

    const authPage = authResults[0];
    const storedHash = P.readRich(authPage.properties.passwordHash);
    const role = P.readSelect(authPage.properties.role) || 'employee';

    // パスワード検証
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    if (storedHash !== inputHash) return res.json({ ok: false, error: 'invalid_password' });

    // 社員情報取得
    const empResults = await queryDB('employees', {
      property: 'empId', rich_text: { equals: empId },
    });
    const emp = empResults[0];
    const name = emp ? P.readTitle(emp.properties.name) : '';
    const dept = emp ? P.readSelect(emp.properties.dept) : '';

    // セッショントークン生成
    const token = crypto.randomBytes(32).toString('hex');

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.json({
      ok: true, token, role, empId, name, dept,
    });
  } catch (e) {
    console.error('login error:', e);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ ok: false, error: e.message });
  }
};
