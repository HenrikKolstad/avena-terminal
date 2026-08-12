#!/usr/bin/env python3
"""
Avena Market Pulse — the Monday delivery engine.

The 2026-08-12 outreach promised thirty agencies: "reply with your towns and
your first edition arrives Monday at 08:00 CET." This script is that promise.
For every active row in `pulse_subscribers` it builds a PDF edition covering
the subscriber's towns from the live ledger — observed price moves, new
launches, delistings with final prices, inventory and benchmark position —
and sends it from pulse@avenaterminal.com via Resend.

Honesty rules, same as everywhere in this codebase:
 - Every number is computed from `public/data.json` (the book) and the
   observation tables. Nothing is estimated or narrated beyond the counts.
 - A town with no events still states that plainly — "no observed changes
   this week" is a real finding, not a gap to paper over.
 - Deliveries are logged with a UNIQUE (subscriber, edition_date) constraint,
   so a re-run can never double-send; it fills gaps only.
 - A failed send raises loudly. A missing day of Pulse is visible, never
   silent.

Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
Run: python3 scripts/pulse/generate_editions.py [--dry] [--to email]
"""
import base64
import datetime as dt
import json
import os
import statistics
import sys
import urllib.request
import urllib.error

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

SB_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SB_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
RESEND = os.environ.get('RESEND_API_KEY', '')
DRY = '--dry' in sys.argv
ONLY_TO = sys.argv[sys.argv.index('--to') + 1] if '--to' in sys.argv else None

if not (SB_URL and SB_KEY):
    sys.exit('pulse: Supabase credentials missing — refusing to run.')
if not RESEND and not DRY:
    sys.exit('pulse: RESEND_API_KEY missing — refusing to run.')


def rest(path, method='GET', body=None):
    """PostgREST call. Content/Accept-Profile is mandatory: this project's
    REST default schema is 'api' (empty) — the 2026-08-12 middleware lesson."""
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
        sys.exit(f'pulse: REST {e.code} on {path[:80]} — {e.read()[:200]!r}')


# ── Data assembly ───────────────────────────────────────────────────────────

BOOK = json.load(open('public/data.json'))
TOWN_OF = {p['ref']: (p.get('l') or '').split(',')[0].strip() for p in BOOK if p.get('ref')}
BY_TOWN = {}
for p in BOOK:
    if p.get('ref'):
        BY_TOWN.setdefault(TOWN_OF[p['ref']], []).append(p)

TODAY = dt.date.today()
WEEK_AGO = TODAY - dt.timedelta(days=7)
EDITION = TODAY.isoformat()
ISOWEEK = TODAY.isocalendar()[1]


