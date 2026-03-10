import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CardListDisplay from '@components/CardListDisplay';
import DeckStatistics from '@components/DeckStatistics';
import EncounterStatistics from '@components/EncounterStatistics';
import '@css/Sets.css';
import '@css/NewDeck.css';
import '@css/Stories.css';

function currentUserId() {
  try { const u = JSON.parse(localStorage.getItem('mc_user')); return u && (u.id || u.userId); } catch { return null; }
}
function currentUser() {
  try { return JSON.parse(localStorage.getItem('mc_user')) || null; } catch { return null; }
}
function isDonator(u) {
  if (!u) return false;
  return !!(u.is_donator || u.donator || u.isDonator);
}

const DISPLAY_MODES = [
  { key: 'checklist', icon: '☰', label: 'List' },
  { key: 'grid',      icon: '⊞', label: 'Scan' },
  { key: 'preview',   icon: '◫', label: 'Preview' },
];

const ENCOUNTER_TYPE_CODES = ['villain', 'modular', 'standard', 'expert'];
const IDENTITY_TYPE_CODES  = ['hero', 'alter_ego', 'villain', 'main_scheme'];

// ── Main Scheme panel helpers ──────────────────────────────────────────────────────
const PerHeroIcon = () => <span className="icon icon-per_hero" style={{ fontSize: '0.78rem', verticalAlign: 'middle', marginLeft: '1px' }} />;
const StarMark    = () => <span style={{ fontSize: '0.7rem', marginLeft: '1px', verticalAlign: 'middle', opacity: 0.8 }}>★</span>;

function MainSchemeRow({ card }) {
  const base      = card.base_threat != null ? card.base_threat : null;
  const fixed     = card.base_threat_fixed;
  const esc       = card.escalation_threat;
  const escFixed  = card.escalation_threat_fixed;
  const escStar   = card.escalation_threat_star;
  const limit     = card.threat != null ? card.threat : null;
  const limitFixed = card.threat_fixed;
  const limitStar  = card.threat_star;
  const stage      = card.stage || null;
  const muted      = <span style={{ color: 'var(--st-text-muted)' }}>—</span>;
  return (
    <tr>
      <td className="main-scheme-name">
        {card.name || '?'}
        {stage && <span className="main-scheme-stage">{stage}</span>}
      </td>
      <td className="main-scheme-threat">
        {base != null ? <>{base}{fixed ? '' : <PerHeroIcon />}</> : muted}
      </td>
      <td className="main-scheme-threat">
        {esc ? <>{esc}{escFixed ? '' : <PerHeroIcon />}{escStar ? <StarMark /> : ''}</> : muted}
      </td>
      <td className="main-scheme-threat">
        {limit != null ? <>{limit}{limitFixed ? '' : <PerHeroIcon />}{limitStar ? <StarMark /> : ''}</> : muted}
      </td>
    </tr>
  );
}

function MainSchemesPanel({ schemes }) {
  if (!schemes || schemes.length === 0) return null;
  return (
    <div className="sets-main-schemes-panel">
      <p className="sets-main-schemes-title">Main Schemes</p>
      <table className="main-schemes-table">
        <thead>
          <tr>
            <th>Scheme</th>
            <th>Start</th>
            <th>Esc.</th>
            <th>Limit</th>
          </tr>
        </thead>
        <tbody>
          {schemes.map(card => <MainSchemeRow key={card.code} card={card} />)}
        </tbody>
      </table>
    </div>
  );
}

// ── Identity card block (NewDeck style) ──────────────────────────────────────

