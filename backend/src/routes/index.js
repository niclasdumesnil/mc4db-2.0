/**
 * Route aggregator — mounts all public API sub-routers
 * under the /api/public prefix.
 */
const { Router } = require('express');
const cardsRoutes = require('./card.routes');
const packsRoutes = require('./pack.routes');
const factionsRoutes = require('./faction.routes');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const decksRoutes = require('./decks');
const rulesRoutes = require('./rules');
const adminRoutes = require('./admin');
const scenariosRoutes = require('./scenarios');
const reviewRoutes = require('./review.routes');
const homeRoutes = require('./home.routes');
const ttsRoutes = require('./tts.routes');

const router = Router();

router.use(cardsRoutes);
router.use(packsRoutes);
router.use(factionsRoutes);
router.use(authRoutes);
router.use(usersRoutes);
router.use(decksRoutes);
router.use(rulesRoutes);
router.use(adminRoutes);
router.use(scenariosRoutes);
router.use('/reviews', reviewRoutes);
router.use(homeRoutes);
router.use(ttsRoutes);

module.exports = router;
