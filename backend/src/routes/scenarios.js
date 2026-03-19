/**
 * /api/public/scenarios route
 *
 *   GET /api/public/scenarios/
 *     → Returns the scenario list from the `scenario` DB table, enriched with
 *       pack names.  Donators see all scenarios; non-donators only see rows
 *       where visibility != 0 (0 = private).
 *
 * Query params:
 *   user_id — optional; when provided and the user is a donator, private
 *             scenarios (visibility=0) are included.
 */
const { Router } = require('express');
const { isUserDonator } = require('../utils/donatorUtils');

const router = Router();

/**
 * GET /api/public/scenarios
 */
router.get('/scenarios', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const donator = await isUserDonator(user_id);

    const db = require('../config/database');

    // Fetch scenarios from DB; non-donators only see visibility != 0
    let query = db('scenario').select(
      'id',
      'code',
      'villain_set_code',
      'title',
      'nbmodular',
      'modular_set_codes',
      'difficulty',
      'text',
      'creator',
      'date_creation',
      'visibility'
    );

    if (!donator) {
      query = query.whereNot('visibility', 0);
    }

    const scenarios = await query.orderBy('id', 'asc');

    // Parse modular_set_codes JSON strings and collect all pack codes
    const packCodes = new Set();
    for (const s of scenarios) {
      if (s.villain_set_code) packCodes.add(s.villain_set_code);
      if (s.modular_set_codes) {
        try {
          const codes = typeof s.modular_set_codes === 'string'
            ? JSON.parse(s.modular_set_codes)
            : s.modular_set_codes;
          if (Array.isArray(codes)) {
            codes.forEach(c => packCodes.add(c));
            s._modular_codes = codes;
          } else {
            s._modular_codes = [];
          }
        } catch {
          s._modular_codes = [];
        }
      } else {
        s._modular_codes = [];
      }
    }

    // Fetch pack names from DB
    let packNameMap = {};
    if (packCodes.size > 0) {
      const rows = await db('pack')
        .whereIn('code', [...packCodes])
        .select('code', 'name');
      for (const r of rows) {
        packNameMap[r.code] = r.name;
      }
      // Also look up in cardset table — villain/modular set codes live here
      const csRows = await db('Cardset')
        .whereIn('code', [...packCodes])
        .select('code', 'name');
      for (const r of csRows) {
        packNameMap[r.code] = r.name;
      }
    }

    // Enrich and return
    const enriched = scenarios.map(s => ({
      id: s.id,
      code: s.code || null,
      title: s.title || s.villain_set_code || `Scenario #${s.id}`,
      villain_set_code: s.villain_set_code || null,
      villain_name: s.villain_set_code ? (packNameMap[s.villain_set_code] || s.villain_set_code) : null,
      modular_set_codes: s._modular_codes,
      modular_names: s._modular_codes.reduce((acc, code) => {
        acc[code] = packNameMap[code] || code;
        return acc;
      }, {}),
      nbmodular: s.nbmodular || 0,
      difficulty: typeof s.difficulty === 'number' ? s.difficulty : 0,
      text: s.text || null,
      creator: s.creator || 'FFG',
      date_creation: s.date_creation || null,
      // true = public, false = private (donators only)
      visibility: s.visibility !== 0,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/cardsets
 * Returns all cardsets, optionally filtered by type code.
 *
 * Query params:
 *   type — cardset type code (e.g. 'standard', 'expert', 'modular', 'villain', ...)
 */
router.get('/cardsets', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const { type } = req.query;

    // Start from `card` and join Cardset/Cardsettype so we only return sets
    // that actually have cards in the database (not phantom empty sets).
    let q = db('card as c')
      .join('Cardset as cs', 'c.set_id', 'cs.id')
      .leftJoin('Cardsettype as ct', 'cs.cardset_type', 'ct.id')
      .distinct(
        'cs.id',
        'cs.code',
        'cs.name',
        'ct.code as type_code',
        'ct.name as type_name'
      )
      .orderBy('cs.name', 'asc');

    if (type) {
      q = q.where('ct.code', type);
    }

    const rows = await q;
    res.json(rows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      type_code: r.type_code || null,
      type_name: r.type_name || null,
    })));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/sets
 * Returns all card sets grouped by type (hero, villain, modular, standard, expert)
 * and by creator (official vs fan-made).
 * Nemesis sets are excluded from the main lists but their codes are annotated
 * on their parent hero set via `nemesis_code`.
 *
 * Query params:
 *   user_id — optional; donators see private sets
 */
router.get('/sets', async (req, res, next) => {
  try {
    const db = require('../config/database');
    const { isUserDonator } = require('../utils/donatorUtils');
    const { user_id } = req.query;
    const donator = await isUserDonator(user_id);

    // Query all cardsets that have at least one card, with pack creator info.
    // Use MIN() instead of ANY_VALUE() for compatibility with older MySQL versions.
    const rows = await db('Cardset as cs')
      .leftJoin('Cardsettype as ct', 'cs.cardset_type', 'ct.id')
      .leftJoin('card as c', 'c.set_id', 'cs.id')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .groupBy('cs.id', 'cs.code', 'cs.name', 'cs.parent_code', 'ct.code', 'ct.name')
      .havingRaw('COUNT(c.id) > 0')
      .select(
        'cs.id',
        'cs.code',
        'cs.name',
        'cs.parent_code',
        db.raw('MIN(ct.code) as type_code'),
        db.raw('MIN(ct.name) as type_name'),
        db.raw('COALESCE(cs.creator, MAX(p.creator)) as creator'),
        db.raw('MAX(p.visibility) as visibility'),
        db.raw('MIN(p.environment) as pack_environment'),
        db.raw('COALESCE(cs.status, MIN(p.status)) as pack_status'),
        db.raw('MIN(p.date_release) as pack_date_release'),
        db.raw('COUNT(DISTINCT c.id) as card_count')
      )
      .orderBy('cs.name', 'asc');

    // Non-donators cannot see sets from private packs
    const visible = donator
      ? rows
      : rows.filter(r => (r.visibility || 'true') !== 'false');

    // Build nemesis map: hero_set_code → nemesis_set_code
    // 1. Use explicit parent_code if available
    // 2. Fall back to convention: nemesis code = hero_code + '_nemesis'
    const nemesisMap = {};
    // First pass: build a set of all known nemesis codes
    const allNemesisCodes = new Set(
      visible.filter(r => (r.type_code || '').toLowerCase() === 'nemesis').map(r => r.code)
    );
    for (const row of visible) {
      if ((row.type_code || '').toLowerCase() === 'nemesis') {
        const parentCode = row.parent_code || row.code.replace(/_nemesis$/, '');
        nemesisMap[parentCode] = row.code;
      }
    }

    // Types to include in the main groups (nemesis handled separately)
    const INCLUDED_TYPES = ['hero', 'villain', 'modular', 'standard', 'expert'];

    const result = {
      official: { hero: [], villain: [], modular: [], standard: [], expert: [] },
      fanmade:  { hero: [], villain: [], modular: [], standard: [], expert: [] },
    };

    for (const row of visible) {
      const typeCode = (row.type_code || '').toLowerCase();
      if (typeCode === 'nemesis') continue; // skip — attached to hero sets
      if (!INCLUDED_TYPES.includes(typeCode)) continue;

      // NULL creator means official (FFG)
      const isOfficial = !row.creator;
      const group = isOfficial ? 'official' : 'fanmade';

      result[group][typeCode].push({
        id: row.id,
        code: row.code,
        name: row.name,
        type_code: row.type_code,
        type_name: row.type_name,
        nemesis_code: nemesisMap[row.code] || null,
        creator: row.creator || 'FFG',
        card_count: Number(row.card_count) || 0,
        pack_environment: row.pack_environment || null,
        pack_status: row.pack_status || null,
        pack_date_release: row.pack_date_release || null,
        private: row.visibility === 'false' || row.visibility === false,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
