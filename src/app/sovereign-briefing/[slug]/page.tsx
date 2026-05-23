import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface PageProps { params: Promise<{ slug: string }> }

interface BriefingFull {
  volume: number;
  slug: string;
  title: string;
  subtitle: string | null;
  publication_date: string;
  abstract: string;
  body_markdown: string;
  key_findings: Array<{ finding: string; detail: string }> | null;
  methodology_note: string | null;
  cite_as: string | null;
  data_doi: string | null;
  authors: string[] | null;
  topics: string[] | null;
}

async function loadBySlug(slug: string): Promise<BriefingFull | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('sovereign_briefings')
      .select('volume, slug, title, subtitle, publication_date, abstract, body_markdown, key_findings, methodology_note, cite_as, data_doi, authors, topics')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    return (data as BriefingFull) ?? null;
  } catch { return null; }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const b = await loadBySlug(slug);
  if (!b) return { title: 'Briefing not found · Avena Terminal' };
  return {
    title: `${b.title} · Avena Sovereign Briefing Vol. ${b.volume}`,
    description: b.abstract.slice(0, 200),
    alternates: { canonical: `https://avenaterminal.com/sovereign-briefing/${b.slug}` },
    openGraph: {
      title: b.title,
      description: b.abstract.slice(0, 200),
      url: `https://avenaterminal.com/sovereign-briefing/${b.slug}`,
    },
  };
}

