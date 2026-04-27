/**
 * repair-last-session-date.mjs
 *
 * Repairs progress rows where last_session_date is NULL but session_dates
 * contains date strings. Sets last_session_date to the maximum date found
 * in session_dates.
 *
 * Usage:
 *   node scripts/repair-last-session-date.mjs          # dry run (default)
 *   node scripts/repair-last-session-date.mjs --apply  # write to DB
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const DRY_RUN  = !process.argv.includes('--apply');
const BATCH    = 50;   // updates per batch
const CHUNK    = 1000; // rows per fetch page

// ── Load env ─────────────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()])
);

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Fetch all fixable rows ────────────────────────────────────────────────────
async function fetchFixable() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from('progress')
      .select('user_id, last_session_date, session_dates')
      .is('last_session_date', null)
      .range(from, from + CHUNK - 1);
    if (error) throw new Error('Fetch error: ' + error.message);
    all.push(...data);
    if (data.length < CHUNK) break;
    from += CHUNK;
  }
  // Keep only rows that have at least one date in session_dates
  return all.filter(r => Array.isArray(r.session_dates) && r.session_dates.length > 0);
}

// ── Apply updates in batches ──────────────────────────────────────────────────
async function applyBatch(rows) {
  let updated = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    await Promise.all(slice.map(async r => {
      const { error } = await sb
        .from('progress')
        .update({ last_session_date: r.computed_last })
        .eq('user_id', r.user_id)
        .is('last_session_date', null); // safety: only touch null rows
      if (error) {
        console.error(`  FAIL user_id=${r.user_id.slice(0, 8)} — ${error.message}`);
        failed++;
      } else {
        updated++;
      }
    }));
    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }
  console.log(); // newline after progress
  return { updated, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log(`\n=== repair-last-session-date ${DRY_RUN ? '[DRY RUN]' : '[APPLY]'} ===\n`);

  console.log('Fetching fixable progress rows...');
  const fixable = await fetchFixable();

  if (fixable.length === 0) {
    console.log('Nothing to fix. All rows with null last_session_date have empty session_dates.');
    process.exit(0);
  }

  // Compute max date from session_dates for each row
  const rows = fixable.map(r => {
    const sorted = [...r.session_dates].sort(); // lexicographic sort works for YYYY-MM-DD
    return { user_id: r.user_id, computed_last: sorted[sorted.length - 1] };
  });

  // Summary
  const dateCounts = {};
  for (const r of rows) dateCounts[r.computed_last] = (dateCounts[r.computed_last] ?? 0) + 1;
  const sortedDates = Object.keys(dateCounts).sort();

  console.log(`Rows to fix: ${rows.length}`);
  console.log(`Date range : ${sortedDates[0]} → ${sortedDates[sortedDates.length - 1]}`);
  console.log(`Top dates  :`);
  [...sortedDates].reverse().slice(0, 5).forEach(d => console.log(`  ${d} : ${dateCounts[d]} users`));

  // Show sample
  console.log('\nSample (first 3):');
  rows.slice(0, 3).forEach(r =>
    console.log(`  user_id=${r.user_id.slice(0, 8)} → last_session_date will be set to ${r.computed_last}`)
  );

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written. Re-run with --apply to commit.');
    process.exit(0);
  }

  console.log('\nApplying updates...');
  const { updated, failed } = await applyBatch(rows);

  console.log(`\nDone.`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Failed  : ${failed}`);

  if (failed > 0) {
    console.error('\nSome rows failed to update. Check logs above.');
    process.exit(1);
  }
})().catch(e => {
  console.error('Unexpected error:', e.message);
  process.exit(1);
});
