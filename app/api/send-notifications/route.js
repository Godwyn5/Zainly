import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*');

    const payload = JSON.stringify({
      title: 'Zainly 🕌',
      body: "Ta session du jour t'attend. Ne perds pas ton streak 🔥",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      url: '/dashboard',
    });

    const results = await Promise.allSettled(
      (subscriptions ?? []).map(sub =>
        webpush.sendNotification(sub.subscription, payload)
      )
    );

    return NextResponse.json({ success: true, sent: results.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
