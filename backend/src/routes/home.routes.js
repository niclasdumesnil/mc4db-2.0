/**
 * Route /api/public/home
 * Fetches aggegated statistics for the home page.
 */
const { Router } = require('express');
const db = require('../config/database');
const { resolveImage } = require('../utils/cardSerializer');
const fs = require('fs');
const path = require('path');

const ROTATION_FILE = path.join(__dirname, '../../data/rotations.json');

function getCurrentRotationId() {
  const now = new Date();
  const pivot = new Date(now);
  pivot.setHours(8, 0, 0, 0); // Today at 08:00
  let dayOfWeek = pivot.getDay();
  let daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  // If today is Monday but before 8am, we are technically in the previous week
  if (daysSinceMonday === 0 && now.getTime() < pivot.getTime()) {
    daysSinceMonday = 7;
  }
  pivot.setDate(pivot.getDate() - daysSinceMonday);
  return pivot.getTime();
}

function getCurrentDayId() {
  const now = new Date();
  const pivot = new Date(now);
  pivot.setHours(8, 0, 0, 0); // Today at 08:00
  if (now.getTime() < pivot.getTime()) {
    pivot.setDate(pivot.getDate() - 1);
  }
  return pivot.getTime();
}

function getRotationData() {
  if (fs.existsSync(ROTATION_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ROTATION_FILE, 'utf8'));
      if (!data.cardHistory) data.cardHistory = [];
      if (!data.history) data.history = [];
      return data;
    } catch(e) {}
  }
  return { currentWeekId: null, currentDeckId: null, history: [], currentDayId: null, currentCardId: null, currentCotdDeckId: null, cardHistory: [] };
}

function saveRotationData(data) {
  try {
    const dir = path.dirname(ROTATION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ROTATION_FILE, JSON.stringify(data, null, 2));
  } catch(e) {
    console.error('Failed to save rotation data', e);
  }
}

const router = Router();

