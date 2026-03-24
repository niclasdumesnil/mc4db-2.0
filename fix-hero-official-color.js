const fs = require('fs');

// 1. Update DeckCard.jsx to use a CSS variable for the official hero color
let dcPath = 'c:/github/mc4db-2.0/react-src/src/components/DeckCard.jsx';
let dcJsx = fs.readFileSync(dcPath, 'utf8');

dcJsx = dcJsx.replace(/style=\{\{\s*color:\s*isFFG\s*\?\s*'#222'\s*:\s*'var\(--st-accent-hover\)',\s*fontWeight:\s*700,\s*textTransform:\s*'capitalize'\s*\}\}/g, 
  "style={{ color: isFFG ? 'var(--hero-title-color, #222)' : 'var(--st-accent-hover)', fontWeight: 700, textTransform: 'capitalize' }}");

fs.writeFileSync(dcPath, dcJsx);

// 2. Add the CSS variable definition to style.css or PublicDecks.css
let pdPath = 'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css';
let pdCss = fs.readFileSync(pdPath, 'utf8');

if (!pdCss.includes('--hero-title-color:')) {
  pdCss += '\n\n/* Hero badge colors */\n.deck-hero-badge { --hero-title-color: #222; }\nhtml.dark .deck-hero-badge { --hero-title-color: #fff; }\n';
  fs.writeFileSync(pdPath, pdCss);
}

// 3. Just to be safe, also add to NewDeck.css
let ndPath = 'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css';
if (fs.existsSync(ndPath)) {
  let ndCss = fs.readFileSync(ndPath, 'utf8');
  if (!ndCss.includes('--hero-title-color:')) {
    ndCss += '\n\n/* Hero badge colors */\n.deck-hero-badge { --hero-title-color: #222; }\nhtml.dark .deck-hero-badge { --hero-title-color: #fff; }\n';
    fs.writeFileSync(ndPath, ndCss);
  }
}

console.log("Updated official hero title to be white in dark mode.");
