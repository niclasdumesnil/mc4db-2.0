/**
 * Type model — Data Access Layer for the `type` table.
 */
const db = require('../config/database');

const typeTranslationCache = {};

async function findAll(locale = 'en') {
  let q = db('type as t')
    .select('t.code');

  if (locale && locale !== 'en') {
    q = q.leftJoin('ext_translations as et', function() {
      this.on('t.id', '=', 'et.foreign_key')
          .andOn('et.object_class', '=', db.raw('?', ['AppBundle\\Entity\\Type']))
          .andOn('et.field', '=', db.raw('?', ['name']))
          .andOn('et.locale', '=', db.raw('?', [locale.toLowerCase()]));
    })
    .select(db.raw('COALESCE(et.content, t.name) as name'));
  } else {
    q = q.select('t.name');
  }

  return q.orderBy('t.id', 'asc');
}

async function getTranslationMap(locale) {
  const loc = (locale || 'en').toLowerCase();
  if (loc === 'en') {
    if (!typeTranslationCache['en']) {
      const rows = await findAll('en');
      typeTranslationCache['en'] = Object.fromEntries(rows.map(r => [r.code, r.name]));
    }
    return typeTranslationCache['en'];
  }

  if (!typeTranslationCache[loc]) {
    const rows = await findAll(loc);
    typeTranslationCache[loc] = Object.fromEntries(rows.map(r => [r.code, r.name]));
  }
  return typeTranslationCache[loc];
}

module.exports = { findAll, getTranslationMap };
