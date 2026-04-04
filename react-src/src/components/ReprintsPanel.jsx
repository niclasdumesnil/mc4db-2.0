import React from 'react';
import '../css/ReprintsPanel.css';

/**
 * Shows reprint / alternate art info for a card.
 * Identical content regardless of which print is being viewed.
 */
export default function ReprintsPanel({ card }) {
  if (!card) return null;

  const duplicatedBy = card.duplicated_by || [];
  const isDuplicate = !!card.duplicate_of_code;

  // Separate reprints vs alt arts
  const reprints = duplicatedBy.filter(d => !d.alt_art);
  const altArts  = duplicatedBy.filter(d => d.alt_art);

  // Nothing to show
  if (!isDuplicate && reprints.length === 0 && altArts.length === 0) return null;

  // Original card code (for link)
  const originalCardCode = isDuplicate ? card.duplicate_of_code : card.code;
  const originalPackName = isDuplicate ? (card.duplicate_of_pack_name || card.duplicate_of_pack_code) : card.pack_name;

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

  // Build subtitle: "Reprint 2, Alt art 1"
  const subtitleParts = [];
  if (reprints.length > 0) subtitleParts.push(`Reprint ${reprints.length}`);
  if (altArts.length > 0) subtitleParts.push(`Alt art ${altArts.length}`);
  const subtitle = subtitleParts.length > 0 ? ` — ${subtitleParts.join(', ')}` : '';

  return (
    <div className="reprints-panel">
      <h3 className="reprints-title">🔄 Prints & Variants{subtitle && <span className="reprints-subtitle">{subtitle}</span>}</h3>

      {/* Original print (always) */}
      <div className="reprints-row">
        <span className="reprints-label">Original print:</span>
        <PackLink cardCode={originalCardCode} name={originalPackName} quantity={0} />
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
          <span className="reprints-label">Alternative art:</span>
          <InlineList items={altArts} />
        </div>
      )}
    </div>
  );
}
