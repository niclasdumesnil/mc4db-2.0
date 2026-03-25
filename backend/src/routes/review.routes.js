const { Router } = require('express');
const Review = require('../models/review.model');

const router = Router();

// Middleware to extract user_id if present (optional auth)
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user_id = decoded.id;
    } catch (e) {
      // ignore
    }
  }
  next();
};

/**
 * GET /api/public/reviews/:card_id
 */
router.get('/:card_id', optionalAuth, async (req, res, next) => {
  try {
    const cardId = req.params.card_id;
    const currentUserId = req.user_id || req.query.user_id; // fallback to query if needed
    const reviews = await Review.getReviewsByCardId(cardId, currentUserId);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/reviews
 * Create a review
 */
router.post('/', async (req, res, next) => {
  try {
    // Assuming auth middleware sets req.user.id or client sends user_id for now
    // NOTE: real app probably uses `requireAuth` middleware setting `req.user`
    const user_id = req.user?.id || req.body.user_id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const { card_id, text_md, text_html } = req.body;
    if (!card_id || !text_md) return res.status(400).json({ error: 'Missing fields' });

    // Check if user already reviewed this card
    const existing = await Review.getReviewsByCardId(card_id);
    if (existing.some(r => r.user_id === user_id)) {
      return res.status(400).json({ error: 'User already reviewed this card' });
    }

    const id = await Review.createReview(card_id, user_id, text_md, text_html || text_md);
    const newReview = await Review.getReviewById(id);
    res.json(newReview);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/public/reviews/:id
 * Edit a review
 */
router.put('/:id', async (req, res, next) => {
  try {
    const user_id = req.user?.id || req.body.user_id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id;
    const review = await Review.getReviewById(id);
    if (!review) return res.status(404).json({ error: 'Not found' });
    if (review.user_id !== user_id) return res.status(403).json({ error: 'Forbidden' });

    const { text_md, text_html } = req.body;
    await Review.updateReview(id, text_md, text_html || text_md);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/reviews/:id/comments
 * Add a comment
 */
router.post('/:id/comments', async (req, res, next) => {
  try {
    const user_id = req.user?.id || req.body.user_id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const review_id = req.params.id;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const id = await Review.addComment(review_id, user_id, text);
    const newComment = await Review.getCommentById(id);
    res.json(newComment);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/public/reviews/:id/vote
 * Toggle a vote
 */
router.post('/:id/vote', async (req, res, next) => {
  try {
    const user_id = req.user?.id || req.body.user_id;
    if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

    const review_id = req.params.id;
    const review = await Review.getReviewById(review_id);
    if (!review) return res.status(404).json({ error: 'Not found' });

    const voted = await Review.toggleVote(review_id, user_id);
    res.json({ voted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
