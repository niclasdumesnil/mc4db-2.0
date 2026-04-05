import React from 'react';
import '../css/ReprintsPanel.css';

/**
 * Shows reprint / alternate art info for a card.
 * Displayed on ALL cards — shows "No reprint" when there are no duplicates.
 */
export default function ReprintsPanel({ card }) {
  if (!card) return null;

  const duplicatedBy = card.duplicated_by || [];
  const isDuplicate = !!card.duplicate_of_code;

  // Separate reprints vs alt arts
  const reprints = duplicatedBy.filter(d => !d.alt_art);
  const altArts  = duplicatedBy.filter(d => d.alt_art);

  const hasReprints = isDuplicate || duplicatedBy.length > 0;

  // Original card info
  const originalCardCode = isDuplicate ? card.duplicate_of_code : card.code;
  const originalPackName = isDuplicate ? (card.duplicate_of_pack_name || card.duplicate_of_pack_code) : card.pack_name;
  const originalQty = card.quantity || 1;

  // Helper: is a pack fanmade?
  const isFanmade = (d) => !!(d.pack_creator && d.pack_creator !== '');
  const isCardFanmade = !!(card.pack_creator && card.pack_creator !== '');

  // Deduplicate packs by pack_code, keeping only unique packs
  const dedup = (items) => {
    const seen = new Set();
    return items.filter(d => {
      if (seen.has(d.pack_code)) return false;
      seen.add(d.pack_code);
      return true;
    });
  };

  const uniqueReprints = dedup(reprints);
  const uniqueAltArts  = dedup(altArts);

  // Unique packs count (all duplicates, deduplicated)
  const allUnique = dedup(duplicatedBy);
  const totalPacks = allUnique.length;
  const fanmadePacks = allUnique.filter(isFanmade).length;

  // Total cards in collection = original qty + sum of all duplicate quantities
  const totalCards = (isDuplicate ? 0 : originalQty) + duplicatedBy.reduce((sum, d) => sum + (d.quantity || 1), 0);
  const fanmadeCards = duplicatedBy.filter(isFanmade).reduce((sum, d) => sum + (d.quantity || 1), 0)
    + (isDuplicate ? 0 : (isCardFanmade ? originalQty : 0));

  const PackLink = ({ cardCode, name, fanmade, quantity }) => (
    <>
      <a href={`/card/${cardCode}`} className={`reprints-pack-link${fanmade ? ' reprints-pack-link--fanmade' : ''}`}>{name || cardCode}</a>
      {quantity > 1 && <span className="reprints-qty">×{quantity}</span>}
    </>
  );

  const InlineList = ({ items }) => (
    <span className="reprints-inline">
      {items.map((r, i) => (
        <React.Fragment key={r.code || r.pack_code + i}>
          {i > 0 && <span className="reprints-dot"> · </span>}
          <PackLink cardCode={r.code} name={r.pack_name} fanmade={isFanmade(r)} quantity={r.quantity} />
        </React.Fragment>
      ))}
    </span>
  );

  // Subtitle
  const subtitleParts = [];
  if (hasReprints) {
    let packText = `Reprint in ${totalPacks} pack${totalPacks > 1 ? 's' : ''}`;
    if (fanmadePacks > 0) packText += ` (${fanmadePacks} fanmade)`;
    subtitleParts.push(packText);
  } else {
    subtitleParts.push('No reprint');
  }
  let cardsText = `Cards in collection: ${totalCards}`;
  if (fanmadeCards > 0) cardsText += ` (${fanmadeCards} fanmade)`;
  subtitleParts.push(cardsText);
  const subtitle = ` — ${subtitleParts.join(' · ')}`;

  return (
    <div className="reprints-panel">
      <h3 className="reprints-title">🔄 Prints & Variants<span className="reprints-subtitle">{subtitle}</span></h3>

      {/* Original print (always) */}
      <div className="reprints-row">
        <span className="reprints-label">Original print:</span>
        <PackLink cardCode={originalCardCode} name={originalPackName} fanmade={isCardFanmade} quantity={originalQty} />
      </div>

      {/* Reprints */}
      {uniqueReprints.length > 0 && (
        <div className="reprints-row">
          <span className="reprints-label">Reprint in:</span>
          <InlineList items={uniqueReprints} />
        </div>
      )}

      {/* Alt arts */}
      {uniqueAltArts.length > 0 && (
        <div className="reprints-row">
          <span className="reprints-label">First new alternative art in:</span>
          <InlineList items={uniqueAltArts} />
        </div>
      )}

    </div>
  );
}
