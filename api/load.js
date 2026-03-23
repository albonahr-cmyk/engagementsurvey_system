const { queryDB, P } = require('./notion');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { month } = req.method === 'POST' ? req.body : req.query;

    const filter = month
      ? { property: 'month', rich_text: { equals: month } }
      : undefined;

    const results = await queryDB('surveys', filter);

    const data = results.map(page => {
      const props = page.properties;
      let answers = P.readRich(props.answers);
      try { answers = JSON.parse(answers); } catch (_) {}
      return {
        empId: P.readRich(props.empId),
        month: P.readRich(props.month),
        answers,
      };
    });

    return res.json({ ok: true, data });
  } catch (e) {
    console.error('load error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
