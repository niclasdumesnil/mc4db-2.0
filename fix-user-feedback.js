const fs = require('fs');

// 1. DeckCard.jsx -> dynamic color for hero name, and remove uppercase class from hero name if it was applied via CSS.
let deckCardPath = 'c:/github/mc4db-2.0/react-src/src/components/DeckCard.jsx';
if (fs.existsSync(deckCardPath)) {
  let deckCard = fs.readFileSync(deckCardPath, 'utf8');
  deckCard = deckCard.replace(/<span className="deck-hero-badge" style=\{\{ color:\s*'#222',\s*fontWeight:\s*700 \}\}>\{deck\.hero_name\}<\/span>/g, 
    '<span className="deck-hero-badge" style={{ color: isFFG ? \'#222\' : \'#1d4ed8\', fontWeight: 700 }}>{deck.hero_name}</span>');
  
  // Also what if it's the original code? 
  // Let's just make a generic replace for whatever is surrounding {deck.hero_name} inside the deck-hero-row-left
  deckCard = deckCard.replace(/<span className="deck-hero-badge"[^>]*>\{deck\.hero_name\}<\/span>/g, 
    '<span className="deck-hero-badge" style={{ color: isFFG ? \'#222\' : \'#1d4ed8\', fontWeight: 700 }}>{deck.hero_name}</span>');
  
  fs.writeFileSync(deckCardPath, deckCard);
}

// 2. CSS adjustments
let styleCss = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', 'utf8');

// Restore the transparency on official badge ("Reconduire le style sombre ... avec transparence")
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*#111;\s*color:\s*#fff;\s*border-color:\s*#111;\s*\}/g, 
  '.mc-badge-official { background: rgba(0, 0, 0, 0.65); color: #fff; border-color: rgba(0, 0, 0, 0.8); }');
// Fallback in case the exact string wasn't matched
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*(#000|rgba\(0,0,0,1\)[^;]*)[^}]*\}/gi, 
  '.mc-badge-official { background: rgba(0, 0, 0, 0.65); color: #fff; border-color: rgba(0, 0, 0, 0.8); }');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', styleCss);


// 3. Select text color & Text transform
const deckFiles = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of deckFiles) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // Text Transform: disable uppercase on hero badge so it uses the capitalization we pass. 
  // We can just add text-transform: none;
  css = css.replace(/(\.deck-hero-badge\s*\{[\s\S]*?)(text-transform:\s*uppercase;)/g, '$1text-transform: none;');
  
  // Select text color: The user says "le texte de la liste (official heroes) est à mettre en noir sur le light mode"
  // If we used `color: var(--st-text);` and it's faint, maybe --st-text isn't defined. Let's explicitly define it or use #111 with dark mode override.
  // We will replace `color: var(--st-text);` or `color: #fff;` on select elements with a CSS variable that defaults to black if unresolvable, or just explicit #111.
  css = css.replace(/(\.deck-filters__select\s*\{[\s\S]*?)color:\s*var\(--st-text\);/g, '$1color: var(--st-title, #111);');
  css = css.replace(/(\.ndeck-filters__select\s*\{[\s\S]*?)color:\s*var\(--st-text\);/g, '$1color: var(--st-title, #111);');
  
  // Also on hover or focus if it changes:
  css = css.replace(/(\.deck-filters__select\s*option\s*\{[\s\S]*?)color:\s*var\(--st-text\);/g, '$1color: var(--st-title, #111);');

  fs.writeFileSync(file, css);
}

// 4. And add html.dark .deck-filters__select override in style.css so it stays white in dark mode if we use #111 fallback
let styleCssAgain = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', 'utf8');
if (!styleCssAgain.includes('.deck-filters__select')) {
  styleCssAgain += `\nhtml.dark .deck-filters__select, html.dark .ndeck-filters__select, html.dark .deck-filters__select option { color: #f1f5f9 !important; }`;
  fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', styleCssAgain);
}

console.log('Fixed styling for select texts, official badge, and fan-made hero names.');
