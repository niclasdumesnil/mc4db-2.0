import React from 'react';
import { getBorderClass, getHeaderClass, getFactionColor } from './utils/factionUtils.js';
import ImageWithWebp from './components/ImageWithWebp';
import CardText from './components/CardText';
import CardFlavor from './components/CardFlavor';
import CardName from './components/CardName';
import CardInfo from './components/CardInfo';
import CardIllustrator from './components/CardIllustrator';
import CardPack from './components/CardPack';
import CardPromo from './components/CardPromo';
import { Terminal, FileText, Package, Paintbrush, AlertCircle, Fingerprint } from 'lucide-react';

export default function CardBack({ card, showSpoilers, preferWebpOnly, locale, inline=false }) {
  console.log('[mc4db] CardBack render', card, 'inline=', inline);
  if (!card || (!card.double_sided && !inline)) return null;


  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';
  const borderClass = getBorderClass(card.faction_code);
  const headerClass = getHeaderClass(card.faction_code, card.type_code);

  const dualGradientStyle = card.faction2_code
    ? {
        '--dual-gradient': `linear-gradient(90deg, ${getFactionColor(card.faction_code)}, ${getFactionColor(card.faction2_code)})`,
      }
    : {};

  const headerDualStyle = card.faction2_code
    ? {
        background: `linear-gradient(90deg, ${getFactionColor(card.faction_code)} 0%, ${getFactionColor(card.faction_code)} 40%, ${getFactionColor(card.faction2_code)} 60%, ${getFactionColor(card.faction2_code)} 100%)`,
      }
    : {};

  function readableTextColor(hex) {
    if (!hex) return '#fff';
    const h = hex.replace('#','');
    const normalized = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const bigint = parseInt(normalized,16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luminance > 150 ? '#000' : '#fff';
  }

  const headerStyle = card.faction2_code
    ? { ...headerDualStyle, color: readableTextColor(getFactionColor(card.faction_code)) }
    : { backgroundColor: getFactionColor(card.faction_code), color: readableTextColor(getFactionColor(card.faction_code)) };

  const factionColor = getFactionColor(card.faction_code);
  const headerTextColor = readableTextColor(factionColor);

  const inner = (
    <div className="card-frame__body">
      <div className="card-frame__left">
        <header className="card-frame__title-area">
          <div className="card-frame__title-row">
            <div>
              <h1 className="card-frame__name">
                <CardName card={card} showSpoilers={showSpoilers} />
              </h1>
              <div className="card-frame__type-badge">TYPE: {card.type_name}</div>
            </div>
            {card.cost !== null && !['hero', 'alter_ego'].includes(card.type_code) && (
              <div className="card-frame__cost">
                <span className="card-frame__cost-label">Cost</span>
                <div className="card-frame__cost-value">{card.cost}</div>
              </div>
            )}
          </div>
        </header>

        <div className="card-frame__sections">
          <section>
            <div className="card-frame__section-label">
              <Terminal size={13} />
              <h3>Characteristics</h3>
            </div>
            <div className="card-frame__section-box">
              <CardInfo card={card} showSpoilers={showSpoilers} showType={false} />
            </div>
          </section>

          <section>
            <div className="card-frame__section-label">
              <FileText size={13} />
              <h3>Description</h3>
            </div>
            <div className="card-frame__section-box">
              <CardText card={card} showSpoilers={showSpoilers} />
            </div>
          </section>

          <section>
            {card.illustrator && (
              <>
                <div className="card-frame__section-label">
                  <Paintbrush size={13} />
                  <h3>Artist Reference</h3>
                </div>
                <div className="card-frame__section-box card-frame__section-box--mb">
                  <CardIllustrator card={card} />
                </div>
              </>
            )}
            <div className="card-frame__section-label">
              <Package size={13} />
              <h3>Source Module</h3>
            </div>
            <div className="card-frame__section-box">
              <CardPack card={card} />
            </div>
          </section>

          {card.errata && (
            <div className="card-frame__errata">
              <AlertCircle size={15} />
              <p><strong>ERRATA:</strong> {card.errata}</p>
            </div>
          )}
        </div>
      </div>

      <div className={`card-frame__right ${spoilerClass}`}>
        <div className="card-frame__section-label">
          <Fingerprint size={14} />
          <h3>Visual Reference</h3>
        </div>
        <div className="card-frame__image-wrap">
          {(card.backimagesrc || card.imagesrc) && (
            <ImageWithWebp
              id={`card-image-${card.id}-back`}
              src={card.backimagesrc || card.imagesrc}
              alt={card.name}
              className="tw-w-full tw-h-auto"
              preferWebpOnly={preferWebpOnly}
            />
          )}
        </div>
        <div className="card-frame__promo">
          <CardPromo card={card} locale={locale} />
        </div>
      </div>
    </div>
  );

  // Always return only the inner content; the server provides the outer
  // `.mc-card-panel` wrapper and footer so React must not render them.
  return inner;
}

function CardBackName({ card, showSpoilers }) {
  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';

  return (
    <div>
      {card.is_unique && <span className="icon-unique" />}
      <a
        href={card.url}
        className={`card-name card-tip ${!card.available ? 'card-preview' : ''} ${spoilerClass}`}
        data-code={card.code}
      >
        {card.back_name || card.name}
        {card.stage && (card.type_code === 'villain' || card.type_code === 'leader')
          ? ` (${card.stage})`
          : card.type_code === 'main_scheme'
            ? ` - ${card.stage}`
            : ''}
      </a>
      {card.subname && (
        <div className={`tw-text-sm tw-opacity-80 ${spoilerClass}`}>
          {card.subname}
        </div>
      )}
    </div>
  );
}
