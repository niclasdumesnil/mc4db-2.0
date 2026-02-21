/**
 * Card model — thin query helpers over the `card` table.
 *
 * Joins pack, type, subtype, faction, faction2, card_set, linked_to, duplicate_of
 * to produce the same shape as Symfony CardsData::getCardInfo().
 */
const db = require('../config/database');

const BASE_CARD_COLUMNS = [
  'c.id',
  'c.code',
  'c.name',
  'c.real_name',
  'c.subname',
  'c.cost',
  'c.cost_per_hero',
  'c.text',
  'c.real_text',
  'c.boost',
  'c.boost_star',
  'c.quantity',
  'c.position',
  'c.set_position',
  'c.resource_energy',
  'c.resource_physical',
  'c.resource_mental',
  'c.resource_wild',
  'c.hand_size',
  'c.health',
  'c.health_per_group',
  'c.health_per_hero',
  'c.health_star',
  'c.thwart',
  'c.thwart_cost',
  'c.thwart_star',
  'c.scheme',
  'c.scheme_star',
  'c.attack',
  'c.attack_cost',
  'c.attack_star',
  'c.defense',
  'c.defense_cost',
  'c.defense_star',
  'c.recover',
  'c.recover_cost',
  'c.recover_star',
  'c.base_threat',
  'c.base_threat_fixed',
  'c.base_threat_per_group',
  'c.escalation_threat',
  'c.escalation_threat_fixed',
  'c.escalation_threat_star',
  'c.scheme_crisis',
  'c.scheme_acceleration',
  'c.scheme_amplify',
  'c.scheme_hazard',
  'c.threat',
  'c.threat_fixed',
  'c.threat_per_group',
  'c.threat_star',
  'c.deck_limit',
  'c.stage',
  'c.traits',
  'c.real_traits',
  'c.meta',
  'c.deck_requirements',
  'c.deck_options',
  'c.restrictions',
  'c.flavor',
  'c.illustrator',
  'c.is_unique',
  'c.hidden',
  'c.permanent',
  'c.double_sided',
  'c.back_text',
  'c.back_flavor',
  'c.back_name',
  'c.octgn_id',
  'c.errata',
  'c.expansions_needed',
  'c.date_creation',
  'c.date_update',
  // Joined fields
  'p.code as pack_code',
  'p.name as pack_name',
  'p.date_release as pack_date_release',
  'p.status as pack_status',
  'p.creator as pack_creator',
  'p.theme as pack_theme',
  'p.visibility as pack_visibility',
  'p.language as pack_language',
  'p.environment as pack_environment',
  't.code as type_code',
  't.name as type_name',
  'st.code as subtype_code',
  'st.name as subtype_name',
  'f.code as faction_code',
  'f.name as faction_name',
  'f2.code as faction2_code',
  'f2.name as faction2_name',
  'cs.code as card_set_code',
  'cs.name as card_set_name',
  'cs.parent_code as card_set_parent_code',
  'cst.code as card_set_type_name_code',
  'lt.code as linked_to_code',
  'lt.name as linked_to_name',
  'dup.code as duplicate_of_code',
  'dup.name as duplicate_of_name',
];

/**
 * Build the base query with all necessary joins.
 */
function baseQuery() {
  return db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .leftJoin('subtype as st', 'c.subtype_id', 'st.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .leftJoin('faction as f2', 'c.faction2_id', 'f2.id')
    .leftJoin('cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .leftJoin('card as lt', 'c.linked_id', 'lt.id')
    .leftJoin('card as dup', 'c.duplicate_id', 'dup.id')
    .select(BASE_CARD_COLUMNS);
}

/**
 * Get all cards.
 */
async function findAll() {
  return baseQuery().orderBy('c.code', 'asc');
}

/**
 * Get a single card by code.
 */
async function findByCode(code) {
  return baseQuery().where('c.code', code).first();
}

/**
 * Get cards filtered by pack code.
 */
async function findByPackCode(packCode) {
  return baseQuery().where('p.code', packCode).orderBy('c.position', 'asc');
}

/**
 * Get all codes that duplicate a given card id.
 */
async function findDuplicateCodes(cardId) {
  const rows = await db('card').select('code').where('duplicate_id', cardId);
  return rows.map((r) => r.code);
}

/**
 * Get translated fields for a given card code and locale.
 * Returns an object with name, subname, text, flavor, traits, errata
 * or undefined if no translation exists.
 */
async function findTranslation(code, locale) {
  return db('card_translation')
    .where({ code, locale })
    .select(['name', 'subname', 'text', 'flavor', 'traits', 'errata'])
    .first();
}

module.exports = { findAll, findByCode, findByPackCode, findDuplicateCodes, findTranslation };
