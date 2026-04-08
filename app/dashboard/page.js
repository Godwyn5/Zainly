'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { nextZainlySurah, ZAINLY_ORDER } from '@/lib/zainlyOrder';

// ─── Data ────────────────────────────────────────────────────────────────────

const SURAH_NAMES = [
  'Al-Fatiha','Al-Baqara','Al-Imran','An-Nisa','Al-Maida','Al-Anam','Al-Araf','Al-Anfal',
  'At-Tawba','Yunus','Hud','Yusuf','Ar-Rad','Ibrahim','Al-Hijr','An-Nahl','Al-Isra',
  'Al-Kahf','Maryam','Ta-Ha','Al-Anbiya','Al-Hajj','Al-Muminun','An-Nur','Al-Furqan',
  'Ash-Shuara','An-Naml','Al-Qasas','Al-Ankabut','Ar-Rum','Luqman','As-Sajda','Al-Ahzab',
  'Saba','Fatir','Ya-Sin','As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura',
  'Az-Zukhruf','Ad-Dukhan','Al-Jathiya','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf',
  'Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqia','Al-Hadid','Al-Mujadila',
  'Al-Hashr','Al-Mumtahana','As-Saf','Al-Jumua','Al-Munafiqun','At-Taghabun','At-Talaq',
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

// R9: derive ayat count from ZAINLY_ORDER (single source of truth)
const ZAINLY_AYAT_BY_SURAH = Object.fromEntries(ZAINLY_ORDER.map(s => [s.surah, s.ayahs]));

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  if (streak >= 3)  return "Tu construis quelque chose de solide. Continue.";
  if (streak >= 2)  return "Deux jours de suite. L\u2019habitude commence \u00e0 se former.";
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
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

  // ── Modifier programme state ──
  const [pushStatus, setPushStatus]       = useState('idle'); // 'idle'|'asking'|'granted'|'denied'|'error'
  const [editOpen, setEditOpen]           = useState(false);
  const [editView, setEditView]           = useState('menu'); // 'menu' | 'rythme'
  const [editSaving, setEditSaving]       = useState(false);
  const [editSuccess, setEditSuccess]     = useState(false);

  async function saveRythme(newVal) {
    if (editSaving) return;
    setEditSaving(true);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('plans').update({ ayah_per_day: newVal }).eq('user_id', user.id),
      supabase.from('progress').update({ ayah_per_day: newVal }).eq('user_id', user.id),
    ]);
    setEditSaving(false);
    if (e1) { console.error('[dashboard] plans ayah_per_day update error:', e1); return; }
    if (e2) console.warn('[dashboard] progress ayah_per_day update (non-fatal):', e2);
    setPlan(p => ({ ...p, ayah_per_day: newVal }));
    setEditSuccess(true);
    setTimeout(() => { setEditSuccess(false); setEditOpen(false); setEditView('menu'); }, 1200);
  }

  // ── Feedback state ──
  const [feedbackOpen, setFeedbackOpen]       = useState(false);
  const [feedbackText, setFeedbackText]       = useState('');
  const [feedbackSaving, setFeedbackSaving]   = useState(false);
  const [feedbackDone, setFeedbackDone]       = useState(false);

  async function submitFeedback() {
    if (!feedbackText.trim() || feedbackSaving) return;
    setFeedbackSaving(true);
    const { error: fbErr } = await supabase.from('feedbacks').insert({ user_id: user?.id, message: feedbackText.trim() });
    setFeedbackSaving(false);
    if (fbErr) {
      console.error('[dashboard] feedback insert error:', fbErr);
      return;
    }
    setFeedbackDone(true);
    setTimeout(() => {
      setFeedbackText('');
      setFeedbackDone(false);
      setFeedbackOpen(false);
    }, 2000);
  }

  // ── Mon Hifz state ──
  const [hifzItems, setHifzItems]       = useState([]);   // all review_items
  const [hifzQuran, setHifzQuran]       = useState(null); // quran.json
  const [hifzQuranFr, setHifzQuranFr]   = useState(null); // quran_fr.json
  const [hifzLoading, setHifzLoading]   = useState(false);
  const [expandedSurah, setExpandedSurah] = useState(null);
  const quranDataRef     = useRef(null);
  const quranFrDataRef   = useRef(null);
  const hifzLastLoadRef  = useRef(0);

  async function enableNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushStatus('error');
      return;
    }
    setPushStatus('asking');
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') { setPushStatus('denied'); return; }
      if (permission !== 'granted') { setPushStatus('idle'); return; }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID public key missing');
      // Convert Base64url → Uint8Array (required by pushManager.subscribe)
      const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawKey = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sub = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey,
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setPushStatus('error'); return; }
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`${res.status}: ${body.error || 'unknown'}`);
      }
      setPushStatus('granted');
    } catch (err) {
      console.error('[dashboard] push subscription error:', err);
      setPushStatus('error:' + (err?.message || 'unknown'));
    }
  }

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
        supabase.from('review_items').select('*').eq('user_id', authUser.id).eq('mastered', false).lte('next_review', today),
      ]);

      const planData     = planRows?.[0] ?? null;
      const progressData = progressRows?.[0] ?? null;

      const realError = planFetchErr ?? progFetchErr ?? revFetchErr ?? null;

      setPlan(planData);
      setProgress(progressData);
      setReviews(reviewData ?? []);
      setFetchError(realError);

      const lastSession = progressData?.last_session_date;
      if (lastSession) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const lastDate = new Date(lastSession + 'T00:00:00');
        const daysSince = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        if (daysSince >= 5) setRecoveryMode(true);
      }

      setLoading(false);

      // Reflect existing permission state without asking
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'denied') {
          setPushStatus('denied');
        } else if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
          // Only show 'granted' if a push subscription is actually registered
          navigator.serviceWorker.ready.then(reg =>
            reg.pushManager.getSubscription()
          ).then(sub => {
            setPushStatus(sub ? 'granted' : 'idle');
          }).catch(() => setPushStatus('idle'));
        }
      }
    }
    loadData();
  }, [router]);

  async function loadHifz(userId) {
    const now = Date.now();
    if (hifzLoading || (now - hifzLastLoadRef.current < 30_000)) return;
    setHifzLoading(true);
    try {
      const itemsPromise = supabase.from('review_items').select('*').eq('user_id', userId).order('surah_number', { ascending: true });
      let quran   = quranDataRef.current;
      let quranFr = quranFrDataRef.current;
      if (!quran || !quranFr) {
        const [q, qfr] = await Promise.all([
          fetch('/data/quran.json').then(r => r.json()),
          fetch('/data/quran_fr.json').then(r => r.json()),
        ]);
        quran   = q;
        quranFr = qfr;
        quranDataRef.current   = q;
        quranFrDataRef.current = qfr;
      }
      const { data: allItems, error: hifzErr } = await itemsPromise;
      if (hifzErr) throw hifzErr;
      setHifzItems(allItems ?? []);
      setHifzQuran(quran);
      setHifzQuranFr(quranFr);
      hifzLastLoadRef.current = Date.now(); // only advance TTL on success
    } catch (err) {
      console.error('[dashboard] loadHifz error:', err);
    } finally {
      setHifzLoading(false);
    }
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
        {fetchError ? (
          <>
            <p className="font-playfair" style={{ fontSize: '20px', color: '#163026', textAlign: 'center' }}>Erreur de connexion.</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', textAlign: 'center', maxWidth: '320px', lineHeight: 1.5 }}>
              Impossible de charger ton plan. Vérifie ta connexion et réessaie.
            </p>
            <button type="button" onClick={() => window.location.reload()} className="font-playfair"
              style={{ padding: '12px 28px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#FFF', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
              Réessayer
            </button>
          </>
        ) : (
          <>
            <p className="font-playfair" style={{ fontSize: '20px', color: '#163026' }}>Aucun plan trouvé.</p>
            <button type="button" onClick={() => router.push('/onboarding')} className="font-playfair"
              style={{ padding: '12px 28px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#FFF', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
              Créer mon plan →
            </button>
          </>
        )}
      </div>
    );
  }

  const prenom          = user?.user_metadata?.prenom || '';
  const streak          = progress?.streak ?? 0;
  const currentAyah     = progress?.current_ayah ?? 0;
  const ayahPerDay      = plan.ayah_per_day ?? 2;
  const currentSurah    = progress?.current_surah ?? 1;
  const surahTotalAyat  = ZAINLY_AYAT_BY_SURAH[currentSurah] ?? 7;
  const memStart        = currentAyah + 1;
  const memEnd          = Math.min(currentAyah + ayahPerDay, surahTotalAyat);
  const surahExhausted  = memStart > surahTotalAyat;
  const nextZainlySurahNum = surahExhausted ? nextZainlySurah(currentSurah) : null;
  const nextSurahName   = nextZainlySurahNum != null ? getSurahName(nextZainlySurahNum) : nextZainlySurahNum === null && surahExhausted ? 'Coran complet' : '';
  const surahName       = getSurahName(currentSurah);
  const totalMemorized  = progress?.total_memorized ?? 0;
  const progressPct     = Math.min((totalMemorized / 6236) * 100, 100);
  const today           = todayStr();
  const sessionDone     = progress?.last_session_date === today;
  const minutesSession  = plan.minutes_per_session ?? 20;

  // Estimated months remaining — prefer DB value, recalculate live as fallback
  const daysPerWeek = plan.days_per_week ?? 6;
  const ayatLeft    = Math.max(0, 6236 - totalMemorized);
  const estMonths   = ayatLeft === 0 ? 0
    : (ayahPerDay > 0 && daysPerWeek > 0)
      ? Math.max(1, Math.ceil(Math.ceil(ayatLeft / ayahPerDay) / daysPerWeek / 4.33))
      : null;

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
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
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
              <span className="font-playfair" style={{ fontSize: 'clamp(24px, 7vw, 34px)', fontWeight: 600, color: '#fff', display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55vw' }}>{prenom || 'Frère'}</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '4px' }}>{formatDate()}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '20px' }}>🔥</span>
                <span className="font-playfair" style={{ fontSize: '32px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{streak}</span>
              </div>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '2px' }}>jours</span>
              {streak > 0 && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'block', marginTop: '1px' }}>Continue comme ça</span>}
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

        {/* ── RECOVERY CARD ── */}
        {recoveryMode && !recoveryDismissed && (() => {
          const lastSession = progress?.last_session_date;
          const daysSince = lastSession
            ? (() => { const t = new Date(); t.setHours(0,0,0,0); const l = new Date(lastSession + 'T00:00:00'); return Math.floor((t - l) / (1000 * 60 * 60 * 24)); })()
            : 0;
          return (
            <div style={{
              margin: '-24px 16px 16px 16px',
              background: 'linear-gradient(135deg, rgba(184,150,46,0.08), rgba(184,150,46,0.02))',
              border: '1.5px solid #B8962E',
              borderRadius: '20px',
              padding: '24px',
              animation: 'fadeUp 0.6s ease 0.15s both',
            }}>
              <p style={{ textAlign: 'center', fontSize: '32px', margin: '0 0 12px 0' }}>⚠️</p>
              <p className="font-playfair" style={{ fontSize: '20px', fontWeight: 600, color: '#163026', textAlign: 'center', margin: '0 0 10px 0' }}>
                Bienvenue de retour.
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.6 }}>
                Tu étais absent(e) depuis {daysSince} jour{daysSince > 1 ? 's' : ''}. Avant de mémoriser de nouveaux ayats — révise d&apos;abord ce que tu as appris.
              </p>
              <button
                type="button"
                className="font-playfair"
                onClick={() => router.push('/revision')}
                style={{
                  width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600,
                  color: '#fff', backgroundColor: '#B8962E',
                  border: 'none', borderRadius: '12px', cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                Réviser mes ayats →
              </button>
              <button
                type="button"
                onClick={() => setRecoveryDismissed(true)}
                style={{
                  width: '100%', padding: '10px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center',
                }}
              >
                Continuer quand même
              </button>
            </div>
          );
        })()}

        {/* ── SESSION CARD ── */}
        <div style={{ margin: recoveryMode && !recoveryDismissed ? '0 16px 0 16px' : '-24px 16px 0 16px', ...card, borderRadius: '24px', boxShadow: '0 20px 60px rgba(15,35,24,0.15)', padding: '28px', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', letterSpacing: '2px', color: '#B8962E', textTransform: 'uppercase' }}>AUJOURD&apos;HUI</span>

          <div style={{ marginTop: '16px' }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Nouvelle mémorisation</span>
            <p className="font-playfair" style={{ fontSize: '20px', fontWeight: 600, color: '#163026', margin: '6px 0 2px 0' }}>{surahName}</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: '0 0 10px 0' }}>
              {surahExhausted ? `Passage à ${nextSurahName}...` : `Ayat ${memStart} à ${memEnd}`}
            </p>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', backgroundColor: 'rgba(22,48,38,0.08)', borderRadius: '20px', padding: '4px 12px', color: '#163026' }}>
              {ayahPerDay} ayat · {plan.memorization_minutes ?? Math.round(minutesSession * 0.4)} min
            </span>
          </div>

          <div style={{ borderTop: '1.5px dashed #E2D9CC', margin: '20px 0' }} />

          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Révision</span>
          {reviews.length > 0 ? (
            <>
              <ul style={{ margin: '10px 0 0 0', padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {reviews.slice(0, 5).map((r) => (
                  <li key={r.id} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026' }}>
                    {getSurahName(r.surah_number)} — ayat {r.ayah}
                  </li>
                ))}
              </ul>
              {reviews.length > 5 && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: '6px 0 0 18px' }}>
                  et {reviews.length - 5} autre{reviews.length - 5 > 1 ? 's' : ''} ayat{reviews.length - 5 > 1 ? 's' : ''} à réviser
                </p>
              )}
            </>
          ) : (
            <div style={{ marginTop: '10px', display: 'inline-block', backgroundColor: 'rgba(184,150,46,0.1)', borderRadius: '20px', padding: '6px 14px' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E' }}>Aucune révision aujourd&apos;hui 🎉</span>
            </div>
          )}

          {sessionDone ? (
            <div style={{ marginTop: '24px' }}>
              <div style={{ width: '100%', padding: '16px', textAlign: 'center', backgroundColor: 'rgba(22,48,38,0.06)', borderRadius: '12px', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026' }}>
                Session du jour complétée ✓
              </div>
              {reviews.length > 0 && (
                <button type="button" className="font-playfair" onClick={() => router.push('/revision')} style={{
                  marginTop: '12px', width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, color: '#fff',
                  background: 'linear-gradient(135deg, #B8962E, #9a7a24)', border: 'none', borderRadius: '12px', cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(184,150,46,0.3)', transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(184,150,46,0.38)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(184,150,46,0.3)'; }}
                >Commencer la révision →</button>
              )}
            </div>
          ) : (
            <>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontStyle: 'italic', color: '#A09890', margin: '16px 0 0 0', textAlign: 'center' }}>
                Ta session t&apos;attend aujourd&apos;hui.
              </p>
              <button type="button" className="font-playfair" onClick={() => router.push('/session')} style={{
                marginTop: '12px', width: '100%', padding: '16px', fontSize: '16px', fontWeight: 600, color: '#fff',
                background: 'linear-gradient(135deg, #163026, #2d5a42)', border: 'none', borderRadius: '12px', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(15,35,24,0.3)', transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.38)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,35,24,0.3)'; }}
              >Commencer la session →</button>
            </>
          )}
        </div>

        {/* ── NOTIFICATIONS BUTTON ── */}
        {pushStatus !== 'granted' && pushStatus !== 'asking' && (
          <div style={{ margin: '12px 16px 0 16px', textAlign: 'center' }}>
            <button
              type="button"
              disabled={pushStatus === 'asking'}
              onClick={enableNotifications}
              onMouseEnter={e => { if (pushStatus !== 'asking') { e.currentTarget.style.borderColor = '#163026'; e.currentTarget.style.color = '#163026'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2D9CC'; e.currentTarget.style.color = '#6B6357'; }}
              style={{
                background: 'transparent', border: '1.5px solid #E2D9CC',
                borderRadius: '12px', padding: '12px 20px',
                fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357',
                cursor: pushStatus === 'asking' ? 'default' : 'pointer',
                opacity: pushStatus === 'asking' ? 0.6 : 1,
                transition: 'border-color 0.2s, color 0.2s',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}
            >
              <span>🔔</span>
              <span>
                {pushStatus === 'asking'                          && 'Activation...'}
                {pushStatus === 'denied'                          && 'Notifications bloquées'}
                {(pushStatus === 'error' || pushStatus.startsWith('error:')) && 'Erreur — réessayer'}
                {pushStatus === 'idle'                            && 'Activer les rappels quotidiens'}
              </span>
            </button>
            {pushStatus === 'denied' && (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#A09890', margin: '6px 0 0 0' }}>
                Autorise les notifications dans les réglages de ton navigateur.
              </p>
            )}
          </div>
        )}
        {pushStatus === 'granted' && (
          <div style={{ margin: '12px 16px 0 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#2d5a42', margin: 0 }}>
              🔔 Rappels quotidiens activés
            </p>
          </div>
        )}

        {/* ── MODIFIER PROGRAMME BUTTON ── */}
        <div style={{ margin: '12px 16px 0 16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => { setEditView('menu'); setEditOpen(true); }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#163026'; e.currentTarget.style.color = '#163026'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2D9CC'; e.currentTarget.style.color = '#6B6357'; }}
            style={{
              background: 'transparent',
              border: '1.5px solid #E2D9CC',
              borderRadius: '12px',
              padding: '12px 20px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: '#6B6357',
              cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>✏️</span>
            <span>Modifier mon programme</span>
          </button>
        </div>

        {/* ── MODAL MODIFIER PROGRAMME ── */}
        {editOpen && (
          <div
            onClick={() => { if (!editSaving) { setEditOpen(false); setEditView('menu'); } }}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 200,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '520px',
                backgroundColor: '#F5F0E6',
                borderRadius: '24px 24px 0 0',
                padding: '28px 24px calc(28px + env(safe-area-inset-bottom, 0px))',
                animation: 'fadeUp 0.25s ease both',
              }}
            >
              {editView === 'menu' && (
                <>
                  <p className="font-playfair" style={{ fontSize: '20px', fontWeight: 600, color: '#163026', margin: '0 0 20px 0', textAlign: 'center' }}>
                    Modifier mon programme
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => router.push('/onboarding?reset=true')}
                      style={{
                        width: '100%', padding: '16px', textAlign: 'left',
                        backgroundColor: '#fff', border: '1.5px solid #E2D9CC',
                        borderRadius: '14px', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#163026'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#E2D9CC'}
                    >
                      <span style={{ fontSize: '22px' }}>🕌</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>Changer ma sourate de départ</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B6357' }}>Refaire l&apos;onboarding complet</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditView('rythme')}
                      style={{
                        width: '100%', padding: '16px', textAlign: 'left',
                        backgroundColor: '#fff', border: '1.5px solid #E2D9CC',
                        borderRadius: '14px', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        transition: 'border-color 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#163026'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#E2D9CC'}
                    >
                      <span style={{ fontSize: '22px' }}>⚡</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>Changer mon rythme</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B6357' }}>Actuellement {plan.ayah_per_day ?? 2} ayat / jour</p>
                      </div>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    style={{ marginTop: '16px', width: '100%', padding: '12px', background: 'none', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                </>
              )}

              {editView === 'rythme' && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditView('menu')}
                    style={{ background: 'none', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', cursor: 'pointer', padding: 0, marginBottom: '16px' }}
                  >
                    ← Retour
                  </button>
                  <p className="font-playfair" style={{ fontSize: '20px', fontWeight: 600, color: '#163026', margin: '0 0 8px 0', textAlign: 'center' }}>
                    Changer mon rythme
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', textAlign: 'center', margin: '0 0 20px 0' }}>
                    Combien d&apos;ayats veux-tu mémoriser par jour ?
                  </p>
                  {editSuccess ? (
                    <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026', padding: '16px 0' }}>✓ Rythme mis à jour</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {[1, 2, 3, 4, 5, 6].map(val => (
                        <button
                          key={val}
                          type="button"
                          disabled={editSaving}
                          onClick={() => saveRythme(val)}
                          style={{
                            padding: '18px 12px',
                            backgroundColor: (plan.ayah_per_day ?? 2) === val ? '#163026' : '#fff',
                            color: (plan.ayah_per_day ?? 2) === val ? '#fff' : '#163026',
                            border: '1.5px solid',
                            borderColor: (plan.ayah_per_day ?? 2) === val ? '#163026' : '#E2D9CC',
                            borderRadius: '14px',
                            cursor: editSaving ? 'wait' : 'pointer',
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '15px',
                            fontWeight: 600,
                            opacity: editSaving ? 0.6 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {val} ayat / jour
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── PROGRESSION CARD ── */}
        <div style={{ margin: '24px 16px 0 16px', ...card, padding: '24px 28px', animation: 'fadeUp 0.6s ease 0.4s both' }}>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', color: '#B8962E', textTransform: 'uppercase', letterSpacing: '2px' }}>TON OBJECTIF</span>
          <div style={{ marginTop: '16px', backgroundColor: '#E2D9CC', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #163026, #B8962E)', borderRadius: '3px', transition: 'width 1.2s ease' }} />
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: '10px 0 0 0' }}>{totalMemorized} / 6236 ayat</p>
          <p className="font-playfair" style={{ fontSize: '14px', fontStyle: 'italic', color: '#6B6357', margin: '8px 0 0 0', lineHeight: 1.6 }}>
            {estMonths === null ? 'Calcul en cours...' : estMonths === 0 ? 'Tu as mémorisé tout le Coran. MashaAllah !' : `Il te reste environ ${estMonths} mois pour atteindre ton objectif.`}
          </p>
        </div>

        {/* ── MOTIVATION ── */}
        <div style={{ margin: '16px', backgroundColor: 'rgba(22,48,38,0.04)', borderRadius: '16px', borderLeft: '3px solid #B8962E', padding: '20px 24px', animation: 'fadeIn 0.6s ease 0.6s both' }}>
          <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#163026', margin: 0, lineHeight: 1.7 }}>
            {getMotivation(streak)}
          </p>
        </div>

        {/* ── FEEDBACK (today tab only) ── */}
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
                placeholder="Dis nous ce qu'on peut améliorer..."
                rows={4}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '16px',
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
                  width: 'clamp(24px, 6vw, 28px)', height: 'clamp(24px, 6vw, 28px)',
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
            // Sort by Zainly memorization order (Al-Fatiha first, then An-Nas, etc.)
            const zainlyPos = Object.fromEntries(ZAINLY_ORDER.map((s, i) => [s.surah, i]));
            const surahNumbers = Object.keys(grouped).map(Number).sort((a, b) => {
              const ia = zainlyPos[a] ?? Infinity;
              const ib = zainlyPos[b] ?? Infinity;
              return ia - ib;
            });

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

      {/* ══════════════════════ BOTTOM NAV ══════════════════════ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(245,240,230,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(22,48,38,0.08)',
        padding: '12px 0 calc(20px + env(safe-area-inset-bottom)) 0',
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
    if (playing) {
      if (audioRef.current) { audioRef.current.pause(); }
      setPlaying(false);
      return;
    }
    // Resume existing audio if paused, otherwise create new
    if (audioRef.current) {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
      return;
    }
    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`;
    const a = new Audio(url);
    audioRef.current = a;
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
    a.onended = () => { setPlaying(false); audioRef.current = null; };
    a.onerror = () => { setPlaying(false); audioRef.current = null; };
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
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
      color: '#B8962E', transition: 'opacity 0.2s', padding: 0,
    }}>
      <span>{playing ? '⏸' : '🔊'}</span>
      <span>{playing ? 'Pause' : 'Écouter'}</span>
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
