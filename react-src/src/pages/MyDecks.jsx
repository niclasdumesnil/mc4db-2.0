import React, { useState, useEffect, useCallback } from 'react';
import PrivateDeck from '@components/PrivateDeck';
import DeckFilters from '@components/DeckFilters';
import { extractHeroes } from '@utils/dataUtils';
import '@css/PublicDecks.css';

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    return u && (u.id || u.userId);
  } catch (e) { return null; }
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return (
    <nav className="deck-pagination" aria-label="Pages">
      <button className="deck-pagination__btn" onClick={() => onPage(page - 1)} disabled={page <= 1}>&#8249;</button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="deck-pagination__ellipsis">&#8230;</span>
          : <button key={p} className={`deck-pagination__btn${p === page ? ' deck-pagination__btn--active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      )}
      <button className="deck-pagination__btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>&#8250;</button>
    </nav>
  );
}

const LIMIT = 12;
const EMPTY_FILTERS = { hero: '', aspects: [], tags: [] };

export default function MyDecks() {
  const id = currentUserId();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importId, setImportId] = useState('');
  const [importIsPrivate, setImportIsPrivate] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [heroes, setHeroes] = useState({ ffg: [], fanmade: [] });
  const [error, setError] = useState(null);

  // Charge tous les decks une seule fois pour construire la liste des héros disponibles
  useEffect(() => {
    if (!id) return;
    fetch(`/api/public/user/${id}/decks?page=1&limit=9999`)
      .then(r => r.json())
      .then(d => { if (d.ok) setHeroes(extractHeroes(d.data)); })
      .catch(() => { });
  }, [id]);

  const buildUrl = useCallback((p, f) => {
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (f.hero) params.set('hero', f.hero);
    if (f.aspects && f.aspects.length) f.aspects.forEach(a => params.append('aspect', a));
    if (f.tags && f.tags.length) f.tags.forEach(t => params.append('tag', t));
    return `/api/public/user/${id}/decks?${params}`;
  }, [id]);

  const loadPage = useCallback((p, f) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(buildUrl(p, f))
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setDecks(data.data);
          setTotalPages(data.meta.total_pages);
          setTotalItems(Number(data.meta.total_items));
        } else {
          setError(data.error || 'Failed to load decks');
        }
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(err => {
        console.error('Failed to load my decks', err);
        setError('Network error. Please try again.');
        setLoading(false);
      });
  }, [id, buildUrl]);

  useEffect(() => { loadPage(page, filters); }, [page, filters, loadPage]);

  const handleFilters = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
  };

  const submitImport = async (e) => {
    e.preventDefault();
    let rawInput = importId.trim();
    if (!rawInput) return;

    setImportLoading(true);
    setImportError(null);

    // Parse URL if the user pasted a full MarvelCDB link
    // Example public: https://marvelcdb.com/decklist/view/60037/turn-the-other-cheek-expert-ronan-1.0
    // Example private: https://marvelcdb.com/deck/view/123456
    let targetId = rawInput;
    let isPrivate = importIsPrivate;

    // Look for /decklist/view/12345 or /deck/view/12345
    const match = rawInput.match(/\/(decklist|deck)\/view\/(\d+)/i);
    if (match) {
      isPrivate = match[1].toLowerCase() === 'deck';
      setImportIsPrivate(isPrivate); // sync UI checkbox
      targetId = match[2];
    } else {
      // Just bare numbers? 
      const justDigits = rawInput.match(/^(\d+)$/);
      if (justDigits) {
        targetId = justDigits[1];
      } else {
        setImportError('Invalid ID or URL. Please provide a MarvelCDB Deck URL or its numerical ID.');
        setImportLoading(false);
        return;
      }
    }

    const endpoint = isPrivate ? 'deck' : 'decklist';
    let marvelCdbData;

    try {
      const res = await fetch(`https://marvelcdb.com/api/public/${endpoint}/${targetId}`);
      if (!res.ok) throw new Error('Deck not found on MarvelCDB.');
      marvelCdbData = await res.json();
    } catch (err) {
      setImportError(err.message || 'Failed to fetch from MarvelCDB.');
      setImportLoading(false);
      return;
    }

    try {
      // MarvelCDB 'meta' parsing
      let parsedMeta = {};
      if (typeof marvelCdbData.meta === 'string') {
        try { parsedMeta = JSON.parse(marvelCdbData.meta); } catch (e) { /* ignore */ }
      } else if (typeof marvelCdbData.meta === 'object' && marvelCdbData.meta !== null) {
        parsedMeta = marvelCdbData.meta;
      }

      // Fallback for older decks missing meta.aspect but having aspect_name
      if (!parsedMeta.aspect && marvelCdbData.aspect_name) {
        parsedMeta.aspect = marvelCdbData.aspect_name.toLowerCase();
      }

      const payload = {
        name: marvelCdbData.name || 'Imported Deck',
        investigator_code: marvelCdbData.investigator_code || marvelCdbData.character_code || marvelCdbData.hero_code, // fallback
        meta: Object.keys(parsedMeta).length > 0 ? parsedMeta : null,
        slots: marvelCdbData.slots,
        tags: marvelCdbData.tags
      };

      const res = await fetch(`/api/public/user/${id}/decks/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to import to database.');
      }

      // Success
      setImportId('');
      setShowImport(false);
      loadPage(1, filters); // Refresh the list
    } catch (err) {
      setImportError(err.message || 'Failed to save to local database.');
    } finally {
      setImportLoading(false);
    }
  };

  if (!id) {
    return (
      <div className="decks-page-container">
        <div className="decks-loading">Please log in to view your decks.</div>
      </div>
    );
  }

  return (
    <div className="decks-page-container">
      <div className="decks-page-top">
        <header className="decks-page-header">
          <div>
            <h1 className="decks-title">My Decks</h1>
            <p className="decks-subtitle">
              Your private deck collection
              {!loading && totalItems > 0 && (
                <span className="decks-count"> &mdash; {totalItems} deck{totalItems > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </header>

        <DeckFilters filters={filters} onChange={handleFilters} heroes={heroes}>
          {/* Action Buttons inside Filters */}
          <div className="deck-filters__actions">
            <a href="/deck/new" className="deck-filters__btn deck-filters__btn-primary">
              New Deck
            </a>
            <button
              onClick={() => setShowImport(!showImport)}
              className="deck-filters__btn"
            >
              Import Deck
            </button>
          </div>

          {/* Import Panel directly beneath buttons in filters */}
          {showImport && (
            <div className="deck-filters__import-panel">
              <h3>Import from MarvelCDB</h3>
              <form onSubmit={submitImport} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="deck-filters__import-row">
                  <label style={{ color: '#7a8fa8', fontSize: '0.8rem', fontWeight: 'bold' }}>MarvelCDB Deck ID</label>
                  <input
                    type="text"
                    required
                    value={importId}
                    onChange={(e) => setImportId(e.target.value)}
                    placeholder="e.g. 12345"
                    className="deck-filters__import-input"
                  />
                </div>
                <label className="deck-filters__import-checkbox-label">
                  <input
                    type="checkbox"
                    checked={importIsPrivate}
                    onChange={(e) => setImportIsPrivate(e.target.checked)}
                  />
                  This is a Private Deck URL (uses /deck/ instead of /decklist/)
                </label>
                {importError && <div className="deck-filters__import-error">{importError}</div>}

                <div style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={importLoading}
                    className="deck-filters__import-btn"
                  >
                    {importLoading ? 'Importing...' : 'Start Import'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </DeckFilters>
      </div>

      {loading ? (
        <div className="decks-loading">Loading your decks...</div>
      ) : error ? (
        <div className="decks-loading" style={{ color: '#e06c75' }}>{error}</div>
      ) : decks.length === 0 ? (
        <div className="decks-loading">No decks found. Start building!</div>
      ) : (
        <>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          <div className="decks-grid">
            {decks.map(deck => (
              <PrivateDeck key={deck.id} deck={deck} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
