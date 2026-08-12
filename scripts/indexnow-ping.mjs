#!/usr/bin/env node
/**
 * IndexNow nightly ping — the Bing backdoor.
 *
 * ChatGPT Search and Copilot retrieve from Bing's index, and Bing supports
 * IndexNow: pinged URLs get recrawled same-day. Avena's data changes every
 * night, so every night we tell Bing exactly which pages are fresh. This
 * exploits the measured 7-day AI-citation freshness window permanently.
 *
 * Purely outbound: reads public/data.json, POSTs a URL list to
 * api.indexnow.org. Touches no crawler-facing file. Google ignores IndexNow
 * (it reads our sitemap lastmod instead) — this is Bing/Yandex/Seznam/Naver.
 *
 * Pinged nightly: home, index, stats, all town pages, answers, and the
 * property pages whose data is freshest. IndexNow accepts up to 10,000 URLs
 * per POST; we stay well under.
 *
 * Run: node scripts/indexnow-ping.mjs  (after the nightly data refresh)
 */
import { readFileSync } from 'node:fs';

const HOST = 'avenaterminal.com';
const BASE = `https://${HOST}`;
const KEY = '4f84907ad33847609c8245f3f3b44908'; // public by protocol design; served at /<key>.txt

const book = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url)));

const towns = new Set();
for (const p of book) {
  const town = (p.l || '').split(',')[0].trim();
  if (town) towns.add(town.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, ''));
}

const urls = [
  `${BASE}/`,
  `${BASE}/avena-index`,
  `${BASE}/statistics`,
  `${BASE}/deals`,
  `${BASE}/answers`,
  ...[...towns].map((t) => `${BASE}/towns/${t}`),
  // Property pages: all refs — the nightly refresh touches every one
  // (score/price recomputed), and we are far under the 10k cap.
  ...book.filter((p) => p.ref).map((p) => `${BASE}/property/${p.ref}`),
];

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${BASE}/${KEY}.txt`, urlList: urls }),
});

// 200/202 = accepted. Anything else is loud — a silent indexing failure is
// the recurring bug shape in this codebase.
console.log(`indexnow: ${res.status} — ${urls.length} URLs (${towns.size} towns, ${book.length} properties)`);
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
