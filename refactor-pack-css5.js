const fs = require('fs');

const file = 'c:/github/mc4db-2.0/react-src/src/components/CardSearch.jsx';
let content = fs.readFileSync(file, 'utf8');

// The main types
// OLD: background: active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
// OLD: color: active ? '#a5b4fc' : '#cbd5e1',

// NEW: background: active ? 'var(--st-accent-bg, rgba(99,102,241,0.2))' : 'var(--st-surface-2, rgba(255,255,255,0.05))',
// NEW: color: active ? 'var(--st-accent-hover, #a5b4fc)' : 'var(--st-text, #cbd5e1)',

content = content.replace(
  /background: active \? 'rgba\(99,102,241,0\.2\)' : 'rgba\(255,255,255,0\.05\)'/g,
  "background: active ? 'rgba(99,102,241,0.2)' : 'var(--st-surface-2, rgba(255,255,255,0.05))'"
);

content = content.replace(
  /color: active \? '#a5b4fc' : '#cbd5e1'/g,
  "color: active ? 'var(--st-accent-hover, #a5b4fc)' : 'var(--st-text, #cbd5e1)'"
);

// We also have Category & Affinity (e.g. Encounter, Justice). Justice is bright yellow.
// In light mode, yellow on white is unreadable.
// The class is deck-filters__aspect-btn. Let's rely on CSS instead of inline if we could, but let's just leave Category for now unless user asks. User explicitly mentioned "les types" (Main Type).
// Actually, let's fix Category text visibility in light mode if possible:
// color: active ? '#fff' : `${color}cc`
// We can't really use a variable easily because each faction has a different color.
// But we can add a filter or text-shadow for light mode, or use darker variants. We'll stick to fixing "Main Type" and "Special Type" as requested.

// Theme section (All | Marvel) has:
// style={selectedTheme === t ? { background: 'rgba(99,102,241,0.25)', borderColor: 'rgba(99,102,241,0.6)', color: '#a5b4fc' } : {}}
// We should update the color here too for active state:
content = content.replace(
  /color: '#a5b4fc'/g,
  "color: 'var(--st-accent-hover, #a5b4fc)'"
);


fs.writeFileSync(file, content);
console.log('CardSearch.jsx updated inline styles for Light Mode.');
