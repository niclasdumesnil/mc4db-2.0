const fs = require('fs');

// 1. PUBLIC DECKS Action buttons
let pdCss = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css', 'utf8');

pdCss = pdCss.replace(/border:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.15\);/g, 'border: 1.5px solid var(--st-border);');
pdCss = pdCss.replace(/background:\s*rgba\(120,\s*120,\s*120,\s*0\.25\);/g, 'background: var(--st-surface-2);');
pdCss = pdCss.replace(/color:\s*#b0bec5;/g, 'color: var(--st-text);');

pdCss = pdCss.replace(/background:\s*rgba\(140,\s*140,\s*140,\s*0\.45\);/g, 'background: var(--st-border);');
pdCss = pdCss.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.3\);/g, 'border-color: var(--st-border-hover);');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css', pdCss);


// 2. STYLE CSS (Official badge light mode + Dark mode deck title override)
let styleCss = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', 'utf8');

// The user wants the official badge to be white text on black background in light mode
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*rgba\(0,\s*0,\s*0,\s*0\.08\);\s*color:\s*#475569;\s*border-color:\s*rgba\(200,200,200,0\.8\);\s*\}/g, 
  '.mc-badge-official { background: #000; color: #fff; border-color: #000; }');

// We also need to remove html.dark .deck-name, from the white text override block
styleCss = styleCss.replace(/html\.dark\s*\.deck-name,\s*/g, '');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/style.css', styleCss);

console.log('Action buttons, Official badge, and Deck title Dark Mode overrides applied.');
