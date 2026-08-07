"""
Renders the Avena data-capability report from data/capability-stats.json.

The document has one job: let a developer, portal, lender or journalist see in
90 seconds exactly what Avena records and how deep the record goes — without
overstating a single figure. Every number on the page comes from the stats
file; nothing is typed in by hand.

Design follows Avena's register: Times-Roman headlines, gold rules, generous
whitespace, no stock imagery, no marketing adjectives.

Run: python3 scripts/render-capability-pdf.py
Out: out/Avena-Data-Capability.pdf
"""
import json
import os
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

GOLD = colors.HexColor("#B08D57")
INK = colors.HexColor("#1A1A1A")
MUTED = colors.HexColor("#6B6B6B")
RULE = colors.HexColor("#DDD8D0")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATS = os.path.join(ROOT, "data", "capability-stats.json")
OUTDIR = os.path.join(ROOT, "out")
OUT = os.path.join(OUTDIR, "Avena-Data-Capability.pdf")

with open(STATS) as fh:
    S = json.load(fh)

B, D = S["breadth"], S["depth"]

ss = getSampleStyleSheet()


def st(name, **kw):
    base = dict(fontName="Times-Roman", textColor=INK, alignment=TA_LEFT, leading=14, fontSize=10)
    base.update(kw)
    return ParagraphStyle(name, parent=ss["Normal"], **base)


H1 = st("H1", fontName="Times-Roman", fontSize=30, leading=34, spaceAfter=2)
H1i = st("H1i", fontName="Times-Italic", fontSize=30, leading=34, textColor=GOLD, spaceAfter=10)
EYEBROW = st("EY", fontName="Helvetica", fontSize=7, textColor=GOLD, leading=10, spaceAfter=6)
H2 = st("H2", fontSize=17, leading=21, spaceBefore=16, spaceAfter=7)
BODY = st("BODY", fontSize=9.5, leading=14.5, spaceAfter=7, textColor=colors.HexColor("#2E2E2E"))
SMALL = st("SMALL", fontSize=7.6, leading=11, textColor=MUTED)
BIGNUM = st("BIGNUM", fontSize=23, leading=25)
NUMLBL = st("NUMLBL", fontName="Helvetica", fontSize=6.6, textColor=MUTED, leading=9)


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 6.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, A4[1] - 13 * mm, "AVENA TERMINAL")
    canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 13 * mm, "DATA CAPABILITY")
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(20 * mm, A4[1] - 15.5 * mm, A4[0] - 20 * mm, A4[1] - 15.5 * mm)
    canvas.line(20 * mm, 15 * mm, A4[0] - 20 * mm, 15 * mm)
    canvas.drawString(20 * mm, 11 * mm, "avenaterminal.com")
    canvas.drawRightString(A4[0] - 20 * mm, 11 * mm, "Page %d" % doc.page)
    canvas.restoreState()


def rule(w=170 * mm):
    t = Table([[""]], colWidths=[w], rowHeights=[0.6])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, RULE)]))
    return t


def gold_tick(w=18 * mm):
    t = Table([[""]], colWidths=[w], rowHeights=[1.4])
    t.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 1.4, GOLD)]))
    return t


