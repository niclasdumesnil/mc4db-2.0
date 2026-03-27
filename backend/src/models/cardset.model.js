/**
 * Cardset model — Data Access Layer for the `Cardset` table.
 */
const db = require('../config/database');

const cardsetTranslationCache = {};

async function findAll(locale = 'en') {
  let q = db('Cardset as cs')
    .select('cs.code');

  if (locale && locale !== 'en') {
    q = q.leftJoin('ext_translations as et', function() {
      this.on('cs.id', '=', 'et.foreign_key')
          .andOn('et.object_class', '=', db.raw('?', ['AppBundle\\Entity\\Cardset']))
          .andOn('et.field', '=', db.raw('?', ['name']))
          .andOn('et.locale', '=', db.raw('?', [locale.toLowerCase()]));
    })
    .select(db.raw('COALESCE(et.content, cs.name) as name'));
  } else {
    q = q.select('cs.name');
  }

  return q.orderBy('cs.id', 'asc');
}

async function getTranslationMap(locale) {
  const loc = (locale || 'en').toLowerCase();
  if (loc === 'en') {
    if (!cardsetTranslationCache['en']) {
      const rows = await findAll('en');
      cardsetTranslationCache['en'] = Object.fromEntries(rows.map(r => [r.code, r.name]));
    }
    return cardsetTranslationCache['en'];
  }

  if (!cardsetTranslationCache[loc]) {
    const rows = await findAll(loc);
    cardsetTranslationCache[loc] = Object.fromEntries(rows.map(r => [r.code, r.name]));
  }
  return cardsetTranslationCache[loc];
}

module.exports = { findAll, getTranslationMap };
