'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LegalFooter } from '@/components/LegalLayout';

const FEATURES = [
  'Le Coran complet — toutes les sourates accessibles, sans restriction',
  'Sessions illimitées — mémorise sans être bloqué',
  'Révisions quotidiennes — ne perds plus ce que tu apprends',
  'Accès aux futures améliorations — ton hifz évolue avec Zainly',
];

const REASSURANCES = [
  '✓ Sans engagement — annule quand tu veux',
  '✓ Paiement sécurisé par Stripe',
  '✓ Moins d\'un café par mois',
];

function CTAButton({ loading, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="font-playfair"
      style={{
        width: '100%',
        padding: '18px',
        fontSize: '17px',
        fontWeight: 600,
        color: '#fff',
        background: 'linear-gradient(135deg, #163026, #1e4035)',
        border: 'none',
        borderRadius: '14px',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.75 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function PremiumPageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [plan, setPlan] = useState('monthly');  // 'monthly' | 'yearly'

  useEffect(() => {
    supabase.from('profiles')
      .select('is_premium')
      .then(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles').select('is_premium').eq('id', user.id).maybeSingle();
        if (profile?.is_premium === true) router.replace('/dashboard');
      });
  }, [router]);

  async function handleSubscribe() {
    if (loading) return;
    setLoading(true);
    setCheckoutError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push('/login'); return; }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setCheckoutError('Impossible de lancer le paiement. Réessaie.');
        setLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setCheckoutError('Impossible de lancer le paiement. Réessaie.');
      setLoading(false);
    }
  }

  return (
    <>
    <style>{`
      @keyframes pw-fade-up {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .pw-s1 { animation: pw-fade-up 0.5s ease-out 0.05s both; }
      .pw-s2 { animation: pw-fade-up 0.5s ease-out 0.15s both; }
      .pw-s3 { animation: pw-fade-up 0.5s ease-out 0.25s both; }
      .pw-s4 { animation: pw-fade-up 0.5s ease-out 0.35s both; }
      .pw-s5 { animation: pw-fade-up 0.5s ease-out 0.43s both; }
      .pw-s6 { animation: pw-fade-up 0.5s ease-out 0.50s both; }
      .pw-s7 { animation: pw-fade-up 0.5s ease-out 0.57s both; }
      @media (max-width: 400px) {
        .pw-compare-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E6',
      padding: '48px 16px 64px',
      maxWidth: '480px',
      marginInline: 'auto',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* ── SECTION 1 — HEADER ── */}
      <div className="pw-s1" style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ width: '40px', height: '2px', background: '#B8962E', margin: '0 auto 16px' }} />
        <p className="font-playfair" style={{
          fontStyle: 'italic', fontSize: '16px', color: '#B8962E',
          margin: '0 0 12px 0',
        }}>
          Devenir Hafiz
        </p>
        <h1 className="font-playfair" style={{
          fontSize: '32px', fontWeight: 700, color: '#163026',
          lineHeight: 1.2, margin: '0 0 14px 0',
        }}>
          Le Coran entier. Pour toi.
        </h1>
        <p style={{
          fontSize: '15px', color: '#6B6357', lineHeight: 1.7,
          maxWidth: '300px', marginInline: 'auto', margin: '0 auto',
        }}>
          Tu as fait le premier pas. Zainly t&apos;accompagne jusqu&apos;au bout.
        </p>
      </div>

      {/* ── SECTION 2 — CARTE PRIX ── */}
      <div className="pw-s2" style={{
        backgroundColor: '#fff',
        borderRadius: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px',
        margin: '0 0 32px 0',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{
            display: 'inline-block',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '2px',
            color: '#B8962E',
            background: 'rgba(184,150,46,0.12)',
            borderRadius: '20px',
            padding: '6px 16px',
            marginBottom: '16px',
          }}>
            PREMIUM
          </span>

          {/* Toggle mensuel / annuel */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#F5F0E6',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '24px',
            gap: '4px',
          }}>
          {[['monthly', 'Mensuel'], ['yearly', 'Annuel']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPlan(val)}
              style={{
                padding: '8px 20px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                fontWeight: plan === val ? 700 : 500,
                color: plan === val ? '#163026' : '#A09890',
                backgroundColor: plan === val ? '#fff' : 'transparent',
                border: 'none',
                borderRadius: '9px',
                cursor: 'pointer',
                boxShadow: plan === val ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.18s ease',
                position: 'relative',
              }}
            >
              {label}
              {val === 'yearly' && (
                <span style={{
                  position: 'absolute', top: '-8px', right: '-6px',
                  backgroundColor: '#163026', color: '#B8962E',
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
                  padding: '2px 5px', borderRadius: '6px',
                }}>
                  -30%
                </span>
              )}
            </button>
          ))}
          </div>
        </div>

        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '52px', fontWeight: 700, color: '#163026',
          margin: '0 0 4px 0', lineHeight: 1, letterSpacing: '-1px',
          transition: 'opacity 0.15s',
        }}>
          {plan === 'monthly' ? '2,99€' : '24,99€'}
        </p>
        <p style={{
          fontSize: '14px', color: '#6B6357',
          margin: '0 0 4px 0',
        }}>
          {plan === 'monthly' ? 'par mois — annulable à tout moment' : 'par an — annulable à tout moment'}
        </p>
        {plan === 'yearly' && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px',
            color: '#2d5a42', fontWeight: 600,
            margin: '0 0 20px 0',
          }}>
            ✨ 2 mois offerts avec l’abonnement annuel
          </p>
        )}
        {plan === 'monthly' && <div style={{ marginBottom: '20px' }} />}

        <CTAButton loading={loading} onClick={handleSubscribe}>
          {loading ? 'Redirection…' : plan === 'yearly' ? 'Commencer mon Hifz (annuel) →' : 'Commencer mon Hifz →'}
        </CTAButton>

        {checkoutError && (
          <p style={{
            fontSize: '13px', color: '#c0392b',
            marginTop: '12px', margin: '12px 0 0 0',
          }}>
            {checkoutError}
          </p>
        )}
      </div>

      {/* ── SECTION 3 — FEATURES ── */}
      <div className="pw-s3" style={{ marginBottom: '32px' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600, fontSize: '13px', color: '#B8962E',
          letterSpacing: '1.5px', textAlign: 'center',
          textTransform: 'uppercase',
          margin: '0 0 16px 0',
        }}>
          CE QUE TU DÉBLOQUES
        </p>

        {FEATURES.map((feat, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '16px 0',
            borderBottom: i < FEATURES.length - 1 ? '1px solid #E2D9CC' : 'none',
          }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: '#B8962E', flexShrink: 0 }}>◆</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '15px', color: '#163026', lineHeight: 1.5 }}>
              {feat}
            </span>
          </div>
        ))}
      </div>

      {/* ── SECTION 4 — COMPARAISON FREEMIUM / PREMIUM ── */}
      <div className="pw-s4" style={{ marginBottom: '32px' }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 600, fontSize: '13px', color: '#B8962E',
          letterSpacing: '1.5px', textAlign: 'center',
          textTransform: 'uppercase',
          margin: '0 0 16px 0',
        }}>
          Sans Premium / Avec Premium
        </p>
        <div className="pw-compare-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Colonne gratuit */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '18px 16px',
            border: '1px solid #D4CCC2',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#6B6357', margin: '0 0 12px', lineHeight: 1.4 }}>
              Tu peux commencer… mais tu es vite limité
            </p>
            {[
              '5 sessions gratuites seulement',
              'Progression restreinte',
              'Ton rythme peut s\'interrompre',
              'Difficile d\'avancer sur la durée',
            ].map((line, i) => (
              <p key={i} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B6357', margin: '0 0 8px', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, marginTop: '1px', color: '#C0392B' }}>✗</span>{line}
              </p>
            ))}
          </div>
          {/* Colonne premium */}
          <div style={{
            backgroundColor: '#163026',
            borderRadius: '16px',
            padding: '18px 16px',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: '#B8962E', margin: '0 0 12px', lineHeight: 1.4 }}>
              Tu progresses chaque jour, sans interruption
            </p>
            {[
              'Sessions illimitées',
              'Progression continue',
              'Tu gardes ton rythme',
              'Tu construis ton hifz sereinement',
            ].map((line, i) => (
              <p key={i} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '0 0 8px', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, color: '#B8962E', marginTop: '1px' }}>✓</span>{line}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 5 — CITATION ── */}
      <div className="pw-s5" style={{
        background: '#163026',
        borderRadius: '20px',
        padding: '28px',
        margin: '0 0 32px 0',
        textAlign: 'center',
      }}>
        <p className="font-playfair" style={{
          fontStyle: 'italic', fontSize: '17px', color: '#fff',
          lineHeight: 1.7, margin: '0 0 12px 0',
        }}>
          &laquo;&nbsp;Le meilleur d&apos;entre vous est celui qui apprend le Coran et l&apos;enseigne.&nbsp;&raquo;
        </p>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#B8962E',
          margin: 0,
        }}>
          — Sahih Bukhari
        </p>
      </div>

      {/* ── SECTION 6 — RÉASSURANCE ── */}
      <div className="pw-s6" style={{ textAlign: 'center', marginBottom: '32px' }}>
        {REASSURANCES.map((line, i) => (
          <p key={i} style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357',
            padding: '8px 0', margin: 0,
          }}>
            {line}
          </p>
        ))}
      </div>

      {/* ── SECTION 7 — CTA FINAL ── */}
      <div className="pw-s7" style={{ textAlign: 'center' }}>
        <CTAButton loading={loading} onClick={handleSubscribe}>
          {loading ? 'Redirection…' : 'Commencer mon Hifz →'}
        </CTAButton>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#999',
          marginTop: '12px',
        }}>
          En continuant tu acceptes nos{' '}
          <a href="/legal/terms" style={{ color: '#999', textDecoration: 'underline' }}>
            conditions d&apos;utilisation
          </a>
        </p>
      </div>

      <LegalFooter />

    </div>
    </>
  );
}

export default function PremiumPage() {
  return (
    <Suspense>
      <PremiumPageInner />
    </Suspense>
  );
}
