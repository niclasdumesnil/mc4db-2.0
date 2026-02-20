const { Router } = require('express');
const db = require('../config/database');

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

    // Mapping exhaustif basé sur l'entité PHP et le fichier ORM YML
    const completeUser = {
      id: row.id,
      username: row.username,
      email: row.email,
      
      // Timestamps
      date_creation: row.date_creation,
      date_update: row.date_update,
      
      // Profile & Social
      reputation: row.reputation,
      resume: row.resume,
      color: row.color,
      donation: row.donation,
      faq: !!row.faq,
      
      // Packs & Collections
      owned_packs: row.owned_packs,

      // UI & Settings
      is_share_decks: !!row.is_share_decks,
      is_new_ui: !!row.is_new_ui,

      // Notification Settings
      notifications: {
        author: !!row.is_notif_author,
        commenter: !!row.is_notif_commenter,
        mention: !!row.is_notif_mention,
        follow: !!row.is_notif_follow,
        successor: !!row.is_notif_successor
      }
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
router.put('/user/:id/settings', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

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

module.exports = router;