const fs = require('fs');
const path = require('path');

function replaceColors(file, component) {
  let content = fs.readFileSync(file, 'utf8');

  // DeckEditor specific backgrounds
  content = content.replace(/background:\s*#0f1623;/gi, 'background: var(--st-surface-1);');
  content = content.replace(/background:\s*#161f2e;/gi, 'background: var(--st-surface-2);');
  
  // Generic background darks
  content = content.replace(/background:\s*#0f172a;/gi, 'background: var(--st-surface-1);');
  content = content.replace(/background:\s*#1e293b;/gi, 'background: var(--st-surface-2);');
  content = content.replace(/background:\s*#111827;/gi, 'background: var(--st-surface-1);');

  // Text colors
  content = content.replace(/color:\s*#dbeafa;/gi, 'color: var(--st-text);');
  content = content.replace(/color:\s*#e8f0fa;/gi, 'color: var(--st-text);');
  content = content.replace(/color:\s*#e2e8f0;/gi, 'color: var(--st-text);');
  content = content.replace(/color:\s*#fff(?:fff)?;/gi, 'color: var(--st-text);');
  
  content = content.replace(/color:\s*#7a8fa8;/gi, 'color: var(--st-text-muted);');
  content = content.replace(/color:\s*#3d5166;/gi, 'color: var(--st-text-muted);');
  content = content.replace(/color:\s*#536478;/gi, 'color: var(--st-text-muted);');
  content = content.replace(/color:\s*#94a3b8;/gi, 'color: var(--st-text-muted);');
  content = content.replace(/color:\s*#8a99af;/gi, 'color: var(--st-text-muted);');
  content = content.replace(/color:\s*#cedae8;/gi, 'color: var(--st-text-muted);');

  // Markdown code colors
  content = content.replace(/color:\s*#38bdf8;/gi, 'color: var(--st-accent, #38bdf8);');
  
  // Borders
  content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.0[5-9]\);/gi, 'border: 1px solid var(--st-border);');
  content = content.replace(/border-bottom:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.0[5-9]\);/gi, 'border-bottom: 1px solid var(--st-border);');
  content = content.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1[0-9]\);/gi, 'border: 1px solid var(--st-border-strong);');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`${component} updated`);
}

const cssDir = path.join(__dirname, 'react-src', 'src', 'css');
replaceColors(path.join(cssDir, 'DeckEditor.css'), 'DeckEditor.css');
replaceColors(path.join(cssDir, 'MarkdownViewer.css'), 'MarkdownViewer.css');
