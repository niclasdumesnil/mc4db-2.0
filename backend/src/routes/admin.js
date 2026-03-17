const { Router } = require('express');
const db = require('../config/database');
const crypto = require('crypto');
const { requireAuth, requireAdmin } = require('../middleware/auth.middleware');

let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch (e) { /* optional */ }

const router = Router();

// Apply requireAdmin middleware to all routes in this router since they start with /admin
router.use('/admin', requireAuth, requireAdmin);

// ── Helpers ────────────────────────────────────────────────────────────────

/** Génère un mot de passe aléatoire de 12 caractères */
function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_';
  const buf = crypto.randomBytes(12);
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += chars[buf[i] % chars.length];
  return pwd;
}

/** Hash bcrypt (round 12) — compatible avec le login existant */
function hashPassword(plain) {
  if (bcrypt) return bcrypt.hashSync(plain, 12);
  // fallback cleartext (ne devrait pas arriver)
  return plain;
}

/** Vérifie le mot de passe courant (bcrypt, sha512+salt, cleartext) */
async function verifyPassword(plain, user) {
  const stored = user.password;
  if (!stored) return false;
  if (typeof stored === 'string' && stored.startsWith('$2') && bcrypt) {
    return bcrypt.compareSync(plain, stored);
  }
  const salt = user.salt || '';
  if (salt && typeof stored === 'string' && stored.length >= 86 && stored.length <= 92) {
    for (const it of [1, 2, 3, 5, 10, 100, 500, 1000, 5000]) {
      try {
        const salted = `${plain}{${salt}}`;
        let digest = crypto.createHash('sha512').update(salted).digest();
        for (let k = 1; k < it; k++) {
          digest = crypto.createHash('sha512').update(Buffer.concat([digest, Buffer.from(salted, 'utf8')])).digest();
        }
        if (digest.toString('base64') === stored) return true;
      } catch (_) { /* ignore */ }
    }
  }
  return String(stored) === String(plain);
}

