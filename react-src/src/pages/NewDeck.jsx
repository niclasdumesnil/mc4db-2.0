import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '@css/NewDeck.css';

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem('mc_user')) || null;
  } catch (e) { return null; }
}

// Normalize theme to title case so "marvel" and "Marvel" merge
function normalizeTheme(t) {
  if (!t) return t;
  return t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// Determines the category of a hero based on pack creator and visibility
function heroCategory(hero) {
  const creator = hero.pack_creator || '';
  const vis = hero.pack_visibility || 'true';
  if (!creator || creator === 'FFG') return 'official';
  if (vis === 'false') return 'private';
  return 'fanmade';
}

// ------------------------------------------------------------------
// HeroCard
// ------------------------------------------------------------------
function HeroCard({ hero, isOwned, onCreateDeck, creating }) {
  const cat = heroCategory(hero);
  const isOfficial = cat === 'official';
  const isPrivate = cat === 'private';
  const status = (hero.pack_status || '').toLowerCase().replace(/\s+/g, '-');
  const environment = (hero.pack_environment || '').toLowerCase();
  const isCurrent = isOfficial && (environment === 'standard' || environment === 'current');

  return (
    <div className="ndeck-hero-card">
      <div className="ndeck-hero-body">
        <div className={`ndeck-hero-faces${hero.alt_images?.length ? ' ndeck-hero-faces--multi' : ''}`}>
          {hero.imagesrc
            ? <img className="ndeck-face ndeck-face--a" src={hero.imagesrc} alt={hero.name} loading="lazy" />
            : <div className="ndeck-face ndeck-face--a ndeck-face--placeholder">🦸</div>
          }
          {(hero.alt_images || []).map((src, i) => (
            <img
              key={i}
              className={`ndeck-face ndeck-face--${i === 0 ? 'b' : 'c'}`}
              src={src}
              alt={`${hero.name} face ${i + 2}`}
              loading="lazy"
            />
          ))}
        </div>

        {/* Info */}
        <div className="ndeck-hero-info">
          <div className="ndeck-hero-name">{hero.name}</div>

          {/* Badges — order: official, current, private, creator, status */}
          <div className="ndeck-hero-badges">
            {isOfficial && <span className="mc-badge mc-badge-official">Official</span>}
            {isCurrent && <span className="mc-badge mc-badge-current">Current</span>}
            {isPrivate && <span className="mc-badge mc-badge-private" title="Donor exclusive">🔒 Private</span>}
            {!isOfficial && hero.pack_creator && String(hero.pack_creator).split(/[,&]/).map(c => c.trim()).filter(Boolean).map((c, i) => <span key={i} className="mc-badge mc-badge-creator">{c}</span>)}
            {!isOfficial && status && <span className={`mc-badge mc-badge-${status}`}>{hero.pack_status}</span>}
          </div>

          {/* Pack / theme meta */}
          <div className="ndeck-hero-meta">
            <div className="ndeck-hero-meta-row">
              <span className="ndeck-hero-meta-label">Pack:</span>
              <span className="ndeck-hero-meta-value">{hero.pack_name}</span>
            </div>
            <div className="ndeck-hero-meta-row">
              <span className="ndeck-hero-meta-label">Theme:</span>
              <span className="ndeck-hero-meta-value">{hero.pack_theme || 'Marvel'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Create button */}
      <div className="ndeck-hero-footer">
        <button
          className="ndeck-create-btn"
          onClick={() => onCreateDeck(hero)}
          disabled={creating === hero.code}
        >
          {creating === hero.code ? 'Creating…' : `Create ${hero.name} Deck`}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// NewDeck page
// ------------------------------------------------------------------
const TABS = [
  { id: 'official', label: 'Official' },
  { id: 'fanmade', label: 'Fan Made' },
  { id: 'private', label: 'Private' },
];

export default function NewDeck() {
  const user = currentUser();
  const userId = user && (user.id || user.userId);

  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ownedPackIds, setOwnedPackIds] = useState(new Set());
  const [tab, setTab] = useState('official');
  const [scope, setScope] = useState('all'); // 'all' | 'mine'
  const [theme, setTheme] = useState('');    // theme filter for fanmade/private
  const [sort, setSort] = useState('alpha-asc'); // 'alpha-asc'|'alpha-desc'|'date-asc'|'date-desc'
  const [creating, setCreating] = useState(null); // hero code being created

  // Load heroes and user packs in parallel
  useEffect(() => {
    const heroUrl = userId
      ? `/api/public/heroes?user_id=${userId}`
      : '/api/public/heroes';

    const promises = [fetch(heroUrl).then(r => r.json())];

    if (userId) {
      promises.push(
        fetch(`/api/public/user/${userId}`)
          .then(r => r.json())
          .catch(() => null)
      );
    }

    Promise.all(promises)
      .then(([heroData, userData]) => {
        if (heroData.ok) {
          setHeroes(heroData.data);
        } else {
          const errMSG = typeof heroData.error === 'string' ? heroData.error : (heroData.error?.message || heroData.message || 'Failed to load heroes.');
          setError(errMSG);
        }
        if (userData?.ok && userData.user?.owned_packs) {
          const ids = new Set(
            userData.user.owned_packs.split(',').map(Number).filter(Boolean)
          );
          setOwnedPackIds(ids);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load heroes', err);
        setError('Network error, please refresh.');
        setLoading(false);
      });
  }, [userId]);

  // Reset theme filter when switching tabs
  useEffect(() => {
    setTheme('');
  }, [tab]);

  // Collect unique themes for the active tab
  const themes = useMemo(() => {
    const seen = new Map();
    heroes.forEach(h => {
      if (heroCategory(h) === tab && h.pack_theme) {
        const key = normalizeTheme(h.pack_theme);
        if (!seen.has(key)) seen.set(key, key);
      }
    });
    return [...seen.keys()].sort();
  }, [heroes, tab]);

  // Filtered + sorted heroes for current tab
  const visibleHeroes = useMemo(() => {
    const filtered = heroes.filter(h => {
      if (heroCategory(h) !== tab) return false;
      if (scope === 'mine' && !ownedPackIds.has(h.pack_id)) return false;
      if (theme && normalizeTheme(h.pack_theme) !== theme) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === 'alpha-asc')  return a.name.localeCompare(b.name);
      if (sort === 'alpha-desc') return b.name.localeCompare(a.name);
      if (sort === 'date-asc')  return (a.pack_date_release || '').localeCompare(b.pack_date_release || '');
      if (sort === 'date-desc') return (b.pack_date_release || '').localeCompare(a.pack_date_release || '');
      return 0;
    });
  }, [heroes, tab, scope, theme, sort, ownedPackIds]);

  // Create deck
  const handleCreateDeck = useCallback(async (hero) => {
    if (!userId) {
      alert('Please log in to create a deck.');
      return;
    }
    setCreating(hero.code);
    try {
      const res = await fetch(`/api/public/user/${userId}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hero_code: hero.code }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = `/my-decks/${data.data.id}`;
      } else {
        alert(data.error || 'Failed to create deck.');
        setCreating(null);
      }
    } catch (err) {
      console.error('Create deck error', err);
      alert('Network error. Please try again.');
      setCreating(null);
    }
  }, [userId]);

  // Show theme filter only for non-official tabs
  const showThemeFilter = tab !== 'official' && themes.length > 0;

  return (
    <div className="ndeck-page">
      {/* Header */}
      <div className="ndeck-header">
        <div className="ndeck-header-left">
          <h1 className="ndeck-title">New Deck</h1>
          <p className="ndeck-subtitle">Choose a Hero to create your deck</p>
        </div>
        <a href="/my-decks" className="ndeck-back">← Back to my decks</a>
      </div>

      {/* Tabs */}
      <nav className="ndeck-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ndeck-tab${tab === t.id ? ' ndeck-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Filter bar */}
      <div className="ndeck-filters">
        {/* All / My heroes scope toggle */}
        <div className="ndeck-scope-toggle">
          <button
            className={`ndeck-scope-btn${scope === 'all' ? ' ndeck-scope-btn--active' : ''}`}
            onClick={() => setScope('all')}
          >
            All heroes
          </button>
          <button
            className={`ndeck-scope-btn${scope === 'mine' ? ' ndeck-scope-btn--active' : ''}`}
            onClick={() => setScope('mine')}
            disabled={!userId}
            title={!userId ? 'Log in to filter by your collection' : ''}
          >
            Your heroes
          </button>
        </div>

        {/* Theme filter (fan made / private only) */}
        {showThemeFilter && (
          <>
            <span className="ndeck-theme-label">Theme:</span>
            <select
              className="ndeck-theme-select"
              value={theme}
              onChange={e => setTheme(e.target.value)}
            >
              <option value="">All themes</option>
              {themes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </>
        )}

        {/* Sort control */}
        <div className="ndeck-sort">
          <button
            className={`ndeck-sort-btn${sort === 'alpha-asc' ? ' ndeck-sort-btn--active' : ''}`}
            onClick={() => setSort('alpha-asc')} title="A → Z">
            A↓Z
          </button>
          <button
            className={`ndeck-sort-btn${sort === 'alpha-desc' ? ' ndeck-sort-btn--active' : ''}`}
            onClick={() => setSort('alpha-desc')} title="Z → A">
            Z↓A
          </button>
          <button
            className={`ndeck-sort-btn${sort === 'date-asc' ? ' ndeck-sort-btn--active' : ''}`}
            onClick={() => setSort('date-asc')} title="Oldest first">
            📅↑
          </button>
          <button
            className={`ndeck-sort-btn${sort === 'date-desc' ? ' ndeck-sort-btn--active' : ''}`}
            onClick={() => setSort('date-desc')} title="Newest first">
            📅↓
          </button>
        </div>

        {!loading && (
          <span className="ndeck-count">
            {visibleHeroes.length} hero{visibleHeroes.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="ndeck-loading">Loading heroes…</div>
      ) : error ? (
        <div className="ndeck-error">{error}</div>
      ) : visibleHeroes.length === 0 ? (
        <div className="ndeck-empty">
          {scope === 'mine'
            ? 'No heroes found in your collection for this tab. Switch to "All heroes" or add more packs in your collection settings.'
            : 'No heroes available.'}
        </div>
      ) : (
        <>
          <p className="ndeck-section-title">
            {tab === 'official' ? 'Hero' : tab === 'private' ? 'Private Fan Made Hero' : 'Fan Made Hero'}
          </p>
          <div className="ndeck-grid">
            {visibleHeroes.map(hero => (
              <HeroCard
                key={hero.code}
                hero={hero}
                isOwned={ownedPackIds.has(hero.pack_id)}
                onCreateDeck={handleCreateDeck}
                creating={creating}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
