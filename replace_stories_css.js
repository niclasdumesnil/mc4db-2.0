const fs = require('fs');
let css = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/Stories.css', 'utf8');

const rootRepl = `
:root {
  /* LIGHT MODE */
  --st-bg: #f8f9fa;
  --st-surface: #ffffff;
  --st-surface-2: #f1f5f9;
  --st-border: rgba(0, 0, 0, 0.1);
  --st-border-hover: rgba(0, 0, 0, 0.2);
  --st-text: #334155;
  --st-text-muted: #64748b;
  --st-accent: #2563eb;
  --st-accent-hover: #3b82f6;
  --st-danger: #dc2626;
  --st-success: #16a34a;
  --st-warn: #d97706;
  --st-purple: #9333ea;
  --st-orange: #ea580c;
  --st-title: #0f172a;
}

html.dark {
  /* DARK MODE */
  --st-bg: #0f172a;
  --st-surface: #1e293b;
  --st-surface-2: #334155;
  --st-border: rgba(255, 255, 255, 0.08);
  --st-border-hover: rgba(255, 255, 255, 0.18);
  --st-text: #e2e8f0;
  --st-text-muted: #94a3b8;
  --st-accent: #3b82f6;
  --st-accent-hover: #60a5fa;
  --st-danger: #ef4444;
  --st-success: #22c55e;
  --st-warn: #f59e0b;
  --st-purple: #a855f7;
  --st-orange: #f97316;
  --st-title: #ffffff;
}
`;

css = css.replace(/:root\s*\{[\s\S]*?\}/, rootRepl.trim());

// Hardcoded explicit headers
css = css.replace(/color:\s*#111;/g, 'color: var(--st-title);');
css = css.replace(/color:\s*#555;/g, 'color: var(--st-text-muted);');

// Default texts in panel
css = css.replace(/color:\s*#64748b;/g, 'color: var(--st-text-muted);');
css = css.replace(/color:\s*#475569;/g, 'color: var(--st-text-muted);');
css = css.replace(/color:\s*#0f172a;/g, 'color: var(--st-title);'); // Used in tabs hover mostly
css = css.replace(/color:\s*#f8fafc;/g, 'color: var(--st-bg);');

// Specific backgrounds that were extremely dark
css = css.replace(/background:\s*#0f172a;/g, 'background: var(--st-surface);');
css = css.replace(/background-color:\s*#0f172a;/g, 'background-color: var(--st-surface);');
css = css.replace(/background:\s*#111d35;/g, 'background: var(--st-surface);');
css = css.replace(/background-color:\s*#111d35;/g, 'background-color: var(--st-surface);');
css = css.replace(/background:\s*#162140;/g, 'background: var(--st-surface-2);');
css = css.replace(/background:\s*rgba\(255, 255, 255, 0\.04\);/g, 'background: var(--st-border);');
css = css.replace(/background:\s*rgba\(0,\s*0,\s*0,\s*0\.2\);/g, 'background: var(--st-border);');

// Borders
css = css.replace(/border-bottom:\s*2px solid rgba\(0, 0, 0, 0\.1\);/g, 'border-bottom: 2px solid var(--st-border);');
css = css.replace(/border-top:\s*1px solid rgba\(255, 255, 255, 0\.08\);/g, 'border-top: 1px solid var(--st-border);');
css = css.replace(/border-bottom:\s*1px solid rgba\(255, 255, 255, 0\.08\);/g, 'border-bottom: 1px solid var(--st-border);');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/Stories.css', css);
console.log('Successfully updated Stories.css variables');