// ==========================================
// GET /admin/stats — Statistiques globales
// ==========================================
router.get('/admin/stats', async (req, res) => {
  try {
    const [{ total_users }]   = await db('user').count('* as total_users');
    const [{ total_private }] = await db('deck').whereNull('next_deck').count('* as total_private');
    const [{ total_public }]  = await db('decklist').whereNull('next_deck').count('* as total_public');

    const [topHeroes, topPublicHeroes] = await Promise.all([
      db('deck as d')
        .join('card as c', 'd.character_id', 'c.id')
        .whereNull('d.next_deck')
        .select('c.name as hero_name', 'c.code as hero_code')
        .count('* as cnt')
        .groupBy('c.id', 'c.name', 'c.code')
        .orderBy('cnt', 'desc')
        .limit(3),
      db('decklist as d')
        .join('card as c', 'd.card_id', 'c.id')
        .whereNull('d.next_deck')
        .select('c.name as hero_name', 'c.code as hero_code')
        .count('* as cnt')
        .groupBy('c.id', 'c.name', 'c.code')
        .orderBy('cnt', 'desc')
        .limit(3),
    ]);

    return res.json({
      ok: true,
      stats: {
        total_users:         Number(total_users)   || 0,
        total_private_decks: Number(total_private) || 0,
        total_public_decks:  Number(total_public)  || 0,
        top_heroes: topHeroes.map(r => ({
          name: r.hero_name, code: r.hero_code, count: Number(r.cnt),
        })),
        top_public_heroes: topPublicHeroes.map(r => ({
          name: r.hero_name, code: r.hero_code, count: Number(r.cnt),
        })),
      },
    });
  } catch (err) {
    console.error('GET /admin/stats error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// GET /admin/users — Liste des users + deck stats
// ==========================================
router.get('/admin/users', async (req, res) => {
  try {
    const users = await db('user')
      .select('id', 'username', 'email', 'enabled', 'donation', 'is_admin', 'reputation', 'date_creation')
      .orderBy('id', 'asc');

    const userIds = users.map(u => u.id);

    const [privateStats, publicStats] = await Promise.all([
      db('deck').whereIn('user_id', userIds).whereNull('next_deck')
        .select('user_id').count('* as cnt').groupBy('user_id'),
      db('decklist').whereIn('user_id', userIds).whereNull('next_deck')
        .select('user_id').count('* as cnt').groupBy('user_id'),
    ]);

    const privateMap = {};
    privateStats.forEach(r => { privateMap[r.user_id] = Number(r.cnt); });
    const publicMap = {};
    publicStats.forEach(r => { publicMap[r.user_id] = Number(r.cnt); });

    const { getFullReputation } = require('../utils/reputation');
    
    // We can do this in parallel for all users
    const repPromises = users.map(u => getFullReputation(u.id));
    const reps = await Promise.all(repPromises);
    const totalRepMap = {};
    const boostMap = {};
    users.forEach((u, i) => { 
      totalRepMap[u.id] = reps[i].total; 
      boostMap[u.id] = reps[i].boost;
    });

    return res.json({
      ok: true,
      users: users.map(u => ({
        id:            u.id,
        username:      u.username,
        email:         u.email,
        enabled:       !!u.enabled,
        is_admin:      !!u.is_admin,
        is_supporter:  u.donation > 0,
        donation:      u.donation,
        date_creation: u.date_creation,
        // UI uses reputation for total, and boost for editing
        reputation:    totalRepMap[u.id] || 0,
        boost:         boostMap[u.id] || 0,
        private_decks: privateMap[u.id] || 0,
        public_decks:  publicMap[u.id]  || 0,
      })),
    });
  } catch (err) {
    console.error('GET /admin/users error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// POST /admin/users — Créer un utilisateur
// ==========================================
router.post('/admin/users', async (req, res) => {
  try {
    const { username, email, is_admin = false, is_supporter = false, reputation = 1 } = req.body || {};
    if (!username || !email) return res.status(400).json({ error: 'username and email are required' });

    // Unicité
    const existing = await db('user')
      .where('username_canonical', username.toLowerCase())
      .orWhere('email_canonical', email.toLowerCase())
      .first();
    if (existing) return res.status(409).json({ error: 'Username or email already exists' });

    const plainPassword = generatePassword();
    const hashedPassword = hashPassword(plainPassword);
    const now = new Date();

    await db('user').insert({
      username,
      username_canonical: username.toLowerCase(),
      email,
      email_canonical:    email.toLowerCase(),
      enabled:     1,
      salt:        null,
      password:    hashedPassword,
      roles:       'a:0:{}',
      date_creation: now,
      date_update:   now,
      reputation:  Math.max(1, parseInt(reputation, 10) || 1),
      donation:    is_supporter ? 1 : 0,
      is_admin:    is_admin ? 1 : 0,
      is_notif_author:    1,
      is_notif_commenter: 1,
      is_notif_mention:   1,
      is_notif_follow:    1,
      is_notif_successor: 1,
      is_share_decks: 0,
      is_new_ui:      0,
      faq:            0,
    });

    const newUser = await db('user').where('username_canonical', username.toLowerCase()).first();
    return res.json({
      ok: true,
      user: { id: newUser.id, username, email, is_admin, is_supporter },
      password: plainPassword,
    });
  } catch (err) {
    console.error('POST /admin/users error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// PUT /admin/users/:id/role — Modifier admin/donator/reputation
// ==========================================
router.put('/admin/users/:id/role', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { is_admin, is_supporter, reputation } = req.body || {};
    const updateData = { date_update: new Date() };
    if (is_admin     !== undefined) updateData.is_admin = is_admin ? 1 : 0;
    if (is_supporter !== undefined) updateData.donation = is_supporter ? 1 : 0;
    if (reputation   !== undefined) {
      if (reputation === 0 || reputation === '0') updateData.reputation = 0;
      else updateData.reputation = parseInt(reputation, 10) || 0;
    }

    await db('user').where('id', id).update(updateData);
    return res.json({ ok: true, reputation: updateData.reputation });
  } catch (err) {
    console.error('PUT /admin/users/:id/role error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// POST /admin/users/:id/recalculate-reputation — Obsolète (dynamique maintenant)
// ==========================================
router.post('/admin/users/:id/recalculate-reputation', async (req, res) => {
  return res.json({ ok: true, obsolete: true });
});

// ==========================================
// POST /admin/users/:id/reset-password — Reset MDP (admin)
// ==========================================
router.post('/admin/users/:id/reset-password', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const user = await db('user').where('id', id).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plainPassword = generatePassword();
    const hashedPassword = hashPassword(plainPassword);

    await db('user').where('id', id).update({
      password:    hashedPassword,
      salt:        null,
      date_update: new Date(),
    });

    return res.json({ ok: true, username: user.username, password: plainPassword });
  } catch (err) {
    console.error('POST /admin/users/:id/reset-password error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ==========================================
// PUT /user/:id/password — Changer son propre MDP
// ==========================================
router.put('/user/:id/password', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password || !confirm_password)
      return res.status(400).json({ error: 'All password fields are required' });
    if (new_password !== confirm_password)
      return res.status(400).json({ error: 'New passwords do not match' });
    if (new_password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await db('user').where('id', id).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await verifyPassword(current_password, user);
    if (!valid) return res.status(403).json({ error: 'Current password is incorrect' });

    const hashedNew = hashPassword(new_password);
    await db('user').where('id', id).update({
      password:    hashedNew,
      salt:        null,
      date_update: new Date(),
    });

    return res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('PUT /user/:id/password error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
