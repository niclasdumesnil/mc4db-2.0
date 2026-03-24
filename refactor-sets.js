const fs = require('fs');

let setsCssPath = 'c:/github/mc4db-2.0/react-src/src/css/Sets.css';
let css = fs.readFileSync(setsCssPath, 'utf8');

// 1. Swap the root variables to map to our global theme variables
css = css.replace(/--sets-bg:\s*#f8f9fa;/g, '--sets-bg: var(--st-bg);');
css = css.replace(/--sets-surface:\s*#111d35;/g, '--sets-surface: var(--st-surface);');
css = css.replace(/--sets-border:\s*rgba\(255, 255, 255, 0\.08\);/g, '--sets-border: var(--st-border);');
css = css.replace(/--sets-text:\s*#e2e8f0;/g, '--sets-text: var(--st-title);');
css = css.replace(/--sets-muted:\s*#94a3b8;/g, '--sets-muted: var(--st-text);');
css = css.replace(/--sets-accent:\s*#3b82f6;/g, '--sets-accent: var(--st-accent);');

// 2. Add an explicit dark-mode override for the Sets specific variables if we need any, but mapping to --st-* means it inherits!

// 3. Dropdown hardcoding
css = css.replace(/background:\s*#0f1c34;/g, 'background: var(--st-surface-2);');
css = css.replace(/background:\s*rgba\(255,255,255,0\.05\);/g, 'background: var(--st-search-bg, rgba(128, 128, 128, 0.05));');
// Search input was `background: rgba(255,255,255,0.05);` ... same
css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/g, 'background: var(--st-surface-3, rgba(128, 128, 128, 0.06));');

// 4. Colors inside dropdowns and badges
css = css.replace(/color:\s*var\(--sets-fg\);/g, 'color: var(--st-title);');

// Add the fallbacks to :root in style.css for search-bg and surface-3
let styleCssPath = 'c:/github/mc4db-2.0/react-src/src/css/style.css';
let styleCss = fs.readFileSync(styleCssPath, 'utf8');
if (!styleCss.includes('--st-search-bg')) {
  styleCss = styleCss.replace(/:root\s*\{/, ":root {\n  --st-search-bg: rgba(0, 0, 0, 0.04);\n  --st-surface-3: rgba(0, 0, 0, 0.06);\n");
  styleCss = styleCss.replace(/html\.dark\s*\{/, "html.dark {\n  --st-search-bg: rgba(255, 255, 255, 0.05);\n  --st-surface-3: rgba(255, 255, 255, 0.06);\n");
  fs.writeFileSync(styleCssPath, styleCss);
}

// Write the modernized Sets.css
fs.writeFileSync(setsCssPath, css);

console.log("Modernized Sets.css to use Light/Dark mode CSS variables.");
