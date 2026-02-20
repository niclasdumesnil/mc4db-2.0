import React from 'react';

export default function CardFlavor({ card, showSpoilers }) {
  if (!card.flavor) return null;
  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';

  return (
    <div
      className={`mc-card-flavor ${spoilerClass}`}
      dangerouslySetInnerHTML={{ __html: card.flavor }}
    />
  );
}
