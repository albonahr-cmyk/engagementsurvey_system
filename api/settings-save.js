const { queryDB, createPage, updatePage, P } = require('../lib/notion');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    const { key, value } = req.body;
    if (!key || typeof key !== 'string') return res.status(400).json({ ok: false, error: 'key required' });
    if (key.length > 200) return res.status(400).json({ ok: false, error: 'key too long' });
    if (value && typeof value === 'string' && value.length > 50000) return res.status(400).json({ ok: false, error: 'value too large' });

    // 一般社員は自分のBizIQ/プロフィールのみ書込可。システム設定はadmin限定
    const isPersonalKey = key.startsWith('es_biziq_') || key.startsWith('es_profile_');
    if (!isPersonalKey && user.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    // 一般社員は自分のデータのみ書き込み可（完全一致チェック）
    if (isPersonalKey && user.role !== 'admin' && key !== 'es_biziq_' + user.empId && key !== 'es_profile_' + user.empId) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const existing = await queryDB('settings', {
      property: 'key', title: { equals: key },
    });

    if (existing.length > 0) {
      if (value === '' || value === null || value === undefined) {
        // 全ての重複レコードをアーカイブ
        for (const page of existing) {
          await updatePage(page.id, {}, true);
        }
      } else {
        // 最初の1件を新しい値で更新、残りの重複レコードはアーカイブ（読み込み時の上書き問題を防ぐ）
        await updatePage(existing[0].id, { value: P.rich(value) });
        for (let i = 1; i < existing.length; i++) {
          await updatePage(existing[i].id, {}, true);
        }
      }
    } else if (value && value !== '') {
      await createPage('settings', {
        key: P.title(key),
        value: P.rich(value),
      });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('settings-save error:', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
