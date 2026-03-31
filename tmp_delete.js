const db = require('./backend/src/config/database');

async function run() {
  try {
    const ids = (await db('decklist').select('id')).map(r => r.id);
    if (ids.length === 0) {
      console.log('No public decks found.');
      return;
    }

    console.log(`Deleting from sidedecklistslot if any...`);
    if (await db.schema.hasTable('sidedecklistslot')) await db('sidedecklistslot').whereIn('decklist_id', ids).del();

    console.log(`Deleting from decklistslot...`);
    await db('decklistslot').whereIn('decklist_id', ids).del();

    console.log(`Deleting from decklist...`);
    const count = await db('decklist').whereIn('id', ids).del();
    console.log(`Successfully deleted ${count} public decks!`);

  } catch (err) {
    if (err.sqlMessage) console.error("SQL Error:", err.sqlMessage);
    else console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
