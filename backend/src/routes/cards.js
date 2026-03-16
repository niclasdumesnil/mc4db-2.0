/**
 * /api/public/cards routes
 *
 *   GET /api/public/cards/             → all cards
 *   GET /api/public/card/:code.json    → single card by code
 *   GET /api/public/cards/:pack.json   → cards by pack code
 */
const { Router } = require('express');
const Card = require('../models/Card');
const { serializeCard, resolveImage } = require('../utils/cardSerializer');
const { isUserDonator } = require('../utils/donatorUtils');

const router = Router();

/** Translation fields that may be overlaid from the card_translation table */
const TRANS_FIELDS = ['name', 'subname', 'text', 'flavor', 'traits', 'errata'];

/**
 * Apply card_translation overlay to a serialized card object.
 * Mutates `card` in-place and returns it.
 */
async function applyTranslation(card, locale) {
  if (!locale || locale === 'en') return card;
  const trans = await Card.findTranslation(card.code, locale);
  if (!trans) return card;
  for (const f of TRANS_FIELDS) {
    if (trans[f] != null && trans[f] !== '') card[f] = trans[f];
  }
  return card;
}

/**
 * GET /api/public/cards/
 *
 * Query params:
 *   user_id  — optional; donators can see cards from private packs (visibility="false")
 */
