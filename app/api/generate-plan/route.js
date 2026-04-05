import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Zainly memorization order ────────────────────────────────────────────────

const ZAINLY_ORDER = [
  { name: 'Al-Fatiha',     surah: 1,   ayahs: 7   },
  { name: 'An-Nas',        surah: 114, ayahs: 6   },
  { name: 'Al-Falaq',      surah: 113, ayahs: 5   },
  { name: 'Al-Ikhlas',     surah: 112, ayahs: 4   },
  { name: 'Al-Masad',      surah: 111, ayahs: 5   },
  { name: 'An-Nasr',       surah: 110, ayahs: 3   },
  { name: 'Al-Kafirun',    surah: 109, ayahs: 6   },
  { name: 'Al-Kawthar',    surah: 108, ayahs: 3   },
  { name: 'Al-Maun',       surah: 107, ayahs: 7   },
  { name: 'Quraysh',       surah: 106, ayahs: 4   },
  { name: 'Al-Fil',        surah: 105, ayahs: 5   },
  { name: 'Al-Humaza',     surah: 104, ayahs: 9   },
  { name: 'Al-Asr',        surah: 103, ayahs: 3   },
  { name: 'At-Takathur',   surah: 102, ayahs: 8   },
  { name: 'Al-Qaria',      surah: 101, ayahs: 11  },
  { name: 'Al-Adiyat',     surah: 100, ayahs: 11  },
  { name: 'Az-Zalzala',    surah: 99,  ayahs: 8   },
  { name: 'Al-Bayyina',    surah: 98,  ayahs: 8   },
  { name: 'Al-Qadr',       surah: 97,  ayahs: 5   },
  { name: 'Al-Alaq',       surah: 96,  ayahs: 19  },
  { name: 'At-Tin',        surah: 95,  ayahs: 8   },
  { name: 'Ash-Sharh',     surah: 94,  ayahs: 8   },
  { name: 'Ad-Duha',       surah: 93,  ayahs: 11  },
  { name: 'Al-Layl',       surah: 92,  ayahs: 21  },
  { name: 'Ash-Shams',     surah: 91,  ayahs: 15  },
  { name: 'Al-Balad',      surah: 90,  ayahs: 20  },
  { name: 'Al-Fajr',       surah: 89,  ayahs: 30  },
  { name: 'Al-Ghashiya',   surah: 88,  ayahs: 26  },
  { name: 'Al-Ala',        surah: 87,  ayahs: 19  },
  { name: 'At-Tariq',      surah: 86,  ayahs: 17  },
  { name: 'Al-Buruj',      surah: 85,  ayahs: 22  },
  { name: 'Al-Inshiqaq',   surah: 84,  ayahs: 25  },
  { name: 'Al-Mutaffifin', surah: 83,  ayahs: 36  },
  { name: 'Al-Infitar',    surah: 82,  ayahs: 19  },
  { name: 'At-Takwir',     surah: 81,  ayahs: 29  },
  { name: 'Abasa',         surah: 80,  ayahs: 42  },
  { name: 'An-Naziat',     surah: 79,  ayahs: 46  },
  { name: 'An-Naba',       surah: 78,  ayahs: 40  },
  { name: 'Al-Baqara',     surah: 2,   ayahs: 286 },
  { name: 'Al-Imran',      surah: 3,   ayahs: 200 },
  { name: 'An-Nisa',       surah: 4,   ayahs: 176 },
  { name: 'Al-Maida',      surah: 5,   ayahs: 120 },
  { name: 'Al-Anam',       surah: 6,   ayahs: 165 },
  { name: 'Al-Araf',       surah: 7,   ayahs: 206 },
  { name: 'Al-Anfal',      surah: 8,   ayahs: 75  },
  { name: 'At-Tawba',      surah: 9,   ayahs: 129 },
  { name: 'Yunus',         surah: 10,  ayahs: 109 },
  { name: 'Hud',           surah: 11,  ayahs: 123 },
  { name: 'Yusuf',         surah: 12,  ayahs: 111 },
  { name: 'Ar-Rad',        surah: 13,  ayahs: 43  },
  { name: 'Ibrahim',       surah: 14,  ayahs: 52  },
  { name: 'Al-Hijr',       surah: 15,  ayahs: 99  },
  { name: 'An-Nahl',       surah: 16,  ayahs: 128 },
  { name: 'Al-Isra',       surah: 17,  ayahs: 111 },
  { name: 'Al-Kahf',       surah: 18,  ayahs: 110 },
  { name: 'Maryam',        surah: 19,  ayahs: 98  },
  { name: 'Ta-Ha',         surah: 20,  ayahs: 135 },
  { name: 'Al-Anbiya',     surah: 21,  ayahs: 112 },
  { name: 'Al-Hajj',       surah: 22,  ayahs: 78  },
  { name: 'Al-Muminun',    surah: 23,  ayahs: 118 },
  { name: 'An-Nur',        surah: 24,  ayahs: 64  },
  { name: 'Al-Furqan',     surah: 25,  ayahs: 77  },
  { name: 'Ash-Shuara',    surah: 26,  ayahs: 227 },
  { name: 'An-Naml',       surah: 27,  ayahs: 93  },
  { name: 'Al-Qasas',      surah: 28,  ayahs: 88  },
  { name: 'Al-Ankabut',    surah: 29,  ayahs: 69  },
  { name: 'Ar-Rum',        surah: 30,  ayahs: 60  },
  { name: 'Luqman',        surah: 31,  ayahs: 34  },
  { name: 'As-Sajda',      surah: 32,  ayahs: 30  },
  { name: 'Al-Ahzab',      surah: 33,  ayahs: 73  },
  { name: 'Saba',          surah: 34,  ayahs: 54  },
  { name: 'Fatir',         surah: 35,  ayahs: 45  },
  { name: 'Ya-Sin',        surah: 36,  ayahs: 83  },
  { name: 'As-Saffat',     surah: 37,  ayahs: 182 },
  { name: 'Sad',           surah: 38,  ayahs: 88  },
  { name: 'Az-Zumar',      surah: 39,  ayahs: 75  },
  { name: 'Ghafir',        surah: 40,  ayahs: 85  },
  { name: 'Fussilat',      surah: 41,  ayahs: 54  },
  { name: 'Ash-Shura',     surah: 42,  ayahs: 53  },
  { name: 'Az-Zukhruf',    surah: 43,  ayahs: 89  },
  { name: 'Ad-Dukhan',     surah: 44,  ayahs: 59  },
  { name: 'Al-Jathiya',    surah: 45,  ayahs: 37  },
  { name: 'Al-Ahqaf',      surah: 46,  ayahs: 35  },
  { name: 'Muhammad',      surah: 47,  ayahs: 38  },
  { name: 'Al-Fath',       surah: 48,  ayahs: 29  },
  { name: 'Al-Hujurat',    surah: 49,  ayahs: 18  },
  { name: 'Qaf',           surah: 50,  ayahs: 45  },
  { name: 'Adh-Dhariyat',  surah: 51,  ayahs: 60  },
  { name: 'At-Tur',        surah: 52,  ayahs: 49  },
  { name: 'An-Najm',       surah: 53,  ayahs: 62  },
  { name: 'Al-Qamar',      surah: 54,  ayahs: 55  },
  { name: 'Ar-Rahman',     surah: 55,  ayahs: 78  },
  { name: 'Al-Waqia',      surah: 56,  ayahs: 96  },
  { name: 'Al-Hadid',      surah: 57,  ayahs: 29  },
  { name: 'Al-Mujadila',   surah: 58,  ayahs: 22  },
  { name: 'Al-Hashr',      surah: 59,  ayahs: 24  },
  { name: 'Al-Mumtahana',  surah: 60,  ayahs: 13  },
  { name: 'As-Saf',        surah: 61,  ayahs: 14  },
  { name: 'Al-Jumua',      surah: 62,  ayahs: 11  },
  { name: 'Al-Munafiqun',  surah: 63,  ayahs: 11  },
  { name: 'At-Taghabun',   surah: 64,  ayahs: 18  },
  { name: 'At-Talaq',      surah: 65,  ayahs: 12  },
  { name: 'At-Tahrim',     surah: 66,  ayahs: 12  },
  { name: 'Al-Mulk',       surah: 67,  ayahs: 30  },
  { name: 'Al-Qalam',      surah: 68,  ayahs: 52  },
  { name: 'Al-Haqqa',      surah: 69,  ayahs: 52  },
  { name: 'Al-Maarij',     surah: 70,  ayahs: 44  },
  { name: 'Nuh',           surah: 71,  ayahs: 28  },
  { name: 'Al-Jinn',       surah: 72,  ayahs: 28  },
  { name: 'Al-Muzzammil',  surah: 73,  ayahs: 20  },
  { name: 'Al-Muddaththir',surah: 74,  ayahs: 56  },
  { name: 'Al-Qiyama',     surah: 75,  ayahs: 40  },
  { name: 'Al-Insan',      surah: 76,  ayahs: 31  },
  { name: 'Al-Mursalat',   surah: 77,  ayahs: 50  },
]

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

    // ── Upsert plan ──
    const { error: planErr } = await supabase.from('plans').upsert({
      user_id:            userId,
      ayah_per_day:       ayahPerDay,
      days_per_week:      daysPerWeek,
      first_surah_name:   startSurah.name,
      surah_start:        startSurah.surah,
      start_ayah:         startAyah,
      remaining_ayats:    remainingAyats,
      estimated_months:   estimatedMonths,
    }, { onConflict: 'user_id' })
    if (planErr) {
      console.error('[generate-plan] plan upsert error:', planErr)
      return NextResponse.json({ error: planErr.message }, { status: 500 })
    }

    // ── Upsert progress ──
    const { error: progErr } = await supabase.from('progress').upsert({
      user_id:         userId,
      current_surah:   startSurah.surah,
      current_ayah:    startAyah - 1,
      ayah_per_day:    ayahPerDay,
      streak:          0,
      total_memorized: 0,
      session_dates:   [],
    }, { onConflict: 'user_id' })
    if (progErr) {
      console.error('[generate-plan] progress upsert error:', progErr)
      return NextResponse.json({ error: progErr.message }, { status: 500 })
    }

    // ── Response ──
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
