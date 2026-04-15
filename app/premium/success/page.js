'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PremiumSuccessPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let tries = 0;
    const MAX = 15; // poll up to ~15s

    async function poll() {
      tries++;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles').select('is_premium').eq('id', user.id).maybeSingle();
      if (profile?.is_premium === true) {
        setConfirmed(true);
        return;
      }
      if (tries < MAX) setTimeout(poll, 1000);
      else setConfirmed(true); // unblock after timeout regardless
    }

    poll();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #163026, #2d5a42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', color: '#fff', marginBottom: '24px',
      }}>
        {confirmed ? '✓' : '⏳'}
      </div>

      <h1 className="font-playfair" style={{
        fontSize: 'clamp(26px, 7vw, 36px)',
        fontWeight: 700,
        color: '#163026',
        margin: '0 0 12px 0',
        lineHeight: 1.25,
      }}>
        {confirmed ? 'Premium activé' : 'Activation en cours…'}
      </h1>

      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '16px',
        color: '#6B6357',
        lineHeight: 1.7,
        maxWidth: '380px',
        margin: '0 0 32px 0',
      }}>
        {confirmed
          ? 'Ton accès Premium est maintenant actif. Continue ta mémorisation sans limite إن شاء الله.'
          : 'Nous confirmons ton paiement avec Stripe, cela prend quelques secondes…'}
      </p>

      <button
        type="button"
        className="font-playfair"
        disabled={!confirmed}
        onClick={() => router.push('/session')}
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '16px',
          fontSize: '17px',
          fontWeight: 600,
          color: '#fff',
          background: 'linear-gradient(135deg, #163026, #2d5a42)',
          border: 'none',
          borderRadius: '12px',
          cursor: confirmed ? 'pointer' : 'wait',
          opacity: confirmed ? 1 : 0.5,
          boxShadow: '0 8px 24px rgba(15,35,24,0.3)',
          marginBottom: '12px',
          transition: 'opacity 0.3s',
        }}
      >
        Lancer ma session
      </button>

      <button
        type="button"
        disabled={!confirmed}
        onClick={() => router.push('/dashboard')}
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '13px',
          fontSize: '15px',
          fontWeight: 500,
          color: '#6B6357',
          background: 'transparent',
          border: '1px solid #D4CCC2',
          borderRadius: '12px',
          cursor: confirmed ? 'pointer' : 'wait',
          opacity: confirmed ? 1 : 0.5,
          fontFamily: 'DM Sans, sans-serif',
          transition: 'opacity 0.3s',
        }}
      >
        Retour au dashboard
      </button>
    </div>
  );
}
