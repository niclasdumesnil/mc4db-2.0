/**
 * Faction model — Data Access Layer for the `faction` table.
 */
const db = require('../config/database');

async function findAll() {
  return db('faction')
    .select('code', 'name', 'is_primary', 'octgn_id')
    .orderBy('id', 'asc');
}

module.exports = { findAll };
