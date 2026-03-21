import React, { useState, useEffect, useCallback } from 'react';

// ── Helpers ────────────────────────────────────────────────────────────────

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    return u && (u.id || u.userId);
  } catch { return null; }
}

function copyToClipboard(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text);
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

// ── Reputation badge (inline) ──────────────────────────────────────────────

const REP_TIERS = [
  { min: 1000, fill: '#ffd700', stroke: '#b8860b', label: 'Gold'   },
  { min: 100,  fill: '#c0c0c0', stroke: '#808080', label: 'Silver' },
  { min: 10,   fill: '#cd7f32', stroke: '#8b4513', label: 'Bronze' },
];

function RepMedal({ fill, stroke, title }) {
  return (
    <svg className="rep-medal" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" title={title} aria-label={title}>
      <polygon points="8,2 16,2 19,9 12,7 5,9" fill={stroke} opacity="0.85" />
      <circle cx="12" cy="15" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <polygon points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4" fill={stroke} opacity="0.9" />
    </svg>
  );
}

function RepBadge({ reputation }) {
  const rep = reputation ?? 0;
  const tier = REP_TIERS.find(t => rep >= t.min);
  if (!tier) return null;
  const tierKey = tier.label.toLowerCase(); // 'gold' | 'silver' | 'bronze'
  return (
    <span className={`rep-badge rep-badge--inline rep-badge--${tierKey}`} title={`${tier.label} — ${rep} rep`}>
      <RepMedal fill={tier.fill} stroke={tier.stroke} title={`${tier.label} (${rep})`} />
    </span>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}

function HeroBadge({ hero, rank }) {
  const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
  return (
    <div className="admin-hero-badge">
      <span className="admin-hero-rank" style={{ color: colors[rank] }}>#{rank + 1}</span>
      <span className="admin-hero-name">{hero.name}</span>
      <span className="admin-hero-count">{hero.count} decks</span>
    </div>
  );
}

function getAuthHeaders(extraHeaders = {}) {
  try {
    const token = localStorage.getItem('mc_token');
    return token ? { 'Authorization': `Bearer ${token}`, ...extraHeaders } : extraHeaders;
  } catch { return extraHeaders; }
}

// ── Create User Modal ──────────────────────────────────────────────────────

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm]       = useState({ username: '', email: '', reputation: 1, is_admin: false, is_supporter: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [copied, setCopied]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/public/admin/users', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) onCreated();
    } catch {
      setResult({ ok: false, error: 'Network error.' });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result?.ok) return;
    copyToClipboard(`Username: ${result.user.username}\nEmail: ${result.user.email}\nPassword: ${result.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>Create a user</h3>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        {!result?.ok ? (
          <form onSubmit={handleSubmit} className="admin-modal-form">
            <label className="admin-form-label">Username</label>
            <input className="admin-form-input" type="text" value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required placeholder="username" />

            <label className="admin-form-label">Email</label>
            <input className="admin-form-input" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required placeholder="email@example.com" />

            <label className="admin-form-label">Reputation</label>
            <input className="admin-form-input" type="number" min="1" value={form.reputation}
              onChange={e => setForm(f => ({ ...f, reputation: parseInt(e.target.value, 10) || 1 }))}
              placeholder="1" />

            <div className="admin-form-checks">
              <label className="admin-check-label">
                <input type="checkbox" checked={form.is_admin}
                  onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))} />
                🛡️ Administrator
              </label>
              <label className="admin-check-label">
                <input type="checkbox" checked={form.is_supporter}
                  onChange={e => setForm(f => ({ ...f, is_supporter: e.target.checked }))} />
                💎 Supporter
              </label>
            </div>

            {result?.error && <div className="admin-form-error">{result.error}</div>}
            <button className="admin-btn admin-btn--primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create user'}
            </button>
          </form>
        ) : (
          <div className="admin-create-success">
            <div className="admin-success-icon">✅</div>
            <p>User <strong>{result.user.username}</strong> created successfully.</p>
            <div className="admin-credentials-box">
              <div><span className="cred-label">Login:</span> <span className="cred-value">{result.user.username}</span></div>
              <div><span className="cred-label">Email:</span> <span className="cred-value">{result.user.email}</span></div>
              <div><span className="cred-label">Password:</span> <span className="cred-value cred-pwd">{result.password}</span></div>
            </div>
            <button className={`admin-btn ${copied ? 'admin-btn--success' : 'admin-btn--secondary'}`} onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy credentials'}
            </button>
            <button className="admin-btn admin-btn--ghost" onClick={onClose} style={{ marginLeft: 8 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────

function ResetPasswordModal({ targetUser, onClose }) {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/admin/users/${targetUser.id}/reset-password`, { 
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Network error.' });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!result?.ok) return;
    copyToClipboard(`Username: ${result.username}\nPassword: ${result.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="admin-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal admin-modal--sm">
        <div className="admin-modal-header">
          <h3>Reset password — {targetUser.username}</h3>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        {!result ? (
          <div className="admin-modal-body">
            <p>A new random password will be generated for <strong>{targetUser.username}</strong>.</p>
            <button className="admin-btn admin-btn--danger" onClick={handleReset} disabled={loading}>
              {loading ? 'Resetting…' : '🔄 Reset password'}
            </button>
          </div>
        ) : result.ok ? (
          <div className="admin-create-success">
            <div className="admin-credentials-box">
              <div><span className="cred-label">Login:</span> <span className="cred-value">{result.username}</span></div>
              <div><span className="cred-label">New password:</span> <span className="cred-value cred-pwd">{result.password}</span></div>
            </div>
            <button className={`admin-btn ${copied ? 'admin-btn--success' : 'admin-btn--secondary'}`} onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button className="admin-btn admin-btn--ghost" onClick={onClose} style={{ marginLeft: 8 }}>Close</button>
          </div>
        ) : (
          <div className="admin-form-error">{result.error}</div>
        )}
      </div>
    </div>
  );
}

// ── Reputation Edit Cell ─────────────────────────────────────────────────────

function ReputationCell({ user, onUpdateRep }) {
  const [editing, setEditing] = useState(false);
  // Default legacy users might have their total in db, but going forward it's a boost.
  const [val, setVal] = useState(user.boost !== undefined ? user.boost : 0);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/admin/users/${user.id}/role`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ reputation: val })
      });
      const data = await res.json();
      if (data.ok) {
        // Here data.reputation is the new boost from DB.
        // We need to locally calculate the new total.
        const returnedBoost = data.reputation || val; // fallback if backend not restarted
        const base = (user.reputation || 0) - (user.boost || 0);
        const newTotal = base + returnedBoost;
        onUpdateRep(newTotal, returnedBoost);
        setEditing(false);
      }
    } catch {}
    setLoading(false);
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>Boost:</span>
        <input 
          type="number" 
          className="admin-form-input" 
          style={{ width: 60, padding: '2px 4px', margin: 0 }} 
          value={val} 
          onChange={e => setVal(parseInt(e.target.value, 10) || 0)} 
          disabled={loading}
        />
        <button className="admin-btn admin-btn--xs admin-btn--primary" onClick={handleSave} disabled={loading} style={{ padding: '2px 6px' }}>✔</button>
        <button className="admin-btn admin-btn--xs admin-btn--ghost" onClick={() => { setEditing(false); setVal(user.boost || 0); }} disabled={loading} style={{ padding: '2px 6px' }}>✕</button>
      </div>
    );
  }

  const hasBoost = user.boost !== undefined && user.boost !== 0;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ minWidth: 24 }} title={hasBoost ? `Base: ${user.reputation - user.boost} + Boost: ${user.boost}` : 'Calculated automatically'}>
        {user.reputation}
      </span>
      {hasBoost && (
        <span style={{ fontSize: 10, color: user.boost > 0 ? '#10b981' : '#f43f5e', fontWeight: 'bold' }}>
          ({user.boost > 0 ? '+' : ''}{user.boost})
        </span>
      )}
      <button className="admin-btn admin-btn--xs admin-btn--ghost" onClick={() => setEditing(true)} title="Edit manual boost" disabled={loading} style={{ padding: '2px 6px' }}>✎</button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminPanel({ onUserUpdate }) {
  const [stats, setStats]             = useState(null);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [errorMsg, setErrorMsg]       = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [roleLoading, setRoleLoading] = useState({});
  const [page, setPage]               = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const PAGE_SIZE = 10;

  // ID of the currently logged-in admin — blocks self-revocation
  const selfId = currentUserId();

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const options = { headers: getAuthHeaders() };
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/public/admin/stats', options).then(r => r.json()),
        fetch('/api/public/admin/users', options).then(r => r.json()),
      ]);
      if (statsRes.ok && usersRes.ok) {
        setStats(statsRes.stats);
        setUsers(usersRes.users);
        setPage(1);
      } else {
        setErrorMsg(statsRes.error || usersRes.error || 'Failed to load panel data. Please try logging out and logging back in to refresh your admin session.');
      }
    } catch {
      setErrorMsg('Network error. Ensure the API server is running.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleRole(userId, field, value) {
    setRoleLoading(prev => ({ ...prev, [`${userId}-${field}`]: true }));
    try {
      await fetch(`/api/public/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ [field]: value }),
      });
      setUsers(prev => prev.map(u =>
        u.id === userId
          ? { ...u,
              is_admin:     field === 'is_admin'     ? value : u.is_admin,
              is_supporter: field === 'is_supporter' ? value : u.is_supporter,
              donation:     field === 'is_supporter' ? (value ? 1 : 0) : u.donation }
          : u
      ));
      // If the role of the currently logged-in user changed,
      // refresh the local user data so the top nav updates immediately.
      const loggedInId = currentUserId();
      if (loggedInId && Number(loggedInId) === userId) {
        try {
          const ures = await fetch('/api/public/user/' + encodeURIComponent(userId));
          if (ures.ok) {
            const up = await ures.json();
            if (up.ok && up.user) {
              const oldU = JSON.parse(localStorage.getItem('mc_user') || '{}');
              localStorage.setItem('mc_user', JSON.stringify({ ...oldU, ...up.user }));
              window.dispatchEvent(new Event('mc_user_changed'));
            }
          }
        } catch { /* ignore */ }
      }
      if (typeof onUserUpdate === 'function') onUserUpdate();
    } catch { /* ignore */ }
    setRoleLoading(prev => ({ ...prev, [`${userId}-${field}`]: false }));
  }

  return (
    <div className="db-panel admin-panel">
      {/* ── Header ── */}
      <div className="admin-panel-header">
        <h3 className="panel-title" style={{ margin: 0, border: 'none', padding: 0 }}>
          🛡️ Administration
        </h3>
        <button className="admin-btn admin-btn--primary" onClick={() => setShowCreate(true)}>
          ＋ Create user
        </button>
      </div>

      {loading && <div className="db-status" style={{ padding: '20px 0' }}>Loading…</div>}

      {!loading && errorMsg && (
        <div className="admin-form-error" style={{ margin: '20px 0', fontSize: '1rem', textAlign: 'center' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {!loading && !errorMsg && stats && (
        <>
          {/* ── Global stats ── */}
          <div className="admin-stats-row">
            <StatCard label="Users"           value={stats.total_users}         accent="#4a90e2" />
            <StatCard label="Private decks"   value={stats.total_private_decks} accent="#ff9f43" />
            <StatCard label="Published decks" value={stats.total_public_decks}  accent="#2ecc71" />
          </div>

          {/* ── Top 3 heroes ── */}
          {(stats.top_heroes?.length > 0 || stats.top_public_heroes?.length > 0) && (
            <div className="admin-heroes-section">
              <div className="admin-heroes-columns">
                {stats.top_heroes?.length > 0 && (
                  <div className="admin-heroes-group">
                    <div className="admin-section-title">🏆 Top 3 heroes (private decks)</div>
                    <div className="admin-heroes-row">
                      {stats.top_heroes.map((h, i) => <HeroBadge key={h.code} hero={h} rank={i} />)}
                    </div>
                  </div>
                )}
                {stats.top_public_heroes?.length > 0 && (
                  <div className="admin-heroes-group">
                    <div className="admin-section-title">🌐 Top 3 heroes (published decks)</div>
                    <div className="admin-heroes-row">
                      {stats.top_public_heroes.map((h, i) => <HeroBadge key={h.code} hero={h} rank={i} />)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Users table ── */}
          <div className="admin-section-title" style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>👥 Users ({filteredUsers.length})</span>
            <input 
              type="text" 
              placeholder="Filter users..." 
              className="admin-form-input" 
              style={{ width: '250px', margin: 0 }}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Reputation</th>
                  <th>Badges</th>
                  <th style={{ textAlign: 'center' }}>Private</th>
                  <th style={{ textAlign: 'center' }}>Published</th>
                  <th>Admin</th>
                  <th>Supporter</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(u => {
                  const isSelf = selfId && u.id === Number(selfId);
                  return (
                    <tr key={u.id} className={!u.enabled ? 'admin-row--disabled' : ''}>
                      <td className="admin-td-id">{u.id}</td>
                      <td className="admin-td-name">{u.username}</td>
                      <td className="admin-td-email">{u.email}</td>
                      <td>
                        <ReputationCell 
                          user={u} 
                          onUpdateRep={(newRep, newBoost) => {
                            setUsers(prev => prev.map(usr => usr.id === u.id ? { ...usr, reputation: newRep, boost: newBoost } : usr));
                          }} 
                        />
                      </td>
                      <td>
                        <div className="admin-user-badges">
                          <RepBadge reputation={u.reputation} />
                          {u.is_admin     && <span className="admin-badge" title="Admin">🛡️</span>}
                          {u.is_supporter && <span className="donation-badge" title="Supporter">💎</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{u.private_decks}</td>
                      <td style={{ textAlign: 'center' }}>{u.public_decks}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            className={`admin-toggle-btn ${u.is_admin ? 'admin-toggle-btn--on' : ''}`}
                            onClick={() => toggleRole(u.id, 'is_admin', !u.is_admin)}
                            disabled={!!roleLoading[`${u.id}-is_admin`] || (isSelf && u.is_admin)}
                            title={isSelf && u.is_admin ? 'Cannot remove your own admin rights' : (u.is_admin ? 'Remove admin' : 'Make admin')}
                          >
                            {u.is_admin ? '✔' : '○'}
                          </button>
                          {isSelf && u.is_admin && (
                            <span className="admin-self-lock" title="Cannot remove your own admin rights">🔒</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          className={`admin-toggle-btn ${u.is_supporter ? 'admin-toggle-btn--supporter' : ''}`}
                          onClick={() => toggleRole(u.id, 'is_supporter', !u.is_supporter)}
                          disabled={!!roleLoading[`${u.id}-is_supporter`]}
                          title={u.is_supporter ? 'Remove supporter' : 'Make supporter'}
                        >
                          {u.is_supporter ? '✔' : '○'}
                        </button>
                      </td>
                      <td>
                        <button
                          className="admin-btn admin-btn--xs admin-btn--danger"
                          onClick={() => setResetTarget(u)}
                          title="Reset password"
                        >
                          🔑 Reset
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {filteredUsers.length > PAGE_SIZE && (() => {
            const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
            return (
              <div className="admin-pagination">
                <button
                  className="admin-btn admin-btn--ghost admin-btn--xs"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >«</button>
                <button
                  className="admin-btn admin-btn--ghost admin-btn--xs"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >‹</button>
                <span className="admin-page-info">Page {page} / {totalPages}</span>
                <button
                  className="admin-btn admin-btn--ghost admin-btn--xs"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >›</button>
                <button
                  className="admin-btn admin-btn--ghost admin-btn--xs"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >»</button>
              </div>
            );
          })()}
        </>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={loadData} />
      )}
      {resetTarget && (
        <ResetPasswordModal targetUser={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
}
