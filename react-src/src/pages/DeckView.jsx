import React, { useState, useEffect, useRef } from 'react';
import DeckContent from '@components/DeckContent';
import DeckStatistics from '@components/DeckStatistics';
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

  // Gradient depuis les couleurs meta du héros (1=gauche, 2=droite, 3=centre)
  let bannerGradient = null;
  try {
    const heroMeta = typeof deck.hero_meta === 'string' ? JSON.parse(deck.hero_meta) : deck.hero_meta;
    if (heroMeta && Array.isArray(heroMeta.colors) && heroMeta.colors.length >= 2) {
      const c = heroMeta.colors;
      const left   = c[0];
      const right  = c[1];
      const center = c[2] || c[0];
      bannerGradient = `linear-gradient(to right, ${left}, ${center}, ${right})`;
    }
  } catch (_) {}

  const heroImage    = deck.hero_imagesrc    || null;
  const alterImage   = deck.alter_ego_imagesrc || null;
  const packsCount   = deck.packs_required   ?? null;
  const totalCards   = Array.isArray(deck.slots) ? deck.slots.filter(s => !s.permanent).reduce((n, s) => n + s.quantity, 0) : null;

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

      {/* Hero banner */}
      <div
        className="deck-view-banner"
        style={bannerGradient ? { backgroundImage: bannerGradient } : undefined}
      >
        {/* Infos à gauche */}
        <div className="deck-view-banner-info">
          {/* Ligne 1 : titre + updated inline */}
          <div className="deck-view-title-row">
            <h1 className="deck-view-title">{deck.name}</h1>
            {updatedAt && <span className="deck-view-updated">Updated {updatedAt}</span>}
          </div>
          {/* Ligne 2 : private | hero | version | aspect | auteur | stats */}
          <div className="deck-view-subtitle">
            {deck.hero_name && <span className="deck-view-hero">{deck.hero_name}</span>}
            {deck.version && <span className="deck-view-version">v{deck.version}</span>}
            <span className="deck-view-aspect-dot" style={{ background: headerColor }} />
            <span className="deck-view-aspect-name">{aspect.charAt(0).toUpperCase() + aspect.slice(1)}</span>
            {isPrivate && <span className="deck-view-private-badge">🔒 Private</span>}
            {deck.author_name && <span className="deck-view-author">by {deck.author_name}</span>}
            {deck.likes     != null && <span className="deck-view-stat">♥ {deck.likes}</span>}
            {deck.favorites != null && <span className="deck-view-stat">★ {deck.favorites}</span>}
            {deck.comments  != null && <span className="deck-view-stat">💬 {deck.comments}</span>}
          </div>
        </div>

        {/* Images héros + alter-ego */}
        {(heroImage || alterImage) && (
          <div className="deck-view-banner-images">
            <div className="deck-view-banner-thumbs">
              {alterImage && <img className="deck-view-banner-thumb" src={alterImage} alt="Alter-Ego" />}
              {heroImage  && <img className="deck-view-banner-thumb" src={heroImage}  alt={deck.hero_name} />}
            </div>
          </div>
        )}
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
                window.location.reload();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
