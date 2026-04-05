'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

function RevealSection({ children, className = '' }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
      }}
    >
      {children}
    </div>
  );
}

const IconPlan = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="28" height="28" rx="6" stroke="#163026" strokeWidth="2"/>
    <path d="M13 20h14M13 14h8M13 26h10" stroke="#B8962E" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const IconRevision = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="13" stroke="#163026" strokeWidth="2"/>
    <path d="M20 12v8l5 3" stroke="#B8962E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconConstance = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 7l2.8 8.6H32l-7.4 5.4 2.8 8.6L20 24.2l-7.4 5.4 2.8-8.6L8 15.6h9.2L20 7z" stroke="#163026" strokeWidth="2" fill="none"/>
    <path d="M20 7l2.8 8.6H32l-7.4 5.4 2.8 8.6L20 24.2l-7.4 5.4 2.8-8.6L8 15.6h9.2L20 7z" fill="#B8962E" fillOpacity="0.15"/>
  </svg>
);

const features = [
  {
    icon: <IconPlan />,
    title: 'Un plan fait pour toi',
    desc: 'Réponds à quelques questions et reçois un programme de mémorisation adapté à ton niveau et ton emploi du temps.',
  },
  {
    icon: <IconRevision />,
    title: 'Ne jamais oublier',
    desc: "L'app te rappelle chaque jour quels versets revoir, au bon moment, pour que ta mémoire reste solide.",
  },
  {
    icon: <IconConstance />,
    title: 'La constance enfin possible',
    desc: 'Des sessions courtes et guidées chaque jour pour avancer régulièrement, sans te décourager.',
  },
];

