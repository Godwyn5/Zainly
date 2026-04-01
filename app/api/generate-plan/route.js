import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SURAH_LIST = ['Al-Fatiha','Al-Baqara','Al-Imran','An-Nisa','Al-Maida','Al-Anam','Al-Araf','Al-Anfal','At-Tawba','Yunus','Hud','Yusuf','Ar-Rad','Ibrahim','Al-Hijr','An-Nahl','Al-Isra','Al-Kahf','Maryam','Ta-Ha','Al-Anbiya','Al-Hajj','Al-Muminun','An-Nur','Al-Furqan','Ash-Shuara','An-Naml','Al-Qasas','Al-Ankabut','Ar-Rum','Luqman','As-Sajda','Al-Ahzab','Saba','Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura','Az-Zukhruf','Ad-Dukhan','Al-Jathiya','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf','Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqia','Al-Hadid','Al-Mujadila','Al-Hashr','Al-Mumtahina','As-Saf','Al-Jumua','Al-Munafiqun','At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqa','Al-Maarij','Nuh','Al-Jinn','Al-Muzzammil','Al-Muddaththir','Al-Qiyama','Al-Insan','Al-Mursalat','An-Naba','An-Naziat','Abasa','At-Takwir','Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq','Al-Ala','Al-Ghashiya','Al-Fajr','Al-Balad','Ash-Shams','Al-Layl','Ad-Duha','Ash-Sharh','At-Tin','Al-Alaq','Al-Qadr','Al-Bayyina','Az-Zalzala','Al-Adiyat','Al-Qaria','At-Takathur','Al-Asr','Al-Humaza','Al-Fil','Quraysh','Al-Maun','Al-Kawthar','Al-Kafirun','An-Nasr','Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas']

const SURAH_AYAT = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6]

const DAYS_MAP = {
  'Finir une sourate courte':   3,
  'Mémoriser le Juz Amma':      5,
  'Mémoriser le Coran complet': 6,
}

const DEFAULT_SURAH_MAP = {
  'Finir une sourate courte':   { surahStart: 112, firstSurahName: 'Al-Ikhlas' },
  'Mémoriser le Juz Amma':      { surahStart: 78,  firstSurahName: 'An-Naba' },
  'Mémoriser le Coran complet': { surahStart: 1,   firstSurahName: 'Al-Fatiha' },
}

const MOTIVATION_MAP = {
  "Me rapprocher d'Allah": "Chaque ayat mémorisé est une prière que tu porteras toute ta vie.",
  'Honorer une promesse':  "Tu as fait une promesse. Aujourd'hui tu commences à la tenir.",
  'Me discipliner':        "La discipline commence ici. Un ayat à la fois.",
  'Devenir Hafiz':         "Le chemin commence aujourd'hui. Et tu iras jusqu'au bout.",
}

export async function POST(request) {
  try {
    // ── Auth verification ──
    const authHeader = request.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
    }

    // ── Input validation ──
    const body = await request.json()
    const { intention, niveau, temps, objectif, sourates } = body
    if (
      typeof intention !== 'string' || !intention.trim() ||
      typeof niveau    !== 'string' || !niveau.trim()    ||
      typeof temps     !== 'string' || !temps.trim()     ||
      typeof objectif  !== 'string' || !objectif.trim()  ||
      !Array.isArray(sourates)
    ) {
      return NextResponse.json({ error: 'Champs manquants ou invalides.' }, { status: 400 })
    }

    // ── Ayat par jour ──
    const timeMap = { '10': 1, '20': 2, '30': 3, '45': 4 }
    let ayahPerDay = timeMap[temps.trim()] ?? 2
    if (niveau === 'Je reprends après une longue pause') ayahPerDay = Math.max(1, ayahPerDay - 1)
    if (niveau === "J'ai déjà commencé et abandonné")    ayahPerDay = Math.max(1, ayahPerDay - 1)
    if (objectif === 'Finir une sourate courte')         ayahPerDay = Math.min(6, ayahPerDay)
    if (objectif === 'Mémoriser le Juz Amma')            ayahPerDay = Math.min(6, ayahPerDay)

    // ── Sourate de départ ──
    let surahStart    = 78
    let firstSurahName = 'An-Naba'
    if (objectif === 'Finir une sourate courte')    { surahStart = 112; firstSurahName = 'Al-Ikhlas' }
    else if (objectif === 'Mémoriser le Coran complet') { surahStart = 1;   firstSurahName = 'Al-Fatiha' }

    if (Array.isArray(sourates) && sourates.length > 0) {
      const knownIndices = sourates.map(s => SURAH_LIST.indexOf(s)).filter(i => i >= 0)
      if (knownIndices.length > 0) {
        const maxKnown  = Math.max(...knownIndices)
        const nextIndex = maxKnown + 1
        if (nextIndex < SURAH_LIST.length) {
          surahStart     = nextIndex + 1
          firstSurahName = SURAH_LIST[nextIndex]
        }
      }
    }

    // ── Jours par semaine ──
    const daysPerWeek = DAYS_MAP[objectif] ?? 5

    // ── Minutes ──
    const tempsNum            = parseInt(temps) || 20
    const minutesPerSession   = tempsNum
    const memorizationMinutes = Math.round(tempsNum * 0.4)
    const revisionMinutes     = Math.round(tempsNum * 0.6)

    // ── Durée estimée ──
    let totalAyats = 0
    if (objectif === 'Finir une sourate courte') {
      totalAyats = SURAH_AYAT[surahStart - 1] ?? 0
    } else if (objectif === 'Mémoriser le Juz Amma') {
      totalAyats = SURAH_AYAT.slice(77, 114).reduce((a, b) => a + b, 0)
    } else {
      totalAyats = SURAH_AYAT.reduce((a, b) => a + b, 0)
    }
    if (Array.isArray(sourates) && sourates.length > 0) {
      const knownAyats = sourates.reduce((total, s) => {
        const idx = SURAH_LIST.indexOf(s)
        return idx >= 0 ? total + SURAH_AYAT[idx] : total
      }, 0)
      totalAyats = Math.max(0, totalAyats - knownAyats)
    }
    const estimatedDays   = Math.ceil(totalAyats / ayahPerDay)
    const estimatedMonths = Math.round(estimatedDays / 30)

    // ── Motivation ──
    const motivationPhrase =
      MOTIVATION_MAP[intention] ??
      "Allah facilite le chemin de celui qui cherche à s'en rapprocher."

    return NextResponse.json({
      surahStart,
      firstSurahName,
      ayahPerDay,
      daysPerWeek,
      minutesPerSession,
      memorizationMinutes,
      revisionMinutes,
      estimatedDays,
      estimatedMonths,
      motivationPhrase,
    })
  } catch (error) {
    console.error('[generate-plan] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
