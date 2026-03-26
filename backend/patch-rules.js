const fs = require('fs');
let code = fs.readFileSync('c:/github/mc4db-2.0/backend/src/routes/rules.js', 'utf8');

const oldRoute = `router.get('/rulesheets', (req, res) => {
  try {
    const rulesheetsDir = path.resolve(__dirname, '../../../bundles/rulesheets');
    if (!fs.existsSync(rulesheetsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(rulesheetsDir)
      .filter(f => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.png'))
      .sort()
      .map(file => {
        // Remove extension for display name
        const name = file.replace(/\\.(pdf|png)$/i, '');
        return {
          name,
          filename: file,
          url: \`/bundles/rulesheets/\${encodeURIComponent(file)}\`,
          type: file.toLowerCase().endsWith('.pdf') ? 'pdf' : 'png'
        };
      });

    res.json(files);
  } catch (err) {
    console.error('[rulesheets] Error:', err);
    res.status(500).json({ error: 'Failed to load rulesheets' });
  }
});`;

const newRoute = `router.get('/rulesheets', (req, res) => {
  try {
    const locale = (req.query.locale || 'en').toUpperCase();
    const baseDir = path.resolve(__dirname, '../../../bundles/rulesheets');
    let rulesheetsDir = path.join(baseDir, locale);
    let subUrl = locale;

    if (!fs.existsSync(rulesheetsDir)) {
      if (locale !== 'EN' && fs.existsSync(path.join(baseDir, 'EN'))) {
         rulesheetsDir = path.join(baseDir, 'EN');
         subUrl = 'EN';
      } else {
         rulesheetsDir = baseDir;
         subUrl = '';
      }
    }

    if (!fs.existsSync(rulesheetsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(rulesheetsDir)
      .filter(f => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.png'))
      .sort()
      .map(file => {
        const name = file.replace(/\\.(pdf|png)$/i, '').replace(/_/g, ' ');
        const urlPath = subUrl ? \`/bundles/rulesheets/\${subUrl}/\${encodeURIComponent(file)}\` : \`/bundles/rulesheets/\${encodeURIComponent(file)}\`;
        return {
          name,
          filename: file,
          url: urlPath,
          type: file.toLowerCase().endsWith('.pdf') ? 'pdf' : 'png'
        };
      });

    res.json(files);
  } catch (err) {
    console.error('[rulesheets] Error:', err);
    res.status(500).json({ error: 'Failed to load rulesheets' });
  }
});`;

code = code.replace(oldRoute, newRoute);
fs.writeFileSync('c:/github/mc4db-2.0/backend/src/routes/rules.js', code);
console.log('Backend rules.js updated successfully!');
