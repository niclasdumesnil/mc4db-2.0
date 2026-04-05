/**
 * Card model — Data Access Layer for the `card` table and related joins.
 */
const db = require('../config/database');

function buildAdvancedSearch(queryStr, fields) {
  return function() {
    if (!queryStr) return;
    const normalized = queryStr.replace(/\b(ou|or)\b/gi, '|').replace(/\b(et|and)\b/gi, '&').replace(/\b(sauf|not)\b/gi, '!');
    const tokenRegex = /("[^"]*"|[^|&\s]+|\||&|!)/g;
    let match;
    const orGroups = [];
    let currentAndGroup = [];
    let isNot = false;

    while ((match = tokenRegex.exec(normalized)) !== null) {
      let token = match[0];
      if (token === '|') {
        if (currentAndGroup.length > 0) { orGroups.push(currentAndGroup); currentAndGroup = []; }
        isNot = false; continue;
      }
      if (token === '&') { continue; }
      if (token === '!') { isNot = true; continue; }
      
      if (token.startsWith('!')) { isNot = true; token = token.substring(1); }
      else if (token.startsWith('-')) { isNot = true; token = token.substring(1); }
      
      if (token.startsWith('"') && token.endsWith('"')) token = token.substring(1, token.length - 1);
      if (token.trim() !== '') {
        currentAndGroup.push({ phrase: token, exclude: isNot });
      }
      isNot = false;
    }
    if (currentAndGroup.length > 0) orGroups.push(currentAndGroup);

    if (orGroups.length === 0) return;

    for (const group of orGroups) {
      if (group.length === 0) continue;
      this.orWhere(function() {
        for (const term of group) {
           const likeOp = term.exclude ? 'NOT LIKE' : 'LIKE';
           this.where(function() {
             for (let i = 0; i < fields.length; i++) {
               const field = fields[i];
               const sql = `${field} ${likeOp} ?`;
               const bindings = [`%${term.phrase}%`];
               if (term.exclude) {
                 if (i === 0) this.whereRaw(sql, bindings);
                 else this.andWhereRaw(sql, bindings);
               } else {
                 if (i === 0) this.whereRaw(sql, bindings);
                 else this.orWhereRaw(sql, bindings);
               }
             }
           });
        }
      });
    }
  };
}

const BASE_CARD_COLUMNS = [
  'c.id', 'c.pack_id', 'c.code', 'c.name', 'c.real_name', 'c.subname', 'c.cost',
  'c.cost_per_hero', 'c.text', 'c.real_text', 'c.boost', 'c.boost_star', 'c.quantity',
  'c.position', 'c.set_position', 'c.resource_energy', 'c.resource_physical',
  'c.resource_mental', 'c.resource_wild', 'c.hand_size', 'c.health', 'c.health_per_group',
  'c.health_per_hero', 'c.health_star', 'c.thwart', 'c.thwart_cost', 'c.thwart_star',
  'c.scheme', 'c.scheme_star', 'c.attack', 'c.attack_cost', 'c.attack_star', 'c.defense',
  'c.defense_cost', 'c.defense_star', 'c.recover', 'c.recover_cost', 'c.recover_star',
  'c.base_threat', 'c.base_threat_fixed', 'c.base_threat_per_group', 'c.escalation_threat',
  'c.escalation_threat_fixed', 'c.escalation_threat_star', 'c.scheme_crisis',
  'c.scheme_acceleration', 'c.scheme_amplify', 'c.scheme_hazard', 'c.threat',
  'c.threat_fixed', 'c.threat_per_group', 'c.threat_star', 'c.deck_limit', 'c.stage',
  'c.traits', 'c.real_traits', 'c.meta', 'c.deck_requirements', 'c.deck_options',
  'c.restrictions', 'c.flavor', 'c.illustrator', 'c.is_unique', 'c.hidden', 'c.permanent',
  'c.double_sided', 'c.back_text', 'c.back_flavor', 'c.back_name', 'c.octgn_id', 'c.errata',
  'c.expansions_needed', 'c.alt_art', 'c.duplicate_id', 'c.date_creation', 'c.date_update',
  // Joined fields
  'p.code as pack_code', 'p.name as pack_name', 'p.date_release as pack_date_release',
  db.raw('COALESCE(cs.status, p.status) as pack_status'), db.raw('COALESCE(c.creator, cs.creator, p.creator) as pack_creator'), 'p.theme as pack_theme',
  'p.visibility as pack_visibility', 'p.language as pack_language', 'p.environment as pack_environment',
  't.code as type_code', 't.name as type_name',
  'st.code as subtype_code', 'st.name as subtype_name',
  'f.code as faction_code', 'f.name as faction_name',
  'f2.code as faction2_code', 'f2.name as faction2_name',
  'cs.code as card_set_code', 'cs.name as card_set_name',
  'cs.parent_code as card_set_parent_code',
  'cst.code as card_set_type_name_code',
  'lt.code as linked_to_code', 'lt.name as linked_to_name',
  'dup.code as duplicate_of_code', 'dup.name as duplicate_of_name',
  'dup_pack.code as duplicate_of_pack_code', 'dup_pack.name as duplicate_of_pack_name',
  db.raw('(SELECT MAX(c2.set_position + c2.quantity - 1) FROM card c2 WHERE c2.set_id = c.set_id AND c.set_id IS NOT NULL) as card_set_size'),
];

