import React, { useState, useEffect } from 'react';
import FormattedValue from './FormattedValue';

function useSettings() {
  const [settings, setSettings] = useState({});
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('mc_user')) || {};
      setSettings(u);
    } catch(e) {}
  }, []);
  return settings;
}

export default function CardInfo({ card, showSpoilers, showType = true }) {
  const isEncounter = card.faction_code === 'encounter';
  const spoilerClass = card.spoiler && !showSpoilers && !isEncounter ? 'mc-spoiler' : '';

  return (
    <div className={spoilerClass}>
      {showType && (
        <div className="mc-card-type">
          {card.type_name}
          {card.stage ? `. Stage ${card.stage}.` : ''}
        </div>
      )}

      {card.traits && (
        <div className="mc-card-traits">
          {card.traits}
        </div>
      )}

      <CardProps card={card} />
    </div>
  );
}

function CardProps({ card }) {
  const t = card.type_code;
  let propsElement = null;

  const settings = useSettings();
  const attackFirst = settings.show_legacy_sch_order === 1 || settings.show_legacy_sch_order === true;

  if (['upgrade', 'event', 'support', 'ally'].includes(t)) {
    propsElement = (
      <div className="mc-card-props">
        {t === 'ally' && (
          <div>
            {attackFirst ? (
              <>
                Attack: <FormattedValue value={card.attack} star={card.attack_star} />
                <CostIcons count={card.attack_cost} />.{' '}
                Thwart: <FormattedValue value={card.thwart} star={card.thwart_star} />
                <CostIcons count={card.thwart_cost} />.{' '}
              </>
            ) : (
              <>
                Thwart: <FormattedValue value={card.thwart} star={card.thwart_star} />
                <CostIcons count={card.thwart_cost} />.{' '}
                Attack: <FormattedValue value={card.attack} star={card.attack_star} />
                <CostIcons count={card.attack_cost} />.{' '}
              </>
            )}
            Health: <FormattedValue value={card.health} star={card.health_star} />.
          </div>
        )}
      </div>
    );
  }
  else if (t === 'player_side_scheme') {
    propsElement = (
      <div className="mc-card-props">
        <div>
          Threat: <FormattedValue
            value={card.base_threat}
            perHero={!card.base_threat_fixed && !card.base_threat_per_group}
            perGroup={card.base_threat_per_group}
          />.
        </div>
      </div>
    );
  }
  else if (t === 'hero' || t === 'alter_ego') {
    propsElement = (
      <div className="mc-card-props">
        {t === 'hero' ? (
          <div>
            {attackFirst ? (
              <>
                Attack: <FormattedValue value={card.attack} star={card.attack_star} />.{' '}
                Thwart: <FormattedValue value={card.thwart} star={card.thwart_star} />.{' '}
              </>
            ) : (
              <>
                Thwart: <FormattedValue value={card.thwart} star={card.thwart_star} />.{' '}
                Attack: <FormattedValue value={card.attack} star={card.attack_star} />.{' '}
              </>
            )}
            Defense: <FormattedValue value={card.defense} star={card.defense_star} />.
          </div>
        ) : (
          <div>
            Recover: <FormattedValue value={card.recover} star={card.recover_star} />.
          </div>
        )}
        <div>
          Health: <FormattedValue value={card.health} star={card.health_star} />.{' '}
          Hand Size: <FormattedValue value={card.hand_size} />.
        </div>
      </div>
    );
  }
  else if (['minion', 'villain', 'leader', 'player_minion'].includes(t)) {
    propsElement = (
      <div className="mc-card-props">
        <div>
          {attackFirst ? (
            <>
              Attack: <FormattedValue value={card.attack} star={card.attack_star} />.
              {' '}Scheme: <FormattedValue value={card.scheme} star={card.scheme_star} />.
            </>
          ) : (
            <>
              Scheme: <FormattedValue value={card.scheme} star={card.scheme_star} />.
              {' '}Attack: <FormattedValue value={card.attack} star={card.attack_star} />.
            </>
          )}
          {' '}Health: <FormattedValue value={card.health} star={card.health_star} perHero={card.health_per_hero} perGroup={card.health_per_group} />.
        </div>
      </div>
    );
  }
  else if (t === 'attachment') {
    const hasScheme = (card.scheme !== null && card.scheme !== undefined && card.scheme !== '' && Number(card.scheme) !== 0) || card.scheme_star;
    const hasAttack = (card.attack !== null && card.attack !== undefined && card.attack !== '' && Number(card.attack) !== 0) || card.attack_star;

    if (hasScheme || hasAttack) {
      propsElement = (
        <div className="mc-card-props">
          <div>
            {attackFirst ? (
              <>
                {hasAttack && (
                  <>Attack: {Number(card.attack) > 0 && '+'}<FormattedValue value={card.attack} star={card.attack_star} />.{' '}</>
                )}
                {hasScheme && (
                  <>Scheme: {Number(card.scheme) > 0 && '+'}<FormattedValue value={card.scheme} star={card.scheme_star} />.</>
                )}
              </>
            ) : (
              <>
                {hasScheme && (
                  <>Scheme: {Number(card.scheme) > 0 && '+'}<FormattedValue value={card.scheme} star={card.scheme_star} />.{' '}</>
                )}
                {hasAttack && (
                  <>Attack: {Number(card.attack) > 0 && '+'}<FormattedValue value={card.attack} star={card.attack_star} />.</>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
  }
  else if (t === 'side_scheme') {
    propsElement = (
      <div className="mc-card-props">
        Starting Threat: <FormattedValue
          value={card.base_threat}
          perHero={!card.base_threat_fixed && !card.base_threat_per_group}
          perGroup={card.base_threat_per_group}
        />.
        {card.escalation_threat && (
          <>
            {' '}Escalation Threat: <FormattedValue
              value={card.escalation_threat}
              star={card.escalation_threat_star}
              perHero={!card.escalation_threat_fixed}
            />.
          </>
        )}
      </div>
    );
  }
  else if (t === 'main_scheme' && !card.linked_card) {
    propsElement = (
      <div className="mc-card-props">
        <div>
          Starting Threat: <FormattedValue
            value={card.base_threat}
            perHero={!card.base_threat_fixed && !card.base_threat_per_group}
            perGroup={card.base_threat_per_group}
          />.
          {card.escalation_threat && (
            <>
              {' '}Escalation Threat: <FormattedValue
                value={card.escalation_threat}
                star={card.escalation_threat_star}
                perHero={!card.escalation_threat_fixed}
              />.
            </>
          )}
        </div>
        <div>
          Threat: <FormattedValue
            value={card.threat}
            star={card.threat_star}
            perHero={!card.threat_fixed && !card.threat_per_group}
            perGroup={card.threat_per_group}
          />.
        </div>
      </div>
    );
  }

  return (
    <>
      {propsElement}
      {card.faction_code === 'encounter' ? <BoostSquares card={card} /> : <ResourceIcons card={card} />}
    </>
  );
}

export function BoostSquares({ card }) {
  const boostCount = Math.max(0, parseInt(card.boost ?? 0, 10));
  const hasStar = !!card.boost_star;
  if (boostCount === 0 && !hasStar) return null;
  return (
    <div className="tw-flex tw-items-center tw-gap-1 tw-mt-1">
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Boost:</span>
      <div className="tw-flex tw-flex-wrap tw-gap-1">
        {hasStar && (
          <span className="cl-res-icon cl-res-icon--boost" title="Boost ★">★</span>
        )}
        {Array.from({ length: boostCount }, (_, i) => (
          <span key={i} className="cl-res-icon icon-boost cl-res-icon--boost" title="Boost" />
        ))}
      </div>
    </div>
  );
}

function CostIcons({ count }) {
  if (!count) return null;
  return (
    <span>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} title="Cost" className="icon icon-cost color-cost" />
      ))}
    </span>
  );
}

function ResourceIcons({ card }) {
  const slots = [
    { key: 'energy',   value: card.resource_energy },
    { key: 'physical', value: card.resource_physical },
    { key: 'mental',   value: card.resource_mental },
    { key: 'wild',     value: card.resource_wild },
  ];

  const hasResources = slots.some((r) => r.value);
  if (!hasResources) return null;

  const icons = [];
  for (const { key, value } of slots) {
    for (let i = 0; i < (value || 0); i++) {
      icons.push(
        <span key={`${key}-${i}`} className={`cl-res-icon icon-${key}`} title={key.charAt(0).toUpperCase() + key.slice(1)} />
      );
    }
  }

  return (
    <div className="tw-flex tw-items-center tw-gap-1 tw-mt-1">
      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Resource:</span>
      <div className="cl-resources">{icons}</div>
    </div>
  );
}
