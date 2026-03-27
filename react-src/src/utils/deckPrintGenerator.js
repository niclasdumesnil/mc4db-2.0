/**
 * deckPrintGenerator.js
 *
 * Client-side deck image generator using HTML5 Canvas.
 * Ported from CreateStarterDeck.py (Python/Pillow) — uses "bigger" font sizes.
 *
 * generateDeckImage(deck, slots, locale, options)
 *   deck    – { name, hero_name, hero_imagesrc }
 *   slots   – [{ quantity, name, type_name, faction_code, faction_name, pack_name }]
 *   locale  – 'en' | 'fr'
 *   options – { sortByFaction?: boolean }
 * Returns a Promise<Blob> (JPEG).
 */

import { DECK_TAGS } from './dataUtils';

// ── Faction colours (RGB) ──────────────────────────────────────────────────
const FACTION_COLORS = {
  hero:          [120, 120, 120],
  protection:    [60,  180,  75],
  justice:       [255, 225,  25],
  determination: [180,   0, 255],
  aggression:    [230,  25,  75],
  leadership:    [  0, 130, 255],
  pool:          [255, 105, 180],
  basic:         [200, 200, 200],
};

// ── Type plural labels ─────────────────────────────────────────────────────
const TYPE_PLURAL = {
  Ally:               'Allies',
  Event:              'Events',
  Support:            'Supports',
  Upgrade:            'Upgrades',
  Resource:           'Resources',
  'Player Side Scheme': 'Player Side Schemes',
  Hero:               'Hero',
  Obligation:         'Obligations',
};

// ── Section labels in French ───────────────────────────────────────────────
const TYPES_FR = {
  Hero:                  'Héros',
  Allies:                'Alliés',
  Events:                'Événements',
  Supports:              'Soutiens',
  Upgrades:              'Améliorations',
  Resources:             'Ressources',
  'Player Side Schemes': 'Manigances Annexes Joueur',
  Obligations:           'Obligations',
};

const FACTIONS_FR = {
  hero:          'Héros',
  protection:    'Protection',
  justice:       'Justice',
  determination: 'Détermination',
  aggression:    'Agressivité',
  leadership:    'Commandement',
  pool:          'Pool',
  basic:         'Basique',
};

// ── Helpers ────────────────────────────────────────────────────────────────
function pluralize(typeName) {
  return TYPE_PLURAL[typeName] || typeName + 's';
}

