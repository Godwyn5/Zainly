import { NextResponse } from 'next/server'

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
    const { intention, niveau, temps, objectif, sourates } = await request.json()

    // ── Sourate de départ ──
    let surahStart, firstSurahName
    if (Array.isArray(sourates) && sourates.length > 0) {
      // Trouver la dernière sourate connue dans SURAH_LIST
      let lastIndex = -1
      for (const s of sourates) {
        const idx = SURAH_LIST.indexOf(s)
        if (idx > lastIndex) lastIndex = idx
      }
      if (lastIndex >= 0) {
        const nextIndex = lastIndex + 1   // index 0-based de la suivante
        surahStart = nextIndex + 1        // numéro 1-based
        if (surahStart > 114) {
          surahStart = 1
          firstSurahName = 'Al-Fatiha'
        } else {
          firstSurahName = SURAH_LIST[nextIndex]
        }
      }
    }
    if (!surahStart) {
      const def = DEFAULT_SURAH_MAP[objectif] ?? { surahStart: 78, firstSurahName: 'An-Naba' }
      surahStart = def.surahStart
      firstSurahName = def.firstSurahName
    }

    // ── Ayat par jour ──
    const tempsNum = parseInt(temps) || 20
    let ayahPerDay =
      tempsNum <= 10 ? 1 :
      tempsNum <= 20 ? 2 :
      tempsNum <= 30 ? 3 : 4
    if (
      niveau === "J'ai déjà commencé et abandonné" ||
      niveau === 'Je reprends après une longue pause'
    ) {
      ayahPerDay = Math.max(1, ayahPerDay - 1)
    }

    // ── Jours par semaine ──
    const daysPerWeek = DAYS_MAP[objectif] ?? 5

    // ── Minutes ──
    const minutesPerSession = tempsNum
    const memorizationMinutes = Math.round(tempsNum * 0.4)
    const revisionMinutes = Math.round(tempsNum * 0.6)

    // ── Durée estimée ──
    let totalAyats = 0
    const startIdx = surahStart - 1   // 0-based
    if (objectif === 'Finir une sourate courte') {
      totalAyats = SURAH_AYAT[startIdx] ?? 0
    } else if (objectif === 'Mémoriser le Juz Amma') {
      // Sourates 78–114 (index 77–113)
      totalAyats = SURAH_AYAT.slice(77, 114).reduce((a, b) => a + b, 0)
    } else {
      // Coran complet: toutes les sourates
      totalAyats = SURAH_AYAT.reduce((a, b) => a + b, 0)
    }
    const estimatedDays = Math.ceil(totalAyats / ayahPerDay)
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
