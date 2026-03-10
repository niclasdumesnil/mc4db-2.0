import React, { useMemo } from 'react';
import '@css/Stories.css';

const ENCOUNTER_TYPES = [
  { name: 'Villain',      color: '#ef4444' },
  { name: 'Main Scheme',  color: '#8b5cf6' },
  { name: 'Side Scheme',  color: '#3b82f6' },
  { name: 'Minion',       color: '#f97316' },
  { name: 'Treachery',    color: '#a855f7' },
  { name: 'Attachment',   color: '#eab308' },
  { name: 'Environment',  color: '#22c55e' },
  { name: 'Obligation',   color: '#6b7280' },
];

const TYPE_COLOR_MAP = Object.fromEntries(ENCOUNTER_TYPES.map(t => [t.name, t.color]));

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

    // Exclude main_scheme (shown in their own panel) and back-face cards (linked_card = double-sided B face)
    const effectiveCards = cards.filter(c =>
      (c.type_code || '').toLowerCase() !== 'main_scheme' && !c.linked_to_code
    );
    if (effectiveCards.length === 0) return null;

    const total = effectiveCards.reduce((n, c) => n + (c.quantity ?? 1), 0);

    // --- Type breakdown ---
    const typeMap = {};
    for (const c of effectiveCards) {
      const name = c.type_name || 'Other';
      typeMap[name] = (typeMap[name] || 0) + (c.quantity ?? 1);
    }
    const types = Object.entries(typeMap)
      .map(([name, count]) => ({ name, count }))
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
              <span className="icon icon-boost" style={{ fontSize: '0.85rem', fontWeight: 400 }} />{stats.totalBoost}
            </span>
            <span className="set-stats-summary-label">Boost</span>
          </div>
        )}
        {stats.totalBoostStar > 0 && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value" style={{ color: '#fbbf24' }}>
              <span className="icon icon-boost" style={{ fontSize: '0.85rem', fontWeight: 400 }} />★{stats.totalBoostStar}
            </span>
            <span className="set-stats-summary-label">Boost ★</span>
          </div>
        )}
        {stats.avgBoost !== null && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value" style={{ color: '#60a5fa' }}>{stats.avgBoost}</span>
            <span className="set-stats-summary-label">Avg Boost</span>
          </div>
        )}
      </div>

      {/* Type breakdown */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">Type</p>
        <table className="set-stats-table">
          <tbody>
            {stats.types.map(({ name, count }) => {
              const color = TYPE_COLOR_MAP[name] || '#94a3b8';
              return (
                <tr key={name}>
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

