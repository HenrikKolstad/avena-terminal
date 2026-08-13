#!/usr/bin/env python3
"""
Round-1 follow-up factory (2026-08-13, Henrik's directive: exceptional and
individual). For each of the 30 agencies pitched 2026-08-12:
 - their patch (researched today, mapped to book town names)
 - a bespoke PDF edition for exactly those towns (same engine as Monday)
 - a personalized follow-up body whose numbers are THEIR towns' actual week
Everything lands as Mail drafts for Henrik's one-by-one review. Sends nothing.
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.argv = ['build_followups', '--dry']
import generate_editions as ge  # noqa: E402

OUT_DIR = os.path.expanduser('~/Desktop/followup-pdfs')
os.makedirs(OUT_DIR, exist_ok=True)

# domain-keyed: (email, display name, [book towns], generic_fallback)
AGENCIES = [
 ("contact@homenetspain.com", "Homenet Spain", ["Fuengirola", "Mijas", "Estepona", "Benalmádena"], False),
 ("infospanien@smg.se", "Svenska Mäklargruppen", ["Estepona", "Marbella", "Fuengirola", "Nerja"], False),
 ("info@alicante-realestate.com", "Alicante Real Estate", ["Torrevieja", "Alicante", "Guardamar del Segura", "Orihuela Costa"], False),
 ("info@neubaucostablanca.de", "Neubau Costa Blanca", ["Algorfa", "Los Alcazares"], False),
 ("info@hadc.nl", "Huis aan de Costa", ["Algorfa", "Rojales", "San Pedro del Pinatar"], False),
 ("info@costablanca4you.nl", "Costa Blanca 4You", ["Torrevieja", "San Miguel de Salinas", "Pilar de La Horadada"], False),
 ("info@bromleyestatesmarbella.com", "Bromley Estates Marbella", ["Marbella", "Mijas", "Estepona", "Fuengirola"], False),
 ("info@iberica-estates.com", "Ibérica Estates", ["Torrevieja", "Pilar de La Horadada", "San Pedro del Pinatar"], False),
 ("info@costadelsoldevelopments.com", "Costa del Sol Developments", ["Mijas", "Estepona", "Marbella"], False),
 ("info@yourpropertyconcept.com", "Your Property Concept", ["Sotogrande", "Mijas", "Marbella", "Casares"], False),
 ("info@uniqestates.eu", "UNIQ Estates", ["Torrevieja", "Marbella", "Orihuela Costa", "Estepona"], False),
 ("info@adaletaspain.com", "Adaleta", ["Orihuela Costa", "Torrevieja", "Pilar de La Horadada"], False),
 ("info@immodilana.be", "Immo Dilana", ["Pilar de La Horadada", "Finestrat"], False),
 ("info@areacostablanca.com", "Area Costa Blanca", ["Calpe", "Benissa", "Benitachell", "Altea"], False),
 ("info@escapasol.com", "Escapasol", ["Torrevieja", "Alicante", "Los Alcazares", "Santa Pola"], False),
 ("contact@immobilier-costablanca.fr", "Immobilier Costa Blanca", ["Denia", "Calpe", "Altea", "Benissa"], False),
 ("kontakt@cudnahiszpania.pl", "Cudna Hiszpania", ["Calpe", "Los Alcazares", "Mazarron", "Denia"], False),
 ("info@costaagent.com", "Costa Agent", ["Benalmádena", "Estepona", "Marbella", "Benidorm"], False),
 ("info@davinci-immobilien.de", "DaVinci Immobilien", ["Denia", "Benitachell", "Calpe", "Benissa"], False),
 ("info@kohlmannrealestate.com", "Kohlmann Real Estate", ["Torrevieja", "Orihuela Costa"], False),
 ("office@costablanca-villen.eu", "Costa Blanca Villen", ["Altea", "Calpe", "Ciudad Quesada", "Benitachell"], False),
 ("info@wohn-glueck.com", "Wohn-Glück", ["Estepona", "Torrevieja"], True),
 ("info@koopinspanje.nl", "Koop in Spanje", ["Villajoyosa", "Altea", "Benissa", "Finestrat"], False),
 ("info@costaselect.com", "Costa Select", ["Marbella", "Estepona", "Calpe", "Denia"], False),
 ("info@inmoinvestments.com", "Inmo Investments", ["Orihuela Costa", "Torrevieja", "Ciudad Quesada"], False),
 ("info@encompass.es", "Encompass", ["Orihuela Costa", "Torrevieja", "Los Alcazares"], False),
 ("info@labellavitarealestate.com", "La Bella Vita", ["Los Alcazares", "Pilar de La Horadada", "Torrevieja", "San Javier"], False),
 ("info@esphouses.com", "ESP Houses", ["Alicante", "Altea", "Guardamar del Segura", "Finestrat"], False),
 ("info@completespanishproperty.com", "Complete Spanish Property", ["Ciudad Quesada", "Torrevieja", "Rojales"], False),
 ("info@vidando.com", "Vidando", ["Orihuela Costa", "Torre Pacheco", "Formentera del Segura"], False),
]

# Validate every town against the book before doing anything.
known = {t for t in (ge.TOWN_OF.get(p['ref']) for p in ge.BOOK if p.get('ref')) if t}
bad = [(n, t) for _, n, towns, _ in AGENCIES for t in towns if t not in known]
if bad:
    sys.exit(f'unknown towns: {bad}')

print('fetching ledger data (once)...')
moves = ge.fetch_moves()
delist = ge.fetch_delistings()
by_town_count = {}
for p in ge.BOOK:
    t = ge.TOWN_OF.get(p.get('ref'))
    if t:
        by_town_count[t] = by_town_count.get(t, 0) + 1

def town_line(t):
    ms = moves.get(t, [])
    cuts = sum(1 for m in ms if m[2] < m[1])
    dl = len(delist.get(t, []))
    n = by_town_count.get(t, 0)
    if not ms and not dl:
        return f"  - {t}: no observed changes this week across {n} tracked listings - a measured flat week."
    parts = []
    if ms:
        parts.append(f"{len(ms)} observed price change{'s' if len(ms)!=1 else ''}" + (f" ({cuts} cut{'s' if cuts!=1 else ''})" if cuts else ""))
    if dl:
        parts.append(f"{dl} left the market")
    return f"  - {t}: " + ", ".join(parts) + f" - {n} listings under nightly watch."

def build_body(name, towns, generic):
    lines = []
    lines.append("Hi,")
    lines.append("")
    lines.append("Quick follow-up to Tuesday's letter about our weekly newspaper for the Spanish new-build market. This time, your numbers, not mine:")
    lines.append("")
    if generic:
        lines.append("Across the coast this week: 59 observed asking-price changes (21 cuts, 38 raises) and 39 properties left the market at a median final asking price of EUR 6,040/m2. The attached edition shows a sample of what subscribers receive every Monday.")
    else:
        lines.append("Your patch this week, from our nightly observation ledger:")
        for t in towns:
            lines.append(town_line(t))
        lines.append("")
        lines.append(f"The attached edition covers exactly these towns - {', '.join(towns)} - as of this morning. The portals show today's price and delete yesterday's; we keep the record, and it cannot be reconstructed by anyone starting today.")
    lines.append("")
    lines.append("One update since Tuesday: EUR 500/month now covers your whole market - up to 10 towns of your choice, changeable anytime. Every Monday at 08:00 CET, plus same-day alerts whenever anything reprices in between. Cancel any time, and if the first month doesn't show you something about your market you didn't already know - tell me, and I'll refund it in full.")
    lines.append("")
    lines.append("Start directly here and everything runs automatically: https://buy.stripe.com/14A7sK0I92TO5gr6VhbV600")
    lines.append("")
    lines.append("Questions first? Just reply - or call me: +47 980 71 453.")
    lines.append("")
    lines.append("Henrik Kolstad")
    lines.append("AVENA - avenaterminal.com")
    return "\n".join(lines)

def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '" & return & "')

ok, fail = 0, []
for email, name, towns, generic in AGENCIES:
    pdf = os.path.join(OUT_DIR, f"Avena-Pulse-{email.split('@')[1].split('.')[0]}.pdf")
    ge.render_edition(pdf, name, towns, moves, delist)
    body = build_body(name, towns, generic)
    subj = "Re: The first weekly newspaper for the Spanish new-build market"
    script = f'''
tell application "Mail"
  set d to make new outgoing message with properties {{sender:"AVENA <henrik@avenaterminal.com>", subject:"{subj}", content:"{esc(body)}", visible:false}}
  tell d to make new to recipient with properties {{address:"{email}"}}
  tell content of d to make new attachment with properties {{file name:POSIX file "{pdf}"}} at after the last paragraph
  delay 0.4
  save d
end tell'''
    r = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
    if r.returncode == 0:
        ok += 1
        print(f'  draft: {name} <{email}> ({", ".join(towns)})')
    else:
        fail.append((email, r.stderr.strip()[:100]))

print(f'\ndrafts created: {ok}/{len(AGENCIES)}')
for f in fail:
    print('FAILED:', f)
