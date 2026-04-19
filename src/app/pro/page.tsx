'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { ProModal } from '@/components/v2/ProModal';
import { useAuth } from '@/context/AuthContext';

export default function ProPage() {
  const { isPaid } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        <section className="relative overflow-hidden py-24 sm:py-32">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: 'radial-gradient(ellipse at top, hsl(42 85% 64% / 0.22), transparent 60%)' }}
          />
          <div className="relative mx-auto max-w-[1600px] px-5 sm:px-12 text-center">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena PRO · €79 / mo
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            </span>
            <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-light leading-[0.95] tracking-tight text-foreground">
              Signal over
              <br />
              <span className="italic text-gold">speculation</span>.
            </h1>
            <p className="mx-auto mt-8 max-w-xl font-light text-base text-muted-foreground sm:text-lg">
              The full Avena intelligence stack. Unlimited Oracle. Live alpha signals.
              Developer stress scores. Everything, unlocked.
            </p>

            <div className="mt-12 flex justify-center">
              {isPaid ? (
                <Link
                  href="/chat"
                  className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Open the Oracle
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  onClick={() => setModalOpen(true)}
                  className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Upgrade to PRO — €79 / mo
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )}
            </div>

            <p className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span>Cancel anytime</span>
              <span>· Stripe checkout</span>
              <span>· 7-day refund</span>
            </p>
          </div>
        </section>
      </main>

      <Footer />

      <ProModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
