const fs = require('fs');

const file = 'c:/github/mc4db-2.0/react-src/src/pages/MyDecks.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `              Your private deck collection
              {!loading && totalItems > 0 && (
                <span className="decks-count"> &mdash; {totalItems} deck{totalItems > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </header>`;

const replace1 = `              Your private deck collection
              {!loading && totalItems > 0 && (
                <span className="decks-count"> &mdash; {totalItems}{deckLimit !== null ? \` / \${deckLimit}\` : ''} deck{totalItems > 1 ? 's' : ''}</span>
              )}
            </p>
            {limitReached && (
              <p style={{ color: '#f87171', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '6px' }}>
                You have reached your private deck limit. Try publishing some decks or increasing your reputation to unlock more slots!
              </p>
            )}
          </div>
        </header>`;

// Use regexes because CRLF
const match1 = content.match(/Your private deck collection[\s\S]*?<\/header>/);
if(match1) {
  content = content.replace(match1[0], replace1);
  fs.writeFileSync(file, content);
  console.log('Patched the header and red text.');
} else {
  console.log('Match failed.');
}
