const fs = require('fs');

const cardListPath = 'c:/github/mc4db-2.0/react-src/src/css/CardList.css';
let clCss = fs.readFileSync(cardListPath, 'utf8');

// Replace var(--st-input-bg, rgba(0, 0, 0, 0.3)) with var(--st-surface-2, rgba(255, 255, 255, 0.05))
clCss = clCss.replace(
  /var\(--st-input-bg,\s*rgba\(0,\s*0,\s*0,\s*0\.3\)\)/g,
  'var(--st-surface-2, rgba(255, 255, 255, 0.05))'
);

// We should also replace the dark border of the input fields to match pack-search-trigger
// .pack-search-trigger uses border: 1px solid var(--st-border, rgba(255,255,255,.14))
// which is already var(--cl-border) for inputs, so border is fine.
// We just wanted to change the background.

fs.writeFileSync(cardListPath, clCss);
console.log('CardList.css updated to use st-surface-2 for inputs.');
