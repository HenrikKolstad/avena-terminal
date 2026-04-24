import type { Metadata } from 'next';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { LogoTool } from './LogoTool';

export const metadata: Metadata = {
  title: 'Logo resizer — Avena Terminal',
  description: 'Drop any image, crop to square, export as PNG. Built for internal logo prep + partner submissions.',
  robots: { index: false, follow: false },
};

export default function LogoToolPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-16">
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1200px] px-5 sm:px-12 py-12">
            <span className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Internal · image crop + resize
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-light leading-[0.98] tracking-tight text-foreground mb-3">
              Logo <span className="italic text-gold">resizer</span>.
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground font-light">
              Drop any image, drag the square to pick the region, choose an
              output size, export a PNG. All client-side — nothing uploaded.
            </p>
          </div>
        </section>
        <LogoTool />
      </main>
      <Footer />
    </div>
  );
}
