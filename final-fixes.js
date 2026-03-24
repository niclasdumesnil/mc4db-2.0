const fs = require('fs');

// 1. PUBLIC DECKS
let pdCssPath = 'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css';
let pdCss = fs.readFileSync(pdCssPath, 'utf8');

// The hero badge has an !important rule that overrides the dynamic inline style!
// We can just remove 'color: #222 !important;' completely, or remove the whole injected rule.
pdCss = pdCss.replace(/\.deck-hero-badge\s*\{\s*color:\s*#222\s*!important;\s*\}/g, '');
// If it was added with just color: #222;
pdCss = pdCss.replace(/\.deck-hero-badge\s*\{\s*font-size[^}]*color:\s*#222;[^}]*\}/g, '');
// Make sure .deck-hero-badge doesn't set ANY color, so it falls back to the inline style!
pdCss = pdCss.replace(/(\.deck-hero-badge\s*\{[^}]*)color:\s*#[a-zA-Z0-9]+;([^}]*\})/g, '$1$2');

// The select field text color MUST be dark
pdCss = pdCss.replace(/color:\s*#ccc;/g, 'color: var(--st-title, #111);');

// Background of select
pdCss = pdCss.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/g, 'background: var(--st-surface-2);');

fs.writeFileSync(pdCssPath, pdCss);


// 2. NEW DECK
let ndCssPath = 'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css';
if (fs.existsSync(ndCssPath)) {
  let ndCss = fs.readFileSync(ndCssPath, 'utf8');
  ndCss = ndCss.replace(/\.deck-hero-badge\s*\{\s*color:\s*#222\s*!important;\s*\}/g, '');
  ndCss = ndCss.replace(/color:\s*#ccc;/g, 'color: var(--st-title, #111);');
  ndCss = ndCss.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/g, 'background: var(--st-surface-2);');
  fs.writeFileSync(ndCssPath, ndCss);
}


// 3. STYLE CSS (Restore opacity to Official badge)
let styleCssPath = 'c:/github/mc4db-2.0/react-src/src/css/style.css';
let styleCss = fs.readFileSync(styleCssPath, 'utf8');

// Replace any background: #111 or #000 in .mc-badge-official with the transparent version
styleCss = styleCss.replace(/\.mc-badge-official\s*\{\s*background:\s*(?:#111|#000|rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\));\s*color:\s*#fff;\s*border-color:\s*(?:#111|#000|rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\));\s*\}/g, 
  '.mc-badge-official { background: rgba(0, 0, 0, 0.65); color: #fff; border-color: rgba(0, 0, 0, 0.8); }');

fs.writeFileSync(styleCssPath, styleCss);

// 4. Double check the DeckCard.jsx just in case for font case.
// "le nom de sheros doit être en minuscule et en bleu si c'est un fan made"
// Actually "minuscule" might mean they explicitly want string lower case? No, usually meaning not uppercase. Since I already did `text-transform: none`, it shows the actual data case, like 'Morbius'. But wait, in the screenshot Hercules is 'HERCULES'. Why?
// Maybe Hercules in fanmade data is ALREADY ALL CAPS! Yes, in some packs the hero name might be saved in all caps.
// I can force text-transform: capitalize; to be safe and look nice.
let dcPath = 'c:/github/mc4db-2.0/react-src/src/components/DeckCard.jsx';
let dcJsx = fs.readFileSync(dcPath, 'utf8');
// add textTransform to the inline styles!
dcJsx = dcJsx.replace(/style=\{\{\s*color:\s*isFFG\s*\?\s*'#222'\s*:\s*'#1d4ed8',\s*fontWeight:\s*700\s*\}\}/g, 
  "style={{ color: isFFG ? '#222' : '#1d4ed8', fontWeight: 700, textTransform: 'capitalize' }}");
fs.writeFileSync(dcPath, dcJsx);

console.log('Fixed regex replacements!');
