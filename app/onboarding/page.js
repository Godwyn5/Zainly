'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ZAINLY_ORDER as ZAINLY_ORDER_DATA, calcSequentialKnown } from '@/lib/zainlyOrder';
import { JUZ_SURAHS } from '@/lib/juzData';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut', delay },
});

// ─── Constants ───────────────────────────────────────────────────────────────

// Derived from shared lib — single source of truth
const ZAINLY_ORDER = ZAINLY_ORDER_DATA.map(s => s.name);

const QURAN_ORDER = [
  'Al-Fatiha','Al-Baqara','Al-Imran','An-Nisa','Al-Maida','Al-Anam','Al-Araf',
  'Al-Anfal','At-Tawba','Yunus','Hud','Yusuf','Ar-Rad','Ibrahim','Al-Hijr',
  'An-Nahl','Al-Isra','Al-Kahf','Maryam','Ta-Ha','Al-Anbiya','Al-Hajj',
  'Al-Muminun','An-Nur','Al-Furqan','Ash-Shuara','An-Naml','Al-Qasas',
  'Al-Ankabut','Ar-Rum','Luqman','As-Sajda','Al-Ahzab','Saba','Fatir','Ya-Sin',
  'As-Saffat','Sad','Az-Zumar','Ghafir','Fussilat','Ash-Shura','Az-Zukhruf',
  'Ad-Dukhan','Al-Jathiya','Al-Ahqaf','Muhammad','Al-Fath','Al-Hujurat','Qaf',
  'Adh-Dhariyat','At-Tur','An-Najm','Al-Qamar','Ar-Rahman','Al-Waqia','Al-Hadid',
  'Al-Mujadila','Al-Hashr','Al-Mumtahana','As-Saf','Al-Jumua','Al-Munafiqun',
  'At-Taghabun','At-Talaq','At-Tahrim','Al-Mulk','Al-Qalam','Al-Haqqa',
  'Al-Maarij','Nuh','Al-Jinn','Al-Muzzammil','Al-Muddaththir','Al-Qiyama',
  'Al-Insan','Al-Mursalat','An-Naba','An-Naziat','Abasa','At-Takwir','Al-Infitar',
  'Al-Mutaffifin','Al-Inshiqaq','Al-Buruj','At-Tariq','Al-Ala','Al-Ghashiya',
  'Al-Fajr','Al-Balad','Ash-Shams','Al-Layl','Ad-Duha','Ash-Sharh','At-Tin',
  'Al-Alaq','Al-Qadr','Al-Bayyina','Az-Zalzala','Al-Adiyat','Al-Qaria',
  'At-Takathur','Al-Asr','Al-Humaza','Al-Fil','Quraysh','Al-Maun','Al-Kawthar',
  'Al-Kafirun','An-Nasr','Al-Masad','Al-Ikhlas','Al-Falaq','An-Nas',
];

const SURAH_AYAT = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,
  59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,
  52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,
  21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6,
];

const TOTAL_AYATS = SURAH_AYAT.reduce((a, b) => a + b, 0);

const RHYTHMS = [
  { ayah: 1, label: '1 ayat / jour',  desc: 'Parfait pour commencer en douceur' },
  { ayah: 2, label: '2 ayats / jour', desc: 'Un rythme stable et durable' },
  { ayah: 3, label: '3 ayats / jour', desc: 'Un excellent équilibre' },
  { ayah: 4, label: '4 ayats / jour', desc: 'Tu progresses rapidement' },
  { ayah: 5, label: '5 ayats / jour', desc: 'Très engagé — résultats visibles' },
  { ayah: 6, label: '6 ayats / jour', desc: 'Niveau avancé — forte discipline' },
];

const RHYTHM_MOTIVATION = [
  '',
  'Tu construis une habitude solide.',
  'La régularité fait tout.',
  'Un excellent point de départ.',
  'Tu avances vite et bien.',
  'Peu le font — bravo.',
  'Discipline maximale.',
];

