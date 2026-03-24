const fs = require('fs');

let styleCssPath = 'c:/github/mc4db-2.0/react-src/src/css/style.css';
let styleCss = fs.readFileSync(styleCssPath, 'utf8');

// The DeckCard uses <h3> for the deck name, which gets caught by the global 'html.dark h3 { color: white !important }'.
// Let's add an explicit override to force it back to black.
if (!styleCss.includes('html.dark h3.deck-name')) {
  styleCss += '\n\n/* Force deck names inside DeckCard to always be dark, as they sit on a light aspect banner */\n';
  styleCss += 'html.dark h3.deck-name, html.dark .deck-name { color: #111 !important; }\n';
  fs.writeFileSync(styleCssPath, styleCss);
  console.log('Added override for deck-name to stay black in dark mode.');
} else {
  console.log('Override already exists.');
}
