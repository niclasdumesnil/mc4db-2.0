const { Router } = require('express');
const db = require('../config/database'); // Ton instance Knex
const { resolveImage } = require('../utils/cardSerializer');

const router = Router();

// ==========================================
// 🛠️ FONCTIONS UTILITAIRES
// ==========================================

/**
 * Applique les filtres communs (Héros, Aspects, Tags) aux listes de decks.
 */
function applyCommonFilters(queryBuilder, reqQuery) {
  const { hero, aspect, tag } = reqQuery;
  const aspects = aspect ? (Array.isArray(aspect) ? aspect : [aspect]) : [];
  const tags    = tag    ? (Array.isArray(tag)    ? tag    : [tag])    : [];

  if (hero) queryBuilder.where('c.code', hero);
  
  if (aspects.length) {
    const includesBasic = aspects.includes('basic');
    queryBuilder.where(function() {
      this.whereIn(
        db.raw("JSON_UNQUOTE(JSON_EXTRACT(d.meta, '$.aspect'))"),
        aspects
      );
      if (includesBasic) {
        this.orWhereRaw("JSON_EXTRACT(d.meta, '$.aspect') IS NULL");
        this.orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(d.meta, '$.aspect')) = ''");
      }
    });
  }
  
  if (tags.length) {
    queryBuilder.where(function () {
      tags.forEach(t => this.orWhereRaw("FIND_IN_SET(?, d.tags)", [t]));
    });
  }
}

/**
 * Récupère les cartes (slots) associées à un deck ou une decklist
 * Inclut les ressources pour afficher les icônes (Energy, Mental, etc.)
 * Applique la traduction si locale != 'en'
 */
async function fetchDeckSlots(tableName, foreignKey, parentId, locale = 'en') {
  const rows = await db(`${tableName} as s`)
    .join('card as c', 's.card_id', 'c.id')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .select(
      's.quantity',
      'c.code',
      'c.name',
      'c.alt_art',
      'c.permanent',
      't.name as type_name',
      'f.code as faction_code',
      'c.cost',
      'c.resource_physical',
      'c.resource_energy',
      'c.resource_mental',
      'c.resource_wild',
      'p.environment as pack_environment',
      'p.code as pack_code'
    )
    .where(`s.${foreignKey}`, parentId)
    .orderBy('c.name', 'asc');

  if (!locale || locale === 'en' || rows.length === 0) return rows;

  // Overlay card_translation for name
  const codes = rows.map(r => r.code);
  const transRows = await db('card_translation')
    .whereIn('code', codes)
    .where('locale', locale.toLowerCase())
    .select('code', 'name');
  const transMap = Object.fromEntries(transRows.map(t => [t.code, t]));

  return rows.map(r => {
    const t = transMap[r.code];
    if (!t || !t.name) return r;
    return { ...r, name: t.name };
  });
}


// ==========================================
// 🌍 1. DECKS PUBLICS (Decklists)
// ==========================================

