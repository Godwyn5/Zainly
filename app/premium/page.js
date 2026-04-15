'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CSS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.rl-fade-up   { animation: fadeUp 0.55s ease both; }
.rl-fade-in   { animation: fadeIn 0.4s ease both; }
.rl-d1 { animation-delay: 0.05s; }
.rl-d2 { animation-delay: 0.15s; }
.rl-d3 { animation-delay: 0.25s; }
.rl-d4 { animation-delay: 0.38s; }
.rl-d5 { animation-delay: 0.50s; }
.rl-d6 { animation-delay: 0.62s; }
.rl-cta:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 12px 32px rgba(15,109,74,0.32); }
.rl-cta:disabled { opacity: 0.72; cursor: wait; }
`;

const FEATURES = [
  "L'accès à tout le Coran",
  'Des sessions de mémorisation illimitées',
  'Toutes tes révisions pour avancer avec régularité',
];

function PremiumPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get('source') === 'blocked';

  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  async function handleCheckout() {
    if (loading) return;
    setLoading(true);
    setCheckoutError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push('/login'); return; }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setCheckoutError(json.error ?? 'Impossible de lancer le paiement. Réessaie.');
        setLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setCheckoutError('Impossible de lancer le paiement. Réessaie.');
      setLoading(false);
    }
  }

  const heroTitle = isBlocked
    ? 'Tu as atteint la limite gratuite'
    : 'Tu es bien lancé. Continue sans t\'arrêter.';

  const heroSub = isBlocked
    ? 'Tu as utilisé toutes tes sessions gratuites. Passe à Premium pour reprendre ton hifz là où tu t\'es arrêté.'
    : "Tu as déjà commencé à mémoriser avec Zainly. Passe à Premium pour continuer ton hifz sans limite et garder ton rythme.";

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FAF7F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '52px 20px 60px',
        fontFamily: 'Inter, DM Sans, sans-serif',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>

          {/* ── HERO ── */}
          <div className="rl-fade-up rl-d1" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{
              fontSize: 'clamp(24px, 6vw, 32px)',
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.25,
              letterSpacing: '-0.4px',
              margin: '0 0 14px 0',
            }}>
              {heroTitle}
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              lineHeight: 1.75,
              margin: 0,
              maxWidth: '420px',
              marginInline: 'auto',
            }}>
              {heroSub}
            </p>
          </div>

          {/* ── PREMIUM CARD ── */}
          <div className="rl-fade-up rl-d2" style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9E4DA',
            borderRadius: '20px',
            boxShadow: '0 4px 24px rgba(17,24,39,0.06)',
            padding: '28px 28px 24px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{
                fontWeight: 700,
                fontSize: '18px',
                color: '#111827',
                letterSpacing: '-0.2px',
              }}>
                Avec Premium, tu débloques :
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: '#C9A227',
                background: '#FDF6E3',
                border: '1px solid #E8D49A',
                borderRadius: '6px',
                padding: '3px 8px',
                flexShrink: 0,
              }}>
                Premium
              </span>
            </div>

            {FEATURES.map((feat, i) => (
              <div
                key={i}
                className={`rl-fade-up rl-d${i + 3}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  paddingBottom: i < FEATURES.length - 1 ? '14px' : 0,
                  borderBottom: i < FEATURES.length - 1 ? '1px solid #F3EFE8' : 'none',
                  marginBottom: i < FEATURES.length - 1 ? '14px' : 0,
                }}
              >
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#E8F4EE',
                  color: '#0F6D4A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '1px',
                }}>✓</span>
                <span style={{ fontSize: '15px', color: '#111827', lineHeight: 1.55 }}>{feat}</span>
              </div>
            ))}
          </div>

          {/* ── COMPARAISON ÉMOTIONNELLE ── */}
          <div className="rl-fade-up rl-d4" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '28px',
          }}>
            <div style={{
              backgroundColor: '#F3F4F6',
              borderRadius: '14px',
              padding: '18px 16px',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>
                Sans Premium
              </p>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                Tu avances… puis tu t&apos;arrêtes.
              </p>
            </div>
            <div style={{
              backgroundColor: '#F0F8F4',
              border: '1.5px solid #A7D4BE',
              borderRadius: '14px',
              padding: '18px 16px',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: '#0F6D4A', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0' }}>
                Avec Premium
              </p>
              <p style={{ fontSize: '14px', color: '#111827', lineHeight: 1.6, margin: 0 }}>
                Tu continues chaque jour, sans interruption.
              </p>
            </div>
          </div>

          {/* ── PRIX ── */}
          <div className="rl-fade-up rl-d5" style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '44px', fontWeight: 800, color: '#111827', letterSpacing: '-1px', lineHeight: 1 }}>
                2,99€
              </span>
              <span style={{ fontSize: '16px', color: '#9CA3AF', fontWeight: 500 }}>/&nbsp;mois</span>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '6px 0 0 0' }}>
              Résiliable à tout moment
            </p>
          </div>

          {/* ── CTA ── */}
          <div className="rl-fade-up rl-d6">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="rl-cta"
              style={{
                width: '100%',
                height: '52px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: '#0F6D4A',
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(15,109,74,0.22)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease',
                marginBottom: '14px',
                letterSpacing: '-0.1px',
              }}
            >
              {loading ? 'Redirection…' : 'Continuer avec Premium'}
            </button>

            {checkoutError && (
              <p style={{ fontSize: '13px', color: '#DC2626', textAlign: 'center', margin: '0 0 12px 0' }}>
                {checkoutError}
              </p>
            )}

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '8px 0',
                textAlign: 'center',
              }}
            >
              Pas maintenant
            </button>
          </div>

          {/* ── CONFIANCE ── */}
          <div style={{ textAlign: 'center', marginTop: '32px', borderTop: '1px solid #EDE9DF', paddingTop: '24px' }}>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>🔒</span> Paiement sécurisé avec Stripe
            </p>
            <p style={{ fontSize: '12px', color: '#C0BDB5', margin: 0, lineHeight: 1.6 }}>
              Zainly s&apos;améliore chaque semaine pour t&apos;aider à mémoriser avec plus de régularité.
            </p>
          </div>

        </div>
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
