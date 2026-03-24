const fs = require('fs');
const styleCssPath = 'c:/github/mc4db-2.0/react-src/src/css/style.css';

if (fs.existsSync(styleCssPath)) {
  let css = fs.readFileSync(styleCssPath, 'utf8');
  css = css.replace(/\.cl-res-icon--boost\s*\{\s*color:\s*#e2e8f0;\s*border-color:\s*#64748b;\s*\}/g, 
    '.cl-res-icon--boost { color: var(--st-title, #334155); border-color: var(--st-muted, #94a3b8); }');

  // fallback replacement just in case spaces are different
  css = css.replace(/color:\s*#e2e8f0;\s*border-color:\s*#64748b;/g, 
    'color: var(--st-title, #334155); border-color: var(--st-muted, #94a3b8);');

  fs.writeFileSync(styleCssPath, css);
  console.log('Fixed .cl-res-icon--boost color in style.css');
}
