const fs = require('fs');

let dcPath = 'c:/github/mc4db-2.0/react-src/src/components/DeckCard.jsx';
let dcJsx = fs.readFileSync(dcPath, 'utf8');

// The user wants the fanmade hero name to use the same blue as the creator badge, which is var(--st-accent-hover)
dcJsx = dcJsx.replace(/style=\{\{\s*color:\s*isFFG\s*\?\s*'#222'\s*:\s*'#1d4ed8',\s*fontWeight:\s*700,\s*textTransform:\s*'capitalize'\s*\}\}/g, 
  "style={{ color: isFFG ? '#222' : 'var(--st-accent-hover)', fontWeight: 700, textTransform: 'capitalize' }}");

fs.writeFileSync(dcPath, dcJsx);
console.log("Updated DeckCard.jsx to use var(--st-accent-hover) for fanmade heroes.");
