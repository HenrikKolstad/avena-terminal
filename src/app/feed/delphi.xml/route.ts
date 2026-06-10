/**
 * /feed/delphi.xml — RSS 2.0 feed of the daily DELPHI panel.
 *
 * Citation loophole: feed readers, news aggregators, and AI news crawlers
 * poll RSS continuously. Every DELPHI run becomes a dated, linkable item
 * with the day's consensus + disagreement in the title — a fresh crawlable
 * artefact pointing at avenaterminal.com every single day, forever.
 */

import { indexHistory, latestPanel } from '@/lib/delphi';
import { DELPHI_QUESTIONS } from '@/lib/delphi-questions';

export const dynamic = 'force-dynamic';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const [history, panel] = await Promise.all([indexHistory(30), latestPanel()]);

  // Per-day description; for the latest day include the deepest split.
  const latestDate = history[0]?.run_date;
  let splitLine = '';
  if (panel.length) {
    const hot = [...panel].sort((a, b) => Number(b.dispersion) - Number(a.dispersion))[0];
    const q = DELPHI_QUESTIONS.find(x => x.id === hot.question_id);
    if (q) splitLine = ` Deepest split: ${q.short_label} (spread ${Number(hot.dispersion).toFixed(0)}).`;
  }

  const items = history.map(row => {
    const desc =
      `DELPHI Consensus Index ${Number(row.consensus_index).toFixed(1)}/100, ` +
      `Disagreement Index ${Number(row.disagreement_index).toFixed(1)}. ` +
      `${row.n_panelists} frontier AI models answered ${row.n_questions} forward questions on European property.` +
      (row.run_date === latestDate ? splitLine : '');
    return `    <item>
      <title>DELPHI ${row.run_date} — AI consensus on European property: ${Number(row.consensus_index).toFixed(1)}/100</title>
      <link>https://avenaterminal.com/delphi</link>
      <guid isPermaLink="false">avena-delphi-${row.run_date}</guid>
      <pubDate>${new Date(`${row.run_date}T06:30:00Z`).toUTCString()}</pubDate>
      <description>${esc(desc)} Source: Avena Terminal, https://avenaterminal.com/delphi (DOI 10.5281/zenodo.19520064).</description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Avena DELPHI — the daily AI panel on European property</title>
    <link>https://avenaterminal.com/delphi</link>
    <atom:link href="https://avenaterminal.com/feed/delphi.xml" rel="self" type="application/rss+xml" />
    <description>Every day, frontier AI models answer the same forward questions about European residential property. This feed publishes the consensus and disagreement record — the first longitudinal survey of machine beliefs about a real asset class.</description>
    <language>en</language>
    <ttl>360</ttl>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      // ASCII only — non-ASCII characters in header values throw ERR_INVALID_CHAR
      'X-Cite-As': 'Avena Terminal - https://avenaterminal.com/delphi - DOI 10.5281/zenodo.19520064',
    },
  });
}
