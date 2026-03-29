import React, { useEffect, useState } from 'react';

function currentUserId() {
  try { const u = JSON.parse(localStorage.getItem('mc_user')); return u && (u.id || u.userId); } catch (e) { return null; }
}

/**
 * PackNav — navigation entre les cartes d'un même pack.
 *
 * Props :
 *   card       — objet carte courant (pack_code, pack_name, position, code, name)
 *   onNavigate — callback(code) optionnel : navigation SPA sans rechargement
 *                Si absent, utilise un <a href> classique.
 */
export default function PackNav({ card, locale = 'en', onNavigate }) {
  const [packCards, setPackCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!card?.pack_code) return;
    setLoading(true);
    const userId = currentUserId();
    const params = new URLSearchParams();
    if (locale !== 'en') params.set('locale', locale);
    if (userId) params.set('user_id', userId);
    const query = params.toString() ? `?${params.toString()}` : '';
    fetch(`/api/public/cards/${card.pack_code}${query}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const visible = data.filter(c => !c.hidden);
          const sorted = [...visible].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          setPackCards(sorted);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [card?.pack_code, locale]);

  if (loading || packCards.length === 0) return null;

  const currentIndex = packCards.findIndex(c => c.code === card?.code);
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? packCards[currentIndex - 1] : null;
  const next = currentIndex < packCards.length - 1 ? packCards[currentIndex + 1] : null;
  const packName = card.pack_name || card.pack_code || '';
  const creator = card.pack_creator || '';

  function NavBtn({ target, children, className }) {
    if (!target) return null;
    if (onNavigate) {
      return (
        <button
          className={`pack-nav-btn ${className}`}
          onClick={() => onNavigate(target.code)}
          title={target.name}
        >
          {children}
        </button>
      );
    }
    return (
      <a href={`/card/${target.code}`} className={`pack-nav-btn ${className}`} title={target.name}>
        {children}
      </a>
    );
  }

  return (
    <nav className="pack-nav" aria-label="Pack navigation">
      <div className="pack-nav-prev">
        <NavBtn target={prev} className="pack-nav-btn--prev">
          <span className="pack-nav-arrow">←</span>
          <span className="pack-nav-label">{prev?.name}</span>
        </NavBtn>
      </div>

      <div className="pack-nav-center">
        <div className="pack-nav-title-row">
          <span className="pack-nav-pack-name">{packName}</span>
          {card.visibility === 'false' && <span className="mc-badge mc-badge-private" title="Private">🔒</span>}
        </div>
        <span className="pack-nav-position">{currentIndex + 1} / {packCards.length}</span>
      </div>

      <div className="pack-nav-next">
        <NavBtn target={next} className="pack-nav-btn--next">
          <span className="pack-nav-label">{next?.name}</span>
          <span className="pack-nav-arrow">→</span>
        </NavBtn>
      </div>
    </nav>
  );
}
