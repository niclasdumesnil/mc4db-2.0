/**
 * /api/public/tts routes — Tabletop Simulator integration
 *
 *   GET /api/public/tts/deck/public/:id   → TTS JSON for a public decklist
 *   GET /api/public/tts/deck/private/:id  → TTS JSON for a private (shared) deck
 *   GET /api/public/tts/pack/:code        → TTS JSON for all cards in a pack
 *
 * Query params (all routes):
 *   lang  — image language folder (default: 'fr')
 */
const { Router } = require('express');
const db = require('../config/database');
const { serializeCard } = require('../utils/cardSerializer');
const sharp = require('sharp');
const axios = require('axios');

const router = Router();

// ─── Constants ───────────────────────────────────────────────────────────────

const CARDS_BASE_URL = 'https://mc4db.merlindumesnil.net/bundles/cards';
const BACKS_BASE_URL = 'https://mc4db.merlindumesnil.net/bundles/TTS/cards_back';
const API_BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4000';

/** Card types that are printed landscape and need rotation for TTS vertical decks. */
const LANDSCAPE_TYPES = new Set(['main_scheme', 'side_scheme', 'player_side_scheme']);

// ─── Shared Helpers ──────────────────────────────────────────────────────────

/**
 * Fetch full card details from the DB using the same rich joins as Card.findByCode.
 */
async function fetchCardDetails(code) {
  return db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .leftJoin('card as lt', 'c.linked_id', 'lt.id')
    .leftJoin('card as dup', 'c.duplicate_id', 'dup.id')
    .leftJoin('pack as dup_pack', 'dup.pack_id', 'dup_pack.id')
    .where('c.code', code)
    .select(
      'c.code', 'c.name', 'c.text', 'c.real_text', 'c.quantity',
      'c.permanent', 'c.double_sided', 'c.health',
      'p.code as pack_code',
      't.code as type_code',
      'f.code as faction_code',
      'cs.code as card_set_code',
      'cs.parent_code as card_set_parent_code',
      'cst.code as card_set_type_code',
      'lt.code as back_link',
      'dup.code as duplicate_of_code',
      'dup_pack.code as duplicate_of_pack_code'
    )
    .first();
}

/**
 * Batch-fetch card details for multiple codes — avoids N+1 queries.
 * Returns a Map<code, cardRow>.
 */
async function fetchCardDetailsBatch(codes) {
  if (!codes || codes.length === 0) return new Map();
  const rows = await db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .leftJoin('card as lt', 'c.linked_id', 'lt.id')
    .leftJoin('card as dup', 'c.duplicate_id', 'dup.id')
    .leftJoin('pack as dup_pack', 'dup.pack_id', 'dup_pack.id')
    .whereIn('c.code', codes)
    .select(
       'c.code', 'c.name', 'c.text', 'c.real_text', 'c.quantity',
      'c.permanent', 'c.double_sided', 'c.health',
      'p.code as pack_code',
      't.code as type_code',
      'f.code as faction_code',
      'cs.code as card_set_code',
      'cs.parent_code as card_set_parent_code',
      'cst.code as card_set_type_code',
      'lt.code as back_link',
      'dup.code as duplicate_of_code',
      'dup_pack.code as duplicate_of_pack_code'
    );
  return new Map(rows.map(r => [r.code, r]));
}

/**
 * Batch-fetch localized card names for the given codes.
 * Returns a Map<code, translatedName>.
 * If lang is 'EN', returns an empty map (English names are already in the card rows).
 */
async function fetchNicknameMap(codes, lang) {
  const map = new Map();
  const locale = (lang || 'en').toLowerCase();
  if (locale === 'en' || !codes || codes.length === 0) return map;
  const rows = await db('card_translation')
    .whereIn('code', codes)
    .where('locale', locale)
    .select('code', 'name');
  for (const r of rows) {
    if (r.name) map.set(r.code, r.name);
  }
  return map;
}

/**
 * Determine the BackURL for a card based on the strict priority rules.
 *
 * Priority:
 *   1. Double-sided / Linked  → face image of the back card
 *   2. Villain                → villain_back.webp
 *   3. Permanent Encounter    → encounter_permanent.webp
 *   4. Standard Encounter     → encounter_back.webp
 *   5. Permanent Player       → Setup_player_card.webp
 *   6. Standard Player        → player_back.webp
 */
function resolveBackURL(card, lang) {
  const text = card.text || card.real_text || '';

  // 1. Double-sided / Linked
  if (card.back_link) {
    const directURL = `${CARDS_BASE_URL}/${lang}/${card.pack_code}/${card.back_link}.webp`;
    // Landscape cards (schemes) → back face also needs rotation
    const endpoint = LANDSCAPE_TYPES.has(card.type_code) ? 'rotate-image' : 'card-image';
    return `${API_BASE_URL}/api/public/tts/${endpoint}?url=${encodeURIComponent(directURL)}&lang=${lang}&pack=${card.pack_code}&code=${card.back_link}`;
  }
  // Check if code ends with 'a' and a 'b' variant would be the back
  if (card.code.endsWith('a')) {
    const bCode = card.code.slice(0, -1) + 'b';
    const directURL = `${CARDS_BASE_URL}/${lang}/${card.pack_code}/${bCode}.webp`;
    const endpoint = LANDSCAPE_TYPES.has(card.type_code) ? 'rotate-image' : 'card-image';
    return `${API_BASE_URL}/api/public/tts/${endpoint}?url=${encodeURIComponent(directURL)}&lang=${lang}&pack=${card.pack_code}&code=${bCode}`;
  }

  // 2. Villain
  if (card.type_code === 'villain') {
    return `${BACKS_BASE_URL}/villain_back.webp`;
  }

  // 3. Permanent Encounter (use DB field, not regex)
  if (card.faction_code === 'encounter' && card.permanent) {
    return `${BACKS_BASE_URL}/encounter_permanent.webp`;
  }

  // 4. Standard Encounter
  if (card.faction_code === 'encounter') {
    return `${BACKS_BASE_URL}/encounter_back.webp`;
  }

  // 5. Permanent Player (use DB field)
  if (card.permanent) {
    return `${BACKS_BASE_URL}/setup_player_card.webp`;
  }

  // 6. Standard Player
  return `${BACKS_BASE_URL}/player_back.webp`;
}

