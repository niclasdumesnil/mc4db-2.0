/**
 * donatorUtils.js
 *
 * Shared helper to determine whether a given user has donator status.
 * A user is a donator when their `donation` column is strictly > 0.
 */
const db = require('../config/database');

/**
 * Returns true if the user with the given id has donation > 0.
 * Returns false for an invalid/missing id or on any DB error.
 *
 * @param {string|number|null|undefined} userId
 * @returns {Promise<boolean>}
 */
async function isUserDonator(userId) {
  if (!userId) return false;
  try {
    const id = parseInt(userId, 10);
    if (!id || isNaN(id)) return false;
    const row = await db('user').where('id', id).select('donation').first();
    return !!(row && Number(row.donation) > 0);
  } catch (e) {
    return false;
  }
}

module.exports = { isUserDonator };
