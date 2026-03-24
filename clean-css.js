const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'react-src', 'src', 'css', 'DeckEditor.css');
const content = fs.readFileSync(cssPath, 'utf8');

const badIndex = content.indexOf('\x00');
let cleanContent = content;

if (badIndex !== -1) {
    // Find the last actual character before the null byte madness started
    cleanContent = content.substring(0, badIndex);
    // Also trim any trailing whitespace or corrupted newline from the end
    cleanContent = cleanContent.trimEnd();
}

// Now add the wrapper cleanly
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

fs.writeFileSync(cssPath, cleanContent + '\n' + wrapperCss, 'utf8');
console.log('Successfully stripped UTF-16 corruption and appended strict CSS wrapper.');
