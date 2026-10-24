#!/usr/bin/env python3
"""
Avena Market Pulse — the Monday delivery engine.

The 2026-08-12 outreach promised thirty agencies: "reply with your towns and
your first edition arrives Monday at 08:00 CET." This script is that promise.
For every active row in `pulse_subscribers` it builds a PDF edition covering
the subscriber's towns from the live ledger — observed price moves, new
launches, delistings with final prices, inventory and benchmark position —
and sends it from pulse@avenaterminal.com via Resend.

Coverage: a subscriber with towns = {'*'} gets the WHOLE book: every price
change (rises and reductions, no threshold, no top-N), every launch, every
exit and every town benchmark across all regions, resolved at send time. The
PDF opens with a summary and highlights, then the complete tables grouped by
region and town. Named towns still work and get the same complete tables.

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
import socket
import sys
import time
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import unit_identity as ui  # noqa: E402

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


def urlopen_retry(req, timeout=60, attempts=4):
    """urlopen that retries only failures where the request never reached the
    server (DNS lookup failure / connection refused), so a retried
    Resend POST cannot double-send. 2026-10-19's edition was lost to a single
    'Name or service not known'. HTTP errors are not retried."""
    for i in range(attempts):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError:
            raise
        except urllib.error.URLError as e:
            pre_send = isinstance(e.reason, (socket.gaierror, ConnectionRefusedError))
            if not pre_send or i == attempts - 1:
                raise
            wait = 15 * (i + 1)
            print(f'pulse: network error ({e.reason}); retrying in {wait}s')
            time.sleep(wait)


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
        with urlopen_retry(req, timeout=60) as r:
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


REGION_LABEL = {'costa-del-sol': 'Costa del Sol', 'cb-south': 'Costa Blanca South',
                'cb-north': 'Costa Blanca North', 'costa-calida': 'Costa Calida'}
REGION_OF_TOWN = {}
for _t, _ps in BY_TOWN.items():
    _rs = [p.get('r') for p in _ps if p.get('r')]
    if _rs:
        REGION_OF_TOWN[_t] = max(set(_rs), key=_rs.count)
SNAP_TOWN = {}  # ref -> town from snapshots, for refs no longer in the book

# How far back to look for the price a ref held when the week opened. A
# capture gap (e.g. 2026-10-14..20) must not hide a move: the first snapshot
# inside the week is compared against the last one before it.
BASELINE_DAYS = 28


def region_of(town):
    slug = REGION_OF_TOWN.get(town) or SNAP_REGION.get(town) or ''
    return REGION_LABEL.get(slug, slug.replace('-', ' ').title() or 'Other')


SNAP_REGION = {}


# town -> [(ref, from, to, date, pct, prev_date, status, note)] — price changes
# that are NOT counted: the listing switched unit, or a large move is unverified.
HELD = {}


def fetch_moves():
    """EVERY genuine price change observed this week, per town, from the snapshots.

    No threshold, no direction filter, no top-N: a move is any change in a
    ref's asking price between consecutive observations where the newer one
    falls inside the week (WEEK_AGO, TODAY]. The older observation may be
    from before the week (baseline), so the first change of the week is never
    lost. Tuple: (ref, from, to, date, pct, previous_observation_date).

    UNIT IDENTITY. A change only counts when the ref still describes the same
    unit (unit_identity.py; stamped per row as price_snapshots.move_status).
    A developer switching the ref from the smallest flat to the penthouse is
    not a price move: those land in HELD with the reason, are listed
    separately in the edition and are never counted."""
    since = WEEK_AGO - dt.timedelta(days=BASELINE_DAYS)
    rows, page = [], 0
    while True:
        chunk = rest(
            f'price_snapshots?select=ref,price,snapshot_date,town,region,pm2,mm2,type,'
            f'built_m2,plot_m2,beds,baths,img_sig,move_status,move_note'
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
        if r.get('town'):
            t = r['town'].split(',')[0].strip()
            SNAP_TOWN[r['ref']] = t
            if r.get('region'):
                SNAP_REGION.setdefault(t, r['region'])
        d = r['snapshot_date'][:10]
        lst = series.setdefault(r['ref'], [])
        if not lst or lst[-1][0] != d:
            lst.append((d, v, r))
    moves = {}
    HELD.clear()
    for ref, lst in series.items():
        for i in range(1, len(lst)):
            if lst[i][0] <= str(WEEK_AGO):
                continue
            if lst[i][1] != lst[i - 1][1]:
                town = TOWN_OF.get(ref) or SNAP_TOWN.get(ref) or 'Unattributed'
                cur, prev = lst[i][2], lst[i - 1][2]
                status, note = cur.get('move_status'), cur.get('move_note')
                if not status:
                    # Row predates the DB trigger: classify here with the same
                    # rules. Recurrence only sees the fetched window.
                    recurs = any(x[1] == lst[i][1] for x in lst[:i - 1]
                                 if (dt.date.fromisoformat(lst[i][0]) - dt.date.fromisoformat(x[0])).days <= ui.RECUR_DAYS)
                    side = lambda x, p: {**{k: x.get(k) for k in ('pm2', 'type', 'built_m2', 'plot_m2', 'beds', 'baths', 'img_sig')}, 'price': p}
                    status, note = ui.verdict(side(prev, lst[i - 1][1]), side(cur, lst[i][1]), cur.get('mm2'), recurs) or ('verified', None)
                mv = (ref, lst[i - 1][1], lst[i][1], lst[i][0],
                      round((lst[i][1] - lst[i - 1][1]) / lst[i - 1][1] * 100, 1),
                      lst[i - 1][0])
                if status == ui.COUNTED:
                    moves.setdefault(town, []).append(mv)
                else:
                    HELD.setdefault(town, []).append(mv + (status, note or ''))
    return moves


def fetch_delistings():
    rows = rest(f'sold_properties?select=ref,town,region,type,last_price,last_pm2,last_seen_date'
                f'&last_seen_date=gte.{WEEK_AGO}&order=last_seen_date.desc')
    out = {}
    for r in rows:
        town = (r.get('town') or '').split(',')[0].strip() or 'Unattributed'
        if r.get('region'):
            SNAP_REGION.setdefault(town, r['region'])
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


def render_edition(path, subscriber_name, towns, moves, delist, all_coverage=False):
    """Flowing edition: a summary up front, then the FULL record — every price
    change, every new launch, every exit, every town benchmark — grouped by
    region and town, paginated. Nothing is truncated: the summary's
    highlights are a reading aid, the tables after them are complete."""
    c = canvas.Canvas(path, pagesize=(W, H))
    c.setTitle(f'Avena Market Pulse — Week {ISOWEEK}, {TODAY.year}')
    scope = 'All coverage' if all_coverage else ', '.join(towns)
    st_cache = {t: town_stats(t) for t in towns}
    regions = {}
    for t in towns:
        regions.setdefault(region_of(t), []).append(t)
    region_order = sorted(regions, key=lambda r: (r == 'Other', r))
    for r in regions:
        regions[r].sort()

    all_moves = [m for t in towns for m in moves.get(t, [])]
    all_del = [d for t in towns for d in delist.get(t, [])]
    all_new = [n for t in towns if st_cache[t] for n in st_cache[t]['new']]
    units = sum(st['units'] for st in st_cache.values() if st)
    ups = sum(1 for m in all_moves if m[2] > m[1])
    downs = len(all_moves) - ups

    state = {'page': 0, 'y': 0}
    BOTTOM = 52

    def bg(num):
        c.setFillColor(BG); c.rect(0, 0, W, H, stroke=0, fill=1)
        c.setFillColor(FAINT); c.setFont('Courier', 6.5)
        c.drawString(M, 24, f'AVENA MARKET PULSE  ·  PREPARED FOR {subscriber_name.upper()}  ·  DATA: AVENA OBSERVATION LEDGER')
        c.drawRightString(W - M, 24, f'{num:02d}')

    def new_page(running=None):
        if state['page']:
            c.showPage()
        state['page'] += 1
        bg(state['page'])
        c.setFillColor(INK); c.setFont('Times-Roman', 13); c.drawString(M, H - 48, 'A V E N A')
        c.setFillColor(FAINT); c.setFont('Courier', 7)
        c.drawRightString(W - M, H - 46, f'MARKET PULSE · WEEK {ISOWEEK} · {TODAY.year}' + (f' · {running.upper()}' if running else ''))
        state['y'] = H - 80

    def need(h, running=None, header=None):
        """Start a new page if fewer than h points remain; optionally redraw
        a table header so every continued table stays readable."""
        if state['y'] - h < BOTTOM:
            new_page(running)
            if header:
                header()
            return True
        return False

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

    def para(text, font='Helvetica', size=9.5, leading=14, color=MUTED, x=M, maxw=W - 2 * M):
        for ln in wrap(text, font, size, maxw):
            need(leading)
            c.setFillColor(color); c.setFont(font, size)
            c.drawString(x, state['y'], ln); state['y'] -= leading

    def eyebrow(text, gap=20):
        need(gap + 30)
        y = state['y']
        c.setStrokeColor(GOLD); c.setLineWidth(0.8); c.line(M, y + 2.5, M + 26, y + 2.5)
        c.setFillColor(GOLD); c.setFont('Courier', 7.5); c.drawString(M + 34, y, ' '.join(text.upper()))
        state['y'] -= gap

    def ref_link(x, y, ref, size=7.5):
        c.setFillColor(GOLD); c.setFont('Courier', size); c.drawString(x, y, ref)
        c.linkURL(f'https://avenaterminal.com/property/{ref}', (x, y - 2, x + 46, y + 8), relative=0)

    def group_head(region, town, count_txt, running):
        need(34, running)
        y = state['y'] - 4
        c.setFillColor(INK); c.setFont('Times-Roman', 11)
        c.drawString(M, y, town)
        c.setFillColor(FAINT); c.setFont('Courier', 6.8)
        c.drawRightString(W - M, y, f'{region.upper()} · {count_txt}')
        c.setStrokeColor(HexColor('#3a3428')); c.setLineWidth(0.5); c.line(M, y - 4, W - M, y - 4)
        state['y'] = y - 15

    def row(cells, colors=None, size=7.3, step=11):
        y = state['y']
        for i, (x, txt) in enumerate(cells):
            col = (colors or {}).get(i, INK)
            c.setFillColor(col); c.setFont('Courier', size)
            if x < 0:
                c.drawRightString(-x, y, txt)
            else:
                c.drawString(x, y, txt)
        state['y'] -= step

    def money(v):
        return f'€{v:,.0f}' if v else '—'

    # ── Page 1: summary ────────────────────────────────────────────────────
    new_page()
    y = H - 104
    c.setStrokeColor(GOLD); c.setLineWidth(0.8); c.line(M, y + 2.5, M + 26, y + 2.5)
    c.setFillColor(GOLD); c.setFont('Courier', 7.5)
    c.drawString(M + 34, y, ' '.join(f'{scope} · {WEEK_AGO.strftime("%d %b")} – {TODAY.strftime("%d %b %Y")}'.upper()))
    c.setFillColor(INK); c.setFont('Times-Roman', 26)
    c.drawString(M, y - 38, f'Every observed price change, week {ISOWEEK}.' if all_coverage else f'{scope}, week {ISOWEEK}.')
    c.setFillColor(GOLD); c.setFont('Times-Italic', 12.5)
    c.drawString(M, y - 62, f'{len(all_moves)} price change(s) · {ups} rise(s) · {downs} reduction(s) · '
                            f'{len(all_del)} left the market · {len(all_new)} new')
    stats = [(f'{len(all_moves)}', 'price changes, every one listed'),
             (f'{downs} / {ups}', 'reductions / rises'),
             (f'{len(all_del)}', 'left the market'),
             (f'{units:,}', f'units under daily watch · {len(towns)} towns')]
    tx = M; tw = (W - 2 * M - 30) / 4; by = y - 132
    for big, small in stats:
        c.setFillColor(SURFACE); c.rect(tx, by, tw, 50, stroke=0, fill=1)
        c.setStrokeColor(HexColor('#3a3428')); c.setLineWidth(0.7); c.rect(tx, by, tw, 50, stroke=1, fill=0)
        c.setFillColor(GOLD); c.setFont('Times-Roman', 14); c.drawString(tx + 10, by + 28, big)
        c.setFillColor(MUTED); c.setFont('Helvetica', 6.6)
        yy2 = by + 16
        for ln in wrap(small, 'Helvetica', 6.6, tw - 16):
            c.drawString(tx + 10, yy2, ln); yy2 -= 8
        tx += tw + 10
    state['y'] = by - 34

    # Region summary table
    eyebrow('By region')
    X = [M, M + 150, M + 205, M + 262, M + 312, M + 362, M + 412]
    row([(X[0], 'REGION'), (X[1], 'TOWNS'), (X[2], 'UNITS'), (X[3], 'CHANGES'),
         (X[4], 'UP'), (X[5], 'DOWN'), (X[6], 'NEW · LEFT')], {i: FAINT for i in range(7)}, size=6.8)
    for rg in region_order:
        ts = regions[rg]
        mv = [m for t in ts for m in moves.get(t, [])]
        u = sum(st_cache[t]['units'] for t in ts if st_cache[t])
        nw = sum(len(st_cache[t]['new']) for t in ts if st_cache[t])
        lf = sum(len(delist.get(t, [])) for t in ts)
        up_ = sum(1 for m in mv if m[2] > m[1])
        row([(X[0], rg), (X[1], str(len(ts))), (X[2], f'{u:,}'), (X[3], str(len(mv))),
             (X[4], str(up_)), (X[5], str(len(mv) - up_)), (X[6], f'{nw} · {lf}')])
    state['y'] -= 14

    # Highlights (reading aid only — the full table follows)
    if all_moves:
        cuts = sorted([m for m in all_moves if m[4] < 0], key=lambda m: m[4])[:6]
        rises = sorted([m for m in all_moves if m[4] > 0], key=lambda m: -m[4])[:6]
        town_of_ref = {m[0]: t for t in towns for m in moves.get(t, [])}
        for title, lst in (('Largest reductions', cuts), ('Largest rises', rises)):
            if not lst:
                continue
            eyebrow(f'{title} · highlights — full table follows', gap=16)
            for ref, f, t, d, pct, _pd in lst:
                need(11)
                ref_link(M, state['y'], ref)
                row([(M + 52, town_of_ref.get(ref, '')[:22]), (M + 190, d), (M + 262, money(f)), (M + 332, '→'),
                     (M + 345, money(t)), (-(W - M), f'{pct:+.1f}%')], {5: GOLD if pct > 0 else RED})
            state['y'] -= 8

    gap_moves = [m for m in all_moves
                 if (dt.date.fromisoformat(m[3]) - dt.date.fromisoformat(m[5])).days > 1]
    if gap_moves:
        state['y'] -= 4
        para(f'{len(gap_moves)} of the changes compare against an observation more than a day earlier '
             f'(a gap in nightly capture); the "since" column in the full table shows the date of the previous '
             f'observation, so each change is stated against the last price actually seen.', size=7.5, leading=10,
             color=FAINT)

    all_held = [h for t in towns for h in HELD.get(t, [])]
    if all_held:
        state['y'] -= 4
        n_unit = sum(1 for h in all_held if h[6] == 'unit_changed')
        para(f'{len(all_held)} further asking-price change(s) are not counted: in {n_unit} the listing switched to a '
             f'different unit (type, bedrooms, bathrooms, built or plot size changed), and '
             f'{len(all_held) - n_unit} large jump(s) could not be verified as the same unit. They are listed '
             f'separately after the full table.', size=7.5, leading=10, color=FAINT)

    # ── Full price-change table ────────────────────────────────────────────
    RUN = 'all price changes'
    PX = [M, M + 52, M + 120, M + 190, M + 262, M + 345]

    def mv_header():
        row([(PX[0], 'REF'), (PX[1], 'SINCE'), (PX[2], 'CHANGED'), (PX[3], 'FROM'),
             (PX[4], 'TO'), (-(W - M), 'CHANGE')], {i: FAINT for i in range(6)}, size=6.5, step=12)

    new_page(RUN)
    eyebrow(f'All price changes · {len(all_moves)} · grouped by region and town')
    para('Every change in asking price observed this week, rises and reductions, with no threshold and no cut-off. '
         'Each reference links to its full dossier.', size=8.5, leading=12)
    state['y'] -= 6
    has_big = False
    if not all_moves:
        para('No observed price changes this week — every tracked unit held its asking price. That stability is itself the finding.')
    for rg in region_order:
        for t in regions[rg]:
            tm = moves.get(t, [])
            if not tm:
                continue
            group_head(rg, t, f'{len(tm)} change(s)', RUN)
            mv_header()
            for ref, f, to, d, pct, pd in sorted(tm, key=lambda m: (m[4], m[0])):
                need(11, RUN, mv_header)
                big = abs(pct) >= 20
                has_big |= big
                ref_link(PX[0], state['y'], ref)
                row([(PX[1], pd), (PX[2], d), (PX[3], money(f)), (PX[4], money(to)),
                     (-(W - M), f'{pct:+.1f}%' + (' ‡' if big else ''))],
                    {4: GOLD if to > f else RED})
            state['y'] -= 6
    if has_big:
        para(f'‡ Move of ±20% or more. Every counted change passed the unit-identity check: same type, bedrooms and '
             f'bathrooms, built and plot size within {ui.SIZE_TOL:.0%}; moves of {ui.LARGE_MOVE:.0%}+ also need full specs, '
             f'the same photo set and a €/m² within {ui.PM2_BAND[0]:g}–{ui.PM2_BAND[1]:g}× the area benchmark.',
             font='Courier', size=6.5, leading=10, color=FAINT)

    # ── Not counted: listing changed unit / unverified ─────────────────────
    if all_held:
        RUN = 'not counted'
        need(120, RUN)
        state['y'] -= 10
        eyebrow(f'Not counted as price changes · {len(all_held)}')
        para('The listing reference stayed the same but the advertised unit did not (a developer re-using one '
             'listing for several units of a building), or a large jump could not be confirmed as the same unit. '
             'Shown for transparency; excluded from every count above.', size=8, leading=11)
        state['y'] -= 4
        HX = [M, M + 52, M + 112, M + 172, M + 232, M + 275]

        def held_header():
            row([(HX[0], 'REF'), (HX[1], 'CHANGED'), (HX[2], 'FROM'), (HX[3], 'TO'), (HX[4], 'ASKING Δ'),
                 (HX[5], 'WHY NOT COUNTED')], {i: FAINT for i in range(6)}, size=6.5, step=12)
        for rg in region_order:
            for t in regions[rg]:
                hl = HELD.get(t, [])
                if not hl:
                    continue
                group_head(rg, t, f'{len(hl)} not counted', RUN)
                held_header()
                for ref, f, to, d, pct, pd, status, note in sorted(hl, key=lambda h: (h[3], h[0])):
                    why = f'{ui.HELD_LABEL.get(status, status)}: {note}' if note else ui.HELD_LABEL.get(status, status)
                    lines = wrap(why, 'Courier', 7.3, W - M - HX[5])
                    need(11 * len(lines), RUN, held_header)
                    ref_link(HX[0], state['y'], ref)
                    row([(HX[1], d), (HX[2], money(f)), (HX[3], money(to)), (HX[4], f'{pct:+.1f}%'),
                         (HX[5], lines[0])], {i: FAINT for i in (2, 3, 4)})
                    for ln in lines[1:]:
                        row([(HX[5], ln)], {0: FAINT})
                state['y'] -= 6

    # ── New on the market ──────────────────────────────────────────────────
    RUN = 'new on the market'
    new_page(RUN)
    eyebrow(f'New on the market · {len(all_new)}')
    if not all_new:
        para('No new launches observed this week.')
    for rg in region_order:
        for t in regions[rg]:
            nl = st_cache[t]['new'] if st_cache[t] else []
            if not nl:
                continue
            group_head(rg, t, f'{len(nl)} new', RUN)
            for ref, typ, bd, pr, d in nl:
                need(11, RUN)
                ref_link(M, state['y'], ref)
                row([(M + 52, (typ or '')[:14]), (M + 150, f'{bd or "?"} bed'), (M + 200, money(pr)),
                     (M + 290, f'first seen {d}')])
            state['y'] -= 6

    # ── Left the market ────────────────────────────────────────────────────
    RUN = 'left the market'
    need(120, RUN)
    state['y'] -= 10
    eyebrow(f'Left the market · {len(all_del)}')
    if not all_del:
        para('No listings left the market this week.')
    for rg in region_order:
        for t in regions[rg]:
            dl = delist.get(t, [])
            if not dl:
                continue
            group_head(rg, t, f'{len(dl)} left', RUN)
            for r in dl:
                need(11, RUN)
                lp = round(float(r['last_price'])) if r.get('last_price') else 0
                ref_link(M, state['y'], r['ref'])
                row([(M + 52, (r.get('type') or '')[:14]), (M + 150, f'last asking {money(lp)}'),
                     (M + 290, f'left {r["last_seen_date"][:10]}')])
            state['y'] -= 6

    # ── Benchmarks ─────────────────────────────────────────────────────────
    RUN = 'town benchmarks'
    BX = [M, M + 140, M + 190, M + 270, M + 340, M + 410]

    def bm_header():
        row([(BX[0], 'TOWN'), (BX[1], 'UNITS'), (BX[2], 'MEDIAN PRICE'), (BX[3], 'NEW €/M²'),
             (BX[4], 'RESALE €/M²'), (-(W - M), 'NEW VS RESALE')], {i: FAINT for i in range(6)}, size=6.5, step=12)

    new_page(RUN)
    eyebrow('Town benchmarks · new-build vs resale €/m²')
    for rg in region_order:
        ts = [t for t in regions[rg] if st_cache[t]]
        if not ts:
            continue
        need(40, RUN)
        c.setFillColor(GOLD); c.setFont('Courier', 7.5); c.drawString(M, state['y'], rg.upper())
        state['y'] -= 13
        bm_header()
        for t in ts:
            st = st_cache[t]
            need(11, RUN, bm_header)
            spread = (st['median_pm2'] / st['resale_pm2'] - 1) * 100 if st['resale_pm2'] and st['median_pm2'] else None
            row([(BX[0], t[:24]), (BX[1], str(st['units'])), (BX[2], money(st['median_price'])),
                 (BX[3], money(st['median_pm2'])), (BX[4], money(st['resale_pm2'])),
                 (-(W - M), f'{spread:+.1f}%' if spread is not None else '—')],
                {5: (RED if spread and spread > 0 else GOLD)})
        state['y'] -= 8
    para('Positive = new-build median €/m² above the town resale benchmark (premium); negative = discount.',
         size=7.5, leading=10, color=FAINT)

    # ── Closing page ───────────────────────────────────────────────────────
    new_page()
    c.setFillColor(INK); c.setFont('Times-Roman', 22)
    c.drawString(M, H - 120, 'Questions about anything in this edition?')
    c.setFillColor(GOLD); c.setFont('Times-Italic', 22)
    c.drawString(M, H - 148, 'Reply to this email — a person answers.')
    state['y'] = H - 190
    para('Change your coverage any time by replying. Data: the Avena observation ledger — every Spanish coastal '
         'new-build observed nightly, with the price history the portals delete. A price change is counted only '
         'when the listing still describes the same unit — same type, bedrooms, bathrooms, and built and plot '
         'size within 2% — so a developer switching one listing between units of a building never shows up '
         'as a price move.',
         size=10, leading=15)
    c.setFillColor(FAINT); c.setFont('Courier', 7)
    c.drawString(M, H - 240, 'AVENA TERMINAL  ·  AVENATERMINAL.COM  ·  HENRIK@AVENATERMINAL.COM  ·  +47 980 71 453')
    c.showPage()
    c.save()


# ── Send ────────────────────────────────────────────────────────────────────

def is_all(sub):
    """towns = {'*'} means the whole book: every town Avena covers, now and as
    coverage grows (resolved at send time, never a frozen list)."""
    return '*' in (sub.get('towns') or [])


def scope_towns(sub, moves, delist):
    if not is_all(sub):
        return list(sub['towns'])
    # Book towns plus any town that only appears in this week's moves/exits
    # (e.g. a development that left the book mid-week) — nothing is dropped.
    return sorted(set(BY_TOWN) | set(moves) | set(delist) | set(HELD))


def send_edition(sub, pdf_path):
    pdf_b64 = base64.b64encode(open(pdf_path, 'rb').read()).decode()
    towns_h = 'All coverage' if is_all(sub) else ', '.join(sub['towns'])
    body = {
        'from': 'Avena Market Pulse <pulse@avenaterminal.com>',
        'reply_to': 'henrik@avenaterminal.com',
        'to': [sub['email']],
        'subject': f'Market Pulse · {towns_h} · week {ISOWEEK}',
        'html': (f'<p>Good morning,</p><p>Your Market Pulse edition for <b>{towns_h}</b> is attached — '
                 f'every observed price movement, launch and exit '
                 f'{"across every town Avena covers" if is_all(sub) else "in your towns"} this week, with links to '
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
        with urlopen_retry(req, timeout=60) as r:
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
        towns = scope_towns(sub, moves, delist)
        render_edition(pdf_path, sub.get('name') or sub['email'], towns, moves, delist, all_coverage=is_all(sub))
        if DRY:
            n = sum(len(moves.get(t, [])) for t in towns)
            held = sum(len(HELD.get(t, [])) for t in towns)
            print(f"pulse [dry]: built {pdf_path} for {sub['email']} ({len(towns)} towns, {n} price changes, "
                  f"{held} not counted)")
            continue
        resend_id = send_edition(sub, pdf_path)
        rest('pulse_deliveries', 'POST', {
            'subscriber_id': sub['id'], 'edition_date': EDITION,
            'towns': sub['towns'], 'resend_id': resend_id,
        })
        print(f"pulse: sent to {sub['email']} ({'all coverage' if is_all(sub) else ', '.join(sub['towns'])}) resend={resend_id}")
        sent += 1
    print(f'pulse: done — {sent} edition(s) sent.')


if __name__ == '__main__':
    main()
