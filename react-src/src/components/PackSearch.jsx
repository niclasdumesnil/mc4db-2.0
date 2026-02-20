import React, { useEffect, useRef, useState } from 'react';

/**
 * Custom dropdown for fan-made packs — supports styled items with creator badge.
 */
function FanPackSelect({ packs, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onClickOut(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [open]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (!open || !listRef.current || !value) return;
    const sel = listRef.current.querySelector('.pack-search-option--selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }, [open, value]);

  const selected = packs.find(p => p.code === value);

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
            <span className="pack-search-creator-badge">{selected.creator}</span>
          </span>
        ) : (
          <span className="pack-search-trigger-placeholder">— Select a pack —</span>
        )}
        <span className="pack-search-chevron" aria-hidden="true" />
      </button>

      {open && (
        <ul className="pack-search-dropdown" role="listbox" ref={listRef}>
          <li
            role="option"
            aria-selected={!value}
            className={`pack-search-option pack-search-option--placeholder${!value ? ' pack-search-option--selected' : ''}`}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            — Select a pack —
          </li>
          {packs.map(p => (
            <li
              key={p.code}
              role="option"
              aria-selected={p.code === value}
              className={`pack-search-option${p.code === value ? ' pack-search-option--selected' : ''}`}
              onClick={() => { onChange(p.code); setOpen(false); }}
            >
              <span className="pack-search-option-name">{p.name}</span>
              <span className="pack-search-creator-badge">{p.creator}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * PackSearch — deux listes déroulantes pour sélectionner un pack.
 *
 * Props :
 *   currentPackCode — code of the currently displayed pack (for pre-selection)
 *   onNavigate      — callback(code) called with the code of the first card
 *                     in the selected pack
 */
export default function PackSearch({ currentPackCode, onNavigate }) {
  const [officialPacks, setOfficialPacks] = useState([]);
  const [fanPacks, setFanPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(currentPackCode || '');
  const [navigating, setNavigating] = useState(false);

  // Fetch all packs on mount
  useEffect(() => {
    fetch('/api/public/packs')
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return;

        // Official packs: creator empty or equal to 'FFG'
        const official = data
          .filter(p => !p.creator || p.creator.toUpperCase() === 'FFG')
          .sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

        // Fan-made packs: anything that isn't FFG
        const fan = data
          .filter(p => p.creator && p.creator.toUpperCase() !== 'FFG')
          .sort((a, b) => a.name.localeCompare(b.name));

        setOfficialPacks(official);
        setFanPacks(fan);
      })
      .catch(() => {});
  }, []);

  // Sync selection when the current card changes (PackNav navigation)
  useEffect(() => {
    if (currentPackCode) setSelectedPack(currentPackCode);
  }, [currentPackCode]);

  /** Navigate to the first card of the given pack */
  const handleSelectPack = (packCode) => {
    if (!packCode || packCode === selectedPack) return;
    setSelectedPack(packCode);
    setNavigating(true);

    fetch(`/api/public/cards/${packCode}`)
      .then(r => r.json())
      .then(cards => {
        if (!Array.isArray(cards) || cards.length === 0) return;
        const visible = cards.filter(c => !c.hidden);
        const sorted = [...visible].sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
        if (sorted.length > 0 && onNavigate) {
          onNavigate(sorted[0].code);
        }
      })
      .catch(() => {})
      .finally(() => setNavigating(false));
  };

  // Nothing to show if no packs are available
  if (officialPacks.length === 0 && fanPacks.length === 0) return null;

  const isOfficialSelected = officialPacks.some(p => p.code === selectedPack);
  const isFanSelected = fanPacks.some(p => p.code === selectedPack);

  return (
    <div className={`pack-search${navigating ? ' pack-search--loading' : ''}`}>
      {/* Official packs */}
      {officialPacks.length > 0 && (
        <div className="pack-search-group">
          <label className="pack-search-label" htmlFor="pack-search-official">
            Official packs
          </label>
          <select
            id="pack-search-official"
            className="pack-search-select"
            value={isOfficialSelected ? selectedPack : ''}
            onChange={e => handleSelectPack(e.target.value)}
            disabled={navigating}
          >
            <option value="">— Select a pack —</option>
            {officialPacks.map(p => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Fan-made packs — custom dropdown with creator badge */}
      {fanPacks.length > 0 && (
        <div className="pack-search-group">
          <label className="pack-search-label">
            Fan-made packs
          </label>
          <FanPackSelect
            packs={fanPacks}
            value={isFanSelected ? selectedPack : ''}
            onChange={handleSelectPack}
            disabled={navigating}
          />
        </div>
      )}

      {navigating && <span className="pack-search-spinner" aria-label="Loading…" />}
    </div>
  );
}
