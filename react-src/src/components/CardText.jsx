import React from 'react';
import { getBorderClass } from '../utils/dataUtils.js';

export default function CardText({ card, showSpoilers }) {
  if (!card.text) return null;
  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';
  function formatText(raw) {
    if (!raw) return '';
    let text = raw;
    // Normalize <br> variants to \n so all line-break handling is uniform
    text = text.replace(/<br\s*\/?>/gi, '\n');
    // Bold trigger keywords only when NOT already inside an HTML tag
    text = text.replace(
      /(^|\n)((?:Forced |Hero |Alter-Ego |Villain )?(?:Interrupt|Response|Action|When Revealed|When Defeated|When Completed|Special|Setup|Permanent|Constant|Passive|Triggered|Reaction))(?=[\s:(])/g,
      (match, prefix, keyword, offset, str) => {
        // Skip if keyword is already wrapped in a bold/strong tag
        const before = str.slice(Math.max(0, offset - 5), offset + prefix.length);
        if (/<[bs]>$/i.test(before)) return match;
        return `${prefix}<strong>${keyword}</strong>`;
      }
    );
    text = text.replace(/\[\[([^\]]+)\]\]/g, '<b class="card-traits"><i>$1</i></b>');
    text = text.replace(/\[(\w+)\]/g, '<span title="$1" class="icon icon-$1"></span>');
    text = text.split('\n').map(l => `<p>${l}</p>`).join('');
    return text;
  }

  const html = formatText(card.text || card.real_text || '');

  return (
    <div className={spoilerClass}>
      <div className={`mc-card-text ${getBorderClass(card.faction_code)}`}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <SchemeIcons card={card} />
      </div>
      <BoostIcons card={card} />
    </div>
  );
}

function SchemeIcons({ card }) {
  const icons = [
    { key: 'acceleration', count: card.scheme_acceleration },
    { key: 'amplify', count: card.scheme_amplify },
    { key: 'crisis', count: card.scheme_crisis },
    { key: 'hazard', count: card.scheme_hazard },
  ];

  return (
    <>
      {icons.map(({ key, count }) =>
        count
          ? Array.from({ length: count }, (_, i) => (
              <span key={`${key}-${i}`} name={key.charAt(0).toUpperCase() + key.slice(1)} className={`icon icon-${key}`} />
            ))
          : null
      )}
    </>
  );
}

function BoostIcons({ card }) {
  if (!card.boost_star && (!card.boost || card.boost <= 0)) return null;

  return (
    <div className="mc-boost-row">
      <span>Boost:</span>
      {card.boost_star && <span className="icon icon-star color-boost" />}
      {card.boost > 0 &&
        Array.from({ length: card.boost }, (_, i) => (
          <span key={i} title="Boost" className="icon icon-boost color-boost" />
        ))}
    </div>
  );
}
