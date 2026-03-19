/**
 * /api/public/packs route
 *
 *   GET /api/public/packs/  → all packs
 *
 * Query params:
 *   user_id  — optional; when provided and the user is a donator, private packs
 *              (visibility = "false") are included in the response.
 */
const { Router } = require('express');
const Pack = require('../models/pack.model');
const { isUserDonator } = require('../utils/donatorUtils');

const router = Router();

/**
 * GET /api/public/packs/
 */
router.get('/packs/', async (req, res, next) => {
  try {
    const { user_id, locale = 'en' } = req.query;
    const locClean = locale.toLowerCase();
    const donator = await isUserDonator(user_id);

    const rows = await Pack.findAll();
    const cardCounts = await Pack.countCardsByPack();

    const visibleRows = rows.filter(row => {
      const visOK = donator ? true : (row.visibility || 'true') !== 'false';
      const langOK = !row.language || row.language === '' || row.language.toLowerCase() === locClean;
      return visOK && langOK;
    });

    const packs = visibleRows.map((row) => ({
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
      pack_type_name: row.pack_type_name || row.pack_type || '',
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
