import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error: dbErr } = await supabase
    .from('push_subscriptions')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (dbErr) {
    console.error('[test-push] DB error:', dbErr);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  if (!data) {
    console.warn('[test-push] No subscription found in DB');
    return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
  }

  console.log('[test-push] Subscription found, user_id:', data.user_id);

  try {
    await webpush.sendNotification(data.subscription, JSON.stringify({
      title: 'TEST ZAINLY',
      body: 'Si tu vois ça, les push marchent',
      icon: '/icon-192.png',
    }));
    console.log('[test-push] Notification sent successfully');
    return NextResponse.json({ success: true, user_id: data.user_id });
  } catch (e) {
    console.error('[test-push] Send failed — status:', e.statusCode, '— message:', e.message);
    return NextResponse.json({ error: e.message, statusCode: e.statusCode }, { status: 500 });
  }
}
