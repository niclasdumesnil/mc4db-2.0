const fs = require('fs');
let p = 'c:/github/mc4db-2.0/backend/src/index.js';
let content = fs.readFileSync(p, 'utf8');

// The string we are looking for is exactly "${renderSharedFooter()}"
// We want to replace instances where it appears back-to-back separated only by \s+
content = content.replace(/\$\{renderSharedFooter\(\)\}\s*\$\{renderSharedFooter\(\)\}/g, '${renderSharedFooter()}');

fs.writeFileSync(p, content);
console.log('Successfully deduplicated.');
