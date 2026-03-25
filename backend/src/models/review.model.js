const db = require('../config/database');

async function getReviewsByCardId(card_id, current_user_id) {
  // Fetch reviews logic with subqueries/joins for user and comments
  // In the DB, card_id is referenced in the `review` table
  const reviews = await db('review as r')
    .leftJoin('user as u', 'r.user_id', 'u.id')
    .select([
      'r.id', 'r.card_id', 'r.user_id', 'r.date_creation', 'r.date_update',
      'r.text_md', 'r.text_html', 'r.nb_votes',
      'u.username', 'u.reputation', 'u.donation'
    ])
    .where('r.card_id', card_id)
    .orderBy('r.nb_votes', 'desc')
    .orderBy('r.date_creation', 'desc');

  // Fetch all comments for these reviews
  const reviewIds = reviews.map(r => r.id);
  const comments = reviewIds.length > 0 ? await db('reviewcomment as rc')
    .leftJoin('user as u', 'rc.user_id', 'u.id')
    .select([
      'rc.id', 'rc.review_id', 'rc.user_id', 'rc.date_creation', 'rc.date_update', 'rc.text',
      'u.username', 'u.reputation', 'u.donation'
    ])
    .whereIn('rc.review_id', reviewIds)
    .orderBy('rc.date_creation', 'asc') : [];

  // Combine comments into the reviews
  const groupedComments = {};
  for (const c of comments) {
    if (!groupedComments[c.review_id]) groupedComments[c.review_id] = [];
    groupedComments[c.review_id].push(c);
  }

  // If there is a logged in user, fetch their votes
  let userVotes = new Set();
  if (current_user_id && reviewIds.length > 0) {
    const votes = await db('reviewvote')
      .whereIn('review_id', reviewIds)
      .andWhere('user_id', current_user_id)
      .select('review_id');
    votes.forEach(v => userVotes.add(v.review_id));
  }

  return reviews.map(r => ({
    ...r,
    comments: groupedComments[r.id] || [],
    user_voted: userVotes.has(r.id)
  }));
}

async function getReviewById(id) {
  return db('review').where({ id }).first();
}

async function createReview(card_id, user_id, text_md, text_html) {
  const [id] = await db('review').insert({
    card_id,
    user_id,
    text_md,
    text_html,
    date_creation: new Date(),
    date_update: new Date(),
    nb_votes: 0,
    is_faq: 0,
    is_question: 0
  });
  return id;
}

async function updateReview(id, text_md, text_html) {
  await db('review').where({ id }).update({
    text_md,
    text_html,
    date_update: new Date()
  });
}

async function getCommentById(id) {
  return db('reviewcomment').where({ id }).first();
}

async function addComment(review_id, user_id, text) {
  const [id] = await db('reviewcomment').insert({
    review_id,
    user_id,
    text,
    date_creation: new Date(),
    date_update: new Date()
  });
  return id;
}

async function updateComment(id, text) {
  await db('reviewcomment').where({ id }).update({
    text,
    date_update: new Date()
  });
}

async function toggleVote(review_id, user_id) {
  const existing = await db('reviewvote').where({ review_id, user_id }).first();
  if (existing) {
    await db('reviewvote').where({ review_id, user_id }).del();
    await db('review').where({ id: review_id }).decrement('nb_votes', 1);
    return false; // unvoted
  } else {
    await db('reviewvote').insert({ review_id, user_id });
    await db('review').where({ id: review_id }).increment('nb_votes', 1);
    return true; // voted
  }
}

module.exports = {
  getReviewsByCardId,
  getReviewById,
  createReview,
  updateReview,
  getCommentById,
  addComment,
  updateComment,
  toggleVote
};
