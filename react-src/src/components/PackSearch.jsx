import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Generic custom dropdown - supports text filtering, a "current" badge (based on
 * pack.environment) and an optional creator badge.
 */
function CustomPackSelect({ packs, value, onChange, disabled, showCreator = false }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onClickOut(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [open]);

  // Focus filter input + scroll selected item when opening
  useEffect(() => {
    if (!open) { setFilter(''); return; }
    setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    if (!listRef.current || !value) return;
    const sel = listRef.current.querySelector('.pack-search-option--selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }, [open, value]);

  const selected = packs.find(p => p.code === value);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.creator && p.creator.toLowerCase().includes(q))
    );
  }, [packs, filter]);

  return (
    <div className="pack-search-custom" ref={containerRef}>
      <button
        type="button"
        className={`pack-search-trigger${open ? ' pack-search-trigger--open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="pack-search-trigger-content">
            <span className="pack-search-trigger-name">{selected.name}</span>
            {showCreator && selected.creator && selected.creator.toUpperCase() !== 'FFG' && (
              <span className="mc-badge mc-badge-creator">{selected.creator}</span>
            )}
            {selected.environment === 'current' && (
              <span className="mc-badge mc-badge-current">current</span>
            )}
          </span>
        ) : (
          <span className="pack-search-trigger-placeholder">{'\u2014'} Select a pack {'\u2014'}</span>
        )}
        <span className="pack-search-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="pack-search-dropdown-wrap">
          {/* Filter input */}
          <div className="pack-search-filter-row">
            <input
              ref={inputRef}
              className="pack-search-filter-input"
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            {filter && (
              <button
                className="pack-search-filter-clear"
                type="button"
                onClick={() => { setFilter(''); inputRef.current && inputRef.current.focus(); }}
                aria-label="Clear filter"
              >{'\u00d7'}</button>
            )}
          </div>
          <ul className="pack-search-dropdown" role="listbox" ref={listRef}>
            <li
              role="option"
              aria-selected={!value}
              className={`pack-search-option pack-search-option--placeholder${!value ? ' pack-search-option--selected' : ''}`}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              {'\u2014'} Select a pack {'\u2014'}
            </li>
            {filtered.length === 0 && (
              <li className="pack-search-option pack-search-option--empty">No results</li>
            )}
            {filtered.map(p => (
              <li
                key={p.code}
                role="option"
                aria-selected={p.code === value}
                className={`pack-search-option${p.code === value ? ' pack-search-option--selected' : ''}`}
                onClick={() => { onChange(p.code); setOpen(false); }}
              >
                <span className="pack-search-option-name">{p.name}</span>
                {showCreator && p.creator && p.creator.toUpperCase() !== 'FFG' && (
                  <span className="mc-badge mc-badge-creator">{p.creator}</span>
                )}
                {p.environment === 'current' && (
                  <span className="mc-badge mc-badge-current">current</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * PackSearch - two dropdowns: official packs and fan-made packs.
 * Both use the same sort controls (Date / Alpha + direction).
 *
 * Props:
 *   currentPackCode - code of the currently displayed pack
 *   onNavigate      - callback(cardCode) navigates to the first card of the pack
 *   onPackSelect    - callback(packCode) fires with the pack code directly (filter mode,
 *                     no card fetch). Provide this instead of onNavigate for filter UIs.
 */
export default function PackSearch({ currentPackCode, onNavigate, onPackSelect }) {
  const [officialPacks, setOfficialPacks] = useState([]);
  const [fanPacks, setFanPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(currentPackCode || '');
  const [navigating, setNavigating] = useState(false);
  const [sortBy, setSortBy] = useState('date');   // 'date' | 'alpha'
  const [sortDir, setSortDir] = useState('asc');  // 'asc' | 'desc'

  useEffect(() => {
    fetch('/api/public/packs')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;
        setOfficialPacks(data.filter(p => !p.creator || p.creator.toUpperCase() === 'FFG'));
        setFanPacks(data.filter(p => p.creator && p.creator.toUpperCase() !== 'FFG'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (currentPackCode) setSelectedPack(currentPackCode);
  }, [currentPackCode]);

  const applySort = (arr) => {
    const s = [...arr].sort((a, b) =>
      sortBy === 'alpha'
        ? a.name.localeCompare(b.name)
        : (a.position ?? 999) - (b.position ?? 999)
    );
    return sortDir === 'desc' ? s.reverse() : s;
  };

  const sortedOfficial = useMemo(() => applySort(officialPacks), [officialPacks, sortBy, sortDir]);
  const sortedFan      = useMemo(() => applySort(fanPacks),      [fanPacks,      sortBy, sortDir]);

  const handleSelectPack = (packCode) => {
    if (packCode === selectedPack) return;
    setSelectedPack(packCode);

    // Filter mode: just fire the pack code (including '' to clear)
    if (onPackSelect) {
      onPackSelect(packCode || '');
      return;
    }

    if (!packCode) return;

    // Navigation mode: fetch first card of the pack and call onNavigate
    setNavigating(true);
    fetch(`/api/public/cards/${packCode}`)
      .then(r => r.json())
      .then(cards => {
        if (!Array.isArray(cards) || cards.length === 0) return;
        const visible = cards.filter(c => !c.hidden);
        const sorted = [...visible].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
        if (sorted.length > 0 && onNavigate) onNavigate(sorted[0].code);
      })
      .catch(() => {})
      .finally(() => setNavigating(false));
  };

  if (officialPacks.length === 0 && fanPacks.length === 0) return null;

  const isOfficialSelected = sortedOfficial.some(p => p.code === selectedPack);
  const isFanSelected      = sortedFan.some(p => p.code === selectedPack);
  const toggleDir = () => setSortDir(d => d === 'asc' ? 'desc' : 'asc');

  return (
    <div className={`pack-search${navigating ? ' pack-search--loading' : ''}`}>
      <div className="pack-search-controls">
        <button
          type="button"
          className={`pack-search-sort-btn${sortBy === 'date' ? ' pack-search-sort-btn--active' : ''}`}
          onClick={() => setSortBy('date')}
          title="Sort by release date"
        >Date</button>
        <button
          type="button"
          className={`pack-search-sort-btn${sortBy === 'alpha' ? ' pack-search-sort-btn--active' : ''}`}
          onClick={() => setSortBy('alpha')}
          title="Sort alphabetically"
        >{'A\u2192Z'}</button>
        <button
          type="button"
          className="pack-search-sort-dir"
          onClick={toggleDir}
          title={sortDir === 'asc' ? 'Ascending - click to reverse' : 'Descending - click to reverse'}
        >{sortDir === 'asc' ? '\u2191' : '\u2193'}</button>
      </div>

      {sortedOfficial.length > 0 && (
        <div className="pack-search-group">
          <label className="pack-search-label">Official packs</label>
          <CustomPackSelect
            packs={sortedOfficial}
            value={isOfficialSelected ? selectedPack : ''}
            onChange={handleSelectPack}
            disabled={navigating}
            showCreator={false}
          />
        </div>
      )}

      {sortedFan.length > 0 && (
        <div className="pack-search-group">
          <label className="pack-search-label">Fan-made packs</label>
          <CustomPackSelect
            packs={sortedFan}
            value={isFanSelected ? selectedPack : ''}
            onChange={handleSelectPack}
            disabled={navigating}
            showCreator={true}
          />
        </div>
      )}

      {navigating && <span className="pack-search-spinner" aria-label="Loading..." />}
    </div>
  );
}
