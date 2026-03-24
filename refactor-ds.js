const fs = require('fs');
const dsCssPath = 'c:/github/mc4db-2.0/react-src/src/css/DeckStatistics.css';

if (fs.existsSync(dsCssPath)) {
  let css = fs.readFileSync(dsCssPath, 'utf8');
  
  // Replace dark backgrounds with adaptive surfaces
  css = css.replace(/background:\s*#0f1e35;/gi, 'background: var(--st-surface);');
  css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[457]\)/gi, 'background: var(--st-surface-2);');
  
  // Replace borders
  css = css.replace(/border:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.(08|1)\)/gi, 'border: 1px solid var(--st-border);');
  css = css.replace(/border-bottom:\s*1px\s*solid\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/gi, 'border-bottom: 1px solid var(--st-border);');
  
  // Replace text colors
  css = css.replace(/color:\s*#dbeafa;/gi, 'color: var(--st-title);');
  css = css.replace(/color:\s*#c8d8f0;/gi, 'color: var(--st-text);');
  css = css.replace(/color:\s*#8a99af;/gi, 'color: var(--st-muted);');
  css = css.replace(/color:\s*#fff(?:fff)?;/gi, 'color: var(--st-title);');

  fs.writeFileSync(dsCssPath, css);
  console.log('Fixed DeckStatistics.css to use adaptive variables');
}
