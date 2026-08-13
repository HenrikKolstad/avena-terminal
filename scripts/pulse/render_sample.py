#!/usr/bin/env python3
"""
Render a bespoke Pulse edition PDF for any town set — the personalized
sample attached to high-value pitches (Henrik's directive 2026-08-13:
"the PDF for big agencies must offer data they'll find genuinely good").

Reuses the exact same engine as the Monday editions, so a sample IS the
product — same data, same layout, nothing mocked. Sends nothing.

Usage:
  python3 scripts/pulse/render_sample.py \
    --name "Taylor Wimpey España" \
    --towns "Mijas,Estepona,Marbella" \
    --out /Users/henk/Desktop/Avena-Pulse-TWEspana.pdf

Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
"""
import argparse
import os
import sys

# generate_editions reads public/data.json relative to CWD: run from repo
# root, and make this script's directory importable regardless of caller.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

parser = argparse.ArgumentParser()
parser.add_argument('--name', required=True)
parser.add_argument('--towns', required=True, help='Comma-separated town names as they appear in the book')
parser.add_argument('--out', required=True)
args = parser.parse_args()

# generate_editions checks sys.argv at import; present as a dry run so the
# Resend key is not required for pure rendering.
sys.argv = ['render_sample', '--dry']
import generate_editions as ge  # noqa: E402

towns = [t.strip() for t in args.towns.split(',') if t.strip()]
known = {t for t in (ge.TOWN_OF.get(p['ref']) for p in ge.BOOK if p.get('ref')) if t}
unknown = [t for t in towns if t not in known]
if unknown:
    sys.exit(f'render_sample: towns not in the book: {unknown}. Known examples: {sorted(known)[:15]}')

moves = ge.fetch_moves()
delist = ge.fetch_delistings()
ge.render_edition(args.out, args.name, towns, moves, delist)
print(f'render_sample: wrote {args.out} for {args.name} ({", ".join(towns)})')
