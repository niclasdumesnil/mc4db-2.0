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
