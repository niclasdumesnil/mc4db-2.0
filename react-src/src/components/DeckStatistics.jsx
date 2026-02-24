import React, { useMemo } from 'react';
import { getFactionColor } from '@utils/dataUtils';
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

export default function DeckStatistics({ slots = [], packsRequired }) {
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
    const typeMap = {};
    for (const s of regular) {
      const type = s.type_name || 'Other';
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
    <div className="deck-stats">

      <h4 className="dh-title">Statistics</h4>

      {/* — Totaux — */}
      <div className="ds-totals">
        <div className="ds-total-item">
          <span className="ds-total-value">{stats.totalCards}</span>
          <span className="ds-total-label">Cards</span>
        </div>
        {packsRequired != null && (
          <div className="ds-total-item">
            <span className="ds-total-value">{packsRequired}</span>
            <span className="ds-total-label">Packs</span>
          </div>
        )}
      </div>

      {/* — Affinités (Factions) — */}
      <div className="ds-section">
        <h4 className="ds-section-title">Affinities</h4>
        <div className="ds-type-list">
          {stats.factions.map(({ code, count }) => {
            const color = getFactionColor(code);
            const label = FACTION_LABELS[code] || code;
            return (
              <div key={code} className="ds-type-row">
                <div className="ds-faction-label">
                  <span className="ds-faction-dot" style={{ background: color }} />
                  <span className="ds-type-name">{label}</span>
                </div>
                <div className="ds-type-bar-wrap">
                  <div
                    className="ds-type-bar"
                    style={{ width: `${Math.round((count / stats.totalCards) * 100)}%`, background: color }}
                  />
                </div>
                <span className="ds-type-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* — Types — */}
      <div className="ds-section">
        <h4 className="ds-section-title">Card Types</h4>
        <div className="ds-type-list">
          {stats.types.map(({ name, count }) => (
            <div key={name} className="ds-type-row">
              <span className="ds-type-name">{name}</span>
              <div className="ds-type-bar-wrap">
                <div
                  className="ds-type-bar"
                  style={{ width: `${Math.round((count / stats.totalCards) * 100)}%` }}
                />
              </div>
              <span className="ds-type-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* — Ressources — */}
      {stats.totalRes > 0 && (
        <div className="ds-section">
          <h4 className="ds-section-title">Resources</h4>
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
        <div className="ds-section">
          <h4 className="ds-section-title">
            Cost Curve
            {stats.avgCost != null && <span className="ds-avg-cost">avg {stats.avgCost}</span>}
          </h4>
          <div className="ds-cost-chart">
            {stats.costEntries.map(({ cost, count }) => (
              <div key={cost} className="ds-cost-col">
                <span className="ds-cost-count">{count}</span>
                <div
                  className="ds-cost-bar"
                  style={{ height: `${Math.round((count / stats.maxCostCount) * 60)}px` }}
                />
                <span className="ds-cost-label">{cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
