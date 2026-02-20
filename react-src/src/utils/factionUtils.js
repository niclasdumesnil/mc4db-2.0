const FACTION_COLORS = {
  leadership: '#2b80c5',
  protection: '#107116',
  aggression: '#cc3038',
  justice: '#ead51b',
  basic: '#808080',
  determination: '#493f64',
  encounter: '#9b6007',
  hero: '#353b49',
};

export function getFactionColor(code) {
  return FACTION_COLORS[code] || '#888';
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