function SetBanner({ identityCards = [], fallbackCard, mode, onModeChange, selectedSet, cardCount, regularCount, costFilter, onClearCost, boostFilter, onClearBoost, loading }) {
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

        {/* Center: plain spacer between card groups */}
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
        <div className="shb-right">
          {costFilter !== null && (
            <button className="sets-cost-filter-pill" onClick={onClearCost} title="Clear cost filter">
              Cost = {costFilter} ✕
            </button>
          )}
          {boostFilter !== null && (
            <button className="sets-cost-filter-pill sets-boost-filter-pill" onClick={onClearBoost} title="Clear boost filter">
              Boost = {boostFilter} ✕
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
                  {set.private && <span className="mc-badge mc-badge-private sets-topbar-badge" title="Pack privé">🔒</span>}
                  {set.creator && set.creator !== 'FFG' && <span className="mc-badge mc-badge-creator sets-topbar-badge">{set.creator}</span>}
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
  const [boostFilter, setBoostFilter] = useState(null);

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
    setBoostFilter(null);
    const isEnc = ENCOUNTER_TYPE_CODES.includes((selectedSet.type_code || '').toLowerCase());
    if (isEnc) {
      fetchSetCards(selectedSet.code, locale)
        .then(cards => { setEncounterCards(cards); setHeroCards([]); })
        .finally(() => setCardsLoading(false));
    } else {
      // Hero set: load hero set + nemesis set together
      // Try nemesis_code from set data, or fall back to "{code}_nemesis"
      const nemesisCode = selectedSet.nemesis_code || (selectedSet.code + '_nemesis');
      Promise.all([
        fetchSetCards(selectedSet.code, locale),
        fetchSetCards(nemesisCode, locale),
      ]).then(([hero, nemesis]) => {
        setHeroCards(hero);
        setEncounterCards(nemesis);
      }).finally(() => setCardsLoading(false));
    }
  }, [selectedSet?.code, locale]);

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
  // Exclude back-face cards: hidden:1 marks the B side of a double-sided card (e.g. Psi-Katana)
  const regularCardsBase = useMemo(
    () => allCards.filter(c => !IDENTITY_TYPE_CODES.includes((c.type_code || '').toLowerCase()) && !c.hidden),
    [allCards]
  );

  // For villain sets: front-face main scheme cards (shown as a panel above the card list)
  const mainSchemeCards = useMemo(() => {
    if (!selectedSet || (selectedSet.type_code || '').toLowerCase() !== 'villain') return [];
    return identityCards.filter(c =>
      (c.type_code || '').toLowerCase() === 'main_scheme' &&
      !c.linked_to_code &&
      String(c.stage || '').toUpperCase().endsWith('B')
    );
  }, [selectedSet, identityCards]);

  // Filtered card list (cost + boost filters)
  const displayCards = useMemo(() => {
    let list = regularCardsBase;
    if (costFilter !== null)
      list = list.filter(c => String(c.cost ?? '\u2014') === String(costFilter));
    if (boostFilter !== null) {
      list = list.filter(c => {
        const b = Math.max(0, parseInt(c.boost ?? 0, 10));
        return boostFilter === '3+' ? b >= 3 : String(b) === boostFilter;
      });
    }
    return list;
  }, [regularCardsBase, costFilter, boostFilter]);

  function renderStats() {
    if (!selectedSet) return <div className="sets-stats-empty">Select a set to view statistics.</div>;
    if (cardsLoading)  return <div className="sets-stats-loading">Loading…</div>;
    const isEnc = ENCOUNTER_TYPE_CODES.includes((selectedSet.type_code || '').toLowerCase());
    if (isEnc) {
      // Exclude main_scheme cards (shown in their own panel above the card list)
      const encStatsCards = encounterCards.filter(c => (c.type_code || '').toLowerCase() !== 'main_scheme' && !c.linked_to_code);
      return <EncounterStatistics
        cards={encStatsCards}
        title={selectedSet.name}
        activeBoost={boostFilter}
        onBoostClick={(b) => setBoostFilter(prev => prev === b ? null : b)}
      />;
    }
    // Hero set: separate obligation cards from deck cards
    // Exclude hidden cards (back-faces like Betsy Braddock) — they are counted via their front face
    const obligationCards = heroCards.filter(c => (c.type_code || '').toLowerCase() === 'obligation');
    const deckCards       = heroCards.filter(c => (c.type_code || '').toLowerCase() !== 'obligation' && !c.hidden);
    const deckSlots       = deckCards.map(c => ({ ...c, quantity: c.quantity ?? 1, permanent: false }));
    const encounterForStats = [...obligationCards, ...encounterCards];
    return (
      <>
        <DeckStatistics
          slots={deckSlots}
          packsRequired={1}
          activeCost={costFilter}
          onCostClick={(cost) => setCostFilter(prev => prev === cost ? null : cost)}
        />
        {encounterForStats.length > 0 && (
          <div className="sets-stats-encounter-divider">
            <EncounterStatistics
              cards={encounterForStats}
              activeBoost={boostFilter}
              onBoostClick={(b) => setBoostFilter(prev => prev === b ? null : b)}
            />
          </div>
        )}
      </>
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
              boostFilter={boostFilter}
              onClearBoost={() => setBoostFilter(null)}
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
                {(costFilter !== null || boostFilter !== null) ? 'No cards match the current filters.' : 'No cards found for this set.'}
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
          {selectedSet && (
            <div className="sets-stats-title">
              <span className="sets-stats-title-name">{selectedSet.name}</span>
              {selectedSet.private && <span className="mc-badge mc-badge-private" style={{ marginLeft: 8 }} title="Pack privé (donateurs)">🔒 Private</span>}
              {selectedSet.creator && selectedSet.creator !== 'FFG' && (
                <span className="mc-badge mc-badge-creator" style={{ marginLeft: 8 }}>{selectedSet.creator}</span>
              )}
            </div>
          )}
          {mainSchemeCards.length > 0 && <MainSchemesPanel schemes={mainSchemeCards} />}
          <div className="sets-stats-body">
            {renderStats()}
          </div>
        </aside>

      </div>
    </div>
  );
}
