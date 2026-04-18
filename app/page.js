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

const mobileBenefits = [
  { emoji: '📋', title: 'Ton plan sur mesure', desc: 'Un programme adapté à ton niveau, dès le départ.' },
  { emoji: '🔔', title: 'Ne plus jamais oublier', desc: 'Des rappels quotidiens pour garder ta mémoire vive.' },
  { emoji: '🔥', title: 'La régularité enfin possible', desc: 'Sessions courtes, chaque jour, sans pression.' },
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { window.location.replace('/dashboard'); return; }
      setTimeout(() => setPageVisible(true), 100);
    });
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

      {/* ===================== DESKTOP (md+) ===================== */}

      {/* NAVBAR — desktop */}
      <nav
        className="hidden md:flex"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          padding: '20px 24px',
          alignItems: 'center',
          backgroundColor: navScrolled ? 'rgba(245,240,230,0.92)' : 'transparent',
          backdropFilter: navScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: navScrolled ? 'blur(12px)' : 'none',
          transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease',
        }}
      >
        <span className="font-amiri" style={{ fontSize: '28px', fontWeight: 700, color: '#163026', letterSpacing: '0.01em' }}>
          Zainly
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/login" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '14px', color: '#163026', padding: '8px 16px', border: '1.5px solid #163026', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
            Connexion
          </Link>
        </div>
      </nav>

      {/* HERO — desktop */}
      <section
        className="hidden md:block"
        style={{ paddingTop: 'clamp(100px, 20vw, 180px)', paddingBottom: '120px', textAlign: 'center', position: 'relative', overflow: 'hidden', paddingLeft: '24px', paddingRight: '24px' }}
      >
        <span className="font-amiri" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(200px, 30vw, 380px)', color: '#163026', opacity: 0.04, pointerEvents: 'none', userSelect: 'none', lineHeight: 1, whiteSpace: 'nowrap' }}>
          الله
        </span>
        <RevealSection>
          <h1 className="font-playfair" style={{ fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 600, color: '#163026', lineHeight: 1.15, marginBottom: '28px', position: 'relative' }}>
            Mémorise. Retiens. <span style={{ color: '#B8962E' }}>Deviens.</span>
          </h1>
          <p className="font-playfair" style={{ fontSize: 'clamp(17px, 2vw, 22px)', fontStyle: 'italic', color: '#6B6357', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6, position: 'relative' }}>
            Un hafiz ne naît pas. Il se construit, un ayat à la fois.
          </p>
          <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <Link
              href="/register"
              className="font-playfair"
              style={{ display: 'inline-block', padding: '16px 48px', fontSize: '18px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 4px 24px rgba(22, 48, 38, 0.18)', transition: 'opacity 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.boxShadow = '0 6px 32px rgba(22, 48, 38, 0.26)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(22, 48, 38, 0.18)'; }}
            >
              Commencer maintenant
            </Link>
            <Link href="/login" style={{ fontSize: '14px', color: '#6B6357', textDecoration: 'none', borderBottom: '1px solid transparent', transition: 'border-color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = '#6B6357')}
              onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
            >
              Déjà un compte ? Connexion
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* FEATURES — desktop */}
      <section className="hidden md:block" style={{ paddingBottom: '100px', paddingLeft: '24px', paddingRight: '24px' }}>
        <RevealSection>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', justifyContent: 'center', maxWidth: '1000px', margin: '0 auto' }}>
            {features.map((f) => (
              <div key={f.title} style={{ flex: '1 1 240px', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px', padding: '32px 28px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2D9CC' }}>
                {f.icon}
                <h3 className="font-playfair" style={{ fontSize: '20px', fontWeight: 600, color: '#163026', margin: 0 }}>{f.title}</h3>
                <p style={{ fontSize: '15px', color: '#6B6357', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* CITATION — desktop */}
      <section className="hidden md:block" style={{ paddingTop: '80px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px', textAlign: 'center', borderTop: '1px solid #E2D9CC', borderBottom: '1px solid #E2D9CC' }}>
        <RevealSection>
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>
            <span className="font-playfair" style={{ fontSize: '72px', color: '#B8962E', lineHeight: 0.6, display: 'block', marginBottom: '24px' }}>&ldquo;</span>
            <p className="font-playfair" style={{ fontSize: 'clamp(18px, 2vw, 24px)', color: '#163026', lineHeight: 1.6, fontWeight: 600, margin: 0 }}>
              Le meilleur d&apos;entre vous est celui qui apprend le Coran et l&apos;enseigne.
            </p>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#6B6357', letterSpacing: '0.05em' }}>&mdash; Sahih al-Bukhari</p>
          </div>
        </RevealSection>
      </section>

      {/* NEWSLETTER — desktop */}
      <section className="hidden md:block" style={{ paddingTop: '80px', paddingBottom: '80px', paddingLeft: '24px', paddingRight: '24px' }}>
        <RevealSection>
          <div style={{ backgroundColor: '#EDE5D0', borderRadius: '20px', padding: 'clamp(24px, 6vw, 48px)', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <h2 className="font-playfair" style={{ fontSize: '28px', fontWeight: 600, color: '#163026', margin: '0 0 12px 0' }}>Rejoins la communauté Zainly</h2>
            <p className="font-playfair" style={{ fontSize: '16px', fontStyle: 'italic', color: '#6B6357', margin: '0 0 28px 0', lineHeight: 1.6 }}>Suis l&apos;aventure Zainly.</p>
            {!newsletterSubmitted ? (
              <form onSubmit={handleNewsletter} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                <input type="email" required autoComplete="email" placeholder="ton@email.com" value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)}
                  style={{ width: '100%', maxWidth: '360px', padding: '14px 16px', fontSize: '16px', border: '1.5px solid #E2D9CC', borderRadius: '8px', backgroundColor: '#FFFFFF', color: '#163026', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="submit" className="font-playfair"
                  style={{ marginTop: '16px', padding: '14px 32px', fontSize: '16px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >Rejoindre</button>
                {newsletterError && <p style={{ fontSize: '13px', color: '#c0392b', margin: '12px 0 0 0' }}>{newsletterError}</p>}
              </form>
            ) : (
              <p style={{ fontSize: '16px', fontWeight: 500, color: '#163026', margin: 0 }}>Bienvenue dans la communauté ✓</p>
            )}
          </div>
        </RevealSection>
      </section>

      {/* FOOTER — desktop */}
      <footer className="hidden md:block" style={{ paddingTop: '32px', paddingBottom: '32px', textAlign: 'center', borderTop: '1px solid #E2D9CC' }}>
        <p style={{ fontSize: '13px', color: '#6B6357', margin: 0 }}>&copy; {new Date().getFullYear()} Zainly. Tous droits réservés.</p>
      </footer>


      {/* ===================== MOBILE (<md) ===================== */}

      <div className="md:hidden" style={{ backgroundColor: '#F5F0E6', minHeight: '100vh' }}>

        {/* S1 — HERO MOBILE */}
        <section style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', position: 'relative', overflow: 'hidden' }}>
          {/* Watermark arabe */}
          <span className="font-amiri" style={{ position: 'absolute', bottom: '-20px', right: '-20px', fontSize: '220px', color: '#163026', opacity: 0.04, pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}>
            الله
          </span>

          {/* Header minimaliste */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="font-amiri" style={{ fontSize: '26px', fontWeight: 700, color: '#163026' }}>Zainly</span>
            <Link href="/login" style={{ fontSize: '13px', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#163026', padding: '7px 14px', border: '1.5px solid #163026', borderRadius: '8px', textDecoration: 'none' }}>
              Connexion
            </Link>
          </div>

          {/* Contenu hero */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#B8962E', textTransform: 'uppercase', marginBottom: '20px' }}>
              Mémorisation du Coran
            </p>
            <h1 className="font-playfair" style={{ fontSize: '40px', fontWeight: 700, color: '#163026', lineHeight: 1.2, margin: '0 0 20px 0' }}>
              Deviens Hafiz,<br />
              <span style={{ color: '#B8962E', fontStyle: 'italic' }}>un ayat à la fois.</span>
            </h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', color: '#6B6357', lineHeight: 1.6, margin: '0 0 40px 0', maxWidth: '300px' }}>
              Un programme personnalisé. Une progression visible. Chaque jour.
            </p>
            <Link
              href="/register"
              className="font-playfair"
              style={{ display: 'block', textAlign: 'center', padding: '20px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', borderRadius: '16px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(22,48,38,0.22)', letterSpacing: '0.01em' }}
            >
              Commencer maintenant
            </Link>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#B0A89E', textAlign: 'center', marginTop: '12px', letterSpacing: '0.02em' }}>
              Gratuit · Sans engagement
            </p>
          </div>
        </section>

        {/* S2 — BÉNÉFICES MOBILE */}
        <section style={{ padding: '72px 28px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: '#B8962E', textTransform: 'uppercase', marginBottom: '32px' }}>
            Pourquoi Zainly
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {mobileBenefits.map((b) => (
              <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '20px 24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDE5D8' }}>
                <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0, opacity: 0.75 }}>{b.emoji}</span>
                <div>
                  <h3 className="font-playfair" style={{ fontSize: '17px', fontWeight: 600, color: '#163026', margin: '0 0 4px 0' }}>{b.title}</h3>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', lineHeight: 1.55, margin: 0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* S3 — RÉASSURANCE MOBILE */}
        <section style={{ margin: '0 28px 72px', backgroundColor: '#163026', borderRadius: '24px', padding: '48px 32px', textAlign: 'center' }}>
          <span className="font-playfair" style={{ fontSize: '44px', color: '#B8962E', display: 'block', lineHeight: 1, marginBottom: '20px' }}>&ldquo;</span>
          <p className="font-playfair" style={{ fontSize: '17px', fontWeight: 600, color: '#FFFFFF', lineHeight: 1.75, margin: '0 0 24px 0' }}>
            Le meilleur d&apos;entre vous est celui qui apprend le Coran et l&apos;enseigne.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>
            Sahih al-Bukhari
          </p>
        </section>

        {/* S4 — CTA FINAL MOBILE */}
        <section style={{ padding: '0 28px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="font-playfair" style={{ fontSize: '30px', fontWeight: 700, color: '#163026', lineHeight: 1.2, margin: '0 0 12px 0' }}>
              Prêt à commencer ?
            </h2>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', color: '#6B6357', margin: 0 }}>
              Rejoins les lecteurs qui avancent chaque jour.
            </p>
          </div>
          <Link
            href="/register"
            className="font-playfair"
            style={{ display: 'block', textAlign: 'center', padding: '20px', fontSize: '17px', fontWeight: 600, backgroundColor: '#163026', color: '#FFFFFF', borderRadius: '16px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(22,48,38,0.22)', marginBottom: '12px' }}
          >
            Commencer maintenant
          </Link>
          <Link
            href="/login"
            style={{ display: 'block', textAlign: 'center', padding: '14px', fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: '#9B9189', textDecoration: 'none' }}
          >
            J&apos;ai déjà un compte
          </Link>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#9B9189', textAlign: 'center', marginTop: '24px' }}>
            &copy; {new Date().getFullYear()} Zainly
          </p>
        </section>

      </div>
    </div>
  );
}
