const fs = require('fs');
const ctCssPath = 'c:/github/mc4db-2.0/react-src/src/css/CardTooltip.css';

if (fs.existsSync(ctCssPath)) {
  let css = fs.readFileSync(ctCssPath, 'utf8');
  
  // Backgrounds
  css = css.replace(/background-color:\s*var\(--mc-bg-color,\s*#1a202c\);/gi, 'background-color: var(--st-surface, #1a202c);');
  css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.04\);/gi, 'background: var(--st-surface-2, rgba(255, 255, 255, 0.04));');
  
  // Borders
  css = css.replace(/border:\s*1px\s*solid\s*#374151;/gi, 'border: 1px solid var(--st-border, #374151);');
  css = css.replace(/border-top:\s*1px\s*solid\s*#374151;/gi, 'border-top: 1px solid var(--st-border, #374151);');
  
  // Text Colors
  css = css.replace(/color:\s*#fff;/gi, 'color: var(--st-title, #fff);');
  css = css.replace(/color:\s*#e5e7eb;/gi, 'color: var(--st-title, #e5e7eb);');
  css = css.replace(/color:\s*#d1d5db;/gi, 'color: var(--st-text, #d1d5db);');
  css = css.replace(/color:\s*#9ca3af;/gi, 'color: var(--st-muted, #9ca3af);');
  css = css.replace(/color:\s*#6b7280;/gi, 'color: var(--st-muted, #6b7280);');

  fs.writeFileSync(ctCssPath, css);
  console.log('Fixed CardTooltip.css to use adaptive variables');
}
