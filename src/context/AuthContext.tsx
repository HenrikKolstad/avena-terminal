'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isPaid: boolean;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  startCheckout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isPaid: false,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signOut: async () => {},
  startCheckout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  async function checkSubscription(email: string) {
    // Admin accounts always have full access
    const ADMIN_EMAILS = ['henrik@xaviaestate.com', 'Henrik@xaviaestate.com', 'henrik@betongsproyting.no', 'jesper.troan@gmail.com'];
    if (ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase())) {
      setIsPaid(true);
      return;
    }

    if (!supabase) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('email', email)
      .single();

    if (data?.status === 'active' || data?.status === 'trialing') {
      // Check period hasn't expired
      const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
      setIsPaid(!periodEnd || periodEnd > new Date());
    } else {
      setIsPaid(false);
    }
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) checkSubscription(session.user.email);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.email) checkSubscription(session.user.email);
      else setIsPaid(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithEmail(email: string) {
    if (!supabase) return { error: 'Supabase not configured' };
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    // Land on /login — signed-in branch shows welcome state + PRO badge
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/login` },
    });
    return { error: error?.message ?? null };
  }

  async function signInWithPassword(email: string, password: string) {
    if (!supabase) return { error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setIsPaid(false);
  }

  async function startCheckout() {
    const email = user?.email;
    if (!email) return;
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      if (!url) throw new Error('Stripe did not return a checkout URL');
      window.location.href = url;
    } catch (e) {
      // Re-throw so callers can render inline error (replaces jarring alert())
      throw e instanceof Error ? e : new Error('Checkout failed');
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, isPaid, loading, signInWithEmail, signInWithPassword, signOut, startCheckout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
