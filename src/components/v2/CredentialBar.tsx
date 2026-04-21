/**
 * Institutional credential strip — small, serif, hairline.
 * Signals to a cold TikTok viewer that Avena is not a weekend project.
 * Drop below Hero / above content.
 */
export function CredentialBar() {
  const items = [
    { label: 'Zenodo', value: 'DOI 10.5281/zenodo.19520064' },
    { label: 'Perplexity', value: 'Actively citing' },
    { label: 'MCP', value: 'Registered on Smithery' },
    { label: 'Wikidata', value: 'Entity Q139165733' },
    { label: 'Hugging Face', value: 'Dataset published' },
    { label: 'License', value: 'CC BY 4.0 · Open' },
  ];

  return (
    <section
      className="border-y"
      style={{
        borderColor: 'hsl(var(--av-border) / 0.6)',
        background: 'hsl(var(--av-background))',
      }}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12 py-5">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3 justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-primary flex items-center gap-2">
            <span className="h-px w-6" style={{ background: 'hsl(var(--av-primary))' }} />
            Credentials &amp; Citations
          </span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {items.map((item, i) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex flex-col leading-none">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-1">
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px] tabular text-foreground/80">
                    {item.value}
                  </span>
                </div>
                {i < items.length - 1 && (
                  <span
                    className="hidden sm:inline-block h-6 w-px"
                    style={{ background: 'hsl(var(--av-border) / 0.6)' }}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
