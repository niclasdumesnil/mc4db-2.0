/**
 * /api/public/cards routes
 *
 *   GET /api/public/cards/             → all cards
 *   GET /api/public/card/:code.json    → single card by code
 *   GET /api/public/cards/:pack.json   → cards by pack code
 */
const { Router } = require('express');
const Card = require('../models/Card');
const { serializeCard } = require('../utils/cardSerializer');

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
 */
router.get('/cards/', async (req, res, next) => {
  try {
    const rows = await Card.findAll();
    const cards = rows.map((r) => serializeCard(r, { api: true }));
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

const VALID_OPS = { '=': '=', 'lt': '<', 'lte': '<=', 'gt': '>', 'gte': '>=' };

/**
 * GET /api/public/cards/search
 * Filterable, paginated card search.
 *
 * Query params:
 *   name, text, flavor  — LIKE matches
 *   pack                — pack code exact match
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
      name, text, flavor, pack, faction, type, subtype,
      traits, illustrator, is_unique,
      cost_op = '=', cost,
      qty_op = '=', qty,
      atk_op = '=', atk,
      thw_op = '=', thw,
      def_op = '=', def,
      health_op = '=', health,
      res_physical, res_mental, res_energy, res_wild,
      page = 1, limit = 50, sort = 'name', order = 'asc',
      hide_duplicates, creator_filter,
      locale = 'en',
    } = req.query;

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
        'c.traits', 'c.quantity', db.raw('IF(c.duplicate_id IS NOT NULL, 1, 0) as is_duplicate'),
        'c.resource_energy', 'c.resource_physical', 'c.resource_mental', 'c.resource_wild',
        'c.attack', 'c.thwart', 'c.defense', 'c.health',
        'p.code as pack_code', 'p.name as pack_name',
        'p.creator as pack_creator', 'p.status as pack_status', 'p.environment as pack_environment',
        't.code as type_code', 't.name as type_name',
        'st.code as subtype_code', 'st.name as subtype_name',
        'f.code as faction_code', 'f.name as faction_name',
        'f2.code as faction2_code', 'f2.name as faction2_name',
        'cs.code as card_set_code', 'cs.name as card_set_name',
      ])
      .where('c.hidden', 0);

    if (name)       q = q.whereRaw('c.name LIKE ?', [`%${name}%`]);
    if (text)       q = q.whereRaw('(c.text LIKE ? OR c.real_text LIKE ?)', [`%${text}%`, `%${text}%`]);
    if (flavor)     q = q.whereRaw('c.flavor LIKE ?', [`%${flavor}%`]);
    if (pack)       q = q.where('p.code', pack);
    if (faction)    q = q.where(function () { this.where('f.code', faction).orWhere('f2.code', faction); });
    // Multi-faction filter: `factions` param is a comma-separated list → OR logic
    const factionsList = req.query.factions ? req.query.factions.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!faction && factionsList.length > 0) {
      q = q.where(function () {
        factionsList.forEach(fc => {
          this.orWhere(function () { this.where('f.code', fc).orWhere('f2.code', fc); });
        });
      });
    }
    if (type)       q = q.where('t.code', type);
    if (subtype)    q = q.where('st.code', subtype);
    if (traits)     q = q.whereRaw('c.traits LIKE ?', [`%${traits}%`]);
    if (illustrator) q = q.whereRaw('c.illustrator LIKE ?', [`%${illustrator}%`]);
    if (is_unique === '1') q = q.where('c.is_unique', 1);
    if (is_unique === '0') q = q.where('c.is_unique', 0);

    const applyNumeric = (field, val, op) => {
      if (val === undefined || val === '') return q;
      const sqlOp = VALID_OPS[op] || '=';
      return q.where(field, sqlOp, parseInt(val, 10));
    };
    q = applyNumeric('c.cost', cost, cost_op);
    q = applyNumeric('c.quantity', qty, qty_op);
    q = applyNumeric('c.attack', atk, atk_op);
    q = applyNumeric('c.thwart', thw, thw_op);
    q = applyNumeric('c.defense', def, def_op);
    q = applyNumeric('c.health', health, health_op);

    if (res_physical) q = q.where('c.resource_physical', '>=', parseInt(res_physical, 10));
    if (res_mental)   q = q.where('c.resource_mental',   '>=', parseInt(res_mental,   10));
    if (res_energy)   q = q.where('c.resource_energy',   '>=', parseInt(res_energy,   10));
    if (res_wild)     q = q.where('c.resource_wild',     '>=', parseInt(res_wild,     10));

    if (hide_duplicates === '1') q = q.whereNull('c.duplicate_id');
    if (creator_filter === 'official') q = q.whereNull('p.creator');
    if (creator_filter === 'fanmade')  q = q.whereNotNull('p.creator');

    if (sort === 'pack')    q = q.orderBy([{ column: 'p.position', order: dir }, { column: 'c.position', order: dir }]);
    else if (sort === 'cost') q = q.orderByRaw(`c.cost IS NULL, c.cost ${dir.toUpperCase()}, c.name ASC`);
    else if (sort === 'faction') q = q.orderBy([{ column: 'f.name', order: dir }, { column: 'c.name', order: dir }]);
    else q = q.orderBy('c.name', dir); // default: name

    // Pagination
    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));

    const statsRow = await q.clone().clearSelect().clearOrder().select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(p.creator IS NULL) as official'),
      db.raw('SUM(p.creator IS NOT NULL) as fanmade'),
      db.raw('SUM(c.duplicate_id IS NOT NULL) as duplicates'),
    ).first();
    const totalItems   = Number(statsRow?.total      ?? 0);
    const totalOfficial = Number(statsRow?.official   ?? 0);
    const totalFanmade  = Number(statsRow?.fanmade    ?? 0);
    const totalDuplicates = Number(statsRow?.duplicates ?? 0);
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

    res.json({
      cards,
      meta: {
        page: pageNum, limit: limitNum, total_pages: totalPages, total_items: totalItems,
        total_official: totalOfficial, total_fanmade: totalFanmade, total_duplicates: totalDuplicates,
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
    const rows = await Card.findByPackCode(packCode);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: { status: 404, message: `No cards found for pack ${packCode}` } });
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

module.exports = router;
