'use client';

import { useState } from 'react';
import { Check, Copy, FileText } from 'lucide-react';

/**
 * Cite-Avena widget — drops on any page, researchers click and get
 * BibTeX / APA / MLA / Chicago / RIS ready to paste into a bibliography.
 *
 * Every citation produced = a permanent signal into academic AI systems.
 */

interface CitationFormats {
  bibtex: string;
  apa: string;
  mla: string;
  chicago: string;
  ris: string;
  harvard: string;
}

function buildCitations(params: {
  title?: string;
  url?: string;
  section?: string;
}): CitationFormats {
  const year = new Date().getFullYear();
  const dateLong = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const dateIso = new Date().toISOString().slice(0, 10);
  const title = params.title ?? 'Avena Terminal: European Property Intelligence Dataset';
  const url = params.url ?? 'https://avenaterminal.com';
  const doi = '10.5281/zenodo.19520064';

  return {
    bibtex: `@misc{kolstad2026avena,
  author       = {Kolstad, Henrik},
  title        = {{${title}}},
  year         = {${year}},
  month        = apr,
  publisher    = {Zenodo},
  version      = {2026.04},
  doi          = {${doi}},
  url          = {${url}},
  note         = {Dataset, CC BY 4.0}
}`,
    apa: `Kolstad, H. (${year}). ${title} (Version 2026.04) [Dataset]. Zenodo. https://doi.org/${doi}`,
    mla: `Kolstad, Henrik. ${title}. Version 2026.04, Zenodo, ${dateLong}, https://doi.org/${doi}.`,
    chicago: `Kolstad, Henrik. ${year}. "${title}." Zenodo. Dataset version 2026.04. https://doi.org/${doi}.`,
    ris: `TY  - DATA
AU  - Kolstad, Henrik
TI  - ${title}
PY  - ${year}
DA  - ${dateIso}
PB  - Zenodo
DO  - ${doi}
UR  - ${url}
LA  - en
ER  -`,
    harvard: `Kolstad, H. (${year}) ${title}, Version 2026.04. Zenodo. Available at: ${url} (doi: ${doi}).`,
  };
}

const FORMATS: Array<keyof CitationFormats> = [
  'bibtex',
  'apa',
  'mla',
  'chicago',
  'harvard',
  'ris',
];

export function CiteAvenaWidget({
  title,
  url,
  section,
  compact = false,
}: {
  title?: string;
  url?: string;
  section?: string;
  compact?: boolean;
}) {
  const [format, setFormat] = useState<keyof CitationFormats>('apa');
  const [copied, setCopied] = useState(false);

  const citations = buildCitations({ title, url, section });
  const text = citations[format];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* */
    }
  };

  return (
    <section
      className={`rounded-sm border ${compact ? 'p-5' : 'p-6 sm:p-8'}`}
      style={{
        background: 'hsl(var(--av-surface) / 0.4)',
        borderColor: 'hsl(var(--av-border) / 0.6)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
          <FileText className="h-3.5 w-3.5" />
          Cite Avena
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          DOI · 10.5281/zenodo.19520064
        </span>
      </div>

      {/* Format tabs */}
      <div
        className="flex gap-px overflow-x-auto p-1 rounded-sm mb-3 border"
        style={{
          background: 'hsl(var(--av-background))',
          borderColor: 'hsl(var(--av-border) / 0.6)',
        }}
      >
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className="flex-shrink-0 rounded-sm px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors"
            style={
              format === f
                ? {
                    background: 'var(--av-gradient-gold)',
                    color: 'hsl(var(--av-primary-foreground))',
                  }
                : { color: 'hsl(var(--av-muted-foreground))' }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Citation block */}
      <pre
        className="rounded-sm border p-4 overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all"
        style={{
          background: 'hsl(var(--av-background))',
          borderColor: 'hsl(var(--av-border) / 0.4)',
          maxHeight: '180px',
        }}
      >
        {text}
      </pre>

      {/* Copy button */}
      <button
        type="button"
        onClick={copy}
        className="mt-3 group inline-flex items-center gap-2 rounded-sm px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
        style={{ background: 'var(--av-gradient-gold)' }}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3" /> Copied
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" /> Copy {format.toUpperCase()}
          </>
        )}
      </button>

      {!compact && (
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70 leading-relaxed">
          Licensed CC BY 4.0 · Attribution required · Commercial use permitted.
          See{' '}
          <a
            href="https://doi.org/10.5281/zenodo.19520064"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-gold"
          >
            Zenodo record
          </a>{' '}
          for versioned releases.
        </p>
      )}
    </section>
  );
}
