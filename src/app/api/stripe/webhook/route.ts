import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendWelcomeEmail } from '@/lib/email';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const supabase = getSupabase();

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.metadata?.email || session.customer_details?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!email) break;

        // Get subscription details from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        // In Stripe basil API, current_period_end is on the subscription item
        const item = stripeSub.items.data[0];
        const rawPeriodEnd = (item as unknown as { current_period_end?: number })?.current_period_end
          ?? stripeSub.billing_cycle_anchor;
        const periodEnd = new Date(rawPeriodEnd * 1000).toISOString();

        const { error: upsertErr } = await supabase.from('subscriptions').upsert({
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: item?.price.id,
          status: 'active',
          current_period_end: periodEnd,
          cancel_at_period_end: stripeSub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        if (upsertErr) {
          // CRITICAL: paying customer did not get marked as paid. Loud failure.
          console.error('CRITICAL: subscription upsert failed for', email, upsertErr);
          return NextResponse.json({ error: 'subscription record write failed', detail: upsertErr.message }, { status: 500 });
        }
        console.log('Subscription activated for:', email);

        // Send welcome email — non-blocking, logs on failure
        sendWelcomeEmail(email).then((r) => {
          if (!r.sent) console.error('Welcome email failed:', r.error);
          else console.log('Welcome email sent to', email);
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const email = sub.metadata?.email;
        const customerId = sub.customer as string;

        // Get email from customer if not in metadata
        let resolvedEmail: string | undefined = email;
        if (!resolvedEmail) {
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          resolvedEmail = customer.email ?? undefined;
        }
        if (!resolvedEmail) break;

        // In Stripe basil API, current_period_end is on the subscription item
        const subItem = sub.items.data[0];
        const rawSubPeriodEnd = (subItem as unknown as { current_period_end?: number })?.current_period_end
          ?? sub.billing_cycle_anchor;
        const periodEnd = new Date(rawSubPeriodEnd * 1000).toISOString();

        const { error: updateErr } = await supabase.from('subscriptions').upsert({
          email: resolvedEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          stripe_price_id: subItem?.price.id,
          status: sub.status === 'active' ? 'active' : sub.status,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        if (updateErr) {
          console.error('CRITICAL: subscription update failed for', resolvedEmail, updateErr);
          return NextResponse.json({ error: 'subscription update failed', detail: updateErr.message }, { status: 500 });
        }
        console.log('Subscription updated for:', resolvedEmail, '→', sub.status);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await supabase.from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);

        console.log('Subscription cancelled for customer:', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);

        console.log('Payment failed for customer:', customerId);
        break;
      }

      default:
        console.log('Unhandled event:', event.type);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