router.get('/home', async (req, res) => {
  try {
    // 0. Total Public Decks
    const totalDecksRow = await db('decklist')
      .whereNull('next_deck')
      .count('* as cnt')
      .first();
    const total_decks = Number(totalDecksRow?.cnt || 0);

    // 0.5 Total Private Decks
    const totalPrivateDecksRow = await db('deck')
      .count('* as cnt')
      .first();
    const total_private_decks = Number(totalPrivateDecksRow?.cnt || 0);

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

    // 4. Card of the Day (frozen rotating selection)
    const currentDayId = getCurrentDayId();
    let rotData = getRotationData();

    if (rotData.currentDayId !== currentDayId || !rotData.currentCardId) {
      const excludeCardIds = rotData.cardHistory || [];

      const candidatesQuery = db('card as c')
        .join('faction as f', 'c.faction_id', 'f.id')
        .join('type as t', 'c.type_id', 't.id')
        .join('pack as p', 'c.pack_id', 'p.id')
        .whereIn('f.code', ['justice', 'leadership', 'aggression', 'protection', 'pool', 'basic'])
        .whereIn('t.code', ['event', 'support', 'upgrade', 'ally'])
        .whereNull('c.duplicate_id')
        .where(function() {
          this.where('p.visibility', '!=', 'false').orWhereNull('p.visibility');
        })
        .select('c.id');

      if (excludeCardIds.length > 0) {
        candidatesQuery.whereNotIn('c.id', excludeCardIds);
      }

      let newCard = await candidatesQuery.orderByRaw('RAND()').first();

      if (!newCard && excludeCardIds.length > 0) {
        // Failsafe: pick from anywhere if all excluded
        newCard = await db('card as c')
          .join('faction as f', 'c.faction_id', 'f.id')
          .join('type as t', 'c.type_id', 't.id')
          .join('pack as p', 'c.pack_id', 'p.id')
          .whereIn('f.code', ['justice', 'leadership', 'aggression', 'protection', 'pool', 'basic'])
          .whereIn('t.code', ['event', 'support', 'upgrade', 'ally'])
          .whereNull('c.duplicate_id')
          .where(function() {
            this.where('p.visibility', '!=', 'false').orWhereNull('p.visibility');
          })
          .select('c.id')
          .orderByRaw('RAND()').first();
      }

      if (newCard) {
        const potentialCotdDeck = await db('decklistslot as s')
          .join('decklist as d', 's.decklist_id', 'd.id')
          .where('s.card_id', newCard.id)
          .whereNull('d.next_deck')
          .select('d.id')
          .orderByRaw('RAND()')
          .first();

        rotData.currentCardId = newCard.id;
        rotData.currentCotdDeckId = potentialCotdDeck ? potentialCotdDeck.id : null;
        rotData.currentDayId = currentDayId;
        rotData.cardHistory = [newCard.id, ...excludeCardIds].slice(0, 30);
        saveRotationData(rotData);
      }
    }

    let cardOfTheDay = null;
    let cotdDeck = null;

    if (rotData.currentCardId) {
      const cardInfo = await db('card as c')
        .join('pack as p', 'c.pack_id', 'p.id')
        .where('c.id', rotData.currentCardId)
        .select('c.code', 'p.code as pack_code')
        .first();

      if (cardInfo) {
        cardOfTheDay = { code: cardInfo.code, imagesrc: resolveImage(cardInfo.code, cardInfo.pack_code) };
      }

      if (rotData.currentCotdDeckId) {
        let randomDeckRow = await db('decklist as d')
          .join('user as u', 'd.user_id', 'u.id')
          .join('card as c', 'd.card_id', 'c.id')
          .leftJoin('faction as f', 'c.faction_id', 'f.id')
          .leftJoin('pack as p', 'c.pack_id', 'p.id')
          .where('d.id', rotData.currentCotdDeckId)
          .select(
            'd.id', 'd.name', 'd.date_creation', 'd.user_id',
            'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments',
            'd.version', 'd.tags', 'd.meta',
            'u.username as author_name', 'u.reputation as author_reputation',
            'c.code as hero_code', 'c.name as hero_name',
            'f.code as faction_code',
            'p.code as pack_code', 'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
          )
          .first();

        // If the selected deck was unpublished (deleted), try to pick a new one for this card
        if (!randomDeckRow) {
          const potentialCotdDeck = await db('decklistslot as s')
            .join('decklist as d', 's.decklist_id', 'd.id')
            .where('s.card_id', rotData.currentCardId)
            .whereNull('d.next_deck')
            .select('d.id')
            .orderByRaw('RAND()')
            .first();

          if (potentialCotdDeck) {
            rotData.currentCotdDeckId = potentialCotdDeck.id;
            saveRotationData(rotData);
            randomDeckRow = await db('decklist as d')
              .join('user as u', 'd.user_id', 'u.id')
              .join('card as c', 'd.card_id', 'c.id')
              .leftJoin('faction as f', 'c.faction_id', 'f.id')
              .leftJoin('pack as p', 'c.pack_id', 'p.id')
              .where('d.id', potentialCotdDeck.id)
              .select(
                'd.id', 'd.name', 'd.date_creation', 'd.user_id',
                'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments',
                'd.version', 'd.tags', 'd.meta',
                'u.username as author_name', 'u.reputation as author_reputation',
                'c.code as hero_code', 'c.name as hero_name',
                'f.code as faction_code',
                'p.code as pack_code', 'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
              )
              .first();
          } else {
            rotData.currentCotdDeckId = null;
            saveRotationData(rotData);
          }
        }

        if (randomDeckRow) {
          cotdDeck = {
            ...randomDeckRow,
            hero_imagesrc: resolveImage(randomDeckRow.hero_code, randomDeckRow.pack_code)
          };
        }
      }
    }

    // 3.5 Deck of the Week (frozen rotating selection)
    const currentWeekId = getCurrentRotationId();

    // Check if we need to pick a new deck
    if (rotData.currentWeekId !== currentWeekId || !rotData.currentDeckId) {
      const excludeIds = rotData.history || [];

      const newDeckRowQ = db('decklist as d')
        .whereNull('d.next_deck')
        .select('d.id');

      if (excludeIds.length > 0) {
        newDeckRowQ.whereNotIn('d.id', excludeIds);
      }

      const potentialNewDeck = await newDeckRowQ.orderByRaw('RAND()').first();

      if (potentialNewDeck) {
        rotData.currentDeckId = potentialNewDeck.id;
        rotData.currentWeekId = currentWeekId;
        rotData.history = [potentialNewDeck.id, ...excludeIds].slice(0, 10);
        saveRotationData(rotData);
      } else if (excludeIds.length > 0) {
        // Failsafe: if we excluded all decks, pick any!
        const fallback = await db('decklist as d').whereNull('d.next_deck').orderByRaw('RAND()').first();
        if (fallback) {
          rotData.currentDeckId = fallback.id;
          rotData.currentWeekId = currentWeekId;
          rotData.history = [fallback.id];
          saveRotationData(rotData);
        }
      }
    }

    let randomWeeklyDeckRow = null;
    if (rotData.currentDeckId) {
      randomWeeklyDeckRow = await db('decklist as d')
        .join('user as u', 'd.user_id', 'u.id')
        .join('card as c', 'd.card_id', 'c.id')
        .leftJoin('faction as f', 'c.faction_id', 'f.id')
        .leftJoin('pack as p', 'c.pack_id', 'p.id')
        .where('d.id', rotData.currentDeckId)
        .select(
          'd.id', 'd.name', 'd.date_creation', 'd.user_id',
          'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments',
          'd.version', 'd.tags', 'd.meta',
          'u.username as author_name', 'u.reputation as author_reputation',
          'c.code as hero_code', 'c.name as hero_name',
          'f.code as faction_code',
          'p.code as pack_code', 'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
        )
        .first();

      // If the weekly deck was unpublished, pick a new one
      if (!randomWeeklyDeckRow) {
        const excludeIds = rotData.history || [];
        const newDeckRowQ = db('decklist as d').whereNull('d.next_deck').select('d.id');
        if (excludeIds.length > 0) newDeckRowQ.whereNotIn('d.id', excludeIds);

        const potentialNewDeck = await newDeckRowQ.orderByRaw('RAND()').first() || await db('decklist as d').whereNull('d.next_deck').orderByRaw('RAND()').first();

        if (potentialNewDeck) {
          rotData.currentDeckId = potentialNewDeck.id;
          saveRotationData(rotData);
          randomWeeklyDeckRow = await db('decklist as d')
            .join('user as u', 'd.user_id', 'u.id')
            .join('card as c', 'd.card_id', 'c.id')
            .leftJoin('faction as f', 'c.faction_id', 'f.id')
            .leftJoin('pack as p', 'c.pack_id', 'p.id')
            .where('d.id', rotData.currentDeckId)
            .select(
              'd.id', 'd.name', 'd.date_creation', 'd.user_id',
              'd.nb_votes as likes', 'd.nb_favorites as favorites', 'd.nb_comments as comments',
              'd.version', 'd.tags', 'd.meta',
              'u.username as author_name', 'u.reputation as author_reputation',
              'c.code as hero_code', 'c.name as hero_name',
              'f.code as faction_code',
              'p.code as pack_code', 'p.creator as pack_creator', 'p.environment as pack_environment', 'p.status as pack_status'
            )
            .first();
        } else {
          rotData.currentDeckId = null;
          saveRotationData(rotData);
        }
      }
    }

    let deckOfTheWeek = null;
    if (randomWeeklyDeckRow) {
      deckOfTheWeek = {
        ...randomWeeklyDeckRow,
        hero_imagesrc: resolveImage(randomWeeklyDeckRow.hero_code, randomWeeklyDeckRow.pack_code)
      };
    }

    // NEW STATS: Total Cards
    const totalOfficialObj = await db('card as c').join('pack as p', 'c.pack_id', 'p.id').where(b => b.whereNull('p.creator').orWhere('p.creator', 'FFG')).count('* as cnt').first();
    const totalFanmadeObj = await db('card as c').join('pack as p', 'c.pack_id', 'p.id').whereNotNull('p.creator').andWhere('p.creator', '!=', 'FFG').count('* as cnt').first();
    const total_official_cards = Number(totalOfficialObj?.cnt || 0);
    const total_fanmade_cards = Number(totalFanmadeObj?.cnt || 0);

    // -- Apply Translations --
    const localeClean = (req.query.locale || 'en').toLowerCase();
    
    // Map packs
    let lastPackName = lastPack?.name;
    if (lastPack && localeClean !== 'en') {
      const PackModel = require('../models/pack.model');
      const packsMap = await PackModel.getTranslationMap(localeClean);
      if (packsMap[lastPack.code]) lastPackName = packsMap[lastPack.code];
    }

    if (localeClean !== 'en') {
      const allCodes = new Set([
        ...topHeroes.map(h => h.hero_code),
        ...topCards.map(c => c.card_code),
        ...lastPackHeroes.map(c => c.code),
        ...lastPackVillains.map(c => c.code),
      ]);
      if (cotdDeck && cotdDeck.hero_code) allCodes.add(cotdDeck.hero_code);
      if (deckOfTheWeek && deckOfTheWeek.hero_code) allCodes.add(deckOfTheWeek.hero_code);

      if (allCodes.size > 0) {
        const transRows = await db('card_translation')
          .whereIn('code', [...allCodes])
          .where('locale', localeClean)
          .select('code', 'name');
        
        const trMap = {};
        for (const t of transRows) {
          if (t.name) trMap[t.code] = t.name;
        }

        topHeroes.forEach(h => { if (trMap[h.hero_code]) h.hero_name = trMap[h.hero_code]; });
        topCards.forEach(c => { if (trMap[c.card_code]) c.card_name = trMap[c.card_code]; });
        lastPackHeroes.forEach(c => { if (trMap[c.code]) c.name = trMap[c.code]; });
        lastPackVillains.forEach(c => { if (trMap[c.code]) c.name = trMap[c.code]; });
        if (cotdDeck && trMap[cotdDeck.hero_code]) cotdDeck.hero_name = trMap[cotdDeck.hero_code];
        if (deckOfTheWeek && trMap[deckOfTheWeek.hero_code]) deckOfTheWeek.hero_name = trMap[deckOfTheWeek.hero_code];
      }
    }

    // 6. Latest updates from changelog
    let latest_updates = [];
    try {
      const updatesPath = path.join(__dirname, '../../../bundles/updates/updates.json');
      if (fs.existsSync(updatesPath)) {
        const allUpdates = JSON.parse(fs.readFileSync(updatesPath, 'utf8'));
        latest_updates = allUpdates
          .sort((a, b) => new Date(b.date) - new Date(a.date) || (b.version || 0) - (a.version || 0))
          .slice(0, 5);
      }
    } catch (e) { /* ignore */ }

    return res.json({
      ok: true,
      total_decks,
      total_private_decks,
      total_official_cards,
      total_fanmade_cards,
      top_heroes: topHeroes.map(r => ({ name: r.hero_name, code: r.hero_code, count: Number(r.cnt) })),
      top_cards: topCards.map(r => ({ name: r.card_name, code: r.card_code, count: Number(r.cnt) })),
      card_of_the_day: cardOfTheDay,
      card_of_the_day_deck: cotdDeck,
      deck_of_the_week: deckOfTheWeek,
      latest_updates,
      last_release: lastPack ? {
        pack_code: lastPack.code,
        pack_name: lastPackName,
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
