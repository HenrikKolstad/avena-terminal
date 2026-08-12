#!/usr/bin/env python3
"""
Avena Market Pulse — same-day reprice alerts.

The 2026-08-12 outreach promised same-day alerts alongside the Monday
edition. This is that promise: every morning after the 02:20 UTC snapshot
write, diff each subscriber's towns for price changes dated TODAY and send
a short plain email listing them. No moves in their towns → no email; a
quiet day is a real finding and silence is the honest signal.

Mondays are skipped (unless --force): the weekly edition ships 05:45 UTC
that morning and already carries the same moves.

Honesty rules, same as generate_editions.py:
 - Every move is derived from `price_snapshots` (the ground truth for
   price movement — never property_pricing_history).
 - Idempotent via UNIQUE (subscriber_id, alert_date) in pulse_alerts.
 - A failed send raises loudly.

Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
Run: python3 scripts/pulse/send_alerts.py [--dry] [--to email] [--force]
"""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

SB_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SB_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
RESEND = os.environ.get('RESEND_API_KEY', '')
DRY = '--dry' in sys.argv
FORCE = '--force' in sys.argv
ONLY_TO = sys.argv[sys.argv.index('--to') + 1] if '--to' in sys.argv else None

if not (SB_URL and SB_KEY):
    sys.exit('alerts: Supabase credentials missing — refusing to run.')
if not RESEND and not DRY:
    sys.exit('alerts: RESEND_API_KEY missing — refusing to run.')

TODAY = dt.date.today()
if TODAY.weekday() == 0 and not FORCE:
    print('alerts: Monday — weekly edition covers today, skipping. (--force overrides)')
    sys.exit(0)


