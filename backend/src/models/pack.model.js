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

module.exports = { findAll, findByCode, countCardsByPack };
