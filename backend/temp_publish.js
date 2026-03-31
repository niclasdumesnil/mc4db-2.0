const db=require('./src/config/database'); 
async function q() { 
  try { 
    const deck = await db('deck').where({ id: 273 }).first(); 
    const userId=1; 
    const deckId=273; 
    const predecessorId = deck.parent_decklist_id || null; 
    let derivedFromDecklistId = null; 
    let deckMeta = {}; 
    try { deckMeta = JSON.parse(deck.meta); } catch(e){} 
    if (deckMeta && deckMeta.cloned_from_decklist_id) { 
      derivedFromDecklistId = parseInt(deckMeta.cloned_from_decklist_id, 10); 
    } 
    const [newDecklistId] = await db('decklist').insert({ 
      user_id: userId, 
      card_id: deck.character_id, 
      last_pack_id: deck.last_pack_id, 
      parent_deck_id: deckId, 
      precedent_decklist_id: predecessorId, 
      previous_deck: derivedFromDecklistId, 
      uuid: require('crypto').randomUUID(), 
      name: deck.name, 
      name_canonical: 'test-canonical', 
      description_md: deck.description_md || '', 
      description_html: '', 
      tags: deck.tags || '', 
      xp: deck.xp || 0, 
      xp_spent: deck.xp_spent || 0, 
      xp_adjustment: deck.xp_adjustment || 0, 
      exiles: deck.exiles || null, 
      meta: deck.meta || null, 
      version: '2.0', 
      nb_votes: 0, 
      nb_favorites: 0, 
      nb_comments: 0, 
      date_creation: db.fn.now(), 
      date_update: db.fn.now() 
    }); 
    console.log('Insert OK:', newDecklistId); 
  } catch(e) { 
    console.error('ERROR:', e.message); 
  } 
  process.exit(0); 
} 
q();
