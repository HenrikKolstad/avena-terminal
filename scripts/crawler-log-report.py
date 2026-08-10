#!/usr/bin/env python3
"""
Classify a Vercel runtime-log CSV export by crawler and report the trend.

Why this exists: Vercel keeps runtime logs for roughly a day, so the only way
to answer "who actually crawls us, and is it growing" is to export by hand
inside the retention window and analyse the file. Doing that by hand once is
fine; doing it every time is how the question stops being asked. This script
makes the answer cheap enough to repeat.

The distinction that matters and that is easy to blur: an SEO backlink crawler
(Ahrefs, Semrush) is NOT a model crawler (GPTBot, ClaudeBot, PerplexityBot).
Only the second group is evidence about the corpus work. They are separated
here so a busy day of Ahrefs traffic can never be read as AI ingestion.

Usage:  python3 scripts/crawler-log-report.py <export.csv> [more.csv ...]
Multiple files are merged and de-duplicated on requestId, so overlapping
exports can be passed without double-counting.
"""
import csv
import collections
import re
import sys

csv.field_size_limit(10 ** 7)

# Ordered longest-first at match time so 'ChatGPT-User' wins over 'GPT'.
FAMILY = {
    # Models — the ones whose visits are evidence about the corpus work.
    'GPTBot': 'MODEL', 'ChatGPT-User': 'MODEL', 'OAI-SearchBot': 'MODEL',
    'ClaudeBot': 'MODEL', 'Claude-Web': 'MODEL', 'anthropic-ai': 'MODEL',
    'PerplexityBot': 'MODEL', 'Perplexity-User': 'MODEL', 'CCBot': 'MODEL',
    'Bytespider': 'MODEL', 'TikTokSpider': 'MODEL', 'Amazonbot': 'MODEL',
    'meta-externalagent': 'MODEL', 'Meta-ExternalAgent': 'MODEL',
    'Applebot-Extended': 'MODEL', 'Google-Extended': 'MODEL',
    'cohere-ai': 'MODEL', 'xAI': 'MODEL', 'Grok': 'MODEL',
    'Diffbot': 'MODEL', 'Timpibot': 'MODEL', 'YouBot': 'MODEL',
    'KagiBot': 'MODEL', 'ImagesiftBot': 'MODEL',
    # Search engines.
    'Googlebot': 'SEARCH', 'GoogleOther': 'SEARCH', 'bingbot': 'SEARCH',
    'PetalBot': 'SEARCH', 'YandexBot': 'SEARCH', 'DuckDuckBot': 'SEARCH',
    'Applebot': 'SEARCH', 'SeznamBot': 'SEARCH', 'Qwantify': 'SEARCH',
    # SEO subscription tools — cost, no distribution.
    'AhrefsBot': 'SEO-TOOL', 'SemrushBot': 'SEO-TOOL', 'MJ12bot': 'SEO-TOOL',
    'DotBot': 'SEO-TOOL', 'SERankingBacklinksBot': 'SEO-TOOL',
    'RankshiftFetcher': 'SEO-TOOL', 'BLEXBot': 'SEO-TOOL',
    'DataForSeoBot': 'SEO-TOOL', 'Barkrowler': 'SEO-TOOL',
    # Monitoring / preview / infra.
    'AwarioBot': 'MONITOR', 'facebookexternalhit': 'MONITOR',
    'Twitterbot': 'MONITOR', 'LinkedInBot': 'MONITOR', 'Slackbot': 'MONITOR',
    'Stripe': 'INFRA', 'vercel-': 'INFRA', 'CMS-Checker': 'OTHER',
    # Undeclared automation: no 'bot' token, but not a person either.
    'Lightpanda': 'HEADLESS', 'HeadlessChrome': 'HEADLESS',
    'Puppeteer': 'HEADLESS', 'Playwright': 'HEADLESS', 'Scrapy': 'HEADLESS',
    'python-requests': 'HEADLESS', 'node-fetch': 'HEADLESS',
    'Go-http-client': 'HEADLESS', 'curl/': 'HEADLESS', 'axios': 'HEADLESS',
}
KEYS = sorted(FAMILY, key=len, reverse=True)
GENERIC = ('bot', 'crawler', 'spider', 'fetcher', '+http')


def classify(ua):
    ul = (ua or '').lower()
    for k in KEYS:
        if k.lower() in ul:
            return k, FAMILY[k]
    if any(g in ul for g in GENERIC):
        return 'unnamed-bot', 'OTHER-BOT'
    return None, 'NO-BOT-UA'


