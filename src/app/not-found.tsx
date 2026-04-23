import Link from 'next/link';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata = {
  title: 'Not found — Avena Terminal',
  robots: { index: false, follow: true },
};

const SHORTCUTS = [
  { href: '/', label: 'Homepage', sub: 'Scored deals + live index' },
  { href: '/terminal-v2', label: 'Terminal v2', sub: 'Keyboard-first interface' },
  { href: '/chat', label: 'Oracle AI', sub: '5 free questions per day' },
  { href: '/coverage', label: 'Coverage', sub: '14 European markets' },
  { href: '/bubble-scanner', label: 'Bubble Scanner', sub: '30 cities, live risk' },
  { href: '/portugal', label: 'Portugal Hub', sub: 'NHR · Golden Visa · regions' },
  { href: '/watchlist', label: 'Watchlist', sub: 'Your saved deals' },
  { href: '/track-record', label: 'Track record', sub: 'Honest hit rate' },
];

export default function NotFound() {
  return (
    <div className="avena-v2 min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 pt-16">
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-[900px] px-5 sm:px-12">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              404 · this page drifted off the terminal
            </span>
            <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Wrong <span className="italic text-gold">coordinates</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light mb-10">
              The URL you landed on doesn&apos;t map to a known Avena surface. The link
              may be stale or the page was renamed. Try one of these anchors,
              or <kbd className="px-2 py-0.5 font-mono text-xs rounded-sm border" style={{ borderColor: 'hsl(var(--av-border-strong))' }}>⌘ K</kbd> to search everything.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group rounded-sm border p-4 transition-colors hover:border-primary/50 flex items-center justify-between gap-3"
                  style={{ background: 'hsl(var(--av-surface) / 0.4)', borderColor: 'hsl(var(--av-border) / 0.6)' }}
                >
                  <div className="min-w-0">
                    <div className="font-serif text-base text-foreground group-hover:text-primary transition-colors">
                      {s.label}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5 truncate">
                      {s.sub}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary flex-shrink-0">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
