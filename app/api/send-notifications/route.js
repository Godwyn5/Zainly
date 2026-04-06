import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendNotifications() {
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

  return results.length;
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
