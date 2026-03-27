import React, { useMemo } from 'react';
import '@css/Stories.css';

const ENCOUNTER_TYPES = [
  { code: 'villain',      color: '#ef4444' },
  { code: 'main_scheme',  color: '#8b5cf6' },
  { code: 'side_scheme',  color: '#3b82f6' },
  { code: 'minion',       color: '#f97316' },
  { code: 'treachery',    color: '#a855f7' },
  { code: 'attachment',   color: '#eab308' },
  { code: 'environment',  color: '#22c55e' },
  { code: 'obligation',   color: '#6b7280' },
];

const TYPE_COLOR_MAP = Object.fromEntries(ENCOUNTER_TYPES.map(t => [t.code, t.color]));

const BOOST_ROWS = [
  { key: 0,    iconCount: 0 },
  { key: 1,    iconCount: 1 },
  { key: 2,    iconCount: 2 },
  { key: '3+', iconCount: 3, plus: true },
];

function BoostSymbol({ iconCount, plus }) {
  if (iconCount === 0) return <span style={{ color: 'var(--st-text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
      {Array.from({ length: iconCount }, (_, i) => (
        <span key={i} className="icon icon-boost" style={{ fontSize: '0.72rem', lineHeight: 1, fontWeight: 400 }} />
      ))}
      {plus && <span style={{ fontSize: '0.65rem', marginLeft: 1, color: 'var(--st-text-muted)', fontWeight: 400 }}>+</span>}
    </span>
  );
}

/**
 * EncounterStatistics
 *
 * Props:
 *   cards  — raw card objects from the search API
 *   title  — optional header title (default "Encounter Statistics")
 */
export default function EncounterStatistics({ cards = [], title = 'Encounter Statistics', activeBoost = null, onBoostClick }) {
  const stats = useMemo(() => {
    if (!cards || cards.length === 0) return null;

    // Exclude main_scheme (shown in their own panel) and back-face cards (hidden:1 = double-sided B face)
    const effectiveCards = cards.filter(c =>
      (c.type_code || '').toLowerCase() !== 'main_scheme' && !c.hidden
    );
    if (effectiveCards.length === 0) return null;

    const total = effectiveCards.reduce((n, c) => n + (c.quantity ?? 1), 0);

    // --- Type breakdown ---
    const typeMap = {};
    for (const c of effectiveCards) {
      const code = (c.type_code || 'other').toLowerCase();
      const name = c.type_name || 'Other';
      if (!typeMap[code]) typeMap[code] = { code, name, count: 0 };
      typeMap[code].count += (c.quantity ?? 1);
    }
    const types = Object.values(typeMap)
      .sort((a, b) => b.count - a.count);

    // --- Boost distribution (histogram by boost value) ---
    let totalBoost = 0;
    let totalBoostStar = 0;
    const boostCount = { 0: 0, 1: 0, 2: 0, '3+': 0 };

    for (const c of effectiveCards) {
      const qty = c.quantity ?? 1;
      const b = Math.max(0, parseInt(c.boost ?? 0, 10));
      totalBoost += b * qty;
      if (c.boost_star) totalBoostStar += qty;
      const bKey = b >= 3 ? '3+' : b;
      boostCount[bKey] = (boostCount[bKey] || 0) + qty;
    }

    const avgBoost = total > 0 ? (totalBoost / total).toFixed(2) : null;

    return { total, types, totalBoost, totalBoostStar, avgBoost, boostCount };
  }, [cards]);

  if (!stats) return null;

  return (
    <div className="set-stats-body">

      {/* Summary */}
      <div className="set-stats-summary">
        <div className="set-stats-summary-item">
          <span className="set-stats-summary-value">{stats.total}</span>
          <span className="set-stats-summary-label">Cards</span>
        </div>
        {stats.totalBoost > 0 && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>
              {stats.totalBoost}{' '}<span className="icon icon-boost" style={{ fontSize: '0.85rem', fontWeight: 400 }} />
            </span>
            <span className="set-stats-summary-label">Boost</span>
          </div>
        )}
        {stats.totalBoostStar > 0 && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>
              {stats.totalBoostStar}{' '}★
            </span>
            <span className="set-stats-summary-label">Boost ★</span>
          </div>
        )}
        {stats.avgBoost !== null && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>{stats.avgBoost}</span>
            <span className="set-stats-summary-label">Avg Boost</span>
          </div>
        )}
      </div>

      {/* Type breakdown */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">Type</p>
        <table className="set-stats-table">
          <tbody>
            {stats.types.map(({ code, name, count }) => {
              const color = TYPE_COLOR_MAP[code] || '#94a3b8';
              return (
                <tr key={code}>
                  <td className="set-stats-type-label">{name}</td>
                  <td className="set-stats-bar-cell">
                    <div className="set-stat-bar-bg">
                      <div className="set-stat-bar-fill" style={{ width: `${Math.round((count / stats.total) * 100)}%`, background: color }} />
                    </div>
                  </td>
                  <td className="set-stats-count-cell">{count}/{stats.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Boost histogram (colonnes par valeur de boost) */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">
          Boost
          {stats.avgBoost !== null && <span className="st-boost-avg">avg {stats.avgBoost}</span>}
        </p>
        {(() => {
          const maxCount = Math.max(...BOOST_ROWS.map(({ key }) => stats.boostCount[key] || 0), 1);
          return (
            <div className="st-boost-chart">
              {BOOST_ROWS.map(({ key, iconCount, plus }) => {
                const count = stats.boostCount[key] || 0;
                const isActive = String(key) === String(activeBoost);
                const barH = Math.round((count / maxCount) * 56);
                return (
                  <div
                    key={key}
                    className={['st-boost-col', onBoostClick ? 'st-boost-col--clickable' : '', isActive ? 'st-boost-col--active' : ''].filter(Boolean).join(' ')}
                    onClick={() => onBoostClick && onBoostClick(String(key))}
                    role={onBoostClick ? 'button' : undefined}
                    tabIndex={onBoostClick ? 0 : undefined}
                    onKeyDown={e => e.key === 'Enter' && onBoostClick && onBoostClick(String(key))}
                    title={onBoostClick ? `Filtrer boost = ${key}` : undefined}
                  >
                    <span className="st-boost-count">{count}</span>
                    <div className={['st-boost-bar', isActive ? 'st-boost-bar--active' : ''].filter(Boolean).join(' ')} style={{ height: `${Math.max(barH, count > 0 ? 4 : 0)}px` }} />
                    <span className="st-boost-label">
                      <BoostSymbol iconCount={iconCount} plus={plus} />
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

    </div>
  );
}

