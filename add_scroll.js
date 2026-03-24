const fs = require('fs');
let css = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/Stories.css', 'utf8');

css = css.replace(
  /(\.scenario-stats-sidebar\s*\{[\s\S]*?align-self:\s*flex-start;)(\s*\})/m,
  '$1\n  max-height: calc(100vh - 100px);\n  overflow-y: auto;\n  scrollbar-width: thin;$2'
);

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/Stories.css', css);
console.log('Scrollbar added to sidebar.');
