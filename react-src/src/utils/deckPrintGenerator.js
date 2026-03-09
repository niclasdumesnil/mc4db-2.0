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
  const TYPE_SIZE = 56;
  const MAIN_SIZE = 48;
  const PACK_SIZE = 42;

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

    // Section header + underline
    ctx.font         = `bold ${TYPE_SIZE}px Arial, sans-serif`;
    ctx.fillStyle    = '#000000';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(header, COL_X[col], y[col]);
    const hW = ctx.measureText(header).width;
    ctx.fillRect(COL_X[col], y[col] + TYPE_SIZE + 2, hW, 3);
    y[col] += TYPE_SIZE + 18;

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

      // Pack name (italic, smaller) — inline if space allows
      if (card.pack_name) {
        const packText = `(${card.pack_name})`;
        ctx.font = `italic ${PACK_SIZE}px Arial, sans-serif`;
        ctx.fillStyle = '#282828';
        const packW = ctx.measureText(packText).width;

        ctx.font = `${MAIN_SIZE}px Arial, sans-serif`;
        const lastW = ctx.measureText(lines[lines.length - 1] || '').width;

        ctx.font = `italic ${PACK_SIZE}px Arial, sans-serif`;
        if (lastW + packW + 8 > maxW) {
          ctx.fillText(packText, txtX, y[col]);
          y[col] += PACK_SIZE + 6;
        } else {
          ctx.fillText(packText, txtX + lastW + 8, y[col] - MAIN_SIZE - 6);
        }
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
  const TITLE_SIZE    = 72;
  const SMALL_SIZE    = 28;
  const LINE_H_TITLE  = TITLE_SIZE + 8;
  const TITLE_PAD     = 10;
  const TOTAL_TITLE_H = LINE_H_TITLE * 2 + 2 * TITLE_PAD;

  const PORTRAIT_W   = 360;
  const PORTRAIT_H   = 165;
  const TITLE_MARGIN = 60;
  const titleBoxRight = W - 50 - PORTRAIT_W - 20;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#dcdcdc';
  ctx.fillRect(0, 0, W, H);

  // Hero portrait
  let portrait = null;
  if (deck.hero_imagesrc) portrait = await loadImage(deck.hero_imagesrc);
  if (portrait && portrait.naturalWidth) {
    const sx = Math.round(150 * portrait.naturalWidth  / 540);
    const sy = Math.round(105 * portrait.naturalHeight / 810);
    const sw = Math.round(360 * portrait.naturalWidth  / 540);
    const sh = Math.round(165 * portrait.naturalHeight / 810);
    const portraitY = TITLE_MARGIN + TOTAL_TITLE_H - PORTRAIT_H + 15;
    ctx.drawImage(portrait, sx, sy, sw, sh, W - 50 - PORTRAIT_W, portraitY, PORTRAIT_W, PORTRAIT_H);
  }

  // Shadow + title trapeze
  const cadre = 15;
  const lt = [50 + cadre,                TITLE_MARGIN];
  const rt = [titleBoxRight - cadre,     TITLE_MARGIN];
  const rb = [titleBoxRight - 20 - cadre, TITLE_MARGIN + TOTAL_TITLE_H];
  const lb = [70 + cadre,                TITLE_MARGIN + TOTAL_TITLE_H];

  const SH = 14;
  ctx.fillStyle = '#787878';
  ctx.beginPath();
  ctx.moveTo(lt[0] + SH, lt[1] + SH); ctx.lineTo(rt[0] + SH, rt[1] + SH);
  ctx.lineTo(rb[0] + SH, rb[1] + SH); ctx.lineTo(lb[0] + SH, lb[1] + SH);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(lt[0], lt[1]); ctx.lineTo(rt[0], rt[1]);
  ctx.lineTo(rb[0], rb[1]); ctx.lineTo(lb[0], lb[1]);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Title text
  const words = deck.name.split(' ');
  const titleLines = words.length > 1
    ? [words.slice(0, Math.floor(words.length / 2)).join(' '),
       words.slice(Math.floor(words.length / 2)).join(' ')]
    : [deck.name];

  ctx.font = `bold ${TITLE_SIZE}px Arial, sans-serif`;
  ctx.fillStyle = '#000000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const titleCX = (lt[0] + rt[0]) / 2;
  if (titleLines.length === 1) {
    ctx.fillText(titleLines[0], titleCX, TITLE_MARGIN + TITLE_PAD + LINE_H_TITLE);
  } else {
    titleLines.forEach((line, i) => {
      ctx.fillText(line, titleCX, TITLE_MARGIN + TITLE_PAD + LINE_H_TITLE / 2 + i * LINE_H_TITLE);
    });
  }

  // Cards area
  const cardsTop = Math.max(
    TITLE_MARGIN + TOTAL_TITLE_H + 20,
    TITLE_MARGIN + PORTRAIT_H + 20
  );
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
  ctx.fillText('Marvellous decklist tool.', W - 60, cardsTop + cardsH + 20);

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
