'use client';

import { useRouter } from 'next/navigation';

export default function PremiumSuccessPage() {
  const router = useRouter();

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
        ✓
      </div>

      <h1 className="font-playfair" style={{
        fontSize: 'clamp(26px, 7vw, 36px)',
        fontWeight: 700,
        color: '#163026',
        margin: '0 0 12px 0',
        lineHeight: 1.25,
      }}>
        Premium activé
      </h1>

      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '16px',
        color: '#6B6357',
        lineHeight: 1.7,
        maxWidth: '380px',
        margin: '0 0 32px 0',
      }}>
        Ton accès Premium est maintenant actif. Continue ta mémorisation sans limite إن شاء الله.
      </p>

      <button
        type="button"
        className="font-playfair"
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
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(15,35,24,0.3)',
          marginBottom: '12px',
        }}
      >
        Lancer ma session
      </button>

      <button
        type="button"
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
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Retour au dashboard
      </button>
    </div>
  );
}
