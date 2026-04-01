/**
 * deckValidation.js
 * Deck-building validation utilities for MC4DB 2.0
 *
 * Mirrors the logic in:
 *   - marvelsdb_merlin/.../app.deck.js (can_include_card / get_problem)
 *   - marvelsdb_merlin/.../DeckValidationHelper.php (canIncludeCard)
 */

/** Factions that are NOT aspects (always neutral / exempt from the single-aspect rule) */
const NON_ASPECT_FACTIONS = new Set(['basic', 'hero', 'campaign', 'encounter']);

/**
 * Normalize deck_requirements to always be an array of requirement objects.
 * The field can be either a plain object or an array depending on the data source.
 */
function normalizeDeckReqs(heroCard) {
  const dr = heroCard?.deck_requirements;
  if (!dr) return [];
  return Array.isArray(dr) ? dr : [dr];
}

// ── Team-Up helpers ──────────────────────────────────────────────────────────

/**
 * Extract hero names mentioned in a Team-Up card text.
 * e.g. "Team-Up (She-Hulk and Thor)" → ["She-Hulk", "Thor"]
 */
export function parseTeamUpHeroes(text) {
  if (!text) return [];
  const match = text.match(/(?:team[-\s]?up|en\s*équipe|en\s*equipe)\s*\(([^)]+)\)/i);
  if (!match) return [];
  return match[1]
    .split(/\s+(?:and|et|y)\s+/i)
    .map(h => h.trim())
    .filter(Boolean);
}

/**
 * Returns true if the card text contains a Team-Up declaration.
 */
export function isTeamUpCard(card) {
  const text = card.real_text || card.text || '';
  return /(?:team[-\s]?up|en\s*équipe|en\s*equipe)\s*\(/i.test(text);
}

// ── Linked-card helpers ──────────────────────────────────────────────────────

// Known card type suffixes that may appear inside Linked() to disambiguate cards.
// Longer suffixes first to avoid partial matches (e.g. "player side scheme" before "side scheme").
const LINKED_TYPE_SUFFIXES = [
  // Multi-word types (check first)
  'player side scheme', 'side scheme', 'main scheme', 'alter ego', 'player minion',
  // Single-word English types
  'upgrade', 'ally', 'event', 'support', 'resource', 'minion', 'attachment',
  'obligation', 'treachery', 'villain', 'hero', 'environment', 'leader', 'challenge',
  // French equivalents
  'amélioration', 'allié', 'événement', 'soutien', 'ressource', 'sbire',
  'obligation', 'traîtrise', 'méchant', 'héros', 'environnement',
  'plan annexe', 'plan principal',
];

/**
 * Extract the source card info from a Linked card text.
 * Handles type qualifiers, e.g.:
 *   "Linked (Specialized Training)."      → { name: "Specialized Training", typeHint: null }
 *   "Linked (Captain America upgrade)."   → { name: "Captain America", typeHint: "upgrade" }
 *   "Linked (Absorbing Man minion)."      → { name: "Absorbing Man", typeHint: "minion" }
 *
 * Returns { name, typeHint } or null if not a linked card.
 */
export function parseLinkedSource(text) {
  if (!text) return null;
  const match = text.match(/(?:linked|li[ée]+e)\s*\(([^)]+)\)/i);
  if (!match) return null;
  const raw = match[1].trim();

  // Check if the last word(s) are a known type suffix
  const rawLower = raw.toLowerCase();
  for (const suffix of LINKED_TYPE_SUFFIXES) {
    if (rawLower.endsWith(' ' + suffix)) {
      const name = raw.slice(0, raw.length - suffix.length).trim();
      return { name, typeHint: suffix };
    }
  }
  return { name: raw, typeHint: null };
}

/**
 * Returns true if the card text contains a Linked declaration.
 */
