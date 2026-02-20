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

export default function CardBack({ card, showSpoilers, preferWebpOnly, locale, inline=false }) {
  console.log('[mc4db] CardBack render', card, 'inline=', inline);
  if (!card || (!card.double_sided && !inline)) return null;


  const spoilerClass = card.spoiler && !showSpoilers ? 'mc-spoiler' : '';
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
    <div className="tw-flex tw-flex-col lg:tw-flex-row">
      <div className="tw-flex-1 tw-p-8 tw-border-r tw-border-slate-800/50">
        <div className="tw-mb-10">
          <div className="tw-flex tw-justify-between tw-items-start">
            <div>
              <h1 className="tw-text-3xl tw-font-black tw-text-white tw-uppercase tw-tracking-tighter">
                <CardName card={card} showSpoilers={showSpoilers} />
              </h1>
              <div className="tw-mt-2 tw-flex tw-items-center tw-gap-3">
                <span className="tw-text-[10px] tw-font-bold tw-px-2 tw-py-0.5 tw-rounded tw-bg-white/5 tw-border tw-border-white/10 tw-text-slate-400">
                  TYPE: {card.type_name}
                </span>
              </div>
            </div>
            {card.cost !== null && (
              <div className="tw-flex tw-flex-col tw-items-end">
                <span className="tw-text-[9px] tw-font-mono tw-text-slate-500 tw-mb-1 uppercase">Cost</span>
                <div className="tw-text-4xl tw-font-black tw-text-white tw-bg-slate-800 tw-w-14 tw-h-14 tw-flex tw-items-center tw-justify-center tw-rounded-lg tw-border-b-4 tw-border-slate-700">
                  {card.cost}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tw-space-y-8">
          <section>
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
              <h3 className="tw-text-[10px] tw-font-mono tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-widest">Characteristics</h3>
            </div>
            <div className="tw-bg-slate-900/30 tw-rounded-lg tw-p-4 tw-border tw-border-slate-800/50">
              <CardInfo card={card} showSpoilers={showSpoilers} showType={false} />
            </div>
          </section>

          <section>
            <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
              <h3 className="tw-text-[10px] tw-font-mono tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-widest">Description</h3>
            </div>
            <div className="tw-bg-slate-900/50 tw-rounded-lg tw-p-4 tw-border tw-border-slate-800">
              <CardText card={card} showSpoilers={showSpoilers} />
            </div>
          </section>

          <section className="tw-flex tw-flex-col tw-gap-2">
            {card.illustrator && (
              <>
                <div className="tw-flex tw-items-center tw-gap-3 tw-mb-2">
                  <span className="tw-text-[10px] tw-font-mono tw-text-slate-500 tw-uppercase tw-tracking-wider">Artist Reference</span>
                </div>
                <div className="tw-p-4 tw-bg-slate-900/50 tw-rounded tw-border tw-border-slate-800 tw-mb-4">
                  <div className="tw-text-sm tw-font-mono tw-font-bold tw-text-slate-300">
                    <CardIllustrator card={card} />
                  </div>
                </div>
              </>
            )}
            <div>
              <div className="tw-text-[10px] tw-font-mono tw-text-slate-500 tw-uppercase tw-tracking-wider tw-mb-2">
                <span>Source Module</span>
              </div>
              <div className="tw-p-4 tw-bg-slate-900/50 tw-rounded tw-mb-4">
                <div className="tw-flex tw-items-center tw-gap-3">
                  <span className="tw-text-[10px] tw-font-mono tw-font-bold tw-text-slate-300">
                    <CardPack card={card} />
                  </span>
                </div>
              </div>
            </div>
          </section>

          {card.errata && (
            <div className="tw-bg-red-500/5 tw-border tw-border-red-500/20 tw-p-4 tw-rounded-lg tw-flex tw-gap-3">
              <p className="tw-text-xs tw-text-red-300/70"><strong>ERRATA:</strong> {card.errata}</p>
            </div>
          )}
        </div>
      </div>
      <div className={`lg:tw-w-[400px] tw-p-8 tw-flex tw-flex-col ${spoilerClass}`}>
        <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
          <div className="tw-text-[10px] tw-font-mono tw-font-bold tw-text-slate-500 tw-uppercase tw-tracking-widest">Visual Reference</div>
        </div>

        <div className="tw-relative tw-mb-8">
          <div className="tw-absolute -tw-inset-2 tw-border tw-border-slate-800 tw-rounded-3xl" />
          <div className="tw-relative tw-rounded-3xl tw-overflow-hidden tw-border tw-border-slate-700 shadow-2xl">
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

          <div className="tw-mt-auto">
            <CardPromo card={card} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );

  // Always return only the inner content; the server provides the outer
  // `.mc-card-panel` wrapper and footer so React must not render them.
  return inner;
}

function CardBackName({ card, showSpoilers }) {
  const spoilerClass = card.spoiler && !showSpoilers ? 'mc-spoiler' : '';

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
