const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../backend/src/index.js');
let content = fs.readFileSync(file, 'utf8');

const injection = `
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/react/images/favicon-light.png" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/png" href="/react/images/favicon-dark.png" media="(prefers-color-scheme: dark)">`;

if (!content.includes('favicon-dark.png')) {
  content = content.replace(/<\/head>/g, `${injection}\n  </head>`);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully re-added clean favicons to all routes in index.js');
} else {
  console.log('Favicons already present in index.js');
}
