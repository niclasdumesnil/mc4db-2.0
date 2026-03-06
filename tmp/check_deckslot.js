const db = require('../backend/src/config/database');
// Find all cards in the Deadpool pack that are hero type or belong to the hero
db('card as c')
  .join('type as t', 'c.type_id', 't.id')
  .join('pack as p', 'c.pack_id', 'p.id')
  .where('p.name', 'Deadpool')
  .select(['c.code','c.name','t.code as type','c.pack_id'])
  .limit(20)
  .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(); });
