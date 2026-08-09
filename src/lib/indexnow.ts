/**
 * Ping IndexNow (Bing, Yandex, Seznam, Naver) for changed URLs.
 *
 * The previous `catch {}` swallowed every failure silently — a rejected key,
 * a 422 on a malformed URL list, a network error, all indistinguishable from
 * success. That is this project's recurring bug in the one place it is least
 * visible: nothing downstream ever asks whether indexing was actually
 * requested. Now it returns an outcome the caller can log and Odyssey can
 * see in a brief.
 */
export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  status?: number;
  error?: string;
}

export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  if (!urls.length) return { ok: true, submitted: 0 };
  const key = process.env.INDEXNOW_KEY || 'a7f3c291-8e4b-4d12-b5f6-3c9e1a2b0d8f';
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'avenaterminal.com',
        key,
        keyLocation: `https://avenaterminal.com/${key}.txt`,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).slice(0, 200);
      console.error(`[indexnow] HTTP ${res.status} for ${urls.length} URLs: ${body}`);
      return { ok: false, submitted: 0, status: res.status, error: body || `HTTP ${res.status}` };
    }
    return { ok: true, submitted: urls.length, status: res.status };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[indexnow] request failed for ${urls.length} URLs: ${error}`);
    return { ok: false, submitted: 0, error };
  }
}
