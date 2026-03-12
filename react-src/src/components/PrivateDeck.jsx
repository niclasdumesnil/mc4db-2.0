import React from 'react';
import { getFactionColor, getFactionFaintColor, DECK_TAGS } from '@utils/dataUtils';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';

export default function PrivateDeck({ deck }) {
  const [busy, setBusy] = React.useState(null);

  const currentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      return u && (u.id || u.userId);
    } catch (e) { return null; }
  };
  // Aspect (couleur) depuis meta JSON
  let aspect = 'basic';
  try {
    const meta = typeof deck.meta === 'string' ? JSON.parse(deck.meta) : deck.meta;
    if (meta && meta.aspect) aspect = meta.aspect;
  } catch (_) { }
  const headerColor = getFactionColor(aspect);
  const headerFaint = getFactionFaintColor(aspect);

  const heroImage = deck.hero_imagesrc || null;

  // Badges pack
  const isFFG = !deck.pack_creator || deck.pack_creator.toUpperCase() === 'FFG';
  const creator = !isFFG ? deck.pack_creator : null;
  const statusKey = (deck.pack_status || '').toLowerCase();
  const STATUS_BADGE = { alpha: 'mc-badge-alpha', beta: 'mc-badge-beta', released: 'mc-badge-released', sealed: 'mc-badge-sealed', current: 'mc-badge-current' };
  const statusBadgeClass = STATUS_BADGE[statusKey] || null;

  // Tags
  const tags = deck.tags ? deck.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Dates
  const updatedAt = deck.date_update
    ? new Date(deck.date_update).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : deck.date_creation
      ? new Date(deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  const handleCardClick = () => {
    window.location.href = `/deck/view/${deck.id}`;
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    window.location.href = `/deck/view/${deck.id}?edit=true`;
  };

  const handleClone = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to clone this deck?')) return;
    setBusy('clone');
    try {
      const uid = currentUserId();
      const r = await fetch(`/api/public/user/${uid}/decks/${deck.id}/clone`, { method: 'POST' });
      const data = await r.json();
      if (data.ok) window.location.href = `/my-decks/${data.data.id}`;
      else alert(data.error || 'Clone failed.');
    } catch { alert('Network error.'); }
    finally { setBusy(null); }
  };

  const handlePublish = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to publish this deck?')) return;
    setBusy('publish');
    try {
      const uid = currentUserId();
      const r = await fetch(`/api/public/user/${uid}/decks/${deck.id}/publish`, { method: 'PUT' });
      const data = await r.json();
      if (data.ok) window.location.reload();
      else alert(data.error || 'Publish failed.');
    } catch { alert('Network error.'); }
    finally { setBusy(null); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this deck?')) return;
    setBusy('delete');
    try {
      const uid = currentUserId();
      const r = await fetch(`/api/public/user/${uid}/decks/${deck.id}`, { method: 'DELETE' });
      const data = await r.json();
      if (data.ok) window.location.reload();
      else alert(data.error || 'Delete failed.');
    } catch { alert('Network error.'); }
    finally { setBusy(null); }
  };

  return (
    <div className="deck-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      {/* Header */}
      <div className="deck-header" style={{ backgroundColor: 'white', backgroundImage: `linear-gradient(${headerFaint}, ${headerFaint})` }}>
        <div className="deck-header-content">
          <h3 className="deck-name" style={{ color: '#111' }} title={deck.name}>{deck.name}</h3>
        </div>
        {heroImage && (
          <div
            className="card-thumbnail--wide-hero"
            style={{ backgroundImage: `url(${heroImage})` }}
            title={deck.hero_name}
          />
        )}
      </div>

      {/* Body */}
      <div className="deck-body">
        <div className="deck-body-left">
          <div className="deck-hero-row">
            <div className="deck-hero-row-left">
              <span className="deck-hero-badge">{deck.hero_name}</span>
              {isFFG && <span className="mc-badge mc-badge-official">Official</span>}
              {!isFFG && creator && <span className="mc-badge mc-badge-creator">{creator}</span>}
              {statusBadgeClass && <span className={`mc-badge ${statusBadgeClass}`}>{statusKey}</span>}
            </div>
            {/* Version uniquement — pas de likes/favoris/commentaires */}
            <div className="deck-hero-stats">
              <span className="stat-version">v{deck.version || '1.0'}</span>
            </div>
          </div>

          <div className="deck-tags-row">
            {tags.map((tag, i) => {
              const t = DECK_TAGS[tag.toLowerCase()];
              return t ? (
                <span key={i} className={`deck-tag-icon deck-tag-icon--${tag.toLowerCase()}`} title={t.title} style={{ opacity: 1 }}>
                  {t.icon}
                </span>
              ) : (
                <span key={i} className="deck-tag">{tag}</span>
              );
            })}
            <div className="deck-aspect-row">
              <span className="deck-aspect-dot" style={{ background: headerColor }} />
              <span className="deck-aspect-name">{aspect.charAt(0).toUpperCase() + aspect.slice(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="deck-footer">
        <span className="deck-footer-private-badge">🔒 Private</span>
        <div className="deck-footer-right" style={{ display: 'flex', gap: '8px', zIndex: 10, position: 'relative' }}>
          <button className="deck-action-btn" onClick={handleEdit} title="Edit">✏️</button>
          <button className="deck-action-btn" disabled={busy === 'clone'} onClick={handleClone} title="Clone">
            {busy === 'clone' ? '…' : '📋'}
          </button>
          <button className="deck-action-btn" disabled={busy === 'publish'} onClick={handlePublish} title="Publish">
            {busy === 'publish' ? '…' : '📤'}
          </button>
          <button className="deck-action-btn" disabled={busy === 'delete'} onClick={handleDelete} title="Delete">
            {busy === 'delete' ? '…' : '🗑️'}
          </button>
          <PrintDeckButton deckId={deck.id} deckName={deck.name} isPrivate={true} />
          <ExportOctgnButton deckId={deck.id} deckName={deck.name} isPrivate={true} />
        </div>
      </div>
    </div>
  );
}
