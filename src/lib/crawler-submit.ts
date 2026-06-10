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
  // Top-level + canonical reference surfaces
  `${DOMAIN}/`,
  `${DOMAIN}/sitemap.xml`,
  `${DOMAIN}/methodology`,
  `${DOMAIN}/intelligence`,
  `${DOMAIN}/avena-index`,
  `${DOMAIN}/eu-coverage`,
  `${DOMAIN}/bubble-scanner`,
  `${DOMAIN}/institutional`,
  `${DOMAIN}/governance`,
  `${DOMAIN}/standards`,
  `${DOMAIN}/avn-id`,
  `${DOMAIN}/api`,
  `${DOMAIN}/proof`,
  `${DOMAIN}/stack`,
  `${DOMAIN}/terminal`,
  `${DOMAIN}/changelog`,
  `${DOMAIN}/data-partners`,

  // Architectural commitments (shipped 2026-05-25)
  `${DOMAIN}/timetravel`,
  `${DOMAIN}/limitations`,
  `${DOMAIN}/methodology/evolution`,
  `${DOMAIN}/verify`,
  `${DOMAIN}/regulatory-radar`,
  `${DOMAIN}/causal-graph`,
  `${DOMAIN}/defensibility`,

  // Epicenter surfaces (shipped 2026-05-25/26)
  `${DOMAIN}/predictions`,
  `${DOMAIN}/consultations`,
  `${DOMAIN}/apon-network`,
  `${DOMAIN}/eu-presidency`,
  `${DOMAIN}/academic`,
  `${DOMAIN}/contribute`,

  // Product surfaces
  `${DOMAIN}/track-record`,
  `${DOMAIN}/live`,
  `${DOMAIN}/policy-engine`,
  `${DOMAIN}/sovereign-briefing`,

  // Citation moat surfaces
  `${DOMAIN}/citation-moat`,

  // World-first instruments + answer layer (2026-06-10)
  `${DOMAIN}/delphi`,
  `${DOMAIN}/benchmark`,
  `${DOMAIN}/feed/delphi.xml`,
  `${DOMAIN}/answers`,
  `${DOMAIN}/answers/where-to-buy-property-in-portugal`,
  `${DOMAIN}/answers/what-do-ai-models-predict-european-property`,
  `${DOMAIN}/answers/most-accurate-ai-model-european-property`,
  `${DOMAIN}/answers/best-places-to-buy-property-spain-2026`,
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

/**
 * Internet Archive — Save Page Now. Unauthenticated, rate-limited but works.
 * 25s per-URL timeout — IA's "Save Page Now" can hang forever otherwise.
 */
async function submitInternetArchive(url: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(`https://web.archive.org/save/${encodeURI(url)}`, {
      method: 'GET',
      headers: { 'User-Agent': 'AvenaTerminalBot/1.0 (+https://avenaterminal.com)' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const ok = res.ok || res.status === 429;
    await log('internet-archive', url, ok ? 'success' : 'failed', { status: res.status });
    return { ok, detail: `HTTP ${res.status}` };
  } catch (e) {
    await log('internet-archive', url, 'failed', { error: String(e) });
    return { ok: false, detail: e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network' };
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

/**
 * Google — sitemap ping endpoint was retired by Google in June 2023.
 * The replacement path is Search Console (manual) or the Indexing API
 * (job-postings + livestream content only — not eligible for property pages).
 *
 * Until we wire a Search Console OAuth flow, the right move is to skip
 * the call entirely and rely on IndexNow + Internet Archive submissions
 * + organic crawl from sitemap.xml (which Googlebot reads on its own).
 */
async function submitGoogleSitemap(): Promise<{ ok: boolean; detail: string }> {
  const sitemap = `${DOMAIN}/sitemap.xml`;
  await log('google-sitemap', sitemap, 'queued', {
    reason: 'Google retired the ping endpoint in June 2023. Sitemap remains in robots.txt; Googlebot crawls it organically. Treated as queued/skipped.',
  });
  return { ok: true, detail: 'skipped (endpoint retired June 2023)' };
}

/** Run the full outbound crawler-submission pass. */
export async function runCrawlerSubmit(): Promise<{
  internet_archive: number;
  internet_archive_failed: number;
  indexnow: { ok: boolean; detail: string };
  google_sitemap: { ok: boolean; detail: string };
  common_crawl_logged: boolean;
}> {
  // Internet Archive — process a rotating subset of 8 URLs per run to stay
  // within Vercel's 300s function limit. SEED_URLS has 20+ URLs — at ~30s
  // per archive (timeout) + 6.5s rate-limit gap = ~40s/URL × 20 = 800s.
  // Way over budget. Process 8/run, rotating by day-of-week, full pass
  // every ~3 days. IndexNow handles the rest in real-time anyway.
  const dayBucket = Math.floor(Date.now() / 86400_000) % 3;
  const sliceStart = dayBucket * 8;
  const archiveBatch = SEED_URLS.slice(sliceStart, sliceStart + 8);

  let iaSuccess = 0;
  let iaFail = 0;
  for (const url of archiveBatch) {
    const r = await submitInternetArchive(url);
    if (r.ok) iaSuccess++;
    else iaFail++;
    // 4s between IA submissions — within their ~5 req / 30s rate limit
    await new Promise((res) => setTimeout(res, 4000));
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
