/**
 * Route aggregator — mounts all public API sub-routers
 * under the /api/public prefix.
 */
const { Router } = require('express');
const cardsRoutes = require('./cards');
const packsRoutes = require('./packs');
const factionsRoutes = require('./factions');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const decklistsRoutes = require('./decklists');

const router = Router();

router.use(cardsRoutes);
router.use(packsRoutes);
router.use(factionsRoutes);
router.use(authRoutes);
router.use(usersRoutes);
router.use(decklistsRoutes);

module.exports = router;
