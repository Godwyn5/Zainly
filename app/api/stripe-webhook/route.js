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

    const { error: upsertErr } = await supabase.from('profiles').upsert({
      id:                     userId,
      is_premium:             true,
      premium_since:          new Date().toISOString(),
      stripe_customer_id:     session.customer ?? null,
      stripe_subscription_id: session.subscription ?? null,
    }, { onConflict: 'id' });

    if (upsertErr) {
      console.error('[stripe-webhook] supabase upsert error:', upsertErr.message);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    console.log('[stripe-webhook] premium activated for user', userId);
  }

  return NextResponse.json({ received: true });
}
