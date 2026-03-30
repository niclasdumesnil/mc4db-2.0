const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../backend/src/index.js');
let content = fs.readFileSync(filePath, 'utf8');

const injection = `
    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/react/images/favicon-light.png" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/png" href="/react/images/favicon-dark.png" media="(prefers-color-scheme: dark)">`;

// Only add if not already present
if (!content.includes('favicon-dark.png')) {
  // Find all </head> and inject before them
  content = content.replace(/<\/head>/g, `${injection}\n  </head>`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully added favicons to all routes in index.js');
} else {
  console.log('Favicons already present in index.js');
}
