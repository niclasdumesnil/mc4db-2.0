import React, { useMemo } from 'react';
import { getFactionColor } from '@utils/dataUtils';
import '@css/Stories.css';
import '../css/DeckStatistics.css';
import '../css/DeckHistory.css';

const FACTION_LABELS = {
  leadership: 'Leadership', justice: 'Justice', aggression: 'Aggression',
  protection: 'Protection', basic: 'Basic', hero: 'Hero', campaign: 'Campaign',
};

const RES_ICONS = [
  { key: 'resource_energy',   cls: 'icon-energy',   label: 'Energy'   },
  { key: 'resource_physical', cls: 'icon-physical', label: 'Physical' },
  { key: 'resource_mental',   cls: 'icon-mental',   label: 'Mental'   },
  { key: 'resource_wild',     cls: 'icon-wild',     label: 'Wild'     },
];

export default function DeckStatistics({ slots = [], packsRequired, activeCost = null, onCostClick }) {
  const stats = useMemo(() => {
    const regular = slots.filter(s => !s.permanent);
    const totalCards = regular.reduce((n, s) => n + s.quantity, 0);

    // --- Factions / affinités ---
    const factionMap = {};
    for (const s of regular) {
      const fc = s.faction_code || 'basic';
      factionMap[fc] = (factionMap[fc] || 0) + s.quantity;
    }
    const factions = Object.entries(factionMap)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    // --- Types ---
    // Merge Hero + Alter-Ego into one line (double-sided card counted once)
    const typeMap = {};
    for (const s of regular) {
      const tc = (s.type_code || '').toLowerCase();
      const type = (tc === 'hero' || tc === 'alter_ego') ? 'Hero / Alter-Ego' : (s.type_name || 'Other');
      typeMap[type] = (typeMap[type] || 0) + s.quantity;
    }
    const types = Object.entries(typeMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // --- Resources ---
    const resMap = {};
    for (const key of RES_ICONS.map(r => r.key)) resMap[key] = 0;
    for (const s of regular) {
      for (const { key } of RES_ICONS) {
        resMap[key] += (s[key] || 0) * s.quantity;
      }
    }
    const totalRes = Object.values(resMap).reduce((a, b) => a + b, 0);

    // --- Cost curve + avg cost ---
    const costMap = {};
    let costSum = 0, costCardCount = 0;
    for (const s of regular) {
      if (s.type_name === 'Resource') continue;
      const cost = s.cost != null && s.cost !== '' ? String(s.cost) : '—';
      costMap[cost] = (costMap[cost] || 0) + s.quantity;
      if (cost !== '—' && cost !== 'X') {
        costSum += Number(cost) * s.quantity;
        costCardCount += s.quantity;
      }
    }
    const avgCost = costCardCount > 0 ? (costSum / costCardCount).toFixed(1) : null;
    const costEntries = Object.entries(costMap)
      .filter(([k]) => k !== '—')
      .map(([k, v]) => ({ cost: k, count: v }))
      .sort((a, b) => {
        const na = a.cost === 'X' ? 99 : Number(a.cost);
        const nb = b.cost === 'X' ? 99 : Number(b.cost);
        return na - nb;
      });
    const maxCostCount = Math.max(...costEntries.map(e => e.count), 1);

    return { totalCards, factions, types, resMap, totalRes, costEntries, maxCostCount, avgCost };
  }, [slots]);

  return (
    <div className="set-stats-body">

      {/* — Totaux — */}
      <div className="set-stats-summary">
        <div className="set-stats-summary-item">
          <span className="set-stats-summary-value">{stats.totalCards}</span>
          <span className="set-stats-summary-label">Cards</span>
        </div>
        {packsRequired != null && (
          <div className="set-stats-summary-item">
            <span className="set-stats-summary-value">{packsRequired}</span>
            <span className="set-stats-summary-label">Packs</span>
          </div>
        )}
      </div>

      {/* — Affinités (Factions) — */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">Affinities</p>
        <table className="set-stats-table">
          <tbody>
            {stats.factions.map(({ code, count }) => {
              const color = getFactionColor(code);
              const label = FACTION_LABELS[code] || code;
              return (
                <tr key={code}>
                  <td className="set-stats-type-label">
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 6, flexShrink: 0 }} />
                    {label}
                  </td>
                  <td className="set-stats-bar-cell">
                    <div className="set-stat-bar-bg">
                      <div className="set-stat-bar-fill" style={{ width: `${Math.round((count / stats.totalCards) * 100)}%`, background: color }} />
                    </div>
                  </td>
                  <td className="set-stats-count-cell">{count}/{stats.totalCards}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* — Types — */}
      <div className="set-stats-section">
        <p className="set-stats-section-title">Card Types</p>
        <table className="set-stats-table">
          <tbody>
            {stats.types.map(({ name, count }) => (
              <tr key={name}>
                <td className="set-stats-type-label">{name}</td>
                <td className="set-stats-bar-cell">
                  <div className="set-stat-bar-bg">
                    <div className="set-stat-bar-fill" style={{ width: `${Math.round((count / stats.totalCards) * 100)}%` }} />
                  </div>
                </td>
                <td className="set-stats-count-cell">{count}/{stats.totalCards}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* — Ressources — */}
      {stats.totalRes > 0 && (
        <div className="set-stats-section">
          <p className="set-stats-section-title">Resources</p>
          <div className="ds-res-row">
            {RES_ICONS.map(({ key, cls, label }) =>
              stats.resMap[key] > 0 ? (
                <div key={key} className="ds-res-item" title={label}>
                  <span className={`ds-res-icon cl-res-icon ${cls}`} />
                  <span className="ds-res-count">{stats.resMap[key]}</span>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* — Courbe de coût — */}
      {stats.costEntries.length > 0 && (
        <div className="set-stats-section">
          <p className="set-stats-section-title">
            Cost Curve
            {stats.avgCost != null && <span className="ds-avg-cost">avg {stats.avgCost}</span>}
          </p>
          <div className="ds-cost-chart">
            {stats.costEntries.map(({ cost, count }) => {
              const isActive = String(cost) === String(activeCost);
              return (
                <div
                  key={cost}
                  className={['ds-cost-col', isActive ? 'ds-cost-col--active' : ''].filter(Boolean).join(' ')}
                  onClick={() => onCostClick && onCostClick(String(cost))}
                  role={onCostClick ? 'button' : undefined}
                  tabIndex={onCostClick ? 0 : undefined}
                  onKeyDown={e => e.key === 'Enter' && onCostClick && onCostClick(String(cost))}
                  title={onCostClick ? `Filter by cost ${cost}` : undefined}
                >
                  <span className="ds-cost-count">{count}</span>
                  <div
                    className={['ds-cost-bar', isActive ? 'ds-cost-bar--active' : ''].filter(Boolean).join(' ')}
                    style={{ height: `${Math.round((count / stats.maxCostCount) * 60)}px` }}
                  />
                  <span className="ds-cost-label">{cost}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
