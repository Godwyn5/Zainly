'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired]   = useState(false);

  // Supabase sends the recovery token as a hash fragment — listen for the
  // PASSWORD_RECOVERY event so the session is established before we try to update.
  useEffect(() => {
    let resolved = false;

    // If the user already has a valid recovery session (e.g. page refresh), mark ready immediately.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { resolved = true; setSessionReady(true); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        resolved = true;
        setSessionReady(true);
      }
    });

    // Timeout: if session not established within 9s, link is likely expired/invalid
    const timer = setTimeout(() => {
      if (!resolved) setLinkExpired(true);
    }, 9000);

    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateErr) {
      setError(updateErr.message || 'Une erreur est survenue. Réessaie.');
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/login'), 3000);
  }

  if (linkExpired) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#F5F0E6',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '16px', padding: '32px', textAlign: 'center',
      }}>
        <span style={{ fontSize: '48px' }}>⏱</span>
        <h1 className="font-playfair" style={{ fontSize: '24px', fontWeight: 600, color: '#163026', margin: 0, lineHeight: 1.3 }}>
          Lien invalide ou expiré.
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: 0, maxWidth: '340px', lineHeight: 1.6 }}>
          Ce lien de réinitialisation n&apos;est plus valide. Demande-en un nouveau.
        </p>
        <button
          type="button"
          onClick={() => router.push('/login?forgot=1')}
          className="font-playfair"
          style={{ marginTop: '8px', padding: '14px 36px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' }}
        >
          Redemander un lien
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          style={{ background: 'none', border: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', cursor: 'pointer', textDecoration: 'underline', padding: '4px' }}
        >
          Retour à la connexion
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#F5F0E6',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '16px', padding: '32px', textAlign: 'center',
      }}>
        <span style={{ fontSize: '56px' }}>✓</span>
        <h1 className="font-playfair" style={{ fontSize: '28px', fontWeight: 600, color: '#163026', margin: 0 }}>
          Mot de passe mis à jour.
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: 0 }}>
          Tu vas être redirigé vers la connexion…
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <p className="font-amiri" style={{ fontSize: '28px', fontWeight: 700, color: '#163026', textAlign: 'center', margin: '0 0 32px 0' }}>
          Zainly
        </p>

        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2D9CC', borderRadius: '20px', padding: '36px 32px' }}>
          <h1 className="font-playfair" style={{ fontSize: '24px', fontWeight: 600, color: '#163026', margin: '0 0 8px 0', textAlign: 'center' }}>
            Nouveau mot de passe
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', textAlign: 'center', margin: '0 0 28px 0', lineHeight: 1.5 }}>
            Choisis un nouveau mot de passe pour ton compte.
          </p>

          {!sessionReady && (
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#B8962E', textAlign: 'center', margin: '0 0 16px 0' }}>
              Validation du lien en cours…
            </p>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: '#163026', marginBottom: '6px' }}>
                Nouveau mot de passe
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={!sessionReady}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '13px 14px', fontSize: '15px',
                  border: '1.5px solid #E2D9CC', borderRadius: '10px',
                  backgroundColor: sessionReady ? '#FFFFFF' : '#F5F0E6',
                  color: '#163026', outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: '#163026', marginBottom: '6px' }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Répète le mot de passe"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                disabled={!sessionReady}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '13px 14px', fontSize: '15px',
                  border: '1.5px solid #E2D9CC', borderRadius: '10px',
                  backgroundColor: sessionReady ? '#FFFFFF' : '#F5F0E6',
                  color: '#163026', outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>

            {error && (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#c0392b', margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !sessionReady}
              className="font-playfair"
              style={{
                marginTop: '8px',
                width: '100%', padding: '14px',
                fontSize: '16px', fontWeight: 600,
                backgroundColor: (loading || !sessionReady) ? '#E2D9CC' : '#163026',
                color: (loading || !sessionReady) ? '#A09890' : '#FFFFFF',
                border: 'none', borderRadius: '12px',
                cursor: (loading || !sessionReady) ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (loading || !sessionReady) ? 'none' : '0 8px 24px rgba(22,48,38,0.2)',
              }}
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </div>

        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => router.push('/login')}
            style={{ background: 'none', border: 'none', color: '#6B6357', cursor: 'pointer', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline', padding: 0 }}
          >
            Retour à la connexion
          </button>
        </p>
      </div>
    </div>
  );
}
