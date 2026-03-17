import React from 'react';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';
import DeckCard from '@components/DeckCard';

export default function PrivateDeck({ deck }) {
  const [busy, setBusy] = React.useState(null);

  const currentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      return u && (u.id || u.userId);
    } catch (e) { return null; }
  };

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

  const updatedAt = deck.date_update
    ? new Date(deck.date_update).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : deck.date_creation
      ? new Date(deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

  const footerLeft = (
    <span className="deck-footer-private-badge">🔒 Private</span>
  );

  const actionButtons = (
    <>
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
      <div className="deck-date" style={{ marginLeft: '4px' }}>
        {updatedAt}
      </div>
    </>
  );

  return (
    <DeckCard
      deck={deck}
      onClick={handleCardClick}
      footerLeft={footerLeft}
      actionButtons={actionButtons}
    />
  );
}
