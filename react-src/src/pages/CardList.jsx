import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PackSearch from '@components/PackSearch';
import CardSearch, { EMPTY_FILTERS } from '@components/CardSearch';
import CardListDisplay from '@components/CardListDisplay';
import '@css/CardList.css';

const DISPLAY_MODES = [
  { key: 'checklist', icon: '☰', label: 'Checklist' },
  // Future: { key: 'grid', icon: '⊞', label: 'Cards' },
];

/**
 * Build the search API URL from filters + pagination state.
 */
function buildSearchUrl(filters, page, sort, order, showDuplicates, showOfficial, showFanmade, limit = 50) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  params.set('sort', sort);
  params.set('order', order);
  if (!showDuplicates) params.set('hide_duplicates', '1');
  if (showOfficial && !showFanmade)  params.set('creator_filter', 'official');
  if (!showOfficial && showFanmade)  params.set('creator_filter', 'fanmade');

  if (filters.name)    params.set('name',    filters.name);
  if (filters.text)    params.set('text',    filters.text);
  if (filters.flavor)  params.set('flavor',  filters.flavor);
  if (filters.pack)    params.set('pack',    filters.pack);
  if (filters.type)    params.set('type',    filters.type);
  if (filters.subtype) params.set('subtype', filters.subtype);
  if (filters.traits)  params.set('traits',  filters.traits);
  if (filters.is_unique !== '') params.set('is_unique', filters.is_unique);
  if (filters.illustrator) params.set('illustrator', filters.illustrator);

  // Factions — submit one at a time using multiple params (or comma-joined)
  // The backend handles a single faction code; if multiple selected, we request
  // each separately — but for simplicity here we only filter on the FIRST selected
  // faction (multi-faction filtering requires a more complex backend OR mode).
  // We pass them as repeated `faction` params; the backend picks the first.
  if (filters.factions && filters.factions.length === 1) {
    params.set('faction', filters.factions[0]);
  } else if (filters.factions && filters.factions.length > 1) {
    // Pass as comma-list; backend will unpack
    params.set('factions', filters.factions.join(','));
  }

  const numPairs = [
    ['cost',   'cost_op'],
    ['qty',    'qty_op'],
    ['atk',    'atk_op'],
    ['thw',    'thw_op'],
    ['def',    'def_op'],
    ['health', 'health_op'],
  ];
  for (const [val, op] of numPairs) {
    if (filters[val] !== '' && filters[val] !== undefined) {
      params.set(val, filters[val]);
      params.set(op, filters[op] || '=');
    }
  }

  const resKeys = ['res_physical', 'res_mental', 'res_energy', 'res_wild'];
  for (const key of resKeys) {
    if (filters[key]) params.set(key, filters[key]);
  }

  return `/api/public/cards/search?${params.toString()}`;
}

/**
 * Simple pagination bar.
 */
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);

  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="cardlist-pagination">
      <button
        className="cardlist-pagination-btn"
        onClick={() => onPage(1)}
        disabled={page <= 1}
        title="First"
      >«</button>
      <button
        className="cardlist-pagination-btn"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        title="Previous"
      >‹</button>

      {start > 1 && <span style={{ color:'#94a3b8', fontSize:'0.8rem' }}>…</span>}
      {pages.map(p => (
        <button
          key={p}
          className={`cardlist-pagination-btn${p === page ? ' cardlist-pagination-btn--active' : ''}`}
          onClick={() => onPage(p)}
        >{p}</button>
      ))}
      {end < totalPages && <span style={{ color:'#94a3b8', fontSize:'0.8rem' }}>…</span>}

      <button
        className="cardlist-pagination-btn"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        title="Next"
      >›</button>
      <button
        className="cardlist-pagination-btn"
        onClick={() => onPage(totalPages)}
        disabled={page >= totalPages}
        title="Last"
      >»</button>
    </div>
  );
}

