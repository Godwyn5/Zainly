'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { nextZainlySurah, ZAINLY_INDEX_BY_SURAH } from '@/lib/zainlyOrder';

let cachedQuran = null;
let cachedQuranFr = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
@keyframes checkPop {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1);   opacity: 1; }
}
`;

// ─── Ayah difficulty scorer ─────────────────────────────────────────────────

function getAyahDifficulty(arabicText) {
  const wordCount = arabicText.trim().split(/\s+/).length;
  if (wordCount <= 5)  return 1;
  if (wordCount <= 10) return 2;
  if (wordCount <= 15) return 3;
  if (wordCount <= 20) return 4;
  return 5;
}

// ─── Session audio button (with listen counter) ───────────────────────────────

function SessionAudioButton({ globalNum, listenCount, onListen, onError }) {
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
      audioRef.current.play().catch(() => { setPlaying(false); onError && onError(); });
      setPlaying(true);
      return;
    }
    const a = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`);
    audioRef.current = a;
    setPlaying(true);
    a.play().catch(() => { setPlaying(false); onError && onError(); });
    a.onended = () => { setPlaying(false); onListen(); audioRef.current = null; };
    a.onerror = () => { setPlaying(false); onError && onError(); audioRef.current = null; };
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
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      width: '100%', margin: '0 auto',
      backgroundColor: listenCount >= 3 ? '#2d5a42' : '#163026',
      color: '#fff',
      border: 'none', borderRadius: '12px',
      padding: '14px 24px',
      cursor: 'pointer',
      fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 500,
      transition: 'background-color 0.3s ease',
    }}>
      <span style={{ fontSize: '18px' }}>{playing ? '⏸' : '🔊'}</span>
      <span>{playing ? 'Pause' : 'Écouter l\'ayat'}</span>
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
  const [savedAyah, setSavedAyah]       = useState(0); // current_ayah at load time (after surah advance)
  const quranDataRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible]           = useState(true);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  // ── 4-step memorization flow ──
  const [listenCount, setListenCount]   = useState(0);
  const [sessionPhase, setSessionPhase] = useState('listen'); // 'listen'|'test'|'reveal'|'validated'
  const [retryMsg, setRetryMsg]         = useState(false);
  const [audioError, setAudioError]     = useState(false);

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

      // If session already done today, show message instead of silent redirect
      if (progRow.last_session_date === todayStr()) {
        setError('SESSION_DONE_TODAY');
        setLoading(false);
        return;
      }

      setProgress(progRow);
      setPlan(plRow);

      // Load quran files (use module-level cache to avoid re-fetching)
      if (!cachedQuran || !cachedQuranFr) {
        const [q, qfr] = await Promise.all([
          fetch('/data/quran.json').then(r => r.json()),
          fetch('/data/quran_fr.json').then(r => r.json()),
        ]);
        cachedQuran = q;
        cachedQuranFr = qfr;
      }
      const quran   = cachedQuran;
      const quranFr = cachedQuranFr;
      quranDataRef.current = quran;

      let currentSurah = progRow.current_surah ?? 1;
      let currentAyah  = progRow.current_ayah ?? 0;
      const ayahPerDay = plRow.ayah_per_day ?? 2;

      // ── Validate current_surah is in the Zainly order ──
      if (ZAINLY_INDEX_BY_SURAH[currentSurah] == null) {
        setError('INVALID_SURAH');
        setLoading(false);
        return;
      }

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
          // Surah finished — advance to next surah in Zainly order
          const newSurah = nextZainlySurah(currentSurah);
          if (newSurah === null) {
            setError('QURAN_COMPLETE');
            setLoading(false);
            return;
          }
          const { error: advErr } = await supabase
            .from('progress')
            .update({ current_surah: newSurah, current_ayah: 0 })
            .eq('user_id', authUser.id);
          if (advErr) {
            setError('Erreur lors de la progression. Recharge la page.');
            setLoading(false);
            return;
          }
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
        setSavedAyah(currentAyah); // snapshot the correct current_ayah after surah advances
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
    setListenCount(0);
    setSessionPhase('listen');
    setAudioError(false);
    setTimeout(() => {
      setCurrentIndex(i => i + 1);
      setVisible(true);
    }, 220);
  }

  const tapLastPlayedRef = useRef(0);
  function playSuccessSound() {
    const now = Date.now();
    if (now - tapLastPlayedRef.current < 150) return;
    tapLastPlayedRef.current = now;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      ctx.resume().then(() => {
        const t = ctx.currentTime;
        const decay = 0.38;

        function chimePartial(freq, volume, startOffset) {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          // Fast attack, smooth exponential decay — crystal resonance shape
          gain.gain.setValueAtTime(0, t + startOffset);
          gain.gain.linearRampToValueAtTime(volume, t + startOffset + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + startOffset + decay);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t + startOffset);
          osc.stop(t + startOffset + decay);
        }

        // Two-note chime: C6 (1047 Hz) + G6 (1568 Hz) — perfect fifth, iOS-like interval
        // G6 starts 30ms after C6 for a gentle "shimmer" effect
        chimePartial(1047, 0.38, 0);
        chimePartial(1568, 0.22, 0.03);

        setTimeout(() => ctx.close().catch(() => {}), (decay + 0.1) * 1000);
      });
    } catch (e) {}
  }

  const revealHandledRef = useRef(false);
  const saveHandledRef   = useRef(false);

  function handleRevealChoice(remembered) {
    if (revealHandledRef.current) return;
    revealHandledRef.current = true;
    if (remembered) {
      playSuccessSound();
      setSessionPhase('validated');
      const idx = currentIndex;
      setTimeout(() => {
        revealHandledRef.current = false;
        if (idx < ayats.length - 1) goNext();
        else saveAndContinue();
      }, 600);
    } else {
      setListenCount(0);
      setSessionPhase('listen');
      setRetryMsg(true);
      revealHandledRef.current = false;
      setTimeout(() => setRetryMsg(false), 1500);
    }
  }

  async function saveAndContinue() {
    if (saveHandledRef.current) return;
    if (!progress) {
      setError('Données de progression manquantes. Retourne au dashboard.');
      return;
    }
    saveHandledRef.current = true;
    setSaving(true);
    try {
      const tomorrow = tomorrowStr();
      const today    = todayStr();

      // R7: re-fetch fresh progress to avoid stale snapshot (e.g. two devices, adaptPlan running)
      const { data: freshProgRows } = await supabase
        .from('progress').select('streak,total_memorized,session_dates,last_session_date')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      const freshProg = freshProgRows?.[0] ?? progress;

      const reviewRows = ayats.map(ayat => ({
        user_id:      user.id,
        surah_number: surahNumber,   // use state, not progress closure
        ayah:         ayat.id,
        next_review:  tomorrow,
        review_cycle: 1,
      }));

      // Insert each review item individually — skip if already exists (23505)
      // Never overwrite existing SRS cycle for an ayat already memorized
      for (const row of reviewRows) {
        const { error: e } = await supabase.from('review_items').insert(row);
        if (e && e.code !== '23505' && !(e.message ?? '').includes('duplicate')) {
          console.error('[session] review_items insert error:', e);
          setError(`Erreur lors de la sauvegarde des r\u00e9visions: ${e.message}`);
          setSaving(false);
          saveHandledRef.current = false;
          revealHandledRef.current = false;
          return;
        }
      }

      const qd = quranDataRef.current;
      const surahTotal        = qd ? (qd[surahNumber - 1]?.verses?.length ?? ayats.length) : ayats.length;
      const newAyah           = Math.min(savedAyah + ayats.length, surahTotal);
      const alreadyDoneToday  = freshProg.last_session_date === today;
      const newStreak         = alreadyDoneToday ? (freshProg.streak ?? 0) : (freshProg.streak ?? 0) + 1;
      const newTotalMemorized = (freshProg.total_memorized ?? 0) + ayats.length;

      // Append today to session_dates without duplicates
      const existingDates   = Array.isArray(freshProg.session_dates) ? freshProg.session_dates : [];
      const newSessionDates = existingDates.includes(today) ? existingDates : [...existingDates, today];

      const avgDifficulty = ayats.reduce((sum, a) => sum + getAyahDifficulty(a.text), 0) / ayats.length;

      const { error: progErr } = await supabase
        .from('progress')
        .update({
          current_ayah:             newAyah,
          last_session_date:        today,
          streak:                   newStreak,
          total_memorized:          newTotalMemorized,
          session_dates:            newSessionDates,
          last_session_difficulty:  avgDifficulty,
        })
        .eq('user_id', user.id);
      if (progErr) {
        console.error('[session] progress update error:', progErr);
        setError('Erreur lors de la mise à jour de ta progression. Réessaie.');
        setSaving(false);
        saveHandledRef.current = false;
        revealHandledRef.current = false;
        return;
      }

      // Only go to revision if there are items due today
      const { data: dueItems } = await supabase
        .from('review_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('mastered', false)
        .lte('next_review', today)
        .limit(1);
      const hasDue = Array.isArray(dueItems) && dueItems.length > 0;
      revealHandledRef.current = false;
      router.push(hasDue ? '/revision' : '/done');
    } catch (err) {
      console.error('[session] saveAndContinue error:', err);
      setError('Une erreur inattendue est survenue. Réessaie.');
      setSaving(false);
      saveHandledRef.current = false;
      revealHandledRef.current = false;
    }
  }

  const ayat      = ayats[currentIndex];
  const pct       = ayats.length > 0 ? ((currentIndex + 1) / ayats.length) * 100 : 0;
  const startAyah = ayats[0]?.id ?? 1;
  const endAyah   = ayats[ayats.length - 1]?.id ?? 1;
  const globalNum = quranDataRef.current ? globalAyatNumber(quranDataRef.current, surahNumber, ayat?.id ?? 1) : 1;

  const PHASES = [
    { key: 'listen',    label: 'Écouter' },
    { key: 'test',      label: 'Tester' },
    { key: 'validated', label: 'Validé' },
  ];
  function phaseIndex(p) {
    if (p === 'reveal')    return 1;
    if (p === 'validated') return PHASES.length; // all 3 pills done (i < PHASES.length → all done)
    return PHASES.findIndex(x => x.key === p);
  }
  const currentPhaseIdx = phaseIndex(sessionPhase);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
      </div>
    );
  }

  if (error === 'SESSION_DONE_TODAY') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '56px' }}>✓</span>
        <h1 className="font-playfair" style={{ fontSize: '28px', fontWeight: 600, color: '#163026', margin: 0, lineHeight: 1.3 }}>
          Session du jour déjà accomplie.
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: 0 }}>
          Reviens demain إن شاء الله
        </p>
        <button onClick={() => router.push('/dashboard')} className="font-playfair" style={{ marginTop: '8px', padding: '14px 40px', backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
          Retour au dashboard
        </button>
      </div>
    );
  }

  if (error === 'INVALID_SURAH') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px', textAlign: 'center' }}>
        <span style={{ fontSize: '48px' }}>⚠️</span>
        <h1 className="font-playfair" style={{ fontSize: '24px', fontWeight: 600, color: '#163026', margin: 0, lineHeight: 1.3 }}>
          Progression invalide.
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: 0, maxWidth: '360px', lineHeight: 1.6 }}>
          Ton point de départ ne correspond pas à l&apos;ordre Zainly. Merci de régénérer ton programme depuis le dashboard.
        </p>
        <button onClick={() => router.push('/dashboard')} className="font-playfair" style={{ marginTop: '8px', padding: '14px 40px', backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: 600 }}>
          Retour au dashboard
        </button>
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
        <button onClick={() => { if (!saving) router.push('/dashboard'); }}
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: saving ? 'default' : 'pointer', padding: '11px', justifySelf: 'start', lineHeight: 1, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: saving ? 'none' : 'auto', opacity: saving ? 0.5 : 1 }}>
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <span className="font-playfair" style={{ fontSize: '18px', fontWeight: 600, color: '#fff', display: 'block' }}>{surahName}</span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'block', marginTop: '2px' }}>
            {startAyah === endAyah ? `Ayat ${startAyah}` : `Ayat ${startAyah} à ${endAyah}`}
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
          padding: '32px 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          animation: visible ? 'fadeIn 0.35s ease both' : 'fadeOut 0.2s ease both',
        }}>

          {/* ── Phase progress bar ── */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {PHASES.map((p, i) => {
              const done   = i < currentPhaseIdx;
              const active = i === currentPhaseIdx;
              return (
                <span key={p.key} style={{
                  fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '13px',
                  padding: '6px 16px', borderRadius: '20px',
                  backgroundColor: done ? '#B8962E' : active ? '#163026' : '#E2D9CC',
                  color: (done || active) ? '#fff' : '#6B6357',
                  transition: 'all 0.3s',
                }}>{p.label}</span>
              );
            })}
          </div>

          {/* Badge */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '12px', letterSpacing: '1px', color: '#B8962E', textAlign: 'center', textTransform: 'uppercase', margin: '0 0 20px 0' }}>
            Ayat {ayat?.id}
          </p>

          {/* ── VALIDATED screen ── */}
          {sessionPhase === 'validated' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <span style={{ fontSize: '72px', animation: 'checkPop 0.4s ease both', color: '#2d5a42' }}>✓</span>
            </div>
          )}

          {/* ── Arabic + audio (hidden during test) ── */}
          {sessionPhase !== 'validated' && (
            <>
              <p className="font-amiri" style={{
                fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 700, color: '#163026', textAlign: 'center',
                direction: 'rtl', lineHeight: 1.8, margin: 0,
                opacity: sessionPhase === 'test' ? 0 : 1,
                transition: 'opacity 0.4s ease',
                overflowWrap: 'break-word', wordBreak: 'break-word',
              }}>
                {ayat?.text}
              </p>

              {/* Audio button — only in listen phase */}
              {sessionPhase === 'listen' && (
                <div style={{ marginTop: '20px' }}>
                  {listenCount < 3 && (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', textAlign: 'center', fontStyle: 'italic', marginBottom: '16px', marginTop: 0 }}>
                      Écoute l&apos;ayat 3 fois avant de continuer
                    </p>
                  )}
                  <SessionAudioButton
                    globalNum={globalNum}
                    listenCount={listenCount}
                    onListen={() => { setListenCount(c => c + 1); setAudioError(false); }}
                    onError={() => setAudioError(true)}
                  />
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', textAlign: 'center', marginTop: '8px', marginBottom: 0, color: listenCount >= 3 ? '#163026' : '#B8962E' }}>
                    {listenCount === 0 && 'Clique pour écouter — écoute 1 sur 3'}
                    {listenCount === 1 && 'Bien — écoute 2 sur 3'}
                    {listenCount === 2 && 'Encore une fois — écoute 3 sur 3'}
                    {listenCount >= 3 && 'Parfait — tu peux passer au test ✓'}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setListenCount(3); setSessionPhase('test'); }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#6B6357'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#999999'; }}
                    style={{
                      display: 'block', margin: '12px auto 0',
                      background: 'transparent', border: 'none',
                      fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                      color: '#999999', cursor: 'pointer', padding: '8px',
                      transition: 'color 0.15s',
                    }}
                  >
                    Je connais déjà cet ayat →
                  </button>
                </div>
              )}

              <div style={{ borderTop: '1px solid #E2D9CC', margin: '24px 0' }} />

              {/* Transliteration */}
              <p style={{
                fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', fontSize: '15px',
                color: '#6B6357', textAlign: 'center', lineHeight: 1.6, margin: 0,
                opacity: sessionPhase === 'test' ? 0 : 1,
                visibility: sessionPhase === 'test' ? 'hidden' : 'visible',
                transition: 'opacity 0.4s ease',
              }}>
                {ayat?.transliteration}
              </p>

              {/* French translation — always visible */}
              {ayat?.translation ? (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#999', textAlign: 'center', lineHeight: 1.6, margin: '8px 0 0 0' }}>
                  {ayat.translation}
                </p>
              ) : null}

              {/* TEST phase instruction */}
              {sessionPhase === 'test' && (
                <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '16px 0 0 0', lineHeight: 1.6 }}>
                  Essaie de réciter cet ayat de mémoire
                </p>
              )}

              {/* Audio error message — only in listen phase */}
              {audioError && sessionPhase === 'listen' && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#c0392b', textAlign: 'center', margin: '12px 0 0 0' }}>
                  Impossible de charger l’audio. Vérifie ta connexion.
                </p>
              )}

              {/* Retry message */}
              {retryMsg && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8962E', textAlign: 'center', margin: '12px 0 0 0' }}>
                  Pas de souci. Réessaie.
                </p>
              )}
            </>
          )}
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

      {/* ── ACTION BUTTONS ── */}
      <div style={{ margin: '0 16px' }}>

        {/* LISTEN phase — show 'Je suis prêt' only after 3 listens */}
        {sessionPhase === 'listen' && listenCount >= 3 && (
          <button type="button" className="font-playfair" onClick={() => setSessionPhase('test')} style={{
            width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, color: '#fff',
            backgroundColor: '#163026', border: 'none', borderRadius: '12px', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(15,35,24,0.3)', marginTop: '0',
          }}>
            Je suis prêt →
          </button>
        )}

        {/* TEST phase — Révéler button */}
        {sessionPhase === 'test' && (
          <button type="button" className="font-playfair" onClick={() => setSessionPhase('reveal')} style={{
            width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, color: '#163026',
            background: 'transparent', border: '1.5px solid #163026', borderRadius: '12px', cursor: 'pointer',
          }}>
            Révéler l&apos;ayat
          </button>
        )}

        {/* REVEAL phase — two buttons */}
        {sessionPhase === 'reveal' && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="font-playfair" onClick={() => handleRevealChoice(true)} disabled={saving} style={{
              flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: 600, color: '#fff',
              background: 'linear-gradient(135deg, #163026, #2d5a42)', border: 'none', borderRadius: '12px', cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              Je m&apos;en souvenais ✓
            </button>
            <button type="button" className="font-playfair" onClick={() => handleRevealChoice(false)} disabled={saving} style={{
              flex: 1, minWidth: 0, padding: '14px 8px', fontSize: 'clamp(13px, 3.5vw, 15px)', fontWeight: 600, color: '#999',
              background: 'transparent', border: '1.5px solid #E2D9CC', borderRadius: '12px', cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              Je dois revoir ✗
            </button>
          </div>
        )}

        {/* Saving state */}
        {saving && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', textAlign: 'center', margin: '12px 0 0' }}>Sauvegarde...</p>
        )}
      </div>
    </div>
  );
}
