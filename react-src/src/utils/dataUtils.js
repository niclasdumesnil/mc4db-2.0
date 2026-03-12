const FACTION_COLORS = {
  leadership: '#2b80c5',
  protection: '#107116',
  aggression: '#cc3038',
  justice: '#ead51b',
  basic: '#808080',
  determination: '#493f64',
  encounter: '#9b6007',
  pool: '#d074ac',
  hero: '#353b49',
  campaign: '#6b7280',
};

// Faint (0.2 alpha) background versions — used for subtle section tinting
const FACTION_FAINT_COLORS = {
  leadership: 'rgba(43, 128, 237, 0.2)',
  aggression: 'rgba(204, 48, 56, 0.2)',
  protection: 'rgba(16, 113, 22, 0.2)',
  basic: 'rgba(128, 128, 128, 0.2)',
  justice: 'rgba(228, 228, 0, 0.2)',
  pool: 'rgba(212, 126, 178, 0.2)',
  determination: 'rgba(139, 114, 206, 0.2)',
  encounter: 'rgba(155, 96, 7, 0.2)',
  hero: 'rgba(53, 59, 73, 0.2)',
  campaign: 'rgba(107, 114, 128, 0.2)',
};

export function getFactionColor(code) {
  return FACTION_COLORS[code] || '#888';
}

export function getFactionFaintColor(code) {
  return FACTION_FAINT_COLORS[code] || 'rgba(128,128,128,0.2)';
}

// Foreground (text) colors — vivid, optimised for legibility on dark backgrounds
const FACTION_FG_COLORS = {
  leadership: '#3499eb',
  aggression: '#e01414',
  protection: '#00ab41',
  basic: '#606060',
  justice: '#f2ca00',
  pool: '#d47eb2',
  determination: '#8160d6',
  encounter: '#c07020',
  hero: '#8a99af',
  campaign: '#aebaeb',
};

export function getFactionFgColor(code) {
  return FACTION_FG_COLORS[code] || '#aaa';
}

// ── Deck tag definitions ─────────────────────────────────────────────────────
// Values are not exclusive — a deck can have multiple tags.
export const DECK_TAGS = {
  solo: { label: 'Solo', icon: '\u{1F464}', title: 'Solo play' },
  multiplayer: { label: 'Multiplayer', icon: '\u{1F465}', title: 'Multiplayer' },
  beginner: { label: 'Beginner', icon: '\u{1F331}', title: 'Beginner-friendly' },
  theme: { label: 'Theme', icon: '\u{1F3A8}', title: 'Thematic build' },
  campaign: { label: 'Campaign', icon: '\u{1F4DC}', title: 'Campaign mode' },
  competitive: { label: 'Competitive', icon: '\u2694', title: 'Competitive' },
};

/**
 * À partir d'un tableau de decks, extrait la liste des héros uniques
 * triés par nom, séparés en deux groupes : FFG et fanmade.
 * @param {Array} decks - tableau de deck objects (hero_code, hero_name, pack_creator)
 * @returns {{ ffg: Array, fanmade: Array }}
 */
export function extractHeroes(decks) {
  const seen = new Set();
  const ffg = [];
  const fanmade = [];

  for (const deck of decks) {
    if (!deck.hero_code || seen.has(deck.hero_code)) continue;
    seen.add(deck.hero_code);
    const entry = { hero_code: deck.hero_code, hero_name: deck.hero_name, pack_creator: deck.pack_creator };
    const isFFG = !deck.pack_creator || deck.pack_creator.toUpperCase() === 'FFG';
    if (isFFG) ffg.push(entry);
    else fanmade.push(entry);
  }

  const byName = (a, b) => a.hero_name.localeCompare(b.hero_name);
  ffg.sort(byName);
  fanmade.sort(byName);

  return { ffg, fanmade };
}

export function getHeaderClass(factionCode, typeCode) {
  if (factionCode === 'encounter' && typeCode === 'villain') {
    return 'mc-header-encounter-villain';
  }
  return `mc-header-${factionCode}`;
}

export function getBorderClass(factionCode) {
  return `mc-border-${factionCode}`;
}

export function formatInteger(value, star = false, perHero = false, perGroup = false) {
  let text;
  if (value === null || value === undefined) {
    text = star ? '' : '—';
  } else if (value < 0) {
    text = 'X';
  } else {
    text = String(value);
  }
  return { text, star, perHero, perGroup };
}
