const fs = require('fs');
const overrideCSS = `

/* Fix for Sidebar scrolling height issues */
.scenario-stats-sidebar {
  padding-bottom: 24px !important;
}

.set-stats-tabs-area {
  flex: none !important;
  min-height: auto !important;
}
`;
fs.appendFileSync('c:\\github\\mc4db-2.0\\react-src\\src\\css\\Stories.css', overrideCSS);
console.log('Flex fixes applied.');
