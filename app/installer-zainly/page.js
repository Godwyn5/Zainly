'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SUPPORT_EMAIL = 'zainlyapp@gmail.com';

/* ── Sub-components ─────────────────────────────────────────────────── */

function StepNumber({ n }) {
  return (
    <div style={{
      width: '32px', height: '32px', flexShrink: 0,
      borderRadius: '50%',
      backgroundColor: '#163026',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, color: '#B8962E' }}>
        {n}
      </span>
    </div>
  );
}

function Step({ n, title, text }) {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      <StepNumber n={n} />
      <div style={{ paddingTop: '4px' }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700, color: '#163026', margin: '0 0 4px' }}>
          {title}
        </p>
        {text && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', lineHeight: 1.65, margin: 0 }}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

function Alert({ children }) {
  return (
    <div style={{
      backgroundColor: 'rgba(184,150,46,0.10)',
      border: '1px solid rgba(184,150,46,0.30)',
      borderRadius: '14px',
      padding: '14px 16px',
      display: 'flex', gap: '10px', alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>⚠️</span>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#4A3800', lineHeight: 1.65, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

function HelpBox({ title, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      backgroundColor: '#FAF7F2',
      border: '1px solid #E8E0D4',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#163026', textAlign: 'left' }}>
          {title}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6357" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {items.map((item, i) => (
            <p key={i} style={{
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357',
              lineHeight: 1.65, margin: '0 0 6px',
              display: 'flex', gap: '8px', alignItems: 'flex-start',
            }}>
              <span style={{ flexShrink: 0, color: '#B8962E', marginTop: '2px' }}>→</span>
              {item}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #F0EBE3', paddingBottom: '2px' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '16px 0', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#163026', textAlign: 'left', lineHeight: 1.4 }}>
          {q}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6357" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', lineHeight: 1.65, margin: '0 0 16px', paddingLeft: '0' }}>
          {a}
        </p>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function InstallerZainlyPage() {
  const router = useRouter();
  const [device, setDevice] = useState(null); // null | 'iphone' | 'android'
  const [helpOpen, setHelpOpen] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6' }}>

      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0d1f17 0%, #163026 50%, #1e4535 100%)',
        padding: '56px 24px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        <span className="font-amiri" style={{
          position: 'absolute', right: '-10px', bottom: '-10px',
          fontSize: '160px', color: '#fff', opacity: 0.04,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>الله</span>

        <button
          onClick={() => router.back()}
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

        <h1 className="font-playfair" style={{
          fontSize: '28px', fontWeight: 600, color: '#fff',
          margin: '0 0 8px', lineHeight: 1.2,
        }}>
          Installer Zainly
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>
          Ajoute Zainly à ton écran d&apos;accueil et utilise-le comme une app.
        </p>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '28px 16px 64px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── BLOC INTRO ── */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          boxShadow: '0 4px 24px rgba(15,35,24,0.06)',
          padding: '24px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Pas besoin d&apos;App Store pour commencer
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px', fontWeight: 700, color: '#163026', margin: '0 0 10px', lineHeight: 1.35 }}>
            Zainly fonctionne déjà sur ton téléphone.
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', lineHeight: 1.65, margin: '0 0 20px' }}>
            Il suffit de l&apos;ajouter à ton écran d&apos;accueil depuis le bon navigateur. En deux minutes, Zainly sera sur ton téléphone comme une vraie app.
          </p>

          {/* iPhone / Android summary */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{
              flex: 1, backgroundColor: '#FAF7F2', borderRadius: '14px', padding: '14px 16px',
              border: '1px solid #E8E0D4',
            }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: '#163026', margin: '0 0 4px' }}>
                🍎 iPhone
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: 0, lineHeight: 1.4 }}>
                Utilise <strong>Safari</strong>
              </p>
            </div>
            <div style={{
              flex: 1, backgroundColor: '#FAF7F2', borderRadius: '14px', padding: '14px 16px',
              border: '1px solid #E8E0D4',
            }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: '#163026', margin: '0 0 4px' }}>
                🤖 Android
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: 0, lineHeight: 1.4 }}>
                Utilise <strong>Chrome</strong>
              </p>
            </div>
          </div>
        </div>

        {/* ── CHOIX TÉLÉPHONE ── */}
        <div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#6B6357', margin: '0 4px 10px', textAlign: 'center' }}>
            Quel type de téléphone as-tu ?
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { key: 'iphone',  label: '🍎 J\'ai un iPhone'  },
              { key: 'android', label: '🤖 J\'ai un Android' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setDevice(d => d === key ? null : key)}
                style={{
                  flex: 1, padding: '14px 10px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                  color: device === key ? '#fff' : '#163026',
                  backgroundColor: device === key ? '#163026' : '#fff',
                  border: '1.5px solid',
                  borderColor: device === key ? '#163026' : '#D4CCC2',
                  borderRadius: '14px', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TUTORIEL IPHONE ── */}
        {(device === 'iphone' || device === null) && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            boxShadow: device === 'iphone' ? '0 6px 32px rgba(15,35,24,0.10)' : '0 4px 24px rgba(15,35,24,0.06)',
            border: device === 'iphone' ? '1.5px solid #163026' : '1px solid #E8E0D4',
            padding: '24px',
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 0 6px' }}>
              iPhone
            </p>
            <h2 className="font-playfair" style={{ fontSize: '22px', fontWeight: 700, color: '#163026', margin: '0 0 18px', lineHeight: 1.2 }}>
              Installer sur iPhone
            </h2>

            <Alert>
              Sur iPhone, ouvre Zainly avec <strong>Safari</strong>. Ça ne marche pas depuis TikTok, Instagram, Snapchat ou Chrome.
            </Alert>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '22px' }}>
              <Step n="1" title="Ouvre Zainly dans Safari"
                text="Si tu es dans TikTok ou Instagram, appuie d'abord sur « Ouvrir dans Safari »." />
              <Step n="2" title="Appuie sur le bouton Partager"
                text="C'est l'icône avec un carré et une flèche vers le haut, en bas de l'écran." />
              <Step n="3" title="Descends dans le menu"
                text="Cherche l'option « Ajouter à l'écran d'accueil »." />
              <Step n="4" title="Appuie sur « Ajouter à l'écran d'accueil »" />
              <Step n="5" title="Appuie sur « Ajouter »"
                text="Zainly apparaîtra ensuite sur ton écran d'accueil, comme une app." />
            </div>

            <div style={{ marginTop: '22px' }}>
              <HelpBox
                title="Tu ne vois pas « Ajouter à l'écran d'accueil » ?"
                items={[
                  'Vérifie que tu es bien dans Safari (pas Chrome, TikTok ou Instagram).',
                  'Vérifie que tu es sur le site Zainly.',
                  'Ferme puis rouvre le lien dans Safari.',
                ]}
              />
            </div>
          </div>
        )}

        {/* ── TUTORIEL ANDROID ── */}
        {(device === 'android' || device === null) && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '20px',
            boxShadow: device === 'android' ? '0 6px 32px rgba(15,35,24,0.10)' : '0 4px 24px rgba(15,35,24,0.06)',
            border: device === 'android' ? '1.5px solid #163026' : '1px solid #E8E0D4',
            padding: '24px',
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 0 6px' }}>
              Android
            </p>
            <h2 className="font-playfair" style={{ fontSize: '22px', fontWeight: 700, color: '#163026', margin: '0 0 18px', lineHeight: 1.2 }}>
              Installer sur Android
            </h2>

            <Alert>
              Sur Android, utilise <strong>Google Chrome</strong> pour installer Zainly.
            </Alert>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '22px' }}>
              <Step n="1" title="Ouvre Zainly dans Chrome"
                text="Si tu es dans TikTok, Instagram ou une autre app, ouvre le lien dans Chrome." />
              <Step n="2" title="Appuie sur les trois points"
                text="Ils sont en haut à droite de l'écran." />
              <Step n="3" title="Appuie sur « Installer l'application »"
                text="Selon ton téléphone, le bouton peut aussi s'appeler « Ajouter à l'écran d'accueil »." />
              <Step n="4" title="Confirme avec « Installer » ou « Ajouter »" />
              <Step n="5" title="Ouvre Zainly depuis ton écran d'accueil"
                text="L'icône Zainly apparaîtra avec tes autres applications." />
            </div>

            <div style={{ marginTop: '22px' }}>
              <HelpBox
                title="Tu ne vois pas « Installer l'application » ?"
                items={[
                  'Vérifie que tu utilises Google Chrome.',
                  'Essaie l\'option « Ajouter à l\'écran d\'accueil » dans le même menu.',
                  'Recharge la page puis réessaie.',
                  'Si tu es dans TikTok ou Instagram, ouvre le lien dans Chrome.',
                ]}
              />
            </div>
          </div>
        )}

        {/* ── IMPORTANT À SAVOIR ── */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          boxShadow: '0 4px 24px rgba(15,35,24,0.06)',
          padding: '24px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 0 12px' }}>
            Important à savoir
          </p>
          {[
            { icon: '📱', text: 'Zainly n\'est pas encore sur l\'App Store, mais tu peux quand même l\'installer sur iPhone via Safari.' },
            { icon: '📱', text: 'Zainly n\'est pas encore sur le Play Store, mais tu peux quand même l\'installer sur Android via Chrome.' },
            { icon: '✅', text: 'Tu peux aussi utiliser Zainly directement depuis ton navigateur, sans rien installer.' },
            { icon: '🔮', text: 'Une vraie application store pourra arriver plus tard selon la demande.' },
          ].map(({ icon, text }, i) => (
            <div key={i} style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              padding: '10px 0',
              borderBottom: i < 3 ? '1px solid #F5F0E8' : 'none',
            }}>
              <span style={{ fontSize: '18px', flexShrink: 0, lineHeight: 1.4 }}>{icon}</span>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', lineHeight: 1.6, margin: 0 }}>
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* ── FAQ ── */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '20px',
          boxShadow: '0 4px 24px rgba(15,35,24,0.06)',
          padding: '24px',
        }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Questions fréquentes
          </p>

          <FAQItem
            q="Est-ce que je dois payer pour installer Zainly ?"
            a="Non. Ajouter Zainly à l'écran d'accueil est entièrement gratuit."
          />
          <FAQItem
            q="Est-ce que Zainly est sur App Store ?"
            a="Pas encore. Sur iPhone, utilise Safari puis « Ajouter à l'écran d'accueil »."
          />
          <FAQItem
            q="Est-ce que Zainly est sur Play Store ?"
            a="Pas encore. Sur Android, utilise Chrome puis « Installer l'application » ou « Ajouter à l'écran d'accueil »."
          />
          <FAQItem
            q="Pourquoi je ne vois pas le bouton d'installation ?"
            a="Dans la plupart des cas, c'est parce que le lien est ouvert dans TikTok, Instagram, Snapchat ou un navigateur non compatible. Ouvre Zainly dans Safari sur iPhone, ou dans Chrome sur Android."
          />
          <FAQItem
            q="Est-ce que je peux utiliser Zainly sans l'installer ?"
            a="Oui. Tu peux utiliser Zainly directement depuis le navigateur à tout moment."
          />
          <FAQItem
            q="Les notifications marchent-elles ?"
            a="Les rappels peuvent dépendre de ton téléphone et de ton navigateur. Si les notifications ne fonctionnent pas, tu peux quand même utiliser Zainly normalement depuis ton écran d'accueil."
          />
        </div>

        {/* ── CTA BAS DE PAGE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
          <a
            href={origin || '/dashboard'}
            style={{
              display: 'block', textAlign: 'center',
              padding: '16px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700,
              color: '#fff', backgroundColor: '#163026',
              border: 'none', borderRadius: '14px', cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(15,35,24,0.18)',
            }}
          >
            Ouvrir Zainly
          </a>

          <button
            type="button"
            onClick={() => setHelpOpen(o => !o)}
            style={{
              padding: '14px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
              color: '#163026', backgroundColor: 'transparent',
              border: '1.5px solid #D4CCC2', borderRadius: '14px', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#163026'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#D4CCC2'; }}
          >
            J&apos;ai encore besoin d&apos;aide
          </button>

          {helpOpen && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #E8E0D4',
              padding: '18px 20px',
            }}>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#163026', fontWeight: 600, margin: '0 0 8px' }}>
                On t&apos;aide volontiers 👋
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', lineHeight: 1.65, margin: '0 0 12px' }}>
                Envoie une capture de ton écran au support et on t&apos;aidera à installer Zainly.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Aide%20installation%20Zainly&body=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20pour%20installer%20Zainly.`}
                style={{
                  display: 'inline-block',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                  color: '#163026', textDecoration: 'none',
                  borderBottom: '1.5px solid #163026', paddingBottom: '1px',
                }}
              >
                Contacter le support →
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
