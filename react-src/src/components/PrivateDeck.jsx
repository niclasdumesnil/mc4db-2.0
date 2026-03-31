import React from 'react';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';
import DeckCard from '@components/DeckCard';
import ModalDialog from '@components/ModalDialog';

export default function PrivateDeck({ deck }) {
  const [busy, setBusy] = React.useState(null);
  const [publishModalOpen, setPublishModalOpen] = React.useState(false);
  const [cloneModalOpen, setCloneModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

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

  const handleCloneClick = (e) => {
    e.stopPropagation();
    setCloneModalOpen(true);
  };

  const confirmClone = async () => {
    setCloneModalOpen(false);
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

  const isPrivatePack = deck.pack_visibility === 'false' || deck.pack_visibility === false;

  const handlePublishClick = (e) => {
    e.stopPropagation();
    if (isPrivatePack) return;
    setPublishModalOpen(true);
  };

  const confirmPublish = async () => {
    setPublishModalOpen(false);
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

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteModalOpen(false);
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

  const footerLeft = deck.parent_decklist_id ? (
    <span className="mc-badge mc-badge-published" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85em', marginLeft: '6px' }} title="This deck is currently published on the site.">🌍 Published</span>
  ) : (
    <span className="deck-footer-private-badge">🔒 Private</span>
  );

  const actionButtons = (
    <>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn" onClick={handleEdit}>✏️</button>
        <span className="dc-tooltip">Edit</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn" disabled={busy === 'clone'} onClick={handleCloneClick}>
          {busy === 'clone' ? '…' : '📋'}
        </button>
        <span className="dc-tooltip">Clone</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button 
          className="deck-action-btn" 
          disabled={busy === 'publish' || isPrivatePack} 
          onClick={handlePublishClick} 
        >
          {busy === 'publish' ? '…' : '📤'}
        </button>
        <span className="dc-tooltip">{isPrivatePack ? 'Cannot publish a deck with a hero from a private pack.' : 'Publish'}</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn" disabled={busy === 'delete'} onClick={handleDeleteClick}>
          {busy === 'delete' ? '…' : '🗑️'}
        </button>
        <span className="dc-tooltip">Delete</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <PrintDeckButton deckId={deck.id} deckName={deck.name} isPrivate={true} />
        <span className="dc-tooltip">Print Deck</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <ExportOctgnButton deckId={deck.id} deckName={deck.name} isPrivate={true} />
        <span className="dc-tooltip">Export OCTGN</span>
      </span>
      <div className="deck-date" style={{ marginLeft: '4px' }}>
        {updatedAt}
      </div>
    </>
  );

  return (
    <>
      <DeckCard
        deck={deck}
        onClick={handleCardClick}
        footerLeft={footerLeft}
        actionButtons={actionButtons}
      />

      <ModalDialog
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onConfirm={confirmPublish}
        title=""
        confirmText="Publish"
        cancelText="Cancel"
      >
        {deck?.major_version > 0 ? (
          <>
            <p><strong>Are you sure you want to publish a new version of this deck?</strong></p>
            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--st-text)', opacity: 0.8 }}>
              This deck is currently published as version <strong>{deck.major_version}.0</strong>. 
              Publishing will create version <strong>{deck.major_version + 1}.0</strong> while keeping the older versions accessible.
            </p>
          </>
        ) : (
          <>
            <p><strong>Are you sure you want to publish this deck?</strong></p>
            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--st-text)', opacity: 0.8 }}>
              Publishing makes this deck visible to the community.
            </p>
          </>
        )}
      </ModalDialog>

      <ModalDialog
        isOpen={cloneModalOpen}
        onClose={() => setCloneModalOpen(false)}
        onConfirm={confirmClone}
        title=""
        confirmText="Clone"
        cancelText="Cancel"
      >
        <p><strong>Are you sure you want to clone this deck?</strong></p>
        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--st-text)', opacity: 0.8 }}>
          This will create a new private copy in your collection.
        </p>
      </ModalDialog>

      <ModalDialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title=""
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      >
        <p><strong>Are you sure you want to delete this deck?</strong></p>
        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--st-text)', opacity: 0.8 }}>
          This action cannot be undone.
        </p>
      </ModalDialog>
    </>
  );
}
