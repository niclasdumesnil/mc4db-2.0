const db = require('../backend/src/config/database');
db('card as c')
  .join('type as t', 'c.type_id', 't.id')
  .join('pack as p', 'c.pack_id', 'p.id')
  .where('t.code', 'hero')
  .whereRaw("c.code LIKE '%a'")
  .where(function() { this.where('c.name','like','%ronheart%').orWhere('c.name','like','%eadpool%') })
  .select(['c.code','c.name','p.name as pack','p.id as pack_id'])
  .orderBy('p.id').orderBy('c.code')
  .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(); });
