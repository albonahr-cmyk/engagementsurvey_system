const { queryDB, updatePage, P } = require('./notion');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { empId } = req.method === 'POST' ? req.body : req.query;
    if (!empId) return res.status(400).json({ ok: false, error: 'empId required' });

    // 論理削除（isActive = false）
    const existing = await queryDB('employees', {
      property: 'empId', rich_text: { equals: empId },
    });

    if (existing.length > 0) {
      await updatePage(existing[0].id, { isActive: P.checkbox(false) });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('employee-delete error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
