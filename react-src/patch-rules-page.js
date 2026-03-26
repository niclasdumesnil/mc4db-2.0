const fs = require('fs');
let code = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/pages/RulesPage.jsx', 'utf8');

// 1. Replace RulesContent
const rulesContentStart = `function RulesContent({ text }) {`;
const rulesContentEnd = `  flushBullets();\r\n  return <>{elements}</>;\r\n}`;
const rcSI = code.indexOf(rulesContentStart);
const rcEI = code.indexOf(rulesContentEnd) + rulesContentEnd.length;
if (rcSI !== -1 && rcEI > rcSI) {
  const newRulesContent = `function RulesContent({ text }) {\r\n  if (!text) return null;\r\n  return <div className="rules-entry-paragraph" dangerouslySetInnerHTML={{ __html: formatInline(text) }} />;\r\n}`;
  code = code.substring(0, rcSI) + newRulesContent + code.substring(rcEI);
} else {
  // Try with \n instead of \r\n
  const end2 = `  flushBullets();\n  return <>{elements}</>;\n}`;
  const idx2 = code.indexOf(end2) + end2.length;
  if(idx2 > rcSI) {
     const newRulesContent = `function RulesContent({ text }) {\n  if (!text) return null;\n  return <div className="rules-entry-paragraph" dangerouslySetInnerHTML={{ __html: formatInline(text) }} />;\n}`;
     code = code.substring(0, rcSI) + newRulesContent + code.substring(idx2);
  }
}

// 2. Remove activeSlug from TOC
code = code.replace(/className=\{\`rules-toc-item\$\{activeSlug === slug \? ' active' : ''\}\`\}/g, "className=\"rules-toc-item\"");
code = code.replace(/className=\{"rules-toc-item" \+ \(activeSlug === slug \? ' active' : ''\)\}/g, "className=\"rules-toc-item\"");

// 3. Add defined entries lookup for "See Also"
const seeAlsoTarget = `{whatsNew.length > 0 && (`;
const seeAlsoPatch = `
                      {entry.see_also && entry.see_also.length > 0 && (
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
                      )}

                      {whatsNew.length > 0 && (`;
code = code.replace(seeAlsoTarget, seeAlsoPatch);

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/pages/RulesPage.jsx', code);
console.log('RulesPage Patched!');
