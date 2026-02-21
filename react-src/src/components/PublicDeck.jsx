import React from 'react';
import { getFactionColor, getFactionFaintColor, DECK_TAGS } from '@utils/dataUtils';

// ── Reputation medal (same logic as Profile.jsx) ─────────────────────────────
const MEDAL_STYLES = {
  bronze: { fill: '#cd7f32', stroke: '#8b4513', label: 'Bronze' },
  silver: { fill: '#c0c0c0', stroke: '#808080', label: 'Silver' },
  gold:   { fill: '#ffd700', stroke: '#b8860b', label: 'Gold'   },
};
function MedalIcon({ fill, stroke, title }) {
  return (
    <svg className="rep-medal" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label={title} title={title}>
      <polygon points="8,2 16,2 19,9 12,7 5,9" fill={stroke} opacity="0.85" />
      <circle cx="12" cy="15" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <polygon points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4" fill={stroke} opacity="0.9" />
    </svg>
  );
}
function RepBadge({ reputation }) {
  const rep = reputation ?? 0;
  const tier = rep >= 1000 ? 'gold' : rep >= 100 ? 'silver' : rep >= 10 ? 'bronze' : null;
  if (!tier) return <span style={{ fontSize: '0.8rem', color: '#8a99af' }}>{rep}</span>;
  const { fill, stroke, label } = MEDAL_STYLES[tier];
  return (
    <span className={`rep-badge rep-badge--${tier}`}>
      <MedalIcon fill={fill} stroke={stroke} title={`${label} — ${rep}`} />
      <span className="rep-score">{rep}</span>
    </span>
  );
}

export default function PublicDeck({ deck }) {
  // Aspect (couleur) depuis meta JSON : {"aspect":"justice"}
  let aspect = 'neutral';
  try {
    const meta = typeof deck.meta === 'string' ? JSON.parse(deck.meta) : deck.meta;
    if (meta && meta.aspect) aspect = meta.aspect;
  } catch (_) {}
  const headerColor = getFactionColor(aspect);
  const headerFaint = getFactionFaintColor(aspect);

  // Image du héros depuis imagesrc de la BDD
  const heroImage = deck.hero_imagesrc || null;

  // Badges pack
  const isFFG = !deck.pack_creator || deck.pack_creator.toUpperCase() === 'FFG';
  const creator = !isFFG ? deck.pack_creator : null;
  // Statut du pack (colonne status, pas environment)
  const statusKey = (deck.pack_status || '').toLowerCase();
  const STATUS_BADGE = { alpha: 'mc-badge-alpha', beta: 'mc-badge-beta', released: 'mc-badge-released', sealed: 'mc-badge-sealed', current: 'mc-badge-current' };
  const statusBadgeClass = STATUS_BADGE[statusKey] || null;

  // Tags utilisateur
  const tags = deck.tags ? deck.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div className="deck-card">
      {/* En-tête : fond sombre card + faint faction en overlay */}
      <div className="deck-header" style={{ backgroundColor: 'white', backgroundImage: `linear-gradient(${headerFaint}, ${headerFaint})` }}>
        <div className="deck-header-content">
          <h3 className="deck-name" style={{ color: '#111' }} title={deck.name}>{deck.name}</h3>
        </div>
        {heroImage && (
          <div className="deck-hero-thumb">
            <img src={heroImage} alt={deck.hero_name} />
          </div>
        )}
      </div>

      {/* Corps */}
      <div className="deck-body">
        <div className="deck-body-left">
          {/* Héros + badges pack + aspect à droite */}
          <div className="deck-hero-row">
            <div className="deck-hero-row-left">
              <span className="deck-hero-badge">{deck.hero_name}</span>
              {isFFG && <span className="mc-badge mc-badge-official">Official</span>}
              {!isFFG && creator && <span className="mc-badge mc-badge-creator">{creator}</span>}
              {statusBadgeClass && <span className={`mc-badge ${statusBadgeClass}`}>{statusKey}</span>}
            </div>
            <div className="deck-hero-stats">
              <span className="stat">♥{deck.likes || 0}</span>
              <span className="stat">★{deck.favorites || 0}</span>
              <span className="stat">💬{deck.comments || 0}</span>
              <span className="stat-version">v{deck.version || '1.0'}</span>
            </div>
          </div>
          {/* Tags sous forme d'icônes + aspect à droite */}
          <div className="deck-tags-row">
            {tags.map((tag, i) => {
              const t = DECK_TAGS[tag.toLowerCase()];
              return t ? (
                <span key={i} className={`deck-tag-icon deck-tag-icon--${tag.toLowerCase()}`} title={t.title}>
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

      {/* Footer auteur + date */}
      <div className="deck-footer">
        <div className="author-info">
          <span className="by">by</span>
          <span className="author-name">{deck.author_name}</span>
          <RepBadge reputation={deck.author_reputation} />
        </div>
        <div className="deck-date">
          {new Date(deck.date_creation).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}