'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  'Le Coran complet — 114 sourates, 6236 ayats',
  'Sessions illimitées — avance sans interruption',
  'Révisions complètes — garde ton rythme chaque jour',
  'Accès Premium continu — ton parcours ne s\'arrête pas',
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E6',
      padding: '48px 16px 64px',
      maxWidth: '480px',
      marginInline: 'auto',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* ── SECTION 1 — HEADER ── */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: '32px',
        margin: '0 0 32px 0',
        textAlign: 'center',
      }}>
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

        <p className="font-playfair" style={{
          fontSize: '52px', fontWeight: 700, color: '#163026',
          margin: '0 0 6px 0', lineHeight: 1,
        }}>
          2,99€
        </p>
        <p style={{
          fontSize: '14px', color: '#6B6357',
          margin: '0 0 24px 0',
        }}>
          par mois — annulable à tout moment
        </p>

        <CTAButton loading={loading} onClick={handleSubscribe}>
          {loading ? 'Redirection…' : 'Commencer mon Hifz →'}
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
      <div style={{ marginBottom: '32px' }}>
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

      {/* ── SECTION 4 — CITATION ── */}
      <div style={{
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

      {/* ── SECTION 5 — RÉASSURANCE ── */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {REASSURANCES.map((line, i) => (
          <p key={i} style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357',
            padding: '8px 0', margin: 0,
          }}>
            {line}
          </p>
        ))}
      </div>

      {/* ── SECTION 6 — CTA FINAL ── */}
      <div style={{ textAlign: 'center' }}>
        <CTAButton loading={loading} onClick={handleSubscribe}>
          {loading ? 'Redirection…' : 'Commencer mon Hifz →'}
        </CTAButton>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#999',
          marginTop: '12px',
        }}>
          En continuant tu acceptes nos conditions d&apos;utilisation
        </p>
      </div>

    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense>
      <PremiumPageInner />
    </Suspense>
  );
}