const VALID_OPS = { '=': '=', 'lt': '<', 'lte': '<=', 'gt': '>', 'gte': '>=' };

function baseQuery() {
  return db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('type as t', 'c.type_id', 't.id')
    .leftJoin('Subtype as st', 'c.subtype_id', 'st.id')
    .leftJoin('faction as f', 'c.faction_id', 'f.id')
    .leftJoin('faction as f2', 'c.faction2_id', 'f2.id')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin('Cardsettype as cst', 'cs.cardset_type', 'cst.id')
    .leftJoin('card as lt', 'c.linked_id', 'lt.id')
    .leftJoin('card as dup', 'c.duplicate_id', 'dup.id')
    .leftJoin('pack as dup_pack', 'dup.pack_id', 'dup_pack.id')
    .select(BASE_CARD_COLUMNS);
}

async function getHiddenThemesForUser(userId) {
  if (!userId) return [];
  const user = await db('user').where('id', userId).first();
  if (!user || !user.show_theme) return [];
  try {
    const st = typeof user.show_theme === 'string' ? JSON.parse(user.show_theme) : user.show_theme;
    return Object.keys(st).filter(k => st[k] === false).map(k => k.toLowerCase());
  } catch (e) {
    return [];
  }
}


async function findAll() {
  return baseQuery().orderBy('c.code', 'asc');
}

async function findByCode(code) {
  return baseQuery().where('c.code', code).first();
}

async function findByPackCode(packCode) {
  return baseQuery().where('p.code', packCode).orderBy('c.position', 'asc');
}

async function findDuplicateCodes(cardId) {
  const rows = await db('card as c')
    .leftJoin('pack as p', 'c.pack_id', 'p.id')
    .where('c.duplicate_id', cardId)
    .select('c.code', 'c.alt_art', 'c.quantity', 'p.name as pack_name', 'p.code as pack_code');
  return rows.map(r => ({
    code: r.code,
    pack_name: r.pack_name,
    pack_code: r.pack_code,
    alt_art: !!r.alt_art,
    quantity: r.quantity || 1,
  }));
}

async function findTranslation(code, locale) {
  return db('card_translation')
    .where({ code, locale })
    .select(['name', 'subname', 'text', 'flavor', 'traits', 'errata'])
    .first();
}

async function getAttributes(locale = 'en') {
  const TypeModel = require('./type.model');
  const SubtypeModel = require('./subtype.model');
  const [types, subtypes, rawIllustrators] = await Promise.all([
    TypeModel.findAll(locale),
    SubtypeModel.findAll(locale),
    db('card').distinct('illustrator').whereNotNull('illustrator').whereNot('illustrator', '').pluck('illustrator'),
  ]);

  const illustratorSet = new Set();
  for (const raw of rawIllustrators) {
    for (const part of raw.split(/[,&]/)) {
      const name = part.trim();
      if (name) illustratorSet.add(name);
    }
  }
  const illustrators = [...illustratorSet].sort((a, b) => a.localeCompare(b));

  const facMap = await require('./faction.model').getTranslationMap(locale);
  const typeMap = await TypeModel.getTranslationMap(locale);
  const packMap = await require('./pack.model').getTranslationMap(locale);
  const subtypeMap = await SubtypeModel.getTranslationMap(locale);
  const cardsetMap = await require('./cardset.model').getTranslationMap(locale);

  return { types, subtypes, illustrators, factions: facMap, typesMap: typeMap, packsMap: packMap, subtypesMap: subtypeMap, cardsetsMap: cardsetMap };
}

