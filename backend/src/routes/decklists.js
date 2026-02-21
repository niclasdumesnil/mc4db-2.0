const { Router } = require('express');
const db = require('../config/database'); // Ton instance Knex
const { resolveImage } = require('../utils/cardSerializer');

const router = Router();

// Route pour récupérer les decklists publiques (Paginées)
router.get('/decklists', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Requête principale remplaçant DecklistManager.php
    const query = db('decklist as d')
      .join('user as u', 'd.user_id', 'u.id')
      .join('card as c', 'd.card_id', 'c.id') // c.id correspond au Héro
      .leftJoin('faction as f', 'c.faction_id', 'f.id')
      .leftJoin('pack as p', 'c.pack_id', 'p.id')
      .select(
        'd.id',
        'd.name',
        'd.date_creation',
        'd.nb_votes as likes',
        'd.nb_favorites as favorites',
        'd.nb_comments as comments',
        'd.version',
        'd.tags',
        'd.meta', // Contient souvent les infos d'aspect/couleur
        'u.username as author_name',
        'u.reputation as author_reputation',
        'c.code as hero_code',
        'c.name as hero_name',
        'f.code as faction_code', // Pour la couleur d'entête
        'p.creator as pack_creator',
        'p.environment as pack_environment',
        'p.status as pack_status'
      )
      // On exclut les anciens decks qui ont un successeur (versionnage)
      .whereNull('d.next_deck')
      .orderBy('d.date_creation', 'desc')
      .limit(limit)
      .offset(offset);

    const decklists = (await query).map(row => ({
      ...row,
      hero_imagesrc: resolveImage(row.hero_code)
    }));

    // Optionnel : Compter le total pour la pagination
    const [{ total }] = await db('decklist').whereNull('next_deck').count('* as total');

    return res.json({
      ok: true,
      data: decklists,
      meta: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total
      }
    });

  } catch (err) {
    console.error('GET /public/decklists error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;