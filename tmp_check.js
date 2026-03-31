const db = require('./backend/src/config/database');

async function run() {
  try {
    const list = await db('decklist').select('user_id').count('* as count').groupBy('user_id');
    console.log("Decklists by user_id:", list);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
