const fs = require('fs');

const files = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of files) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // Deck Card background
  css = css.replace(/background:\s*#10203a;/g, 'background: var(--st-surface);');
  
  // Filters Panel and Select options background
  css = css.replace(/background:\s*#0f1e33;/g, 'background: var(--st-surface);');

  // Deck Body translucent backgrounds
  css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[1-5]\);/g, 'background: var(--st-surface-2);');

  // Borders (preserve the border style and width!)
  css = css.replace(/border(-color)?:\s*(1px\s*solid\s*)?rgba\(255,\s*255,\s*255,\s*0\.1[0-9]*\);/g, (match, p1, p2) => {
    return p2 ? `border: 1px solid var(--st-border);` : `border-color: var(--st-border);`;
  });
  css = css.replace(/border(-color)?:\s*(1px\s*solid\s*)?rgba\(255,\s*255,\s*255,\s*0\.2[0-9]*\);/g, (match, p1, p2) => {
    return p2 ? `border: 1px solid var(--st-border-hover);` : `border-color: var(--st-border-hover);`;
  });

  // Action Buttons
  css = css.replace(/border:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.15\);/g, 'border: 1.5px solid var(--st-border);');
  css = css.replace(/background:\s*rgba\(120,\s*120,\s*120,\s*0\.25\);/g, 'background: var(--st-surface-2);');
  css = css.replace(/color:\s*#b0bec5;/g, 'color: var(--st-text);');
  css = css.replace(/background:\s*rgba\(140,\s*140,\s*140,\s*0\.45\);/g, 'background: var(--st-border);');
  css = css.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.3\);/g, 'border-color: var(--st-border-hover);');

  // Select Element and Dropdowns
  css = css.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.25\);/g, 'background: var(--st-surface-2);');
  css = css.replace(/\.deck-filters__select\s*option\s*\{[^}]*\}/g, (match) => {
    return match.replace(/background:\s*[^;]+;/, 'background: var(--st-surface);')
                .replace(/color:\s*[^;]+;/, 'color: var(--st-text);');
  });
  
  // Color text in select and inputs
  css = css.replace(/(\.deck-filters__select\s*\{[\s\S]*?)(color:\s*#fff;)/g, '$1color: var(--st-text);');
  css = css.replace(/(\.ndeck-filters__select\s*\{[\s\S]*?)(color:\s*#fff;)/g, '$1color: var(--st-text);');

  // Hero name (Beast, Deadpool)
  css = css.replace(/\.deck-hero-name\s*\{\s*font-size:\s*0\.8rem;\s*font-weight:\s*600;\s*color:\s*rgba\(255,\s*255,\s*255,\s*0\.85\);/g, 
    '.deck-hero-name {\n  font-size: 0.8rem;\n  font-weight: 600;\n  color: var(--st-title);');

  fs.writeFileSync(file, css);
}

console.log('Applied precise CSS updates for Decks.');
