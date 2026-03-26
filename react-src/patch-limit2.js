const fs = require('fs');

const file = 'c:/github/mc4db-2.0/react-src/src/pages/MyDecks.jsx';
let content = fs.readFileSync(file, 'utf8');

const t1 = `  const [error, setError] = useState(null);\n  const [deckLimit, setDeckLimit] = useState(null);`;
const t1_r = t1.replace(/\n/g, '\r\n');

const hook = `
  const limitReached = deckLimit !== null && totalItems >= deckLimit;

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

if(content.includes(t1_r)) {
  content = content.replace(t1_r, t1_r + hook.replace(/\n/g, '\r\n'));
} else {
  content = content.replace(t1, t1 + hook);
}

const unpatchedButtonsHtml = `<div className="deck-filters__actions">
            <a href="/deck/new" className="deck-filters__btn deck-filters__btn-primary">
              New Deck
            </a>
            <button
              onClick={() => setShowImport(!showImport)}
              className="deck-filters__btn"
            >
              Import Deck
            </button>
          </div>`;

const unpatchedButtonsHtml_r = unpatchedButtonsHtml.replace(/\n/g, '\r\n');

const replacementHtml = `<div className="deck-filters__actions">
            {limitReached ? (
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
            >
              Import Deck
            </button>
          </div>`;

if(content.includes(unpatchedButtonsHtml_r)) {
  content = content.replace(unpatchedButtonsHtml_r, replacementHtml.replace(/\n/g, '\r\n'));
} else {
  content = content.replace(unpatchedButtonsHtml, replacementHtml);
}

fs.writeFileSync(file, content);
console.log('Fixed limit hooks and buttons');
