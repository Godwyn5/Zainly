'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { nextZainlySurah, ZAINLY_INDEX_BY_SURAH } from '@/lib/zainlyOrder';
import TajweedText from '@/components/TajweedText';
import { resolveTajweed } from '@/lib/tajweedResolver';
import { motion, AnimatePresence } from 'framer-motion';

let cachedQuran   = null;
let cachedQuranFr = null;
let cachedTajweed = null;

const SUCCESS_MSGS = ['Parfait', 'Excellent', 'Très bien'];

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
@keyframes successFade {
  0%   { opacity: 0; transform: translateY(6px) scale(0.95); }
  30%  { opacity: 1; transform: translateY(0)   scale(1); }
  70%  { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes screenEnter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes iconPop {
  0%   { transform: scale(0.6); opacity: 0; }
  65%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.ft-btn-primary {
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.ft-btn-primary:active { transform: scale(0.97); }
.ft-btn-secondary {
  transition: transform 0.15s ease, background-color 0.15s ease;
}
.ft-btn-secondary:active { transform: scale(0.97); }
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
  const [listenCount, setListenCount]   = useState(0);
  const [sessionPhase, setSessionPhase] = useState('listen'); // 'listen'|'test'|'reveal'|'validated'
  const [retryMsg, setRetryMsg]         = useState(false);
  const [audioError, setAudioError]     = useState(false);
  const [showSuccess, setShowSuccess]   = useState(false); // micro-feedback after correct
  const [finalTestPhase, setFinalTestPhase] = useState(null); // null|'intro'|'recitation'|'sincerity'|'success'|'reinforce'
  const [revealShown, setRevealShown]   = useState(false); // whether user clicked "Voir la réponse"
  const finalTestHandledRef = useRef(false);
  const loadSessionRef      = useRef(null);

  // ── 4-step memorization flow ──

  useEffect(() => {
    async function loadSession() {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authUser) { router.push('/login'); return; }
      setUser(authUser);

      const [{ data: prog }, { data: pl }, { data: profile }] = await Promise.all([
        supabase.from('progress').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('plans').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('profiles').select('is_premium').eq('id', authUser.id).maybeSingle(),
      ]);

      const progRow = Array.isArray(prog) ? prog[0] : prog;
      const plRow   = Array.isArray(pl)   ? pl[0]   : pl;
      if (!progRow || !plRow) { router.push('/dashboard'); return; }

      // ── Premium gate ──
      const isPremium = profile?.is_premium === true;
      const today0 = todayStr();
      const rawDates = Array.isArray(progRow.session_dates) ? progRow.session_dates : [];
      // Count this session immediately (deduplicated) — prevents bypassing limit by not finishing
      const sessionDates = rawDates.includes(today0) ? rawDates : [...rawDates, today0];
      const sessionsCount = sessionDates.length;
      const shouldBlock = !isPremium && sessionsCount >= 5;
      console.log(`[session-premium] sessions=${sessionsCount} isPremium=${isPremium} shouldBlock=${shouldBlock}`);
      if (shouldBlock) { router.replace('/premium?source=blocked'); return; }
      // Persist the session start immediately so closing mid-session still counts
      if (!rawDates.includes(today0)) {
        await supabase.from('progress').update({ session_dates: sessionDates }).eq('user_id', authUser.id);
      }

      // If session already done today, show message instead of silent redirect
      if (progRow.last_session_date === todayStr()) {
        setError('SESSION_DONE_TODAY');
        setLoading(false);
        return;
      }

      setProgress(progRow);
      setPlan(plRow);

      // Load quran files — each cache is checked and fetched independently
      const fetches = [];
      if (!cachedQuran)   fetches.push(fetch('/data/quran.json').then(r => r.json()).then(d => { cachedQuran = d; }));
      if (!cachedQuranFr) fetches.push(fetch('/data/quran_fr.json').then(r => r.json()).then(d => { cachedQuranFr = d; }));
      if (!cachedTajweed) fetches.push(fetch('/data/quran_tajweed.json').then(r => r.json()).catch(() => ({})).then(d => { cachedTajweed = d; }));
      if (fetches.length) await Promise.all(fetches);
      const quran   = cachedQuran;
      const quranFr = cachedQuranFr;
      const tajweed = cachedTajweed;
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
            translation:      surahFr?.verses?.find(fv => fv.id === v.id)?.translation ?? '',
            ...resolveTajweed(currentSurah, v.id, tajweed),
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

    loadSessionRef.current = loadSession;
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

  const [successMsg, setSuccessMsg] = useState('Bien ✓');

  async function handleRevealChoice(remembered) {
    if (revealHandledRef.current) return;
    revealHandledRef.current = true;
    if (remembered) {
      setSuccessMsg(SUCCESS_MSGS[Math.floor(Math.random() * SUCCESS_MSGS.length)]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1400);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
    }
    if (remembered) {
      playSuccessSound();
      setSessionPhase('validated');
      const idx = currentIndex;
      setTimeout(() => {
        revealHandledRef.current = false;
        if (idx < ayats.length - 1) goNext();
        else if (ayats.length > 0) setFinalTestPhase('intro'); // trigger final test
        else saveAndContinue(true);
      }, 600);
    } else {
      setListenCount(0);
      setSessionPhase('listen');
      setRetryMsg(true);
      revealHandledRef.current = false;
      setTimeout(() => setRetryMsg(false), 1500);
    }
  }

  async function saveAndContinue(validated = true) {
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

      const finalStatus = validated ? 'validated' : 'reinforce';
      const reviewRows = ayats.map(ayat => ({
        user_id:           user.id,
        surah_number:      surahNumber,   // use state, not progress closure
        ayah:              ayat.id,
        next_review:       tomorrow,
        review_cycle:      1,
        final_test_status: finalStatus,
      }));
      let insertedCount = 0;
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
        if (!e) insertedCount++;
      }

      const qd = quranDataRef.current;
      const surahTotal        = qd ? (qd[surahNumber - 1]?.verses?.length ?? ayats.length) : ayats.length;
      const newAyah           = Math.min(savedAyah + ayats.length, surahTotal);
      const alreadyDoneToday  = freshProg.last_session_date === today;
      // Reset streak if last session was not yesterday or today
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
      const lastDate = freshProg.last_session_date;
      const streakBase = (lastDate === yesterdayStr || lastDate === today) ? (freshProg.streak ?? 0) : 0;
      const newStreak = alreadyDoneToday ? streakBase : streakBase + 1;
      // Only count new ayats toward total_memorized if final test was validated
      // reinforce = worked but not yet solid — not counted as memorized
      const newTotalMemorized = validated
        ? (freshProg.total_memorized ?? 0) + insertedCount
        : (freshProg.total_memorized ?? 0);

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
      const todayForDue   = todayStr();
      const startTodayISO  = new Date(); startTodayISO.setHours(0,0,0,0);
      const offMin = -startTodayISO.getTimezoneOffset();
      const offSign = offMin >= 0 ? '+' : '-';
      const offHH = String(Math.floor(Math.abs(offMin)/60)).padStart(2,'0');
      const offMM = String(Math.abs(offMin)%60).padStart(2,'0');
      const startTodayStr = `${todayForDue}T00:00:00${offSign}${offHH}:${offMM}`;
      const { data: dueItems } = await supabase
        .from('review_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('mastered', false)
        .lte('next_review', todayForDue)
        .lt('created_at', startTodayStr)
        .limit(1);
      const hasDue = Array.isArray(dueItems) && dueItems.length > 0;
      revealHandledRef.current = false;
      console.log(`[session] final-test validated=${validated}`);
      router.push(hasDue ? '/revision' : '/done');
    } catch (err) {
      console.error('[session] saveAndContinue error:', err);
      setError('Une erreur inattendue est survenue. Réessaie.');
      setSaving(false);
      saveHandledRef.current = false;
      revealHandledRef.current = false;
    }
  }

  function handleFinalSuccess() {
    if (finalTestHandledRef.current) return;
    finalTestHandledRef.current = true;
    setFinalTestPhase('success');
  }

  function handleFinalReinforce() {
    if (finalTestHandledRef.current) return;
    finalTestHandledRef.current = true;
    setFinalTestPhase('reinforce');
  }

  function handleFinalRetry() {
    // router.replace('/session') is a no-op in Next.js App Router when already on /session
    // (component stays mounted, useEffect does not re-run).
    // Instead: reset all local state then re-invoke loadSession directly.
    setCurrentIndex(0);
    setVisible(true);
    setListenCount(0);
    setSessionPhase('listen');
    setRetryMsg(false);
    setAudioError(false);
    setShowSuccess(false);
    setFinalTestPhase(null);
    setRevealShown(false);
    setSaving(false);
    setError('');
    finalTestHandledRef.current = false;
    revealHandledRef.current    = false;
    saveHandledRef.current      = false;
    setLoading(true);
    loadSessionRef.current?.().catch(err => {
      console.error('[session] retry load error:', err);
      setError(err.message);
      setLoading(false);
    });
  }

  function handleFinalContinue(validated) {
    finalTestHandledRef.current = false;
    saveAndContinue(validated);
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
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Préparation de ta session...</p>
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

  // ── FINAL TEST SCREENS ──
  if (finalTestPhase !== null) {
    const ref = `${surahName} • ${startAyah === endAyah ? `Ayat ${startAyah}` : `Ayat ${startAyah} à ${endAyah}`}`;

    // S1 — Intro
    if (finalTestPhase === 'intro') return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #F5F0E6 0%, #EDE5D5 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(180px, 55vw, 320px)', color: '#163026', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>الله</span>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ position: 'relative' }}
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
            style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#163026', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px auto', boxShadow: '0 12px 32px rgba(22,48,38,0.28)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8962E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>
          </motion.div>
          <h1 className="font-playfair" style={{ fontSize: '32px', fontWeight: 700, color: '#163026', margin: '0 0 14px 0', lineHeight: 1.15 }}>Test final</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: '#6B6357', lineHeight: 1.7, margin: '0 0 48px 0', maxWidth: '300px' }}>
            Récite maintenant sans aide les versets travaillés aujourd&apos;hui.
          </p>
          <motion.button
            type="button"
            className="font-playfair"
            onClick={() => setFinalTestPhase('recitation')}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            style={{ width: '100%', maxWidth: '360px', padding: '19px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 12px 36px rgba(22,48,38,0.30)' }}
          >
            Commencer le test
          </motion.button>
        </motion.div>
      </div>
    );

    // S2 — Récitation
    if (finalTestPhase === 'recitation') return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #F5F0E6 0%, #EDE5D5 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(180px, 55vw, 320px)', color: '#163026', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>الله</span>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ position: 'relative', width: '100%', maxWidth: '400px' }}
        >
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#B8962E', textTransform: 'uppercase', margin: '0 0 24px 0' }}>
            À réciter
          </p>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.08 }}
            style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '32px 28px', marginBottom: '32px', boxShadow: '0 4px 24px rgba(22,48,38,0.08), 0 1px 4px rgba(22,48,38,0.05)', border: '1px solid rgba(22,48,38,0.06)' }}
          >
            <h2 className="font-playfair" style={{ fontSize: '24px', fontWeight: 700, color: '#163026', margin: '0 0 16px 0', lineHeight: 1.3 }}>
              {ref}
            </h2>
            <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', margin: 0, lineHeight: 1.65 }}>
              Récite de mémoire, sans regarder le texte.
            </p>
          </motion.div>
          <AnimatePresence mode="wait">
            {!revealShown ? (
              <motion.button
                key="voir"
                type="button"
                className="font-playfair"
                onClick={() => setRevealShown(true)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
                style={{ width: '100%', padding: '17px', fontSize: '16px', fontWeight: 600, backgroundColor: 'transparent', color: '#163026', border: '1.5px solid #163026', borderRadius: '16px', cursor: 'pointer' }}
              >
                Voir la réponse
              </motion.button>
            ) : (
              <motion.button
                key="continuer"
                type="button"
                className="font-playfair"
                onClick={() => { setRevealShown(false); setFinalTestPhase('sincerity'); }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
                style={{ width: '100%', padding: '17px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 12px 36px rgba(22,48,38,0.30)' }}
              >
                Continuer →
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );

    // S3 — Sincérité
    if (finalTestPhase === 'sincerity') return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #F5F0E6 0%, #EDE5D5 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(180px, 55vw, 320px)', color: '#163026', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>الله</span>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ position: 'relative', width: '100%', maxWidth: '400px' }}
        >
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } }}
            className="font-playfair"
            style={{ fontSize: '26px', fontWeight: 700, color: '#163026', margin: '0 0 28px 0', lineHeight: 1.25 }}
          >
            As-tu réussi à réciter sans aide&nbsp;?
          </motion.h2>
          <motion.div
            variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } } }}
            style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px 28px', marginBottom: '28px', boxShadow: '0 4px 24px rgba(22,48,38,0.08), 0 1px 4px rgba(22,48,38,0.05)', border: '1px solid rgba(22,48,38,0.06)', textAlign: 'left' }}
          >
            <div style={{ width: '28px', height: '2px', backgroundColor: '#B8962E', borderRadius: '2px', marginBottom: '16px' }} />
            <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#163026', lineHeight: 1.75, margin: '0 0 12px 0' }}>
              &ldquo;La vérité mène au bien, et le mensonge mène à l&apos;égarement.&rdquo;
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#B8962E', margin: '0 0 14px 0', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Rapporté par al-Bukhari et Muslim</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: 0, fontWeight: 500 }}>Sois sincère avec toi-même.</p>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <motion.button
              type="button"
              className="font-playfair"
              onClick={handleFinalSuccess}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              style={{ padding: '19px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 12px 36px rgba(22,48,38,0.30)' }}
            >
              Oui, j&apos;ai réussi ✓
            </motion.button>
            <motion.button
              type="button"
              className="font-playfair"
              onClick={handleFinalReinforce}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              style={{ padding: '17px', fontSize: '16px', fontWeight: 600, backgroundColor: 'transparent', color: '#6B6357', border: '1.5px solid #D4CCC2', borderRadius: '16px', cursor: 'pointer' }}
            >
              Non, je dois renforcer
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    );

    // S4a — Succès
    if (finalTestPhase === 'success') return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #0d1f17 0%, #163026 55%, #1e4535 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(180px, 55vw, 320px)', color: '#fff', opacity: 0.04, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>الله</span>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ position: 'relative', width: '100%', maxWidth: '400px' }}
        >
          <motion.div
            variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 18, delay: 0.05 } } }}
            style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(184,150,46,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px auto' }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B8962E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </motion.div>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }}
            className="font-playfair"
            style={{ fontSize: '32px', fontWeight: 700, color: '#fff', margin: '0 0 12px 0', lineHeight: 1.15 }}
          >
            Mémorisation validée
          </motion.h2>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: 'rgba(255,255,255,0.6)', margin: '0 0 52px 0', lineHeight: 1.6 }}
          >
            Tu connais maintenant ces versets.
          </motion.p>
          <motion.button
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
            type="button"
            className="font-playfair"
            onClick={() => handleFinalContinue(true)}
            disabled={saving}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            style={{ width: '100%', padding: '19px', fontSize: '17px', fontWeight: 600, backgroundColor: '#B8962E', color: '#fff', border: 'none', borderRadius: '16px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 12px 36px rgba(184,150,46,0.35)' }}
          >
            {saving ? 'Sauvegarde...' : 'Terminer la session'}
          </motion.button>
        </motion.div>
      </div>
    );

    // S4b — Renforcement
    if (finalTestPhase === 'reinforce') return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #F5F0E6 0%, #EDE5D5 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(180px, 55vw, 320px)', color: '#163026', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>الله</span>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ position: 'relative', width: '100%', maxWidth: '400px' }}
        >
          <motion.div
            variants={{ hidden: { scale: 0.6, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 240, damping: 18, delay: 0.05 } } }}
            style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#EDE5D0', border: '1.5px solid #D4CCC2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px auto' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#163026" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </motion.div>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }}
            className="font-playfair"
            style={{ fontSize: '26px', fontWeight: 700, color: '#163026', margin: '0 0 20px 0', lineHeight: 1.25 }}
          >
            Session terminée — à renforcer
          </motion.h2>
          <motion.div
            variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } } }}
            style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '24px 28px', marginBottom: '32px', boxShadow: '0 4px 24px rgba(22,48,38,0.08), 0 1px 4px rgba(22,48,38,0.05)', border: '1px solid rgba(22,48,38,0.06)', textAlign: 'left' }}
          >
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026', margin: '0 0 10px 0', lineHeight: 1.65, fontWeight: 500 }}>
              Tu as avancé, mais ces versets ne sont pas encore parfaitement ancrés.
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', margin: 0, lineHeight: 1.65 }}>
              Tu peux les retrouver et les revoir à tout moment dans &ldquo;Mon Hifz&rdquo;.
            </p>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <motion.button
              type="button"
              className="font-playfair"
              onClick={handleFinalRetry}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              style={{ padding: '19px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 12px 36px rgba(22,48,38,0.28)' }}
            >
              Refaire maintenant
            </motion.button>
            <motion.button
              type="button"
              className="font-playfair"
              onClick={() => handleFinalContinue(false)}
              disabled={saving}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              style={{ padding: '17px', fontSize: '16px', fontWeight: 600, backgroundColor: 'transparent', color: '#6B6357', border: '1.5px solid #D4CCC2', borderRadius: '16px', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Sauvegarde...' : 'Continuer'}
            </motion.button>
          </motion.div>
        </motion.div>
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
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.75)', justifySelf: 'end', fontVariantNumeric: 'tabular-nums' }}>
          {currentIndex + 1} / {ayats.length}
        </span>
      </div>

      {/* ── AYAT CARD ── */}
      <div style={{ flex: 1, margin: '16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1,
          position: 'relative',
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

          {/* Badge + inline counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '0 0 20px 0' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '12px', letterSpacing: '1px', color: '#B8962E', textTransform: 'uppercase', margin: 0 }}>
              Ayat {ayat?.id}
            </p>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#D4CCC2', display: 'inline-block' }} />
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#A09890', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              {currentIndex + 1} / {ayats.length} ayats
            </p>
          </div>

          {/* ── VALIDATED screen ── */}
          {sessionPhase === 'validated' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
              <span style={{ fontSize: '72px', animation: 'checkPop 0.4s ease both', color: '#2d5a42' }}>✓</span>
            </div>
          )}

          {/* ── Micro-feedback (random success message) ── */}
          {showSuccess && (
            <p style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
              color: '#2d5a42', margin: 0, whiteSpace: 'nowrap', pointerEvents: 'none',
              animation: 'successFade 1.4s ease forwards',
            }}>
              {successMsg} ✓
            </p>
          )}

          {/* ── Arabic + audio (hidden during test) ── */}
          {sessionPhase !== 'validated' && (
            <>

              <p className="font-amiri" style={{
                fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 700, textAlign: 'center',
                direction: 'rtl', lineHeight: 1.8, margin: 0,
                opacity: sessionPhase === 'test' ? 0 : 1,
                transition: 'opacity 0.4s ease',
                overflowWrap: 'break-word', wordBreak: 'break-word',
              }}>
                <TajweedText
                  plainText={ayat?.text ?? ''}
                  tajweedSegments={ayat?.tajweedSegments}
                  enabled={true}
                  style={{ color: '#163026' }}
                />
              </p>

              {ayat?.tajweedState === 'no_rule' && sessionPhase !== 'test' && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontStyle: 'italic', color: '#A09890', textAlign: 'center', margin: '4px 0 0 0' }}>
                  Aucune coloration de tajweed sur cet ayat
                </p>
              )}

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
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontStyle: 'italic', color: '#B8962E', textAlign: 'center', margin: '12px 0 0 0' }}>
                  Recommence tranquillement, ça va venir.
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
