'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'test2@gmail.com';
const PAGE_SIZE = 50;

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading]     = useState(true);
  const [users, setUsers]         = useState([]);
  const [page, setPage]           = useState(0);
  const [total, setTotal]         = useState(0);
  const [deleting, setDeleting]   = useState(null); // user_id being deleted
  const [error, setError]         = useState('');
  const [token, setToken]         = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace('/dashboard');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setToken(session?.access_token ?? '');
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (loading || !token) return;
    fetchUsers(page);
  }, [loading, page, token]);

  async function fetchUsers(p) {
    setError('');
    try {
      const res = await fetch(`/api/admin/users?page=${p}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Erreur inconnue'); return; }
      setUsers(body.users ?? []);
      setTotal(body.total ?? 0);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return;
    setDeleting(userId);
    setError('');
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Erreur inconnue'); return; }
      setUsers(prev => prev.filter(u => u.id !== userId));
      setTotal(prev => prev - 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B6357', fontFamily: 'DM Sans, sans-serif' }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#163026', margin: '0 0 4px 0' }}>
            Administration
          </h1>
          <p style={{ fontSize: '14px', color: '#6B6357', margin: 0 }}>
            {total} utilisateur{total !== 1 ? 's' : ''} · page {page + 1}/{Math.max(totalPages, 1)}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '8px', color: '#c0392b', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2D9CC', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2D9CC', backgroundColor: '#FAF7F2' }}>
                <th style={thStyle}>Prénom</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Inscription</th>
                <th style={{ ...thStyle, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6B6357', fontSize: '14px' }}>
                    Aucun utilisateur
                  </td>
                </tr>
              )}
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  style={{ borderBottom: i < users.length - 1 ? '1px solid #F0EBE1' : 'none' }}
                >
                  <td style={tdStyle}>{u.prenom ?? '—'}</td>
                  <td style={{ ...tdStyle, color: '#6B6357' }}>{u.email ?? '—'}</td>
                  <td style={{ ...tdStyle, color: '#6B6357', fontSize: '13px' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(u.id)}
                      disabled={deleting === u.id}
                      style={{
                        padding: '5px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: deleting === u.id ? '#aaa' : '#c0392b',
                        backgroundColor: 'transparent',
                        border: '1px solid',
                        borderColor: deleting === u.id ? '#ddd' : '#e8b4b0',
                        borderRadius: '6px',
                        cursor: deleting === u.id ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => { if (deleting !== u.id) e.currentTarget.style.opacity = '0.7'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                    >
                      {deleting === u.id ? '…' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: '24px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={paginBtn(page === 0)}
            >
              ← Précédent
            </button>
            <span style={{ padding: '8px 16px', fontSize: '14px', color: '#6B6357' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={paginBtn(page >= totalPages - 1)}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6B6357',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#163026',
};

function paginBtn(disabled) {
  return {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: disabled ? '#F0EBE1' : '#163026',
    color: disabled ? '#aaa' : '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
