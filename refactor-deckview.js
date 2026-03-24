const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'react-src', 'src', 'css', 'DeckView.css');
let content = fs.readFileSync(file, 'utf8');

// Container Backgrounds
content = content.replace(/background:\s*#0f172a;/gi, 'background: var(--st-surface-1);');
content = content.replace(/background:\s*#111827;/gi, 'background: var(--st-surface-1);');
content = content.replace(/background:\s*rgba\(15,\s*23,\s*42,\s*0\.85\);/gi, 'background: var(--st-surface-2-alpha, var(--st-surface-2));');

// Borders
content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.0[57]\);/gi, 'border: 1px solid var(--st-border);');
content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1[0-9]*\);/gi, 'border: 1px solid var(--st-border);');
content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.2[0-9]*\);/gi, 'border: 1px solid var(--st-border-strong);');
content = content.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\);/gi, 'border-color: var(--st-border-strong);');

// Typographies
content = content.replace(/color:\s*#fff(?:fff)?;/gi, 'color: var(--st-text);');
content = content.replace(/color:\s*#8a99af;/gi, 'color: var(--st-text-muted);');
content = content.replace(/color:\s*#c8d8f0;/gi, 'color: var(--st-text);');
content = content.replace(/color:\s*#dbeafa;/gi, 'color: var(--st-text);');
content = content.replace(/color:\s*#94a3b8;/gi, 'color: var(--st-text-muted);');
content = content.replace(/color:\s*#b0bec5;/gi, 'color: var(--st-text-muted);');
content = content.replace(/color:\s*#7a8fa8;/gi, 'color: var(--st-text-muted);');

// Sub-backgrounds (mode buttons, input fields)
content = content.replace(/background:\s*rgba\(15,\s*30,\s*53,\s*0\.6\);/gi, 'background: var(--st-surface-2);');
content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[4-9]\);/gi, 'background: var(--st-surface-2);');
content = content.replace(/background:\s*rgba\(120,\s*120,\s*120,\s*0\.25\);/gi, 'background: var(--st-surface-2);');

// Hovers
content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.1[0-9]*\);/gi, 'background: var(--st-surface-3);');
content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.2[0-9]*\);/gi, 'background: var(--st-surface-3);');
content = content.replace(/background:\s*rgba\(140,\s*140,\s*140,\s*0\.45\);/gi, 'background: var(--st-surface-3);');

fs.writeFileSync(file, content, 'utf8');
console.log('DeckView.css updated');
