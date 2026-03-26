const fs = require('fs');
let c = fs.readFileSync('c:/github/mc4db-2.0/react-src/src/components/CardSearch.jsx', 'utf8');

c = c.replace(
  `      <Section label="CATEGORIE" defaultOpen={true}\r\n        active={!!(filters.text || filters.flavor)}\r\n        onReset={() => set({ text: '', flavor: '' })}\r\n      >`,
  `      <Section label="CATEGORIE" defaultOpen={true}\r\n        active={!!(filters.factions && filters.factions.length > 0)}\r\n        onReset={clearAllFactions}\r\n      >`
);

// Fallback if \r\n fails
c = c.replace(
  `      <Section label="CATEGORIE" defaultOpen={true}\n        active={!!(filters.text || filters.flavor)}\n        onReset={() => set({ text: '', flavor: '' })}\n      >`,
  `      <Section label="CATEGORIE" defaultOpen={true}\n        active={!!(filters.factions && filters.factions.length > 0)}\n        onReset={clearAllFactions}\n      >`
);

fs.writeFileSync('c:/github/mc4db-2.0/react-src/src/components/CardSearch.jsx', c);
console.log('Fixed CATEGORIE active/onReset state!');
