'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Mail, Lock as LockIcon, CheckCircle2 } from 'lucide-react';
import { Nav } from '@/components/v2/Nav';
import { Footer } from '@/components/v2/Footer';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { user, isPaid, signInWithEmail, signInWithPassword, signOut } = useAuth();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSent(false);

    if (mode === 'magic') {
      const { error } = await signInWithEmail(email.trim());
      if (error) setError(error);
      else setSent(true);
    } else {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) setError(error);
    }
    setLoading(false);
  }

  /* ── Already signed in ── */
  if (user) {
    return (
      <div className="avena-v2 min-h-screen">
        <Nav />
        <main className="pt-24 pb-20">
          <div className="mx-auto max-w-[600px] px-5 sm:px-12">
            <div
              className="rounded-sm border p-10 text-center"
              style={{
                background: 'hsl(var(--av-surface) / 0.4)',
                borderColor: 'hsl(var(--av-border) / 0.6)',
              }}
            >
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
              <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
                Authenticated
              </span>
              <h1 className="font-serif text-4xl font-light text-foreground mt-4 mb-3">
                Welcome <span className="italic text-gold">back</span>.
              </h1>
              <p className="text-muted-foreground font-light mb-2">{user.email}</p>
              <div className="inline-flex items-center gap-2 mb-8">
                <span
                  className="pulse-dot relative inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: isPaid ? 'hsl(var(--av-primary))' : 'hsl(var(--av-border-strong))' }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {isPaid ? 'PRO · Unlimited' : 'Free tier'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="group inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold"
                  style={{ background: 'var(--av-gradient-gold)' }}
                >
                  Enter Avena
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <button
                  onClick={() => signOut()}
                  className="rounded-sm border px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ borderColor: 'hsl(var(--av-border-strong))' }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  /* ── Signed-out form ── */
  return (
    <div className="avena-v2 min-h-screen">
      <Nav />
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-[520px] px-5 sm:px-12">
          <div className="text-center mb-10">
            <span className="mb-6 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.4em] text-primary">
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
              Avena Terminal
              <span className="h-px w-10" style={{ background: 'hsl(var(--av-primary))' }} />
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl font-light leading-[0.95] tracking-tight text-foreground mb-4">
              Sign <span className="italic text-gold">in</span>.
            </h1>
            <p className="text-muted-foreground font-light">
              {mode === 'magic'
                ? 'We\u2019ll email you a magic link. No password needed.'
                : 'Enter your email and password.'}
            </p>
          </div>

          <div
            className="rounded-sm border p-7"
            style={{
              background: 'hsl(var(--av-surface) / 0.4)',
              borderColor: 'hsl(var(--av-border) / 0.6)',
            }}
          >
            {/* Toggle */}
            <div
              className="flex gap-px p-1 rounded-sm mb-6"
              style={{ background: 'hsl(var(--av-border) / 0.4)' }}
            >
              {(['magic', 'password'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setSent(false);
                  }}
                  className={`flex-1 py-2 rounded-sm font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${
                    mode === m ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={
                    mode === m
                      ? { background: 'var(--av-gradient-gold)' }
                      : { background: 'transparent' }
                  }
                >
                  {m === 'magic' ? 'Magic link' : 'Password'}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-sm border pl-10 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
                    style={{
                      background: 'hsl(var(--av-background) / 0.5)',
                      borderColor: 'hsl(var(--av-border-strong))',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              {mode === 'password' && (
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 block">
                    Password
                  </label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-sm border pl-10 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
                      style={{
                        background: 'hsl(var(--av-background) / 0.5)',
                        borderColor: 'hsl(var(--av-border-strong))',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Messages */}
              {error && (
                <div
                  className="rounded-sm border p-3 font-mono text-[11px] text-destructive"
                  style={{
                    background: 'hsl(0 72% 60% / 0.08)',
                    borderColor: 'hsl(0 72% 60% / 0.3)',
                  }}
                >
                  {error}
                </div>
              )}
              {sent && (
                <div
                  className="rounded-sm border p-3 font-mono text-[11px] text-primary"
                  style={{
                    background: 'hsl(var(--av-primary) / 0.08)',
                    borderColor: 'hsl(var(--av-primary) / 0.3)',
                  }}
                >
                  ✓ Magic link sent — check your email.
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: 'var(--av-gradient-gold)' }}
              >
                {loading
                  ? 'Sending…'
                  : mode === 'magic'
                  ? 'Send magic link'
                  : 'Sign in'}
                {!loading && <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
              </button>
            </form>
          </div>

          {/* Footer meta */}
          <div className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            By signing in you agree to our{' '}
            <Link href="/legal" className="text-primary hover:text-gold">
              terms
            </Link>{' '}
            &middot;{' '}
            <Link href="/contact" className="text-primary hover:text-gold">
              Need help?
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
