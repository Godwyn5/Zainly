import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'test2@gmail.com';

export async function POST(request) {
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

    const { user_id } = await request.json();
    if (!user_id || typeof user_id !== 'string') {
      return NextResponse.json({ error: 'user_id manquant ou invalide' }, { status: 400 });
    }

    // Delete user via admin API — cascades to profiles, plans, progress, review_items via FK
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      console.error('[admin/delete-user] deleteUser error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[admin/delete-user] deleted user:', user_id, 'by:', user.email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admin/delete-user] unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
