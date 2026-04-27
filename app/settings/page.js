'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LegalFooter } from '@/components/LegalLayout';

const CSS = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357' }}>{label}</span>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: '#163026' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: '1px', backgroundColor: '#F0EBE3' }} />;
}

function Card({ children, style }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '20px',
      boxShadow: '0 4px 24px rgba(15,35,24,0.06)',
      padding: '0 20px',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading]         = useState(true);
  const [isPremium, setIsPremium]     = useState(false);
  const [email, setEmail]             = useState('');
  const [cancelStep, setCancelStep]   = useState('idle'); // 'idle' | 'confirm'
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDone, setCancelDone]   = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { router.push('/login'); return; }
      setEmail(user.email ?? '');
      const { data: profile } = await supabase
        .from('profiles').select('is_premium').eq('id', user.id).maybeSingle();
      setIsPremium(profile?.is_premium === true);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  async function handleCancel() {
    if (cancelLoading) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push('/login'); return; }
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCancelError(json.error || 'Une erreur est survenue. Réessaie.');
        setCancelLoading(false);
        return;
      }
      setCancelDone(true);
      setCancelLoading(false);
      setCancelStep('idle');
    } catch {
      setCancelError('Une erreur est survenue. Réessaie.');
      setCancelLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="font-playfair" style={{ fontSize: '18px', fontStyle: 'italic', color: '#6B6357' }}>Chargement...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6' }}>
      <style>{CSS}</style>

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
          margin: '0 0 4px', lineHeight: 1.2,
        }}>
          Réglages
        </h1>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          Compte et abonnement
        </p>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 48px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── COMPTE ── */}
        <div style={{ animation: 'fadeUp 0.35s ease 0.05s both' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 4px 8px' }}>
            Compte
          </p>
          <Card>
            <Row label="Email" value={email || '—'} />
            <Divider />
            <div style={{ padding: '4px 0 8px' }}>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  width: '100%', padding: '13px',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                  color: '#163026', backgroundColor: 'transparent',
                  border: '1px solid #D4CCC2', borderRadius: '12px',
                  cursor: 'pointer', marginTop: '8px',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#163026'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#D4CCC2'; }}
              >
                Déconnexion
              </button>
            </div>
          </Card>
        </div>

        {/* ── ABONNEMENT ── */}
        <div style={{ animation: 'fadeUp 0.35s ease 0.12s both' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 4px 8px' }}>
            Abonnement
          </p>
          <Card>
            {isPremium ? (
              <>
                <Row label="Statut" value="Premium actif 👑" />
                <Divider />
                <Row label="Prix" value="2,99 € / mois" />
                <Divider />
                <Row label="Renouvellement" value="Mensuel automatique" />

                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#A09890', lineHeight: 1.6, margin: '12px 0 4px' }}>
                  {cancelDone
                    ? 'Résiliation prise en compte. Ton accès reste actif jusqu\'à la fin de la période en cours.'
                    : 'Ton accès reste actif jusqu\'à la fin de la période en cours si tu résilie.'}
                </p>

                {!cancelDone && cancelStep === 'idle' && (
                  <div style={{ padding: '8px 0 12px' }}>
                    <button
                      type="button"
                      onClick={() => setCancelStep('confirm')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', fontSize: '14px',
                        color: '#DC2626', padding: '6px 0',
                      }}
                    >
                      Résilier mon abonnement
                    </button>
                  </div>
                )}

                {cancelDone && (
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: '#2d5a42', padding: '8px 0 12px' }}>
                    ✓ Résiliation confirmée
                  </p>
                )}
              </>
            ) : (
              <>
                <Row label="Statut" value="Gratuit" />
                <Divider />
                <div style={{ padding: '12px 0' }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', lineHeight: 1.6, margin: '0 0 12px' }}>
                    Passe à Premium pour mémoriser sans limite, à ton rythme.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/premium?source=settings')}
                    style={{
                      width: '100%', padding: '13px',
                      fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                      color: '#fff', backgroundColor: '#163026',
                      border: 'none', borderRadius: '12px', cursor: 'pointer',
                    }}
                  >
                    Découvrir Premium →
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── CONFIRMATION RÉSILIATION ── */}
        {cancelStep === 'confirm' && !cancelDone && (
          <div style={{ animation: 'fadeUp 0.25s ease both' }}>
            <Card style={{ padding: '20px' }}>
              <p className="font-playfair" style={{ fontSize: '18px', fontWeight: 700, color: '#163026', margin: '0 0 10px' }}>
                Confirmer la résiliation
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: '#6B6357', lineHeight: 1.6, margin: '0 0 20px' }}>
                Tu garderas ton accès Premium jusqu&apos;à la fin de la période en cours.
              </p>

              {cancelError && (
                <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#DC2626', margin: '0 0 14px' }}>
                  {cancelError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={() => { setCancelStep('idle'); setCancelError(''); }}
                  style={{
                    flex: 1, padding: '13px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 500,
                    color: '#163026', backgroundColor: 'transparent',
                    border: '1px solid #D4CCC2', borderRadius: '12px',
                    cursor: cancelLoading ? 'not-allowed' : 'pointer',
                    opacity: cancelLoading ? 0.5 : 1,
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={cancelLoading}
                  onClick={handleCancel}
                  style={{
                    flex: 1, padding: '13px',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600,
                    color: '#fff', backgroundColor: '#DC2626',
                    border: 'none', borderRadius: '12px',
                    cursor: cancelLoading ? 'wait' : 'pointer',
                    opacity: cancelLoading ? 0.75 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {cancelLoading ? 'Résiliation…' : 'Confirmer'}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ── APPLICATION ── */}
        <div style={{ animation: 'fadeUp 0.35s ease 0.19s both' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '1.5px', color: '#B8962E', textTransform: 'uppercase', margin: '0 4px 8px' }}>
            Application
          </p>
          <button
            type="button"
            onClick={() => router.push('/installer-zainly')}
            style={{
              width: '100%', textAlign: 'left',
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 4px 24px rgba(15,35,24,0.06)',
              border: '1px solid #E8E0D4',
              padding: '18px 20px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'box-shadow 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(15,35,24,0.10)'; e.currentTarget.style.borderColor = '#C8B99A'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(15,35,24,0.06)'; e.currentTarget.style.borderColor = '#E8E0D4'; }}
          >
            {/* Icon */}
            <div style={{
              width: '44px', height: '44px', flexShrink: 0,
              backgroundColor: '#163026', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8962E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12" y2="18" strokeWidth="3"/>
              </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: '#163026' }}>
                  Installer Zainly
                </span>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700,
                  color: '#B8962E', backgroundColor: 'rgba(184,150,46,0.12)',
                  borderRadius: '20px', padding: '2px 7px', letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                }}>
                  2 min
                </span>
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: '#6B6357', margin: '0 0 4px', lineHeight: 1.4 }}>
                Ajoute Zainly à ton écran d&apos;accueil comme une vraie app.
              </p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: '#A09890', margin: 0 }}>
                iPhone : Safari &nbsp;·&nbsp; Android : Chrome
              </p>
            </div>

            {/* Chevron */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8B99A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <LegalFooter />

      </div>
    </div>
  );
}
