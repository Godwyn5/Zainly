import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ZAINLY_ORDER, ZAINLY_INDEX_BY_SURAH } from '@/lib/zainlyOrder'
import { checkRateLimit } from '@/lib/rate-limit'

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_MODES    = ['recommended', 'start_surah', 'custom_order']
const TOTAL_AYATS    = 6236
const DAYS_PER_WEEK  = 6
const MAX_AYAH_DAY   = 20 // supports up to ~2 pages/day

// Pages → ayahs conversion (approximate, displayed to user)
const PAGE_RHYTHMS = {
  'quarter_page': { ayahs: 3,  label: 'Environ 1/4 de page / jour' },
  'half_page':    { ayahs: 6,  label: 'Environ 1/2 page / jour'    },
  'full_page':    { ayahs: 10, label: 'Environ 1 page / jour'       },
}

// Build a Set of all valid surah numbers for O(1) lookup
const VALID_SURAH_NUMBERS = new Set(ZAINLY_ORDER.map(s => s.surah))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a Set of known surah numbers and a partialMap ({ surahNum: {from,to} }),
 * scan ZAINLY_ORDER and return { startPosition, startAyah, knownAyats }.
 * Partial surahs are NOT skipped — the scan stops at them and uses to+1 as startAyah.
 */
function computeStartFromKnown(knownSet, partialMap = {}) {
  let startPosition = 0
  let knownAyats    = 0

  for (let i = 0; i < ZAINLY_ORDER.length; i++) {
    const s = ZAINLY_ORDER[i]
    if (knownSet.has(s.surah)) {
      knownAyats   += s.ayahs
      startPosition = i + 1
    } else if (partialMap[s.surah]) {
      // Partially known: start at to+1, stop scanning
      const { to } = partialMap[s.surah]
      knownAyats   += to
      startPosition = i
      return { startPosition, startAyah: to + 1, knownAyats }
    } else {
      startPosition = i
      break
    }
  }
  return { startPosition, startAyah: 1, knownAyats }
}

/**
 * Return the startAyah for a given surahNum, given partialMap.
 * If partial: to+1. Otherwise: 1.
 */
function getStartAyahForSurah(surahNum, partialMap) {
  const p = partialMap[surahNum]
  return p ? p.to + 1 : 1
}

/**
 * Legacy scan used when old client sends sourates (names) + partialSurahs.
 * Kept for backward-compat with existing onboarding clients during rollout.
 */
