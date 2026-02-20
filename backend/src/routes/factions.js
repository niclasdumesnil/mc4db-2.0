/**
 * /api/public/factions route
 *
 *   GET /api/public/factions/  → all factions
 */
const { Router } = require('express');
const Faction = require('../models/Faction');

const router = Router();

/**
 * GET /api/public/factions/
 */
router.get('/factions/', async (req, res, next) => {
  try {
    const rows = await Faction.findAll();

    const factions = rows.map((row) => ({
      code: row.code,
      name: row.name,
      is_primary: Boolean(row.is_primary),
      octgn_id: row.octgn_id || null,
    }));

    res.json(factions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
