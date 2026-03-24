const fs = require('fs');
let css = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/css/Dashboard.css', 'utf8');

css = css.replace(/rgba\(255,\s*255,\s*255,\s*0\.([0-9]+)\)/g, (match, p1) => {
    let val = p1.length === 1 ? p1 + '0' : p1; // e.g. 1 -> 10, 05 -> 05
    return `var(--alpha-${val})`;
});

const rootRepl = `
:root {
  /* LIGHT MODE */
  --bg-dark: #f8f9fa;
  --panel-bg: #ffffff;
  --panel-border: var(--alpha-10);
  --primary-blue: #2563eb;
  --accent-cyan: #0284c7;
  --text-main: #334155;
  --text-muted: #64748b;
  --white: #ffffff;
  --success: #16a34a;
  --danger: #dc2626;

  --panel-title: #0f172a;
  --panel-text: #334155;

  --alpha-02: rgba(0, 0, 0, 0.02);
  --alpha-03: rgba(0, 0, 0, 0.03);
  --alpha-04: rgba(0, 0, 0, 0.04);
  --alpha-05: rgba(0, 0, 0, 0.05);
  --alpha-06: rgba(0, 0, 0, 0.06);
  --alpha-08: rgba(0, 0, 0, 0.08);
  --alpha-10: rgba(0, 0, 0, 0.1);
  --alpha-12: rgba(0, 0, 0, 0.12);
  --alpha-15: rgba(0, 0, 0, 0.15);
  --alpha-20: rgba(0, 0, 0, 0.2);
  --alpha-25: rgba(0, 0, 0, 0.25);
  --alpha-30: rgba(0, 0, 0, 0.3);
  --alpha-35: rgba(0, 0, 0, 0.35);
}

html.dark {
  /* DARK MODE */
  --bg-dark: #0f172a;
  --panel-bg: #1e293b;
  --panel-border: var(--alpha-08);
  --primary-blue: #3b82f6;
  --accent-cyan: #00d2ff;
  --text-main: #e2e8f0;
  --text-muted: #94a3b8;
  --white: #ffffff;
  --success: #2ecc71;
  --danger: #e74c3c;

  --panel-title: #ffffff;
  --panel-text: #e2e8f0;

  --alpha-02: rgba(255, 255, 255, 0.02);
  --alpha-03: rgba(255, 255, 255, 0.03);
  --alpha-04: rgba(255, 255, 255, 0.04);
  --alpha-05: rgba(255, 255, 255, 0.05);
  --alpha-06: rgba(255, 255, 255, 0.06);
  --alpha-08: rgba(255, 255, 255, 0.08);
  --alpha-10: rgba(255, 255, 255, 0.1);
  --alpha-12: rgba(255, 255, 255, 0.12);
  --alpha-15: rgba(255, 255, 255, 0.15);
  --alpha-20: rgba(255, 255, 255, 0.2);
  --alpha-25: rgba(255, 255, 255, 0.25);
  --alpha-30: rgba(255, 255, 255, 0.3);
  --alpha-35: rgba(255, 255, 255, 0.35);
}
`;

css = css.replace(/:root\s*\{[\s\S]*?\}/, rootRepl.trim());

css = css.replace(/color:\s*var\(--white\)/g, 'color: var(--panel-title)');
css = css.replace(/color:\s*#e2e8f0/g, 'color: var(--panel-text)');
css = css.replace(/color:\s*#cedae8/g, 'color: var(--panel-text)');
css = css.replace(/color:\s*#111/g, 'color: var(--panel-title)');
css = css.replace(/color:\s*#555/g, 'color: var(--text-muted)');

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/css/Dashboard.css', css);
console.log('Successfully updated Dashboard.css');
