import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ZAINLY_ORDER } from '@/lib/zainlyOrder'

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // ── Auth ──
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Non autorise.' }, { status: 401 })
    }
    // Pass the JWT in global headers so every DB write carries auth.uid()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorise.' }, { status: 401 })
    }
    const userId = user.id

    // ── Input validation ──
    const body = await request.json()
    const { ayahPerDay: ayahPerDayRaw, sourates, partialSurahs } = body

    if (ayahPerDayRaw == null || !Array.isArray(sourates)) {
      return NextResponse.json({ error: 'Champs manquants ou invalides.' }, { status: 400 })
    }
    const ayahPerDay = Math.min(6, Math.max(1, parseInt(ayahPerDayRaw) || 1))

    // ── Sanitize partialSurahs ──
    // Strict: reject if from/to are NaN, from < 1, or to < from — no silent fallback
    const sanitizedPartials = {}
    if (partialSurahs && typeof partialSurahs === 'object') {
      for (const [name, range] of Object.entries(partialSurahs)) {
        const from = parseInt(range?.from)
        const to   = parseInt(range?.to)
        if (!isNaN(from) && !isNaN(to) && from >= 1 && to >= from) {
          sanitizedPartials[name] = { from, to }
        }
      }
    }

    // ── Single sequential scan: startPosition + startAyah + knownAyats ──
    // knownAyats counts only the consecutive known block from the start (including the
    // partial ayats of the first gap surah when from===1). Stops at first gap.
    const knownComplete = new Set(sourates)
    let startPosition = 0
    let startAyah     = 1
    let knownAyats    = 0

    for (let i = 0; i < ZAINLY_ORDER.length; i++) {
      const s = ZAINLY_ORDER[i]

      if (knownComplete.has(s.name)) {
        // Fully known — advance
        knownAyats   += s.ayahs
        startPosition = i + 1
        startAyah     = 1
      } else if (sanitizedPartials[s.name]) {
        const { from, to } = sanitizedPartials[s.name]
        if (from === 1 && to >= s.ayahs) {
          // Covered completely via partial — advance
          knownAyats   += s.ayahs
          startPosition = i + 1
          startAyah     = 1
        } else if (from > 1) {
          // Ayah 1 is missing — must restart from ayah 1, don't count partial ayats
          startPosition = i
          startAyah     = 1
          break
        } else {
          // from===1 and to < s.ayahs — partial progress, continue from to+1
          knownAyats   += (to - from + 1)
          startPosition = i
          startAyah     = to + 1
          break
        }
      } else {
        // Completely unknown — first gap
        startPosition = i
        startAyah     = 1
        break
      }
    }

    // ── Coran complete ──
    if (startPosition >= ZAINLY_ORDER.length) {
      return NextResponse.json({ message: 'coran_complete' })
    }

    const startSurah = ZAINLY_ORDER[startPosition]
    const totalAyats      = 6236
    const remainingAyats  = Math.max(0, totalAyats - knownAyats)
    const daysPerWeek     = 6
    const estimatedWeeks  = Math.ceil(remainingAyats / (ayahPerDay * daysPerWeek))
    const estimatedMonths = Math.round(estimatedWeeks / 4.33)
    const estimatedYears  = (estimatedMonths / 12).toFixed(1)

    // ── Write plan: explicit select → update or insert (no UNIQUE constraint required) ──
    const planPayload = {
      ayah_per_day:     ayahPerDay,
      days_per_week:    daysPerWeek,
      first_surah_name: startSurah.name,
      surah_start:      startSurah.surah,
      start_ayah:       startAyah,
      remaining_ayats:  remainingAyats,
      estimated_months: estimatedMonths,
    }
    const { data: existingPlans } = await supabase
      .from('plans').select('id').eq('user_id', userId).order('created_at', { ascending: false }).limit(2)
    const existingPlan = existingPlans?.[0] ?? null

    let planErr
    if (existingPlan) {
      ;({ error: planErr } = await supabase.from('plans').update(planPayload).eq('id', existingPlan.id))
    } else {
      ;({ error: planErr } = await supabase.from('plans').insert({ user_id: userId, ...planPayload }))
    }
    if (planErr) {
      console.error('[generate-plan] plan write error:', planErr)
      return NextResponse.json({ error: planErr.message }, { status: 500 })
    }

    // ── Update or insert progress — never overwrite historical data ──
    const { data: existingProgRows } = await supabase
      .from('progress')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2)
    const existingProg = existingProgRows?.[0] ?? null

    if (existingProg) {
      // Row exists — only update position + ayah_per_day, preserve streak/total/dates
      const { error: progErr } = await supabase
        .from('progress')
        .update({
          current_surah: startSurah.surah,
          current_ayah:  startAyah - 1,
          ayah_per_day:  ayahPerDay,
        })
        .eq('user_id', userId)
      if (progErr) {
        console.error('[generate-plan] progress update error:', progErr)
        return NextResponse.json({ error: progErr.message }, { status: 500 })
      }
    } else {
      // No row yet — insert with safe defaults
      const { error: progErr } = await supabase.from('progress').insert({
        user_id:         userId,
        current_surah:   startSurah.surah,
        current_ayah:    startAyah - 1,
        ayah_per_day:    ayahPerDay,
        streak:          0,
        total_memorized: 0,
        session_dates:   [],
      })
      if (progErr) {
        console.error('[generate-plan] progress insert error:', progErr)
        return NextResponse.json({ error: progErr.message }, { status: 500 })
      }
    }

    // ── Response ──
    console.log(`[generate-plan] plan saved for user ${userId} — surah=${startSurah.surah} ayah=${startAyah} ayahPerDay=${ayahPerDay}`)
    return NextResponse.json({
      success:          true,
      firstSurahName:   startSurah.name,
      firstSurahNumber: startSurah.surah,
      startAyah,
      ayahPerDay,
      remainingAyats,
      estimatedMonths,
      estimatedYears,
    })
  } catch (error) {
    console.error('[generate-plan] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