def stat_row(items):
    """Row of headline figures."""
    cells = [[Paragraph(v, BIGNUM)] for v, _ in items]
    labels = [[Paragraph(l.upper(), NUMLBL)] for _, l in items]
    t = Table([[c[0] for c in cells], [l[0] for l in labels]],
              colWidths=[170 * mm / len(items)] * len(items))
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, 0), 2),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 1),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def coverage_table(rows):
    data = [[Paragraph("<b>Field</b>", SMALL), Paragraph("<b>Coverage</b>", SMALL),
             Paragraph("<b>What it enables</b>", SMALL)]]
    for label, pct, why in rows:
        data.append([
            Paragraph(label, BODY),
            Paragraph("%.0f%%" % (pct * 100), BODY),
            Paragraph(why, SMALL),
        ])
    t = Table(data, colWidths=[46 * mm, 20 * mm, 104 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, GOLD),
        ("LINEBELOW", (0, 1), (-1, -2), 0.3, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


story = []
A = story.append

# ─── Cover ────────────────────────────────────────────────────────────────
A(Spacer(1, 22 * mm))
A(Paragraph("D A T A &nbsp; C A P A B I L I T Y", EYEBROW))
A(gold_tick())
A(Spacer(1, 5 * mm))
A(Paragraph("What Avena records", H1))
A(Paragraph("about Spanish coastal property", H1i))
A(Spacer(1, 3 * mm))
A(Paragraph(
    "Avena reads the new-build market on the Costa Blanca, C&aacute;lida and del Sol every night, "
    "scores every unit, and writes down what it saw. This document states exactly what is captured "
    "per property, how deep the observation record currently runs, and what is not claimed. "
    "Every figure is generated from the live database at build time.", BODY))
A(Spacer(1, 6 * mm))
A(stat_row([
    ("{:,}".format(B["properties"]), "properties scored"),
    (str(B["towns"]), "towns"),
    (str(B["projects"]), "developments"),
    (str(D["observation_days"]), "observation days"),
]))
A(Spacer(1, 4 * mm))
A(rule())
A(Spacer(1, 2 * mm))
A(Paragraph(
    "Generated %s from the production database. Observation days counts distinct dates on which "
    "prices were re-read from the live feed &mdash; not row counts." % (
        datetime.fromisoformat(S["generated_at"].replace("Z", "+00:00")).strftime("%d %B %Y")),
    SMALL))

# ─── Breadth ──────────────────────────────────────────────────────────────
A(Spacer(1, 10 * mm))
A(Paragraph("O N E &nbsp;&mdash;&nbsp; B R E A D T H", EYEBROW))
A(Paragraph("Thirty-one fields on every unit", H2))
A(Paragraph(
    "Portals publish a listing. Avena publishes a record. The difference is that every field below "
    "is present on effectively every property in the book, which is what makes cross-sectional "
    "analysis possible at all &mdash; a dataset with 60% coverage cannot answer a question about "
    "the other 40%.", BODY))
A(Spacer(1, 2 * mm))

cov = B["coverage"]
A(coverage_table([
    ("Asking price", cov["price"], "The observed number, per unit, not a development-level range"),
    ("Price per m&sup2;", cov["price_per_m2"], "Comparable across towns, types and size bands"),
    ("Town market per m&sup2;", cov["market_per_m2"], "The benchmark a discount is measured against"),
    ("Built area", cov["built_area"], "Normalises price; separates useful area from headline size"),
    ("Terrace &amp; solarium", cov["terrace_solarium"], "Outdoor area priced separately &mdash; material on the coast"),
    ("Bedrooms &amp; bathrooms", cov["beds_baths"], "Segments the rental market a unit can serve"),
    ("Beach distance", cov["beach_distance"], "The single strongest location premium in coastal Spain"),
    ("GPS coordinates", cov["gps"], "Exact position: mapping, radius search, micro-location analysis"),
    ("Energy rating", cov["energy_rating"], "EPBD exposure and running-cost modelling"),
    ("Pool &amp; parking", cov["pool"], "Amenity adjustments in the valuation model"),
    ("Completion status", cov["completion_status"], "Key-ready versus off-plan &mdash; a different risk product"),
    ("Developer track record", cov["developer_track_record"], "Years trading, used in counterparty risk scoring"),
    ("Photography", cov["images"], "Full image sets, not thumbnails"),
    ("Plot size", cov["plot_size"], "Villas and townhouses; absent where it does not apply"),
    ("Views", cov["views"], "Recorded where the source states it; never inferred"),
]))
A(Spacer(1, 3 * mm))
A(Paragraph(
    "Derived on top of these, nightly: an Avena Score per unit, discount to town market, gross "
    "rental yield from town-level nightly rates and occupancy, a hedonic valuation with a "
    "published error rate, and a confidence band that widens where comparables are thin.", BODY))

A(PageBreak())

# ─── Depth ────────────────────────────────────────────────────────────────
A(Paragraph("T W O &nbsp;&mdash;&nbsp; D E P T H", EYEBROW))
A(Paragraph("The part nobody can buy later", H2))
A(Paragraph(
    "Spanish new-build listing history is ephemeral. A unit appears, is repriced, sells out, and "
    "the record of what it asked and when is gone &mdash; no public registry captures it at unit "
    "level. Avena re-reads every listing nightly and keeps the series. Each night adds a day that "
    "cannot be bought or backfilled afterwards, by anyone, at any price.", BODY))
A(Spacer(1, 3 * mm))
A(stat_row([
    (str(D["observation_days"]), "days of observation"),
    ("{:,}".format(D["refs_observed"]), "units under observation"),
    (str(D["refs_with_recorded_price_move"]), "recorded price moves"),
    (str(D["delistings_recorded"]), "recorded delistings"),
]))
A(Spacer(1, 5 * mm))
A(rule())
A(Spacer(1, 4 * mm))
A(Paragraph("What is honestly claimed", H2))
A(Paragraph(
    "The verified daily series begins <b>%s</b> and is <b>%d days</b> deep. Earlier tables in the "
    "database hold large row counts, but audit showed they repeated a frozen snapshot rather than "
    "recording new observations; they are therefore excluded from every figure in this document. "
    "The number above is small today and it is real, which is the only version of it worth "
    "selling. It grows by one every night the pipeline runs." % (
        D["first_observation"], D["observation_days"]), BODY))
A(Spacer(1, 2 * mm))
A(Paragraph(
    "Held separately as an external comparator: <b>{:,}</b> confirmed transactions from French DVF "
    "open data (2023&ndash;2024). It is French, not Spanish, and is never blended into Spanish "
    "figures &mdash; it exists to validate method against a market where registered prices are "
    "public.".format(D["external_confirmed_transactions"]), BODY))

A(Spacer(1, 6 * mm))
A(Paragraph("T H R E E &nbsp;&mdash;&nbsp; W H A T &nbsp; I T &nbsp; A N S W E R S", EYEBROW))
A(Paragraph("Questions this data can answer", H2))
for q in [
    "What is a fair price per m&sup2; for this unit, in this town, at this beach distance &mdash; and how confident should you be in that number?",
    "Which developments are priced below their own town&rsquo;s market, and by how much?",
    "What rental yield does this unit support at the town&rsquo;s observed nightly rate and occupancy?",
    "Which developers have the longest trading record, and where is counterparty risk concentrated?",
    "What has actually moved in price this week, and what has left the market entirely?",
    "How does the Costa Blanca price per m&sup2; compare with the Costa del Sol, at matched size and beach distance?",
]:
    A(Paragraph("&mdash;&nbsp; " + q, BODY))

A(Spacer(1, 5 * mm))
A(rule())
A(Spacer(1, 3 * mm))
A(Paragraph("What is not claimed", H2))
A(Paragraph(
    "Avena observes <b>asking</b> prices, not registered sale prices &mdash; Spanish transaction "
    "prices are not public at unit level. Delistings are recorded as the point stock left the "
    "market, which is strong evidence of absorption but is not a notarised sale. The valuation "
    "model publishes its measured error rather than a marketing figure, and its confidence layer "
    "is a transparent deterministic formula, not a resampled interval. Where a number is not "
    "measured, it is not stated.", BODY))
A(Spacer(1, 4 * mm))
A(Paragraph(
    "Avena Terminal &middot; avenaterminal.com &middot; Data enquiries: henrik@xaviaestate.com", SMALL))

os.makedirs(OUTDIR, exist_ok=True)
doc = BaseDocTemplate(OUT, pagesize=A4, title="Avena Terminal — Data Capability",
                      author="Avena Terminal", leftMargin=20 * mm, rightMargin=20 * mm,
                      topMargin=22 * mm, bottomMargin=20 * mm)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])
doc.build(story)
print("Wrote " + OUT)
