import React from 'react';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';
import DeckCard, { RepBadge } from '@components/DeckCard';

export default function PublicDeck({ deck }) {
  const [busy, setBusy] = React.useState(null);

  const currentUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      return u && (u.id || u.userId);
    } catch (e) { return null; }
  };

  const handleCardClick = () => { window.location.href = `/decklist/view/${deck.id}`; };

  const handleClone = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to clone this deck?')) return;
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

  const handleUnpublish = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to unpublish this public deck?')) return;
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
      <button className="deck-action-btn deck-action-btn--disabled" disabled={true} title="Cannot edit a public deck">✏️</button>
      <button className="deck-action-btn" disabled={busy === 'clone'} onClick={handleClone} title="Clone">
        {busy === 'clone' ? '…' : '📋'}
      </button>
      <button className="deck-action-btn deck-action-btn--disabled" disabled={true} title="Already published">📤</button>
      <button className="deck-action-btn" disabled={!isOwner || busy === 'unpublish'} onClick={isOwner ? handleUnpublish : undefined} title={isOwner ? "Unpublish" : "You can only unpublish your own decks"}>
        {busy === 'unpublish' ? '…' : '📥'}
      </button>
      <PrintDeckButton deckId={deck.id} deckName={deck.name} isPrivate={false} />
      <ExportOctgnButton deckId={deck.id} deckName={deck.name} isPrivate={false} />
      <div className="deck-date" style={{ marginLeft: '4px' }}>
        {new Date(deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </>
  );

  return (
    <DeckCard
      deck={deck}
      onClick={handleCardClick}
      statsRow={statsRow}
      footerLeft={footerLeft}
      actionButtons={actionButtons}
    />
  );
}