export default function CardList() {
  const [cards, setCards]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalOfficial, setTotalOfficial] = useState(0);
  const [totalFanmade, setTotalFanmade]   = useState(0);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [sort, setSort]           = useState('pack');
  const [order, setOrder]         = useState('asc');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showOfficial, setShowOfficial]     = useState(true);
  const [showFanmade,  setShowFanmade]      = useState(true);
  const [mode, setMode]           = useState('checklist');
  const [filters, setFilters]     = useState({ ...EMPTY_FILTERS });
  const [attributes, setAttributes] = useState({ types: [], subtypes: [], illustrators: [] });

  // Debounce text filters so we don't fire on every keystroke
  const debounceRef = useRef(null);
  const [debouncedFilters, setDebouncedFilters] = useState({ ...EMPTY_FILTERS });

  // Fetch type/subtype/illustrator lists once on mount
  useEffect(() => {
    fetch('/api/public/cards/attributes')
      .then(r => r.json())
      .then(data => setAttributes(data))
      .catch(() => {});
  }, []);

  // Debounce text field changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  // Fetch cards whenever debounced filters, page or sort change
  useEffect(() => {
    // Both off → nothing to show, skip API call
    if (!showOfficial && !showFanmade) {
      setCards([]);
      setTotalItems(0); setTotalOfficial(0); setTotalFanmade(0); setTotalDuplicates(0);
      setTotalPages(1); setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const url = buildSearchUrl(debouncedFilters, page, sort, order, showDuplicates, showOfficial, showFanmade);
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setCards(data.cards || []);
        setTotalPages(data.meta?.total_pages ?? 1);
        setTotalItems(data.meta?.total_items ?? 0);
        setTotalOfficial(data.meta?.total_official ?? 0);
        setTotalFanmade(data.meta?.total_fanmade ?? 0);
        setTotalDuplicates(data.meta?.total_duplicates ?? 0);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedFilters, page, sort, order, showDuplicates, showOfficial, showFanmade]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    // Non-text filter changes apply immediately
    const textFields = ['name', 'text', 'flavor', 'traits', 'illustrator'];
    const hasTextChange = textFields.some(f => newFilters[f] !== filters[f]);
    if (!hasTextChange) {
      setDebouncedFilters(newFilters);
      setPage(1);
    }
  }, [filters]);

  const handlePackSelect = useCallback((packCode) => {
    const newFilters = { ...filters, pack: packCode };
    setFilters(newFilters);
    setDebouncedFilters(newFilters);
    setPage(1);
  }, [filters]);

  const handleSort = useCallback((col) => {
    setSort(col);
    setPage(1);
  }, []);

  const handleOrderToggle = useCallback(() => {
    setOrder(o => o === 'asc' ? 'desc' : 'asc');
    setPage(1);
  }, []);

  return (
    <div className="cardlist-page">
      <div className="cardlist-page-inner">

        {/* ── Top: Pack filter ── */}
        <div className="cardlist-topbar">
          <p className="cardlist-topbar-title">Filter by pack</p>
          <PackSearch
            currentPackCode={filters.pack}
            onPackSelect={handlePackSelect}
          />
        </div>

        {/* ── Display mode selector ── */}
        <div className="cardlist-mode-bar">
          {DISPLAY_MODES.map(m => (
            <button
              key={m.key}
              className={`cardlist-mode-btn${mode === m.key ? ' cardlist-mode-btn--active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.icon} {m.label}
            </button>
          ))}
          {/* Total count badge */}
          {!loading && (
            <span className="cardlist-count" style={{ marginLeft: 'auto' }}>
              <span className="cardlist-count-breakdown">
                <span className="cardlist-count-official" title="Official">{totalOfficial.toLocaleString()} official</span>
                {showDuplicates && totalDuplicates > 0 && (
                  <><span className="cardlist-count-sep">/</span>
                  <span className="cardlist-count-dup" title="Duplicates">{totalDuplicates.toLocaleString()} Duplicate{totalDuplicates !== 1 ? 's' : ''}</span></>
                )}
                <span className="cardlist-count-sep">/</span>
                <span className="cardlist-count-fanmade" title="Fan-made">{totalFanmade.toLocaleString()} fan-made</span>
                <span className="cardlist-count-sep">/</span>
                <span className="cardlist-count-total">{totalItems.toLocaleString()} card{totalItems !== 1 ? 's' : ''}</span>
              </span>
            </span>
          )}
        </div>

        {/* ── Main content area ── */}
        <main className="cardlist-main">
          {/* Meta bar: results count + sort */}
          <div className="cardlist-meta-bar">
            <span className="cardlist-count">
              {!loading
                ? `Page ${page} of ${totalPages}`
                : 'Loading…'}
            </span>
            <div className="cardlist-sort">
              <button
                className={`cardlist-filtertype-btn cardlist-filtertype-btn--official${!showOfficial ? ' cardlist-filtertype-btn--off' : ''}`}
                onClick={() => { setShowOfficial(v => !v); setPage(1); }}
                title={showOfficial ? 'Masquer les cartes officielles' : 'Afficher les cartes officielles'}
              >Official</button>
              <button
                className={`cardlist-filtertype-btn cardlist-filtertype-btn--fanmade${!showFanmade ? ' cardlist-filtertype-btn--off' : ''}`}
                onClick={() => { setShowFanmade(v => !v); setPage(1); }}
                title={showFanmade ? 'Masquer les cartes fan-made' : 'Afficher les cartes fan-made'}
              >Fan-Made</button>
              <button
                className={`cardlist-showdup-btn${showDuplicates ? ' cardlist-showdup-btn--active' : ''}`}
                onClick={() => { setShowDuplicates(v => !v); setPage(1); }}
                title={showDuplicates ? 'Hide duplicates' : 'Show duplicates'}
              >
                {showDuplicates ? '⊕' : '⊕'} Duplicates
              </button>
              <span className="cardlist-sort-label">Sort:</span>
              <select
                className="cardlist-sort-select"
                value={sort}
                onChange={e => { setSort(e.target.value); setPage(1); }}
              >
                <option value="name">Name</option>
                <option value="faction">Faction</option>
                <option value="cost">Cost</option>
                <option value="pack">Pack / Position</option>
              </select>
              <button
                className={`cardlist-order-btn${order === 'desc' ? ' cardlist-order-btn--desc' : ''}`}
                onClick={handleOrderToggle}
                title={order === 'asc' ? 'Ascending — click to reverse' : 'Descending — click to reverse'}
              >
                {order === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />

          {loading ? (
            <div className="cardlist-loading">Loading cards…</div>
          ) : cards.length === 0 ? (
            <div className="cardlist-empty">No cards match your filters.</div>
          ) : (
            <CardListDisplay
              cards={cards}
              mode={mode}
              sort={sort}
              onSort={handleSort}
            />
          )}

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </main>

        {/* ── Right sidebar: card attribute filters ── */}
        <aside className="cardlist-sidebar">
          <CardSearch
            filters={filters}
            onChange={handleFiltersChange}
            types={attributes.types}
            subtypes={attributes.subtypes}
            illustrators={attributes.illustrators}
          />
        </aside>

      </div>
    </div>
  );
}