def fetch_moves():
    """All price changes in the last 7 days, per ref, from the snapshots."""
    rows, page = [], 0
    while True:
        chunk = rest(
            f'price_snapshots?select=ref,price,snapshot_date'
            f'&snapshot_date=gte.{WEEK_AGO}&order=ref.asc,snapshot_date.asc'
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
        for i in range(1, len(lst)):
            if lst[i][1] != lst[i - 1][1]:
                moves.setdefault(TOWN_OF.get(ref, '?'), []).append(
                    (ref, lst[i - 1][1], lst[i][1], lst[i][0],
                     round((lst[i][1] - lst[i - 1][1]) / lst[i - 1][1] * 100, 1)))
    return moves


def fetch_delistings():
    rows = rest(f'sold_properties?select=ref,town,type,last_price,last_pm2,last_seen_date'
                f'&last_seen_date=gte.{WEEK_AGO}&order=last_seen_date.desc')
    out = {}
    for r in rows:
        town = (r.get('town') or '').split(',')[0].strip()
        out.setdefault(town, []).append(r)
    return out


def town_stats(town):
    props = BY_TOWN.get(town, [])
    if not props:
        return None
    prices = sorted(p['pf'] for p in props if p.get('pf'))
    pm2 = sorted(p['pm2'] for p in props if p.get('pm2'))
    mm2 = sorted(p['mm2'] for p in props if p.get('mm2'))
    new = [(p['ref'], p.get('t', ''), p.get('bd'), p.get('pf'), p.get('_added'))
           for p in props if (p.get('_added') or '') >= str(WEEK_AGO)]
    return {
        'units': len(props),
        'median_price': statistics.median(prices) if prices else 0,
        'median_pm2': statistics.median(pm2) if pm2 else 0,
        'resale_pm2': statistics.median(mm2) if mm2 else 0,
        'new': sorted(new, key=lambda x: -(x[3] or 0)),
    }


# ── PDF rendering (house style) ─────────────────────────────────────────────

BG, SURFACE = HexColor('#100E0A'), HexColor('#17140E')
GOLD, GOLD_DIM = HexColor('#C9A96A'), HexColor('#8C7A52')
INK, MUTED, FAINT = HexColor('#F2EDE3'), HexColor('#9A9284'), HexColor('#57503F')
RED = HexColor('#B96A5E')
W, H = A4
M = 56


def render_edition(path, subscriber_name, towns, moves, delist):
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle(f'Avena Market Pulse — Week {ISOWEEK}, {TODAY.year}')

    def bg(num):
        c.setFillColor(BG); c.rect(0, 0, W, H, stroke=0, fill=1)
        c.setFillColor(FAINT); c.setFont('Courier', 6.5)
        c.drawString(M, 24, f'AVENA MARKET PULSE  ·  PREPARED FOR {subscriber_name.upper()}  ·  DATA: AVENA OBSERVATION LEDGER')
        c.drawRightString(W - M, 24, f'{num:02d}')

    def wrap(text, font, size, maxw):
        words, lines, cur = text.split(), [], ''
        for w_ in words:
            t = (cur + ' ' + w_).strip()
            if c.stringWidth(t, font, size) <= maxw:
                cur = t
            else:
                lines.append(cur); cur = w_
        if cur:
            lines.append(cur)
        return lines

    def para(x, y, text, font='Helvetica', size=9.5, leading=14, color=MUTED, maxw=W - 2 * M):
        c.setFillColor(color); c.setFont(font, size)
        for ln in wrap(text, font, size, maxw):
            c.drawString(x, y, ln); y -= leading
        return y

    def eyebrow(x, y, text):
        c.setStrokeColor(GOLD); c.setLineWidth(0.8); c.line(x, y + 2.5, x + 26, y + 2.5)
        c.setFillColor(GOLD); c.setFont('Courier', 7.5); c.drawString(x + 34, y, ' '.join(text.upper()))

    def ref_cell(x, y, ref):
        c.setFillColor(GOLD); c.setFont('Courier', 8.5); c.drawString(x, y, ref)
        c.setFont('Courier', 6); c.setFillColor(GOLD_DIM)
        c.drawString(x + 42, y + 0.5, '(click to see)')
        c.setFont('Courier', 8.5)
        c.linkURL(f'https://avenaterminal.com/property/{ref}', (x, y - 2, x + 98, y + 9), relative=0)

    page = 0
    for town in towns:
        st = town_stats(town)
        page += 1
        bg(page)
        c.setFillColor(INK); c.setFont('Times-Roman', 17); c.drawString(M, H - 64, 'A V E N A')
        c.setFillColor(FAINT); c.setFont('Courier', 7)
        c.drawRightString(W - M, H - 61, f'MARKET PULSE · WEEK {ISOWEEK} · {TODAY.year}')
        eyebrow(M, H - 108, f'{town} · new-build market')
        c.setFillColor(INK); c.setFont('Times-Roman', 30)
        c.drawString(M, H - 146, f'{town}, week {ISOWEEK}.')

        if not st:
            para(M, H - 180, 'This town is not currently in the observed book. It enters the report the day inventory appears.', size=10)
            c.showPage()
            continue

        tmoves = moves.get(town, [])
        tdel = delist.get(town, [])
        ups = sum(1 for m in tmoves if m[2] > m[1])
        downs = len(tmoves) - ups
        c.setFillColor(GOLD); c.setFont('Times-Italic', 15)
        c.drawString(M, H - 170, f'{len(tmoves)} price movement(s) · {downs} reduction(s) · {len(tdel)} left the market · {st["units"]} units under daily watch')

        stats = [(f'{st["units"]}', 'units tracked daily'),
                 (f'€{st["median_price"]:,.0f}', 'median asking price'),
                 (f'€{st["median_pm2"]:,.0f}', 'median €/m² (new-build)'),
                 (f'€{st["resale_pm2"]:,.0f}', 'town resale benchmark €/m²')]
        tx = M; tw = (W - 2 * M - 30) / 4
        for big, small in stats:
            c.setFillColor(SURFACE); c.rect(tx, H - 250, tw, 50, stroke=0, fill=1)
            c.setStrokeColor(HexColor('#3a3428')); c.setLineWidth(0.7); c.rect(tx, H - 250, tw, 50, stroke=1, fill=0)
            c.setFillColor(GOLD); c.setFont('Times-Roman', 14); c.drawString(tx + 10, H - 222, big)
            c.setFillColor(MUTED); c.setFont('Helvetica', 6.6)
            yy2 = H - 234
            for ln in wrap(small, 'Helvetica', 6.6, tw - 16):
                c.drawString(tx + 10, yy2, ln); yy2 -= 8
            tx += tw + 10

        yy = H - 292
        eyebrow(M, yy, f'Observed price movements · {WEEK_AGO.strftime("%d %b")} – {TODAY.strftime("%d %b %Y")}')
        yy -= 22
        if tmoves:
            c.setFillColor(FAINT); c.setFont('Courier', 7)
            c.drawString(M, yy, 'REF                      DATE         FROM           TO             CHANGE')
            yy -= 14
            for ref, f, t, d, pct in sorted(tmoves, key=lambda m: m[3])[:14]:
                ref_cell(M, yy, ref)
                c.setFillColor(INK); c.drawString(M + 112, yy, f'{d}   €{f:>9,}     €{t:>9,}')
                c.setFillColor(GOLD if t > f else RED)
                c.drawString(M + 372, yy, f'{"+" if pct > 0 else ""}{pct}%')
                yy -= 15
        else:
            yy = para(M, yy, 'No observed price changes this week — every tracked unit held its asking price. That stability is itself the finding.', size=9.5)
        yy -= 14

        if st['new']:
            eyebrow(M, yy, 'New on the market')
            yy -= 20
            for ref, typ, bd, pr, d in st['new'][:8]:
                ref_cell(M, yy, ref)
                c.setFillColor(INK)
                c.drawString(M + 112, yy, f'{(typ or ""):<12} {str(bd or "?")} bed   €{(pr or 0):>9,}   first seen {d}')
                yy -= 15
            yy -= 10

        if tdel:
            eyebrow(M, yy, 'Left the market · absorption')
            yy -= 20
            for r in tdel[:6]:
                ref_cell(M, yy, r['ref'])
                lp = round(float(r['last_price'])) if r.get('last_price') else 0
                c.setFillColor(INK)
                c.drawString(M + 112, yy, f'{(r.get("type") or ""):<12} last asking €{lp:>9,}   left {r["last_seen_date"]}')
                yy -= 15
            yy -= 10

        spread = (st['median_pm2'] / st['resale_pm2'] - 1) * 100 if st['resale_pm2'] else 0
        para(M, yy - 4,
             f'Benchmark position: new-build median €{st["median_pm2"]:,.0f}/m² against a €{st["resale_pm2"]:,.0f}/m² '
             f'town resale benchmark — a {abs(spread):.1f}% new-build {"discount" if spread < 0 else "premium"}. '
             f'Every reference above links to its full dossier on avenaterminal.com.',
             size=9.5)
        c.showPage()

    # Closing page
    page += 1
    bg(page)
    c.setFillColor(INK); c.setFont('Times-Roman', 22)
    c.drawString(M, H - 120, 'Questions about anything in this edition?')
    c.setFillColor(GOLD); c.setFont('Times-Italic', 22)
    c.drawString(M, H - 148, 'Reply to this email — a person answers.')
    para(M, H - 190,
         'Change your towns any time by replying. Data: the Avena observation ledger — every Spanish coastal '
         'new-build observed nightly, with the price history the portals delete.',
         size=10, leading=15)
    c.setFillColor(FAINT); c.setFont('Courier', 7)
    c.drawString(M, H - 240, 'AVENA TERMINAL  ·  AVENATERMINAL.COM  ·  HENRIK@AVENATERMINAL.COM  ·  +47 980 71 453')
    c.showPage()
    c.save()


# ── Send ────────────────────────────────────────────────────────────────────

def send_edition(sub, pdf_path):
    pdf_b64 = base64.b64encode(open(pdf_path, 'rb').read()).decode()
    towns_h = ', '.join(sub['towns'])
    body = {
        'from': 'Avena Market Pulse <pulse@avenaterminal.com>',
        'reply_to': 'henrik@avenaterminal.com',
        'to': [sub['email']],
        'subject': f'Market Pulse · {towns_h} · week {ISOWEEK}',
        'html': (f'<p>Good morning,</p><p>Your Market Pulse edition for <b>{towns_h}</b> is attached — '
                 f'every observed price movement, launch and exit in your towns this week, with links to '
                 f'the full dossiers.</p><p>Questions or town changes: just reply.</p>'
                 f'<p>— Avena Terminal · <a href="https://avenaterminal.com">avenaterminal.com</a></p>'),
        'attachments': [{'filename': f'Avena-Market-Pulse-W{ISOWEEK}.pdf', 'content': pdf_b64}],
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
        sys.exit(f'pulse: Resend {e.code} for {sub["email"]} — {e.read()[:300]!r}')


def main():
    subs = rest('pulse_subscribers?select=*&active=eq.true')
    if ONLY_TO:
        subs = [s for s in subs if s['email'] == ONLY_TO]
    if not subs:
        print('pulse: no active subscribers — nothing to do.')
        return

    delivered = {(d['subscriber_id'], d['edition_date'])
                 for d in rest(f'pulse_deliveries?select=subscriber_id,edition_date&edition_date=eq.{EDITION}')}

    moves = fetch_moves()
    delist = fetch_delistings()

    sent = 0
    for sub in subs:
        if (sub['id'], EDITION) in delivered:
            print(f"pulse: {sub['email']} already delivered {EDITION} — skipping.")
            continue
        pdf_path = f"/tmp/pulse-{sub['id']}-{EDITION}.pdf"
        render_edition(pdf_path, sub.get('name') or sub['email'], sub['towns'], moves, delist)
        if DRY:
            print(f"pulse [dry]: built {pdf_path} for {sub['email']} ({', '.join(sub['towns'])})")
            continue
        resend_id = send_edition(sub, pdf_path)
        rest('pulse_deliveries', 'POST', {
            'subscriber_id': sub['id'], 'edition_date': EDITION,
            'towns': sub['towns'], 'resend_id': resend_id,
        })
        print(f"pulse: sent to {sub['email']} ({', '.join(sub['towns'])}) resend={resend_id}")
        sent += 1
    print(f'pulse: done — {sent} edition(s) sent.')


if __name__ == '__main__':
    main()
