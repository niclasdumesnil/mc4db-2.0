import React from 'react';
import FormattedValue from './FormattedValue';

export default function CardInfo({ card, showSpoilers, showType = true }) {
  const spoilerClass = card.spoiler && !showSpoilers ? 'mc-spoiler' : '';

  return (
    <div className={spoilerClass}>
      {showType && (
        <div className="mc-card-type">
          {card.type_name}
          {card.stage ? `. Stage ${card.stage}.` : ''}
        </div>
      )}

      {card.traits && (
        <div className="mc-card-traits" style={{ fontWeight: 700, textTransform: 'uppercase', marginTop: '0.4rem' }}>
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

  if (['upgrade', 'event', 'support', 'ally'].includes(t)) {
    propsElement = (
      <div className="mc-card-props">
        {t === 'ally' && (
          <>
            <div>
              Health: <FormattedValue value={card.health} star={card.health_star} />.
            </div>
            <div>
              Attack: <FormattedValue value={card.attack} star={card.attack_star} />
              <CostIcons count={card.attack_cost} />.{' '}
              Thwart: <FormattedValue value={card.thwart} star={card.thwart_star} />
              <CostIcons count={card.thwart_cost} />.
            </div>
          </>
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
            Thwart: <FormattedValue value={card.thwart} star={card.thwart_star} />.{' '}
            Attack: <FormattedValue value={card.attack} star={card.attack_star} />.{' '}
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
        Attack: <FormattedValue value={card.attack} star={card.attack_star} />.{' '}
        Scheme: <FormattedValue value={card.scheme} star={card.scheme_star} />.{' '}
        Health: <FormattedValue
          value={card.health}
          star={card.health_star}
          perHero={card.health_per_hero}
          perGroup={card.health_per_group}
        />.
      </div>
    );
  }
  else if (t === 'attachment') {
    propsElement = (
      <div className="mc-card-props">
        {(card.attack !== 0 || card.attack_star) && (
          <div>
            Attack: {card.attack > 0 && '+'}<FormattedValue value={card.attack} star={card.attack_star} />
          </div>
        )}
        {(card.scheme !== 0 || card.scheme_star) && (
          <div>
            Scheme: {card.scheme > 0 && '+'}<FormattedValue value={card.scheme} star={card.scheme_star} />
          </div>
        )}
      </div>
    );
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
      <ResourceIcons card={card} />
    </>
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
  const resources = [
    { key: 'mental', value: card.resource_mental, color: '#007bff' },
    { key: 'physical', value: card.resource_physical, color: '#dc3545' },
    { key: 'energy', value: card.resource_energy, color: '#ffc107' },
    { key: 'wild', value: card.resource_wild, color: '#28a745' },
  ];

  const hasResources = resources.some((r) => r.value);
  if (!hasResources) return null;

  return (
    <div className="tw-flex tw-flex-wrap tw-gap-2 tw-mt-1">
      {resources
        .filter((r) => r.value)
        .map((r) => (
          <span
            key={r.key}
            className="mc-resource-bar"
            style={{ borderColor: r.color }}
          >
            <span>Resource:</span>
            {Array.from({ length: r.value }, (_, i) => (
              <span
                key={i}
                title={r.key.charAt(0).toUpperCase() + r.key.slice(1)}
                className={`icon icon-${r.key} color-${r.key}`}
                style={{ margin: '0 2px' }}
              />
            ))}
          </span>
        ))}
    </div>
  );
}
