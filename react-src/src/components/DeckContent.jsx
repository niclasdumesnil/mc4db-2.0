import React, { useMemo, useState, useCallback } from 'react';
import { getFactionColor } from '@utils/dataUtils';
import ImageWithWebp from '@components/ImageWithWebp';
import '../css/DeckContent.css';

// Badge quantité interactif (mode édition)
// - displayQty : la quantité affichée (locale à la section)
// - Hover : rangée plates [0][1][2][3] pour main (bleu) puis [0][1][2][3] pour side (ambre), sans étiquette
function QtyBadge({ displayQty = 0, mainQty = 0, sideQty = 0, deckLimit = 3, onChangeMain, onChangeSide }) {
  const options = Array.from({ length: deckLimit + 1 }, (_, i) => i);
  return (
    <span className="qty-badge-wrap">
      <span className="qty-badge-label">{displayQty}x</span>
      <span className="qty-badge-menu" onClick={e => e.stopPropagation()}>
        {onChangeMain && options.map(n => (
          <button
            key={`m${n}`}
            className={`qty-badge-opt qty-badge-opt--main${n === mainQty ? ' qty-badge-opt--main-active' : ''}`}
            onClick={e => { e.stopPropagation(); onChangeMain(n); }}
          >{n}</button>
        ))}
        {onChangeMain && onChangeSide && <span className="qty-badge-sep" />}
        {onChangeSide && options.map(n => (
          <button
            key={`s${n}`}
            className={`qty-badge-opt qty-badge-opt--side${n === sideQty ? ' qty-badge-opt--side-active' : ''}`}
            onClick={e => { e.stopPropagation(); onChangeSide(n); }}
          >{n}</button>
        ))}
      </span>
    </span>
  );
}

