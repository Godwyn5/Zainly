import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'test2@gmail.com';
const PAGE_SIZE = 50;

function parisDateStr() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

function activityStatus(lastSessionDate) {
  if (!lastSessionDate) return 'never';
  const today = parisDateStr();
  if (lastSessionDate === today) return 'active';
  const todayMs = new Date(today + 'T00:00:00').getTime();
  const lastMs  = new Date(lastSessionDate + 'T00:00:00').getTime();
  const days = Math.round((todayMs - lastMs) / 86400000);
  if (days <= 2) return 'recent';
  return 'inactive';
}

export async function GET(request) {
  try {
    // ── Env var guard ──
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[admin/users] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
      return NextResponse.json({ error: 'Configuration serveur manquante (Supabase URL/anon key)' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/users] SUPABASE_SERVICE_ROLE_KEY is missing');
      return NextResponse.json({ error: 'Configuration serveur manquante (service role key)' }, { status: 500 });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller is admin
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError) {
      console.error('[admin/users] auth error:', authError.status, authError.message);
      return NextResponse.json({ error: 'Session invalide ou expirée. Reconnecte-toi.' }, { status: 401 });
    }
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = Object.fromEntries(new URL(request.url).searchParams);
    const page      = parseInt(params.page ?? '0', 10);
    const filter    = params.filter ?? 'all';     // all | active | recent | inactive | never | premium | free
    const sortBy    = params.sort ?? 'created_at'; // created_at | last_session | sessions
    const sortDir   = params.dir ?? 'desc';        // asc | desc

    console.log(`[admin/users] GET page=${page} filter=${filter} sort=${sortBy} dir=${sortDir}`);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch all profiles with plan_type (may be null if column not yet added)
    const { data: profiles, error: profErr, count } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, email, created_at, is_premium, plan_type, stripe_subscription_id, subscription_status', { count: 'exact' });

    if (profErr) {
      console.error('[admin/users] profiles fetch error:', profErr);
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ users: [], total: 0 });
    }

    // Fetch all progress rows — no .in() filter to avoid PostgREST 400 on large ID arrays
    const { data: progressRows, error: progErr } = await supabaseAdmin
      .from('progress')
      .select('user_id, last_session_date, streak, session_dates');

    if (progErr) {
      console.error('[admin/users] progress fetch error:', progErr);
      return NextResponse.json({ error: progErr.message }, { status: 500 });
    }

    // Keep only most recent progress row per user
    const progressMap = {};
    for (const row of (progressRows ?? [])) {
      if (!progressMap[row.user_id]) progressMap[row.user_id] = row;
    }

    // Build enriched user list
    let users = profiles.map(p => {
      const prog = progressMap[p.id] ?? null;
      const lastSession = prog?.last_session_date ?? null;
      const streak = prog?.streak ?? 0;
      const sessionsCount = Array.isArray(prog?.session_dates) ? prog.session_dates.length : 0;
      const status = activityStatus(lastSession);
      // Strict premium: flag + subscription ID + plan_type + status active
      const realPremium = p.is_premium === true
        && !!p.stripe_subscription_id
        && !!p.plan_type
        && p.subscription_status === 'active';
      let planLabel = 'Gratuit';
      if (realPremium) {
        planLabel = p.plan_type === 'yearly' ? 'Premium annuel' : 'Premium mensuel';
      } else if (p.is_premium) {
        planLabel = 'Premium (incohérent)';
      }
      return {
        id: p.id,
        prenom: p.prenom ?? null,
        email: p.email ?? null,
        created_at: p.created_at,
        is_premium: realPremium,
        plan_type: p.plan_type ?? null,
        subscription_status: p.subscription_status ?? null,
        plan_label: planLabel,
        last_session: lastSession,
        streak,
        sessions_count: sessionsCount,
        status,
      };
    });

    // Filter
    if (filter === 'active')   users = users.filter(u => u.status === 'active');
    if (filter === 'recent')   users = users.filter(u => u.status === 'recent');
    if (filter === 'inactive') users = users.filter(u => u.status === 'inactive');
    if (filter === 'never')    users = users.filter(u => u.status === 'never');
    if (filter === 'premium')  users = users.filter(u => u.is_premium);
    if (filter === 'free')     users = users.filter(u => !u.is_premium);

    // Sort
    users.sort((a, b) => {
      let va, vb;
      if (sortBy === 'last_session') {
        va = a.last_session ?? '0000-00-00';
        vb = b.last_session ?? '0000-00-00';
      } else if (sortBy === 'sessions') {
        va = a.sessions_count;
        vb = b.sessions_count;
      } else {
        va = a.created_at ?? '';
        vb = b.created_at ?? '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const total = users.length;
    const from  = page * PAGE_SIZE;
    const paged = users.slice(from, from + PAGE_SIZE);

    return NextResponse.json({ users: paged, total });
  } catch (error) {
    console.error('[admin/users] unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
