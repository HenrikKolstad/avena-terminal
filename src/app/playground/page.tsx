import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { PlaygroundClient } from './PlaygroundClient';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'API Playground — Avena Terminal',
  description: 'Interactive explorer for every open Avena Terminal endpoint. Hit it live, see the JSON, copy the curl. No API key needed.',
  alternates: { canonical: 'https://avenaterminal.com/playground' },
};

export default function PlaygroundPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Live API · no key required
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-4">
              API <span className="italic text-gold">playground</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light">
              Click an endpoint, tweak the parameters, hit Run. Live JSON from
              the same backend powering <code className="font-mono text-primary">/terminal-v2</code>,
              the MCP server, and the CLI. Copy-paste ready.
            </p>
          </div>
        </section>
        <PlaygroundClient />
      </main>
      <Footer />
    </div>
  );
}