// Faction dot — même logique que CardListDisplay
function FactionDot({ card }) {
  const code = card.faction_code;
  const name = card.faction_name || code;
  if (code === 'hero') {
    return (
      <span className="cl-faction-dot cl-faction-dot--hero" title={name}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
          <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.34 0-10 1.68-10 5v1h20v-1c0-3.32-6.66-5-10-5z" />
        </svg>
      </span>
    );
  }
  if (code === 'campaign') {
    return (
      <span className="cl-faction-dot cl-faction-dot--hero" title={name}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
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

export default function DeckContent({ slots, mode = 'list', heroSpecialCards = [], sideSlots = [], invalidCodes = null, onTransferToSide = null, onTransferToMain = null, onChangeQty = null, onChangeSideQty = null, heroSetCode = null }) {
  // Flash animation: set of card codes currently flashing
  const [flashCodes, setFlashCodes] = useState(new Set());

  const triggerFlash = useCallback((code) => {
    setFlashCodes(prev => new Set([...prev, code]));
    setTimeout(() => setFlashCodes(prev => { const n = new Set(prev); n.delete(code); return n; }), 700);
  }, []);
  const locale = localStorage.getItem('mc_locale') || window.__MC_LOCALE__ || 'en';
  const langDir = locale.toUpperCase() === 'FR' ? 'FR' : 'EN';

  // 1. Grouper les cartes par Type (Ally, Event, Support...) et calculer les totaux
  // Les cartes Permanent sont isolées dans un groupe à part et exclues du total
  const { groupedSlots, permanentSlots, totalCards } = useMemo(() => {
    if (!slots || slots.length === 0) return { groupedSlots: {}, permanentSlots: { count: 0, cards: [] }, totalCards: 0 };

    let total = 0;
    const permanent = { count: 0, cards: [] };
    const groups = slots.reduce((acc, slot) => {
      if (slot.permanent) {
        permanent.cards.push(slot);
        permanent.count += slot.quantity;
        return acc;
      }
      const type = slot.type_name || 'Other';
      if (!acc[type]) acc[type] = { count: 0, cards: [] };
      acc[type].cards.push(slot);
      acc[type].count += slot.quantity;
      total += slot.quantity;
      return acc;
    }, {});

    return { groupedSlots: groups, permanentSlots: permanent, totalCards: total };
  }, [slots]);

  // 2. Ordre alphabétique des catégories (Permanent toujours en dernier)
  const sortedTypes = Object.keys(groupedSlots).sort((a, b) => a.localeCompare(b));

  // 2b. Grouper les cartes du Side Deck par type
  const { groupedSideSlots, totalSideCards } = useMemo(() => {
    if (!sideSlots || sideSlots.length === 0) return { groupedSideSlots: {}, totalSideCards: 0 };
    let total = 0;
    const groups = sideSlots.reduce((acc, slot) => {
      const type = slot.type_name || 'Other';
      if (!acc[type]) acc[type] = { count: 0, cards: [] };
      acc[type].cards.push(slot);
      acc[type].count += slot.quantity;
      total += slot.quantity;
      return acc;
    }, {});
    return { groupedSideSlots: groups, totalSideCards: total };
  }, [sideSlots]);

  const sortedSideTypes = Object.keys(groupedSideSlots).sort((a, b) => a.localeCompare(b));

  // Maps code → qty for cross-lookup between main and side
  const sideQtyMap = useMemo(() => {
    const m = {};
    (sideSlots || []).forEach(s => { m[s.code] = s.quantity; });
    return m;
  }, [sideSlots]);

  const mainQtyMap = useMemo(() => {
    const m = {};
    (slots || []).forEach(s => { m[s.code] = s.quantity; });
    return m;
  }, [slots]);

  // 3. Grouper les cartes hero_special par set
  const heroSpecialSets = useMemo(() => {
    if (!heroSpecialCards || heroSpecialCards.length === 0) return [];
    const setMap = {};
    for (const card of heroSpecialCards) {
      const key = card.card_set_code || 'unknown';
      if (!setMap[key]) setMap[key] = { name: card.card_set_name || key, cards: [] };
      setMap[key].cards.push(card);
    }
    return Object.values(setMap);
  }, [heroSpecialCards]);

  // 3. Fonction pour générer les icônes de ressources (basée sur style.css)
  const renderResources = (card) => {
    const resources = [];

    for (let i = 0; i < (card.resource_physical || 0); i++) {
      resources.push(<span key={`p${i}`} className="cl-res-icon icon-physical" title="Physical"></span>);
    }
    for (let i = 0; i < (card.resource_energy || 0); i++) {
      resources.push(<span key={`e${i}`} className="cl-res-icon icon-energy" title="Energy"></span>);
    }
    for (let i = 0; i < (card.resource_mental || 0); i++) {
      resources.push(<span key={`m${i}`} className="cl-res-icon icon-mental" title="Mental"></span>);
    }
    for (let i = 0; i < (card.resource_wild || 0); i++) {
      resources.push(<span key={`w${i}`} className="cl-res-icon icon-wild" title="Wild"></span>);
    }

    return <div className="slot-resources">{resources}</div>;
  };

  // Lookup sets for unique-card disabled checks
  const mainCodes = useMemo(() => new Set((slots || []).filter(s => s.quantity > 0).map(s => s.code)), [slots]);
  const sideCodes = useMemo(() => new Set((sideSlots || []).filter(s => s.quantity > 0).map(s => s.code)), [sideSlots]);

  if (totalCards === 0 && permanentSlots.cards.length === 0 && heroSpecialCards.length === 0 && totalSideCards === 0) {
    return <div className="deck-empty">No cards found in this deck.</div>;
  }

  return (
    <div className="deck-content-container">
      {totalCards > 0 && (
        <h4 className="side-deck-header" style={{ marginBottom: '1rem', marginTop: '0.5rem', color: '#fff', textTransform: 'uppercase' }}>
          MAIN DECK <span className="slot-group-count">({totalCards})</span>
        </h4>
      )}
      <div className="deck-slots-grid">
        {sortedTypes.map(type => (
          <div key={type} className="slot-group">
            <h5 className="slot-group-title">
              {type} <span className="slot-group-count">({groupedSlots[type].count})</span>
            </h5>
            {mode === 'list' && (
              <ul className="slot-list">
                {[...groupedSlots[type].cards]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(card => {
                    const isHero = (card.faction_code === 'hero' || card.faction_code === 'campaign')
                      && (!heroSetCode || card.card_set_code === heroSetCode);
                    const canToSide = !!onTransferToSide && !isHero && !(card.is_unique && sideCodes.has(card.code));
                    const isInvalid = !isHero && invalidCodes?.has(card.code);
                    return (
                    <li key={card.code} className={`slot-item${flashCodes.has(card.code) ? ' slot-item--flash' : ''}${isInvalid ? ' slot-item--invalid' : ''}`}>
                      <div className="slot-main-info">
                        {!isHero && onChangeQty
                          ? <QtyBadge
                              displayQty={card.quantity}
                              mainQty={card.quantity}
                              sideQty={sideQtyMap[card.code] ?? 0}
                              deckLimit={card.deck_limit ?? 3}
                              onChangeMain={qty => onChangeQty(card.code, qty, card.deck_limit ?? 3)}
                              onChangeSide={onChangeSideQty ? qty => onChangeSideQty(card.code, qty, card.deck_limit ?? 3) : undefined}
                            />
                          : <span className="slot-qty">{card.quantity}x</span>
                        }
                        <FactionDot card={card} />
                        {!!card.is_unique && <span className="icon-unique cl-unique-icon" title="Unique" />}
                        <span className="slot-name card-tip" data-code={card.code}>{card.name}</span>
                        {isInvalid && <span className="slot-invalid-badge" title="This card does not comply with deck rules">⚠</span>}
                        {card.pack_environment === 'current' ? <span className="mc-badge mc-badge-current" title="Standard format">Current</span> : null}
                        {card.alt_art ? <span className="mc-badge mc-badge-altart" title="Alternative art">Alt Art</span> : null}
                        {onTransferToSide && !isHero && (
                          <button
                            className={`slot-transfer-btn slot-transfer-btn--to-side${!canToSide ? ' slot-transfer-btn--disabled' : ''}`}
                            title={canToSide ? 'Move 1 copy to Side Deck' : 'Side Deck full or Unique already there'}
                            disabled={!canToSide}
                            onClick={() => { if (canToSide) { onTransferToSide(card.code); triggerFlash(card.code); } }}
                          >↓ Side</button>
                        )}
                      </div>
                      {renderResources(card)}
                    </li>
                    );
                  })}
              </ul>
            )}

            {/* Grid rendering injected next to the list, visually toggled via CSS or conditionally */}
            {mode === 'grid' && (
              <div className="dc-grid">
                {[...groupedSlots[type].cards]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(card => (
                    <div key={card.code} className="dc-grid-item">
                      <a
                        href={`/card/${card.code}`}
                        className="dc-grid-link card-tip"
                        data-code={card.code}
                        style={{ '--hover-border-color': getFactionColor(card.faction_code) }}
                      >
                        {card.quantity > 1 && <span className="dc-grid-qty">{card.quantity}x</span>}
                        <ImageWithWebp src={card.imagesrc} alt={card.name} className="dc-grid-img" locale={locale} langDir={langDir} />
                      </a>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}

        {/* Groupe Permanent — toujours en dernier, exclu du total */}
        {permanentSlots.cards.length > 0 && (
          <div className="slot-group slot-group--permanent">
            <h5 className="slot-group-title">
              Permanent <span className="slot-group-count">({permanentSlots.count})</span>
            </h5>
            {mode === 'list' && (
              <ul className="slot-list">
                {[...permanentSlots.cards]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(card => {
                    const isHero = (card.faction_code === 'hero' || card.faction_code === 'campaign')
                      && (!heroSetCode || card.card_set_code === heroSetCode);
                    const canToSide = !!onTransferToSide && !isHero && !(card.is_unique && sideCodes.has(card.code));
                    const isInvalid = !isHero && invalidCodes?.has(card.code);
                    return (
                    <li key={card.code} className={`slot-item${flashCodes.has(card.code) ? ' slot-item--flash' : ''}${isInvalid ? ' slot-item--invalid' : ''}`}>
                      <div className="slot-main-info">
                        {!isHero && (onChangeQty || onChangeSideQty)
                          ? <QtyBadge
                              displayQty={card.quantity}
                              mainQty={card.quantity}
                              sideQty={sideQtyMap[card.code] ?? 0}
                              deckLimit={card.deck_limit ?? 3}
                              onChangeMain={onChangeQty ? qty => onChangeQty(card.code, qty, card.deck_limit ?? 3) : undefined}
                              onChangeSide={onChangeSideQty ? qty => onChangeSideQty(card.code, qty, card.deck_limit ?? 3) : undefined}
                            />
                          : <span className="slot-qty">{card.quantity}x</span>
                        }
                        <FactionDot card={card} />
                        {!!card.is_unique && <span className="icon-unique cl-unique-icon" title="Unique" />}
                        <span className="slot-name card-tip" data-code={card.code}>{card.name}</span>
                        {isInvalid && <span className="slot-invalid-badge" title="This card does not comply with deck rules">⚠</span>}
                        {card.pack_environment === 'current' ? <span className="mc-badge mc-badge-current" title="Standard format">Current</span> : null}
                        {card.alt_art ? <span className="mc-badge mc-badge-altart" title="Alternative art">Alt Art</span> : null}
                        {onTransferToSide && !isHero && (
                          <button
                            className={`slot-transfer-btn slot-transfer-btn--to-side${!canToSide ? ' slot-transfer-btn--disabled' : ''}`}
                            title={canToSide ? 'Move 1 copy to Side Deck' : 'Side Deck full or Unique already there'}
                            disabled={!canToSide}
                            onClick={() => { if (canToSide) { onTransferToSide(card.code); triggerFlash(card.code); } }}
                          >↓ Side</button>
                        )}
                      </div>
                      {renderResources(card)}
                    </li>
                    );
                  })}
              </ul>
            )}

            {mode === 'grid' && (
              <div className="dc-grid">
                {[...permanentSlots.cards]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .flatMap(card => Array.from({ length: card.quantity || 1 }, (_, i) => (
                    <div key={`${card.code}-${i}`} className="dc-grid-item">
                      <a
                        href={`/card/${card.code}`}
                        className="dc-grid-link card-tip"
                        data-code={card.code}
                        style={{ '--hover-border-color': getFactionColor(card.faction_code) }}
                      >
                        <ImageWithWebp src={card.imagesrc} alt={card.name} className="dc-grid-img" />
                      </a>
                    </div>
                  )))
                }
              </div>
            )}
          </div>
        )}
      </div>

    {/* -- Hero Special Decks (Invocation, Weather Deck, etc.) -- */}
    {heroSpecialSets.length > 0 && (
      <div className="hero-special-container">
        {heroSpecialSets.map(specialSet => (
          <div key={specialSet.name} className="hero-special-set">
            <h5 className="hero-special-title">
              {specialSet.name} <span className="slot-group-count">({specialSet.cards.reduce((s, c) => s + (c.quantity || 1), 0)})</span>
            </h5>
            {mode === 'list' && (
              <ul className="slot-list">
                {specialSet.cards.map(card => (
                  <li key={card.code} className="slot-item hero-special-item">
                    <div className="slot-main-info">
                      <span className="slot-qty">{card.quantity || 1}x</span>
                      <FactionDot card={card} />
                      {!!card.is_unique && <span className="icon-unique cl-unique-icon" title="Unique" />}
                      <span className="slot-name card-tip" data-code={card.code}>{card.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {mode === 'grid' && (
              <div className="dc-grid">
                {specialSet.cards.map(card => (
                  <div key={card.code} className="dc-grid-item">
                    <a
                      href={`/card/${card.code}`}
                      className="dc-grid-link card-tip"
                      data-code={card.code}
                      style={{ '--hover-border-color': getFactionColor(card.faction_code) }}
                    >
                      {card.quantity > 1 && <span className="dc-grid-qty">{card.quantity}x</span>}
                      <ImageWithWebp src={card.imagesrc} alt={card.name} className="dc-grid-img" locale={locale} langDir={langDir} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
    {/* -- Side Deck -- */}
    {totalSideCards > 0 && (
      <div className="side-deck-container">
        <h4 className="side-deck-header">
          Side Deck <span className="slot-group-count">({totalSideCards})</span>
        </h4>
        <div className="side-deck-slots-grid">
        {sortedSideTypes.map(type => (
          <div key={type} className="slot-group">
            <h5 className="slot-group-title">
              {type} <span className="slot-group-count">({groupedSideSlots[type].count})</span>
            </h5>
            {mode === 'list' && (
              <ul className="slot-list">
                {[...groupedSideSlots[type].cards]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(card => {
                    const canToMain = !!onTransferToMain && !(card.is_unique && mainCodes.has(card.code));
                    const isInvalid = invalidCodes?.has(card.code);
                    return (
                    <li key={card.code} className={`slot-item${flashCodes.has(card.code) ? ' slot-item--flash' : ''}${isInvalid ? ' slot-item--invalid' : ''}`}>
                      <div className="slot-main-info">
                        {(onChangeQty || onChangeSideQty)
                          ? <QtyBadge
                              displayQty={card.quantity}
                              mainQty={mainQtyMap[card.code] ?? 0}
                              sideQty={card.quantity}
                              deckLimit={card.deck_limit ?? 3}
                              onChangeMain={onChangeQty ? qty => onChangeQty(card.code, qty, card.deck_limit ?? 3) : undefined}
                              onChangeSide={onChangeSideQty ? qty => onChangeSideQty(card.code, qty, card.deck_limit ?? 3) : undefined}
                            />
                          : <span className="slot-qty">{card.quantity}x</span>
                        }
                        <FactionDot card={card} />
                        {!!card.is_unique && <span className="icon-unique cl-unique-icon" title="Unique" />}
                        <span className="slot-name card-tip" data-code={card.code}>{card.name}</span>
                        {isInvalid && <span className="slot-invalid-badge" title="This card does not comply with deck rules">⚠</span>}
                        {card.pack_environment === 'current' ? <span className="mc-badge mc-badge-current" title="Standard format">Current</span> : null}
                        {card.alt_art ? <span className="mc-badge mc-badge-altart" title="Alternative art">Alt Art</span> : null}
                        {onTransferToMain && (
                          <button
                            className={`slot-transfer-btn slot-transfer-btn--to-main${!canToMain ? ' slot-transfer-btn--disabled' : ''}`}
                            title={canToMain ? 'Move 1 copy to Main Deck' : 'Main Deck full or Unique already there'}
                            disabled={!canToMain}
                            onClick={() => { if (canToMain) { onTransferToMain(card.code); triggerFlash(card.code); } }}
                          >↑ Main</button>
                        )}
                      </div>
                      {renderResources(card)}
                    </li>
                    );
                  })}
              </ul>
            )}
            {mode === 'grid' && (
              <div className="dc-grid">
                {[...groupedSideSlots[type].cards]
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(card => (
                    <div key={card.code} className="dc-grid-item">
                      <a
                        href={`/card/${card.code}`}
                        className="dc-grid-link card-tip"
                        data-code={card.code}
                        style={{ '--hover-border-color': getFactionColor(card.faction_code) }}
                      >
                        {card.quantity > 1 && <span className="dc-grid-qty">{card.quantity}x</span>}
                        <ImageWithWebp src={card.imagesrc} alt={card.name} className="dc-grid-img" locale={locale} langDir={langDir} />
                      </a>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
        </div>
      </div>
    )}
    </div>
  );
}
