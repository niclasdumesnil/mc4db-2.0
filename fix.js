const fs = require("fs"); let content = fs.readFileSync("react-src/src/css/PublicDecks.css", "utf8"); const idx = content.indexOf(".deck-scope-toggle {"); if (idx > 0) { content = content.substring(0, idx) + `.deck-scope-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--st-border);
  border-radius: 8px;
  overflow: visible;
}

.deck-scope-toggle > :first-child {
  border-radius: 7px 0 0 7px;
}
.deck-scope-toggle > :last-child {
  border-radius: 0 7px 7px 0;
}

.deck-scope-btn {
  padding: 6px 14px;
  background: var(--st-surface-2);
  border: none;
  color: var(--st-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}

.deck-scope-btn:not(:last-child) {
  border-right: 1px solid var(--st-border);
}

.deck-scope-btn--active {
  background: #1a56db;
  color: #fff;
}

.deck-scope-btn:hover:not(.deck-scope-btn--active) {
  background: var(--st-border);
  color: var(--st-title, #222);
}

.deck-name-filter-wrapper {
  display: flex;
  align-items: center;
  background: var(--st-surface-2);
}

.deck-name-filter {
  border: none;
  background: transparent !important;
  padding: 6px 12px;
  font-size: 0.82rem;
  color: var(--st-text);
  width: 140px;
  outline: none;
  transition: width 0.2s;
}

.deck-name-filter::placeholder {
  color: #94a3b8;
}

.deck-name-filter:focus {
  width: 180px;
}

.deck-sort-group {
  display: flex;
  gap: 0;
  border: 1px solid var(--st-border);
  border-radius: 8px;
  overflow: hidden;
  margin-left: auto;
}

.deck-sort-btn {
  padding: 5px 10px;
  background: var(--st-surface-2);
  border: none;
  border-right: 1px solid var(--st-border);
  color: var(--st-text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.deck-sort-btn:last-child {
  border-right: none;
}

.deck-sort-btn--active {
  background: #1a56db;
  color: #fff;
}

.deck-sort-btn:hover:not(.deck-sort-btn--active) {
  background: var(--st-border);
  color: var(--st-title);
}

`; fs.writeFileSync("react-src/src/css/PublicDecks.css", content); }
