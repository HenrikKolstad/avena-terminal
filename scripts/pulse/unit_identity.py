"""Unit identity for price moves — Python mirror of src/lib/unit-identity.ts.

A developer can advertise several units of one building under one listing
ref and switch which unit the ref shows. A price diff alone reads that as a
huge "move". Since 2026-10-24 every price_snapshots row carries the unit's
specs and a `move_status` verdict stamped by a DB trigger
(supabase/migrations/20261024_price_move_verification.sql):

  verified      same unit (type, beds, baths equal; built and plot m² within
                SIZE_TOL) and, for |move| >= LARGE_MOVE, nothing else looks off
  unit_changed  the ref now describes a different unit — NOT a price move
  unverified    a move >= LARGE_MOVE we cannot confirm: spec data missing,
                image set replaced, new €/m² outside PM2_BAND x area
                benchmark, or the price returns exactly to one this ref showed
                within RECUR_DAYS (two units alternating)

Only `verified` changes are counted as price moves. `verdict()` is the
fallback used when a row predates the trigger (move_status is NULL); keep the
constants and rules identical to the SQL and TS versions.
"""

SIZE_TOL = 0.02
LARGE_MOVE = 0.25
PM2_BAND = (0.5, 2.0)
RECUR_DAYS = 365

COUNTED = 'verified'
HELD_LABEL = {
    'unit_changed': 'listing changed unit',
    'unverified': 'large move, unverified',
}


def _pos(v):
    try:
        v = float(v)
    except (TypeError, ValueError):
        return None
    return v if v > 0 else None


def _built(side):
    b = _pos(side.get('built_m2'))
    if b:
        return b
    pm2 = _pos(side.get('pm2'))
    return side['price'] / pm2 if pm2 else None


def verdict(prev, cur, mm2=None, price_recurs=False):
    """prev/cur: dicts with price and optional pm2, type, built_m2, plot_m2,
    beds, baths, img_sig. Returns (status, note) or None if price unchanged."""
    pp, cp = _pos(prev.get('price')), _pos(cur.get('price'))
    if not pp or not cp or abs(cp - pp) < 1:
        return None
    pct = (cp - pp) / pp
    ba, bb = _built(prev), _built(cur)
    rel = lambda a, b: abs(a - b) / max(a, b)
    notes = []
    if prev.get('type') and cur.get('type') and prev['type'] != cur['type']:
        notes.append(f"type {prev['type']}→{cur['type']}")
    for k in ('beds', 'baths'):
        if prev.get(k) is not None and cur.get(k) is not None and int(prev[k]) != int(cur[k]):
            notes.append(f'{k} {prev[k]}→{cur[k]}')
    if ba and bb and rel(ba, bb) > SIZE_TOL:
        notes.append(f'built {round(ba)}→{round(bb)} m²')
    pa, pb = _pos(prev.get('plot_m2')), _pos(cur.get('plot_m2'))
    if pa and pb and rel(pa, pb) > SIZE_TOL:
        notes.append(f'plot {round(pa)}→{round(pb)} m²')
    if notes:
        return 'unit_changed', '; '.join(notes)
    if abs(pct) >= LARGE_MOVE:
        why = []
        if not (ba and bb) or prev.get('beds') is None or cur.get('beds') is None \
                or not prev.get('type') or not cur.get('type'):
            why.append('spec data missing')
        if prev.get('img_sig') and cur.get('img_sig') and prev['img_sig'] != cur['img_sig']:
            why.append('image set replaced')
        m = _pos(mm2)
        if m and bb and not (PM2_BAND[0] <= cp / bb / m <= PM2_BAND[1]):
            why.append(f'€/m² {round(cp / bb)} vs area {round(m)}')
        if price_recurs:
            why.append('returns exactly to an earlier asking price (alternating units)')
        if why:
            return 'unverified', '; '.join(why)
    return 'verified', None
