const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'react-src', 'src', 'css');

// 1. DeckEditor fixes
let de = fs.readFileSync(path.join(cssDir, 'DeckEditor.css'), 'utf8');

// Name input visibility (rgba(255...0.05) to input bg)
de = de.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.05\);/g, 'background: var(--st-input-bg, rgba(0,0,0,0.05));');
de = de.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\);/g, 'background: var(--st-input-bg-focus, rgba(0,0,0,0.1));');

// Filter inputs visibility
de = de.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/g, 'background: var(--st-input-bg, rgba(0,0,0,0.05));');
de = de.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.09\);/g, 'background: var(--st-input-bg-focus, rgba(0,0,0,0.1));');

// Borders mapping
de = de.replace(/border-right:\s*2px solid rgba\(255,\s*255,\s*255,\s*0\.07\);/g, 'border-right: 2px solid var(--st-border-strong);');
de = de.replace(/border-left:\s*2px solid rgba\(255,\s*255,\s*255,\s*0\.07\);/g, 'border-left: 2px solid var(--st-border-strong);');

// The fixed dark buttons requested by user for "Type" buttons
// The user asked to keep the same colors in dark and light for buttons
de = de.replace(/\/\* Type filter button \*\//, `/* Type filter button */
.editor-type-btn {
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  color: #94a3b8 !important;
}
.editor-type-btn:hover {
  background: #334155 !important;
  color: #f1f5f9 !important;
}
.editor-type-btn--active {
  background: rgba(59, 130, 246, 0.25) !important;
  border: 1px solid rgba(59, 130, 246, 0.6) !important;
  color: #93c5fd !important;
  font-weight: 700;
}
/* override old rules */`);

// Add Zebra striping for table
de += `\n\n/* --- Zebra Striping --- */\n.available-card-item:nth-child(even), .cl-checklist--compact tbody tr:nth-child(even) { background-color: var(--st-surface-3, rgba(0,0,0,0.02)); }\n`;

fs.writeFileSync(path.join(cssDir, 'DeckEditor.css'), de, 'utf8');

// 2. DeckView fixes (Banner Input & Description Box effect)
let dv = fs.readFileSync(path.join(cssDir, 'DeckView.css'), 'utf8');

// Ensure dvt-name-input is legible (it had color: var(--st-text) but on a slate-200 background it might use white text if the input inherits color from a dark parent, or --st-text is wrong.)
dv = dv.replace(/\.dvt-name-input\s*{[\s\S]*?}/g, `.dvt-name-input {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--st-title, #0f172a);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 2px 8px;
  outline: none;
  width: 100%;
  transition: background 0.2s, border-color 0.2s;
}`);
// The focus state
dv = dv.replace(/\.dvt-name-input:focus\s*{[\s\S]*?}/g, `.dvt-name-input:focus {
  background: var(--st-input-bg, rgba(0,0,0,0.05));
  border-color: var(--st-border-strong);
}`);

// Add box shadow to description container for card effect
dv = dv.replace(/\.deck-description-container\s*{[\s\S]*?}/g, `.deck-description-container {
  background: var(--st-surface-1);
  border: 1px solid var(--st-border);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}`);

fs.writeFileSync(path.join(cssDir, 'DeckView.css'), dv, 'utf8');

// 3. DeckContent fixes (Main Deck title hardcoded white)
let dc = fs.readFileSync(path.join(cssDir, 'DeckContent.css'), 'utf8');
dc = dc.replace(/color:\s*#fff(?:fff)?;/g, 'color: var(--st-title, #0f172a);');
fs.writeFileSync(path.join(cssDir, 'DeckContent.css'), dc, 'utf8');

console.log('User fixes applied');