async function getHeroes(donator, userId, locale = 'en') {
  let q = db('card as c')
    .join('type as t', 'c.type_id', 't.id')
    .join('pack as p', 'c.pack_id', 'p.id')
    .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
    .leftJoin(db.raw("card as cb ON cb.code = CONCAT(LEFT(c.code, LENGTH(c.code)-1), 'b')"))
    .leftJoin(db.raw("card as cc ON cc.code = CONCAT(LEFT(c.code, LENGTH(c.code)-1), 'c')"))
    .where('t.code', 'hero')
    .whereRaw("c.code LIKE '%a'")
    .whereRaw("c.code = (SELECT MIN(c2.code) FROM card c2 JOIN type t2 ON c2.type_id = t2.id WHERE t2.code = 'hero' AND c2.pack_id = c.pack_id AND c2.name = c.name AND c2.code LIKE '%a')")
    .where('c.hidden', 0)
    .select([
      'c.id', 'c.code', 'c.name',
      'p.id as pack_id', 'p.code as pack_code', 'p.name as pack_name',
      db.raw('COALESCE(c.creator, cs.creator, p.creator) as pack_creator'), 'p.environment as pack_environment',
      db.raw('COALESCE(cs.status, p.status) as pack_status'), 'p.theme as pack_theme',
      'p.visibility as pack_visibility',
      'p.date_release as pack_date_release',
      'cb.code as code_b',
      'cc.code as code_c',
    ])
    .orderBy('c.name', 'asc');

  const hiddenThemes = await getHiddenThemesForUser(userId);
  if (hiddenThemes.length > 0) {
    const placeholders = hiddenThemes.map(() => '?').join(',');
    q = q.whereRaw(`LOWER(COALESCE(p.theme, 'Marvel')) NOT IN (${placeholders})`, hiddenThemes);
  }

  if (!donator) {
    q = q.where(function () {
      this.where('p.visibility', '!=', 'false').orWhereNull('p.visibility');
    });
  }

  if (locale) {
    const locClean = locale.toLowerCase();
    q = q.where(function() {
      this.whereNull('p.language')
          .orWhere('p.language', '')
          .orWhere('p.language', locClean);
    });
  }

  return q;
}

