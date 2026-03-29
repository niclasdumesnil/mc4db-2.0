import React from 'react';

export default function CardName({ card, showSpoilers }) {
  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';

  return (
    <div>
      <span className="tw-flex tw-items-center tw-flex-wrap tw-gap-2">
        {card.is_unique && <span className="icon-unique" />}
        <a
          href={card.url}
          className={`card-name card-tip ${!card.available ? 'card-preview' : ''} ${spoilerClass}`}
          data-code={card.code}
        >
          {card.name}
          <CardStage card={card} />
        </a>

        {card.quantity > 0 &&
          !card.is_unique &&
          card.type_code !== 'villain' &&
          card.type_code !== 'main_scheme' && (
            <span className="tw-opacity-70 tw-text-base tw-font-semibold">
              (x{card.quantity || 1})
            </span>
          )}

        <StatusTag card={card} />
      </span>

      {card.subname && (
        <div className={`tw-text-sm tw-opacity-80 ${spoilerClass}`}>
          {card.subname}
        </div>
      )}
    </div>
  );
}

function CardStage({ card }) {
  if ((card.type_code === 'villain' || card.type_code === 'leader') && card.stage) {
    return <span> ({card.stage})</span>;
  }
  if (card.type_code === 'main_scheme') {
    return <span> - {card.stage}</span>;
  }
  return null;
}

function StatusTag({ card }) {
  const creator = card.creator || card.pack_creator;
  const isFFG = !creator || creator === 'FFG' || creator === '';
  const hasStatus = card.status && ['released', 'sealed', 'beta', 'alpha'].includes(card.status);

  return (
    <>
      {/* 1. Official */}
      {isFFG && !hasStatus && <span className="mc-badge mc-badge-official">Official</span>}
      {/* 2. Current */}
      {card.pack_environment === 'current' && (
        <span className="dc-tooltip-wrap">
          <span className="mc-badge mc-badge-current">Current</span>
          <span className="dc-tooltip">Current format</span>
        </span>
      )}
      {/* 3. Private */}
      {card.visibility === 'false' && <span className="mc-badge mc-badge-private" title="Private">🔒</span>}
      {/* 4. Creator */}
      {!isFFG && String(creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => <span key={i} className="mc-badge mc-badge-creator" title={`Created by ${c}`}>{c}</span>)}
      {/* 5. Status */}
      {hasStatus && <span className={`mc-badge mc-badge-${card.status}`}>{card.status}</span>}
    </>
  );
}
