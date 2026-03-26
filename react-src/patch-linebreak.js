const fs = require('fs');

const file = 'c:/github/mc4db-2.0/react-src/src/pages/MyDecks.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `You have reached your private deck limit. Try publishing some decks or increasing your reputation to unlock more slots!`;
const replaceStr = `You have reached your private deck limit.<br />Try publishing some decks or increasing your reputation to unlock more slots!`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log('Split line into two.');
} else {
  console.log('Target string not found.');
}
