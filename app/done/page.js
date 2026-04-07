'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { adaptPlan } from '@/lib/adaptive-algorithm';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Local midnight ISO string with timezone offset, e.g. "2026-04-01T00:00:00+02:00"
function localMidnightISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(0, 0, 0, 0);
  const off = -d.getTimezoneOffset(); // minutes ahead of UTC
  const sign = off >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
  const mm = String(Math.abs(off) % 60).padStart(2, '0');
  return `${localDateStr(d)}T00:00:00${sign}${hh}:${mm}`;
}

function getMotivation(streak) {
  if (streak >= 30) return "Un mois. Tu es hafiz en devenir. Allah facilite ton chemin.";
  if (streak >= 14) return "Deux semaines. Le Coran s\u2019installe dans ton c\u0153ur.";
  if (streak >= 7)  return "Une semaine compl\u00e8te. Tu es en train de devenir quelqu\u2019un de diff\u00e9rent.";
  if (streak >= 3)  return "Tu construis quelque chose de solide. Continue.";
  if (streak >= 2)  return "Deux jours de suite. L\u2019habitude commence \u00e0 se former.";
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
  const [plan, setPlan]                   = useState(null);
  const [todayMemorized, setTodayMemorized] = useState(0);
  const [todayRevised, setTodayRevised]   = useState(0);
  const [dueCount, setDueCount]           = useState(0);
  const [tomorrowCount, setTomorrowCount] = useState(0);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !authUser) { router.push('/login'); return; }

      // Lance adaptPlan en arrière-plan sans bloquer l'affichage
      adaptPlan(supabase, authUser.id).catch(e => console.error('adaptPlan:', e));

      const startToday    = localMidnightISO(0);
      const startTomorrow = localMidnightISO(1);

      // Fetch all data in parallel
      const [
        { data: progRows },
        { data: planRows },
        { data: memorizedItems },
        { data: revisedItems },
        { data: dueItems },
        { data: tomorrowItems },
      ] = await Promise.all([
        supabase.from('progress').select('*').eq('user_id', authUser.id)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('plans').select('ayah_per_day').eq('user_id', authUser.id)
          .order('created_at', { ascending: false }).limit(1),
        // Items created today in local time = memorized this session
        supabase.from('review_items').select('id')
          .eq('user_id', authUser.id)
          .gte('created_at', startToday)
          .lt('created_at', startTomorrow),
        // Items revised today = updated today AND created before today (excludes newly memorized)
        supabase.from('review_items').select('id')
          .eq('user_id', authUser.id)
          .gte('updated_at', startToday)
          .lt('updated_at', startTomorrow)
          .lt('created_at', startToday)
          .gt('review_cycle', 1),
        // Due items: next_review <= today, not mastered, NOT created today (would be empty in /revision)
        supabase.from('review_items').select('id')
          .eq('user_id', authUser.id)
          .eq('mastered', false)
          .lte('next_review', localDateStr())
          .lt('created_at', startToday),
        // Tomorrow's due items (for tension message)
        supabase.from('review_items').select('id')
          .eq('user_id', authUser.id)
          .eq('mastered', false)
          .lte('next_review', localDateStr(new Date(Date.now() + 86400000))),
      ]);

      const prog = Array.isArray(progRows) ? progRows[0] : progRows;
      const planData = Array.isArray(planRows) ? planRows[0] : planRows;
      setProgress(prog ?? null);
      setPlan(planData ?? null);
      setTodayMemorized(memorizedItems?.length ?? 0);
      setTodayRevised(revisedItems?.length ?? 0);
      setDueCount(dueItems?.length ?? 0);
      setTomorrowCount(tomorrowItems?.length ?? 0);

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
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', position: 'relative', overflow: 'visible' }}>
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
          fontSize: 'clamp(26px, 7vw, 38px)', fontWeight: 600, color: '#163026',
          margin: '24px 0 0 0', lineHeight: 1.2,
          animation: 'fadeUp 0.5s ease 0.5s both',
        }}>
          {todayMemorized > 0 ? 'Session terminée.' : 'Révision terminée.'}
        </h1>

        {/* ── Sub-label: +X ayats or X révisés ── */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '15px',
          color: todayMemorized > 0 ? '#2d5a42' : '#6B6357',
          fontWeight: 500, margin: '8px 0 0 0',
          animation: 'fadeUp 0.5s ease 0.55s both',
        }}>
          {todayMemorized > 0
            ? `+${todayMemorized} ayat${todayMemorized > 1 ? 's' : ''} mémorisé${todayMemorized > 1 ? 's' : ''} aujourd’hui`
            : todayRevised > 0
              ? `${todayRevised} ayat${todayRevised > 1 ? 's' : ''} révisé${todayRevised > 1 ? 's' : ''} aujourd’hui`
              : null
          }
        </p>

        {/* ── STREAK ── */}
        <p className="font-playfair" style={{
          fontSize: '28px', fontWeight: 700, color: '#B8962E',
          margin: '8px 0 0 0',
          animation: 'fadeUp 0.5s ease 0.6s both',
        }}>
          {streak === 0
            ? 'Continue demain pour démarrer ton streak.'
            : streak === 1
            ? '🔥 1er jour !'
            : `🔥 ${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''}`
          }
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

        {/* ── COACH MESSAGE ── */}
        <p className="font-playfair" style={{
          fontSize: '17px', fontStyle: 'italic', color: '#6B6357',
          maxWidth: '380px', margin: '20px auto 0', lineHeight: 1.7,
          animation: 'fadeUp 0.5s ease 0.8s both',
        }}>
          {getMotivation(streak)}
        </p>

        {dueCount > 0 && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026',
            maxWidth: '380px', margin: '16px auto 0', lineHeight: 1.6,
            animation: 'fadeUp 0.5s ease 0.85s both',
          }}>
            Pour consolider ta mémorisation, je te recommande de réviser maintenant.
          </p>
        )}

        {/* ── DUE COUNT ── */}
        <div style={{
          margin: '20px auto 0', maxWidth: '380px',
          padding: '14px 20px',
          backgroundColor: dueCount > 0 ? '#FFFFFF' : 'rgba(22,48,38,0.04)',
          border: `1px solid ${dueCount > 0 ? '#E2D9CC' : 'transparent'}`,
          borderRadius: '12px',
          animation: 'fadeUp 0.5s ease 0.9s both',
        }}>
          {dueCount > 0 ? (
            <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026', fontWeight: 500 }}>
              Tu as <strong>{dueCount} ayat{dueCount > 1 ? 's' : ''}</strong> à réviser aujourd’hui.
            </p>
          ) : (
            <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#2d5a42', fontWeight: 500 }}>
              Tu es à jour aujourd’hui. Excellent travail.
            </p>
          )}
        </div>

        {/* ── TENSION DEMAIN ── */}
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#A09890',
          fontStyle: 'italic', textAlign: 'center', maxWidth: '340px',
          margin: '16px auto 0', lineHeight: 1.6,
          animation: 'fadeUp 0.5s ease 0.95s both',
        }}>
          {tomorrowCount > 0
            ? `Demain : ${tomorrowCount} ayat${tomorrowCount > 1 ? 's' : ''} à réviser`
            : todayMemorized > 0
              ? 'Si tu reviens demain, tu consolides ta mémorisation.'
              : 'Continue demain pour garder ta progression.'
          }
        </p>

        {/* ── BUTTONS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px', animation: 'fadeUp 0.5s ease 1s both' }}>
          {dueCount > 0 ? (
            <>
              <button
                type="button"
                className="font-playfair"
                onClick={() => router.push('/revision')}
                style={{
                  width: '100%', padding: '16px',
                  fontSize: '17px', fontWeight: 600, color: '#fff',
                  background: 'linear-gradient(135deg, #163026, #2d5a42)',
                  border: 'none', borderRadius: '12px', cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(15,35,24,0.3)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.38)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,35,24,0.3)'; }}
              >
                Commencer la révision
              </button>
              <button
                type="button"
                className="font-playfair"
                onClick={() => router.push('/dashboard')}
                style={{
                  width: '100%', padding: '13px',
                  fontSize: '15px', fontWeight: 500,
                  color: '#6B6357', background: 'transparent',
                  border: '1px solid #D4CCC2', borderRadius: '12px', cursor: 'pointer',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#163026'; e.currentTarget.style.color = '#163026'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D4CCC2'; e.currentTarget.style.color = '#6B6357'; }}
              >
                Je reviendrai plus tard
              </button>
            </>
          ) : (
            <button
              type="button"
              className="font-playfair"
              onClick={() => router.push('/dashboard')}
              style={{
                width: '100%', padding: '16px',
                fontSize: '17px', fontWeight: 600, color: '#fff',
                background: 'linear-gradient(135deg, #163026, #2d5a42)',
                border: 'none', borderRadius: '12px', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(15,35,24,0.3)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,35,24,0.38)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,35,24,0.3)'; }}
            >
              Retour au tableau de bord
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

function StatCol({ value, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p className="font-playfair" style={{ fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 700, color: '#163026', margin: 0, lineHeight: 1 }}>
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
