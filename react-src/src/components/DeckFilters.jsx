import React from 'react';
import { getFactionColor, getFactionFgColor, DECK_TAGS } from '@utils/dataUtils';
import { useFactions } from '../hooks/useFactions';

// Aspects jouables uniquement (pas encounter/hero/basic)
const ASPECTS = ['leadership', 'aggression', 'protection', 'justice', 'pool', 'determination', 'basic'];

const ASPECT_LABELS = {
  leadership: 'Leadership',
  aggression: 'Aggression',
  protection: 'Protection',
  justice: 'Justice',
  pool: "'Pool",
  determination: 'Determination',
  basic: 'Basic',
};

export default function DeckFilters({ filters, onChange, heroes, hideCollectionAndSort = false, children }) {
  const factionsMap = useFactions();
  const ffgHeroes = heroes?.ffg || [];
  const fanmadeHeroes = heroes?.fanmade || [];
  
  const userStr = localStorage.getItem('mc_user');
  let userId = null;
  try { if (userStr) { const u = JSON.parse(userStr); userId = u.id || u.userId; } } catch (e) {}

  const setHero = (code) => onChange({ ...filters, hero: code });
  const toggleAspect = (code) => {
    // '' = All → reset to empty array
    if (code === '') { onChange({ ...filters, aspects: [] }); return; }
    const aspects = (filters.aspects || []).includes(code)
      ? filters.aspects.filter(a => a !== code)
      : [...(filters.aspects || []), code];
    onChange({ ...filters, aspects });
  };
  const toggleTag = (key) => {
    const tags = filters.tags.includes(key)
      ? filters.tags.filter(t => t !== key)
      : [...filters.tags, key];
    onChange({ ...filters, tags });
  };
  const clearAll = () => {
    const empty = { hero: '', aspects: [], tags: [] };
    if (!hideCollectionAndSort) {
      empty.collection = 'all';
      empty.target_card = '';
      empty.sort = 'date-desc';
    }
    if (filters.publishedOnly !== undefined) {
      empty.publishedOnly = false;
    }
    onChange(empty);
  };
  const hasFilters = filters.hero || (filters.aspects && filters.aspects.length > 0) || filters.tags.length > 0 || 
    (!hideCollectionAndSort && (filters.collection === 'mine' || filters.target_card || (filters.sort && filters.sort !== 'date-desc'))) ||
    (filters.publishedOnly === true);

  return (
    <aside className="deck-filters">

      {/* ── Héros ── */}
      <div className="deck-filters__section">
        <label className="deck-filters__label">Hero</label>
        <div className="deck-filters__hero-selects">
          <select
            className="deck-filters__select"
            value={filters.hero}
            onChange={e => setHero(e.target.value)}
          >
            <option value="">Official heroes</option>
            {ffgHeroes.map(h => (
              <option key={h.hero_code} value={h.hero_code}>{h.hero_name}</option>
            ))}
          </select>
          {fanmadeHeroes.length > 0 && (
            <select
              className="deck-filters__select"
              value={filters.hero}
              onChange={e => setHero(e.target.value)}
            >
              <option value="">Fanmade heroes</option>
              {fanmadeHeroes.map(h => (
                <option key={h.hero_code} value={h.hero_code}>{h.hero_name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Aspects ── */}
      <div className="deck-filters__section">
        <label className="deck-filters__label">Aspect</label>
        <div className="deck-filters__aspects">
          {/* Bouton All */}
          <button
            className={`deck-filters__aspect-btn deck-filters__aspect-btn--all${!(filters.aspects && filters.aspects.length) ? ' deck-filters__aspect-btn--active' : ''}`}
            onClick={() => toggleAspect('')}
          >
            All
          </button>
          {ASPECTS.map(code => {
            const color = getFactionColor(code);
            const fgColor = getFactionFgColor(code);
            const active = (filters.aspects || []).includes(code);
            return (
              <button
                key={code}
                className={`deck-filters__aspect-btn${active ? ' deck-filters__aspect-btn--active' : ''}`}
                style={{
                  borderColor: active ? color : `${fgColor}55`,
                  background: active ? color : `${color}18`,
                  color: active ? '#fff' : fgColor,
                }}
                onClick={() => toggleAspect(code)}
              >
                {factionsMap[code] || ASPECT_LABELS[code]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tags ── */}
      <div className="deck-filters__section">
        <label className="deck-filters__label">Tags</label>
        <div className="deck-filters__tags">
          {Object.entries(DECK_TAGS).map(([key, t]) => {
            const active = filters.tags.includes(key);
            return (
              <span key={key} className="dc-tooltip-wrap">
                <button
                  className={`deck-tag-icon deck-tag-icon--${key}${active ? ' deck-tag-icon--active' : ''}`}
                  onClick={() => toggleTag(key)}
                  style={{ opacity: active ? 1 : 0.45, transform: active ? 'scale(1.15)' : 'none' }}
                >
                  {t.icon}
                </button>
                <span className="dc-tooltip">{t.title}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Collection & Sort ── */}
      {!hideCollectionAndSort && (
      <div className="deck-filters__section">
        <label className="deck-filters__label">Collection</label>
        <div className="deck-filters__collection-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          
          <div className="deck-scope-toggle" style={{ flex: '1 1 auto' }}>
            <button 
              className={`deck-scope-btn${filters.collection === 'all' || !filters.collection ? ' deck-scope-btn--active' : ''}`}
              onClick={() => onChange({ ...filters, collection: 'all' })}
            >
              All collection
            </button>
            <button
              className={`deck-scope-btn${filters.collection === 'mine' ? ' deck-scope-btn--active' : ''}`}
              onClick={() => onChange({ ...filters, collection: 'mine' })}
              disabled={!userId}
              title={!userId ? 'Log in to filter by your collection' : ''}
            >
              Your collection
            </button>
            <div className="deck-name-filter-wrapper dc-tooltip-wrap">
              <input
                type="text"
                className="deck-name-filter"
                placeholder="Find card..."
                value={filters.target_card || ''}
                onChange={(e) => onChange({ ...filters, target_card: e.target.value })}
              />
              <span className="dc-tooltip">Search includes hero signature cards, but excludes hero identities.</span>
            </div>
          </div>

          <div className="deck-sort-group">
            <button
              className={`deck-sort-btn${(filters.sort || '').startsWith('alpha') ? ' deck-sort-btn--active' : ''}`}
              onClick={() => onChange({ ...filters, sort: filters.sort === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc' })} 
              title={filters.sort === 'alpha-desc' ? "Z → A (Click to reverse)" : "A → Z (Click to reverse)"}
            >
              {filters.sort === 'alpha-desc' ? 'Z↓A' : 'A↓Z'}
            </button>
            <button
              className={`deck-sort-btn${(filters.sort || 'date-desc').startsWith('date') ? ' deck-sort-btn--active' : ''}`}
              onClick={() => onChange({ ...filters, sort: filters.sort === 'date-asc' ? 'date-desc' : 'date-asc' })} 
              title={filters.sort === 'date-desc' ? "Newest first (Click to reverse)" : "Oldest first (Click to reverse)"}
            >
              📅 {filters.sort === 'date-desc' ? '↓' : '↑'}
            </button>
            <button
              className={`deck-sort-btn${filters.sort === 'likes-desc' ? ' deck-sort-btn--active' : ''}`}
              onClick={() => onChange({ ...filters, sort: 'likes-desc' })} 
              title="Most liked"
            >
              ❤️
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── Additional Actions / Children ── */}
      {children}

      {/* ── Reset ── */}
      {hasFilters && (
        <button className="deck-filters__clear" onClick={clearAll}>
          ✕ Clear filters
        </button>
      )}
    </aside>
  );
}
