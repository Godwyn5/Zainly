import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  console.log('[checkout] POST called, STRIPE_KEY present:', !!process.env.STRIPE_SECRET_KEY, 'PRICE_ID present:', !!process.env.STRIPE_PREMIUM_PRICE_ID);
  try {
    const body = await request.json().catch(() => ({}));
    const plan = body.plan ?? 'monthly';
    if (plan !== 'monthly' && plan !== 'yearly') {
      return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }

    const priceId = plan === 'yearly'
      ? process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID
      : process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
      console.error(`[checkout] price ID missing for plan: ${plan}`);
      return NextResponse.json({ error: 'Configuration du paiement manquante.' }, { status: 500 });
    }
    console.log(`[checkout] plan=${plan} priceId=${priceId.slice(0, 12)}...`);

    const { blocked } = await checkRateLimit('checkout', `user:${user.id}`);
    if (blocked) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessaie dans un instant.' }, { status: 429 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_premium === true) {
      return NextResponse.json({ error: 'Déjà premium.' }, { status: 400 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'https://zainly-alpha.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        plan,
      },
      customer_email: user.email ?? undefined,
      success_url: `${appUrl}/premium/success`,
      cancel_url: `${appUrl}/premium`,
    });

    console.log('[stripe] checkout session created for user', user.id);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] create-checkout-session error:', err.message, '| type:', err.type, '| code:', err.code);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
