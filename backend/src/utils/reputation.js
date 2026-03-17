const db = require('../config/database');

/**
 * Calculates a user's base reputation based on their activities:
 * - 5 points per published decklist (not deleted)
 * - 5 points per favorite received on their decklists
 * - 1 point per like/vote received on their decklists
 * - 1 point per like/vote received on their card reviews
 * Base reputation is 1.
 * 
 * Note: The 'reputation' column in the user table now acts purely as an admin manual boost.
 * 
 * @param {number|string} userId
 * @returns {Promise<{ calculated: number, boost: number, total: number }>}
 */
async function getFullReputation(userId) {
  try {
    const id = parseInt(userId, 10);
    if (!id) return { calculated: 1, boost: 0, total: 1 };

    // Get current DB manual boost (reputation column)
    const userRow = await db('user').select('reputation').where('id', id).first();
    const adminBoost = userRow && userRow.reputation ? parseInt(userRow.reputation, 10) : 0;

    // 1. Decklists published (+5)
    const [{ dl_count }] = await db('decklist')
      .where('user_id', id)
      .count('* as dl_count');
    
    // 2. Favorites on decklists (+5)
    const [{ fav_count }] = await db('decklist')
      .join('favorite', 'decklist.id', 'favorite.decklist_id')
      .where('decklist.user_id', id)
      .count('* as fav_count');

    // 3. Votes on decklists (+1)
    const [{ vote_count }] = await db('decklist')
      .join('vote', 'decklist.id', 'vote.decklist_id')
      .where('decklist.user_id', id)
      .count('* as vote_count');

    // 4. Votes on reviews (+1)
    let reviewVotes = 0;
    try {
      const [{ rev_count }] = await db('review')
        .join('reviewvote', 'review.id', 'reviewvote.review_id')
        .where('review.user_id', id)
        .count('* as rev_count');
      reviewVotes = parseInt(rev_count, 10) || 0;
    } catch {
      // In case table or column does not exist
    }

    const decklists = parseInt(dl_count, 10) || 0;
    const favorites = parseInt(fav_count, 10) || 0;
    const votes = parseInt(vote_count, 10) || 0;

    const calculated = 1 + (decklists * 5) + (favorites * 5) + (votes * 1) + (reviewVotes * 1);
    const total = calculated + adminBoost;

    return { calculated, boost: adminBoost, total };
  } catch (err) {
    console.error('Error calculating reputation for user ' + userId, err);
    return { calculated: 1, boost: 0, total: 1 };
  }
}

module.exports = {
  getFullReputation
};
