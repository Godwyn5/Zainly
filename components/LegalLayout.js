'use client';

const CSS = `
.legal-body h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 17px;
  font-weight: 600;
  color: #163026;
  margin: 28px 0 10px;
}
.legal-body p {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #4A4540;
  line-height: 1.75;
  margin: 0 0 12px;
}
.legal-body ul {
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  color: #4A4540;
  line-height: 1.75;
  margin: 0 0 12px;
  padding-left: 20px;
}
.legal-body li {
  margin-bottom: 6px;
}
.legal-body a {
  color: #163026;
  text-decoration: underline;
}
`;

export default function LegalLayout({ title, onBack, children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6' }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, #0d1f17 0%, #163026 50%, #1e4535 100%)',
        padding: '56px 24px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{
          position: 'absolute', right: '-10px', bottom: '-10px',
          fontSize: '160px', color: '#fff', opacity: 0.04,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          fontFamily: 'Amiri, serif',
        }}>الله</span>

        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,0.7)', fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px', padding: 0, marginBottom: '20px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>

        <h1 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '26px', fontWeight: 600, color: '#fff',
          margin: '0 0 4px', lineHeight: 1.2,
        }}>
          {title}
        </h1>
        <p style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
          color: 'rgba(255,255,255,0.4)', margin: 0,
        }}>
          Zainly · Dernière mise à jour : avril 2025
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px 64px' }}>
        <div
          className="legal-body"
          style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            padding: '28px 24px',
            boxShadow: '0 4px 24px rgba(15,35,24,0.06)',
          }}
        >
          {children}
        </div>

        {/* Legal footer links */}
        <LegalFooter />
      </div>
    </div>
  );
}

export function LegalFooter() {
  const links = [
    { label: 'Conditions', href: '/legal/terms' },
    { label: 'Confidentialité', href: '/legal/privacy' },
    { label: 'Cookies', href: '/legal/cookies' },
    { label: 'Remboursement', href: '/legal/refund' },
  ];
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
      gap: '8px 20px', marginTop: '28px', paddingBottom: '16px',
    }}>
      {links.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          style={{
            fontFamily: 'DM Sans, sans-serif', fontSize: '12px',
            color: '#A09890', textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#163026'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#A09890'; }}
        >
          {label}
        </a>
      ))}
    </div>
  );
}
