import { getFactionColor } from '@utils/dataUtils';
import ImageWithWebp from '@components/ImageWithWebp';
import { TooltipContent } from './CardTooltip';

/**
 * Faction dot — coloured circle for aspect cards, person icon for hero cards.
 */
function FactionDot({ card }) {
  const code = card.faction_code;
  const name = card.faction_name || code;

  let showIconAspect = false;
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    if (u && u.show_icon_aspect) showIconAspect = true;
  } catch(e) {}

  if (showIconAspect) {
    const offsets = {
      leadership: '-3.6px',
      justice: '-20.3px',
      protection: '-37.1px',
      aggression: '-53.9px',
      basic: '-70.8px',
      encounter: '-87.7px',
      hero: '-104.1px',
      pool: '-120.7px',
      determination: '-137.5px'
    };
    const off = offsets[code] || '-70.8px';
    const borderColor = getFactionColor(code) || '#64748b';
    return (
      <span
        className="cl-faction-sprite"
        title={name}
        style={{ 
          backgroundPosition: `${off} center`,
          borderColor: borderColor
        }}
      />
    );
  }

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
 * Uses the marvel-icons font (icon-* classes from style.css).
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
 * Renders boost icons (star first, then B icons) for encounter cards.
 * Uses the same cl-res-icon square style as ResourceIcons.
 */
function BoostIcons({ card }) {
  const boostCount = Math.max(0, parseInt(card.boost ?? 0, 10));
  const hasStar = !!card.boost_star;
  if (boostCount === 0 && !hasStar) return <div className="cl-resources"><span className="cl-res-empty">—</span></div>;
  return (
    <div className="cl-resources">
      {hasStar && <span className="cl-res-icon cl-res-icon--boost" title="Boost ★">★</span>}
      {Array.from({ length: boostCount }, (_, i) => (
        <span key={i} className="cl-res-icon icon-boost cl-res-icon--boost" title="Boost" />
      ))}
    </div>
  );
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
export default function CardListDisplay({ cards, mode = 'checklist', sort, onSort, onCardNameClick }) {
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
              <th style={{ whiteSpace: 'normal', lineHeight: 1.1 }}>Res.<br />Boost</th>
              <ColHeader label="Pack" col="pack" current={sort} onSort={onSort} className="hide-on-tablet" />
              <th className="hide-on-tablet">Set</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => (
              <tr key={card.code}>
                {/* Name */}
                <td>
                  <div className="cl-card-name-group" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="cl-card-name">
                      <FactionDot card={card} />
                      {card.is_unique ? <span className="icon-unique cl-unique-icon" title="Unique" /> : null}
                      {onCardNameClick
                        ? <button className="cl-card-name-btn" onClick={() => onCardNameClick(card)}>{card.name}</button>
                        : <a href={`/card/${card.code}`} className="card-tip" data-code={card.code}>{card.name}</a>}
                      {(!card.is_unique && card.quantity > 0) ? <span className="cl-qty">(x{card.quantity})</span> : null}
                      {card.pack_environment === 'current' ? (
                        <span className="dc-tooltip-wrap">
                          <span className="mc-badge mc-badge-current">Current</span>
                          <span className="dc-tooltip">Current format</span>
                        </span>
                      ) : null}
                      {card.pack_creator ? String(card.pack_creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => <span key={i} className="mc-badge mc-badge-creator" title={`Created by ${c}`}>{c}</span>) : null}
                      <span className="cl-hover-action">
                        {card.visibility === 'false' && <span className="mc-badge mc-badge-private" title="Private">🔒</span>}
                        {card.alt_art ? (
                          <span className="dc-tooltip-wrap">
                            <span className="mc-badge mc-badge-altart">🎨 Alt-Art</span>
                            <span className="dc-tooltip">Alternative art</span>
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {/* Traits under Name */}
                    {card.traits && (
                      <div className="cl-card-traits-sub" style={{ fontSize: '0.75rem', color: 'var(--st-text-muted)', fontStyle: 'italic', paddingLeft: '22px', marginTop: '2px' }}>
                        {card.traits}
                      </div>
                    )}
                  </div>
                </td>

                {/* Cost */}
                <CostCell cost={card.cost} />

                {/* Type */}
                <td className="cl-type">
                  {card.type_name}
                </td>

                {/* Resources / Boost */}
                <td>{card.faction_code === 'encounter' ? <BoostIcons card={card} /> : <ResourceIcons card={card} />}</td>

                {/* Pack */}
                <td className="cl-pack hide-on-tablet">
                  {card.pack_name}
                  {card.visibility === 'false' && <span className="mc-badge mc-badge-private" title="Donor exclusive">🔒 Private</span>}
                </td>

                {/* Set */}
                <td className="cl-set hide-on-tablet">{card.card_set_name || ''}</td>
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
                card={card}
              />
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'preview') {
    return (
      <div className="cl-preview-grid">
        {cards.map(card => {
          const factionColor = getFactionColor(card.faction_code);
          return (
            <div
              key={card.code}
              className="card-tooltip cl-preview-item"
              style={{
                '--tooltip-faction': factionColor || '#374151',
              }}
            >
              <TooltipContent card={card} isLink={true} />
            </div>
          );
        })}
      </div>
    );
  }

  // Placeholder for future display modes
  return null;
}

function ColHeader({ label, col, current, onSort, className = '' }) {
  const active = current === col;
  return (
    <th
      className={`sortable${active ? ' active' : ''} ${className}`.trim()}
      onClick={() => onSort && onSort(col)}
    >
      {label}
      <span className="sort-indicator">{active ? ' ▲' : ''}</span>
    </th>
  );
}