export function isLinkedCard(card) {
  const text = card.real_text || card.text || '';
  return /(?:linked|li[ée]+e)\s*\(/i.test(text);
}

/**
 * Build a map of source card names (lowercased) → array of linked card objects.
 * Handles type-qualified names like "Captain America upgrade" by indexing under
 * the stripped name ("captain america").
 *
 * @param {Array} allCards - Full card list
 * @returns {Map<string, Array<object>>} sourceNameLower → [linkedCard, ...]
 */
export function buildLinkedCardMap(allCards) {
  const map = new Map();
  for (const card of allCards) {
    const parsed = parseLinkedSource(card.real_text || card.text || '');
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(card);
  }
  return map;
}

/**
 * Given the current deck slots and a linked-card map, compute which linked
 * deck sections should be displayed.
 *
 * Returns an array of { name: string, cards: Card[] } — one per source card
 * in the deck that has linked cards.
 *
 * @param {object}    slotsMap      - { cardCode → quantity } for the main deck
 * @param {Array}     allCards      - Full card list (to resolve names)
 * @param {Map}       linkedCardMap - from buildLinkedCardMap
 * @returns {Array<{name: string, cards: object[]}>}
 */
export function getLinkedDeckSections(slotsMap, allCards, linkedCardMap) {
  if (!linkedCardMap || linkedCardMap.size === 0) return [];
  const cardMap = Object.fromEntries(allCards.map(c => [c.code, c]));
  const sections = [];

  for (const [code, qty] of Object.entries(slotsMap || {})) {
    if (!qty) continue;
    const card = cardMap[code];
    if (!card) continue;
    // Use real_name (English) for lookup in the map, but name (translated) for display
    const lookupName = (card.real_name || card.name || '').trim();
    const displayName = (card.name || card.real_name || '').trim();
    if (!lookupName) continue;
    const linked = linkedCardMap.get(lookupName.toLowerCase());
    if (linked && linked.length > 0) {
      sections.push({ name: displayName, cards: linked });
    }
  }
  return sections;
}


// ── Deck-option checking ─────────────────────────────────────────────────────

/**
 * Test a single deck_option object against a card.
 * Returns true if the card satisfies ALL conditions of that option.
 *
 * Note: `not` handling is done at a higher level; this function ignores it.
 */
function checkOption(option, card, deckSlotsMap, allCards, prebuiltCardMap = null) {
  // faction check
  if (option.faction && option.faction.length > 0) {
    const factions = Array.isArray(option.faction) ? option.faction : [option.faction];
    const fc  = (card.faction_code  || '').toLowerCase();
    const fc2 = (card.faction2_code || '').toLowerCase();
    const factionValid = factions.some(f =>
      f === fc || (fc2 && f === fc2)
    );
    if (!factionValid) return false;
  }

  // type check
  if (option.type && option.type.length > 0) {
    const types = Array.isArray(option.type) ? option.type : [option.type];
    if (!types.includes(card.type_code)) return false;
  }

  // trait check – "Avenger." must appear in the card's real_traits
  // Strip any trailing dot from the option value before appending one, so that
  // traits like "S.H.I.E.L.D." (already dot-terminated) don't become "S.H.I.E.L.D.."
  if (option.trait && option.trait.length > 0) {
    const traits = Array.isArray(option.trait) ? option.trait : [option.trait];
    const realTraits = (card.real_traits || card.traits || '').toUpperCase();
    const traitValid = traits.some(t => {
      const normalized = t.replace(/\.$/, '');
      return realTraits.includes(normalized.toUpperCase() + '.');
    });
    if (!traitValid) return false;
  }

  // text regex check
  if (option.text && option.text.length > 0) {
    const texts = Array.isArray(option.text) ? option.text : [option.text];
    const cardText = (card.real_text || card.text || '').toLowerCase();
    const textValid = texts.some(t => {
      try { return new RegExp(t).test(cardText); } catch { return false; }
    });
    if (!textValid) return false;
  }

  // uses check – keyword like "Charge)." appearing in text
  if (option.uses && option.uses.length > 0) {
    const uses = Array.isArray(option.uses) ? option.uses : [option.uses];
    const realText = (card.real_text || card.text || '').toUpperCase();
    const usesValid = uses.some(u =>
      realText.includes(u.toUpperCase() + ').')
    );
    if (!usesValid) return false;
  }

  // level / xp check
  if (option.level) {
    const xp = card.xp ?? 0;
    if (xp < (option.level.min ?? 0) || xp > (option.level.max ?? 999)) return false;
  }

  // cost check (integer means card.cost must be <= option.cost)
  if (option.cost !== undefined && option.cost !== null && typeof option.cost === 'number') {
    const cardCost = card.cost ?? 0;
    if (cardCost > option.cost) return false;
  }

  // resource check – card must have at least one of the listed resource types
  // e.g. option.resource = ["energy"] means card.resource_energy > 0
  if (option.resource && option.resource.length > 0) {
    const resources = Array.isArray(option.resource) ? option.resource : [option.resource];
    const hasResource = resources.some(r => {
      const key = `resource_${r.toLowerCase()}`;
      return card[key] && card[key] > 0;
    });
    if (!hasResource) return false;
  }

  // aspect_limit check: max N distinct non-basic factions in the whole deck
  if (
    option.aspect_limit !== undefined &&
    option.aspect_limit !== null &&
    deckSlotsMap &&
    allCards
  ) {
    const _cm = prebuiltCardMap || Object.fromEntries(allCards.map(c => [c.code, c]));
    const aspects = new Set();
    for (const [code, qty] of Object.entries(deckSlotsMap)) {
      if (!qty) continue;
      const c = _cm[code];
      if (!c) continue;
      const f = (c.faction_code || '').toLowerCase();
      if (f && !NON_ASPECT_FACTIONS.has(f)) aspects.add(f);
    }
    const candidateFac = (card.faction_code || '').toLowerCase();
    if (candidateFac && !NON_ASPECT_FACTIONS.has(candidateFac)) aspects.add(candidateFac);
    if (aspects.size > option.aspect_limit) return false;
  }

  return true;
}
/**
 * Count how many cards in the deck currently satisfy an option's conditions.
 * Hero-set cards are excluded — they are mandatory parts of the deck and do not
 * count against an option.limit (mirrors marvelcdb reference behaviour).
 *
 * When deckAspect is provided and the option has no faction restriction,
 * cards of the deck's own aspect are excluded from the count — the limit
 * applies only to off-aspect cards (e.g. Gamora's attack/thwart events).
 */
function countOptionMatches(option, deckSlotsMap, allCards, heroCard, deckAspect = null, prebuiltCardMap = null) {
  if (!deckSlotsMap || !allCards) return 0;
  const cardMap = prebuiltCardMap || Object.fromEntries(allCards.map(c => [c.code, c]));
  const heroSetCode = heroCard?.card_set_code || null;
  const optNoLimit = { ...option, limit: undefined };
  // Faction-unrestricted options (like Gamora's): limit only counts off-aspect cards
  const limitIsOffAspectOnly = deckAspect && !(option.faction && option.faction.length > 0);
  let count = 0;
  for (const [code, qty] of Object.entries(deckSlotsMap)) {
    if (!qty) continue;
    const c = cardMap[code];
    if (!c) continue;
    // Hero-set cards are always in the deck; they don't count against option limits
    if (heroSetCode && c.card_set_code === heroSetCode) continue;
    // Own-aspect cards don't count against a faction-unrestricted limit
    if (limitIsOffAspectOnly) {
      const cf  = (c.faction_code  || '').toLowerCase();
      const cf2 = (c.faction2_code || '').toLowerCase();
      if (cf === deckAspect || (cf2 && cf2 === deckAspect)) continue;
      // Les cartes basiques (et autres non-aspects) sont toujours autorisées, elles ne comptent pas dans la limite hors-aspect
      if (NON_ASPECT_FACTIONS.has(cf)) continue;
    }
    if (checkOption(optNoLimit, c, deckSlotsMap, allCards, cardMap)) count += qty;
  }
  return count;
}

/**
 * Count how many DISTINCT canonical card names in the deck satisfy an option's conditions.
 * Used to enforce `name_limit` constraints (max N differently-named off-aspect cards).
 */
function countOptionNameMatches(option, deckSlotsMap, allCards, heroCard, deckAspect = null, prebuiltCardMap = null) {
  if (!deckSlotsMap || !allCards) return 0;
  const cardMap = prebuiltCardMap || Object.fromEntries(allCards.map(c => [c.code, c]));
  const heroSetCode = heroCard?.card_set_code || null;
  const optStripped = { ...option, limit: undefined, name_limit: undefined };
  const limitIsOffAspectOnly = deckAspect && !(option.faction && option.faction.length > 0);
  const names = new Set();
  for (const [code, qty] of Object.entries(deckSlotsMap)) {
    if (!qty) continue;
    const c = cardMap[code];
    if (!c) continue;
    if (heroSetCode && c.card_set_code === heroSetCode) continue;
    if (limitIsOffAspectOnly) {
      const cf  = (c.faction_code  || '').toLowerCase();
      const cf2 = (c.faction2_code || '').toLowerCase();
      if (cf === deckAspect || (cf2 && cf2 === deckAspect)) continue;
      // Les cartes basiques (et autres non-aspects) sont toujours autorisées, elles ne comptent pas dans la limite hors-aspect
      if (NON_ASPECT_FACTIONS.has(cf)) continue;
    }
    if (checkOption(optStripped, c, deckSlotsMap, allCards, cardMap)) {
      names.add(c.duplicate_of_code || code);
    }
  }
  return names.size;
}
// ── Main validation function ─────────────────────────────────────────────────

/**
 * Returns true if the given card is allowed in the deck.
 *
 * @param {object}      card         - Card to test (serialised API shape)
 * @param {object|null} heroCard     - Hero/character card for this deck
 *                                     (must have .card_set_code, .name / .real_name,
 *                                      .deck_options, .deck_requirements)
 * @param {string|null} deckAspect  - Currently selected deck aspect (e.g. 'aggression')
 * @param {object}      deckSlotsMap - { cardCode → quantity } for the main deck
 * @param {Array}       allCards     - Full card list (used for aspect_limit calculations)
 */
export function canIncludeCard(
  card,
  heroCard,
  deckAspect,
  deckSlotsMap = {},
  allCards = [],
  prebuiltCardMap = null
) {
  // 1. Always exclude hero-type cards (they live in heroSpecialCards)
  if (card.type_code === 'hero') return false;

  // 1b. Always exclude linked cards (set-aside, shown via their source card)
  if (isLinkedCard(card)) return false;

  // 2. Always exclude encounter cards
  if ((card.faction_code || '').toLowerCase() === 'encounter') return false;

  const heroSetCode = heroCard?.card_set_code || null;
  const cardSetCode = card.card_set_code || null;

  // 3. Cards belonging to the hero's own set are always allowed
  if (heroSetCode && cardSetCode && cardSetCode === heroSetCode) return true;

  // 4. Cards that belong to ANY other hero's special set are always blocked
  if (cardSetCode) return false;

  // 4.5. deck_requirements type_limit / faction_limit – permanent hard filters
  //      e.g. { "type_limit": { "ally": 0 } } → ally cards always blocked
  //           { "faction_limit": { "basic": 0 } } → basic cards always blocked
  const dreqs = normalizeDeckReqs(heroCard);
  if (dreqs.some(r => r.type_limit || r.faction_limit)) {
    // Build cardMap lazily (reuse prebuiltCardMap when available)
    let _dreqMap = null;
    const getDreqMap = () => { if (!_dreqMap) _dreqMap = prebuiltCardMap || Object.fromEntries(allCards.map(c => [c.code, c])); return _dreqMap; };
    for (const req of dreqs) {
      if (req.type_limit) {
        for (const [type, maxAllowed] of Object.entries(req.type_limit)) {
          if ((card.type_code || '').toLowerCase() === type.toLowerCase()) {
            const cm = getDreqMap();
            let currentCount = 0;
            for (const [code, qty] of Object.entries(deckSlotsMap)) {
              if (!qty) continue;
              const c = cm[code];
              if (c && (c.type_code || '').toLowerCase() === type.toLowerCase()) currentCount += qty;
            }
            if (currentCount >= maxAllowed) return false;
          }
        }
      }
      if (req.faction_limit) {
        for (const [faction, maxAllowed] of Object.entries(req.faction_limit)) {
          const cardFc = (card.faction_code || '').toLowerCase();
          if (cardFc === faction.toLowerCase()) {
            const cm = getDreqMap();
            let currentCount = 0;
            for (const [code, qty] of Object.entries(deckSlotsMap)) {
              if (!qty) continue;
              const c = cm[code];
              if (c && (c.faction_code || '').toLowerCase() === faction.toLowerCase()) currentCount += qty;
            }
            if (currentCount >= maxAllowed) return false;
          }
        }
      }
    }
  }

  // 5. Basic faction: allowed, EXCEPT for Team-Up cards (handled by step 6)
  const fc  = (card.faction_code  || '').toLowerCase();
  const fc2 = (card.faction2_code || '').toLowerCase();
  if (fc === 'basic' && !isTeamUpCard(card)) return true;

  // 6. Team-Up check – only allow if the hero is one of the named characters.
  //    Applies to ALL factions (including basic) so that basic Team-Up events
  //    are restricted to decks whose hero is listed in the card text.
  if (isTeamUpCard(card)) {
    const teamHeroes = parseTeamUpHeroes(card.real_text || card.text || '');
    if (teamHeroes.length > 0) {
      if (!heroCard) return false; // can't verify without hero info
      const heroName = (heroCard.real_name || heroCard.name || '').toLowerCase();
      const heroMatches = teamHeroes.some(h => {
        const hl = h.toLowerCase();
        return heroName.includes(hl) || hl.includes(heroName);
      });
      if (!heroMatches) return false;
    }
    // Hero matches (or no heroes listed) → basic team-up card is allowed
    if (fc === 'basic') return true;
  }

  // 7. Deck-options based validation (mirrors app.deck.js can_include_card)
  const deckOptions = heroCard?.deck_options;

  if (deckOptions && deckOptions.length > 0) {

    // First pass: check for a `not` option that explicitly blocks the card
    for (const option of deckOptions) {
      if (!option.not) continue;
      // Build a copy without `not` to test the conditions
      const testOption = { ...option, not: undefined };
      if (checkOption(testOption, card, deckSlotsMap, allCards)) return false;
    }

    // Helper: test option + enforce its limit (if any)
    // countOptionMatches counts all matching cards already IN the deck (including the card
    // being tested). So the comparison must be strictly ">" — at exactly the limit is valid.
    //
    // _cardMap is built lazily (once per canIncludeCard call) only when a limit check is needed.
    let _cardMap = null;
    const getCardMap = () => { if (!_cardMap) _cardMap = prebuiltCardMap || Object.fromEntries(allCards.map(c => [c.code, c])); return _cardMap; };
    const optionAllows = (option) => {
      if (!checkOption(option, card, deckSlotsMap, allCards)) return false;
      if (option.limit !== undefined && option.limit !== null) {
        const used = countOptionMatches(option, deckSlotsMap, allCards, heroCard, deckAspect, getCardMap());
        if (used > option.limit) return false;
      }
      if (option.name_limit !== undefined && option.name_limit !== null) {
        const cm = getCardMap();
        const usedNames = countOptionNameMatches(option, deckSlotsMap, allCards, heroCard, deckAspect, cm);
        const cardCanonical = card.duplicate_of_code || card.code;
        // Adding this card only adds a new distinct name if it's not yet in the deck
        const nameAlreadyInDeck = Object.keys(deckSlotsMap).some(code => {
          if (!deckSlotsMap[code]) return false;
          const c = cm[code];
          return c && (c.duplicate_of_code || c.code) === cardCanonical;
        });
        if (!nameAlreadyInDeck && usedNames >= option.name_limit) return false;
      }
      return true;
    };

    // Second pass: check if any permissive option allows the card
    //   But first apply the aspect gate: if a deckAspect is set,
    //   cards of a different aspect cannot pass the basic faction check here
    //   (the old app allows the aspect-matched card before deck_options)
    if (deckAspect) {
      const aspectMatch = (fc === deckAspect) || (fc2 && fc2 === deckAspect);
      if (aspectMatch) {
        // Card matches the deck's own aspect.
        // Only apply a limit if the option explicitly restricts to a faction
        // (faction-unrestricted limits, like Gamora's attack/thwart rule, are
        // meant for off-aspect cards only — own-aspect cards are always allowed).
        for (const option of deckOptions) {
          if (option.not) continue;
          const hasFactionRestriction = option.faction && option.faction.length > 0;
          if (option.limit !== undefined && hasFactionRestriction
              && checkOption(option, card, deckSlotsMap, allCards)) {
            return optionAllows(option);
          }
        }
        return true;
      }
      // Card does NOT match aspect → check deck_options for special exceptions
      for (const option of deckOptions) {
        if (option.not) continue;
        if (optionAllows(option)) return true;
      }
      return false;
    }

    // No aspect set yet: allow if any non-not option includes this card
    for (const option of deckOptions) {
      if (option.not) continue;
      if (optionAllows(option)) return true;
    }

    // If all options are faction-restricted and none matched, block it
    const allFactionLocked = deckOptions.filter(o => !o.not).every(o => o.faction && o.faction.length > 0);
    if (allFactionLocked) return false;

    // Otherwise (options without faction restriction) allow the card
    return true;
  }

  // 8. No deck_options – fall back to simple aspect rule
  if (deckAspect) {
    const aspectMatch = (fc === deckAspect) || (fc2 && fc2 === deckAspect);
    return aspectMatch;
  }

  // 9. No aspect and no deck_options – allow all player-faction cards
  return !NON_ASPECT_FACTIONS.has(fc) || fc === '';
}

// ── Aggregate helpers ────────────────────────────────────────────────────────

/**
 * Returns true if the card is allowed via a faction-unrestricted deck_option
 * (e.g. Wonder Man's energy event rule). Such cards do NOT count toward the
 * deck's "chosen aspect" — they are special exceptions.
 */
export function isSpecialExceptionCard(card, heroCard) {
  const options = heroCard?.deck_options;
  if (!options || !options.length) return false;
  return options.some(option => {
    if (option.not || (option.faction && option.faction.length > 0)) return false;
    return checkOption(option, card, {}, []);
  });
}

/**
 * Compute which card codes in the deck are currently invalid.
 * Returns a Set<string> of invalid codes.
 */
export function getInvalidCodes(slotsMap, heroCard, allCards, deckAspect) {
  const cardMap = Object.fromEntries((allCards || []).map(c => [c.code, c]));
  const invalid = new Set();

  for (const [code, qty] of Object.entries(slotsMap || {})) {
    if (!qty) continue;
    const card = cardMap[code];
    if (!card) continue;
    if (!canIncludeCard(card, heroCard, deckAspect, slotsMap, allCards, cardMap)) {
      invalid.add(code);
    }
  }
  return invalid;
}

/**
 * Count non-permanent cards in the main deck.
 */
export function getDeckSize(slotsMap, allCards) {
  const cardMap = Object.fromEntries((allCards || []).map(c => [c.code, c]));
  let total = 0;
  for (const [code, qty] of Object.entries(slotsMap || {})) {
    if (!qty) continue;
    const card = cardMap[code];
    if (card?.permanent) continue;
    total += qty;
  }
  return total;
}

/**
 * Return the set of distinct non-neutral aspects used in the deck.
 * Cards that are allowed via faction-unrestricted deck_options (special
 * exceptions, e.g. Wonder Man energy events) are excluded from the count.
 */
export function getDeckAspects(slotsMap, allCards, heroCard = null) {
  const cardMap = Object.fromEntries((allCards || []).map(c => [c.code, c]));
  const aspects = new Set();
  for (const [code, qty] of Object.entries(slotsMap || {})) {
    if (!qty) continue;
    const card = cardMap[code];
    if (!card) continue;
    // Skip cards allowed by a special exception (faction-less deck_option)
    if (heroCard && isSpecialExceptionCard(card, heroCard)) continue;
    const f = (card.faction_code || '').toLowerCase();
    if (f && !NON_ASPECT_FACTIONS.has(f)) aspects.add(f);
  }
  return aspects;
}

/**
 * Detect the dominant aspect from the current deck slots.
 * Returns null if no non-basic cards or multiple aspects.
 */
export function inferDeckAspect(slotsMap, allCards, heroCard = null) {
  const aspects = getDeckAspects(slotsMap, allCards, heroCard);
  if (aspects.size === 1) return [...aspects][0];
  return null;
}

/**
 * Validate the entire deck and return an array of human-readable problem strings.
 * An empty array means the deck is valid.
 */
export function getDeckProblems(slotsMap, heroCard, allCards, deckAspect) {
  const problems = [];
  const cardMap = Object.fromEntries((allCards || []).map(c => [c.code, c]));

  // ── Size ──
  const deckSize = getDeckSize(slotsMap, allCards);
  let minSize = 40;
  let maxSize = 50;

  // Règle spéciale pour Beast (202901a)
  if (heroCard?.code === '202901a') {
    minSize = 45;
  }

  if (deckSize < minSize) problems.push(`Too few cards: ${deckSize}/${minSize} minimum`);
  if (deckSize > maxSize) problems.push(`Too many cards: ${deckSize}/${maxSize} maximum`);

  // ── Option limits (e.g. Gamora: max 6 attack/thwart events) ──
  if (heroCard?.deck_options) {
    for (const option of heroCard.deck_options) {
      if (option.not) continue;
      const parts = [];
      if (option.type)  parts.push(Array.isArray(option.type) ? option.type.join('/') : option.type);
      if (option.trait) parts.push(`[${Array.isArray(option.trait) ? option.trait.join('/') : option.trait}]`);
      if (option.faction) parts.push(Array.isArray(option.faction) ? option.faction.join('/') : option.faction);
      const desc = parts.length ? parts.join(' ') : 'cards';

      // limit: max total quantity of matching off-aspect cards
      if (option.limit !== undefined && option.limit !== null) {
        const used = countOptionMatches(option, slotsMap, allCards, heroCard, deckAspect, cardMap);
        if (used > option.limit) {
          problems.push(`Too many ${desc}: ${used}/${option.limit} allowed`);
        }
      }

      // name_limit: max number of distinct card names among matching off-aspect cards
      if (option.name_limit !== undefined && option.name_limit !== null) {
        const usedNames = countOptionNameMatches(option, slotsMap, allCards, heroCard, deckAspect, cardMap);
        if (usedNames > option.name_limit) {
          problems.push(`Too many distinct ${desc} names: ${usedNames}/${option.name_limit} allowed`);
        }
      }

      // use_deck_limit: each matching off-aspect card must be included at its full deck_limit quantity
      if (option.use_deck_limit) {
        const heroSetCode2 = heroCard?.card_set_code || null;
        const optStripped = { ...option, limit: undefined, name_limit: undefined, use_deck_limit: undefined };
        for (const [code, qty] of Object.entries(slotsMap || {})) {
          if (!qty) continue;
          const c = cardMap[code];
          if (!c) continue;
          if (heroSetCode2 && c.card_set_code === heroSetCode2) continue;
          // Only check own-aspect exclusion for faction-unrestricted options
          if (deckAspect && !(option.faction && option.faction.length > 0)) {
            const cf  = (c.faction_code  || '').toLowerCase();
            const cf2 = (c.faction2_code || '').toLowerCase();
            if (cf === deckAspect || (cf2 && cf2 === deckAspect)) continue;
          }
          if (!checkOption(optStripped, c, slotsMap, allCards, cardMap)) continue;
          const required = c.deck_limit ?? 3;
          if (qty !== required) {
            problems.push(`"${c.name}" must be included at its deck limit (${required} copies)`);
          }
        }
      }
    }
  }

  // ── Deck-limit violations (original + alt-arts combined) ──
  const canonicalQty = {};  // canonicalCode → { total, limit, name }
  for (const [code, qty] of Object.entries(slotsMap || {})) {
    if (!qty) continue;
    const card = cardMap[code];
    if (!card || card.permanent) continue;
    const canonical = card.duplicate_of_code || code;
    const limit = card.deck_limit ?? 3;
    const name = cardMap[canonical]?.name || card.name || canonical;
    if (!canonicalQty[canonical]) canonicalQty[canonical] = { total: 0, limit, name };
    canonicalQty[canonical].total += qty;
  }
  for (const { total, limit, name } of Object.values(canonicalQty)) {
    if (total > limit) {
      problems.push(`Too many copies of "${name}": ${total}/${limit} allowed`);
    }
  }

  // ── Invalid cards ──
  const invalid = getInvalidCodes(slotsMap, heroCard, allCards, deckAspect);
  if (invalid.size > 0) {
    const names = [...invalid]
      .map(code => cardMap[code]?.name || code)
      .slice(0, 5);
    const extra = invalid.size > 5 ? ` +${invalid.size - 5} more` : '';
    problems.push(`Invalid cards: ${names.join(', ')}${extra}`);
  }

  // ── Required cards (deck_requirements.card) ──
  for (const req of normalizeDeckReqs(heroCard)) {
    if (!req.card) continue;
    for (const [, possible] of Object.entries(req.card)) {
      const found = Object.keys(possible).some(code => (slotsMap[code] || 0) > 0);
      if (!found) problems.push('Missing a required card');
    }
  }

  return problems;
}

/**
 * Validate deck_requirements rules that are only checked at save time:
 *   - `limit`   : max copies of any single card
 *   - `aspects` : exact number of aspects + equal card distribution per aspect
 *
 * Returns an array of human-readable problem strings (empty = valid).
 */
export function getSaveProblems(slotsMap, heroCard, allCards) {
  const problems = [];
  const cardMap = Object.fromEntries((allCards || []).map(c => [c.code, c]));

  // Build canonicalQty (same as getDeckProblems)
  const canonicalQty = {};
  for (const [code, qty] of Object.entries(slotsMap || {})) {
    if (!qty) continue;
    const card = cardMap[code];
    if (!card || card.permanent) continue;
    const canonical = card.duplicate_of_code || code;
    const name = cardMap[canonical]?.name || card.name || canonical;
    if (!canonicalQty[canonical]) canonicalQty[canonical] = { total: 0, name };
    canonicalQty[canonical].total += qty;
  }

  for (const req of normalizeDeckReqs(heroCard)) {
    // limit: max copies of any single card
    if (req.limit !== undefined && req.limit !== null) {
      for (const { total, name } of Object.values(canonicalQty)) {
        if (total > req.limit) {
          problems.push(`Too many copies of "${name}": ${total}/${req.limit} allowed`);
        }
      }
    }

    // aspects: must use exactly N aspects with equal card counts
    if (req.aspects !== undefined && req.aspects !== null) {
      const aspectCounts = {};
      for (const [code, qty] of Object.entries(slotsMap || {})) {
        if (!qty) continue;
        const c = cardMap[code];
        if (!c) continue;
        const f = (c.faction_code || '').toLowerCase();
        if (f && !NON_ASPECT_FACTIONS.has(f)) aspectCounts[f] = (aspectCounts[f] || 0) + qty;
      }
      const usedAspects = Object.keys(aspectCounts);
      if (usedAspects.length !== req.aspects) {
        problems.push(`Must use exactly ${req.aspects} aspect(s) (currently ${usedAspects.length})`);
      } else if (req.aspects > 1) {
        const counts = Object.values(aspectCounts);
        if (!counts.every(v => v === counts[0])) {
          problems.push(`Each aspect must have the same number of cards`);
        }
      }
    }
  }

  return problems;
}