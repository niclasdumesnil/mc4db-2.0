import React from 'react';

// ── Reputation thresholds ──────────────────────────────────────────────────
const REP_THRESHOLDS = {
  NONE:   0,    // 0–9   : no badge
  BRONZE: 10,   // 10–99 : bronze
  SILVER: 100,  // 100–999 : silver
  GOLD:   1000, // 1000+  : gold
};

// SVG medal — fill colour injected per tier
function MedalIcon({ fill, stroke, title }) {
  return (
    <svg
      className="rep-medal"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={title}
      title={title}
    >
      {/* Ribbon */}
      <polygon points="8,2 16,2 19,9 12,7 5,9" fill={stroke} opacity="0.85" />
      {/* Circle */}
      <circle cx="12" cy="15" r="7" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* Star */}
      <polygon
        points="12,10 13.2,13.4 17,13.4 14.1,15.6 15.3,19 12,16.8 8.7,19 9.9,15.6 7,13.4 10.8,13.4"
        fill={stroke}
        opacity="0.9"
      />
    </svg>
  );
}

const MEDAL_STYLES = {
  bronze: { fill: '#cd7f32', stroke: '#8b4513', label: 'Bronze' },
  silver: { fill: '#c0c0c0', stroke: '#808080', label: 'Silver' },
  gold:   { fill: '#ffd700', stroke: '#b8860b', label: 'Gold'   },
};

function ReputationBadge({ reputation }) {
  const rep = reputation ?? 0;
  let tier = null;
  if      (rep >= REP_THRESHOLDS.GOLD)   tier = 'gold';
  else if (rep >= REP_THRESHOLDS.SILVER) tier = 'silver';
  else if (rep >= REP_THRESHOLDS.BRONZE) tier = 'bronze';

  if (!tier) return null;
  const { fill, stroke, label } = MEDAL_STYLES[tier];
  return (
    <span className={`rep-badge rep-badge--${tier}`}>
      <MedalIcon fill={fill} stroke={stroke} title={`${label} — ${rep} reputation`} />
      <span className="rep-score">{rep}</span>
    </span>
  );
}

export default function Profile({ user }) {
  if (!user) return null;

  return (
    <div className="db-panel">
      <div className="panel-title-row">
        <h3 className="panel-title">Profile</h3>
        {user.donation > 0 && <span className="donation-badge">💎 Supporter</span>}
      </div>

      <div className="profile-header">
        <div className="profile-name-row">
          <h2 className="user-name">{user.username || user.login}</h2>
          <ReputationBadge reputation={user.reputation} />
        </div>
      </div>

      <div className="info-list">
        <div className="info-item">
          <span className="label">Email</span>
          <span className="value">{user.email || '—'}</span>
        </div>
        <div className="info-item">
          <span className="label">Member Since</span>
          <span className="value">
            {user.date_creation ? new Date(user.date_creation).toLocaleDateString('en-US') : '—'}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Published Decks</span>
          <span className="value">{user.published_decks_count ?? 0}</span>
        </div>
        <div className="info-item">
          <span className="label">Private Decks</span>
          <span className="value">{user.private_decks_count ?? 0}</span>
        </div>
        {user.top_private_hero && (
          <div className="info-item">
            <span className="label">Favourite Hero</span>
            <span className="value">
              {user.top_private_hero.name}
              <span className="top-hero-count"> ({user.top_private_hero.count} deck{user.top_private_hero.count > 1 ? 's' : ''})</span>
            </span>
          </div>
        )}
      </div>

      <div className="resume-section">
        <span className="label">Biography</span>
        <div className="resume-content">{user.resume || 'No biography provided.'}</div>
      </div>
    </div>
  );
}