const fs = require('fs');

const cssAdditions = `
/* Translated App Colors */
.red, .rules-wn-text .red { color: #f87171 !important; }

.blue, .rules-wn-text .blue {
  display: block;
  margin-top: 14px; margin-bottom: 14px;
  background: rgba(96, 165, 250, 0.1);
  border-left: 3px solid #60a5fa;
  padding: 10px 14px;
  border-radius: 0 8px 8px 0;
  color: #a8bcd4 !important;
}
.blue::before, .rules-wn-text .blue::before {
  content: 'FANMADE';
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 8px;
}

/* See Also Links */
.rules-see-also {
  margin-top: 14px;
  font-size: 0.85rem;
  color: var(--rules-search-ph);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.rules-see-also strong {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 4px;
}
.rules-see-also-link {
  color: #60a5fa;
  text-decoration: none;
  display: inline-block;
  margin-left: 4px;
  padding: 2px 6px;
  background: rgba(96, 165, 250, 0.1);
  border-radius: 4px;
  transition: background 0.2s;
  cursor: pointer;
}
.rules-see-also-link:hover {
  background: rgba(96, 165, 250, 0.25);
}
`;

let cssContent = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/RulesPage.css', 'utf8');
fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/RulesPage.css', cssContent + cssAdditions);

console.log('CSS OK!');
