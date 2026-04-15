'use client';

import { useRouter } from 'next/navigation';

export default function PremiumPage() {
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
      <span style={{ fontSize: '52px', marginBottom: '16px' }}>🕌</span>

      <h1 className="font-playfair" style={{
        fontSize: 'clamp(26px, 7vw, 36px)',
        fontWeight: 700,
        color: '#163026',
        margin: '0 0 16px 0',
        lineHeight: 1.25,
        maxWidth: '440px',
      }}>
        Tu as complété ta période d&apos;essai gratuite
      </h1>

      <p style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '16px',
        color: '#6B6357',
        lineHeight: 1.7,
        maxWidth: '420px',
        margin: '0 0 32px 0',
      }}>
        Tu as déjà mémorisé avec Zainly pendant plusieurs jours.
        Pour continuer à progresser, passe à Zainly Premium et garde ton élan إن شاء الله.
      </p>

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        boxShadow: '0 8px 40px rgba(15,35,24,0.08)',
        padding: '28px 32px',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '32px',
      }}>
        <p className="font-playfair" style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#163026',
          margin: '0 0 4px 0',
        }}>
          Zainly Premium
        </p>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: '#B8962E',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontWeight: 600,
          margin: '0 0 20px 0',
        }}>
          Accès illimité
        </p>

        {[
          'Sessions de mémorisation illimitées',
          'Révisions SRS sans restriction',
          'Statistiques avancées',
          'Notifications personnalisées',
        ].map((feat, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '12px',
            textAlign: 'left',
          }}>
            <span style={{ color: '#2d5a42', fontSize: '16px', flexShrink: 0 }}>✓</span>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#163026' }}>
              {feat}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="font-playfair"
        style={{
          width: '100%',
          maxWidth: '400px',
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
        Passer à Premium — bientôt disponible
      </button>

      <button
        type="button"
        onClick={() => router.push('/dashboard')}
        style={{
          width: '100%',
          maxWidth: '400px',
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
