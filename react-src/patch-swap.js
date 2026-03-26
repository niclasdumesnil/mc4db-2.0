const fs = require('fs');
let code = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/pages/RulesPage.jsx', 'utf8');

const s1 = `                      {entry.see_also && entry.see_also.length > 0 && (
                        <div className="rules-see-also">
                          <strong>See also:</strong>
                          {entry.see_also.map(seeId => {
                            const targetObj = entries.find(x => x.id === seeId);
                            const displayName = targetObj ? targetObj.term : seeId;
                            const targetSlug = slugify(displayName);
                            return (
                              <a key={seeId} className="rules-see-also-link" onClick={() => scrollTo(targetSlug)}>
                                {displayName}
                              </a>
                            );
                          })}
                        </div>
                      )}`;

const s2 = `                      {whatsNew.length > 0 && (
                        <div className="rules-whats-new">
                          <h4 className="rules-whats-new-title">What's new</h4>
                          {whatsNew.map((wn, i) => (
                            <div key={i} className="rules-wn-item">
                              <span className="rules-wn-version">v{wn.version}</span>
                              <span className="rules-wn-text" dangerouslySetInnerHTML={{ __html: formatInline(wn.diff) }} />
                            </div>
                          ))}
                        </div>
                      )}`;

const oldStr = s1 + `\n\n` + s2;
const oldStr2 = s1 + `\r\n\r\n` + s2;
const newStr = s2 + `\n\n` + s1;

if(code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/pages/RulesPage.jsx', code);
  console.log('Swapped using \\n');
} else if(code.includes(oldStr2)) {
  code = code.replace(oldStr2, newStr);
  fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/pages/RulesPage.jsx', code);
  console.log('Swapped using \\r\\n');
} else {
  console.log('Could not find exact string to swap.');
}
