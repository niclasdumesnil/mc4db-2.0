const fs = require('fs');

let pdPath = 'c:/github/mc4db-2.0/react-src/src/css/PublicDecks.css';
let pdCss = fs.readFileSync(pdPath, 'utf8');

// The tags are likely suffering from a global lower opacity or grayscale filter so they look 'inactive' by default?
// Let's check if there's an opacity on .deck-tag-icon
// Actually, maybe they have opacity: 0.4; normally, and opacity: 1 on hover or when active?
// Let's just make their base opacity higher, e.g. 0.8, and active 1.
// We will replace opacity: 0.[0-9]+ with opacity: 0.8 or 1.
pdCss = pdCss.replace(/\.deck-tag-icon\s*\{[\s\S]*?\}/g, (match) => {
    // If it has opacity: 0.3 or something, increase it
    return match.replace(/opacity:\s*0\.[0-9]+/g, 'opacity: 0.85').replace(/filter:\s*grayscale\([^)]*\)/g, 'filter: grayscale(0)');
});

// Maybe it's also on the container or button?
// In the filter panel, they are often inside a button:
// .deck-filters__tag-btn { opacity: 0.4; filter: grayscale(100%); transition: all 0.2s; }
// .deck-filters__tag-btn--active { opacity: 1; filter: grayscale(0); }
pdCss = pdCss.replace(/\.deck-filters__tag-btn\s*\{[^}]*\}/g, (match) => {
    let replaced = match.replace(/opacity:\s*0\.[0-9]+/g, 'opacity: 0.75');
    // We should probably remove grayscale or reduce it, though it helps distinguish active/inactive.
    // Let's just make base opacity 0.75 and active 1.0. If the active is what the user meant, maybe they are just too faint.
    replaced = replaced.replace(/filter:\s*grayscale\([^)]*\)/g, 'filter: grayscale(0.5)');
    return replaced;
});

// Ensure we didn't just break the file, let's explicitly inject a strong visibility override:
pdCss += '\n\n/* Ensure tags are clearly visible */\n';
pdCss += '.deck-filters__tag-btn { opacity: 0.8 !important; filter: grayscale(0) !important; }\n';
pdCss += '.deck-filters__tag-btn--active { opacity: 1 !important; transform: scale(1.1); box-shadow: 0 0 0 2px var(--st-accent); }\n';
pdCss += '.deck-tag-icon { opacity: 0.9 !important; }\n';

fs.writeFileSync(pdPath, pdCss);

// Let's also do NewDeck.css just in case
let ndPath = 'c:/github/mc4db-2.0/react-src/src/css/NewDeck.css';
if (fs.existsSync(ndPath)) {
  let ndCss = fs.readFileSync(ndPath, 'utf8');
  ndCss += '\n\n/* Ensure tags are clearly visible */\n';
  ndCss += '.deck-filters__tag-btn { opacity: 0.8 !important; filter: grayscale(0) !important; }\n';
  ndCss += '.deck-filters__tag-btn--active { opacity: 1 !important; transform: scale(1.1); box-shadow: 0 0 0 2px var(--st-accent); }\n';
  ndCss += '.deck-tag-icon { opacity: 0.9 !important; }\n';
  fs.writeFileSync(ndPath, ndCss);
}

console.log("Updated tag visibilities.");
