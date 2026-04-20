import type { Metadata } from 'next';
import { ArrowUpRight, Mail, Phone, MessageCircle, MapPin } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';

export const metadata: Metadata = {
  title: 'Contact Henrik — Avena Terminal',
  description:
    'Get in touch with Henrik at Avena Terminal. Personal property consultancy across Costa Blanca, Costa del Sol, and beyond. Replies within 24 hours.',
  alternates: { canonical: 'https://avenaterminal.com/contact' },
  openGraph: {
    title: 'Contact Henrik — Avena Terminal',
    description: 'Personal property consultancy across Costa Blanca and beyond. Replies within 24h.',
    url: 'https://avenaterminal.com/contact',
    siteName: 'Avena Terminal',
  },
};

const CHANNELS = [
  {
    label: 'Email',
    value: 'henrik@xaviaestate.com',
    href: 'mailto:henrik@xaviaestate.com?subject=Avena%20Terminal%20Enquiry',
    icon: Mail,
    meta: 'Replies within 24h · Preferred',
  },
  {
    label: 'WhatsApp',
    value: '+47 93 80 36 65',
    href: 'https://wa.me/4793803665',
    icon: MessageCircle,
    meta: 'Fastest · 09:00–21:00 CET',
  },
  {
    label: 'Phone',
    value: '+47 93 80 36 65',
    href: 'tel:+4793803665',
    icon: Phone,
    meta: 'Mon–Sat · 09:00–18:00 CET',
  },
];

const FAQ = [
  {
    q: 'What do you actually do?',
    a: 'I find undervalued new-build property in Spain using the Avena scoring engine and handle the buying process end-to-end — from first viewing to keys in hand, tax setup, and rental management if you need it.',
  },
  {
    q: 'Do I pay you a commission?',
    a: 'No. Developers pay the commission — my service is free for buyers. If I recommend a property, it is because it scored well on Avena — not because it pays the most commission.',
  },
  {
    q: 'Which areas do you cover?',
    a: 'Primarily Costa Blanca South (Torrevieja, Orihuela Costa, Finestrat, Benidorm), Costa del Sol (Malaga, Marbella, Estepona), and Valencia region. I also broker in Portugal via partner agents.',
  },
  {
    q: 'I am not buying yet, can I still ask questions?',
    a: 'Yes — happy to talk through the market, financing options, yield expectations, or tax implications. No obligation. The Oracle chat can also answer most questions instantly.',
  },
];

export default function ContactPage() {
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />

      <main className="pt-16">
        {/* Hero */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-20 sm:py-28">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena · Founder Desk · Personal
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light leading-[0.95] tracking-tight text-foreground mb-6">
              Henrik replies
              <br />
              <span className="italic text-gold">personally</span>.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground font-light">
              No account managers. No forms routed to a team. Every message comes to me
              directly — Henrik Kolstad, founder of Avena Terminal. Most enquiries answered
              within a few hours, always within 24.
            </p>
          </div>
        </section>

        {/* Channels */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CHANNELS.map((c) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="group rounded-sm border p-6 transition-colors hover:border-primary"
                    style={{
                      background: 'hsl(var(--av-surface) / 0.4)',
                      borderColor: 'hsl(var(--av-border) / 0.6)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-sm"
                        style={{
                          background: 'hsl(var(--av-primary) / 0.1)',
                          color: 'hsl(var(--av-primary))',
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                      {c.label}
                    </div>
                    <div className="font-serif text-xl text-foreground mb-2 break-all">{c.value}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                      {c.meta}
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Two-column: About Henrik + Office */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1400px] px-5 sm:px-12 py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-4">
                Who you&apos;re <span className="italic text-gold">talking to</span>.
              </h2>
              <p className="text-muted-foreground font-light leading-relaxed mb-4">
                I&apos;m Henrik — Norwegian, based between Costa Blanca and Oslo. Built Avena
                Terminal to bring hedge-fund-grade analysis to people buying a home or
                investment property in Spain. Before property, I worked in construction and
                trading. I read every email myself.
              </p>
              <p className="text-muted-foreground font-light leading-relaxed">
                If you want a human view on a specific deal — whether it&apos;s off-plan risk,
                developer track record, rental realism, or a second opinion on something the
                agent is pushing — just ask.
              </p>
            </div>
            <div
              className="rounded-sm border p-8"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Operational Base
                </span>
              </div>
              <div className="font-serif text-2xl text-foreground mb-1">Costa Blanca · Spain</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-6">
                Xavia Estate · Avena Terminal
              </div>
              <div className="space-y-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  <span>Company</span>
                  <span className="text-foreground">Xavia Estate</span>
                </div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  <span>Languages</span>
                  <span className="text-foreground">EN · NO · ES</span>
                </div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  <span>Coverage</span>
                  <span className="text-foreground">Spain + Portugal</span>
                </div>
                <div className="flex justify-between border-t pt-3" style={{ borderColor: 'hsl(var(--av-border) / 0.4)' }}>
                  <span>Viewings</span>
                  <span className="text-foreground">In person + Video</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b" style={{ borderColor: 'hsl(var(--av-border) / 0.6)' }}>
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 py-16">
            <h2 className="font-serif text-3xl font-light tracking-tight text-foreground mb-8">
              Common <span className="italic text-gold">questions</span>.
            </h2>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-sm border p-5"
                  style={{
                    background: 'hsl(var(--av-surface) / 0.4)',
                    borderColor: 'hsl(var(--av-border) / 0.6)',
                  }}
                >
                  <summary className="cursor-pointer font-serif text-lg text-foreground marker:text-primary list-none flex items-center justify-between">
                    <span>{item.q}</span>
                    <span className="font-mono text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground font-light leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-[1000px] px-5 sm:px-12 text-center">
            <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-foreground mb-4">
              Got a property in <span className="italic text-gold">mind</span>?
            </h2>
            <p className="text-muted-foreground mb-8 font-light max-w-lg mx-auto">
              Send me the link or reference. I&apos;ll score it, stress-test the yield, and tell
              you honestly if it&apos;s worth it.
            </p>
            <a
              href="mailto:henrik@xaviaestate.com?subject=Property%20Enquiry%20%E2%80%94%20Avena%20Terminal"
              className="group inline-flex items-center gap-3 rounded-sm px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--av-gradient-gold)' }}
            >
              Email Henrik
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
