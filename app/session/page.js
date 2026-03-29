'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Calculate global ayat number (1-based) across all surahs
function globalAyatNumber(quran, surahNumber, ayatId) {
  let total = 0;
  for (let i = 0; i < surahNumber - 1; i++) {
    total += quran[i]?.verses?.length ?? 0;
  }
  return total + ayatId;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-8px); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ─── Audio button ─────────────────────────────────────────────────────────────

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

  // reset when globalNum changes
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  }, [globalNum]);

  return (
    <button type="button" onClick={handleAudio} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      margin: '16px auto 0',
      background: 'none', border: 'none', cursor: playing ? 'default' : 'pointer',
      fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
      color: '#B8962E', opacity: playing ? 0.7 : 1,
      transition: 'opacity 0.2s',
    }}>
      <span>🔊</span>
      <span>{playing ? 'En cours...' : 'Écouter'}</span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SessionPage() {
  const router = useRouter();

  const [user, setUser]                 = useState(null);
  const [progress, setProgress]         = useState(null);
  const [plan, setPlan]                 = useState(null);
  const [ayats, setAyats]               = useState([]);
  const [surahName, setSurahName]       = useState('');
  const [surahNumber, setSurahNumber]   = useState(1);
  const [quranData, setQuranData]       = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible]           = useState(true);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    async function loadSession() {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authUser) { router.push('/login'); return; }
      setUser(authUser);

      const [{ data: prog }, { data: pl }] = await Promise.all([
        supabase.from('progress').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('plans').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(1),
      ]);

      const progRow = Array.isArray(prog) ? prog[0] : prog;
      const plRow   = Array.isArray(pl)   ? pl[0]   : pl;
      if (!progRow || !plRow) { router.push('/dashboard'); return; }

      // If session already done today, don't reload — go straight to dashboard
      if (progRow.last_session_date === todayStr()) {
        router.push('/dashboard');
        return;
      }

      setProgress(progRow);
      setPlan(plRow);

      // Load both quran files in parallel
      const [quranRes, frRes] = await Promise.all([
        fetch('/data/quran.json'),
        fetch('/data/quran_fr.json'),
      ]);
      const quran   = await quranRes.json();
      const quranFr = await frRes.json();
      setQuranData(quran);

      let currentSurah = progRow.current_surah ?? 1;
      let currentAyah  = progRow.current_ayah ?? 0;
      const ayahPerDay = plRow.ayah_per_day ?? 2;

      // ── End-of-surah detection loop ──
      // Advance surah(s) until we find one with remaining ayats
      while (true) {
        if (currentSurah > 114) {
          // Completed the entire Quran
          setError('QURAN_COMPLETE');
          setLoading(false);
          return;
        }

        const surahIdx = currentSurah - 1;
        const surah    = quran[surahIdx];
        if (!surah) { router.push('/dashboard'); return; }

        const startAyah = currentAyah + 1;
        if (startAyah > surah.verses.length) {
          // Surah finished — advance to next surah
          const newSurah = currentSurah + 1;
          const { error: advErr } = await supabase
            .from('progress')
            .update({ current_surah: newSurah, current_ayah: 0 })
            .eq('user_id', authUser.id);
          if (advErr) console.error('[session] surah advance error:', advErr);
          currentSurah = newSurah;
          currentAyah  = 0;
          continue;
        }

        // Surah has remaining ayats — load them
        const surahFr  = quranFr[surahIdx];
        const endAyah  = startAyah + ayahPerDay - 1;
        const slice = surah.verses
          .filter(v => v.id >= startAyah && v.id <= endAyah)
          .map(v => ({
            ...v,
            translation: surahFr?.verses?.find(fv => fv.id === v.id)?.translation ?? '',
          }));

        setSurahName(surah.transliteration ?? surah.name ?? `Sourate ${currentSurah}`);
        setSurahNumber(currentSurah);
        // Keep progress in sync with potentially-advanced surah
        setProgress({ ...progRow, current_surah: currentSurah, current_ayah: currentAyah });
        setAyats(slice);
        setLoading(false);
        break;
      }
    }

    loadSession().catch(err => {
      console.error('[session] load error:', err);
      setError(err.message);
      setLoading(false);
    });
  }, [router]);

  function goNext() {
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex(i => i + 1);
      setVisible(true);
    }, 220);
  }

  async function saveAndContinue() {
    if (saving) return;
    setSaving(true);
    try {
      const tomorrow = tomorrowStr();
      const today    = todayStr();

      const reviewRows = ayats.map(ayat => ({
        user_id:      user.id,
        surah_number: progress.current_surah,
        ayah:         ayat.id,
        next_review:  tomorrow,
        review_cycle: 1,
      }));

      const { error: revErr } = await supabase.from('review_items').insert(reviewRows);
      if (revErr) {
        setError('Erreur lors de la sauvegarde des révisions. Réessaie.');
        setSaving(false);
        return;
      }

      const newAyah           = (progress.current_ayah ?? 0) + ayats.length;
      const alreadyDoneToday  = progress.last_session_date === today;
      const newStreak         = alreadyDoneToday ? (progress.streak ?? 0) : (progress.streak ?? 0) + 1;
      const newTotalMemorized = (progress.total_memorized ?? 0) + ayats.length;

      // Append today to session_dates without duplicates
      const existingDates   = Array.isArray(progress.session_dates) ? progress.session_dates : [];
      const newSessionDates = existingDates.includes(today) ? existingDates : [...existingDates, today];

      const { error: progErr } = await supabase
        .from('progress')
        .update({
          current_ayah:      newAyah,
          last_session_date: today,
          streak:            newStreak,
          total_memorized:   newTotalMemorized,
          session_dates:     newSessionDates,
        })
        .eq('user_id', user.id);
      if (progErr) {
        console.error('[session] progress update error:', progErr);
        setError('Erreur lors de la mise à jour de ta progression. Réessaie.');
        setSaving(false);
        return;
      }

      router.push('/revision');
    } catch (err) {
      console.error('[session] saveAndContinue error:', err);
      setError('Une erreur inattendue est survenue. Réessaie.');
      setSaving(false);
    }
  }

  function handleButton() {
    if (currentIndex < ayats.length - 1) goNext();
    else saveAndContinue();
  }

  const isLast    = currentIndex === ayats.length - 1;
  const ayat      = ayats[currentIndex];
  const pct       = ayats.length > 0 ? ((currentIndex + 1) / ayats.length) * 100 : 0;
  const startAyah = ayats[0]?.id ?? 1;
  const endAyah   = ayats[ayats.length - 1]?.id ?? 1;
  const globalNum = quranData ? globalAyatNumber(quranData, surahNumber, ayat?.id ?? 1) : 1;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
      </div>
    );
  }

  if (error === 'QURAN_COMPLETE') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px', textAlign: 'center' }}>
        <span className="font-amiri" style={{ fontSize: '64px', color: '#B8962E' }}>الله</span>
        <h1 className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', margin: 0, lineHeight: 1.3 }}>
          Tu as mémorisé tout le Coran.
        </h1>
        <p className="font-playfair" style={{ fontSize: '20px', fontStyle: 'italic', color: '#B8962E', margin: 0 }}>
          MashaAllah.
        </p>
        <button onClick={() => router.push('/dashboard')} className="font-playfair" style={{ marginTop: '8px', padding: '14px 40px', backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
          Retour au dashboard
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026' }}>{error}</p>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 24px', backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Retour au dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', paddingBottom: '24px' }}>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0d1f17 0%, #163026 50%, #1e4535 100%)',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        animation: 'slideDown 0.5s ease both',
      }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px 8px', justifySelf: 'start', lineHeight: 1 }}>
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <span className="font-playfair" style={{ fontSize: '18px', fontWeight: 600, color: '#fff', display: 'block' }}>{surahName}</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'block', marginTop: '2px' }}>
            Ayat {startAyah} à {endAyah}
          </span>
        </div>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#fff', justifySelf: 'end' }}>
          {currentIndex + 1}/{ayats.length}
        </span>
      </div>

      {/* ── AYAT CARD ── */}
      <div style={{ flex: 1, margin: '16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1,
          backgroundColor: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(15,35,24,0.15)',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          animation: visible ? 'fadeIn 0.35s ease both' : 'fadeOut 0.2s ease both',
        }}>
          {/* Badge */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '12px', letterSpacing: '1px', color: '#B8962E', textAlign: 'center', textTransform: 'uppercase', margin: '0 0 24px 0' }}>
            Ayat {ayat?.id}
          </p>

          {/* Arabic */}
          <p className="font-amiri" style={{ fontSize: '42px', fontWeight: 700, color: '#163026', textAlign: 'center', direction: 'rtl', lineHeight: 1.8, margin: 0 }}>
            {ayat?.text}
          </p>

          {/* Audio */}
          <AudioButton globalNum={globalNum} />

          {/* Divider */}
          <div style={{ borderTop: '1px solid #E2D9CC', margin: '24px 0' }} />

          {/* Transliteration */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', fontSize: '15px', color: '#6B6357', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
            {ayat?.transliteration}
          </p>

          {/* French translation */}
          {ayat?.translation ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#999', textAlign: 'center', lineHeight: 1.6, margin: '8px 0 0 0' }}>
              {ayat.translation}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ margin: '0 16px 16px' }}>
        <div style={{ backgroundColor: '#E2D9CC', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #163026, #B8962E)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B6357', textAlign: 'center', margin: '8px 0 0 0' }}>
          Ayat {currentIndex + 1} sur {ayats.length}
        </p>
      </div>

      {/* ── BUTTON ── */}
      <div style={{ margin: '0 16px' }}>
        <button type="button" className="font-playfair" onClick={handleButton} disabled={saving} style={{
          width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, color: '#fff',
          background: 'linear-gradient(135deg, #163026, #2d5a42)', border: 'none', borderRadius: '12px',
          cursor: saving ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(15,35,24,0.3)',
          opacity: saving ? 0.7 : 1, transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.2s',
        }}
          onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.38)'; } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,35,24,0.3)'; }}
        >
          {saving ? 'Sauvegarde...' : isLast ? 'Terminer la mémorisation ✓' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
