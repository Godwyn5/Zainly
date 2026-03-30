'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Data ────────────────────────────────────────────────────────────────────

const SURAH_NAMES = [
  'Al-Fatiha','Al-Baqara','Al-Imran','An-Nisa','Al-Maida','Al-Anam','Al-Araf','Al-Anfal',
  'At-Tawba','Yunus','Hud','Yusuf','Ar-Rad','Ibrahim','Al-Hijr','An-Nahl','Al-Isra',
  'Al-Kahf','Maryam','Ta-Ha','Al-Anbiya','Al-Hajj','Al-Muminun','An-Nur','Al-Furqan',
  'Ash-Shuara','An-Naml','Al-Qasas','Al-Ankabut','Ar-Rum','Luqman','As-Sajda','Al-Ahzab',
  'Saba','Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura',
  'Az-Zukhruf','Ad-Dukhan','Al-Jathiya','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf',
  'Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqia','Al-Hadid','Al-Mujadila',
  'Al-Hashr','Al-Mumtahina','As-Saf','Al-Jumua','Al-Munafiqun','At-Taghabun','At-Talaq',
  'At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqa','Al-Maarij','Nuh','Al-Jinn','Al-Muzzammil',
  'Al-Muddaththir','Al-Qiyama','Al-Insan','Al-Mursalat','An-Naba','An-Naziat','Abasa',
  'At-Takwir','Al-Infitar','Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq','Al-Ala',
  'Al-Ghashiya','Al-Fajr','Al-Balad','Ash-Shams','Al-Layl','Ad-Duha','Ash-Sharh','At-Tin',
  'Al-Alaq','Al-Qadr','Al-Bayyina','Az-Zalzala','Al-Adiyat','Al-Qaria','At-Takathur',
  'Al-Asr','Al-Humaza','Al-Fil','Quraysh','Al-Maun','Al-Kawthar','Al-Kafirun','An-Nasr',
  'Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

function getSurahName(num) {
  return SURAH_NAMES[(num ?? 1) - 1] ?? `Sourate ${num}`;
}

const SURAH_AYAT_COUNT = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,
  227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,
  60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,
  50,22,31,13,54,55,43,34,31,10,13,10,9,8,8,3,9,5,9,6,8,3,11,11,10,7,
  3,3,11,4,5,4,7,3,6,3,5,4,5,6,
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function globalAyatNumber(quran, surahNumber, ayahId) {
  let total = 0;
  for (let i = 0; i < surahNumber - 1; i++) {
    total += quran[i]?.verses?.length ?? 0;
  }
  return total + ayahId;
}

function formatDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getMotivation(streak) {
  if (streak >= 30) return "Un mois. Tu es hafiz en devenir. Allah facilite ton chemin.";
  if (streak >= 14) return "Deux semaines. Le Coran s\u2019installe dans ton c\u0153ur.";
  if (streak >= 7)  return "Une semaine compl\u00e8te. Tu es en train de devenir quelqu\u2019un de diff\u00e9rent.";
  if (streak >= 2)  return "Tu construis quelque chose de solide. Continue.";
  return "Bienvenue. Chaque grand hafiz a commenc\u00e9 exactement l\u00e0 o\u00f9 tu en es.";
}

// ─── Keyframe injection ───────────────────────────────────────────────────────

const CSS = `
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
`;

// ─── Shared styles ────────────────────────────────────────────────────────────

const card = {
  backgroundColor: '#FFFFFF',
  borderRadius: '20px',
  boxShadow: '0 8px 48px rgba(15,35,24,0.08)',
  padding: '24px 28px',
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function buildMonthCalendar(year, month) {
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  // Convert Sun=0 to Mon=0 offset
  const offset = (firstDay + 6) % 7;
  return { offset, daysInMonth };
}

function padZero(n) { return String(n).padStart(2, '0'); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]             = useState(null);
  const [progress, setProgress]     = useState(null);
  const [plan, setPlan]             = useState(null);
  const [reviews, setReviews]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [activeTab, setActiveTab]   = useState('today');

  // ── Feedback state ──
  const [feedbackOpen, setFeedbackOpen]       = useState(false);
  const [feedbackText, setFeedbackText]       = useState('');
  const [feedbackSaving, setFeedbackSaving]   = useState(false);
  const [feedbackDone, setFeedbackDone]       = useState(false);

  async function submitFeedback() {
    if (!feedbackText.trim() || feedbackSaving) return;
    setFeedbackSaving(true);
    await supabase.from('feedbacks').insert({ user_id: user?.id, message: feedbackText.trim() });
    setFeedbackSaving(false);
    setFeedbackDone(true);
    setTimeout(() => {
      setFeedbackText('');
      setFeedbackDone(false);
      setFeedbackOpen(true);
    }, 2000);
  }

  // ── Mon Hifz state ──
  const [hifzItems, setHifzItems]       = useState([]);   // all review_items
  const [hifzQuran, setHifzQuran]       = useState(null); // quran.json
  const [hifzQuranFr, setHifzQuranFr]   = useState(null); // quran_fr.json
  const [hifzLoading, setHifzLoading]   = useState(false);
  const [hifzLoaded, setHifzLoaded]     = useState(false);
  const [expandedSurah, setExpandedSurah] = useState(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) { router.push('/login'); return; }
      setUser(authUser);

      const today = todayStr();

      const [
        { data: planRows,      error: planFetchErr },
        { data: progressRows,  error: progFetchErr },
        { data: reviewData,    error: revFetchErr  },
      ] = await Promise.all([
        supabase.from('plans').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('progress').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('review_items').select('*').eq('user_id', authUser.id).lte('next_review', today),
      ]);

      const planData     = planRows?.[0] ?? null;
      const progressData = progressRows?.[0] ?? null;


      const realPlanError = planFetchErr ?? null;

      setPlan(planData);
      setProgress(progressData);
      setReviews(reviewData ?? []);
      setFetchError(realPlanError);
      setLoading(false);
    }
    loadData();
  }, [router]);

  async function loadHifz(userId) {
    if (hifzLoaded) return;
    setHifzLoading(true);
    const [{ data: allItems }, quranRes, frRes] = await Promise.all([
      supabase.from('review_items').select('*').eq('user_id', userId).order('surah_number', { ascending: true }),
      fetch('/data/quran.json'),
      fetch('/data/quran_fr.json'),
    ]);
    const quran   = quranRes.ok  ? await quranRes.json()  : null;
    const quranFr = frRes.ok     ? await frRes.json()     : null;
    setHifzItems(allItems ?? []);
    setHifzQuran(quran);
    setHifzQuranFr(quranFr);
    setHifzLoading(false);
    setHifzLoaded(true);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'hifz' && user) loadHifz(user.id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
      </div>
    );
  }

  // ── No plan (loading finished, still null) ──
  if (!plan) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px' }}>
        <p className="font-playfair" style={{ fontSize: '20px', color: '#163026' }}>Aucun plan trouvé.</p>
        {fetchError && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', backgroundColor: 'rgba(184,150,46,0.08)', borderRadius: '8px', padding: '8px 16px', maxWidth: '400px', textAlign: 'center' }}>
            Erreur Supabase : [{fetchError.code}] {fetchError.message}
          </p>
        )}
        <button type="button" onClick={() => router.push('/onboarding')} className="font-playfair"
          style={{ padding: '12px 28px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#FFF', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
          Créer mon plan →
        </button>
      </div>
    );
  }

  const prenom          = user?.user_metadata?.prenom || '';
  const streak          = progress?.streak ?? 0;
  const currentAyah     = progress?.current_ayah ?? 0;
  const ayahPerDay      = plan.ayah_per_day ?? 2;
  const currentSurah    = progress?.current_surah ?? 1;
  const surahTotalAyat  = SURAH_AYAT_COUNT[currentSurah - 1] ?? 7;
  const memStart        = currentAyah + 1;
  const memEnd          = Math.min(currentAyah + ayahPerDay, surahTotalAyat);
  const surahExhausted  = memStart > surahTotalAyat;
  const surahName       = plan.first_surah_name ?? getSurahName(currentSurah);
  const totalMemorized  = progress?.total_memorized ?? 0;
  const progressPct     = Math.min((totalMemorized / 6236) * 100, 100);
  const today           = todayStr();
  const sessionDone     = progress?.last_session_date === today;
  const minutesSession  = plan.minutes_per_session ?? 20;

  // Estimated months remaining
  const ayatLeft   = Math.max(0, 6236 - totalMemorized);
  const estDays    = ayahPerDay > 0 ? Math.ceil(ayatLeft / ayahPerDay) : 0;
  const estMonths  = Math.max(1, Math.round(estDays / 30));

  // session_dates calendar
  const sessionDates = new Set(Array.isArray(progress?.session_dates) ? progress.session_dates : []);
  const now          = new Date();
  const curYear      = now.getFullYear();
  const curMonth     = now.getMonth() + 1; // 1-12
  const curDay       = now.getDate();
  const { offset, daysInMonth } = buildMonthCalendar(curYear, curMonth);
  const thisMonthSessions = [...sessionDates].filter(d => d.startsWith(`${curYear}-${padZero(curMonth)}`)).length;

  const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const TOTAL_QURAN = 6236;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', paddingBottom: '80px' }}>
      <style>{CSS}</style>

      {/* ══════════════════════ AUJOURD'HUI TAB ══════════════════════ */}
      <div style={{ display: activeTab === 'today' ? 'block' : 'none' }}>

        {/* ── HEADER ── */}
        <div style={{
          background: 'linear-gradient(160deg, #0d1f17 0%, #163026 50%, #1e4535 100%)',
          padding: '32px 24px 64px 24px',
          position: 'relative', overflow: 'hidden',
          animation: 'slideDown 0.5s ease both',
        }}>
          <span className="font-amiri" style={{
            position: 'absolute', right: '-10px', bottom: '-10px',
            fontSize: '180px', color: '#fff', opacity: 0.05,
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          }}>الله</span>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', display: 'block' }}>Assalamu Alaykoum,</span>
              <span className="font-playfair" style={{ fontSize: '34px', fontWeight: 600, color: '#fff', display: 'block', marginTop: '2px' }}>{prenom || 'Frère'}</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '4px' }}>{formatDate()}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '20px' }}>🔥</span>
                <span className="font-playfair" style={{ fontSize: '32px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{streak}</span>
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '2px' }}>jours</span>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '36px', right: '24px' }}>
            <button onClick={handleSignOut} style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
              color: 'rgba(255,255,255,0.5)', backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px',
              padding: '6px 12px', cursor: 'pointer',
            }}>Déconnexion</button>
          </div>
        </div>

        {/* ── SESSION CARD ── */}
        <div style={{ margin: '-24px 16px 0 16px', ...card, borderRadius: '24px', boxShadow: '0 20px 60px rgba(15,35,24,0.15)', padding: '28px', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', letterSpacing: '2px', color: '#B8962E', textTransform: 'uppercase' }}>AUJOURD&apos;HUI</span>

          <div style={{ marginTop: '16px' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Nouvelle mémorisation</span>
            <p className="font-playfair" style={{ fontSize: '20px', fontWeight: 600, color: '#163026', margin: '6px 0 2px 0' }}>{surahName}</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: '0 0 10px 0' }}>
              {surahExhausted ? 'Passage à la sourate suivante...' : `Ayat ${memStart} à ${memEnd}`}
            </p>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', backgroundColor: 'rgba(22,48,38,0.08)', borderRadius: '20px', padding: '4px 12px', color: '#163026' }}>
              {ayahPerDay} ayat · {plan.memorization_minutes ?? Math.round(minutesSession * 0.4)} min
            </span>
          </div>

          <div style={{ borderTop: '1.5px dashed #E2D9CC', margin: '20px 0' }} />

          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Révision</span>
          {reviews.length > 0 ? (
            <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {reviews.map((r) => (
                <li key={r.id} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026' }}>
                  {r.surah_name ?? `Sourate ${r.surah_number}`} — ayat {r.ayah}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ marginTop: '10px', display: 'inline-block', backgroundColor: 'rgba(184,150,46,0.1)', borderRadius: '20px', padding: '6px 14px' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E' }}>Aucune révision aujourd&apos;hui 🎉</span>
            </div>
          )}

          {sessionDone ? (
            <div style={{ marginTop: '24px', width: '100%', padding: '16px', textAlign: 'center', backgroundColor: 'rgba(22,48,38,0.06)', borderRadius: '12px', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026' }}>
              Session du jour complétée ✓
            </div>
          ) : (
            <button type="button" className="font-playfair" onClick={() => router.push('/session')} style={{
              marginTop: '24px', width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg, #163026, #2d5a42)', border: 'none', borderRadius: '12px', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(15,35,24,0.3)', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.38)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,35,24,0.3)'; }}
            >Commencer la session →</button>
          )}
        </div>

        {/* ── PROGRESSION CARD ── */}
        <div style={{ margin: '24px 16px 0 16px', ...card, padding: '24px 28px', animation: 'fadeUp 0.6s ease 0.4s both' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '2px' }}>TON OBJECTIF</span>
          <div style={{ marginTop: '16px', backgroundColor: '#E2D9CC', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #163026, #B8962E)', borderRadius: '3px', transition: 'width 1.2s ease' }} />
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: '10px 0 0 0' }}>{totalMemorized} / 6236 ayat</p>
          <p className="font-playfair" style={{ fontSize: '14px', fontStyle: 'italic', color: '#6B6357', margin: '8px 0 0 0', lineHeight: 1.6 }}>
            Il te reste environ {estMonths} mois pour atteindre ton objectif.
          </p>
        </div>

        {/* ── MOTIVATION ── */}
        <div style={{ margin: '16px', backgroundColor: 'rgba(22,48,38,0.04)', borderRadius: '16px', borderLeft: '3px solid #B8962E', padding: '20px 24px', animation: 'fadeIn 0.6s ease 0.6s both' }}>
          <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#163026', margin: 0, lineHeight: 1.7 }}>
            {getMotivation(streak)}
          </p>
        </div>

      </div>{/* end today tab */}

      {/* ══════════════════════ PROGRESSION TAB ══════════════════════ */}
      <div style={{ display: activeTab === 'progress' ? 'block' : 'none' }}>

        {/* ── HEADER PROGRESSION ── */}
        <div style={{
          background: 'linear-gradient(160deg, #163026 0%, #1e4535 60%, #2d5a42 100%)',
          padding: '32px 24px 48px 24px',
          position: 'relative', overflow: 'hidden',
          animation: 'slideDown 0.5s ease both',
        }}>
          <span className="font-amiri" style={{
            position: 'absolute', right: '-20px', bottom: '-20px',
            fontSize: '160px', color: '#fff', opacity: 0.04,
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          }}>الله</span>
          <h2 className="font-playfair" style={{ fontSize: '28px', fontWeight: 600, color: '#fff', margin: 0 }}>
            Ta progression
          </h2>
        </div>

        {/* ── STATS CARD ── */}
        <div style={{
          margin: '-24px 16px 0 16px', position: 'relative', zIndex: 1,
          ...card, padding: '28px',
          display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', alignItems: 'center',
          animation: 'fadeUp 0.5s ease 0.1s both',
        }}>
          <StatCol value={totalMemorized} label="Ayat mémorisés" />
          <div style={{ width: '1px', height: '48px', backgroundColor: '#E2D9CC' }} />
          <StatCol value={streak} label="Jours de suite" />
          <div style={{ width: '1px', height: '48px', backgroundColor: '#E2D9CC' }} />
          <StatCol value={thisMonthSessions} label="Actif ce mois" />
        </div>

        {/* ── CORAN COMPLET BAR ── */}
        <div style={{ margin: '24px 16px 0 16px', ...card, padding: '24px 28px', animation: 'fadeUp 0.5s ease 0.2s both' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '2px' }}>
            VERS LE CORAN COMPLET
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', marginBottom: '10px' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>{totalMemorized} / {TOTAL_QURAN} ayat</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#163026', fontWeight: 600 }}>{progressPct.toFixed(1)}%</span>
          </div>
          <div style={{ backgroundColor: '#E2D9CC', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #163026, #B8962E)', borderRadius: '4px', transition: 'width 1.2s ease' }} />
          </div>
        </div>

        {/* ── CALENDRIER ── */}
        <div style={{ margin: '24px 16px 0 16px', ...card, padding: '28px', animation: 'fadeUp 0.5s ease 0.3s both' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: '16px' }}>
            CE MOIS
          </span>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '6px' }}>
            {DAY_LABELS.map((d, i) => (
              <div key={i} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: '#6B6357', textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {/* Empty cells for offset */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day      = i + 1;
              const dateStr  = `${curYear}-${padZero(curMonth)}-${padZero(day)}`;
              const isToday  = day === curDay;
              const hasSession = sessionDates.has(dateStr);

              let bg        = '#E2D9CC';
              let color     = '#6B6357';
              let border    = 'none';
              if (hasSession)       { bg = '#163026'; color = '#fff'; }
              else if (isToday)     { bg = 'transparent'; border = '2px solid #B8962E'; color = '#163026'; }

              return (
                <div key={day} style={{
                  width: '28px', height: '28px',
                  borderRadius: '50%',
                  backgroundColor: bg,
                  border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '10px',
                  color, fontWeight: hasSession ? 600 : 400,
                  margin: '0 auto',
                }}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>

      </div>{/* end progress tab */}

      {/* ══════════════════════ MON HIFZ TAB ══════════════════════ */}
      <div style={{ display: activeTab === 'hifz' ? 'block' : 'none' }}>

        {/* ── HEADER MON HIFZ ── */}
        <div style={{
          background: 'linear-gradient(160deg, #163026 0%, #1e4535 60%, #2d5a42 100%)',
          padding: '32px 24px 48px 24px',
          position: 'relative', overflow: 'hidden',
          animation: 'slideDown 0.5s ease both',
        }}>
          <span className="font-amiri" style={{
            position: 'absolute', right: '-20px', bottom: '-20px',
            fontSize: '160px', color: '#fff', opacity: 0.04,
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          }}>الله</span>
          <h2 className="font-playfair" style={{ fontSize: '28px', fontWeight: 600, color: '#fff', margin: 0 }}>
            Mon Hifz
          </h2>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ padding: '16px' }}>
          {hifzLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '48px' }}>
              <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
            </div>
          ) : hifzItems.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '48px', gap: '16px', textAlign: 'center' }}>
              <span style={{ fontSize: '48px' }}>📖</span>
              <p className="font-playfair" style={{ fontSize: '18px', fontWeight: 600, color: '#163026', margin: 0, lineHeight: 1.4 }}>
                Tu n&apos;as pas encore mémorisé d&apos;ayat.
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: 0 }}>
                Lance ta première session.
              </p>
              <button type="button" className="font-playfair" onClick={() => handleTabChange('today')} style={{
                marginTop: '8px', padding: '14px 32px', fontSize: '15px', fontWeight: 600,
                backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(15,35,24,0.25)',
              }}>
                Commencer →
              </button>
            </div>
          ) : (() => {
            // Group by surah_number
            const grouped = {};
            for (const item of hifzItems) {
              const sn = item.surah_number ?? 1;
              if (!grouped[sn]) grouped[sn] = [];
              grouped[sn].push(item);
            }
            const surahNumbers = Object.keys(grouped).map(Number).sort((a, b) => a - b);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {surahNumbers.map((sn, idx) => {
                  const items      = grouped[sn];
                  const name       = getSurahName(sn);
                  const isExpanded = expandedSurah === sn;
                  const surahData  = hifzQuran ? hifzQuran[sn - 1] : null;
                  const surahFrData = hifzQuranFr ? hifzQuranFr[sn - 1] : null;

                  return (
                    <div key={sn} style={{
                      ...card,
                      padding: 0,
                      overflow: 'hidden',
                      animation: `fadeUp 0.4s ease ${idx * 0.05}s both`,
                    }}>
                      {/* Surah header row */}
                      <button
                        type="button"
                        onClick={() => setExpandedSurah(isExpanded ? null : sn)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <p className="font-playfair" style={{ fontSize: '18px', fontWeight: 600, color: '#163026', margin: 0 }}>
                            {name}
                          </p>
                          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: '4px 0 0 0' }}>
                            {items.length} ayat mémorisé{items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <span style={{ fontSize: '18px', color: '#B8962E', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
                      </button>

                      {/* Expanded ayat */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #F0EBE0', padding: '8px 0 16px 0' }}>
                          {items
                            .sort((a, b) => (a.ayah ?? 0) - (b.ayah ?? 0))
                            .map((item, i) => {
                              const verse   = surahData?.verses?.find(v => v.id === item.ayah);
                              const verseFr = surahFrData?.verses?.find(v => v.id === item.ayah);
                              return (
                                <div key={item.id}>
                                  {i > 0 && <div style={{ height: '1px', backgroundColor: '#F0EBE0', margin: '0 24px' }} />}
                                  <div style={{ padding: '16px 24px' }}>
                                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '12px', color: '#B8962E', margin: '0 0 10px 0', letterSpacing: '0.5px' }}>
                                      Ayat {item.ayah}
                                    </p>
                                    {verse?.text ? (
                                      <p className="font-amiri" style={{ fontSize: '28px', fontWeight: 700, color: '#163026', direction: 'rtl', textAlign: 'right', lineHeight: 1.8, margin: '0 0 10px 0' }}>
                                        {verse.text}
                                      </p>
                                    ) : null}
                                    {verse?.transliteration ? (
                                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', fontSize: '14px', color: '#6B6357', margin: '0 0 6px 0', lineHeight: 1.5 }}>
                                        {verse.transliteration}
                                      </p>
                                    ) : null}
                                    {verseFr?.translation ? (
                                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#999', margin: 0, lineHeight: 1.5 }}>
                                        {verseFr.translation}
                                      </p>
                                    ) : null}
                                    {hifzQuran && (
                                      <AudioButton globalNum={globalAyatNumber(hifzQuran, sn, item.ayah)} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

      </div>{/* end hifz tab */}

      {/* ══════════════════════ FEEDBACK ══════════════════════ */}
      <div style={{ margin: '16px 16px 100px 16px', backgroundColor: '#EDE5D0', borderRadius: '16px', padding: '20px 24px', cursor: 'pointer' }}
        onClick={() => { if (!feedbackDone) setFeedbackOpen(o => !o); }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357' }}>
            ✏️ Une idée pour améliorer Zainly ?
          </span>
          {!feedbackDone && (
            <span
              onClick={e => { e.stopPropagation(); setFeedbackOpen(o => !o); }}
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px', color: '#B8962E', cursor: 'pointer' }}
            >
              Partager mon avis →
            </span>
          )}
          {feedbackDone && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026' }}>Merci pour ton retour 🙏</span>
          )}
        </div>
        {feedbackOpen && !feedbackDone && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: '16px' }}>
            <textarea
              value={feedbackText}
              onChange={e => setFeedbackText(e.target.value)}
              placeholder="Dis nous ce qu’on peut améliorer..."
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                border: '1.5px solid #E2D9CC', borderRadius: '10px',
                padding: '12px', backgroundColor: '#FFFFFF',
                color: '#163026', resize: 'vertical', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={submitFeedback}
              disabled={feedbackSaving}
              style={{
                marginTop: '12px',
                padding: '12px 24px',
                backgroundColor: '#163026',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: feedbackSaving ? 'default' : 'pointer',
                fontFamily: 'Playfair Display, serif',
                fontWeight: 600,
                fontSize: '15px',
                opacity: feedbackSaving ? 0.7 : 1,
              }}
            >
              {feedbackSaving ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════ BOTTOM NAV ══════════════════════ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(245,240,230,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(22,48,38,0.08)',
        padding: '12px 0 20px 0',
        display: 'flex', justifyContent: 'center', gap: '32px',
        zIndex: 100,
      }}>
        {/* Aujourd'hui */}
        <button type="button" onClick={() => handleTabChange('today')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px',
          position: 'relative',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'today' ? '#163026' : '#C8BFB2'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500, color: activeTab === 'today' ? '#163026' : '#C8BFB2' }}>
            Aujourd&apos;hui
          </span>
          {activeTab === 'today' && (
            <span style={{ position: 'absolute', bottom: '-8px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#B8962E' }} />
          )}
        </button>

        {/* Progression */}
        <button type="button" onClick={() => handleTabChange('progress')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px',
          position: 'relative',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'progress' ? '#163026' : '#C8BFB2'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6"  y1="20" x2="6"  y2="14"/>
          </svg>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500, color: activeTab === 'progress' ? '#163026' : '#C8BFB2' }}>
            Progression
          </span>
          {activeTab === 'progress' && (
            <span style={{ position: 'absolute', bottom: '-8px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#B8962E' }} />
          )}
        </button>

        {/* Mon Hifz */}
        <button type="button" onClick={() => handleTabChange('hifz')} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px',
          position: 'relative',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'hifz' ? '#163026' : '#C8BFB2'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 500, color: activeTab === 'hifz' ? '#163026' : '#C8BFB2' }}>
            Mon Hifz
          </span>
          {activeTab === 'hifz' && (
            <span style={{ position: 'absolute', bottom: '-8px', width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#B8962E' }} />
          )}
        </button>
      </div>

    </div>
  );
}

function AudioButton({ globalNum }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  function handleAudio() {
    if (playing) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;
    const a = new Audio(url);
    audioRef.current = a;
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
  }

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  }, [globalNum]);

  return (
    <button type="button" onClick={handleAudio} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      marginTop: '10px',
      background: 'none', border: 'none', cursor: playing ? 'default' : 'pointer',
      fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
      color: '#B8962E', opacity: playing ? 0.7 : 1,
      transition: 'opacity 0.2s', padding: 0,
    }}>
      <span>🔊</span>
      <span>{playing ? 'En cours...' : 'Écouter'}</span>
    </button>
  );
}

function StatCol({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="font-playfair" style={{ fontSize: '36px', fontWeight: 700, color: '#163026', margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', letterSpacing: '2px', color: '#B8962E', textTransform: 'uppercase', margin: '8px 0 0 0' }}>
        {label}
      </p>
    </div>
  );
}
