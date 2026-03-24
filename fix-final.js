const fs = require('fs');

// 1. STYLE CSS (Official badge back to solid black, and we check if .deck-hero-badge exists)
let styleCss = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', 'utf8');

// The user wants the official badge to be SOLID BLACK ("noir et non gris")
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*rgba\(0,\s*0,\s*0,\s*0\.65\);\s*color:\s*#fff;\s*border-color:\s*rgba\(0,\s*0,\s*0,\s*0\.8\);\s*\}/g, 
  '.mc-badge-official { background: #111; color: #fff; border-color: #111; }');
// Catch-all (in case it matched something else)
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*rgba\(0,\s*0,\s*0,\s*0\.08\)[^}]+\}/gi, 
  '.mc-badge-official { background: #111; color: #fff; border-color: #111; }');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', styleCss);


// 2. PUBLIC DECKS and NEW DECK Fixes
const deckFiles = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of deckFiles) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // A. Hero Name - Actually, the component uses .deck-hero-badge! Let's rename .deck-hero-name to .deck-hero-badge and force black text
  css = css.replace(/\.deck-hero-name\s*\{/g, '.deck-hero-badge {');
  // Overwrite its color to be solid dark grey/black
  css = css.replace(/(\.deck-hero-badge\s*\{[\s\S]*?color:\s*)[^;]+;/g, '$1#222;');
  
  // Just to be absolutely sure, append it if we missed it
  if (!css.includes('.deck-hero-badge {')) {
    css += `\n.deck-hero-badge { font-size: 0.8rem; font-weight: 600; color: #222; text-transform: uppercase; letter-spacing: 0.04em; }`;
  } else {
    // some might have inherited faint colors. Forcing it:
    css += `\n.deck-hero-badge { color: #222 !important; }`;
  }

  // B. Selection Panel Background
  // The filter panel was changed to var(--st-surface). The user wants it grey to stand out ("un fond gris clair").
  // var(--st-surface-2) is a good light grey in light mode, and darker slate in dark mode.
  // In `fix-all-decks.js` I did: css = css.replace(/background:\s*#0f1e33;/g, 'background: var(--st-surface);');
  // So it's currently var(--st-surface) where it matters. Let's find `.deck-filters { ... background: var(--st-surface)`
  css = css.replace(/(\.deck-filters\s*\{[\s\S]*?background:\s*)var\(--st-surface\)/g, '$1var(--st-surface-2)');
  css = css.replace(/(\.ndeck-filters\s*\{[\s\S]*?background:\s*)var\(--st-surface\)/g, '$1var(--st-surface-2)');

  // C. The "All" Aspect Button Selected Text color
  // In PublicDecks.css, the All button is `.deck-filters__aspect-btn--all.deck-filters__aspect-btn--active`
  // We need its text to be white!
  css = css.replace(/(\.deck-filters__aspect-btn--all\.deck-filters__aspect-btn--active\s*\{[\s\S]*?)(color:\s*[^;]+;)?/g, (match, prefix, colorProp) => {
    if (colorProp) {
      return match.replace(colorProp, 'color: #fff !important;');
    } else {
      return prefix + '\n  color: #fff !important;';
    }
  });

  fs.writeFileSync(file, css);
}

// 3. Double check DeckCard.jsx to see if deck-hero-badge is the right class
let deckCardPath = 'c:/github/mc4db-2.0/react-src/src/components/DeckCard.jsx';
if (fs.existsSync(deckCardPath)) {
  let deckCard = fs.readFileSync(deckCardPath, 'utf8');
  // If it's deck-hero-badge, good.
  // Actually, I'll just hardcode the style to #222 so it's immune to CSS bugs
  deckCard = deckCard.replace(/<span className="deck-hero-badge">\{deck\.hero_name\}<\/span>/g, '<span className="deck-hero-badge" style={{ color: \'#222\', fontWeight: 700 }}>{deck.hero_name}</span>');
  fs.writeFileSync(deckCardPath, deckCard);
}

console.log('Fixed visibility issues per user feedback.');
