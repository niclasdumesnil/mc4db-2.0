/**
 * Pack model — Data Access Layer over the `pack` table.
 */
const db = require('../config/database');

const PACK_COLUMNS = [
  'p.id',
  'p.code',
  'p.name',
  'p.position',
  'p.size',
  'p.date_release',
  'p.date_creation',
  'p.date_update',
  'p.cgdb_id',
  'p.status',
  'p.creator',
  'p.theme',
  'p.visibility',
  'p.language',
  'p.environment',
  'pt.code as pack_type',
  'pt.name as pack_type_name',
];

function baseQuery() {
  return db('pack as p')
    .leftJoin('Packtype as pt', 'p.pack_type', 'pt.id')
    .select(PACK_COLUMNS);
}

async function findAll() {
  return baseQuery().orderBy('p.position', 'asc');
}

async function findByCode(code) {
  return baseQuery().where('p.code', code).first();
}

/**
 * Count known (non-hidden) cards per pack.
 */
async function countCardsByPack() {
  const rows = await db('card')
    .select('pack_id')
    .count('* as cnt')
    .where('hidden', false)
    .groupBy('pack_id');
  const map = {};
  for (const r of rows) map[r.pack_id] = r.cnt;
  return map;
}

const packTranslationCache = {};

async function getTranslationMap(locale) {
  const loc = (locale || 'en').toLowerCase();
  
  // For english, we could map from baseQuery but typically we just return an empty map 
  // and handle fallback. Let's do a full map to be consistent.
  if (loc === 'en') {
    if (!packTranslationCache['en']) {
      const rows = await findAll();
      packTranslationCache['en'] = Object.fromEntries(rows.map(r => [r.code, r.name]));
    }
    return packTranslationCache['en'];
  }

  if (!packTranslationCache[loc]) {
    const rows = await db('pack as p')
      .leftJoin('ext_translations as et', function() {
        this.on('p.id', '=', 'et.foreign_key')
            .andOn('et.object_class', '=', db.raw('?', ['AppBundle\\Entity\\Pack']))
            .andOn('et.field', '=', db.raw('?', ['name']))
            .andOn('et.locale', '=', db.raw('?', [loc]));
      })
      .select('p.code', db.raw('COALESCE(et.content, p.name) as name'));
    
    packTranslationCache[loc] = Object.fromEntries(rows.map(r => [r.code, r.name]));
  }
  return packTranslationCache[loc];
}

module.exports = { findAll, findByCode, countCardsByPack, getTranslationMap };
