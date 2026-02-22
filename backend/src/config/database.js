/**
 * Database connection — Knex configured from .env
 *
 * Uses the same MySQL database as the Symfony backend.
 * Doctrine's underscore naming strategy means PHP camelCase props
 * map to snake_case columns, which we use directly in Knex.
 */
const knex = require('knex');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'symphony_merlin',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    charset: 'utf8',
  },
  pool: { min: 2, max: 10 },
  // Set DEBUG_SQL=1 in .env to log all queries (very verbose).
  debug: process.env.DEBUG_SQL === '1',
});

module.exports = db;
