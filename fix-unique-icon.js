const fs = require('fs');
const clCssPath = 'c:/github/mc4db-2.0/react-src/src/css/CardList.css';

if (fs.existsSync(clCssPath)) {
  let css = fs.readFileSync(clCssPath, 'utf8');
  css = css.replace(/\.cl-unique-icon\s*\{[^}]*color:\s*#ffffff;[^}]*\}/g, (match) => {
    return match.replace(/color:\s*#ffffff;/g, 'color: var(--st-title, inherit);');
  });
  
  // also let's just do a generic replace in case of spaces
  css = css.replace(/(\.cl-unique-icon\s*\{[\s\S]*?)color:\s*(?:#ffffff|white);/gi, '$1color: var(--st-title, inherit);');

  fs.writeFileSync(clCssPath, css);
  console.log('Fixed .cl-unique-icon color in CardList.css');
}
