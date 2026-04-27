'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'test2@gmail.com';
const PAGE_SIZE = 50;

const FILTERS = [
  { key: 'all',      label: 'Tous' },
  { key: 'active',   label: '🟢 Actifs' },
  { key: 'recent',   label: '🟡 Récents' },
  { key: 'inactive', label: '🔴 Inactifs' },
  { key: 'never',    label: '⚪ Jamais actifs' },
  { key: 'premium',  label: '★ Premium' },
  { key: 'free',     label: 'Gratuits' },
];

const STATUS_BADGE = {
  active:   { label: 'Actif',         bg: '#d4edda', color: '#155724' },
  recent:   { label: 'Récent',        bg: '#fff3cd', color: '#856404' },
  inactive: { label: 'Inactif',       bg: '#fdecea', color: '#c0392b' },
  never:    { label: 'Jamais actif',  bg: '#e9ecef', color: '#6c757d' },
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(true);
  const [users, setUsers]       = useState([]);
  const [page, setPage]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [filter, setFilter]     = useState('all');
  const [sortBy, setSortBy]     = useState('created_at');
  const [sortDir, setSortDir]   = useState('desc');
  const [deleting, setDeleting] = useState(null);
  const [error, setError]       = useState('');
  const [token, setToken]       = useState('');
  const [resyncing, setResyncing] = useState(false);
  const [resyncResult, setResyncResult] = useState(null);
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState(''); // raw input before debounce
  const [fetching, setFetching]       = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) { router.replace('/dashboard'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';
      if (!accessToken) {
        router.replace('/login');
        return;
      }
      // Set token first so fetchUsers never fires with an empty token
      setToken(accessToken);
      setLoading(false);
    }
    init();
  }, [router]);

  const fetchUsers = useCallback(async (p, f, s, d, q) => {
    if (!token) return;
    setError('');
    setFetching(true);
    try {
      const qs = new URLSearchParams({ page: p, filter: f, sort: s, dir: d });
      if (q) qs.set('search', q);
      const res = await fetch(`/api/admin/users?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Erreur inconnue'); return; }
      setUsers(body.users ?? []);
      setTotal(body.total ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    if (loading || !token) return;
    fetchUsers(page, filter, sortBy, sortDir, search);
  }, [loading, token, page, filter, sortBy, sortDir, search, fetchUsers]);

  // Debounce search input → update `search` state after 300ms
  function handleSearchInput(val) {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(0);
    }, 300);
  }

  function clearSearch() {
    setSearchInput('');
    setSearch('');
    setPage(0);
  }

  function handleFilterChange(f) {
    setFilter(f);
    setPage(0);
  }


  function handleSort(col) {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(0);
  }

  async function handleResync(dryRun) {
    if (resyncing) return;
    setResyncing(true);
    setResyncResult(null);
    setError('');
    try {
      const res = await fetch('/api/admin/resync-premium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dry_run: dryRun }),
      });
      const body = await res.json();
      if (!res.ok) { setError(body.error ?? 'Erreur resync'); return; }
      setResyncResult(body);
      if (!dryRun) fetchUsers(page, filter, sortBy, sortDir);
    } catch (e) {
      setError(e.message);
    } finally {
      setResyncing(false);
    }
  }

  async function handleDelete(userId) {
    if (!confirm('Supprimer cet utilisateur ? Cette action est irréversible.')) return;
    setDeleting(userId);
    setError('');
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B6357', fontFamily: 'DM Sans, sans-serif' }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F0E6', padding: '32px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#163026', margin: '0 0 4px 0' }}>
            Administration
          </h1>
          <p style={{ fontSize: '13px', color: '#6B6357', margin: 0 }}>
            {total} utilisateur{total !== 1 ? 's' : ''} · page {page + 1}/{totalPages}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleResync(true)}
            disabled={resyncing}
            style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 500, backgroundColor: '#fff', color: '#163026', border: '1px solid #163026', borderRadius: '8px', cursor: resyncing ? 'wait' : 'pointer' }}
          >
            {resyncing ? '…' : '🔍 Dry run Stripe'}
          </button>
          <button
            onClick={() => { if (confirm('Appliquer la resync Stripe → Supabase ?')) handleResync(false); }}
            disabled={resyncing}
            style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 500, backgroundColor: '#163026', color: '#fff', border: 'none', borderRadius: '8px', cursor: resyncing ? 'wait' : 'pointer' }}
          >
            {resyncing ? '…' : '⚡ Resync Stripe'}
          </button>
        </div>

        {/* Resync result */}
        {resyncResult && (
          <div style={{ margin: '16px 0', padding: '14px 16px', backgroundColor: '#f0f7f4', border: '1px solid #c3e0d4', borderRadius: '8px', fontSize: '13px', color: '#163026' }}>
            <strong>{resyncResult.dry_run ? '🔍 Dry run — aucune modification appliquée' : '⚡ Resync appliquée'}</strong>
            <div style={{ marginTop: '8px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <span>✅ À activer : <strong>{resyncResult.activated?.length ?? 0}</strong></span>
              <span>🔴 À désactiver : <strong>{resyncResult.deactivated?.length ?? 0}</strong></span>
              <span>⚠️ Sans correspondance Supabase : <strong>{resyncResult.no_match?.length ?? 0}</strong></span>
            </div>
            {resyncResult.no_match?.length > 0 && (
              <details style={{ marginTop: '8px' }}>
                <summary style={{ cursor: 'pointer', color: '#6B6357' }}>Voir les abonnements sans correspondance</summary>
                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  {resyncResult.no_match.map((s, i) => (
                    <li key={i} style={{ marginBottom: '2px' }}>{s.email ?? s.customer_id} — {s.subscription_id} ({s.plan})</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fdecea', border: '1px solid #f5c6cb', borderRadius: '8px', color: '#c0392b', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '420px' }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#9B9088" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Rechercher par prénom ou email…"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 36px 9px 36px',
              fontSize: '14px', fontFamily: 'DM Sans, sans-serif',
              border: '1.5px solid', borderColor: searchInput ? '#163026' : '#E2D9CC',
              borderRadius: '10px', backgroundColor: '#fff', color: '#163026',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#163026'; }}
            onBlur={e => { e.target.style.borderColor = searchInput ? '#163026' : '#E2D9CC'; }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Effacer la recherche"
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9B9088', fontSize: '16px', lineHeight: 1, padding: '4px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: filter === f.key ? 600 : 400,
                backgroundColor: filter === f.key ? '#163026' : '#fff',
                color: filter === f.key ? '#fff' : '#6B6357',
                border: '1px solid',
                borderColor: filter === f.key ? '#163026' : '#E2D9CC',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search context + loading */}
        {(search || fetching) && (
          <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6B6357' }}>
            {fetching
              ? 'Recherche en cours…'
              : search && total === 0
                ? `Aucun utilisateur trouvé pour « ${search} ».`
                : search
                  ? `${total} résultat${total !== 1 ? 's' : ''} pour « ${search} »`
                  : null
            }
          </div>
        )}

        {/* Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2D9CC', overflow: 'auto', opacity: fetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2D9CC', backgroundColor: '#FAF7F2' }}>
                <th style={thStyle}>Prénom</th>
                <th style={thStyle}>Email</th>
                <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('created_at')}>
                  Inscription {sortBy === 'created_at' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                </th>
                <th style={thStyle}>Plan</th>
                <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('sessions')}>
                  Sessions {sortBy === 'sessions' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                </th>
                <th style={thStyle}>Jours de suite</th>
                <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('last_session')}>
                  Dernière session {sortBy === 'last_session' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
                </th>
                <th style={thStyle}>Statut</th>
                <th style={{ ...thStyle, textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#6B6357', fontSize: '14px' }}>
                    Aucun utilisateur
                  </td>
                </tr>
              )}
              {users.map((u, i) => {
                const badge = STATUS_BADGE[u.status] ?? STATUS_BADGE.never;
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #F0EBE1' : 'none' }}>
                    <td style={tdStyle}>{u.prenom ?? '—'}</td>
                    <td style={{ ...tdStyle, color: '#6B6357', fontSize: '13px' }}>{u.email ?? '—'}</td>
                    <td style={{ ...tdStyle, color: '#6B6357', fontSize: '13px' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: u.is_premium ? 'rgba(184,150,46,0.15)' : '#f0ebe1',
                        color: u.is_premium ? '#8a6d00' : '#6B6357',
                      }}>
                        {u.plan_label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{u.sessions_count}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{u.streak > 0 ? `🔥 ${u.streak}` : '—'}</td>
                    <td style={{ ...tdStyle, color: '#6B6357', fontSize: '13px' }}>
                      {u.last_session ? new Date(u.last_session + 'T00:00:00').toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deleting === u.id}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: deleting === u.id ? '#aaa' : '#c0392b',
                          backgroundColor: 'transparent',
                          border: '1px solid',
                          borderColor: deleting === u.id ? '#ddd' : '#e8b4b0',
                          borderRadius: '6px',
                          cursor: deleting === u.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {deleting === u.id ? '…' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: '20px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={paginBtn(page === 0)}>
              ← Précédent
            </button>
            <span style={{ fontSize: '13px', color: '#6B6357' }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={paginBtn(page >= totalPages - 1)}>
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  color: '#6B6357',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 14px',
  fontSize: '13px',
  color: '#163026',
};

function paginBtn(disabled) {
  return {
    padding: '7px 14px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: disabled ? '#F0EBE1' : '#163026',
    color: disabled ? '#aaa' : '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
