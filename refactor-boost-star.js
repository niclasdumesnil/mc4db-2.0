const fs = require('fs');

// 1. UPDATE backend/src/models/card.model.js
const modelPath = 'c:/github/mc4db-2.0/backend/src/models/card.model.js';
let modelContent = fs.readFileSync(modelPath, 'utf8');

// Add boost_star to destructured filters
modelContent = modelContent.replace(
  /boost_op = '=', boost, boost_op2 = '=', boost2,/,
  "boost_op = '=', boost, boost_op2 = '=', boost2, boost_star,"
);

// Add the condition
if (!modelContent.includes("if (boost_star === '1') q = q.where('c.boost_star', 1);")) {
  modelContent = modelContent.replace(
    /q = applyNumeric\('c\.boost', boost, boost_op, boost2, boost_op2\);/,
    "q = applyNumeric('c.boost', boost, boost_op, boost2, boost_op2);\n  if (boost_star === '1') q = q.where('c.boost_star', 1);"
  );
}

fs.writeFileSync(modelPath, modelContent);

// 2. UPDATE react-src/src/pages/CardList.jsx
const cardListPath = 'c:/github/mc4db-2.0/react-src/src/pages/CardList.jsx';
let clContent = fs.readFileSync(cardListPath, 'utf8');

if (!clContent.includes("if (filters.boost_star === '1')")) {
  clContent = clContent.replace(
    /if \(filters\.illustrator\) params\.set\('illustrator', filters\.illustrator\);/,
    "if (filters.illustrator) params.set('illustrator', filters.illustrator);\n  if (filters.boost_star === '1') params.set('boost_star', '1');"
  );
}

fs.writeFileSync(cardListPath, clContent);

// 3. UPDATE react-src/src/components/CardSearch.jsx
const searchPath = 'c:/github/mc4db-2.0/react-src/src/components/CardSearch.jsx';
let searchContent = fs.readFileSync(searchPath, 'utf8');

// Update EMPTY_FILTERS
searchContent = searchContent.replace(
  /boost: '', boost_op: '=', boost2: '', boost_op2: '=',/,
  "boost: '', boost_op: '=', boost2: '', boost_op2: '=', boost_star: '',"
);

// Replace Any button reset to clear boost_star
searchContent = searchContent.replace(
  /onClick=\{\(\) => set\(\{ boost: '', boost_op: '=' \}\)\}/,
  "onClick={() => set({ boost: '', boost_op: '=', boost_star: '' })}"
);

// Replace active condition for Any button
searchContent = searchContent.replace(
  /className=\{"card-search__res-qty-btn" \+ \(!filters\.boost \? ' card-search__res-qty-btn--active' : ''\)\}/,
  "className={\"card-search__res-qty-btn\" + (!filters.boost && !filters.boost_star ? ' card-search__res-qty-btn--active' : '')}"
);

// Replace the boost options array mapping
const oldBoostGrid = `{[
                  { label: '★', val: '*' },
                  { label: '0', val: '0' },
                  { label: '1', val: '1' },
                  { label: '2', val: '2' },
                  { label: '3+', val: '3', op: 'gte' }
                ].map(b => (
                  <button
                    key={b.label}
                    className={"card-search__res-qty-btn" + (filters.boost === b.val && (b.op ? filters.boost_op === b.op : true) ? ' card-search__res-qty-btn--active' : '')}
                    onClick={() => set({ boost: filters.boost === b.val && (filters.boost_op === b.op || !b.op) ? '' : b.val, boost_op: b.op || '=' })}
                  >{b.label}</button>
                ))}`;

const newBoostGrid = `
                <button
                  className={"card-search__res-qty-btn" + (filters.boost_star === '1' ? ' card-search__res-qty-btn--active' : '')}
                  onClick={() => set({ boost_star: filters.boost_star === '1' ? '' : '1' })}
                >★</button>

                <div style={{ marginLeft: 16, display: 'flex', gap: 3 }}>
                  {[
                    { label: '0', val: '0' },
                    { label: '1', val: '1' },
                    { label: '2', val: '2' },
                    { label: '3+', val: '3', op: 'gte' }
                  ].map(b => (
                    <button
                      key={b.label}
                      className={"card-search__res-qty-btn" + (filters.boost === b.val && (b.op ? filters.boost_op === b.op : true) ? ' card-search__res-qty-btn--active' : '')}
                      onClick={() => set({ boost: filters.boost === b.val && (filters.boost_op === b.op || !b.op) ? '' : b.val, boost_op: b.op || '=' })}
                    >{b.label}</button>
                  ))}
                </div>
`;

// It might throw string matching if whitespace isn't exactly the same, let's use a regex
searchContent = searchContent.replace(/\{\[\s*\{\s*label:\s*'★'[\s\S]*?\}\)\)/, newBoostGrid);

// Update Attributes clear all
searchContent = searchContent.replace(
  /boost: '', boost_op: '=', boost2: '', boost_op2: '='/,
  "boost: '', boost_op: '=', boost2: '', boost_op2: '=', boost_star: ''"
);

fs.writeFileSync(searchPath, searchContent);
console.log('Backend and frontend updated for independent Boost Star filter.');

