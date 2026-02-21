import React from 'react';

export default function CardPack({ card }) {
  const isOfficial = !card.creator || card.creator === 'FFG' || card.creator === '';
  const setClass = isOfficial ? 'mc-pack-official' : 'mc-pack-fanmade';
  const packTypeRaw = card.card_set_type_name_code || card.card_set_type || card.type_code || 'unknown';
  const packType = String(packTypeRaw).replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="mc-card-pack">
      <span className="mc-pack-name">{card.pack_name} <span className="mc-pack-num">#{card.position}</span></span>
      {card.card_set_code && (
        <span className="mc-pack-badges">
          <span className={`mc-badge mc-pack-badge ${setClass} mc-pack-type-${packType}`}>{card.card_set_name || 'FFG'}</span>
          <span className={`mc-badge mc-pack-range ${setClass} mc-pack-type-${packType}`}>
            {card.set_position}{card.quantity > 1 ? `-${card.set_position + card.quantity - 1}` : ''}
          </span>
        </span>
      )}
    </div>
  );
}
