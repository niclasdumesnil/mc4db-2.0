const db = require('./src/config/database');
const Card = require('./src/models/Card');
const { serializeCard } = require('./src/utils/cardSerializer');

async function test() {
    const row = await Card.findByCode('01016');
    const card = serializeCard(row, { api: true });
    console.log(card.imagesrc);
    console.log(card.backimagesrc);
    process.exit(0);
}

test();
