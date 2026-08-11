/**
 * Shared crawler classifier — one taxonomy for the middleware ledger and the
 * per-crawler differential sitemap. Pure regex, edge-safe.
 *
 * Longest/most-specific first so 'ChatGPT-User' never records as 'GPTBot'.
 * Mirrors scripts/crawler-log-report.py; keep the three in sync.
 */
const CRAWLERS: Array<[string, RegExp]> = [
  ['ChatGPT-User', /ChatGPT-User/i],
  ['OAI-SearchBot', /OAI-SearchBot/i],
  ['GPTBot', /GPTBot/i],
  ['ClaudeBot', /ClaudeBot/i],
  ['Claude-Web', /Claude-Web/i],
  ['anthropic-ai', /anthropic-ai/i],
  ['PerplexityBot', /PerplexityBot/i],
  ['Perplexity-User', /Perplexity-User/i],
  ['CCBot', /CCBot/i],
  ['Bytespider', /Bytespider/i],
  ['TikTokSpider', /TikTokSpider/i],
  ['Amazonbot', /Amazonbot/i],
  ['meta-externalagent', /meta-externalagent|Meta-ExternalAgent/i],
  ['FacebookBot', /FacebookBot/i],
  ['Google-Extended', /Google-Extended/i],
  ['GoogleOther', /GoogleOther/i],
  ['Googlebot', /Googlebot/i],
  ['bingbot', /bingbot/i],
  ['Applebot-Extended', /Applebot-Extended/i],
  ['Applebot', /Applebot/i],
  ['DuckDuckBot', /DuckDuckBot/i],
  ['YandexBot', /YandexBot/i],
  ['PetalBot', /PetalBot/i],
  ['xAI-Grok', /xAI|Grok/i],
  ['cohere-ai', /cohere-ai/i],
  ['Diffbot', /Diffbot/i],
  ['AhrefsBot', /AhrefsBot/i],
  ['SemrushBot', /SemrushBot/i],
  ['MJ12bot', /MJ12bot/i],
  ['DotBot', /DotBot/i],
  ['SERanking', /SERanking/i],
  ['AwarioBot', /AwarioBot/i],
  ['Lightpanda', /Lightpanda/i],
];

const ANY_BOT = /bot|crawler|spider|ChatGPT|Perplexity|Claude|Lightpanda|GPT/i;

/** Known-crawler name for a user-agent, or null for humans/unnamed bots. */
export function crawlerName(ua: string): string | null {
  if (!ANY_BOT.test(ua)) return null;
  for (const [name, re] of CRAWLERS) {
    if (re.test(ua)) return name;
  }
  return null;
}
