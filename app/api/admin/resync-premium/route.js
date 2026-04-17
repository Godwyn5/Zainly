import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'test2@gmail.com';

export async function POST(request) {
  try {
    // ── Auth guard ──
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default: dry run

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── 1. Fetch all active subscriptions from Stripe ──
    const activeSubscriptions = [];
    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const params = { status: 'active', limit: 100, expand: ['data.customer'] };
      if (startingAfter) params.starting_after = startingAfter;

      const page = await stripe.subscriptions.list(params);
      activeSubscriptions.push(...page.data);
      hasMore = page.has_more;
      if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
    }

    console.log(`[resync-premium] found ${activeSubscriptions.length} active Stripe subscriptions`);

    // ── 2. Fetch all profiles from Supabase ──
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, is_premium, stripe_customer_id, stripe_subscription_id, plan_type, subscription_status');

    if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

    // Index profiles by stripe_customer_id and by email
    const profileByCustomerId = {};
    const profileByEmail = {};
    for (const p of (profiles ?? [])) {
      if (p.stripe_customer_id) profileByCustomerId[p.stripe_customer_id] = p;
      if (p.email) profileByEmail[p.email.toLowerCase()] = p;
    }

    // ── 3. Build update plan for each active subscription ──
    const toActivate   = []; // { profile_id, sub, planType, customerEmail }
    const noMatch      = []; // subscriptions with no matching profile

    for (const sub of activeSubscriptions) {
      const customer = typeof sub.customer === 'object' ? sub.customer : null;
      const customerId = customer?.id ?? sub.customer;
      const customerEmail = customer?.email?.toLowerCase() ?? null;

      // Determine plan type from price interval
      const interval = sub.items?.data?.[0]?.price?.recurring?.interval;
      const planType = interval === 'year' ? 'yearly' : 'monthly';

      // Match profile: first by customer_id, then by email
      let profile = profileByCustomerId[customerId] ?? null;
      if (!profile && customerEmail) profile = profileByEmail[customerEmail] ?? null;

      if (!profile) {
        noMatch.push({ subscription_id: sub.id, customer_id: customerId, email: customerEmail, plan: planType });
        continue;
      }

      toActivate.push({
        profile_id:    profile.id,
        customer_id:   customerId,
        subscription_id: sub.id,
        plan_type:     planType,
        premium_since: new Date(sub.start_date * 1000).toISOString(),
        email:         customerEmail,
      });
    }

    // ── 4. Identify profiles currently marked premium but not in active subs ──
    const activeProfileIds = new Set(toActivate.map(r => r.profile_id));
    const toDeactivate = (profiles ?? []).filter(p =>
      p.is_premium === true && !activeProfileIds.has(p.id)
    );

    // ── 5. Apply if not dry run ──
    const results = { activated: [], deactivated: [], no_match: noMatch, dry_run: dryRun };

    if (!dryRun) {
      for (const r of toActivate) {
        const { error } = await supabaseAdmin.from('profiles').update({
          is_premium:             true,
          stripe_customer_id:     r.customer_id,
          stripe_subscription_id: r.subscription_id,
          plan_type:              r.plan_type,
          premium_since:          r.premium_since,
          subscription_status:    'active',
        }).eq('id', r.profile_id);

        if (error) {
          console.error(`[resync-premium] failed to activate ${r.profile_id}:`, error.message);
          results.activated.push({ id: r.profile_id, email: r.email, status: 'error', error: error.message });
        } else {
          results.activated.push({ id: r.profile_id, email: r.email, plan: r.plan_type, status: 'ok' });
        }
      }

      for (const p of toDeactivate) {
        const { error } = await supabaseAdmin.from('profiles').update({
          is_premium:             false,
          plan_type:              null,
          stripe_subscription_id: null,
          stripe_customer_id:     null,
          premium_since:          null,
          subscription_status:    'canceled',
        }).eq('id', p.id);

        if (error) {
          console.error(`[resync-premium] failed to deactivate ${p.id}:`, error.message);
          results.deactivated.push({ id: p.id, email: p.email, status: 'error', error: error.message });
        } else {
          results.deactivated.push({ id: p.id, email: p.email, status: 'ok' });
        }
      }
    } else {
      results.activated  = toActivate.map(r => ({ id: r.profile_id, email: r.email, plan: r.plan_type, subscription_id: r.subscription_id }));
      results.deactivated = toDeactivate.map(p => ({ id: p.id, email: p.email, current_status: p.subscription_status }));
    }

    console.log(`[resync-premium] dry_run=${dryRun} activate=${results.activated.length} deactivate=${results.deactivated.length} no_match=${results.no_match.length}`);
    return NextResponse.json(results);
  } catch (error) {
    console.error('[resync-premium] unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