/**
 * Build a TTS card object for a single physical card copy.
 *
 * @param {object} card          - DB card row
 * @param {number} deckId        - The unique CustomDeck ID for this face
 * @param {string} lang          - Language folder for images
 * @param {object} [opts]        - Optional params
 * @param {object} [opts.states]       - States map (for multi-form heroes)
 * @param {Map}    [opts.nicknameMap]  - Map<code, translatedName>
 * @param {string} [opts.backURLOverride] - Force a specific BackURL (for identity cards)
 * @returns {object} TTS card object
 */
function buildTTSCard(card, deckId, lang, opts = {}) {
  const { states = null, nicknameMap = null, backURLOverride = null } = opts;

  // FaceURL through the fallback proxy (tries lang, falls back to EN, then original card for duplicates)
  const directFaceURL = `${CARDS_BASE_URL}/${lang}/${card.pack_code}/${card.code}.webp`;
  // If this card is a duplicate, pass the original card info so the proxy can fall back to it
  const dupParams = card.duplicate_of_code
    ? `&dup_code=${card.duplicate_of_code}&dup_pack=${card.duplicate_of_pack_code || card.pack_code}`
    : '';
  let faceURL = `${API_BASE_URL}/api/public/tts/card-image?url=${encodeURIComponent(directFaceURL)}&lang=${lang}&pack=${card.pack_code}&code=${card.code}${dupParams}`;
  const backURL = backURLOverride || resolveBackURL(card, lang);

  // Landscape cards (schemes) → rotate via our endpoint (which itself uses fallback)
  if (LANDSCAPE_TYPES.has(card.type_code)) {
    faceURL = `${API_BASE_URL}/api/public/tts/rotate-image?url=${encodeURIComponent(directFaceURL)}&lang=${lang}&pack=${card.pack_code}&code=${card.code}${dupParams}`;
  }

  // Resolve nickname: prefer translation, fallback to DB name, then code
  const nickname = (nicknameMap && nicknameMap.get(card.code)) || card.name || card.code;

  const obj = {
    Name: 'CardCustom',
    Nickname: nickname,
    CardID: deckId * 100,
    CustomDeck: {
      [String(deckId)]: {
        FaceURL: faceURL,
        BackURL: backURL,
        NumWidth: 1,
        NumHeight: 1,
        BackIsHidden: true,
        UniqueBack: backURL.includes(CARDS_BASE_URL),
      },
    },
    Transform: {
      posX: 0, posY: 0, posZ: 0,
      rotX: 0, rotY: 180, rotZ: 180,
      scaleX: 1, scaleY: 1, scaleZ: 1,
    },
  };

  // Landscape cards: rotated FaceURL + SidewaysCard for correct ALT-zoom
  if (LANDSCAPE_TYPES.has(card.type_code)) {
    obj.SidewaysCard = true;
  }

  if (states && Object.keys(states).length > 0) {
    obj.States = states;
  }

  return obj;
}

/**
 * Build full TTS objects for an array of { code, quantity } entries.
 * Handles:
 *   - Multi-state cards (c, d… variants → States on the base card)
 *   - Skipping lone 'b' variants (used as backs)
 *   - Outputting CardCustom (1 card) vs DeckCustom (>1 card)
 *
 * @param {Array<{code: string, quantity: number}>} slots
 * @param {Map<string, object>} detailsMap - pre-fetched card details
 * @param {number} nextDeckId - starting CustomDeck ID counter
 * @param {string} lang
 * @param {Map}    [nicknameMap] - Map<code, translatedName>
 * @returns {{ ttsObject: object|null, nextDeckId: number }}
 */