def rest(path, method='GET', body=None):
    """PostgREST call. Content/Accept-Profile mandatory: REST default schema
    here is 'api' (empty). User-Agent mandatory: Cloudflare 403s Python-urllib."""
    req = urllib.request.Request(
        f'{SB_URL}/rest/v1/{path}',
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            'apikey': SB_KEY,
            'Authorization': f'Bearer {SB_KEY}',
            'Content-Type': 'application/json',
            'Accept-Profile': 'public',
            'Content-Profile': 'public',
            'Prefer': 'return=representation',
            'User-Agent': 'avena-pulse/1.0 (avenaterminal.com)',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        sys.exit(f'alerts: REST {e.code} on {path[:80]} — {e.read()[:200]!r}')


BOOK = json.load(open('public/data.json'))
TOWN_OF = {p['ref']: (p.get('l') or '').split(',')[0].strip() for p in BOOK if p.get('ref')}


def todays_moves():
    """Price changes whose newest snapshot is dated TODAY, per town.
    Window reaches back 4 days so a weekend gap can't hide the prior price."""
    since = TODAY - dt.timedelta(days=4)
    rows, page = [], 0
    while True:
        chunk = rest(
            f'price_snapshots?select=ref,price,snapshot_date'
            f'&snapshot_date=gte.{since}&order=ref.asc,snapshot_date.asc'
            f'&limit=1000&offset={page * 1000}')
        rows += chunk
        if len(chunk) < 1000:
            break
        page += 1
    series = {}
    for r in rows:
        v = round(float(r['price'])) if r['price'] is not None else None
        if not v or v <= 0:
            continue
        d = r['snapshot_date'][:10]
        lst = series.setdefault(r['ref'], [])
        if not lst or lst[-1][0] != d:
            lst.append((d, v))
    moves = {}
    for ref, lst in series.items():
        if len(lst) < 2 or lst[-1][0] != str(TODAY):
            continue
        prev, cur = lst[-2][1], lst[-1][1]
        if cur != prev:
            moves.setdefault(TOWN_OF.get(ref, '?'), []).append(
                (ref, prev, cur, round((cur - prev) / prev * 100, 1)))
    return moves


GOLD, RED, GREEN = '#C9A96A', '#B96A5E', '#7A9A6E'


def render_html(name, town_moves):
    total = sum(len(v) for v in town_moves.values())
    parts = [
        '<div style="background:#100E0A;color:#F2EDE3;padding:32px 28px;'
        'font-family:Georgia,serif;max-width:640px;margin:0 auto">',
        f'<div style="color:{GOLD};font-family:monospace;font-size:11px;'
        'letter-spacing:3px">AVENA MARKET PULSE &middot; SAME-DAY ALERT</div>',
        f'<h1 style="font-size:26px;font-weight:normal;margin:14px 0 4px">'
        f'{total} price change{"s" if total != 1 else ""} observed today</h1>',
        f'<div style="color:#9A9284;font-size:13px;margin-bottom:24px">'
        f'{TODAY.strftime("%A %d %B %Y")} &middot; prepared for {name}</div>',
    ]
    for town in sorted(town_moves):
        parts.append(
            f'<div style="color:{GOLD};font-family:monospace;font-size:12px;'
            f'letter-spacing:2px;margin:22px 0 8px;border-bottom:1px solid #57503F;'
            f'padding-bottom:6px">{town.upper()}</div>')
        parts.append('<table style="width:100%;border-collapse:collapse;'
                     'font-family:monospace;font-size:13px">')
        for ref, prev, cur, pct in sorted(town_moves[town], key=lambda m: m[3]):
            color = RED if pct < 0 else GREEN
            parts.append(
                f'<tr><td style="padding:5px 0"><a href="https://avenaterminal.com/property/{ref}" '
                f'style="color:{GOLD};text-decoration:none">{ref}</a></td>'
                f'<td style="color:#9A9284">&euro;{prev:,}</td>'
                f'<td>&rarr;</td><td style="color:#F2EDE3">&euro;{cur:,}</td>'
                f'<td style="color:{color};text-align:right">{pct:+.1f}%</td></tr>')
        parts.append('</table>')
    parts.append(
        '<div style="color:#57503F;font-size:11px;margin-top:32px;'
        'border-top:1px solid #2A251C;padding-top:14px">'
        'Observed by the Avena ledger overnight. Full context arrives in your '
        'Monday edition. Reply to this email to reach us directly.</div></div>')
    return ''.join(parts)


def send_alert(sub, town_moves):
    total = sum(len(v) for v in town_moves.values())
    towns = ', '.join(sorted(town_moves))
    body = {
        'from': 'Avena Market Pulse <pulse@avenaterminal.com>',
        'to': [sub['email']],
        'reply_to': 'henrik@avenaterminal.com',
        'subject': f'Price alert: {total} change{"s" if total != 1 else ""} today in {towns}',
        'html': render_html(sub.get('name') or sub['email'], town_moves),
    }
    req = urllib.request.Request(
        'https://api.resend.com/emails',
        data=json.dumps(body).encode(),
        headers={'Authorization': f'Bearer {RESEND}', 'Content-Type': 'application/json',
                 'User-Agent': 'avena-pulse/1.0 (avenaterminal.com)'},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read()).get('id')
    except urllib.error.HTTPError as e:
        sys.exit(f'alerts: Resend {e.code} for {sub["email"]} — {e.read()[:300]!r}')


def main():
    subs = rest('pulse_subscribers?select=*&active=eq.true')
    if ONLY_TO:
        subs = [s for s in subs if s['email'] == ONLY_TO]
    if not subs:
        print('alerts: no active subscribers.')
        return
    already = {r['subscriber_id'] for r in rest(
        f'pulse_alerts?select=subscriber_id&alert_date=eq.{TODAY}')}
    moves = todays_moves()
    if not moves:
        print('alerts: no price changes observed today anywhere — nothing to send.')
        return
    sent = 0
    for sub in subs:
        if sub['id'] in already:
            print(f'alerts: {sub["email"]} already alerted {TODAY} — skipping.')
            continue
        town_moves = {t: moves[t] for t in (sub.get('towns') or []) if t in moves}
        if not town_moves:
            print(f'alerts: {sub["email"]} — no moves in {sub.get("towns")}, staying silent.')
            continue
        if DRY:
            print(f'alerts: DRY — would alert {sub["email"]}: '
                  f'{ {t: len(v) for t, v in town_moves.items()} }')
            continue
        rid = send_alert(sub, town_moves)
        rest('pulse_alerts', 'POST', {
            'subscriber_id': sub['id'],
            'alert_date': str(TODAY),
            'moves_count': sum(len(v) for v in town_moves.values()),
            'towns': sorted(town_moves),
            'resend_id': rid,
        })
        print(f'alerts: sent to {sub["email"]} ({", ".join(sorted(town_moves))}) resend={rid}')
        sent += 1
    print(f'alerts: done — {sent} alert(s) sent.')


if __name__ == '__main__':
    main()
