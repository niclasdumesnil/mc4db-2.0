const fs = require('fs');

// 1. STYLE CSS (Official badge transparent background)
let styleCss = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', 'utf8');

// Replace the solid black background with a translucent one (rgba)
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*#000;\s*color:\s*#fff;\s*border-color:\s*#000;\s*\}/g, 
  '.mc-badge-official { background: rgba(0, 0, 0, 0.65); color: #fff; border-color: rgba(0, 0, 0, 0.8); }');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', styleCss);

// 2. PUBLIC DECKS and NEW DECK Hero Name text color
const deckFiles = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of deckFiles) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // Replace any --st-title or --st-text-muted in .deck-hero-name with explicit dark #111 because the header background is always bright.
  css = css.replace(/(\.deck-hero-name\s*\{[\s\S]*?)color:\s*var\(--st-[a-zA-Z-]+\);/g, '$1color: rgba(0, 0, 0, 0.85);');
  
  // Just in case we missed it because of how it was rewritten:
  css = css.replace(/\.deck-hero-name\s*\{\s*font-size:\s*0\.8rem;\s*font-weight:\s*600;\s*color:\s*var\(--st-title\);/g, 
    '.deck-hero-name {\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: rgba(0, 0, 0, 0.85);');

  fs.writeFileSync(file, css);
}

console.log('Fixed transparency and hero name colors.');
