/**
 * Google Search Console — the measurement half of SEO.
 *
 * Until 2026-08-09 Odyssey shipped SEO changes and never saw an impression
 * number. It could say "I added schema"; it could not say whether anything
 * moved. That is the difference between an engineer and a recommendation
 * engine, and this file closes it.
 *
 * Auth is a service-account JWT signed with `jose` (already a transitive
 * dependency, no new package): mint an assertion, exchange it for an access
 * token, call the API. googleapis (~40MB, hundreds of transitive deps) would
 * be a heavy price for two endpoints.
 *
 * Every function throws rather than returning empty arrays. A failed API call
 * that reads as "zero impressions" is this project's recurring bug pointed at
 * the one dataset we added specifically in order to see clearly.
 */

import { SignJWT, importPKCS8 } from 'jose';

const SITE = 'sc-domain:avenaterminal.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function readKey(): ServiceAccountKey {
  const raw = process.env.GOOGLE_SEARCH_CONSOLE_KEY;
  if (!raw) {
    throw new Error(
      'GOOGLE_SEARCH_CONSOLE_KEY not set — refusing to report zero impressions as a measurement. ' +
        'Set the service-account JSON in Vercel and as a repo secret.',
    );
  }
  let parsed: ServiceAccountKey;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SEARCH_CONSOLE_KEY is not valid JSON (paste the whole service-account file).');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GOOGLE_SEARCH_CONSOLE_KEY missing client_email or private_key.');
  }
  return parsed;
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  // 60s safety margin so a token cannot expire mid-batch.
  if (cached && Date.now() < cached.expires - 60_000) return cached.token;

  const key = readKey();
  const now = Math.floor(Date.now() / 1000);
  const pk = await importPKCS8(key.private_key.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(key.client_email)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(pk);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Search Console auth failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export interface SearchRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Query Search Analytics. `dimensions: []` returns one totals row.
 *
 * Note on dates: Search Console data lags ~2 days. Callers should default
 * `end` to today-2 rather than today, or the last rows read as a collapse
 * that is really just data that has not landed yet — a trap that looks
 * exactly like a real ranking drop.
 */
export async function searchAnalytics(opts: {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  type?: 'web' | 'discover' | 'googleNews' | 'news' | 'image' | 'video';
}): Promise<SearchRow[]> {
  const token = await accessToken();
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: opts.startDate,
        endDate: opts.endDate,
        dimensions: opts.dimensions ?? [],
        rowLimit: opts.rowLimit ?? 25000,
        ...(opts.type ? { type: opts.type } : {}),
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Search Console query failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { rows?: SearchRow[] };
  // No rows is a legitimate answer (a day with no impressions). It is only a
  // lie when it comes from a failure, and every failure above throws.
  return json.rows ?? [];
}

/** SC data lags ~2 days; this is the newest date worth asking for. */
export function latestUsableDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
}

export function daysBefore(endISO: string, n: number): string {
  const d = new Date(`${endISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export interface Totals {
  clicks: number;
  impressions: number;
  ctr_pct: number;
  position: number;
}

export async function totals(startDate: string, endDate: string): Promise<Totals> {
  const rows = await searchAnalytics({ startDate, endDate, dimensions: [] });
  if (!rows.length) return { clicks: 0, impressions: 0, ctr_pct: 0, position: 0 };
  const r = rows[0];
  return {
    clicks: r.clicks,
    impressions: r.impressions,
    ctr_pct: Number((r.ctr * 100).toFixed(2)),
    position: Number(r.position.toFixed(1)),
  };
}
