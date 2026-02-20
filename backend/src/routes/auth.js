const { Router } = require('express');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch (e) { /* installed later if missing */ }
const LOG_FILE = path.resolve(__dirname, '../../var/logs/auth.log');
try { fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true }); } catch (e) { /* ignore */ }
// Also write a simple debug file adjacent to the backend folder for easier access
const DEBUG_FILE = path.resolve(__dirname, '../../backend_auth_debug.log');
try { fs.writeFileSync(DEBUG_FILE, `auth debug startup ${new Date().toISOString()}\n`, { flag: 'a' }); } catch (e) { /* ignore */ }

const router = Router();

// Simple login endpoint. Expects JSON { login, password }
// Verifies against the `users` table using a plain equality check.
// NOTE: this is intentionally minimal — hashed passwords are not
// handled here. If your users table stores bcrypt/argon2 hashes,
// extend this route to verify using the appropriate library.
router.post('/login', async (req, res) => {
  try {
    // Log body to console and persistent log files for debugging
    console.log('[auth] /login body:', req.body);
    try { fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] BODY ${JSON.stringify(req.body)}\n`); } catch (e) { console.error('Failed writing LOG_FILE', e && e.message); }
    try { fs.appendFileSync(DEBUG_FILE, `[${new Date().toISOString()}] BODY ${JSON.stringify(req.body)}\n`); } catch (e) { console.error('Failed writing DEBUG_FILE', e && e.message); }
    const { login, password } = req.body || {};
    if (!login || !password) return res.status(400).json({ error: 'Missing login or password' });

    // Attempt to locate the user across a set of plausible table and column names
    async function findUserByLogin(loginValue) {
      const tableCandidates = ['users', 'user', 'admin_users', 'mc_user', 'mc_users'];
      const columnCandidates = ['login', 'username', 'user', 'email'];
      for (const t of tableCandidates) {
        for (const c of columnCandidates) {
          try {
            const row = await db(t).where(c, loginValue).first();
            if (row) return { row, table: t, column: c };
          } catch (e) {
            // ignore missing table/column errors and try next
          }
        }
      }
      return null;
    }

    const found = await findUserByLogin(login);
    console.log('[auth] user lookup result:', !!found, found && found.table, found && found.column);
    try { fs.appendFileSync(DEBUG_FILE, `[${new Date().toISOString()}] lookup ${JSON.stringify(found && { table: found.table, column: found.column })}\n`); } catch (e) { /* ignore */ }
    if (!found) return res.status(401).json({ error: 'Invalid credentials or user table not found' });
    const user = found.row;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Verify password using multiple possible encodings
    async function verifyPassword(plain, user) {
      const stored = user.password;
      if (!stored) return false;
      // bcrypt/$2y$ or $2a$
      if (typeof stored === 'string' && stored.startsWith('$2') && bcrypt) {
        return bcrypt.compareSync(plain, stored);
      }

      // If salt column exists and stored value looks like base64 SHA512 (≈88 chars),
      // try Symfony/FOS MessageDigestPasswordEncoder style (sha512, base64, iterations).
      const salt = user.salt || '';
      if (salt && typeof stored === 'string' && stored.length >= 86 && stored.length <= 92) {
        const iterationsToTry = [1, 2, 3, 5, 10, 100, 500, 1000, 5000];
        for (const it of iterationsToTry) {
          try {
            // Symfony style: digest = hash(binary, algo, salted) then for i=1..iterations-1: digest = hash(digest + salted)
            const salted = String(plain) + '{' + String(salt) + '}';
            let digest = crypto.createHash('sha512').update(salted).digest();
            for (let k = 1; k < it; k++) {
              const combo = Buffer.concat([digest, Buffer.from(salted, 'utf8')]);
              digest = crypto.createHash('sha512').update(combo).digest();
            }
            const candidate = digest.toString('base64');
            if (candidate === stored) return true;
          } catch (e) {
            // ignore and try next
          }
        }
      }

      // fallback to direct equality (cleartext)
      return String(stored) === String(plain);
    }

    const ok = await verifyPassword(password, user);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Success — return basic user info (do not return password)
    const safeUser = { id: user.id, login: user.login, name: user.name || null };
    return res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error('Login error', err && err.message ? err.message : err);
    // Return the error message to the client for debugging (temporary)
    return res.status(500).json({ error: err && err.message ? String(err.message) : 'Internal error' });
  }
});

module.exports = router;
