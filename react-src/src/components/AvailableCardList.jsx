import React from 'react';
import { getFactionColor } from '@utils/dataUtils';
import '../css/CardList.css';
import '../css/DeckEditor.css';

function FactionDot({ card }) {
  const code = card.faction_code;
  const name = card.faction_name || code;
  if (code === 'hero') {
    return (
      <span className="cl-faction-dot cl-faction-dot--hero" title={name}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.34 0-10 1.68-10 5v1h20v-1c0-3.32-6.66-5-10-5z" />
        </svg>
      </span>
    );
  }
  const color = getFactionColor(code);
  return (
    <span
      className="cl-faction-dot"
      style={{ background: color, boxShadow: `0 0 0 1px ${color}55` }}
      title={name}
    />
  );
}

function ResourceIcons({ card }) {
  const icons = [];
  const push = (count, cls) => {
    for (let i = 0; i < (count || 0); i++)
      icons.push(<span key={`${cls}-${i}`} className={`cl-res-icon ${cls}`} />);
  };
  push(card.resource_energy, 'icon-energy');
  push(card.resource_physical, 'icon-physical');
  push(card.resource_mental, 'icon-mental');
  push(card.resource_wild, 'icon-wild');
  return <div className="cl-resources">{icons}</div>;
}

function CostCell({ cost }) {
  if (cost === null || cost === undefined || cost === '') return <td className="cl-cost">—</td>;
  return <td className="cl-cost">{cost}</td>;
}

/**
 * Sélecteur de quantité : boutons 0..deckLimit
 * Buttons beyond deckLimit are there but inactive; the setter (setQty/setSideQty)
 * handles redistributing other variants automatically.
 */
function QtySelector({ cardCode, deckLimit = 3, slotsMap, onSetQty }) {
  const current = slotsMap[cardCode] || 0;
  const max = Math.max(deckLimit, 1);
  const buttons = [];
  for (let i = 0; i <= max; i++) {
    buttons.push(
      <button
        key={i}
        className={`qty-btn${current === i ? ' qty-btn--active' : ''}`}
        onClick={() => onSetQty(cardCode, i, deckLimit)}
        title={`Quantité : ${i}`}
      >
        {i}
      </button>
    );
  }
  return <div className="qty-selector">{buttons}</div>;
}

export default function AvailableCardList({ cards, slotsMap = {}, onSetQty, sideMap = {}, onSetSideQty, variantGroupMap = {}, sortBy = 'name', sortOrder = 'asc', onSort }) {
  if (!cards || !cards.length) {
    return <div className="cardlist-empty">No cards match these filters.</div>;
  }

  const arrow = (col) => {
    if (sortBy !== col) return <span className="cl-sort-icon cl-sort-icon--inactive">⇅</span>;
    return <span className="cl-sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="cl-checklist cl-checklist--compact">
        <thead>
          <tr>
            <th title="Qty in deck">Qty</th>
            <th title="Qty in side deck">Side</th>
            <th
              className="sortable"
              onClick={() => onSort && onSort('name')}
              title="Sort by name"
            >Name {arrow('name')}</th>
            <th
              className="sortable"
              onClick={() => onSort && onSort('cost')}
              title="Sort by cost"
            >$ {arrow('cost')}</th>
            <th>Type</th>
            <th title="Resources">Res.</th>
          </tr>
        </thead>
        <tbody>
          {cards.map(card => {
            const creator = card.creator && card.creator !== 'FFG' ? card.creator : null;
            return (
              <tr key={card.code || card.id}>
                {/* Main Deck Quantity */}
                <td className="cl-qty-cell">
                  <QtySelector
                    cardCode={card.code}
                    deckLimit={card.deck_limit ?? 3}
                    slotsMap={slotsMap}
                    onSetQty={onSetQty}
                  />
                </td>

                {/* Side Deck Quantity */}
                <td className="cl-qty-cell cl-qty-cell--side">
                  {onSetSideQty ? (
                    <QtySelector
                      cardCode={card.code}
                      deckLimit={card.deck_limit ?? 3}
                      slotsMap={sideMap}
                      onSetQty={onSetSideQty}
                    />
                  ) : null}
                </td>

                {/* Name */}
                <td>
                  <div className="cl-card-name">
                    <FactionDot card={card} />
                    {card.is_unique ? <span className="icon-unique cl-unique-icon" title="Unique" /> : null}
                    <span className="card-tip" data-code={card.code} style={{ color: 'var(--cl-text)', fontWeight: 500, cursor: 'pointer' }}>{card.name}</span>
                    {card.pack_environment === 'current' && <span className="mc-badge mc-badge-current" title="Standard format">Current</span>}
                    {card.visibility === 'false' && <span className="mc-badge mc-badge-private" title="Donor exclusive">🔒 Private</span>}
                    {creator && <span className="mc-badge mc-badge-creator" title={`Created by ${creator}`}>{creator}</span>}
                    {card.alt_art && <span className="mc-badge mc-badge-altart" title="Alternative art">Alt Art</span>}
                  </div>
                </td>

                {/* Cost */}
                <CostCell cost={card.cost} />

                {/* Type */}
                <td className="cl-type">
                  {card.type_name}
                  {card.subtype_name ? <span style={{ color: 'rgba(148,163,184,0.6)' }}> — {card.subtype_name}</span> : null}
                </td>

                {/* Resources */}
                <td><ResourceIcons card={card} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}