import React from 'react';

export default function CardName({ card, showSpoilers }) {
  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';

  return (
    <div>
      <span className="tw-flex tw-items-center tw-flex-wrap tw-gap-1">
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
            <span className="tw-opacity-70 tw-text-base tw-font-semibold tw-ml-1">
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
  const badges = [];
  const creator = card.creator || card.pack_creator;
  const isFFG = !creator || creator === 'FFG' || creator === '';

  // Status badge
  if (card.status === 'released' || card.status === 'sealed') {
    badges.push(
      <span key="status" className="mc-badge mc-badge-released">{card.status}</span>
    );
  } else if (card.status === 'beta' || card.status === 'alpha') {
    badges.push(
      <span key="status" className={`mc-badge mc-badge-${card.status}`}>{card.status}</span>
    );
  } else if (isFFG) {
    badges.push(
      <span key="official" className="mc-badge mc-badge-official">Official</span>
    );
    if (card.pack_environment === 'current') {
      badges.push(
        <span key="current" className="mc-badge mc-badge-current">Current</span>
      );
    }
  }

  // Creator badge — always shown when creator is not FFG
  if (!isFFG) {
    badges.push(
      <span key="creator" className="mc-badge mc-badge-creator" title={`Created by ${creator}`}>
        {creator}
      </span>
    );
  }

  return <>{badges}</>;
}
