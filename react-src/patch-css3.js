const fs = require('fs');
let css = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/RulesPage.css', 'utf8');

const s1 = `color: #60a5fa;\n  text-decoration: none;\n  display: inline-block;\n  margin-left: 4px;\n  padding: 2px 6px;\n  background: rgba(255, 255, 255, 0.08);`;
const s1_r = `color: #60a5fa;\r\n  text-decoration: none;\r\n  display: inline-block;\r\n  margin-left: 4px;\r\n  padding: 2px 6px;\r\n  background: rgba(255, 255, 255, 0.08);`;
const s1_rep = `color: var(--rules-title);\n  text-decoration: none;\n  display: inline-block;\n  margin-left: 4px;\n  padding: 2px 6px;\n  background: rgba(255, 255, 255, 0.08);`;

if(css.includes(s1)) css = css.replace(s1, s1_rep);
else if(css.includes(s1_r)) css = css.replace(s1_r, s1_rep.replace(/\n/g, '\r\n'));

const listsAdd = `
.rules-entry-paragraph ul {
  list-style-type: disc;
  padding-left: 1.5em;
  margin: 10px 0;
}
.rules-entry-paragraph ul ul {
  list-style-type: circle;
}
.rules-entry-paragraph ol {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin: 10px 0;
}
.rules-entry-paragraph li {
  margin-bottom: 6px;
}
`;

css += listsAdd;

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/RulesPage.css', css);
console.log('CSS Fixed!');
