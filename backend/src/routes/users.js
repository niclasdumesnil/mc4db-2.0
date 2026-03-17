const { Router } = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

// ==========================================
// GET : Récupérer les infos complètes de l'utilisateur
// ==========================================
router.get('/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const row = await db('user').where('id', id).first();
    if (!row) return res.status(404).json({ error: 'User not found' });

    // Published decks stats (table decklist)
    const [{ published_count }] = await db('decklist')
      .where('user_id', id)
      .whereNull('next_deck')
      .count('* as published_count');

    const topHeroRow = await db('decklist as d')
      .join('card as c', 'd.card_id', 'c.id')
      .where('d.user_id', id)
      .whereNull('d.next_deck')
      .select('c.name as hero_name', 'c.code as hero_code')
      .count('* as cnt')
      .groupBy('c.id', 'c.name', 'c.code')
      .orderBy('cnt', 'desc')
      .first();

    // Private decks stats (table deck)
    const [{ private_count }] = await db('deck')
      .where('user_id', id)
      .whereNull('next_deck')
      .count('* as private_count');

    const topPrivateHeroRow = await db('deck as d')
      .join('card as c', 'd.character_id', 'c.id')
      .where('d.user_id', id)
      .whereNull('d.next_deck')
      .select('c.name as hero_name', 'c.code as hero_code')
      .count('* as cnt')
      .groupBy('c.id', 'c.name', 'c.code')
      .orderBy('cnt', 'desc')
      .first();

    // Collection stats: count official + fan-made cards from owned packs
    const ownedPackIds = (row.owned_packs || '')
      .split(',')
      .map(s => parseInt(s, 10))
      .filter(n => n > 0);

    let collectionOfficial = 0;
    let collectionFanmade  = 0;
    let collectionSumOfficial = 0;
    let collectionSumFanmade = 0;

    if (ownedPackIds.length > 0) {
      const collStats = await db('card as c')
        .join('pack as p', 'c.pack_id', 'p.id')
        .whereIn('p.id', ownedPackIds)
        .select(
          db.raw('SUM(p.creator IS NULL) as official'),
          db.raw('SUM(IF(p.creator IS NULL, c.quantity, 0)) as sum_official'),
          db.raw('SUM(p.creator IS NOT NULL) as fanmade'),
          db.raw('SUM(IF(p.creator IS NOT NULL, c.quantity, 0)) as sum_fanmade')
        )
        .first();
      collectionOfficial = Number(collStats?.official ?? 0);
      collectionSumOfficial = Number(collStats?.sum_official ?? 0);
      collectionFanmade  = Number(collStats?.fanmade  ?? 0);
      collectionSumFanmade  = Number(collStats?.sum_fanmade  ?? 0);
    }

    // Calcul dynamique de la réputation
    const { getFullReputation } = require('../utils/reputation');
    const { total: totalRep } = await getFullReputation(id);

    // Mapping exhaustif basé sur l'entité PHP et le fichier ORM YML
    const completeUser = {
      id: row.id,
      username: row.username,
      email: row.email,
      
      // Timestamps
      date_creation: row.date_creation,
      date_update: row.date_update,
      
      // Profile & Social
      reputation: totalRep,
      resume: row.resume,
      color: row.color,
      donation: row.donation,
      faq: !!row.faq,
      
      // Packs & Collections
      owned_packs: row.owned_packs,
      collection_official: collectionOfficial,
      collection_sum_official: collectionSumOfficial,
      collection_fanmade:  collectionFanmade,
      collection_sum_fanmade: collectionSumFanmade,

      // UI & Settings
      is_share_decks: !!row.is_share_decks,
      is_new_ui: !!row.is_new_ui,
      is_admin: !!row.is_admin,
      is_donator: !!(Number(row.donation) > 0),

      // Notification Settings
      notifications: {
        author: !!row.is_notif_author,
        commenter: !!row.is_notif_commenter,
        mention: !!row.is_notif_mention,
        follow: !!row.is_notif_follow,
        successor: !!row.is_notif_successor
      },

      // Published decks stats
      published_decks_count: Number(published_count) || 0,
      top_hero: topHeroRow
        ? { name: topHeroRow.hero_name, code: topHeroRow.hero_code, count: Number(topHeroRow.cnt) }
        : null,

      // Private decks stats
      private_decks_count: Number(private_count) || 0,
      top_private_hero: topPrivateHeroRow
        ? { name: topPrivateHeroRow.hero_name, code: topPrivateHeroRow.hero_code, count: Number(topPrivateHeroRow.cnt) }
        : null
    };

    return res.json({ ok: true, user: completeUser });
  } catch (err) {
    console.error('GET /user/:id error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// PUT : Mettre à jour les paramètres de l'utilisateur
// ==========================================
router.put('/user/:id/settings', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    
    // Security: Stop IDOR vulnerability
    if (req.user.id !== id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own settings' });
    }

    const data = req.body;
    const updateData = {};

    // Traduction des booléens du Frontend vers les entiers (1/0) de la BDD SQL
    if (data.share_decks !== undefined) updateData.is_share_decks = data.share_decks ? 1 : 0;
    if (data.new_ui !== undefined) updateData.is_new_ui = data.new_ui ? 1 : 0;
    if (data.notif_author !== undefined) updateData.is_notif_author = data.notif_author ? 1 : 0;
    if (data.notif_commenter !== undefined) updateData.is_notif_commenter = data.notif_commenter ? 1 : 0;
    if (data.notif_mention !== undefined) updateData.is_notif_mention = data.notif_mention ? 1 : 0;
    if (data.notif_follow !== undefined) updateData.is_notif_follow = data.notif_follow ? 1 : 0;
    if (data.notif_successor !== undefined) updateData.is_notif_successor = data.notif_successor ? 1 : 0;

    // Mise à jour de la date de modification
    updateData.date_update = new Date();

    // Exécution de la requête si au moins un paramètre a été envoyé
    if (Object.keys(updateData).length > 0) {
      await db('user').where('id', id).update(updateData);
    }

    return res.json({ ok: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('PUT /user/:id/settings error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// PUT : Mettre à jour les packs possédés
// ==========================================
router.put('/user/:id/packs', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    // Security: Stop IDOR vulnerability
    if (req.user.id !== id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own packs' });
    }

    const { owned_packs } = req.body; // array of integers
    if (!Array.isArray(owned_packs)) return res.status(400).json({ error: 'owned_packs must be an array' });

    const packed = owned_packs.filter(n => Number.isInteger(n) && n > 0).join(',');
    await db('user').where('id', id).update({ owned_packs: packed, date_update: new Date() });

    return res.json({ ok: true, owned_packs: packed });
  } catch (err) {
    console.error('PUT /user/:id/packs error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// GET : Rechercher un utilisateur par pseudo (autocomplete)
// ==========================================
router.get('/users/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (q.trim().length < 2) {
      return res.json({ ok: true, users: [] });
    }

    const users = await db('user')
      .where('username', 'like', `%${q}%`)
      // .where('is_share_decks', 1) // Optionally restrict to users who share decks, but for now we just find users
      .select('id', 'username')
      .limit(10);

    return res.json({ ok: true, users });
  } catch (err) {
    console.error('GET /users/search error', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;