const LOADING_PHRASES = [
  'Analyse de tes reponses...',
  'Personnalisation de ton rythme...',
  'Selection des sourates...',
  'Ton plan est pret',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcEstimatedYears(ayahPerDay, sourates, partialSurahs) {
  const { remainingAyats } = calcSequentialKnown(sourates, partialSurahs);
  const weeks = Math.ceil(remainingAyats / (ayahPerDay * 6));
  return Math.max(1, Math.round(weeks / 52.18));
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes fadeIn {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes slideUp {
  from { opacity:0; transform:translateY(24px); }
  to   { opacity:1; transform:translateY(0); }
}
`;

const calligStyle = {
  position: 'fixed',
  top: '50%', left: '50%',
  transform: 'translate(-50%,-50%)',
  fontSize: 'min(40vw,300px)',
  color: '#163026',
  opacity: 0.04,
  pointerEvents: 'none',
  userSelect: 'none',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  zIndex: 0,
};

// ─── SVG progress circle ──────────────────────────────────────────────────────

function ProgressCircle({ percent }) {
  const r = 90, circ = 2 * Math.PI * r;
  return (
    <svg width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#E2D9CC" strokeWidth="2" />
      <circle cx="110" cy="110" r={r} fill="none" stroke="#163026" strokeWidth="2"
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ - (percent / 100) * circ}
        transform="rotate(-90 110 110)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function OnboardingInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isReset      = searchParams.get('reset') === 'true';

  const [step, setStep]                   = useState(1); // 1=rythme, 2=sourates
  const [ayahPerDay, setAyahPerDay]       = useState(null);
  const [sourates, setSourates]           = useState([]);
  const [partialSurahs, setPartialSurahs] = useState({});
  const [expandedPartial, setExpandedPartial] = useState(null);
  const [juzFilter, setJuzFilter]         = useState(0); // 0 = Tout
  const [visible, setVisible]             = useState(true);
  const [pageVisible, setPageVisible]     = useState(false);

  const [loading, setLoading]             = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [error, setError]                 = useState('');
  const [coranComplete, setCoranComplete] = useState(false);
  const [plan, setPlan]                   = useState(null);
  const [planVisible, setPlanVisible]     = useState(false);
  const [prenom, setPrenom]               = useState('');

  // Redirect to dashboard if plan exists (unless reset mode)
  useEffect(() => {
    async function check() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) { router.push('/login'); return; }
      if (!isReset) {
        const { data: existing } = await supabase.from('plans').select('id').eq('user_id', user.id).limit(1);
        if (existing && existing.length > 0) { router.push('/dashboard'); return; }
      }
      setTimeout(() => setPageVisible(true), 80);
    }
    check();
  }, [router, isReset]);

  function goStep(n) {
    setVisible(false);
    setTimeout(() => { setStep(n); setVisible(true); }, 280);
  }

  function toggleSourate(s) {
    setSourates(prev => {
      const next = prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s];
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

  async function generate() {
    setError('');
    setLoading(true);
    setLoadingPercent(0);
    setLoadingPhrase(LOADING_PHRASES[0]);

    const phraseTimers = LOADING_PHRASES.map((ph, i) => setTimeout(() => setLoadingPhrase(ph), i * 1500));
    const pctTimers = [
      setTimeout(() => setLoadingPercent(20), 300),
      setTimeout(() => setLoadingPercent(45), 1200),
      setTimeout(() => setLoadingPercent(70), 2400),
      setTimeout(() => setLoadingPercent(88), 3600),
    ];
    const allTimers = [...phraseTimers, ...pctTimers];

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error('Utilisateur non connecte.');
      setPrenom(user.user_metadata?.prenom || '');

      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.access_token) throw new Error('Session expiree. Reconnecte-toi.');

      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ ayahPerDay, sourates, partialSurahs }),
      });
      const planData = await res.json();
      if (!res.ok) throw new Error(planData.error || 'Erreur lors de la generation du plan.');
      if (planData.message === 'coran_complete') {
        allTimers.forEach(clearTimeout);
        setLoading(false);
        setCoranComplete(true);
        return;
      }

      allTimers.forEach(clearTimeout);
      setLoadingPercent(100);
      setLoadingPhrase(LOADING_PHRASES[3]);
      setTimeout(() => { setPlan(planData); setLoading(false); setTimeout(() => setPlanVisible(true), 50); }, 800);
    } catch (err) {
      allTimers.forEach(clearTimeout);
      setError(err.message);
      setLoadingPercent(0);
      setLoading(false);
    }
  }

  const estimatedYears = ayahPerDay ? calcEstimatedYears(ayahPerDay, sourates, partialSurahs) : null;

  // ── Coran complet screen ──
  if (coranComplete) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '32px', textAlign: 'center', position: 'relative' }}>
        <style>{CSS}</style>
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="font-amiri" style={{ fontSize: '72px', color: '#B8962E', display: 'block', marginBottom: '8px' }}>الله</span>
          <h1 className="font-playfair" style={{ fontSize: '30px', fontWeight: 600, color: '#163026', margin: '0 0 16px 0', lineHeight: 1.3 }}>
            MashaAllah !
          </h1>
          <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357', margin: '0 0 8px 0', lineHeight: 1.6, maxWidth: '480px' }}>
            Tu sembles déjà avoir complété tout le parcours Zainly.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: '0 0 36px 0', lineHeight: 1.6 }}>
            Si ce n&apos;est pas le cas, désélectionne les sourates que tu n&apos;as pas encore mémorisées.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="font-playfair"
              style={{ padding: '14px 40px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(22,48,38,0.2)' }}
            >
              Retour au dashboard
            </button>
            <button
              type="button"
              onClick={() => setCoranComplete(false)}
              style={{ background: 'none', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', cursor: 'pointer', padding: '8px' }}
            >
              ← Modifier mes sourates
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Plan screen ──
  if (plan) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', position: 'relative' }}
      >
        <style>{CSS}</style>
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '60px 24px 48px', position: 'relative', zIndex: 1 }}>
          <p className="font-amiri" style={{ fontSize: '28px', fontWeight: 700, color: '#163026', textAlign: 'center', margin: '0 0 32px 0' }}>Zainly</p>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#B8962E', border: '1px solid #B8962E', borderRadius: '20px', padding: '5px 14px' }}>PLAN PERSONNALISE</span>
          </div>

          <motion.h1
            {...fadeUp(0)}
            className="font-playfair"
            style={{ fontSize: '36px', fontWeight: 600, color: '#163026', textAlign: 'center', margin: '0 0 12px 0', lineHeight: 1.2 }}
          >
            Deviens Hafiz{prenom ? `, ${prenom}.` : '.'}
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="font-playfair"
            style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 40px 0', lineHeight: 1.6 }}
          >
            Ton plan est prêt. Il ne reste qu&apos;à commencer.
          </motion.p>

          <motion.div
            {...fadeUp(0.4)}
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', borderRadius: '16px', padding: '28px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <p className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}>{plan.ayahPerDay}</p>
                <p style={{ fontSize: '12px', color: '#6B6357', margin: 0 }}>Ayats / jour</p>
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}>6</p>
                <p style={{ fontSize: '12px', color: '#6B6357', margin: 0 }}>Jours / semaine</p>
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}>{estimatedYears ?? '?'}</p>
                <p style={{ fontSize: '12px', color: '#6B6357', margin: 0 }}>Ans pour le Coran</p>
              </div>
            </div>
          </motion.div>

          <motion.p
            {...fadeUp(0.5)}
            style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#A09890', textAlign: 'center', margin: '20px 0 0 0', lineHeight: 1.7 }}
          >
            Aujourd&apos;hui : {plan.ayahPerDay} ayat{plan.ayahPerDay > 1 ? 's' : ''}. Un premier pas, chaque jour.
          </motion.p>

          <motion.button
            {...fadeUp(0.6)}
            type="button"
            onClick={() => router.push('/dashboard')}
            className="font-playfair"
            style={{ marginTop: '28px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 8px 32px rgba(22,48,38,0.25)' }}
          >
            Commencer aujourd&apos;hui
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '24px' }}>
        <span className="font-amiri" style={calligStyle}>الله</span>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', width: 220, height: 220 }}>
            <ProgressCircle percent={loadingPercent} />
            <span className="font-playfair" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '52px', fontWeight: 600, color: '#163026' }}>
              {loadingPercent}%
            </span>
          </div>
          <p className="font-playfair" style={{ marginTop: '36px', fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>{loadingPhrase}</p>
          {error && <p style={{ marginTop: '16px', fontSize: '14px', color: '#c0392b' }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Questions ──
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', position: 'relative', opacity: pageVisible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <style>{CSS}</style>
      <span className="font-amiri" style={calligStyle}>الله</span>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#E2D9CC', zIndex: 100 }}>
        <div style={{ height: '100%', backgroundColor: '#B8962E', width: `${(step / 2) * 100}%`, transition: 'width 0.5s ease' }} />
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '72px 24px 80px', position: 'relative', zIndex: 1 }}>

        {/* Back button */}
        {step === 2 && (
          <button type="button" onClick={() => goStep(1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', padding: '0 0 24px 0', display: 'block' }}>
            ← Retour
          </button>
        )}

        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 0.28s ease, transform 0.28s ease' }}>

          {/* ── STEP 1: Rythme ── */}
          {step === 1 && (
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ETAPE 1 / 2</p>
              <h1 className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                À quel rythme veux-tu avancer ?
              </h1>
              <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                Tu pourras ajuster à tout moment.
              </p>

              {/* Dynamic 30-day preview */}
              <div style={{
                minHeight: '64px',
                marginBottom: '24px',
                padding: '16px 20px',
                backgroundColor: ayahPerDay ? '#FFFFFF' : 'transparent',
                border: ayahPerDay ? '1px solid #E2D9CC' : '1px solid transparent',
                borderRadius: '14px',
                transition: 'all 0.3s ease',
                textAlign: 'center',
              }}>
                {ayahPerDay ? (
                  <>
                    <p className="font-playfair" style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 600, color: '#163026', lineHeight: 1.4 }}>
                      En 30 jours, tu auras mémorisé ~{Math.round(ayahPerDay * 6 * 4.33)} ayats.
                    </p>
                    <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E' }}>
                      {RHYTHM_MOTIVATION[ayahPerDay]}
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#A09890' }}>
                    Choisis un rythme pour voir ta progression.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {RHYTHMS.map(r => {
                  const sel = ayahPerDay === r.ayah;
                  return (
                    <button
                      key={r.ayah}
                      type="button"
                      onClick={() => setAyahPerDay(r.ayah)}
                      style={{
                        width: '100%', padding: '18px 22px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                        border: `1.5px solid ${sel ? '#163026' : '#E2D9CC'}`,
                        backgroundColor: sel ? '#F5F0E6' : '#FFFFFF',
                        transform: sel ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        boxShadow: sel ? '0 4px 16px rgba(22,48,38,0.10)' : 'none',
                      }}
                    >
                      <p className="font-playfair" style={{ margin: '0 0 3px 0', fontSize: '17px', fontWeight: 600, color: '#163026' }}>{r.label}</p>
                      <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: sel ? '#163026' : '#6B6357' }}>{r.desc}</p>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => goStep(2)}
                disabled={!ayahPerDay}
                className="font-playfair"
                style={{
                  marginTop: '28px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                  backgroundColor: ayahPerDay ? '#163026' : '#E2D9CC',
                  color: ayahPerDay ? '#FFFFFF' : '#A09890',
                  border: 'none', borderRadius: '12px',
                  cursor: ayahPerDay ? 'pointer' : 'default',
                  boxShadow: ayahPerDay ? '0 8px 32px rgba(22,48,38,0.2)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                Commencer avec ce rythme →
              </button>
            </div>
          )}

          {/* ── STEP 2: Sourates connues ── */}
          {step === 2 && (() => {
            const juzSurateSet = juzFilter === 0 ? null : new Set(JUZ_SURAHS[juzFilter] ?? []);
            const visibleSourates = juzFilter === 0
              ? ZAINLY_ORDER
              : ZAINLY_ORDER.filter(s => juzSurateSet.has(s));
            const juz30Set = new Set(JUZ_SURAHS[30]);
            const allJuz30Known = JUZ_SURAHS[30].every(s => sourates.includes(s));

            return (
              <div>
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E', letterSpacing: '0.1em', fontWeight: 600, textAlign: 'center', margin: '0 0 12px 0' }}>ETAPE 2 / 2</p>
                <h1 className="font-playfair" style={{ fontSize: '32px', fontWeight: 600, color: '#163026', textAlign: 'center', lineHeight: 1.3, margin: '0 0 8px 0' }}>
                  Quelles sourates maitrise-tu deja ?
                </h1>
                <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.6 }}>
                  Coche celles que tu maitrises — si aucune, Zainly commence par Al-Fatiha.
                </p>

                {/* Estimated years badge */}
                {ayahPerDay && (
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026', backgroundColor: '#FFFFFF', border: '1.5px solid #E2D9CC', borderRadius: '12px', padding: '8px 20px', display: 'inline-block' }}>
                      ~{calcEstimatedYears(ayahPerDay, sourates, partialSurahs)} an{calcEstimatedYears(ayahPerDay, sourates, partialSurahs) > 1 ? 's' : ''} pour le Coran complet
                    </span>
                  </div>
                )}

                {/* Quick actions row */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setSourates([]); setPartialSurahs({}); setExpandedPartial(null); }}
                    style={{
                      padding: '8px 20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${sourates.length === 0 ? '#163026' : '#E2D9CC'}`,
                      backgroundColor: sourates.length === 0 ? '#163026' : '#FFFFFF',
                      color: sourates.length === 0 ? '#FFFFFF' : '#6B6357',
                      borderRadius: '10px', transition: 'all 0.2s',
                    }}
                  >
                    Aucune
                  </button>
                  <button
                    type="button"
                    disabled={allJuz30Known}
                    onClick={() => {
                      setSourates(prev => {
                        const next = [...prev];
                        JUZ_SURAHS[30].forEach(s => { if (!next.includes(s)) next.push(s); });
                        return next;
                      });
                    }}
                    style={{
                      padding: '8px 20px', fontSize: '13px', fontWeight: 500, cursor: allJuz30Known ? 'default' : 'pointer',
                      border: `1.5px solid ${allJuz30Known ? '#E2D9CC' : '#B8962E'}`,
                      backgroundColor: allJuz30Known ? '#F5F0E6' : '#FFFFFF',
                      color: allJuz30Known ? '#A09890' : '#B8962E',
                      borderRadius: '10px', transition: 'all 0.2s',
                    }}
                  >
                    Je connais Juz Amma
                  </button>
                </div>

                {/* Juz filter pills */}
                <div style={{
                  display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px',
                  marginBottom: '12px', WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                }}>
                  {[0, ...Array.from({ length: 30 }, (_, i) => 30 - i)].map(j => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setJuzFilter(j)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${juzFilter === j ? '#163026' : '#E2D9CC'}`,
                        backgroundColor: juzFilter === j ? '#163026' : '#FFFFFF',
                        color: juzFilter === j ? '#FFFFFF' : '#6B6357',
                        borderRadius: '20px', transition: 'all 0.18s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {j === 0 ? 'Tout' : `Juz ${j}`}
                    </button>
                  ))}
                </div>

                {/* Sourate list */}
                <div style={{ backgroundColor: '#FFFFFF', border: '1.5px solid #E2D9CC', borderRadius: '16px', maxHeight: '360px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 0' }}>
                  {visibleSourates.length === 0 && (
                    <p style={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#A09890', padding: '24px' }}>Aucune sourate dans ce Juz.</p>
                  )}
                  {visibleSourates.map(s => {
                    const checked = sourates.includes(s);
                    const isExpanded = expandedPartial === s;
                    const partial = partialSurahs[s];
                    const qNum = QURAN_ORDER.indexOf(s) + 1;
                    return (
                      <div key={s}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 20px', cursor: 'pointer', backgroundColor: checked ? 'rgba(22,48,38,0.04)' : 'transparent', transition: 'background-color 0.15s' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSourate(s)}
                            style={{ accentColor: '#163026', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ fontSize: '15px', color: '#163026', flex: 1 }}>
                            <span style={{ color: '#6B6357', marginRight: '6px', fontSize: '12px' }}>{qNum}.</span>
                            {s}
                            {partial && (
                              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#B8962E' }}>(ayat {partial.from}–{partial.to})</span>
                            )}
                          </span>
                          {checked && (
                            <button
                              type="button"
                              onClick={e => { e.preventDefault(); setExpandedPartial(isExpanded ? null : s); }}
                              style={{ background: 'transparent', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#B8962E', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                            >
                              Preciser les ayats
                            </button>
                          )}
                        </label>
                        {checked && isExpanded && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px 12px 50px', backgroundColor: 'rgba(184,150,46,0.05)' }} onClick={e => e.preventDefault()}>
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>De l&apos;ayat</span>
                            <input type="number" min={1} value={partial?.from ?? ''} onChange={e => setPartialRange(s, 'from', e.target.value)}
                              style={{ width: '56px', padding: '6px 8px', borderRadius: '8px', border: '1.5px solid #E2D9CC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026', textAlign: 'center', outline: 'none' }}
                            />
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357' }}>a l&apos;ayat</span>
                            <input type="number" min={1} value={partial?.to ?? ''} onChange={e => setPartialRange(s, 'to', e.target.value)}
                              style={{ width: '56px', padding: '6px 8px', borderRadius: '8px', border: '1.5px solid #E2D9CC', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026', textAlign: 'center', outline: 'none' }}
                            />
                            <button type="button" onClick={() => setExpandedPartial(null)}
                              style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: '#163026', color: '#fff', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', cursor: 'pointer' }}>
                              OK
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={generate}
                  className="font-playfair"
                  style={{
                    marginTop: '28px', width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600,
                    backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '12px',
                    cursor: 'pointer', boxShadow: '0 8px 32px rgba(22,48,38,0.2)', transition: 'all 0.2s ease',
                  }}
                >
                  Generer mon plan →
                </button>
                {error && <p style={{ marginTop: '12px', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#c0392b', textAlign: 'center' }}>{error}</p>}
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
