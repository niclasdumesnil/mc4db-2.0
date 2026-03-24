const fs = require('fs');
const path = require('path');

// 1. Update style.css to include --st-input-bg
const stylePath = 'c:/github/mc4db-2.0/react-src/src/css/style.css';
let styleCss = fs.readFileSync(stylePath, 'utf8');

if (!styleCss.includes('--st-input-bg')) {
  // Inject in root
  styleCss = styleCss.replace(
    /:root\s*\{([\s\S]*?)\}/,
    (match, p1) => {
      if (p1.includes('--st-input-bg')) return match;
      return `:root {\n  --st-input-bg: rgba(0, 0, 0, 0.04);${p1}}`;
    }
  );

  // Inject in .dark
  styleCss = styleCss.replace(
    /(html\.dark|body\.dark)\s*\{([\s\S]*?)\}/,
    (match, p1, p2) => {
      if (p2.includes('--st-input-bg')) return match;
      return `${p1} {\n  --st-input-bg: rgba(0, 0, 0, 0.3);${p2}}`;
    }
  );
  fs.writeFileSync(stylePath, styleCss);
  console.log('style.css updated with --st-input-bg');
}

// 2. Update CardList.css
const cardListPath = 'c:/github/mc4db-2.0/react-src/src/css/CardList.css';
let clCss = fs.readFileSync(cardListPath, 'utf8');

// Replace rgba(0, 0, 0, 0.3) with var(--st-input-bg)
clCss = clCss.replace(
  /background:\s*rgba\(0,\s*0,\s*0,\s*0\.3\);/g,
  'background: var(--st-input-bg, rgba(0, 0, 0, 0.3));'
);

// Update Show Current Only button styles
clCss = clCss.replace(
  /\.cardlist-current-btn--active\s*\{[\s\S]*?\}/,
  `.cardlist-current-btn--active {
  background: rgba(100, 116, 139, 0.15);
  color: var(--st-title, #bac0ca);
  border-color: rgba(100, 116, 139, 0.4);
}`
);

clCss = clCss.replace(
  /\.cardlist-current-btn:hover:not\(:disabled\)\s*\{[\s\S]*?\}/,
  `.cardlist-current-btn:hover:not(:disabled) {
  background: rgba(100, 116, 139, 0.10);
  color: var(--st-title, #e2e8f0);
  border-color: rgba(100, 116, 139, 0.3);
}`
);

fs.writeFileSync(cardListPath, clCss);
console.log('CardList.css updated.');
