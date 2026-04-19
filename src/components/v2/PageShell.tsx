import { ReactNode } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';

/**
 * Shared v2 page shell — wraps page content with Nav + Footer + warm dark theme.
 * Applies `avena-v2` class so scoped CSS tokens kick in.
 *
 * Usage:
 *   export default function MyPage() {
 *     return (
 *       <PageShell>
 *         <section>...</section>
 *       </PageShell>
 *     );
 *   }
 */
export function PageShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`avena-v2 min-h-screen ${className}`}>
      <Nav />
      <main className="pt-16">{children}</main>
      <Footer />
    </div>
  );
}

/**
 * Hero section tag — consistent v2 editorial header.
 * Use inside PageShell for the top of each page.
 */
export function PageHero({
  eyebrow,
  title,
  italic,
  subtitle,
  className = '',
}: {
  eyebrow?: string;
  title: ReactNode;
  italic?: string;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative overflow-hidden py-20 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">
        <div className="max-w-4xl">
          {eyebrow && (
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              {eyebrow}
            </span>
          )}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground">
            {title}
            {italic && (
              <>
                {' '}<span className="italic text-gold">{italic}</span>
              </>
            )}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-2xl font-light text-base text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Section wrapper with optional top border divider.
 */
export function PageSection({
  children,
  divider = true,
  className = '',
}: {
  children: ReactNode;
  divider?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`relative py-20 ${divider ? 'border-t' : ''} ${className}`}
      style={divider ? { borderColor: 'hsl(var(--av-border) / 0.6)' } : {}}
    >
      <div className="mx-auto max-w-[1600px] px-5 sm:px-12">{children}</div>
    </section>
  );
}
