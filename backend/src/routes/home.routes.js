/**
 * Route /api/public/home
 * Fetches aggegated statistics for the home page.
 */
const { Router } = require('express');
const db = require('../config/database');
const { resolveImage } = require('../utils/cardSerializer');

const router = Router();

router.get('/home', async (req, res) => {
  try {
    // 0. Total Public Decks
    const totalDecksRow = await db('decklist')
      .whereNull('next_deck')
      .count('* as cnt')
      .first();
    const total_decks = Number(totalDecksRow?.cnt || 0);

    // 1. Top Heroes (from public decks)
    const topHeroes = await db('decklist as d')
      .join('card as c', 'd.card_id', 'c.id')
      .whereNull('d.next_deck')
      .select('c.name as hero_name', 'c.code as hero_code')
      .count('* as cnt')
      .groupBy('c.id', 'c.name', 'c.code')
      .orderBy('cnt', 'desc')
      .limit(3);

    // 2. Top Cards (excluding resources)
    const topCards = await db('decklistslot as s')
      .join('decklist as d', 's.decklist_id', 'd.id')
      .join('card as c', 's.card_id', 'c.id')
      .join('type as t', 'c.type_id', 't.id')
      .whereNull('d.next_deck')
      .andWhere('t.code', '!=', 'resource')
      .select('c.name as card_name', 'c.code as card_code')
      .countDistinct('d.id as cnt')
      .groupBy('c.id', 'c.name', 'c.code')
      .orderBy('cnt', 'desc')
      .limit(3);

    // 3. Last Release
    // Get the pack with the most recent release date
    let lastPack = await db('pack')
      .orderBy('date_release', 'desc')
      .orderBy('id', 'desc')
      .first();

    let lastPackHeroes = [];
    let lastPackVillains = [];
    if (lastPack) {
      const packCards = await db('card as c')
        .join('type as t', 'c.type_id', 't.id')
        .join('pack as p', 'c.pack_id', 'p.id')
        .where('c.pack_id', lastPack.id)
        .where(function() {
          this.where('p.visibility', '!=', 'false').orWhereNull('p.visibility');
        })
        .whereIn('t.code', ['hero', 'alter_ego', 'villain'])
        .select('c.code', 'c.name', 't.code as type_code', 'p.code as pack_code')
        .orderBy('c.code', 'asc');

      const mappedCards = packCards.map(c => ({
        ...c,
        imagesrc: resolveImage(c.code, c.pack_code)
      }));

      lastPackHeroes = mappedCards.filter(c => c.type_code === 'hero' || c.type_code === 'alter_ego');
      lastPackVillains = mappedCards.filter(c => c.type_code === 'villain');
    }

    // 4. Card of the Day
    // Fetch an array of candidate card codes
    const candidates = await db('card as c')
      .join('faction as f', 'c.faction_id', 'f.id')
      .join('type as t', 'c.type_id', 't.id')
      .join('pack as p', 'c.pack_id', 'p.id')
      .whereIn('f.code', ['justice', 'leadership', 'aggression', 'protection', 'pool', 'basic'])
      .whereIn('t.code', ['event', 'support', 'upgrade', 'ally'])
      .whereNull('c.duplicate_id')
      .where(function() {
        this.where('p.visibility', '!=', 'false').orWhereNull('p.visibility');
      })
      .select('c.id', 'c.code', 'p.code as pack_code');

    let cardOfTheDay = null;
    let cotdDeck = null;
    if (candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      const chosenCardId = candidates[idx].id;
      const chosenCardCode = candidates[idx].code;
      const chosenImageSrc = resolveImage(candidates[idx].code, candidates[idx].pack_code);

      // Find 1 random public deck containing this card
      const randomDeckRow = await db('decklistslot as s')
        .join('decklist as d', 's.decklist_id', 'd.id')
        .where('s.card_id', chosenCardId)
        .whereNull('d.next_deck')
        .select('d.id', 'd.name')
        .orderByRaw('RAND()')
        .first();

      cardOfTheDay = { code: chosenCardCode, imagesrc: chosenImageSrc };
      if (randomDeckRow) {
        cotdDeck = { id: randomDeckRow.id, name: randomDeckRow.name };
      }
    }

    return res.json({
      ok: true,
      total_decks,
      top_heroes: topHeroes.map(r => ({ name: r.hero_name, code: r.hero_code, count: Number(r.cnt) })),
      top_cards: topCards.map(r => ({ name: r.card_name, code: r.card_code, count: Number(r.cnt) })),
      card_of_the_day: cardOfTheDay,
      card_of_the_day_deck: cotdDeck,
      last_release: lastPack ? {
        pack_code: lastPack.code,
        pack_name: lastPack.name,
        size: lastPack.size,
        date_release: lastPack.date_release ? new Date(lastPack.date_release).toISOString().slice(0, 10) : '',
        creator: lastPack.creator,
        heroes: lastPackHeroes,
        villains: lastPackVillains
      } : null
    });
  } catch (err) {
    console.error('GET /api/public/home error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