def group(path):
    p = re.sub(r'^https?://', '', path or '')
    p = re.sub(r'^avenaterminal\.com', '', p)
    p = re.sub(r'/property/[^/]+/one-pager', '/property/*/one-pager', p)
    p = re.sub(r'/property/[^/]+/opengraph-image', '/property/*/og-image', p)
    p = re.sub(r'/property/[^/]+/[a-z0-9-]+', '/property/*/…', p)
    p = re.sub(r'/property/[^/?]+', '/property/*', p)
    p = re.sub(r'/api/v1/property/[^/]+/([a-z-]+)', r'/api/v1/property/*/\1', p)
    p = re.sub(r'/(compare|towns|regions|costas)/[^?]+', r'/\1/*', p)
    return (p.split('?')[0] or '/')


def load(paths):
    rows, seen = [], set()
    for path in paths:
        with open(path, newline='', encoding='utf-8', errors='replace') as fh:
            for r in csv.DictReader(fh):
                rid = r.get('requestId')
                # De-dupe across overlapping exports rather than trusting the
                # caller to pick disjoint windows.
                if rid and rid in seen:
                    continue
                if rid:
                    seen.add(rid)
                rows.append(r)
    return rows


def bar(n, peak, width=28):
    return '█' * max(1, round(width * n / peak)) if n else ''


def main(paths):
    rows = load(paths)
    if not rows:
        sys.exit('no rows parsed — is this a Vercel log export?')

    days = sorted({(r['TimeUTC'] or '')[:10] for r in rows} - {''})
    print(f'REQUESTS  {len(rows):,}   days {days[0]} → {days[-1]} ({len(days)})\n')

    fam = collections.Counter()
    per = collections.Counter()
    by_day = collections.defaultdict(collections.Counter)      # day -> family
    crawl_day = collections.defaultdict(collections.Counter)   # crawler -> day
    paths_of = collections.defaultdict(collections.Counter)
    for r in rows:
        name, f = classify(r.get('requestUserAgent'))
        day = (r['TimeUTC'] or '')[:10]
        fam[f] += 1
        by_day[day][f] += 1
        if name:
            per[name] += 1
            crawl_day[name][day] += 1
            if f == 'MODEL':
                paths_of[name][group(r.get('requestPath'))] += 1

    tot = len(rows)
    print('BY FAMILY')
    for f, n in fam.most_common():
        print(f'  {n:7,}  {100 * n / tot:5.1f}%  {f}')

    print('\nBY CRAWLER')
    for k, n in per.most_common(40):
        print(f'  {n:7,}  {FAMILY.get(k, "OTHER"):9}  {k}')

    print('\nMODEL-CRAWLER REQUESTS PER DAY  (the trend that matters)')
    model = [k for k in per if FAMILY.get(k) == 'MODEL']
    tot_day = {d: sum(crawl_day[k].get(d, 0) for k in model) for d in days}
    peak = max(tot_day.values()) or 1
    for d in days:
        print(f'  {d}  {tot_day[d]:6,}  {bar(tot_day[d], peak)}')

    print('\n  per crawler:')
    hdr = ''.join(f'{d[5:]:>7}' for d in days)
    print(f'  {"":22}{hdr}')
    for k in sorted(model, key=lambda x: -per[x]):
        cells = ''.join(f'{crawl_day[k].get(d, 0):7,}' for d in days)
        print(f'  {k:22}{cells}')

    print('\nWHAT THE MODEL CRAWLERS TOOK')
    for k in sorted(model, key=lambda x: -per[x])[:6]:
        print(f'  --- {k} ({per[k]:,}) ---')
        for p, c in paths_of[k].most_common(10):
            print(f'      {c:6,}  {p}')

    print('\nNO-BOT-UA RESIDUAL — not the same as humans')
    resid = [r for r in rows if classify(r.get('requestUserAgent'))[1] == 'NO-BOT-UA']
    print(f'  {len(resid):,} rows ({100 * len(resid) / tot:.1f}%)')
    for u, c in collections.Counter(r.get('requestUserAgent') for r in resid).most_common(8):
        print(f'    {c:6,}  {(u or "")[:96]}')
    print('  execution regions:')
    for rg, c in collections.Counter(r.get('region') for r in resid).most_common(6):
        print(f'    {c:6,}  {rg}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
