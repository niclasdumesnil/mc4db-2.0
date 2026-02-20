/**
 * /api/public/packs route
 *
 *   GET /api/public/packs/  → all packs
 */
const { Router } = require('express');
const Pack = require('../models/Pack');

const router = Router();

/**
 * GET /api/public/packs/
 */
router.get('/packs/', async (req, res, next) => {
  try {
    const rows = await Pack.findAll();
    const cardCounts = await Pack.countCardsByPack();

    const packs = rows.map((row) => ({
      name: row.name,
      code: row.code,
      position: row.position,
      available: row.date_release
        ? new Date(row.date_release).toISOString().slice(0, 10)
        : '',
      known: cardCounts[row.id] || 0,
      total: row.size,
      url: `${process.env.BASE_URL || ''}/search?q=e%3A${row.code}`,
      id: row.id,
      pack_type: row.pack_type || '',
      status: row.status || 'Official',
      creator: row.creator || 'FFG',
      theme: row.theme || 'Marvel',
      environment: row.environment || null,
      visibility: row.visibility || 'true',
      language: row.language || 'en',
    }));

    res.json(packs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
