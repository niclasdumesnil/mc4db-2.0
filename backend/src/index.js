/**
 * MarvelCDB Node.js API — Entry Point
 *
 * Runs alongside the Symfony server on a different port (default 4000).
 * Connects to the same MySQL database.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const publicRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const db = require('./config/database');
const Card = require('./models/card.model');
const { serializeCard } = require('./utils/cardSerializer');
const { renderSharedHeader } = require('./utils/pageTemplate');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Asset version for cache-busting (set once at server start)
const assetVersion = Date.now();

// ── Middleware ───────────────────────────────────

// CORS — allow the React frontend (served by Symfony on :8000) to call this API
app.use(
  cors({
    origin: [
      'http://127.0.0.1:8000',
      'http://localhost:8000',
      'http://127.0.0.1:4000',
      'http://localhost:4000',
    ],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    credentials: true,
  })
);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// JSON body parsing (for future POST/PUT routes)
app.use(express.json());

// ── Health check ────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ok', db: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// ── Public API routes ───────────────────────────

// Serve built React bundle and styles for card views
// Resolve project-level asset directories (support both Symfony layout and
// flattened standalone layout). Prefer `web/...` when present so this server
// behaves like the Symfony deployment; fall back to top-level `react`/`css`/`bundles`.
const PROJECT_ROOT = path.resolve(__dirname, '../../');
const reactStaticDir = fs.existsSync(path.join(PROJECT_ROOT, 'web', 'react'))
  ? path.join(PROJECT_ROOT, 'web', 'react')
  : path.join(PROJECT_ROOT, 'react');
// If the built output didn't include fonts, serve the source public fonts as a fallback
const reactPublicFonts = path.join(PROJECT_ROOT, 'react-src', 'public', 'fonts');
if (fs.existsSync(reactPublicFonts)) {
  app.use('/react/fonts', express.static(reactPublicFonts));
}
const cssStaticDir = fs.existsSync(path.join(PROJECT_ROOT, 'web', 'css'))
  ? path.join(PROJECT_ROOT, 'web', 'css')
  : path.join(PROJECT_ROOT, 'css');
const bundlesStaticDir = fs.existsSync(path.join(PROJECT_ROOT, 'web', 'bundles'))
  ? path.join(PROJECT_ROOT, 'web', 'bundles')
  : path.join(PROJECT_ROOT, 'bundles');

app.use('/react', express.static(path.resolve(reactStaticDir)));
// Serve site CSS used by Symfony templates so Node pages match Symfony styling
app.use('/css', express.static(path.resolve(cssStaticDir)));

// /card/ and /card with no code → redirect to the card list page
app.get(['/card', '/card/'], (req, res) => res.redirect(301, '/card-list'));

// Add a simple HTML view that mounts the React card components
// This runs before the API routes so visiting /card/:code returns the React HTML
app.get(['/card/:code.html', '/card/:code'], async (req, res, next) => {
  try {
    const code = req.params.code;
    const row = await Card.findByCode(code);
    if (!row) return res.status(404).send(`<h1>Card ${code} not found</h1>`);
    // Determine request locale from Accept-Language header (no forced override)
    const urlLocale = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
    const showSpoilers = (req.query.show_spoilers === '1' || req.query.show_spoilers === 'true') ? true : false;
    const preferWebpOnly = (req.query.prefer_webp_only === '1' || req.query.prefer_webp_only === 'true') ? true : false;

    // resolve linked card
    let linkedCard = null;
    if (row.linked_to_code) {
      const linkedRow = await Card.findByCode(row.linked_to_code);
      if (linkedRow) {
        linkedCard = serializeCard(linkedRow, { api: true });
        // ensure linked card has an id for client-side DOM lookups
        linkedCard.id = linkedRow.id;
        // Mark linked card as a back side so the CardBack component renders it
        linkedCard.double_sided = true;
      }
    }

    const duplicatedBy = await Card.findDuplicateCodes(row.id);
    const card = serializeCard(row, { api: true, linkedCard, duplicatedBy });
    // ensure card id is present for client-side features (promo buttons reference `card.id`)
    card.id = row.id;
    // Precompute available promo image URLs so the client doesn't need to probe.
    // Determine langDir based on the card's pack language (server-side asset availability).
    // This prevents the client from switching to FR image paths when the card only
    // has EN assets available.
    const langDir = (card.language && card.language.toLowerCase().startsWith('fr')) ? 'FR' : 'EN';

    // Choose the locale we expose to the client: prefer the card's pack language, then Accept-Language.
    const clientLocale = card.language || urlLocale;

    // Precompute available promo image URLs so the client doesn't need to probe.
    try {
      const promoDirs = ['promo-FR', 'promo-EN', 'errata-FR', 'errata-EN', 'alt-FFG-FR', 'alt-FFG-EN'];
      const promoUrls = {};
      const imgParts = (card.imagesrc || '').split('/');
      const filename = imgParts[imgParts.length - 1] || '';
      // Use the resolved bundles directory (cards live under bundles/cards)
      const cardsBase = path.join(bundlesStaticDir, 'cards');

      for (const dir of promoDirs) {
        // skip alt-FFG if not official pack
        if (dir.startsWith('alt-FFG') && (card.creator || '').toString().toUpperCase() !== 'FFG') continue;

        const tryPaths = [];
        // Try common extensions for promo images (webp, jpg, png)
        const baseName = filename.replace(/\.(webp|jpe?g|png)$/i, '');
        const exts = ['.webp', '.jpg', '.png'];
        const packCode = card.pack_code || '';
        
        if (packCode) {
          // Prefer top-level promo dir (e.g. promo-FR/core/15002.jpg)
          for (const ext of exts) tryPaths.push(path.join(cardsBase, dir, packCode, `${baseName}${ext}`));
          // Then lang-specific subfolder (e.g. EN/promo-FR/core/15002.jpg)
          for (const ext of exts) tryPaths.push(path.join(cardsBase, langDir, dir, packCode, `${baseName}${ext}`));
          // Finally EN fallback subfolder
          for (const ext of exts) tryPaths.push(path.join(cardsBase, 'EN', dir, packCode, `${baseName}${ext}`));
        }

        // Prefer top-level promo dir (e.g. promo-FR/15002.jpg)
        for (const ext of exts) tryPaths.push(path.join(cardsBase, dir, `${baseName}${ext}`));
        // Then lang-specific subfolder (e.g. EN/promo-FR/15002.jpg)
        for (const ext of exts) tryPaths.push(path.join(cardsBase, langDir, dir, `${baseName}${ext}`));
        // Finally EN fallback subfolder
        for (const ext of exts) tryPaths.push(path.join(cardsBase, 'EN', dir, `${baseName}${ext}`));

        for (const p of tryPaths) {
          try {
            if (fs.existsSync(p)) {
              // derive URL under the served `/bundles` mount
              const rel = path.relative(bundlesStaticDir, p).replace(/\\/g, '/');
              promoUrls[dir] = `/bundles/${rel}`;
              break;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (Object.keys(promoUrls).length > 0) card.promo_urls = promoUrls;
    } catch (e) {
      // ignore promo detection errors
    }

    // If prefer_webp_only is requested, try to point to webp bundles but
    // fall back to EN or the previously resolved image when missing.
    if (preferWebpOnly) {
      const tryWebpFor = (code, packCode = '', suffix = '') => {
        if (packCode) {
          const candidateLangWithPack = path.join(bundlesStaticDir, 'cards', langDir, packCode, `${code}${suffix}.webp`);
          if (fs.existsSync(candidateLangWithPack)) return `/bundles/cards/${langDir}/${packCode}/${code}${suffix}.webp`;
          const candidateEnWithPack = path.join(bundlesStaticDir, 'cards', 'EN', packCode, `${code}${suffix}.webp`);
          if (fs.existsSync(candidateEnWithPack)) return `/bundles/cards/EN/${packCode}/${code}${suffix}.webp`;
        }

        const candidateLang = path.join(bundlesStaticDir, 'cards', langDir, `${code}${suffix}.webp`);
        if (fs.existsSync(candidateLang)) return `/bundles/cards/${langDir}/${code}${suffix}.webp`;
        const candidateEn = path.join(bundlesStaticDir, 'cards', 'EN', `${code}${suffix}.webp`);
        if (fs.existsSync(candidateEn)) return `/bundles/cards/EN/${code}${suffix}.webp`;
        
        // Root fallback without packCode
        const candidateRoot = path.join(bundlesStaticDir, 'cards', `${code}${suffix}.webp`);
        if (fs.existsSync(candidateRoot)) return `/bundles/cards/${code}${suffix}.webp`;
        return null;
      };

      const webp = tryWebpFor(card.code, card.pack_code, '');
      if (webp) card.imagesrc = webp;

      if (card.backimagesrc !== undefined && card.backimagesrc) {
        const webpBack = tryWebpFor(card.code, card.pack_code, 'b');
        if (webpBack) card.backimagesrc = webpBack;
      }

      if (card.linked_card) {
        const linkedWebp = tryWebpFor(card.linked_card.code, card.linked_card.pack_code, '');
        if (linkedWebp) card.linked_card.imagesrc = linkedWebp;
      }
    }

    const rawCardJson = JSON.stringify(card);

    // Prepare back-side JSON for double-sided cards.
    let rawBackJson = null;
    if (card.linked_card) {
      rawBackJson = JSON.stringify(card.linked_card);
    } else if (card.double_sided) {
      // Construct a back-side card object from the same serialized card
      // using the back-specific fields so the frontend can mount CardBack.
      const backCard = { ...card };
      // Ensure we don't pass nested linked/duplicate metadata to the back card
      delete backCard.linked_card;
      delete backCard.duplicated_by;
      backCard.imagesrc = card.backimagesrc || card.imagesrc;
      backCard.name = card.back_name || card.name;
      backCard.text = card.back_text || card.text;
      backCard.real_text = card.back_text || card.real_text || card.real_text;
      backCard.flavor = card.back_flavor || card.flavor;
      rawBackJson = JSON.stringify(backCard);
    }

    // Escape for placing inside an HTML attribute (use double quotes for attribute)
    const escapeAttr = (s) => {
      return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '\\u003c').replace(/>/g, '&gt;');
    };

    // Safely embed JSON in a <script> tag (escape </script> close sequences)
    const safeJson = (s) => s.replace(/<\//g, '<\\/');

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${card.name ? card.name + ' — MarvelCDB' : 'Card ' + card.code}</title>
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <script>
      window.__CARD_DATA__ = {
        card: ${safeJson(rawCardJson)},
        backCard: ${rawBackJson ? safeJson(rawBackJson) : 'null'},
        showSpoilers: ${showSpoilers},
        locale: ${JSON.stringify(clientLocale)},
        langDir: ${JSON.stringify(langDir)},
        preferWebpOnly: ${preferWebpOnly}
      };
    </script>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;

    res.type('html').send(html);
  } catch (err) {
    next(err);
  }
});

// Landing page
app.get(['/', '/index.html'], async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/';
  const title = 'MC4DB — Collections et cartes Marvel';
  const description = 'Parcourez et recherchez les cartes Marvel Champions — collections, paquets et fiches détaillées.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">

    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee; color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Dashboard page (client-side rendered)
app.get(['/dashboard', '/dashboard/'], async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/dashboard';
  const title = 'Tableau de bord — MarvelCDB';
  const description = 'Votre tableau de bord utilisateur — informations de compte et collection.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">

    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee; color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Public Decklists page (client-side rendered)
app.get(['/decklists', '/decklists/'], async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/decklists';
  const title = 'Public Decklists — MarvelCDB';
  const description = 'Découvrez les meilleures listes de decks de la communauté Marvel Champions.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Card List / Browse page (client-side rendered)
app.get(['/card-list', '/card-list/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/card-list';
  const title = 'Card List — MarvelCDB';
  const description = 'Browse and search all Marvel Champions cards with advanced filters.';
  const image = baseUrl + '/react/images/og-default.svg';

  // Determine locale from Accept-Language header (e.g. 'fr-FR,fr;q=0.9' → 'fr')
  const localeRaw = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
  const locale = localeRaw.split('-')[0].toLowerCase() || 'en';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
    <script>window.__MC_LOCALE__ = ${JSON.stringify(locale)};</script>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// My Decks page (client-side rendered — requires login)
app.get(['/my-decks', '/my-decks/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/my-decks';
  const title = 'My Decks — MarvelCDB';
  const description = 'Manage your private deck collection on MarvelCDB.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Decklists page (client-side rendered)
app.get(['/decklists', '/decklists/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/decklists';
  const title = 'Decklists — MarvelCDB';
  const description = 'Browse public Marvel Champions decklists.';
  const image = baseUrl + '/react/images/og-default.svg';
  const localeRaw = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
  const locale = localeRaw.split('-')[0].toLowerCase() || 'en';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
    <script>window.__MC_LOCALE__ = ${JSON.stringify(locale)};</script>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// My Decks page (client-side rendered)
app.get(['/my-decks', '/my-decks/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/my-decks';
  const title = 'My Decks — MarvelCDB';
  const description = 'Manage your Marvel Champions decks.';
  const image = baseUrl + '/react/images/og-default.svg';
  const localeRaw = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
  const locale = localeRaw.split('-')[0].toLowerCase() || 'en';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
    <script>window.__MC_LOCALE__ = ${JSON.stringify(locale)};</script>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Rules Reference page (client-side rendered – static JSON content)
app.get(['/rules', '/rules/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/rules';
  const title = 'Rules Reference — MarvelCDB';
  const description = 'Complete Marvel Champions Rules Reference with search and index.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Stories page (client-side rendered — Challenge, Pre-set Scenario, Campaign, Free-play)
app.get(['/stories', '/stories/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/stories';
  const title = 'Stories — MarvelCDB';
  const description = 'Browse challenge cards, pre-set scenarios, campaigns and free-play scenarios for Marvel Champions.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Sets page (client-side rendered)
app.get(['/sets', '/sets/'], (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/sets';
  const title = 'Sets — MarvelCDB';
  const description = 'Parcourez les sets héros, vilains et modulaires de Marvel Champions.';
  const image = baseUrl + '/react/images/og-default.svg';
  const localeRaw = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
  const locale = localeRaw.split('-')[0].toLowerCase() || 'en';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
    <script>window.__MC_LOCALE__ = ${JSON.stringify(locale)};</script>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Redirect legacy plural decklist URL to singular
app.get(['/decklists/:id(\\d+)', '/decklists/:id(\\d+).json'], (req, res) => {
  const isJson = req.path.endsWith('.json');
  res.redirect(301, `/decklist/${req.params.id}${isJson ? '.json' : ''}`);
});

// Public Deck View page (client-side rendered)
app.get(['/decklist/:id', '/decklist/view/:id'], (req, res) => {
  const localeRaw = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
  const locale = localeRaw.split('-')[0].toLowerCase() || 'en';
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Deck View — MarvelCDB</title>
    <meta name="description" content="View a Marvel Champions deck on MarvelCDB.">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
    <script>window.__MC_LOCALE__ = ${JSON.stringify(locale)};</script>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// New Deck page (client-side rendered — requires login)
app.get('/deck/new', (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = baseUrl + '/deck/new';
  const title = 'New Deck — MarvelCDB';
  const description = 'Choose a hero and create a new Marvel Champions deck.';
  const image = baseUrl + '/react/images/og-default.svg';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${image}">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee;color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// My Deck View page (client-side rendered — requires login)
app.get(['/my-decks/:id', '/deck/view/:id'], (req, res) => {
  const localeRaw = (req.acceptsLanguages && req.acceptsLanguages()[0]) || 'en';
  const locale = localeRaw.split('-')[0].toLowerCase() || 'en';
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>My Deck — MarvelCDB</title>
    <meta name="description" content="View your private deck on MarvelCDB.">
    <link rel="stylesheet" href="/react/css/mc4db.css?v=">
    <script>window.__MC_LOCALE__ = ${JSON.stringify(locale)};</script>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <script src="/react/js/mc4db.js?v="></script>
  </body>
</html>`;
  res.type('html').send(html);
});

// Mount API routes after the HTML route
app.use('/api/public', publicRoutes);

// Also mount at root level so other API paths still work without prefix
app.use('/', publicRoutes);

// ── Static files (optional — serve card images from web/bundles) ──

app.use('/bundles', express.static(path.resolve(bundlesStaticDir)));

// ── 404 catch-all ───────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: { status: 404, message: `Route ${req.originalUrl} not found` } });
});

// ── Error handler ───────────────────────────────

app.use(errorHandler);

// ── Start server ────────────────────────────────

async function start() {
  // Verify DB connection before starting
  try {
    await db.raw('SELECT 1');
    console.log(`✓ Database connected (${process.env.DB_NAME || 'symphony_merlin'})`);
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    console.error('  Check your .env DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n  ╔══════════════════════════════════════════╗`);
    console.log(`  ║  MarvelCDB Node API                      ║`);
    console.log(`  ║  http://127.0.0.1:${PORT}                    ║`);
    console.log(`  ║  Health: http://127.0.0.1:${PORT}/health      ║`);
    console.log(`  ╚══════════════════════════════════════════╝\n`);
  });
}

start();
