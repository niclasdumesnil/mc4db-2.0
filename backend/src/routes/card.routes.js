/**
 * /api/public/cards routes
 *
 *   GET /api/public/cards/             → all cards
 *   GET /api/public/card/:code.json    → single card by code
 *   GET /api/public/cards/:pack.json   → cards by pack code
 */
const { Router } = require('express');
const Card = require('../models/card.model');
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
      cards = await Card.fetchTranslationsForSearch(cards, locale);
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
    const attributes = await Card.getAttributes();
    res.json(attributes);
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
    const { user_id, locale = 'en' } = req.query;
    const donator = await isUserDonator(user_id);

    const rows = await Card.getHeroes(donator, user_id, locale.toLowerCase());

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

/**
 * GET /api/public/cards/search
 * Filterable, paginated card search.
 */
router.get('/cards/search', async (req, res, next) => {
  try {
    const filters = {
      ...req.query,
      locale: req.query.locale || 'en'
    };
    
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      order: req.query.order
    };

    const donator = await isUserDonator(filters.user_id);
    const localeClean = filters.locale.toLowerCase();

    const result = await Card.searchCards(filters, pagination, donator);
    const { statsRow } = result;
    
    // Apply translations if a non-English locale is requested
    let cards = result.rows;
    if (localeClean !== 'en' && cards.length > 0) {
      cards = await Card.fetchTranslationsForSearch(cards, localeClean);
    }

    const { resolveImage } = require('../utils/cardSerializer');
    const finalCards = cards.map(c => ({
      ...c,
      imagesrc: resolveImage(c.code, c.pack_code, '', localeClean)
    }));

    const totalItems = Number(statsRow?.total ?? 0);

    res.json({
      cards: finalCards,
      meta: {
        total_items: totalItems,
        total_sum_items: Number(statsRow?.sum_total ?? 0),
        total_pages: Math.ceil(totalItems / result.limitNum),
        total_official: Number(statsRow?.official ?? 0),
        total_sum_official: Number(statsRow?.sum_official ?? 0),
        total_fanmade: Number(statsRow?.fanmade ?? 0),
        total_sum_fanmade: Number(statsRow?.sum_fanmade ?? 0),
        total_duplicates: Number(statsRow?.duplicates ?? 0),
        total_sum_duplicates: Number(statsRow?.sum_duplicates ?? 0),
        total_current_official: Number(statsRow?.current_official ?? 0),
        total_sum_current_official: Number(statsRow?.sum_current_official ?? 0),
        total_alt_arts: Number(statsRow?.alt_arts ?? 0),
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
    const row = await Card.findByCode(code);
    if (!row) {
      return res.status(404).json({ error: { status: 404, message: `Card ${code} not found` } });
    }

    const reviews = await Card.getFaq(row.id); // Passing row.id as that is card_id

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
