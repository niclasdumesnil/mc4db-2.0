const fs = require('fs');
let css = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/Stories.css', 'utf8');

// Replace color: #fff; with color: var(--st-title); globally
css = css.replace(/color:\s*#fff;/g, 'color: var(--st-title);');
css = css.replace(/color:\s*#ffffff;/g, 'color: var(--st-title);');

// Also backgrounds that are faintly white need to be replaced by st-border or similar in light mode
// Wait, I already handled some faint white backgrounds, but let me check if there's rgba(255, 255, 255, ...)
// Actually those are okay in dark mode, but in light mode they might be invisible or wrong.
// Wait, `.scenario-stats-close-btn` has `background: rgba(255, 255, 255, 0.06);` which would be invisible in light mode!
// And `.set-stat-bar-bg` has `background: rgba(255, 255, 255, 0.07);`.
// And `.scenario-card-text` has `background: rgba(255, 255, 255, 0.03);`
// These should use var(--st-border) instead of rgba(255, 255, 255, ...)

css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.0[2367]\);/g, 'background: var(--st-border);');
css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.1\);/g, 'background: var(--st-border-hover);');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/Stories.css', css);
console.log('White colors replaced.');
