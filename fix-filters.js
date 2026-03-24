const fs = require('fs');
const files = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of files) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // Replace dark filter panel backgrounds
  css = css.replace(/background:\s*#0f1e33;/g, 'background: var(--st-surface);');
  css = css.replace(/background:\s*rgba\(15,\s*30,\s*51,\s*0\.[0-9]+\);/g, 'background: var(--st-surface);');
  
  // Make hero name stand out more (replace st-text-muted with st-title)
  // The script previously changed it to var(--st-text-muted).
  css = css.replace(/\.deck-hero-name\s*\{\s*font-size:\s*0\.8rem;\s*font-weight:\s*600;\s*color:\s*var\(--st-text-muted\);/g, 
    '.deck-hero-name {\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: var(--st-title);');

  fs.writeFileSync(file, css);
}

console.log('Fixed #0f1e33 and hero name color.');
