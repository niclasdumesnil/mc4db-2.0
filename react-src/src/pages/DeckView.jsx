import React, { useState, useEffect, useRef, useMemo } from 'react';
import DeckContent from '@components/DeckContent';
import DeckStatistics from '@components/DeckStatistics';
import DeckHistory from '@components/DeckHistory';
import DeckEditor from '@components/DeckEditor';
import { getFactionColor, getFactionFgColor, DECK_TAGS } from '@utils/dataUtils';
import { getDeckProblems, getSaveProblems, getInvalidCodes, inferDeckAspect } from '@utils/deckValidation';
import MarkdownEditor from '@components/MarkdownEditor';
import MarkdownViewer from '@components/MarkdownViewer';
import PrintDeckButton from '@components/PrintDeckButton';
import ExportOctgnButton from '@components/ExportOctgnButton';
import DeckComments from '@components/DeckComments';
import { useFactions } from '../hooks/useFactions';
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
  const factionsMap = useFactions();
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(() => {
    return new URLSearchParams(window.location.search).get('edit') === 'true';
  });
  const [showDescriptionPanel, setShowDescriptionPanel] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
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
  const [voting, setVoting] = useState(false);

  const [uid, setUid] = useState(currentUserId());

  useEffect(() => {
    const handleAuthChange = () => setUid(currentUserId());
    window.addEventListener('mc_user_changed', handleAuthChange);
    return () => window.removeEventListener('mc_user_changed', handleAuthChange);
  }, []);

  // Deck-building state
  const [deckAspect, setDeckAspect] = useState(null);
  const [deckTags, setDeckTags] = useState('');
  const [customTagsText, setCustomTagsText] = useState('');
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [showBadges, setShowBadges] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user'));
      if (u && typeof u.show_tag_default !== 'undefined') {
        return u.show_tag_default === 1 || u.show_tag_default === true;
      }
    } catch (e) {}
    return true;
  });
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
    
    // Extract non-icon custom tags into text field
    if (deck.tags) {
      const tagsArr = deck.tags.split(',').map(t => t.trim()).filter(Boolean);
      const custom = tagsArr.filter(t => !DECK_TAGS[t]);
      setCustomTagsText(custom.join(', '));
    } else {
      setCustomTagsText('');
    }
    
    setLiveTitle(null); // reset live title on deck change
    setLiveDescription(null);
  }, [deck?.id, deck?.tags, deck?.meta, deck?.name]);

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
          const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || 'Deck not found.');
          setError(errMsg);
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

  const isPrivatePack = deck?.pack_visibility === 'false' || deck?.pack_visibility === false;

  const handlePublish = async () => {
    if (isPrivatePack) return;
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

  const handleToggleVote = async (type) => {
    const userId = currentUserId();
    if (!userId) {
      alert('You must be logged in to vote.');
      return;
    }
    if (String(deck.user_id) === String(userId)) {
      alert('You cannot vote on your own deck.');
      return;
    }
    setVoting(true);
    try {
      const res = await fetch(`/api/public/decks/${deckId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, type })
      });
      const data = await res.json();
      if (data.ok) {
        setDeck(prev => ({
          ...prev,
          ...(type === 'vote' ? { likes: data.nb_votes } : { favorites: data.nb_favorites })
        }));
      } else {
        alert(data.error || 'Vote failed');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setVoting(false);
    }
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
              <h1 
                className="deck-view-title"
                style={{
                  fontSize: (liveTitle ?? deck.name).length > 40 ? '1.45rem' : (liveTitle ?? deck.name).length > 25 ? '1.85rem' : undefined
                }}
              >
                {liveTitle ?? deck.name}
              </h1>
            </div>
            <div className="deck-view-subtitle" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {deck.hero_name && <span className="deck-view-hero">{deck.hero_name}</span>}
                {deck.version && <span className="deck-view-version">v{deck.version}</span>}
                <span className="deck-view-aspect-dot" style={{ background: headerColor }} />
                <span className="deck-view-aspect-name">{factionsMap[aspect] || aspect.charAt(0).toUpperCase() + aspect.slice(1)}</span>
                {isPrivate && (
                  deck.parent_decklist_id 
                    ? <span className="mc-badge mc-badge-published" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.9em', marginLeft: '6px' }} title="This deck is currently published on the site.">🌍 Published</span>
                    : <span className="deck-view-private-badge" style={{ marginLeft: '6px' }}>🔒 Private</span>
                )}
                {deck.author_name && <span className="deck-view-author">by {deck.author_name}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!isPrivate && deck && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--st-text-muted, #8a99af)' }}>
                    <button 
                      onClick={() => handleToggleVote('vote')} disabled={voting || isOwner} 
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: (voting || isOwner) ? 'default' : 'pointer', padding: 0, opacity: (voting || isOwner) ? 0.5 : 1 }} title={isOwner ? "You cannot vote on your own deck" : "Like"}
                    >🤍 {deck.likes || 0}</button>
                    <button 
                      onClick={() => handleToggleVote('favorite')} disabled={voting || isOwner} 
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: (voting || isOwner) ? 'default' : 'pointer', padding: 0, opacity: (voting || isOwner) ? 0.5 : 1 }} title={isOwner ? "You cannot favorite your own deck" : "Favorite"}
                    >⭐ {deck.favorites || 0}</button>
                    <span title="Comments" style={{ cursor: 'pointer' }} onClick={() => setShowDescriptionPanel(false)}>💬 {deck.comments || 0}</span>
                  </div>
                )}
                {updatedAt && (
                  <span className="deck-view-updated" style={{ color: 'var(--st-text-muted, #8a99af)', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📅 {updatedAt}
                  </span>
                )}
              </div>
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
                  
                  {/* Custom Tags Rendering */}
                  {(() => {
                    const currentTags = deckTags ? deckTags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
                    const customTagsList = currentTags.filter(t => !DECK_TAGS[t]);
                    
                    return (
                      <>
                        {!showEditor && customTagsList.map(tag => (
                          <span key={tag} className="mc-badge mc-badge-legacy" style={{ padding: '2px 8px', fontSize: '0.85rem' }}>
                            {tag}
                          </span>
                        ))}
                        {showEditor && (
                          <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
                            <input
                              type="text"
                              placeholder="Extra tags (e.g. tournament, fun)..."
                              value={customTagsText}
                              onChange={e => setCustomTagsText(e.target.value)}
                              title="Separate multiple custom tags with commas (e.g. 'tournament, funny, testing')"
                              style={{ 
                                background: 'var(--st-surface)', border: '1px solid var(--st-border)', color: 'var(--st-text)', 
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', 
                                minWidth: '220px'
                              }}
                            />
                            {/* Petit message explicatif sous l'input */}
                            {customTagsText.length > 0 && typeof customTagsText === 'string' && !customTagsText.includes(',') && customTagsText.indexOf(' ') !== -1 && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', fontSize: '0.65rem', color: 'var(--st-text-muted, #94a3b8)', whiteSpace: 'nowrap' }}>
                                Separate multiple tags with a comma <code style={{ color: 'var(--st-title, #fff)' }}>,</code>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Boutons à droite */}
          <div className="deck-view-banner-btns">
            {!showEditor && isPrivate && (
              <>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" onClick={() => setShowEditor(true)}>✏️ Edit</button>
                  <span className="dc-tooltip">Edit</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={cloning} onClick={handleClone}>
                    {cloning ? '…' : '📋'} Clone
                  </button>
                  <span className="dc-tooltip">Clone</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={publishing || isPrivatePack} onClick={handlePublish}>
                    {publishing ? '…' : '📤'} Publish
                  </button>
                  <span className="dc-tooltip">{isPrivatePack ? 'Cannot publish a deck with a hero from a private pack.' : 'Publish'}</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={deleting} onClick={handleDelete}>
                    {deleting ? '…' : '🗑️'} Delete
                  </button>
                  <span className="dc-tooltip">Delete</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <PrintDeckButton className="deck-view-action-btn" deckId={deckId} deckName={liveTitle ?? deck.name} isPrivate={isPrivate} label="Print" />
                  <span className="dc-tooltip">Print Deck</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <ExportOctgnButton className="deck-view-action-btn" deckId={deckId} deckName={liveTitle ?? deck.name} isPrivate={isPrivate}>
                    📁 Export
                  </ExportOctgnButton>
                  <span className="dc-tooltip">Export OCTGN</span>
                </span>
              </>
            )}
            {!showEditor && !isPrivate && (
              <>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={true}>✏️ Edit</button>
                  <span className="dc-tooltip">Cannot edit a public deck</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={cloning} onClick={handleClone}>
                    {cloning ? '…' : '📋'} Clone
                  </button>
                  <span className="dc-tooltip">Clone</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={true}>📤 Publish</button>
                  <span className="dc-tooltip">Already published</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <button className="deck-view-action-btn" disabled={!isOwner || deleting} onClick={isOwner ? handleDelete : undefined}>
                    {deleting ? '…' : '📥'} Unpublish
                  </button>
                  <span className="dc-tooltip">{isOwner ? "Unpublish" : "You can only unpublish your own decks"}</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <PrintDeckButton className="deck-view-action-btn" deckId={deckId} deckName={deck.name} isPrivate={false} label="Print" />
                  <span className="dc-tooltip">Print Deck</span>
                </span>
                <span className="dc-tooltip-wrap deck-view-action-btn-wrap">
                  <ExportOctgnButton className="deck-view-action-btn" deckId={deckId} deckName={deck.name} isPrivate={false}>
                    📁 Export
                  </ExportOctgnButton>
                  <span className="dc-tooltip">Export OCTGN</span>
                </span>
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
                        
                        const iconTags = deckTags.split(',').map(t => t.trim()).filter(t => t && DECK_TAGS[t]);
                        const extraTags = customTagsText.split(',').map(t => t.trim()).filter(Boolean);
                        const finalTagsToSave = [...iconTags, ...extraTags].join(',');

                        await editorRef.current?.save({
                          name: titleToSave,
                          description_md: descriptionToSave,
                          meta: metaToSave,
                          tags: finalTagsToSave,
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
          <button
            className={`deck-view-mode-btn${showBadges ? ' active' : ''}`}
            onClick={() => setShowBadges(!showBadges)}
          >🏷 Show Badge</button>
          {deck?.precedent_decklist_id && (
            <button
              className="deck-view-mode-btn"
              onClick={() => window.location.href = `/decklists/${deck.precedent_decklist_id}`}
              title="See the previous version of this deck"
            >⬅ Previous</button>
          )}
          {deck?.next_deck && (
            <button
              className="deck-view-mode-btn"
              onClick={() => window.location.href = `/decklists/${deck.next_deck}`}
              title="See the next version of this deck"
            >Next ➡</button>
          )}
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
                  const fgColor = getFactionFgColor(asp);
                  const isActive = deckAspect === asp;
                  return (
                    <button
                      key={asp}
                      className={`editor-faction-btn${isActive ? ' editor-faction-btn--active' : ''}`}
                      style={{
                        '--fac-color': color,
                        borderColor: isActive ? color : `${fgColor}55`,
                        background: isActive ? color : `${color}18`,
                        color: isActive ? '#fff' : fgColor,
                      }}
                      onClick={() => setDeckAspect(prev => prev === asp ? null : asp)}
                    >{factionsMap[asp] || ASPECT_LABELS[asp]}</button>
                  );
                })}
              </div>
            </div>

          </>
        )}
        {/* Right side items: Description */}
        {!showEditor && (
          <div className="dvt-section" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Show Description Button */}
            {deck?.description_md && (
              <button
                className={`deck-view-mode-btn${showDescriptionPanel ? ' active' : ''}`}
                onClick={() => setShowDescriptionPanel(!showDescriptionPanel)}
              >
                📝 {showDescriptionPanel ? 'Hide Description' : 'Show Description'}
              </button>
            )}
          </div>
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
      </div>

      {/* Corps : layout conditionnel selon mode édition */}
      <div className={`deck-view-body${showEditor ? ' deck-view-body--editing' : ''}`}>
        <div className={`deck-view-left${showEditor ? ' deck-view-left--compact' : ''}`}>

          <DeckContent
            slots={liveSlots ?? deck.slots ?? []}
            sideSlots={liveSideSlots ?? deck.side_slots ?? []}
            mode={displayMode}
            showBadges={showBadges}
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
              
              {/* Derived from / Inspiration for (Public Decks only) */}
              {!isPrivate && (
                <div className="set-stats-body">
                  {/* Derived From */}
                  <div className="set-stats-section" style={{ borderTop: '1px solid var(--st-border)' }}>
                    <p className="set-stats-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: '#fff', borderRadius: '3px', fontSize: '0.65rem', width: '16px', height: '16px', fontWeight: 'bold', textTransform: 'none', letterSpacing: 'normal' }}>&laquo;</span> Derived from
                    </p>
                    {deck.derived_from_deck ? (
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', gap: '12px' }}>
                        <a href={`/decklists/${deck.derived_from_deck.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }} title={deck.derived_from_deck.name}>{deck.derived_from_deck.name}</a>
                        <span style={{ display: 'flex', gap: '12px', color: 'var(--st-text-muted)' }}>
                          <span title="Likes" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🤍 {deck.derived_from_deck.likes}</span>
                          <span title="Favorites" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⭐ {deck.derived_from_deck.favorites}</span>
                          <span title="Comments" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>💬 {deck.derived_from_deck.comments}</span>
                          <span title="Version" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1' }}>v{deck.derived_from_deck.version}</span>
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--st-text-muted)', fontStyle: 'italic' }}>None</div>
                    )}
                  </div>

                  {/* Inspiration For */}
                  <div className="set-stats-section">
                    <p className="set-stats-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: '#fff', borderRadius: '3px', fontSize: '0.65rem', width: '16px', height: '16px', fontWeight: 'bold', textTransform: 'none', letterSpacing: 'normal' }}>&raquo;</span> Inspiration for
                    </p>
                    {deck.inspiration_for_decks && deck.inspiration_for_decks.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {deck.inspiration_for_decks.map(d => (
                          <div key={d.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', gap: '12px' }}>
                            <a href={`/decklists/${d.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }} title={d.name}>{d.name}</a>
                            <span style={{ display: 'flex', gap: '12px', color: 'var(--st-text-muted)' }}>
                              <span title="Likes" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🤍 {d.likes}</span>
                              <span title="Favorites" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⭐ {d.favorites}</span>
                              <span title="Comments" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>💬 {d.comments}</span>
                              <span title="Version" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1' }}>v{d.version}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--st-text-muted)', fontStyle: 'italic' }}>None yet</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {!showEditor && showDescriptionPanel && deck?.description_md && (
          <div className="deck-view-description-col">
            <div className="deck-description-container">
              <MarkdownViewer content={deck.description_md} />
            </div>
          </div>
        )}
        {!showEditor && !showDescriptionPanel && (
          <div className="deck-view-right-group">
            {isPrivate && (
              <div className="deck-view-history-col">
                <DeckHistory
                  deckId={deckId}
                  isPrivate={isPrivate}
                  locale={locale}
                  refreshKey={historyRefreshKey}
                />
              </div>
            )}
            {!isPrivate && (
              <div className="deck-view-comments-col">
                <DeckComments 
                  deckId={deckId} 
                  uid={uid} 
                  updateCommentCount={() => setDeck(prev => prev ? ({ 
                    ...prev, 
                    comments: (prev.comments || 0) + 1 
                  }) : null)}
                />
              </div>
            )}
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
              setShowUnauthorized={setShowUnauthorized}
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