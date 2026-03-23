const { queryDB, createPage, updatePage, P } = require('./notion');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { key, value } = req.method === 'POST' ? req.body : req.query;
    if (!key) return res.status(400).json({ ok: false, error: 'key required' });

    // 既存キーを検索
    const existing = await queryDB('settings', {
      property: 'key', title: { equals: key },
    });

    if (existing.length > 0) {
      // 更新（空値なら削除扱い＝アーカイブ）
      if (value === '' || value === null || value === undefined) {
        await updatePage(existing[0].id, {}, true);
      } else {
        await updatePage(existing[0].id, { value: P.rich(value) });
      }
    } else if (value && value !== '') {
      // 新規作成
      await createPage('settings', {
        key: P.title(key),
        value: P.rich(value),
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('settings-save error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};
