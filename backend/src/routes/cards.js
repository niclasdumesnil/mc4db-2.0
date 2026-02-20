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
    const row = await Card.findByCode(code);
    if (!row) {
      return res.status(404).json({ error: { status: 404, message: `Card ${code} not found` } });
    }

    // Resolve linked card
    let linkedCard = null;
    if (row.linked_to_code) {
      const linkedRow = await Card.findByCode(row.linked_to_code);
      if (linkedRow) {
        linkedCard = serializeCard(linkedRow, { api: true });
      }
    }

    // Resolve duplicated_by
    const duplicatedBy = await Card.findDuplicateCodes(row.id);

    const card = serializeCard(row, { api: true, linkedCard, duplicatedBy });
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
    const rows = await Card.findByPackCode(packCode);
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: { status: 404, message: `No cards found for pack ${packCode}` } });
    }
    const cards = rows.map((r) => serializeCard(r, { api: true }));
    res.json(cards);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
