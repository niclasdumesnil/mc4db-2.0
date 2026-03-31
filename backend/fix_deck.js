const db = require('./src/config/database');

async function fix() {
  await db('deck').where('id', 273).update({meta: JSON.stringify({cloned_from_decklist_id: 47, aspect: 'pool'})});
  await db('decklist').where('id', 48).update({previous_deck: 47});
  console.log('Fixed decks 273 and 48');
  process.exit(0);
}

fix();
