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

const router = Router();

router.use(cardsRoutes);
router.use(packsRoutes);
router.use(factionsRoutes);
router.use(authRoutes);
router.use(usersRoutes);

module.exports = router;
