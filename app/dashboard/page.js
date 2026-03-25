'use client';

import { useState, useEffect } from 'react';
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

  useEffect(() => {
    async function loadData() {
      console.log('[dashboard] getUser...');
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      console.log('[dashboard] authUser:', authUser?.id, '| userError:', userError);
      if (userError || !authUser) { router.push('/login'); return; }
      setUser(authUser);

      const today = todayStr();
      console.log('[dashboard] fetching plans/progress/reviews for user:', authUser.id);

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

      console.log('[dashboard] plans fetch — data:', planData, '| error:', planFetchErr);
      console.log('[dashboard] progress fetch — data:', progressData, '| error:', progFetchErr);
      console.log('[dashboard] reviews fetch — data:', reviewData, '| error:', revFetchErr);

      const realPlanError = planFetchErr ?? null;
      if (realPlanError) console.error('[dashboard] unexpected plans error:', realPlanError);

      setPlan(planData);
      setProgress(progressData);
      setReviews(reviewData ?? []);
      setFetchError(realPlanError);
      setLoading(false);
    }
    loadData();
  }, [router]);

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
  const memStart        = currentAyah + 1;
  const memEnd          = currentAyah + ayahPerDay;
  const surahName       = plan.first_surah_name ?? getSurahName(progress?.current_surah ?? 1);
  const totalMemorized  = progress?.total_memorized ?? currentAyah;
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
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: '0 0 10px 0' }}>Ayat {memStart} à {memEnd}</p>
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
                  {r.surah_name ?? `Sourate ${r.surah_number}`} — ayat {r.ayah_start}
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

      {/* ══════════════════════ BOTTOM NAV ══════════════════════ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(245,240,230,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(22,48,38,0.08)',
        padding: '12px 0 20px 0',
        display: 'flex', justifyContent: 'center', gap: '48px',
        zIndex: 100,
      }}>
        {/* Aujourd'hui */}
        <button type="button" onClick={() => setActiveTab('today')} style={{
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
        <button type="button" onClick={() => setActiveTab('progress')} style={{
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
      </div>

    </div>
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
