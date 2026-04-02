'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// ─── Data ────────────────────────────────────────────────────────────────────

const Q1_CHOICES = [
  "Me rapprocher d'Allah",
  'Honorer une promesse',
  'Me discipliner',
  'Devenir Hafiz',
  'Autre',
];

const Q2_CHOICES = [
  'Je commence de zéro',
  "J'ai quelques sourates",
  "J'ai déjà commencé et abandonné",
  'Je reprends après une longue pause',
];

const Q3_CHOICES = [
  '10 minutes',
  '20 minutes',
  '30 minutes',
  '45 minutes ou plus',
];

const Q4_CHOICES = [
  'Finir une sourate courte',
  'Mémoriser le Juz Amma',
  'Mémoriser le Coran complet',
];

const SOURATES = [
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
  "Al-Alaq",'Al-Qadr','Al-Bayyina','Az-Zalzala','Al-Adiyat','Al-Qaria','At-Takathur',
  'Al-Asr','Al-Humaza','Al-Fil','Quraysh','Al-Maun','Al-Kawthar','Al-Kafirun','An-Nasr',
  'Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

const LOADING_PHRASES = [
  'Analyse de tes réponses...',
  'Personnalisation de ton rythme...',
  'Sélection des sourates...',
  'Ton plan est prêt ✓',
];

// ─── Card component ───────────────────────────────────────────────────────────

function ChoiceCard({ label, selected, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        display: 'block',
        padding: '20px 28px',
        borderRadius: '16px',
        border: `1.5px solid ${selected ? '#163026' : hovered ? '#163026' : '#E2D9CC'}`,
        backgroundColor: selected ? '#163026' : '#FFFFFF',
        color: selected ? '#FFFFFF' : '#163026',
        fontFamily: 'inherit',
        fontSize: '16px',
        fontWeight: 500,
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 8px 32px rgba(22,48,38,0.25)'
          : hovered
          ? '0 4px 24px rgba(22,48,38,0.12)'
          : '0 2px 16px rgba(22,48,38,0.06)',
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  );
}

// ─── SVG progress circle ──────────────────────────────────────────────────────

function ProgressCircle({ percent }) {
  const r = 90;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#E2D9CC" strokeWidth="2" />
      <circle
        cx="110" cy="110" r={r}
        fill="none"
        stroke="#163026"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 110 110)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── CountUp component ────────────────────────────────────────────────────────

function CountUp({ target, duration = 1200, suffix = '' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let rafId;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setVal(Math.round(progress * target));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return <>{val}{suffix}</>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReset = searchParams.get('reset') === 'true';
  const [currentStep, setCurrentStep] = useState(1);
  const [intention, setIntention] = useState('');
  const [niveau, setNiveau] = useState('');
  const [temps, setTemps] = useState('');
  const [objectif, setObjectif] = useState('');
  const [sourates, setSourates] = useState([]);
  const [partialSurahs, setPartialSurahs] = useState({}); // { [surahName]: { from, to } }
  const [expandedPartial, setExpandedPartial] = useState(null); // surah name being edited
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);

  // Loading + plan states
  const [loading, setLoading] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState(null);
  const [prenom, setPrenom] = useState('');
  const [planVisible, setPlanVisible] = useState(false);

  useEffect(() => {
    async function checkExistingPlan() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { router.push('/login'); return; }
      if (!isReset) {
        const { data: existingPlan } = await supabase
          .from('plans')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (existingPlan && existingPlan.length > 0) {
          router.push('/dashboard');
          return;
        }
      }
      setTimeout(() => setPageVisible(true), 100);
    }
    checkExistingPlan();
  }, [router, isReset]);

  // Animate question transitions
  function goToStep(next) {
    setVisible(false);
    setTimeout(() => {
      setCurrentStep(next);
      setVisible(true);
    }, 300);
  }

  const willGenerateOnContinue = currentStep === 4 && objectif === 'Finir une sourate courte';

  function handleContinue() {
    if (currentStep < 5) {
      // Skip step 5 (sourate selection) when objectif fixes the surah automatically
      const nextStep = currentStep + 1;
      if (nextStep === 5 && objectif === 'Finir une sourate courte') {
        startGeneration();
      } else {
        goToStep(nextStep);
      }
    } else {
      startGeneration();
    }
  }

  function toggleSourate(s) {
    setSourates((prev) => {
      const next = prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
      // If unchecked, remove any partial data
      if (prev.includes(s)) {
        setPartialSurahs(p => { const n = { ...p }; delete n[s]; return n; });
        if (expandedPartial === s) setExpandedPartial(null);
      }
      return next;
    });
  }

  function setPartialRange(s, field, val) {
    const num = parseInt(val);
    if (!isNaN(num) && num >= 1) {
      setPartialSurahs(p => ({ ...p, [s]: { ...(p[s] || {}), [field]: num } }));
    }
  }

  async function startGeneration() {
    setError('');
    setLoading(true);
    setLoadingPercent(0);
    setLoadingPhrase(LOADING_PHRASES[0]);

    // Phrase cycling every 1.5s
    const phraseTimers = LOADING_PHRASES.map((phrase, i) =>
      setTimeout(() => setLoadingPhrase(phrase), i * 1500)
    );
    // Smooth percent animation in parallel
    const pctTimers = [
      setTimeout(() => setLoadingPercent(20), 300),
      setTimeout(() => setLoadingPercent(45), 1200),
      setTimeout(() => setLoadingPercent(70), 2400),
      setTimeout(() => setLoadingPercent(88), 3600),
    ];
    const allTimers = [...phraseTimers, ...pctTimers];

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Utilisateur non connecté.');
      setPrenom(user.user_metadata?.prenom || '');

      // In reset mode: wipe existing plan + progress so the new insert never hits a duplicate
      if (isReset) {
        await Promise.all([
          supabase.from('plans').delete().eq('user_id', user.id),
          supabase.from('progress').delete().eq('user_id', user.id),
        ]);
      }

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) throw new Error('Session expirée. Reconnecte-toi.');
      const accessToken = session.access_token;

      // Strip to numeric string e.g. '10 minutes' -> '10'
      const tempsKey = temps.replace(/[^0-9]/g, '');

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ intention, niveau, temps: tempsKey, objectif, sourates, partialSurahs }),
      });
      const planData = await res.json();

      if (!res.ok) throw new Error(planData.error || 'Erreur lors de la génération du plan.');

      const tempsMin = parseInt(temps) || 20;
      const memMin = planData.memorizationMinutes ?? Math.round(tempsMin * 0.4);
      const revMin = planData.revisionMinutes ?? (tempsMin - memMin);

      const planPayload = {
        user_id: user.id,
        ayah_per_day: planData.ayahPerDay ?? 2,
        days_per_week: planData.daysPerWeek ?? 5,
        minutes_per_session: planData.minutesPerSession ?? tempsMin,
        memorization_minutes: planData.memorizationMinutes ?? Math.round(tempsMin * 0.4),
        revision_minutes: planData.revisionMinutes ?? Math.round(tempsMin * 0.6),
        motivation_phrase: planData.motivationPhrase ?? intention,
        first_surah_name: planData.firstSurahName ?? 'An-Naba',
        surah_start: planData.surahStart ?? 78,
      };
      // Save plan — try insert first, fall back to update if row already exists
      const { error: planInsertErr } = await supabase.from('plans').insert(planPayload);
      if (planInsertErr) {
        if (planInsertErr.code === '23505' || planInsertErr.message?.includes('duplicate')) {
          // Row exists — update it instead
          const { error: planUpdateErr } = await supabase
            .from('plans')
            .update(planPayload)
            .eq('user_id', user.id);
          if (planUpdateErr) {
            allTimers.forEach(clearTimeout);
            console.error('[onboarding] plan update error:', planUpdateErr);
            throw new Error(`Sauvegarde plan échouée: ${planUpdateErr.message}`);
          }
        } else {
          allTimers.forEach(clearTimeout);
          console.error('[onboarding] plan insert error:', planInsertErr);
          throw new Error(`Sauvegarde plan échouée: ${planInsertErr.message}`);
        }
      }

      // Save progress — only insert if no row exists yet (never reset existing progress)
      const { data: existingProg } = await supabase
        .from('progress').select('user_id').eq('user_id', user.id).limit(1);
      if (!existingProg || existingProg.length === 0) {
        const { error: progErr } = await supabase.from('progress').insert({
          user_id: user.id,
          current_surah: planData.surahStart ?? 78,
          current_ayah: planData.startAyah != null ? planData.startAyah - 1 : 0,
          streak: 0,
          total_memorized: 0,
          session_dates: [],
        });
        if (progErr) {
          allTimers.forEach(clearTimeout);
          console.error('[onboarding] progress insert error:', progErr);
          throw new Error(`Sauvegarde progression échouée: ${progErr.message}`);
        }
      }

      allTimers.forEach(clearTimeout);
      setLoadingPercent(100);
      setLoadingPhrase(LOADING_PHRASES[3]);

      const displayPlan = {
        ayahPerDay: planData.ayahPerDay ?? 2,
        daysPerWeek: planData.daysPerWeek ?? 5,
        minutesPerSession: planData.minutesPerSession ?? tempsMin,
        memorizationMinutes: memMin,
        revisionMinutes: revMin,
        motivationPhrase: planData.motivationPhrase ?? intention,
        firstSurahName: planData.firstSurahName ?? 'An-Naba',
        estimatedMonths: planData.estimatedMonths ?? null,
      };
      setTimeout(() => {
        setPlan(displayPlan);
        setLoading(false);
        setTimeout(() => setPlanVisible(true), 50);
      }, 800);
    } catch (err) {
      console.error('[onboarding] fatal error:', err.message);
      allTimers.forEach(clearTimeout);
      setError(err.message);
      setLoadingPercent(0);
      setLoading(false);
    }
  }

  const currentAnswer = [intention, niveau, temps, objectif][currentStep - 1];
  const allAnswered = intention !== '' && niveau !== '' && temps !== '' && objectif !== '';
  const canContinue = currentStep < 5 ? currentAnswer !== '' : allAnswered;

  // ── Plan screen ──
  if (plan) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F5F0E6',
          position: 'relative',
          opacity: planVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 24px 48px', position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <p className="font-amiri" style={{ fontSize: '28px', fontWeight: 700, color: '#163026', textAlign: 'center', margin: '0 0 32px 0' }}>Zainly</p>

          {/* Badge */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#B8962E', border: '1px solid #B8962E', borderRadius: '20px', padding: '5px 14px' }}>PLAN PERSONNALISÉ</span>
          </div>

          {/* Title */}
          <h1 className="font-playfair" style={{ fontSize: '36px', fontWeight: 600, color: '#163026', textAlign: 'center', margin: '0 0 8px 0', lineHeight: 1.2 }}>
            Deviens Hafiz,
          </h1>
          {prenom && (
            <p className="font-playfair" style={{ fontSize: '28px', fontStyle: 'italic', color: '#B8962E', textAlign: 'center', margin: '0 0 12px 0' }}>{prenom}</p>
          )}
          <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 40px 0', lineHeight: 1.6 }}>
            Ton plan est prêt. Il ne reste qu&apos;à commencer.
          </p>

          {/* Stats card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <StatBox label="Ayats / semaine" value={<CountUp target={plan.ayahPerDay * plan.daysPerWeek} />} />
              <StatBox label="Jours / semaine" value={<CountUp target={plan.daysPerWeek} />} />
              <StatBox label="Min / session" value={<CountUp target={plan.minutesPerSession} />} />
            </div>
          </div>

          {/* Durée estimée */}
          {plan.estimatedMonths != null && (
            <p className="font-playfair" style={{ fontSize: '15px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '16px 0 0 0', lineHeight: 1.6 }}>
              À ce rythme tu atteindras ton objectif dans environ {plan.estimatedMonths} mois.
            </p>
          )}

          {/* Session structure card */}
          <div style={{ ...cardStyle, marginTop: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#6B6357', letterSpacing: '0.08em', margin: '0 0 16px 0', textTransform: 'uppercase' }}>Structure de session</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, backgroundColor: '#F5F0E6', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <p className="font-playfair" style={{ fontSize: '24px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}><CountUp target={plan.memorizationMinutes} suffix=" min" /></p>
                <p style={{ fontSize: '12px', color: '#6B6357', margin: 0 }}>Mémorisation</p>
              </div>
              <div style={{ flex: 1, backgroundColor: '#F5F0E6', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <p className="font-playfair" style={{ fontSize: '24px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}><CountUp target={plan.revisionMinutes} suffix=" min" /></p>
                <p style={{ fontSize: '12px', color: '#6B6357', margin: 0 }}>Révision</p>
              </div>
            </div>
          </div>

          {/* Motivation */}
          {plan.motivationPhrase && (
            <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '28px 0 0 0', lineHeight: 1.7 }}>
              &ldquo;{plan.motivationPhrase}&rdquo;
            </p>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="font-playfair"
            style={{
              marginTop: '40px',
              width: '100%',
              padding: '16px',
              fontSize: '17px',
              fontWeight: 600,
              backgroundColor: '#163026',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(22,48,38,0.25)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(22,48,38,0.32)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(22,48,38,0.25)'; }}
          >
            Commencer mon Hifz →
          </button>
        </div>
      </div>
    );
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F5F0E6',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '24px',
        }}
      >
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: 220, height: 220 }}>
            <ProgressCircle percent={loadingPercent} />
            <span
              className="font-playfair"
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '52px',
                fontWeight: 600,
                color: '#163026',
              }}
            >
              {loadingPercent}%
            </span>
          </div>
          <p
            className="font-playfair"
            style={{
              marginTop: '36px',
              fontSize: '18px',
              fontStyle: 'italic',
              color: '#6B6357',
            }}
          >
            {loadingPhrase}
          </p>
          {error && (
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#c0392b' }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Questions screen ──
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E6',
        position: 'relative',
        opacity: pageVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Calligraphie fixe */}
      <span className="font-amiri" style={calligStyle}>الله</span>

      {/* Barre de progression */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '2px', backgroundColor: '#E2D9CC', zIndex: 100 }}>
        <div
          style={{
            height: '100%',
            backgroundColor: '#B8962E',
            width: `${(willGenerateOnContinue ? 5 : currentStep) / 5 * 100}%`,
            transition: 'width 0.6s ease',
          }}
        />
      </div>

      {/* Contenu */}
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '80px 24px 48px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Bouton retour */}
        <div style={{ width: '100%', maxWidth: '560px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => currentStep > 1 && goToStep(currentStep - 1)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
              color: '#6B6357', padding: '8px 16px',
              opacity: currentStep === 1 ? 0 : 1,
              pointerEvents: currentStep === 1 ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}
          >
            ← Retour
          </button>
        </div>

        {/* Étape */}
        <p style={{ fontSize: '13px', color: '#6B6357', fontFamily: 'inherit', marginBottom: '40px', letterSpacing: '0.04em' }}>
          Étape {Math.min(currentStep, 5)} sur 5
        </p>

        {/* Question block */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
          }}
        >
          {/* Q1 */}
          {currentStep === 1 && (
            <QuestionBlock
              title="Pourquoi tu veux mémoriser le Coran ?"
              subtitle="Ton intention est la fondation de tout."
              choices={Q1_CHOICES}
              selected={intention}
              onSelect={setIntention}
            />
          )}

          {/* Q2 */}
          {currentStep === 2 && (
            <QuestionBlock
              title="Où en es-tu dans ton Hifz ?"
              subtitle="Pas de jugement — juste pour adapter ton plan."
              choices={Q2_CHOICES}
              selected={niveau}
              onSelect={setNiveau}
            />
          )}

          {/* Q3 */}
          {currentStep === 3 && (
            <QuestionBlock
              title="Combien de temps peux-tu consacrer par jour ?"
              subtitle="Même 10 minutes par jour font une vraie différence."
              choices={Q3_CHOICES}
              selected={temps}
              onSelect={setTemps}
            />
          )}

          {/* Q4 */}
          {currentStep === 4 && (
            <QuestionBlock
              title="Quel est ton objectif ?"
              subtitle="Choisis ce qui correspond à ton ambition."
              choices={Q4_CHOICES}
              selected={objectif}
              onSelect={setObjectif}
            />
          )}

          {/* Q5 — Sourates */}
          {currentStep === 5 && (
            <div>
              <h1
                className="font-playfair"
                style={{ fontSize: '38px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 12px 0' }}
              >
                Tu connais déjà des sourates ?
              </h1>
              <p
                className="font-playfair"
                style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 32px 0', lineHeight: 1.6 }}
              >
                Sélectionne celles que tu maîtrises — elles ne seront pas re-proposées.
              </p>

              {/* Aucune button */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => { setSourates([]); setPartialSurahs({}); setExpandedPartial(null); }}
                  style={{
                    padding: '10px 28px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: `1.5px solid ${sourates.length === 0 ? '#163026' : '#E2D9CC'}`,
                    backgroundColor: sourates.length === 0 ? '#163026' : '#FFFFFF',
                    color: sourates.length === 0 ? '#FFFFFF' : '#6B6357',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Aucune
                </button>
              </div>

              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #E2D9CC',
                  borderRadius: '16px',
                  maxHeight: '360px',
                  overflowY: 'scroll',
                  WebkitOverflowScrolling: 'touch',
                  padding: '8px 0',
                }}
              >
                {SOURATES.map((s, i) => {
                  const checked = sourates.includes(s);
                  const isExpanded = expandedPartial === s;
                  const partial = partialSurahs[s];
                  return (
                    <div key={s}>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '12px 20px',
                          cursor: 'pointer',
                          backgroundColor: checked ? 'rgba(22,48,38,0.04)' : 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSourate(s)}
                          style={{ accentColor: '#163026', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '15px', color: '#163026', flex: 1 }}>
                          <span style={{ color: '#6B6357', marginRight: '8px', fontSize: '13px' }}>{i + 1}.</span>
                          {s}
                          {partial && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#B8962E' }}>
                              (ayat {partial.from}–{partial.to})
                            </span>
                          )}
                        </span>
                        {checked && (
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); setExpandedPartial(isExpanded ? null : s); }}
                            style={{
                              background: 'transparent', border: 'none',
                              fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
                              color: '#B8962E', cursor: 'pointer', padding: '4px',
                              flexShrink: 0,
                            }}
                          >
                            Préciser les ayats
                          </button>
                        )}
                      </label>
                      {checked && isExpanded && (
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '8px 20px 12px 50px',
                            backgroundColor: 'rgba(184,150,46,0.05)',
                          }}
                          onClick={e => e.preventDefault()}
                        >
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>De l&apos;ayat</span>
                          <input
                            type="number"
                            min={1}
                            value={partial?.from ?? ''}
                            onChange={e => setPartialRange(s, 'from', e.target.value)}
                            style={{
                              width: '56px', padding: '6px 8px', borderRadius: '8px',
                              border: '1.5px solid #E2D9CC', fontFamily: 'DM Sans, sans-serif',
                              fontSize: '14px', color: '#163026', textAlign: 'center',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>à l&apos;ayat</span>
                          <input
                            type="number"
                            min={1}
                            value={partial?.to ?? ''}
                            onChange={e => setPartialRange(s, 'to', e.target.value)}
                            style={{
                              width: '56px', padding: '6px 8px', borderRadius: '8px',
                              border: '1.5px solid #E2D9CC', fontFamily: 'DM Sans, sans-serif',
                              fontSize: '14px', color: '#163026', textAlign: 'center',
                              outline: 'none',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setExpandedPartial(null)}
                            style={{
                              padding: '6px 14px', borderRadius: '8px',
                              backgroundColor: '#163026', color: '#fff',
                              border: 'none', fontFamily: 'DM Sans, sans-serif',
                              fontSize: '13px', cursor: 'pointer',
                            }}
                          >
                            OK
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bouton Continuer */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '40px',
              opacity: canContinue ? 1 : 0,
              transform: canContinue ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              pointerEvents: canContinue ? 'auto' : 'none',
            }}
          >
            <button
              type="button"
              onClick={handleContinue}
              className="font-playfair"
              style={{
                padding: '16px 48px',
                minWidth: '280px',
                maxWidth: 'calc(100vw - 48px)',
                fontSize: '17px',
                fontWeight: 600,
                backgroundColor: '#163026',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(22,48,38,0.25)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(22,48,38,0.32)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(22,48,38,0.25)';
              }}
            >
              {(currentStep === 5 || willGenerateOnContinue) ? 'Générer mon plan →' : 'Continuer →'}
            </button>
            {error && (
              <p style={{ marginTop: '16px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#c0392b', textAlign: 'center' }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QuestionBlock helper ─────────────────────────────────────────────────────

function QuestionBlock({ title, subtitle, choices, selected, onSelect }) {
  return (
    <div>
      <h1
        className="font-playfair"
        style={{
          fontSize: '38px',
          fontWeight: 600,
          color: '#163026',
          textAlign: 'center',
          lineHeight: 1.3,
          margin: '0 0 12px 0',
        }}
      >
        {title}
      </h1>
      <p
        className="font-playfair"
        style={{
          fontSize: '18px',
          fontStyle: 'italic',
          color: '#6B6357',
          textAlign: 'center',
          margin: '0 0 36px 0',
          lineHeight: 1.6,
        }}
      >
        {subtitle}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {choices.map((c) => (
          <ChoiceCard
            key={c}
            label={c}
            selected={selected === c}
            onClick={() => onSelect(c)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── StatBox helper ───────────────────────────────────────────────────────────

function StatBox({ label, value }) {
  return (
    <div style={{ flex: 1 }}>
      <p className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}>{value}</p>
      <p style={{ fontSize: '12px', color: '#6B6357', margin: 0, letterSpacing: '0.03em' }}>{label}</p>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const calligStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  fontSize: 'min(40vw, 300px)',
  color: '#163026',
  opacity: 0.04,
  pointerEvents: 'none',
  userSelect: 'none',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  zIndex: 0,
};

const cardStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2D9CC',
  borderRadius: '16px',
  padding: '28px',
};