function buildTTSPile(slots, detailsMap, nextDeckId, lang, nicknameMap = null) {
  if (!slots || slots.length === 0) return { ttsObject: null, nextDeckId };

  // Collect unique base codes already processed (to skip 'b' backs and attach c/d states)
  const processedBases = new Set();
  const cards = []; // Array of { ttsCard, quantity }

  for (const slot of slots) {
    const code = slot.code;
    const qty = slot.quantity || 1;
    const card = detailsMap.get(code);
    if (!card) continue;

    // Skip 'b' variants — they're used as back faces, unless they have no 'a' counterpart
    if (code.endsWith('b') && !card.type_code) {
      const aCode = code.slice(0, -1) + 'a';
      if (detailsMap.has(aCode)) continue;
    }

    // Get base code for multi-state grouping
    const baseCode = code.replace(/[a-d]$/, '');
    if (processedBases.has(baseCode) && code !== baseCode && /[c-d]$/.test(code)) {
      continue; // Already handled as a state
    }

    // Build states for multi-form cards (c, d variants)
    const states = {};
    let stateIndex = 2;
    for (const suffix of ['c', 'd', 'e']) {
      const varCode = baseCode + suffix;
      // Skip if varCode equals the current code (it IS the base)
      if (varCode === code) continue;
      const varCard = detailsMap.get(varCode);
      if (varCard) {
        const stateId = nextDeckId++;
        states[String(stateIndex)] = buildTTSCard(varCard, stateId, lang, { nicknameMap });
        stateIndex++;
      }
    }

    // Build the main card
    const mainDeckId = nextDeckId++;
    const ttsCard = buildTTSCard(card, mainDeckId, lang, {
      states: Object.keys(states).length > 0 ? states : null,
      nicknameMap,
    });
    cards.push({ ttsCard, quantity: qty });
    processedBases.add(baseCode);
  }

  if (cards.length === 0) return { ttsObject: null, nextDeckId };

  // Expand quantities into physical card list
  const physicalCards = [];
  for (const { ttsCard, quantity } of cards) {
    for (let i = 0; i < quantity; i++) {
      physicalCards.push(ttsCard);
    }
  }

  if (physicalCards.length === 1) {
    // Single card → CardCustom
    return { ttsObject: physicalCards[0], nextDeckId };
  }

  // Multiple cards → DeckCustom
  const deckIDs = [];
  const customDeck = {};
  const containedObjects = [];

  for (const card of physicalCards) {
    const cardID = card.CardID;
    deckIDs.push(cardID);
    Object.assign(customDeck, card.CustomDeck);
    containedObjects.push({
      ...card,
      Name: 'Card',
    });
  }

  const deckObj = {
    Name: 'DeckCustom',
    DeckIDs: deckIDs,
    CustomDeck: customDeck,
    ContainedObjects: containedObjects,
    Transform: {
      posX: 0, posY: 0, posZ: 0,
      rotX: 0, rotY: 180, rotZ: 180,
      scaleX: 1, scaleY: 1, scaleZ: 1,
    },
  };

  return { ttsObject: deckObj, nextDeckId };
}

/**
 * Apply position and rotation to a TTS object.
 */
function applyTransform(ttsObj, pos) {
  if (!ttsObj) return ttsObj;
  const s = pos.scaleXZ ?? 1;
  ttsObj.Transform = {
    posX: pos.posX ?? 0,
    posY: pos.posY ?? 2,
    posZ: pos.posZ ?? 0,
    rotX: 0,
    rotY: pos.rotY ?? 180,
    rotZ: pos.rotZ ?? 180,
    scaleX: s,
    scaleY: 1,
    scaleZ: s,
  };
  return ttsObj;
}

// ─── Nemesis & Special Deck Helper ───────────────────────────────────────────

/**
 * Dynamically find Obligation, Nemesis, and Special (Invocation) deck cards
 * for a hero.
 *
 * Strategy:
 *   1. Resolve the hero's card_set_code from the DB.
 *   2. Fetch Obligation cards from the hero's OWN card set (type = 'obligation').
 *   3. Fetch Nemesis set cards from child Cardsets:
 *      a) First try: parent_code = heroSetCode AND cardset_type = 'nemesis'
 *      b) Fallback:  Cardset.code = heroSetCode + '_nemesis'
 *   4. Fetch Special deck cards from child Cardsets (type = 'hero_special').
 *
 * Returns { nemesisSlots: [{code, quantity}], specialSlots: [{code, quantity}] }
 *   nemesisSlots includes BOTH Obligation and Nemesis cards.
 */
async function fetchNemesisAndSpecialSets(heroCode) {
  if (!heroCode) return { nemesisSlots: [], specialSlots: [] };

  // Get the hero card's set code
  const heroCard = await db('card as c')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .where('c.code', heroCode)
    .select('cs.code as card_set_code', 'cs.id as card_set_id')
    .first();

  if (!heroCard || !heroCard.card_set_code) {
    return { nemesisSlots: [], specialSlots: [] };
  }
  const heroSetCode = heroCard.card_set_code;

  // ── 1. Obligation cards: in the hero's own card set, type = 'obligation' ──
  const obligationRows = await db('card as c')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .where('c.set_id', heroCard.card_set_id)
    .where('t.code', 'obligation')
    .orderBy('c.position', 'asc')
    .select('c.code', 'c.quantity');

  // ── 2. Nemesis cards: child Cardset with cardset_type = 'nemesis' ──────────
  let nemesisRows = await db('card as c')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .where('cs.parent_code', heroSetCode)
    .where('cst.code', 'nemesis')
    .orderBy('c.position', 'asc')
    .select('c.code', 'c.quantity');

  // Fallback: try the naming convention heroSetCode + '_nemesis'
  if (nemesisRows.length === 0) {
    const nemesisSetCode = heroSetCode + '_nemesis';
    nemesisRows = await db('card as c')
      .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
      .where('cs.code', nemesisSetCode)
      .orderBy('c.position', 'asc')
      .select('c.code', 'c.quantity');
  }

  // ── 3. Special deck cards: child Cardset with cardset_type = 'hero_special'
  //       Grouped by card_set_code so each special deck is its own pile.
  const specialRows = await db('card as c')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .where('cs.parent_code', heroSetCode)
    .where('cst.code', 'hero_special')
    .orderBy('cs.code', 'asc')
    .orderBy('c.position', 'asc')
    .select('c.code', 'c.quantity', 'cs.code as card_set_code', 'cs.name as card_set_name');

  // Merge obligation + nemesis into a single pile
  const allNemesis = [
    ...obligationRows.map(r => ({ code: r.code, quantity: r.quantity || 1 })),
    ...nemesisRows.map(r => ({ code: r.code, quantity: r.quantity || 1 })),
  ];

  // Group specials by set code
  const specialSlotsMap = {};
  for (const r of specialRows) {
    const key = r.card_set_code || 'special';
    if (!specialSlotsMap[key]) {
      specialSlotsMap[key] = { name: r.card_set_name || key, slots: [] };
    }
    specialSlotsMap[key].slots.push({ code: r.code, quantity: r.quantity || 1 });
  }

  return {
    nemesisSlots: allNemesis,
    specialSlotsMap,
  };
}

