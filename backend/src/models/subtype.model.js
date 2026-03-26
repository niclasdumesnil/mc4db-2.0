/**
 * Subtype model — Data Access Layer for the `subtype` table.
 */
const db = require('../config/database');

const subtypeTranslationCache = {};

async function findAll(locale = 'en') {
  let q = db('subtype as s')
    .select('s.code');

  if (locale && locale !== 'en') {
    q = q.leftJoin('ext_translations as et', function() {
      this.on('s.id', '=', 'et.foreign_key')
          .andOn('et.object_class', '=', db.raw('?', ['AppBundle\\Entity\\Subtype']))
          .andOn('et.field', '=', db.raw('?', ['name']))
          .andOn('et.locale', '=', db.raw('?', [locale.toLowerCase()]));
    })
    .select(db.raw('COALESCE(et.content, s.name) as name'));
  } else {
    q = q.select('s.name');
  }

  return q.orderBy('s.id', 'asc');
}

async function getTranslationMap(locale) {
  const loc = (locale || 'en').toLowerCase();
  if (loc === 'en') {
    if (!subtypeTranslationCache['en']) {
      const rows = await findAll('en');
      subtypeTranslationCache['en'] = Object.fromEntries(rows.map(r => [r.code, r.name]));
    }
    return subtypeTranslationCache['en'];
  }

  if (!subtypeTranslationCache[loc]) {
    const rows = await findAll(loc);
    subtypeTranslationCache[loc] = Object.fromEntries(rows.map(r => [r.code, r.name]));
  }
  return subtypeTranslationCache[loc];
}

module.exports = { findAll, getTranslationMap };
