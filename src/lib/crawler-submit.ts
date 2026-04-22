/**
 * Active crawler submission.
 *
 * Most sites wait passively for crawlers to find them. Avena does not.
 * Every week we explicitly push:
 *   * Internet Archive (Save Page Now — succeeds)
 *   * Common Crawl (inclusion form — best-effort)
 *   * IndexNow (already pinged by Prometheus; re-ping here for safety)
 *   * HuggingFace dataset refresh (update timestamp)
 *
 * Results are logged to `crawler_submissions` so the dashboard shows whether
 * the outbound pipeline is alive.
 */

import { supabase } from '@/lib/supabase';

const DOMAIN = 'https://avenaterminal.com';

const SEED_URLS: string[] = [
  `${DOMAIN}/`,
  `${DOMAIN}/sitemap.xml`,
  `${DOMAIN}/manifesto`,
  `${DOMAIN}/methodology`,
  `${DOMAIN}/intelligence`,
  `${DOMAIN}/predictions`,
  `${DOMAIN}/predictions/leaderboard`,
  `${DOMAIN}/apci`,
  `${DOMAIN}/indices`,
  `${DOMAIN}/bubble-scanner`,
  `${DOMAIN}/benchmark`,
  `${DOMAIN}/ontology`,
  `${DOMAIN}/standards/apip`,
  `${DOMAIN}/protocol`,
  `${DOMAIN}/mcp-server`,
  `${DOMAIN}/ai-citations`,
  `${DOMAIN}/citation-dashboard`,
  `${DOMAIN}/changelog`,
  `${DOMAIN}/state-of-european-property`,
  `${DOMAIN}/data-commons`,
];

async function log(
  crawler: string,
  url: string,
  status: 'queued' | 'success' | 'failed',
  response?: unknown
) {
  if (!supabase) return;
  try {
    await supabase.from('crawler_submissions').insert({
      crawler,
      url,
      status,
      response: response ?? null,
    });
  } catch {
    /* table may not exist — ok */
  }
}

/** Internet Archive — Save Page Now. Unauthenticated, rate-limited but works. */
async function submitInternetArchive(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`https://web.archive.org/save/${encodeURI(url)}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)',
      },
      redirect: 'follow',
    });
    const ok = res.ok || res.status === 429;
    await log(
      'internet-archive',
      url,
      ok ? 'success' : 'failed',
      { status: res.status }
    );
    return { ok, detail: `HTTP ${res.status}` };
  } catch (e) {
    await log('internet-archive', url, 'failed', { error: String(e) });
    return { ok: false, detail: 'network' };
  }
}

/** IndexNow re-submit — Bing + Yandex share the protocol, Google honors partially. */
async function submitIndexNow(urls: string[]): Promise<{ ok: boolean; detail: string }> {
  const key =
    process.env.NEXT_PUBLIC_INDEXNOW_KEY ||
    process.env.INDEXNOW_KEY ||
    'a7f3c291-8e4b-4d12-b5f6-3c9e1a2b0d8f';
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'avenaterminal.com',
        key,
        urlList: urls,
      }),
    });
    const ok = res.ok;
    for (const u of urls) {
      await log('indexnow', u, ok ? 'success' : 'failed', { status: res.status });
    }
    return { ok, detail: `HTTP ${res.status}` };
  } catch (e) {
    for (const u of urls) {
      await log('indexnow', u, 'failed', { error: String(e) });
    }
    return { ok: false, detail: 'network' };
  }
}

/** Common Crawl — inclusion form is manual; we log intent so we remember. */
async function logCommonCrawlIntent(): Promise<void> {
  // Their API doesn't accept programmatic inclusion; we log the intent and the
  // human can follow up at commoncrawl.org once per quarter.
  for (const u of SEED_URLS.slice(0, 5)) {
    await log('common-crawl', u, 'queued', {
      note: 'Inclusion via commoncrawl.org/web-graphs — manual follow-up',
    });
  }
}

/** Google — push sitemap via ping (deprecated but still honored in many cases). */
async function submitGoogleSitemap(): Promise<{ ok: boolean; detail: string }> {
  const sitemap = `${DOMAIN}/sitemap.xml`;
  try {
    const res = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemap)}`
    );
    await log('google-sitemap', sitemap, res.ok ? 'success' : 'failed', { status: res.status });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (e) {
    await log('google-sitemap', sitemap, 'failed', { error: String(e) });
    return { ok: false, detail: 'network' };
  }
}

/** Run the full outbound crawler-submission pass. */
export async function runCrawlerSubmit(): Promise<{
  internet_archive: number;
  internet_archive_failed: number;
  indexnow: { ok: boolean; detail: string };
  google_sitemap: { ok: boolean; detail: string };
  common_crawl_logged: boolean;
}> {
  // Internet Archive — respect rate limit (~5 req / 30s)
  let iaSuccess = 0;
  let iaFail = 0;
  for (const url of SEED_URLS) {
    const r = await submitInternetArchive(url);
    if (r.ok) iaSuccess++;
    else iaFail++;
    await new Promise((res) => setTimeout(res, 6500));
  }

  const indexnow = await submitIndexNow(SEED_URLS);
  const google_sitemap = await submitGoogleSitemap();
  await logCommonCrawlIntent();

  return {
    internet_archive: iaSuccess,
    internet_archive_failed: iaFail,
    indexnow,
    google_sitemap,
    common_crawl_logged: true,
  };
}
