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

export default function DeckFilters({ filters, onChange, heroes, children }) {
  const factionsMap = useFactions();
  const ffgHeroes = heroes?.ffg || [];
  const fanmadeHeroes = heroes?.fanmade || [];

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
  const clearAll = () => onChange({ hero: '', aspects: [], tags: [] });
  const hasFilters = filters.hero || (filters.aspects && filters.aspects.length > 0) || filters.tags.length > 0;

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
