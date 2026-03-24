const fs = require('fs');

const cardListPath = 'c:/github/mc4db-2.0/react-src/src/css/CardList.css';
let clCss = fs.readFileSync(cardListPath, 'utf8');

// Filter buttons
clCss = clCss.replace(
  /\.cardlist-filtertype-btn--official\s*\{[\s\S]*?\}/,
  `.cardlist-filtertype-btn--official {
  background: var(--st-surface-hover, rgba(226, 232, 240, 0.08));
  border-color: var(--st-border-focus, rgba(226, 232, 240, 0.35));
  color: var(--st-title, #e2e8f0);
}`
);

clCss = clCss.replace(
  /\.cardlist-filtertype-btn--official:hover\s*\{[\s\S]*?\}/,
  `.cardlist-filtertype-btn--official:hover {
  background: var(--st-surface-2, rgba(226, 232, 240, 0.14));
}`
);

clCss = clCss.replace(
  /\.cardlist-filtertype-btn--fanmade\s*\{[\s\S]*?\}/,
  `.cardlist-filtertype-btn--fanmade {
  background: rgba(18, 120, 216, 0.12);
  border-color: rgba(18, 120, 216, 0.4);
  color: var(--st-accent, #93caff);
}`
);

clCss = clCss.replace(
  /\.cardlist-filtertype-btn--off\s*\{[\s\S]*?\}/,
  `.cardlist-filtertype-btn--off {
  background: var(--st-surface-2, rgba(255, 255, 255, 0.02)) !important;
  color: var(--st-disabled, rgba(148, 163, 184, 0.35)) !important;
  border-color: var(--st-border, rgba(255, 255, 255, 0.05)) !important;
  text-decoration: line-through;
  opacity: 0.8;
}`
);
clCss = clCss.replace(
  /\.cardlist-filtertype-btn--off:hover\s*\{[\s\S]*?\}/,
  `.cardlist-filtertype-btn--off:hover {
  color: var(--st-muted, rgba(148, 163, 184, 0.6)) !important;
}`
);

// Pagination
clCss = clCss.replace(
  /\.cardlist-pagination\s*\{[\s\S]*?\}/,
  `.cardlist-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--st-surface);
  border: 1px solid var(--st-border);
  border-radius: 8px;
  margin: 16px 0;
}`
);
fs.writeFileSync(cardListPath, clCss);

// CardPage.css for dropdowns
const cardPagePath = 'c:/github/mc4db-2.0/react-src/src/css/CardPage.css';
let cpCss = fs.readFileSync(cardPagePath, 'utf8');

cpCss = cpCss.replace(
  /\.pack-search-dropdown-wrap\s*\{[\s\S]*?\}/,
  `.pack-search-dropdown-wrap {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--st-surface, #0f1c30);
  border: 1px solid var(--st-border-focus, rgba(255,255,255,.18));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.5);
  overflow: hidden;
}`
);

cpCss = cpCss.replace(
  /\.pack-search-filter-input\s*\{[\s\S]*?\}/,
  `.pack-search-filter-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--st-title, #dbeafa);
  font-size: 0.85rem;
  padding: 2px 4px;
  caret-color: #60b0ff;
}`
);

cpCss = cpCss.replace(
  /\.pack-search-trigger\s*\{[\s\S]*?\}/,
  `.pack-search-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  background-color: var(--st-surface-2, rgba(255,255,255,.05));
  border: 1px solid var(--st-border, rgba(255,255,255,.14));
  border-radius: 8px;
  color: var(--st-title, #dbeafa);
  font-size: 0.88rem;
  padding: 7px 12px;
  cursor: pointer;
  outline: none;
  transition: border-color .15s, background-color .15s;
  text-align: left;
  box-sizing: border-box;
}`
);

cpCss = cpCss.replace(
  /\.pack-search-trigger:hover:not\(:disabled\)\s*\{[\s\S]*?\}/,
  `.pack-search-trigger:hover:not(:disabled) {
  border-color: var(--st-border-focus, rgba(255,255,255,.32));
  background-color: var(--st-surface-hover, rgba(255,255,255,.09));
}`
);

cpCss = cpCss.replace(
  /\.pack-search-trigger-placeholder\s*\{[\s\S]*?\}/,
  `.pack-search-trigger-placeholder {
  flex: 1;
  color: var(--st-muted, #8a99af);
}`
);

cpCss = cpCss.replace(
  /\.pack-search-option\s*\{[\s\S]*?\}/,
  `.pack-search-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--st-title, #dbeafa);
  transition: background-color .1s;
  white-space: nowrap;
  border-bottom: 1px solid var(--st-border-subtle, rgba(255,255,255,0.05));
}`
);

cpCss = cpCss.replace(
  /\.pack-search-option--placeholder\s*\{[\s\S]*?\}/,
  `.pack-search-option--placeholder {
  color: var(--st-muted, #8a99af);
  font-style: italic;
}`
);

cpCss = cpCss.replace(
  /\.pack-search-option--empty\s*\{[\s\S]*?\}/,
  `.pack-search-option--empty {
  color: var(--st-disabled, #506070);
  font-style: italic;
  cursor: default;
  justify-content: center;
}`
);

fs.writeFileSync(cardPagePath, cpCss);
console.log('Styles refactored.');
