'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { adaptPlan } from '@/lib/adaptive-algorithm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// UTC midnight of today — safe for comparing with Supabase timestamptz
function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfTomorrowUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function getMotivation(streak) {
  if (streak >= 30) return "Un mois. Tu es hafiz en devenir. Allah facilite ton chemin.";
  if (streak >= 14) return "Deux semaines. Le Coran s\u2019installe dans ton c\u0153ur.";
  if (streak >= 7)  return "Une semaine compl\u00e8te. Tu es en train de devenir quelqu\u2019un de diff\u00e9rent.";
  if (streak >= 3)  return "L\u2019habitude commence \u00e0 se former. Ne t\u2019arr\u00eate pas.";
  if (streak >= 2)  return "Deux jours de suite. Continue.";
  return "Le premier pas est toujours le plus difficile. Tu l\u2019as fait.";
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
@keyframes expand {
  from { transform: scale(0.3); opacity: 0.8; }
  to   { transform: scale(2.8); opacity: 0; }
}
@keyframes checkPop {
  from { transform: scale(0.5); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DonePage() {
  const router = useRouter();

  const [progress, setProgress]           = useState(null);
  const [todayMemorized, setTodayMemorized] = useState(0);
  const [todayRevised, setTodayRevised]   = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authUser) { router.push('/login'); return; }

      await adaptPlan(supabase, authUser.id);

      const startToday    = startOfTodayUTC();
      const startTomorrow = startOfTomorrowUTC();
      const today         = todayStr();

      // Fetch progress + memorized today + revised today in parallel
      const [
        { data: progRows },
        { data: memorizedItems },
        { data: revisedItems },
      ] = await Promise.all([
        supabase.from('progress').select('*').eq('user_id', authUser.id)
          .order('created_at', { ascending: false }).limit(1),
        // Items created today = memorized this session
        supabase.from('review_items').select('id')
          .eq('user_id', authUser.id)
          .gte('created_at', startToday)
          .lt('created_at', startTomorrow),
        // Items revised today = next_review was updated today (review_cycle advanced)
        supabase.from('review_items').select('id')
          .eq('user_id', authUser.id)
          .gte('updated_at', startToday)
          .lt('updated_at', startTomorrow)
          .gt('review_cycle', 1),
      ]);

      const prog = Array.isArray(progRows) ? progRows[0] : progRows;
      setProgress(prog ?? null);
      setTodayMemorized(memorizedItems?.length ?? 0);
      setTodayRevised(revisedItems?.length ?? 0);

      setLoading(false);
    }

    loadData().catch(err => {
      console.error('[done] load error:', err);
      setLoading(false);
    });
  }, [router]);

  const streak         = progress?.streak ?? 0;
  const totalMemorized = progress?.total_memorized ?? 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026' }}>Une erreur est survenue. Reviens au dashboard.</p>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '10px 24px', backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', position: 'relative', overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* Background calligraphy */}
      <span className="font-amiri" style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '60vw', color: '#163026', opacity: 0.04,
        pointerEvents: 'none', userSelect: 'none', lineHeight: 1, zIndex: 0,
      }}>
        الله
      </span>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>

        {/* ── CELEBRATION ANIMATION ── */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', marginTop: '24px' }}>
          {/* Concentric rings */}
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: '80px', height: '80px',
              borderRadius: '50%',
              border: '2px solid #B8962E',
              animation: `expand 1.2s ease-out ${delay}s infinite`,
            }} />
          ))}
          {/* Check circle */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #163026, #2d5a42)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', color: '#fff', position: 'relative', zIndex: 1,
            animation: 'checkPop 0.5s ease 0.3s both',
          }}>
            ✓
          </div>
        </div>

        {/* ── TITLE ── */}
        <h1 className="font-playfair" style={{
          fontSize: '42px', fontWeight: 600, color: '#163026',
          margin: '24px 0 0 0', lineHeight: 1.2,
          animation: 'fadeUp 0.5s ease 0.5s both',
        }}>
          Session accomplie.
        </h1>

        {/* ── STREAK ── */}
        <p className="font-playfair" style={{
          fontSize: '28px', fontWeight: 700, color: '#B8962E',
          margin: '8px 0 0 0',
          animation: 'fadeUp 0.5s ease 0.6s both',
        }}>
          {streak === 0 ? '🔥 1er jour !' : `🔥 ${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}`}
        </p>

        {/* ── STATS CARD ── */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(15,35,24,0.08)',
          padding: '28px',
          marginTop: '32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
          alignItems: 'center',
          animation: 'fadeUp 0.5s ease 0.7s both',
        }}>
          <StatCol value={todayMemorized} label="Mémorisés" />
          <div style={{ width: '1px', height: '48px', backgroundColor: '#E2D9CC' }} />
          <StatCol value={todayRevised} label="Révisés" />
          <div style={{ width: '1px', height: '48px', backgroundColor: '#E2D9CC' }} />
          <StatCol value={totalMemorized} label="Total" />
        </div>

        {/* ── MOTIVATION ── */}
        <p className="font-playfair" style={{
          fontSize: '18px', fontStyle: 'italic', color: '#6B6357',
          maxWidth: '380px', margin: '24px auto 0', lineHeight: 1.7,
          animation: 'fadeUp 0.5s ease 0.8s both',
        }}>
          {getMotivation(streak)}
        </p>

        {/* ── BUTTON ── */}
        <button
          type="button"
          className="font-playfair"
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: '32px',
            padding: '16px 48px',
            fontSize: '17px', fontWeight: 600,
            color: '#fff',
            background: 'linear-gradient(135deg, #163026, #2d5a42)',
            border: 'none', borderRadius: '12px', cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(15,35,24,0.3)',
            animation: 'fadeUp 0.5s ease 1s both',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.38)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,35,24,0.3)'; }}
        >
          À demain إن شاء الله
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
      <p style={{
        fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
        fontSize: '10px', letterSpacing: '2px', color: '#B8962E',
        textTransform: 'uppercase', margin: '8px 0 0 0',
      }}>
        {label}
      </p>
    </div>
  );
}
