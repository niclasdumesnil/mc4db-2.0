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

  // Total packs count (all duplicates, including alt-art)
  const totalPacks = duplicatedBy.length;

  // Total cards in collection = original qty + sum of all duplicate quantities
  const totalCards = (isDuplicate ? 0 : originalQty) + duplicatedBy.reduce((sum, d) => sum + (d.quantity || 1), 0);

  const PackLink = ({ cardCode, name, quantity }) => (
    <>
      <a href={`/card/${cardCode}`} className="reprints-pack-link">{name || cardCode}</a>
      {quantity > 1 && <span className="reprints-qty">×{quantity}</span>}
    </>
  );

  const InlineList = ({ items }) => (
    <span className="reprints-inline">
      {items.map((r, i) => (
        <React.Fragment key={r.code}>
          {i > 0 && <span className="reprints-dot"> · </span>}
          <PackLink cardCode={r.code} name={r.pack_name} quantity={r.quantity} />
        </React.Fragment>
      ))}
    </span>
  );

  // Subtitle: "Reprint in X packs — Cards in collection: Y"
  const subtitleParts = [];
  if (hasReprints) {
    subtitleParts.push(`Reprint in ${totalPacks} pack${totalPacks > 1 ? 's' : ''}`);
  } else {
    subtitleParts.push('No reprint');
  }
  subtitleParts.push(`Cards in collection: ${totalCards}`);
  const subtitle = ` — ${subtitleParts.join(' · ')}`;

  return (
    <div className="reprints-panel">
      <h3 className="reprints-title">🔄 Prints & Variants<span className="reprints-subtitle">{subtitle}</span></h3>

      {/* Original print (always) */}
      <div className="reprints-row">
        <span className="reprints-label">Original print:</span>
        <PackLink cardCode={originalCardCode} name={originalPackName} quantity={originalQty} />
      </div>

      {/* Reprints */}
      {reprints.length > 0 && (
        <div className="reprints-row">
          <span className="reprints-label">Reprint in:</span>
          <InlineList items={reprints} />
        </div>
      )}

      {/* Alt arts */}
      {altArts.length > 0 && (
        <div className="reprints-row">
          <span className="reprints-label">First alternative art:</span>
          <InlineList items={altArts} />
        </div>
      )}

    </div>
  );
}
