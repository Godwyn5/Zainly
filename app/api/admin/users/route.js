import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'test2@gmail.com';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify caller is admin
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { page = '0' } = Object.fromEntries(new URL(request.url).searchParams);
    const PAGE_SIZE = 50;
    const from = parseInt(page, 10) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data, error: fetchError, count } = await supabaseAdmin
      .from('profiles')
      .select('id, prenom, email, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (fetchError) {
      console.error('[admin/users] fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ users: data ?? [], total: count ?? 0 });
  } catch (error) {
    console.error('[admin/users] unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
