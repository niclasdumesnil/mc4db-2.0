const { Router } = require('express');
const db = require('../config/database'); // Ton instance Knex
const { resolveImage } = require('../utils/cardSerializer');

const router = Router();

// ==========================================
// 🛠️ FONCTIONS UTILITAIRES
// ==========================================

function formatLegacyDate(d) {
  if (!d) return null;
  const date = new Date(d);
  const pad = n => n.toString().padStart(2, '0');
  const tz = -date.getTimezoneOffset();
  const sign = tz >= 0 ? '+' : '-';
  const absTz = Math.abs(tz);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(Math.floor(absTz / 60))}:${pad(absTz % 60)}`;
}

/**
 * Applique les filtres communs (Héros, Aspects, Tags) aux listes de decks.
 */
function applyCommonFilters(queryBuilder, reqQuery) {
  const { hero, aspect, tag, published } = reqQuery;
  const aspects = aspect ? (Array.isArray(aspect) ? aspect : [aspect]) : [];
  const tags = tag ? (Array.isArray(tag) ? tag : [tag]) : [];

  if (published === '1') {
    queryBuilder.whereNotNull('d.parent_decklist_id');
  }

  if (hero) queryBuilder.where('c.code', hero);

  if (aspects.length) {
    const includesBasic = aspects.includes('basic');
    queryBuilder.where(function () {
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
      'c.text',
      'c.real_text',
      'c.alt_art',
      'c.permanent',
      'c.is_unique',
      'c.octgn_id',
      't.code as type_code',
      't.name as type_name',
      'f.code as faction_code',
      'f.name as faction_name',
      'c.cost',
      'c.resource_physical',
      'c.resource_energy',
      'c.resource_mental',
      'c.resource_wild',
      'p.environment as pack_environment',
      'p.code as pack_code',
      'p.name as pack_name',
      'p.creator as pack_creator',
      'p.visibility as visibility',
      'c.creator as card_creator'
    )
    .where(`s.${foreignKey}`, parentId)
    .orderBy('c.name', 'asc');

  if (!locale || locale === 'en' || rows.length === 0) {
    return rows.map(r => ({ 
      ...r, 
      creator: r.card_creator || r.pack_creator || 'FFG',
      visibility: r.visibility || 'true',
      imagesrc: resolveImage(r.code, r.pack_code, '', locale) 
    }));
  }

  // Overlay card_translation for name
  const codes = rows.map(r => r.code);
  const transRows = await db('card_translation')
    .whereIn('code', codes)
    .where('locale', locale.toLowerCase())
    .select('code', 'name');
  const transMap = Object.fromEntries(transRows.map(t => [t.code, t]));

  const FactionModel = require('../models/faction.model');
  const TypeModel = require('../models/type.model');
  const PackModel = require('../models/pack.model');
  const facMap = await FactionModel.getTranslationMap(locale.toLowerCase());
  const typesMap = await TypeModel.getTranslationMap(locale.toLowerCase());
  const packsMap = await PackModel.getTranslationMap(locale.toLowerCase());

  return rows.map(r => {
    const base = {
      ...r,
      creator: r.card_creator || r.pack_creator || 'FFG',
      visibility: r.visibility || 'true',
      imagesrc: resolveImage(r.code, r.pack_code, '', locale),
      faction_name: facMap[r.faction_code] || r.faction_name,
      type_name: typesMap[r.type_code] || r.type_name,
      pack_name: packsMap[r.pack_code] || r.pack_name,
    };
    const t = transMap[r.code];
    if (!t || !t.name) return base;
    return { ...base, name: t.name };
  });
}


/**
 * Fetches hero_special cards for a given hero code.
 * These are cards belonging to sets where parent_code = hero's card_set_code
 * and card_set_type = 'hero_special' (e.g. Invocation Deck, Weather Deck, etc.)
 */
async function fetchHeroSpecialCards(heroCode, locale = 'en') {
  if (!heroCode) return [];

  // Get the hero's card_set_code via the cardset join
  const heroCard = await db('card as c')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .where('c.code', heroCode)
    .select('cs.code as card_set_code')
    .first();

  if (!heroCard || !heroCard.card_set_code) return [];
  const heroSetCode = heroCard.card_set_code;

  // Fetch all cards belonging to hero_special sets parented to this hero set
  const rows = await db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .where('cs.parent_code', heroSetCode)
    .where('cst.code', 'hero_special')
    .orderBy(['cs.code', 'c.position'])
    .select(
      'c.code',
      'c.name',
      'c.quantity',
      'c.is_unique',
      'c.octgn_id',
      'f.code as faction_code',
      'f.name as faction_name',
      'cs.code as card_set_code',
      'cs.name as card_set_name',
      'p.code as pack_code',
      'p.language as pack_language',
      'p.environment as pack_environment'
    );

  if (rows.length === 0) return [];

  // Apply translations
  if (locale && locale !== 'en') {
    const codes = rows.map(r => r.code);
    const transRows = await db('card_translation')
      .whereIn('code', codes)
      .where('locale', locale.toLowerCase())
      .select('code', 'name');
    const transMap = Object.fromEntries(transRows.map(t => [t.code, t]));
    
    const FactionModel = require('../models/faction.model');
    const CardsetModel = require('../models/cardset.model');
    const facMap = await FactionModel.getTranslationMap(locale.toLowerCase());
    const cardsetMap = await CardsetModel.getTranslationMap(locale.toLowerCase());

    return rows.map(r => {
      const t = transMap[r.code];
      return {
        ...r,
        name: (t && t.name) ? t.name : r.name,
        faction_name: facMap[r.faction_code] || r.faction_name,
        card_set_name: cardsetMap[r.card_set_code] || r.card_set_name,
        imagesrc: resolveImage(r.code, r.pack_code, '', locale),
      };
    });
  }

  return rows.map(r => ({ ...r, imagesrc: resolveImage(r.code, r.pack_code) }));
}


// ==========================================
// 🌍 1. DECKS PUBLICS (Decklists)
// ==========================================

// 1A. Liste des decks publics
router.get('/decks', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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
        'd.id', 'd.name', 'd.date_creation', 'd.user_id', 'd.parent_deck_id',
        'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments',
        'd.version', 'd.tags', 'd.meta',
        'u.username as author_name', 'u.reputation as author_reputation',
        'c.code as hero_code', 'c.name as hero_name',
        'f.code as faction_code',
        'p.code as pack_code', 'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
      )
      .orderBy('d.date_creation', 'desc')
      .limit(limit)
      .offset(offset);

    const decks = (await query).map(row => ({
      ...row,
      hero_imagesrc: resolveImage(row.hero_code, row.pack_code)
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
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .select('d.*', 'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments', 'u.username as author_name', 'c.name as hero_name', 'c.code as hero_code', 'c.meta as hero_meta', 'c.octgn_id as hero_octgn_id', 'p.code as pack_code')
      .where('d.id', id)
      .first();

    if (!deck) return res.status(404).json({ error: 'Decklist not found' });

    const slots = await fetchDeckSlots('decklistslot', 'decklist_id', id, locale);
    const side_slots = await fetchDeckSlots('sidedecklistslot', 'decklist_id', id, locale);
    const packs_required = new Set(slots.map(s => s.pack_code).filter(Boolean)).size;
    const heroCode = deck.hero_code || '';
    const alterEgoCode = heroCode.endsWith('b') ? heroCode.slice(0, -1) + 'a' : heroCode.endsWith('a') ? heroCode.slice(0, -1) + 'b' : heroCode + 'b';
    const hero_special_cards = await fetchHeroSpecialCards(heroCode, locale);

    // Derived From (precedent_decklist_id)
    let derivedFrom = null;
    if (deck.precedent_decklist_id) {
      derivedFrom = await db('decklist as d')
        .join('user as u', 'd.user_id', 'u.id')
        .select('d.id', 'd.name', 'd.version', 'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments', 'u.username as author_name')
        .where('d.id', deck.precedent_decklist_id).first();
    }

    // Inspiration For (decks that derived from THIS one)
    const inspirationsRows = await db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .select('d.id', 'd.name', 'd.version', 'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments', 'u.username as author_name')
      .where('d.precedent_decklist_id', id)
      .orderBy('d.date_creation', 'desc');

    return res.json({
      ok: true, data: {
        ...deck,
        slots,
        side_slots,
        packs_required,
        hero_special_cards,
        hero_imagesrc: resolveImage(heroCode, deck.pack_code),
        alter_ego_imagesrc: resolveImage(alterEgoCode, deck.pack_code),
        derived_from_deck: derivedFrom,
        inspiration_for_decks: inspirationsRows,
      }
    });
  } catch (err) {
    console.error('GET /decks/:id error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});


// 1C. Détail d'un decklist format Legacy (Symfony)
router.get(['/decklist/:id.json', '/decklist/:id'], async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deck = await db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id')
      .select('d.*', 'c.name as character_name', 'c.code as character_code')
      .where('d.id', id)
      .first();

    if (!deck) return res.status(404).json({ error: 'Decklist not found' });

    const slotsRows = await db('decklistslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .select('s.quantity', 'c.code')
      .where('s.decklist_id', id);

    const slotsMap = {};
    const sortedRows = slotsRows.sort((a, b) => a.code.localeCompare(b.code));
    for (const row of sortedRows) slotsMap[row.code] = row.quantity;

    const legacyFormat = {
      id: deck.id,
      name: deck.name,
      date_creation: formatLegacyDate(deck.date_creation),
      date_update: formatLegacyDate(deck.date_update),
      description_md: deck.description_md,
      user_id: deck.user_id,
      hero_code: deck.character_code,
      hero_name: deck.character_name,
      signature_code: deck.signature,
      slots: slotsMap,
      ignoreDeckLimitSlots: null,
      version: deck.version,
      exiles: deck.exiles,
      meta: deck.meta,
      tags: deck.tags || "",
      nb_votes: deck.nb_votes,
      nb_favorites: deck.nb_favorites,
      nb_comments: deck.nb_comments
    };

    return res.json(legacyFormat);
  } catch (err) {
    console.error('GET /decklist/:id error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1D. Liste des decklists publiés à une date donnée (Legacy format)
router.get(['/decklists/:date.json', '/decklists/:date'], async (req, res) => {
  try {
    const dateStr = req.params.date;
    if (dateStr === 'popular') return next(); // Fallthrough to popular route if somehow routed here

    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    const start = new Date(dateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const decklists = await db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id')
      .where('d.date_creation', '>=', start)
      .andWhere('d.date_creation', '<', end)
      .select('d.*', 'c.name as character_name', 'c.code as character_code')
      .orderBy('d.date_creation', 'desc');

    if (decklists.length === 0) return res.json([]);

    const decklistIds = decklists.map(d => d.id);
    const slotsRows = await db('decklistslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .select('s.decklist_id', 's.quantity', 'c.code')
      .whereIn('s.decklist_id', decklistIds);

    const slotsByDecklist = {};
    const sortedSlotsRows = slotsRows.sort((a, b) => a.code.localeCompare(b.code));
    for (const row of sortedSlotsRows) {
      if (!slotsByDecklist[row.decklist_id]) slotsByDecklist[row.decklist_id] = {};
      slotsByDecklist[row.decklist_id][row.code] = row.quantity;
    }

    const legacyArray = decklists.map(deck => ({
      id: deck.id,
      name: deck.name,
      date_creation: formatLegacyDate(deck.date_creation),
      date_update: formatLegacyDate(deck.date_update),
      description_md: deck.description_md,
      user_id: deck.user_id,
      hero_code: deck.character_code,
      hero_name: deck.character_name,
      signature_code: deck.signature,
      slots: slotsByDecklist[deck.id] || {},
      ignoreDeckLimitSlots: null,
      version: deck.version,
      exiles: deck.exiles,
      meta: deck.meta,
      tags: deck.tags || "",
      nb_votes: deck.nb_votes,
      nb_favorites: deck.nb_favorites,
      nb_comments: deck.nb_comments
    }));

    return res.json(legacyArray);
  } catch (err) {
    console.error('GET /decklists/:date error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1E. Decklists populaires (Legacy format)
router.get('/decklists/popular', async (req, res) => {
  try {
    // Legacy returned up to 8 trending ones (for array $decklists_by_popular)
    const decklists = await db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id')
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .where('d.date_creation', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .select(
        'd.*',
        'c.name as character_name',
        'c.code as character_code',
        'c.meta as hero_meta',
        'f.code as faction_code'
      )
      .orderBy('d.nb_votes', 'desc')
      .limit(8);

    const result = decklists.map(deck => ({
      hero_meta: deck.hero_meta ? JSON.parse(deck.hero_meta) : null,
      faction: deck.faction_code,
      meta: deck.meta ? JSON.parse(deck.meta) : null,
      decklist: {
        id: deck.id,
        name: deck.name,
        date_creation: deck.date_creation,
        description_md: deck.description_md,
        user_id: deck.user_id,
        character_code: deck.character_code,
        character_name: deck.character_name,
        nb_votes: deck.nb_votes,
        nb_favorites: deck.nb_favorites,
        nb_comments: deck.nb_comments
      }
    }));
    return res.json(result);
  } catch (err) {
    console.error('GET /decklists/popular error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1F. Historique d'un deck public
router.get(['/decklist/:id/history', '/decklist/:id.json/history'], async (req, res) => {
  try {
    const decklistId = parseInt(req.params.id, 10);
    const locale = (req.query.locale || 'en').toLowerCase();
    if (!decklistId) return res.status(400).json({ error: 'Missing ID' });

    let currentId = decklistId;
    const history = [];
    let depth = 0;

    // Iterate backwards through the parent/precedent chain up to 50 levels deep to avoid circular loops
    while (currentId && depth < 50) {
      depth++;
      const current = await db('decklist').where('id', currentId).first();
      if (!current) break;

      const sourceId = current.previous_deck || current.precedent_decklist_id; // Try internal history first, then clone source
      if (!sourceId) break;

      const source = await db('decklist').where('id', sourceId).first();
      if (!source) break;

      // Fetch slots for current and source
      const currentSlots = await db('decklistslot').join('card', 'decklistslot.card_id', 'card.id').where('decklistslot.decklist_id', currentId).select('card.code', 'decklistslot.quantity');
      const sourceSlots = await db('decklistslot').join('card', 'decklistslot.card_id', 'card.id').where('decklistslot.decklist_id', sourceId).select('card.code', 'decklistslot.quantity');
      
      const currentSideSlots = await db('sidedecklistslot').join('card', 'sidedecklistslot.card_id', 'card.id').where('sidedecklistslot.decklist_id', currentId).select('card.code', 'sidedecklistslot.quantity');
      const sourceSideSlots = await db('sidedecklistslot').join('card', 'sidedecklistslot.card_id', 'card.id').where('sidedecklistslot.decklist_id', sourceId).select('card.code', 'sidedecklistslot.quantity');

      const allCodesList = [];
      const mainChanges = [];
      const sideChanges = [];

      function processSlots(curS, srcS, changesArr) {
        const curMap = {};
        for (const s of curS) curMap[s.code] = s.quantity;
        const srcMap = {};
        for (const s of srcS) srcMap[s.code] = s.quantity;
        
        const allSet = new Set([...Object.keys(curMap), ...Object.keys(srcMap)]);
        allSet.forEach(code => {
          const delta = (curMap[code] || 0) - (srcMap[code] || 0);
          if (delta !== 0) {
            changesArr.push({ code, qty: delta });
            allCodesList.push(code);
          }
        });
      }

      processSlots(currentSlots, sourceSlots, mainChanges);
      processSlots(currentSideSlots, sourceSideSlots, sideChanges);

      // Resolve names and factions
      const nameMap = {};
      const factionMap = {};
      const uniqueCodes = [...new Set(allCodesList)];
      
      if (uniqueCodes.length > 0) {
         const cardRows = await db('card').leftJoin('faction', 'card.faction_id', 'faction.id').whereIn('card.code', uniqueCodes).select('card.code', 'card.name', 'faction.code as faction_code');
         for (const r of cardRows) {
           nameMap[r.code] = r.name;
           factionMap[r.code] = r.faction_code;
         }
         if (locale !== 'en') {
           const transNames = await db('card_translation').whereIn('code', uniqueCodes).where('locale', locale).select('code', 'name');
           for (const t of transNames) {
             if (t.name) nameMap[t.code] = t.name;
           }
         }
      }

      const formatChanges = (changesArr) => changesArr.map(c => ({
        code: c.code,
        name: nameMap[c.code] || c.code,
        faction_code: factionMap[c.code] || 'basic',
        qty: c.qty
      }));

      // Add to history if there are real changes, or if it's the very first iteration
      if (mainChanges.length > 0 || sideChanges.length > 0) {
        history.push({
          id: current.id,
          date: current.date_creation,
          version: current.version,
          changes: formatChanges(mainChanges),
          sideChanges: formatChanges(sideChanges)
        });
      }

      currentId = sourceId;
    }

    return res.json({ ok: true, data: history });
  } catch (err) {
    console.error('GET /decklist/:id/history error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1G. Deck Public - Récupérer un deck si partagé par l'utilisateur
router.get(['/deck/:id.json', '/deck/:id'], async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deck = await db('deck as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.character_id', 'c.id')
      .select('d.*', 'u.is_share_decks', 'c.name as character_name', 'c.code as character_code')
      .where('d.id', id)
      .first();

    if (!deck || !deck.user_id || !deck.is_share_decks) {
      return res.status(403).json({ error: 'Access denied to this object.' });
    }

    const slotsRows = await db('deckslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .select('s.quantity', 'c.code')
      .where('s.deck_id', id);

    const slotsMap = {};
    const sortedRows = slotsRows.sort((a, b) => a.code.localeCompare(b.code));
    for (const row of sortedRows) slotsMap[row.code] = row.quantity;

    const legacyFormat = {
      id: deck.id,
      name: deck.name,
      date_creation: formatLegacyDate(deck.date_creation),
      date_update: formatLegacyDate(deck.date_update),
      description_md: deck.description_md,
      user_id: null, // Legacy behavior (Privacy)
      hero_code: deck.character_code,
      hero_name: deck.character_name,
      signature_code: deck.signature,
      slots: slotsMap,
      ignoreDeckLimitSlots: null,
      version: `${deck.major_version}.${deck.minor_version}`,
      exiles: deck.exiles,
      meta: deck.meta,
      tags: deck.tags || ""
    };

    return res.json(legacyFormat);
  } catch (err) {
    console.error('GET /deck/:id error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1G. Supprimer un deck public (decklist)
router.delete('/user/:userId/decklists/:deckId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);

    const decklist = await db('decklist').where({ id: deckId, user_id: userId }).first();
    if (!decklist) return res.status(404).json({ error: 'Decklist not found or unauthorized' });

    let decklistIds = [deckId];
    if (decklist.parent_deck_id) {
      const chain = await db('decklist')
        .where({ parent_deck_id: decklist.parent_deck_id, user_id: userId })
        .select('id');
      decklistIds = [...new Set(chain.map(d => d.id))];
    }

    // Clear constraints on private decks that link to this decklist chain
    await db('deck').whereIn('parent_decklist_id', decklistIds).update({ parent_decklist_id: null });
    await db('deck').whereIn('next_deck', decklistIds).update({ next_deck: null });

    // Clear constraints on other decklists that link to these decklists
    await db('decklist').whereIn('next_deck', decklistIds).update({ next_deck: null });
    await db('decklist').whereIn('previous_deck', decklistIds).update({ previous_deck: null });
    await db('decklist').whereIn('precedent_decklist_id', decklistIds).update({ precedent_decklist_id: null });

    // Delete child records for the entire chain
    await db('comment').whereIn('decklist_id', decklistIds).delete();
    await db('favorite').whereIn('decklist_id', decklistIds).delete();
    await db('vote').whereIn('decklist_id', decklistIds).delete();
    await db('decklistslot').whereIn('decklist_id', decklistIds).delete();
    await db('sidedecklistslot').whereIn('decklist_id', decklistIds).delete();
    
    // Finally, delete the decklist chain itself
    await db('decklist').whereIn('id', decklistIds).delete();

    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /user/:userId/decklists/:deckId error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1H. Cloner un deck public (decklist -> deck privé)
router.post('/user/:userId/decklists/:deckId/clone', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);

    const decklist = await db('decklist').where({ id: deckId }).first();
    if (!decklist) return res.status(404).json({ error: 'Decklist not found' });

    // Parse meta to correctly inject the origin
    let metaObj = {};
    if (decklist.meta) {
      try { metaObj = typeof decklist.meta === 'string' ? JSON.parse(decklist.meta) : decklist.meta; }
      catch(e) {}
    }
    metaObj.cloned_from_decklist_id = deckId;

    const [newId] = await db('deck').insert({
      user_id: userId,
      character_id: decklist.card_id,
      last_pack_id: decklist.last_pack_id,
      uuid: require('crypto').randomUUID(),
      name: `${decklist.name} (Clone)`,
      description_md: decklist.description_md,
      problem: decklist.problem || '',
      tags: decklist.tags || '',
      major_version: 0,
      minor_version: 1,
      // On ne l'accroche plus jamais aux chaînes privées historiques lors d'un clone.
      previous_deck: null,
      parent_decklist_id: null,
      xp: decklist.xp || 0,
      xp_spent: decklist.xp_spent || 0,
      xp_adjustment: decklist.xp_adjustment || 0,
      upgrades: decklist.upgrades || 0,
      exiles: decklist.exiles || '',
      meta: JSON.stringify(metaObj),
      date_creation: db.fn.now(),
      date_update: db.fn.now(),
    });

    const slots = await db('decklistslot').where({ decklist_id: deckId });
    if (slots.length > 0) {
      await db('deckslot').insert(slots.map(({ id, decklist_id, ...s }) => ({ ...s, deck_id: newId })));
    }

    const sideSlotsCopy = await db('sidedecklistslot').where({ decklist_id: deckId });
    if (sideSlotsCopy.length > 0) {
      await db('sidedeckslot').insert(sideSlotsCopy.map(({ id, decklist_id, ...s }) => ({ ...s, deck_id: newId })));
    }

    return res.json({ ok: true, data: { id: newId } });
  } catch (err) {
    console.error('POST /user/:userId/decklists/:deckId/clone error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1I. Voter ou Favori pour un deck public
router.post('/decks/:id/vote', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const { user_id, type } = req.body; // type: 'vote' | 'favorite'
    if (!user_id || !type) return res.status(400).json({ error: 'Missing user_id or type' });

    const decklist = await db('decklist').where('id', deckId).first();
    if (!decklist) return res.status(404).json({ error: 'Decklist not found' });
    if (String(decklist.user_id) === String(user_id)) {
      return res.status(403).json({ error: 'You cannot vote on your own deck.' });
    }

    const table = type === 'vote' ? 'vote' : 'favorite';
    const nbField = type === 'vote' ? 'nb_votes' : 'nb_favorites';

    const existing = await db(table).where({ decklist_id: deckId, user_id }).first();
    let action = '';

    if (existing) {
      await db(table).where({ decklist_id: deckId, user_id }).delete();
      await db('decklist').where('id', deckId).decrement(nbField, 1);
      action = 'removed';
    } else {
      await db(table).insert({ decklist_id: deckId, user_id });
      await db('decklist').where('id', deckId).increment(nbField, 1);
      action = 'added';
    }

    const updated = await db('decklist').where('id', deckId).select(nbField).first();
    return res.json({ ok: true, action, [nbField]: updated[nbField] });
  } catch (err) {
    console.error('POST /decks/:id/vote error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1J. Obtenir les commentaires d'un deck public
router.get('/decks/:id/comments', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const comments = await db('comment as c')
      .join('user as u', 'c.user_id', 'u.id')
      .where('c.decklist_id', deckId)
      .andWhere('c.is_hidden', 0)
      .select('c.id', 'c.text as text_md', 'c.date_creation', 'u.id as user_id', 'u.username as author_name', 'u.reputation as author_reputation')
      .orderBy('c.date_creation', 'asc');
    
    return res.json({ ok: true, data: comments });
  } catch (err) {
    console.error('GET /decks/:id/comments error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 1K. Ajouter un commentaire à un deck public
router.post('/decks/:id/comments', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const { user_id, text_md } = req.body;
    if (!user_id || !text_md || !text_md.trim()) return res.status(400).json({ error: 'Missing parameters' });

    const decklist = await db('decklist').where('id', deckId).first();
    if (!decklist) return res.status(404).json({ error: 'Decklist not found' });

    const [commentId] = await db('comment').insert({
      decklist_id: deckId,
      user_id,
      text: text_md.trim(),
      date_creation: new Date(),
      is_hidden: 0
    });

    await db('decklist').where('id', deckId).increment('nb_comments', 1);

    const newComment = await db('comment as c')
      .join('user as u', 'c.user_id', 'u.id')
      .where('c.id', commentId)
      .select('c.id', 'c.text as text_md', 'c.date_creation', 'u.id as user_id', 'u.username as author_name', 'u.reputation as author_reputation')
      .first();

    return res.json({ ok: true, data: newComment });
  } catch (err) {
    console.error('POST /decks/:id/comments error', err);
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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
        'd.tags', 'd.meta', 'd.problem', 'd.parent_decklist_id',
        'c.code as hero_code', 'c.name as hero_name',
        'f.code as faction_code',
        'p.code as pack_code', 'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status', 'p.visibility as pack_visibility'
      )
      .orderBy('d.date_update', 'desc')
      .limit(limit)
      .offset(offset);

    const decks = (await query).map(row => ({
      ...row,
      version: `${row.major_version}.${row.minor_version}`,
      hero_imagesrc: resolveImage(row.hero_code, row.pack_code)
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
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .select('d.*', 'c.name as hero_name', 'c.code as hero_code', 'c.meta as hero_meta', 'c.octgn_id as hero_octgn_id', 'p.code as pack_code', 'p.visibility as pack_visibility')
      .where('d.id', deckId)
      .andWhere('d.user_id', userId)
      .first();

    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    deck.version = `${deck.major_version}.${deck.minor_version}`;

    const slots = await fetchDeckSlots('deckslot', 'deck_id', deckId, locale);
    const side_slots = await fetchDeckSlots('sidedeckslot', 'deck_id', deckId, locale);
    const packs_required = new Set(slots.map(s => s.pack_code).filter(Boolean)).size;
    const heroCode = deck.hero_code || '';
    const alterEgoCode = heroCode.endsWith('b') ? heroCode.slice(0, -1) + 'a' : heroCode.endsWith('a') ? heroCode.slice(0, -1) + 'b' : heroCode + 'b';
    const hero_special_cards = await fetchHeroSpecialCards(heroCode, locale);

    return res.json({
      ok: true, data: {
        ...deck,
        slots,
        side_slots,
        packs_required,
        hero_special_cards,
        hero_imagesrc: resolveImage(heroCode, deck.pack_code),
        alter_ego_imagesrc: resolveImage(alterEgoCode, deck.pack_code),
      }
    });
  } catch (err) {
    console.error('GET /user/:userId/decks/:deckId error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 2C. Sauvegarder les slots d'un deck privé (avec versioning et deckchange)
router.put('/user/:userId/decks/:deckId/slots', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Vérification propriété
    const deck = await db('deck').where({ id: deckId, user_id: userId }).first();
    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    const { slots, sideSlots, name, meta, tags, description_md } = req.body; // slots: [{ code, quantity }], sideSlots?: [...], name?: string, meta?: object, tags?: string
    if (!Array.isArray(slots)) return res.status(400).json({ error: 'Invalid slots' });
    const newName = (typeof name === 'string' && name.trim()) ? name.trim() : null;
    const newMeta = (meta && typeof meta === 'object') ? JSON.stringify(meta) : null;
    const newTags = (typeof tags === 'string') ? tags.trim() : null;
    const newDesc = (typeof description_md === 'string') ? description_md : undefined;

    // Ne garder que les slots avec quantity > 0
    const toInsert = slots.filter(s => s.quantity > 0);
    const sideToInsert = Array.isArray(sideSlots) ? sideSlots.filter(s => s.quantity > 0) : [];

    // Anciens slots pour calculer le diff
    const oldSlotRows = await db('deckslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .where('s.deck_id', deckId)
      .select('c.code', 's.quantity');
    const oldMap = Object.fromEntries(oldSlotRows.map(r => [r.code, r.quantity]));

    // Résoudre card_id depuis les codes (anciens + nouveaux + side deck)
    const allCodes = [...new Set([...toInsert.map(s => s.code), ...sideToInsert.map(s => s.code), ...Object.keys(oldMap)])];
    const cardRows = allCodes.length > 0
      ? await db('card').whereIn('code', allCodes).select('id', 'code')
      : [];
    const codeToId = Object.fromEntries(cardRows.map(r => [r.code, r.id]));

    // Calcul du diff main deck (variation)
    const newMap = Object.fromEntries(toInsert.map(s => [s.code, s.quantity]));
    const variation = {};
    const allCodeSet = new Set([...Object.keys(oldMap), ...Object.keys(newMap)]);
    for (const code of allCodeSet) {
      const diff = (newMap[code] || 0) - (oldMap[code] || 0);
      if (diff !== 0) variation[code] = diff;
    }

    // Calcul du diff side deck — stocké avec préfixe "side:"
    const oldSideRows = await db('sidedeckslot as s')
      .join('card as c', 's.card_id', 'c.id')
      .where('s.deck_id', deckId)
      .select('c.code', 's.quantity');
    const oldSideMap = Object.fromEntries(oldSideRows.map(r => [r.code, r.quantity]));
    const newSideMap = Object.fromEntries(sideToInsert.map(s => [s.code, s.quantity]));
    const allSideCodeSet = new Set([...Object.keys(oldSideMap), ...Object.keys(newSideMap)]);
    for (const code of allSideCodeSet) {
      const diff = (newSideMap[code] || 0) - (oldSideMap[code] || 0);
      if (diff !== 0) variation[`side:${code}`] = diff;
    }

    const hasChanges = Object.keys(variation).length > 0;

    // Version courante du deck
    const currentMajor = deck.major_version || 0;
    const currentMinor = deck.minor_version || 0;
    const versionString = `${currentMajor}.${currentMinor}`;
    const nextMinor = currentMinor + 1;

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

      // Side deck slots
      await trx('sidedeckslot').where('deck_id', deckId).delete();
      if (sideToInsert.length > 0) {
        const sideRows = sideToInsert
          .filter(s => codeToId[s.code])
          .map(s => ({ deck_id: deckId, card_id: codeToId[s.code], quantity: s.quantity }));
        if (sideRows.length > 0) await trx('sidedeckslot').insert(sideRows);
      }

      // Insérer un deckchange si des modifications ont eu lieu
      if (hasChanges) {
        await trx('deckchange').insert({
          deck_id: deckId,
          date_creation: new Date(),
          variation: JSON.stringify(variation),
          is_saved: true,
          version: versionString,
        });
        // Incrémenter minor_version
        await trx('deck').where('id', deckId).update({
          date_update: new Date(),
          minor_version: nextMinor,
          ...(newName ? { name: newName } : {}),
          ...(newMeta !== null ? { meta: newMeta } : {}),
          ...(newTags !== null ? { tags: newTags } : {}),
          ...(newDesc !== undefined ? { description_md: newDesc } : {}),
        });
      } else {
        await trx('deck').where('id', deckId).update({
          date_update: new Date(),
          ...(newName ? { name: newName } : {}),
          ...(newMeta !== null ? { meta: newMeta } : {}),
          ...(newTags !== null ? { tags: newTags } : {}),
          ...(newDesc !== undefined ? { description_md: newDesc } : {}),
        });
      }
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('PUT /user/:userId/decks/:deckId/slots error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// 2D. Historique des changements d'un deck privé
router.get('/user/:userId/decks/:deckId/history', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);
    const locale = (req.query.locale || 'en').toLowerCase();
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const deck = await db('deck').where({ id: deckId, user_id: userId }).first();
    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    const changes = await db('deckchange')
      .where('deck_id', deckId)
      .orderBy('date_creation', 'desc')
      .select('id', 'date_creation', 'variation', 'is_saved', 'version');

    if (changes.length === 0) return res.json({ ok: true, data: [] });

    // Gère deux formats :
    //   Ancien PHP : [{"code": qty}, {"code": qty}]  — [ajouts, suppressions]
    //   Nouveau    : {"code": qty_delta}
    function parseVariation(raw) {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!v) return {};
      if (Array.isArray(v)) {
        const added = (v[0] && !Array.isArray(v[0])) ? v[0] : {};
        const removed = (v[1] && !Array.isArray(v[1])) ? v[1] : {};
        const merged = {};
        for (const [c, q] of Object.entries(added)) merged[c] = Number(q) || 0;
        for (const [c, q] of Object.entries(removed)) merged[c] = -Number(q) || 0;
        return merged;
      }
      return v;
    }

    // Collecter tous les codes via parseVariation (en retirant le préfixe "side:")
    const allCodes = new Set();
    for (const c of changes) {
      try {
        Object.keys(parseVariation(c.variation)).forEach(key => {
          const code = key.startsWith('side:') ? key.slice(5) : key;
          allCodes.add(code);
        });
      } catch (_) { }
    }

    // Charger les noms et factions de cartes
    const codeList = [...allCodes];
    let nameMap = {};
    let factionMap = {};
    if (codeList.length > 0) {
      const cardRows = await db('card as c')
        .leftJoin('faction as f', 'c.faction_id', 'f.id')
        .whereIn('c.code', codeList)
        .select('c.code', 'c.name', 'f.code as faction_code');
      for (const r of cardRows) {
        nameMap[r.code] = r.name;
        factionMap[r.code] = r.faction_code || 'basic';
      }
      if (locale !== 'en') {
        const transNames = await db('card_translation')
          .whereIn('code', codeList)
          .where('locale', locale)
          .select('code', 'name');
        for (const t of transNames) {
          if (t.name) nameMap[t.code] = t.name;
        }
      }
    }

    function buildEntries(pairs) {
      return pairs
        .filter(([, qty]) => Number(qty) !== 0)
        .map(([code, qty]) => ({
          code,
          qty: Number(qty),
          name: nameMap[code] || code,
          faction_code: factionMap[code] || 'basic',
        }))
        .sort((a, b) => {
          if (a.qty > 0 && b.qty <= 0) return -1;
          if (a.qty <= 0 && b.qty > 0) return 1;
          return a.name.localeCompare(b.name);
        });
    }

    const data = changes.map(c => {
      let entries = [];
      let sideEntries = [];
      try {
        const v = parseVariation(c.variation);
        const mainPairs = Object.entries(v)
          .filter(([key]) => !key.startsWith('side:'))
          .map(([code, qty]) => [code, qty]);
        const sidePairs = Object.entries(v)
          .filter(([key]) => key.startsWith('side:'))
          .map(([key, qty]) => [key.slice(5), qty]);
        entries = buildEntries(mainPairs);
        sideEntries = buildEntries(sidePairs);
      } catch (_) { }
      return {
        id: c.id,
        date: c.date_creation,
        version: c.version || '0.0',
        is_saved: c.is_saved,
        changes: entries,
        sideChanges: sideEntries,
      };
    });

    return res.json({ ok: true, data });
  } catch (err) {
    console.error('GET /user/:userId/decks/:deckId/history error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ── DELETE /user/:userId/decks/:deckId ──────────────────────────────────────
router.delete('/user/:userId/decks/:deckId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);

    const deck = await db('deck').where({ id: deckId, user_id: userId }).first();
    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    await db('sidedeckslot').where({ deck_id: deckId }).delete();
    await db('deckslot').where({ deck_id: deckId }).delete();
    await db('deckchange').where({ deck_id: deckId }).delete();
    
    // Si le deck fait partie d'une équipe, le retirer
    if (await db.schema.hasTable('team_deck')) {
      await db('team_deck').where({ deck_id: deckId }).delete();
    }

    // Détacher les versions (clones ou upgrades) avant de supprimer pour éviter les erreurs FK
    await db('deck').where({ previous_deck: deckId }).update({ previous_deck: null });
    await db('deck').where({ next_deck: deckId }).update({ next_deck: null });
    
    // Détacher les decklists publics publiés avant de supprimer le deck privé
    await db('decklist').where({ parent_deck_id: deckId }).update({ parent_deck_id: null });

    await db('deck').where({ id: deckId }).delete();

    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /user/:userId/decks/:deckId error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ── POST /user/:userId/decks/:deckId/clone ──────────────────────────────────
router.post('/user/:userId/decks/:deckId/clone', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);

    const deck = await db('deck').where({ id: deckId, user_id: userId }).first();
    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    const [newId] = await db('deck').insert({
      user_id: deck.user_id,
      character_id: deck.character_id,
      last_pack_id: deck.last_pack_id,
      uuid: require('crypto').randomUUID(),
      name: `${deck.name} (Clone)`,
      description_md: deck.description_md,
      problem: deck.problem,
      tags: deck.tags,
      major_version: 0,
      minor_version: 1,
      previous_deck: null,
      parent_decklist_id: null,
      xp: deck.xp,
      xp_spent: deck.xp_spent,
      xp_adjustment: deck.xp_adjustment,
      upgrades: deck.upgrades,
      exiles: deck.exiles,
      meta: deck.meta,
      date_creation: db.fn.now(),
      date_update: db.fn.now(),
    });

    const slots = await db('deckslot').where({ deck_id: deckId });
    if (slots.length > 0) {
      await db('deckslot').insert(slots.map(({ id: _sid, ...s }) => ({ ...s, deck_id: newId })));
    }

    const sideSlotsCopy = await db('sidedeckslot').where({ deck_id: deckId });
    if (sideSlotsCopy.length > 0) {
      await db('sidedeckslot').insert(sideSlotsCopy.map(({ id: _sid, ...s }) => ({ ...s, deck_id: newId })));
    }

    return res.json({ ok: true, data: { id: newId } });
  } catch (err) {
    console.error('POST /user/:userId/decks/:deckId/clone error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ── PUT /user/:userId/decks/:deckId/publish ─────────────────────────────────
router.put('/user/:userId/decks/:deckId/publish', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const deckId = parseInt(req.params.deckId, 10);

    const deck = await db('deck').where({ id: deckId, user_id: userId }).first();
    if (!deck) return res.status(404).json({ error: 'Deck not found or unauthorized' });

    // Check hero pack visibility
    const heroCard = await db('card').join('pack', 'card.pack_id', 'pack.id').where('card.id', deck.character_id).select('pack.visibility').first();
    if (heroCard && heroCard.visibility === 'false') {
      return res.status(403).json({ error: 'Cannot publish a deck with a hero from a private pack.' });
    }

    const newMajor = deck.major_version > 0 ? deck.major_version + 1 : 1;
    const newVersion = `${newMajor}.0`;
    const nameCanonical = (deck.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Le decklist précédent est STRICTEMENT la version publique précédente de ce workspace privé exact.
    const predecessorId = deck.parent_decklist_id || null;

    // Si on avait cloné un deck public au tout début, on stocke ce lien "Inspiration/Dérivé" dans precedent_decklist_id
    let derivedFromDecklistId = null;
    let deckMeta = {};
    if (deck.meta) {
      try { deckMeta = typeof deck.meta === 'string' ? JSON.parse(deck.meta) : deck.meta; } catch(e){}
    }
    if (deckMeta && deckMeta.cloned_from_decklist_id) {
      derivedFromDecklistId = parseInt(deckMeta.cloned_from_decklist_id, 10);
    }

    // Créer l'entrée dans decklist
    const [newDecklistId] = await db('decklist').insert({
      user_id: userId,
      card_id: deck.character_id,
      last_pack_id: deck.last_pack_id,
      parent_deck_id: deckId,
      previous_deck: predecessorId,
      precedent_decklist_id: derivedFromDecklistId,
      uuid: require('crypto').randomUUID(),
      name: deck.name,
      name_canonical: nameCanonical,
      description_md: deck.description_md || '',
      description_html: '',
      tags: deck.tags || '',
      xp: deck.xp || 0,
      xp_spent: deck.xp_spent || 0,
      xp_adjustment: deck.xp_adjustment || 0,
      exiles: deck.exiles || null,
      meta: deck.meta || null,
      version: newVersion,
      nb_votes: 0,
      nb_favorites: 0,
      nb_comments: 0,
      date_creation: db.fn.now(),
      date_update: db.fn.now(),
    });

    // Copier les slots deck → decklistslot
    const slots = await db('deckslot').where({ deck_id: deckId });
    if (slots.length > 0) {
      await db('decklistslot').insert(slots.map(s => ({
        decklist_id: newDecklistId,
        card_id: s.card_id,
        quantity: s.quantity,
        ignore_deck_limit: s.ignore_deck_limit,
      })));
    }

    // Copier les side slots deck → sidedecklistslot
    const sideSlots = await db('sidedeckslot').where({ deck_id: deckId });
    if (sideSlots.length > 0) {
      await db('sidedecklistslot').insert(sideSlots.map(s => ({
        decklist_id: newDecklistId,
        card_id: s.card_id,
        quantity: s.quantity,
      })));
    }

    // Incrémenter la version majeure du deck privé et pointer vers le deck public publié
    await db('deck').where({ id: deckId }).update({
      major_version: newMajor,
      minor_version: 0,
      parent_decklist_id: newDecklistId,
      date_update: db.fn.now(),
    });

    // Chaîner l'ancienne version avec la nouvelle pour la cacher de la liste publique
    if (predecessorId) {
      await db('decklist').where({ id: predecessorId }).update({
        next_deck: newDecklistId
      });
    }

    return res.json({ ok: true, data: { decklistId: newDecklistId, version: newVersion } });
  } catch (err) {
    console.error('PUT /user/:userId/decks/:deckId/publish error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ── POST /user/:userId/decks ─ Créer un nouveau deck vide ──────────────────
router.post('/user/:userId/decks', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { hero_code, name } = req.body;
    if (!hero_code) return res.status(400).json({ error: 'hero_code is required' });

    const heroCard = await db('card').where('code', hero_code).select('id', 'name', 'set_id').first();
    if (!heroCard) return res.status(400).json({ error: `Hero card not found: ${hero_code}` });

    const deckName = (typeof name === 'string' && name.trim())
      ? name.trim()
      : `${heroCard.name} Deck`;

    const [deckId] = await db('deck').insert({
      user_id: userId,
      character_id: heroCard.id,
      uuid: require('crypto').randomUUID(),
      name: deckName,
      description_md: '',
      tags: '',
      meta: null,
      major_version: 0,
      minor_version: 1,
      xp: 0,
      xp_spent: 0,
      xp_adjustment: 0,
      date_creation: db.fn.now(),
      date_update: db.fn.now(),
    });

    // Insert all signature/player cards from the hero's set
    // (replicate PHP initbuildAction: not hidden, not hero/alter_ego type, not encounter faction)
    if (heroCard.set_id) {
      const setCards = await db('card as c')
        .join('type as t', 'c.type_id', 't.id')
        .join('faction as f', 'c.faction_id', 'f.id')
        .where('c.set_id', heroCard.set_id)
        .where('c.hidden', 0)
        .whereNotIn('t.code', ['hero', 'alter_ego'])
        .where('f.code', '!=', 'encounter')
        .select('c.id', 'c.deck_limit');
      if (setCards.length > 0) {
        await db('deckslot').insert(
          setCards.map(card => ({ deck_id: deckId, card_id: card.id, quantity: card.deck_limit || 1 }))
        );
      }
    }

    return res.json({ ok: true, data: { id: deckId } });
  } catch (err) {
    console.error('POST /user/:userId/decks error', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ── POST /user/:userId/decks/import ─────────────────────────────────────────
router.post('/user/:userId/decks/import', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, investigator_code, meta, slots, tags } = req.body;

    if (!name || !investigator_code || !slots || typeof slots !== 'object') {
      return res.status(400).json({ error: 'Missing required fields for import (name, investigator_code, slots).' });
    }

    // Prepare transaction
    return await db.transaction(async trx => {
      // 1. Validate Hero
      const heroCode = String(investigator_code).trim().padStart(5, '0');
      const heroCard = await trx('card').where('code', heroCode).select('id', 'name').first();
      if (!heroCard) {
        return res.status(400).json({
          error: `Hero card not found in your local database for code: ${heroCode}. Ensure the local DB is up to date.`
        });
      }

      // 2. Validate Slots
      const slotCodes = Object.keys(slots).map(code => String(code).trim().padStart(5, '0'));
      const dbCards = await trx('card').whereIn('code', slotCodes).select('id', 'code', 'name');
      const dbCardsMap = Object.fromEntries(dbCards.map(c => [c.code, c.id]));

      const missingCodes = slotCodes.filter(code => !dbCardsMap[code]);
      if (missingCodes.length > 0) {
        return res.status(400).json({
          error: `Cannot import. Some cards are missing from the local database: ${missingCodes.join(', ')}.`
        });
      }

      // 3. Create Deck
      const [deckId] = await trx('deck').insert({
        user_id: userId,
        character_id: heroCard.id,
        uuid: require('crypto').randomUUID(),
        name: name,
        description_md: '',
        tags: tags || '',
        meta: meta ? JSON.stringify(meta) : null,
        major_version: 0,
        minor_version: 1,
        xp: 0,
        xp_spent: 0,
        xp_adjustment: 0,
        date_creation: db.fn.now(),
        date_update: db.fn.now(),
      });

      // 4. Insert Slots
      const slotInserts = Object.entries(slots).map(([code, quantity]) => {
        const paddedCode = String(code).padStart(5, '0');
        const cardId = dbCardsMap[paddedCode];
        return {
          deck_id: deckId,
          card_id: cardId,
          quantity: parseInt(quantity, 10),
          ignore_deck_limit: 0
        };
      });

      if (slotInserts.length > 0) {
        await trx('deckslot').insert(slotInserts);
      }

      return res.json({ ok: true, data: { id: deckId } });
    });
  } catch (err) {
    console.error('POST /user/:userId/decks/import error', err);
    return res.status(500).json({ error: 'Internal server error during import.' });
  }
});

// ==========================================
// 6. ARCHETYPES (Load .o8d files)
// ==========================================
router.get('/archetypes', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const PROJECT_ROOT = path.resolve(__dirname, '../../../');
    const bundlesStaticDir = fs.existsSync(path.join(PROJECT_ROOT, 'web', 'bundles'))
      ? path.join(PROJECT_ROOT, 'web', 'bundles')
      : path.join(PROJECT_ROOT, 'bundles');
    const archetypesDir = path.join(bundlesStaticDir, 'archetypes');

    if (!fs.existsSync(archetypesDir)) {
      return res.json({ ok: true, data: [] });
    }

    const files = fs.readdirSync(archetypesDir);
    const archetypes = files.filter(f => f.endsWith('.o8d'));
    
    return res.json({ ok: true, data: archetypes });
  } catch (err) {
    console.error('GET /archetypes error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;