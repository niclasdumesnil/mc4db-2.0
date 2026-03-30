const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../backend/src/index.js');
let content = fs.readFileSync(file, 'utf8');

// Remove everything from "<!-- Favicon" to the last link tag
content = content.replace(/\s*<!--\s*Favicon\s*-->\s*<link rel="icon"[^>]+>\s*<link rel="icon"[^>]+>/g, '');

fs.writeFileSync(file, content);
console.log('Removed favicons from index.js');
