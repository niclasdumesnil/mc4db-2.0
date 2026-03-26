const fs = require('fs');
let jsx = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/pages/MyDecks.jsx', 'utf8');

// 1. Add deckLimit state
jsx = jsx.replace(
  `const [error, setError] = useState(null);`,
  `const [error, setError] = useState(null);\n  const [deckLimit, setDeckLimit] = useState(null);`
);

// 2. Add useEffect to fetch user to calculate limit
const userFetchHook = `
  useEffect(() => {
    if (!id) return;
    fetch(\`/api/public/user/\${id}\`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.user) {
          const u = data.user;
          const limit = 2 * (200 + Math.floor((u.reputation || 0) / 10)) + (u.published_decks_count || 0);
          setDeckLimit(limit);
        }
      })
      .catch(console.error);
  }, [id]);
`;
jsx = jsx.replace(
  `  useEffect(() => {\n    if (!id) return;`,
  userFetchHook + `  useEffect(() => {\n    if (!id) return;`
);

// 3. Helper variable for limit check
jsx = jsx.replace(
  `return (\n    <div className="decks-page-container page-wrapper">`,
  `  const limitReached = deckLimit !== null && totalItems >= deckLimit;\n\n  return (\n    <div className="decks-page-container page-wrapper">`
);

// 4. Update the subtitle block to show "X / Y decks" if limit exists
const oldSubtitle = `<span className="decks-count"> &mdash; {totalItems} deck{totalItems > 1 ? 's' : ''}</span>`;
const newSubtitle = `<span className="decks-count"> &mdash; {totalItems}{deckLimit !== null ? \` / \${deckLimit}\` : ''} deck{totalItems > 1 ? 's' : ''}</span>`;
jsx = jsx.replace(oldSubtitle, newSubtitle);

// 5. Add red warning text under "Your private deck collection"
const oldSubtitleBlock = `</p>
          </div>
        </header>`;
const newSubtitleBlock = `</p>
            {limitReached && (
              <p style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '6px' }}>
                You have reached your private deck limit. Try publishing some decks or increasing your reputation to unlock more slots!
              </p>
            )}
          </div>
        </header>`;
jsx = jsx.replace(oldSubtitleBlock, newSubtitleBlock);

// 6. Disable the action buttons
const oldButtons = `<a href="/deck/new" className="deck-filters__btn deck-filters__btn-primary">
              New Deck
            </a>
            <button
              onClick={() => setShowImport(!showImport)}
              className="deck-filters__btn"
            >`;

const newButtons = `{limitReached ? (
              <span className="deck-filters__btn deck-filters__btn-primary" style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                New Deck
              </span>
            ) : (
              <a href="/deck/new" className="deck-filters__btn deck-filters__btn-primary">
                New Deck
              </a>
            )}
            <button
              onClick={() => !limitReached && setShowImport(!showImport)}
              className="deck-filters__btn"
              style={{ opacity: limitReached ? 0.5 : 1, cursor: limitReached ? 'not-allowed' : 'pointer' }}
              disabled={limitReached}
            >`;
jsx = jsx.replace(oldButtons, String(newButtons));

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/pages/MyDecks.jsx', jsx);
console.log('MyDecks patched successfully');