function computeStartLegacy(sourates, partialSurahs) {
  const knownComplete     = new Set(sourates)
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

  let startPosition = 0
  let startAyah     = 1
  let knownAyats    = 0

  for (let i = 0; i < ZAINLY_ORDER.length; i++) {
    const s = ZAINLY_ORDER[i]
    if (knownComplete.has(s.name)) {
      knownAyats   += s.ayahs
      startPosition = i + 1
      startAyah     = 1
    } else if (sanitizedPartials[s.name]) {
      const { from, to } = sanitizedPartials[s.name]
      if (from === 1 && to >= s.ayahs) {
        knownAyats   += s.ayahs
        startPosition = i + 1
        startAyah     = 1
      } else if (from > 1) {
        startPosition = i
        startAyah     = 1
        break
      } else {
        knownAyats   += (to - from + 1)
        startPosition = i
        startAyah     = to + 1
        break
      }
    } else {
      startPosition = i
      startAyah     = 1
      break
    }
  }
  return { startPosition, startAyah, knownAyats }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // ── Auth ──
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Non autorise.' }, { status: 401 })
    }
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

    const { blocked } = await checkRateLimit('plan', `user:${userId}`)
    if (blocked) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessaie dans un instant.' }, { status: 429 })
    }

    // ── Parse body ──
    const body = await request.json()

    // New fields
    const planModeRaw        = body.planMode        ?? null
    const knownSurahsRaw     = body.knownSurahs     ?? null   // int[]
    const startingSurahRaw   = body.startingSurah   ?? null   // int
    const customOrderRaw     = body.customSurahOrder ?? null  // int[]
    const paceTypeRaw        = body.paceType        ?? 'ayahs'
    const pagePaceKeyRaw     = body.pagePaceKey     ?? null   // 'quarter_page'|'half_page'|'full_page'
    const paceLabelRaw       = body.paceLabel       ?? null
    const pedVersionRaw      = body.pedagogicalOrderVersion ?? 'v1'
    // Partial known surahs: { "<surahNum>": { to: N } } OR legacy partialSurahs (name-keyed)
    const partialKnownRaw    = body.partialKnownSurahs ?? null  // new format: { "67": { to: 10 } }

    // Legacy fields (backward-compat)
    const legacySourates      = body.sourates      ?? null
    const legacyPartials      = body.partialSurahs ?? null  // legacy: { "Al-Mulk": { from:1, to:10 } }
    const ayahPerDayRaw       = body.ayahPerDay    ?? null

    // ── Determine plan mode ──
    const planMode = (planModeRaw && VALID_MODES.includes(planModeRaw))
      ? planModeRaw
      : 'recommended'

    // ── Determine pace / ayahPerDay ──
    let ayahPerDay
    let paceType  = paceTypeRaw === 'pages' ? 'pages' : 'ayahs'
    let paceLabel = paceLabelRaw ?? null

    if (paceType === 'pages' && pagePaceKeyRaw && PAGE_RHYTHMS[pagePaceKeyRaw]) {
      const pr  = PAGE_RHYTHMS[pagePaceKeyRaw]
      ayahPerDay = pr.ayahs
      paceLabel  = paceLabel ?? pr.label
    } else {
      // ayahs mode (or legacy)
      if (ayahPerDayRaw == null) {
        return NextResponse.json({ error: 'Champs manquants ou invalides.' }, { status: 400 })
      }
      ayahPerDay = Math.min(MAX_AYAH_DAY, Math.max(1, parseInt(ayahPerDayRaw) || 1))
      paceType   = 'ayahs'
      paceLabel  = paceLabel ?? `${ayahPerDay} ayat${ayahPerDay > 1 ? 's' : ''} / jour`
    }

    // ── Build knownSurahsSet ──
    let knownSurahsSet = new Set()
    if (Array.isArray(knownSurahsRaw)) {
      for (const n of knownSurahsRaw) {
        const num = parseInt(n)
        if (!isNaN(num) && VALID_SURAH_NUMBERS.has(num)) knownSurahsSet.add(num)
      }
    } else if (Array.isArray(legacySourates)) {
      for (const name of legacySourates) {
        const entry = ZAINLY_ORDER.find(s => s.name === name)
        if (entry) knownSurahsSet.add(entry.surah)
      }
    }
    const knownSurahsArray = [...knownSurahsSet]

    // ── Build partialMap: { surahNum(int): { from:1, to:N } } ──
    // Accepts new format { "67": { to: 10 } } OR legacy { "Al-Mulk": { from:1, to:10 } }
    const partialMap = {}
    const rawPartial = partialKnownRaw ?? legacyPartials ?? null
    if (rawPartial && typeof rawPartial === 'object') {
      for (const [key, val] of Object.entries(rawPartial)) {
        if (!val || typeof val !== 'object') continue
        const to = parseInt(val.to)
        if (isNaN(to) || to < 1) continue
        // Key can be surah number (new) or surah name (legacy)
        const num = parseInt(key)
        let surahNum, surahAyahs
        if (!isNaN(num) && VALID_SURAH_NUMBERS.has(num)) {
          surahNum   = num
          surahAyahs = ZAINLY_ORDER[ZAINLY_INDEX_BY_SURAH[num]]?.ayahs
        } else {
          const entry = ZAINLY_ORDER.find(s => s.name === key)
          if (!entry) continue
          surahNum   = entry.surah
          surahAyahs = entry.ayahs
        }
        // If to >= total ayahs, treat as fully known
        if (surahAyahs && to >= surahAyahs) {
          knownSurahsSet.add(surahNum)
          continue
        }
        // Conflict: surah is both fully known and partial — full known wins
        if (knownSurahsSet.has(surahNum)) continue
        partialMap[surahNum] = { from: 1, to }
      }
    }

    // ── Mode-specific validation & start computation ──
    let startPosition = 0
    let startAyah     = 1
    let knownAyats    = 0
    let effectiveOrder = ZAINLY_ORDER // the order the session engine will follow

    if (planMode === 'recommended') {
      // ── Mode 1: Recommended ──
      if (knownSurahsRaw !== null || Object.keys(partialMap).length > 0) {
        const r = computeStartFromKnown(knownSurahsSet, partialMap)
        startPosition = r.startPosition
        startAyah     = r.startAyah
        knownAyats    = r.knownAyats
      } else {
        // Full legacy path (old client, no knownSurahs array)
        const r = computeStartLegacy(legacySourates ?? [], legacyPartials ?? {})
        startPosition = r.startPosition
        startAyah     = r.startAyah
        knownAyats    = r.knownAyats
      }
      effectiveOrder = ZAINLY_ORDER

    } else if (planMode === 'start_surah') {
      // ── Mode 2: Start from a specific surah ──
      const startingSurah = parseInt(startingSurahRaw)
      if (isNaN(startingSurah) || !VALID_SURAH_NUMBERS.has(startingSurah)) {
        return NextResponse.json({
          error: 'Sourate de départ invalide ou absente du parcours Zainly.',
        }, { status: 400 })
      }
      if (knownSurahsSet.has(startingSurah)) {
        return NextResponse.json({
          error: 'Cette sourate est déjà indiquée comme maîtrisée. Choisis une autre sourate.',
        }, { status: 400 })
      }
      const startIdx = ZAINLY_INDEX_BY_SURAH[startingSurah]
      const rest = ZAINLY_ORDER.filter(
        s => s.surah !== startingSurah && !knownSurahsSet.has(s.surah)
      )
      effectiveOrder = [ZAINLY_ORDER[startIdx], ...rest]
      startPosition  = 0
      // If the chosen starting surah is partially known, begin at to+1
      startAyah      = getStartAyahForSurah(startingSurah, partialMap)
      for (const s of ZAINLY_ORDER) {
        if (knownSurahsSet.has(s.surah)) knownAyats += s.ayahs
      }

    } else if (planMode === 'custom_order') {
      // ── Mode 3: Custom order ──
      if (!Array.isArray(customOrderRaw) || customOrderRaw.length === 0) {
        return NextResponse.json({
          error: 'Choisis au moins une sourate pour créer ton programme.',
        }, { status: 400 })
      }
      const validCustom = []
      for (const n of customOrderRaw) {
        const num = parseInt(n)
        if (isNaN(num) || !VALID_SURAH_NUMBERS.has(num)) {
          return NextResponse.json({
            error: `Sourate invalide dans l'ordre personnalisé : ${n}`,
          }, { status: 400 })
        }
        if (knownSurahsSet.has(num)) {
          return NextResponse.json({
            error: `La sourate ${num} est indiquée comme déjà maîtrisée. Retire-la de ton programme.`,
          }, { status: 400 })
        }
        if (!validCustom.includes(num)) validCustom.push(num)
      }
      effectiveOrder = validCustom.map(num => ZAINLY_ORDER[ZAINLY_INDEX_BY_SURAH[num]])
      startPosition  = 0
      // If the first custom surah is partially known, begin at to+1
      startAyah      = getStartAyahForSurah(validCustom[0], partialMap)
      for (const s of ZAINLY_ORDER) {
        if (knownSurahsSet.has(s.surah)) knownAyats += s.ayahs
      }
    }

    // ── All sourates known check ──
    if (startPosition >= effectiveOrder.length) {
      if (planMode === 'recommended') {
        return NextResponse.json({ message: 'coran_complete' })
      }
      return NextResponse.json({
        error: 'Tu as indiqué maîtriser toutes les sourates sélectionnées. Choisis au moins une sourate à travailler.',
      }, { status: 400 })
    }

    const startSurah = effectiveOrder[startPosition]
    // knownAyats may not cover the full 6236 in modes 2/3, remaining is ayahs of effectiveOrder
    const effectiveTotal  = effectiveOrder.reduce((sum, s) => sum + s.ayahs, 0)
    const remainingAyats  = Math.max(0, effectiveTotal)
    const estimatedWeeks  = Math.ceil(remainingAyats / (ayahPerDay * DAYS_PER_WEEK))
    const estimatedMonths = Math.round(estimatedWeeks / 4.33)
    const estimatedYears  = (estimatedMonths / 12).toFixed(1)

    // ── Write plan ──
    const planPayload = {
      ayah_per_day:              ayahPerDay,
      days_per_week:             DAYS_PER_WEEK,
      first_surah_name:          startSurah.name,
      surah_start:               startSurah.surah,
      start_ayah:                startAyah,
      remaining_ayats:           remainingAyats,
      estimated_months:          estimatedMonths,
      // new columns
      plan_mode:                 planMode,
      known_surahs:              knownSurahsArray,
      starting_surah:            planMode === 'start_surah' ? parseInt(startingSurahRaw) : null,
      custom_surah_order:        (planMode === 'custom_order' || planMode === 'start_surah')
                                   ? effectiveOrder.map(s => s.surah)
                                   : [],
      pace_type:                 paceType,
      pace_label:                paceLabel,
      pedagogical_order_version: pedVersionRaw,
      partial_known_surahs:      partialMap,  // { surahNum: { from:1, to:N } }
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

    // ── Update or insert progress — preserve streak/total/dates ──
    const { data: existingProgRows } = await supabase
      .from('progress')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2)
    const existingProg = existingProgRows?.[0] ?? null

    if (existingProg) {
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

    console.log(`[generate-plan] plan saved — user=${userId} mode=${planMode} surah=${startSurah.surah} ayah=${startAyah} ayahPerDay=${ayahPerDay}`)
    return NextResponse.json({
      success:          true,
      firstSurahName:   startSurah.name,
      firstSurahNumber: startSurah.surah,
      startAyah,
      ayahPerDay,
      paceType,
      paceLabel,
      planMode,
      remainingAyats,
      estimatedMonths,
      estimatedYears,
    })
  } catch (error) {
    console.error('[generate-plan] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
