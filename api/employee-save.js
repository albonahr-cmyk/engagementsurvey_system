const { queryDB, createPage, updatePage, P } = require('./notion');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const body = req.method === 'POST' ? req.body : req.query;
    const { empId, name, dept, role, iq, battlePower, mbti } = body;
    if (!empId) return res.status(400).json({ ok: false, error: 'empId required' });

    // 既存社員を検索
    const existing = await queryDB('employees', {
      property: 'empId', rich_text: { equals: empId },
    });

    const props = {};
    if (name !== undefined) props.name = P.title(name);
    if (dept !== undefined) props.dept = P.select(dept);
    if (role !== undefined) props.role = P.select(role);
    if (iq !== undefined) props.iq = P.num(Number(iq));
    if (battlePower !== undefined) props.battlePower = P.num(Number(battlePower));
    if (mbti !== undefined) props.mbti = P.rich(mbti);

    if (existing.length > 0) {
      // 更新
      await updatePage(existing[0].id, props);
    } else {
      // 新規作成
      props.empId = P.rich(empId);
      props.isActive = P.checkbox(true);
      if (!props.name) props.name = P.title('');
      if (!props.issuedAt) props.issuedAt = P.rich(new Date().toISOString());
      await createPage('employees', props);
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('employee-save error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
