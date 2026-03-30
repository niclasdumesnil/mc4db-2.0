const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../backend/src/index.js');
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/<link rel="icon" type="image\/png" href="\/react\/images\/favicon-light.png" media="\(prefers-color-scheme: light\)">/g, '<link rel="icon" type="image/png" href="/react/images/favicon-light.png">');
c = c.replace(/<link rel="icon" type="image\/png" href="\/react\/images\/favicon-dark.png" media="\(prefers-color-scheme: dark\)">/g, '<link rel="icon" type="image/png" media="(prefers-color-scheme: dark)" href="/react/images/favicon-dark.png">');
fs.writeFileSync(file, c);
console.log('Fixed auth media query for fav');
