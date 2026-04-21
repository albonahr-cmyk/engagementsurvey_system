const { queryDB, P } = require('../lib/notion');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res, 'admin');
  if (!user) return;

  try {
    const { month, all } = req.method === 'POST' ? req.body : req.query;

    const conditions = [];
    if (month) conditions.push({ property: 'month', rich_text: { equals: month } });
    // all=1 でない場合は最新（superseded=false）のみ
    if (!all || all !== '1') conditions.push({ property: 'superseded', checkbox: { equals: false } });

    const filter = conditions.length > 1 ? { and: conditions } : conditions.length === 1 ? conditions[0] : undefined;

    const results = await queryDB('surveys', filter);

    const data = results.map(page => {
      const props = page.properties;
      let answers = P.readRich(props.answers);
      try { answers = JSON.parse(answers); } catch (_) {}
      return {
        empId: P.readRich(props.empId),
        month: P.readRich(props.month),
        answers,
        superseded: P.readCheckbox(props.superseded),
      };
    });

    return res.json({ ok: true, data });
  } catch (e) {
    console.error('load error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
