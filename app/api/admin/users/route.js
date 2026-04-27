import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'test2@gmail.com';
const PAGE_SIZE = 50;

// ── Data model notes ──────────────────────────────────────────────────────────
// profiles        (5700+)  : id, prenom, email, created_at, is_premium,
//                            plan_type, stripe_subscription_id, subscription_status
// progress        (5400+)  : user_id (1:1 with profiles), last_session_date,
//                            streak, session_dates (array of YYYY-MM-DD strings),
//                            total_memorized
// No separate sessions table. session_dates.length = number of completed sessions.
// Premium source of truth: profiles.is_premium (boolean set by Stripe webhook).
// plan_type / subscription_status provide extra detail when available.
// ─────────────────────────────────────────────────────────────────────────────

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

function buildUser(p, prog) {
  const lastSession   = prog?.last_session_date ?? null;
  const streak        = prog?.streak ?? 0;
  // session_dates is an array of YYYY-MM-DD strings — one entry per completed session
  const sessionsCount = Array.isArray(prog?.session_dates) ? prog.session_dates.length : 0;
  const status        = activityStatus(lastSession);
  // is_premium is the authoritative field set by Stripe webhook.
  // plan_type / subscription_status are informational extras.
  const isPremium     = p.is_premium === true;
  let planLabel = 'Gratuit';
  if (isPremium) {
    if (p.plan_type === 'yearly')       planLabel = 'Premium annuel';
    else if (p.plan_type === 'monthly') planLabel = 'Premium mensuel';
    else                                planLabel = 'Premium';
  }
  return {
    id:                  p.id,
    prenom:              p.prenom ?? null,
    email:               p.email ?? null,
    created_at:          p.created_at,
    is_premium:          isPremium,
    plan_type:           p.plan_type ?? null,
    subscription_status: p.subscription_status ?? null,
    plan_label:          planLabel,
    last_session:        lastSession,
    streak,
    sessions_count:      sessionsCount,
    status,
  };
}

// Fetch all rows of a table across Supabase's 1000-row default limit
async function fetchAll(supabaseAdmin, table, selectCols) {
  const CHUNK = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(selectCols)
      .range(from, from + CHUNK - 1);
    if (error) return { data: null, error };
    all.push(...data);
    if (data.length < CHUNK) break;
    from += CHUNK;
  }
  return { data: all, error: null };
}

export async function GET(request) {
  try {
    // ── Env var guard ──
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[admin/users] missing Supabase URL or anon key');
      return NextResponse.json({ error: 'Configuration serveur manquante (Supabase URL/anon key)' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[admin/users] missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json({ error: 'Configuration serveur manquante (service role key)' }, { status: 500 });
    }

    // ── Auth guard ──
    const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    // ── Parse params ──
    const params  = Object.fromEntries(new URL(request.url).searchParams);
    const page    = Math.max(0, parseInt(params.page ?? '0', 10));
    const filter  = params.filter ?? 'all';      // all | active | recent | inactive | never | premium | free
    const sortBy  = params.sort   ?? 'created_at'; // created_at | last_session | sessions
    const sortDir = params.dir    ?? 'desc';       // asc | desc

    console.log(`[admin/users] GET page=${page} filter=${filter} sort=${sortBy} dir=${sortDir}`);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── Strategy ─────────────────────────────────────────────────────────────
    // Filters on activity (active/recent/inactive/never) and sorts on
    // last_session/sessions require cross-table enrichment before we can
    // filter/sort. For those cases we must load all data.
    //
    // For filter=all + sort=created_at (the default/common case) we can use
    // true DB-side pagination: fetch only the current page of profiles then
    // join progress for those 50 IDs specifically (safe .in()).
    //
    // For all other cases we load all profiles + all progress (bypassing the
    // 1000-row SDK limit via our fetchAll helper), enrich in memory, then
    // filter/sort/paginate.
    // ─────────────────────────────────────────────────────────────────────────

    const needsFullLoad = filter !== 'all' || sortBy !== 'created_at';

    let pagedUsers, total;

    if (!needsFullLoad) {
      // ── Fast path: DB-side pagination ──

      // Exact total (head:true fetches no rows)
      const { count: exactCount, error: countErr } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (countErr) {
        console.error('[admin/users] count error:', countErr);
        return NextResponse.json({ error: countErr.message }, { status: 500 });
      }
      total = exactCount ?? 0;

      const from = page * PAGE_SIZE;
      const to   = from + PAGE_SIZE - 1;
      const asc  = sortDir === 'asc';

      const { data: profiles, error: profErr } = await supabaseAdmin
        .from('profiles')
        .select('id, prenom, email, created_at, is_premium, plan_type, stripe_subscription_id, subscription_status')
        .order('created_at', { ascending: asc })
        .range(from, to);
      if (profErr) {
        console.error('[admin/users] profiles page error:', profErr);
        return NextResponse.json({ error: profErr.message }, { status: 500 });
      }

      if (!profiles || profiles.length === 0) {
        return NextResponse.json({ users: [], total });
      }

      // Fetch progress only for this page's IDs (50 max — safe .in())
      const ids = profiles.map(p => p.id);
      const { data: progressRows, error: progErr } = await supabaseAdmin
        .from('progress')
        .select('user_id, last_session_date, streak, session_dates')
        .in('user_id', ids);
      if (progErr) {
        console.error('[admin/users] progress page error:', progErr);
        return NextResponse.json({ error: progErr.message }, { status: 500 });
      }

      const progressMap = {};
      for (const row of (progressRows ?? [])) progressMap[row.user_id] = row;

      pagedUsers = profiles.map(p => buildUser(p, progressMap[p.id] ?? null));

    } else {
      // ── Full load path: filter/sort requires all data ──

      const [profResult, progResult] = await Promise.all([
        fetchAll(supabaseAdmin, 'profiles',
          'id, prenom, email, created_at, is_premium, plan_type, stripe_subscription_id, subscription_status'),
        fetchAll(supabaseAdmin, 'progress',
          'user_id, last_session_date, streak, session_dates'),
      ]);

      if (profResult.error) {
        console.error('[admin/users] full profiles error:', profResult.error);
        return NextResponse.json({ error: profResult.error.message }, { status: 500 });
      }
      if (progResult.error) {
        console.error('[admin/users] full progress error:', progResult.error);
        return NextResponse.json({ error: progResult.error.message }, { status: 500 });
      }

      const progressMap = {};
      for (const row of (progResult.data ?? [])) progressMap[row.user_id] = row;

      let users = (profResult.data ?? []).map(p => buildUser(p, progressMap[p.id] ?? null));

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

      total = users.length;
      const from = page * PAGE_SIZE;
      pagedUsers = users.slice(from, from + PAGE_SIZE);
    }

    console.log(`[admin/users] returning ${pagedUsers.length} users, total=${total}`);
    return NextResponse.json({ users: pagedUsers, total });

  } catch (error) {
    console.error('[admin/users] unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
