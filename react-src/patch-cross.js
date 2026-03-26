const fs = require('fs');

// Patch RulesPage.jsx
const jsxPath = 'c:/github/mc4db-2.0/react-src/src/pages/RulesPage.jsx';
let jsx = fs.readFileSync(jsxPath, 'utf8');

const s1 = `<div className="rules-search-wrap">
              <input
                className="rules-search"
                type="text"
                placeholder="Search keywords…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>`;

const rep1 = `<div className="rules-search-wrap" style={{ position: 'relative' }}>
              <input
                className="rules-search"
                type="text"
                placeholder="Search keywords…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  className="rules-search-clear" 
                  onClick={() => setSearch('')}
                  title="Clear search"
                >
                  &times;
                </button>
              )}
            </div>`;

if(jsx.includes(s1)) {
  fs.writeFileSync(jsxPath, jsx.replace(s1, rep1));
} else {
  const s2 = s1.replace(/\n/g, '\r\n');
  if(jsx.includes(s2)) fs.writeFileSync(jsxPath, jsx.replace(s2, rep1.replace(/\n/g, '\r\n')));
}


// Patch RulesPage.css
const cssPath = 'c:/github/mc4db-2.0/react-src/src/css/RulesPage.css';
let css = fs.readFileSync(cssPath, 'utf8');

const cssRules = `
.rules-search-clear {
  position: absolute;
  top: 50%;
  right: 18px;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 20px;
  line-height: 1;
  color: var(--rules-search-ph);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}
.rules-search-clear:hover {
  color: var(--rules-title);
}
`;

fs.writeFileSync(cssPath, css + '\n' + cssRules);

console.log('Patched cross');
