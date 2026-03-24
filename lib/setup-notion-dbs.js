#!/usr/bin/env node
/**
 * Notion DB セットアップスクリプト
 * 使い方:
 *   NOTION_API_KEY=secret_xxx NOTION_PARENT_PAGE_ID=xxxxxx node api/setup-notion-dbs.js
 *
 * NOTION_PARENT_PAGE_ID: DBを作成する親ページのID
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const API_KEY = process.env.NOTION_API_KEY;
const PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!API_KEY || !PARENT_PAGE_ID) {
  console.error('環境変数 NOTION_API_KEY と NOTION_PARENT_PAGE_ID を設定してください');
  process.exit(1);
}

function headers() {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function createDB(title, properties) {
  const res = await fetch(`${NOTION_API}/databases`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
      title: [{ text: { content: title } }],
      properties,
    }),
  });
  const data = await res.json();
  if (!res.ok) { console.error(`❌ ${title}:`, data); return null; }
  console.log(`✅ ${title}: ${data.id}`);
  return data.id;
}

async function main() {
  console.log('Notion DBを作成中...\n');

  const empId = await createDB('ES_Employees', {
    name: { title: {} },
    empId: { rich_text: {} },
    dept: { select: {} },
    role: { select: { options: [{ name: 'employee' }, { name: 'admin' }] } },
    iq: { number: {} },
    battlePower: { number: {} },
    mbti: { rich_text: {} },
    isActive: { checkbox: {} },
    issuedAt: { rich_text: {} },
  });

  const surveyId = await createDB('ES_Surveys', {
    title: { title: {} },
    empId: { rich_text: {} },
    month: { rich_text: {} },
    answers: { rich_text: {} },
    submittedAt: { date: {} },
  });

  const settingsId = await createDB('ES_Settings', {
    key: { title: {} },
    value: { rich_text: {} },
  });

  const authId = await createDB('ES_Auth', {
    title: { title: {} },
    empId: { rich_text: {} },
    passwordHash: { rich_text: {} },
    role: { select: { options: [{ name: 'employee' }, { name: 'admin' }] } },
  });

  console.log('\n--- Vercel環境変数に設定してください ---');
  console.log(`NOTION_API_KEY=${API_KEY}`);
  if (empId) console.log(`NOTION_DB_EMPLOYEES=${empId}`);
  if (surveyId) console.log(`NOTION_DB_SURVEYS=${surveyId}`);
  if (settingsId) console.log(`NOTION_DB_SETTINGS=${settingsId}`);
  if (authId) console.log(`NOTION_DB_AUTH=${authId}`);
}

main().catch(console.error);
