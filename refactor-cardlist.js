const fs = require('fs');

let clCssPath = 'c:/github/mc4db-2.0/react-src/src/css/CardList.css';
let css = fs.readFileSync(clCssPath, 'utf8');

// 1. Swap the root variables to map to our global theme variables
css = css.replace(/--cl-bg:\s*#0d1629;/g, '--cl-bg: var(--st-bg);');
css = css.replace(/--cl-surface:\s*#111d35;/g, '--cl-surface: var(--st-surface);');
css = css.replace(/--cl-border:\s*rgba\(255, 255, 255, 0\.08\);/g, '--cl-border: var(--st-border);');
css = css.replace(/--cl-text:\s*#e2e8f0;/g, '--cl-text: var(--st-title);');
css = css.replace(/--cl-text-muted:\s*#94a3b8;/g, '--cl-text-muted: var(--st-text);');
css = css.replace(/--cl-accent:\s*#3b82f6;/g, '--cl-accent: var(--st-accent);');

// Some table specific colors might be hardcoded as rgba(255,...) or explicitly dark.
// Let's replace fixed background and color rules if they exist.
// Example: .cardlist-mode-btn--active { background: rgba(59, 130, 246, 0.18); color: #93c5fd; }
css = css.replace(/color:\s*#a5b4fc;/g, 'color: var(--st-accent-hover, #a5b4fc);');
css = css.replace(/color:\s*#93c5fd;/g, 'color: var(--st-accent-hover, #93c5fd);');

// The preview mode card background usually uses --cl-surface, which is now fixed.

// Write the modernized CardList.css
fs.writeFileSync(clCssPath, css);

console.log("Modernized CardList.css to use Light/Dark mode CSS variables.");
