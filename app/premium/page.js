'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pu-d1 { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.0s both; }
.pu-d2 { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.12s both; }
.pu-d3 { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.22s both; }
.pu-d4 { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.32s both; }
.pu-d5 { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.42s both; }
.pu-d6 { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) 0.52s both; }

.pu-cta {
  transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
}
.pu-cta:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 16px 40px rgba(15,109,74,0.28);
}
.pu-cta:active:not(:disabled) {
  transform: scale(0.99);
}
.pu-cta:disabled { opacity: 0.68; cursor: wait; }

.pu-skip:hover { color: #6B7280 !important; }
`;

const FEATURES = [
  { icon: '📖', text: "L'accès à tout le Coran" },
  { icon: '🔁', text: 'Des sessions de mémorisation illimitées' },
  { icon: '✦',  text: 'Toutes tes révisions pour avancer avec régularité' },
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

  const heroTitle = isBlocked
    ? "Tu as atteint la limite gratuite"
    : "Tu es bien lancé. Continue sans t'arrêter.";

  const heroSub = isBlocked
    ? "Tu as utilisé toutes tes sessions gratuites. Passe à Premium pour reprendre ton hifz là où tu t'es arrêté, avec la même régularité."
    : "Tu as déjà commencé à mémoriser avec Zainly. Passe à Premium pour continuer ton hifz sans limite et garder ton rythme.";

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F4EC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 20px 72px',
        fontFamily: "'Inter', 'DM Sans', sans-serif",
      }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>

          {/* ── WORDMARK ── */}
          <div className="pu-d1" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '28px',
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: '#C9A227',
              }}>Zainly</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(26px, 7vw, 34px)',
              fontWeight: 800,
              color: '#0D1F17',
              lineHeight: 1.18,
              letterSpacing: '-0.6px',
              margin: '0 0 18px 0',
            }}>
              {heroTitle}
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#6B7280',
              lineHeight: 1.8,
              margin: 0,
              maxWidth: '380px',
              marginInline: 'auto',
              fontWeight: 400,
            }}>
              {heroSub}
            </p>
          </div>

          {/* ── PREMIUM CARD ── */}
          <div className="pu-d2" style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(201,162,39,0.18)',
            borderRadius: '24px',
            boxShadow: '0 2px 0 rgba(201,162,39,0.12), 0 8px 40px rgba(13,31,23,0.07)',
            padding: '32px 28px 28px',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* gold top bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #C9A227 0%, #E8C84A 50%, #C9A227 100%)',
              borderRadius: '24px 24px 0 0',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px' }}>
              <p style={{
                fontWeight: 700,
                fontSize: '17px',
                color: '#0D1F17',
                letterSpacing: '-0.2px',
                lineHeight: 1.35,
                margin: 0,
              }}>
                Avec Premium,<br/>tu débloques :
              </p>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                color: '#9A6F00',
                background: 'linear-gradient(135deg, #FDF6E3, #FAF0CC)',
                border: '1px solid rgba(201,162,39,0.3)',
                borderRadius: '8px',
                padding: '4px 10px',
                flexShrink: 0,
                marginTop: '2px',
              }}>
                Premium
              </span>
            </div>

            {FEATURES.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 0',
                borderTop: '1px solid #F5F0E8',
              }}>
                <div style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: '#F0F7F3',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: '15px', color: '#111827', lineHeight: 1.5, fontWeight: 450 }}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>

          {/* ── COMPARAISON ── */}
          <div className="pu-d3" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '32px',
          }}>
            <div style={{
              background: '#EFEFF0',
              borderRadius: '16px',
              padding: '20px 16px',
              opacity: 0.7,
            }}>
              <p style={{
                fontSize: '10px', fontWeight: 700, color: '#9CA3AF',
                textTransform: 'uppercase', letterSpacing: '1.2px',
                margin: '0 0 10px 0',
              }}>
                Sans Premium
              </p>
              <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
                "Tu avances… puis tu t&apos;arrêtes."
              </p>
            </div>
            <div style={{
              background: '#FFFFFF',
              border: '1.5px solid rgba(15,109,74,0.2)',
              borderRadius: '16px',
              padding: '20px 16px',
              boxShadow: '0 4px 16px rgba(15,109,74,0.08)',
            }}>
              <p style={{
                fontSize: '10px', fontWeight: 700, color: '#0F6D4A',
                textTransform: 'uppercase', letterSpacing: '1.2px',
                margin: '0 0 10px 0',
              }}>
                Avec Premium
              </p>
              <p style={{ fontSize: '14px', color: '#0D1F17', lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
                "Tu continues chaque jour, sans interruption."
              </p>
            </div>
          </div>

          {/* ── PRIX ── */}
          <div className="pu-d4" style={{
            textAlign: 'center',
            marginBottom: '32px',
            padding: '28px 0 24px',
            borderTop: '1px solid #EDE8DF',
            borderBottom: '1px solid #EDE8DF',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '2px',
              marginBottom: '8px',
            }}>
              <span style={{
                fontSize: '17px', fontWeight: 700, color: '#6B7280',
                paddingTop: '10px', lineHeight: 1,
              }}>€</span>
              <span style={{
                fontSize: '56px', fontWeight: 800, color: '#0D1F17',
                letterSpacing: '-2px', lineHeight: 1,
              }}>2,99</span>
              <span style={{
                fontSize: '14px', color: '#9CA3AF', fontWeight: 500,
                paddingTop: '14px', lineHeight: 1,
              }}>/mois</span>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F0F7F3',
              borderRadius: '99px',
              padding: '5px 14px',
            }}>
              <span style={{ color: '#0F6D4A', fontSize: '12px' }}>✓</span>
              <span style={{ fontSize: '12px', color: '#0F6D4A', fontWeight: 600 }}>Résiliable à tout moment</span>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="pu-d5">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="pu-cta"
              style={{
                width: '100%',
                height: '56px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(160deg, #116B49 0%, #0D5C3E 100%)',
                border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(13,92,62,0.28), inset 0 1px 0 rgba(255,255,255,0.1)',
                marginBottom: '12px',
                letterSpacing: '-0.1px',
              }}
            >
              {loading ? 'Redirection…' : 'Continuer avec Premium'}
            </button>

            {checkoutError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '10px',
              }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 500 }}>
                  Impossible de lancer le paiement. Réessaie.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="pu-skip"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                fontSize: '14px',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '10px 0',
                textAlign: 'center',
                fontWeight: 500,
                transition: 'color 0.15s ease',
              }}
            >
              Pas maintenant
            </button>
          </div>

          {/* ── CONFIANCE ── */}
          <div className="pu-d6" style={{
            textAlign: 'center',
            marginTop: '36px',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              marginBottom: '14px',
            }}>
              <svg width="14" height="17" viewBox="0 0 14 17" fill="none" style={{ flexShrink: 0 }}>
                <path d="M7 0L0 3v5.5C0 12.64 3.03 15.95 7 17c3.97-1.05 7-4.36 7-8.5V3L7 0z" fill="#C9A227" opacity="0.35"/>
                <path d="M4.5 8.5l2 2 3.5-3.5" stroke="#0F6D4A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
                Paiement sécurisé avec Stripe
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#B0AA9E', margin: 0, lineHeight: 1.7, maxWidth: '320px', marginInline: 'auto' }}>
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
