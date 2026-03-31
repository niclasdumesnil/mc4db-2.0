import React from 'react';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';
import DeckCard, { RepBadge } from '@components/DeckCard';
import ModalDialog from '@components/ModalDialog';

export default function PublicDeck({ deck }) {
  const [busy, setBusy] = React.useState(null);

  const [unpublishModalOpen, setUnpublishModalOpen] = React.useState(false);
  const [cloneModalOpen, setCloneModalOpen] = React.useState(false);

  const currentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      return u && (u.id || u.userId);
    } catch (e) { return null; }
  };

  const handleCardClick = () => { window.location.href = `/decklist/view/${deck.id}`; };

  const handleClone = (e) => {
    e.stopPropagation();
    setCloneModalOpen(true);
  };

  const confirmClone = async () => {
    setCloneModalOpen(false);
    setBusy('clone');
    try {
      const uid = currentUserId();
      const r = await fetch(`/api/public/user/${uid}/decklists/${deck.id}/clone`, { method: 'POST' });
      const data = await r.json();
      if (data.ok) window.location.href = `/my-decks/${data.data.id}`;
      else alert(data.error || 'Clone failed.');
    } catch { alert('Network error.'); }
    finally { setBusy(null); }
  };

  const handleUnpublish = (e) => {
    e.stopPropagation();
    setUnpublishModalOpen(true);
  };

  const confirmUnpublish = async () => {
    setUnpublishModalOpen(false);
    setBusy('unpublish');
    try {
      const uid = currentUserId();
      const r = await fetch(`/api/public/user/${uid}/decklists/${deck.id}`, { method: 'DELETE' });
      const data = await r.json();
      if (data.ok) window.location.reload();
      else alert(data.error || 'Unpublish failed.');
    } catch { alert('Network error.'); }
    finally { setBusy(null); }
  };

  const uid = currentUserId();
  const isOwner = uid && String(deck.user_id) === String(uid);

  const statsRow = (
    <>
      <span className="stat" title="Likes">🤍 {deck.likes || 0}</span>
      <span className="stat" title="Favorites">⭐ {deck.favorites || 0}</span>
      <span className="stat" title="Comments">💬 {deck.comments || 0}</span>
    </>
  );

  const footerLeft = (
    <div className="author-info">
      <span className="by">by</span>
      <span className="author-name">{deck.author_name}</span>
      <RepBadge reputation={deck.author_reputation} />
    </div>
  );

  const actionButtons = (
    <>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn deck-action-btn--disabled" disabled={true}>✏️</button>
        <span className="dc-tooltip">Cannot edit a public deck</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn" disabled={busy === 'clone'} onClick={handleClone}>
          {busy === 'clone' ? '…' : '📋'}
        </button>
        <span className="dc-tooltip">Clone</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn deck-action-btn--disabled" disabled={true}>📤</button>
        <span className="dc-tooltip">Already published</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <button className="deck-action-btn" disabled={!isOwner || deck.parent_deck_id === null || busy === 'unpublish'} onClick={isOwner && deck.parent_deck_id !== null ? handleUnpublish : undefined}>
          {busy === 'unpublish' ? '…' : '📥'}
        </button>
        <span className="dc-tooltip">{deck.parent_deck_id === null ? "Cannot unpublish: the original private deck has been deleted" : isOwner ? "Unpublish" : "You can only unpublish your own decks"}</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <PrintDeckButton deckId={deck.id} deckName={deck.name} isPrivate={false} />
        <span className="dc-tooltip">Print Deck</span>
      </span>
      <span className="dc-tooltip-wrap" onClick={e => e.stopPropagation()}>
        <ExportOctgnButton deckId={deck.id} deckName={deck.name} isPrivate={false} />
        <span className="dc-tooltip">Export OCTGN</span>
      </span>
      <div className="deck-date" style={{ marginLeft: '4px' }}>
        {new Date(deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </>
  );

  return (
    <>
      <DeckCard
        deck={deck}
        onClick={handleCardClick}
        statsRow={statsRow}
        footerLeft={footerLeft}
        actionButtons={actionButtons}
      />

      <ModalDialog
        isOpen={unpublishModalOpen}
        onClose={() => setUnpublishModalOpen(false)}
        onConfirm={confirmUnpublish}
        title=""
        confirmText="Unpublish"
        cancelText="Cancel"
        isDestructive={true}
      >
        <p><strong>Are you sure you want to unpublish this public deck chain?</strong></p>
        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--st-text)', opacity: 0.8 }}>
          This will remove the deck and its entire version history from the community. Links from other decks will be preserved without exposing this content. This action cannot be undone.
        </p>
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
          This will create a new private deck copy in your workspace.
        </p>
      </ModalDialog>
    </>
  );
}