function rgb(arr) {
  return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Group + sort by TYPE ───────────────────────────────────────────────────
function groupByType(slots) {
  const map = {};
  for (const slot of slots) {
    const key = pluralize(slot.type_name || 'Hero');
    if (!map[key]) map[key] = [];
    map[key].push(slot);
  }
  const keys      = Object.keys(map);
  const heroKeys  = keys.filter(k => k.toLowerCase() === 'hero');
  const basicKeys = keys.filter(k => k.toLowerCase() === 'basic' || k.toLowerCase() === 'basics');
  const others    = keys
    .filter(k => !heroKeys.includes(k) && !basicKeys.includes(k))
    .sort((a, b) => map[b].length - map[a].length);
  return { map, order: [...heroKeys, ...others, ...basicKeys] };
}

// ── Group + sort by FACTION ────────────────────────────────────────────────
function groupByFaction(slots) {
  const map = {};
  for (const slot of slots) {
    const key = (slot.faction_code || 'hero').toLowerCase();
    if (!map[key]) map[key] = [];
    map[key].push(slot);
  }
  const keys      = Object.keys(map);
  const heroKeys  = keys.filter(k => k === 'hero');
  const basicKeys = keys.filter(k => k === 'basic');
  const others    = keys
    .filter(k => k !== 'hero' && k !== 'basic')
    .sort((a, b) => {
      const qA = map[a].reduce((s, c) => s + (c.quantity || 1), 0);
      const qB = map[b].reduce((s, c) => s + (c.quantity || 1), 0);
      return qB - qA;
    });
  return { map, order: [...heroKeys, ...others, ...basicKeys] };
}

// ── Section label ──────────────────────────────────────────────────────────
function sectionLabel(key, sortByFaction, locale) {
  if (sortByFaction) {
    const fKey = key.toLowerCase();
    const en   = fKey.charAt(0).toUpperCase() + fKey.slice(1);
    return locale === 'fr' ? (FACTIONS_FR[fKey] || en) : en;
  }
  return locale === 'fr' ? (TYPES_FR[key] || key) : key;
}

// ── Two-column card renderer ───────────────────────────────────────────────
function drawCardColumns(ctx, groups, locale, sortByFaction, cardsTop, W) {
  // bigger font sizes (matching Python --bigger flag)
  const TYPE_SIZE = 50;
  const MAIN_SIZE = 43;
  const PACK_SIZE = 38;

  const COL_X = [80, W / 2 + 20];
  const COL_W = (W - 160) / 2 - 40;
  const y     = [cardsTop + 30, cardsTop + 30];
  const CR    = 12; // circle radius
  const CG    = 8;  // gap after circle

  const { map, order } = groups;

  for (let i = 0; i < order.length; i++) {
    const key   = order[i];
    const col   = i % 2;
    const cards = map[key];
    if (!cards || cards.length === 0) continue;

    const totalQty = cards.reduce((s, c) => s + (c.quantity || 1), 0);
    const label    = sectionLabel(key, sortByFaction, locale);
    const header   = `${label} (${totalQty})`;

    // Section header + underline (wrapped if too long)
    ctx.font         = `bold ${TYPE_SIZE}px Arial, sans-serif`;
    ctx.fillStyle    = '#000000';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    const headerLines = wrapText(ctx, header, COL_W);
    let maxHW = 0;
    for (const hLine of headerLines) {
      ctx.fillText(hLine, COL_X[col], y[col]);
      const lw = ctx.measureText(hLine).width;
      if (lw > maxHW) maxHW = lw;
      y[col] += TYPE_SIZE + 4;
    }
    ctx.fillRect(COL_X[col], y[col], maxHW, 3);
    y[col] += 14;

    for (const card of cards) {
      const fKey  = (card.faction_code || '').toLowerCase();
      const color = rgb(FACTION_COLORS[fKey] || [180, 180, 180]);

      // Faction dot
      const cx = COL_X[col] + CR;
      const cy = y[col] + MAIN_SIZE / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, CR, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Card name
      const txtX = COL_X[col] + 2 * CR + CG;
      const maxW = COL_W - (2 * CR + CG);
      ctx.font         = `${MAIN_SIZE}px Arial, sans-serif`;
      ctx.fillStyle    = '#000000';
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';

      const qty   = card.quantity || 1;
      const text  = `${qty}x ${card.name}`;
      const lines = wrapText(ctx, text, maxW);

      for (const line of lines) {
        ctx.fillText(line, txtX, y[col]);
        y[col] += MAIN_SIZE + 6;
      }

      y[col] += 6;
    }
    y[col] += 30;
  }
}

// ── Canvas scaffold (shared between both modes) ────────────────────────────
async function buildCanvas(deck, slots, locale, sortByFaction) {
  const W = 1500;
  const H = 2150;

  // bigger sizes
  const TITLE_SIZE    = 65;
  const SMALL_SIZE    = 25;
  const LINE_H_TITLE  = TITLE_SIZE + 8;
  const TITLE_PAD     = 10;
  const TOTAL_TITLE_H = LINE_H_TITLE * 2 + 2 * TITLE_PAD;

  const PORTRAIT_W   = 400;
  const PORTRAIT_H   = TOTAL_TITLE_H;
  const TITLE_MARGIN = 50;
  const titleBoxW    = W - TITLE_MARGIN * 2 - PORTRAIT_W - 16;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background — white for printer-friendly
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Load portrait
  let portrait = null;
  if (deck.hero_imagesrc) portrait = await loadImage(deck.hero_imagesrc);

  // ── Title block ────────────────────────────────────────────────────────────
  const titleBoxX = TITLE_MARGIN;
  const titleBoxY = TITLE_MARGIN;

  // Title box — white fill, black border
  roundRect(ctx, titleBoxX, titleBoxY, titleBoxW, PORTRAIT_H, 22);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
  roundRect(ctx, titleBoxX, titleBoxY, titleBoxW, PORTRAIT_H, 22);
  ctx.stroke();

  // Title text (black, auto-wrapped)
  const titleMaxW  = titleBoxW - 60;
  let titleSize = TITLE_SIZE;
  let titleLines = [];
  let totalTxtH = 0;
  
  // Ensure the stacked lines fit dynamically within the vertical height constraint
  const maxBoxH = PORTRAIT_H - 16;
  do {
    ctx.font = `bold ${titleSize}px Arial, sans-serif`;
    titleLines = wrapText(ctx, deck.name, titleMaxW);
    totalTxtH = titleLines.length * (titleSize + 10);
    if (totalTxtH > maxBoxH) {
      titleSize -= 3;
    }
  } while (totalTxtH > maxBoxH && titleSize >= 24);

  const txtStartY  = titleBoxY + (PORTRAIT_H - totalTxtH) / 2 + (titleSize + 10) / 2;
  ctx.fillStyle = '#000000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const titleCX = titleBoxX + titleBoxW / 2;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, titleCX, txtStartY + i * (titleSize + 10));
  });

  // ── Portrait box ──────────────────────────────────────────────────────────
  const portraitX = titleBoxX + titleBoxW + 16;
  const portraitY = TITLE_MARGIN;

  if (portrait && portrait.naturalWidth) {
    ctx.save();
    roundRect(ctx, portraitX, portraitY, PORTRAIT_W, PORTRAIT_H, 22);
    ctx.clip();
    // Show top ~42% of the card (head/bust area)
    const cropH = Math.round(portrait.naturalHeight * 0.42);
    ctx.drawImage(portrait, 0, 0, portrait.naturalWidth, cropH, portraitX, portraitY, PORTRAIT_W, PORTRAIT_H);
    ctx.restore();
  }

  // Portrait border
  ctx.strokeStyle = '#000000'; ctx.lineWidth = 5;
  roundRect(ctx, portraitX, portraitY, PORTRAIT_W, PORTRAIT_H, 22);
  ctx.stroke();

  // Calculate tags
  let tagsStr = '';
  if (deck.tags) {
    const rawTags = deck.tags.split(',').map(t => t.trim()).filter(Boolean);
    const displayTags = rawTags.map(t => DECK_TAGS[t] ? DECK_TAGS[t].label : t);
    tagsStr = displayTags.join('  •  ');
  }

  const TAG_SIZE = 42; // Larger tag font size for print legibility
  ctx.font = `italic ${TAG_SIZE}px Arial, sans-serif`;
  // Give it slightly more width up to the portrait width since it is under both
  const tagLines = tagsStr ? wrapText(ctx, tagsStr, titleBoxW + PORTRAIT_W) : [];

  let boxesBottom = Math.max(
    TITLE_MARGIN + TOTAL_TITLE_H + 20,
    TITLE_MARGIN + PORTRAIT_H + 20
  );
  
  // Draw Tags below the boxes if they exist
  if (tagsStr) {
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const tagCX = titleBoxX + (titleBoxW + 16 + PORTRAIT_W) / 2;
    let tagY = boxesBottom + 5;
    tagLines.forEach((line) => {
      ctx.fillText(line, tagCX, tagY);
      tagY += TAG_SIZE + 12;
    });
    boxesBottom = tagY + 15;
  }

  // Cards area
  const cardsTop = boxesBottom;
  const cardsH = H - cardsTop - 40;

  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
  roundRect(ctx, 50, cardsTop, W - 100, cardsH, 40);
  ctx.fill(); ctx.stroke();

  // Card columns
  const groups = sortByFaction ? groupByFaction(slots) : groupByType(slots);
  drawCardColumns(ctx, groups, locale, sortByFaction, cardsTop, W);

  // Footer watermark
  ctx.font = `${SMALL_SIZE}px Arial, sans-serif`;
  ctx.fillStyle = '#3c3c3c'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('MC4DB decklist tool.', W - 60, cardsTop + cardsH + 20);

  return canvas;
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Generate one deck image.
 * options.sortByFaction = true → group by faction instead of card type.
 */
export async function generateDeckImage(deck, slots, locale = 'en', options = {}) {
  const { sortByFaction = false } = options;
  const canvas = await buildCanvas(deck, slots, locale, sortByFaction);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas blob failed'))),
      'image/jpeg', 0.92
    );
  });
}
