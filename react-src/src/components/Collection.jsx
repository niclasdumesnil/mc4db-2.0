import React, { useMemo, useState, useEffect } from 'react';

function getAuthHeaders(extraHeaders = {}) {
  try {
    const token = localStorage.getItem('mc_token');
    return token ? { 'Authorization': `Bearer ${token}`, ...extraHeaders } : extraHeaders;
  } catch { return extraHeaders; }
}

export default function Collection({ user, packsData, onSaved }) {
  // Set of owned pack IDs — editable by the user
  const [ownedIds, setOwnedIds] = useState(() => {
    if (!user?.owned_packs) return new Set();
    return new Set(user.owned_packs.split(',').map(Number).filter(Boolean));
  });
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync if user prop changes from parent
  useEffect(() => {
    if (!user?.owned_packs) { setOwnedIds(new Set()); return; }
    setOwnedIds(new Set(user.owned_packs.split(',').map(Number).filter(Boolean)));
    setDirty(false);
  }, [user]);

  // Group ALL packs by type — key = pack_type code, label = pack_type_name
  const { groupedAll, typeLabels } = useMemo(() => {
    if (!Array.isArray(packsData)) return { groupedAll: {}, typeLabels: {} };
    const groups = {};
    const labels = {};
    packsData.forEach(p => {
      const key = p.pack_type || 'other';
      const label = p.pack_type_name || p.pack_type || 'Other';
      if (!groups[key]) { groups[key] = []; labels[key] = label; }
      groups[key].push(p);
    });
    Object.keys(groups).forEach(key =>
      groups[key].sort((a, b) => a.name.localeCompare(b.name))
    );
    return { groupedAll: groups, typeLabels: labels };
  }, [packsData]);

  const totalOwned = ownedIds.size;
  const totalPacks = Array.isArray(packsData) ? packsData.length : 0;

  function toggle(id) {
    setOwnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setDirty(true);
  }

  function toggleGroup(packs) {
    const ids = packs.map(p => p.id);
    const allOwned = ids.every(id => ownedIds.has(id));
    setOwnedIds(prev => {
      const next = new Set(prev);
      if (allOwned) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
    setDirty(true);
  }

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    try {
      await fetch(`/api/public/user/${user.id}/packs`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ owned_packs: [...ownedIds] }),
      });
      setDirty(false);
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
      if (onSaved) onSaved();
    } catch (_) { /* silently fail */ }
    setSaving(false);
  }

  if (!user) return null;

  return (
    <div className="db-panel collection-panel">
      <div className="collection-header">
        <h3 className="panel-title">Collection</h3>
        <span className="collection-counter">{totalOwned} / {totalPacks}</span>
      </div>

      <div className="collection-actions">
        <button
          className={`btn-save-packs ${dirty ? 'btn-save-packs--dirty' : ''} ${savedFeedback ? 'btn-save-packs--saved' : ''}`}
          onClick={save}
          disabled={!dirty || saving}
        >
          {saving ? 'Saving…' : savedFeedback ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="packs-section">
        {Object.keys(groupedAll).sort((a, b) => typeLabels[a].localeCompare(typeLabels[b])).map(type => {
          const packs = groupedAll[type];
          const ownedInGroup = packs.filter(p => ownedIds.has(p.id)).length;
          const allGroupOwned = ownedInGroup === packs.length;
          return (
            <div key={type} className="pack-group">
              <div className="pack-group-header">
                <div className="pack-group-left">
                  <button
                    className={`pack-group-toggle ${allGroupOwned ? 'pack-group-toggle--all' : ''}`}
                    onClick={() => toggleGroup(packs)}
                    title={allGroupOwned ? 'Uncheck all' : 'Check all'}
                  >
                    {allGroupOwned ? '☑' : '☐'}
                  </button>
                  <span className="pack-group-all-label">All</span>
                </div>
                <h4 className="pack-type-title">{typeLabels[type]}</h4>
                <span className="pack-count-badge">{ownedInGroup}/{packs.length}</span>
              </div>
              <div className="packs-container">
                {packs.map(p => {
                  const owned = ownedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      className={`pack-badge pack-badge--toggle ${owned ? 'pack-badge--owned' : 'pack-badge--unowned'}`}
                      onClick={() => toggle(p.id)}
                      title={owned ? 'Click to remove' : 'Click to add'}
                    >
                      {owned && <span className="pack-check">✓</span>}
                      {p.name}
                      {p.visibility === 'false' && <span className="mc-badge mc-badge-private" title="Private">🔒</span>}
                      {p.creator && p.creator !== 'FFG' && String(p.creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => <span key={i} className="mc-badge mc-badge-creator">{c}</span>)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
