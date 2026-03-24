const fs = require('fs');
const path = require('path');

const styleFile = path.join(__dirname, 'react-src', 'src', 'css', 'style.css');
let content = fs.readFileSync(styleFile, 'utf8');

// Insert :root declarations for Light Mode
const rootDecl = `
/* ── Global Theme Variables ─────────────────────────────────────────────── */
:root {
  --st-bg: #f8fafc;
  --st-surface-1: #ffffff;
  --st-surface-2: #f1f5f9;
  --st-surface-3: #e2e8f0;
  
  --st-text: #334155;
  --st-text-muted: #64748b;
  --st-title: #0f172a;

  --st-border: #e2e8f0;
  --st-border-strong: #cbd5e1;

  --st-input-bg: #ffffff;
  --st-input-bg-focus: #f8fafc;
}
`;

// Update html.dark to include the missing dark mode definitions so everything maps properly
content = content.replace(/html\.dark\s*{[\s\S]*?--st-bg:\s*#0f172a;/i, (match) => {
  return `html.dark {
  --st-input-bg: rgba(0, 0, 0, 0.3);
  --st-input-bg-focus: rgba(0, 0, 0, 0.1);
  --st-search-bg: rgba(255, 255, 255, 0.05);
  
  --st-surface-1: #0f172a;
  --st-surface-2: #161f2e;
  --st-surface-3: #1e293b;

  --st-border: rgba(255,255,255,0.08);
  --st-border-strong: rgba(255,255,255,0.15);

  --st-bg: #0f172a;`;
});

// We should inject :root right before the /* ── Dark Mode Overrides section
content = content.replace(/\/\* ── Dark Mode Overrides/, rootDecl + '\n/* ── Dark Mode Overrides');

fs.writeFileSync(styleFile, content, 'utf8');
console.log('style.css updated with global theme variables');
