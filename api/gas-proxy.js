const { requireAuth } = require('../lib/auth');
const { queryDB, P } = require('../lib/notion');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res, 'admin');
  if (!user) return;

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const { gasUrl, token, action, params } = req.body || {};
    if (!gasUrl || typeof gasUrl !== 'string') return res.status(400).json({ ok: false, error: 'gasUrl required' });
    if (!action || typeof action !== 'string') return res.status(400).json({ ok: false, error: 'action required' });
    if (!/^https:\/\/script\.google\.com\//.test(gasUrl)) return res.status(400).json({ ok: false, error: 'invalid gasUrl' });

    // sendMails 前に Vercel 側で配信対象を事前検証（空ならGASを呼ばず分かりやすいエラーを返す）
    if (action === 'sendMails') {
      const pre = await queryDB('employees', {
        and: [
          { property: 'isActive', checkbox: { equals: true } },
          { property: 'mailExcluded', checkbox: { equals: false } },
        ],
      });
      const targets = pre
        .map(p => ({ empId: P.readRich(p.properties.empId), email: P.readRich(p.properties.email) }))
        .filter(e => e.email);
      if (targets.length === 0) {
        return res.status(200).json({
          ok: false,
          error: `配信対象が0名です（isActive=true かつ mailExcluded=false かつ メール登録ありの社員が見つかりません。Notionの社員DBを確認してください）`,
        });
      }
    }

    const qs = new URLSearchParams({ action });
    if (token) qs.set('token', token);
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) qs.set(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }

    const url = gasUrl + '?' + qs.toString();
    const gasRes = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text = await gasRes.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'GAS returned non-JSON', preview: text.substring(0, 300) });
    }

    // GASが「社員がいません」エラーを返した場合、Vercel側で直接Notion接続してヒントを付与
    if (data && !data.ok && /メールアドレス.*社員がいません|empList.*empty|fetchEmployees/i.test(data.error || '')) {
      const envSecretConfigured = !!(process.env.MAIL_API_SECRET || '').trim();
      data.hint = envSecretConfigured
        ? 'GAS→Vercel通信でMAIL_API_SECRETの値が一致していない可能性があります。GASスクリプトプロパティとVercel環境変数の値を比較してください'
        : 'VercelにMAIL_API_SECRETが設定されていません';
    }

    return res.status(200).json(data);
  } catch (e) {
    console.error('gas-proxy error:', e);
    return res.status(500).json({ ok: false, error: e.message || 'internal_error' });
  }
};
