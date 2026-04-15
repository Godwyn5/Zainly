import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('is_premium, stripe_subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[cancel-subscription] profile fetch error:', profileErr.message);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    if (!profile?.is_premium) {
      return NextResponse.json({ error: 'Pas d\'abonnement actif.' }, { status: 400 });
    }

    const subscriptionId = profile.stripe_subscription_id;
    if (!subscriptionId) {
      console.error('[cancel-subscription] no stripe_subscription_id for user', user.id);
      return NextResponse.json({ error: 'Abonnement introuvable.' }, { status: 400 });
    }

    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });

    console.log('[cancel-subscription] scheduled cancellation for user', user.id, 'sub', subscriptionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cancel-subscription] error:', err.message, '| type:', err.type);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
