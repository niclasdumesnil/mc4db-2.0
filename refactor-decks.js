const fs = require('fs');
const files = [
  'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css',
  'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css'
];

for (let file of files) {
  if (!fs.existsSync(file)) continue;
  let css = fs.readFileSync(file, 'utf8');

  // Backgrounds: #10203a is the main body backgrnd
  // Note: some hover might be differently styled
  css = css.replace(/background:\s*#10203a;/g, 'background: var(--st-surface);');
  css = css.replace(/border(-color)?:\s*rgba\(255,\s*255,\s*255,\s*0\.1[0-9]*\);/g, 'border-color: var(--st-border);');
  css = css.replace(/border(-color)?:\s*rgba\(255,\s*255,\s*255,\s*0\.2[0-9]*\);/g, 'border-color: var(--st-border-hover);');

  // Translucent white backgrounds for sections inside the body
  css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[1-5]\);/g, 'background: var(--st-surface-2);');
  
  // Faint labels/text
  css = css.replace(/color:\s*rgba\(255,\s*255,\s*255,\s*0\.[78][0-9]*\);/g, 'color: var(--st-text-muted);');
  css = css.replace(/color:\s*(#fff|#ffffff|white);/gi, 'color: var(--st-title);');

  // Some shadow colors could be skipped, but hover background should be updated
  css = css.replace(/background:\s*#162a4d;/g, 'background: var(--st-surface-2);');

  fs.writeFileSync(file, css);
}

// Ensure the mc-badge classes are using readable text vars
const styleFile = 'c:/github/mc4db-2.0/react-src/src/css/style.css';
if (fs.existsSync(styleFile)) {
  let scss = fs.readFileSync(styleFile, 'utf8');

  // Make mc-badge-creator use the generic accent
  scss = scss.replace(/\.mc-badge-creator\s+\{([^}]+)color:\s*#[a-z0-9]+;([^}]+)\}/gi, '.mc-badge-creator { $1 color: var(--st-accent-hover); $2 }');
  // Similarly for dark mode block
  scss = scss.replace(/html\.dark\s+\.mc-badge-creator\s+\{([^}]+)color:\s*#[a-z0-9]+;([^}]+)\}/gi, 'html.dark .mc-badge-creator { $1 color: var(--st-accent-hover); $2 }');

  fs.writeFileSync(styleFile, scss);
}

console.log('Deck CSS replacements done.');
