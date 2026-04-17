import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const body = await request.text();
  const sig  = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId  = session.metadata?.userId;

    console.log('[stripe-webhook] checkout.session.completed, userId:', userId);

    if (!userId) {
      console.error('[stripe-webhook] missing userId in metadata');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const planType = session.metadata?.plan === 'yearly' ? 'yearly'
      : session.metadata?.plan === 'monthly' ? 'monthly'
      : null;

    const { error: upsertErr } = await supabase.from('profiles').upsert({
      id:                     userId,
      is_premium:             true,
      premium_since:          new Date().toISOString(),
      stripe_customer_id:     session.customer ?? null,
      stripe_subscription_id: session.subscription ?? null,
      plan_type:              planType,
      subscription_status:    'active',
    }, { onConflict: 'id' });

    if (upsertErr) {
      console.error('[stripe-webhook] supabase upsert error:', upsertErr.message);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    console.log('[stripe-webhook] premium activated for user', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;

    console.log('[stripe-webhook] subscription deleted:', subscriptionId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile, error: findErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (findErr) {
      console.error('[stripe-webhook] error finding user for subscription:', findErr.message);
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!profile) {
      console.warn('[stripe-webhook] no user found for subscription_id:', subscriptionId);
      return NextResponse.json({ received: true });
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        is_premium:             false,
        plan_type:              null,
        stripe_subscription_id: null,
        stripe_customer_id:     null,
        premium_since:          null,
        subscription_status:    'canceled',
      })
      .eq('id', profile.id);

    if (updateErr) {
      console.error('[stripe-webhook] error deactivating premium:', updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    console.log('[stripe-webhook] premium deactivated for user', profile.id);
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'customer.subscription.deleted') {
    console.log('[stripe-webhook] unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