async function searchCards(filters, pagination, donator) {
  const {
      name, text, flavor, pack, cardset, faction, type, subtype,
      traits, illustrator, is_unique,
      cost_op = '=', cost, cost_op2 = '=', cost2,
      qty_op = '=', qty, qty_op2 = '=', qty2,
      atk_op = '=', atk, atk_op2 = '=', atk2,
      thw_op = '=', thw, thw_op2 = '=', thw2,
      def_op = '=', def, def_op2 = '=', def2,
      health_op = '=', health, health_op2 = '=', health2,
      boost_op = '=', boost, boost_op2 = '=', boost2, boost_star,
      scheme_op = '=', scheme, scheme_op2 = '=', scheme2,
      res_physical, res_mental, res_energy, res_wild,
      factions, locale,
      hide_duplicates, show_alt_art, creator_filter, creator_name, current_only,
      theme, include_hidden,
  } = filters;

  const { page = 1, limit = 50, sort = 'name', order = 'asc' } = pagination;
  const dir = order === 'desc' ? 'desc' : 'asc';

  let q = db('card as c')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .leftJoin('type as t', 'c.type_id', 't.id')
      .leftJoin('Subtype as st', 'c.subtype_id', 'st.id')
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('faction as f2', 'c.faction2_id', 'f2.id')
      .leftJoin('Cardset as cs', 'c.set_id', 'cs.id')
      .leftJoin('card as dup', 'c.duplicate_id', 'dup.id')
      .leftJoin('pack as dup_pack', 'dup.pack_id', 'dup_pack.id')
      .select([
        'c.code', 'c.name', 'c.cost', 'c.position', 'c.hidden', 'c.is_unique',
        'c.traits', 'c.quantity', 'c.deck_limit', 'c.alt_art', 'c.octgn_id', db.raw('IF(c.duplicate_id IS NOT NULL, 1, 0) as is_duplicate'),
        'dup.code as duplicate_of_code', 'dup_pack.code as duplicate_of_pack_code',
        'c.text', 'c.real_text',
        'c.resource_energy', 'c.resource_physical', 'c.resource_mental', 'c.resource_wild',
        'c.attack', 'c.thwart', 'c.defense', 'c.health', 'c.scheme', 'c.boost', 'c.boost_star',
        'c.attack_star', 'c.thwart_star', 'c.defense_star', 'c.health_star', 'c.scheme_star', 'c.health_per_hero', 'c.health_per_group',
        'c.stage',
        'c.base_threat', 'c.base_threat_fixed', 'c.base_threat_per_group',
        'c.escalation_threat', 'c.escalation_threat_fixed', 'c.escalation_threat_star',
        'c.threat', 'c.threat_fixed', 'c.threat_per_group', 'c.threat_star',
        'p.code as pack_code', 'p.name as pack_name',
        db.raw('COALESCE(c.creator, cs.creator, p.creator) as pack_creator'), db.raw('COALESCE(cs.status, p.status) as pack_status'), 'p.environment as pack_environment',
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

  if (locale) {
      const locClean = locale.toLowerCase();
      q = q.where(function() {
        this.whereNull('p.language')
            .orWhere('p.language', '')
            .orWhere('p.language', locClean);
      });
  }

  const hiddenThemes = await getHiddenThemesForUser(filters.user_id);
  if (hiddenThemes.length > 0) {
    const placeholders = hiddenThemes.map(() => '?').join(',');
    q = q.whereRaw(`LOWER(COALESCE(p.theme, 'Marvel')) NOT IN (${placeholders})`, hiddenThemes);
  }

  if (include_hidden !== '1') q = q.where('c.hidden', 0);

  if (name) {
      if (locale && locale !== 'en') q = q.whereRaw('COALESCE(ct.name, c.name) LIKE ?', [`%${name}%`]);
      else q = q.whereRaw('c.name LIKE ?', [`%${name}%`]);
  }
  if (text) {
      const textFields = locale && locale !== 'en' ? ['COALESCE(ct.text, c.text)', 'c.real_text'] : ['c.text', 'c.real_text'];
      q = q.where(buildAdvancedSearch(text, textFields));
  }
  if (flavor) {
      const flavorFields = locale && locale !== 'en' ? ['COALESCE(ct.flavor, c.flavor)'] : ['c.flavor'];
      q = q.where(buildAdvancedSearch(flavor, flavorFields));
  }
  if (pack) q = q.where('p.code', pack);
  if (cardset) q = q.where('cs.code', cardset);
  
  if (faction) q = q.where(function () { this.where('f.code', faction).orWhere('f2.code', faction); });
  
  const factionsList = factions ? factions.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (!faction && factionsList.length > 0) {
      q = q.where(function () {
        factionsList.forEach(fc => {
          this.orWhere(function () { this.where('f.code', fc).orWhere('f2.code', fc); });
        });
      });
  }
  const typesList = type ? type.split(',').map(s => s.trim()).filter(Boolean) : [];
  if (typesList.length > 0) {
      q = q.whereIn('t.code', typesList);
  }
  if (subtype) q = q.where('st.code', subtype);
  if (traits) {
      const traitsFields = locale && locale !== 'en' ? ['COALESCE(ct.traits, c.traits)'] : ['c.traits'];
      q = q.where(buildAdvancedSearch(traits, traitsFields));
  }
  if (illustrator) q = q.whereRaw('c.illustrator LIKE ?', [`%${illustrator}%`]);
  if (is_unique === '1') q = q.where('c.is_unique', 1);
  if (is_unique === '0') q = q.where('c.is_unique', 0);

  const applyNumeric = (field, val, op, val2, op2, allowNullIfZero = false) => {
      let queryFn = q;
      if (val !== undefined && val !== '') {
        if (val === '*') {
          queryFn = queryFn.where(`${field}_star`, 1);
        } else {
          const sqlOp = VALID_OPS[op] || '=';
          const numVal = parseInt(val, 10);
          if (allowNullIfZero && numVal === 0 && (sqlOp === '=' || sqlOp === '<=')) {
            queryFn = queryFn.where(function() {
              this.where(field, sqlOp, 0).orWhereNull(field);
            });
          } else {
            queryFn = queryFn.where(field, sqlOp, numVal);
          }
        }
      }
      if (val2 !== undefined && val2 !== '') {
        if (val2 === '*') {
          queryFn = queryFn.where(`${field}_star`, 1);
        } else {
          const sqlOp2 = VALID_OPS[op2] || '=';
          const numVal2 = parseInt(val2, 10);
          if (allowNullIfZero && numVal2 === 0 && (sqlOp2 === '=' || sqlOp2 === '<=')) {
            queryFn = queryFn.where(function() {
              this.where(field, sqlOp2, 0).orWhereNull(field);
            });
          } else {
            queryFn = queryFn.where(field, sqlOp2, numVal2);
          }
        }
      }
      return queryFn;
  };
  q = applyNumeric('c.cost', cost, cost_op, cost2, cost_op2);
  q = applyNumeric('c.quantity', qty, qty_op, qty2, qty_op2);
  q = applyNumeric('c.attack', atk, atk_op, atk2, atk_op2);
  q = applyNumeric('c.thwart', thw, thw_op, thw2, thw_op2);
  q = applyNumeric('c.defense', def, def_op, def2, def_op2);
  q = applyNumeric('c.health', health, health_op, health2, health_op2);
  q = applyNumeric('c.boost', boost, boost_op, boost2, boost_op2, true);
  if (boost_star === '1') q = q.where('c.boost_star', 1);
  q = applyNumeric('c.scheme', scheme, scheme_op, scheme2, scheme_op2);

  if (res_physical) q = q.where('c.resource_physical', '>=', parseInt(res_physical, 10));
  if (res_mental) q = q.where('c.resource_mental', '>=', parseInt(res_mental, 10));
  if (res_energy) q = q.where('c.resource_energy', '>=', parseInt(res_energy, 10));
  if (res_wild) q = q.where('c.resource_wild', '>=', parseInt(res_wild, 10));

  if (hide_duplicates === '1') {
      if (show_alt_art === '1') {
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
          this.whereRaw('COALESCE(c.creator, cs.creator, p.creator) IS NULL').andWhere('p.environment', 'current');
        });
      } else {
        q = q.whereRaw('COALESCE(c.creator, cs.creator, p.creator) IS NULL');
      }
  } else if (current_only === '1') {
       q = q.where(function() {
          this.where('p.environment', 'current').orWhereRaw('COALESCE(c.creator, cs.creator, p.creator) IS NOT NULL');
       });
  }
  if (creator_filter === 'fanmade') q = q.whereRaw('COALESCE(c.creator, cs.creator, p.creator) IS NOT NULL');
  
  if (creator_name) {
      q = q.whereRaw('COALESCE(c.creator, cs.creator, p.creator) LIKE ?', [`%${creator_name}%`]);
  }
  
  if (theme && theme !== 'all') {
      const themeLower = theme.toLowerCase();
      q = q.where(function () {
        if (themeLower === 'marvel') {
          this.whereRaw('LOWER(p.theme) = ?', [themeLower])
            .orWhereNull('p.theme')
            .orWhere('p.theme', '');
        } else {
          this.whereRaw('LOWER(p.theme) = ?', [themeLower]);
        }
      });
  }
  
  if (!donator) q = q.where(function () { this.whereNull('p.visibility').orWhereNot('p.visibility', 'false'); });

  if (sort === 'pack') q = q.orderBy([{ column: 'p.position', order: dir }, { column: 'c.position', order: dir }]);
  else if (sort === 'cost') q = q.orderByRaw(`c.cost IS NULL, c.cost ${dir.toUpperCase()}, c.name ASC`);
  else if (sort === 'faction') q = q.orderBy([{ column: 'f.name', order: dir }, { column: 'c.name', order: dir }]);
  else q = q.orderBy('c.name', dir); // default: name

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));

  const statsRow = await q.clone().clearSelect().clearOrder().select(
      db.raw('COUNT(*) as total'),
      db.raw('SUM(c.quantity) as sum_total'),
      db.raw('SUM(COALESCE(c.creator, cs.creator, p.creator) IS NULL) as official'),
      db.raw('SUM(IF(COALESCE(c.creator, cs.creator, p.creator) IS NULL, c.quantity, 0)) as sum_official'),
      db.raw('SUM(COALESCE(c.creator, cs.creator, p.creator) IS NOT NULL) as fanmade'),
      db.raw('SUM(IF(COALESCE(c.creator, cs.creator, p.creator) IS NOT NULL, c.quantity, 0)) as sum_fanmade'),
      db.raw('SUM(c.duplicate_id IS NOT NULL) as duplicates'),
      db.raw('SUM(IF(c.duplicate_id IS NOT NULL, c.quantity, 0)) as sum_duplicates'),
      db.raw('SUM(IF(COALESCE(c.creator, cs.creator, p.creator) IS NULL AND p.environment = "current", 1, 0)) as current_official'),
      db.raw('SUM(IF(COALESCE(c.creator, cs.creator, p.creator) IS NULL AND p.environment = "current", c.quantity, 0)) as sum_current_official'),
      db.raw('SUM(c.alt_art = 1) as alt_arts'),
  ).first();

  const rows = await q.offset((pageNum - 1) * limitNum).limit(limitNum);

  return { rows, statsRow, pageNum, limitNum };
}

