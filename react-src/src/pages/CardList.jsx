import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PackSearch from '@components/PackSearch';
import CardSearch, { EMPTY_FILTERS } from '@components/CardSearch';
import CardListDisplay from '@components/CardListDisplay';
import '@css/CardList.css';

function currentUserId() {
  try { const u = JSON.parse(localStorage.getItem('mc_user')); return u && (u.id || u.userId); } catch (e) { return null; }
}

// Single shared reference used to initialise both `filters` and `debouncedFilters`.
// Because both states start from the *same* object reference, the debounce timeout
// that fires 350 ms after mount calls setDebouncedFilters(filters) where
// debouncedFilters === filters (same ref) → React bails out → no extra fetch.
const _INIT_FILTERS = { ...EMPTY_FILTERS };

const DISPLAY_MODES = [
  { key: 'checklist', icon: '☰', label: 'List' },
  { key: 'grid', icon: '⊞', label: 'Image' },
  { key: 'preview', icon: '◫', label: 'Preview' },
];

/**
 * Build the search API URL from filters + pagination state.
 */
function buildSearchUrl(filters, page, sort, order, showDuplicates, showAltArt, showOfficial, showFanmade, showOnlyCurrent, locale = 'en', limit = 50, userId = null, selectedTheme = 'Marvel') {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  params.set('sort', sort);
  params.set('order', order);
  if (!showDuplicates) params.set('hide_duplicates', '1');
  if (showAltArt) params.set('show_alt_art', '1');
  if (showOfficial && !showFanmade) params.set('creator_filter', 'official');
  if (!showOfficial && showFanmade) params.set('creator_filter', 'fanmade');
  if (showOnlyCurrent) params.set('current_only', '1');
  if (locale && locale !== 'en') params.set('locale', locale);
  if (userId) params.set('user_id', userId);
  if (selectedTheme && selectedTheme !== 'all') params.set('theme', selectedTheme);
  if (filters.creator_name) params.set('creator_name', filters.creator_name);

  if (filters.name) params.set('name', filters.name);
  if (filters.text) params.set('text', filters.text);
  if (filters.flavor) params.set('flavor', filters.flavor);
  if (filters.pack) params.set('pack', filters.pack);
  if (filters.type) params.set('type', filters.type);
  if (filters.subtype) params.set('subtype', filters.subtype);
  if (filters.traits) params.set('traits', filters.traits);
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
    ['cost', 'cost_op', 'cost2', 'cost_op2'],
    ['qty', 'qty_op', 'qty2', 'qty_op2'],
    ['atk', 'atk_op', 'atk2', 'atk_op2'],
    ['thw', 'thw_op', 'thw2', 'thw_op2'],
    ['def', 'def_op', 'def2', 'def_op2'],
    ['health', 'health_op', 'health2', 'health_op2'],
    ['boost', 'boost_op', 'boost2', 'boost_op2'],
    ['scheme', 'scheme_op', 'scheme2', 'scheme_op2'],
  ];
  for (const [val, op, val2, op2] of numPairs) {
    if (filters[val] !== '' && filters[val] !== undefined) {
      params.set(val, filters[val]);
      params.set(op, filters[op] || '=');
    }
    if (filters[val2] !== '' && filters[val2] !== undefined) {
      params.set(val2, filters[val2]);
      params.set(op2, filters[op2] || '=');
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
  const end = Math.min(totalPages, page + 2);

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

      {start > 1 && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>…</span>}
      {pages.map(p => (
        <button
          key={p}
          className={`cardlist-pagination-btn${p === page ? ' cardlist-pagination-btn--active' : ''}`}
          onClick={() => onPage(p)}
        >{p}</button>
      ))}
      {end < totalPages && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>…</span>}

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
  // Locale: prefer the live localStorage value (set by the language switcher),
  // then fall back to the server-injected __MC_LOCALE__, then 'en'.
  const [locale, setLocale] = useState(() =>
    localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en'
  );

  // Re-fetch when the user switches language (dispatched by the header badge)
  useEffect(() => {
    function onLocaleChange() {
      setLocale(localStorage.getItem('mc_locale') || 'en');
    }
    window.addEventListener('mc_locale_changed', onLocaleChange);
    return () => window.removeEventListener('mc_locale_changed', onLocaleChange);
  }, []);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalSumItems, setTotalSumItems] = useState(0);
  const [totalOfficial, setTotalOfficial] = useState(0);
  const [totalSumOfficial, setTotalSumOfficial] = useState(0);
  const [totalFanmade, setTotalFanmade] = useState(0);
  const [totalSumFanmade, setTotalSumFanmade] = useState(0);
  const [totalDuplicates, setTotalDuplicates] = useState(0);
  const [sort, setSort] = useState('pack');
  const [order, setOrder] = useState('asc');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showAltArt, setShowAltArt] = useState(true);
  const [showOfficial, setShowOfficial] = useState(true);
  const [showFanmade, setShowFanmade] = useState(true);
  const [showOnlyCurrent, setShowOnlyCurrent] = useState(false);
  const [totalSumDuplicates, setTotalSumDuplicates] = useState(0);
  const [totalCurrentOfficial, setTotalCurrentOfficial] = useState(0);
  const [totalSumCurrentOfficial, setTotalSumCurrentOfficial] = useState(0);
  const [totalAltArts, setTotalAltArts] = useState(0);
  const [mode, setMode] = useState('checklist');
  const [filters, setFilters] = useState(_INIT_FILTERS);
  const [attributes, setAttributes] = useState({ types: [], subtypes: [], illustrators: [] });
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [themes, setThemes] = useState([]);

  // Debounce text filters so we don't fire on every keystroke
  const debounceRef = useRef(null);
  // Start from the *same* reference as `filters` to avoid a spurious second fetch
  // 350 ms after mount (see module-level _INIT_FILTERS comment above).
  const [debouncedFilters, setDebouncedFilters] = useState(_INIT_FILTERS);

  // Fetch type/subtype/illustrator lists + packs (for themes) once on mount
  useEffect(() => {
    fetch('/api/public/cards/attributes')
      .then(r => r.json())
      .then(data => setAttributes(data))
      .catch(() => { });

    const userId = currentUserId();
    fetch(`/api/public/packs${userId ? '?user_id=' + userId : ''}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        // Normalize: capitalize first letter, then dedup case-insensitively
        const normalizeTheme = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Marvel';

        let showTheme = {};
        try {
          const u = JSON.parse(localStorage.getItem('mc_user'));
          if (u && u.show_theme) showTheme = u.show_theme;
        } catch (e) {}

        const map = new Map();
        data.forEach(p => {
          const t = (p.theme || 'Marvel').trim();
          const norm = normalizeTheme(t);
          if (showTheme[t] !== false && showTheme[norm] !== false && showTheme[t.toLowerCase()] !== false) {
            if (!map.has(norm.toLowerCase())) map.set(norm.toLowerCase(), norm);
          }
        });
        setThemes([...map.values()].sort());
      })
      .catch(() => { });
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
      setTotalItems(0); setTotalSumItems(0);
      setTotalOfficial(0); setTotalSumOfficial(0);
      setTotalFanmade(0); setTotalSumFanmade(0);
      setTotalDuplicates(0); setTotalSumDuplicates(0);
      setTotalCurrentOfficial(0); setTotalSumCurrentOfficial(0);
      setTotalAltArts(0);
      setTotalPages(1); setLoading(false);
      return;
    }

    // AbortController cancels the in-flight HTTP request when the effect re-runs
    // (e.g. user changes filters again before the previous response arrived).
    // Without this, rapid filter changes pile up concurrent requests on the server.
    const controller = new AbortController();
    setLoading(true);

    const url = buildSearchUrl(debouncedFilters, page, sort, order, showDuplicates, showAltArt, showOfficial, showFanmade, showOnlyCurrent, locale, 50, currentUserId(), selectedTheme);
    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setCards(data.cards || []);
        setTotalPages(data.meta?.total_pages ?? 1);
        setTotalItems(data.meta?.total_items ?? 0);
        setTotalSumItems(data.meta?.total_sum_items ?? 0);
        setTotalOfficial(data.meta?.total_official ?? 0);
        setTotalSumOfficial(data.meta?.total_sum_official ?? 0);
        setTotalFanmade(data.meta?.total_fanmade ?? 0);
        setTotalSumFanmade(data.meta?.total_sum_fanmade ?? 0);
        setTotalDuplicates(data.meta?.total_duplicates ?? 0);
        setTotalSumDuplicates(data.meta?.total_sum_duplicates ?? 0);
        setTotalCurrentOfficial(data.meta?.total_current_official ?? 0);
        setTotalSumCurrentOfficial(data.meta?.total_sum_current_official ?? 0);
        setTotalAltArts(data.meta?.total_alt_arts ?? 0);
        setLoading(false);
      })
      .catch((err) => {
        // AbortError is expected when a newer filter is applied — ignore silently.
        if (err.name === 'AbortError') return;
        setCards([]);
        setLoading(false);
      });

    return () => { controller.abort(); };
  }, [debouncedFilters, page, sort, order, showDuplicates, showAltArt, showOfficial, showFanmade, showOnlyCurrent, locale, selectedTheme]);

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

  const handleCreatorSelect = useCallback((creatorName) => {
    const newFilters = { ...filters, creator_name: creatorName };
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
          <p className="cardlist-topbar-title">Filter by pack / by creator</p>
          <PackSearch
            currentPackCode={filters.pack}
            currentCreatorName={filters.creator_name}
            onPackSelect={handlePackSelect}
            onCreatorSelect={handleCreatorSelect}
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
                <span className="cardlist-count-official" title={`Official cards\nid: unique cards\nqty: total physical cards`}>
                  official {totalOfficial.toLocaleString()} id &bull; {totalSumOfficial.toLocaleString()} qty
                </span>
                {showOnlyCurrent && totalCurrentOfficial > 0 && (
                  <><span className="cardlist-count-sep">/</span>
                    <span className="cardlist-count-current" style={{ color: '#fed7aa' }} title={`Current official cards\nid: unique cards\nqty: total physical cards`}>
                      current {totalCurrentOfficial.toLocaleString()} id &bull; {totalSumCurrentOfficial.toLocaleString()} qty
                    </span></>
                )}
                {showAltArt && totalAltArts > 0 && (
                  <><span className="cardlist-count-sep">/</span>
                    <span className="cardlist-count-altart" style={{ color: '#bbf7d0' }} title="Alt Art Cards">
                      alt art {totalAltArts.toLocaleString()} id
                    </span></>
                )}
                {showDuplicates && totalDuplicates > 0 && (
                  <><span className="cardlist-count-sep">/</span>
                    <span className="cardlist-count-dup" title={`Duplicate cards\nid: unique cards\nqty: total physical cards`}>
                      duplicates {totalDuplicates.toLocaleString()} id &bull; {totalSumDuplicates.toLocaleString()} qty
                    </span></>
                )}
                <span className="cardlist-count-sep">/</span>
                <span className="cardlist-count-fanmade" title={`Fan-made cards\nid: unique cards\nqty: total physical cards`}>
                  fan-made {totalFanmade.toLocaleString()} id &bull; {totalSumFanmade.toLocaleString()} qty
                </span>
                <span className="cardlist-count-sep">/</span>
                <span className="cardlist-count-total" title={`Total cards\nid: unique cards\nqty: total physical cards`}>
                  total {totalItems.toLocaleString()} id &bull; {totalSumItems.toLocaleString()} qty
                </span>
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
                className={`cardlist-altart-btn${!showAltArt ? ' cardlist-filtertype-btn--off' : ' cardlist-altart-btn--active'}`}
                onClick={() => { setShowAltArt(v => !v); setPage(1); }}
                title={showAltArt ? 'Hide alt-art cards' : 'Show alt-art cards'}
              >
                🎨 Alt Art
              </button>
              <button
                className={`cardlist-showdup-btn${!showDuplicates ? ' cardlist-filtertype-btn--off' : ' cardlist-showdup-btn--active'}`}
                onClick={() => { setShowDuplicates(v => !v); setPage(1); }}
                title={showDuplicates ? 'Hide duplicates' : 'Show duplicates'}>
                {showDuplicates ? '⊕' : '⊕'} Duplicates
              </button>
              <button
                className={`cardlist-current-btn${!showOnlyCurrent ? ' cardlist-filtertype-btn--off' : ' cardlist-current-btn--active'}`}
                onClick={() => {
                  if (!showOfficial) return; // Cannot toggle if official is off
                  setShowOnlyCurrent(v => !v); setPage(1);
                }}
                disabled={!showOfficial}
                title={showOnlyCurrent ? 'Show all official cards' : 'Show only current official cards'}
              >
                Show Current Only
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
            themes={themes}
            selectedTheme={selectedTheme}
            onThemeChange={t => { setSelectedTheme(t); setPage(1); }}
          />
        </aside>

      </div>
    </div>
  );
}
