const fs = require('fs');
let css = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/RulesPage.css', 'utf8');

const rootDef = `
:root {
  --rules-toc-bg: #f8fafc;
  --rules-content-bg: #ffffff;
  --rules-border: rgba(0, 0, 0, 0.1);
  --rules-title: #0f172a;
  --rules-text: #334155;
  --rules-subheading: #2563eb;
  --rules-toc-text: #475569;
  --rules-toc-hover-bg: rgba(0, 0, 0, 0.05);
  --rules-toc-hover-text: #0f172a;
  --rules-toc-active-bg: rgba(37, 99, 235, 0.1);
  --rules-toc-active-text: #2563eb;
  --rules-search-bg: #ffffff;
  --rules-search-border: rgba(0, 0, 0, 0.15);
  --rules-search-text: #334155;
  --rules-search-ph: #64748b;
  --rules-wn-bg: rgba(37, 99, 235, 0.05);
  --rules-wn-border: rgba(37, 99, 235, 0.4);
}

html.dark {
  --rules-toc-bg: #0b1829;
  --rules-content-bg: #0f1e35;
  --rules-border: rgba(255, 255, 255, 0.07);
  --rules-title: #dbeafa;
  --rules-text: #c8d8f0;
  --rules-subheading: #9ec6f5;
  --rules-toc-text: #8fafc8;
  --rules-toc-hover-bg: rgba(255, 255, 255, 0.06);
  --rules-toc-hover-text: #dbeafa;
  --rules-toc-active-bg: rgba(96, 165, 250, 0.12);
  --rules-toc-active-text: #60a5fa;
  --rules-search-bg: rgba(255, 255, 255, 0.06);
  --rules-search-border: rgba(255, 255, 255, 0.12);
  --rules-search-text: #c8d8f0;
  --rules-search-ph: #8a99af;
  --rules-wn-bg: rgba(96, 165, 250, 0.05);
  --rules-wn-border: rgba(96, 165, 250, 0.4);
}
`;

// Replacements
css = css.replace(/background:\s*#0b1829;/g, 'background: var(--rules-toc-bg);');
css = css.replace(/background:\s*#0f1e35;/g, 'background: var(--rules-content-bg);');
css = css.replace(/border(-right|-bottom)?:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.0[67]\);/g, 'border$1: 1px solid var(--rules-border);');
css = css.replace(/color:\s*#dbeafa;/g, 'color: var(--rules-title);');
css = css.replace(/color:\s*#c8d8f0;/g, 'color: var(--rules-text);');
css = css.replace(/color:\s*#8a99af;/g, 'color: var(--rules-search-ph);');
css = css.replace(/color:\s*#8fafc8;/g, 'color: var(--rules-toc-text);');
css = css.replace(/color:\s*#9ec6f5;/g, 'color: var(--rules-subheading);');
css = css.replace(/color:\s*#fff;/g, 'color: var(--rules-title);');
css = css.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.06\);/g, 'background: var(--rules-search-bg);');
css = css.replace(/border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.12\);/g, 'border: 1px solid var(--rules-search-border);');

css = css.replace(/background:\s*rgba\(255,255,255,0\.06\);\s*color:\s*#dbeafa;/g, 'background: var(--rules-toc-hover-bg); color: var(--rules-toc-hover-text);');
css = css.replace(/background:\s*rgba\(96,\s*165,\s*250,\s*0\.12\);\s*color:\s*#60a5fa;/g, 'background: var(--rules-toc-active-bg); color: var(--rules-toc-active-text);');

css = css.replace(/background:\s*rgba\(96,\s*165,\s*250,\s*0\.05\);/g, 'background: var(--rules-wn-bg);');
css = css.replace(/border-left:\s*3px solid rgba\(96,\s*165,\s*250,\s*0\.4\);/g, 'border-left: 3px solid var(--rules-wn-border);');

// Handle specific complex ones precisely:
css = css.replace('color: #c8d8f0;', 'color: var(--rules-search-text);');

// Insert rootDef at the top
css = rootDef + '\n' + css;

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/RulesPage.css', css);
console.log('Successfully updated RulesPage.css');
