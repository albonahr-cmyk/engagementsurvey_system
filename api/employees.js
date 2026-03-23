const { queryDB, P } = require('./notion');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const results = await queryDB('employees');

    const data = results.map(page => {
      const p = page.properties;
      return {
        empId: P.readRich(p.empId),
        name: P.readTitle(p.name),
        dept: P.readSelect(p.dept),
        role: P.readSelect(p.role) || 'employee',
        iq: P.readNum(p.iq),
        battlePower: P.readNum(p.battlePower),
        mbti: P.readRich(p.mbti),
        isActive: P.readCheckbox(p.isActive),
        issuedAt: P.readRich(p.issuedAt),
      };
    });

    return res.json({ ok: true, data });
  } catch (e) {
    console.error('employees error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
