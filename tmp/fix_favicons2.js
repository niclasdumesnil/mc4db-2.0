const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../backend/src/index.js');
let c = fs.readFileSync(file, 'utf8');
const v = Date.now();
c = c.replace(/href="\/react\/images\/favicon-light.png"/g, `href="/react/images/favicon-light.png?v=${v}"`);
c = c.replace(/href="\/react\/images\/favicon-dark.png"/g, `href="/react/images/favicon-dark.png?v=${v}"`);
fs.writeFileSync(file, c);
console.log('Fixed cache buster');
