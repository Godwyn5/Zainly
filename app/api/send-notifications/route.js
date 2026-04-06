import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function sendNotifications() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const today = localDateStr();

  // Fetch subscriptions not yet notified today
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .or(`last_notified_at.is.null,last_notified_at.lt.${today}`);

  if (!subscriptions || subscriptions.length === 0) return 0;

  // For each subscription, fetch progress to build dynamic message + skip if session done
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      // Skip if session already done today
      const { data: prog } = await supabase
        .from('progress')
        .select('last_session_date, total_memorized')
        .eq('user_id', sub.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prog?.last_session_date === today) return; // session done → no notif

      const hasProgress = (prog?.total_memorized ?? 0) > 0;
      const body = hasProgress
        ? "Ta session t'attend — ne perds pas ton progrès 🔥"
        : "Ta session du jour t'attend. Commence dès maintenant.";

      const payload = JSON.stringify({
        title: 'Zainly �',
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        url: '/dashboard',
      });

      await webpush.sendNotification(sub.subscription, payload);

      // Mark as notified today (anti-spam)
      await supabase
        .from('push_subscriptions')
        .update({ last_notified_at: today })
        .eq('id', sub.id);
    })
  );

  return results.filter(r => r.status === 'fulfilled').length;
}

// Called by Vercel cron (GET, header x-vercel-cron: 1)
export async function GET(request) {
  try {
    if (request.headers.get('x-vercel-cron') !== '1') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sent = await sendNotifications();
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Called manually with Authorization: Bearer CRON_SECRET
export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sent = await sendNotifications();
    return NextResponse.json({ success: true, sent });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
