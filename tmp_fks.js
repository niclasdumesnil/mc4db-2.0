const db = require('./backend/src/config/database');

async function run() {
  try {
    const refs = await db.raw(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME = 'deck' AND TABLE_SCHEMA = 'symphony_merlin'
    `);
    console.log(refs[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
