/**
 * Faction model — Data Access Layer for the `faction` table.
 */
const db = require('../config/database');

const factionTranslationCache = {};

async function findAll(locale = 'en') {
  let q = db('faction as f')
    .select('f.code', 'f.is_primary', 'f.octgn_id');

  if (locale && locale !== 'en') {
    q = q.leftJoin('ext_translations as et', function() {
      this.on('f.id', '=', 'et.foreign_key')
          .andOn('et.object_class', '=', db.raw('?', ['AppBundle\\Entity\\Faction']))
          .andOn('et.field', '=', db.raw('?', ['name']))
          .andOn('et.locale', '=', db.raw('?', [locale.toLowerCase()]));
    })
    .select(db.raw('COALESCE(et.content, f.name) as name'));
  } else {
    q = q.select('f.name');
  }

  return q.orderBy('f.id', 'asc');
}

async function getTranslationMap(locale) {
  const loc = (locale || 'en').toLowerCase();
  if (loc === 'en') {
    if (!factionTranslationCache['en']) {
      const rows = await findAll('en');
      factionTranslationCache['en'] = Object.fromEntries(rows.map(r => [r.code, r.name]));
    }
    return factionTranslationCache['en'];
  }

  if (!factionTranslationCache[loc]) {
    const rows = await findAll(loc);
    factionTranslationCache[loc] = Object.fromEntries(rows.map(r => [r.code, r.name]));
  }
  return factionTranslationCache[loc];
}

module.exports = { findAll, getTranslationMap };
