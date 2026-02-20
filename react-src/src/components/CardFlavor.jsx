import React from 'react';

export default function CardFlavor({ card, showSpoilers }) {
  if (!card.flavor) return null;
  const spoilerClass = card.spoiler && !showSpoilers ? 'mc-spoiler' : '';

  return (
    <div
      className={`mc-card-flavor ${spoilerClass}`}
      dangerouslySetInnerHTML={{ __html: card.flavor }}
    />
  );
}