// 1A. Liste des decks publics
router.get('/decks', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const baseQuery = () => db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id') // card_id pour les decklists publiques
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .whereNull('d.next_deck')
      .modify(q => applyCommonFilters(q, req.query));

    const query = baseQuery()
      .select(
        'd.id', 'd.name', 'd.date_creation',
        'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments',
        'd.version', 'd.tags', 'd.meta',
        'u.username as author_name', 'u.reputation as author_reputation',
        'c.code as hero_code', 'c.name as hero_name',
        'f.code as faction_code',
        'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
      )
      .orderBy('d.date_creation', 'desc')
      .limit(limit)
      .offset(offset);

    const decks = (await query).map(row => ({
      ...row,
      hero_imagesrc: resolveImage(row.hero_code)
    }));

    const [{ total }] = await baseQuery().count('* as total');

    return res.json({
      ok: true,
      data: decks,
      meta: { current_page: page, total_pages: Math.ceil(total / limit), total_items: total }
    });

  } catch (err) {
    console.error('GET /decks error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1B. Détail d'un deck public (avec ses cartes)
router.get('/decks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const locale = (req.query.locale || 'en').toLowerCase();

    const deck = await db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id')
      .select('d.*', 'u.username as author_name', 'c.name as hero_name', 'c.code as hero_code', 'c.meta as hero_meta')
      .where('d.id', id)
      .first();

    if (!deck) return res.status(404).json({ error: 'Decklist not found' });

    const slots = await fetchDeckSlots('decklistslot', 'decklist_id', id, locale);
    const packs_required = new Set(slots.map(s => s.pack_code).filter(Boolean)).size;
    const heroCode = deck.hero_code || '';
    const alterEgoCode = heroCode.endsWith('b') ? heroCode.slice(0, -1) + 'a' : heroCode.endsWith('a') ? heroCode.slice(0, -1) + 'b' : heroCode + 'b';

    return res.json({ ok: true, data: {
      ...deck,
      slots,
      packs_required,
      hero_imagesrc: resolveImage(heroCode),
      alter_ego_imagesrc: resolveImage(alterEgoCode),
    }});
  } catch (err) {
    console.error('GET /decks/:id error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});


// ==========================================
// 🔒 2. DECKS PRIVÉS (Mes Decks)
// ==========================================

// 2A. Liste des decks privés d'un utilisateur
router.get('/user/:id/decks', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(401).json({ error: 'Unauthorized. User ID is required.' });

    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const baseQuery = () => db('deck as d')
      .join('card as c', 'd.character_id', 'c.id') // character_id pour les decks privés
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .where('d.user_id', userId) // Sécurité : On s'assure que le deck appartient bien au joueur
      .whereNull('d.next_deck')
      .modify(q => applyCommonFilters(q, req.query));

    const query = baseQuery()
      .select(
        'd.id', 'd.uuid', 'd.name', 'd.date_creation', 'd.date_update',
        'd.major_version', 'd.minor_version',
        'd.tags', 'd.meta', 'd.problem',
        'c.code as hero_code', 'c.name as hero_name',
        'f.code as faction_code',
        'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
      )
      .orderBy('d.date_update', 'desc')
      .limit(limit)
      .offset(offset);

    const decks = (await query).map(row => ({
      ...row,
      version: `${row.major_version}.${row.minor_version}`,
      hero_imagesrc: resolveImage(row.hero_code)
    }));

    const [{ total }] = await baseQuery().count('* as total');

    return res.json({
      ok: true,
      data: decks,
      meta: { current_page: page, total_pages: Math.ceil(total / limit), total_items: total }
    });

  } catch (err) {
    console.error('GET /user/:id/decks error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 2B. Détail d'un deck privé (avec ses cartes)
router.get('/user/:userId/decks/:deckId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);
    const locale = (req.query.locale || 'en').toLowerCase();

    const deck = await db('deck as d')
      .join('card as c', 'd.character_id', 'c.id')
      .select('d.*', 'c.name as hero_name', 'c.code as hero_code', 'c.meta as hero_meta')
      .where('d.id', deckId)
      .andWhere('d.user_id', userId)
      .first();

    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    deck.version = `${deck.major_version}.${deck.minor_version}`;

    const slots = await fetchDeckSlots('deckslot', 'deck_id', deckId, locale);
    const packs_required = new Set(slots.map(s => s.pack_code).filter(Boolean)).size;
    const heroCode = deck.hero_code || '';
    const alterEgoCode = heroCode.endsWith('b') ? heroCode.slice(0, -1) + 'a' : heroCode.endsWith('a') ? heroCode.slice(0, -1) + 'b' : heroCode + 'b';

    return res.json({ ok: true, data: {
      ...deck,
      slots,
      packs_required,
      hero_imagesrc: resolveImage(heroCode),
      alter_ego_imagesrc: resolveImage(alterEgoCode),
    }});
  } catch (err) {
    console.error('GET /user/:userId/decks/:deckId error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 2C. Sauvegarder les slots d'un deck privé
router.put('/user/:userId/decks/:deckId/slots', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Vérification propriété
    const deck = await db('deck').where({ id: deckId, user_id: userId }).first();
    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    const { slots } = req.body; // [{ code, quantity }]
    if (!Array.isArray(slots)) return res.status(400).json({ error: 'Invalid slots' });

    // Ne garder que les slots avec quantity > 0
    const toInsert = slots.filter(s => s.quantity > 0);

    // Résoudre card_id depuis les codes
    const codes = toInsert.map(s => s.code);
    const cardRows = codes.length > 0
      ? await db('card').whereIn('code', codes).select('id', 'code')
      : [];
    const codeToId = Object.fromEntries(cardRows.map(r => [r.code, r.id]));

    await db.transaction(async trx => {
      // Supprimer tous les slots existants
      await trx('deckslot').where('deck_id', deckId).delete();

      // Insérer les nouveaux
      if (toInsert.length > 0) {
        const rows = toInsert
          .filter(s => codeToId[s.code])
          .map(s => ({ deck_id: deckId, card_id: codeToId[s.code], quantity: s.quantity }));
        if (rows.length > 0) await trx('deckslot').insert(rows);
      }

      // Mettre à jour date_update
      await trx('deck').where('id', deckId).update({ date_update: new Date() });
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('PUT /user/:userId/decks/:deckId/slots error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;