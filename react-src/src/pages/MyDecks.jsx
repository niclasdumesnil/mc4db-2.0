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
      .catch(() => {});
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
          <h1 className="decks-title">My Decks</h1>
          <p className="decks-subtitle">
            Your private deck collection
            {!loading && totalItems > 0 && (
              <span className="decks-count"> &mdash; {totalItems} deck{totalItems > 1 ? 's' : ''}</span>
            )}
          </p>
        </header>
        <DeckFilters filters={filters} onChange={handleFilters} heroes={heroes} />
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
