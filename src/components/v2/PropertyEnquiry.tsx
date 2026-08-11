'use client';

/**
 * Inline per-property enquiry (2026-08-11) — the funnel fix Henrik approved.
 *
 * The old flow sent buyers AWAY from the property to a generic /enquire form,
 * discarding all context; ~96% never arrived. This keeps them on the dossier:
 * three fields, the ref carried automatically, plus the channel his buyers
 * actually use — a native-green WhatsApp button with the conversation
 * pre-written ("fet og forseggjort, native logo og farge", per Henrik).
 *
 * Wire rules honoured: POST /api/enquire (store-first, henrik@xaviaestate.com),
 * and the Contact conversion fires ONLY on confirmed success — never on
 * submit — because Google Ads bids on what we report back.
 */

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking';

const WA_NUMBER = '4798071453';
const WHATSAPP_GREEN = '#25D366';

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.304-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface Props {
  propertyRef: string;
  propertyName: string;
  town: string;
  price: number;
}

export function PropertyEnquiry({ propertyRef, propertyName, town, price }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const waText = encodeURIComponent(
    `Hi Avena — I'm interested in ${propertyRef}: ${propertyName}, ${town} (€${price.toLocaleString()}). ` +
    `Could you tell me about availability and viewings?`,
  );
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/enquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message: message || `Interested in ${propertyRef} — availability and viewing options.`,
          property_ref: propertyRef,
          property_name: propertyName,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setState('sent');
        trackEvent('Contact', { channel: 'property_form', ref: propertyRef });
      } else {
        setState('error');
      }
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <div
        className="rounded-sm border px-6 py-8 text-center"
        style={{ borderColor: 'hsl(var(--av-primary) / 0.5)', background: 'hsl(var(--av-surface) / 0.4)' }}
      >
        <div className="font-serif text-xl font-light text-foreground">Sent.</div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          We reply the same day · Ref {propertyRef}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-sm border p-5 sm:p-6"
      style={{ borderColor: 'hsl(var(--av-border) / 0.7)', background: 'hsl(var(--av-surface) / 0.4)' }}
    >
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: 'hsl(var(--av-primary) / 0.92)' }}>
        Ask about {propertyRef}
      </div>
      <p className="mb-5 font-serif text-sm font-light text-foreground/75">
        Direct to our desk — availability, viewings, payment plans.
      </p>

      {/* The channel that converts: full native WhatsApp treatment. */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('Contact', { channel: 'whatsapp', ref: propertyRef })}
        className="group mb-5 flex w-full items-center justify-center gap-3 rounded-md px-6 py-4 transition-all hover:-translate-y-0.5"
        style={{
          background: WHATSAPP_GREEN,
          boxShadow: '0 10px 30px rgb(37 211 102 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.25)',
        }}
      >
        <WhatsAppIcon className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white">
          WhatsApp about {propertyRef}
        </span>
      </a>

      <div className="mb-5 flex items-center gap-3">
        <span className="h-px flex-1" style={{ background: 'hsl(var(--av-border) / 0.6)' }} />
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">or</span>
        <span className="h-px flex-1" style={{ background: 'hsl(var(--av-border) / 0.6)' }} />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="w-full rounded-sm border bg-transparent px-4 py-3 font-serif text-sm font-light text-foreground outline-none placeholder:text-foreground/35 focus:border-primary"
            style={{ borderColor: 'hsl(var(--av-border))' }}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-sm border bg-transparent px-4 py-3 font-serif text-sm font-light text-foreground outline-none placeholder:text-foreground/35 focus:border-primary"
            style={{ borderColor: 'hsl(var(--av-border))' }}
          />
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything specific? (optional)"
          rows={2}
          className="w-full rounded-sm border bg-transparent px-4 py-3 font-serif text-sm font-light text-foreground outline-none placeholder:text-foreground/35 focus:border-primary"
          style={{ borderColor: 'hsl(var(--av-border))' }}
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-sm px-6 py-3.5 font-mono text-[10px] uppercase tracking-[0.28em] text-primary-foreground transition hover:-translate-y-0.5 disabled:opacity-50"
          style={{ background: 'hsl(var(--av-primary) / 0.9)' }}
        >
          {state === 'sending' ? 'Sending…' : `Send enquiry · ${propertyRef}`}
        </button>
        {state === 'error' && (
          <p className="font-mono text-[10px] uppercase tracking-[0.15em]" style={{ color: 'hsl(0 60% 70%)' }}>
            Something failed — try WhatsApp above, or email henrik@xaviaestate.com
          </p>
        )}
      </form>
    </div>
  );
}
