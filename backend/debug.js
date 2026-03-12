const db = require('./src/config/database');
async function test() {
  try {
    const rows = await db.raw("SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = 'decklist'");
    console.log(JSON.stringify(rows[0], null, 2));
  } catch(e) { console.error(e); }
  process.exit();
}
test();
