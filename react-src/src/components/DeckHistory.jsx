import React, { useState, useEffect } from 'react';
import { getFactionColor } from '@utils/dataUtils';
import '../css/DeckHistory.css';

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    return u && (u.id || u.userId);
  } catch (e) { return null; }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffH = Math.floor((now - d) / 3600000);
  if (diffH < 24) {
    return `Today at ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DeckHistory({ deckId, isPrivate, locale = 'en', refreshKey = 0 }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!deckId) { setLoading(false); return; }
    
    setLoading(true);
    setError(null);

    let url = '';
    if (isPrivate) {
      const userId = currentUserId();
      if (!userId) { setLoading(false); return; }
      url = `/api/public/user/${userId}/decks/${deckId}/history?locale=${locale}`;
    } else {
      url = `/api/public/decklist/${deckId}/history?locale=${locale}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.ok) setHistory(data.data || []);
        else setError(data.error || 'Could not load history.');
        setLoading(false);
      })
      .catch(() => { setError('Network error.'); setLoading(false); });
  }, [deckId, isPrivate, locale, refreshKey]);

  if (!isPrivate && !loading && history.length === 0) return null;

  return (
    <div className="deck-history">
      <h4 className="dh-title">History</h4>

      {loading && <div className="dh-empty">Loading…</div>}
      {!loading && error && <div className="dh-empty dh-empty--error">{error}</div>}
      {!loading && !error && history.length === 0 && <div className="dh-empty">No history yet.</div>}

      {!loading && !error && history.length > 0 && (
        <div className="dh-table">
          {/* En-tête */}
          <div className="dh-header">
            <span>Date &amp; Version</span>
            <span>Changes</span>
          </div>

          {history.map(entry => {
            const changes     = Array.isArray(entry.changes)     ? entry.changes     : [];
            const sideChanges = Array.isArray(entry.sideChanges) ? entry.sideChanges : [];
            const renderChange = (c, i, isSide = false) => {
              const qty   = Number(c.qty);
              const name  = typeof c.name === 'string' ? c.name : String(c.code || '');
              const color = getFactionColor(c.faction_code || 'basic');
              return (
                <div key={`${isSide ? 's' : 'm'}-${i}`} className={`dh-change ${qty > 0 ? 'dh-change--add' : 'dh-change--remove'}`}>
                  <span className="dh-change-qty">{qty > 0 ? `+${qty}` : qty}</span>
                  <span className="dh-faction-dot" style={{ background: color }} />
                  <span className="dh-change-name">{name}</span>
                  {isSide && <span className="dh-change-side-badge">Side</span>}
                </div>
              );
            };
            return (
              <div key={entry.id} className="dh-row">
                {/* Date + version sur la même ligne */}
                <div className="dh-row-meta">
                  <span className="dh-date">{formatDate(entry.date)}</span>
                  <span className="dh-version">{entry.version}</span>
                </div>
                {/* Changements en dessous */}
                <div className="dh-changes">
                  {changes.map((c, i) => renderChange(c, i, false))}
                  {sideChanges.map((c, i) => renderChange(c, i, true))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