// ─── Linked Cards Helper ─────────────────────────────────────────────────

/**
 * Find all "Linked" cards for the deck's card codes.
 *
 * Cards that contain "Linked (CardName)" in their real_text where CardName
 * matches a card in the deck are automatically included (e.g., Captain America's
 * Shield linked to Captain America, Lady Sif linked to Thor, etc.).
 *
 * Returns a map: { sourceName: { slots: [{code, quantity}] } }
 */
async function fetchLinkedCardSlots(slotCardCodes) {
  if (!slotCardCodes || slotCardCodes.length === 0) return {};

  // 1. Resolve names of the cards in the deck
  const deckCards = await db('card')
    .whereIn('code', slotCardCodes)
    .select('code', 'name');
  if (deckCards.length === 0) return {};

  const deckNameSet = new Set(deckCards.map(c => c.name.toLowerCase()));

  // 2. Find all cards whose text matches the Linked pattern
  const linkedRows = await db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .where(function () {
      this.where('c.real_text', 'like', 'Linked (%')
        .orWhere('c.real_text', 'like', 'Liée (%')
        .orWhere('c.real_text', 'like', 'Liee (%');
    })
    .select('c.code', 'c.name', 'c.real_text', 'c.quantity',
      'p.code as pack_code', 't.code as type_code', 'f.code as faction_code');

  if (linkedRows.length === 0) return {};

  // 3. Parse the source name, stripping type suffixes
  const linkedRegex = /(?:linked|li[ée]+e)\s*\(([^)]+)\)/i;
  const TYPE_SUFFIXES = [
    'player side scheme', 'side scheme', 'main scheme', 'alter ego', 'player minion',
    'upgrade', 'ally', 'event', 'support', 'resource', 'minion', 'attachment',
    'obligation', 'treachery', 'villain', 'hero', 'environment', 'leader', 'challenge',
    'amélioration', 'allié', 'événement', 'soutien', 'ressource', 'sbire',
    'obligation', 'traîtrise', 'méchant', 'héros', 'environnement',
    'plan annexe', 'plan principal',
  ];

  const groupMap = {}; // sourceName -> [{code, quantity}]

  for (const row of linkedRows) {
    const match = (row.real_text || '').match(linkedRegex);
    if (!match) continue;
    const rawSource = match[1].trim();
    const rawLower = rawSource.toLowerCase();

    // Strip known type suffix
    let strippedName = rawSource;
    for (const suffix of TYPE_SUFFIXES) {
      if (rawLower.endsWith(' ' + suffix)) {
        strippedName = rawSource.slice(0, rawSource.length - suffix.length).trim();
        break;
      }
    }

    if (!deckNameSet.has(strippedName.toLowerCase())) continue;

    // Use the deck card name as group key
    const deckCard = deckCards.find(c => c.name.toLowerCase() === strippedName.toLowerCase());
    const groupKey = deckCard ? deckCard.name : strippedName;

    if (!groupMap[groupKey]) groupMap[groupKey] = { slots: [] };
    groupMap[groupKey].slots.push({ code: row.code, quantity: row.quantity || 1 });
  }

  return groupMap;
}

// ─── Hero Identity Card Builder ──────────────────────────────────────────────

/**
 * Build a single double-sided identity card from the hero_code.
 *
 * The hero_code (typically ending in 'b') is the FACE. Its linked
 * alter-ego side (typically 'a') is the BACK. If c/d variants exist,
 * they become TTS States on this card.
 *
 * Returns { ttsObject, nextDeckId, identityCodes }
 *   - identityCodes: Set of all codes belonging to the identity card
 *     (to be excluded from the main deck slots).
 */
async function buildHeroIdentityCard(heroCode, detailsMap, nextDeckId, lang, nicknameMap) {
  if (!heroCode) return { ttsObject: null, nextDeckId, identityCodes: new Set() };

  const heroCard = detailsMap.get(heroCode);
  if (!heroCard) return { ttsObject: null, nextDeckId, identityCodes: new Set() };

  const baseCode = heroCode.replace(/[a-d]$/, '');
  const identityCodes = new Set();

  // Collect ALL hero/alter_ego variant codes for this identity
  for (const [code, card] of detailsMap) {
    if (code.startsWith(baseCode) && (card.type_code === 'hero' || card.type_code === 'alter_ego')) {
      identityCodes.add(code);
    }
  }

  // Determine the back side (alter-ego) — routed through proxy for FR→EN fallback
  const backCode = heroCard.back_link || (heroCode.endsWith('b') ? baseCode + 'a' : null);
  let backURL;
  if (backCode) {
    const directURL = `${CARDS_BASE_URL}/${lang}/${heroCard.pack_code}/${backCode}.webp`;
    backURL = `${API_BASE_URL}/api/public/tts/card-image?url=${encodeURIComponent(directURL)}&lang=${lang}&pack=${heroCard.pack_code}&code=${backCode}`;
  } else {
    backURL = resolveBackURL(heroCard, lang);
  }

  // Build States for additional forms (c, d, e)
  const states = {};
  let stateIndex = 2;
  for (const suffix of ['c', 'd', 'e']) {
    const varCode = baseCode + suffix;
    if (varCode === heroCode) continue;
    const varCard = detailsMap.get(varCode);
    if (varCard && (varCard.type_code === 'hero' || varCard.type_code === 'alter_ego')) {
      const stateId = nextDeckId++;
      states[String(stateIndex)] = buildTTSCard(varCard, stateId, lang, { nicknameMap });
      stateIndex++;
    }
  }

  const mainDeckId = nextDeckId++;
  const ttsObject = buildTTSCard(heroCard, mainDeckId, lang, {
    states: Object.keys(states).length > 0 ? states : null,
    nicknameMap,
    backURLOverride: backURL,
  });

  // Add health to the hero card Description for TTS Lua access
  if (heroCard.health) {
    ttsObject.Description = String(heroCard.health);
  }

  return { ttsObject, nextDeckId, identityCodes };
}