async function fetchTranslationsForSearch(cards, localeClean) {
  if (localeClean === 'en' || cards.length === 0) return cards;
  // Collect all codes + duplicate source codes for fallback translations
  const codes = cards.map(r => r.code);
  const dupSourceCodes = cards.filter(r => r.duplicate_of_code).map(r => r.duplicate_of_code);
  const allCodes = [...new Set([...codes, ...dupSourceCodes])];

  const transRows = await db('card_translation')
    .whereIn('code', allCodes)
    .where('locale', localeClean)
    .select(['code', 'name', 'subname', 'text', 'flavor', 'traits', 'errata']);
  
  const transMap = Object.fromEntries(transRows.map(t => [t.code, t]));
  const TRANS_FIELDS = ['name', 'subname', 'text', 'flavor', 'traits', 'errata'];
  
  const facMap = await require('./faction.model').getTranslationMap(localeClean);
  const typesMap = await require('./type.model').getTranslationMap(localeClean);
  const packsMap = await require('./pack.model').getTranslationMap(localeClean);
  const subtypesMap = await require('./subtype.model').getTranslationMap(localeClean);
  const cardsetsMap = await require('./cardset.model').getTranslationMap(localeClean);

  return cards.map(r => {
    const updated = { ...r };
    // Use card's own translation, or fallback to duplicate source's translation
    const t = transMap[r.code] || (r.duplicate_of_code ? transMap[r.duplicate_of_code] : null);
    if (t) {
      for (const f of TRANS_FIELDS) {
        if (t[f] != null && t[f] !== '') updated[f] = t[f];
      }
    }
    if (facMap[updated.faction_code]) updated.faction_name = facMap[updated.faction_code];
    if (updated.faction2_code && facMap[updated.faction2_code]) updated.faction2_name = facMap[updated.faction2_code];
    if (typesMap[updated.type_code]) updated.type_name = typesMap[updated.type_code];
    if (packsMap[updated.pack_code]) updated.pack_name = packsMap[updated.pack_code];
    if (subtypesMap[updated.subtype_code]) updated.subtype_name = subtypesMap[updated.subtype_code];
    if (cardsetsMap[updated.card_set_code]) updated.card_set_name = cardsetsMap[updated.card_set_code];
    return updated;
  });
}

async function getFaq(code) {
  return db('review')
    .where({ card_id: code, faq: 1 })
    .orderBy('nb_votes', 'desc')
    .select('text_html', 'text_md', 'date_update');
}

module.exports = { 
  findAll, 
  findByCode, 
  findByPackCode, 
  findDuplicateCodes, 
  findTranslation, 
  getAttributes,
  getHeroes,
  searchCards,
  fetchTranslationsForSearch,
  getFaq
};
