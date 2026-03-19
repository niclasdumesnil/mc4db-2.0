import React from 'react';
import { getFactionColor, getFactionFaintColor, DECK_TAGS } from '@utils/dataUtils';

// ── Reputation medal (shared) ─────────────────────────────
const MEDAL_STYLES = {
  bronze: { fill: '#cd7f32', stroke: '#8b4513', label: 'Bronze' },
  silver: { fill: '#c0c0c0', stroke: '#808080', label: 'Silver' },
  gold: { fill: '#ffd700', stroke: '#b8860b', label: 'Gold' },
};
function MedalIcon({ fill, stroke, title }) {
  return (
    <svg className="rep-medal" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label={title} title={title} style={{ width: '16px', height: '16px' }}>
      <polygon points="8,2 16,2 19,9 12,7 5,9" fill={stroke} opacity="0.85" />
      <circle cx="12" cy="15" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <polygon points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4" fill={stroke} opacity="0.9" />
    </svg>
  );
}
export function RepBadge({ reputation }) {
  const rep = reputation ?? 0;
  const tier = rep >= 1000 ? 'gold' : rep >= 100 ? 'silver' : rep >= 10 ? 'bronze' : null;
  if (!tier) return null;
  const { fill, stroke, label } = MEDAL_STYLES[tier];
  
  const tierStyles = {
    gold: { bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.6)' },
    silver: { bg: 'rgba(192,192,192,0.08)', border: 'rgba(192,192,192,0.6)' },
    bronze: { bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.6)' },
  };
  const ts = tierStyles[tier];

  return (
    <span 
      className={`rep-badge rep-badge--${tier}`} 
      title={`${label} — ${rep}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '26px',
        height: '26px',
        borderRadius: '50%',
        background: ts.bg,
        border: `1px solid ${ts.border}`,
        padding: 0,
        flexShrink: 0,
        marginLeft: '6px'
      }}
    >
      <MedalIcon fill={fill} stroke={stroke} title={`${label} — ${rep}`} />
    </span>
  );
}

export default function DeckCard({
  deck,
  onClick,
  actionButtons,
  footerLeft,
  statsRow
}) {
  let aspect = 'basic';
  try {
    const meta = typeof deck.meta === 'string' ? JSON.parse(deck.meta) : deck.meta;
    if (meta && meta.aspect) aspect = meta.aspect;
  } catch (_) { }
  const headerColor = getFactionColor(aspect);
  const headerFaint = getFactionFaintColor(aspect);

  const heroImage = deck.hero_imagesrc || null;

  const isFFG = !deck.pack_creator || deck.pack_creator.toUpperCase() === 'FFG';
  const creator = !isFFG ? deck.pack_creator : null;
  const statusKey = (deck.pack_status || '').toLowerCase();
  const STATUS_BADGE = { alpha: 'mc-badge-alpha', beta: 'mc-badge-beta', released: 'mc-badge-released', sealed: 'mc-badge-sealed', current: 'mc-badge-current' };
  const statusBadgeClass = STATUS_BADGE[statusKey] || null;

  const tags = deck.tags ? deck.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="deck-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="deck-header" style={{ backgroundColor: 'white', backgroundImage: `linear-gradient(${headerFaint}, ${headerFaint})` }}>
        <div className="deck-header-content">
          <h3 className="deck-name" style={{ color: '#111' }} title={deck.name}>{deck.name}</h3>
        </div>
        {heroImage && (
          <div
            className="card-thumbnail--wide-hero"
            style={{ backgroundImage: `url(${heroImage})` }}
            title={deck.hero_name}
          />
        )}
      </div>

      <div className="deck-body">
        <div className="deck-body-left">
          <div className="deck-hero-row">
            <div className="deck-hero-row-left">
              <span className="deck-hero-badge">{deck.hero_name}</span>
              {isFFG && <span className="mc-badge mc-badge-official">Official</span>}
              {!isFFG && creator && String(creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => <span key={i} className="mc-badge mc-badge-creator">{c}</span>)}
              {statusBadgeClass && <span className={`mc-badge ${statusBadgeClass}`}>{statusKey}</span>}
            </div>
            <div className="deck-hero-stats">
              {statsRow}
              <span className="stat-version">v{deck.version || '1.0'}</span>
            </div>
          </div>
          <div className="deck-tags-row">
            {tags.map((tag, i) => {
              const t = DECK_TAGS[tag.toLowerCase()];
              return t ? (
                <span key={i} className={`deck-tag-icon deck-tag-icon--${tag.toLowerCase()}`} title={t.title} style={{ opacity: 1 }}>
                  {t.icon}
                </span>
              ) : (
                <span key={i} className="deck-tag">{tag}</span>
              );
            })}
            <div className="deck-aspect-row">
              <span className="deck-aspect-dot" style={{ background: headerColor }} />
              <span className="deck-aspect-name">{aspect.charAt(0).toUpperCase() + aspect.slice(1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="deck-footer">
        {footerLeft}
        <div className="deck-footer-right" style={{ display: 'flex', gap: '8px', zIndex: 10, position: 'relative', alignItems: 'center' }}>
          {actionButtons}
        </div>
      </div>
    </div>
  );
}
