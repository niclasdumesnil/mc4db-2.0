/**
 * cardSerializer.js
 *
 * Replicates Symfony CardsData::getCardInfo() output format.
 * Converts a raw DB row (snake_case) into the public API JSON shape
 * that the existing frontend expects.
 */
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4000';

// Resolve cards directory: prefer `web/bundles/cards` (Symfony layout), but
// fall back to `bundles/cards` for the flattened standalone layout.
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
let CARDS_DIR = path.resolve(PROJECT_ROOT, 'web', 'bundles', 'cards');
if (!fs.existsSync(CARDS_DIR)) {
  CARDS_DIR = path.resolve(PROJECT_ROOT, 'bundles', 'cards');
}

// Default locale when a card/pack does not provide a language.
// Read from env so it can be overridden in deployment.
const DEFAULT_LOCALE = (process.env.DEFAULT_LOCALE || 'EN').toUpperCase() === 'FR' ? 'FR' : 'EN';

/**
 * Resolve the best available image src for a card code.
 * When preferLang is 'FR', checks FR dir first then EN dir as fallback.
 * When preferLang is 'EN' (or absent), checks EN dir only (plus root-level).
 */
function resolveImage(code, packCode = '', suffix = '', preferLang = undefined) {
  const pref = (preferLang && String(preferLang).toUpperCase() === 'FR') ? 'FR' : 'EN';
  const fileName = `${code}${suffix}`;

  // Build ordered list of lang dirs to try
  const langs = pref === 'FR' ? ['FR', 'EN'] : ['EN'];

  const candidates = [];
  for (const l of langs) {
    if (packCode) {
      candidates.push(
        `${l}/${packCode}/${fileName}.webp`,
        `${l}/${packCode}/${fileName}a.webp`
      );
    }
    candidates.push(
      `${l}/${fileName}.webp`,
      `${l}/${fileName}a.webp`
    );
  }
  // Root-level fallback (no lang dir)
  if (packCode) {
    candidates.push(
      `${packCode}/${fileName}.webp`,
      `${packCode}/${fileName}a.webp`
    );
  }
  candidates.push(
    `${fileName}.webp`,
    `${fileName}a.webp`
  );

  for (const c of candidates) {
    try {
      const candidatePath = path.join(CARDS_DIR, c);
      if (fs.existsSync(candidatePath)) {
        const rel = path.relative(CARDS_DIR, candidatePath).replace(/\\/g, '/');
        return `/bundles/cards/${rel}`;
      }
    } catch {
      // ignore fs errors
    }
  }
  return '';
}

/**
 * Convert a raw card row into the public API shape.
 *
 * @param {object} row - Raw DB row from Card.findAll / findByCode
 * @param {object} opts
 * @param {boolean} opts.api    - true for API mode (remove id, decode JSON fields, strip nulls)
 * @param {boolean} opts.html   - false for API (raw text), true for web views (HTML-ified)
 * @param {string[]} opts.duplicatedBy - list of codes that duplicate this card
 * @param {object|null} opts.linkedCard - pre-serialized linked card (avoid infinite recursion)
 */
