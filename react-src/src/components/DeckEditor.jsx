import React, { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import AvailableCardList from './AvailableCardList';
import { getFactionColor } from '@utils/dataUtils';
import '../css/DeckEditor.css';

// Player-card factions — excludes encounter cards
const PLAYER_FACTIONS = new Set(['justice', 'leadership', 'aggression', 'protection', 'basic', 'hero', 'determination']);

const FACTION_LIST = ['justice', 'leadership', 'aggression', 'protection', 'basic', 'determination'];
const FACTION_LABELS = {
  justice: 'Justice', leadership: 'Leadership', aggression: 'Aggression',
  protection: 'Protection', basic: 'Basic', determination: 'Determination',
};
const TYPE_LIST = ['ally', 'event', 'support', 'upgrade', 'resource'];

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
export default forwardRef(function DeckEditor({ deck, deckId, isPrivate, onSlotsChange, onSideSlotsChange, onSaved, onClose, onNameChange }, ref) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deckName, setDeckName] = useState(deck?.name || '');

  // deckState : { main: { cardCode → quantity }, side: { cardCode → quantity } }
  const [deckState, setDeckState] = useState(() => {
    const main = {};
    if (deck?.slots) {
      for (const s of deck.slots) {
        if (s.code) main[s.code] = s.quantity || 0;
      }
    }
    const side = {};
    if (deck?.side_slots) {
      for (const s of deck.side_slots) {
        if (s.code) side[s.code] = s.quantity || 0;
      }
    }
    return { main, side };
  });
  // --- FILTRES --- (Basic par defaut)
  const [selectedFaction, setSelectedFaction] = useState('basic');
  const [selectedType, setSelectedType] = useState(null);
  const [lang, setLang] = useState(
    () => localStorage.getItem('mc_locale') || 'en'
  );
  const [filters, setFilters] = useState({
    showFanMade: true,
    showCurrent: false,
    showAltArt: true,
  });
  const [sortBy, setSortBy] = useState('name');   // 'name' | 'cost'
  const [sortOrder, setSortOrder] = useState('asc');
  const [traitFilter, setTraitFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');

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
    const userId = currentUserId();
    const userParam = userId ? `&user_id=${userId}` : '';
    fetch(`/api/public/cards/?locale=${lang}${userParam}`)
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
    const slots = Object.entries(deckState.main)
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
          resource_energy: card.resource_energy,
          resource_mental: card.resource_mental,
          resource_wild: card.resource_wild,
          imagesrc: card.imagesrc,
          pack_environment: card.pack_environment,
          alt_art: card.alt_art,
        };
      })
      .filter(Boolean);
    onSlotsChange(slots);
  }, [deckState.main, allCards]);

  // --- LIVE PREVIEW : propager les changements de sideMap vers DeckView ---
  useEffect(() => {
    if (!onSideSlotsChange || allCards.length === 0) return;
    const cardMap = Object.fromEntries(allCards.map(c => [c.code, c]));
    const sideSlots = Object.entries(deckState.side)
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
          resource_energy: card.resource_energy,
          resource_mental: card.resource_mental,
          resource_wild: card.resource_wild,
          imagesrc: card.imagesrc,
          pack_environment: card.pack_environment,
          alt_art: card.alt_art,
        };
      })
      .filter(Boolean);
    onSideSlotsChange(sideSlots);
  }, [deckState.side, allCards]);

  // --- variantGroupMap : code → [tous les codes du même groupe (original + alt-arts)] ---
  const variantGroupMap = useMemo(() => {
    const origToAlts = {};
    for (const card of allCards) {
      if (card.alt_art && card.duplicate_of_code) {
        const orig = card.duplicate_of_code;
        if (!origToAlts[orig]) origToAlts[orig] = [];
        origToAlts[orig].push(card.code);
      }
    }
    const groupOf = {};
    for (const card of allCards) {
      if (card.alt_art && card.duplicate_of_code) {
        const orig = card.duplicate_of_code;
        groupOf[card.code] = [orig, ...(origToAlts[orig] || [])];
      } else {
        groupOf[card.code] = [card.code, ...(origToAlts[card.code] || [])];
      }
    }
    return groupOf;
  }, [allCards]);

  // --- SETTER MAIN DECK : enforce sum(tous variants, main+side) <= deckLimit ---
  const setQty = useCallback((cardCode, newQty, deckLimit = 3) => {
    setDeckState(prev => {
      const variants = variantGroupMap[cardCode] || [cardCode];
      const nextMain = { ...prev.main, [cardCode]: newQty };
      // Somme des autres variants dans le main
      const sumOthersMain = variants.filter(v => v !== cardCode).reduce((s, v) => s + (nextMain[v] || 0), 0);
      // Budget restant pour tous les variants du side
      const maxSideTotal = Math.max(0, deckLimit - newQty - sumOthersMain);
      const nextSide = { ...prev.side };
      let remainingSide = maxSideTotal;
      for (const v of variants) {
        const capped = Math.min(nextSide[v] || 0, remainingSide);
        nextSide[v] = capped;
        remainingSide -= capped;
      }
      return { main: nextMain, side: nextSide };
    });
  }, [variantGroupMap]);

  // --- SETTER SIDE DECK : enforce sum(tous variants, main+side) <= deckLimit ---
  const setSideQty = useCallback((cardCode, newQty, deckLimit = 3) => {
    setDeckState(prev => {
      const variants = variantGroupMap[cardCode] || [cardCode];
      const nextSide = { ...prev.side, [cardCode]: newQty };
      // Somme des autres variants dans le side
      const sumOthersSide = variants.filter(v => v !== cardCode).reduce((s, v) => s + (nextSide[v] || 0), 0);
      // Budget restant pour tous les variants du main
      const maxMainTotal = Math.max(0, deckLimit - newQty - sumOthersSide);
      const nextMain = { ...prev.main };
      let remainingMain = maxMainTotal;
      for (const v of variants) {
        const capped = Math.min(nextMain[v] || 0, remainingMain);
        nextMain[v] = capped;
        remainingMain -= capped;
      }
      return { main: nextMain, side: nextSide };
    });
  }, [variantGroupMap]);
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
      // Current: when active, only show cards from the current format
      if (filters.showCurrent && card.pack_environment !== 'current') return false;
      // Traits filter
      if (traitFilter.trim()) {
        const needle = traitFilter.trim().toLowerCase();
        const haystack = (card.traits || '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      // Text filter
      if (textFilter.trim()) {
        const needle = textFilter.trim().toLowerCase();
        const haystack = (card.text || '').toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'cost') {
        const ca = a.cost ?? 999;
        const cb = b.cost ?? 999;
        if (ca !== cb) return sortOrder === 'asc' ? ca - cb : cb - ca;
      }
      // secondary / default: name
      const cmp = (a.name || '').localeCompare(b.name || '');
      return sortOrder === 'asc' || sortBy !== 'name' ? cmp : -cmp;
    });
  }, [allCards, selectedFaction, selectedType, filters, sortBy, sortOrder, traitFilter, textFilter]);

  const handleSort = useCallback((col) => {
    setSortBy(prev => {
      if (prev === col) { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); return prev; }
      setSortOrder('asc');
      return col;
    });
  }, []);

  // --- SAVE ---
  const handleSave = useCallback(async () => {
    const userId = currentUserId();
    if (!userId || !deckId) {
      throw new Error('Cannot save: user not logged in.');
    }
    setSaving(true);
    setSaveError(null);
    try {
      const slots = Object.entries(deckState.main)
        .filter(([, qty]) => qty > 0)
        .map(([code, quantity]) => ({ code, quantity }));

      const sideSlots = Object.entries(deckState.side)
        .filter(([, qty]) => qty > 0)
        .map(([code, quantity]) => ({ code, quantity }));

      const res = await fetch(`/api/public/user/${userId}/decks/${deckId}/slots`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots, sideSlots, name: deckName.trim() || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        onSaved && onSaved(slots);
      } else {
        throw new Error(data.error || 'Error saving deck.');
      }
    } catch (err) {
      setSaving(false);
      throw err;
    }
    setSaving(false);
  }, [deckState, deckName, deckId, onSaved]);

  const handleToggle = key => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

  // --- TRANSFER : déplacer 1 copie entre main et side en 1 clic ---
  const transfer = useCallback((code, direction) => {
    const card = allCards.find(c => c.code === code);
    const deckLimit = card?.is_unique ? 1 : 3;
    setDeckState(prev => {
      if (direction === 'toSide') {
        const srcQty = prev.main[code] || 0;
        if (srcQty <= 0) return prev;
        const variants = variantGroupMap[code] || [code];
        const newMainQty = srcQty - 1;
        const newMainGroupTotal = variants.reduce(
          (s, v) => s + (v === code ? newMainQty : (prev.main[v] || 0)), 0
        );
        const sideGroupTotal = variants.reduce((s, v) => s + (prev.side[v] || 0), 0);
        if (sideGroupTotal + newMainGroupTotal >= deckLimit && sideGroupTotal >= deckLimit - newMainGroupTotal) {
          // side already full given new main
        }
        const maxSide = deckLimit - newMainGroupTotal;
        if (sideGroupTotal >= maxSide) return prev; // side already saturated
        return {
          main: { ...prev.main, [code]: newMainQty },
          side: { ...prev.side, [code]: (prev.side[code] || 0) + 1 },
        };
      } else { // toMain
        const srcQty = prev.side[code] || 0;
        if (srcQty <= 0) return prev;
        const variants = variantGroupMap[code] || [code];
        const newSideQty = srcQty - 1;
        const newSideGroupTotal = variants.reduce(
          (s, v) => s + (v === code ? newSideQty : (prev.side[v] || 0)), 0
        );
        const mainGroupTotal = variants.reduce((s, v) => s + (prev.main[v] || 0), 0);
        const maxMain = deckLimit - newSideGroupTotal;
        if (mainGroupTotal >= maxMain) return prev; // main already saturated
        return {
          main: { ...prev.main, [code]: (prev.main[code] || 0) + 1 },
          side: { ...prev.side, [code]: newSideQty },
        };
      }
    });
  }, [allCards, variantGroupMap]);

  // Expose save() + transfer() to parent (DeckView action bar)
  useImperativeHandle(ref, () => ({ save: handleSave, getSaving: () => saving, transfer }), [handleSave, saving, transfer]);

  return (
    <div className="editor-container">
      {/* ── Main area: filter bar + card list ── */}
      <main className="editor-main">

        {/* ── Deck name ── */}
        <div className="editor-name-row">
          <input
            className="editor-name-input"
            type="text"
            value={deckName}
            onChange={e => {
              setDeckName(e.target.value);
              onNameChange && onNameChange(e.target.value);
            }}
            placeholder="Deck name…"
            maxLength={120}
          />
        </div>

        {/* ── Horizontal filter bar ── */}
        <div className="editor-filter-bar">

          {/* Affinity row */}
          <div className="editor-filter-row">
            <span className="editor-filter-bar-label">Affinity</span>
            <div className="editor-filter-pills">
              {FACTION_LIST.map(fac => {
                const color = getFactionColor(fac);
                const active = selectedFaction === fac;
                return (
                  <button
                    key={fac}
                    className={`editor-faction-btn${active ? ' editor-faction-btn--active' : ''}`}
                    style={{
                      '--fac-color': color,
                      borderColor: active ? color : `${color}55`,
                      background: active ? color : `${color}18`,
                      color: active ? '#fff' : `${color}cc`,
                    }}
                    onClick={() => setSelectedFaction(prev => prev === fac ? null : fac)}
                  >
                    {FACTION_LABELS[fac]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type row */}
          <div className="editor-filter-row">
            <span className="editor-filter-bar-label">Type</span>
            <div className="editor-filter-pills">
              {TYPE_LIST.map(type => {
                const active = selectedType === type;
                return (
                  <button
                    key={type}
                    className={`editor-faction-btn${active ? ' editor-faction-btn--active editor-faction-btn--type-active' : ''}`}
                    onClick={() => setSelectedType(prev => prev === type ? null : type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Traits + Text filter row */}
          <div className="editor-filter-row">
            <span className="editor-filter-bar-label">Traits</span>
            <div className="editor-filter-text-wrap">
              <input
                className="editor-filter-text-input"
                type="text"
                placeholder="Filter by traits…"
                value={traitFilter}
                onChange={e => setTraitFilter(e.target.value)}
              />
              {traitFilter && (
                <button className="editor-filter-text-clear" onClick={() => setTraitFilter('')} title="Clear">
                  ✕
                </button>
              )}
            </div>
            <span className="editor-filter-bar-label editor-filter-bar-label--inline">Text</span>
            <div className="editor-filter-text-wrap">
              <input
                className="editor-filter-text-input"
                type="text"
                placeholder="Filter by card text…"
                value={textFilter}
                onChange={e => setTextFilter(e.target.value)}
              />
              {textFilter && (
                <button className="editor-filter-text-clear" onClick={() => setTextFilter('')} title="Clear">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Options row */}
          <div className="editor-filter-row">
            <span className="editor-filter-bar-label">Show</span>
            <div className="editor-filter-pills">
              <button
                className={`editor-filter-badge editor-filter-badge--fanmade${!filters.showFanMade ? ' editor-filter-badge--off' : ' editor-filter-badge--on'}`}
                onClick={() => handleToggle('showFanMade')}
                title={filters.showFanMade ? 'Hide fan-made cards' : 'Show fan-made cards'}
              >Fan-Made</button>
              <button
                className={`editor-filter-badge editor-filter-badge--altart${filters.showAltArt ? ' editor-filter-badge--on' : ' editor-filter-badge--off'}`}
                onClick={() => handleToggle('showAltArt')}
                title={filters.showAltArt ? 'Hide alt-art' : 'Show alt-art'}
              >🎨 Alt Art</button>
              <button
                className={`editor-filter-badge editor-filter-badge--current${filters.showCurrent ? ' editor-filter-badge--on' : ' editor-filter-badge--off'}`}
                onClick={() => handleToggle('showCurrent')}
                title={filters.showCurrent ? 'Show all cards' : 'Show current format only'}
              >⚡ Current</button>
            </div>
          </div>

        </div>

        {/* ── Card list ── */}
        {loading ? (
          <div className="cardlist-loading">Loading library...</div>
        ) : (
          <AvailableCardList
            cards={filteredCards}
            slotsMap={deckState.main}
            onSetQty={setQty}
            sideMap={deckState.side}
            onSetSideQty={setSideQty}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </main>
    </div>
  );
})
