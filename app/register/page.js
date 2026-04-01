'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [prenomError, setPrenomError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageVisible, setPageVisible] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { router.push('/dashboard'); return; }
      setTimeout(() => setPageVisible(true), 100);
    }
    checkAuth();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setPrenomError('');
    if (!prenom.trim()) {
      setPrenomError('Le prénom est obligatoire.');
      return;
    }
    // Client-side validation
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.');
      return;
    }
    const emailParts = email.split('@');
    if (emailParts.length !== 2 || !emailParts[1].includes('.')) {
      setError('Adresse email invalide.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { prenom } },
    });
    if (signUpError) {
      const msg = signUpError.message || '';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('email already')) {
        setError('already_registered');
      } else if (msg.toLowerCase().includes('password')) {
        setError('Le mot de passe doit faire au moins 8 caractères.');
      } else {
        setError(msg);
      }
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push('/onboarding');
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
          Commence ton Hifz.
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
          Crée ton compte pour sauvegarder ta progression.
        </p>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Prénom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              type="text"
              required
              value={prenom}
              onChange={(e) => { setPrenom(e.target.value); if (prenomError) setPrenomError(''); }}
              placeholder="Ton prénom"
              style={{ ...inputStyle, borderColor: prenomError ? '#c0392b' : '#E2D9CC' }}
              onFocus={(e) => (e.target.style.borderColor = prenomError ? '#c0392b' : '#163026')}
              onBlur={(e) => (e.target.style.borderColor = prenomError ? '#c0392b' : '#E2D9CC')}
            />
            {prenomError && (
              <p style={{ fontSize: '13px', color: '#c0392b', margin: 0 }}>{prenomError}</p>
            )}
          </div>

          {/* Email */}
          <input
            type="email"
            required
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crée un mot de passe"
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
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#6B6357', margin: '4px 0 0 2px' }}>8 caractères minimum</p>

          {/* Erreur */}
          {error && (
            <div style={{ fontSize: '13px', color: '#c0392b', margin: 0 }}>
              {error === 'already_registered' ? (
                <>
                  <p style={{ margin: '0 0 4px 0' }}>Un compte existe déjà avec cet email. Connecte-toi plutôt.</p>
                  <Link href="/login" style={{ color: '#c0392b', fontWeight: 600, textDecoration: 'underline' }}>Se connecter</Link>
                </>
              ) : (
                <p style={{ margin: 0 }}>{error}</p>
              )}
            </div>
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
            {loading ? 'Chargement...' : 'Créer mon compte →'}
          </button>
        </form>

        {/* Login link */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#6B6357' }}>
          Déjà un compte ?{' '}
          <Link
            href="/login"
            style={{ color: '#163026', fontWeight: 500, textDecoration: 'underline' }}
          >
            Connexion
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