// ─── ROUTE 1: Public Deck → TTS ─────────────────────────────────────────────

router.get('/tts/deck/public/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lang = (req.query.lang || 'fr').toUpperCase();

    // 1. Fetch the public decklist
    const deck = await db('decklist as d')
      .join('card as c', 'd.card_id', 'c.id')
      .where('d.id', id)
      .select('d.id', 'd.name', 'c.code as hero_code')
      .first();

    if (!deck) return res.status(404).json({ error: 'Decklist not found' });

    // 2. Fetch slots
    const mainSlots = await db('decklistslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .where('s.decklist_id', id)
      .select('c.code', 's.quantity');

    const sideSlots = await db('sidedecklistslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .where('s.decklist_id', id)
      .select('c.code', 's.quantity');

    // 3. Build the TTS response
    const result = await buildDeckTTSResponse(deck, mainSlots, sideSlots, lang);
    res.json(result);
  } catch (err) {
    console.error('GET /tts/deck/public/:id error:', err);
    next(err);
  }
});

// ─── ROUTE 2: Private (Shared) Deck → TTS ───────────────────────────────────

router.get('/tts/deck/private/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lang = (req.query.lang || 'fr').toUpperCase();

    // Fetch private deck (only if user shares decks)
    const deck = await db('deck as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.character_id', 'c.id')
      .where('d.id', id)
      .select('d.id', 'd.name', 'c.code as hero_code', 'u.is_share_decks')
      .first();

    if (!deck || !deck.is_share_decks) {
      return res.status(403).json({ error: 'Access denied to this deck.' });
    }

    // Fetch slots
    const mainSlots = await db('deckslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .where('s.deck_id', id)
      .select('c.code', 's.quantity');

    const sideSlots = await db('sidedeckslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .where('s.deck_id', id)
      .select('c.code', 's.quantity');

    // Build the TTS response
    const result = await buildDeckTTSResponse(deck, mainSlots, sideSlots, lang);
    res.json(result);
  } catch (err) {
    console.error('GET /tts/deck/private/:id error:', err);
    next(err);
  }
});

/**
 * Shared logic for building TTS JSON from a deck's data.
 */
