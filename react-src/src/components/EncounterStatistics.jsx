import React, { useMemo } from 'react';
import '@css/Stories.css';

const ENCOUNTER_TYPES = [
  'Villain',
  'Main Scheme',
  'Side Scheme',
  'Minion',
  'Treachery',
  'Attachment',
  'Environment',
  'Obligation',
];

const TYPE_COLORS = {
  'Villain':      '#ef4444',
  'Main Scheme':  '#8b5cf6',
  'Side Scheme':  '#3b82f6',
  'Minion':       '#f97316',
  'Treachery':    '#a855f7',
  'Attachment':   '#eab308',
  'Environment':  '#22c55e',
  'Obligation':   '#6b7280',
};

/**
 * EncounterStatistics
 *
 * Props:
 *   cards  — raw card objects from the search API
 *   title  — optional header title (default "Encounter Statistics")
 */
export default function EncounterStatistics({ cards = [], title = 'Encounter Statistics' }) {
  const stats = useMemo(() => {
    if (!cards || cards.length === 0) return null;

    const total = cards.reduce((n, c) => n + (c.quantity ?? 1), 0);

    // --- Type breakdown ---
    const typeMap = {};
    for (const c of cards) {
      const name = c.type_name || 'Other';
      typeMap[name] = (typeMap[name] || 0) + (c.quantity ?? 1);
    }
    const types = Object.entries(typeMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // --- Boost ---
    let totalBoost = 0;
    let totalBoostStar = 0;
    const boostByType = {};

    for (const c of cards) {
      const qty = c.quantity ?? 1;
      const boost = typeof c.boost === 'number' ? c.boost : 0;
      const boostStar = c.boost_star ? 1 : 0;

      totalBoost += boost * qty;
      totalBoostStar += boostStar * qty;

      const typeName = c.type_name || 'Other';
      if (!boostByType[typeName]) boostByType[typeName] = 0;
      boostByType[typeName] += boost * qty;
    }

    const avgBoost = total > 0 ? (totalBoost / total).toFixed(2) : null;

    return { total, types, totalBoost, totalBoostStar, avgBoost, boostByType };
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
              const color = TYPE_COLORS[name] || '#94a3b8';
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

      {/* Boost by type */}
      {stats.totalBoost > 0 && (
        <div className="set-stats-section">
          <p className="set-stats-section-title">
            Boost
            <span className="st-boost-avg">avg {stats.avgBoost}</span>
          </p>
          <table className="set-stats-table">
            <tbody>
              {Object.entries(stats.boostByType)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([typeName, boostTotal]) => {
                  const color = TYPE_COLORS[typeName] || '#94a3b8';
                  const maxBoost = Math.max(...Object.values(stats.boostByType).filter(v => v > 0), 1);
                  return (
                    <tr key={typeName}>
                      <td className="set-stats-type-label">{typeName}</td>
                      <td className="set-stats-bar-cell">
                        <div className="set-stat-bar-bg">
                          <div className="set-stat-bar-fill" style={{ width: `${Math.round((boostTotal / maxBoost) * 100)}%`, background: color, opacity: 0.8 }} />
                        </div>
                      </td>
                      <td className="set-stats-count-cell">{boostTotal}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

