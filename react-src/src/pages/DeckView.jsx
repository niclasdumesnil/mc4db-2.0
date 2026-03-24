import React, { useState, useEffect, useRef, useMemo } from 'react';
import DeckContent from '@components/DeckContent';
import DeckStatistics from '@components/DeckStatistics';
import DeckHistory from '@components/DeckHistory';
import DeckEditor from '@components/DeckEditor';
import { getFactionColor, DECK_TAGS } from '@utils/dataUtils';
import { getDeckProblems, getSaveProblems, getInvalidCodes, inferDeckAspect } from '@utils/deckValidation';
import MarkdownEditor from '@components/MarkdownEditor';
import MarkdownViewer from '@components/MarkdownViewer';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';
import '@css/DeckView.css';

const ASPECT_LIST = ['aggression', 'justice', 'leadership', 'protection', 'determination', 'pool'];
const ASPECT_LABELS = {
  aggression: 'Aggression', justice: 'Justice', leadership: 'Leadership',
  protection: 'Protection', determination: 'Determination', pool: "'Pool"
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
  const [showEditor, setShowEditor] = useState(() => {
    return new URLSearchParams(window.location.search).get('edit') === 'true';
  });
  const [showDescriptionPanel, setShowDescriptionPanel] = useState(false);
  const [displayMode, setDisplayMode] = useState('list'); // 'list' | 'grid'
  const [liveSlots, setLiveSlots] = useState(null); // preview en temps réel
  const [liveSideSlots, setLiveSideSlots] = useState(null); // side deck preview en temps réel
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [liveTitle, setLiveTitle] = useState(null);
  const [liveDescription, setLiveDescription] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  // Deck-building state
  const [deckAspect, setDeckAspect] = useState(null);
  const [deckTags, setDeckTags] = useState('');
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [heroCard, setHeroCard] = useState(null);
  const [validationCards, setValidationCards] = useState([]);
  const [saveProblems, setSaveProblems] = useState([]); // problèmes vérifiés uniquement à la sauvegarde
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
    setLiveDescription(null);
  }, [deck?.id]);

  // Auto-infer aspect from live slots when editing, ONLY if no aspect is currently selected
  useEffect(() => {
    if (!liveSlots || validationCards.length === 0) return;
    setSaveProblems([]); // Clear save-time problems when the deck content changes
    
    setDeckAspect(prevAspect => {
      if (!prevAspect) {
        const slotsMap = Object.fromEntries(liveSlots.filter(s => s.quantity > 0).map(s => [s.code, s.quantity]));
        const inferred = inferDeckAspect(slotsMap, validationCards, heroCard);
        if (inferred) return inferred;
      }
      return prevAspect;
    });
  }, [liveSlots, validationCards, heroCard]);

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

  // Determine the current hero's card_set_code to allow editing of hero cards from other sets
  const heroSetCode = useMemo(() => {
    if (heroCard?.card_set_code) return heroCard.card_set_code;
    const heroCode = deck?.hero_code;
    if (!heroCode) return null;
    const currentSlots = liveSlots ?? deck?.slots ?? [];
    const heroSlot = currentSlots.find(s => s.code === heroCode);
    return heroSlot?.card_set_code || null;
  }, [heroCard, deck?.hero_code, deck?.slots, liveSlots]);

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

    if (!deck) setLoading(true);
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
    if (!window.confirm(isPrivate ? `Delete "${deck?.name}"? This cannot be undone.` : 'Are you sure you want to unpublish this public deck?')) return;
    setDeleting(true);
    const userId = currentUserId();
    try {
      const endpoint = isPrivate 
        ? `/api/public/user/${userId}/decks/${deckId}`
        : `/api/public/user/${userId}/decklists/${deckId}`;
      const r = await fetch(endpoint, { method: 'DELETE' });
      const data = await r.json();
      if (data.ok) window.location.href = isPrivate ? '/my-decks' : '/decklists';
      else alert(data.error || 'Delete failed.');
    } catch { alert('Network error.'); }
    finally { setDeleting(false); }
  };

  const handleClone = async () => {
    if (!window.confirm('Are you sure you want to clone this deck?')) return;
    setCloning(true);
    const userId = currentUserId();
    try {
      const endpoint = isPrivate 
        ? `/api/public/user/${userId}/decks/${deckId}/clone`
        : `/api/public/user/${userId}/decklists/${deckId}/clone`;
      const r = await fetch(endpoint, { method: 'POST' });
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

  const uid = currentUserId();
  const isOwner = isPrivate || (uid && String(deck.user_id) === String(uid));

  return (
    <div className="deck-view-container">
      <div className="deck-view-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {updatedAt && <span className="deck-view-updated" style={{ marginLeft: 'auto', color: 'var(--st-text-muted, #8a99af)', fontSize: '0.9em' }}>Updated {updatedAt}</span>}
            </div>
            <div className="deck-view-stats mt-2">
              {deck.likes != null && <span className="deck-view-stat">♥ {deck.likes}</span>}
              {deck.favorites != null && <span className="deck-view-stat">★ {deck.favorites}</span>}
              {deck.comments != null && <span className="deck-view-stat">💬 {deck.comments}</span>}
            </div>
            {/* Affichage des tags (Mode Edition ET Mode Lecture) */}
            {(showEditor || (deckTags && deckTags.length > 0)) && (
              <div className="deck-view-tags-editor flex-row" style={{ marginTop: '14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '6px 0', width: '100%', boxSizing: 'border-box' }}>
                <span className="deck-view-tags-label" style={{ color: '#8a99af', fontWeight: 'bold', letterSpacing: '0.05em', fontSize: '0.8rem', marginRight: '4px' }}>TAGS</span>
                <div className="deck-filters__tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {Object.entries(DECK_TAGS).map(([key, t]) => {
                    const currentTags = deckTags ? deckTags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
                    const active = currentTags.includes(key);

                    // En lecture seule, on ne montre que les tags actifs
                    if (!showEditor && !active) return null;

                    return (
                      <button
                        key={key}
                        className={`deck-view-tag-btn ${active ? `deck-tag-icon--${key} active` : ''}`}
                        
                        style={{ cursor: showEditor ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (!showEditor) return;
                          const newTags = active
                            ? currentTags.filter(tag => tag !== key)
                            : [...currentTags, key];
                          setDeckTags(newTags.join(','));
                        }}
                      >
                        <span style={{ fontSize: '1.2em' }}>{t.icon}</span>
                        <span style={{ fontSize: '0.75rem', marginLeft: '6px' }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Boutons à droite */}
          <div className="deck-view-banner-btns">
            {!showEditor && isPrivate && (
              <>
                <button className="deck-view-action-btn" onClick={() => setShowEditor(true)} title="Edit">✏️ Edit</button>
                <button className="deck-view-action-btn" disabled={cloning} onClick={handleClone} title="Clone">
                  {cloning ? '…' : '📋'} Clone
                </button>
                <button className="deck-view-action-btn" disabled={publishing} onClick={handlePublish} title="Publish">
                  {publishing ? '…' : '📤'} Publish
                </button>
                <button className="deck-view-action-btn" disabled={deleting} onClick={handleDelete} title="Delete">
                  {deleting ? '…' : '🗑️'} Delete
                </button>
                <PrintDeckButton className="deck-view-action-btn" deckId={deckId} deckName={liveTitle ?? deck.name} isPrivate={isPrivate} label="Print" />
                <ExportOctgnButton className="deck-view-action-btn" deckId={deckId} deckName={liveTitle ?? deck.name} isPrivate={isPrivate}>
                  📁 Export
                </ExportOctgnButton>
              </>
            )}
            {!showEditor && !isPrivate && (
              <>
                <button className="deck-view-action-btn" disabled={true} title="You cannot edit a public deck">✏️ Edit</button>
                <button className="deck-view-action-btn" disabled={cloning} onClick={handleClone} title="Clone">
                  {cloning ? '…' : '📋'} Clone
                </button>
                <button className="deck-view-action-btn" disabled={true} title="Already published">📤 Publish</button>
                <button className="deck-view-action-btn" disabled={!isOwner || deleting} onClick={isOwner ? handleDelete : undefined} title={isOwner ? "Unpublish" : "You can only unpublish your own decks"}>
                  {deleting ? '…' : '📥'} Unpublish
                </button>
                <PrintDeckButton className="deck-view-action-btn" deckId={deckId} deckName={deck.name} isPrivate={false} label="Print" />
                <ExportOctgnButton className="deck-view-action-btn" deckId={deckId} deckName={deck.name} isPrivate={false}>
                  📁 Export
                </ExportOctgnButton>
              </>
            )}
              {showEditor && isPrivate && (
                <>
                  {saveError && <span className="deck-view-save-error">{saveError}</span>}
                  <button
                    className="deck-view-save-btn"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true); setSaveError(null);
                      try {
                        // Check save-only constraints (aspects, limit)
                        const currentSlots = liveSlots ?? deck?.slots ?? [];
                        const slotsMap = Object.fromEntries(currentSlots.filter(s => s.quantity > 0).map(s => [s.code, s.quantity]));
                        const sp = getSaveProblems(slotsMap, heroCard, validationCards);
                        if (sp.length > 0) {
                          setSaveProblems(sp);
                          setSaving(false);
                          return;
                        }
                        const titleToSave = (liveTitle ?? deck?.name ?? '').trim() || undefined;
                        const descriptionToSave = (liveDescription ?? deck?.description_md ?? '').trim() || undefined;
                        const metaToSave = { aspect: deckAspect || undefined };
                        await editorRef.current?.save({
                          name: titleToSave,
                          description_md: descriptionToSave,
                          meta: metaToSave,
                          tags: deckTags,
                        });
                      }
                      catch (e) { setSaveError(e?.message || 'Save failed.'); }
                      finally { setSaving(false); }
                    }}
                  >{saving ? 'Saving…' : 'Save'}</button>
                  <button className="deck-view-cancel-btn" onClick={() => { setShowEditor(false); setLiveSlots(null); setLiveSideSlots(null); setSaveError(null); setLiveTitle(null); setLiveDescription(null); setSaveProblems([]); }}>Cancel</button>
                </>
              )}
            </div>

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
          >⊞ Image</button>
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
              <div className="editor-filter-pills">
                {ASPECT_LIST.map(asp => {
                  const color = getFactionColor(asp);
                  const isActive = deckAspect === asp;
                  return (
                    <button
                      key={asp}
                      className={`editor-faction-btn${isActive ? ' editor-faction-btn--active' : ''}`}
                      style={{
                        '--fac-color': color,
                        borderColor: isActive ? color : `${color}55`,
                        background: isActive ? color : `${color}18`,
                        color: isActive ? '#fff' : `${color}cc`,
                      }}
                      onClick={() => setDeckAspect(prev => prev === asp ? null : asp)}
                    >{ASPECT_LABELS[asp]}</button>
                  );
                })}
              </div>
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
        {(deckProblems.length > 0 || saveProblems.length > 0) && (
          <div className="dvt-problems">
            {deckProblems.map((p, i) => (
              <div key={`dp-${i}`} className="dvt-problem-item">⚠ {p}</div>
            ))}
            {saveProblems.map((p, i) => (
              <div key={`sp-${i}`} className="dvt-problem-item dvt-problem-item--save">🚫 {p}</div>
            ))}
          </div>
        )}

        {/* Bouton pour la description (à l'extrême droite) */}
        {!showEditor && deck?.description_md && (
          <div className="dvt-section" style={{ marginLeft: 'auto' }}>
            <button
              className={`deck-view-mode-btn${showDescriptionPanel ? ' active' : ''}`}
              onClick={() => setShowDescriptionPanel(!showDescriptionPanel)}
            >
              📝 {showDescriptionPanel ? 'Hide Description' : 'Show Description'}
            </button>
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
            heroSetCode={heroSetCode}
            onTransferToSide={showEditor ? (code) => editorRef.current?.transfer(code, 'toSide') : null}
            onTransferToMain={showEditor ? (code) => editorRef.current?.transfer(code, 'toMain') : null}
            onChangeQty={showEditor ? (code, qty, limit) => editorRef.current?.setQty(code, qty, limit) : null}
            onChangeSideQty={showEditor ? (code, qty, limit) => editorRef.current?.setSideQty(code, qty, limit) : null}
          />
        {showEditor && (
          <>
            <div className="deck-view-description-editor" style={{ marginTop: '20px' }}>
              <MarkdownEditor 
                value={liveDescription ?? deck?.description_md ?? ''} 
                onChange={setLiveDescription} 
              />
            </div>
          </>
        )}
        </div>
        {!showEditor && !showDescriptionPanel && (
          <div className="deck-view-middle">
            <div className="deck-stats">
              <DeckStatistics slots={liveSlots ?? deck.slots ?? []} packsRequired={deck.packs_required} />
            </div>
          </div>
        )}
        {!showEditor && showDescriptionPanel && deck?.description_md && (
          <div className="deck-view-right" style={{ flex: '0 0 640px', maxWidth: '100%' }}>
            <div className="deck-description-container">
              <MarkdownViewer content={deck.description_md} />
            </div>
          </div>
        )}
        {!showEditor && !showDescriptionPanel && isPrivate && (
          <div className="deck-view-history-col">
            <DeckHistory
              deckId={deckId}
              isPrivate={isPrivate}
              locale={locale}
              refreshKey={historyRefreshKey}
            />
          </div>
        )}
        {!showEditor && !showDescriptionPanel && !isPrivate && (
          <div className="deck-view-right"></div>
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
              onClose={() => { setShowEditor(false); setLiveSlots(null); setLiveSideSlots(null); setSaveError(null); setLiveTitle(null); setLiveDescription(null); }}
              onSaved={async () => {
                setShowEditor(false);
                setLiveSlots(null);
                setLiveSideSlots(null);
                setSaveError(null);
                setHistoryRefreshKey(k => k + 1);
                
                // Fetch the updated deck without full page reload
                const userId = currentUserId();
                const url = isPrivate ? `/api/public/user/${userId}/decks/${deckId}?locale=${locale}` : `/api/public/decks/${deckId}?locale=${locale}`;
                try {
                  const res = await fetch(url);
                  const data = await res.json();
                  if (data.ok) setDeck(data.data);
                } catch (e) {
                  console.error('Failed to reload deck after save', e);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}