/**
 * Unlinked note for the homebuilder-stock test. Not in the nav or the sitemap.
 * The prose is the committed write-up, so the page cannot drift from the file.
 */
import type { Metadata } from 'next';
import { readFileSync } from 'fs';
import path from 'path';

export const metadata: Metadata = {
  title: 'Homebuilder stock signal test',
  description: 'Pre-specified test of whether the Avena coastal new-build series has a relationship with later returns of listed Spanish homebuilder stocks. Sample size and results are on the page.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-static';

function blocks(md: string): string[] {
  return md.replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
}

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function isTable(block: string): boolean {
  const lines = block.split('\n');
  return lines.length >= 2 && lines.every((line) => line.trim().startsWith('|'));
}

function tableHtml(block: string): string {
  const lines = block.split('\n').filter((line) => !/^\|\s*-+/.test(line.trim().replace(/\|/g, '|').replace(/\s/g, ' ')));
  const rows = block.split('\n').filter((line) => !/^\|\s*:?-{3,}/.test(line.replace(/\|/g, '|').trim()) && !/^\|[\s:|-]+\|$/.test(line.trim()));
  const body = rows.map((line, i) => {
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    const tag = i === 0 ? 'th' : 'td';
    return `<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>`;
  }).join('');
  void lines;
  return `<div class="overflow-x-auto"><table>${body}</table></div>`;
}

function htmlBlock(block: string): string {
  if (block.startsWith('```')) {
    const code = block.replace(/^```[a-z]*\n?/, '').replace(/```$/, '');
    return `<pre><code>${inline(code)}</code></pre>`;
  }
  if (isTable(block)) return tableHtml(block);
  if (block.startsWith('# ')) return `<h1>${inline(block.slice(2))}</h1>`;
  if (block.startsWith('## ')) return `<h2>${inline(block.slice(3))}</h2>`;
  if (block.startsWith('### ')) return `<h3>${inline(block.slice(4))}</h3>`;
  if (block.split('\n').every((line) => line.startsWith('- '))) {
    const items = block.split('\n').map((line) => `<li>${inline(line.slice(2))}</li>`).join('');
    return `<ul>${items}</ul>`;
  }
  if (/^\d+\. /.test(block)) {
    const items = block.split('\n').map((line) => `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`).join('');
    return `<ol>${items}</ol>`;
  }
  return `<p>${inline(block).replace(/\n/g, '<br/>')}</p>`;
}

export default function BuilderStockSignalPage() {
  const md = readFileSync(path.join(process.cwd(), 'research', 'builder-stock-signal.md'), 'utf8');
  const html = blocks(md).map(htmlBlock).join('\n');
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-[15px] leading-7 text-neutral-200">
      <style>{`
        main h1 { font-size: 1.75rem; line-height: 1.25; margin: 0 0 1rem; }
        main h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; }
        main p, main ul, main ol { margin: 0 0 1rem; }
        main ul, main ol { padding-left: 1.25rem; }
        main table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin: 0 0 1rem; }
        main th, main td { border-bottom: 1px solid rgba(255,255,255,0.12); text-align: left; padding: 0.35rem 0.45rem; vertical-align: top; }
        main code, main pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; }
        main pre { overflow-x: auto; padding: 0.75rem; background: rgba(255,255,255,0.04); }
      `}</style>
      <article dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
