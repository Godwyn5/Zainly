import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function sendMainNotifications() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  const supabase = await getSupabase();
  const today = localDateStr();
  console.log('[send-notifications] triggered, date:', today);

  // Only users not yet notified today
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .or(`last_notified_at.is.null,last_notified_at.lt.${today}`);

  console.log('[send-notifications] users eligible:', subscriptions?.length ?? 0);
  if (!subscriptions || subscriptions.length === 0) return 0;

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const { data: prog } = await supabase
        .from('progress')
        .select('last_session_date, total_memorized')
        .eq('user_id', sub.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prog?.last_session_date === today) return; // session done → skip

      const hasProgress = (prog?.total_memorized ?? 0) > 0;
      const body = hasProgress
        ? "Ta session t'attend — ne perds pas ton progrès 🔥"
        : "Ta session t'attend aujourd'hui";

      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title: 'Zainly 🕌', body, icon: '/icon-192.png', badge: '/icon-192.png', url: '/dashboard',
        }));
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('[send-notifications] webpush error:', e.statusCode, e.message);
        }
        return;
      }

      await supabase.from('push_subscriptions')
        .update({ last_notified_at: today })
        .eq('id', sub.id);

      return 'sent';
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === 'sent').length;
  console.log('[send-notifications] sent:', sent, '/', subscriptions.length);
  return sent;
}

// Called by Vercel cron (GET) — Vercel injects Authorization: Bearer CRON_SECRET automatically
export async function GET(request) {
  console.log('[notifications] route triggered');
  try {
    const authHeader = request.headers.get('Authorization');
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET) {
      console.error('[notifications] CRON_SECRET env var is not set — rejecting');
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    if (authHeader !== expected) {
      console.error('[notifications] auth failed — received:', authHeader?.slice(0, 20), '...');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[notifications] auth OK');
    const sent = await sendMainNotifications();
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
