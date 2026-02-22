const { Router } = require('express');
const db = require('../config/database'); // Ton instance Knex
const { resolveImage } = require('../utils/cardSerializer');

const router = Router();

/**
 * Fonction utilitaire pour appliquer les filtres communs (Héros, Aspects, Tags)
 * Valable aussi bien pour les Decks privés que les Decklists publiques.
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


// ── 1. DECKS PUBLICS ────────────────────────────────────────────────────
router.get('/decks', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const baseQuery = () => db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id') // ⚠️ card_id pour les decklists publiques
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


// ── 2. DECKS PRIVÉS (Mes Decks) ─────────────────────────────────────────
// Accessible via /api/public/user/:id/decks
router.get('/user/:id/decks', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized. User ID is required.' });
    }

    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const baseQuery = () => db('deck as d')
      .join('card as c', 'd.character_id', 'c.id') // ⚠️ character_id pour les decks privés
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .where('d.user_id', userId) // <-- FILTRE DE SÉCURITÉ CRUCIAL
      .whereNull('d.next_deck')
      .modify(q => applyCommonFilters(q, req.query));

    const query = baseQuery()
      .select(
        'd.id', 'd.uuid', 'd.name', 'd.date_creation', 'd.date_update',
        'd.major_version', 'd.minor_version', // Pas de champ "version" unique ici
        'd.tags', 'd.meta', 'd.problem',
        'c.code as hero_code', 'c.name as hero_name',
        'f.code as faction_code',
        'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
      )
      .orderBy('d.date_update', 'desc') // Les decks privés sont souvent triés par date de modification
      .limit(limit)
      .offset(offset);

    const decks = (await query).map(row => ({
      ...row,
      // Formatage de la version pour correspondre à l'affichage (ex: 1.0)
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

module.exports = router;