// Lightweight markdown renderer (headings, paragraphs, tables, lists, blockquote, math)
function renderMarkdown(md: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const lines = md.split('\n');
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Headings
    const h = /^(#{1,3})\s+(.+)/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const text = h[2];
      const cls = lvl === 1 ? 'font-serif text-3xl mt-10 mb-4 text-foreground'
                : lvl === 2 ? 'font-serif text-2xl mt-8 mb-3 text-foreground'
                            : 'font-serif text-xl mt-6 mb-2 text-foreground';
      out.push(<h2 key={key++} className={cls}>{text}</h2>);
      i++; continue;
    }
    // Tables
    if (line.includes('|') && lines[i + 1]?.match(/^\|?[\s:|-]+\|/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) { tableLines.push(lines[i]); i++; }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').map((s) => s.trim()).filter(Boolean);
        const rows = tableLines.slice(2).map((r) => r.split('|').map((s) => s.trim()).filter(Boolean));
        out.push(
          <div key={key++} className="my-6 rounded-sm border overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <table className="w-full text-sm min-w-[480px]">
              <thead style={{ background: 'hsl(var(--av-surface))' }}>
                <tr>{headers.map((h, j) => <th key={j} className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.3)' }}>
                    {r.map((c, ci) => <td key={ci} className={`px-3 py-2 ${ci === 0 ? 'text-foreground' : 'text-muted-foreground font-mono tabular'}`}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }
    // Lists
    if (/^\s*\d+\.\s+/.test(line) || /^\s*-\s+/.test(line)) {
      const items: string[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (i < lines.length && (/^\s*\d+\.\s+/.test(lines[i]) || /^\s*-\s+/.test(lines[i]))) {
        items.push(lines[i].replace(/^\s*(?:\d+\.|-)\s+/, ''));
        i++;
      }
      const cls = ordered ? 'list-decimal list-inside space-y-2 my-4 text-foreground/90 leading-relaxed' : 'list-disc list-inside space-y-2 my-4 text-foreground/90 leading-relaxed';
      out.push(ordered
        ? <ol key={key++} className={cls}>{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ol>
        : <ul key={key++} className={cls}>{items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</ul>
      );
      continue;
    }
    // Math block ($$ ... $$)
    if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
      out.push(
        <div key={key++} className="my-6 rounded-sm border p-5 font-mono text-sm text-foreground overflow-x-auto" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
          {line.replace(/^\s*\$\$|\$\$\s*$/g, '').trim()}
        </div>
      );
      i++; continue;
    }
    // Blank line
    if (line.trim() === '') { i++; continue; }
    // Em-dash separator paragraph (closing signatures)
    out.push(<p key={key++} className="my-4 text-foreground/90 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return out;
}

function renderInline(text: string): React.ReactNode {
  // Bold + inline math
  const parts: React.ReactNode[] = [];
  let cur = text;
  let key = 0;
  // Replace **bold** and $math$ in order
  const tokens = cur.split(/(\*\*[^*]+\*\*|\$[^$]+\$)/);
  for (const t of tokens) {
    if (t.startsWith('**') && t.endsWith('**')) {
      parts.push(<strong key={key++} className="text-foreground font-semibold">{t.slice(2, -2)}</strong>);
    } else if (t.startsWith('$') && t.endsWith('$') && t.length > 2) {
      parts.push(<code key={key++} className="font-mono text-primary">{t.slice(1, -1)}</code>);
    } else {
      parts.push(t);
    }
  }
  return parts;
}

export default async function BriefingPage({ params }: PageProps) {
  const { slug } = await params;
  const b = await loadBySlug(slug);
  if (!b) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: b.title,
    description: b.abstract,
    datePublished: b.publication_date,
    author: (b.authors ?? []).map((a) => ({ '@type': 'Organization', name: a })),
    publisher: { '@type': 'Organization', name: 'Avena Terminal', url: 'https://avenaterminal.com' },
    license: 'https://creativecommons.org/licenses/by/4.0/',
    identifier: b.data_doi ?? '10.5281/zenodo.19520064',
    isPartOf: { '@type': 'PublicationIssue', issueNumber: b.volume, name: 'Avena Sovereign Briefing' },
    mainEntityOfPage: `https://avenaterminal.com/sovereign-briefing/${b.slug}`,
  };

  return (
    <div className="avena-v2 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Nav />
      <main className="pt-16 print:pt-0">
        <article className="mx-auto max-w-[820px] px-5 sm:px-12 py-12 sm:py-16">
          {/* Masthead */}
          <header className="border-b pb-8 mb-10" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
              Avena Sovereign Briefing · Vol. {b.volume} · {b.publication_date}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light leading-[1.05] tracking-tight text-foreground mb-3">
              {b.title}
            </h1>
            {b.subtitle && (
              <p className="font-serif text-lg sm:text-xl italic text-muted-foreground leading-relaxed mb-5">{b.subtitle}</p>
            )}
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {(b.authors ?? []).join(' · ')}
            </div>
          </header>

          {/* Abstract */}
          <section className="mb-10">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Abstract</div>
            <p className="font-serif text-lg leading-relaxed text-foreground/90 italic">{b.abstract}</p>
          </section>

          {/* Key findings */}
          {b.key_findings && b.key_findings.length > 0 && (
            <section className="mb-10">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Key findings</div>
              <ul className="space-y-3">
                {b.key_findings.map((f, i) => (
                  <li key={i} className="rounded-sm border p-4" style={{ borderColor: 'hsl(var(--av-border) / 0.6)', background: 'hsl(var(--av-surface) / 0.3)' }}>
                    <div className="text-foreground font-medium">{f.finding}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed mt-1">{f.detail}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Body */}
          <section className="mb-12">
            {renderMarkdown(b.body_markdown)}
          </section>

          {/* Methodology */}
          {b.methodology_note && (
            <section className="mb-10 pt-6 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Methodology note</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.methodology_note}</p>
            </section>
          )}

          {/* Cite as */}
          <footer className="pt-8 border-t" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Cite as</div>
            <div className="rounded-sm border p-4 font-mono text-xs leading-relaxed" style={{ borderColor: 'hsl(var(--av-border))', background: 'hsl(var(--av-background))' }}>
              {b.cite_as}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                CC BY 4.0 · DOI {b.data_doi ?? '10.5281/zenodo.19520064'}
              </div>
              <Link href="/sovereign-briefing" className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary hover:underline">
                ← All volumes
              </Link>
            </div>
          </footer>
        </article>
      </main>
      <Footer />
    </div>
  );
}