router.get('/cards/', async (req, res, next) => {
  try {
    const locale = (req.query.locale || 'en').toLowerCase();
    const { user_id } = req.query;
    const donator = await isUserDonator(user_id);
    const rows = await Card.findAll();
    let cards = rows.map((r) => serializeCard(r, { api: true }));
    // Filter out cards from private packs for non-donators
    if (!donator) {
      cards = cards.filter(c => (c.visibility || 'true') !== 'false');
    }
    if (locale !== 'en' && cards.length > 0) {
      const db = require('../config/database');
      const codes = cards.map((c) => c.code);
      const transRows = await db('card_translation')
        .whereIn('code', codes)
        .where('locale', locale)
        .select(['code', ...TRANS_FIELDS]);
      const transMap = Object.fromEntries(transRows.map((t) => [t.code, t]));
      for (const card of cards) {
        const t = transMap[card.code];
        if (!t) continue;
        for (const f of TRANS_FIELDS) {
          if (t[f] != null && t[f] !== '') card[f] = t[f];
        }
      }
    }
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/cards/attributes
 * Returns distinct types, subtypes, and illustrators for building filter dropdowns.
 */
router.get('/cards/attributes', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const [types, subtypes, rawIllustrators] = await Promise.all([
      db('type').select('code', 'name').orderBy('name'),
      db('subtype').select('code', 'name').orderBy('name'),
      db('card').distinct('illustrator').whereNotNull('illustrator').whereNot('illustrator', '').pluck('illustrator'),
    ]);

    // Split multi-illustrator strings (separated by "," or "&") into individual names
    const illustratorSet = new Set();
    for (const raw of rawIllustrators) {
      for (const part of raw.split(/[,&]/)) {
        const name = part.trim();
        if (name) illustratorSet.add(name);
      }
    }
    const illustrators = [...illustratorSet].sort((a, b) => a.localeCompare(b));

    res.json({ types, subtypes, illustrators });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/heroes
 * Returns all hero cards (type_code = 'hero', code ending in 'b') with pack metadata.
 * Useful for the deck-creation hero picker.
 *
 * Query params:
 *   user_id — optional; donators see cards from private packs
 */
router.get('/heroes', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const { user_id } = req.query;
    const donator = await isUserDonator(user_id);

    let q = db('card as c')
      .join('type as t', 'c.type_id', 't.id')
      .join('pack as p', 'c.pack_id', 'p.id')
      .leftJoin(db.raw("card as cb ON cb.code = CONCAT(LEFT(c.code, LENGTH(c.code)-1), 'b')"))
      .leftJoin(db.raw("card as cc ON cc.code = CONCAT(LEFT(c.code, LENGTH(c.code)-1), 'c')"))
      .where('t.code', 'hero')
      .whereRaw("c.code LIKE '%a'")
      .whereRaw("c.code = (SELECT MIN(c2.code) FROM card c2 JOIN type t2 ON c2.type_id = t2.id WHERE t2.code = 'hero' AND c2.pack_id = c.pack_id AND c2.name = c.name AND c2.code LIKE '%a')")
      .where('c.hidden', 0)
      .select([
        'c.id', 'c.code', 'c.name',
        'p.id as pack_id', 'p.code as pack_code', 'p.name as pack_name',
        'p.creator as pack_creator', 'p.environment as pack_environment',
        'p.status as pack_status', 'p.theme as pack_theme',
        'p.visibility as pack_visibility',
        'p.date_release as pack_date_release',
        'cb.code as code_b',
        'cc.code as code_c',
      ])
      .orderBy('c.name', 'asc');

    if (!donator) {
      q = q.where(function () {
        this.where('p.visibility', '!=', 'false').orWhereNull('p.visibility');
      });
    }

    const rows = await q;
    const heroes = rows.map(row => ({
      code: row.code,
      name: row.name,
      pack_id: row.pack_id,
      pack_code: row.pack_code,
      pack_name: row.pack_name,
      pack_creator: row.pack_creator || 'FFG',
      pack_environment: row.pack_environment || null,
      pack_status: row.pack_status || null,
      pack_theme: row.pack_theme || 'Marvel',
      pack_visibility: row.pack_visibility || 'true',
      pack_date_release: row.pack_date_release
        ? (row.pack_date_release instanceof Date
            ? row.pack_date_release.toISOString().slice(0, 10)
            : String(row.pack_date_release).slice(0, 10))
        : null,
      imagesrc: resolveImage(row.code, row.pack_code),
      alt_images: [
        row.code_b ? resolveImage(row.code_b, row.pack_code) : null,
        row.code_c ? resolveImage(row.code_c, row.pack_code) : null,
      ].filter(Boolean),
    }));

    return res.json({ ok: true, data: heroes });
  } catch (err) {
    next(err);
  }
});

const VALID_OPS = { '=': '=', 'lt': '<', 'lte': '<=', 'gt': '>', 'gte': '>=' };

/**
 * GET /api/public/cards/search
 * Filterable, paginated card search.
 *
 * Query params:
 *   name, text, flavor  — LIKE matches
 *   pack                — pack code exact match
 *   cardset             — cardset (encounter set) code exact match (card.set_id → cardset.code)
 *   faction             — faction code (matches faction or faction2)
 *   type                — type code exact
 *   subtype             — subtype code exact
 *   traits              — LIKE match on traits string
 *   illustrator         — exact illustrator name
 *   is_unique           — 1 or 0
 *   cost / cost_op      — numeric comparison (op: =, lt, lte, gt, gte)
 *   qty / qty_op        — same for quantity
 *   atk / atk_op        — attack
 *   thw / thw_op        — thwart
 *   def / def_op        — defense
 *   health / health_op  — health
 *   res_physical / res_mental / res_energy / res_wild — minimum resource icons (>=)
 *   page, limit         — pagination (default page=1, limit=50, max limit=200)
 *   sort                — name (default) | pack | cost | faction
 */
router.get('/cards/search', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const {
      name, text, flavor, pack, cardset, faction, type, subtype,
      traits, illustrator, is_unique,
      cost_op = '=', cost, cost_op2 = '=', cost2,
      qty_op = '=', qty, qty_op2 = '=', qty2,
      atk_op = '=', atk, atk_op2 = '=', atk2,
      thw_op = '=', thw, thw_op2 = '=', thw2,
      def_op = '=', def, def_op2 = '=', def2,
      health_op = '=', health, health_op2 = '=', health2,
      boost_op = '=', boost, boost_op2 = '=', boost2,
      scheme_op = '=', scheme, scheme_op2 = '=', scheme2,
      res_physical, res_mental, res_energy, res_wild,
      page = 1, limit = 50, sort = 'name', order = 'asc',
      hide_duplicates, show_alt_art, creator_filter, current_only,
      locale = 'en',
      user_id,
      theme,
      include_hidden,
    } = req.query;

    const donator = await isUserDonator(user_id);

    const dir = order === 'desc' ? 'desc' : 'asc';

    let q = db('card as c')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .leftJoin('type as t', 'c.type_id', 't.id')
      .leftJoin('subtype as st', 'c.subtype_id', 'st.id')
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('faction as f2', 'c.faction2_id', 'f2.id')
      .leftJoin('cardset as cs', 'c.set_id', 'cs.id')
      .select([
        'c.code', 'c.name', 'c.cost', 'c.position', 'c.hidden', 'c.is_unique',
        'c.traits', 'c.quantity', 'c.deck_limit', 'c.alt_art', 'c.octgn_id', db.raw('IF(c.duplicate_id IS NOT NULL, 1, 0) as is_duplicate'),
        'c.text', 'c.real_text',
        'c.resource_energy', 'c.resource_physical', 'c.resource_mental', 'c.resource_wild',
        'c.attack', 'c.thwart', 'c.defense', 'c.health', 'c.scheme', 'c.boost', 'c.boost_star',
        'c.attack_star', 'c.thwart_star', 'c.defense_star', 'c.health_star', 'c.scheme_star', 'c.health_per_hero', 'c.health_per_group',
        'c.stage',
        'c.base_threat', 'c.base_threat_fixed', 'c.base_threat_per_group',
        'c.escalation_threat', 'c.escalation_threat_fixed', 'c.escalation_threat_star',
        'c.threat', 'c.threat_fixed', 'c.threat_per_group', 'c.threat_star',
        'p.code as pack_code', 'p.name as pack_name',
        'p.creator as pack_creator', 'p.status as pack_status', 'p.environment as pack_environment',
        't.code as type_code', 't.name as type_name',
        'st.code as subtype_code', 'st.name as subtype_name',
        'f.code as faction_code', 'f.name as faction_name',
        'f2.code as faction2_code', 'f2.name as faction2_name',
        'cs.code as card_set_code', 'cs.name as card_set_name',
      ]);

    if (locale && locale !== 'en') {
      q = q.leftJoin('card_translation as ct', function() {
        this.on('c.code', '=', 'ct.code').andOn('ct.locale', '=', db.raw('?', [locale]));
      });
    }

    // By default exclude hidden cards (back-faces of double-sided cards);
    // pass include_hidden=1 to get all sides (e.g. for main scheme threat data).
    if (include_hidden !== '1') {
      q = q.where('c.hidden', 0);
    }

    if (name) {
      if (locale && locale !== 'en') q = q.whereRaw('COALESCE(ct.name, c.name) LIKE ?', [`%${name}%`]);
      else q = q.whereRaw('c.name LIKE ?', [`%${name}%`]);
    }
    if (text) {
      if (locale && locale !== 'en') q = q.whereRaw('(COALESCE(ct.text, c.text) LIKE ? OR COALESCE(ct.real_text, c.real_text) LIKE ?)', [`%${text}%`, `%${text}%`]);
      else q = q.whereRaw('(c.text LIKE ? OR c.real_text LIKE ?)', [`%${text}%`, `%${text}%`]);
    }
    if (flavor) {
      if (locale && locale !== 'en') q = q.whereRaw('COALESCE(ct.flavor, c.flavor) LIKE ?', [`%${flavor}%`]);
      else q = q.whereRaw('c.flavor LIKE ?', [`%${flavor}%`]);
    }
    if (pack) q = q.where('p.code', pack);
    if (cardset) q = q.where('cs.code', cardset);
    if (faction) q = q.where(function () { this.where('f.code', faction).orWhere('f2.code', faction); });
    // Multi-faction filter: `factions` param is a comma-separated list → OR logic
    const factionsList = req.query.factions ? req.query.factions.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!faction && factionsList.length > 0) {
      q = q.where(function () {
        factionsList.forEach(fc => {
          this.orWhere(function () { this.where('f.code', fc).orWhere('f2.code', fc); });
        });
      });
    }
    if (type) q = q.where('t.code', type);
    if (subtype) q = q.where('st.code', subtype);
    if (traits) {
      if (locale && locale !== 'en') q = q.whereRaw('COALESCE(ct.traits, c.traits) LIKE ?', [`%${traits}%`]);
      else q = q.whereRaw('c.traits LIKE ?', [`%${traits}%`]);
    }
    if (illustrator) q = q.whereRaw('c.illustrator LIKE ?', [`%${illustrator}%`]);
    if (is_unique === '1') q = q.where('c.is_unique', 1);
    if (is_unique === '0') q = q.where('c.is_unique', 0);

    const applyNumeric = (field, val, op, val2, op2) => {
      let queryFn = q;
      if (val !== undefined && val !== '') {
        const sqlOp = VALID_OPS[op] || '=';
        queryFn = queryFn.where(field, sqlOp, parseInt(val, 10));
      }
      if (val2 !== undefined && val2 !== '') {
        const sqlOp2 = VALID_OPS[op2] || '=';
        queryFn = queryFn.where(field, sqlOp2, parseInt(val2, 10));
      }
      return queryFn;
    };
    q = applyNumeric('c.cost', cost, cost_op, cost2, cost_op2);
    q = applyNumeric('c.quantity', qty, qty_op, qty2, qty_op2);
    q = applyNumeric('c.attack', atk, atk_op, atk2, atk_op2);
    q = applyNumeric('c.thwart', thw, thw_op, thw2, thw_op2);
    q = applyNumeric('c.defense', def, def_op, def2, def_op2);
    q = applyNumeric('c.health', health, health_op, health2, health_op2);
    q = applyNumeric('c.boost', boost, boost_op, boost2, boost_op2);
    q = applyNumeric('c.scheme', scheme, scheme_op, scheme2, scheme_op2);

    if (res_physical) q = q.where('c.resource_physical', '>=', parseInt(res_physical, 10));
    if (res_mental) q = q.where('c.resource_mental', '>=', parseInt(res_mental, 10));
    if (res_energy) q = q.where('c.resource_energy', '>=', parseInt(res_energy, 10));
    if (res_wild) q = q.where('c.resource_wild', '>=', parseInt(res_wild, 10));

    if (hide_duplicates === '1') {
      if (show_alt_art === '1') {
        // Keep alt-art duplicates even when hiding regular duplicates
        q = q.where(function () {
          this.whereNull('c.duplicate_id').orWhere('c.alt_art', 1);
        });
      } else {
        q = q.whereNull('c.duplicate_id');
      }
    }
    if (creator_filter === 'official') {
      if (current_only === '1') {
        q = q.where(function() {
          this.whereNull('p.creator').andWhere('p.environment', 'current');
        });
      } else {
        q = q.whereNull('p.creator');
      }
    } else if (current_only === '1') {
       q = q.where(function() {
          this.where('p.environment', 'current').orWhereNotNull('p.creator');
       });
    }
    if (creator_filter === 'fanmade') q = q.whereNotNull('p.creator');
    // Theme filter: absent/null theme is treated as 'Marvel' (case-insensitive)
    if (theme && theme !== 'all') {
      const themeLower = theme.toLowerCase();
      q = q.where(function () {
        if (themeLower === 'marvel') {
          // NULL/empty themes default to Marvel
          this.whereRaw('LOWER(p.theme) = ?', [themeLower])
            .orWhereNull('p.theme')
            .orWhere('p.theme', '');
        } else {
          this.whereRaw('LOWER(p.theme) = ?', [themeLower]);
        }
      });
    }
    // Filter out cards from private packs for non-donators
    if (!donator) q = q.where(function () { this.whereNull('p.visibility').orWhereNot('p.visibility', 'false'); });

    if (sort === 'pack') q = q.orderBy([{ column: 'p.position', order: dir }, { column: 'c.position', order: dir }]);
    else if (sort === 'cost') q = q.orderByRaw(`c.cost IS NULL, c.cost ${dir.toUpperCase()}, c.name ASC`);
    else if (sort === 'faction') q = q.orderBy([{ column: 'f.name', order: dir }, { column: 'c.name', order: dir }]);
    else q = q.orderBy('c.name', dir); // default: name

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));

    const statsRow = await q.clone().clearSelect().clearOrder().select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(c.quantity) as sum_total'),
      db.raw('SUM(p.creator IS NULL) as official'),
      db.raw('SUM(IF(p.creator IS NULL, c.quantity, 0)) as sum_official'),
      db.raw('SUM(p.creator IS NOT NULL) as fanmade'),
      db.raw('SUM(IF(p.creator IS NOT NULL, c.quantity, 0)) as sum_fanmade'),
      db.raw('SUM(c.duplicate_id IS NOT NULL) as duplicates'),
      db.raw('SUM(IF(c.duplicate_id IS NOT NULL, c.quantity, 0)) as sum_duplicates'),
      db.raw('SUM(IF(p.creator IS NULL AND p.environment = "current", 1, 0)) as current_official'),
      db.raw('SUM(IF(p.creator IS NULL AND p.environment = "current", c.quantity, 0)) as sum_current_official'),
      db.raw('SUM(c.alt_art = 1) as alt_arts'),
    ).first();
    const totalItems = Number(statsRow?.total ?? 0);
    const totalSumItems = Number(statsRow?.sum_total ?? 0);
    const totalOfficial = Number(statsRow?.official ?? 0);
    const totalSumOfficial = Number(statsRow?.sum_official ?? 0);
    const totalFanmade = Number(statsRow?.fanmade ?? 0);
    const totalSumFanmade = Number(statsRow?.sum_fanmade ?? 0);
    const totalDuplicates = Number(statsRow?.duplicates ?? 0);
    const totalSumDuplicates = Number(statsRow?.sum_duplicates ?? 0);
    const totalCurrentOfficial = Number(statsRow?.current_official ?? 0);
    const totalSumCurrentOfficial = Number(statsRow?.sum_current_official ?? 0);
    const totalAltArts = Number(statsRow?.alt_arts ?? 0);
    const totalPages = Math.ceil(totalItems / limitNum);

    const rows = await q.offset((pageNum - 1) * limitNum).limit(limitNum);

    // Apply translations if a non-English locale is requested
    const localeClean = (locale || 'en').toLowerCase();
    let cards = rows;
    if (localeClean !== 'en' && rows.length > 0) {
      const codes = rows.map(r => r.code);
      const transRows = await db('card_translation')
        .whereIn('code', codes)
        .where('locale', localeClean)
        .select(['code', ...TRANS_FIELDS]);
      const transMap = Object.fromEntries(transRows.map(t => [t.code, t]));
      cards = rows.map(r => {
        const t = transMap[r.code];
        if (!t) return r;
        const updated = { ...r };
        for (const f of TRANS_FIELDS) {
          if (t[f] != null && t[f] !== '') updated[f] = t[f];
        }
        return updated;
      });
    }

    const { resolveImage } = require('../utils/cardSerializer');
    const finalCards = cards.map(c => ({
      ...c,
      imagesrc: resolveImage(c.code, c.pack_code, '', localeClean)
    }));

    res.json({
      cards: finalCards,
      meta: {
        total_items: totalItems,
        total_sum_items: totalSumItems,
        total_pages: Math.ceil(totalItems / limitNum),
        total_official: totalOfficial,
        total_sum_official: totalSumOfficial,
        total_fanmade: totalFanmade,
        total_sum_fanmade: totalSumFanmade,
        total_duplicates: totalDuplicates,
        total_sum_duplicates: totalSumDuplicates,
        total_current_official: totalCurrentOfficial,
        total_sum_current_official: totalSumCurrentOfficial,
        total_alt_arts: totalAltArts,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/card/:code[.json]
 */
router.get(['/card/:code.json', '/card/:code'], async (req, res, next) => {
  try {
    const code = req.params.code;
    const locale = (req.query.locale || 'en').toLowerCase();
    const row = await Card.findByCode(code);
    if (!row) {
      return res.status(404).json({ error: { status: 404, message: `Card ${code} not found` } });
    }

    // Resolve linked card
    let linkedCard = null;
    if (row.linked_to_code) {
      const linkedRow = await Card.findByCode(row.linked_to_code);
      if (linkedRow) {
        linkedCard = serializeCard(linkedRow, { api: true, locale });
        await applyTranslation(linkedCard, locale);
      }
    }

    // Resolve duplicated_by
    const duplicatedBy = await Card.findDuplicateCodes(row.id);

    const card = serializeCard(row, { api: true, linkedCard, duplicatedBy, locale });
    await applyTranslation(card, locale);
    res.json(card);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/cards/:pack[.json]
 */
router.get(['/cards/:pack.json', '/cards/:pack'], async (req, res, next) => {
  try {
    const packCode = req.params.pack;
    const locale = (req.query.locale || 'en').toLowerCase();
    const { user_id } = req.query;
    const donator = await isUserDonator(user_id);
    const rows = await Card.findByPackCode(packCode);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: { status: 404, message: `No cards found for pack ${packCode}` } });
    }
    // If the pack is private and user is not a donator, deny access
    if (!donator && rows[0] && (rows[0].pack_visibility || 'true') === 'false') {
      return res.status(403).json({ error: { status: 403, message: 'Access restricted to donators' } });
    }
    const cards = await Promise.all(
      rows.map(async (r) => {
        const card = serializeCard(r, { api: true, locale });
        await applyTranslation(card, locale);
        return card;
      })
    );
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/faq/:code[.json]
 */
router.get(['/faq/:code.json', '/faq/:code'], async (req, res, next) => {
  try {
    const code = req.params.code;
    const db = require('../config/database');
    const Card = require('../models/Card');
    const row = await Card.findByCode(code);
    if (!row) {
      return res.status(404).json({ error: { status: 404, message: `Card ${code} not found` } });
    }

    const reviews = await db('review')
      .where({ card_id: row.id, faq: 1 })
      .orderBy('nb_votes', 'desc')
      .select('text_html', 'text_md', 'date_update');

    const faqs = reviews.map(r => ({
      code: code,
      html: r.text_html,
      text: r.text_md,
      updated: r.date_update
    }));

    res.json(faqs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