async function buildDeckTTSResponse(deck, mainSlots, sideSlots, lang) {
  const permanentSetupRegex = /permanent|setup/i;
  let nextDeckId = 1;

  // 1. Fetch nemesis & special decks
  const { nemesisSlots, specialSlotsMap } = await fetchNemesisAndSpecialSets(deck.hero_code);

  // 1b. Fetch linked cards for the deck
  const allSlotCodes = [...mainSlots.map(s => s.code), ...sideSlots.map(s => s.code)];
  const linkedGroupMap = await fetchLinkedCardSlots(allSlotCodes);

  // 2. Collect ALL codes for batch fetching (including hero variants)
  const heroBase = deck.hero_code.replace(/[a-d]$/, '');
  const allCodes = new Set();
  // Add hero variants
  for (const suffix of ['a', 'b', 'c', 'd', 'e']) allCodes.add(heroBase + suffix);
  allCodes.add(deck.hero_code);
  for (const s of mainSlots) allCodes.add(s.code);
  for (const s of sideSlots) allCodes.add(s.code);
  for (const s of nemesisSlots) allCodes.add(s.code);
  for (const group of Object.values(specialSlotsMap)) {
    for (const s of group.slots) allCodes.add(s.code);
  }
  for (const group of Object.values(linkedGroupMap)) {
    for (const s of group.slots) allCodes.add(s.code);
  }

  // Also add potential multi-state variants for non-hero cards
  for (const code of [...allCodes]) {
    const base = code.replace(/[a-d]$/, '');
    for (const suffix of ['a', 'b', 'c', 'd', 'e']) {
      allCodes.add(base + suffix);
    }
  }

  const detailsMap = await fetchCardDetailsBatch([...allCodes]);

  // 3. Fetch localized nicknames
  const nicknameMap = await fetchNicknameMap([...allCodes], lang);

  // 4. Build the hero identity card (single double-sided card)
  const heroResult = await buildHeroIdentityCard(deck.hero_code, detailsMap, nextDeckId, lang, nicknameMap);
  nextDeckId = heroResult.nextDeckId;
  const identityCodes = heroResult.identityCodes; // codes to exclude from slots

  // 5. Filter slots: remove any hero/alter-ego identity codes from deck slots
  const filteredMainSlots = mainSlots.filter(s => !identityCodes.has(s.code));
  const filteredSideSlots = sideSlots.filter(s => !identityCodes.has(s.code));

  // 6. Separate main deck into permanent vs non-permanent
  const permanentCodes = [];
  const nonPermanentCodes = [];

  for (const slot of filteredMainSlots) {
    const card = detailsMap.get(slot.code);
    if (!card) {
      nonPermanentCodes.push(slot);
      continue;
    }
    const text = card.text || card.real_text || '';
    if (permanentSetupRegex.test(text)) {
      permanentCodes.push(slot);
    } else {
      nonPermanentCodes.push(slot);
    }
  }

  // 7. Build each pile
  const result = {};

  // Hero identity card
  if (heroResult.ttsObject) {
    result.hero = applyTransform(heroResult.ttsObject, { posX: 0, posY: 2, posZ: 0, rotY: 180, rotZ: 180, scaleXZ: 1.65 });
  }

  // Main deck (non-permanents)
  const mainResult = buildTTSPile(nonPermanentCodes, detailsMap, nextDeckId, lang, nicknameMap);
  nextDeckId = mainResult.nextDeckId;
  if (mainResult.ttsObject) {
    result.mainDeck = applyTransform(mainResult.ttsObject, { posX: 0, posY: 2, posZ: -3, rotY: 180, rotZ: 180 });
  }

  // Permanents
  const permResult = buildTTSPile(permanentCodes, detailsMap, nextDeckId, lang, nicknameMap);
  nextDeckId = permResult.nextDeckId;
  if (permResult.ttsObject) {
    result.permanents = applyTransform(permResult.ttsObject, { posX: 0, posY: 2, posZ: 3, rotY: 180, rotZ: 180 });
  }

  // Side deck
  if (filteredSideSlots.length > 0) {
    const sideResult = buildTTSPile(filteredSideSlots, detailsMap, nextDeckId, lang, nicknameMap);
    nextDeckId = sideResult.nextDeckId;
    if (sideResult.ttsObject) {
      result.sideDeck = applyTransform(sideResult.ttsObject, { posX: -3, posY: 2, posZ: -3, rotY: 180, rotZ: 180, scaleXZ: 1.0 });
    }
  }

  // Nemesis
  if (nemesisSlots.length > 0) {
    const nemResult = buildTTSPile(nemesisSlots, detailsMap, nextDeckId, lang, nicknameMap);
    nextDeckId = nemResult.nextDeckId;
    if (nemResult.ttsObject) {
      result.nemesis = applyTransform(nemResult.ttsObject, { posX: 3, posY: 2, posZ: 3, rotY: 180, rotZ: 180, scaleXZ: 1.88 });
    }
  }

  // Special decks — each set gets its own pile (Gift Deck, Labor Deck, New Recruits, etc.)
  const specialSetKeys = Object.keys(specialSlotsMap);
  if (specialSetKeys.length > 0) {
    result.specialDecks = {};
    let specPosZ = 0;
    for (const setCode of specialSetKeys) {
      const { name, slots } = specialSlotsMap[setCode];
      const specResult = buildTTSPile(slots, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = specResult.nextDeckId;
      if (specResult.ttsObject) {
        // Tag the pile with the deck name for identification
        specResult.ttsObject.Nickname = name;
        result.specialDecks[setCode] = applyTransform(specResult.ttsObject, { posX: 6, posY: 2, posZ: specPosZ });
        specPosZ -= 3;
      }
    }
  }

  // Linked cards — each source card gets its own pile
  const linkedKeys = Object.keys(linkedGroupMap);
  if (linkedKeys.length > 0) {
    result.linkedDecks = {};
    let linkedPosZ = 0;
    for (const sourceName of linkedKeys) {
      const { slots } = linkedGroupMap[sourceName];
      // Fetch details for linked codes that may not be in detailsMap yet
      for (const s of slots) {
        if (!detailsMap.has(s.code)) {
          const extra = await fetchCardDetailsBatch([s.code]);
          for (const [k, v] of extra) detailsMap.set(k, v);
        }
      }
      const linkedResult = buildTTSPile(slots, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = linkedResult.nextDeckId;
      if (linkedResult.ttsObject) {
        linkedResult.ttsObject.Nickname = sourceName;
        result.linkedDecks[sourceName] = applyTransform(linkedResult.ttsObject, { posX: -6, posY: 2, posZ: linkedPosZ });
        linkedPosZ -= 3;
      }
    }
  }

  return {
    deckName: deck.name,
    deckId: deck.id,
    piles: result,
  };
}

// ─── ROUTE 3: Pack → TTS ────────────────────────────────────────────────────

router.get('/tts/pack/:code', async (req, res, next) => {
  try {
    const packCode = req.params.code;
    const lang = (req.query.lang || 'fr').toUpperCase();

    // Fetch all cards in the pack
    const rows = await db('card as c')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .leftJoin('type as t', 'c.type_id', 't.id')
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
      .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
      .leftJoin('card as lt', 'c.linked_id', 'lt.id')
      .leftJoin('card as dup', 'c.duplicate_id', 'dup.id')
      .leftJoin('pack as dup_pack', 'dup.pack_id', 'dup_pack.id')
      .where('p.code', packCode)
      .orderBy('c.position', 'asc')
      .select(
        'c.code', 'c.name', 'c.text', 'c.real_text', 'c.quantity',
        'c.permanent', 'c.double_sided', 'c.health',
        'p.code as pack_code',
        't.code as type_code',
        'f.code as faction_code',
        'cs.code as card_set_code',
        'cs.parent_code as card_set_parent_code',
        'cst.code as card_set_type_code',
        'lt.code as back_link',
        'dup.code as duplicate_of_code',
        'dup_pack.code as duplicate_of_pack_code'
      );

    if (rows.length === 0) {
      return res.status(404).json({ error: `No cards found for pack ${packCode}` });
    }

    // Build detailsMap from the rows
    const detailsMap = new Map(rows.map(r => [r.code, r]));
    const nicknameMap = await fetchNicknameMap(rows.map(r => r.code), lang);
    let nextDeckId = 1;

    // Categorise cards
    const heroCodes = [];
    const villainCodes = [];
    const mainSchemeCodes = [];
    const playerCardCodes = [];
    const permanentCodes = [];
    const encounterBySet = {}; // { set_code: [slots] }
    const encounterPermanentCodes = [];
    const specialBySet = {};   // { set_code: { name, slots } } for hero_special

    // Track codes that are 'b' variants of an 'a' (used as backs) to skip them
    const bBackCodes = new Set();
    for (const card of rows) {
      if (card.code.endsWith('b')) {
        const aCode = card.code.slice(0, -1) + 'a';
        if (detailsMap.has(aCode)) {
          bBackCodes.add(card.code);
        }
      }
    }

    for (const card of rows) {
      // Skip lone 'b' backs
      if (bBackCodes.has(card.code)) continue;

      // Skip c/d/e variants (they'll be attached as States)
      if (/[c-e]$/.test(card.code)) {
        const aCode = card.code.slice(0, -1) + 'a';
        if (detailsMap.has(aCode)) continue;
      }

      const slot = { code: card.code, quantity: card.quantity || 1 };

      if (card.type_code === 'hero' || card.type_code === 'alter_ego') {
        heroCodes.push(slot);
      } else if (card.type_code === 'villain') {
        villainCodes.push(slot);
      } else if (card.type_code === 'main_scheme') {
        mainSchemeCodes.push(slot);
      } else if (card.card_set_type_code === 'hero_special') {
        // Special deck — group by card_set_code
        const setCode = card.card_set_code || 'special';
        if (!specialBySet[setCode]) specialBySet[setCode] = { name: card.card_set_code || setCode, slots: [] };
        specialBySet[setCode].slots.push(slot);
      } else if (card.faction_code !== 'encounter') {
        // Split player cards: permanent vs normal (use DB field)
        if (card.permanent) {
          permanentCodes.push(slot);
        } else {
          playerCardCodes.push(slot);
        }
      } else {
        // Encounter card — separate permanents (use DB field)
        if (card.permanent) {
          encounterPermanentCodes.push(slot);
        } else {
          const setCode = card.card_set_code || 'uncategorized';
          if (!encounterBySet[setCode]) encounterBySet[setCode] = [];
          encounterBySet[setCode].push(slot);
        }
      }
    }

    const result = {};

    // Heroes
    if (heroCodes.length > 0) {
      const heroResult = buildTTSPile(heroCodes, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = heroResult.nextDeckId;
      if (heroResult.ttsObject) {
        result.hero = applyTransform(heroResult.ttsObject, { posX: -5, posY: 2, posZ: 5, scaleXZ: 1.65 });
      }
    }

    // Villains
    if (villainCodes.length > 0) {
      const villResult = buildTTSPile(villainCodes, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = villResult.nextDeckId;
      if (villResult.ttsObject) {
        result.villains = applyTransform(villResult.ttsObject, { posX: 0, posY: 2, posZ: 5, scaleXZ: 1.65 });
      }
    }

    // Main Schemes
    if (mainSchemeCodes.length > 0) {
      const schemeResult = buildTTSPile(mainSchemeCodes, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = schemeResult.nextDeckId;
      if (schemeResult.ttsObject) {
        result.mainSchemes = applyTransform(schemeResult.ttsObject, { posX: 0, posY: 2, posZ: 2, scaleXZ: 1.88 });
      }
    }

    // Main Deck (non-permanents)
    if (playerCardCodes.length > 0) {
      const playerResult = buildTTSPile(playerCardCodes, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = playerResult.nextDeckId;
      if (playerResult.ttsObject) {
        result.mainDeck = applyTransform(playerResult.ttsObject, { posX: -5, posY: 2, posZ: 0 });
      }
    }

    // Permanents
    if (permanentCodes.length > 0) {
      const permResult = buildTTSPile(permanentCodes, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = permResult.nextDeckId;
      if (permResult.ttsObject) {
        result.permanents = applyTransform(permResult.ttsObject, { posX: -5, posY: 2, posZ: -3 });
      }
    }

    // Special Decks — each set gets its own pile
    const specialSetKeys = Object.keys(specialBySet);
    if (specialSetKeys.length > 0) {
      result.specialDecks = {};
      let specPosZ = -5;
      for (const setCode of specialSetKeys) {
        const { name, slots } = specialBySet[setCode];
        const specResult = buildTTSPile(slots, detailsMap, nextDeckId, lang, nicknameMap);
        nextDeckId = specResult.nextDeckId;
        if (specResult.ttsObject) {
          specResult.ttsObject.Nickname = name;
          result.specialDecks[setCode] = applyTransform(specResult.ttsObject, { posX: -5, posY: 2, posZ: specPosZ });
          specPosZ -= 3;
        }
      }
    }

    // Encounter Sets — dynamic grouping
    const encounterSetKeys = Object.keys(encounterBySet).sort();
    if (encounterSetKeys.length > 0) {
      result.encounterSets = {};
      let posZ = 5;
      for (const setCode of encounterSetKeys) {
        const setSlots = encounterBySet[setCode];
        const setResult = buildTTSPile(setSlots, detailsMap, nextDeckId, lang, nicknameMap);
        nextDeckId = setResult.nextDeckId;
        if (setResult.ttsObject) {
          result.encounterSets[setCode] = applyTransform(setResult.ttsObject, { posX: 5, posY: 2, posZ, scaleXZ: 1.88 });
          posZ -= 3;
        }
      }
    }

    // Encounter Permanents
    if (encounterPermanentCodes.length > 0) {
      const encPermResult = buildTTSPile(encounterPermanentCodes, detailsMap, nextDeckId, lang, nicknameMap);
      nextDeckId = encPermResult.nextDeckId;
      if (encPermResult.ttsObject) {
        result.encounterPermanents = applyTransform(encPermResult.ttsObject, { posX: 5, posY: 2, posZ: -5, scaleXZ: 1.88 });
      }
    }

    res.json({
      packCode,
      piles: result,
    });
  } catch (err) {
    console.error('GET /tts/pack/:code error:', err);
    next(err);
  }
});

// ─── Image Endpoints ─────────────────────────────────────────────────────────

/** Default placeholder image URL — used when both FR and EN images are missing */
const PLACEHOLDER_IMAGE_URL = `${BACKS_BASE_URL}/player_back.webp`;

/**
 * Try to download an image. Returns the buffer only if the response is a
 * genuine image (status 200 + image/* content-type). Returns null otherwise,
 * including when the server returns a 404 HTML page with a 200 status.
 */
async function tryFetchImage(url) {
  try {
    const resp = await axios({
      url,
      responseType: 'arraybuffer',
      timeout: 10000,
      validateStatus: (s) => s === 200, // only accept 200
    });
    // Guard: some servers return 200 with HTML for missing images
    const ct = (resp.headers['content-type'] || '').toLowerCase();
    if (!ct.startsWith('image/')) return null;
    if (!resp.data || resp.data.length === 0) return null;
    return resp.data;
  } catch (_) {
    return null;
  }
}

/**
 * Download an image with graceful fallback chain:
 *   1. Original URL (requested language)
 *   2. EN fallback (if lang ≠ EN)
 *   3. Placeholder (player_back.webp) — guarantees TTS never gets HTML
 *
 * Always returns a valid image buffer.
 */
async function fetchImageWithFallback(url, lang, pack, code, dupCode, dupPack) {
  // 1. Try the original URL
  const primary = await tryFetchImage(url);
  if (primary) return primary;

  // 2. Fallback to EN if language wasn't already EN
  if (lang && lang.toUpperCase() !== 'EN' && pack && code) {
    const enURL = `${CARDS_BASE_URL}/EN/${pack}/${code}.webp`;
    const enBuffer = await tryFetchImage(enURL);
    if (enBuffer) return enBuffer;
  }

  // 3. Also try replacing /FR/ (or any lang) with /EN/ directly in the URL
  if (url && /\/[A-Z]{2}\//i.test(url)) {
    const altURL = url.replace(/\/[A-Z]{2}\//i, '/EN/');
    if (altURL !== url) {
      const altBuffer = await tryFetchImage(altURL);
      if (altBuffer) return altBuffer;
    }
  }

  // 4. Duplicate fallback: try the original card's image (FR then EN)
  if (dupCode && dupPack) {
    const dupFrURL = `${CARDS_BASE_URL}/${lang || 'FR'}/${dupPack}/${dupCode}.webp`;
    const dupFr = await tryFetchImage(dupFrURL);
    if (dupFr) return dupFr;

    const dupEnURL = `${CARDS_BASE_URL}/EN/${dupPack}/${dupCode}.webp`;
    const dupEn = await tryFetchImage(dupEnURL);
    if (dupEn) return dupEn;
  }

  // 5. Return placeholder so TTS never receives HTML or an error
  const placeholder = await tryFetchImage(PLACEHOLDER_IMAGE_URL);
  return placeholder; // may still be null in extreme cases
}

/**
 * GET /api/public/tts/card-image?url=<encoded_url>&lang=FR&pack=core&code=01001a
 *
 * Image proxy with language fallback + placeholder guarantee.
 * TTS always receives a valid image/webp response.
 */
router.get('/tts/card-image', async (req, res) => {
  try {
    const { url, lang, pack, code, dup_code, dup_pack } = req.query;
    if (!url) return res.status(400).send('URL missing');

    const buffer = await fetchImageWithFallback(url, lang, pack, code, dup_code, dup_pack);
    if (!buffer) {
      return res.status(404).send('Image not found');
    }

    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('GET /tts/card-image error:', err.message);
    res.status(500).send('Error processing image');
  }
});

/**
 * GET /api/public/tts/rotate-image?url=<encoded_url>&lang=FR&pack=core&code=01001a
 *
 * Image proxy with rotation (90° CW) + language fallback + placeholder guarantee.
 */
router.get('/tts/rotate-image', async (req, res) => {
  try {
    const { url, lang, pack, code, dup_code, dup_pack } = req.query;
    if (!url) return res.status(400).send('URL missing');

    const buffer = await fetchImageWithFallback(url, lang, pack, code, dup_code, dup_pack);
    if (!buffer) {
      return res.status(404).send('Image not found');
    }

    const rotatedBuffer = await sharp(Buffer.from(buffer))
      .rotate(90)
      .webp()
      .toBuffer();

    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(rotatedBuffer);
  } catch (err) {
    console.error('GET /tts/rotate-image error:', err.message);
    res.status(500).send('Error processing image');
  }
});

module.exports = router;
