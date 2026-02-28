import React from 'react';
import { getFactionColor } from '@utils/dataUtils';
import ImageWithWebp from '@components/ImageWithWebp';

/**
 * Faction dot — coloured circle for aspect cards, person icon for hero cards.
 */
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
  if (code === 'campaign') {
    return (
      <span className="cl-faction-dot cl-faction-dot--hero" title={name}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
          <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 18H6V4h2v8l2.5-1.5L13 12V4h5v16z" />
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

/**
 * Renders a small block of resource icons for a card row.
 * Uses the marvel-icons font (icon-* classes from mc4db.css).
 */
function ResourceIcons({ card }) {
  const icons = [];
  const push = (count, iconCls) => {
    for (let i = 0; i < (count || 0); i++) {
      icons.push(<span key={`${iconCls}-${i}`} className={`cl-res-icon ${iconCls}`} />);
    }
  };
  push(card.resource_energy, 'icon-energy');
  push(card.resource_physical, 'icon-physical');
  push(card.resource_mental, 'icon-mental');
  push(card.resource_wild, 'icon-wild');
  return <div className="cl-resources">{icons}</div>;
}

/**
 * Displays cost — null/undefined shows '—', 'X' stays as 'X'.
 */
function CostCell({ cost }) {
  if (cost === null || cost === undefined || cost === '') return <td className="cl-cost">—</td>;
  return <td className="cl-cost">{cost}</td>;
}

/**
 * CardListDisplay
 *
 * Props:
 *   cards   — array of card objects from the search API
 *   mode    — 'checklist' (more modes to be added)
 *   sort    — current sort key
 *   onSort  — callback(newSort) when a column header is clicked
 */
export default function CardListDisplay({ cards, mode = 'checklist', sort, onSort }) {
  const locale = localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en';
  const langDir = locale.toUpperCase() === 'FR' ? 'FR' : 'EN';
  if (!cards || cards.length === 0) return null;

  if (mode === 'checklist') {
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="cl-checklist">
          <thead>
            <tr>
              <ColHeader label="Name" col="name" current={sort} onSort={onSort} />
              <ColHeader label="Cost" col="cost" current={sort} onSort={onSort} />
              <th>Type</th>
              <th>Resources</th>
              <th>Traits</th>
              <ColHeader label="Pack" col="pack" current={sort} onSort={onSort} />
              <th>Set</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <tr key={card.code}>
                {/* Name */}
                <td>
                  <div className="cl-card-name">
                    <FactionDot card={card} />
                    {card.is_unique ? <span className="icon-unique cl-unique-icon" title="Unique" /> : null}
                    <a href={`/card/${card.code}`} className="card-tip" data-code={card.code}>{card.name}</a>
                    {(!card.is_unique && card.quantity > 0) ? <span className="cl-qty">(x{card.quantity})</span> : null}
                    {card.pack_environment === 'current' ? <span className="mc-badge mc-badge-current" title="Standard format">Current</span> : null}
                    {card.alt_art ? <span className="mc-badge mc-badge-altart" title="Alternative art">Alt Art</span> : null}
                    {card.pack_creator ? <span className="mc-badge mc-badge-creator" title={`Created by ${card.pack_creator}`}>{card.pack_creator}</span> : null}
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

                {/* Traits */}
                <td className="cl-traits" title={card.traits || ''}>{card.traits || ''}</td>

                {/* Pack */}
                <td className="cl-pack">{card.pack_name}</td>

                {/* Set */}
                <td className="cl-set">{card.card_set_name || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className="cl-grid">
        {cards.map(card => (
          <div key={card.code} className="cl-grid-item">
            <a
              href={`/card/${card.code}`}
              className="cl-grid-link"
              style={{ '--hover-border-color': getFactionColor(card.faction_code) }}
            >
              {(!card.is_unique && card.quantity > 1) && <span className="cl-grid-qty">{card.quantity}x</span>}
              <ImageWithWebp
                src={card.imagesrc}
                alt={card.name}
                className="cl-grid-img"
                locale={locale}
                langDir={langDir}
              />
            </a>
          </div>
        ))}
      </div>
    );
  }

  // Placeholder for future display modes
  return null;
}

function ColHeader({ label, col, current, onSort }) {
  const active = current === col;
  return (
    <th
      className={`sortable${active ? ' active' : ''}`}
      onClick={() => onSort && onSort(col)}
    >
      {label}
      <span className="sort-indicator">{active ? ' ▲' : ''}</span>
    </th>
  );
}
