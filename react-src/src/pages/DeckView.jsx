import React, { useState, useEffect, useRef, useMemo } from 'react';
import DeckContent from '@components/DeckContent';
import DeckStatistics from '@components/DeckStatistics';
import DeckHistory from '@components/DeckHistory';
import DeckEditor from '@components/DeckEditor';
import { getFactionColor } from '@utils/dataUtils';
import { getDeckProblems, getInvalidCodes, inferDeckAspect } from '@utils/deckValidation';
import '@css/DeckView.css';

const ASPECT_LIST = ['aggression', 'justice', 'leadership', 'protection', 'determination'];
const ASPECT_LABELS = {
  aggression: 'Aggression', justice: 'Justice', leadership: 'Leadership',
  protection: 'Protection', determination: 'Determination',
};

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
  const [displayMode, setDisplayMode] = useState('list'); // 'list' | 'grid'
  const [liveSlots, setLiveSlots] = useState(null); // preview en temps réel
  const [liveSideSlots, setLiveSideSlots] = useState(null); // side deck preview en temps réel
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [liveTitle, setLiveTitle] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Deck-building state
  const [deckAspect, setDeckAspect] = useState(null);
  const [deckTags, setDeckTags] = useState('');
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [heroCard, setHeroCard] = useState(null);
  const [validationCards, setValidationCards] = useState([]);
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

  // Initialize deckAspect and deckTags from deck meta when deck loads
  useEffect(() => {
    if (!deck) return;
    try {
      const meta = typeof deck.meta === 'string' ? JSON.parse(deck.meta) : deck.meta;
      if (meta?.aspect) setDeckAspect(meta.aspect);
    } catch (_) {}
    setDeckTags(deck.tags || '');
    setLiveTitle(null); // reset live title on deck change
  }, [deck?.id]);

  // Auto-infer aspect from live slots when editing
  useEffect(() => {
    if (!liveSlots || validationCards.length === 0) return;
    const slotsMap = Object.fromEntries(liveSlots.filter(s => s.quantity > 0).map(s => [s.code, s.quantity]));
    const inferred = inferDeckAspect(slotsMap, validationCards, heroCard);
    if (inferred && inferred !== deckAspect) {
      setDeckAspect(inferred);
    }
  }, [liveSlots, validationCards]);

  // Compute invalid card codes for DeckContent highlighting
  const invalidCodes = useMemo(() => {
    if (validationCards.length === 0) return new Set();
    const currentSlots = liveSlots ?? deck?.slots ?? [];
    const slotsMap = Object.fromEntries(currentSlots.filter(s => s.quantity > 0).map(s => [s.code, s.quantity]));
    return getInvalidCodes(slotsMap, heroCard, validationCards, deckAspect);
  }, [liveSlots, deck?.slots, heroCard, validationCards, deckAspect]);

  // Compute deck validation problems
  const deckProblems = useMemo(() => {
    if (validationCards.length === 0) return [];
    const currentSlots = liveSlots ?? deck?.slots ?? [];
    const slotsMap = Object.fromEntries(currentSlots.filter(s => s.quantity > 0).map(s => [s.code, s.quantity]));
    return getDeckProblems(slotsMap, heroCard, validationCards, deckAspect);
  }, [liveSlots, deck?.slots, heroCard, validationCards, deckAspect]);

  // Determine if public or private from URL
  const path = window.location.pathname;
  const isPrivate = path.startsWith('/my-decks/') || path.startsWith('/deck/view/');
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

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${deck?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const userId = currentUserId();
    try {
      const r = await fetch(`/api/public/user/${userId}/decks/${deckId}`, { method: 'DELETE' });
      const data = await r.json();
      if (data.ok) window.location.href = '/my-decks';
      else alert(data.error || 'Delete failed.');
    } catch { alert('Network error.'); }
    finally { setDeleting(false); }
  };

  const handleClone = async () => {
    if (!window.confirm('Are you sure you want to clone this deck?')) return;
    setCloning(true);
    const userId = currentUserId();
    try {
      const r = await fetch(`/api/public/user/${userId}/decks/${deckId}/clone`, { method: 'POST' });
      const data = await r.json();
      if (data.ok) window.location.href = `/my-decks/${data.data.id}`;
      else alert(data.error || 'Clone failed.');
    } catch { alert('Network error.'); }
    finally { setCloning(false); }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this deck?')) return;
    setPublishing(true);
    const userId = currentUserId();
    try {
      const r = await fetch(`/api/public/user/${userId}/decks/${deckId}/publish`, { method: 'PUT' });
      const data = await r.json();
      if (data.ok) window.location.reload();
      else alert(data.error || 'Publish failed.');
    } catch { alert('Network error.'); }
    finally { setPublishing(false); }
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
  } catch (_) { }
  const headerColor = getFactionColor(aspect);

  const heroImage = deck.hero_imagesrc || null;
  const alterImage = deck.alter_ego_imagesrc || null;

  const updatedAt = deck.date_update || deck.date_creation
    ? new Date(deck.date_update || deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="deck-view-container">
      <div className="deck-view-actions">
        <button className="deck-view-back" onClick={handleBack}>← Back</button>
      </div>

      {/* Hero banner repensé */}
      <div className="deck-view-banner">

        {/* Calque des images */}
        <div className="banner-cards-layer">
          {heroImage && <img className="banner-card card-hero" src={heroImage} alt={deck.hero_name} />}
          {alterImage && <img className="banner-card card-alterego" src={alterImage} alt="Alter-Ego" />}
        </div>

        {/* Centre : encart + boutons côte à côte, ensemble centré */}
        <div className="deck-view-banner-center">

          {/* Infos textuelles */}
          <div className="deck-view-banner-info" style={{ borderTop: `4px solid ${headerColor}` }}>
            <div className="deck-view-title-row">
              <h1 className="deck-view-title">{liveTitle ?? deck.name}</h1>
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
              {deck.likes != null && <span className="deck-view-stat">♥ {deck.likes}</span>}
              {deck.favorites != null && <span className="deck-view-stat">★ {deck.favorites}</span>}
              {deck.comments != null && <span className="deck-view-stat">💬 {deck.comments}</span>}
            </div>
          </div>

          {/* Boutons à droite (seulement si deck privé) */}
          {isPrivate && (
            <div className="deck-view-banner-btns">
              {!showEditor && (
                <>
                  <button className="deck-view-edit" onClick={() => setShowEditor(true)}>Edit</button>
                  <button className="deck-view-clone-btn" disabled={cloning} onClick={handleClone}>
                    {cloning ? 'Cloning…' : 'Clone'}
                  </button>
                  <button className="deck-view-publish-btn" disabled={publishing} onClick={handlePublish}>
                    {publishing ? 'Publishing…' : 'Publish'}
                  </button>
                  <button className="deck-view-delete-btn" disabled={deleting} onClick={handleDelete}>
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </>
              )}
              {showEditor && (
                <>
                  {saveError && <span className="deck-view-save-error">{saveError}</span>}
                  <button
                    className="deck-view-save-btn"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true); setSaveError(null);
                      try {
                        const titleToSave = (liveTitle ?? deck?.name ?? '').trim() || undefined;
                        const metaToSave = { aspect: deckAspect || undefined };
                        await editorRef.current?.save({
                          name: titleToSave,
                          meta: metaToSave,
                          tags: deckTags,
                        });
                      }
                      catch (e) { setSaveError(e?.message || 'Save failed.'); }
                      finally { setSaving(false); }
                    }}
                  >{saving ? 'Saving…' : 'Save'}</button>
                  <button className="deck-view-cancel-btn" onClick={() => { setShowEditor(false); setLiveSlots(null); setLiveSideSlots(null); setSaveError(null); setLiveTitle(null); }}>Cancel</button>
                </>
              )}
            </div>
          )}

        </div>

      </div>

      {/* ── Deck Toolbar : mode de vue + contrôles d'édition ── */}
      <div className="deck-view-toolbar">

        {/* Mode de visualisation (toujours visible) */}
        <div className="dvt-section dvt-section--modes">
          <button
            className={`deck-view-mode-btn${displayMode === 'list' ? ' active' : ''}`}
            onClick={() => setDisplayMode('list')}
          >☰ List</button>
          <button
            className={`deck-view-mode-btn${displayMode === 'grid' ? ' active' : ''}`}
            onClick={() => setDisplayMode('grid')}
          >⊞ Scan</button>
        </div>

        {showEditor && (
          <>
            {/* Titre du deck */}
            <div className="dvt-section dvt-section--title">
              <input
                className="dvt-name-input"
                type="text"
                value={liveTitle ?? deck?.name ?? ''}
                onChange={e => setLiveTitle(e.target.value)}
                placeholder="Deck name…"
                maxLength={120}
              />
            </div>

            {/* Sélecteur d'affinité */}
            <div className="dvt-section dvt-section--aspect">
              <span className="dvt-label">Aspect</span>
              {ASPECT_LIST.map(asp => {
                const color = getFactionColor(asp);
                const isActive = deckAspect === asp;
                return (
                  <button
                    key={asp}
                    className={`dvt-aspect-btn${isActive ? ' dvt-aspect-btn--active' : ''}`}
                    style={{
                      '--asp-color': color,
                      borderColor: isActive ? color : `${color}55`,
                      background: isActive ? color : `${color}18`,
                      color: isActive ? '#fff' : `${color}cc`,
                    }}
                    onClick={() => setDeckAspect(prev => prev === asp ? null : asp)}
                  >{ASPECT_LABELS[asp]}</button>
                );
              })}
              {deckAspect && (
                <button
                  className="dvt-aspect-btn dvt-aspect-btn--clear"
                  onClick={() => setDeckAspect(null)}
                  title="Remove aspect restriction"
                >✕ Any</button>
              )}
            </div>

            {/* Tags */}
            <div className="dvt-section dvt-section--tags">
              <span className="dvt-label">Tags</span>
              <input
                className="dvt-tags-input"
                type="text"
                value={deckTags}
                onChange={e => setDeckTags(e.target.value)}
                placeholder="tag1,tag2,…"
              />
            </div>

            {/* Show Unauthorized Cards */}
            <div className="dvt-section">
              <button
                className={`dvt-unauthorized-btn${showUnauthorized ? ' dvt-unauthorized-btn--active' : ''}`}
                onClick={() => setShowUnauthorized(p => !p)}
                title="Show cards that do not comply with deck rules in the card browser"
              >
                {showUnauthorized ? '🔓 Showing Unauthorized' : '🔒 Show Unauthorized'}
              </button>
            </div>
          </>
        )}

        {/* Problèmes de validation (non-bloquants) */}
        {deckProblems.length > 0 && (
          <div className="dvt-problems">
            {deckProblems.map((p, i) => (
              <div key={i} className="dvt-problem-item">⚠ {p}</div>
            ))}
          </div>
        )}
      </div>

      {/* Corps : layout conditionnel selon mode édition */}
      <div className={`deck-view-body${showEditor ? ' deck-view-body--editing' : ''}`}>
        <div className={`deck-view-left${showEditor ? ' deck-view-left--compact' : ''}`}>

          <DeckContent
            slots={liveSlots ?? deck.slots ?? []}
            sideSlots={liveSideSlots ?? deck.side_slots ?? []}
            mode={displayMode}
            heroSpecialCards={deck.hero_special_cards ?? []}
            invalidCodes={invalidCodes}
            onTransferToSide={showEditor ? (code) => editorRef.current?.transfer(code, 'toSide') : null}
            onTransferToMain={showEditor ? (code) => editorRef.current?.transfer(code, 'toMain') : null}
            onChangeQty={showEditor ? (code, qty, limit) => editorRef.current?.setQty(code, qty, limit) : null}
            onChangeSideQty={showEditor ? (code, qty, limit) => editorRef.current?.setSideQty(code, qty, limit) : null}
          />
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
              deckAspect={deckAspect}
              showUnauthorized={showUnauthorized}
              onSlotsChange={slots => setLiveSlots(slots)}
              onSideSlotsChange={sideSlots => setLiveSideSlots(sideSlots)}
              onCardsLoaded={({ heroCard: hc, allCards: ac }) => {
                setHeroCard(hc);
                setValidationCards(ac);
              }}
              onClose={() => { setShowEditor(false); setLiveSlots(null); setLiveSideSlots(null); setSaveError(null); setLiveTitle(null); }}
              onSaved={() => {
                setShowEditor(false);
                setLiveSlots(null);
                setLiveSideSlots(null);
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