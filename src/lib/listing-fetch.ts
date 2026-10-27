/**
 * Fetching a portal listing page.
 *
 * Idealista and Fotocasa sit behind DataDome / Cloudflare. A server fetch
 * from Vercel is refused, so we try three routes in order and stop at the
 * first that returns real page content:
 *
 *   1. direct        — works for Kyero, ThinkSpain, Rightmove, most agencies
 *   2. Jina reader   — free rendering proxy (r.jina.ai); sometimes gets through
 *   3. paid proxy    — residential IPs + headless browser. Needed for Idealista
 *                      and Fotocasa. Set in Vercel env:
 *                        SCRAPER_PROVIDER = scrapedo | scrapingbee | zenrows | scraperapi
 *                        SCRAPER_API_KEY  = <key>
 *
 * Every route has a hard timeout; the whole chain fits inside the API
 * route's maxDuration. Nothing here throws.
 */

export interface FetchedPage {
  html: string;       // HTML, or markdown/text from the reader proxy
  route: 'direct' | 'jina' | 'proxy' | 'none';
  provider?: string;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function looksBlocked(body: string): boolean {
  const head = body.slice(0, 40_000).toLowerCase();
  return body.length < 1500
    || /datadome|cf-browser-verification|captcha-delivery|just a moment|access denied|request blocked|enable javascript and cookies/.test(head);
}

async function withTimeout(url: string, ms: number, init: RequestInit = {}): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function needsProxy(url: string): boolean {
  return /idealista\.com|fotocasa\.es|habitaclia\.com|pisos\.com/i.test(url);
}

function proxyUrl(target: string): { url: string; provider: string } | null {
  const key = process.env.SCRAPER_API_KEY;
  const provider = (process.env.SCRAPER_PROVIDER || '').toLowerCase();
  if (!key || !provider) return null;
  const u = encodeURIComponent(target);
  switch (provider) {
    case 'scrapedo':
      return { provider, url: `https://api.scrape.do/?token=${key}&url=${u}&render=true&super=true&geoCode=es` };
    case 'scrapingbee':
      return { provider, url: `https://app.scrapingbee.com/api/v1/?api_key=${key}&url=${u}&render_js=true&stealth_proxy=true&country_code=es&wait=1500` };
    case 'zenrows':
      return { provider, url: `https://api.zenrows.com/v1/?apikey=${key}&url=${u}&js_render=true&premium_proxy=true&proxy_country=es` };
    case 'scraperapi':
      return { provider, url: `https://api.scraperapi.com/?api_key=${key}&url=${u}&render=true&ultra_premium=true&country_code=es` };
    default:
      return null;
  }
}

export async function fetchListingPage(url: string): Promise<FetchedPage> {
  const proxy = proxyUrl(url);

  // 1. Direct — skipped for portals we know refuse us, to save the seconds.
  if (!needsProxy(url) || !proxy) {
    const html = await withTimeout(url, 6000, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' },
    });
    if (html && !looksBlocked(html)) return { html, route: 'direct' };
  }

  // 2. Paid proxy — the only thing that reliably opens Idealista/Fotocasa.
  if (proxy) {
    const html = await withTimeout(proxy.url, 25_000);
    if (html && !looksBlocked(html)) return { html, route: 'proxy', provider: proxy.provider };
  }

  // 3. Jina reader — free, renders JS, returns text/markdown. Last resort.
  const md = await withTimeout(`https://r.jina.ai/${url}`, 12_000, {
    headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text', 'User-Agent': UA },
  });
  if (md && !looksBlocked(md) && !/^Error|403 Forbidden|429 Too Many/m.test(md.slice(0, 300))) return { html: md, route: 'jina' };

  return { html: '', route: 'none' };
}