export default function Home() {
  const [pageVisible, setPageVisible] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);

  const [newsletterError, setNewsletterError] = useState('');

  async function handleNewsletter(e) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterError('');
    const { error } = await supabase.from('waitlist').insert({ email: newsletterEmail.trim() });
    if (error) {
      const isDuplicate = error.code === '23505' || (error.message ?? '').toLowerCase().includes('duplicate');
      setNewsletterError(isDuplicate ? 'Tu es déjà inscrit(e) avec cet email.' : 'Une erreur est survenue. Réessaie.');
      return;
    }
    setNewsletterSubmitted(true);
  }

  useEffect(() => {
    setTimeout(() => setPageVisible(true), 100);
  }, []);

  useEffect(() => {
    function onScroll() { setNavScrolled(window.scrollY > 20); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#F5F0E6',
        opacity: pageVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
        minHeight: '100vh',
      }}
    >
      {/* NAVBAR */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: navScrolled ? 'rgba(245,240,230,0.92)' : 'transparent',
          backdropFilter: navScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: navScrolled ? 'blur(12px)' : 'none',
          transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease',
        }}
      >
        <span
          className="font-amiri"
          style={{ fontSize: '28px', fontWeight: 700, color: '#163026', letterSpacing: '0.01em' }}
        >
          Zainly
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <Link
            href="/login"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '14px',
              color: '#163026',
              padding: '8px 16px',
              border: '1.5px solid #163026',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Connexion
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section
        style={{
          paddingTop: 'clamp(100px, 20vw, 180px)',
          paddingBottom: '120px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        <span
          className="font-amiri"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(200px, 30vw, 380px)',
            color: '#163026',
            opacity: 0.04,
            pointerEvents: 'none',
            userSelect: 'none',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          الله
        </span>

        <RevealSection>
          <h1
            className="font-playfair"
            style={{
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 600,
              color: '#163026',
              lineHeight: 1.15,
              marginBottom: '28px',
              position: 'relative',
            }}
          >
            Mémorise. Retiens. <span style={{ color: '#B8962E' }}>Deviens.</span>
          </h1>
          <p
            className="font-playfair"
            style={{
              fontSize: 'clamp(17px, 2vw, 22px)',
              fontStyle: 'italic',
              color: '#6B6357',
              maxWidth: '640px',
              margin: '0 auto',
              lineHeight: 1.6,
              position: 'relative',
            }}
          >
            Un hafiz ne naît pas. Il se construit, un ayat à la fois.
          </p>

          <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <Link
              href="/register"
              className="font-playfair"
              style={{
                display: 'inline-block',
                padding: '16px 48px',
                fontSize: '18px',
                fontWeight: 600,
                backgroundColor: '#163026',
                color: '#FFFFFF',
                borderRadius: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 24px rgba(22, 48, 38, 0.18)',
                transition: 'opacity 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(22, 48, 38, 0.26)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(22, 48, 38, 0.18)'; }}
            >
              Commencer maintenant
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: '14px',
                color: '#6B6357',
                textDecoration: 'none',
                borderBottom: '1px solid transparent',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = '#6B6357')}
              onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
            >
              Déjà un compte ? Connexion
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* FEATURES */}
      <section style={{ paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <RevealSection>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '48px',
              justifyContent: 'center',
              maxWidth: '1000px',
              margin: '0 auto',
            }}
          >
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  flex: '1 1 240px',
                  maxWidth: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '16px',
                  padding: '32px 28px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2D9CC',
                }}
              >
                {f.icon}
                <h3
                  className="font-playfair"
                  style={{ fontSize: '20px', fontWeight: 600, color: '#163026', margin: 0 }}
                >
                  {f.title}
                </h3>
                <p style={{ fontSize: '15px', color: '#6B6357', lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* CITATION */}
      <section
        style={{
          paddingTop: '80px',
          paddingBottom: '80px',
          paddingLeft: '24px',
          paddingRight: '24px',
          textAlign: 'center',
          borderTop: '1px solid #E2D9CC',
          borderBottom: '1px solid #E2D9CC',
        }}
      >
        <RevealSection>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <span
              className="font-playfair"
              style={{ fontSize: '72px', color: '#B8962E', lineHeight: 0.6, display: 'block', marginBottom: '24px' }}
            >
              "
            </span>
            <p
              className="font-playfair"
              style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#163026', lineHeight: 1.6, fontWeight: 600, margin: 0 }}
            >
              Le meilleur d&apos;entre vous est celui qui apprend le Coran et l&apos;enseigne.
            </p>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#6B6357', letterSpacing: '0.05em' }}>
              — Sahih al-Bukhari
            </p>
          </div>
        </RevealSection>
      </section>

      {/* NEWSLETTER */}
      <section style={{ paddingTop: '80px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
        <RevealSection>
          <div
            style={{
              backgroundColor: '#EDE5D0',
              borderRadius: '20px',
              padding: 'clamp(24px, 6vw, 48px)',
              maxWidth: '600px',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <h2
              className="font-playfair"
              style={{ fontSize: '28px', fontWeight: 600, color: '#163026', margin: '0 0 12px 0' }}
            >
              Rejoins la communauté Zainly
            </h2>
            <p
              className="font-playfair"
              style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', margin: '0 0 28px 0', lineHeight: 1.6 }}
            >
              Suis l&apos;aventure Zainly.
            </p>

            {!newsletterSubmitted ? (
              <form onSubmit={handleNewsletter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="ton@email.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    padding: '14px 16px',
                    fontSize: '16px',
                    border: '1.5px solid #E2D9CC',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#163026',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  className="font-playfair"
                  style={{
                    marginTop: '16px',
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    backgroundColor: '#163026',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Rejoindre
                </button>
                {newsletterError && (
                  <p style={{ fontSize: '13px', color: '#c0392b', margin: '12px 0 0 0' }}>{newsletterError}</p>
                )}
              </form>
            ) : (
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#163026', margin: 0 }}>
                Bienvenue dans la communauté ✓
              </p>
            )}
          </div>
        </RevealSection>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          paddingTop: '32px',
          paddingBottom: '32px',
          textAlign: 'center',
          borderTop: '1px solid #E2D9CC',
        }}
      >
        <p style={{ fontSize: '13px', color: '#6B6357', margin: 0 }}>
          © {new Date().getFullYear()} Zainly. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