function serializeCard(row, opts = {}) {
  const { api = true, html = false, duplicatedBy = [], linkedCard = null, locale = null } = opts;

  const packYear = row.pack_date_release
    ? new Date(row.pack_date_release).getFullYear().toString()
    : '';

  // Image lang priority: explicit locale (from ?locale= param) → pack language → EN
  const packLang = (row.pack_language || 'en').toUpperCase() === 'FR' ? 'FR' : 'EN';
  const imageLang = (locale && locale.toUpperCase() === 'FR') ? 'FR' : packLang;

  const card = {
    pack_id: row.pack_id ?? null,
    pack_code: row.pack_code || '',
    pack_name: row.pack_name || '',
    pack_creator: row.pack_creator || null,
    type_code: row.type_code || '',
    type_name: row.type_name || '',
    subtype_code: row.subtype_code || null,
    subtype_name: row.subtype_name || null,
    faction_code: row.faction_code || '',
    faction_name: row.faction_name || '',
    faction2_code: row.faction2_code || null,
    faction2_name: row.faction2_name || null,
    card_set_code: row.card_set_code || null,
    card_set_name: row.card_set_name || null,
    card_set_type_name_code: row.card_set_type_name_code || null,
    card_set_parent_code: row.card_set_parent_code || null,
    linked_to_code: row.linked_to_code || null,
    linked_to_name: row.linked_to_name || null,
    duplicate_of_code: row.duplicate_of_code || null,
    duplicate_of_name: row.duplicate_of_name || null,
    position: row.position,
    set_position: row.set_position ?? null,
    code: row.code,
    name: row.name,
    real_name: row.real_name,
    subname: row.subname || null,
    cost: row.cost ?? null,
    cost_per_hero: toBool(row.cost_per_hero),
    text: row.text || '',
    real_text: row.real_text || '',
    boost: row.boost ?? null,
    boost_star: toBool(row.boost_star),
    quantity: row.quantity,
    resource_energy: row.resource_energy ?? null,
    resource_physical: row.resource_physical ?? null,
    resource_mental: row.resource_mental ?? null,
    resource_wild: row.resource_wild ?? null,
    hand_size: row.hand_size ?? null,
    health: row.health ?? null,
    health_per_group: toBool(row.health_per_group),
    health_per_hero: toBool(row.health_per_hero),
    health_star: toBool(row.health_star),
    thwart: row.thwart ?? null,
    thwart_cost: row.thwart_cost ?? null,
    thwart_star: toBool(row.thwart_star),
    scheme: row.scheme ?? null,
    scheme_star: toBool(row.scheme_star),
    attack: row.attack ?? null,
    attack_cost: row.attack_cost ?? null,
    attack_star: toBool(row.attack_star),
    defense: row.defense ?? null,
    defense_cost: row.defense_cost ?? null,
    defense_star: toBool(row.defense_star),
    recover: row.recover ?? null,
    recover_cost: row.recover_cost ?? null,
    recover_star: toBool(row.recover_star),
    base_threat: row.base_threat ?? null,
    base_threat_fixed: toBool(row.base_threat_fixed),
    base_threat_per_group: toBool(row.base_threat_per_group),
    escalation_threat: row.escalation_threat ?? null,
    escalation_threat_fixed: toBool(row.escalation_threat_fixed),
    escalation_threat_star: toBool(row.escalation_threat_star),
    scheme_crisis: row.scheme_crisis ?? null,
    scheme_acceleration: row.scheme_acceleration ?? null,
    scheme_amplify: row.scheme_amplify ?? null,
    scheme_hazard: row.scheme_hazard ?? null,
    threat: row.threat ?? null,
    threat_fixed: toBool(row.threat_fixed),
    threat_per_group: toBool(row.threat_per_group),
    threat_star: toBool(row.threat_star),
    deck_limit: row.deck_limit ?? null,
    stage: row.stage || null,
    traits: row.traits || '',
    real_traits: row.real_traits || '',
    flavor: row.flavor || '',
    illustrator: row.illustrator || '',
    is_unique: toBool(row.is_unique),
    hidden: toBool(row.hidden),
    permanent: toBool(row.permanent),
    double_sided: toBool(row.double_sided),
    back_text: row.back_text || '',
    back_flavor: row.back_flavor || '',
    back_name: row.back_name || '',
    octgn_id: row.octgn_id || null,
    errata: row.errata || '',
    expansions_needed: row.expansions_needed || '',
    alt_art: toBool(row.alt_art),

    // Computed fields
    url: `${BASE_URL}/card/${row.code}`,
    imagesrc: resolveImage(row.code, row.pack_code, '', imageLang),
    backimagesrc: row.double_sided ? resolveImage(row.code, row.pack_code, 'b', imageLang) : '',
    spoiler:
      row.card_set_code &&
        (row.faction_code === 'encounter' || row.card_set_type_name_code === 'encounter')
        ? 1
        : 0,

    // Pack-derived
    status: row.pack_status || 'Official',
    creator: row.pack_creator || 'FFG',
    theme: row.pack_theme || 'Marvel',
    visibility: row.pack_visibility || 'true',
    language: row.pack_language || 'en',
    pack_year: packYear,
    pack_environment: (row.pack_environment || '').toLowerCase(),
  };

  // Linked card
  if (linkedCard) {
    card.linked_card = linkedCard;
  }

  // Duplicated-by list
  if (duplicatedBy.length > 0) {
    card.duplicated_by = duplicatedBy;
  }

  // API-specific transformations
  card.id = row.id; // Expose DB id for review relations
  if (api) {
    // Decode JSON-string fields
    card.meta = safeJsonParse(row.meta);
    card.deck_requirements = safeJsonParse(row.deck_requirements);
    card.deck_options = safeJsonParse(row.deck_options);

    // Strip null values
    for (const key of Object.keys(card)) {
      if (card[key] === null || card[key] === undefined) {
        delete card[key];
      }
    }
  }

  return card;
}

// ── Helpers ──────────────────────────────

function toBool(val) {
  if (val === null || val === undefined) return false;
  return Boolean(val);
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

module.exports = { serializeCard, resolveImage };
