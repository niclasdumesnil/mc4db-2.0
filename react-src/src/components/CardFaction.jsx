import React from 'react';

export default function CardFaction({ card }) {
  if (card.type_code === 'hero' || card.type_code === 'alter_ego') {
    return null;
  }

  return (
    <div className="mc-faction-badge">
      <span className={`icon-${card.faction_code} fg-${card.faction_code}`} />
      <span>{card.faction_name}.</span>
      {card.faction2_code && (
        <>
          <span className={`icon-${card.faction2_code} fg-${card.faction2_code}`} />
          <span>{card.faction2_name}.</span>
        </>
      )}
    </div>
  );
}
