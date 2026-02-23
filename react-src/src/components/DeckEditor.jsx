import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AvailableCardList from './AvailableCardList';
import '../css/DeckEditor.css';

// Player-card factions â€” excludes encounter cards
const PLAYER_FACTIONS = new Set(['justice', 'leadership', 'aggression', 'protection', 'basic', 'hero']);

function currentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('mc_user'));
    return u && (u.id || u.userId);
  } catch (e) { return null; }
}

/**
 * DeckEditor
 *
 * Props :
 *   deck          â€” objet deck complet (avec deck.slots)
 *   deckId        â€” id du deck
 *   isPrivate     â€” true si deck privÃ©
 *   onSlotsChange â€” callback(slots) pour prÃ©visualiser en temps rÃ©el
 *   onSaved       â€” callback appelÃ© aprÃ¨s save rÃ©ussi
 *   onClose       â€” callback pour fermer l'Ã©diteur
 */
export default function DeckEditor({ deck, deckId, isPrivate, onSlotsChange, onSaved, onClose }) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // slotsMap : { cardCode â†’ quantity }
  const [slotsMap, setSlotsMap] = useState(() => {
    const map = {};
    if (deck?.slots) {
      for (const s of deck.slots) {
        if (s.code) map[s.code] = s.quantity || 0;
      }
    }
    return map;
  });

  // --- FILTRES --- (Basic par defaut)
  const [selectedFaction, setSelectedFaction] = useState('basic');
  const [selectedType, setSelectedType]       = useState(null);
  const [lang, setLang] = useState(
    () => localStorage.getItem('mc_locale') || 'en'
  );
  const [filters, setFilters] = useState({
    showFanMade: true,
    showCurrent: false,
    showAltArt:  true,
  });

  // Sync with global locale switcher (header badge)
  useEffect(() => {
    function onLocaleChange() {
      setLang(localStorage.getItem('mc_locale') || 'en');
    }
    window.addEventListener('mc_locale_changed', onLocaleChange);
    return () => window.removeEventListener('mc_locale_changed', onLocaleChange);
  }, []);

  // --- CHARGEMENT DES CARTES ---
  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/cards/?locale=${lang}`)
      .then(res => res.json())
      .then(data => {
        const cards = Array.isArray(data) ? data : (data.ok ? data.cards : []);
        setAllCards(cards);
        setLoading(false);
      })
      .catch(err => {
        console.error('Load error', err);
        setLoading(false);
      });
  }, [lang]);

  // --- LIVE PREVIEW : propager les changements de slotsMap vers DeckView ---
  useEffect(() => {
    if (!onSlotsChange || allCards.length === 0) return;
    const cardMap = Object.fromEntries(allCards.map(c => [c.code, c]));
    const slots = Object.entries(slotsMap)
      .filter(([, qty]) => qty > 0)
      .map(([code, quantity]) => {
        const card = cardMap[code];
        if (!card) return null;
        return {
          code,
          name: card.name,
          quantity,
          faction_code: card.faction_code,
          faction_name: card.faction_name,
          type_name: card.type_name,
          type_code: card.type_code,
          permanent: card.permanent || false,
          cost: card.cost,
          resource_physical: card.resource_physical,
          resource_energy:   card.resource_energy,
          resource_mental:   card.resource_mental,
          resource_wild:     card.resource_wild,
        };
      })
      .filter(Boolean);
    onSlotsChange(slots);
  }, [slotsMap, allCards]);

  // --- MAPS pour l'exclusivitÃ© alt-art ---
  const { altOriginalMap, originalAltMap } = useMemo(() => {
    const alt = {};
    const orig = {};
    for (const card of allCards) {
      if (card.alt_art && card.duplicate_of_code) {
        alt[card.code] = card.duplicate_of_code;
        if (!orig[card.duplicate_of_code]) orig[card.duplicate_of_code] = [];
        orig[card.duplicate_of_code].push(card.code);
      }
    }
    return { altOriginalMap: alt, originalAltMap: orig };
  }, [allCards]);

  // --- SETTER DE QUANTITÃ‰ avec exclusivitÃ© alt-art ---
  const setQty = useCallback((cardCode, qty) => {
    setSlotsMap(prev => {
      const next = { ...prev };
      next[cardCode] = qty;
      if (qty > 0) {
        const origCode = altOriginalMap[cardCode];
        if (origCode) next[origCode] = 0;
        const altCodes = originalAltMap[cardCode] || [];
        for (const ac of altCodes) next[ac] = 0;
      }
      return next;
    });
  }, [altOriginalMap, originalAltMap]);

  // --- FILTRAGE (exclut les cartes rencontre) ---
  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      // Exclure les cartes rencontre
      if (!PLAYER_FACTIONS.has(card.faction_code?.toLowerCase())) return false;
      // DÃ©doublonnage : exclure les doublons sauf alt-art si activÃ©
      if (card.duplicate_of_code) {
        if (!(filters.showAltArt && card.alt_art)) return false;
      }
      // AffinitÃ©
      if (selectedFaction && card.faction_code?.toLowerCase() !== selectedFaction) return false;
      // Type
      if (selectedType && card.type_code?.toLowerCase() !== selectedType) return false;
      // Fan Made
      if (!filters.showFanMade && card.creator && card.creator !== 'FFG') return false;
      // Current
      if (!filters.showCurrent && card.pack_environment === 'current') return false;
      return true;
    });
  }, [allCards, selectedFaction, selectedType, filters]);

  // --- SAVE ---
  const handleSave = async () => {
    const userId = currentUserId();
    if (!userId || !deckId) {
      setSaveError('Cannot save: user not logged in.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const slots = Object.entries(slotsMap)
        .filter(([, qty]) => qty > 0)
        .map(([code, quantity]) => ({ code, quantity }));

      const res = await fetch(`/api/public/user/${userId}/decks/${deckId}/slots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const data = await res.json();
      if (data.ok) {
        onSaved && onSaved(slots);
        onClose && onClose();
      } else {
        setSaveError(data.error || 'Error saving deck.');
      }
    } catch (err) {
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = key => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="editor-container">
      <aside className="editor-sidebar">
        <h3 className="sidebar-title">Filters</h3>

        <div className="filter-group">
          <h4>AFFINITY</h4>
          <div className="filter-buttons">
            {['justice', 'leadership', 'aggression', 'protection', 'basic'].map(fac => (
              <button
                key={fac}
                className={`filter-btn ${selectedFaction === fac ? 'active' : ''}`}
                onClick={() => setSelectedFaction(prev => prev === fac ? null : fac)}
              >
                {fac.charAt(0).toUpperCase() + fac.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <h4>TYPE</h4>
          <div className="filter-buttons">
            {['ally', 'event', 'support', 'upgrade', 'resource'].map(type => (
              <button
                key={type}
                className={`filter-btn ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(prev => prev === type ? null : type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group mt-20">
          <h4>OPTIONS</h4>
          <label className="toggle-label">
            <input type="checkbox" checked={filters.showFanMade} onChange={() => handleToggle('showFanMade')} />
            Show Fan Made
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={filters.showCurrent} onChange={() => handleToggle('showCurrent')} />
            Show Current
          </label>
          <label className="toggle-label">
            <input type="checkbox" checked={filters.showAltArt} onChange={() => handleToggle('showAltArt')} />
            Show Alt-Art
          </label>
        </div>

        {/* Save area */}
        <div className="editor-save-area">
          {saveError && <div className="editor-save-error">{saveError}</div>}
          <button className="editor-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {onClose && (
            <button className="editor-cancel-btn" onClick={onClose}>Cancel</button>
          )}
        </div>
      </aside>

      <main className="editor-main">
        {loading ? (
          <div className="cardlist-loading">Loading library...</div>
        ) : (
          <AvailableCardList
            cards={filteredCards}
            slotsMap={slotsMap}
            onSetQty={setQty}
          />
        )}
      </main>
    </div>
  );
}
