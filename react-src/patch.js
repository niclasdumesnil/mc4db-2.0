const fs = require('fs');
const css = `
/* Overrides for Search Input and Shuffle */
.scenario-search-container {
  flex: 1;
  min-width: 240px;
  position: relative;
}
.scenario-search-input {
  width: 100% !important;
  padding: 9px 36px 9px 14px !important;
  box-sizing: border-box;
}
.scenario-search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--st-text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}
.scenario-search-clear:hover {
  color: var(--st-title);
}
.scenario-shuffle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 6px;
  border: 1.5px solid rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.scenario-shuffle-btn:hover {
  background: rgba(16, 185, 129, 0.25);
  border-color: rgba(16, 185, 129, 0.6);
  color: #059669;
}
html.dark .scenario-shuffle-btn { color: #34d399; }
html.dark .scenario-shuffle-btn:hover { color: #6ee7b7; }

/* Clear button overrides (Sets style) */
.scenario-clear-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px !important;
  border: none !important;
  border-radius: 14px !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  color: var(--st-text-muted) !important;
  background: rgba(148, 163, 184, 0.15) !important;
  transition: all 0.15s;
}
.scenario-clear-btn:hover {
  background: rgba(148, 163, 184, 0.25) !important;
  color: var(--st-text) !important;
}
`;
fs.appendFileSync('c:\\github\\mc4db-2.0\\react-src\\src\\css\\Stories.css', css);
console.log('Patch applied successfully.');
