import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CardListDisplay from '@components/CardListDisplay';
import DeckStatistics from '@components/DeckStatistics';
import EncounterStatistics from '@components/EncounterStatistics';
import '@css/Sets.css';
import '@css/NewDeck.css';

function currentUserId() {
  try { const u = JSON.parse(localStorage.getItem('mc_user')); return u && (u.id || u.userId); } catch { return null; }
}

const DISPLAY_MODES = [
  { key: 'checklist', icon: '☰', label: 'Checklist' },
  { key: 'grid',      icon: '⊞', label: 'Scan' },
  { key: 'preview',   icon: '◫', label: 'Preview' },
];

const ENCOUNTER_TYPE_CODES = ['villain', 'modular', 'standard', 'expert'];
const IDENTITY_TYPE_CODES  = ['hero', 'alter_ego', 'villain', 'main_scheme'];

// ── Identity card block (NewDeck style) ──────────────────────────────────────

function SetBanner({ identityCards = [], fallbackCard, mode, onModeChange, selectedSet, cardCount, regularCount, costFilter, onClearCost, loading }) {
  const heroFaces = [
    ...identityCards.filter(c => c.type_code === 'hero'),
    ...identityCards.filter(c => c.type_code === 'alter_ego'),
    ...identityCards.filter(c => c.type_code === 'villain'),
  ].filter(c => c.imagesrc);

  // For sets without hero/villain cards (modular, standard…) use first regular card
  const effectiveLeftFaces = heroFaces.length > 0
    ? heroFaces
    : (fallbackCard?.imagesrc ? [fallbackCard] : []);

  const schemeFaces = identityCards.filter(c => c.type_code === 'main_scheme' && c.imagesrc);
  const hasImages   = effectiveLeftFaces.length > 0 || schemeFaces.length > 0;

  return (
    <div className="sets-hero-banner">
      <div className="shb-faces-row">
        {/* Left: hero / alter_ego / villain (or fallback) */}
        <div className="shb-faces shb-faces--left">
          {effectiveLeftFaces.map((c, i) => (
            <img
              key={c.code}
              className={`ndeck-face ndeck-face--${['a', 'b', 'c'][i] || 'c'}`}
              src={c.imagesrc}
              alt={c.name}
              loading="lazy"
            />
          ))}
        </div>

        {/* Center: spacer so name can flex */}
        <div className="shb-name-center" />

        {/* Right: main scheme */}
        <div className="shb-faces shb-faces--right">
          {schemeFaces.map((c, i) => (
            <img
              key={c.code}
              className={`ndeck-face ndeck-face--scheme ndeck-face--${['a', 'b', 'c'][i] || 'c'}`}
              src={c.imagesrc}
              alt={c.name}
              loading="lazy"
            />
          ))}
        </div>
      </div>

      <div className="shb-strip">
        {selectedSet && (
          <span className="shb-set-name">
            {selectedSet.name}
            {selectedSet.creator && selectedSet.creator !== 'FFG' && (
              <span className="mc-badge mc-badge-creator" style={{ marginLeft: 8 }}>{selectedSet.creator}</span>
            )}
          </span>
        )}
        <div className="shb-right">
          {costFilter !== null && (
            <button className="sets-cost-filter-pill" onClick={onClearCost} title="Clear cost filter">
              Cost = {costFilter} ✕
            </button>
          )}
          {selectedSet && !loading && (
            <span className="sets-card-count">
              {cardCount}{cardCount !== regularCount ? `/${regularCount}` : ''} card{regularCount !== 1 ? 's' : ''}
            </span>
          )}
          <div className="shb-modes">
            {DISPLAY_MODES.map(m => (
              <button
                key={m.key}
                className={`cardlist-mode-btn${mode === m.key ? ' cardlist-mode-btn--active' : ''}`}
                onClick={() => onModeChange(m.key)}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const ALL_CATS = [
  { key: 'hero',     label: 'Heroes' },
  { key: 'villain',  label: 'Villains / Leaders' },
  { key: 'modular',  label: 'Modulars' },
  { key: 'standard', label: 'Standard' },
  { key: 'expert',   label: 'Expert' },
];

async function fetchSetCards(setCode, locale = 'en') {
  if (!setCode) return [];
  const userId = currentUserId();
  const params = new URLSearchParams({
    cardset: setCode, limit: '200', page: '1', sort: 'pack', order: 'asc', include_hidden: '1',
  });
  if (locale && locale !== 'en') params.set('locale', locale);
  if (userId) params.set('user_id', userId);
  const r = await fetch(`/api/public/cards/search?${params}`);
  if (!r.ok) return [];
  const data = await r.json();
  return data.cards || [];
}

// ── Horizontal Sets Bar ───────────────────────────────────────────────────────

function HorizontalSetsBar({ setsData, setsLoading, selectedSet, onSelect }) {
  const [source, setSource]       = useState('all'); // 'all' | 'official' | 'fanmade'
  const [openCat, setOpenCat]     = useState(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const barRef = useRef(null);
  const dropdownSearchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!openCat) return;
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenCat(null);
        setDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCat]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (openCat) {
      setTimeout(() => dropdownSearchRef.current?.focus(), 50);
      setDropdownSearch('');
    }
  }, [openCat]);

  const getSets = useCallback((key) => {
    if (!setsData) return [];
    const off = (setsData.official[key] || []).map(s => ({ ...s, _src: 'official' }));
    const fm  = (setsData.fanmade[key]  || []).map(s => ({ ...s, _src: 'fanmade' }));
    if (source === 'official') return off;
    if (source === 'fanmade')  return fm;
    return [...off, ...fm];
  }, [setsData, source]);

  const handleCatClick = (key) => {
    setOpenCat(prev => prev === key ? null : key);
  };

  const handleSelect = (set) => {
    onSelect(set);
    setOpenCat(null);
    setDropdownSearch('');
  };

  if (setsLoading) return <div className="sets-topbar sets-topbar--loading">Loading sets…</div>;
  if (!setsData)   return null;

  const dropdownSets = openCat
    ? getSets(openCat).filter(s =>
        !dropdownSearch.trim() ||
        (s.name || '').toLowerCase().includes(dropdownSearch.toLowerCase())
      )
    : [];

  return (
    <div className="sets-topbar" ref={barRef}>
      <div className="sets-topbar-inner">

        {/* Source toggle */}
        <div className="sets-source-toggle" role="group" aria-label="Source filter">
          {[
            { v: 'all',      l: 'All' },
            { v: 'official', l: 'Official' },
            { v: 'fanmade',  l: 'Fan-Made' },
          ].map(({ v, l }) => (
            <button
              key={v}
              className={`sets-source-btn${source === v ? ' sets-source-btn--active' : ''}`}
              onClick={() => { setSource(v); setOpenCat(null); setDropdownSearch(''); }}
            >{l}</button>
          ))}
        </div>

        <div className="sets-topbar-divider" aria-hidden="true" />

        {/* Category tabs */}
        {ALL_CATS.map(({ key, label }) => {
          const sets = getSets(key);
          if (sets.length === 0) return null;
          const isOpen = openCat === key;
          const hasSel = selectedSet && sets.some(s => s.code === selectedSet.code);
          return (
            <button
              key={key}
              className={['sets-topbar-tab', isOpen ? 'sets-topbar-tab--open' : '', hasSel ? 'sets-topbar-tab--has-selected' : ''].filter(Boolean).join(' ')}
              onClick={() => handleCatClick(key)}
            >
              <span>{label}</span>
              <span className="sets-topbar-tab-count">{sets.length}</span>
              <span className="sets-topbar-tab-chevron" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>

      {/* Dropdown */}
      {openCat && (
        <div className="sets-topbar-dropdown">
          {/* Set search */}
          <div className="sets-topbar-dropdown-search-wrap">
            <svg className="sets-topbar-dropdown-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.5"/>
              <path d="m12.5 12.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              ref={dropdownSearchRef}
              className="sets-topbar-dropdown-search"
              type="text"
              placeholder="Search sets…"
              value={dropdownSearch}
              onChange={e => setDropdownSearch(e.target.value)}
            />
            {dropdownSearch && (
              <button className="sets-topbar-dropdown-search-clear" onClick={() => setDropdownSearch('')}>✕</button>
            )}
          </div>

          {dropdownSets.length === 0 ? (
            <div className="sets-topbar-dropdown-empty">No sets match</div>
          ) : (
            <div className="sets-topbar-dropdown-items">
              {dropdownSets.map(set => (
                <button
                  key={set.code}
                  className={`sets-topbar-dropdown-item${selectedSet?.code === set.code ? ' sets-topbar-dropdown-item--active' : ''}`}
                  onClick={() => handleSelect(set)}
                >
                  <span>{set.name}</span>
                  {set.creator && set.creator !== 'FFG' && <span className="mc-badge mc-badge-creator sets-topbar-badge">{set.creator}</span>}
                  {set.nemesis_code && <span className="sets-topbar-badge-nemesis" title="Has nemesis set">N</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Sets() {
  const [locale, setLocale] = useState(
    () => localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en'
  );

  // Listen for language changes dispatched by any page component
  useEffect(() => {
    function onLocaleChange() {
      setLocale(localStorage.getItem('mc_locale') || 'en');
    }
    window.addEventListener('mc_locale_changed', onLocaleChange);
    return () => window.removeEventListener('mc_locale_changed', onLocaleChange);
  }, []);

  const handleLocaleChange = useCallback((code) => {
    localStorage.setItem('mc_locale', code);
    setLocale(code);
    window.dispatchEvent(new CustomEvent('mc_locale_changed'));
  }, []);

  const [setsData, setSetsData]         = useState(null);
  const [setsLoading, setSetsLoading]   = useState(true);
  const [selectedSet, setSelectedSet]   = useState(null);
  const [heroCards, setHeroCards]       = useState([]);
  const [encounterCards, setEncounterCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  const [mode, setMode]         = useState('checklist');
  const [sort, setSort]         = useState('pack');
  const [costFilter, setCostFilter] = useState(null);

  // Load sets index
  useEffect(() => {
    setSetsLoading(true);
    const userId = currentUserId();
    const params = userId ? `?user_id=${userId}` : '';
    fetch(`/api/public/sets${params}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setSetsData({
          official: { hero: [], villain: [], modular: [], standard: [], expert: [], ...((data.official) || {}) },
          fanmade:  { hero: [], villain: [], modular: [], standard: [], expert: [], ...((data.fanmade)  || {}) },
        });
        setSetsLoading(false);
      })
      .catch(() => setSetsLoading(false));
  }, []);

  // Load cards when set changes
  useEffect(() => {
    if (!selectedSet) { setHeroCards([]); setEncounterCards([]); return; }
    setCardsLoading(true);
    setCostFilter(null);
    const isEnc = ENCOUNTER_TYPE_CODES.includes((selectedSet.type_code || '').toLowerCase());
    if (isEnc) {
      fetchSetCards(selectedSet.code, locale)
        .then(cards => { setEncounterCards(cards); setHeroCards([]); })
        .finally(() => setCardsLoading(false));
    } else {
      // Hero set: load hero set + nemesis set together
      Promise.all([
        fetchSetCards(selectedSet.code, locale),
        selectedSet.nemesis_code ? fetchSetCards(selectedSet.nemesis_code, locale) : Promise.resolve([]),
      ]).then(([hero, nemesis]) => {
        setHeroCards(hero);
        setEncounterCards(nemesis);
      }).finally(() => setCardsLoading(false));
    }
  }, [selectedSet?.code, selectedSet?.nemesis_code, locale]);

  const handleSelectSet = useCallback((set) => setSelectedSet(set), []);
  const handleSort      = useCallback((col) => setSort(col), []);

  // All cards: hero set + nemesis merged
  const allCards = useMemo(() => {
    if (!selectedSet) return [];
    const isEnc = ENCOUNTER_TYPE_CODES.includes((selectedSet.type_code || '').toLowerCase());
    return isEnc ? encounterCards : [...heroCards, ...encounterCards];
  }, [selectedSet, heroCards, encounterCards]);

  // Identity cards (hero/alter_ego/villain/main_scheme) shown as hero card block
  const identityCards = useMemo(
    () => allCards.filter(c => IDENTITY_TYPE_CODES.includes((c.type_code || '').toLowerCase())),
    [allCards]
  );

  // Regular cards (everything else) used for the checklist
  const regularCardsBase = useMemo(
    () => allCards.filter(c => !IDENTITY_TYPE_CODES.includes((c.type_code || '').toLowerCase())),
    [allCards]
  );

  // Filtered card list (cost filter only)
  const displayCards = useMemo(() => {
    if (costFilter === null) return regularCardsBase;
    return regularCardsBase.filter(c => String(c.cost ?? '—') === String(costFilter));
  }, [regularCardsBase, costFilter]);

  function renderStats() {
    if (!selectedSet) return <div className="sets-stats-empty">Select a set to view statistics.</div>;
    if (cardsLoading)  return <div className="sets-stats-loading">Loading…</div>;
    const isEnc = ENCOUNTER_TYPE_CODES.includes((selectedSet.type_code || '').toLowerCase());
    if (isEnc) {
      return <EncounterStatistics cards={encounterCards} title={selectedSet.name} />;
    }
    // Hero set: deck statistics for hero cards only
    const deckSlots = heroCards.map(c => ({ ...c, quantity: c.quantity ?? 1, permanent: false }));
    return (
      <DeckStatistics
        slots={deckSlots}
        packsRequired={1}
        activeCost={costFilter}
        onCostClick={(cost) => setCostFilter(prev => prev === cost ? null : cost)}
      />
    );
  }

  return (
    <div className="sets-page">

      <header className="sets-topbar-wrapper">
        <HorizontalSetsBar
          setsData={setsData}
          setsLoading={setsLoading}
          selectedSet={selectedSet}
          onSelect={handleSelectSet}
        />
      </header>

      <div className="sets-content sets-content--no-identity">

        {/* Center: card list */}
        <main className="sets-main">
          <div className="sets-main-body">
            <SetBanner
              identityCards={identityCards}
              fallbackCard={regularCardsBase[0] || null}
              mode={mode}
              onModeChange={setMode}
              selectedSet={selectedSet}
              cardCount={displayCards.length}
              regularCount={regularCardsBase.length}
              costFilter={costFilter}
              onClearCost={() => setCostFilter(null)}
              loading={cardsLoading}
            />
            {!selectedSet ? (
              <div className="sets-empty-state">
                <div className="sets-empty-icon">⊞</div>
                <p>Select a set above to display its cards.</p>
              </div>
            ) : cardsLoading ? (
              <div className="sets-loading">Loading cards…</div>
            ) : displayCards.length === 0 ? (
              <div className="sets-empty">
                {costFilter !== null ? 'No cards match the current filters.' : 'No cards found for this set.'}
              </div>
            ) : (
              <CardListDisplay
                cards={displayCards}
                mode={mode}
                sort={sort}
                onSort={handleSort}
              />
            )}
          </div>
        </main>

        {/* Right: statistics */}
        <aside className="sets-stats">
          <div className="sets-stats-body">
            {renderStats()}
          </div>
        </aside>

      </div>
    </div>
  );
}
