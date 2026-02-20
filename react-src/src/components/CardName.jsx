import React from 'react';

export default function CardName({ card, showSpoilers }) {
  const spoilerClass = card.spoiler && !showSpoilers ? 'mc-spoiler' : '';

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
            <span className="tw-opacity-70 tw-text-sm tw-ml-1">
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
  if (card.status === 'released' || card.status === 'sealed') {
    return <span className={`mc-tag mc-tag-status-green`}>{card.status}</span>;
  }
  if (card.status === 'beta' || card.status === 'alpha') {
    return <span className={`mc-tag mc-tag-status`}>{card.status}</span>;
  }
  if (!card.creator || card.creator === 'FFG' || card.creator === '') {
    return (
      <>
        <span className="mc-tag mc-tag-ffg">Official</span>
        {card.pack_environment === 'current' && (
          <span className="mc-tag mc-tag-current">current</span>
        )}
      </>
    );
  }
  return <span className="mc-tag mc-tag-creator">{card.creator}</span>;
}
