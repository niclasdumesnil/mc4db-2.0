const fs = require('fs');
const cardListPath = 'c:/github/mc4db-2.0/react-src/src/css/CardList.css';
let clCss = fs.readFileSync(cardListPath, 'utf8');

clCss = clCss.replace(
  /\.cardlist-pagination\s*\{[\s\S]*?\}/,
  `.cardlist-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px 0;
}`
);

clCss = clCss.replace(
  /\.cardlist-main\s*\{[\s\S]*?\}/,
  `.cardlist-main {
  min-width: 0;
  background: var(--cl-surface);
  border: 1px solid var(--cl-border);
  border-radius: 10px;
  padding: 16px;
  margin-right: 16px;
}`
);

fs.writeFileSync(cardListPath, clCss);
console.log('Main panel styling updated.');
