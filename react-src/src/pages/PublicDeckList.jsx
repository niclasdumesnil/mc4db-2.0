import React, { useState, useEffect, useCallback } from 'react';
import PublicDeck from '@components/PublicDeck';
import DeckFilters from '@components/DeckFilters';
import { extractHeroes } from '@utils/dataUtils';
import '@css/PublicDecks.css';

const LIMIT = 10;
const EMPTY_FILTERS = { hero: '', aspects: [], tags: [] };

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
      <button className="deck-pagination__btn" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Page precedente">&#8249;</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="deck-pagination__ellipsis">&#8230;</span>
        ) : (
          <button key={p} className={`deck-pagination__btn${p === page ? ' deck-pagination__btn--active' : ''}`} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
        )
      )}
      <button className="deck-pagination__btn" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Page suivante">&#8250;</button>
    </nav>
  );
}

export default function PublicDeckList() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [heroes, setHeroes] = useState({ ffg: [], fanmade: [] });

  // Charge tous les decks (sans limite) une seule fois pour construire la liste des héros
  useEffect(() => {
    fetch('/api/public/decks?page=1&limit=9999')
      .then(r => r.json())
      .then(d => { if (d.ok) setHeroes(extractHeroes(d.data)); })
      .catch(() => {});
  }, []);

  const buildUrl = useCallback((p, f) => {
    const params = new URLSearchParams({ page: p, limit: LIMIT });
    if (f.hero) params.set('hero', f.hero);
    if (f.aspects && f.aspects.length) f.aspects.forEach(a => params.append('aspect', a));
    if (f.tags && f.tags.length) f.tags.forEach(t => params.append('tag', t));
    return `/api/public/decks?${params}`;
  }, []);

  const loadPage = useCallback((p, f) => {
    setLoading(true);
    fetch(buildUrl(p, f))
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setDecks(data.data);
          setTotalPages(data.meta.total_pages);
          setTotalItems(Number(data.meta.total_items));
        }
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(err => {
        console.error('Failed to load decks', err);
        setLoading(false);
      });
  }, [buildUrl]);

  // Reload when page or filters change
  useEffect(() => { loadPage(page, filters); }, [page, filters, loadPage]);

  const handleFilters = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
  };

  // hasFilters for display
  const hasFilters = filters.hero || filters.aspects.length > 0 || filters.tags.length > 0;

  return (
    <div className="decks-page-container page-wrapper">
      <div className="decks-page-top">
        <header className="page-header">
          <h1 className="page-title">Public Decklists</h1>
          <p className="page-subtitle">
            Discover and try the best community decks
            {!loading && totalItems > 0 && (
              <span className="decks-count"> &mdash; {totalItems} deck{totalItems > 1 ? 's' : ''}</span>
            )}
          </p>
        </header>
        <DeckFilters filters={filters} onChange={handleFilters} heroes={heroes} />
      </div>

      {loading ? (
        <div className="decks-loading">Loading amazing decks...</div>
      ) : (
        <>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          <div className="decks-grid">
            {decks.map(deck => (
              <PublicDeck key={deck.id} deck={deck} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}