const fs = require('fs');
const files = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of files) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // Fix dropdowns and selects
  css = css.replace(/background:\s*#0f1e33;/g, 'background: var(--st-surface-2);');
  css = css.replace(/\.deck-filters__select\s*option\s*\{[^}]*\}/g, (match) => {
    return match.replace(/background:\s*[^;]+;/, 'background: var(--st-surface);')
                .replace(/color:\s*[^;]+;/, 'color: var(--st-text);');
  });

  // Also fix the select element itself
  css = css.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.25\);/g, 'background: var(--st-surface-2);');
  
  // Wait, I messed up borders earlier. Let's find any properties that are missing 'border: 1px solid'
  // Actually, I'll just change `.deck-filters` to have a proper border.
  css = css.replace(/(\.deck-filters\s*\{[\s\S]*?)(border-color:\s*var\(--st-border\);)/g, '$1border: 1px solid var(--st-border);');
  css = css.replace(/(\.deck-filters__select\s*\{[\s\S]*?)(border-color:\s*var\(--st-border-hover\);)/g, '$1border: 1px solid var(--st-border-hover);');
  // NewDeck has .ndeck-filters
  css = css.replace(/(\.ndeck-filters\s*\{[\s\S]*?)(border-color:\s*var\(--st-border\);)/g, '$1border: 1px solid var(--st-border);');

  // Let's globally fix color: #fff; on select
  css = css.replace(/(\.deck-filters__select\s*\{[\s\S]*?)(color:\s*#fff;)/g, '$1color: var(--st-text);');
  css = css.replace(/(\.ndeck-filters__select\s*\{[\s\S]*?)(color:\s*#fff;)/g, '$1color: var(--st-text);');

  fs.writeFileSync(file, css);
}

console.log('Fixed dropdowns and borders.');
