'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import TajweedText from '@/components/TajweedText';
import { resolveTajweed } from '@/lib/tajweedResolver';

let cachedQuran   = null;
let cachedQuranFr = null;
let cachedTajweed = null;

// ─── SRS ─────────────────────────────────────────────────────────────────────

const CYCLE_DAYS = [1, 3, 7, 14, 30, 60];

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Global ayat number for audio URL
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
    const a = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNum}.mp3`);
    audioRef.current = a;
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
    a.onended = () => { setPlaying(false); audioRef.current = null; };
    a.onerror = () => { setPlaying(false); audioRef.current = null; };
  }

  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }, []);
  useEffect(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  }, [globalNum]);

  return (
    <button type="button" onClick={handleAudio} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      margin: '8px auto 0', background: 'none', border: 'none',
      cursor: 'pointer', padding: '12px 20px',
      minWidth: '44px', minHeight: '44px',
      fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
      color: '#B8962E', transition: 'opacity 0.2s',
    }}>
      <span>{playing ? '⏸' : '🔊'}</span>
      <span>{playing ? 'Pause' : 'Écouter'}</span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RevisionPage() {
  const router = useRouter();

  const [items, setItems]               = useState([]);   // review_items enriched
  const [reloadKey, setReloadKey]       = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed]         = useState(false);
  const [visible, setVisible]           = useState(true);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [userId, setUserId]             = useState(null);
  const [error, setError]               = useState('');
  const [correctCount, setCorrectCount]   = useState(0);
  const [totalCount, setTotalCount]       = useState(0);
  const [showTranslit, setShowTranslit]   = useState(false);
  const [srsMessage, setSrsMessage]       = useState(''); // shown briefly after answer
  const answerHandledRef                = useRef(false);
  const correctRef                      = useRef(0); // sync ref for score calculation
  const totalRef                        = useRef(0);

  // Reset score refs on each reload
  useEffect(() => {
    correctRef.current = 0;
    totalRef.current   = 0;
    setCorrectCount(0);
    setTotalCount(0);
  }, [reloadKey]);

  useEffect(() => {
    async function loadRevision() {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authUser) { router.push('/login'); return; }
      setUserId(authUser.id);

      const today = todayStr();

      // Build local-midnight ISO for created_at exclusion (same logic as session)
      const midnightLocal = new Date(); midnightLocal.setHours(0,0,0,0);
      const offMin = -midnightLocal.getTimezoneOffset();
      const offSign = offMin >= 0 ? '+' : '-';
      const offHH = String(Math.floor(Math.abs(offMin)/60)).padStart(2,'0');
      const offMM = String(Math.abs(offMin)%60).padStart(2,'0');
      const startTodayStr = `${today}T00:00:00${offSign}${offHH}:${offMM}`;

      // Fetch review items — exclude items created today (just memorized)
      const { data: reviewData, error: reviewErr } = await supabase
        .from('review_items').select('*').eq('user_id', authUser.id).eq('mastered', false).lte('next_review', today).lt('created_at', startTodayStr);

      if (reviewErr) {
        setError('Erreur lors du chargement des révisions. Réessaie.');
        setLoading(false);
        return;
      }

      // Load quran files — each cache is checked and fetched independently
      const fetches = [];
      if (!cachedQuran)   fetches.push(fetch('/data/quran.json').then(r => r.json()).then(d => { cachedQuran = d; }));
      if (!cachedQuranFr) fetches.push(fetch('/data/quran_fr.json').then(r => r.json()).then(d => { cachedQuranFr = d; }));
      if (!cachedTajweed) fetches.push(fetch('/data/quran_tajweed.json').then(r => r.json()).catch(() => ({})).then(d => { cachedTajweed = d; }));
      if (fetches.length) await Promise.all(fetches);
      const quran   = cachedQuran;
      const quranFr = cachedQuranFr;
      const tajweed = cachedTajweed;

      if (!reviewData || reviewData.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Enrich each review item with arabic text, transliteration, translation
      const enriched = reviewData.map(item => {
        const surahIdx  = (item.surah_number ?? 1) - 1;
        const surah     = quran[surahIdx];
        const surahFr   = quranFr[surahIdx];
        const ayatId    = item.ayah;
        const verse     = surah?.verses?.find(v => v.id === ayatId);
        const verseFr   = surahFr?.verses?.find(v => v.id === ayatId);
        const globalNum = globalAyatNumber(quran, item.surah_number ?? 1, ayatId);
        return {
          ...item,
          arabicText:      verse?.text ?? '',
          transliteration: verse?.transliteration ?? '',
          translation:     verseFr?.translation ?? '',
          surahLabel:      surah?.transliteration ?? surah?.name ?? `Sourate ${item.surah_number}`,
          globalNum,
          ...resolveTajweed(item.surah_number ?? 1, ayatId, tajweed),
        };
      });

      setItems(enriched);
      setLoading(false);
    }

    loadRevision().catch(err => {
      console.error('[revision] load error:', err);
      setError('Une erreur inattendue est survenue. Réessaie.');
      setLoading(false);
    });
  }, [router, reloadKey]);

  // ── SRS update and advance ──
  async function handleAnswer(remembered) {
    if (answerHandledRef.current) return;
    answerHandledRef.current = true;
    setSaving(true);

    const item = items[currentIndex];
    const currentCycle = item.review_cycle ?? 1;
    const nextCycle    = remembered ? Math.min(currentCycle + 1, CYCLE_DAYS.length - 1) : 1;
    const nextReview   = addDays(CYCLE_DAYS[nextCycle]);
    const mastered     = remembered && currentCycle >= CYCLE_DAYS.length - 1;
    const srsDays      = CYCLE_DAYS[nextCycle];
    const srsMsg       = remembered
      ? (mastered ? 'Maîtrisé — plus de révision nécessaire' : `Prochaine révision dans ${srsDays} jour${srsDays > 1 ? 's' : ''}`)
      : 'Cet ayat revient demain';

    const { error: updateErr } = await supabase
      .from('review_items')
      .update({ review_cycle: nextCycle, next_review: nextReview, mastered })
      .eq('id', item.id);

    if (updateErr) {
      console.error('[revision] update error:', updateErr);
      setError(updateErr.message || 'Erreur lors de la sauvegarde. Réessaie.');
      setSaving(false);
      answerHandledRef.current = false;
      return;
    }

    setSrsMessage(srsMsg);

    // Update sync refs immediately (state updates are async)
    if (remembered) correctRef.current += 1;
    totalRef.current += 1;
    if (remembered) setCorrectCount(c => c + 1);
    setTotalCount(t => t + 1);

    setSaving(false);

    // Advance or finish
    if (currentIndex < items.length - 1) {
      answerHandledRef.current = false;
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
        setRevealed(false);
        setShowTranslit(false);
        setSrsMessage('');
        setVisible(true);
      }, 500);
    } else {
      // Save revision score before navigating (only if at least one answer was given)
      try {
        if (totalRef.current > 0) {
          const score = Math.round((correctRef.current / totalRef.current) * 100);
          const { data: prog } = await supabase
            .from('progress')
            .select('last_revision_scores')
            .eq('user_id', userId)
            .maybeSingle();
          const existingScores = prog?.last_revision_scores || [];
          const newScores = [...existingScores, score].slice(-5);
          const { error: scoreErr } = await supabase
            .from('progress')
            .update({ last_revision_scores: newScores })
            .eq('user_id', userId);
          if (scoreErr) console.error('[revision] score update error:', scoreErr);
        }
      } catch (e) {
        console.error('[revision] score save error:', e);
      }
      router.push('/done');
    }
  }

  // ── Derived ──
  const item  = items[currentIndex];
  const pct   = items.length > 0 ? ((currentIndex + 1) / items.length) * 100 : 0;

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#c0392b', textAlign: 'center' }}>{error}</p>
        <button onClick={() => { setError(''); setSaving(false); answerHandledRef.current = false; setItems([]); setCurrentIndex(0); setRevealed(false); setLoading(true); setReloadKey(k => k + 1); }} style={{ padding: '10px 24px', backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Réessayer
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', gap: '16px' }}>
        <style>{CSS}</style>
        <span style={{ fontSize: '64px' }}>🎉</span>
        <p className="font-playfair" style={{ fontSize: '24px', fontWeight: 600, color: '#163026', textAlign: 'center', margin: 0 }}>
          Aucune révision aujourd&apos;hui
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', textAlign: 'center', margin: 0 }}>
          Tu as tout révisé. Reviens demain.
        </p>
        <button type="button" className="font-playfair" onClick={() => router.push('/dashboard')} style={{
          marginTop: '8px', padding: '14px 32px', fontSize: '16px', fontWeight: 600,
          backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
        }}>
          Continuer →
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
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: saving ? 'default' : 'pointer', padding: '11px', justifySelf: 'start', lineHeight: 1, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.4 : 1, pointerEvents: saving ? 'none' : 'auto' }}>
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <span className="font-playfair" style={{ fontSize: '18px', fontWeight: 600, color: '#fff', display: 'block' }}>
            Révision
          </span>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.6)', display: 'block', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
            {currentIndex + 1} / {items.length} révisés
          </span>
        </div>
        <span style={{ justifySelf: 'end', width: '44px' }} />
      </div>

      {/* ── REVISION CARD ── */}
      <div style={{ flex: 1, margin: '16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1,
          backgroundColor: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(15,35,24,0.15)',
          padding: 'clamp(20px, 5vw, 40px) clamp(16px, 5vw, 32px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          animation: visible ? 'fadeIn 0.35s ease both' : 'fadeOut 0.3s ease both',
        }}>
          {/* Badge */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '10px', letterSpacing: '2px', color: '#B8962E', textAlign: 'center', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
            RÉVISION
          </p>

          {/* Surah label */}
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B6357', textAlign: 'center', margin: '0 0 20px 0' }}>
            {item?.surahLabel} — Ayat {item?.ayah}
          </p>

          {/* Instruction */}
          <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 16px 0', lineHeight: 1.6 }}>
            Essaie de réciter cet ayat de mémoire
          </p>

          {/* Transliteration — hidden until revealed or toggled */}
          {(revealed || showTranslit) ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontStyle: 'italic', fontSize: '18px', color: '#163026', textAlign: 'center', lineHeight: 1.6, margin: '0 0 8px 0', animation: 'fadeIn 0.3s ease both' }}>
              {item?.transliteration}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setShowTranslit(true)}
              style={{
                display: 'block', margin: '0 auto 16px',
                background: 'none', border: 'none',
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
                color: '#B8962E', cursor: 'pointer', padding: '4px 8px',
                textDecoration: 'underline',
              }}
            >
              Voir la translittération
            </button>
          )}

          {/* French translation */}
          {item?.translation ? (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#999', textAlign: 'center', lineHeight: 1.6, margin: '8px 0 0 0' }}>
              {item.translation}
            </p>
          ) : null}

          {/* Audio — only after reveal */}
          {revealed && <AudioButton globalNum={item?.globalNum ?? 1} />}

          {/* Divider */}
          <div style={{ borderTop: '1px solid #E2D9CC', margin: '24px 0' }} />

          {/* Arabic — hidden until revealed */}
          <div
            aria-hidden={!revealed}
            style={{ overflow: 'hidden', transition: 'opacity 0.4s ease', opacity: revealed ? 1 : 0, pointerEvents: revealed ? 'auto' : 'none', userSelect: revealed ? 'auto' : 'none' }}
          >

            <p className="font-amiri" style={{ fontSize: 'clamp(26px, 6vw, 42px)', fontWeight: 700, textAlign: 'center', direction: 'rtl', lineHeight: 1.8, margin: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>
              <TajweedText
                plainText={item?.arabicText ?? ''}
                tajweedSegments={item?.tajweedSegments}
                enabled={true}
                style={{ color: '#163026' }}
              />
            </p>
          </div>

          {/* Reveal button — shown until revealed */}
          {!revealed && (
            <button type="button" className="font-playfair" onClick={() => setRevealed(true)} style={{
              width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600,
              color: '#163026', backgroundColor: 'transparent',
              border: '1.5px solid #163026', borderRadius: '12px', cursor: 'pointer',
              transition: 'background-color 0.15s, color 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#163026'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#163026'; }}
            >
              Voir l&apos;ayat
            </button>
          )}

          {/* SRS buttons — shown after reveal */}
          {revealed && (
            <>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="font-playfair" onClick={() => handleAnswer(true)} disabled={saving} style={{
                  flex: 1, padding: '14px', fontSize: '14px', fontWeight: 600, color: '#fff',
                  background: 'linear-gradient(135deg, #163026, #2d5a42)', border: 'none',
                  borderRadius: '12px', cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
                }}>
                  Je m&apos;en souvenais ✓
                </button>
                <button type="button" className="font-playfair" onClick={() => handleAnswer(false)} disabled={saving} style={{
                  flex: 1, padding: '14px', fontSize: '14px', fontWeight: 600, color: '#999',
                  backgroundColor: 'transparent', border: '1.5px solid #E2D9CC',
                  borderRadius: '12px', cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
                }}>
                  Je ne m&apos;en souvenais pas ✗
                </button>
              </div>
              {srsMessage ? (
                <p style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B6357',
                  fontStyle: 'italic', textAlign: 'center', margin: '10px 0 0 0',
                  animation: 'fadeIn 0.3s ease both',
                }}>
                  {srsMessage}
                </p>
              ) : null}
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
          Ayat {currentIndex + 1} sur {items.length}
        </p>
      </div>

    </div>
  );
}
