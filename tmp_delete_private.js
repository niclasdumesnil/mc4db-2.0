const db = require('./backend/src/config/database');

async function run() {
  try {
    const ids = (await db('deck').select('id')).map(r => r.id);
    if (ids.length === 0) {
      console.log('No private decks found.');
      return;
    }

    console.log(`Found ${ids.length} private decks to delete.`);

    // 1. Sever self-referencing FKs (next_deck, previous_deck) on deck table to prevent FK errors when deleting
    console.log(`Unlinking next_deck and previous_deck...`);
    await db('deck').update({ next_deck: null, previous_deck: null });

    // 2. Sever links from decklists to decks
    console.log(`Unlinking decklists parent_deck_id...`);
    await db('decklist').update({ parent_deck_id: null });

    // 3. Delete dependent rows completely
    console.log(`Deleting team_deck references...`);
    if (await db.schema.hasTable('team_deck')) await db('team_deck').del();

    console.log(`Deleting deckchange...`);
    await db('deckchange').del();

    console.log(`Deleting deckslot...`);
    await db('deckslot').del();

    console.log(`Deleting sidedeckslot...`);
    await db('sidedeckslot').del();

    // 4. Finally delete the decks
    console.log(`Deleting decks...`);
    const count = await db('deck').del();
    console.log(`Successfully deleted ${count} private decks! Database is now clean.`);

  } catch (err) {
    if (err.sqlMessage) console.error("SQL Error:", err.sqlMessage);
    else console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
