const { queryDB, updatePage, P } = require('../lib/notion');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res, 'admin');
  if (!user) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    const { empId, month } = req.body;
    if (!empId || !month) return res.status(400).json({ ok: false, error: 'empId and month required' });
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ ok: false, error: 'invalid month format' });

    // surveys DBから該当レコードを検索して superseded フラグを立てる（削除しない）
    const existing = await queryDB('surveys', {
      and: [
        { property: 'empId', rich_text: { equals: empId } },
        { property: 'month', rich_text: { equals: month } },
      ],
    });

    for (const page of existing) {
      await updatePage(page.id, { superseded: P.checkbox(true) });
    }

    return res.json({ ok: true, superseded: existing.length });
  } catch (e) {
    console.error('survey-reset error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
