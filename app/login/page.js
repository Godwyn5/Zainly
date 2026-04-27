'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRoutingRef = useRef(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);
  const [forgotMode, setForgotMode] = useState(searchParams.get('forgot') === '1');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  async function routeAfterAuth(user) {
    if (isRoutingRef.current) return;
    isRoutingRef.current = true;
    const { data: plans } = await supabase.from('plans').select('id').eq('user_id', user.id).limit(1);
    router.push(plans && plans.length > 0 ? '/dashboard' : '/onboarding');
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { await routeAfterAuth(user); return; }
      setTimeout(() => setPageVisible(true), 100);
    }
    checkAuth();

    // R1: Listen for SIGNED_IN after email confirmation click
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await routeAfterAuth(session.user);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleForgot(e) {
    e.preventDefault();
    if (forgotLoading) return;
    setForgotError('');

    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setForgotError('Entre ton adresse email.');
      return;
    }
    const emailParts = cleanEmail.split('@');
    if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1].includes('.')) {
      setForgotError('Entre une adresse email valide.');
      return;
    }

    setForgotLoading(true);
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://zainly-alpha.vercel.app'}/reset-password`;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
    console.log('[forgot] resetPasswordForEmail — email:', cleanEmail, '| error:', resetErr?.message ?? 'none');
    setForgotLoading(false);

    if (resetErr) {
      const m = (resetErr.message || '').toLowerCase();
      if (m.includes('rate limit') || m.includes('too many requests') || m.includes('email rate limit')) {
        setForgotError('Trop de demandes en peu de temps. Attends quelques minutes puis réessaie.');
      } else if (m.includes('user not found') || m.includes('no user') || m.includes('not found')) {
        setForgotError('Aucun compte n\u2019existe avec cet email. Crée un compte pour commencer.');
      } else {
        setForgotError('Une erreur est survenue. Vérifie ton adresse et réessaie.');
      }
      return;
    }
    setForgotSent(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      const msg = signInError.message?.toLowerCase() ?? '';
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        setError('Email ou mot de passe incorrect.');
      } else if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        setError('Vérifie ta boîte mail pour confirmer ton compte.');
      } else {
        setError('Une erreur est survenue. Réessaie.');
      }
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push('/dashboard');
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F0E6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '60px 24px 48px',
        position: 'relative',
        overflowY: 'auto',
        opacity: pageVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Calligraphie de fond */}
      <span
        className="font-amiri"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(200px, 35vw, 420px)',
          color: '#163026',
          opacity: 0.04,
          pointerEvents: 'none',
          userSelect: 'none',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          zIndex: 0,
        }}
      >
        الله
      </span>

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <p
          className="font-amiri"
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#163026',
            textAlign: 'center',
            margin: '0 0 40px 0',
          }}
        >
          Zainly
        </p>

        {/* Titre */}
        <h1
          className="font-playfair"
          style={{
            fontSize: '36px',
            fontWeight: 600,
            color: '#163026',
            textAlign: 'center',
            margin: '0 0 12px 0',
            lineHeight: 1.2,
          }}
        >
          Bon retour.
        </h1>

        {/* Sous-titre */}
        <p
          className="font-playfair"
          style={{
            fontSize: '16px',
            fontStyle: 'italic',
            color: '#6B6357',
            textAlign: 'center',
            margin: '0 0 40px 0',
            lineHeight: 1.6,
          }}
        >
          Continue là où tu t&apos;es arrêté.
        </p>

        {forgotMode ? (
          /* ── Forgot password mode ── */
          <div>
            {forgotSent ? (
              <p style={{ fontSize: '14px', color: '#163026', backgroundColor: 'rgba(22,48,38,0.06)', borderRadius: '8px', padding: '12px 16px', textAlign: 'center', margin: 0 }}>
                Lien envoyé. Vérifie ta boîte mail, y compris les spams.
              </p>
            ) : (
              <form onSubmit={handleForgot} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="ton@email.com"
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = '#163026')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2D9CC')}
                />
                <button type="submit" disabled={forgotLoading} className="font-playfair" style={{ width: '100%', padding: '16px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '12px', cursor: forgotLoading ? 'not-allowed' : 'pointer', opacity: forgotLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                  {forgotLoading ? 'Envoi du lien...' : 'Envoyer le lien'}
                </button>
                {forgotError && (
                  <div style={{ fontSize: '13px', color: '#c0392b', backgroundColor: 'rgba(192,57,43,0.06)', borderRadius: '10px', padding: '10px 14px', margin: 0 }}>
                    <p style={{ margin: 0 }}>{forgotError}</p>
                    {forgotError.includes('Crée un compte') && (
                      <Link href="/register" style={{ color: '#c0392b', fontWeight: 700, textDecoration: 'underline', display: 'inline-block', marginTop: '6px' }}>Créer un compte →</Link>
                    )}
                  </div>
                )}
              </form>
            )}
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#6B6357' }}>
              <button type="button" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }} style={{ background: 'none', border: 'none', color: '#163026', fontWeight: 500, textDecoration: 'underline', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
                Retour à la connexion
              </button>
            </p>
          </div>
        ) : (
          /* ── Normal login mode ── */
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email */}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#163026')}
              onBlur={(e) => (e.target.style.borderColor = '#E2D9CC')}
            />

            {/* Mot de passe */}
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ton mot de passe"
                style={{ ...inputStyle, paddingRight: '48px' }}
                onFocus={(e) => (e.target.style.borderColor = '#163026')}
                onBlur={(e) => (e.target.style.borderColor = '#E2D9CC')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '12px',
                  color: '#6B6357',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: '44px',
                  minHeight: '44px',
                  justifyContent: 'center',
                }}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff /> : <EyeOn />}
              </button>
            </div>

            {/* Mot de passe oublié */}
            <p style={{ margin: '-8px 0 0', textAlign: 'right', fontSize: '13px' }}>
              <button type="button" onClick={() => setForgotMode(true)} style={{ background: 'none', border: 'none', color: '#6B6357', cursor: 'pointer', fontSize: '13px', padding: 0, textDecoration: 'underline' }}>
                Mot de passe oublié ?
              </button>
            </p>

            {/* Erreur */}
            {error && (
              <p style={{ fontSize: '13px', color: '#c0392b', margin: 0 }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="font-playfair"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '17px',
                fontWeight: 600,
                backgroundColor: '#163026',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.opacity = '1'; }}
            >
              {loading ? 'Chargement...' : 'Se connecter →'}
            </button>
          </form>
        )}

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6B6357' }}>
          Pas encore de compte ?{' '}
          <Link
            href="/register"
            style={{ color: '#163026', fontWeight: 500, textDecoration: 'underline' }}
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  fontSize: '16px',
  border: '1.5px solid #E2D9CC',
  borderRadius: '10px',
  backgroundColor: '#FFFFFF',
  color: '#163026',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const EyeOn = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
