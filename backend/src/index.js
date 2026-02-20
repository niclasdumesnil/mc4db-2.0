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
const Card = require('./models/Card');
const { serializeCard } = require('./utils/cardSerializer');
const { renderSharedHeader } = require('./utils/pageTemplate');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

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
    methods: ['GET', 'POST', 'OPTIONS'],
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
const cssStaticDir = fs.existsSync(path.join(PROJECT_ROOT, 'web', 'css'))
  ? path.join(PROJECT_ROOT, 'web', 'css')
  : path.join(PROJECT_ROOT, 'css');
const bundlesStaticDir = fs.existsSync(path.join(PROJECT_ROOT, 'web', 'bundles'))
  ? path.join(PROJECT_ROOT, 'web', 'bundles')
  : path.join(PROJECT_ROOT, 'bundles');

app.use('/react', express.static(path.resolve(reactStaticDir)));
// Serve site CSS used by Symfony templates so Node pages match Symfony styling
app.use('/css', express.static(path.resolve(cssStaticDir)));

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
      const promoDirs = ['promo-FR', 'promo-EN', 'alt-FFG'];
      const promoUrls = {};
      const imgParts = (card.imagesrc || '').split('/');
      const filename = imgParts[imgParts.length - 1] || '';
      // Use the resolved bundles directory (cards live under bundles/cards)
      const cardsBase = path.join(bundlesStaticDir, 'cards');

      for (const dir of promoDirs) {
        // skip alt-FFG if not official pack
        if (dir === 'alt-FFG' && (card.creator || '').toString().toUpperCase() !== 'FFG') continue;

        const tryPaths = [];
        // Try common extensions for promo images (webp, jpg, png)
        const baseName = filename.replace(/\.(webp|jpe?g|png)$/i, '');
        const exts = ['.webp', '.jpg', '.png'];
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
      const tryWebpFor = (code, suffix = '') => {
        const candidateLang = path.join(bundlesStaticDir, 'cards', langDir, `${code}${suffix}.webp`);
        if (fs.existsSync(candidateLang)) return `/bundles/cards/${langDir}/${code}${suffix}.webp`;
        const candidateEn = path.join(bundlesStaticDir, 'cards', 'EN', `${code}${suffix}.webp`);
        if (fs.existsSync(candidateEn)) return `/bundles/cards/EN/${code}${suffix}.webp`;
        return null;
      };

      const webp = tryWebpFor(card.code, '');
      if (webp) card.imagesrc = webp;

      if (card.backimagesrc !== undefined && card.backimagesrc) {
        const webpBack = tryWebpFor(card.code, 'b');
        if (webpBack) card.backimagesrc = webpBack;
      }

      if (card.linked_card) {
        const linkedWebp = tryWebpFor(card.linked_card.code, '');
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

    const cardJson = escapeAttr(rawCardJson);
    const backJson = rawBackJson ? escapeAttr(rawBackJson) : null;

    const html = `<!doctype html>
<html lang="en">
    <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Card ${card.code}</title>
    <!-- Include site-wide styles (same as Symfony) -->
    <link rel="stylesheet" href="/css/app_bootstrap_1.css">
    <link rel="stylesheet" href="/bundles/app/css/merlinsdb.css">
    <link rel="stylesheet" href="/css/app_style_2.css">
    <link rel="stylesheet" href="/css/app_icons_3.css">
    <link rel="stylesheet" href="/css/app_languages_4.css">
    <!-- Card-specific bundled CSS -->
    <link rel="stylesheet" href="/react/css/card.css">
    <!-- Inline shim: ensure font and icon scoping match Symfony behaviour -->
    <style>
      /* Keep card names white like the Symfony page */
      .card-name { color: #fff !important; }

      /* Apply the panel/game font to common text elements only (avoid using
         the universal selector which would override icon fonts and pseudo
         elements). Do not use !important so the icon font rules from
         app_icons_3.css can still win for icon classes. */
      .mc-card-panel,
      .mc-card-panel h1,
      .mc-card-panel h2,
      .mc-card-panel h3,
      .mc-card-panel p,
      .mc-card-panel div,
      .mc-card-panel a,
      .mc-card-panel li,
      .mc-card-panel span {
        font-family: "Marvel Champions", "Open Sans", Arial, sans-serif;
      }

      /* Respect the application's icon font defined in /css/app_icons_3.css
         which registers 'marvel-icons'. Re-assert it here for any icon
         classes to be safe, but using the same family name so the glyphs
         render correctly. */
      [class^="icon-"],
      [class*=" icon-"],
      .icon,
      .mc-icon,
      .icon-unique {
        font-family: 'marvel-icons' !important;
        speak: none;
        font-style: normal;
        font-weight: normal;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      /* Page footer/shield style matching the original merlinsdb appearance */
      /* Make footer flush with the card and the same width as the visual column (400px)
        so it appears 'collé' under the card image. */
      /* Footer is rendered server-side inside the mc-card-panel wrapper */
      .mc-page-footer{display:block}
      /* Default styling; exact width will be set via JS to match the card panel */
      .mc-page-footer .mc-shield{display:inline-flex;align-items:center;gap:8px;background:#ffffff;border-radius:8px;padding:12px 16px;border:1px solid #cbd5e1;color:#0f172a;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;box-shadow:0 1px 0 rgba(2,6,23,0.04);justify-content:center}
      /* Slightly smaller svg to fit inside the pill */
      .mc-page-footer .mc-shield svg{width:18px;height:18px;display:block}
    </style>
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="wrapper">
      <div class="main white container">
        <div class="mc-card-panel tw-text-slate-300 tw-border tw-border-slate-800 tw-overflow-hidden tw-shadow-2xl">
          <div data-react-component="CardFront" data-card="${cardJson}" data-show-spoilers="${showSpoilers ? 'true' : 'false'}" data-locale="${clientLocale}" data-langdir="${langDir}" data-prefer-webp-only="${preferWebpOnly ? 'true' : 'false'}"></div>
      <div class="mc-page-footer">
        <div class="mc-shield">
          <!-- Inline shield SVG copied from merlinsdb for pixel-perfect rendering -->
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="960.283" height="960.283" viewBox="0 0 254.075 254.075"><defs><linearGradient id="f"><stop offset="0" stop-color="#d40018"/><stop offset="1" stop-color="#d40018" stop-opacity="0"/></linearGradient><linearGradient id="a"><stop offset="0" stop-color="#081e4c"/><stop offset="1" stop-color="#081e4c" stop-opacity="0"/></linearGradient><linearGradient id="b"><stop offset="0" stop-color="#0183c7"/><stop offset="1" stop-color="#0183c7" stop-opacity="0"/></linearGradient><linearGradient id="e"><stop offset="0" stop-color="#001749"/><stop offset="1" stop-color="#001749" stop-opacity="0"/></linearGradient><linearGradient id="d"><stop offset="0" stop-color="#f9fdff"/><stop offset="1" stop-color="#f9fdff" stop-opacity="0"/></linearGradient><linearGradient id="c"><stop offset="0" stop-color="#4b4c4b"/><stop offset="1" stop-color="#4b4c4b" stop-opacity="0"/></linearGradient><linearGradient id="q"><stop offset="0" stop-color="#464646"/><stop offset=".149" stop-color="#e6e6e6"/><stop offset="1" stop-color="#464646"/></linearGradient><linearGradient id="u"><stop offset="0" stop-color="#464646"/><stop offset=".363" stop-color="#e6e6e6"/><stop offset="1" stop-color="#464646"/></linearGradient><linearGradient id="t"><stop offset="0" stop-color="#464646"/><stop offset=".006" stop-color="#e6e6e6"/><stop offset="1" stop-color="#464646"/></linearGradient><linearGradient id="v"><stop offset="0" stop-color="#464646"/><stop offset=".438" stop-color="#e6e6e6"/><stop offset="1" stop-color="#464646"/></linearGradient><radialGradient gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1 0 0 1 -588.664 0)" r="78.508" cy="499.666" cx="-934.172" id="g"><stop offset=".153" stop-color="#c99e4e"/><stop offset=".292" stop-color="#d6ad5c"/><stop offset=".474" stop-color="#f2deb0"/><stop offset=".782" stop-color="#d7ad5b"/><stop offset="1" stop-color="#c99f4f"/></radialGradient><linearGradient id="w"><stop offset="0" stop-color="#006936"/><stop offset=".577" stop-color="#20a854"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="x"><stop offset="0" stop-color="#464646"/><stop offset=".502" stop-color="#e6e6e6"/><stop offset="1" stop-color="#464646"/></linearGradient><linearGradient id="y"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="z"><stop offset="0" stop-color="#898989"/><stop offset=".5" stop-color="#e6e6e6"/><stop offset="1" stop-color="#a4a4a4"/></linearGradient><linearGradient id="A"><stop offset="0" stop-color="#fff"/><stop offset=".778" stop-color="#cbcbcb"/><stop offset="1" stop-color="#8c8c8c"/></linearGradient><linearGradient id="B"><stop offset="0" stop-color="#fff" stop-opacity=".863"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="C"><stop offset="0" stop-color="#fff"/><stop offset=".556" stop-color="#bebebe"/><stop offset="1" stop-color="#646464"/></linearGradient><linearGradient id="D"><stop offset="0" stop-color="#6e6e6e"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#a1a1a1"/></linearGradient><linearGradient id="E"><stop offset="0" stop-color="#e6e6e6"/><stop offset="1" stop-color="#818181"/></linearGradient><linearGradient y2="446.761" x2="89.021" y1="578.029" x1="247.449" gradientUnits="userSpaceOnUse" id="s"><stop offset="0" stop-color="#e1ddd9"/><stop offset=".53" stop-color="#d7d1cc"/><stop offset=".618" stop-color="#c8c3be"/><stop offset=".775" stop-color="#bdb8b4"/><stop offset="1" stop-color="#8a8684"/></linearGradient><linearGradient id="r" gradientUnits="userSpaceOnUse" x1="247.449" y1="578.029" x2="89.021" y2="446.761"><stop offset="0" stop-color="#8a8684"/><stop offset=".225" stop-color="#bdb8b4"/><stop offset=".382" stop-color="#c8c3be"/><stop offset=".47" stop-color="#d7d1cc"/><stop offset="1" stop-color="#e1ddd9"/></linearGradient><linearGradient id="F"><stop offset="0" stop-color="#161650" stop-opacity=".719"/><stop offset="1" stop-color="#161650"/></linearGradient><radialGradient id="h" cx="286.312" cy="225.696" r="26.271" gradientUnits="userSpaceOnUse"><stop offset=".354" stop-color="#cca130"/><stop offset=".557" stop-color="#cda232"/><stop offset=".636" stop-color="#d1a73a"/><stop offset=".693" stop-color="#d9b047"/><stop offset=".74" stop-color="#e3be5a"/><stop offset=".78" stop-color="#f1cf74"/><stop offset=".815" stop-color="#ffe595"/><stop offset=".875" stop-color="#fee291"/><stop offset=".921" stop-color="#f6d884"/><stop offset=".963" stop-color="#e9c76e"/><stop offset="1" stop-color="#d7b254"/></radialGradient><linearGradient id="o" gradientUnits="userSpaceOnUse" x1="274.913" y1="510.481" x2="397.753" y2="410.023"><stop offset=".281" stop-color="#c99e4e"/><stop offset=".456" stop-color="#dfba68"/><stop offset=".648" stop-color="#f2d180"/><stop offset=".832" stop-color="#fce090"/><stop offset="1" stop-color="#ffe595"/></linearGradient><radialGradient id="p" cx="-942.006" cy="434.46" r="68.495" gradientTransform="matrix(-1 0 0 1 -588.664 0)" gradientUnits="userSpaceOnUse"><stop offset=".786" stop-color="#c99e4e"/><stop offset=".807" stop-color="#d6ad5c"/><stop offset=".846" stop-color="#e8c574"/><stop offset=".889" stop-color="#f6d786"/><stop offset=".936" stop-color="#fee291"/><stop offset="1" stop-color="#ffe595"/></radialGradient><linearGradient id="m" gradientUnits="userSpaceOnUse" x1="177.472" y1="431.982" x2="326.865" y2="505.377"><stop offset=".281" stop-color="#c99e4e"/><stop offset=".456" stop-color="#dfba68"/><stop offset=".648" stop-color="#f2d180"/><stop offset=".832" stop-color="#fce090"/><stop offset="1" stop-color="#ffe595"/></linearGradient><radialGradient id="n" cx="233.106" cy="434.975" r="49.953" gradientUnits="userSpaceOnUse"><stop offset=".798" stop-color="#c99e4e"/><stop offset=".83" stop-color="#d7af5d"/><stop offset=".897" stop-color="#edcc7b"/><stop offset=".956" stop-color="#fbde8e"/><stop offset="1" stop-color="#ffe595"/></radialGradient><radialGradient gradientUnits="userSpaceOnUse" gradientTransform="matrix(1.569 0 0 1.5529 436.688 737.15)" r="4.824" cy="-324.549" cx="-95.879" id="i"><stop offset=".23" stop-color="#fee292"/><stop offset=".416" stop-color="#f1d180"/><stop offset=".775" stop-color="#d0a756"/><stop offset=".843" stop-color="#c99e4e"/></radialGradient><linearGradient y2="271.08" x2="257.399" y1="326.029" x1="334.59" gradientUnits="userSpaceOnUse" id="l"><stop offset=".579" stop-color="#c99e4e"/><stop offset=".67" stop-color="#dcb564"/><stop offset=".792" stop-color="#f0cf7e"/><stop offset=".905" stop-color="#fcdf8f"/><stop offset="1" stop-color="#ffe595"/></linearGradient><linearGradient y2="341.39" x2="287.499" y1="340.848" x1="303.759" gradientUnits="userSpaceOnUse" id="k"><stop offset=".421" stop-color="#c99e4e"/><stop offset=".546" stop-color="#dcb564"/><stop offset=".714" stop-color="#f0cf7e"/><stop offset=".87" stop-color="#fcdf8f"/><stop offset="1" stop-color="#ffe595"/></linearGradient><linearGradient y2="341.419" x2="284.655" y1="340.899" x1="272.163" gradientUnits="userSpaceOnUse" id="j"><stop offset=".281" stop-color="#c99e4e"/><stop offset=".456" stop-color="#dfba68"/><stop offset=".648" stop-color="#f2d180"/><stop offset=".832" stop-color="#fce090"/><stop offset="1" stop-color="#ffe595"/></linearGradient></defs><g transform="translate(29.893 -50.11)"><circle cx="97.144" cy="177.148" r="124.561" fill="#fff" stroke="#000" stroke-width="4.953"/><path d="M90.378 278.911a102.005 102.005 0 0 1-43.4-12.96c-3.565-1.993-9.345-5.81-9.345-6.172 0-.14.876-1.49 1.943-2.99 1.068-1.511 2.97-4.24 4.22-6.073a9498.239 9498.239 0 0 1 22.858-33.169 980.951 980.951 0 0 0 10.07-14.722.554.554 0 0 1 .472-.332c.202 0 4.693 4.884 10 10.855a361.422 361.422 0 0 0 9.848 10.855c.12 0 4.551-4.894 9.868-10.875 5.307-5.971 9.788-10.815 9.949-10.754.16.05 4.098 5.598 8.74 12.325l10.553 15.306c16.645 24.106 20.079 29.11 20.2 29.403.14.403-2.92 2.568-7.351 5.226a102.388 102.388 0 0 1-58.625 14.077zm-69.3-33.864c-5.538-6.223-11.267-14.52-14.6-21.166l-.554-1.128 4.199-4.592a17052.814 17052.814 0 0 0 37.65-41.345l.947-1.038 2.799 3.303c8.257 9.758 13.554 16.192 13.554 16.494 0 .282-7.361 9.526-36.06 45.283-2.89 3.585-5.347 6.556-5.478 6.606-.13.04-1.228-1.047-2.457-2.417zm140.955-7.985l-20.703-25.808c-6.777-8.439-12.315-15.477-12.315-15.638 0-.282 15.738-19.314 16.212-19.606.13-.08 1.712 1.5 3.524 3.504 1.813 2.014 8.821 9.707 15.558 17.098l18.054 19.797 5.79 6.344-.795 1.591a112.499 112.499 0 0 1-11.026 16.776c-2.346 2.88-5.488 6.394-5.73 6.394-.1 0-3.957-4.702-8.559-10.452zM4.04 218.856c-4.703-10.895-7.744-22.606-8.398-32.353l-.151-2.266L8.079 173.06l17.118-15.266c2.487-2.235 4.662-4.058 4.823-4.058.161 0 1.551 1.51 3.082 3.373l5.195 6.203c5.488 6.485 8.53 10.17 8.53 10.392 0 .201-5.066 5.82-18.025 19.998A6487.328 6487.328 0 0 0 16.074 207.7c-5.186 5.71-9.878 10.845-10.442 11.43l-1.007 1.046zm173.57-11.61l-21.086-23.11a531.015 531.015 0 0 1-9.375-10.422c0-.07 1.168-1.51 2.588-3.222l8.418-10.06 5.82-6.968 2.165 1.944 18.951 16.937c10.936 9.727 13.463 12.093 13.463 12.637a108.35 108.35 0 0 1-8.378 33.562 8.792 8.792 0 0 1-.775 1.53c-.05 0-5.357-5.77-11.791-12.828zm-87.103 4.521a4804.597 4804.597 0 0 0-20.642-23.28 9465.922 9465.922 0 0 1-17.753-19.969c-12.819-14.45-25.667-28.9-27.107-30.51-5.962-6.586-13.755-15.468-13.755-15.68 0-.321 3.08-4.792 5.065-7.35 3.574-4.632 9.767-11.228 10.351-11.026.232.08 20.834 16.141 41.719 32.525 2.94 2.316 5.437 4.199 5.548 4.199.12 0 .312-.262.443-.604.12-.323.524-1.25.896-2.055 1.793-3.937 9.546-21.126 10.21-22.656 2.176-4.975 3.626-7.512 5.257-9.164 2.8-2.84 5.176-3.625 11.046-3.625 6.566.01 14.662 1.31 17.683 2.83 1.077.544 1.309.826 1.792 2.094.735 1.954.926 2.82.655 2.81-.121 0-.887-.181-1.692-.403-5.64-1.51-10.493 1.39-10.452 6.263.01 1.893-.101 1.611 4.39 11.59 5.156 11.47 5.76 12.789 5.971 12.85.121.04 10.714-8.157 23.533-18.197 12.819-10.049 23.472-18.336 23.664-18.427.634-.262 6.565 5.971 10.442 10.986 1.963 2.538 5.065 7.039 5.065 7.35 0 .222-18.89 21.63-30.773 34.882-2.903 3.24-5.8 6.486-8.69 9.737l-14.651 16.474a8432.946 8432.946 0 0 0-25.285 28.497c-3.293 3.736-6.173 6.787-6.394 6.797-.222 0-3.162-3.121-6.525-6.948zM-4.75 180.582c-.353-1.551.08-11.48.705-16.031a103.294 103.294 0 0 1 8.62-29.988c1.792-3.937 3.393-6.937 3.705-6.937.11 0 4.672 5.336 10.14 11.872l9.929 11.872-1.682 1.53c-.936.846-4.572 4.109-8.086 7.24A7235.494 7235.494 0 0 0-1.93 178.467c-2.094 1.883-2.749 2.386-2.82 2.115zm201.694-1.33c-.805-.755-4.219-3.826-7.582-6.827l-9.466-8.448c-4.69-4.195-9.39-8.38-14.097-12.557-.06-.05.302-.544.826-1.088.513-.543 4.219-4.954 8.227-9.787l9.002-10.855c.946-1.138 1.863-2.065 2.024-2.065.332 0 .886 1.078 3.665 7.19 4.42 9.624 7.33 19.87 8.63 30.38.483 3.766.846 15.457.483 15.437-.13 0-.906-.624-1.712-1.38zM-6.422 145.65c-15.647 105.69-7.823 52.845 0 0z"/></g></svg>
          <span>S.H.I.E.L.D. &nbsp; DATA ACCESS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script>
      // Temporary debug hook: capture runtime errors and show them in-page
      (function(){
        window._mc_debug_errors = [];
        window.addEventListener('error', function(e){
          try{ window._mc_debug_errors.push(e.message); }catch(_){ }
          try{ document.body.innerHTML = '<pre style="color:red; padding:1rem;">Runtime error:\\n' + String(e.message) + '</pre>'; }catch(_){ }
        });
        window.addEventListener('unhandledrejection', function(e){
          try{ window._mc_debug_errors.push(String(e.reason)); }catch(_){ }
          try{ document.body.innerHTML = '<pre style="color:red; padding:1rem;">Unhandled rejection:\\n' + String(e.reason) + '</pre>'; }catch(_){ }
        });
        console.log('[Card debug] error hook installed');
      })();
    </script>
    <script src="/react/js/card.js"></script>
    <script>
      // Adjust the footer shield to match the rendered card panel width,
      // keep it vertically flush and allow increased padding for breathing room.
      (function(){
        function applyShieldWidth(){
          try{
            var panel = document.querySelector('.mc-card-panel');
            var shield = document.querySelector('.mc-page-footer .mc-shield');
            if(!panel || !shield) return;
            var rect = panel.getBoundingClientRect();
            // match width and pull it up so it visually 'collés' to the panel
            shield.style.boxSizing = 'border-box';
            shield.style.width = Math.round(rect.width) + 'px';
            shield.style.marginTop = '-12px';
            // ensure padding is adequate for breathing room
            shield.style.padding = '12px 16px';
          }catch(e){/* ignore */}
        }
        // Run after a short delay to allow React to mount, and again on resize
        window.addEventListener('load', function(){ setTimeout(applyShieldWidth, 200); });
        document.addEventListener('DOMContentLoaded', function(){ setTimeout(applyShieldWidth, 200); });
        window.addEventListener('resize', applyShieldWidth);
        // Also attempt periodically for a short window in case client renders slowly
        var tries = 0; var t = setInterval(function(){ applyShieldWidth(); tries++; if(tries>10) clearInterval(t); }, 200);
      })();
    </script>
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
  const title = 'MarvelCDB — Collections et cartes Marvel';
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

    <link rel="stylesheet" href="/react/css/card.css">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee; color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/card.js"></script>
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

    <link rel="stylesheet" href="/react/css/card.css">
  </head>
  <body>
    ${renderSharedHeader()}
    <div id="mc-app"></div>
    <noscript>
      <div style="max-width:980px;margin:24px auto;padding:16px;background:#fee; color:#333;border-radius:8px;">JavaScript is disabled — the interactive UI requires JavaScript to function.</div>
    </noscript>
    <script src="/react/js/card.js"></script>
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
