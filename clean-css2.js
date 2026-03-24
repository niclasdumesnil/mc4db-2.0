const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'react-src', 'src', 'css', 'DeckEditor.css');
let content = fs.readFileSync(cssPath, 'utf8');

const zebraIndex = content.indexOf('/* --- Zebra Striping --- */');

if (zebraIndex !== -1) {
    // Find the end of the zebra block line
    const afterZebra = content.indexOf('}', zebraIndex);
    if (afterZebra !== -1) {
        content = content.substring(0, afterZebra + 1) + '\n';
    } else {
        content = content.substring(0, zebraIndex) + '\n';
    }
}

// Ensure the wrappers are there
const wrapperCss = `
/* --- Table Outer Frame --- */
.available-cards-wrapper {
  background: var(--st-surface-1);
  border: 1px solid var(--st-border-strong);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  margin-top: 8px;
  overflow: hidden;
}
.available-cards-wrapper thead th {
  background: var(--st-surface-2);
  border-bottom: 1px solid var(--st-border-strong);
}
`;

fs.writeFileSync(cssPath, content + wrapperCss, 'utf8');
console.log('Stripped everything after zebra striping and re-added the wrapper.');
