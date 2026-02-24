import React, { useState, useEffect, useRef } from 'react';
import DeckContent from '@components/DeckContent';
import DeckStatistics from '@components/DeckStatistics';
import DeckHistory from '@components/DeckHistory';
import DeckEditor from '@components/DeckEditor';
import { getFactionColor } from '@utils/dataUtils';
import '@css/DeckView.css';

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    return u && (u.id || u.userId);
  } catch (e) { return null; }
}

export default function DeckView() {
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [liveSlots, setLiveSlots] = useState(null); // preview en temps réel
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const editorRef = useRef(null);
  const [locale, setLocale] = useState(
    () => localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en'
  );

  // Re-fetch when the user switches language
  useEffect(() => {
    function onLocaleChange() {
      setLocale(localStorage.getItem('mc_locale') || 'en');
    }
    window.addEventListener('mc_locale_changed', onLocaleChange);
    return () => window.removeEventListener('mc_locale_changed', onLocaleChange);
  }, []);

  // Determine if public or private from URL
  const path = window.location.pathname;
  const isPrivate = path.startsWith('/my-decks/');
  const idMatch = path.match(/\/(\d+)(?:\/|$)/);
  const deckId = idMatch ? parseInt(idMatch[1], 10) : null;

  useEffect(() => {
    if (!deckId) {
      setError('Invalid deck ID.');
      setLoading(false);
      return;
    }

    const userId = currentUserId();

    let url;
    if (isPrivate) {
      if (!userId) {
        setError('Please log in to view this deck.');
        setLoading(false);
        return;
      }
      url = `/api/public/user/${userId}/decks/${deckId}?locale=${locale}`;
    } else {
      url = `/api/public/decks/${deckId}?locale=${locale}`;
    }

    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setDeck(data.data);
        } else {
          setError(data.error || 'Deck not found.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load deck', err);
        setError('Network error. Please try again.');
        setLoading(false);
      });
  }, [deckId, isPrivate, locale]);

  const handleBack = () => {
    window.history.back();
  };

  if (loading) {
    return (
      <div className="deck-view-container">
        <div className="deck-view-loading">Loading deck…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deck-view-container">
        <button className="deck-view-back" onClick={handleBack}>← Back</button>
        <div className="deck-view-error">{error}</div>
      </div>
    );
  }

  // Aspect color
  let aspect = 'basic';
  try {
    const meta = typeof deck.meta === 'string' ? JSON.parse(deck.meta) : deck.meta;
    if (meta && meta.aspect) aspect = meta.aspect;
  } catch (_) {}
  const headerColor = getFactionColor(aspect);

  const heroImage    = deck.hero_imagesrc    || null;
  const alterImage   = deck.alter_ego_imagesrc || null;

  const updatedAt = deck.date_update || deck.date_creation
    ? new Date(deck.date_update || deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="deck-view-container">
      <div className="deck-view-actions">
        <button className="deck-view-back" onClick={handleBack}>← Back</button>
        <button className="deck-view-edit" onClick={() => {
          if (showEditor) { setShowEditor(false); setLiveSlots(null); setSaveError(null); }
          else setShowEditor(true);
        }}>
          {showEditor ? 'Close Editor' : 'Edit'}
        </button>
        {showEditor && (
          <>
            {saveError && <span className="deck-view-save-error">{saveError}</span>}
            <button
              className="deck-view-save-btn"
              disabled={saving}
              onClick={async () => {
                setSaving(true); setSaveError(null);
                try { await editorRef.current?.save(); }
                catch (e) { setSaveError(e?.message || 'Save failed.'); }
                finally { setSaving(false); }
              }}
            >{saving ? 'Saving…' : 'Save'}</button>
            <button className="deck-view-cancel-btn" onClick={() => { setShowEditor(false); setLiveSlots(null); setSaveError(null); }}>Cancel</button>
          </>
        )}
      </div>

      {/* Hero banner repensé */}
      <div className="deck-view-banner">
        
        {/* Calque des images */}
        <div className="banner-cards-layer">
          {heroImage && <img className="banner-card card-hero" src={heroImage} alt={deck.hero_name} />}
          {alterImage && <img className="banner-card card-alterego" src={alterImage} alt="Alter-Ego" />}
        </div>

        {/* Infos textuelles centrées */}
        <div className="deck-view-banner-info" style={{ borderTop: `4px solid ${headerColor}` }}>
          <div className="deck-view-title-row">
            <h1 className="deck-view-title">{deck.name}</h1>
          </div>
          <div className="deck-view-subtitle">
            {deck.hero_name && <span className="deck-view-hero">{deck.hero_name}</span>}
            {deck.version && <span className="deck-view-version">v{deck.version}</span>}
            <span className="deck-view-aspect-dot" style={{ background: headerColor }} />
            <span className="deck-view-aspect-name">{aspect.charAt(0).toUpperCase() + aspect.slice(1)}</span>
            {isPrivate && <span className="deck-view-private-badge">🔒 Private</span>}
            {deck.author_name && <span className="deck-view-author">by {deck.author_name}</span>}
          </div>
          <div className="deck-view-stats mt-2">
            {updatedAt && <span className="deck-view-updated">Updated {updatedAt}</span>}
            {deck.likes     != null && <span className="deck-view-stat">♥ {deck.likes}</span>}
            {deck.favorites != null && <span className="deck-view-stat">★ {deck.favorites}</span>}
            {deck.comments  != null && <span className="deck-view-stat">💬 {deck.comments}</span>}
          </div>
        </div>

      </div>

      {/* Corps : layout conditionnel selon mode édition */}
      <div className={`deck-view-body${showEditor ? ' deck-view-body--editing' : ''}`}>
        <div className={`deck-view-left${showEditor ? ' deck-view-left--compact' : ''}`}>
          <DeckContent slots={liveSlots ?? deck.slots ?? []} />
        </div>
        {!showEditor && (
          <div className="deck-view-right">
            <DeckStatistics slots={liveSlots ?? deck.slots ?? []} packsRequired={deck.packs_required} />
          </div>
        )}
        {!showEditor && (
          <div className="deck-view-history-col">
            <DeckHistory
              deckId={deckId}
              isPrivate={isPrivate}
              locale={locale}
              refreshKey={historyRefreshKey}
            />
          </div>
        )}
        {showEditor && (
          <div className="deck-view-editor-panel">
            <DeckEditor
              ref={editorRef}
              deck={deck}
              deckId={deckId}
              isPrivate={isPrivate}
              onSlotsChange={slots => setLiveSlots(slots)}
              onClose={() => { setShowEditor(false); setLiveSlots(null); setSaveError(null); }}
              onSaved={() => {
                setShowEditor(false);
                setLiveSlots(null);
                setSaveError(null);
                setHistoryRefreshKey(k => k + 1);
                window.location.reload();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}