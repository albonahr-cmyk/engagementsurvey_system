const { queryDB } = require('../lib/notion');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const { empId, month } = req.method === 'POST' ? req.body : req.query;
    if (!empId || !month) return res.status(400).json({ ok: false, error: 'empId and month required' });

    const results = await queryDB('surveys', {
      and: [
        { property: 'empId', rich_text: { equals: empId } },
        { property: 'month', rich_text: { equals: month } },
      ],
    });

    return res.json({ submitted: results.length > 0 });
  } catch (e) {
    console.error('check error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
